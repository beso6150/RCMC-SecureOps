import { Alert, Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchHandoverBoard } from '../../api/shifts';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

export function MobileHandoverPage() {
  const { formatRelative } = useMobileDateFormat();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['shifts', 'handover-board', 'mobile'],
    queryFn: fetchHandoverBoard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل التسليم والاستلام…" />;
  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل بيانات التسليم والاستلام.'}
      </Alert>
    );
  }

  return (
    <Box>
      <MobilePageHeader title="تسليم واستلام الوردية" subtitle="حالة التسليم الحالية" />

      <Box className="mobile-card" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>الوردية الحالية</Typography>
        <Typography variant="body2" color="text.secondary">
          الخارجة: {data.outgoingGroup?.nameAr ?? '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          القادمة: {data.incomingGroup?.nameAr ?? '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          حالة التسليم: {data.handover?.handoverStatus ?? 'لا يوجد تسليم مفتوح'}
        </Typography>
      </Box>

      <Typography sx={{ fontWeight: 700, mb: 1 }}>السجل</Typography>
      {data.history.length === 0 ? (
        <MobileEmptyState title="لا يوجد سجل تسليم" />
      ) : (
        data.history.slice(0, 20).map((item) => (
          <MobileListCard
            key={item.id}
            title={item.session.group.nameAr}
            subtitle={`${item.outgoingSupervisor.fullName} → ${item.incomingSupervisor.fullName}`}
            meta={formatRelative(item.createdAt)}
            statusLabel={item.handoverStatus}
          />
        ))
      )}
    </Box>
  );
}
