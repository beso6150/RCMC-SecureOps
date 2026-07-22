import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../domain/permissionCodes.js';
import { rolesController } from './roles.controller.js';
import { roleIdParamsSchema, setRolePermissionsSchema } from './roles.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/',
  authorizePermission(PermissionCodes.ROLES_READ),
  asyncHandler(rolesController.list),
);

router.get(
  '/:id',
  authorizePermission(PermissionCodes.ROLES_READ),
  validate(roleIdParamsSchema, 'params'),
  asyncHandler(rolesController.getById),
);

router.put(
  '/:id/permissions',
  authorizePermission(PermissionCodes.ROLES_UPDATE),
  validate(roleIdParamsSchema, 'params'),
  validate(setRolePermissionsSchema),
  asyncHandler(rolesController.setPermissions),
);

export default router;
