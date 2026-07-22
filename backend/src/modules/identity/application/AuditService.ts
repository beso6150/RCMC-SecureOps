import { AuditAction, AuditSeverity, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { RequestMeta } from '../domain/types.js';
import { csvExportService } from '../../reports/application/CsvExportService.js';
import {
  maskSensitiveData,
  toMaskedJson,
} from '../../reports/application/sensitiveMasking.js';

export interface AuditEntry {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  meta?: RequestMeta;
  module?: string | null;
  description?: string | null;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  severity?: AuditSeverity;
  success?: boolean;
  failureReason?: string | null;
  requestId?: string | null;
}

export interface AuditListFilters {
  page?: number;
  pageSize?: number;
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  module?: string;
  severity?: AuditSeverity;
  success?: boolean;
  requestId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

function asInputJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return maskSensitiveData(value) as Prisma.InputJsonValue;
}

function mapLog(row: {
  id: string;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  module: string | null;
  description: string | null;
  oldValues: Prisma.JsonValue;
  newValues: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  severity: AuditSeverity;
  success: boolean;
  failureReason: string | null;
  createdAt: Date;
  actor?: { id: string; fullName: string; employeeNumber: string } | null;
}) {
  return {
    ...row,
    oldValues: toMaskedJson(row.oldValues) ?? null,
    newValues: toMaskedJson(row.newValues) ?? null,
    metadata: toMaskedJson(row.metadata) ?? null,
  };
}

class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    const severity = entry.severity ?? AuditSeverity.INFO;
    const success = entry.success ?? true;
    const requestId = entry.requestId ?? entry.meta?.requestId ?? null;

    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        module: entry.module ?? null,
        description: entry.description ?? null,
        oldValues: asInputJson(entry.oldValues) ?? undefined,
        newValues: asInputJson(entry.newValues) ?? undefined,
        ipAddress: entry.meta?.ipAddress ?? null,
        userAgent: entry.meta?.userAgent ?? null,
        metadata: entry.metadata !== undefined ? asInputJson(entry.metadata) : undefined,
        requestId,
        severity,
        success,
        failureReason: entry.failureReason ?? null,
      },
    });

    if (severity === AuditSeverity.CRITICAL) {
      broadcast('audit-log:critical-event', {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        module: entry.module ?? null,
        description: entry.description ?? null,
        success,
      });
    }
  }

  async list(filters: AuditListFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const where = this.buildWhere(filters);

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: {
            select: { id: true, fullName: true, employeeNumber: true },
          },
        },
      }),
    ]);

    return {
      data: rows.map(mapLog),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: string) {
    const row = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: { id: true, fullName: true, employeeNumber: true },
        },
      },
    });
    if (!row) throw new NotFoundError('سجل التدقيق غير موجود');
    return mapLog(row);
  }

  async statistics(filters: Pick<AuditListFilters, 'from' | 'to' | 'module'> = {}) {
    const where = this.buildWhere(filters);
    const [total, failed, byAction, bySeverity, byModule] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, success: false } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
        take: 20,
      }),
      prisma.auditLog.groupBy({
        by: ['severity'],
        where,
        _count: { _all: true },
      }),
      prisma.auditLog.groupBy({
        by: ['module'],
        where: { ...where, module: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { module: 'desc' } },
        take: 20,
      }),
    ]);

    return {
      total,
      failed,
      successRate: total > 0 ? Math.round(((total - failed) / total) * 10000) / 100 : 100,
      byAction: byAction.map((r) => ({ action: r.action, count: r._count._all })),
      bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: r._count._all })),
      byModule: byModule.map((r) => ({ module: r.module, count: r._count._all })),
    };
  }

  async exportCsv(filters: AuditListFilters = {}): Promise<string> {
    const where = this.buildWhere(filters);
    const maxRows = 10_000;
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: maxRows,
      include: {
        actor: { select: { fullName: true, employeeNumber: true } },
      },
    });

    return csvExportService.buildFromObjects(
      [
        { key: 'createdAt', headerAr: 'التاريخ' },
        { key: 'action', headerAr: 'الإجراء' },
        { key: 'module', headerAr: 'الوحدة' },
        { key: 'entityType', headerAr: 'نوع الكيان' },
        { key: 'entityId', headerAr: 'معرف الكيان' },
        { key: 'actorName', headerAr: 'المستخدم' },
        { key: 'severity', headerAr: 'الخطورة' },
        { key: 'success', headerAr: 'نجاح' },
        { key: 'description', headerAr: 'الوصف' },
        { key: 'requestId', headerAr: 'معرف الطلب' },
      ],
      rows.map((r) => ({
        createdAt: r.createdAt,
        action: r.action,
        module: r.module ?? '',
        entityType: r.entityType,
        entityId: r.entityId ?? '',
        actorName: r.actor?.fullName ?? '',
        severity: r.severity,
        success: r.success ? 'نعم' : 'لا',
        description: r.description ?? '',
        requestId: r.requestId ?? '',
      })),
    );
  }

  /** Explicitly blocked — audit logs are append-only. */
  async update(): Promise<never> {
    throw new ValidationError('لا يمكن تعديل سجلات التدقيق');
  }

  async delete(): Promise<never> {
    throw new ValidationError('لا يمكن حذف سجلات التدقيق');
  }

  private buildWhere(filters: AuditListFilters): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.module) where.module = filters.module;
    if (filters.severity) where.severity = filters.severity;
    if (filters.success !== undefined) where.success = filters.success;
    if (filters.requestId) where.requestId = filters.requestId;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { module: { contains: q, mode: 'insensitive' } },
        { failureReason: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}

export const auditService = new AuditService();
