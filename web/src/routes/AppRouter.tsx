import { Navigate, Route, Routes } from 'react-router-dom';

import {
  ForcePasswordRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from '../auth/ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { ForceChangePasswordPage } from '../pages/ForceChangePasswordPage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AboutPage } from '../pages/AboutPage';
import { CctvLayout } from '../pages/cctv/CctvLayout';
import { CctvHomePage } from '../pages/cctv/CctvHomePage';
import { CctvOperationsPage } from '../pages/cctv/CctvOperationsPage';
import { CctvIncidentsQueuePage } from '../pages/cctv/CctvIncidentsQueuePage';
import { CctvViolationsQueuePage } from '../pages/cctv/CctvViolationsQueuePage';
import { CctvCaseProofsPage } from '../pages/cctv/CctvCaseProofsPage';
import { CctvInquiriesPage } from '../pages/cctv/CctvInquiriesPage';
import { DirectorLayout } from '../pages/director/DirectorLayout';
import { DirectorDashboardPage } from '../pages/director/DirectorDashboardPage';
import { DirectorUsersPage } from '../pages/director/DirectorUsersPage';
import { DirectorPermissionsPage } from '../pages/director/DirectorPermissionsPage';
import { DirectorComplaintsPage } from '../pages/director/DirectorComplaintsPage';
import { DirectorStatisticsPage } from '../pages/director/DirectorStatisticsPage';
import { DirectorReportsPage } from '../pages/director/DirectorReportsPage';
import { DirectorSettingsPage } from '../pages/director/DirectorSettingsPage';
import { IncidentsListPage } from '../pages/incidents/IncidentsListPage';
import { IncidentNewPage } from '../pages/incidents/IncidentNewPage';
import { IncidentDetailPage } from '../pages/incidents/IncidentDetailPage';
import { MyIncidentsPage } from '../pages/incidents/MyIncidentsPage';
import { CriticalIncidentsPage } from '../pages/incidents/CriticalIncidentsPage';
import { IncidentFollowUpPage } from '../pages/incidents/IncidentFollowUpPage';
import { IncidentStatisticsPage } from '../pages/incidents/IncidentStatisticsPage';
import { OperationsRoomPage } from '../pages/operationsRoom/OperationsRoomPage';
import { EmergencyProceduresPage } from '../pages/operationsRoom/EmergencyProceduresPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { PermissionsPage } from '../pages/PermissionsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StatisticsPage } from '../pages/StatisticsPage';
import { UsersPage } from '../pages/UsersPage';
import { ViolationsPage } from '../pages/ViolationsPage';
import { VisitorsPage } from '../pages/VisitorsPage';
import { ShiftsManagementPage } from '../pages/shifts/ShiftsManagementPage';
import { ShiftHandoverPage } from '../pages/shifts/ShiftHandoverPage';
import { ShiftStatisticsPage } from '../pages/shifts/ShiftStatisticsPage';
import { FieldOperationsOverviewPage } from '../pages/fieldOperations/FieldOperationsOverviewPage';
import { FieldMapPage } from '../pages/fieldOperations/FieldMapPage';
import { FieldPatrolsPage } from '../pages/fieldOperations/FieldPatrolsPage';
import { FieldPatrolRoutesPage } from '../pages/fieldOperations/FieldPatrolRoutesPage';
import { FieldCheckpointsPage } from '../pages/fieldOperations/FieldCheckpointsPage';
import { FieldAlertsPage } from '../pages/fieldOperations/FieldAlertsPage';
import { FieldZonesPage } from '../pages/fieldOperations/FieldZonesPage';
import { FieldStatisticsPage } from '../pages/fieldOperations/FieldStatisticsPage';
import { CctvOpsOverviewPage } from '../pages/cctvOperations/CctvOpsOverviewPage';
import { CctvOpsPermitsPage } from '../pages/cctvOperations/CctvOpsPermitsPage';
import { CctvOpsPermitNewPage } from '../pages/cctvOperations/CctvOpsPermitNewPage';
import { CctvOpsPermitDetailPage } from '../pages/cctvOperations/CctvOpsPermitDetailPage';
import { CctvOpsReferralsPage } from '../pages/cctvOperations/CctvOpsReferralsPage';
import { CctvOpsReferralNewPage } from '../pages/cctvOperations/CctvOpsReferralNewPage';
import { CctvOpsReferralDetailPage } from '../pages/cctvOperations/CctvOpsReferralDetailPage';
import { CctvOpsFollowUpPage } from '../pages/cctvOperations/CctvOpsFollowUpPage';
import { CctvOpsStatisticsPage } from '../pages/cctvOperations/CctvOpsStatisticsPage';
import { ReportsCenterPage } from '../pages/reports/ReportsCenterPage';
import { DailySecurityReportPage } from '../pages/reports/DailySecurityReportPage';
import { ShiftReportsPage } from '../pages/reports/ShiftReportsPage';
import { HandoverReportPage } from '../pages/reports/HandoverReportPage';
import {
  CctvReferralsReportPage,
  IncidentsReportPage,
  PatrolsReportPage,
  PermitsReportPage,
  VehicleViolationsReportPage,
  VisitorsReportPage,
} from '../pages/reports/ReadyReportsPages';
import { PerformanceKpisPage } from '../pages/reports/PerformanceKpisPage';
import { CustomReportBuilderPage } from '../pages/reports/CustomReportBuilderPage';
import { SavedReportsListPage } from '../pages/reports/SavedReportsListPage';
import { SavedReportDetailPage } from '../pages/reports/SavedReportDetailPage';
import { ReportSchedulesPage } from '../pages/reports/ReportSchedulesPage';
import { AuditLogsListPage } from '../pages/auditLogs/AuditLogsListPage';
import { AuditLogDetailPage } from '../pages/auditLogs/AuditLogDetailPage';
import { NotificationPreferencesPage } from '../pages/notifications/NotificationPreferencesPage';
import { NotificationRulesPage } from '../pages/notifications/NotificationRulesPage';
import { CommunicationsPage } from '../pages/communications/CommunicationsPage';
import { TasksCenterPage } from '../pages/tasks/TasksCenterPage';
import { MyTasksPage } from '../pages/tasks/MyTasksPage';
import { OverdueTasksPage } from '../pages/tasks/OverdueTasksPage';
import { TaskDetailPage } from '../pages/tasks/TaskDetailPage';
import { TaskStatisticsPage } from '../pages/tasks/TaskStatisticsPage';
import { MobileRoutes } from '../mobile/mobileRoutes';

