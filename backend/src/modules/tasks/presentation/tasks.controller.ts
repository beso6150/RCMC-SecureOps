import { Request, Response } from 'express';
import { RequestMeta } from '../../identity/domain/types.js';
import { taskService } from '../application/TaskService.js';
import { CreateTaskBody, UpdateTaskBody } from './tasks.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class TasksController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await taskService.list(req.user!, req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const result = await taskService.listMine(req.user!, req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  listOverdue = async (req: Request, res: Response): Promise<void> => {
    const result = await taskService.listOverdue(req.user!, req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.statistics(req.user!);
    res.status(200).json({ success: true, data });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.getById(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  timeline = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.timeline(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateTaskBody;
    const data = await taskService.create(req.user!, body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpdateTaskBody;
    const data = await taskService.update(req.user!, req.params.id!, body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.assign(req.user!, req.params.id!, req.body, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  reassign = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.reassign(
      req.user!,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  accept = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.accept(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  start = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.start(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data });
  };

  wait = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.wait(
      req.user!,
      req.params.id!,
      req.body?.note,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.complete(
      req.user!,
      req.params.id!,
      { completionNotes: req.body?.completionNotes },
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.reject(
      req.user!,
      req.params.id!,
      req.body?.reason ?? '',
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.cancel(
      req.user!,
      req.params.id!,
      req.body?.reason,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  escalate = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.escalate(
      req.user!,
      req.params.id!,
      req.body?.note,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };

  addEvidence = async (req: Request, res: Response): Promise<void> => {
    const data = await taskService.addEvidence(req.user!, req.params.id!, req.body, requestMeta(req));
    res.status(201).json({ success: true, data });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await taskService.softDelete(req.user!, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };
}

export const tasksController = new TasksController();
