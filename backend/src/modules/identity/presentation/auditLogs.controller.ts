import { Request, Response } from 'express';
import { AuditAction, AuditSeverity } from '@prisma/client';
import { auditService } from '../application/AuditService.js';

export class AuditLogsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await auditService.list({
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      actorId: req.query.actorId as string | undefined,
      action: req.query.action as AuditAction | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      module: req.query.module as string | undefined,
      severity: req.query.severity as AuditSeverity | undefined,
      success:
        req.query.success === undefined
          ? undefined
          : String(req.query.success) === 'true',
      requestId: req.query.requestId as string | undefined,
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      search: req.query.search as string | undefined,
    });
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await auditService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await auditService.statistics({
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      module: req.query.module as string | undefined,
    });
    res.status(200).json({ success: true, data });
  };

  export = async (req: Request, res: Response): Promise<void> => {
    const csv = await auditService.exportCsv({
      actorId: req.body?.actorId ?? req.query.actorId,
      action: req.body?.action ?? req.query.action,
      entityType: req.body?.entityType ?? req.query.entityType,
      module: req.body?.module ?? req.query.module,
      severity: req.body?.severity ?? req.query.severity,
      success:
        req.body?.success !== undefined
          ? Boolean(req.body.success)
          : req.query.success === undefined
            ? undefined
            : String(req.query.success) === 'true',
      from: req.body?.from
        ? new Date(req.body.from)
        : req.query.from
          ? new Date(String(req.query.from))
          : undefined,
      to: req.body?.to
        ? new Date(req.body.to)
        : req.query.to
          ? new Date(String(req.query.to))
          : undefined,
      search: req.body?.search ?? req.query.search,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  };
}

export const auditLogsController = new AuditLogsController();
