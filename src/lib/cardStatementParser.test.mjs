import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCardAmount, parseCardCsv, parseCardOfx, parseCardPdfLines, parseCardDate, suggestCardCategory } from './cardStatementParser.ts';

test('valores brasileiros e centavos', () => {
  assert.equal(parseCardAmount('R$ 1.234,56'), 123456);
  assert.equal(parseCardAmount('-45,90'), -4590);
  assert.equal(parseCardAmount('45.90'), 4590);
  assert.equal(parseCardAmount('abc'), null);
});
test('data de compra e virada de ano', () => {
  assert.equal(parseCardDate('22/10/2026', '2026-10'), '2026-10-22');
  assert.equal(parseCardDate('20/12', '2027-01'), '2026-12-20');
  assert.equal(parseCardDate('31/02/2026', '2026-02'), null);
});
test('CSV: campos entre aspas, despesas e estornos', () => {
  const csv = 'data;descricao;valor\n22/10/2026;"Supermercado, bairro";125,70\n21/10/2026;PAGAMENTO RECEBIDO;120,00\n20/10/2026;Estorno;-50,00';
  const rows = parseCardCsv(csv, '2026-10', 'positive');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amountCents, 12570);
  assert.equal(rows[0].category, 'Supermercado');
});
test('CSV com sinal negativo nas compras', () => {
  const csv = 'Data,Descrição,Valor\n22/10/2026,Uber,-16.90\n22/10/2026,Estorno,16.90';
  const rows = parseCardCsv(csv, '2026-10', 'negative');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amountCents, 1690);
});
test('OFX reconhece gastos e ignora entradas', () => {
  const text = '<OFX><STMTTRN><DTPOSTED>20261022100000<TRNAMT>-22.30<NAME>Uber</STMTTRN><STMTTRN><DTPOSTED>20261021<TRNAMT>100.00<NAME>Pagamento</STMTTRN></OFX>';
  const rows = parseCardOfx(text, '2026-10');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amountCents, 2230);
});
test('PDF textual reconhece linha simples', () => {
  const rows = parseCardPdfLines(['22/10/2026 RESTAURANTE DO CENTRO 51,50','TOTAL DA FATURA 1.000,00'], '2026-10');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amountCents, 5150);
});
test('classifica categorias frequentes', () => {
  assert.equal(suggestCardCategory('Adobe Creative Cloud'), 'Software e assinaturas');
  assert.equal(suggestCardCategory('Google Ads'), 'Marketing e anúncios');
});
