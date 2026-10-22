'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownToLine, CheckCircle2, FileSpreadsheet, LoaderCircle, RotateCcw, UploadCloud } from 'lucide-react';
import { CARD_CATEGORIES, type CardStatementRow, type StatementSign } from '@/lib/cardStatementParser';

type DisplayRow = CardStatementRow & { checked: boolean };
const reais = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function CardStatementsClient({ initialPeriod }: { initialPeriod: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [card, setCard] = useState('');
  const [period, setPeriod] = useState(initialPeriod);
  const [sign, setSign] = useState<StatementSign>('auto');
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [bankStatement, setBankStatement] = useState(false);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; duplicates: number; totalCents: number } | null>(null);

  const active = useMemo(() => rows.filter((row) => row.checked), [rows]);
  const total = active.reduce((sum, row) => sum + row.amountCents, 0);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of active) map.set(row.category, (map.get(row.category) || 0) + row.amountCents);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [active]);

  async function submit(mode: 'preview' | 'import') {
    if (!file || !card.trim() || !period) {
      setError('Informe o cartão, o mês da fatura e escolha o arquivo.');
      return;
    }
    if (mode === 'import' && !active.length) {
      setError('Marque pelo menos uma despesa para importar.');
      return;
    }
    setBusy(mode);
    setError('');
    setResult(null);
    try {
      const data = new FormData();
      if (/\.pdf$/i.test(file.name)) {
        // Read text locally in the browser with a matching, static PDF worker.
        // The authenticated server validates the structured text and PDF header.
        const { extractPositionedPdfText } = await import('@/lib/browserPdfText');
        const lines = await extractPositionedPdfText(file);
        data.append('pdfLines', JSON.stringify(lines));
      }
      data.append('file', file);
      data.append('card', card);
      data.append('period', period);
      data.append('sign', sign);
      data.append('mode', mode);
      if (mode === 'import') data.append('selection', JSON.stringify(active.map((row) => ({ index: row.index, category: row.category }))));
      const response = await fetch('/api/financas/cartoes/importar', { method: 'POST', body: data, credentials: 'same-origin' });
      const body = await response.json();
      if (!response.ok) throw new Error(String(body.error || 'Falha no processamento da fatura.'));
      if (mode === 'preview') {
        setBankStatement(body.bankStatement === true);
        setRows((body.rows as CardStatementRow[]).map((row) => ({ ...row, checked: true })));
      } else {
        setResult({ imported: body.imported, duplicates: body.duplicates, totalCents: body.totalCents });
        setRows([]);
        setFile(null);
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível processar esse arquivo.');
    } finally { setBusy(null); }
  }

  function resetPreview() { setRows([]); setBankStatement(false); setResult(null); setError(''); }
  function editRow(index: number, patch: Partial<DisplayRow>) {
    setRows((old) => old.map((row) => row.index === index ? { ...row, ...patch } : row));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><UploadCloud size={21} /></div>
          <div><h2 className="font-bold text-slate-950">Importar extrato ou fatura</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Baixe o extrato detalhado no aplicativo do banco e envie aqui. Aceita CSV, TSV, OFX, QFX, QBO e PDF com texto selecionável. PDFs são lidos no navegador; os arquivos não ficam armazenados no APROVUP.</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">Identificação do cartão ou conta
            <input value={card} onChange={(e) => { setCard(e.target.value); resetPreview(); }} placeholder="Ex.: Nubank PJ, Conta Bradesco" maxLength={70} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <label className="text-xs font-bold text-slate-700">Mês da fatura
            <input type="month" value={period} onChange={(e) => { setPeriod(e.target.value); resetPreview(); }} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <label className="text-xs font-bold text-slate-700">Arquivo de despesas
            <input type="file" accept=".csv,.tsv,.ofx,.qfx,.qbo,.pdf,text/csv,text/tab-separated-values,application/pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); resetPreview(); }} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs" />
          </label>
          <label className="text-xs font-bold text-slate-700">Formato dos valores CSV
            <select value={sign} onChange={(e) => { setSign(e.target.value as StatementSign); resetPreview(); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <option value="auto">Detectar automaticamente (recomendado)</option>
              <option value="positive">Compras com valor positivo (+)</option>
              <option value="negative">Compras com valor negativo (−)</option>
            </select>
            <span className="mt-1 block text-[11px] font-normal text-slate-500">No CSV, o APROVUP identifica automaticamente o sinal mais provavel. Se o banco exportar compras de forma diferente, selecione a opcao manual antes de analisar.</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy !== null || !file} onClick={() => submit('preview')} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            {busy === 'preview' ? <LoaderCircle className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
            Analisar arquivo
          </button>
          <p className="text-xs text-slate-500">Máximo de 8 MB e até 1.000 despesas por arquivo.</p>
        </div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}
        {result && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <span className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> Importação concluída</span>
          <p className="mt-1">{result.imported} despesas adicionadas ({reais(result.totalCents)}). {result.duplicates} duplicadas ignoradas.</p>
        </div>}
      </section>

      {rows.length > 0 && <>
        {bankStatement && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><b>Extrato bancário identificado:</b> foram lidos apenas os valores da coluna Débito. Créditos e saldos foram ignorados. Débitos bancários já realizados serão lançados como pagos. Revise principalmente transferências PIX para não classificar movimentações entre contas como despesas.</div>}
        <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{bankStatement ? 'Prévia do extrato bancário' : 'Prévia da fatura'}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{reais(total)}</h2>
              <p className="mt-1 text-xs text-slate-600">{active.length} de {rows.length} despesas selecionadas. Revise as categorias e desmarque pagamentos, estornos ou lançamentos incorretos.</p>
            </div>
            <button type="button" onClick={() => setRows((old) => old.map((row) => ({ ...row, checked: true })))} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700">Selecionar todas</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byCategory.map(([category, cents]) => <div key={category} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex justify-between gap-2 text-xs"><b className="text-slate-700">{category}</b><b>{reais(cents)}</b></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${total ? cents / total * 100 : 0}%` }} /></div>
            </div>)}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Despesas reconhecidas</h3>
            <span className="text-xs text-slate-400">{rows.length} lançamentos</span>
          </div>
          <div className="max-h-[480px] space-y-2 overflow-auto p-3">
            {rows.map((row) => <div key={row.index} className={`grid gap-2 rounded-xl border p-3 md:grid-cols-[28px_88px_minmax(0,1fr)_170px_105px] md:items-center ${row.checked ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <label><input type="checkbox" checked={row.checked} onChange={(e) => editRow(row.index, { checked: e.target.checked })} aria-label={`Incluir ${row.description}`} /></label>
              <span className="text-xs text-slate-500">{row.date.split('-').reverse().join('/')}</span>
              <span className="truncate text-xs font-semibold text-slate-800" title={row.description}>{row.description}</span>
              <select value={row.category} onChange={(e) => editRow(row.index, { category: e.target.value })} aria-label={`Categoria de ${row.description}`} className="min-w-0 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                {CARD_CATEGORIES.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
              <span className="text-right text-sm font-bold text-slate-900">{reais(row.amountCents)}</span>
            </div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4">
            <span className="max-w-xl text-xs text-slate-600">{bankStatement ? <>Importa os débitos da conta como despesas <b>pagas</b>, na data da movimentação. Confira PIX para contas próprias e transferências que não sejam despesas.</> : <>Registra cada compra como <b>gasto confirmado</b> no mês da fatura. <b>A fatura não fica marcada como paga.</b> O pagamento do cartão é controlado separadamente e não deve duplicar essas despesas.</>}</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={resetPreview} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700"><RotateCcw size={15} /> Limpar</button>
              <button type="button" disabled={busy !== null || active.length === 0} onClick={() => submit('import')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                {busy === 'import' ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />} Importar {active.length} despesas
              </button>
            </div>
          </div>
        </section>
      </>}
    </div>
  );
}
