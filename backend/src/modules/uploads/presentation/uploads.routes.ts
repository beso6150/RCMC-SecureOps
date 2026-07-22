import { Router } from 'express';
import {
  authenticateJwt,
  authorizeAnyPermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { uploadsController } from './uploads.controller.js';
import { uploadBase64Schema } from './uploads.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.post(
  '/',
  authorizeAnyPermission(
    PermissionCodes.VIOLATIONS_CREATE,
    PermissionCodes.VIOLATIONS_UPDATE,
    PermissionCodes.INCIDENTS_CREATE,
    PermissionCodes.INCIDENTS_UPDATE,
    PermissionCodes.INCIDENTS_COMMENT,
    PermissionCodes.COMPLAINTS_CREATE,
    PermissionCodes.COMPLAINTS_UPDATE,
    PermissionCodes.CAMERA_REQUESTS_CREATE,
    PermissionCodes.CAMERA_REQUESTS_HANDLE,
  ),
  validate(uploadBase64Schema),
  asyncHandler(uploadsController.uploadBase64),
);

export default router;
