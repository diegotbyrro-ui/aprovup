import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/userAccess';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import {
  CARD_CATEGORIES, classifyStatementFile, parseCardCsv, parseCardOfx,
  parseCardPdfLines, type CardStatementRow, type StatementSign,
} from '@/lib/cardStatementParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type Selection = { index: number; category: string };

function readFileText(buffer: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { return new TextDecoder('windows-1252').decode(buffer); }
}

async function getPdfLines(buffer: Uint8Array): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: buffer, useSystemFonts: true });
  const document = await task.promise;
  const lines: string[] = [];
  try {
    if (document.numPages > 35) throw new Error('PDF muito longo. Exporte somente uma fatura por vez.');
    for (let n = 1; n <= document.numPages; n++) {
      const page = await document.getPage(n);
      const content = await page.getTextContent();
      const points = content.items
        .filter((item): item is typeof item & { str: string; transform: number[] } => 'str' in item && 'transform' in item)
        .map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5] }))
        .filter((item) => item.text.trim());
      points.sort((a, b) => Math.abs(a.y - b.y) > 2.5 ? b.y - a.y : a.x - b.x);
      const groups: Array<{ y: number; items: typeof points }> = [];
      for (const point of points) {
        const group = groups.find((entry) => Math.abs(entry.y - point.y) <= 2.5);
        if (group) group.items.push(point);
        else groups.push({ y: point.y, items: [point] });
      }
      for (const group of groups) {
        lines.push(group.items.sort((a, b) => a.x - b.x).map((entry) => entry.text).join(' '));
      }
      page.cleanup();
    }
  } finally { await task.destroy(); }
  return lines;
}

