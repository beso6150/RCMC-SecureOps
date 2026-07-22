import { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { RequestMeta } from '../domain/types.js';
import { auditService } from './AuditService.js';

class RoleService {
  async list() {
    return prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { users: true, rolePermissions: true } },
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  async getById(id: string) {
    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const { rolePermissions, ...rest } = role;
    return {
      ...rest,
      permissions: rolePermissions
        .filter((rp) => rp.permission.deletedAt === null)
        .map((rp) => rp.permission),
    };
  }

  async setPermissions(
    actorId: string,
    roleId: string,
    permissionIds: string[],
    meta: RequestMeta = {},
  ) {
    const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null } });
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (permissionIds.length > 0) {
      const found = await prisma.permission.findMany({
        where: { id: { in: permissionIds }, deletedAt: null },
      });
      if (found.length !== permissionIds.length) {
        throw new ValidationError('One or more permission IDs are invalid');
      }
    }

    const previous = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        });
      }
    });

    await auditService.log({
      actorId,
      action: AuditAction.PERMISSION_CHANGE,
      entityType: 'Role',
      entityId: roleId,
      metadata: {
        previousPermissionIds: previous.map((p) => p.permissionId),
        newPermissionIds: permissionIds,
      } as Prisma.InputJsonValue,
      meta,
    });

    return this.getById(roleId);
  }
}

export const roleService = new RoleService();
