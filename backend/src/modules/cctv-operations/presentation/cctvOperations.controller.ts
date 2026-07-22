import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { cctvOperationsService } from '../application/CctvOperationsService.js';
import {
  AcknowledgeShareBody,
  AddAttachmentBody,
  AssignReferralBody,
  CloseReferralBody,
  CreatePermitBody,
  CreateReferralBody,
  UpdateReferralBody,
  EscalateReferralBody,
  NoteBody,
  ReasonBody,
  RequestInfoBody,
  ResolveReferralBody,
  SharePermitBody,
  UpdatePermitBody,
} from './cctvOperations.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

function sendFile(
  res: Response,
  file: { buffer: Buffer; mimeType: string; fileName: string },
  disposition: 'inline' | 'attachment',
): void {
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
  );
  res.setHeader('Content-Length', String(file.buffer.length));
  res.status(200).send(file.buffer);
}

export class CctvOperationsController {
  dashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.getDashboard(req.user!);
    res.status(200).json({ success: true, data });
  };

  activePersonnel = async (_req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.getActivePersonnel();
    res.status(200).json({ success: true, data });
  };

  currentShift = async (_req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.getCurrentShift();
    res.status(200).json({ success: true, data });
  };

  listPermits = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.listPermits(req.user!, req.query as never);
    res.status(200).json({ success: true, data });
  };

  getPermit = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.getPermit(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createPermit = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.createPermit(
      req.user!,
      req.body as CreatePermitBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  updatePermit = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.updatePermit(
      req.user!,
      req.params.id!,
      req.body as UpdatePermitBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  activatePermit = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.activatePermit(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  cancelPermit = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ReasonBody;
    const data = await cctvOperationsService.cancelPermit(
      req.user!,
      req.params.id!,
      body.reason,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  rejectPermit = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ReasonBody;
    const data = await cctvOperationsService.rejectPermit(
      req.user!,
      req.params.id!,
      body.reason,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  markPermitUsed = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.markPermitUsed(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  sharePermit = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.sharePermit(
      req.user!,
      req.params.id!,
      req.body as SharePermitBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  listPermitShares = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.listPermitShares(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  acknowledgePermitShare = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as AcknowledgeShareBody;
    const data = await cctvOperationsService.acknowledgePermitShare(
      req.user!,
      req.params.id!,
      body.mode ?? 'acknowledge',
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  downloadPermitAttachment = async (req: Request, res: Response): Promise<void> => {
    const file = await cctvOperationsService.getPermitAttachment(req.user!, req.params.id!);
    sendFile(res, file, 'attachment');
  };

  previewPermitAttachment = async (req: Request, res: Response): Promise<void> => {
    const file = await cctvOperationsService.getPermitAttachment(req.user!, req.params.id!);
    sendFile(res, file, 'inline');
  };

  permitStatistics = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.permitStatistics(
      req.query.from as Date | undefined,
      req.query.to as Date | undefined,
    );
    res.status(200).json({ success: true, data });
  };

  listReferrals = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.listReferrals(req.user!, req.query as never);
    res.status(200).json({ success: true, data });
  };

  getReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.getReferral(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.createReferral(
      req.user!,
      req.body as CreateReferralBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  updateReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.updateReferral(
      req.user!,
      req.params.id!,
      req.body as UpdateReferralBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  sendReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.sendReferral(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  assignReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.assignReferral(
      req.user!,
      req.params.id!,
      req.body as AssignReferralBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  receiveReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.receiveReferral(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  startReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.startReferral(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  arriveReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.arriveReferral(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  requestInfo = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RequestInfoBody;
    const data = await cctvOperationsService.requestInfo(
      req.user!,
      req.params.id!,
      body.message,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  resolveReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.resolveReferral(
      req.user!,
      req.params.id!,
      req.body as ResolveReferralBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  rejectReferral = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ReasonBody;
    const data = await cctvOperationsService.rejectReferral(
      req.user!,
      req.params.id!,
      body.reason,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  cancelReferral = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ReasonBody;
    const data = await cctvOperationsService.cancelReferral(
      req.user!,
      req.params.id!,
      body.reason,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  escalateReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.escalateReferral(
      req.user!,
      req.params.id!,
      req.body as EscalateReferralBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  closeReferral = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CloseReferralBody;
    const data = await cctvOperationsService.closeReferral(
      req.user!,
      req.params.id!,
      body.note ?? null,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addNote = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as NoteBody;
    const data = await cctvOperationsService.addNote(
      req.user!,
      req.params.id!,
      body.message,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addAttachment = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.addAttachment(
      req.user!,
      req.params.id!,
      req.body as AddAttachmentBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  getTimeline = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.getTimeline(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  getAttachments = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.getAttachments(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  previewAttachment = async (req: Request, res: Response): Promise<void> => {
    const file = await cctvOperationsService.readAttachment(
      req.user!,
      req.params.id!,
      req.params.attachmentId!,
      'preview',
    );
    sendFile(res, file, 'inline');
  };

  downloadAttachment = async (req: Request, res: Response): Promise<void> => {
    const file = await cctvOperationsService.readAttachment(
      req.user!,
      req.params.id!,
      req.params.attachmentId!,
      'download',
    );
    sendFile(res, file, 'attachment');
  };

  referralStatistics = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.referralStatistics(
      req.query.from as Date | undefined,
      req.query.to as Date | undefined,
    );
    res.status(200).json({ success: true, data });
  };

  processEscalations = async (req: Request, res: Response): Promise<void> => {
    const data = await cctvOperationsService.processEscalations(req.user!);
    res.status(200).json({ success: true, data });
  };
}

export const cctvOperationsController = new CctvOperationsController();
