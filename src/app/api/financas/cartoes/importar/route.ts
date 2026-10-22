import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/userAccess';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { parseBrowserPdfLines } from '@/lib/financePdfPayload';
import { parseBradescoBankStatement } from '@/lib/bradescoBankStatement';
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

type StatementReadResult = { rows: CardStatementRow[]; bankStatement: boolean };

async function parseUploadedStatement(file: File, period: string, sign: StatementSign, pdfLines: FormDataEntryValue | null): Promise<StatementReadResult> {
  const format = classifyStatementFile(file.name);
  if (file.size < 10 || file.size > 8 * 1024 * 1024) throw new Error('Selecione um arquivo entre 10 bytes e 8 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bankStatement = false;
  let rows: CardStatementRow[];
  if (format === 'csv') rows = parseCardCsv(readFileText(bytes), period, sign);
  else if (format === 'ofx') rows = parseCardOfx(readFileText(bytes), period);
  else {
    // PDF text was extracted by PDF.js in the authenticated director's browser.
    // No pdfjs-dist Node runtime dependency is required on the hosting server.
    if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') {
      throw new Error('Arquivo inválido: não encontrei a assinatura de um PDF.');
    }
    const positioned = parseBrowserPdfLines(pdfLines);
    const bankRows = parseBradescoBankStatement(positioned, period);
    bankStatement = bankRows !== null;
    rows = bankRows ?? parseCardPdfLines(positioned.map(line => line.text), period);
  }
  if (!rows.length) {
    throw new Error(format === 'pdf'
      ? 'Nenhum debito reconhecido neste PDF. Para extratos de outros bancos, experimente CSV ou OFX. PDFs digitalizados nao sao suportados.'
      : 'Nenhuma despesa reconhecida. Verifique o tipo de sinal de valores e exporte os lancamentos detalhados.');
  }
  return { rows: rows.slice(0, 1000), bankStatement };
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
    const sign: StatementSign = form.get('sign') === 'negative' ? 'negative' : form.get('sign') === 'positive' ? 'positive' : 'auto';
    const mode = String(form.get('mode') || 'preview');
    if (!/^[\p{L}\d][\p{L}\d\s._\-]{1,69}$/u.test(card)) {
      return NextResponse.json({ error: 'Informe um identificador para o cartão, por exemplo "Nubank PJ".' }, { status: 400 });
    }
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)) {
      return NextResponse.json({ error: 'Mês de referência inválido.' }, { status: 400 });
    }
    const { rows, bankStatement } = await parseUploadedStatement(file, period, sign, form.get('pdfLines'));
    if (mode === 'preview') {
      return NextResponse.json({ rows, bankStatement, count: rows.length, totalCents: rows.reduce((sum, row) => sum + row.amountCents, 0) });
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
        where: { agencyId, source: { in: ['CARD_STATEMENT', 'BANK_STATEMENT'] } },
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
        const date = new Date(bankStatement ? `${row.date}T15:00:00.000Z` : `${period}-15T15:00:00.000Z`);
        data.push({
          agencyId,
          createdByUserId: user.id,
          type: 'DESPESA',
          description: row.description,
          amountCents: row.amountCents,
          dueDate: date,
          category,
          paymentMethod: bankStatement ? 'Conta bancária' : 'Cartão de crédito',
          notes: `[CARD:${fingerprint}] Origem: ${bankStatement ? 'extrato bancário' : 'cartão'}; identificação: ${card}; período: ${period}; transação: ${row.date}`.slice(0, 450),
          status: bankStatement ? 'PAGO' : 'PENDENTE',
          paidAt: bankStatement ? date : null,
          isRecurring: false,
          source: bankStatement ? 'BANK_STATEMENT' : 'CARD_STATEMENT',
        });
        totalCents += row.amountCents;
        known.add(fingerprint);
      }
      if (data.length) {
        await tx.financeEntry.createMany({ data });
        await tx.historyLog.create({ data: {
          entityType: 'CARD_STATEMENT_IMPORT', entityId: user.id,
          action: 'FINANCE_STATEMENT_IMPORTED',
          description: `Importação de ${bankStatement ? 'extrato bancário' : 'fatura'} ${card} (${period}): ${data.length} débito(s), R$ ${(totalCents / 100).toFixed(2)}; ${duplicates} duplicado(s) ignorado(s).`,
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
