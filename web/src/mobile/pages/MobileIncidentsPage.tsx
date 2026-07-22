import { Alert, Box, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { listOpsIncidents, OPS_ROOM_QUERY_KEYS } from '../../api/operationsRoom';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

export function MobileIncidentsPage() {
  const { formatRelative } = useMobileDateFormat();
  const params = { pageSize: 40 };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.incidents(params),
    queryFn: () => listOpsIncidents(params),
    refetchInterval: 30_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل البلاغات…" />;
  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل البلاغات.'}
      </Alert>
    );
  }

  const rows = data?.data ?? [];

  return (
    <Box>
      <MobilePageHeader title="البلاغات" subtitle={`${rows.length} بلاغ معروض`} />
      {rows.length === 0 ? (
        <MobileEmptyState title="لا توجد بلاغات" />
      ) : (
        rows.map((row) => (
          <MobileListCard
            key={row.id}
            title={row.title}
            subtitle={row.type?.nameAr ?? row.incidentNumber ?? row.status}
            meta={formatRelative(row.createdAt)}
            statusLabel={row.status}
            statusColor={row.severity === 'CRITICAL' ? 'error' : 'warning'}
            trailing={
              row.severity === 'CRITICAL' ? (
                <Chip size="small" color="error" label="حرج" />
              ) : undefined
            }
          />
        ))
      )}
    </Box>
  );
}
