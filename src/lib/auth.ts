import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

export const APROVUP_SESSION_COOKIE =
  'aprovup_session';

export const APROVUP_SESSION_MAX_AGE =
  60 * 60 * 24 * 30;

const SESSION_CONTEXT =
  'aprovup-session-v1';

function getSessionSecret() {
  return (
    process.env.APROVUP_SESSION_SECRET ||
    process.env.APROVUP_ACCESS_SECRET ||
    ''
  );
}

function signPayload(
  payload: string,
  secret: string
) {
  return createHmac(
    'sha256',
    secret
  )
    .update(
      `${SESSION_CONTEXT}|${payload}`
    )
    .digest('base64url');
}

function safeCompare(
  first: string,
  second: string
) {
  const firstBuffer =
    Buffer.from(first);

  const secondBuffer =
    Buffer.from(second);

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    firstBuffer,
    secondBuffer
  );
}

export function createAprovUpSession(
  userId: string
) {
  const secret =
    getSessionSecret();

  if (!secret) {
    throw new Error(
      'APROVUP_SESSION_SECRET não configurado.'
    );
  }

  const expiresAt =
    Date.now() +
    APROVUP_SESSION_MAX_AGE * 1000;

  const encodedUserId =
    Buffer
      .from(userId)
      .toString('base64url');

  const payload =
    `${encodedUserId}.${expiresAt}`;

  const signature =
    signPayload(
      payload,
      secret
    );

  return (
    `${payload}.${signature}`
  );
}

function verifyAprovUpSession(
  value: string
) {
  const secret =
    getSessionSecret();

  if (!secret) {
    return null;
  }

  const parts =
    value.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [
    encodedUserId,
    expiresAtText,
    providedSignature,
  ] = parts;

  const expiresAt =
    Number(expiresAtText);

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return null;
  }

  const payload =
    `${encodedUserId}.${expiresAtText}`;

  const expectedSignature =
    signPayload(
      payload,
      secret
    );

  if (
    !safeCompare(
      providedSignature,
      expectedSignature
    )
  ) {
    return null;
  }

  try {
    const userId =
      Buffer
        .from(
          encodedUserId,
          'base64url'
        )
        .toString('utf8')
        .trim();

    return userId || null;
  }
  catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore =
    await cookies();

  const sessionValue =
    cookieStore
      .get(
        APROVUP_SESSION_COOKIE
      )
      ?.value;

  if (!sessionValue) {
    return null;
  }

  const userId =
    verifyAprovUpSession(
      sessionValue
    );

  if (!userId) {
    return null;
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  return user;
}

export async function requireCurrentUser() {
  const user =
    await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (
    user.status !==
    'APROVADO'
  ) {
    redirect(
      '/acesso-bloqueado'
    );
  }

  return user;
}

export function isDirector(
  role: string
) {
  return role === 'DIRECTOR';
}

export function isSocialMedia(
  role: string
) {
  return role === 'SOCIAL_MEDIA';
}

export function isDesign(
  role: string
) {
  return role === 'DESIGN';
}

export function isFilmmaker(
  role: string
) {
  return role === 'FILMMAKER';
}
