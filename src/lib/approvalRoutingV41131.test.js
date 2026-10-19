'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=process.env.APROVUP_V41131_SOURCE_ROOT||process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const d=read('src/app/(dashboard)/design/page.tsx');
const f=read('src/app/(dashboard)/filmmaker/page.tsx');
const routing=read('src/lib/contentRouting.ts');
const approval=read('src/app/aprovacao-calendario/[token]/actions.ts');
const monthly=read('src/app/aprovacao-mensal/[token]/actions.ts');
test('Nenhum painel exibe quadros grandes de status IDEIA',()=>{
 assert.doesNotMatch(d,/Demandas que estavam fora das colunas|designOutsideFlow/);
 assert.doesNotMatch(f,/Demandas audiovisuais fora das colunas|outsideFlowTotal/);
});
test('Produção exclui IDEIA mesmo em colunas customizadas',()=>{
 assert.match(d,/statusKeys\.filter\(\(key\) => key !== "IDEIA"\)/);
 assert.match(f,/statusKeys\.filter\(\(key\) => key !== "IDEIA"\)/);
});
test('Videos planejados pela social seguem ao Filmmaker após primeira aprovação',()=>{
 const ixVideo=routing.indexOf('if (isVideoContent(content))');
 const ixDesign=routing.indexOf("if (area === 'DESIGN')");
 const ixSocial=routing.indexOf("if (area === 'SOCIAL_MEDIA')");
 assert.ok(ixVideo>=0&&ixDesign>ixVideo&&ixSocial>ixDesign);
});
test('Aprovacao inicial encaminha para a area e status de producao',()=>{
 for(const a of [approval,monthly]){
  assert.match(a,/getApprovedContentDestination\(content\)/);
  assert.match(a,/status: 'APROVADO'/);
  assert.match(a,/area: destination/);
 }
});

test('Teste legado de conferencia foi atualizado sem exigir quadro antigo',()=>{
 const c=read('src/lib/conferenceDates.test.js');
 assert.match(c,/assert\.doesNotMatch\(design,\/designOutsideFlow\//);
 assert.match(c,/assert\.doesNotMatch\(design,\/Demandas que estavam fora das colunas\//);
 assert.doesNotMatch(c,/assert\.match\(design,\/designOutsideFlow\//);
 assert.doesNotMatch(c,/assert\.match\(design,\/Demandas que estavam fora das colunas\//);
 assert.ok(c.includes("assert.match(design,/status:\\s*\\{ in:/);"));
});