interface AppRouterProps {
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
}

export function AppRouter({ colorMode, onToggleColorMode }: AppRouterProps) {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ForcePasswordRoute />}>
        <Route path="/change-password" element={<ForceChangePasswordPage />} />
      </Route>

      {/* Mobile shell — independent of DashboardLayout / desktop sidebar */}
      <Route path="/mobile/*" element={<MobileRoutes />} />

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <DashboardLayout colorMode={colorMode} onToggleColorMode={onToggleColorMode} />
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="violations" element={<ViolationsPage />} />
          <Route path="visitors" element={<VisitorsPage />} />

          {/* Longest incident paths first */}
          <Route path="incidents/my-incidents" element={<MyIncidentsPage />} />
          <Route path="incidents/critical" element={<CriticalIncidentsPage />} />
          <Route path="incidents/follow-up" element={<IncidentFollowUpPage />} />
          <Route path="incidents/statistics" element={<IncidentStatisticsPage />} />
          <Route path="incidents/new" element={<IncidentNewPage />} />
          <Route path="incidents/:id" element={<IncidentDetailPage />} />
          <Route path="incidents" element={<IncidentsListPage />} />

          <Route path="operations-room" element={<OperationsRoomPage />} />
          <Route path="emergency-procedures" element={<EmergencyProceduresPage />} />

          <Route path="cctv" element={<CctvLayout />}>
            <Route index element={<CctvHomePage />} />
            <Route path="operations" element={<CctvOperationsPage />} />
            <Route path="incidents" element={<CctvIncidentsQueuePage />} />
            <Route path="violations" element={<CctvViolationsQueuePage />} />
            <Route path="case-proofs" element={<CctvCaseProofsPage />} />
            <Route path="inquiries" element={<CctvInquiriesPage />} />
          </Route>

          <Route path="director" element={<DirectorLayout />}>
            <Route index element={<DirectorDashboardPage />} />
            <Route path="users" element={<DirectorUsersPage />} />
            <Route path="permissions" element={<DirectorPermissionsPage />} />
            <Route path="complaints" element={<DirectorComplaintsPage />} />
            <Route path="statistics" element={<DirectorStatisticsPage />} />
            <Route path="reports" element={<DirectorReportsPage />} />
            <Route path="settings" element={<DirectorSettingsPage />} />
          </Route>

          <Route path="complaints" element={<Navigate to="/director/complaints" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="notifications/preferences" element={<NotificationPreferencesPage />} />
          <Route path="notifications/rules" element={<NotificationRulesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="communications/:id" element={<CommunicationsPage />} />
          <Route path="communications" element={<CommunicationsPage />} />
          <Route path="tasks/statistics" element={<TaskStatisticsPage />} />
          <Route path="tasks/overdue" element={<OverdueTasksPage />} />
          <Route path="tasks/my" element={<MyTasksPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route path="tasks" element={<TasksCenterPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Longest field-ops paths first (same pattern as shifts/handover). */}
          <Route path="field-operations/patrols/routes" element={<FieldPatrolRoutesPage />} />
          <Route path="field-operations/statistics" element={<FieldStatisticsPage />} />
          <Route path="field-operations/checkpoints" element={<FieldCheckpointsPage />} />
          <Route path="field-operations/alerts" element={<FieldAlertsPage />} />
          <Route path="field-operations/zones" element={<FieldZonesPage />} />
          <Route path="field-operations/patrols" element={<FieldPatrolsPage />} />
          <Route path="field-operations/map" element={<FieldMapPage />} />
          <Route path="field-operations" element={<FieldOperationsOverviewPage />} />

          {/* Longest cctv-operations paths first — must not collide with /cctv. */}
          <Route path="cctv-operations/permits/new" element={<CctvOpsPermitNewPage />} />
          <Route path="cctv-operations/permits/:id" element={<CctvOpsPermitDetailPage />} />
          <Route path="cctv-operations/permits" element={<CctvOpsPermitsPage />} />
          <Route path="cctv-operations/referrals/new" element={<CctvOpsReferralNewPage />} />
          <Route path="cctv-operations/referrals/:id" element={<CctvOpsReferralDetailPage />} />
          <Route path="cctv-operations/referrals" element={<CctvOpsReferralsPage />} />
          <Route path="cctv-operations/follow-up" element={<CctvOpsFollowUpPage />} />
          <Route path="cctv-operations/statistics" element={<CctvOpsStatisticsPage />} />
          <Route path="cctv-operations" element={<CctvOpsOverviewPage />} />

          <Route path="shifts/handover" element={<ShiftHandoverPage />} />
          <Route path="shifts/statistics" element={<ShiftStatisticsPage />} />
          <Route path="shifts" element={<ShiftsManagementPage />} />

          {/* Longest reports paths first — keep /director/reports intact above. */}
          <Route path="reports/saved/:id" element={<SavedReportDetailPage />} />
          <Route path="reports/saved" element={<SavedReportsListPage />} />
          <Route path="reports/schedules" element={<ReportSchedulesPage />} />
          <Route path="reports/performance" element={<PerformanceKpisPage />} />
          <Route path="reports/custom" element={<CustomReportBuilderPage />} />
          <Route path="reports/daily" element={<DailySecurityReportPage />} />
          <Route path="reports/shifts" element={<ShiftReportsPage />} />
          <Route path="reports/handover" element={<HandoverReportPage />} />
          <Route path="reports/incidents" element={<IncidentsReportPage />} />
          <Route path="reports/patrols" element={<PatrolsReportPage />} />
          <Route path="reports/cctv-referrals" element={<CctvReferralsReportPage />} />
          <Route path="reports/permits" element={<PermitsReportPage />} />
          <Route path="reports/visitors" element={<VisitorsReportPage />} />
          <Route path="reports/vehicle-violations" element={<VehicleViolationsReportPage />} />
          <Route path="reports" element={<ReportsCenterPage />} />

          <Route path="audit-logs/:id" element={<AuditLogDetailPage />} />
          <Route path="audit-logs" element={<AuditLogsListPage />} />

          <Route path="about" element={<AboutPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
