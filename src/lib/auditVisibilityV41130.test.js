'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=process.env.APROVUP_V41131_SOURCE_ROOT || process.cwd();
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const design=read('src/app/(dashboard)/design/page.tsx');
const filmmaker=read('src/app/(dashboard)/filmmaker/page.tsx');

test('Design nao lista ideias sem primeira aprovacao do cliente',()=>{
  assert.match(design,/status:\s*\{ in: Array\.from\(new Set\(/);
  assert.match(design,/statusKeys\.filter\(\(key\) => key !== \"IDEIA\"\)/);
  assert.doesNotMatch(design,/Demandas que estavam fora das colunas/);
});
test('Filmmaker recebe apenas status aprovados que pertencem a coluna',()=>{
  assert.match(filmmaker,/statusKeys\.filter\(\(key\) => key !== \"IDEIA\"\)/);
  assert.doesNotMatch(filmmaker,/Demandas audiovisuais fora das colunas/);
  assert.doesNotMatch(filmmaker,/outsideFlowTotal|outsideFlowWhere/);
});
test('Nao reintroduz arquivados ou publicados como ideias',()=>{
  assert.ok(!design.includes('ARQUIVADO_DIRETORIA\" },'));
  assert.match(design,/\"PUBLICADO_MANUALMENTE\"/);
});
