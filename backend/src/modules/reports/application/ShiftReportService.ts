import { prisma } from '../../../shared/database/prisma.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { kpiService, KpiRange } from './KpiService.js';

export class ShiftReportService {
  async build(
    range: KpiRange & { shiftType?: string; sessionId?: string },
  ) {
    const kpis = await kpiService.getAll(range);

    let handover: Record<string, unknown> | null = null;
    if (range.sessionId) {
      const session = await prisma.shiftSession.findUnique({
        where: { id: range.sessionId },
        include: {
          handover: {
            include: {
              outgoingSupervisor: { select: { id: true, fullName: true } },
              incomingSupervisor: { select: { id: true, fullName: true } },
            },
          },
          group: { select: { id: true, code: true, nameAr: true } },
        },
      });
      if (!session) throw new NotFoundError('جلسة الوردية غير موجودة');
      if (session.handover) {
        handover = {
          openIncidentsCount: session.handover.openIncidentsCount,
          closedIncidentsCount: session.handover.closedIncidentsCount,
          patrolsCount: session.handover.patrolsCount,
          violationsCount: session.handover.violationsCount,
          notes: session.handover.notes,
          equipmentNotes: session.handover.equipmentNotes,
          handoverStatus: session.handover.handoverStatus,
          takeoverStatus: session.handover.takeoverStatus,
          outgoingSupervisor: session.handover.outgoingSupervisor,
          incomingSupervisor: session.handover.incomingSupervisor,
          group: session.group,
          shiftKind: session.kind,
        };
      }
    } else if (range.groupId) {
      const latest = await prisma.shiftHandover.findFirst({
        where: {
          session: { groupId: range.groupId },
          createdAt: { gte: range.from, lte: range.to },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          outgoingSupervisor: { select: { id: true, fullName: true } },
          incomingSupervisor: { select: { id: true, fullName: true } },
          session: {
            select: {
              kind: true,
              group: { select: { id: true, code: true, nameAr: true } },
            },
          },
        },
      });
      if (latest) {
        handover = {
          openIncidentsCount: latest.openIncidentsCount,
          closedIncidentsCount: latest.closedIncidentsCount,
          patrolsCount: latest.patrolsCount,
          violationsCount: latest.violationsCount,
          notes: latest.notes,
          equipmentNotes: latest.equipmentNotes,
          handoverStatus: latest.handoverStatus,
          takeoverStatus: latest.takeoverStatus,
          outgoingSupervisor: latest.outgoingSupervisor,
          incomingSupervisor: latest.incomingSupervisor,
          group: latest.session.group,
          shiftKind: latest.session.kind,
        };
      }
    }

    const shiftLabel = range.shiftType === 'EVENING' ? 'وردية مسائية' : 'وردية صباحية';

    return {
      title: `تقرير الوردية — ${shiftLabel}`,
      reportType: (handover ? 'HANDOVER_REPORT' : 'SHIFT_REPORT') as
        | 'HANDOVER_REPORT'
        | 'SHIFT_REPORT',
      summary: {
        shiftType: range.shiftType ?? null,
        incidents: kpis.incidents.total,
        patrols: kpis.patrols.total,
        hasHandover: Boolean(handover),
      },
      sections: [
        {
          sectionKey: 'shift_summary',
          title: 'ملخص الوردية',
          sectionType: 'SUMMARY' as const,
          orderIndex: 0,
          contentJson: {
            shiftType: range.shiftType ?? null,
            kpis: {
              incidents: kpis.incidents,
              patrols: kpis.patrols,
              violations: kpis.violations,
              referrals: kpis.cctvReferrals,
            },
          },
        },
        {
          sectionKey: 'handover',
          title: 'تسليم واستلام الوردية',
          sectionType: 'TEXT' as const,
          orderIndex: 1,
          contentJson: handover,
          textContent: handover
            ? `ملاحظات التسليم: ${(handover.notes as string) ?? 'لا توجد'}`
            : 'لا يوجد سجل تسليم لهذه الوردية ضمن الفترة المحددة.',
        },
        {
          sectionKey: 'response_times',
          title: 'أوقات الاستجابة خلال الوردية',
          sectionType: 'KPI' as const,
          orderIndex: 2,
          contentJson: kpis.responseTimes,
        },
      ],
    };
  }
}

export const shiftReportService = new ShiftReportService();
