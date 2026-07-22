import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../domain/permissionCodes.js';
import { usersController } from './users.controller.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
  userIdParamsSchema,
} from './users.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/',
  authorizePermission(PermissionCodes.USERS_READ),
  validate(listUsersQuerySchema, 'query'),
  asyncHandler(usersController.list),
);

router.post(
  '/',
  authorizePermission(PermissionCodes.USERS_CREATE),
  validate(createUserSchema),
  asyncHandler(usersController.create),
);

router.get(
  '/:id',
  authorizePermission(PermissionCodes.USERS_READ),
  validate(userIdParamsSchema, 'params'),
  asyncHandler(usersController.getById),
);

router.patch(
  '/:id',
  authorizePermission(PermissionCodes.USERS_UPDATE),
  validate(userIdParamsSchema, 'params'),
  validate(updateUserSchema),
  asyncHandler(usersController.update),
);

router.post(
  '/:id/reset-password',
  authorizePermission(PermissionCodes.USERS_UPDATE),
  validate(userIdParamsSchema, 'params'),
  validate(resetPasswordSchema),
  asyncHandler(usersController.resetPassword),
);

router.delete(
  '/:id',
  authorizePermission(PermissionCodes.USERS_DELETE),
  validate(userIdParamsSchema, 'params'),
  asyncHandler(usersController.remove),
);

export default router;
