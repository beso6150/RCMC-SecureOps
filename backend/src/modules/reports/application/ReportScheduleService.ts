import {
  AuditAction,
  Prisma,
  ReportScheduleFrequency,
  SavedReportType,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { reportGenerationService } from './ReportGenerationService.js';

export interface ScheduleInput {
  name: string;
  reportType: SavedReportType;
  frequency: ReportScheduleFrequency;
  timeOfDay: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  shiftType?: string | null;
  groupId?: string | null;
  filtersJson?: Prisma.InputJsonValue | Record<string, unknown>;
  recipientsJson?: Prisma.InputJsonValue | unknown;
  generatePdf?: boolean;
  generateCsv?: boolean;
  isActive?: boolean;
}

function computeNextRunAt(
  frequency: ReportScheduleFrequency,
  timeOfDay: string,
  from = new Date(),
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): Date {
  const [hh, mm] = timeOfDay.split(':').map((x) => Number(x));
  const hour = Number.isFinite(hh) ? hh : 6;
  const minute = Number.isFinite(mm) ? mm : 0;
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);

  if (frequency === ReportScheduleFrequency.DAILY) {
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === ReportScheduleFrequency.WEEKLY) {
    const target = dayOfWeek ?? 0;
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() !== target || next <= from);
    next.setHours(hour, minute, 0, 0);
    return next;
  }
  if (frequency === ReportScheduleFrequency.MONTHLY) {
    const day = Math.min(Math.max(dayOfMonth ?? 1, 1), 28);
    next.setDate(day);
    if (next <= from) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(day);
    }
    next.setHours(hour, minute, 0, 0);
    return next;
  }
  // END_OF_SHIFT — next evening/morning boundary ~12h
  if (next <= from) next.setHours(next.getHours() + 12);
  return next;
}

function defaultRangeForType(reportType: SavedReportType): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  if (reportType === SavedReportType.DAILY_SECURITY) {
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 1);
  }
  return { from, to };
}

class ReportScheduleService {
  async list() {
    return prisma.reportSchedule.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        group: { select: { id: true, code: true, nameAr: true } },
      },
    });
  }

  async getById(id: string) {
    const row = await prisma.reportSchedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        group: { select: { id: true, code: true, nameAr: true } },
      },
    });
    if (!row) throw new NotFoundError('جدول التقرير غير موجود');
    return row;
  }

  async create(actor: AuthenticatedUser, input: ScheduleInput, meta: RequestMeta = {}) {
    this.assertTime(input.timeOfDay);
    const nextRunAt = computeNextRunAt(
      input.frequency,
      input.timeOfDay,
      new Date(),
      input.dayOfWeek,
      input.dayOfMonth,
    );

    const row = await prisma.reportSchedule.create({
      data: {
        name: input.name.trim(),
        reportType: input.reportType,
        frequency: input.frequency,
        timeOfDay: input.timeOfDay,
        dayOfWeek: input.dayOfWeek ?? null,
        dayOfMonth: input.dayOfMonth ?? null,
        shiftType: input.shiftType ?? null,
        groupId: input.groupId ?? null,
        filtersJson: (input.filtersJson as Prisma.InputJsonValue | undefined) ?? undefined,
        recipientsJson: (input.recipientsJson as Prisma.InputJsonValue | undefined) ?? undefined,
        generatePdf: input.generatePdf ?? true,
        generateCsv: input.generateCsv ?? false,
        isActive: input.isActive ?? true,
        nextRunAt,
        createdById: actor.id,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'ReportSchedule',
      entityId: row.id,
      module: 'reports',
      description: `إنشاء جدول تقرير: ${row.name}`,
      meta,
    });
    return row;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: Partial<ScheduleInput>,
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);
    if (input.timeOfDay) this.assertTime(input.timeOfDay);

    const frequency = input.frequency ?? existing.frequency;
    const timeOfDay = input.timeOfDay ?? existing.timeOfDay;
    const nextRunAt = computeNextRunAt(
      frequency,
      timeOfDay,
      new Date(),
      input.dayOfWeek !== undefined ? input.dayOfWeek : existing.dayOfWeek,
      input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth,
    );

    const row = await prisma.reportSchedule.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.reportType !== undefined ? { reportType: input.reportType } : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.timeOfDay !== undefined ? { timeOfDay: input.timeOfDay } : {}),
        ...(input.dayOfWeek !== undefined ? { dayOfWeek: input.dayOfWeek } : {}),
        ...(input.dayOfMonth !== undefined ? { dayOfMonth: input.dayOfMonth } : {}),
        ...(input.shiftType !== undefined ? { shiftType: input.shiftType } : {}),
        ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
        ...(input.filtersJson !== undefined
          ? { filtersJson: input.filtersJson as Prisma.InputJsonValue }
          : {}),
        ...(input.recipientsJson !== undefined
          ? { recipientsJson: input.recipientsJson as Prisma.InputJsonValue }
          : {}),
        ...(input.generatePdf !== undefined ? { generatePdf: input.generatePdf } : {}),
        ...(input.generateCsv !== undefined ? { generateCsv: input.generateCsv } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        nextRunAt,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'ReportSchedule',
      entityId: id,
      module: 'reports',
      description: 'تحديث جدول تقرير',
      meta,
    });
    return row;
  }

  async setActive(actor: AuthenticatedUser, id: string, isActive: boolean, meta: RequestMeta = {}) {
    await this.getById(id);
    const row = await prisma.reportSchedule.update({
      where: { id },
      data: { isActive },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'ReportSchedule',
      entityId: id,
      module: 'reports',
      description: isActive ? 'تفعيل جدول تقرير' : 'تعطيل جدول تقرير',
      meta,
    });
    return row;
  }

  async softDelete(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    await this.getById(id);
    await prisma.reportSchedule.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'ReportSchedule',
      entityId: id,
      module: 'reports',
      description: 'حذف جدول تقرير',
      meta,
    });
  }

  /** Generates report in-system only — no external email. */
  async runNow(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const schedule = await this.getById(id);
    const { from, to } = defaultRangeForType(schedule.reportType);
    const filters =
      schedule.filtersJson && typeof schedule.filtersJson === 'object'
        ? (schedule.filtersJson as Record<string, unknown>)
        : {};

    const report = await reportGenerationService.generate(
      actor,
      {
        reportType: schedule.reportType,
        title: schedule.name,
        dateFrom: from,
        dateTo: to,
        shiftType: schedule.shiftType,
        groupId: schedule.groupId,
        zoneId: typeof filters.zoneId === 'string' ? filters.zoneId : null,
        filtersJson: schedule.filtersJson ?? undefined,
      },
      meta,
    );

    const nextRunAt = computeNextRunAt(
      schedule.frequency,
      schedule.timeOfDay,
      new Date(),
      schedule.dayOfWeek,
      schedule.dayOfMonth,
    );

    await prisma.reportSchedule.update({
      where: { id },
      data: { lastRunAt: new Date(), nextRunAt },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.SYSTEM,
      entityType: 'ReportSchedule',
      entityId: id,
      module: 'reports',
      description: `تشغيل فوري لجدول التقرير — تم توليد ${report.reportNumber}`,
      meta,
    });

    return { scheduleId: id, report };
  }

  private assertTime(timeOfDay: string) {
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new ValidationError('صيغة الوقت يجب أن تكون HH:MM');
    }
  }
}

export const reportScheduleService = new ReportScheduleService();
