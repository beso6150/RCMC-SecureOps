import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';

export function authorizeRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.user.roleCode)) {
      next(new ForbiddenError(`Requires role: ${roles.join(' | ')}`));
      return;
    }

    next();
  };
}
