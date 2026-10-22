import Link from 'next/link';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import { CardStatementsClient } from './CardStatementsClient';

export const dynamic = 'force-dynamic';
const reais = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export default async function CreditCardStatementsPage({ searchParams }: {
  searchParams?: Promise<{ periodo?: string }>;
}) {
  const user = await requirePermission('settings.manage');
  const requested = (await searchParams)?.periodo || '';
  const today = new Date();
  const current = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio', year: 'numeric', month: '2-digit' })
    .formatToParts(today);
  const defaultMonth = `${current.find((part) => part.type === 'year')?.value}-${current.find((part) => part.type === 'month')?.value}`;
  const period = /^20\d{2}-(0[1-9]|1[0-2])$/.test(requested) ? requested : defaultMonth;
  const start = new Date(`${period}-01T03:00:00.000Z`);
  const [year, month] = period.split('-').map(Number);
  const end = new Date(Date.UTC(year, month, 1, 3));
  const expenses = await prisma.financeEntry.findMany({
    where: { agencyId: user.agencyId, type: 'DESPESA', source: 'CARD_STATEMENT', dueDate: { gte: start, lt: end } },
    select: { amountCents: true, category: true, notes: true, status: true }, take: 5000,
  });
  const groups = new Map<string, number>();
  for (const item of expenses) groups.set(item.category || 'Outras despesas', (groups.get(item.category || 'Outras despesas') || 0) + item.amountCents);
  const total = expenses.reduce((sum, row) => sum + row.amountCents, 0);
  const ordered = [...groups.entries()].sort((a, b) => b[1] - a[1]);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start);
  return <div className="mx-auto max-w-6xl space-y-6 p-4 pb-12 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/financas" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700"><ArrowLeft size={16}/> Voltar a Finanças</Link>
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Importação manual · sem conexão bancária</span>
    </div>
    <header className="rounded-3xl bg-slate-950 p-6 text-white md:p-8">
      <div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-white/10 p-2.5"><CreditCard size={23}/></span><span className="text-xs font-bold uppercase tracking-widest text-blue-300">Finanças</span></div>
      <h1 className="text-2xl font-black md:text-3xl">Faturas e extratos de cartão</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-300">Envie as compras do mês, classifique as despesas e entenda quais categorias consomem mais orçamento. Você revisa tudo antes do lançamento.</p>
    </header>
    <CardStatementsClient initialPeriod={period}/>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black text-slate-900">Onde estão os gastos?</h2>
        <p className="text-xs text-slate-500">Despesas de cartão já importadas para {label}. Atualize o período pela URL ou volte ao Financeiro para ver todos os meses.</p></div>
        <div className="text-right"><div className="text-xl font-black text-slate-950">{reais(total)}</div><div className="text-xs text-slate-500">{expenses.length} despesas registradas</div></div>
      </div>
      {!ordered.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Ainda não há despesas de cartão importadas para este mês. Faça o envio acima para gerar a análise.</p> :
        <div className="space-y-3">{ordered.map(([category, cents]) => <div key={category}>
          <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{category}</span><span className="font-black text-slate-900">{reais(cents)} · {Math.round(cents / total * 100)}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${cents / total * 100}%` }} /></div>
        </div>)}</div>}
      <p className="mt-4 text-xs text-slate-500">Valores importados ficam como pendentes até você registrar o pagamento; os gastos são apresentados por mês de fatura, sem somar o pagamento da fatura como nova despesa.</p>
    </section>
  </div>;
}
