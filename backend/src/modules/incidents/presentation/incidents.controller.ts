import { Request, Response } from 'express';
import fs from 'node:fs';
import { ValidationError, NotFoundError } from '../../../shared/errors/index.js';
import { RequestMeta } from '../../identity/domain/types.js';
import { incidentService } from '../application/IncidentService.js';
import { incidentSyncService } from '../application/IncidentSyncService.js';
import { incidentOpsService } from '../application/IncidentOpsService.js';
import { operationsRoomService } from '../application/OperationsRoomService.js';
import {
  CreateIncidentBody,
  SyncPushBody,
  UpdateIncidentBody,
} from './incidents.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class IncidentsController {
  listTypes = async (_req: Request, res: Response): Promise<void> => {
    const data = await incidentService.listTypes();
    res.status(200).json({ success: true, data });
  };

  createType = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.createType(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  updateType = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.updateType(
      req.user!,
      req.params.typeId!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  parkingLocations = async (_req: Request, res: Response): Promise<void> => {
    const { PARKING_LOCATIONS } = await import('../../violations/domain/constants.js');
    res.status(200).json({ success: true, data: PARKING_LOCATIONS });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as {
      mine?: boolean;
      assigneeId?: string;
      [key: string]: unknown;
    };
    const filters = {
      ...query,
      ...(query.mine ? { assigneeId: req.user!.id } : {}),
    };
    delete (filters as { mine?: boolean }).mine;
    const result = await incidentService.list(filters as never);
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.getDetailed(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateIncidentBody;
    const data = await incidentService.create(req.user!, body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpdateIncidentBody;
    const data = await incidentService.update(req.user!, req.params.id!, body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.assign(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  startProgress = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.startProgress(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  hold = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.hold(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  close = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.close(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.cancel(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addComment = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.addComment(
      req.user!,
      req.params.id!,
      req.body.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addAttachments = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentService.addAttachments(
      req.user!,
      req.params.id!,
      req.body.attachments,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  getPdf = async (req: Request, res: Response): Promise<void> => {
    const incident = await incidentService.getById(req.params.id!);
    const download = req.query.download === 'true';

    if (!incident.pdfPath) {
      throw new NotFoundError('PDF not generated for this incident');
    }

    if (download) {
      const absolutePath = incidentService.getPdfPath(incident);
      if (!fs.existsSync(absolutePath)) {
        throw new NotFoundError('PDF file not found on disk');
      }
      res.download(absolutePath, `incident-${incident.id}.pdf`);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        pdfPath: incident.pdfPath,
        url: `/uploads/${incident.pdfPath}`,
      },
    });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await incidentService.softDelete(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };

  syncPush = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SyncPushBody;
    const data = await incidentSyncService.push(req.user!, body.items, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  syncPull = async (req: Request, res: Response): Promise<void> => {
    const since = typeof req.query.since === 'string' ? req.query.since : '';
    if (!since) {
      throw new ValidationError('Query parameter "since" is required (ISO datetime)');
    }
    try {
      const data = await incidentSyncService.pull(since);
      res.status(200).json({ success: true, data });
    } catch {
      throw new ValidationError('Invalid since timestamp');
    }
  };

  opsDashboard = async (_req: Request, res: Response): Promise<void> => {
    const data = await operationsRoomService.dashboard();
    res.status(200).json({ success: true, data });
  };

  opsLive = async (req: Request, res: Response): Promise<void> => {
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const data = await operationsRoomService.live(limit);
    res.status(200).json({ success: true, data });
  };

  opsStatistics = async (req: Request, res: Response): Promise<void> => {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const data = await operationsRoomService.statistics(from, to);
    res.status(200).json({ success: true, data });
  };

  acknowledge = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.acknowledge(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  assess = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.assess(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  assignOps = async (req: Request, res: Response): Promise<void> => {
    const body = req.body ?? {};
    const data = await incidentOpsService.assignOps(
      req.user!,
      req.params.id!,
      {
        ...body,
        assignedUserId: body.assignedUserId ?? body.assigneeId,
      },
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  reassign = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.reassign(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  respond = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.respond(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  arrive = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.arrive(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  contain = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.contain(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  resolve = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.resolve(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  reopen = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.reopen(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  falseAlarm = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.falseAlarm(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  escalate = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.escalate(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  requestSupport = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.requestSupport(
      req.user!,
      req.params.id!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addNote = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.addNote(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  listNotes = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.listNotes(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  addContactLog = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.addContactLog(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  listContactLogs = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.listContactLogs(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  addTask = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.addTask(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  completeTask = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.completeTask(
      req.user!,
      req.params.id!,
      req.params.taskId!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addFollowUp = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.addFollowUp(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  completeFollowUp = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.completeFollowUp(
      req.user!,
      req.params.id!,
      req.params.followUpId!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  fromReferral = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.fromReferral(
      req.user!,
      req.params.referralId!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  fromFieldAlert = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.fromFieldAlert(
      req.user!,
      req.params.alertId!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  fromViolation = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.fromViolation(
      req.user!,
      req.params.violationId!,
      req.body ?? {},
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  uploadOpsAttachment = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.uploadAttachment(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  downloadAttachment = async (req: Request, res: Response): Promise<void> => {
    const file = await incidentOpsService.getAttachmentFile(
      req.params.id!,
      req.params.attachmentId!,
    );
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.send(file.buffer);
  };

  previewAttachment = async (req: Request, res: Response): Promise<void> => {
    const file = await incidentOpsService.getAttachmentFile(
      req.params.id!,
      req.params.attachmentId!,
    );
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.send(file.buffer);
  };

  nearestPersonnel = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.nearestPersonnel(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  nearbyPatrols = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.nearbyPatrols(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  listProcedures = async (req: Request, res: Response): Promise<void> => {
    const activeOnly = req.query.all !== 'true';
    const data = await incidentOpsService.listProcedures(activeOnly);
    res.status(200).json({ success: true, data });
  };

  getProcedure = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.getProcedure(req.params.procedureId!);
    res.status(200).json({ success: true, data });
  };

  createProcedure = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.createProcedure(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  updateProcedure = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.updateProcedure(
      req.user!,
      req.params.procedureId!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  deleteProcedure = async (req: Request, res: Response): Promise<void> => {
    await incidentOpsService.softDeleteProcedure(
      req.user!,
      req.params.procedureId!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data: { deleted: true } });
  };

  applyProcedure = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.applyProcedureToIncident(
      req.user!,
      req.params.id!,
      req.body.procedureId,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  completeProcedureStep = async (req: Request, res: Response): Promise<void> => {
    const data = await incidentOpsService.completeProcedureStep(
      req.user!,
      req.params.id!,
      req.params.stepId!,
      req.body ?? {},
    );
    res.status(200).json({ success: true, data });
  };
}

export const incidentsController = new IncidentsController();
