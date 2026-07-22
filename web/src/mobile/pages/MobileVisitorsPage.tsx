import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VISITORS_QUERY_KEYS, listVisitors } from '../../api/visitors';
import { VISIT_STATUS_LABELS } from '../../components/cctv/cctvLabels';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';
import { parseVisitPurpose } from '../../visitors/intake/visitIntakeMeta';
import {
  VISIT_INTAKE_FIELD_LABELS,
  type VisitIntakeFieldKey,
} from '../../types/visitIntake';

const IMPORTANCE_LABELS: Record<string, string> = {
  NORMAL: 'عادي',
  VIP: 'VIP',
  VVIP: 'VVIP',
  IMPORTANT: 'مهم',
};

const STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  UPCOMING: 'info',
  ARRIVED: 'warning',
  HOST_NOTIFIED: 'warning',
  IN_MEETING: 'success',
  COMPLETED: 'default',
  CANCELLED: 'error',
};

export function MobileVisitorsPage() {
  const { formatDate, formatDateTime } = useMobileDateFormat();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: VISITORS_QUERY_KEYS.list({ pageSize: 100 }),
    queryFn: () => listVisitors({ pageSize: 100 }),
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => {
    const list = [...(data?.data ?? [])];
    list.sort((a, b) => {
      const dateCmp = String(a.visitDate).localeCompare(String(b.visitDate));
      if (dateCmp !== 0) return dateCmp;
      return String(a.arrivalTime ?? '').localeCompare(String(b.arrivalTime ?? ''));
    });
    return list;
  }, [data?.data]);

  if (isLoading) return <MobileLoadingState label="جاري تحميل الزوار…" />;

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل قائمة الزوار.'}
      </Alert>
    );
  }

  return (
    <Box>
      <MobilePageHeader
        title="الزوار"
        subtitle={`${rows.length} زيارة · مرتبة بالتاريخ ووقت الوصول`}
      />

      {rows.length === 0 ? (
        <MobileEmptyState title="لا يوجد زوار" description="لا توجد زيارات مسجّلة حالياً." />
      ) : (
        rows.map((row) => {
          const { meta } = parseVisitPurpose(row.purpose);
          const pending = meta?.approvalStatus === 'PENDING_APPROVAL';
          return (
            <MobileListCard
              key={row.id}
              title={row.visitorName}
              subtitle={`${formatDate(row.visitDate)}${row.arrivalTime ? ` · ${formatDateTime(row.arrivalTime)}` : ''}`}
              statusLabel={
                pending
                  ? 'بانتظار الاعتماد'
                  : (VISIT_STATUS_LABELS[row.status] ?? row.status)
              }
              statusColor={pending ? 'warning' : (STATUS_COLORS[row.status] ?? 'default')}
              trailing={
                row.importance !== 'NORMAL' ? (
                  <Chip
                    label={IMPORTANCE_LABELS[row.importance] ?? row.importance}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                ) : undefined
              }
            >
              {meta?.missingFields?.length ? (
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                    يلزم إكمال البيانات الناقصة
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {meta.missingFields
                      .map((f: VisitIntakeFieldKey) => VISIT_INTAKE_FIELD_LABELS[f] ?? f)
                      .join(' · ')}
                  </Typography>
                </Stack>
              ) : null}
            </MobileListCard>
          );
        })
      )}
    </Box>
  );
}
