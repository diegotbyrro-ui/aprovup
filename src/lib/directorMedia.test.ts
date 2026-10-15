import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDirectorMediaItems } from "./directorMedia";

const dirPage = readFileSync("src/app/(dashboard)/social-media/diretoria/page.tsx", "utf8");
const dirAction = readFileSync("src/app/(dashboard)/social-media/diretoria/actions.ts", "utf8");

test("Diretoria: video MP4 final pode ser reproduzido na lista", () => {
  const items = getDirectorMediaItems({finalMediaUrl:"https://cdn.example.com/video.mp4", finalMediaType:"video/mp4",finalCoverUrl:"https://cdn.example.com/capa.jpg"});
  assert.equal(items[0].kind,"video");
  assert.equal(items[0].poster,"https://cdn.example.com/capa.jpg");
});
test("Diretoria: imagem final aparece", () => {
  assert.equal(getDirectorMediaItems({finalMediaUrl:"https://cdn.example.com/arte.png",finalMediaType:"image/png"})[0].kind,"image");
});
test("Diretoria: carrossel ordenado sem duplicar primeira imagem", () => {
  const a=getDirectorMediaItems({instagramMediaAssets:[{url:"https://cdn.example.com/d.png",mimeType:"image/png",position:1},{url:"https://cdn.example.com/c.png",mimeType:"image/png",position:0}],finalMediaUrl:"https://cdn.example.com/c.png",finalMediaType:"image/png"});
  assert.deepEqual(a.map(x=>x.label),["Carrossel 1","Carrossel 2"]);
});
test("Diretoria: arquivo unico de carrossel tambem aparece", () => {
  const r=getDirectorMediaItems({instagramMediaAssets:[{url:"https://cdn.example.com/1.jpg",mimeType:"image/jpeg",position:0}]});assert.equal(r.length,1);
});
test("Diretoria: Story enviado entra na lista", () => {
  assert.equal(getDirectorMediaItems({storyMediaUrl:"https://cdn.example.com/story.mp4",storyMediaType:"video/mp4"})[0].label,"Story");
});
test("Diretoria: Stories multiplos recebem previews", () => {
  const r=getDirectorMediaItems({storyMediaItems:[{url:"https://cdn.example.com/a.mp4",mimeType:"video/mp4"},{url:"https://cdn.example.com/b.jpg",mimeType:"image/jpeg"}],storyMediaUrl:"https://cdn.example.com/a.mp4"});
  assert.equal(r.length,2);
});
test("Diretoria: link externo de entrega recebe acesso", () => {
  const r=getDirectorMediaItems({finalExternalUrl:"https://drive.google.com/file/d/1/view"});assert.equal(r[0].kind,"link");
});
test("Diretoria: URLs inseguras e incompletas nao entram no preview", () => {
  assert.deepEqual(getDirectorMediaItems({finalMediaUrl:"javascript:alert(1)",finalExternalUrl:"file:///tmp/x"}),[]);
});
test("Diretoria: ausencia de upload nao gera previews inventados", () => {
  assert.deepEqual(getDirectorMediaItems({}),[]);
});
test("Diretoria: renderiza arquivos realmente vinculados ao conteudo", () => {
  assert.match(dirPage,/instagramMediaAssets:\s*\{/);
  assert.match(dirPage,/finalMediaUrl:true/);
  assert.match(dirPage,/<DirectorMediaPreview content=\{item\}\/>/);
});
test("Diretoria: confirmar publicado nao pede URL nem justificativa", () => {
  assert.doesNotMatch(dirPage,/<textarea name="evidence"/);
  assert.doesNotMatch(dirAction,/validatePublicationProof/);
  assert.match(dirAction,/SEM COMPROVANTE ANEXADO/);
});
test("Diretoria: arquivamento continua exigindo justificativa", () => {
  assert.match(dirAction,/intent === "ARCHIVE" && \(note.length < 8/);
  assert.match(dirPage,/placeholder="Motivo do arquivamento"/);
});
test("Diretoria: impede marcar publicado com agendamento ativo", () => {
  assert.match(dirAction,/\["POSTED","ARCHIVE"\]\.includes\(intent\)/);
});
test("Diretoria: somente DIRECTOR pode alterar status", () => {
  assert.match(dirAction,/user.role !== "DIRECTOR"/);
});
