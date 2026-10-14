import { prisma } from '@/lib/prisma';

export type LivFinanceDraft = {
  kind: 'RECEITA' | 'DESPESA';
  description: string;
  amount_brl: string;
  category: string;
  payment_method: string;
  occurred_on: string;
  client_name: string;
  was_paid: boolean;
  notes: string;
};

function localDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Maceio',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function parseLivAmount(value: unknown): number | null {
  let raw = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw || !/^[\d.,]+$/.test(raw)) return null;
  if (raw.includes(',')) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, '');
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function amountAppearsInRequest(request: string, amountCents: number): boolean {
  const numbers = request.match(/(?:R\$\s*)?\d[\d.,]*/g) || [];
  return numbers.some(value => parseLivAmount(value) === amountCents);
}

export function parseLivDate(dateString: unknown): Date | null {
  const value = String(dateString ?? '').trim();
  const local = value || localDateParts(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(local)) return null;
  const [year, month, day] = local.split('-').map(Number);
  const test = new Date(Date.UTC(year, month - 1, day, 15));
  if (test.getUTCFullYear() !== year || test.getUTCMonth() !== month - 1 || test.getUTCDate() !== day) return null;
  if (test.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  return test;
}

export async function validateLivFinanceDraft(agencyId: string, draft: LivFinanceDraft) {
  if (!['RECEITA', 'DESPESA'].includes(draft.kind)) {
    return { error: 'Informe se é despesa ou ganho.' } as const;
  }
  const amountCents = parseLivAmount(draft.amount_brl);
  if (!amountCents) return { error: 'Não entendi o valor. Informe em reais, por exemplo R$ 400,00.' } as const;
  const occurredAt = parseLivDate(draft.occurred_on);
  if (!occurredAt) return { error: 'Não entendi a data. Informe o dia do gasto ou recebimento.' } as const;
  const description = String(draft.description || '').trim().slice(0, 240);
  if (description.length < 3) return { error: 'Informe com o que foi gasto ou qual trabalho gerou a receita.' } as const;
  const category = String(draft.category || '').trim().slice(0, 100) || (draft.kind === 'RECEITA' ? 'Serviços extras' : 'Outras despesas');
  const paymentMethod = String(draft.payment_method || '').trim().slice(0, 50) || null;
  const notes = String(draft.notes || '').trim().slice(0, 500) || null;
  const clientName = String(draft.client_name || '').trim().slice(0, 120);
  let clientId: string | null = null;
  let resolvedClientName: string | null = null;
  if (clientName) {
    const found = await prisma.client.findMany({
      where: { agencyId, name: { contains: clientName, mode: 'insensitive' } },
      select: { id: true, name: true }, take: 3,
    });
    if (found.length > 1) return { error: 'Encontrei mais de um cliente com esse nome. Especifique qual é.' } as const;
    if (found.length === 1) {
      clientId = found[0].id;
      resolvedClientName = found[0].name;
    }
    // Uma receita pontual pode existir sem cliente cadastrado.
  }
  return {
    data: {
      kind: draft.kind,
      amountCents, description, category, paymentMethod, notes,
      dateISO: occurredAt.toISOString(),
      clientId, clientName: resolvedClientName,
      wasPaid: Boolean(draft.was_paid),
    },
  } as const;
}

export async function getLivFinanceSummary(agencyId: string, startIso?: string, endIso?: string) {
  const now = new Date();
  const today = localDateParts(now);
  const period = today.slice(0, 7);
  const [year, month] = period.split('-').map(Number);
  const defaultStart = new Date(Date.UTC(year, month - 1, 1, 15));
  const defaultEnd = new Date(Date.UTC(year, month, 1, 15));
  const parsedStart = startIso && !Number.isNaN(new Date(startIso).getTime()) ? new Date(startIso) : defaultStart;
  const parsedEnd = endIso && !Number.isNaN(new Date(endIso).getTime()) ? new Date(endIso) : defaultEnd;
  const endExclusive = endIso ? /^\d{4}-\d{2}-\d{2}$/.test(endIso.trim())
    ? new Date(new Date(endIso.trim() + 'T15:00:00Z').getTime() + 86400000)
    : new Date(parsedEnd.getTime() + 1) : parsedEnd;
  if (endExclusive <= parsedStart || endExclusive.getTime() - parsedStart.getTime() > 370 * 86400000) {
    return { error: 'Período inválido para o relatório financeiro.' };
  }
  const entries = await prisma.financeEntry.findMany({
    where: { agencyId, dueDate: { gte: parsedStart, lt: endExclusive }, type: { in: ['RECEITA', 'DESPESA'] } },
    select: { type: true, status: true, amountCents: true, isRecurring: true, category: true },
    take: 5000,
  });
  const sum = (rows: typeof entries) => rows.reduce((n, e) => n + e.amountCents, 0);
  const revenue = entries.filter(e => e.type === 'RECEITA');
  const expenses = entries.filter(e => e.type === 'DESPESA');
  const expenseCategories = new Map<string, number>();
  for (const entry of expenses) expenseCategories.set(entry.category || 'Sem categoria', (expenseCategories.get(entry.category || 'Sem categoria') || 0) + entry.amountCents);
  return {
    periodStart: parsedStart.toISOString(), periodEnd: endExclusive.toISOString(),
    incomeCents: sum(revenue),
    oneOffIncomeCents: sum(revenue.filter(e => !e.isRecurring)),
    receivedCents: sum(revenue.filter(e => e.status === 'PAGO')),
    expenseCents: sum(expenses),
    paidExpensesCents: sum(expenses.filter(e => e.status === 'PAGO')),
    balanceCents: sum(revenue) - sum(expenses),
    categories: [...expenseCategories].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, amountCents]) => ({ name, amountCents })),
    note: 'Os totais incluem lançamentos pendentes e pagos; valores recebidos/pagos foram discriminados separadamente.',
  };
}