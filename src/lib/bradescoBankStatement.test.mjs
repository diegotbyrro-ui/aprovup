import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBradescoBankStatement } from './bradescoBankStatement.ts';

function line(page, y, tokens) {
  const normalized = tokens.map(([x,text,offset=0]) => ({x,y:y+offset,text}));
  return {page,text:normalized.map(t=>t.text).join(' '),tokens:normalized};
}

test('Bradesco Celular: le debitos e ignora creditos, saldo e totais', () => {
  const doc = [
    line(1,790,[[200,'Bradesco Celular']]),
    line(1,733,[[50,'Data'],[110,'Histórico'],[398,'Crédito (R$)'],[460,'Débito (R$)'],[524,'Saldo (R$)']]),
    line(1,676,[[110,'PIX ENVIADO']]),
    line(1,672,[[46,'13/10/2026'],[303,'1234567'],[470,'180,00'],[523,'2.360,14']]),
    line(1,664,[[110,'DES: FORNECEDOR TESTE']]),
    line(1,635,[[110,'PIX RECEBIDO']]),
    line(1,631,[[46,'15/10/2026'],[303,'2234567'],[399,'3.000,00'],[523,'5.360,14']]),
    line(1,623,[[110,'REM: CLIENTE TESTE']]),
    line(1,590,[[110,'PAGTO ELETRON COBRANCA']]),
    line(1,586,[[303,'3234567'],[472,'611,01'],[523,'4.749,13']]),
    line(1,579,[[110,'SERVICO COMERCIAL']]),
    line(1,540,[[46,'Total'],[399,'3.000,00'],[472,'791,01'],[523,'4.749,13']]),
    line(2,790,[[200,'Bradesco Celular']]),
    line(2,733,[[50,'Data'],[110,'Histórico'],[398,'Crédito (R$)'],[460,'Débito (R$)'],[524,'Saldo (R$)']]),
    line(2,684,[[46,'21/10/2026'],[110,'PIX ENVIADO'],[472,'40,00'],[523,'4.709,13']]),
    line(2,676,[[110,'DES: OUTRO FORNECEDOR']]),
  ];
  const rows = parseBradescoBankStatement(doc,'2026-10');
  assert.equal(rows?.length,3);
  assert.deepEqual(rows.map(row=>row.amountCents),[18000,61101,4000]);
  assert.deepEqual(rows.map(row=>row.date),['2026-10-13','2026-10-15','2026-10-21']);
  assert.match(rows[0].description,/FORNECEDOR TESTE/);
  assert.equal(rows.reduce((sum,row)=>sum+row.amountCents,0),83101);
});

test('PDF de outra instituicao usa o parser generico',()=>{
 assert.equal(parseBradescoBankStatement([{page:1,text:'Banco',tokens:[]}],'2026-10'),null);
});
