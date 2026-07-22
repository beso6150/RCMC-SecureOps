import { Request, Response } from 'express';
import { internalConversationService } from '../application/InternalConversationService.js';
import { internalMessageService } from '../application/InternalMessageService.js';

export class CommunicationsController {
  unreadCount = async (req: Request, res: Response): Promise<void> => {
    const data = await internalConversationService.unreadCount(req.user!);
    res.status(200).json({ success: true, data });
  };

  listConversations = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await internalConversationService.listMine(req.user!, page, pageSize);
    res.status(200).json({ success: true, ...result });
  };

  getConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await internalConversationService.getById(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  createConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await internalConversationService.create(req.user!, req.body);
    res.status(201).json({ success: true, data });
  };

  closeConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await internalConversationService.close(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  markConversationRead = async (req: Request, res: Response): Promise<void> => {
    const data = await internalConversationService.markRead(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  listMessages = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 50);
    const result = await internalMessageService.list(
      req.user!,
      req.params.id!,
      page,
      pageSize,
    );
    res.status(200).json({ success: true, ...result });
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const data = await internalMessageService.send(req.user!, req.params.id!, req.body);
    res.status(201).json({ success: true, data });
  };

  softDeleteMessage = async (req: Request, res: Response): Promise<void> => {
    const data = await internalMessageService.softDelete(req.user!, req.params.id!);
    res.status(200).json({ success: true, data });
  };

  addAttachment = async (req: Request, res: Response): Promise<void> => {
    const data = await internalMessageService.addAttachment(
      req.user!,
      req.params.id!,
      req.body,
    );
    res.status(201).json({ success: true, data });
  };

  addConversationAttachment = async (req: Request, res: Response): Promise<void> => {
    const data = await internalMessageService.addAttachmentToConversation(
      req.user!,
      req.params.id!,
      req.body,
    );
    res.status(201).json({ success: true, data });
  };

  downloadAttachment = async (req: Request, res: Response): Promise<void> => {
    const { attachment, buffer } = await internalMessageService.downloadAttachment(
      req.user!,
      req.params.id!,
    );
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.originalFileName)}"`,
    );
    res.status(200).send(buffer);
  };

  /** Preview alias — same as download for now. */
  previewAttachment = async (req: Request, res: Response): Promise<void> => {
    const { attachment, buffer } = await internalMessageService.downloadAttachment(
      req.user!,
      req.params.id!,
    );
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(attachment.originalFileName)}"`,
    );
    res.status(200).send(buffer);
  };
}

export const communicationsController = new CommunicationsController();
