import { AuditAction, UserStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { UnauthorizedError, ValidationError } from '../../../shared/errors/index.js';
import { ErrorCodes } from '../../../shared/errors/errorCodes.js';
import {
  assertStrongPassword,
  generateTokenId,
  hashPassword,
  hashToken,
  parseTtlToMs,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../../../shared/security/index.js';
import { env } from '../../../config/env.js';
import { RequestMeta } from '../domain/types.js';
import { auditService } from './AuditService.js';

export interface LoginInput {
  nationalId: string;
  employeeNumber: string;
  /** Optional override; defaults to employeeNumber (first-login default password). */
  password?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  mustChangePassword: boolean;
  user: {
    id: string;
    fullName: string;
    nationalId: string;
    employeeNumber: string;
    email: string;
    roleCode: string;
    isFirstLogin: boolean;
    status: UserStatus;
  };
}

class AuthService {
  async login(input: LoginInput, meta: RequestMeta = {}): Promise<TokenPair> {
    const user = await prisma.user.findFirst({
      where: {
        nationalId: input.nationalId,
        employeeNumber: input.employeeNumber,
        deletedAt: null,
      },
      include: { role: true },
    });

    const passwordAttempt = input.password ?? input.employeeNumber;

    if (!user) {
      await auditService.log({
        action: AuditAction.FAILED_LOGIN,
        entityType: 'User',
        metadata: { reason: 'USER_NOT_FOUND', nationalId: input.nationalId },
        meta,
      });
      throw new UnauthorizedError('Invalid national ID or employee number');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      await auditService.log({
        actorId: user.id,
        action: AuditAction.FAILED_LOGIN,
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'ACCOUNT_INACTIVE', status: user.status },
        meta,
      });
      throw new UnauthorizedError('Account is inactive', ErrorCodes.ACCOUNT_INACTIVE);
    }

    const valid = await verifyPassword(passwordAttempt, user.passwordHash);
    if (!valid) {
      await auditService.log({
        actorId: user.id,
        action: AuditAction.FAILED_LOGIN,
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'BAD_PASSWORD' },
        meta,
      });
      throw new UnauthorizedError('Invalid national ID or employee number');
    }

    const tokens = await this.issueTokens(user.id, user.roleId, user.role.code, meta);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await auditService.log({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      metadata: { roleCode: user.role.code },
      meta,
    });

    return {
      ...tokens,
      mustChangePassword: user.isFirstLogin,
      user: {
        id: user.id,
        fullName: user.fullName,
        nationalId: user.nationalId,
        employeeNumber: user.employeeNumber,
        email: user.email,
        roleCode: user.role.code,
        isFirstLogin: user.isFirstLogin,
        status: user.status,
      },
    };
  }

  async refresh(refreshToken: string, meta: RequestMeta = {}): Promise<TokenPair> {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findFirst({
      where: {
        id: payload.jti,
        tokenHash,
        revokedAt: null,
      },
      include: {
        user: { include: { role: true } },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token is invalid or expired', ErrorCodes.INVALID_TOKEN);
    }

    if (stored.user.deletedAt || stored.user.status === UserStatus.SUSPENDED || stored.user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedError('Account is inactive', ErrorCodes.ACCOUNT_INACTIVE);
    }

    // Rotate: revoke old token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.roleId,
      stored.user.role.code,
      meta,
    );

    return {
      ...tokens,
      mustChangePassword: stored.user.isFirstLogin,
      user: {
        id: stored.user.id,
        fullName: stored.user.fullName,
        nationalId: stored.user.nationalId,
        employeeNumber: stored.user.employeeNumber,
        email: stored.user.email,
        roleCode: stored.user.role.code,
        isFirstLogin: stored.user.isFirstLogin,
        status: stored.user.status,
      },
    };
  }

  async logout(userId: string, refreshToken: string | undefined, meta: RequestMeta = {}): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await auditService.log({
      actorId: userId,
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: userId,
      meta,
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: RequestMeta = {},
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    assertStrongPassword(newPassword);

    if (currentPassword === newPassword) {
      throw new ValidationError('New password must differ from current password');
    }

    // Prevent reusing default employee number as permanent password
    if (newPassword === user.employeeNumber) {
      throw new ValidationError('New password cannot be the employee number');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isFirstLogin: false,
        status: user.status === UserStatus.PENDING_FIRST_LOGIN ? UserStatus.ACTIVE : user.status,
      },
    });

    // Revoke all refresh tokens after password change
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await auditService.log({
      actorId: userId,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: 'User',
      entityId: userId,
      metadata: { firstLoginCompleted: user.isFirstLogin },
      meta,
    });
  }

  private async issueTokens(
    userId: string,
    roleId: string,
    roleCode: string,
    meta: RequestMeta,
  ): Promise<Omit<TokenPair, 'mustChangePassword' | 'user'>> {
    const jti = generateTokenId();
    const accessToken = signAccessToken({ sub: userId, roleId, roleCode });
    const refreshToken = signRefreshToken({ sub: userId, jti });
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + parseTtlToMs(env.JWT_REFRESH_TTL));

    await prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash,
        expiresAt,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_TTL,
    };
  }
}

export const authService = new AuthService();
