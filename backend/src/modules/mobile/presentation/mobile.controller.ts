import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { mobileService } from '../application/MobileService.js';
import type {
  RegisterDeviceBody,
  SyncBatchBody,
  UnregisterDeviceBody,
} from './mobile.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class MobileController {
  bootstrap = async (req: Request, res: Response): Promise<void> => {
    const data = await mobileService.bootstrap(req.user!);
    res.status(200).json({ success: true, data });
  };

  config = async (req: Request, res: Response): Promise<void> => {
    const data = await mobileService.getConfig(req.user!);
    res.status(200).json({ success: true, data });
  };

  syncPull = async (req: Request, res: Response): Promise<void> => {
    const data = await mobileService.syncPull(req.user!, {
      updatedSince: req.query.updatedSince as Date | undefined,
      cursor: req.query.cursor as string | undefined,
      page: req.query.page as number | undefined,
      pageSize: req.query.pageSize as number | undefined,
    });
    res.status(200).json({ success: true, data });
  };

  syncBatch = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SyncBatchBody;
    const data = await mobileService.syncBatch(req.user!, body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  registerDevice = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RegisterDeviceBody;
    const data = await mobileService.registerDevice(req.user!, body);
    res.status(200).json({
      success: true,
      data: {
        ...data,
        // Never claim WEB_PUSH / MOBILE_PUSH delivery works
        pushDeliveryAvailable: false,
      },
    });
  };

  unregisterDevice = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UnregisterDeviceBody;
    const data = await mobileService.unregisterDevice(req.user!, body.deviceUuid);
    res.status(200).json({ success: true, data });
  };

  listMyDevices = async (req: Request, res: Response): Promise<void> => {
    const data = await mobileService.listMyDevices(req.user!);
    res.status(200).json({ success: true, data });
  };

  listAllDevices = async (req: Request, res: Response): Promise<void> => {
    const data = await mobileService.listAllDevices(req.user!, req.query as never);
    res.status(200).json({ success: true, data });
  };

  disableDevice = async (req: Request, res: Response): Promise<void> => {
    const data = await mobileService.disableDevice(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };
}

export const mobileController = new MobileController();
