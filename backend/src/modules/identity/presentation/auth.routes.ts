import { Router } from 'express';
import {
  authenticateJwt,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { authController } from './auth.controller.js';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
} from './auth.schemas.js';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));

router.post(
  '/logout',
  authenticateJwt,
  validate(logoutSchema),
  asyncHandler(authController.logout),
);

router.post(
  '/change-password',
  authenticateJwt,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

router.get(
  '/me',
  authenticateJwt,
  requirePasswordChanged,
  asyncHandler(authController.me),
);

export default router;
