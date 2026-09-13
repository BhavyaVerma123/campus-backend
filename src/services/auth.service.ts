import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import type { User, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import type { AuthenticatedUser, SessionData } from '../types/auth.js';

export const SESSION_COOKIE_NAME = 'campus_session';

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

const getConfig = () => {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'COLLEGE_EMAIL_DOMAIN', 'SESSION_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing authentication configuration: ${missing.join(', ')}`);
  }

  const maxAge = Number.parseInt(process.env.SESSION_MAX_AGE ?? '604800000', 10);
  if (!Number.isInteger(maxAge) || maxAge <= 0) {
    throw new Error('SESSION_MAX_AGE must be a positive number of milliseconds');
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL as string,
    collegeDomain: process.env.COLLEGE_EMAIL_DOMAIN as string,
    sessionSecret: process.env.SESSION_SECRET as string,
    maxAge,
  };
};

const sessionKey = (sessionId: string, secret: string) =>
  `auth:session:${crypto.createHmac('sha256', secret).update(sessionId).digest('hex')}`;

const stateKey = (state: string, secret: string) =>
  `auth:state:${crypto.createHmac('sha256', secret).update(state).digest('hex')}`;

const toPublicUser = (user: User): AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  profilePicture: user.profilePicture,
  role: user.role,
});

export const createGoogleAuthorizationUrl = async () => {
  const config = getConfig();
  const state = crypto.randomBytes(32).toString('hex');
  await redis.set(stateKey(state, config.sessionSecret), '1', 'EX', 600);

  const client = new OAuth2Client(config.clientId, config.clientSecret, config.callbackUrl);
  return client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
};

export const authenticateGoogleCallback = async (code: string, state: string) => {
  const config = getConfig();
  const key = stateKey(state, config.sessionSecret);
  const validState = await redis.getdel(key);

  if (!validState) {
    throw new HttpError(400, 'Invalid or expired OAuth state');
  }

  const client = new OAuth2Client(config.clientId, config.clientSecret, config.callbackUrl);
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch (error) {
    console.error('Google token exchange failed:', error);
    throw new HttpError(400, 'Google authentication failed');
  }
  if (!tokens.id_token) {
    throw new HttpError(400, 'Google did not return an identity token');
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
  } catch {
    throw new HttpError(400, 'Google identity verification failed');
  }
  const payload = ticket.getPayload();
  const email = payload?.email?.trim().toLowerCase();
  const domain = config.collegeDomain.trim().toLowerCase().replace(/^@/, '');

  if (!payload?.sub || !email || payload.email_verified !== true || !payload.name || !domain || email.split('@')[1] !== domain) {
    throw new HttpError(403, 'Only verified college Google accounts are allowed');
  }

  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    update: {
      email,
      name: payload.name,
      profilePicture: payload.picture ?? null,
    },
    create: {
      googleId: payload.sub,
      email,
      name: payload.name,
      profilePicture: payload.picture ?? null,
      role: 'STUDENT' satisfies UserRole,
    },
  });

  const sessionId = crypto.randomBytes(32).toString('hex');
  const session: SessionData = { userId: user.id };
  await redis.set(sessionKey(sessionId, config.sessionSecret), JSON.stringify(session), 'PX', config.maxAge);

  return { sessionId, maxAge: config.maxAge, user: toPublicUser(user) };
};

export const getUserFromSession = async (sessionId: string): Promise<AuthenticatedUser | null> => {
  const config = getConfig();
  const value = await redis.get(sessionKey(sessionId, config.sessionSecret));
  if (!value) return null;

  const session = JSON.parse(value) as SessionData;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user ? toPublicUser(user) : null;
};

export const deleteSession = async (sessionId: string) => {
  const config = getConfig();
  await redis.del(sessionKey(sessionId, config.sessionSecret));
};