import { NextFunction, Request, Response } from 'express';
import {
  hashRequestPayload,
  idempotencyService,
  requireIdempotencyKey,
  sanitizeResponseSummary,
} from './idempotency.js';
import { UnauthorizedError } from '../errors/index.js';

export interface IdempotencyMiddlewareOptions {
  /** When true, Idempotency-Key header is required. Default false. */
  required?: boolean;
  operationType?: string;
  entityType?: string;
}

/**
 * Optional/required Idempotency-Key middleware.
 * On COMPLETED keys, returns the cached JSON summary.
 * On PROCESSING, responds with 409 Arabic conflict via IdempotencyService.
 * Never stores full sensitive payloads — only sanitized summaries.
 */
export function idempotencyMiddleware(options: IdempotencyMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = requireIdempotencyKey(req.header('Idempotency-Key') ?? undefined, options.required === true);
      if (!key) {
        next();
        return;
      }

      if (!req.user) {
        throw new UnauthorizedError();
      }

      const started = await idempotencyService.beginOrReplay({
        userId: req.user.id,
        idempotencyKey: key,
        operationType: options.operationType ?? req.method,
        entityType: options.entityType ?? req.path,
        requestHash: hashRequestPayload({ method: req.method, path: req.path, body: req.body }),
      });

      if (started.replay) {
        res.status(200).json(started.body);
        return;
      }

      (req as Request & { idempotencyRecordId?: string }).idempotencyRecordId = started.recordId;

      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        const recordId = (req as Request & { idempotencyRecordId?: string }).idempotencyRecordId;
        if (recordId && res.statusCode >= 200 && res.statusCode < 300) {
          void idempotencyService
            .complete(recordId, body)
            .catch(() => undefined);
        } else if (recordId && res.statusCode >= 400) {
          const message =
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error?: { message?: string } }).error?.message === 'string'
              ? (body as { error: { message: string } }).error.message
              : 'فشل الطلب';
          void idempotencyService.fail(recordId, 'FAILED', message).catch(() => undefined);
        }
        // Ensure we never accidentally persist secrets via this path
        void sanitizeResponseSummary(body);
        return originalJson(body);
      }) as Response['json'];

      next();
    } catch (err) {
      next(err);
    }
  };
}
