import {
  randomUUID,
} from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";


const BUCKET =
  "aprovup-files";


function storageClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;


  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL nao configurada."
    );
  }


  if (!secret) {
    throw new Error(
      "SUPABASE_SECRET_KEY nao configurada."
    );
  }


  return createClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}


function safePart(
  value: string
) {
  return String(
    value || "arquivo"
  )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}


function extensionFromName(
  name: string
) {
  const match =
    String(name || "")
      .match(
        /(\.[a-zA-Z0-9]{1,10})$/
      );


  return match
    ? match[1].toLowerCase()
    : "";
}


function fileExtension(
  file: File
) {
  return extensionFromName(
    file.name || ""
  );
}


export async function uploadAprovUpFile(
  file: File,
  folder: string,
  prefix = "arquivo"
) {
  if (
    !file ||
    file.size === 0
  ) {
    return "";
  }


  const supabase =
    storageClient();


  const objectPath =
    `${safePart(folder)}/${safePart(prefix)}-${Date.now()}-${randomUUID()}${fileExtension(file)}`;


  const bytes =
    await file.arrayBuffer();


  const {
    error,
  } =
    await supabase.storage
      .from(BUCKET)
      .upload(
        objectPath,
        Buffer.from(bytes),
        {
          contentType:
            file.type ||
            "application/octet-stream",

          cacheControl:
            "3600",

          upsert:
            false,
        }
      );


  if (error) {
    console.error(
      "AprovUp Storage:",
      error
    );

    throw new Error(
      "Nao foi possivel salvar o arquivo."
    );
  }


  return getAprovUpPublicUrl(
    objectPath
  );
}


export async function createAprovUpSignedUpload(
  options: {
    folder: string;
    prefix: string;
    fileName: string;
  }
) {
  const supabase =
    storageClient();


  const objectPath =
    `${safePart(options.folder)}/${safePart(options.prefix)}-${Date.now()}-${randomUUID()}${extensionFromName(options.fileName)}`;


  const {
    data,
    error,
  } =
    await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(
        objectPath,
        {
          upsert: false,
        }
      );


  if (
    error ||
    !data?.token
  ) {
    console.error(
      "AprovUp Signed Upload:",
      error
    );

    throw new Error(
      "Nao foi possivel preparar o upload."
    );
  }


  const baseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const host =
    new URL(
      baseUrl
    ).hostname;

  const projectId =
    host.split(".")[0];


  return {
    path:
      objectPath,

    token:
      data.token,

    endpoint:
      `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
  };
}


export function getAprovUpPublicUrl(
  objectPath: string
) {
  const supabase =
    storageClient();


  const {
    data,
  } =
    supabase.storage
      .from(BUCKET)
      .getPublicUrl(
        objectPath
      );


  return (
    data.publicUrl ||
    ""
  );
}


export async function aprovUpFileExists(
  objectPath: string
) {
  const supabase =
    storageClient();


  const {
    data,
    error,
  } =
    await supabase.storage
      .from(BUCKET)
      .exists(
        objectPath
      );


  if (error) {
    console.error(
      "AprovUp Storage exists:",
      error
    );

    return false;
  }


  return data === true;
}