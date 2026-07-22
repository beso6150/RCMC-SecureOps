import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { hostService, visitorService } from '../application/VisitorService.js';
import { floorService, meetingRoomService } from '../application/FacilityService.js';
import { visitEmailService } from '../application/VisitEmailService.js';
import { visitStatisticsService } from '../application/VisitStatisticsService.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class VisitorsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await visitorService.list(req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.create(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.update(req.user!, req.params.id!, req.body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  arrive = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.markArrived(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  startMeeting = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.startMeeting(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.complete(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.cancel(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  history = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.history(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  notifications = async (req: Request, res: Response): Promise<void> => {
    const data = await visitorService.notifications(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await visitStatisticsService.getSummary(req.query as never);
    res.status(200).json({ success: true, data });
  };
}

export class HostsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const data = await hostService.list(search);
    res.status(200).json({ success: true, data });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await hostService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await hostService.create(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = await hostService.update(req.user!, req.params.id!, req.body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await hostService.remove(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };
}

export class FacilitiesController {
  listFloors = async (_req: Request, res: Response): Promise<void> => {
    const data = await floorService.list();
    res.status(200).json({ success: true, data });
  };

  getFloor = async (req: Request, res: Response): Promise<void> => {
    const data = await floorService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  updateFloor = async (req: Request, res: Response): Promise<void> => {
    const data = await floorService.update(req.user!, req.params.id!, req.body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  listRooms = async (req: Request, res: Response): Promise<void> => {
    const floorId = typeof req.query.floorId === 'string' ? req.query.floorId : undefined;
    const data = await meetingRoomService.list(floorId);
    res.status(200).json({ success: true, data });
  };

  getRoom = async (req: Request, res: Response): Promise<void> => {
    const data = await meetingRoomService.getById(req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createRoom = async (req: Request, res: Response): Promise<void> => {
    const data = await meetingRoomService.create(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  updateRoom = async (req: Request, res: Response): Promise<void> => {
    const data = await meetingRoomService.update(req.user!, req.params.id!, req.body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  removeRoom = async (req: Request, res: Response): Promise<void> => {
    await meetingRoomService.remove(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };
}

export class VisitEmailsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const parseStatus =
      typeof req.query.parseStatus === 'string' ? req.query.parseStatus : undefined;
    const data = await visitEmailService.list(parseStatus);
    res.status(200).json({ success: true, data });
  };

  ingest = async (req: Request, res: Response): Promise<void> => {
    const data = await visitEmailService.ingest(req.user!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };
}

export const visitorsController = new VisitorsController();
export const hostsController = new HostsController();
export const facilitiesController = new FacilitiesController();
export const visitEmailsController = new VisitEmailsController();
