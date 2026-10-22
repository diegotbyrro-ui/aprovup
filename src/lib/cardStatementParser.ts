export type StatementFormat = 'csv' | 'ofx' | 'pdf';
export type StatementSign = 'positive' | 'negative' | 'auto';
export type CardStatementRow = {
  index: number;
  date: string;
  description: string;
  amountCents: number;
  category: string;
};

export const CARD_CATEGORIES = [
  'Alimentação', 'Supermercado', 'Transporte', 'Combustível',
  'Aluguel', 'Carro', 'Seguro',
  'Viagens', 'Hospedagem', 'Marketing e anúncios', 'Software e assinaturas',
  'Equipamentos', 'Saúde', 'Educação', 'Impostos e taxas',
  'Serviços', 'Compras', 'Outras despesas',
] as const;

export function suggestCardCategory(description: string): string {
  const text = description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const groups: Array<[string, RegExp]> = [
    ['Seguro', /seguradora|seguro (?:auto|carro|vida|veicular|residencial|empresarial|saude)|apolice|premio de seguro|yelum/],
    ['Aluguel', /aluguel|locacao (?:de )?(?:imovel|sala|casa|apartamento)|imobiliaria/],
    ['Carro', /\bcarro\b|\bveiculo\b|automovel|oficina|mecanica automotiva|ipva|licenciamento veicular|detran|pneus?|autocenter|auto center|troca de oleo|financiamento (?:auto|veiculo|carro)/],
    ['Marketing e anúncios', /meta ads|facebook ads|google ads|tiktok ads|impulsion|anuncios|publicidade/],
    ['Software e assinaturas', /adobe|canva|chatgpt|openai|google workspace|microsoft|spotify|netflix|icloud|dropbox|notion|figma|aws|hostinger|godaddy|apple\.com|assinatura|subscription|software/],
    ['Combustível', /posto |combust|shell|ipiranga|petrobras|gasolina|alcool|etanol/],
    ['Transporte', /uber|99app|taxi|estacion|pedagio|mobilidade|passagem/],
    ['Supermercado', /supermerc|mercado |atacadao|assai|carrefour|pao de acucar|hortifruti/],
    ['Alimentação', /restaurante|lanchonete|ifood|food|cafe |padaria|pizzaria|burger|delivery/],
    ['Viagens', /aereo|latam|gol linhas|azul linhas|passagens|airbnb|booking/],
    ['Hospedagem', /hotel|pousada|hostel/],
    ['Equipamentos', /camera|lente|microfone|equipamento|eletronico|informatica/],
    ['Saúde', /farmacia|drogaria|hospital|clinica|laboratorio|medic/],
    ['Educação', /curso|escola|faculdade|livraria|udemy|educacao/],
    ['Impostos e taxas', /iof|juros|tarifa|anuidade|multa|taxa/],
    ['Serviços', /servico|manutencao|frete|lavagem|consultoria/],
    ['Compras', /amazon|mercado livre|magalu|shopee|loja|shopping/],
  ];
  return groups.find(([, regex]) => regex.test(text))?.[0] || 'Outras despesas';
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function cleanDescription(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 220);
}

function ignoreCharge(description: string) {
  return /(?:^|\b)(?:total (?:da |de )?fatura|saldo anterior|pagamento (?:da |de )?fatura|pagamento recebido|credito de pagamento|estorno|reembolso|devolucao|limite disponivel|valor total|resumo da fatura)(?:\b|$)/i.test(normalize(description));
}

export function parseCardAmount(raw: string): number | null {
  const value = raw.trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/[()]/g, (v) => v === '(' ? '-' : '');
  if (!value || !/^-?[\d.,]+$/.test(value)) return null;
  const positive = value.startsWith('-') ? value.slice(1) : value;
  let normalized = positive;
  if (positive.includes(',') && positive.includes('.')) {
    normalized = positive.lastIndexOf(',') > positive.lastIndexOf('.')
      ? positive.replace(/\./g, '').replace(',', '.')
      : positive.replace(/,/g, '');
  } else if (positive.includes(',')) {
    normalized = /,\d{1,2}$/.test(positive)
      ? positive.replace(/\./g, '').replace(',', '.')
      : positive.replace(/,/g, '');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(positive)) {
    normalized = positive.replace(/\./g, '');
  }
  const number = Number(normalized);
  if (!Number.isFinite(number) || number > 1_000_000) return null;
  const cents = Math.round(number * 100);
  return raw.trim().startsWith('(') || value.startsWith('-') ? -cents : cents;
}

export function parseCardDate(value: string, period: string): string | null {
  const date = value.trim();
  let y: number; let m: number; let d: number;
  const iso = date.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const brazil = date.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  if (iso) { y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]); }
  else if (brazil) {
    d = Number(brazil[1]); m = Number(brazil[2]);
    const yy = brazil[3];
    y = yy ? Number(yy.length === 2 ? '20' + yy : yy) : Number(period.slice(0, 4));
    // Uma fatura de janeiro pode conter compras de dezembro do ano anterior.
    if (!yy && period.endsWith('-01') && m === 12) y--;
  } else return null;
  if (!Number.isInteger(y) || y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d
    ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
}

