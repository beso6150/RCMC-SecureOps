import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import {
  departmentService,
  shiftService,
  systemSettingService,
} from '../application/SettingsService.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class SettingsController {
  listDepartments = async (_req: Request, res: Response): Promise<void> => {
    const data = await departmentService.list();
    res.status(200).json({ success: true, data });
  };

  createDepartment = async (req: Request, res: Response): Promise<void> => {
    const data = await departmentService.create(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  updateDepartment = async (req: Request, res: Response): Promise<void> => {
    const data = await departmentService.update(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  deleteDepartment = async (req: Request, res: Response): Promise<void> => {
    await departmentService.softDelete(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };

  listShifts = async (_req: Request, res: Response): Promise<void> => {
    const data = await shiftService.list();
    res.status(200).json({ success: true, data });
  };

  createShift = async (req: Request, res: Response): Promise<void> => {
    const data = await shiftService.create(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  updateShift = async (req: Request, res: Response): Promise<void> => {
    const data = await shiftService.update(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  deleteShift = async (req: Request, res: Response): Promise<void> => {
    await shiftService.softDelete(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };

  listSystemSettings = async (_req: Request, res: Response): Promise<void> => {
    const data = await systemSettingService.list();
    res.status(200).json({ success: true, data });
  };

  upsertSystemSettings = async (req: Request, res: Response): Promise<void> => {
    const data = await systemSettingService.upsertMany(
      req.user!,
      req.body.settings,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  getSystemSetting = async (req: Request, res: Response): Promise<void> => {
    const data = await systemSettingService.getByKey(req.params.key!);
    res.status(200).json({ success: true, data });
  };

  upsertSystemSetting = async (req: Request, res: Response): Promise<void> => {
    const data = await systemSettingService.upsertOne(
      req.user!,
      req.params.key!,
      req.body.value,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };
}

export const settingsController = new SettingsController();
