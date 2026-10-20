import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const page = readFileSync(resolve(process.cwd(), 'src/app/(dashboard)/calendario-editorial/page.tsx'), 'utf8');
const manager = readFileSync(resolve(process.cwd(), 'src/app/(dashboard)/clientes/[id]/aprovacao-final/page.tsx'), 'utf8');
const publicApproval = readFileSync(resolve(process.cwd(), 'src/app/aprovacao-final/[token]/page.tsx'), 'utf8');

test('2ª aprovação no Calendário Editorial abre gerenciador interno do cliente', () => {
  assert.match(page, /const secondStageHref\s*=\s*selectedClient !== 'TODOS'\s*\? `\/clientes\/\$\{selectedClient\}\/aprovacao-final`\s*:\s*'\/clientes';/);
  assert.match(page, /href=\{secondStageHref\}/);
});

test('não usa token da primeira etapa para abrir aprovação final', () => {
  assert.doesNotMatch(page, /const secondStageApproval\s*=/);
  assert.doesNotMatch(page, /`\/aprovacao-final\/\$\{secondStageApproval\.token\}`/);
});

test('gerenciador verifica agência e cliente antes de exibir', () => {
  assert.match(manager, /requireAgencyContext/);
  assert.match(manager, /prisma\.client\.findFirst/);
  assert.match(manager, /agencyId/);
  assert.match(manager, /notFound\(\)/);
});

test('link público final depende de contexto de aprovação final', () => {
  assert.match(publicApproval, /resolveFinalApprovalContext/);
  assert.match(manager, /finalMonthlyApproval/);
});
