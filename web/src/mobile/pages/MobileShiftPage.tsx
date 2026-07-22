import { Alert, Box, Grid, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchShiftOpsBoard } from '../../api/shifts';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { MobileStatCard } from '../components/MobileStatCard';

export function MobileShiftPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['shifts', 'ops-board', 'mobile'],
    queryFn: fetchShiftOpsBoard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل ملخص الوردية…" />;
  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل ملخص الوردية.'}
      </Alert>
    );
  }

  return (
    <Box>
      <MobilePageHeader
        title="ملخص الوردية"
        subtitle={`${data.activeKindLabel} · المجموعة ${data.activeGroup?.nameAr ?? '—'}`}
      />
      <Grid container spacing={1.25}>
        <Grid size={6}>
          <MobileStatCard label="في الخدمة" value={data.onDutyCount} accent="success.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="متاحون" value={data.availableCount} accent="info.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="بلاغات نشطة" value={data.activeIncidents} accent="warning.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="حرجة" value={data.criticalIncidents} accent="error.main" />
        </Grid>
      </Grid>
      <Box className="mobile-card" sx={{ mt: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>الحراس / المشرفون</Typography>
        <Typography variant="body2" color="text.secondary">
          حراس: {data.guardCount} · مشرفون: {data.supervisorCount}
        </Typography>
      </Box>
    </Box>
  );
}
