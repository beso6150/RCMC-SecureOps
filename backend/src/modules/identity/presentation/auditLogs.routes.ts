import { Router } from 'express';
import {
  authenticateJwt,
  authorizeAnyPermission,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../domain/permissionCodes.js';
import { auditLogsController } from './auditLogs.controller.js';
import {
  auditLogIdParamsSchema,
  auditLogsExportSchema,
  auditLogsListQuerySchema,
} from '../../reports/presentation/reports.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/',
  authorizeAnyPermission(
    PermissionCodes.AUDIT_LOGS_VIEW,
    PermissionCodes.AUDIT_READ,
  ),
  validate(auditLogsListQuerySchema, 'query'),
  asyncHandler(auditLogsController.list),
);

router.get(
  '/statistics',
  authorizeAnyPermission(
    PermissionCodes.AUDIT_LOGS_STATISTICS,
    PermissionCodes.AUDIT_LOGS_VIEW,
    PermissionCodes.AUDIT_READ,
  ),
  validate(auditLogsListQuerySchema.pick({ from: true, to: true, module: true }), 'query'),
  asyncHandler(auditLogsController.statistics),
);

router.post(
  '/export',
  authorizePermission(PermissionCodes.AUDIT_LOGS_EXPORT),
  validate(auditLogsExportSchema),
  asyncHandler(auditLogsController.export),
);

router.get(
  '/:id',
  authorizeAnyPermission(
    PermissionCodes.AUDIT_LOGS_VIEW,
    PermissionCodes.AUDIT_READ,
  ),
  validate(auditLogIdParamsSchema, 'params'),
  asyncHandler(auditLogsController.getById),
);

export default router;
