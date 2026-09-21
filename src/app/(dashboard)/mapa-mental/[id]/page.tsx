import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  hasPermission,
  requirePermission,
} from "@/lib/userAccess";

import {
  MindMapEditor,
} from "./MindMapEditor";


export default async function MindMapEditorPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user =
    await requirePermission(
      "mindmap.view"
    );


  const {
    id,
  } =
    await params;


  const map =
    await prisma.mindMap.findFirst({
      where: {
        id,

        agencyId:
          user.agencyId,
      },

      include: {
        client: {
          select: {
            id:
              true,

            name:
              true,

            agencyId:
              true,

            internalResponsible:
              true,
          },
        },
      },
    });


  if (!map) {
    redirect(
      "/mapa-mental"
    );
  }


  if (
    map.client &&
    !canAccessClient(
      user,
      map.client
    )
  ) {
    redirect(
      "/mapa-mental"
    );
  }


  return (
    <MindMapEditor
      mapId={
        map.id
      }

      initialTitle={
        map.title
      }

      initialDescription={
        map.description ||
        ""
      }

      initialNodes={
        map.nodes
      }

      initialEdges={
        map.edges
      }

      initialViewport={
        map.viewport
      }

      clientName={
        map.client?.name ||
        null
      }

      canManage={
        hasPermission(
          user,
          "mindmap.manage"
        )
      }

      createdByName={
        map.createdByName ||
        null
      }
    />
  );
}
