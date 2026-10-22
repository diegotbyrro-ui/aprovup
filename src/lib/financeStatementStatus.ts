/** Compras e debitos de extrato ja aconteceram; pagamento de fatura e outro evento. */
export function isStatementExpense(entry: { type: string; source?: string | null }): boolean {
  return entry.type === 'DESPESA' &&
    (entry.source === 'CARD_STATEMENT' || entry.source === 'BANK_STATEMENT');
}

/** Pendencias reais de caixa: nunca considerar cada compra da fatura como conta a pagar. */
export function isOpenPayableFinanceEntry(entry: { type: string; status: string; source?: string | null }): boolean {
  return entry.status !== 'PAGO' && !isStatementExpense(entry);
}
