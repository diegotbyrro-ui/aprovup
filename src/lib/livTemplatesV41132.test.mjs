'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.env.APROVUP_V41132_SOURCE_ROOT||process.cwd();
const code=fs.readFileSync(path.join(root,'src/lib/secretaryWhatsApp.ts'),'utf8');
const env=fs.readFileSync(path.join(root,'.env.example'),'utf8');
test('tres templates homologados e fallback generico',()=>{
  for(const key of ['LIV_DAILY_BRIEF_TEMPLATE_NAME','LIV_PRODUCTION_BRIEF_TEMPLATE_NAME','LIV_OVERDUE_ALERT_TEMPLATE_NAME']){
    assert.ok(code.includes(key)); assert.ok(env.includes(key+'='));
  }
  assert.match(code,/: await sendWhatsappTemplate\(\{/);
  assert.match(code,/sendWhatsappDailyTemplate\(\{/);
});
test('onze parametros do resumo de producao seguem ordem Meta',()=>{
  const x=code.match(/fields: \[productionSummary\.name,([\s\S]*?)\],/);assert.ok(x);
  assert.deepEqual([...x[1].matchAll(/productionSummary\.(\w+)/g)].map(y=>y[1]),
    ['sector','date','pending','overdue','today','upcoming','top1','top2','top3','url']);
});
test('seis parametros de alerta seguem ordem Meta',()=>{
  const x=code.match(/fields: \[overdueSummary\.name,([\s\S]*?)\],/);assert.ok(x);
  assert.deepEqual([...x[1].matchAll(/overdueSummary\.(\w+)/g)].map(y=>y[1]),
    ['sector','demand','deadline','overdue','url']);
});
test('formato do template preserva janela e cooldown',()=>{
  assert.match(code,/!insideWindow \|\| forceDailyTemplate \|\| forceStructuredTemplate/);
  assert.match(code,/insideWindow && !forceDailyTemplate && !forceStructuredTemplate/);
  assert.match(code,/META ECOSYSTEM BACKOFF/);
  assert.match(code,/60 MIN COOLDOWN/);
});
test('modelo Meta aceita apenas 11 ou 6 parametros e usa pt_BR',()=>{
  assert.match(code,/fields\.length !== 11 && fields\.length !== 6/);
  assert.match(code,/LIV_PRODUCTION_BRIEF_TEMPLATE_LANGUAGE/);
  assert.match(code,/LIV_OVERDUE_ALERT_TEMPLATE_LANGUAGE/);
  assert.match(code,/parameters: fields\.map/);
});
test('IDEIA, arquivados e publicados nao entram nas cobrancas',()=>{
  assert.match(code,/'IDEIA', 'ARQUIVADO_DIRETORIA'/);
  assert.match(code,/PUBLICADO_MANUALMENTE/);
  assert.match(code,/status: \{ in: \[\.\.\.designStatuses\] \}/);
  assert.match(code,/status: \{ in: \[\.\.\.videoStatuses\] \}/);
});
test('deduplicacao dos resumos, selecao de prioridades e links',()=>{
  assert.match(code,/production-summary-v2:/);
  assert.match(code,/const priorities = \[\.\.\.overdue, \.\.\.dueToday, \.\.\.upcoming\]\.slice\(0, 3\)/);
  assert.match(code,/productionSummary: \{/);
  assert.match(code,/url: 'https:\/\/aprovup\.com\.br' \+ sectorHref/);
});
test('cobrancas agrupadas preservam marcadores e status COVERED',()=>{
  assert.match(code,/production-late-group-v2:/);
  assert.match(code,/const newlyOverdue = overdueToday\.filter/);
  assert.match(code,/const coveredKey =/);
  assert.match(code,/status: 'COVERED'/);
  assert.match(code,/overdueSummary: \{/);
});
test('escopo por agencia, funcao e setor permanece protegido',()=>{
  assert.match(code,/role: \{ in: \['DESIGN', 'FILMMAKER'\] \}/);
  assert.match(code,/const workload = contents\.filter\(\(item\) => item\.area === role\)/);
  assert.match(code,/const names = new Map/);
});
