import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';
import { authorizationService } from '../../modules/identity/application/AuthorizationService.js';

export function authorizePermission(...required: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const allowed = await authorizationService.hasAllPermissions(
        req.user,
        required,
        req.authContext ?? {},
      );

      if (!allowed) {
        throw new ForbiddenError(`Missing required permission(s): ${required.join(', ')}`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function authorizeAnyPermission(...required: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const allowed = await authorizationService.hasAnyPermission(
        req.user,
        required,
        req.authContext ?? {},
      );

      if (!allowed) {
        throw new ForbiddenError(`Missing required permission(s): ${required.join(', ')}`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
