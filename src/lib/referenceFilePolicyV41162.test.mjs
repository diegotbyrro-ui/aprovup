import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=process.env.AP_PATH || process.cwd();
function read(p){return fs.readFileSync(root+'/'+p,'utf8')}
const policy=read('src/lib/referenceFilePolicy.ts');
const action=read('src/app/actions.ts');
const ui=read('src/components/content/ReferenceAttachmentsField.tsx');
const store=read('src/lib/aprovupStorage.ts');
const d1=read('src/app/(dashboard)/conteudos/[id]/delete-actions.ts');
const d2=read('src/app/(dashboard)/clientes/[id]/DeleteContentButton.tsx');
const editor=read('src/app/(dashboard)/conteudos/[id]/page.tsx');
test('arquivos profissionais sem executaveis',()=>{for(const ext of ['pdf','psd','ai','cdr','svg','zip','mp4','mov','docx','png','jpg','xlsx']) assert.match(policy,new RegExp("'"+ext+"'"));for(const ext of ['exe','bat','cmd','ps1','html','js'])assert.doesNotMatch(policy,new RegExp("'"+ext+"'"))});
test('limites seguros de upload vinculados a bodySizeLimit',()=>assert.match(policy,/100 \* 1024 \* 1024[\s\S]*120 \* 1024 \* 1024/));
test('valida formatos no servidor e nao apenas navegador',()=>assert.match(action,/validateProductionReferences\(files\)/));
test('arquivos nao-renderizaveis sao baixados e nao renderizados como HTML',()=>{assert.match(store,/safeReferenceContentType\(file\)/);assert.match(policy,/application\/octet-stream/);assert.match(ui,/canPreviewReference/)});
test('UI nao restringe mais apenas a image',()=>{assert.doesNotMatch(ui,/accept="image\/\*"/);assert.match(ui,/Anexar arquivos de referência/)});
test('download autenticado para anexos existentes',()=>{assert.match(ui,/reference-download\?url=/);assert.match(editor,/contentId=\{contentSafe\.id\}/)});
test('exclusao trata dependencias de publicacao dentro de transacao',()=>{for(const source of [d1,d2]){for(const model of ['instagramMediaAsset','instagramStoryPublication','instagramPublication','socialPublication'])assert.match(source,new RegExp('transaction\\.'+model+'\\.deleteMany'));assert.match(source,/await prisma\.\$transaction/);}});

test('o componente deriva selecoes atuais sem setState sincrono no effect',()=>{
  assert.match(ui,/const currentExistingUrlSet = useMemo/);
  assert.match(ui,/storedSelectedExistingUrls\.filter/);
  assert.match(ui,/storedRemovedExistingUrls\.filter/);
  assert.doesNotMatch(ui,/useEffect\(\s*\(\)\s*=>\s*\{\s*const currentUrls =/);
});


test('estados derivados sao declarados antes de seus consumidores',()=>{
  for(const [computed,consumer] of [
    ['const selectedExistingUrls = useMemo(', 'const selectedExistingSet ='],
    ['const removedExistingUrls = useMemo(', 'const removedExistingSet =']
  ]) {
    assert.ok(ui.indexOf(computed) >= 0, 'estado derivado ausente: '+computed);
    assert.ok(ui.indexOf(consumer) >= 0, 'consumidor ausente: '+consumer);
    assert.ok(ui.indexOf(computed) < ui.indexOf(consumer), 'Declaracao posterior ao uso: '+computed);
  }
});
