import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getManualPublicationRevertBlockReason as verify } from './manualPublicationRevertPolicy.ts';

test('permite desfazer publicacao manual sem publicacao real', () => {
  assert.equal(verify({ status: 'PUBLICADO_MANUALMENTE' }), null);
  assert.equal(verify({ status: 'PUBLICADO_MANUALMENTE', instagram: { status: 'PUBLICADO' } }), null);
});
test('nao reverte publicacao automatica', () => {
  assert.match(verify({ status: 'PUBLICADO' }) || '', /Somente/);
});
test('bloqueia media realmente publicada no Instagram', () => {
  assert.match(verify({ status: 'PUBLICADO_MANUALMENTE', instagram: { status: 'PUBLICADO', metaMediaId: '123' } }) || '', /confirmada/);
});
test('bloqueia stories publicados', () => {
  assert.match(verify({ status: 'PUBLICADO_MANUALMENTE', story: { status: 'PUBLICADO' } }) || '', /Stories/);
});
test('bloqueia agendamentos ativos e publicacoes em andamento', () => {
  assert.match(verify({ status: 'PUBLICADO_MANUALMENTE', instagram: { status: 'AGENDADO' } }) || '', /agendada/);
  assert.match(verify({ status: 'PUBLICADO_MANUALMENTE', social: [{ status: 'PROCESSANDO' }] }) || '', /andamento/);
});
test('bloqueia posts externos no TikTok e YouTube', () => {
  assert.match(verify({ status: 'PUBLICADO_MANUALMENTE', social: [{ status: 'PUBLICADO', externalId: 'yt-987' }] }) || '', /outra rede social/);
});
