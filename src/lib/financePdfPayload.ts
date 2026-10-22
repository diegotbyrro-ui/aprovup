/** Bounds-check positioned text extracted from an uploaded PDF in the browser.
 * The browser extraction avoids host-level pdfjs-dist/worker dependencies.
 * Only the authenticated, permission-checked finance endpoint calls this function.
 */
export type PositionedPdfToken = { text: string; x: number; y: number };
export type PositionedPdfLine = { page: number; text: string; tokens: PositionedPdfToken[] };

export function parseBrowserPdfLines(raw: FormDataEntryValue | null): PositionedPdfLine[] {
  if (typeof raw !== 'string' || !raw || raw.length > 3_000_000) {
    throw new Error('Leitura do PDF ausente ou muito grande. Atualize a página e envie o arquivo novamente.');
  }
  let data: unknown;
  try { data = JSON.parse(raw); }
  catch { throw new Error('Dados extraídos do PDF inválidos. Atualize a página.'); }
  if (!Array.isArray(data) || !data.length || data.length > 25_000) {
    throw new Error('Quantidade de linhas do PDF inválida.');
  }
  const result: PositionedPdfLine[] = [];
  for (const line of data) {
    if (!line || typeof line !== 'object' ||
      !Number.isInteger(line.page) || line.page < 1 || line.page > 35 ||
      !Array.isArray(line.tokens) || line.tokens.length > 250) {
      throw new Error('Estrutura de linhas do PDF inválida.');
    }
    const tokens: PositionedPdfToken[] = [];
    for (const item of line.tokens) {
      if (!item || typeof item !== 'object' || typeof item.text !== 'string' ||
        item.text.length > 350 || typeof item.x !== 'number' || typeof item.y !== 'number' ||
        !Number.isFinite(item.x) || !Number.isFinite(item.y) ||
        Math.abs(item.x) > 10_000 || Math.abs(item.y) > 10_000) {
        throw new Error('Coordenadas/texto do PDF inválidos.');
      }
      tokens.push({ text: item.text, x: item.x, y: item.y });
    }
    const text = tokens.map((item) => item.text).join(' ').trim();
    if (text.length > 12_000) throw new Error('Linha do PDF muito longa.');
    result.push({ page: line.page, text, tokens });
  }
  if (!result.some((line) => line.text)) {
    throw new Error('O PDF não contém texto selecionável. Use CSV ou OFX.');
  }
  return result;
}
