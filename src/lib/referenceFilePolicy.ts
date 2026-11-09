/** Referencias de trabalho. Nunca executar nem renderizar arquivos ativos do usuario. */
const ACCEPTED = new Set([
  'jpg','jpeg','png','webp','gif','avif','bmp','tif','tiff','heic',
  'pdf','psd','psb','ai','eps','cdr','svg','indd','idml','sketch','xd',
  'mp4','mov','webm','m4v','avi','mkv','mp3','wav','m4a','aac',
  'zip','rar','7z','tar','gz',
  'doc','docx','odt','xls','xlsx','ods','ppt','pptx','odp','txt','csv','rtf',
  'otf','ttf','woff','woff2','json'
]);
const MIME_BLOCK = /(?:text\/html|javascript|x-msdownload|x-executable|x-sh|x-bat|x-powershell|x-dosexec|application\/wasm)/i;
const MAX_ONE = 100 * 1024 * 1024;
const MAX_TOTAL = 120 * 1024 * 1024;

export function referenceExtension(name: string): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(String(name || '').trim());
  return match ? match[1].toLowerCase() : '';
}

export function validateProductionReferences(files: Pick<File,'name'|'size'|'type'>[]) {
  let total = 0;
  for (const file of files) {
    const name = String(file.name || '');
    const ext = referenceExtension(name);
    const mime = String(file.type || '');
    if (!ACCEPTED.has(ext) || MIME_BLOCK.test(mime)) {
      throw new Error(`Tipo de arquivo nao permitido: ${name}. Use formatos de producao como PDF, PSD, AI, CDR, SVG, PNG, JPG, MP4 ou ZIP.`);
    }
    if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_ONE) {
      throw new Error(`O anexo ${name} precisa ter entre 1 byte e 100 MB.`);
    }
    total += file.size;
    if (total > MAX_TOTAL) throw new Error('O total de anexos em um salvamento nao pode ultrapassar 120 MB. Envie em etapas.');
  }
}

export function safeReferenceContentType(file: Pick<File,'name'|'type'>): string {
  // Armazenamento atual utiliza bucket publico. Arquivos vetoriais,
  // documentos e arquivos ativos devem ser baixados, nao renderizados.
  const ext = referenceExtension(file.name);
  if (ext === 'png' && file.type === 'image/png') return 'image/png';
  if ((ext === 'jpg' || ext === 'jpeg') && file.type === 'image/jpeg') return 'image/jpeg';
  if (ext === 'webp' && file.type === 'image/webp') return 'image/webp';
  if (ext === 'gif' && file.type === 'image/gif') return 'image/gif';
  if (ext === 'avif' && file.type === 'image/avif') return 'image/avif';
  return 'application/octet-stream';
}
