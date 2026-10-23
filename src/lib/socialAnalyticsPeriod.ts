/** Shared, server-safe calendar ranges for the social analytics screens. */
export type SocialDateRange = { startDate: string; endDate: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MACEIO_OFFSET_MS = 3 * 60 * 60 * 1000;

function utcDay(date: string): number | null {
  const match = DATE_PATTERN.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2005 || year > 2100) return null;
  const result = Date.UTC(year, month - 1, day);
  if (new Date(result).toISOString().slice(0, 10) !== date) return null;
  return result;
}

/** Current calendar day in the agency's time zone (Alagoas, UTC-03). */
export function socialTodayMaceio(now: Date = new Date()): string {
  return new Date(now.getTime() - MACEIO_OFFSET_MS).toISOString().slice(0, 10);
}

export function shiftSocialDate(date: string, offsetDays: number): string {
  const value = utcDay(date);
  if (value === null || !Number.isInteger(offsetDays)) throw new Error('Data inválida.');
  return new Date(value + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** Limit one report to 366 calendar days, inclusive. */
export function isValidSocialRange(start: unknown, end: unknown, today = socialTodayMaceio()): boolean {
  if (typeof start !== 'string' || typeof end !== 'string') return false;
  const from = utcDay(start);
  const to = utcDay(end);
  const latest = utcDay(today);
  return from !== null && to !== null && latest !== null &&
    from <= to && to <= latest && to - from < 366 * DAY_MS;
}

export function socialPresetRange(days: number, lagDays = 0, today = socialTodayMaceio()): SocialDateRange {
  if (![7, 30, 90].includes(days) || !Number.isInteger(lagDays) || lagDays < 0) {
    throw new Error('Período predefinido inválido.');
  }
  const endDate = shiftSocialDate(today, -lagDays);
  return { startDate: shiftSocialDate(endDate, 1 - days), endDate };
}

/** TikTok publishes its timestamps in seconds UTC; filter by Maceió calendar date. */
export function tiktokPublicationDay(seconds: number): string {
  return new Date(seconds * 1000 - MACEIO_OFFSET_MS).toISOString().slice(0, 10);
}
