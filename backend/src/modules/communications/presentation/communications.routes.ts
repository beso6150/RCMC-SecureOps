import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { communicationsController } from './communications.controller.js';
import {
  attachmentIdParamsSchema,
  attachmentUploadSchema,
  conversationAttachmentUploadSchema,
  conversationIdParamsSchema,
  createConversationSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  messageIdParamsSchema,
  sendMessageSchema,
} from './communications.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/unread-count',
  authorizePermission(PermissionCodes.COMMUNICATIONS_READ),
  asyncHandler(communicationsController.unreadCount),
);

router.get(
  '/conversations',
  authorizePermission(PermissionCodes.COMMUNICATIONS_READ),
  validate(listConversationsQuerySchema, 'query'),
  asyncHandler(communicationsController.listConversations),
);

router.post(
  '/conversations',
  authorizePermission(PermissionCodes.COMMUNICATIONS_CREATE),
  validate(createConversationSchema),
  asyncHandler(communicationsController.createConversation),
);

router.get(
  '/conversations/:id',
  authorizePermission(PermissionCodes.COMMUNICATIONS_READ),
  validate(conversationIdParamsSchema, 'params'),
  asyncHandler(communicationsController.getConversation),
);

router.post(
  '/conversations/:id/close',
  authorizePermission(PermissionCodes.COMMUNICATIONS_UPDATE),
  validate(conversationIdParamsSchema, 'params'),
  asyncHandler(communicationsController.closeConversation),
);

router.post(
  '/conversations/:id/read',
  authorizePermission(PermissionCodes.COMMUNICATIONS_READ),
  validate(conversationIdParamsSchema, 'params'),
  asyncHandler(communicationsController.markConversationRead),
);

router.get(
  '/conversations/:id/messages',
  authorizePermission(PermissionCodes.COMMUNICATIONS_READ),
  validate(conversationIdParamsSchema, 'params'),
  validate(listMessagesQuerySchema, 'query'),
  asyncHandler(communicationsController.listMessages),
);

router.post(
  '/conversations/:id/messages',
  authorizePermission(PermissionCodes.COMMUNICATIONS_SEND),
  validate(conversationIdParamsSchema, 'params'),
  validate(sendMessageSchema),
  asyncHandler(communicationsController.sendMessage),
);

router.post(
  '/conversations/:id/attachments',
  authorizePermission(PermissionCodes.COMMUNICATIONS_ATTACHMENTS),
  validate(conversationIdParamsSchema, 'params'),
  validate(conversationAttachmentUploadSchema),
  asyncHandler(communicationsController.addConversationAttachment),
);

router.delete(
  '/messages/:id',
  authorizePermission(PermissionCodes.COMMUNICATIONS_DELETE),
  validate(messageIdParamsSchema, 'params'),
  asyncHandler(communicationsController.softDeleteMessage),
);

router.post(
  '/messages/:id/attachments',
  authorizePermission(PermissionCodes.COMMUNICATIONS_ATTACHMENTS),
  validate(messageIdParamsSchema, 'params'),
  validate(attachmentUploadSchema),
  asyncHandler(communicationsController.addAttachment),
);

router.get(
  '/attachments/:id',
  authorizePermission(PermissionCodes.COMMUNICATIONS_ATTACHMENTS),
  validate(attachmentIdParamsSchema, 'params'),
  asyncHandler(communicationsController.downloadAttachment),
);

router.get(
  '/attachments/:id/preview',
  authorizePermission(PermissionCodes.COMMUNICATIONS_ATTACHMENTS),
  validate(attachmentIdParamsSchema, 'params'),
  asyncHandler(communicationsController.previewAttachment),
);

export default router;
