'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.APROVUP_V41130_SOURCE_ROOT || process.cwd();
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');
const filmmaker = read('src/app/(dashboard)/filmmaker/page.tsx');
const design = read('src/app/(dashboard)/design/page.tsx');

test('Filmmaker lista status ativos fora do Kanban sem mudar estados', () => {
  assert.match(filmmaker,/status:\s*\{\s*notIn:\s*outsideFlowExcluded\s*\}/);
  for (const v of ['PUBLICADO', 'PUBLICADO_MANUALMENTE', 'ARQUIVADO_DIRETORIA']) {
    assert.ok(filmmaker.includes('"'+v+'"'));
  }
  assert.match(filmmaker,/prisma\.content\.count\(\{ where: outsideFlowWhere \}\)/);
  assert.match(filmmaker,/prisma\.content\.findMany\(\{\s*where: outsideFlowWhere/);
});

test('Filmmaker restringe a consulta a agencia e filtro do cliente', () => {
  const b = filmmaker.slice(filmmaker.indexOf('const outsideFlowWhere:'), filmmaker.indexOf('const outsideFlowNow'));
  assert.match(b,/agencyId:\s*currentUser\.agencyId/);
  assert.match(b,/selectedClient\s*!==\s*"TODOS"/);
  assert.match(b,/area:\s*"FILMMAKER"/);
  assert.match(b,/take:\s*150/);
});

test('Prazos atrasados priorizados e links seguros aos registros originais', () => {
  assert.match(filmmaker,/classifyDirectorOverdue\(item, outsideFlowNow\)/);
  assert.match(filmmaker,/outsideFlowOverdue\.slice\(0, 15\)/);
  assert.match(filmmaker,/href=\{`\/conteudos\/\$\{item\.id\}`\}/);
  assert.match(design,/designOutsideFlowOverdue\.slice\(0, 15\)/);
  assert.match(design,/href=\{`\/conteudos\/\$\{content\.id\}`\}/);
});

test('Design preserva todos os estados fora do fluxo e prioriza atraso', () => {
  assert.match(design,/designOutsideFlowSorted = \[\.\.\.designOutsideFlow\]\.sort/);
  assert.match(design,/designOutsideFlowOverdue = designOutsideFlowSorted\.filter\(isLate\)/);
  assert.match(design,/designOutsideFlowSorted\.map\(\(content\) =>/);
});

// Regressao V4.1.130 R4: teste legado conferenceDates.test.js exige
// a frase literal que identifica demandas fora das colunas do Design.
test('Design preserva o titulo exigido pelo teste legado de conferencia', () => {
  assert.match(design,/Demandas que estavam fora das colunas/);
  assert.match(design,/status:\s*\{\s*not:\s*"ARQUIVADO_DIRETORIA"\s*\}/);
});