function addRow(rows: CardStatementRow[], date: string | null, description: string, amount: number | null) {
  const desc = cleanDescription(description);
  if (!date || !desc || desc.length < 3 || ignoreCharge(desc) || !amount || amount <= 0) return;
  rows.push({ index: rows.length, date, description: desc, amountCents: amount, category: suggestCardCategory(desc) });
}

function parseCsvTable(text: string, separator: string): string[][] {
  const rows: string[][] = []; let line: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === separator && !quoted) { line.push(field); field = ''; }
    else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      line.push(field); if (line.some((cell) => cell.trim())) rows.push(line);
      line = []; field = '';
    } else field += c;
  }
  line.push(field);
  if (line.some((cell) => cell.trim())) rows.push(line);
  return rows;
}

export function parseCardCsv(text: string, period: string, sign: StatementSign): CardStatementRow[] {
  // Quando o arquivo nao declara debit/credit separadamente, o padrao varia
  // por banco. Em modo automatico, analisar os dois sinais sem misturar
  // compras com estornos/pagamentos na mesma importacao.
  if (sign === 'auto') {
    const positive = parseCardCsv(text, period, 'positive');
    const negative = parseCardCsv(text, period, 'negative');
    return positive.length >= negative.length ? positive : negative;
  }
  const cleaned = text.replace(/^\uFEFF/, '');
  const first = cleaned.split(/\r?\n/).find((v) => v.trim()) || '';
  const candidates = [';', ',', '\t'];
  const separator = candidates.sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const data = parseCsvTable(cleaned, separator).slice(0, 1200);
  const headerIndex = data.findIndex((cols) => {
    const h = cols.map(normalize);
    return h.some((v) => /^(data|date|dt |data da|data de|dt_)/.test(v)) &&
      h.some((v) => /valor|amount|debito|credito|price/.test(v));
  });
  if (headerIndex < 0) throw new Error('Não encontrei colunas de Data e Valor no CSV. Exporte os lançamentos detalhados do cartão, não o resumo da fatura.');
  const headers = data[headerIndex].map(normalize);
  const find = (regex: RegExp) => headers.findIndex((h) => regex.test(h));
  const dateCol = find(/^(data|date|dt\b)/);
  const descriptionCol = find(/descr|histor|estabelec|merchant|lan[cç]amento|detalhe|nome|title|memo|transa/);
  const debitCol = find(/^debito|^debit/);
  const creditCol = find(/^credito|^credit/);
  const valueCol = find(/^valor|^amount|^price|valor r\$/);
  if (dateCol < 0 || (debitCol < 0 && valueCol < 0)) throw new Error('CSV sem colunas de data e valores reconhecíveis.');
  const rows: CardStatementRow[] = [];
  for (const cols of data.slice(headerIndex + 1)) {
    const date = parseCardDate(cols[dateCol] || '', period);
    const desc = descriptionCol < 0
      ? cols.filter((_, index) => ![dateCol, valueCol, debitCol, creditCol].includes(index)).join(' ')
      : cols[descriptionCol] || '';
    let amount: number | null = null;
    if (debitCol >= 0) {
      const debit = parseCardAmount(cols[debitCol] || '');
      amount = debit ? Math.abs(debit) : null;
    } else if (valueCol >= 0) {
      const parsed = parseCardAmount(cols[valueCol] || '');
      amount = parsed === null ? null : (sign === 'negative' ? -parsed : parsed);
    }
    addRow(rows, date, desc, amount);
  }
  return rows;
}

function ofxTag(block: string, tag: string) {
  return block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))?.[1]?.trim() || '';
}

export function parseCardOfx(text: string, period: string): CardStatementRow[] {
  const rows: CardStatementRow[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi) || [];
  for (const block of blocks.slice(0, 1200)) {
    const dateRaw = ofxTag(block, 'DTPOSTED').replace(/[^0-9]/g, '').slice(0, 8);
    const date = dateRaw.length === 8 ? parseCardDate(`${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6)}`, period) : null;
    const desc = ofxTag(block, 'NAME') || ofxTag(block, 'MEMO') || 'Despesa no cartão';
    const rawAmount = parseCardAmount(ofxTag(block, 'TRNAMT'));
    // OFX: gastos em cartões geralmente aparecem como débito (negativos).
    addRow(rows, date, desc, rawAmount === null ? null : -rawAmount);
  }
  return rows;
}

export function parseCardPdfLines(lines: string[], period: string): CardStatementRow[] {
  const rows: CardStatementRow[] = [];
  for (const line of lines.slice(0, 2500)) {
    const clean = line.replace(/\s+/g, ' ').trim();
    const match = clean.match(/^(\d{2}[\/-]\d{2}(?:[\/-]\d{2,4})?)\s+(.+?)\s+(?:R\$\s*)?(-?[\d.,]+)\s*$/);
    if (!match) continue;
    const date = parseCardDate(match[1], period);
    const rawAmount = parseCardAmount(match[3]);
    addRow(rows, date, match[2], rawAmount === null ? null : Math.abs(rawAmount));
  }
  return rows;
}

export function classifyStatementFile(filename: string): StatementFormat {
  const ext = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (ext === 'pdf') return 'pdf';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'ofx' || ext === 'qfx' || ext === 'qbo') return 'ofx';
  throw new Error('Formato não suportado. Use CSV, TSV, OFX, QFX, QBO ou PDF com texto selecionável.');
}
