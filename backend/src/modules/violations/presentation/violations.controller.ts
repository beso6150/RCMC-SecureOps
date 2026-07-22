import { Request, Response } from 'express';
import { ValidationError } from '../../../shared/errors/index.js';
import { RequestMeta } from '../../identity/domain/types.js';
import { violationService } from '../application/ViolationService.js';
import { violationStatisticsService } from '../application/ViolationStatisticsService.js';
import { violationSyncService } from '../application/ViolationSyncService.js';
import {
  CreateViolationBody,
  SyncPushBody,
  UpdateViolationBody,
} from './violations.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class ViolationsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await violationService.list(req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await violationService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateViolationBody;
    const data = await violationService.create(req.user!, body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpdateViolationBody;
    const data = await violationService.update(req.user!, req.params.id!, body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    const data = await violationService.assign(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  startProgress = async (req: Request, res: Response): Promise<void> => {
    const data = await violationService.startProgress(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  close = async (req: Request, res: Response): Promise<void> => {
    const data = await violationService.close(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addAttachments = async (req: Request, res: Response): Promise<void> => {
    const data = await violationService.addAttachments(
      req.user!,
      req.params.id!,
      req.body.attachments,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await violationService.softDelete(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await violationStatisticsService.getSummary(req.query as never);
    res.status(200).json({ success: true, data });
  };

  syncPush = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SyncPushBody;
    const data = await violationSyncService.push(req.user!, body.items, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  syncPull = async (req: Request, res: Response): Promise<void> => {
    const since = typeof req.query.since === 'string' ? req.query.since : '';
    if (!since) {
      throw new ValidationError('Query parameter "since" is required (ISO datetime)');
    }
    try {
      const data = await violationSyncService.pull(since);
      res.status(200).json({ success: true, data });
    } catch {
      throw new ValidationError('Invalid since timestamp');
    }
  };

  parkingLocations = async (_req: Request, res: Response): Promise<void> => {
    const { PARKING_LOCATIONS } = await import('../domain/constants.js');
    res.status(200).json({ success: true, data: PARKING_LOCATIONS });
  };
}

export const violationsController = new ViolationsController();
