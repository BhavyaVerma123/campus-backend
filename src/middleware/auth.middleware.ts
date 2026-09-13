import type { NextFunction, Request, Response } from 'express';
import { deleteSession, getUserFromSession, SESSION_COOKIE_NAME } from '../services/auth.service.js';
import type { Role } from '../types/auth.js';

const getCookie = (request: Request, name: string) => {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const cookie = cookies.find((entry) => entry.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : undefined;
};

export const requireAuth = async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const sessionId = getCookie(request, SESSION_COOKIE_NAME);
    if (!sessionId) {
      next(Object.assign(new Error('Authentication required'), { statusCode: 401 }));
      return;
    }

    const user = await getUserFromSession(sessionId);
    if (!user) {
      await deleteSession(sessionId);
      next(Object.assign(new Error('Authentication required'), { statusCode: 401 }));
      return;
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: Role[]) => (request: Request, _response: Response, next: NextFunction) => {
  if (!request.user) {
    next(Object.assign(new Error('Authentication required'), { statusCode: 401 }));
    return;
  }

  if (!roles.includes(request.user.role)) {
    next(Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }));
    return;
  }

  next();
};

export { getCookie };