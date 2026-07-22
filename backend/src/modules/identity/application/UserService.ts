import { AuditAction, Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { hashPassword } from '../../../shared/security/password.js';
import { AuthenticatedUser, AuthContext, RequestMeta } from '../domain/types.js';
import { auditService } from './AuditService.js';
import { serializeUser, serializeUsers, SerializableUser } from '../policies/phonePolicy.js';

export interface CreateUserInput {
  nationalId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  roleId: string;
  departmentId?: string | null;
  shiftId?: string | null;
  groupId?: string | null;
  status?: UserStatus;
}

export interface UpdateUserInput {
  nationalId?: string;
  employeeNumber?: string;
  fullName?: string;
  email?: string;
  phone?: string | null;
  jobTitle?: string | null;
  roleId?: string;
  departmentId?: string | null;
  shiftId?: string | null;
  groupId?: string | null;
  status?: UserStatus;
}

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
  departmentId?: string;
  status?: UserStatus;
}

const userInclude = {
  role: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  department: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  shift: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  group: { select: { id: true, code: true, nameEn: true, nameAr: true } },
} as const;

function toSerializable(user: {
  id: string;
  nationalId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: UserStatus;
  isFirstLogin: boolean;
  lastLoginAt: Date | null;
  roleId: string;
  departmentId: string | null;
  shiftId: string | null;
  groupId: string | null;
  operationalStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  role: SerializableUser['role'];
  department: SerializableUser['department'];
  shift: SerializableUser['shift'];
  group?: SerializableUser['group'];
}): SerializableUser {
  return {
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
    departmentId: user.departmentId,
    shiftId: user.shiftId,
    groupId: user.groupId,
    operationalStatus: user.operationalStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role,
    department: user.department,
    shift: user.shift,
    group: user.group ?? null,
  };
}

class UserService {
  async list(
    viewer: AuthenticatedUser,
    query: ListUsersQuery,
    context: AuthContext = {},
  ): Promise<{ data: SerializableUser[]; meta: { page: number; pageSize: number; total: number } }> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { nationalId: { contains: query.search } },
              { employeeNumber: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const data = await serializeUsers(viewer, rows.map(toSerializable), context);
    return { data, meta: { page, pageSize, total } };
  }

  async getById(
    viewer: AuthenticatedUser,
    id: string,
    context: AuthContext = {},
  ): Promise<SerializableUser> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return serializeUser(viewer, toSerializable(user), context);
  }

  async create(
    actorId: string,
    input: CreateUserInput,
    meta: RequestMeta = {},
  ): Promise<SerializableUser> {
    await this.assertRoleExists(input.roleId);
    if (input.departmentId) await this.assertDepartmentExists(input.departmentId);
    if (input.shiftId) await this.assertShiftExists(input.shiftId);
    if (input.groupId) await this.assertGroupExists(input.groupId);

    await this.assertUniqueFields(input.nationalId, input.employeeNumber, input.email);

    // Default password = employee number (forced change on first login)
    const passwordHash = await hashPassword(input.employeeNumber);

    try {
      const user = await prisma.user.create({
        data: {
          nationalId: input.nationalId,
          employeeNumber: input.employeeNumber,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          jobTitle: input.jobTitle ?? null,
          roleId: input.roleId,
          departmentId: input.departmentId ?? null,
          shiftId: input.shiftId ?? null,
          groupId: input.groupId ?? null,
          passwordHash,
          status: input.status ?? UserStatus.PENDING_FIRST_LOGIN,
          isFirstLogin: true,
        },
        include: userInclude,
      });

      await auditService.log({
        actorId,
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          nationalId: user.nationalId,
          employeeNumber: user.employeeNumber,
          roleId: user.roleId,
        },
        meta,
      });

      return toSerializable(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('User with unique field already exists', err.meta);
      }
      throw err;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateUserInput,
    meta: RequestMeta = {},
    context: AuthContext = {},
  ): Promise<SerializableUser> {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (input.roleId) await this.assertRoleExists(input.roleId);
    if (input.departmentId) await this.assertDepartmentExists(input.departmentId);
    if (input.shiftId) await this.assertShiftExists(input.shiftId);
    if (input.groupId) await this.assertGroupExists(input.groupId);

    if (input.nationalId || input.employeeNumber || input.email) {
      await this.assertUniqueFields(
        input.nationalId ?? existing.nationalId,
        input.employeeNumber ?? existing.employeeNumber,
        input.email ?? existing.email,
        id,
      );
    }

    const changedFields = Object.keys(input).filter(
      (k) => input[k as keyof UpdateUserInput] !== undefined,
    );

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
        ...(input.employeeNumber !== undefined ? { employeeNumber: input.employeeNumber } : {}),
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
        ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        ...(input.shiftId !== undefined ? { shiftId: input.shiftId } : {}),
        ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: userInclude,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: user.id,
      metadata: { changedFields },
      meta,
    });

    return serializeUser(actor, toSerializable(user), context);
  }

  async resetPassword(
    actor: AuthenticatedUser,
    id: string,
    temporaryPassword?: string,
    meta: RequestMeta = {},
  ): Promise<{ id: string; employeeNumber: string; mustChangePassword: true }> {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const tempPassword = temporaryPassword?.trim() || existing.employeeNumber;
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        isFirstLogin: true,
        ...(existing.status === UserStatus.INACTIVE
          ? { status: UserStatus.PENDING_FIRST_LOGIN }
          : {}),
      },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.SYSTEM,
      entityType: 'User',
      entityId: id,
      metadata: { action: 'password_reset', targetEmployeeNumber: existing.employeeNumber },
      meta,
    });

    return {
      id: existing.id,
      employeeNumber: existing.employeeNumber,
      mustChangePassword: true,
    };
  }

  async softDelete(actorId: string, id: string, meta: RequestMeta = {}): Promise<void> {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (existing.id === actorId) {
      throw new ValidationError('Cannot delete your own account');
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await auditService.log({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'User',
      entityId: id,
      meta,
    });
  }

  private async assertRoleExists(roleId: string): Promise<void> {
    const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null } });
    if (!role) throw new NotFoundError('Role not found');
  }

  private async assertDepartmentExists(departmentId: string): Promise<void> {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, deletedAt: null },
    });
    if (!dept) throw new NotFoundError('Department not found');
  }

  private async assertShiftExists(shiftId: string): Promise<void> {
    const shift = await prisma.shift.findFirst({ where: { id: shiftId, deletedAt: null } });
    if (!shift) throw new NotFoundError('Shift not found');
  }

  private async assertGroupExists(groupId: string): Promise<void> {
    const group = await prisma.shiftGroup.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundError('Shift group not found');
  }

  private async assertUniqueFields(
    nationalId: string,
    employeeNumber: string,
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
        OR: [{ nationalId }, { employeeNumber }, { email }],
      },
    });

    if (conflict) {
      const fields: string[] = [];
      if (conflict.nationalId === nationalId) fields.push('nationalId');
      if (conflict.employeeNumber === employeeNumber) fields.push('employeeNumber');
      if (conflict.email === email) fields.push('email');
      throw new ConflictError(`User already exists with: ${fields.join(', ')}`);
    }
  }
}

export const userService = new UserService();
