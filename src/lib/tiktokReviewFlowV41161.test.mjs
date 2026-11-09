import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.APROVUP_CHECK_ROOT || process.cwd();
const creatorInfo = readFileSync(resolve(root, 'src/app/api/integrations/tiktok/sandbox/creator-info/route.ts'), 'utf8');
const panel = readFileSync(resolve(root, 'src/components/tiktok/TikTokSandboxPublishPanel.tsx'), 'utf8');
const route = readFileSync(resolve(root, 'src/app/api/integrations/tiktok/sandbox/post/route.ts'), 'utf8');
const page = readFileSync(resolve(root, 'src/app/(dashboard)/pronto-para-postar/page.tsx'), 'utf8');

test('nome e identificador do criador sao exibidos a partir do retorno TikTok', () => {
  assert.match(creatorInfo, /info\.creator_nickname \|\| info\.creator_username/);
  assert.match(panel, /creator\?\.username/);
});
test('privacidade exige escolha manual sem valor padrao', () => {
  assert.match(panel, /useState\(''\); \/\/ TikTok exige escolha MANUAL/);
  assert.match(panel, /<option value="">Selecione a privacidade<\/option>/);
});
test('sandbox fica limitado a SELF_ONLY, mesmo com outras opcoes listadas', () => {
  assert.match(panel, /disabled=\{level !== 'SELF_ONLY'\}/);
  assert.match(route, /body\.privacy !== 'SELF_ONLY'/);
  assert.match(route, /privacy_level: 'SELF_ONLY'/);
});
test('interacoes comecam desmarcadas', () => {
  for (const name of ['allowComment', 'allowDuet', 'allowStitch']) {
    assert.ok(panel.includes(`const [${name}, set`));
    assert.ok(panel.includes('useState(false)'));
  }
});
test('interacoes desabilitadas pelo criador nao podem ser ativadas', () => {
  for (const prop of ['comment_disabled', 'duet_disabled', 'stitch_disabled']) assert.ok(route.includes(`creator.${prop}`));
  assert.match(route, /!body\.allowComment/);
  assert.match(route, /!body\.allowDuet/);
  assert.match(route, /!body\.allowStitch/);
});
test('marcacao comercial comeca desativada e exige opcao', () => {
  assert.match(panel, /\[commercialDisclosure, setCommercialDisclosure\] = useState\(false\)/);
  assert.match(route, /body\.commercialDisclosure && !body\.ownBrand/);
  assert.match(panel, /Conteúdo promocional|Conteúdo promocional/i);
});
test('parcerias pagas sao bloqueadas na visibilidade privada', () => {
  assert.match(panel, /Parceria paga \/ marca de terceiros/);
  assert.match(route, /if \(body\.brandedContent/);
  assert.match(route, /brand_content_toggle: false/);
});
test('divulgacao de marca propria chega ao TikTok', () => {
  assert.match(route, /brand_organic_toggle: Boolean\(body\.commercialDisclosure && body\.ownBrand\)/);
});
test('concordancia musical e autorizacao expressa sao requeridas antes do envio', () => {
  assert.match(panel, /setMusicConsent/);
  assert.match(panel, /music-usage-confirmation/);
  assert.match(route, /!body\.musicConsent/);
  assert.match(route, /!body\.consent/);
});
test('video possui previa e conferencia de duracao', () => {
  assert.match(page, /videoUrl=\{content\.finalMediaUrl \|\| ''\}/);
  assert.match(panel, /onLoadedMetadata/);
  assert.match(route, /creator\.max_video_post_duration_sec/);
});
test('mantidas protecoes: sem duplicar, sem ampliar setor e sem trocar transporte confirmado', () => {
  assert.match(route, /const pending = readSandboxPost/);
  assert.match(route, /name: \{ equals: 'Level UP'/);
  assert.match(route, /status: 'PRONTO_PARA_POSTAR'/);
  assert.match(route, /const upload = await sendTikTokUpload\(target, bytes\)/);
  assert.match(route, /upload\.httpStatus !== 201/);
  assert.match(panel, /status\?\.publishId/);
});

test('copy JSX de aceite musical nao usa apostrofo bruto bloqueado pelo ESLint', () => {
  assert.doesNotMatch(panel, /TikTok's Music Usage Confirmation/);
  assert.match(panel, /TikTok&#39;s Music Usage Confirmation/);
});
