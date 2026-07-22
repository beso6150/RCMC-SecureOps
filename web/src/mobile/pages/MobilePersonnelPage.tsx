import { Alert, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { FIELD_OPS_QUERY_KEYS, listPersonnelLocations } from '../../api/fieldOperations';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

export function MobilePersonnelPage() {
  const { formatRelative } = useMobileDateFormat();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.personnel({ pageSize: 50 }),
    queryFn: () => listPersonnelLocations({ pageSize: 50 }),
    refetchInterval: 30_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل المواقع…" />;
  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل مواقع الأفراد.'}
      </Alert>
    );
  }

  const rows = (data?.data ?? []).filter((row) => row.isCurrent);

  return (
    <Box>
      <MobilePageHeader title="متابعة الأفراد" subtitle={`${rows.length} موقع نشط`} />
      {rows.length === 0 ? (
        <MobileEmptyState title="لا يوجد أفراد متصلون حالياً" />
      ) : (
        rows.map((row) => (
          <MobileListCard
            key={row.id}
            title={row.user?.fullName ?? 'فرد أمني'}
            subtitle={row.zone?.name ?? row.source}
            meta={formatRelative(row.recordedAt)}
            statusLabel={row.isCurrent ? 'متصل' : 'غير نشط'}
            statusColor={row.isCurrent ? 'success' : 'default'}
          />
        ))
      )}
    </Box>
  );
}
