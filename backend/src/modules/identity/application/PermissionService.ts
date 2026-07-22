import { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { RequestMeta } from '../domain/types.js';
import { PolicyConditions } from '../domain/types.js';
import { auditService } from './AuditService.js';

export interface CreatePermissionInput {
  code: string;
  resource: string;
  action: string;
  description?: string | null;
}

export interface UpdatePermissionInput {
  description?: string | null;
}

export interface CreatePolicyInput {
  permissionId: string;
  name: string;
  description?: string | null;
  conditions: PolicyConditions;
  priority?: number;
  isActive?: boolean;
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string | null;
  conditions?: PolicyConditions;
  priority?: number;
  isActive?: boolean;
}

class PermissionService {
  async listPermissions() {
    return prisma.permission.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { rolePermissions: true, permissionPolicies: true } },
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async createPermission(actorId: string, input: CreatePermissionInput, meta: RequestMeta = {}) {
    if (!input.code.includes(':')) {
      throw new ValidationError('Permission code must be in resource:action format');
    }

    try {
      const permission = await prisma.permission.create({
        data: {
          code: input.code,
          resource: input.resource,
          action: input.action,
          description: input.description ?? null,
        },
      });

      await auditService.log({
        actorId,
        action: AuditAction.PERMISSION_CHANGE,
        entityType: 'Permission',
        entityId: permission.id,
        metadata: { op: 'CREATE', code: permission.code },
        meta,
      });

      return permission;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('Permission code or resource/action already exists');
      }
      throw err;
    }
  }

  async updatePermission(
    actorId: string,
    id: string,
    input: UpdatePermissionInput,
    meta: RequestMeta = {},
  ) {
    const existing = await prisma.permission.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Permission not found');

    const permission = await prisma.permission.update({
      where: { id },
      data: {
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    await auditService.log({
      actorId,
      action: AuditAction.PERMISSION_CHANGE,
      entityType: 'Permission',
      entityId: id,
      metadata: { op: 'UPDATE' },
      meta,
    });

    return permission;
  }

  async softDeletePermission(actorId: string, id: string, meta: RequestMeta = {}) {
    const existing = await prisma.permission.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Permission not found');

    await prisma.permission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      actorId,
      action: AuditAction.PERMISSION_CHANGE,
      entityType: 'Permission',
      entityId: id,
      metadata: { op: 'DELETE', code: existing.code },
      meta,
    });
  }

  async listPolicies(permissionId?: string) {
    return prisma.permissionPolicy.findMany({
      where: {
        deletedAt: null,
        ...(permissionId ? { permissionId } : {}),
      },
      include: {
        permission: { select: { id: true, code: true, resource: true, action: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createPolicy(actorId: string, input: CreatePolicyInput, meta: RequestMeta = {}) {
    this.assertValidConditions(input.conditions);

    const permission = await prisma.permission.findFirst({
      where: { id: input.permissionId, deletedAt: null },
    });
    if (!permission) throw new NotFoundError('Permission not found');

    const policy = await prisma.permissionPolicy.create({
      data: {
        permissionId: input.permissionId,
        name: input.name,
        description: input.description ?? null,
        conditions: input.conditions as unknown as Prisma.InputJsonValue,
        priority: input.priority ?? 100,
        isActive: input.isActive ?? true,
      },
    });

    await auditService.log({
      actorId,
      action: AuditAction.PERMISSION_CHANGE,
      entityType: 'PermissionPolicy',
      entityId: policy.id,
      metadata: { op: 'CREATE', permissionId: input.permissionId, name: input.name },
      meta,
    });

    return policy;
  }

  async updatePolicy(
    actorId: string,
    id: string,
    input: UpdatePolicyInput,
    meta: RequestMeta = {},
  ) {
    const existing = await prisma.permissionPolicy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Permission policy not found');

    if (input.conditions) {
      this.assertValidConditions(input.conditions);
    }

    const policy = await prisma.permissionPolicy.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.conditions !== undefined
          ? { conditions: input.conditions as unknown as Prisma.InputJsonValue }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await auditService.log({
      actorId,
      action: AuditAction.PERMISSION_CHANGE,
      entityType: 'PermissionPolicy',
      entityId: id,
      metadata: { op: 'UPDATE' },
      meta,
    });

    return policy;
  }

  async softDeletePolicy(actorId: string, id: string, meta: RequestMeta = {}) {
    const existing = await prisma.permissionPolicy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Permission policy not found');

    await prisma.permissionPolicy.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await auditService.log({
      actorId,
      action: AuditAction.PERMISSION_CHANGE,
      entityType: 'PermissionPolicy',
      entityId: id,
      metadata: { op: 'DELETE' },
      meta,
    });
  }

  private assertValidConditions(conditions: PolicyConditions): void {
    if (conditions.effect !== 'allow' && conditions.effect !== 'deny') {
      throw new ValidationError('Policy conditions.effect must be allow or deny');
    }
  }
}

export const permissionService = new PermissionService();
