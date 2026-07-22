import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import {
  MobilePasswordRoute,
  MobileProtectedRoute,
  MobilePublicOnlyRoute,
} from './components/MobileAuthRoutes';
import { MobilePermissionGate } from './components/MobilePermissionGate';
import { MobileAuthLayout, MobileLayout } from './layouts/MobileLayout';
import { MobileChangePasswordPage } from './pages/MobileChangePasswordPage';
import { MobileCctvOpsPage, MobileReferralsPage } from './pages/MobileCctvHubPages';
import { MobileHandoverPage } from './pages/MobileHandoverPage';
import { MobileHomePage } from './pages/MobileHomePage';
import { MobileIncidentsPage } from './pages/MobileIncidentsPage';
import { MobileLoginPage } from './pages/MobileLoginPage';
import { MobileNotificationsPage } from './pages/MobileNotificationsPage';
import {
  MobileDirectorPage,
  MobileOperationsPage,
  MobileResponseTimePage,
  MobileStatisticsPage,
} from './pages/MobileOpsHubPages';
import { MobilePatrolsPage } from './pages/MobilePatrolsPage';
import { MobilePersonnelPage } from './pages/MobilePersonnelPage';
import { MobileProfilePage } from './pages/MobileProfilePage';
import { MobileReportsPage } from './pages/MobileReportsPage';
import { MobileShiftPage } from './pages/MobileShiftPage';
import { MobileTasksPage } from './pages/MobileTasksPage';
import { MobileViolationsPage } from './pages/MobileViolationsPage';
import { MobileViolationCaseFormPage } from './pages/MobileViolationCaseFormPage';
import { MobileVisitorsPage } from './pages/MobileVisitorsPage';

function Guarded({ children }: { children: ReactNode }) {
  return <MobilePermissionGate>{children}</MobilePermissionGate>;
}

/**
 * Mobile app route tree under /mobile — independent of DashboardLayout.
 */
export function MobileRoutes() {
  return (
    <Routes>
      <Route element={<MobilePublicOnlyRoute />}>
        <Route element={<MobileAuthLayout />}>
          <Route path="login" element={<MobileLoginPage />} />
        </Route>
      </Route>

      <Route element={<MobilePasswordRoute />}>
        <Route element={<MobileAuthLayout />}>
          <Route path="change-password" element={<MobileChangePasswordPage />} />
        </Route>
      </Route>

      <Route element={<MobileProtectedRoute />}>
        <Route element={<MobileLayout />}>
          <Route
            index
            element={
              <Guarded>
                <MobileHomePage />
              </Guarded>
            }
          />
          <Route
            path="reports"
            element={
              <Guarded>
                <MobileReportsPage />
              </Guarded>
            }
          />
          <Route
            path="violations/new"
            element={
              <Guarded>
                <MobileViolationCaseFormPage />
              </Guarded>
            }
          />
          <Route
            path="violations"
            element={
              <Guarded>
                <MobileViolationsPage />
              </Guarded>
            }
          />
          <Route
            path="visitors"
            element={
              <Guarded>
                <MobileVisitorsPage />
              </Guarded>
            }
          />
          <Route
            path="patrols"
            element={
              <Guarded>
                <MobilePatrolsPage />
              </Guarded>
            }
          />
          <Route
            path="tasks"
            element={
              <Guarded>
                <MobileTasksPage />
              </Guarded>
            }
          />
          <Route
            path="notifications"
            element={
              <Guarded>
                <MobileNotificationsPage />
              </Guarded>
            }
          />
          <Route
            path="profile"
            element={
              <Guarded>
                <MobileProfilePage />
              </Guarded>
            }
          />
          <Route
            path="incidents"
            element={
              <Guarded>
                <MobileIncidentsPage />
              </Guarded>
            }
          />
          <Route
            path="shift"
            element={
              <Guarded>
                <MobileShiftPage />
              </Guarded>
            }
          />
          <Route
            path="personnel"
            element={
              <Guarded>
                <MobilePersonnelPage />
              </Guarded>
            }
          />
          <Route
            path="handover"
            element={
              <Guarded>
                <MobileHandoverPage />
              </Guarded>
            }
          />
          <Route
            path="cctv-ops"
            element={
              <Guarded>
                <MobileCctvOpsPage />
              </Guarded>
            }
          />
          <Route
            path="referrals"
            element={
              <Guarded>
                <MobileReferralsPage />
              </Guarded>
            }
          />
          <Route
            path="operations"
            element={
              <Guarded>
                <MobileOperationsPage />
              </Guarded>
            }
          />
          <Route
            path="director"
            element={
              <Guarded>
                <MobileDirectorPage />
              </Guarded>
            }
          />
          <Route
            path="statistics"
            element={
              <Guarded>
                <MobileStatisticsPage />
              </Guarded>
            }
          />
          <Route
            path="response-time"
            element={
              <Guarded>
                <MobileResponseTimePage />
              </Guarded>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/mobile" replace />} />
    </Routes>
  );
}
