import { kpiService, KpiRange } from './KpiService.js';

export class DailySecurityReportService {
  async build(range: KpiRange) {
    const kpis = await kpiService.getAll(range);
    return {
      title: 'التقرير الأمني اليومي',
      reportType: 'DAILY_SECURITY' as const,
      summary: {
        incidents: kpis.incidents.total,
        openIncidents: kpis.incidents.open,
        patrolsCompleted: kpis.patrols.completed,
        referrals: kpis.cctvReferrals.total,
        permits: kpis.permits.total,
        violations: kpis.violations.total,
        visitors: kpis.visitors.total,
      },
      sections: [
        {
          sectionKey: 'summary',
          title: 'الملخص',
          sectionType: 'SUMMARY' as const,
          orderIndex: 0,
          contentJson: {
            incidents: kpis.incidents.total,
            openIncidents: kpis.incidents.open,
            patrols: kpis.patrols,
            referrals: kpis.cctvReferrals.total,
            permits: kpis.permits.total,
            violations: kpis.violations.total,
            visitors: kpis.visitors.total,
          },
        },
        {
          sectionKey: 'incidents_kpi',
          title: 'مؤشرات الحوادث',
          sectionType: 'KPI' as const,
          orderIndex: 1,
          contentJson: kpis.incidents,
        },
        {
          sectionKey: 'response_times',
          title: 'أوقات الاستجابة',
          sectionType: 'KPI' as const,
          orderIndex: 2,
          contentJson: kpis.responseTimes,
        },
        {
          sectionKey: 'patrols',
          title: 'الدوريات',
          sectionType: 'TABLE' as const,
          orderIndex: 3,
          contentJson: kpis.patrols,
        },
        {
          sectionKey: 'cctv_referrals',
          title: 'إحالات كاميرات المراقبة',
          sectionType: 'TABLE' as const,
          orderIndex: 4,
          contentJson: kpis.cctvReferrals,
        },
        {
          sectionKey: 'recommendations',
          title: 'التوصيات',
          sectionType: 'RECOMMENDATIONS' as const,
          orderIndex: 5,
          textContent:
            kpis.incidents.open > 0
              ? 'يُوصى بمتابعة الحوادث المفتوحة قبل نهاية الوردية.'
              : 'لا توجد حوادث مفتوحة تتطلب متابعة فورية.',
        },
      ],
    };
  }
}

export const dailySecurityReportService = new DailySecurityReportService();
