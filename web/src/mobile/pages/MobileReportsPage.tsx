import { Alert, Box, Grid, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  REPORTS_CENTER_QUERY_KEYS,
  fetchReportsDashboard,
  fetchSavedReports,
} from '../../api/reportsCenter';
import {
  SAVED_REPORT_STATUS_LABELS,
  SAVED_REPORT_TYPE_LABELS,
} from '../../types/reportsCenter';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { MobileStatCard } from '../components/MobileStatCard';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

export function MobileReportsPage() {
  const { formatRelative } = useMobileDateFormat();

  const dashboardQuery = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.dashboard('daily'),
    queryFn: () => fetchReportsDashboard('daily'),
    refetchInterval: 60_000,
  });

  const savedQuery = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.saved({ pageSize: 20 }),
    queryFn: () => fetchSavedReports({ pageSize: 20 }),
    refetchInterval: 60_000,
  });

  if (dashboardQuery.isLoading || savedQuery.isLoading) {
    return <MobileLoadingState label="جاري تحميل التقارير…" />;
  }

  if (dashboardQuery.isError || savedQuery.isError) {
    return (
      <Alert severity="error">
        {(dashboardQuery.error as Error)?.message ??
          (savedQuery.error as Error)?.message ??
          'تعذّر تحميل مركز التقارير.'}
      </Alert>
    );
  }

  const dashboard = dashboardQuery.data;
  const reports = savedQuery.data?.data ?? [];
  const summary = dashboard?.summary;

  return (
    <Box>
      <MobilePageHeader title="التقارير" subtitle={dashboard?.label ?? 'ملخص العمليات والتقارير'} />

      <Grid container spacing={1.25} sx={{ mb: 2 }}>
        <Grid size={6}>
          <MobileStatCard label="المخالفات" value={summary?.violations ?? 0} accent="error.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="الحوادث" value={summary?.incidents ?? 0} accent="warning.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="الزوار" value={summary?.visitors ?? 0} accent="info.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard
            label="بانتظار الاعتماد"
            value={dashboard?.pendingApproval ?? 0}
            accent="secondary.main"
          />
        </Grid>
      </Grid>

      {dashboard?.kpis ? (
        <Box className="mobile-card" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>مؤشرات الأداء</Typography>
          <Grid container spacing={1}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary">
                جولات مكتملة
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{dashboard.kpis.patrols.completed}</Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary">
                حوادث مفتوحة
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{dashboard.kpis.incidents.open}</Typography>
            </Grid>
          </Grid>
        </Box>
      ) : null}

      <Typography sx={{ fontWeight: 700, mb: 1 }}>أحدث التقارير</Typography>
      {reports.length === 0 ? (
        <MobileEmptyState title="لا توجد تقارير محفوظة" description="لم يُنشأ أي تقرير بعد." />
      ) : (
        reports.map((report) => (
          <MobileListCard
            key={report.id}
            title={report.title}
            subtitle={SAVED_REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
            meta={`${report.reportNumber} · ${formatRelative(report.generatedAt)}`}
            statusLabel={SAVED_REPORT_STATUS_LABELS[report.status] ?? report.status}
            statusColor={
              report.status === 'APPROVED'
                ? 'success'
                : report.status === 'REJECTED' || report.status === 'FAILED'
                  ? 'error'
                  : report.status === 'UNDER_REVIEW'
                    ? 'warning'
                    : 'info'
            }
          />
        ))
      )}
    </Box>
  );
}
