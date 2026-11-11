import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.env.APROVUP_CHECK_ROOT || process.cwd();
const edit = readFileSync(resolve(root, 'src/app/(dashboard)/conteudos/[id]/page.tsx'), 'utf8');
const newer = readFileSync(resolve(root, 'src/app/(dashboard)/clientes/[id]/conteudos/novo/page.tsx'), 'utf8');

test('o botao fixo do editor usa o mesmo formulario de atualizacao', () => {
  const form = edit.indexOf('<form action={updateContentAction} className="space-y-6 pb-20 2xl:pb-0">');
  const fixed = edit.indexOf('aria-label="Ações para salvar edição no tablet ou celular"', form);
  const closing = edit.indexOf('</form>', form);
  assert.ok(form >= 0 && fixed > form && fixed < closing, 'botao deve ficar dentro do form existente');
  assert.match(edit.slice(form, closing), /<button type="submit"[^>]*>\s*Salvar alterações/);
});
test('novo conteudo usa action createContent e submit visivel no tablet', () => {
  const form = newer.indexOf('action={createContent}');
  const fixed = newer.indexOf('aria-label="Ações para salvar novo conteúdo no tablet ou celular"', form);
  const closing = newer.indexOf('</form>', form);
  assert.ok(form >= 0 && fixed > form && fixed < closing, 'botao deve ficar dentro do form de criacao');
  assert.match(newer.slice(form, closing), /<button type="submit"[^>]*>\s*Salvar conteúdo/);
});
test('telas responsivas mostram o botao ate 2xl e preservam botao original desktop', () => {
  assert.match(edit, /sticky top-24 z-30 flex justify-end 2xl:hidden/);
  assert.match(newer, /fixed bottom-3 right-3 z-40[^"\n]*2xl:hidden/);
  assert.ok(edit.match(/Salvar alterações/g)?.length >= 2);
  assert.ok(newer.includes('Salvar Conteúdo'));
});
test('nenhuma nova API ou gravacao automatica foi adicionada aos formularios', () => {
  for (const code of [edit, newer]) {
    assert.doesNotMatch(code, /onClick=\{[^}]*saveTablet/);
    assert.doesNotMatch(code, /autoSaveTablet/);
  }
});
