import {
  AuditAction,
  Prisma,
  ReportAccessAction,
  ReportSectionType,
  SavedReportStatus,
  SavedReportType,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { dailySecurityReportService } from './DailySecurityReportService.js';
import { nextReportNumber } from './reportNumbering.js';
import { shiftReportService } from './ShiftReportService.js';
import { kpiService } from './KpiService.js';

export interface GenerateReportInput {
  reportType: SavedReportType;
  title?: string;
  description?: string | null;
  dateFrom: Date;
  dateTo: Date;
  shiftType?: string | null;
  groupId?: string | null;
  zoneId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  filtersJson?: Prisma.InputJsonValue | Record<string, unknown>;
  notes?: string | null;
  recommendations?: string | null;
  classification?: 'INTERNAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL';
}

type BuiltSection = {
  sectionKey: string;
  title: string;
  sectionType: ReportSectionType | string;
  orderIndex: number;
  contentJson?: unknown;
  textContent?: string | null;
};

class ReportGenerationService {
  async generate(
    actor: AuthenticatedUser,
    input: GenerateReportInput,
    meta: RequestMeta = {},
  ) {
    if (input.dateTo < input.dateFrom) {
      throw new ValidationError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }

    const built = await this.buildContent(input);
    const reportNumber = await nextReportNumber();
    const title = input.title?.trim() || built.title;

    const report = await prisma.savedReport.create({
      data: {
        reportNumber,
        title,
        description: input.description ?? null,
        reportType: built.reportType ?? input.reportType,
        status: SavedReportStatus.GENERATED,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        shiftType: input.shiftType ?? null,
        groupId: input.groupId ?? null,
        zoneId: input.zoneId ?? null,
        userId: input.userId ?? null,
        filtersJson: (input.filtersJson as Prisma.InputJsonValue | undefined) ?? undefined,
        summaryJson: built.summary as Prisma.InputJsonValue,
        notes: input.notes ?? null,
        recommendations:
          input.recommendations ??
          (built.sections.find((s) => s.sectionType === 'RECOMMENDATIONS')
            ?.textContent ?? null),
        generatedById: actor.id,
        classification: input.classification ?? 'INTERNAL',
        sections: {
          create: built.sections.map((s, idx) => ({
            sectionKey: s.sectionKey,
            title: s.title,
            sectionType: s.sectionType as ReportSectionType,
            orderIndex: s.orderIndex ?? idx,
            contentJson: (s.contentJson ?? undefined) as Prisma.InputJsonValue | undefined,
            textContent: s.textContent ?? null,
          })),
        },
      },
      include: { sections: { orderBy: { orderIndex: 'asc' } } },
    });

    await prisma.reportAccessLog.create({
      data: {
        reportId: report.id,
        userId: actor.id,
        action: ReportAccessAction.GENERATE,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SavedReport',
      entityId: report.id,
      module: 'reports',
      description: `توليد تقرير ${report.reportNumber}`,
      newValues: { reportNumber: report.reportNumber, reportType: report.reportType },
      meta,
    });

    broadcast('report:created', { reportId: report.id, reportNumber: report.reportNumber });
    broadcast('report:generated', { reportId: report.id, reportNumber: report.reportNumber });
    broadcast('reports:dashboard-refresh', { reason: 'report:generated' });

    return report;
  }

  async getById(id: string) {
    const report = await prisma.savedReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        sections: { orderBy: { orderIndex: 'asc' } },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: { approver: { select: { id: true, fullName: true } } },
        },
        generatedBy: { select: { id: true, fullName: true, employeeNumber: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!report) throw new NotFoundError('التقرير غير موجود');
    return report;
  }

  async list(filters: {
    page?: number;
    pageSize?: number;
    reportType?: SavedReportType;
    status?: SavedReportStatus;
    generatedById?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const where: Prisma.SavedReportWhereInput = {
      deletedAt: null,
      ...(filters.reportType ? { reportType: filters.reportType } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.generatedById ? { generatedById: filters.generatedById } : {}),
      ...(filters.from || filters.to
        ? {
            generatedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.savedReport.count({ where }),
      prisma.savedReport.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          generatedBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async softDeleteDraft(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const report = await prisma.savedReport.findFirst({ where: { id, deletedAt: null } });
    if (!report) throw new NotFoundError('التقرير غير موجود');
    if (report.status !== SavedReportStatus.DRAFT) {
      throw new ValidationError('يمكن حذف المسودات فقط. للتقارير المعتمدة استخدم الأرشفة');
    }
    await prisma.savedReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'SavedReport',
      entityId: id,
      module: 'reports',
      description: 'حذف مسودة تقرير',
      meta,
    });
  }

  private async buildContent(input: GenerateReportInput): Promise<{
    title: string;
    reportType: SavedReportType;
    summary: Record<string, unknown>;
    sections: BuiltSection[];
  }> {
    const range = {
      from: input.dateFrom,
      to: input.dateTo,
      groupId: input.groupId ?? undefined,
      zoneId: input.zoneId ?? undefined,
      userId: input.userId ?? undefined,
    };

    if (
      input.reportType === SavedReportType.DAILY_SECURITY ||
      input.reportType === SavedReportType.CUSTOM
    ) {
      if (input.reportType === SavedReportType.DAILY_SECURITY) {
        const built = await dailySecurityReportService.build(range);
        return {
          title: built.title,
          reportType: SavedReportType.DAILY_SECURITY,
          summary: built.summary,
          sections: built.sections,
        };
      }
    }

    if (
      input.reportType === SavedReportType.SHIFT_REPORT ||
      input.reportType === SavedReportType.HANDOVER_REPORT
    ) {
      const built = await shiftReportService.build({
        ...range,
        shiftType: input.shiftType ?? undefined,
        sessionId: input.sessionId ?? undefined,
      });
      return {
        title: built.title,
        reportType:
          input.reportType === SavedReportType.HANDOVER_REPORT
            ? SavedReportType.HANDOVER_REPORT
            : SavedReportType[built.reportType],
        summary: built.summary,
        sections: built.sections,
      };
    }

    const kpis = await kpiService.getAll(range);
    const titleMap: Partial<Record<SavedReportType, string>> = {
      INCIDENT_REPORT: 'تقرير الحوادث',
      PATROL_REPORT: 'تقرير الدوريات',
      CCTV_REFERRAL_REPORT: 'تقرير إحالات كاميرات المراقبة',
      PERMIT_REPORT: 'تقرير التصاريح',
      VISITOR_REPORT: 'تقرير الزوار',
      VEHICLE_VIOLATION_REPORT: 'تقرير مخالفات المركبات',
      RESPONSE_TIME_REPORT: 'تقرير أوقات الاستجابة',
      PERSONNEL_PERFORMANCE: 'أداء الأفراد',
      GROUP_PERFORMANCE: 'أداء المجموعات',
      SHIFT_PERFORMANCE: 'أداء الورديات',
      AUDIT_REPORT: 'تقرير التدقيق',
      LOCATION_ANALYSIS: 'تحليل المواقع',
      EMERGENCY_REPORT: 'تقرير الطوارئ',
      CHECKPOINT_REPORT: 'تقرير نقاط التفتيش',
    };

    return {
      title: titleMap[input.reportType] ?? 'تقرير أمني',
      reportType: input.reportType,
      summary: { reportType: input.reportType },
      sections: [
        {
          sectionKey: 'kpi',
          title: 'المؤشرات',
          sectionType: ReportSectionType.KPI,
          orderIndex: 0,
          contentJson: kpis,
        },
      ],
    };
  }
}

export const reportGenerationService = new ReportGenerationService();
