import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrowserPdfLines } from './financePdfPayload.ts';

const valid = JSON.stringify([{page:1,text:'falsificado',tokens:[{text:'Bradesco Celular',x:200,y:790}]},{page:1,text:'',tokens:[{text:'Débito',x:460,y:733}]}]);
test('aceita texto posicionado e recalcula texto usando os tokens',()=>{
  const result=parseBrowserPdfLines(valid);
  assert.equal(result.length,2);
  assert.equal(result[0].text,'Bradesco Celular');
  assert.equal(result[1].tokens[0].x,460);
});
test('rejeita extracao ausente e JSON invalido',()=>{
  assert.throws(()=>parseBrowserPdfLines(null));
  assert.throws(()=>parseBrowserPdfLines('nao-json'));
});
test('rejeita paginas fora do limite',()=>{
  assert.throws(()=>parseBrowserPdfLines(JSON.stringify([{page:36,tokens:[{text:'pix',x:10,y:10}]}])));
});
test('rejeita coordenadas/texto invalidos',()=>{
  assert.throws(()=>parseBrowserPdfLines(JSON.stringify([{page:1,tokens:[{text:'pix',x:99999,y:10}]}])));
  assert.throws(()=>parseBrowserPdfLines(JSON.stringify([{page:1,tokens:[{text:12,x:10,y:10}]}])));
});
test('rejeita PDF que nao possui texto selecionavel',()=>{
  assert.throws(()=>parseBrowserPdfLines(JSON.stringify([{page:1,tokens:[]}])));
});
