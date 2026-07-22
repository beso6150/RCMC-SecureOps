import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard';
import { REPORTS_QUERY_KEYS, fetchReportSummary } from '../api/reports';
import { useAuth } from '../auth/AuthContext';
import { RoleCodes } from '../auth/rbac';
import { DashboardCharts } from '../components/dashboard/DashboardCharts';
import { StatCards } from '../components/dashboard/StatCards';
import { DASHBOARD_QUERY_KEY } from '../hooks/useSocket';

export function StatisticsPage() {
  const { user } = useAuth();
  const isDirector = user?.roleCode === RoleCodes.SECURITY_DIRECTOR;

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    error: dashboardErr,
    dataUpdatedAt,
  } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
    enabled: !isDirector,
  });

  const { data: weeklyReport, isLoading: reportLoading } = useQuery({
    queryKey: REPORTS_QUERY_KEYS.summary('weekly'),
    queryFn: () => fetchReportSummary('weekly'),
    refetchInterval: 60_000,
    enabled: !isDirector,
  });

  const isLoading = dashboardLoading || reportLoading;

  if (isDirector) {
    return <Navigate to="/director/statistics" replace />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (dashboardError || !dashboard) {
    return (
      <Alert severity="error">
        {(dashboardErr as Error)?.message ?? 'تعذّر تحميل الإحصائيات.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          الإحصائيات والتقارير
        </Typography>
        <Typography variant="caption" color="text.secondary">
          آخر تحديث: {new Date(dataUpdatedAt).toLocaleTimeString('ar-SA')}
        </Typography>
      </Box>

      <StatCards summary={dashboard} />

      {weeklyReport ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'مخالفات (أسبوعي)', value: weeklyReport.violations },
            { label: 'بلاغات (أسبوعي)', value: weeklyReport.incidents },
            { label: 'زوار (أسبوعي)', value: weeklyReport.visitors },
            { label: 'بلاغات مفتوحة', value: weeklyReport.openIncidents },
          ].map((item) => (
            <Grid key={item.label} size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : null}

      <DashboardCharts charts={dashboard.charts} />
    </Box>
  );
}
