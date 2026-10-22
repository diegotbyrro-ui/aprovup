import { parseCardAmount, parseCardDate, suggestCardCategory, type CardStatementRow } from './cardStatementParser';
import type { PositionedPdfLine } from './serverPdfText';

/** Uses the labelled Debit column, never the Credit or Balance columns. */
export function parseBradescoBankStatement(lines: PositionedPdfLine[], period: string): CardStatementRow[] | null {
  const hasBradesco = lines.some(line => /bradesco\s+celular/i.test(line.text));
  const hasColumns = lines.some(line => /cr[eé]dito/i.test(line.text) && /d[eé]bito/i.test(line.text) && /saldo/i.test(line.text));
  if (!hasBradesco || !hasColumns) return null;
  const result: CardStatementRow[] = [];
  const pages = [...new Set(lines.map(line => line.page))].sort((a,b) => a-b);
  let currentDate: string | null = null;
  for (const pageNumber of pages) {
    const pageLines = lines.filter(line => line.page === pageNumber);
    const byY = [...pageLines].sort((a,b) => (b.tokens[0]?.y ?? 0) - (a.tokens[0]?.y ?? 0));
    for (const line of byY) {
      const tokens = Array.isArray(line.tokens) ? line.tokens : [];
      const dateToken = tokens.find(item => item.x >= 30 && item.x < 95 && /^\d{2}[/.-]\d{2}[/.-]\d{4}$/.test(item.text.trim()));
      if (dateToken) currentDate = parseCardDate(dateToken.text, period);
      if (/^\s*Total\b/i.test(line.text)) continue;
      const debit = tokens.find(item => item.x >= 455 && item.x < 515 && /^-?[\d.,]+$/.test(item.text.trim()));
      if (!debit || !currentDate) continue;
      const amount = parseCardAmount(debit.text);
      if (!amount || amount <= 0) continue;
      const adjacent = pageLines.flatMap(candidate => (candidate.tokens || []).filter(item =>
        item.x >= 104 && item.x < 295 && Math.abs(item.y - debit.y) <= 11));
      const byHeight = adjacent.sort((a,b)=>b.y-a.y || a.x-b.x);
      const description = byHeight.map(item=>item.text).join(' ').replace(/\s+/g,' ').trim().slice(0,220);
      if (description.length < 3 || /^(?:total|saldo|cod\.\s*lanc)/i.test(description)) continue;
      result.push({
        index: result.length,
        date: currentDate,
        description,
        amountCents: amount,
        category: suggestCardCategory(description),
      });
    }
  }
  return result;
}
