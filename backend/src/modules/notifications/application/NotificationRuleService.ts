import {
  NotificationCategory,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';

export interface CreateRuleInput {
  name: string;
  eventType: string;
  category: NotificationCategory;
  minimumSeverity?: string | null;
  targetRolesJson?: unknown;
  targetGroupsJson?: unknown;
  notificationPriority?: NotificationPriority;
  requiresAcknowledgement?: boolean;
  reminderAfterMinutes?: number | null;
  escalationAfterMinutes?: number | null;
  maxReminders?: number;
  isActive?: boolean;
}

export interface UpdateRuleInput {
  name?: string;
  minimumSeverity?: string | null;
  targetRolesJson?: unknown;
  targetGroupsJson?: unknown;
  notificationPriority?: NotificationPriority;
  requiresAcknowledgement?: boolean;
  reminderAfterMinutes?: number | null;
  escalationAfterMinutes?: number | null;
  maxReminders?: number;
  isActive?: boolean;
}

/** Default Sprint 19 notification rules (seeded, not fake messages). */
export const DEFAULT_NOTIFICATION_RULES: Array<
  Omit<CreateRuleInput, 'targetRolesJson'> & { targetRoles: string[] }
> = [
  {
    name: 'SOS Critical Acknowledgement',
    eventType: 'sos.critical',
    category: NotificationCategory.SOS,
    minimumSeverity: 'CRITICAL',
    targetRoles: [
      RoleCodes.SECURITY_SUPERVISOR,
      RoleCodes.OPERATIONS_MANAGER,
      RoleCodes.SECURITY_DIRECTOR,
    ],
    notificationPriority: NotificationPriority.CRITICAL,
    requiresAcknowledgement: true,
    reminderAfterMinutes: 2,
    escalationAfterMinutes: 5,
    maxReminders: 3,
  },
  {
    name: 'Critical Incident — Supervisor Ops Director',
    eventType: 'incident.critical',
    category: NotificationCategory.INCIDENT,
    minimumSeverity: 'CRITICAL',
    targetRoles: [
      RoleCodes.SECURITY_SUPERVISOR,
      RoleCodes.OPERATIONS_MANAGER,
      RoleCodes.SECURITY_DIRECTOR,
    ],
    notificationPriority: NotificationPriority.CRITICAL,
    requiresAcknowledgement: true,
    reminderAfterMinutes: 3,
    escalationAfterMinutes: 10,
    maxReminders: 3,
  },
  {
    name: 'High Incident — Supervisor Ops',
    eventType: 'incident.high',
    category: NotificationCategory.INCIDENT,
    minimumSeverity: 'HIGH',
    targetRoles: [RoleCodes.SECURITY_SUPERVISOR, RoleCodes.OPERATIONS_MANAGER],
    notificationPriority: NotificationPriority.HIGH,
    requiresAcknowledgement: false,
    reminderAfterMinutes: 5,
    escalationAfterMinutes: 15,
    maxReminders: 2,
  },
  {
    name: 'CCTV Referral — Assignee + Supervisor',
    eventType: 'cctv.referral.assigned',
    category: NotificationCategory.CCTV_REFERRAL,
    targetRoles: [RoleCodes.SECURITY_GUARD, RoleCodes.SECURITY_SUPERVISOR],
    notificationPriority: NotificationPriority.HIGH,
    requiresAcknowledgement: false,
    reminderAfterMinutes: 5,
    escalationAfterMinutes: 10,
    maxReminders: 2,
  },
  {
    name: 'Normal Permit — Guard only',
    eventType: 'permit.shared.normal',
    category: NotificationCategory.PERMIT,
    targetRoles: [RoleCodes.SECURITY_GUARD],
    notificationPriority: NotificationPriority.NORMAL,
    requiresAcknowledgement: false,
    maxReminders: 1,
  },
  {
    name: 'Urgent Permit — Guard + Supervisor',
    eventType: 'permit.shared.urgent',
    category: NotificationCategory.PERMIT,
    targetRoles: [RoleCodes.SECURITY_GUARD, RoleCodes.SECURITY_SUPERVISOR],
    notificationPriority: NotificationPriority.URGENT,
    requiresAcknowledgement: true,
    reminderAfterMinutes: 3,
    escalationAfterMinutes: 8,
    maxReminders: 2,
  },
  {
    name: 'Overdue Patrol — Guard + Supervisor',
    eventType: 'patrol.overdue',
    category: NotificationCategory.PATROL,
    targetRoles: [RoleCodes.SECURITY_GUARD, RoleCodes.SECURITY_SUPERVISOR],
    notificationPriority: NotificationPriority.HIGH,
    requiresAcknowledgement: false,
    reminderAfterMinutes: 10,
    escalationAfterMinutes: 20,
    maxReminders: 2,
  },
  {
    name: 'Report Approval — Approver only',
    eventType: 'report.approval.requested',
    category: NotificationCategory.APPROVAL,
    targetRoles: [RoleCodes.OPERATIONS_MANAGER, RoleCodes.SECURITY_DIRECTOR],
    notificationPriority: NotificationPriority.NORMAL,
    requiresAcknowledgement: false,
    maxReminders: 1,
  },
];

class NotificationRuleService {
  private assertManage(user: AuthenticatedUser): void {
    if (
      !user.permissions.includes(PermissionCodes.NOTIFICATIONS_RULES_MANAGE) &&
      user.roleCode !== RoleCodes.SECURITY_DIRECTOR &&
      user.roleCode !== RoleCodes.OPERATIONS_MANAGER
    ) {
      throw new ForbiddenError('Missing permission to manage notification rules');
    }
  }

  async list(user: AuthenticatedUser) {
    if (
      !user.permissions.includes(PermissionCodes.NOTIFICATIONS_RULES_READ) &&
      !user.permissions.includes(PermissionCodes.NOTIFICATIONS_READ) &&
      user.roleCode !== RoleCodes.SECURITY_DIRECTOR
    ) {
      throw new ForbiddenError('Missing permission to read notification rules');
    }
    return prisma.notificationRule.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async create(user: AuthenticatedUser, input: CreateRuleInput) {
    this.assertManage(user);
    if (!input.name.trim() || !input.eventType.trim()) {
      throw new ValidationError('اسم القاعدة ونوع الحدث مطلوبان');
    }
    return prisma.notificationRule.create({
      data: {
        name: input.name.trim(),
        eventType: input.eventType.trim(),
        category: input.category,
        minimumSeverity: input.minimumSeverity ?? null,
        targetRolesJson: (input.targetRolesJson ?? null) as Prisma.InputJsonValue,
        targetGroupsJson: (input.targetGroupsJson ?? null) as Prisma.InputJsonValue,
        notificationPriority: input.notificationPriority ?? NotificationPriority.NORMAL,
        requiresAcknowledgement: input.requiresAcknowledgement ?? false,
        reminderAfterMinutes: input.reminderAfterMinutes ?? null,
        escalationAfterMinutes: input.escalationAfterMinutes ?? null,
        maxReminders: input.maxReminders ?? 2,
        isActive: input.isActive ?? true,
        createdById: user.id,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateRuleInput) {
    this.assertManage(user);
    const existing = await prisma.notificationRule.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('قاعدة الإشعار غير موجودة');

    return prisma.notificationRule.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.minimumSeverity !== undefined
          ? { minimumSeverity: input.minimumSeverity }
          : {}),
        ...(input.targetRolesJson !== undefined
          ? { targetRolesJson: input.targetRolesJson as Prisma.InputJsonValue }
          : {}),
        ...(input.targetGroupsJson !== undefined
          ? { targetGroupsJson: input.targetGroupsJson as Prisma.InputJsonValue }
          : {}),
        ...(input.notificationPriority !== undefined
          ? { notificationPriority: input.notificationPriority }
          : {}),
        ...(input.requiresAcknowledgement !== undefined
          ? { requiresAcknowledgement: input.requiresAcknowledgement }
          : {}),
        ...(input.reminderAfterMinutes !== undefined
          ? { reminderAfterMinutes: input.reminderAfterMinutes }
          : {}),
        ...(input.escalationAfterMinutes !== undefined
          ? { escalationAfterMinutes: input.escalationAfterMinutes }
          : {}),
        ...(input.maxReminders !== undefined ? { maxReminders: input.maxReminders } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async softDelete(user: AuthenticatedUser, id: string) {
    this.assertManage(user);
    const existing = await prisma.notificationRule.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('قاعدة الإشعار غير موجودة');
    await prisma.notificationRule.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async findActiveByEventType(eventType: string) {
    return prisma.notificationRule.findMany({
      where: { eventType, isActive: true, deletedAt: null },
    });
  }

  /** Seed default rules idempotently (by eventType + name). */
  async seedDefaults(createdById: string): Promise<number> {
    let created = 0;
    for (const rule of DEFAULT_NOTIFICATION_RULES) {
      const existing = await prisma.notificationRule.findFirst({
        where: {
          eventType: rule.eventType,
          name: rule.name,
          deletedAt: null,
        },
      });
      if (existing) continue;
      await prisma.notificationRule.create({
        data: {
          name: rule.name,
          eventType: rule.eventType,
          category: rule.category,
          minimumSeverity: rule.minimumSeverity ?? null,
          targetRolesJson: rule.targetRoles,
          notificationPriority: rule.notificationPriority ?? NotificationPriority.NORMAL,
          requiresAcknowledgement: rule.requiresAcknowledgement ?? false,
          reminderAfterMinutes: rule.reminderAfterMinutes ?? null,
          escalationAfterMinutes: rule.escalationAfterMinutes ?? null,
          maxReminders: rule.maxReminders ?? 2,
          isActive: true,
          createdById,
        },
      });
      created += 1;
    }
    return created;
  }
}

export const notificationRuleService = new NotificationRuleService();
