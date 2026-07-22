import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { cameraRequestService } from '../application/CameraRequestService.js';
import { cctvDashboardService } from '../application/CctvDashboardService.js';
import { vehiclePermitSearchService } from '../application/VehiclePermitSearchService.js';
import { CreateCameraRequestBody, CompleteCameraRequestBody } from './cctv.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class CctvController {
  searchPermits = async (req: Request, res: Response): Promise<void> => {
    const plateNumber = String(req.query.plateNumber ?? '');
    const data = await vehiclePermitSearchService.search(plateNumber);
    res.status(200).json({ success: true, data });
  };

  listRequests = async (req: Request, res: Response): Promise<void> => {
    const result = await cameraRequestService.list(req.user!, req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  getRequest = async (req: Request, res: Response): Promise<void> => {
    const data = await cameraRequestService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createRequest = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateCameraRequestBody;
    const data = await cameraRequestService.create(req.user!, body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  startRequest = async (req: Request, res: Response): Promise<void> => {
    const data = await cameraRequestService.start(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  completeRequest = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as CompleteCameraRequestBody;
    const data = await cameraRequestService.complete(
      req.user!,
      req.params.id!,
      body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  cancelRequest = async (req: Request, res: Response): Promise<void> => {
    const data = await cameraRequestService.cancel(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  dashboard = async (_req: Request, res: Response): Promise<void> => {
    const data = await cctvDashboardService.getDashboard();
    res.status(200).json({ success: true, data });
  };
}

export const cctvController = new CctvController();
