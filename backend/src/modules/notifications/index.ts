import { Router } from 'express';
import notificationsRoutes from './presentation/notifications.routes.js';

export const notificationsRouter = Router();
notificationsRouter.use('/notifications', notificationsRoutes);

export { notificationService } from './application/NotificationService.js';
export { notificationRepository } from './infrastructure/NotificationRepository.js';
export { notificationPreferenceService } from './application/NotificationPreferenceService.js';
export { notificationRuleService } from './application/NotificationRuleService.js';
export { notificationDeliveryService } from './application/NotificationDeliveryService.js';
export { notificationDeduplicationService } from './application/NotificationDeduplicationService.js';
export { notificationEscalationService } from './application/NotificationEscalationService.js';