async function parseUploadedStatement(file: File, period: string, sign: StatementSign): Promise<CardStatementRow[]> {
  const format = classifyStatementFile(file.name);
  if (file.size < 10 || file.size > 8 * 1024 * 1024) throw new Error('Selecione um arquivo entre 10 bytes e 8 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const rows = format === 'csv' ? parseCardCsv(readFileText(bytes), period, sign)
    : format === 'ofx' ? parseCardOfx(readFileText(bytes), period)
      : parseCardPdfLines(await getPdfLines(bytes), period);
  if (!rows.length) {
    throw new Error(format === 'pdf'
      ? 'Não encontrei lançamentos reconhecíveis nesse PDF. Faturas digitalizadas ou com tabelas especiais devem ser exportadas em CSV ou OFX.'
      : 'Nenhuma despesa reconhecida. Verifique o tipo de sinal de valores e exporte os lançamentos detalhados.');
  }
  return rows.slice(0, 1000);
}

function keyForRow(card: string, row: CardStatementRow, occurrence: number) {
  return createHash('sha256').update(JSON.stringify([
    card.trim().toLocaleLowerCase('pt-BR'), row.date, row.description.trim().toLocaleLowerCase('pt-BR'), row.amountCents, occurrence,
  ])).digest('hex').slice(0, 32);
}

export async function POST(request: NextRequest) {
  try {
    // Exigir origem declarada e Fetch Metadata do navegador quando presente.
    // Em proxies, request.nextUrl.host pode ser o host INTERNO, diferente do
    // dominio publico visto pelo navegador. Sec-Fetch-Site: same-origin e
    // definido pelo navegador, nao por JavaScript da pagina.
    const browserOrigin = request.headers.get('origin');
    const fetchSite = request.headers.get('sec-fetch-site');
    let originAllowed = false;
    if (browserOrigin && browserOrigin !== 'null' && (!fetchSite || fetchSite === 'same-origin')) {
      try {
        const parsedOrigin = new URL(browserOrigin);
        if (
          (parsedOrigin.protocol === 'https:' || parsedOrigin.protocol === 'http:') &&
          parsedOrigin.origin === browserOrigin
        ) {
          const browserProvesSameOrigin = fetchSite === 'same-origin';
          const hostHeader = request.headers.get('host') || '';
          const matchesPublicHost = [hostHeader, request.nextUrl.host].some(
            (host) => host.toLowerCase() === parsedOrigin.host.toLowerCase()
          );
          originAllowed = browserProvesSameOrigin || matchesPublicHost;
        }
      } catch {
        originAllowed = false;
      }
    }
    if (!originAllowed) {
      return NextResponse.json({ error: 'Origem de solicitação inválida. Atualize a página e tente novamente.' }, { status: 403 });
    }
    const user = await getCurrentUser();
    if (!user || user.status !== 'APROVADO' || !user.agencyId || !hasPermission(user, 'settings.manage')) {
      return NextResponse.json({ error: 'Acesso negado. Somente usuários autorizados podem importar despesas.' }, { status: 403 });
    }
    // Guardar o agencyId ja validado antes da transacao assincrona.
    const agencyId: string = user.agencyId;
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecione a fatura do cartão.' }, { status: 400 });
    const card = String(form.get('card') || '').trim().slice(0, 70);
    const period = String(form.get('period') || '').trim();
    const sign: StatementSign = form.get('sign') === 'negative' ? 'negative' : 'positive';
    const mode = String(form.get('mode') || 'preview');
    if (!/^[\p{L}\d][\p{L}\d\s._\-]{1,69}$/u.test(card)) {
      return NextResponse.json({ error: 'Informe um identificador para o cartão, por exemplo "Nubank PJ".' }, { status: 400 });
    }
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)) {
      return NextResponse.json({ error: 'Mês de referência inválido.' }, { status: 400 });
    }
    const rows = await parseUploadedStatement(file, period, sign);
    if (mode === 'preview') {
      return NextResponse.json({ rows, count: rows.length, totalCents: rows.reduce((sum, row) => sum + row.amountCents, 0) });
    }
    if (mode !== 'import') return NextResponse.json({ error: 'Operação não suportada.' }, { status: 400 });
    let chosen: Selection[];
    try { chosen = JSON.parse(String(form.get('selection') || '[]')); }
    catch { throw new Error('Seleção de despesas inválida.'); }
    if (!Array.isArray(chosen) || !chosen.length || chosen.length > 1000) throw new Error('Selecione ao menos uma despesa para importar.');
    const unique = new Set<number>();
    const validated: Array<{ row: CardStatementRow; category: string }> = [];
    for (const item of chosen) {
      if (!item || !Number.isInteger(item.index) || item.index < 0 || item.index >= rows.length || unique.has(item.index)) throw new Error('Seleção de despesas duplicada ou inválida.');
      unique.add(item.index);
      const category = String(item.category || '').trim();
      if (!CARD_CATEGORIES.some((allowed) => allowed === category)) throw new Error('Categoria de despesa não permitida.');
      validated.push({ row: rows[item.index], category });
    }
    const seenCharge = new Map<string, number>();
    const prepared = rows.map((row) => {
      const signature = `${row.date}|${row.description.trim().toLocaleLowerCase('pt-BR')}|${row.amountCents}`;
      const occurrence = (seenCharge.get(signature) || 0) + 1;
      seenCharge.set(signature, occurrence);
      return { row, fingerprint: keyForRow(card, row, occurrence) };
    });
    // Só importa transações verificadas na leitura do próprio arquivo nesta solicitação.
    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.financeEntry.findMany({
        where: { agencyId, source: 'CARD_STATEMENT' },
        select: { notes: true }, take: 20000,
      });
      const known = new Set((existing || []).flatMap((entry) => {
        const match = entry.notes?.match(/\[CARD:([a-f0-9]{32})\]/);
        return match ? [match[1]] : [];
      }));
      let duplicates = 0;
      let totalCents = 0;
      const data: Prisma.FinanceEntryCreateManyInput[] = [];
      for (const { row, category } of validated) {
        const { fingerprint } = prepared[row.index];
        if (known.has(fingerprint)) { duplicates++; continue; }
        const date = new Date(`${period}-15T15:00:00.000Z`);
        data.push({
          agencyId,
          createdByUserId: user.id,
          type: 'DESPESA',
          description: row.description,
          amountCents: row.amountCents,
          dueDate: date,
          category,
          paymentMethod: 'Cartão de crédito',
          notes: `[CARD:${fingerprint}] Cartão: ${card}; fatura: ${period}; compra: ${row.date}; arquivo: ${'fatura enviada pelo usuário'}`.slice(0, 450),
          status: 'PENDENTE',
          isRecurring: false,
          source: 'CARD_STATEMENT',
        });
        totalCents += row.amountCents;
        known.add(fingerprint);
      }
      if (data.length) {
        await tx.financeEntry.createMany({ data });
        await tx.historyLog.create({ data: {
          entityType: 'CARD_STATEMENT_IMPORT', entityId: user.id,
          action: 'FINANCE_STATEMENT_IMPORTED',
          description: `Importação de fatura ${card} (${period}): ${data.length} despesa(s), valor total R$ ${(totalCents / 100).toFixed(2)}; ${duplicates} duplicada(s) ignorada(s).`,
          authorName: user.name || user.email || 'Diretoria',
        } });
      }
      return { imported: data.length, duplicates, totalCents };
    });
    return NextResponse.json({ ok: true, ...outcome });
  } catch (error) {
    console.error('CARD_STATEMENT_IMPORT_ERROR', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível processar a fatura.' }, { status: 422 });
  }
}
