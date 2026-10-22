/**
 * Extract text from uploaded PDFs in a separate Node process.
 * This deliberately loads pdfjs-dist outside Next/Webpack's server bundle,
 * so its pdf.worker.mjs resolves relative to the real installed package.
 * No uploaded file is stored on disk or sent to a third party.
 */
import { spawn } from 'node:child_process';

export type PositionedPdfToken = { text: string; x: number; y: number };
export type PositionedPdfLine = { page: number; text: string; tokens: PositionedPdfToken[] };

const childSource = String.raw`
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const input = [];
for await (const chunk of process.stdin) input.push(chunk);
const bytes = new Uint8Array(Buffer.concat(input));
const task = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
const document = await task.promise;
const lines = [];
try {
  if (document.numPages > 35) throw new Error('PDF muito longo: envie no maximo 35 paginas.');
  for (let n = 1; n <= document.numPages; n++) {
    const page = await document.getPage(n);
    const content = await page.getTextContent();
    const points = content.items.filter(item => typeof item.str === 'string' && Array.isArray(item.transform))
      .map(item => ({ text: item.str.trim(), x: Number(item.transform[4]), y: Number(item.transform[5]) }))
      .filter(item => item.text && Number.isFinite(item.x) && Number.isFinite(item.y));
    points.sort((a,b) => (Math.abs(a.y-b.y)>2.5 ? b.y-a.y : a.x-b.x));
    const groups=[];
    for (const point of points) {
      let group=groups.find(entry => Math.abs(entry.y-point.y)<=2.5);
      if (!group) { group={y:point.y,tokens:[]}; groups.push(group); }
      group.tokens.push(point);
    }
    for (const group of groups) {
      group.tokens.sort((a,b)=>a.x-b.x);
      lines.push({page:n,text:group.tokens.map(item=>item.text).join(' '),tokens:group.tokens});
    }
    page.cleanup();
  }
} finally { await task.destroy(); }
process.stdout.write(JSON.stringify({lines}));
`;

export async function readPositionedPdfLines(bytes: Uint8Array): Promise<PositionedPdfLine[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', childSource], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outSize = 0;
    let errSize = 0;
    let completed = false;
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('Leitura de PDF excedeu o tempo de seguranca (55 segundos).'));
    }, 55_000);
    function finish(error?: Error, data?: PositionedPdfLine[]) {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(data || []);
    }
    child.on('error', (error) => finish(new Error('Servidor nao permitiu iniciar o leitor de PDF: ' + error.message)));
    child.stdout?.on('data', (chunk: Buffer) => {
      outSize += chunk.length;
      if (outSize > 12 * 1024 * 1024) {
        child.kill();
        finish(new Error('PDF produziu texto maior que o limite permitido.'));
      } else stdout.push(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      errSize += chunk.length;
      if (errSize <= 24_000) stderr.push(chunk);
    });
    child.stdin?.on('error', () => null); // Child may exit early before receiving the entire file.
    child.on('close', (code) => {
      if (completed) return;
      if (code !== 0) {
        const raw = Buffer.concat(stderr).toString('utf8');
        const message = raw.includes('Cannot find package')
          ? 'Biblioteca PDF indisponivel na hospedagem. Verifique as dependencias do deploy.'
          : (raw.split('\n').find(line => /Error:|failed|não|nao/i.test(line)) || 'Leitor PDF retornou codigo ' + code).slice(0,450);
        finish(new Error('Nao foi possivel ler o PDF: ' + message));
        return;
      }
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(stdout).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || !('lines' in parsed)) throw new Error('Resposta sem linhas.');
        const lines = (parsed as { lines: unknown }).lines;
        if (!Array.isArray(lines) || lines.length > 30_000) throw new Error('Quantidade de linhas invalida.');
        finish(undefined, lines as PositionedPdfLine[]);
      } catch {
        finish(new Error('Leitor PDF retornou dados ilegíveis.'));
      }
    });
    if (!child.stdin) finish(new Error('Processo PDF sem entrada padrao disponivel.'));
    else child.stdin.end(Buffer.from(bytes));
  });
}
