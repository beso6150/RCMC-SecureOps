import { Request, Response } from 'express';
import { notificationService } from '../application/NotificationService.js';
import { notificationPreferenceService } from '../application/NotificationPreferenceService.js';
import { notificationRuleService } from '../application/NotificationRuleService.js';

export class NotificationsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await notificationService.list(req.user!, req.query as never);
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.getById(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.markRead(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.markAllRead(req.user!);
    res.status(200).json({ success: true, data });
  };

  unreadCount = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.unreadCount(req.user!);
    res.status(200).json({ success: true, data });
  };

  acknowledge = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.acknowledge(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  acknowledgeAllAllowed = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.acknowledgeAllAllowed(req.user!);
    res.status(200).json({ success: true, data });
  };

  snooze = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.snooze(req.user!, req.params.id!, req.body);
    res.status(200).json({ success: true, data });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.cancel(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  statistics = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.statistics(req.user!);
    res.status(200).json({ success: true, data });
  };

  summary = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.summary(req.user!);
    res.status(200).json({ success: true, data });
  };

  listPreferences = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationPreferenceService.listForUser(req.user!);
    res.status(200).json({ success: true, data });
  };

  upsertPreference = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationPreferenceService.upsert(req.user!, req.body);
    res.status(200).json({ success: true, data });
  };

  listRules = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationRuleService.list(req.user!);
    res.status(200).json({ success: true, data });
  };

  createRule = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationRuleService.create(req.user!, req.body);
    res.status(201).json({ success: true, data });
  };

  updateRule = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationRuleService.update(req.user!, req.params.id!, req.body);
    res.status(200).json({ success: true, data });
  };

  deleteRule = async (req: Request, res: Response): Promise<void> => {
    await notificationRuleService.softDelete(req.user!, req.params.id!);
    res.status(200).json({ success: true, data: { deleted: true } });
  };
}

export const notificationsController = new NotificationsController();
