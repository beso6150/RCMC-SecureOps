import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VISITORS_QUERY_KEYS, listVisitors } from '../api/visitors';
import { VISIT_STATUS_LABELS } from '../components/cctv/cctvLabels';
import { formatDate } from './director/directorLabels';
import { parseVisitPurpose } from '../visitors/intake/visitIntakeMeta';
import {
  VISIT_INTAKE_FIELD_LABELS,
  type VisitIntakeFieldKey,
} from '../types/visitIntake';

const REFETCH_MS = 60_000;

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

function formatArrival(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

export function VisitorsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: VISITORS_QUERY_KEYS.list({ pageSize: 100 }),
    queryFn: () => listVisitors({ pageSize: 100 }),
    refetchInterval: REFETCH_MS,
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل قائمة الزوار.'}</Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        إدارة الزوار
      </Typography>

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>اسم الزائر</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>تاريخ الزيارة</TableCell>
              <TableCell>وقت الوصول</TableCell>
              <TableCell>الأهمية</TableCell>
              <TableCell>استكمال البيانات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا يوجد زوار</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const { meta } = parseVisitPurpose(row.purpose);
                const pending = meta?.approvalStatus === 'PENDING_APPROVAL';
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.visitorName}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          label={VISIT_STATUS_LABELS[row.status] ?? row.status}
                          size="small"
                          color={STATUS_COLORS[row.status] ?? 'default'}
                          variant="outlined"
                        />
                        {pending ? (
                          <Chip label="بانتظار الاعتماد" size="small" color="warning" />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{formatDate(row.visitDate)}</TableCell>
                    <TableCell>{formatArrival(row.arrivalTime)}</TableCell>
                    <TableCell>
                      <Chip
                        label={IMPORTANCE_LABELS[row.importance] ?? row.importance}
                        size="small"
                        color={row.importance !== 'NORMAL' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {meta?.missingFields?.length ? (
                        <Typography variant="caption" color="warning.main">
                          ناقص:{' '}
                          {meta.missingFields
                            .map((f: VisitIntakeFieldKey) => VISIT_INTAKE_FIELD_LABELS[f] ?? f)
                            .join('، ')}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          مكتمل
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
