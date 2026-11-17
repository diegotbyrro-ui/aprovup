/** Filtros de prazo para as areas de producao; datas no fuso de Maceio. */
export type ProductionPeriod =
  | 'TODOS'
  | 'HOJE'
  | 'AMANHA'
  | 'SEMANA'
  | '7_DIAS'
  | 'DATA'
  | 'SEM_DATA';

type DatedProduction = {
  productionDeadline?: Date | string | null;
  plannedDate?: Date | string | null;
};

function dayKey(value: Date | string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Maceio',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const get = (part: string) => parts.find((item) => item.type === part)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function shiftDay(value: string, offset: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function filterProductionByDay<T extends DatedProduction>(
  items: T[],
  rawPeriod?: string | null,
  selectedDay?: string | null,
  now: Date = new Date(),
): T[] {
  const options = ['TODOS', 'HOJE', 'AMANHA', 'SEMANA', '7_DIAS', 'DATA', 'SEM_DATA'];
  const period = options.includes(String(rawPeriod || '').toUpperCase())
    ? String(rawPeriod).toUpperCase() as ProductionPeriod
    : 'TODOS';
  if (period === 'TODOS') return items;

  const today = dayKey(now);
  if (!today) return items;
  const selected = String(selectedDay || '');
  let start = today;
  let end = today;
  if (period === 'AMANHA') {
    start = shiftDay(today, 1);
    end = start;
  } else if (period === 'SEMANA') {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;
    start = shiftDay(today, -daysSinceMonday);
    end = shiftDay(start, 6);
  } else if (period === '7_DIAS') {
    end = shiftDay(today, 6);
  } else if (period === 'DATA') {
    if (!isValidDay(selected)) return [];
    start = selected;
    end = selected;
  }

  return items.filter((item) => {
    const deadline = item.productionDeadline || item.plannedDate;
    if (period === 'SEM_DATA') return !deadline;
    if (!deadline) return false;
    const itemDay = dayKey(deadline);
    return Boolean(itemDay && itemDay >= start && itemDay <= end);
  });
}