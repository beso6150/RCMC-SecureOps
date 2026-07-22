import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../domain/permissionCodes.js';
import { permissionsController } from './permissions.controller.js';
import {
  createPermissionSchema,
  createPolicySchema,
  listPoliciesQuerySchema,
  permissionIdParamsSchema,
  updatePermissionSchema,
  updatePolicySchema,
} from './permissions.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/',
  authorizePermission(PermissionCodes.PERMISSIONS_READ),
  asyncHandler(permissionsController.list),
);

router.post(
  '/',
  authorizePermission(PermissionCodes.PERMISSIONS_CREATE),
  validate(createPermissionSchema),
  asyncHandler(permissionsController.create),
);

// Policies before /:id to avoid path conflicts
router.get(
  '/policies',
  authorizePermission(PermissionCodes.PERMISSIONS_READ),
  validate(listPoliciesQuerySchema, 'query'),
  asyncHandler(permissionsController.listPolicies),
);

router.post(
  '/policies',
  authorizePermission(PermissionCodes.PERMISSIONS_CREATE),
  validate(createPolicySchema),
  asyncHandler(permissionsController.createPolicy),
);

router.patch(
  '/policies/:id',
  authorizePermission(PermissionCodes.PERMISSIONS_UPDATE),
  validate(permissionIdParamsSchema, 'params'),
  validate(updatePolicySchema),
  asyncHandler(permissionsController.updatePolicy),
);

router.delete(
  '/policies/:id',
  authorizePermission(PermissionCodes.PERMISSIONS_DELETE),
  validate(permissionIdParamsSchema, 'params'),
  asyncHandler(permissionsController.removePolicy),
);

router.patch(
  '/:id',
  authorizePermission(PermissionCodes.PERMISSIONS_UPDATE),
  validate(permissionIdParamsSchema, 'params'),
  validate(updatePermissionSchema),
  asyncHandler(permissionsController.update),
);

router.delete(
  '/:id',
  authorizePermission(PermissionCodes.PERMISSIONS_DELETE),
  validate(permissionIdParamsSchema, 'params'),
  asyncHandler(permissionsController.remove),
);

export default router;
