import { createHmac, timingSafeEqual } from 'node:crypto';

const TIME_ZONE = 'America/Maceio';

function getAccessSecret() {
  return process.env.APROVUP_ACCESS_SECRET || '';
}

export function getTodayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function getDailyAccessCode(userId: string | null | undefined, date = new Date()) {
  const secret = getAccessSecret();

  if (!secret || !userId) {
    return null;
  }

  const todayKey = getTodayKey(date);

  return createHmac('sha256', secret)
    .update(`${userId}|${todayKey}|aprovup-central-v1`)
    .digest('hex')
    .slice(0, 16);
}

function safeCompare(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

export function isValidDailyAccessCode(userId: string | null | undefined, code: string) {
  const expectedCode = getDailyAccessCode(userId);

  if (!expectedCode) {
    return false;
  }

  return safeCompare(expectedCode, code);
}

export function getDailyAccessPath(userId: string | null | undefined) {
  const code = getDailyAccessCode(userId);

  if (!code) {
    return '/clientes';
  }

  return `/base/${code}`;
}