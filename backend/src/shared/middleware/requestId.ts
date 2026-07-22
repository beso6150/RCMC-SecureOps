import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
  req.authContext = {};
  res.setHeader('x-request-id', req.requestId);
  next();
}
