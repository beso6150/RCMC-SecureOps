import { Request, Response } from 'express';
import { authService } from '../application/AuthService.js';
import { RequestMeta } from '../domain/types.js';
import {
  ChangePasswordBody,
  LoginBody,
  LogoutBody,
  RefreshBody,
} from './auth.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class AuthController {
  login = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as LoginBody;
    const result = await authService.login(body, requestMeta(req));
    res.status(200).json({ success: true, data: result });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RefreshBody;
    const result = await authService.refresh(body.refreshToken, requestMeta(req));
    res.status(200).json({ success: true, data: result });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as LogoutBody;
    await authService.logout(req.user!.id, body.refreshToken, requestMeta(req));
    res.status(200).json({ success: true, data: { loggedOut: true } });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ChangePasswordBody;
    await authService.changePassword(
      req.user!.id,
      body.currentPassword,
      body.newPassword,
      requestMeta(req),
    );
    res.status(200).json({
      success: true,
      data: { passwordChanged: true, message: 'Password updated. Please log in again.' },
    });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        nationalId: user.nationalId,
        employeeNumber: user.employeeNumber,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        jobTitle: user.jobTitle,
        status: user.status,
        isFirstLogin: user.isFirstLogin,
        lastLoginAt: user.lastLoginAt,
        roleId: user.roleId,
        roleCode: user.roleCode,
        roleNameEn: user.roleNameEn,
        roleNameAr: user.roleNameAr,
        departmentId: user.departmentId,
        departmentNameAr: user.departmentNameAr,
        shiftId: user.shiftId,
        shiftNameAr: user.shiftNameAr,
        permissions: user.permissions,
      },
    });
  };
}

export const authController = new AuthController();
