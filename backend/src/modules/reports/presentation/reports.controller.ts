import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { reportService } from '../application/ReportService.js';
import { reportGenerationService } from '../application/ReportGenerationService.js';
import { reportApprovalService } from '../application/ReportApprovalService.js';
import { reportScheduleService } from '../application/ReportScheduleService.js';
import { customReportService } from '../application/CustomReportService.js';
import { kpiService } from '../application/KpiService.js';
import {
  CustomReportBody,
  GenerateReportBody,
  ScheduleBody,
} from './reports.schemas.js';
import { ReportAccessAction } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class ReportsController {
  summary = async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly' | 'yearly') ?? 'daily';
    const data = await reportService.getSummary(period);
    res.status(200).json({ success: true, data });
  };

  export = async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly' | 'yearly') ?? 'daily';
    const format = (req.query.format as 'pdf' | 'csv') ?? 'csv';

    if (format === 'pdf') {
      const buffer = await reportService.exportPdf(period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report-${period}.pdf"`,
      );
      res.send(buffer);
      return;
    }

    const csv = await reportService.exportCsv(period);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${period}.csv"`,
    );
    res.send(csv);
  };

  dashboard = async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly' | 'yearly') ?? 'daily';
    const data = await reportService.getDashboardOverview(period);
    res.status(200).json({ success: true, data });
  };

  kpi = async (req: Request, res: Response): Promise<void> => {
    const data = await kpiService.getAll({
      from: new Date(String(req.query.from)),
      to: new Date(String(req.query.to)),
      groupId: req.query.groupId as string | undefined,
      userId: req.query.userId as string | undefined,
      zoneId: req.query.zoneId as string | undefined,
    });
    res.status(200).json({ success: true, data });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await reportGenerationService.list(req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await reportGenerationService.getById(req.params.id!);
    await prisma.reportAccessLog.create({
      data: {
        reportId: data.id,
        userId: req.user!.id,
        action: ReportAccessAction.VIEW,
        ipAddress: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
    });
    res.status(200).json({ success: true, data });
  };

  generate = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as GenerateReportBody;
    const data = await reportGenerationService.generate(req.user!, body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  generateDaily = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as GenerateReportBody;
    const data = await reportGenerationService.generate(
      req.user!,
      { ...body, reportType: 'DAILY_SECURITY' },
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  generateShift = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as GenerateReportBody;
    const data = await reportGenerationService.generate(
      req.user!,
      { ...body, reportType: body.reportType === 'HANDOVER_REPORT' ? 'HANDOVER_REPORT' : 'SHIFT_REPORT' },
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  custom = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CustomReportBody;
    const data = await customReportService.generate(req.user!, body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  submit = async (req: Request, res: Response): Promise<void> => {
    const data = await reportApprovalService.submit(
      req.user!,
      req.params.id!,
      (req.body as { notes?: string | null }).notes ?? null,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    const data = await reportApprovalService.approve(
      req.user!,
      req.params.id!,
      (req.body as { notes?: string | null }).notes ?? null,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const data = await reportApprovalService.reject(
      req.user!,
      req.params.id!,
      (req.body as { notes: string }).notes,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  returnForEdit = async (req: Request, res: Response): Promise<void> => {
    const data = await reportApprovalService.returnForEdit(
      req.user!,
      req.params.id!,
      (req.body as { notes?: string | null }).notes ?? null,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  archive = async (req: Request, res: Response): Promise<void> => {
    const data = await reportApprovalService.archive(
      req.user!,
      req.params.id!,
      (req.body as { notes?: string | null }).notes ?? null,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  createVersion = async (req: Request, res: Response): Promise<void> => {
    const data = await reportApprovalService.createVersion(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    await reportGenerationService.softDeleteDraft(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { id: req.params.id } });
  };

  exportPdf = async (req: Request, res: Response): Promise<void> => {
    const { buffer, fileName } = await reportService.exportSavedReportPdf(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  };

  exportCsv = async (req: Request, res: Response): Promise<void> => {
    const { csv, fileName } = await reportService.exportSavedReportCsv(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csv);
  };

  listSchedules = async (_req: Request, res: Response): Promise<void> => {
    const data = await reportScheduleService.list();
    res.status(200).json({ success: true, data });
  };

  getSchedule = async (req: Request, res: Response): Promise<void> => {
    const data = await reportScheduleService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createSchedule = async (req: Request, res: Response): Promise<void> => {
    const data = await reportScheduleService.create(
      req.user!,
      req.body as ScheduleBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  updateSchedule = async (req: Request, res: Response): Promise<void> => {
    const data = await reportScheduleService.update(
      req.user!,
      req.params.id!,
      req.body as Partial<ScheduleBody>,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  enableSchedule = async (req: Request, res: Response): Promise<void> => {
    const data = await reportScheduleService.setActive(
      req.user!,
      req.params.id!,
      true,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  disableSchedule = async (req: Request, res: Response): Promise<void> => {
    const data = await reportScheduleService.setActive(
      req.user!,
      req.params.id!,
      false,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  runScheduleNow = async (req: Request, res: Response): Promise<void> => {
    const data = await reportScheduleService.runNow(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  deleteSchedule = async (req: Request, res: Response): Promise<void> => {
    await reportScheduleService.softDelete(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { id: req.params.id } });
  };
}

export const reportsController = new ReportsController();
