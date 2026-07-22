import { Alert, Box, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import GroupsIcon from '@mui/icons-material/Groups';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import VideocamIcon from '@mui/icons-material/Videocam';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerIcon from '@mui/icons-material/Timer';
import { useQuery } from '@tanstack/react-query';
import { CCTV_QUERY_KEYS, fetchCctvDashboard } from '../../api/cctv';
import { VISITORS_QUERY_KEYS, listVisitors } from '../../api/visitors';
import { ControlRoomTimeline } from '../../components/cctv/ControlRoomTimeline';
import { LiveStatCard } from '../../components/cctv/LiveStatCard';
import {
  CURRENT_VISITOR_STATUSES,
  VISIT_STATUS_LABELS,
  formatResponseMs,
} from '../../components/cctv/cctvLabels';

const REFETCH_MS = 60_000;

export function CctvOperationsPage() {
  const dashboardQuery = useQuery({
    queryKey: CCTV_QUERY_KEYS.dashboard,
    queryFn: fetchCctvDashboard,
    refetchInterval: REFETCH_MS,
  });

  const visitorsQuery = useQuery({
    queryKey: VISITORS_QUERY_KEYS.list({ pageSize: 20 }),
    queryFn: () => listVisitors({ pageSize: 20 }),
    refetchInterval: REFETCH_MS,
  });

  const { data, isLoading, isError, error, dataUpdatedAt } = dashboardQuery;

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل شاشة العمليات.'}
      </Alert>
    );
  }

  const currentVisitors =
    visitorsQuery.data?.data.filter((v) =>
      CURRENT_VISITOR_STATUSES.includes(v.status as (typeof CURRENT_VISITOR_STATUSES)[number]),
    ) ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          آخر تحديث: {new Date(dataUpdatedAt).toLocaleTimeString('ar-SA')}
        </Typography>
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="البلاغات الجديدة" value={data.newIncidents} icon={ReportProblemIcon} color="#d97706" pulse />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="مخالفات المركبات" value={data.openViolations} icon={DirectionsCarFilledIcon} color="#dc2626" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="الزوار الحاليون" value={data.currentVisitors} icon={GroupsIcon} color="#0891b2" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="طلبات الكاميرات" value={data.pendingCameraRequests} icon={VideocamIcon} color="#2563eb" pulse />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="البلاغات الحرجة" value={data.criticalIncidents} icon={WarningAmberIcon} color="#b45309" pulse />
        </Grid>
      </Grid>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <LiveStatCard
            label="متوسط الاستجابة"
            value={formatResponseMs(data.stats.averageResponseMs)}
            icon={TimerIcon}
            color="#00776c"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <LiveStatCard label="مخالفات اليوم" value={data.stats.violationsToday} icon={DirectionsCarFilledIcon} color="#dc2626" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <LiveStatCard label="بلاغات اليوم" value={data.stats.incidentsToday} icon={ReportProblemIcon} color="#d97706" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <LiveStatCard label="زوار اليوم" value={data.stats.visitorsToday} icon={GroupsIcon} color="#0891b2" />
        </Grid>
      </Grid>

      {currentVisitors.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            الزوار الحاليون
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {currentVisitors.map((visitor) => (
              <Chip
                key={visitor.id}
                icon={<GroupsIcon />}
                label={`${visitor.visitorName} — ${VISIT_STATUS_LABELS[visitor.status] ?? visitor.status}`}
                size="small"
                color={visitor.importance !== 'NORMAL' ? 'warning' : 'default'}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      <ControlRoomTimeline items={data.timeline} title="الخط الزمني المباشر" maxHeight={480} />
    </Box>
  );
}
