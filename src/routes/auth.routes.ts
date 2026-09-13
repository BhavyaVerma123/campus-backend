import { Router } from 'express';
import {
  authenticateGoogleCallback,
  createGoogleAuthorizationUrl,
  deleteSession,
  SESSION_COOKIE_NAME,
} from '../services/auth.service.js';
import { getCookie, requireAuth } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.get('/google', async (_request, response) => {
  const authorizationUrl = await createGoogleAuthorizationUrl();
  response.redirect(authorizationUrl);
});

authRouter.get('/google/callback', async (request, response) => {
  const { code, state } = request.query;
  if (typeof code !== 'string' || typeof state !== 'string') {
    response.status(400).json({ error: 'Missing Google OAuth callback parameters' });
    return;
  }

  const result = await authenticateGoogleCallback(code, state);
  response.cookie(SESSION_COOKIE_NAME, result.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: result.maxAge,
    path: '/',
  });
  response.json({ user: result.user });
});

authRouter.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.user });
});

authRouter.post('/logout', async (request, response) => {
  const sessionId = getCookie(request, SESSION_COOKIE_NAME);
  if (sessionId) await deleteSession(sessionId);

  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  response.json({ message: 'Logged out successfully' });
});