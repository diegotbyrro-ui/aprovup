import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.APROVUP_CHECK_ROOT || process.cwd();
const ui = readFileSync(resolve(root, 'src/app/(dashboard)/social-media/page.tsx'), 'utf8');
const backend = readFileSync(resolve(root, 'src/app/(dashboard)/social-media/actions.ts'), 'utf8');

test('R5: legenda opcional no envio do Social Media', () => {
  const match = ui.match(/const canSend\s*=[\s\S]*?const waiting\s*=/);
  assert.ok(match, 'deve existir canSend');
  assert.match(match[0], /productionReady/);
  assert.match(match[0], /mediaUrl/);
  assert.doesNotMatch(match[0], /hasCaption/);
  assert.doesNotMatch(ui, /Aguardando legenda|Legenda pendente/);
});

test('R5: servidor aceita envio sem legenda e continua exigindo material final', () => {
  const match = backend.match(/export async function sendContentToFinalApprovalAction\([\s\S]*?const existingPendingApproval\s*=/);
  assert.ok(match, 'deve existir a acao de envio');
  assert.match(match[0], /FINAL_READY_STATUSES/);
  assert.match(match[0], /finalMediaUrl/);
  assert.doesNotMatch(match[0], /content\.caption|legenda precisa/i);
});

test('R5: a interface identifica a legenda como opcional', () => {
  assert.match(ui, /A legenda é opcional/);
  assert.match(ui, /"OPCIONAL"/);
  assert.match(ui, /Sem legenda cadastrada; envio permitido\./);
});