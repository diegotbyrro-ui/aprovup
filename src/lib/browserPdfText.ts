/**
 * Extracts selectable PDF text in the user's own browser.
 * Worker is copied from the exact installed pdfjs-dist version at install time
 * to /public/pdf.worker.aprovup.mjs, avoiding Node-only PDF workers in production.
 */
import type { PositionedPdfLine } from './financePdfPayload';

export async function extractPositionedPdfText(file: File): Promise<PositionedPdfLine[]> {
  if (file.size < 10 || file.size > 8 * 1024 * 1024) {
    throw new Error('Selecione um PDF de até 8 MB.');
  }
  const pdfjs = await import('pdfjs-dist');
  // Webpack includes the PDF.js worker in Next.js static assets (_next/static),
  // rather than relying on a separately deployed file in /public.
  // The URL is resolved at build time, and stays version-matched with pdfjs-dist.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
  let document: Awaited<typeof task.promise>;
  try {
    document = await task.promise;
  } catch (error) {
    await task.destroy().catch(() => null);
    throw new Error('Não consegui abrir o PDF no navegador. Verifique se o arquivo não tem senha ou está corrompido. ' + (error instanceof Error ? error.message : ''));
  }
  const lines: PositionedPdfLine[] = [];
  try {
    if (document.numPages > 35) throw new Error('PDF muito longo: envie até 35 páginas.');
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      // PDF.js textContent.items is a union of text and marked-content entries.
      // Explicitly narrow untrusted runtime data before reading coordinates.
      type PdfTextChunk = { str: string; transform: number[] };
      type PdfPoint = { text: string; x: number; y: number };
      const points: PdfPoint[] = (content.items as unknown[])
        .filter((item: unknown): item is PdfTextChunk => {
          if (item === null || typeof item !== 'object') return false;
          const candidate = item as Partial<PdfTextChunk>;
          return typeof candidate.str === 'string' &&
            Array.isArray(candidate.transform) && candidate.transform.length >= 6;
        })
        .map((item: PdfTextChunk): PdfPoint => ({
          text: item.str.trim(),
          x: Number(item.transform[4]),
          y: Number(item.transform[5]),
        }))
        .filter((item: PdfPoint): boolean => Boolean(item.text) && Number.isFinite(item.x) && Number.isFinite(item.y));
      points.sort((a: PdfPoint, b: PdfPoint) =>
        Math.abs(a.y - b.y) > 2.5 ? b.y - a.y : a.x - b.x);
      const groups: Array<{ y: number; tokens: typeof points }> = [];
      for (const point of points) {
        let group = groups.find((entry) => Math.abs(entry.y - point.y) <= 2.5);
        if (!group) { group = { y: point.y, tokens: [] }; groups.push(group); }
        group.tokens.push(point);
      }
      for (const group of groups) {
        group.tokens.sort((a: PdfPoint, b: PdfPoint) => a.x - b.x);
        lines.push({ page: pageNumber, text: group.tokens.map((item: PdfPoint) => item.text).join(' '), tokens: group.tokens });
        if (lines.length > 25_000) throw new Error('O PDF tem linhas demais para analisar com segurança.');
      }
      page.cleanup();
    }
  } finally {
    await task.destroy().catch(() => null);
  }
  if (!lines.length) throw new Error('O PDF não tem texto selecionável. Exporte esse extrato em CSV ou OFX.');
  return lines;
}
