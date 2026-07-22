import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { shiftRosterService } from '../application/ShiftRosterService.js';
import {
  SetOperationalStatusBody,
  UpdateCycleConfigBody,
  UpsertHandoverBody,
} from './shifts.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class ShiftsController {
  overview = async (_req: Request, res: Response): Promise<void> => {
    const data = await shiftRosterService.getOverview();
    res.status(200).json({ success: true, data });
  };

  opsBoard = async (_req: Request, res: Response): Promise<void> => {
    const data = await shiftRosterService.getOpsBoard();
    res.status(200).json({ success: true, data });
  };

  listPersonnel = async (req: Request, res: Response): Promise<void> => {
    const roleCodes = req.query.roleCodes as string[] | undefined;
    const data = await shiftRosterService.listOnDutyPersonnel(roleCodes);
    res.status(200).json({ success: true, data });
  };

  listAssignable = async (req: Request, res: Response): Promise<void> => {
    const data = await shiftRosterService.listAssignableGuards(req.user!);
    res.status(200).json({ success: true, data });
  };

  setOperationalStatus = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SetOperationalStatusBody;
    const data = await shiftRosterService.setOperationalStatus(
      req.user!,
      req.params.userId!,
      body.status,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  updateCycleConfig = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpdateCycleConfigBody;
    const data = await shiftRosterService.updateCycleConfig(req.user!, body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  handoverBoard = async (_req: Request, res: Response): Promise<void> => {
    const data = await shiftRosterService.getHandoverBoard();
    res.status(200).json({ success: true, data });
  };

  upsertHandover = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpsertHandoverBody;
    const data = await shiftRosterService.upsertHandover(req.user!, body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  approveHandover = async (req: Request, res: Response): Promise<void> => {
    const data = await shiftRosterService.approveHandover(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  approveTakeover = async (req: Request, res: Response): Promise<void> => {
    const data = await shiftRosterService.approveTakeover(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await shiftRosterService.getShiftStatistics({
      from: req.query.from as Date | undefined,
      to: req.query.to as Date | undefined,
    });
    res.status(200).json({ success: true, data });
  };
}

export const shiftsController = new ShiftsController();
