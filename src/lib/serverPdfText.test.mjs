import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readPositionedPdfLines } from './serverPdfText.ts';

test('leitor de PDF executa fora do webpack e extrai texto sem armazenar arquivo', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595,842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('EXTRATO DE TESTE', { x:50, y:750, size:12, font });
  page.drawText('DESPESA EXEMPLO', { x:100, y:710, size:11, font });
  const bytes = await pdf.save();
  const lines = await readPositionedPdfLines(new Uint8Array(bytes));
  assert.ok(lines.some(line => line.text.includes('EXTRATO DE TESTE')));
  assert.ok(lines.some(line => line.text.includes('DESPESA EXEMPLO')));
});
