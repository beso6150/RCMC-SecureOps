import { NextFunction, Request, Response } from 'express';
import { UserStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { UnauthorizedError } from '../errors/index.js';
import { ErrorCodes } from '../errors/errorCodes.js';
import { verifyAccessToken } from '../security/jwt.js';
import { AuthContext } from '../../modules/identity/domain/types.js';

function parseAuthContext(req: Request): AuthContext {
  const header = req.header('x-incident-handling');
  const queryFlag = typeof req.query.incidentHandling === 'string'
    ? req.query.incidentHandling
    : undefined;
  const raw = header ?? queryFlag;
  return {
    incidentHandling: raw === 'true' || raw === '1',
  };
}

export async function authenticateJwt(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedError('Missing access token');
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        department: { select: { nameAr: true } },
        shift: { select: { nameAr: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found or deleted');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedError('Account is inactive', ErrorCodes.ACCOUNT_INACTIVE);
    }

    const permissions = user.role.rolePermissions
      .filter((rp) => rp.permission.deletedAt === null)
      .map((rp) => rp.permission.code);

    req.authContext = parseAuthContext(req);
    req.user = {
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
      roleCode: user.role.code,
      roleNameEn: user.role.nameEn,
      roleNameAr: user.role.nameAr,
      departmentId: user.departmentId,
      departmentNameAr: user.department?.nameAr ?? null,
      shiftId: user.shiftId,
      shiftNameAr: user.shift?.nameAr ?? null,
      permissions,
    };

    next();
  } catch (err) {
    next(err);
  }
}
