import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function src(name){ return fs.readFileSync(name,'utf8'); }
const helper=src('src/lib/finalMonthlyApproval.ts');
const manager=src('src/app/(dashboard)/clientes/[id]/aprovacao-final/page.tsx');
const monthlyActions=src('src/app/(dashboard)/clientes/[id]/aprovacao-final/actions.ts');
const publicPage=src('src/app/aprovacao-final/[token]/page.tsx');
const publicActions=src('src/app/aprovacao-final/[token]/actions.ts');
const cal=src('src/app/(dashboard)/calendario-editorial/page.tsx');
const emergency=src('src/app/(dashboard)/demandas-emergenciais/nova/actions.ts');

test('Demanda emergencial nao tem plannedDate e entra diretamente na producao',()=>{
  assert.match(emergency,/format:\s*"DEMANDA_EMERGENCIAL"/);
  assert.match(emergency,/plannedDate:\s*null/);
  assert.match(emergency,/productionDeadline:\s*deadlineDate/);
  assert.match(emergency,/status:\s*"APROVADO"/);
});
test('Token individual antigo funciona mesmo sem plannedDate e fica restrito ao seu conteudo',()=>{
  assert.match(helper,/const referenceDate = finalApprovalReferenceDate\(legacy\.content\)/);
  assert.match(helper,/legacyContentId: legacy\.contentId/);
  assert.match(helper,/source === 'LEGACY' && context\.legacyContentId/);
  assert.match(helper,/return \{ id: context\.legacyContentId \}/);
});
test('Links mensais consideram prazo de producao da emergencial, sem alterar conteudos normais',()=>{
  assert.match(helper,/format: 'DEMANDA_EMERGENCIAL'[\s\S]*?plannedDate: null,[\s\S]*?productionDeadline:/);
  assert.match(helper,/productionDeadline: null,[\s\S]*?createdAt:/);
  assert.match(helper,/plannedDate: \{ gte: context\.start, lt: context\.end \}/);
});
test('Gerenciador inclui emergenciais com prazo e gera link mensal valido',()=>{
  assert.match(manager,/finalApprovalReferenceDate\(content\)/);
  assert.doesNotMatch(manager,/not:\s*'DEMANDA_EMERGENCIAL'/);
  assert.match(manager,/finalMonthlyApproval[\s\S]*?createMany/);
});
test('Pagina publica exibe somente escopo permitido e materiais com arquivo final',()=>{
  assert.match(publicPage,/\.\.\.finalApprovalContentScope\(approvalContext\)/);
  assert.doesNotMatch(publicPage,/not:\s*'DEMANDA_EMERGENCIAL'/);
  assert.match(publicPage,/finalMediaUrl:[\s\S]*?not:\s*null/);
});
test('Aprovar, desfazer e solicitar alteracoes validam o mesmo escopo individual/mensal',()=>{
  assert.equal(publicActions.match(/\.\.\.finalApprovalContentScope\(context\)/g)?.length,3);
  assert.match(publicActions,/status:\s*'PRONTO_PARA_POSTAR'/);
  assert.match(publicActions,/status:\s*'ALTERACAO_SOLICITADA'/);
  assert.match(publicActions,/publication-locked/);
});
test('Gerenciador permite enviar emergencial so apos material finalizado',()=>{
  assert.doesNotMatch(monthlyActions,/if \(content\.format === 'DEMANDA_EMERGENCIAL'\)/);
  assert.doesNotMatch(monthlyActions,/format: \{ not: "DEMANDA_EMERGENCIAL" \}/);
  assert.match(monthlyActions,/READY_STATUSES\.includes\(content\.status\)/);
  assert.match(monthlyActions,/!content\.finalExternalUrl/);
});

test('Escopo mensal continua aplicado mesmo com OR de anexos finais', () => {
  assert.match(helper, /AND:\s*\[\s*\{\s*OR:\s*\[/);
  assert.match(publicPage, /\.\.\.finalApprovalContentScope\(approvalContext\)/);
  assert.match(publicPage, /OR:\s*\[[\s\S]*?finalMediaUrl/);
});

test('Calendario abre gerenciador interno, nao um token individual incorreto',()=>{
  assert.match(cal,/\/clientes\/\$\{selectedClient\}\/aprovacao-final/);
  assert.doesNotMatch(cal,/secondStageApproval\.token/);
});
