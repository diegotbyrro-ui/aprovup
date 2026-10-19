import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('src/app/api/integrations/tiktok/webhook/route.ts','utf8');
const chart = fs.readFileSync('src/app/(dashboard)/clientes/[id]/instagram/relatorios/retencao/RetentionDetailedChart.tsx','utf8');

test('TikTok exige chave e assinatura para processar POST', () => {
  const post = route.slice(route.indexOf('export async function POST('));
  assert.ok(post.includes('if (!config.clientSecret)'));
  assert.match(post, /!signatureHeader\s*\|\|\s*!verifyTikTokSignature\(/);
  assert.ok(post.indexOf('!signatureHeader') < post.indexOf('JSON.parse('));
  assert.ok(post.indexOf('!signatureHeader') < post.indexOf('processTikTokEvent('));
  assert.match(post, /error: 'invalid_signature'[\s\S]*?status: 401/);
  assert.match(post, /error: 'webhook_not_configured'[\s\S]*?status: 503/);
});

test('TikTok nao confirma payload invalido nem falha de processamento como sucesso', () => {
  const post = route.slice(route.indexOf('export async function POST('));
  assert.match(post, /error: 'invalid_payload'[\s\S]*?status: 400/);
  assert.match(post, /catch \(error\)[\s\S]*?TIKTOK WEBHOOK PROCESSING ERROR[\s\S]*?error: 'webhook_processing_failed'[\s\S]*?status: 500/);
});

test('TikTok conserva autenticacao com HMAC e comparacao constante', () => {
  assert.match(route, /function verifyTikTokSignature\(/);
  assert.match(route, /createHmac\(\s*'sha256'/);
  assert.match(route, /timingSafeEqual\(/);
  assert.match(route, /MAX_SIGNATURE_AGE_SECONDS/);
});

test('Grafico executa useMemo antes de retornar quando faltam dados da Meta', () => {
  const chartFn = chart.slice(chart.indexOf('export function RetentionDetailedChart('));
  const memo = chartFn.indexOf('const curve =');
  const earlyReturn = chartFn.indexOf('retained === null ||');
  assert.ok(memo > 0 && earlyReturn > memo);
  assert.match(chartFn, /retained \?\? 0/);
  assert.match(chartFn, /skipped \?\? 0/);
  assert.match(chartFn, /useMemo\(/);
  assert.ok(chartFn.includes('measuredDuration?.url === videoUrl'));
  assert.doesNotMatch(chartFn, /setDetectedDuration\(/);
  assert.ok(chartFn.includes('setMeasuredDuration({'));
});
