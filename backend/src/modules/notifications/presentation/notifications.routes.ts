import { Router } from 'express';
import {
  authenticateJwt,
  authorizeAnyPermission,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { notificationsController } from './notifications.controller.js';
import {
  createRuleSchema,
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
  ruleIdParamsSchema,
  snoozeNotificationSchema,
  updateRuleSchema,
  upsertPreferenceSchema,
} from './notifications.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/unread-count',
  authorizePermission(PermissionCodes.NOTIFICATIONS_READ),
  asyncHandler(notificationsController.unreadCount),
);

router.get(
  '/summary',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_STATISTICS,
    PermissionCodes.NOTIFICATIONS_READ,
  ),
  asyncHandler(notificationsController.summary),
);

router.get(
  '/statistics',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_STATISTICS,
    PermissionCodes.NOTIFICATIONS_READ,
  ),
  asyncHandler(notificationsController.statistics),
);

router.get(
  '/preferences/me',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_PREFERENCES_READ,
    PermissionCodes.NOTIFICATIONS_READ,
  ),
  asyncHandler(notificationsController.listPreferences),
);

router.patch(
  '/preferences/me',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_PREFERENCES_UPDATE,
    PermissionCodes.NOTIFICATIONS_UPDATE,
  ),
  validate(upsertPreferenceSchema),
  asyncHandler(notificationsController.upsertPreference),
);

router.get(
  '/preferences',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_PREFERENCES_READ,
    PermissionCodes.NOTIFICATIONS_READ,
  ),
  asyncHandler(notificationsController.listPreferences),
);

router.put(
  '/preferences',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_PREFERENCES_UPDATE,
    PermissionCodes.NOTIFICATIONS_UPDATE,
  ),
  validate(upsertPreferenceSchema),
  asyncHandler(notificationsController.upsertPreference),
);

router.get(
  '/rules',
  authorizePermission(PermissionCodes.NOTIFICATIONS_RULES_READ),
  asyncHandler(notificationsController.listRules),
);

router.post(
  '/rules',
  authorizePermission(PermissionCodes.NOTIFICATIONS_RULES_MANAGE),
  validate(createRuleSchema),
  asyncHandler(notificationsController.createRule),
);

router.patch(
  '/rules/:id',
  authorizePermission(PermissionCodes.NOTIFICATIONS_RULES_MANAGE),
  validate(ruleIdParamsSchema, 'params'),
  validate(updateRuleSchema),
  asyncHandler(notificationsController.updateRule),
);

router.delete(
  '/rules/:id',
  authorizePermission(PermissionCodes.NOTIFICATIONS_RULES_MANAGE),
  validate(ruleIdParamsSchema, 'params'),
  asyncHandler(notificationsController.deleteRule),
);

router.post(
  '/read-all',
  authorizePermission(PermissionCodes.NOTIFICATIONS_UPDATE),
  asyncHandler(notificationsController.markAllRead),
);

router.post(
  '/acknowledge-all-allowed',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_ACKNOWLEDGE,
    PermissionCodes.NOTIFICATIONS_UPDATE,
  ),
  asyncHandler(notificationsController.acknowledgeAllAllowed),
);

router.get(
  '/',
  authorizePermission(PermissionCodes.NOTIFICATIONS_READ),
  validate(listNotificationsQuerySchema, 'query'),
  asyncHandler(notificationsController.list),
);

router.get(
  '/:id',
  authorizePermission(PermissionCodes.NOTIFICATIONS_READ),
  validate(notificationIdParamsSchema, 'params'),
  asyncHandler(notificationsController.getById),
);

router.post(
  '/:id/read',
  authorizePermission(PermissionCodes.NOTIFICATIONS_UPDATE),
  validate(notificationIdParamsSchema, 'params'),
  asyncHandler(notificationsController.markRead),
);

router.post(
  '/:id/acknowledge',
  authorizeAnyPermission(
    PermissionCodes.NOTIFICATIONS_ACKNOWLEDGE,
    PermissionCodes.NOTIFICATIONS_UPDATE,
  ),
  validate(notificationIdParamsSchema, 'params'),
  asyncHandler(notificationsController.acknowledge),
);

router.post(
  '/:id/snooze',
  authorizePermission(PermissionCodes.NOTIFICATIONS_UPDATE),
  validate(notificationIdParamsSchema, 'params'),
  validate(snoozeNotificationSchema),
  asyncHandler(notificationsController.snooze),
);

router.post(
  '/:id/cancel',
  authorizePermission(PermissionCodes.NOTIFICATIONS_UPDATE),
  validate(notificationIdParamsSchema, 'params'),
  asyncHandler(notificationsController.cancel),
);

export default router;
