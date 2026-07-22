import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/index.js';
import { ErrorCodes } from '../errors/errorCodes.js';

const ALLOWED_PATH_SUFFIXES = [
  'POST /api/v1/auth/change-password',
  'POST /api/v1/auth/logout',
  'GET /api/v1/auth/me',
];

function normalizeRoute(req: Request): string {
  const path = (req.originalUrl ?? req.url).split('?')[0]?.replace(/\/+$/, '') || '/';
  return `${req.method.toUpperCase()} ${path}`;
}

export function requirePasswordChanged(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  if (!req.user.isFirstLogin) {
    next();
    return;
  }

  const route = normalizeRoute(req);
  if (ALLOWED_PATH_SUFFIXES.includes(route)) {
    next();
    return;
  }

  next(
    new UnauthorizedError(
      'Password change required before continuing',
      ErrorCodes.MUST_CHANGE_PASSWORD,
    ),
  );
}
