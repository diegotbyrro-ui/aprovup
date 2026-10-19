"use strict";
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const wa=read('src/lib/secretaryWhatsApp.ts');
const a=read('src/app/(dashboard)/secretaria/configuracoes/actions.ts');
const page=read('src/app/(dashboard)/secretaria/configuracoes/page.tsx');
test('teste diario restringe a uma agencia e destinatario',()=>{
  assert.match(wa,/manualTest.agencyId/);assert.match(wa,/manualTest.memberId/);
  assert.match(a,/agencyId: requestingUser.agencyId/);assert.match(a,/role: 'DIRECTOR'/);
});
test('teste nao substitui o agendamento normal de 18h',()=>{
  assert.match(wa,/local.hour !==[\s\S]*18 &&[\s\S]*!manualTest/);
  assert.match(wa,/daily-test:/);assert.match(wa,/randomUUID()/);
  assert.ok(wa.includes('forceDailyTemplate: Boolean(manualTest)'));
});
test('teste obriga modelo Meta e preserva cooldown',()=>{
  assert.match(a,/LIV_DAILY_BRIEF_TEMPLATE_NAME/);
  assert.match(a,/oneHourAgo/);assert.match(wa,/!insideWindow \|\| forceDailyTemplate/);
});
test('botao disponivel apenas para a diretoria e alvos elegiveis',()=>{
  assert.match(page,/user.role === 'DIRECTOR'/);
  assert.match(page,/member.isActive && member.receiveAlerts/);
  assert.match(page,/testLivDailyBriefAction/);
});
