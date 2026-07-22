import { Alert, Box, Grid, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchOpsRoomDashboard } from '../../api/operationsRoom';
import { fetchDashboardSummary } from '../../api/dashboard';
import { fetchDirectorDashboard } from '../../api/director';
import { fetchKpiOverview, REPORTS_CENTER_QUERY_KEYS } from '../../api/reportsCenter';
import { DASHBOARD_QUERY_KEY } from '../../hooks/useSocket';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { MobileStatCard } from '../components/MobileStatCard';

function todayRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function MobileOperationsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['operations-room', 'dashboard', 'mobile'],
    queryFn: fetchOpsRoomDashboard,
    refetchInterval: 30_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل لوحة العمليات…" />;
  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل لوحة العمليات.'}
      </Alert>
    );
  }

  const summary = data.summary;

  return (
    <Box>
      <MobilePageHeader title="لوحة العمليات" subtitle="متابعة التصعيد والاستجابة" />
      <Grid container spacing={1.25}>
        <Grid size={6}>
          <MobileStatCard label="مفتوحة" value={summary.openCount} accent="warning.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="حرجة" value={summary.criticalOpen} accent="error.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="مصعّدة" value={summary.escalated} accent="secondary.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="غير مسندة" value={summary.unassigned} accent="info.main" />
        </Grid>
      </Grid>
    </Box>
  );
}

export function MobileDirectorPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['director', 'dashboard', 'mobile'],
    queryFn: fetchDirectorDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل لوحة المدير…" />;
  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل لوحة المدير.'}
      </Alert>
    );
  }

  return (
    <Box>
      <MobilePageHeader title="لوحة المدير" subtitle={data.lastSyncHint || 'ملخص تنفيذي'} />
      <Grid container spacing={1.25}>
        <Grid size={6}>
          <MobileStatCard label="مخالفات اليوم" value={data.todaysViolations} accent="error.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="بلاغات مفتوحة" value={data.openIncidents} accent="warning.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="متصلون" value={data.onlineUsersEstimate} accent="success.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="المستخدمون" value={data.activeUsers} accent="info.main" />
        </Grid>
      </Grid>
    </Box>
  );
}

export function MobileStatisticsPage() {
  const range = todayRange();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.kpi(range),
    queryFn: () => fetchKpiOverview(range),
    refetchInterval: 60_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل المؤشرات…" />;
  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل مؤشرات الأداء.'}
      </Alert>
    );
  }

  return (
    <Box>
      <MobilePageHeader title="مؤشرات الأداء" subtitle="ملخص يومي" />
      <Grid container spacing={1.25}>
        <Grid size={6}>
          <MobileStatCard label="حوادث" value={data.incidents.total} accent="warning.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="مفتوحة" value={data.incidents.open} accent="error.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="جولات" value={data.patrols.total} accent="info.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="مكتملة" value={data.patrols.completed} accent="success.main" />
        </Grid>
      </Grid>
    </Box>
  );
}

export function MobileResponseTimePage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل زمن الاستجابة…" />;
  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل بيانات زمن الاستجابة.'}
      </Alert>
    );
  }

  return (
    <Box>
      <MobilePageHeader title="زمن الاستجابة" subtitle="مؤشر الأداء التشغيلي" />
      <Grid container spacing={1.25} sx={{ mb: 2 }}>
        <Grid size={12}>
          <MobileStatCard
            label="متوسط الاستجابة (دقيقة)"
            value={data.averageResponseMinutes ?? '—'}
            accent="primary.main"
          />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="ضمن SLA" value={data.charts.sla.onTime} accent="success.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="تجاوز SLA" value={data.charts.sla.breached} accent="error.main" />
        </Grid>
      </Grid>
      <Box className="mobile-card">
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>العينة</Typography>
        <Typography variant="body2" color="text.secondary">
          إجمالي القياسات: {data.charts.sla.total}
        </Typography>
      </Box>
    </Box>
  );
}
