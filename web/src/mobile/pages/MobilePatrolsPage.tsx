import { Alert, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { FIELD_OPS_QUERY_KEYS, listPatrolSessions } from '../../api/fieldOperations';
import { PATROL_STATUS_LABELS } from '../../types/fieldOperations';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

function statusColor(status: string) {
  if (status === 'COMPLETED') return 'success' as const;
  if (status === 'IN_PROGRESS' || status === 'ASSIGNED') return 'info' as const;
  if (status === 'LATE' || status === 'MISSED') return 'error' as const;
  if (status === 'CANCELLED') return 'default' as const;
  return 'warning' as const;
}

export function MobilePatrolsPage() {
  const { formatDateTime, formatRelative } = useMobileDateFormat();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.patrols({ pageSize: 40 }),
    queryFn: () => listPatrolSessions({ pageSize: 40 }),
    refetchInterval: 45_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل الجولات…" />;

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل جلسات الجولات الأمنية.'}
      </Alert>
    );
  }

  const rows = data?.data ?? [];

  return (
    <Box>
      <MobilePageHeader title="الجولات الأمنية" subtitle={`${rows.length} جلسة معروضة`} />

      {rows.length === 0 ? (
        <MobileEmptyState title="لا توجد جولات" description="لم تُجدول أي جولات أمنية حالياً." />
      ) : (
        rows.map((row) => (
          <MobileListCard
            key={row.id}
            title={row.route?.name ?? 'جولة أمنية'}
            subtitle={
              row.assignedUser?.fullName
                ? `المسند: ${row.assignedUser.fullName}`
                : `مجدولة: ${formatDateTime(row.scheduledStartAt)}`
            }
            meta={formatRelative(row.startedAt ?? row.scheduledStartAt ?? row.createdAt)}
            statusLabel={PATROL_STATUS_LABELS[row.status] ?? row.status}
            statusColor={statusColor(row.status)}
          />
        ))
      )}
    </Box>
  );
}
