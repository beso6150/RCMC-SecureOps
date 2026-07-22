import { PermissionCodes } from '../../auth/rbac';
import { ReadyReportPage } from '../../components/reports/ReadyReportPage';

export function HandoverReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تسليم واستلام الوردية',
        subtitle: 'تقرير تسليم واستلام الوردية بين المشرفين',
        reportType: 'HANDOVER_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_GENERATE_HANDOVER,
          PermissionCodes.REPORTS_GENERATE_SHIFT,
          PermissionCodes.REPORTS_LIST,
        ],
        generatePermissions: [
          PermissionCodes.REPORTS_GENERATE_HANDOVER,
          PermissionCodes.REPORTS_GENERATE_SHIFT,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generateMode: 'shift',
        useTodayRange: true,
      }}
    />
  );
}
