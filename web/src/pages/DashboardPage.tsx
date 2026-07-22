import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard';
import { DashboardCharts } from '../components/dashboard/DashboardCharts';
import { LatestTables } from '../components/dashboard/LatestTables';
import { ShiftOpsCards } from '../components/dashboard/ShiftOpsCards';
import { StatCards } from '../components/dashboard/StatCards';
import { Sprint19DashboardWidgets } from '../components/dashboard/Sprint19DashboardWidgets';
import { CctvOpsGuardInboxSection } from '../components/cctvOperations/CctvOpsGuardInboxSection';
import { DASHBOARD_QUERY_KEY } from '../hooks/useSocket';
import { useAuth } from '../auth/AuthContext';
import { PermissionCodes, RoleCodes, hasPermission } from '../auth/rbac';

export function DashboardPage() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const showGuardInbox =
    hasPermission(permissions, [PermissionCodes.SECURITY_REFERRALS_RECEIVE]) ||
    user?.roleCode === RoleCodes.SECURITY_GUARD;
  const showMyIncidents = hasPermission(permissions, [
    PermissionCodes.INCIDENTS_VIEW_ASSIGNED,
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_ACKNOWLEDGE,
    PermissionCodes.INCIDENTS_RESPOND,
  ]);
  const showOpsRoom = hasPermission(permissions, [
    PermissionCodes.OPERATIONS_ROOM_VIEW,
    PermissionCodes.OPERATIONS_ROOM_MANAGE,
    PermissionCodes.INCIDENTS_VIEW_ALL,
  ]);

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل لوحة المعلومات.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          لوحة المعلومات
        </Typography>
        <Typography variant="caption" color="text.secondary">
          آخر تحديث: {new Date(dataUpdatedAt).toLocaleTimeString('ar-SA')}
        </Typography>
      </Box>

      <Sprint19DashboardWidgets />

      {showGuardInbox ? <CctvOpsGuardInboxSection /> : null}

      {showMyIncidents ? (
        <Box sx={{ mb: 2 }}>
          <Button component={RouterLink} to="/incidents/my-incidents" variant="contained" sx={{ mr: 1 }}>
            الحوادث المسندة إليّ
          </Button>
          <Button component={RouterLink} to="/incidents" variant="outlined">
            البلاغات والحوادث
          </Button>
        </Box>
      ) : null}

      {showOpsRoom ? (
        <Box sx={{ mb: 2 }}>
          <Button component={RouterLink} to="/operations-room" variant="outlined" sx={{ mr: 1 }}>
            غرفة العمليات الأمنية
          </Button>
        </Box>
      ) : null}

      {hasPermission(permissions, [PermissionCodes.CCTV_OPS_DASHBOARD_VIEW]) ? (
        <Box sx={{ mb: 2 }}>
          <Button component={RouterLink} to="/cctv-operations" variant="outlined">
            مركز عمليات المراقبة
          </Button>
        </Box>
      ) : null}

      <StatCards summary={data} />
      {data.shifts ? <ShiftOpsCards shifts={data.shifts} /> : null}
      <DashboardCharts charts={data.charts} />
      <LatestTables tables={data.tables} />
    </Box>
  );
}
