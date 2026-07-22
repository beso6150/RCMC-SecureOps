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
import { tasksController } from './tasks.controller.js';
import {
  assignTaskSchema,
  cancelTaskSchema,
  completeTaskSchema,
  createTaskSchema,
  escalateTaskSchema,
  evidenceUploadSchema,
  listTasksQuerySchema,
  reassignTaskSchema,
  rejectTaskSchema,
  taskIdParamsSchema,
  updateTaskSchema,
  waitTaskSchema,
} from './tasks.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/my',
  authorizePermission(PermissionCodes.TASKS_READ),
  validate(listTasksQuerySchema, 'query'),
  asyncHandler(tasksController.listMine),
);

router.get(
  '/overdue',
  authorizePermission(PermissionCodes.TASKS_READ),
  validate(listTasksQuerySchema, 'query'),
  asyncHandler(tasksController.listOverdue),
);

router.get(
  '/statistics',
  authorizePermission(PermissionCodes.TASKS_READ),
  asyncHandler(tasksController.statistics),
);

router.get(
  '/',
  authorizePermission(PermissionCodes.TASKS_READ),
  validate(listTasksQuerySchema, 'query'),
  asyncHandler(tasksController.list),
);

router.post(
  '/',
  authorizePermission(PermissionCodes.TASKS_CREATE),
  validate(createTaskSchema),
  asyncHandler(tasksController.create),
);

router.get(
  '/:id',
  authorizePermission(PermissionCodes.TASKS_READ),
  validate(taskIdParamsSchema, 'params'),
  asyncHandler(tasksController.getById),
);

router.get(
  '/:id/timeline',
  authorizeAnyPermission(PermissionCodes.TASKS_TIMELINE, PermissionCodes.TASKS_READ),
  validate(taskIdParamsSchema, 'params'),
  asyncHandler(tasksController.timeline),
);

router.patch(
  '/:id',
  authorizePermission(PermissionCodes.TASKS_UPDATE),
  validate(taskIdParamsSchema, 'params'),
  validate(updateTaskSchema),
  asyncHandler(tasksController.update),
);

router.post(
  '/:id/assign',
  authorizePermission(PermissionCodes.TASKS_ASSIGN),
  validate(taskIdParamsSchema, 'params'),
  validate(assignTaskSchema),
  asyncHandler(tasksController.assign),
);

router.post(
  '/:id/reassign',
  authorizePermission(PermissionCodes.TASKS_ASSIGN),
  validate(taskIdParamsSchema, 'params'),
  validate(reassignTaskSchema),
  asyncHandler(tasksController.reassign),
);

router.post(
  '/:id/accept',
  authorizePermission(PermissionCodes.TASKS_ACCEPT),
  validate(taskIdParamsSchema, 'params'),
  asyncHandler(tasksController.accept),
);

router.post(
  '/:id/start',
  authorizePermission(PermissionCodes.TASKS_START),
  validate(taskIdParamsSchema, 'params'),
  asyncHandler(tasksController.start),
);

router.post(
  '/:id/wait',
  authorizePermission(PermissionCodes.TASKS_WAIT),
  validate(taskIdParamsSchema, 'params'),
  validate(waitTaskSchema),
  asyncHandler(tasksController.wait),
);

router.post(
  '/:id/complete',
  authorizeAnyPermission(PermissionCodes.TASKS_COMPLETE, PermissionCodes.TASKS_UPDATE),
  validate(taskIdParamsSchema, 'params'),
  validate(completeTaskSchema),
  asyncHandler(tasksController.complete),
);

router.post(
  '/:id/reject',
  authorizeAnyPermission(PermissionCodes.TASKS_REJECT, PermissionCodes.TASKS_UPDATE),
  validate(taskIdParamsSchema, 'params'),
  validate(rejectTaskSchema),
  asyncHandler(tasksController.reject),
);

router.post(
  '/:id/cancel',
  authorizeAnyPermission(PermissionCodes.TASKS_CANCEL, PermissionCodes.TASKS_UPDATE),
  validate(taskIdParamsSchema, 'params'),
  validate(cancelTaskSchema),
  asyncHandler(tasksController.cancel),
);

router.post(
  '/:id/escalate',
  authorizePermission(PermissionCodes.TASKS_ESCALATE),
  validate(taskIdParamsSchema, 'params'),
  validate(escalateTaskSchema),
  asyncHandler(tasksController.escalate),
);

router.post(
  '/:id/evidence',
  authorizePermission(PermissionCodes.TASKS_EVIDENCE),
  validate(taskIdParamsSchema, 'params'),
  validate(evidenceUploadSchema),
  asyncHandler(tasksController.addEvidence),
);

router.delete(
  '/:id',
  authorizePermission(PermissionCodes.TASKS_UPDATE),
  validate(taskIdParamsSchema, 'params'),
  asyncHandler(tasksController.remove),
);

export default router;
