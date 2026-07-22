import { Alert, Box, Grid } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { listAssignedReferralsInbox, listReferrals } from '../../api/cctvOperations';
import { fetchCctvDashboard } from '../../api/cctv';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { MobileStatCard } from '../components/MobileStatCard';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

export function MobileCctvOpsPage() {
  const { formatRelative } = useMobileDateFormat();

  const dashboardQuery = useQuery({
    queryKey: ['cctv', 'dashboard', 'mobile'],
    queryFn: fetchCctvDashboard,
    refetchInterval: 60_000,
  });

  const inboxQuery = useQuery({
    queryKey: ['cctv-ops', 'referrals-inbox', 'mobile'],
    queryFn: () => listAssignedReferralsInbox({ pageSize: 20 }),
    refetchInterval: 30_000,
  });

  if (dashboardQuery.isLoading || inboxQuery.isLoading) {
    return <MobileLoadingState label="جاري تحميل مركز العمليات…" />;
  }

  if (dashboardQuery.isError) {
    return (
      <Alert severity="error">
        {(dashboardQuery.error as Error)?.message ?? 'تعذّر تحميل مركز عمليات الكاميرات.'}
      </Alert>
    );
  }

  const stats = dashboardQuery.data;
  const inbox = inboxQuery.data?.data ?? [];

  return (
    <Box>
      <MobilePageHeader title="مركز عمليات CCTV" subtitle="لوحة المشغّلة والملاحظات" />
      <Grid container spacing={1.25} sx={{ mb: 2 }}>
        <Grid size={6}>
          <MobileStatCard
            label="مخالفات مفتوحة"
            value={stats?.openViolations ?? 0}
            accent="error.main"
          />
        </Grid>
        <Grid size={6}>
          <MobileStatCard
            label="بلاغات جديدة"
            value={stats?.newIncidents ?? 0}
            accent="warning.main"
          />
        </Grid>
      </Grid>

      <MobilePageHeader title="ملاحظات / إحالات واردة" subtitle={`${inbox.length} عنصر`} />
      {inbox.length === 0 ? (
        <MobileEmptyState title="لا توجد إحالات واردة" />
      ) : (
        inbox.map((row) => (
          <MobileListCard
            key={row.id}
            title={row.title}
            subtitle={row.severity}
            meta={formatRelative(row.createdAt)}
            statusLabel={row.status}
          />
        ))
      )}
    </Box>
  );
}

export function MobileReferralsPage() {
  const { formatRelative } = useMobileDateFormat();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cctv-ops', 'referrals', 'mobile'],
    queryFn: () => listReferrals({ pageSize: 40 }),
    refetchInterval: 30_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل الإحالات…" />;
  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل الإحالات الأمنية.'}
      </Alert>
    );
  }

  const rows = data?.data ?? [];

  return (
    <Box>
      <MobilePageHeader title="الإحالات الأمنية" subtitle={`${rows.length} إحالة`} />
      {rows.length === 0 ? (
        <MobileEmptyState title="لا توجد إحالات" />
      ) : (
        rows.map((row) => (
          <MobileListCard
            key={row.id}
            title={row.title}
            subtitle={`شدة: ${row.severity}`}
            meta={formatRelative(row.createdAt)}
            statusLabel={row.status}
            statusColor={row.status === 'ESCALATED' ? 'error' : 'info'}
          />
        ))
      )}
    </Box>
  );
}
