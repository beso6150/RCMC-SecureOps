import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { fieldOperationsService } from '../application/FieldOperationsService.js';
import {
  AssignSessionBody,
  CancelAlertBody,
  CancelSessionBody,
  CreateAlertBody,
  CreateCheckpointBody,
  CreateRouteBody,
  CreateSessionBody,
  CreateZoneBody,
  LocationUpdateBody,
  ResolveAlertBody,
  SosBody,
  UpdateCheckpointBody,
  UpdateRouteBody,
  UpdateSessionBody,
  UpdateZoneBody,
  VisitCheckpointBody,
} from './fieldOperations.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class FieldOperationsController {
  map = async (_req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getMap();
    res.status(200).json({ success: true, data });
  };

  overview = async (_req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getOverview();
    res.status(200).json({ success: true, data });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getStatistics(
      req.query.from as Date | undefined,
      req.query.to as Date | undefined,
    );
    res.status(200).json({ success: true, data });
  };

  listZones = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.listZones(req.query as never);
    res.status(200).json({ success: true, data });
  };

  getZone = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getZone(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createZone = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.createZone(
      req.user!,
      req.body as CreateZoneBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  updateZone = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.updateZone(
      req.user!,
      req.params.id!,
      req.body as UpdateZoneBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  deleteZone = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.deleteZone(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  listCheckpoints = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.listCheckpoints(req.query as never);
    res.status(200).json({ success: true, data });
  };

  getCheckpoint = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getCheckpoint(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createCheckpoint = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.createCheckpoint(
      req.user!,
      req.body as CreateCheckpointBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  updateCheckpoint = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.updateCheckpoint(
      req.user!,
      req.params.id!,
      req.body as UpdateCheckpointBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  deleteCheckpoint = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.deleteCheckpoint(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  listRoutes = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.listRoutes(req.query as never);
    res.status(200).json({ success: true, data });
  };

  getRoute = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getRoute(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createRoute = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.createRoute(
      req.user!,
      req.body as CreateRouteBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  updateRoute = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.updateRoute(
      req.user!,
      req.params.id!,
      req.body as UpdateRouteBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  deleteRoute = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.deleteRoute(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  listSessions = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.listSessions(req.user!, req.query as never);
    res.status(200).json({ success: true, data });
  };

  getSession = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getSession(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createSession = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.createSession(
      req.user!,
      req.body as CreateSessionBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  updateSession = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.updateSession(
      req.user!,
      req.params.id!,
      req.body as UpdateSessionBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  assignSession = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.assignSession(
      req.user!,
      req.params.id!,
      req.body as AssignSessionBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  startSession = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.startSession(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  visitCheckpoint = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.visitCheckpoint(
      req.user!,
      req.params.id!,
      req.params.checkpointId!,
      req.body as VisitCheckpointBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  completeSession = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.completeSession(
      req.user!,
      req.params.id!,
      {},
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  cancelSession = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CancelSessionBody;
    const data = await fieldOperationsService.cancelSession(
      req.user!,
      req.params.id!,
      { cancellationReason: body.reason },
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  listPersonnel = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.listPersonnel(req.query as never);
    res.status(200).json({ success: true, data });
  };

  getPersonnelLocation = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getPersonnelLocation(req.params.userId!);
    res.status(200).json({ success: true, data });
  };

  updateSelfLocation = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.updateSelfLocation(
      req.user!,
      req.body as LocationUpdateBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  updateManualLocation = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.updateManualLocation(
      req.user!,
      req.params.userId!,
      req.body as LocationUpdateBody,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  nearestPersonnel = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.getNearestPersonnel(req.params.incidentId!);
    res.status(200).json({ success: true, data });
  };

  listAlerts = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.listAlerts(req.query as never);
    res.status(200).json({ success: true, data });
  };

  createAlert = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.createAlert(
      req.user!,
      req.body as CreateAlertBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  createSos = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.createSos(
      req.user!,
      req.body as SosBody,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data });
  };

  acknowledgeAlert = async (req: Request, res: Response): Promise<void> => {
    const data = await fieldOperationsService.acknowledgeAlert(
      req.user!,
      req.params.id!,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  resolveAlert = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ResolveAlertBody;
    const data = await fieldOperationsService.resolveAlert(
      req.user!,
      req.params.id!,
      { resolutionNote: body.resolutionNote },
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  cancelAlert = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CancelAlertBody;
    const data = await fieldOperationsService.cancelAlert(
      req.user!,
      req.params.id!,
      { resolutionNote: body.reason ?? null },
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };
}

export const fieldOperationsController = new FieldOperationsController();
