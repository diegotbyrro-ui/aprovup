import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStatementExpense, isOpenPayableFinanceEntry } from './financeStatementStatus.ts';

test('compras de cartao de credito sao gastos confirmados mas nao fatura paga', () => {
  const entry = { type: 'DESPESA', status: 'PENDENTE', source: 'CARD_STATEMENT' };
  assert.equal(isStatementExpense(entry), true);
  assert.equal(isOpenPayableFinanceEntry(entry), false);
});
test('extratos bancarios identificam saidas ja confirmadas', () => {
  const entry = { type: 'DESPESA', status: 'PAGO', source: 'BANK_STATEMENT' };
  assert.equal(isStatementExpense(entry), true);
  assert.equal(isOpenPayableFinanceEntry(entry), false);
});
test('despesa comum pendente continua nos alertas de pagamento', () => {
  assert.equal(isOpenPayableFinanceEntry({ type: 'DESPESA', status: 'PENDENTE', source: 'MANUAL' }), true);
});
test('receita nao vira compra confirmada', () => {
  assert.equal(isStatementExpense({ type: 'RECEITA', source: 'CARD_STATEMENT' }), false);
});
test('despesa paga comum nao vira pendencia', () => {
  assert.equal(isOpenPayableFinanceEntry({ type: 'DESPESA', status: 'PAGO', source: null }), false);
});
