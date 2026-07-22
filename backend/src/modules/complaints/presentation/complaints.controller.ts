import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { complaintService } from '../application/ComplaintService.js';
import { complaintStatisticsService } from '../application/ComplaintStatisticsService.js';
import { complaintPdfService } from '../application/ComplaintPdfService.js';
import {
  CreateComplaintBody,
  ReviewComplaintBody,
  UpdateComplaintBody,
} from './complaints.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class ComplaintsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await complaintService.list(req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await complaintService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateComplaintBody;
    const data = await complaintService.create(req.user!, body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpdateComplaintBody;
    const data = await complaintService.update(
      req.user!,
      req.params.id!,
      body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  review = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ReviewComplaintBody;
    const data = await complaintService.review(
      req.user!,
      req.params.id!,
      body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await complaintStatisticsService.getSummary(req.query as never);
    res.status(200).json({ success: true, data });
  };

  getPdf = async (req: Request, res: Response): Promise<void> => {
    const complaint = await complaintService.getById(req.params.id!);
    const buffer = complaintPdfService.generateBuffer(complaint);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="complaint-${complaint.id}.pdf"`,
    );
    res.send(buffer);
  };
}

export const complaintsController = new ComplaintsController();
