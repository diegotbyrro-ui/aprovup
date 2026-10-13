import {
  updateFinanceEntryAction,
  deleteFinanceEntryAction,
} from "./actions";

type FinanceEditableEntry = {
  id: string;
  type: string;
  description: string;
  category: string | null;
  amountCents: number;
  dueDate: Date;
  status: string;
  clientId: string | null;
  paymentMethod: string | null;
  notes: string | null;
  source: string | null;
  isRecurring: boolean;
};

export function FinanceEntryManagement({
  entry,
  clients,
  returnTo,
}: {
  entry: FinanceEditableEntry;
  clients: { id: string; name: string }[];
  returnTo: string;
}) {
  if (entry.status === "PAGO") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-400">
        <button type="button" disabled title="Reabra o pagamento antes de editar" className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-bold text-slate-400 opacity-70">Editar</button>
        <button type="button" disabled title="Reabra o pagamento antes de excluir" className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-bold text-slate-400 opacity-70">Excluir</button>
        <span>Reabra o pagamento para habilitar as alterações.</span>
      </div>
    );
  }
  const inputClass = "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-blue-500";
  return (
    <div className="flex flex-wrap items-start gap-2">
      <details className="group w-full rounded-lg border border-blue-100 bg-blue-50/30 sm:w-auto sm:min-w-[370px]">
        <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-[9px] font-bold text-blue-700 hover:bg-blue-50 [&::-webkit-details-marker]:hidden">
          Editar
        </summary>
        <form action={updateFinanceEntryAction.bind(null, entry.id)} className="grid gap-2 border-t border-blue-100 bg-white p-3 sm:grid-cols-2">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="text-[9px] font-semibold text-slate-600 sm:col-span-2">
            Descrição
            <input className={inputClass} name="description" required maxLength={240} defaultValue={entry.description} />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Tipo
            <select className={inputClass} name="type" defaultValue={entry.type}>
              <option value="RECEITA">Receita</option>
              <option value="DESPESA">Despesa</option>
            </select>
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Valor (R$)
            <input className={inputClass} name="amount" inputMode="decimal" required defaultValue={(entry.amountCents / 100).toFixed(2).replace(".", ",")} />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Vencimento
            <input className={inputClass} name="dueDate" type="date" required defaultValue={entry.dueDate.toISOString().slice(0, 10)} />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Cliente
            <select className={inputClass} name="clientId" defaultValue={entry.clientId || ""} disabled={entry.source === "CLIENT_MONTHLY_CONTRACT"}>
              <option value="">Sem cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            {entry.source === "CLIENT_MONTHLY_CONTRACT" ? (
              <input type="hidden" name="clientId" value={entry.clientId || ""} />
            ) : null}
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Categoria
            <input className={inputClass} name="category" defaultValue={entry.category || ""} />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Forma de pagamento
            <select className={inputClass} name="paymentMethod" defaultValue={entry.paymentMethod || ""}>
              <option value="">Não informado</option>
              {['Pix','Boleto','Transferencia','Cartao','Dinheiro','Permuta','Outro'].map((method) => <option key={method} value={method}>{method === 'Transferencia' ? 'Transfer\u00EAncia' : method === 'Cartao' ? 'Cart\u00E3o' : method}</option>)}
            </select>
          </label>
          <label className="text-[9px] font-semibold text-slate-600 sm:col-span-2">
            Observações
            <input className={inputClass} name="notes" defaultValue={entry.notes || ""} />
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 text-[9px] text-slate-500">Altera somente este lançamento; não modifica outros meses.</p>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-[9px] font-bold text-white hover:bg-blue-700">Salvar alterações</button>
          </div>
        </form>
      </details>
      <details className="group w-full rounded-lg border border-red-100 bg-red-50/30 sm:w-auto">
        <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-[9px] font-bold text-red-700 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
          Excluir
        </summary>
        <form action={deleteFinanceEntryAction.bind(null, entry.id)} className="max-w-sm space-y-2 border-t border-red-100 bg-white p-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          <p className="text-[9px] font-semibold text-red-700">Excluir apenas este lançamento: {entry.description}?</p>
          <p className="text-[9px] text-slate-500">A exclusão é permanente. Outras parcelas e mensalidades não serão excluídas.</p>
          {entry.source === "CLIENT_MONTHLY_CONTRACT" ? (
            <p className="text-[9px] font-semibold text-amber-700">Atenção: se gerar as mensalidades deste contrato novamente, esta cobrança poderá reaparecer.</p>
          ) : null}
          <label className="flex items-center gap-2 text-[9px] font-semibold text-red-800">
            <input type="checkbox" name="confirmDelete" value="SIM" required />
            Confirmo excluir esta cobrança.
          </label>
          <button type="submit" className="rounded-lg bg-red-600 px-3 py-2 text-[9px] font-bold text-white hover:bg-red-700">Confirmar exclusão</button>
        </form>
      </details>
    </div>
  );
}