import { PermissionCodes } from '../../auth/rbac';
import { ReadyReportPage } from '../../components/reports/ReadyReportPage';

export function IncidentsReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تقرير الحوادث',
        subtitle: 'تقارير الحوادث والبلاغات الأمنية',
        reportType: 'INCIDENT_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_LIST,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generatePermissions: [PermissionCodes.REPORTS_GENERATE],
        generateMode: 'generic',
        defaultDaysBack: 7,
      }}
    />
  );
}

export function PatrolsReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تقرير الجولات الأمنية',
        subtitle: 'تقارير الجولات الميدانية والنقاط',
        reportType: 'PATROL_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_LIST,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generatePermissions: [PermissionCodes.REPORTS_GENERATE],
        generateMode: 'generic',
        defaultDaysBack: 7,
      }}
    />
  );
}

export function CctvReferralsReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تقرير إحالات كاميرات المراقبة',
        subtitle: 'تقارير الإحالات الصادرة من مشغلة المراقبة',
        reportType: 'CCTV_REFERRAL_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_LIST,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generatePermissions: [PermissionCodes.REPORTS_GENERATE],
        generateMode: 'generic',
        defaultDaysBack: 7,
      }}
    />
  );
}

export function PermitsReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تقرير التصاريح',
        subtitle: 'تقارير تصاريح الدخول الصادرة من المراقبة',
        reportType: 'PERMIT_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_LIST,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generatePermissions: [PermissionCodes.REPORTS_GENERATE],
        generateMode: 'generic',
        defaultDaysBack: 7,
      }}
    />
  );
}

export function VisitorsReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تقرير الزوار',
        subtitle: 'تقارير زيارات الضيوف والاستقبال',
        reportType: 'VISITOR_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_LIST,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generatePermissions: [PermissionCodes.REPORTS_GENERATE],
        generateMode: 'generic',
        defaultDaysBack: 7,
      }}
    />
  );
}

export function VehicleViolationsReportPage() {
  return (
    <ReadyReportPage
      config={{
        title: 'تقرير مخالفات المركبات',
        subtitle: 'تقارير مخالفات المركبات المرصودة',
        reportType: 'VEHICLE_VIOLATION_REPORT',
        viewPermissions: [
          PermissionCodes.REPORTS_VIEW,
          PermissionCodes.REPORTS_LIST,
          PermissionCodes.REPORTS_GENERATE,
        ],
        generatePermissions: [PermissionCodes.REPORTS_GENERATE],
        generateMode: 'generic',
        defaultDaysBack: 7,
      }}
    />
  );
}
