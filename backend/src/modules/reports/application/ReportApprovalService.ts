import {
  AuditAction,
  ReportAccessAction,
  ReportApprovalAction,
  SavedReportStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
export async function isSelfApproveAllowed(): Promise<boolean> {
  const setting = await prisma.systemSetting.findFirst({
    where: { key: 'reports.self_approve_allowed', deletedAt: null },
  });
  if (!setting) return false;
  const v = setting.value;
  if (typeof v === 'boolean') return v;
  if (v && typeof v === 'object' && 'value' in (v as object)) {
    return Boolean((v as { value: unknown }).value);
  }
  return Boolean(v);
}

export function assertSelfApproveAllowed(
  actorId: string,
  generatedById: string,
  selfApproveAllowed: boolean,
): void {
  if (!selfApproveAllowed && actorId === generatedById) {
    throw new ForbiddenError('لا يمكن اعتماد تقرير أنشأته بنفسك');
  }
}

class ReportApprovalService {
  async submit(actor: AuthenticatedUser, reportId: string, notes: string | null, meta: RequestMeta = {}) {
    const report = await this.requireReport(reportId);
    if (
      report.status !== SavedReportStatus.GENERATED &&
      report.status !== SavedReportStatus.REJECTED &&
      report.status !== SavedReportStatus.DRAFT
    ) {
      throw new ValidationError('لا يمكن إرسال هذا التقرير للمراجعة في حالته الحالية');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.savedReport.update({
        where: { id: reportId },
        data: { status: SavedReportStatus.UNDER_REVIEW },
      });
      await tx.reportApproval.create({
        data: {
          reportId,
          approverId: actor.id,
          action: ReportApprovalAction.SUBMITTED,
          notes,
        },
      });
      await tx.reportAccessLog.create({
        data: {
          reportId,
          userId: actor.id,
          action: ReportAccessAction.SUBMIT_FOR_APPROVAL,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });
      return row;
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SavedReport',
      entityId: reportId,
      module: 'reports',
      description: 'إرسال تقرير للمراجعة',
      meta,
    });

    broadcast('report:submitted', { reportId, reportNumber: updated.reportNumber });
    broadcast('reports:dashboard-refresh', { reason: 'report:submitted' });
    return updated;
  }

  async approve(actor: AuthenticatedUser, reportId: string, notes: string | null, meta: RequestMeta = {}) {
    const report = await this.requireReport(reportId);
    if (report.status !== SavedReportStatus.UNDER_REVIEW) {
      throw new ValidationError('يمكن اعتماد التقارير قيد المراجعة فقط');
    }

    const allowed = await isSelfApproveAllowed();
    assertSelfApproveAllowed(actor.id, report.generatedById, allowed);

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.savedReport.update({
        where: { id: reportId },
        data: {
          status: SavedReportStatus.APPROVED,
          approvedById: actor.id,
          approvedAt: new Date(),
          approvalNotes: notes,
        },
      });
      await tx.reportApproval.create({
        data: {
          reportId,
          approverId: actor.id,
          action: ReportApprovalAction.APPROVED,
          notes,
        },
      });
      await tx.reportAccessLog.create({
        data: {
          reportId,
          userId: actor.id,
          action: ReportAccessAction.APPROVE,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });
      return row;
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.APPROVE,
      entityType: 'SavedReport',
      entityId: reportId,
      module: 'reports',
      description: 'اعتماد تقرير',
      meta,
    });

    broadcast('report:approved', { reportId, reportNumber: updated.reportNumber });
    broadcast('reports:dashboard-refresh', { reason: 'report:approved' });
    return updated;
  }

  async reject(actor: AuthenticatedUser, reportId: string, notes: string | null, meta: RequestMeta = {}) {
    const report = await this.requireReport(reportId);
    if (report.status !== SavedReportStatus.UNDER_REVIEW) {
      throw new ValidationError('يمكن رفض التقارير قيد المراجعة فقط');
    }
    if (!notes?.trim()) {
      throw new ValidationError('سبب الرفض مطلوب');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.savedReport.update({
        where: { id: reportId },
        data: {
          status: SavedReportStatus.REJECTED,
          approvalNotes: notes,
        },
      });
      await tx.reportApproval.create({
        data: {
          reportId,
          approverId: actor.id,
          action: ReportApprovalAction.REJECTED,
          notes,
        },
      });
      await tx.reportAccessLog.create({
        data: {
          reportId,
          userId: actor.id,
          action: ReportAccessAction.REJECT,
          reason: notes,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });
      return row;
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.REJECT,
      entityType: 'SavedReport',
      entityId: reportId,
      module: 'reports',
      description: 'رفض تقرير',
      meta,
    });

    broadcast('report:rejected', { reportId, reportNumber: updated.reportNumber });
    broadcast('reports:dashboard-refresh', { reason: 'report:rejected' });
    return updated;
  }

  async returnForEdit(
    actor: AuthenticatedUser,
    reportId: string,
    notes: string | null,
    meta: RequestMeta = {},
  ) {
    const report = await this.requireReport(reportId);
    if (report.status !== SavedReportStatus.UNDER_REVIEW) {
      throw new ValidationError('يمكن إرجاع التقارير قيد المراجعة فقط');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.savedReport.update({
        where: { id: reportId },
        data: {
          status: SavedReportStatus.DRAFT,
          approvalNotes: notes,
        },
      });
      await tx.reportApproval.create({
        data: {
          reportId,
          approverId: actor.id,
          action: ReportApprovalAction.RETURNED_FOR_EDIT,
          notes,
        },
      });
      return row;
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SavedReport',
      entityId: reportId,
      module: 'reports',
      description: 'إرجاع تقرير للتعديل',
      meta,
    });

    broadcast('reports:dashboard-refresh', { reason: 'report:returned' });
    return updated;
  }

  async archive(actor: AuthenticatedUser, reportId: string, notes: string | null, meta: RequestMeta = {}) {
    const report = await this.requireReport(reportId);
    if (report.status !== SavedReportStatus.APPROVED) {
      throw new ValidationError('يمكن أرشفة التقارير المعتمدة فقط');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.savedReport.update({
        where: { id: reportId },
        data: { status: SavedReportStatus.ARCHIVED },
      });
      await tx.reportApproval.create({
        data: {
          reportId,
          approverId: actor.id,
          action: ReportApprovalAction.ARCHIVED,
          notes,
        },
      });
      await tx.reportAccessLog.create({
        data: {
          reportId,
          userId: actor.id,
          action: ReportAccessAction.ARCHIVE,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });
      return row;
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SavedReport',
      entityId: reportId,
      module: 'reports',
      description: 'أرشفة تقرير',
      meta,
    });

    broadcast('report:archived', { reportId, reportNumber: updated.reportNumber });
    broadcast('reports:dashboard-refresh', { reason: 'report:archived' });
    return updated;
  }

  async createVersion(actor: AuthenticatedUser, reportId: string, meta: RequestMeta = {}) {
    const parent = await this.requireReport(reportId);
    const maxVersion = await prisma.savedReport.aggregate({
      where: {
        OR: [{ id: parent.id }, { parentReportId: parent.id }, { reportNumber: parent.reportNumber }],
      },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version ?? parent.version) + 1;

    const sections = await prisma.reportSection.findMany({
      where: { reportId: parent.id },
      orderBy: { orderIndex: 'asc' },
    });

    const created = await prisma.savedReport.create({
      data: {
        reportNumber: parent.reportNumber,
        title: parent.title,
        description: parent.description,
        reportType: parent.reportType,
        status: SavedReportStatus.DRAFT,
        dateFrom: parent.dateFrom,
        dateTo: parent.dateTo,
        shiftType: parent.shiftType,
        groupId: parent.groupId,
        zoneId: parent.zoneId,
        userId: parent.userId,
        filtersJson: parent.filtersJson ?? undefined,
        summaryJson: parent.summaryJson ?? undefined,
        notes: parent.notes,
        recommendations: parent.recommendations,
        generatedById: actor.id,
        classification: parent.classification,
        version: nextVersion,
        parentReportId: parent.id,
        sections: {
          create: sections.map((s) => ({
            sectionKey: s.sectionKey,
            title: s.title,
            sectionType: s.sectionType,
            orderIndex: s.orderIndex,
            contentJson: s.contentJson ?? undefined,
            textContent: s.textContent,
            isVisible: s.isVisible,
          })),
        },
      },
      include: { sections: true },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SavedReport',
      entityId: created.id,
      module: 'reports',
      description: `إنشاء نسخة جديدة ${nextVersion} من ${parent.reportNumber}`,
      meta,
    });

    broadcast('report:created', {
      reportId: created.id,
      reportNumber: created.reportNumber,
      version: created.version,
    });
    return created;
  }

  private async requireReport(id: string) {
    const report = await prisma.savedReport.findFirst({ where: { id, deletedAt: null } });
    if (!report) throw new NotFoundError('التقرير غير موجود');
    return report;
  }
}

export const reportApprovalService = new ReportApprovalService();
