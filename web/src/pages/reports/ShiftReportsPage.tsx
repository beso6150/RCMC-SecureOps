import { PermissionCodes } from '../../auth/rbac';
import { ReadyReportPage } from '../../components/reports/ReadyReportPage';

export function ShiftReportsPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تقارير الورديات',
        subtitle: 'توليد تقارير ملخص الوردية والأداء التشغيلي',
        reportType: 'SHIFT_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_GENERATE_SHIFT,
          PermissionCodes.REPORTS_GENERATE,
          PermissionCodes.REPORTS_LIST,
        ],
        generatePermissions: [
          PermissionCodes.REPORTS_GENERATE_SHIFT,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generateMode: 'shift',
        defaultDaysBack: 0,
        useTodayRange: true,
      }}
    />
  );
}
