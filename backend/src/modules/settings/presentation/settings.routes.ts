import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { settingsController } from './settings.controller.js';
import {
  createDepartmentSchema,
  createShiftSchema,
  entityIdParamsSchema,
  settingKeyParamsSchema,
  updateDepartmentSchema,
  updateShiftSchema,
  upsertSystemSettingSchema,
  upsertSystemSettingsSchema,
} from './settings.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/departments',
  authorizePermission(PermissionCodes.SETTINGS_READ),
  asyncHandler(settingsController.listDepartments),
);

router.post(
  '/departments',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(createDepartmentSchema),
  asyncHandler(settingsController.createDepartment),
);

router.patch(
  '/departments/:id',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(entityIdParamsSchema, 'params'),
  validate(updateDepartmentSchema),
  asyncHandler(settingsController.updateDepartment),
);

router.delete(
  '/departments/:id',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(entityIdParamsSchema, 'params'),
  asyncHandler(settingsController.deleteDepartment),
);

router.get(
  '/shifts',
  authorizePermission(PermissionCodes.SETTINGS_READ),
  asyncHandler(settingsController.listShifts),
);

router.post(
  '/shifts',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(createShiftSchema),
  asyncHandler(settingsController.createShift),
);

router.patch(
  '/shifts/:id',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(entityIdParamsSchema, 'params'),
  validate(updateShiftSchema),
  asyncHandler(settingsController.updateShift),
);

router.delete(
  '/shifts/:id',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(entityIdParamsSchema, 'params'),
  asyncHandler(settingsController.deleteShift),
);

router.get(
  '/system',
  authorizePermission(PermissionCodes.SETTINGS_READ),
  asyncHandler(settingsController.listSystemSettings),
);

router.put(
  '/system',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(upsertSystemSettingsSchema),
  asyncHandler(settingsController.upsertSystemSettings),
);

router.get(
  '/system/:key',
  authorizePermission(PermissionCodes.SETTINGS_READ),
  validate(settingKeyParamsSchema, 'params'),
  asyncHandler(settingsController.getSystemSetting),
);

router.put(
  '/system/:key',
  authorizePermission(PermissionCodes.SETTINGS_UPDATE),
  validate(settingKeyParamsSchema, 'params'),
  validate(upsertSystemSettingSchema),
  asyncHandler(settingsController.upsertSystemSetting),
);

export default router;
