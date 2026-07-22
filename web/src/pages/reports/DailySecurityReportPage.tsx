import { PermissionCodes } from '../../auth/rbac';
import { ReadyReportPage } from '../../components/reports/ReadyReportPage';

export function DailySecurityReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'التقرير الأمني اليومي',
        subtitle: 'توليد وعرض التقرير الأمني اليومي للعمليات',
        reportType: 'DAILY_SECURITY',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_GENERATE_DAILY,
          PermissionCodes.REPORTS_GENERATE,
          PermissionCodes.REPORTS_LIST,
        ],
        generatePermissions: [
          PermissionCodes.REPORTS_GENERATE_DAILY,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generateMode: 'daily',
        useTodayRange: true,
      }}
    />
  );
}
