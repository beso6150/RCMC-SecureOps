import { Alert, Box, Button, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import GroupsIcon from '@mui/icons-material/Groups';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import VideocamIcon from '@mui/icons-material/Videocam';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CCTV_QUERY_KEYS, fetchCctvDashboard } from '../../api/cctv';
import { ControlRoomTimeline } from '../../components/cctv/ControlRoomTimeline';
import { LiveStatCard } from '../../components/cctv/LiveStatCard';
import { formatResponseMs } from '../../components/cctv/cctvLabels';
import { Sprint19DashboardWidgets } from '../../components/dashboard/Sprint19DashboardWidgets';

const REFETCH_MS = 60_000;

export function CctvHomePage() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: CCTV_QUERY_KEYS.dashboard,
    queryFn: fetchCctvDashboard,
    refetchInterval: REFETCH_MS,
  });

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
        {(error as Error)?.message ?? 'تعذّر تحميل لوحة غرفة التحكم.'}
      </Alert>
    );
  }

  const chartData = [
    { name: 'مخالفات', value: data.stats.violationsToday },
    { name: 'بلاغات', value: data.stats.incidentsToday },
    { name: 'زوار', value: data.stats.visitorsToday },
  ];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
      >
        <Button
          component={RouterLink}
          to="/cctv-operations"
          variant="contained"
          startIcon={<MonitorHeartIcon />}
        >
          مركز عمليات المراقبة
        </Button>
        <Typography variant="caption" color="text.secondary">
          آخر تحديث: {new Date(dataUpdatedAt).toLocaleTimeString('ar-SA')}
        </Typography>
      </Stack>

      <Sprint19DashboardWidgets />

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="بلاغات جديدة" value={data.newIncidents} icon={ReportProblemIcon} color="#d97706" pulse />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="مخالفات مفتوحة" value={data.openViolations} icon={DirectionsCarFilledIcon} color="#dc2626" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="زوار حاليون" value={data.currentVisitors} icon={GroupsIcon} color="#0891b2" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="طلبات كاميرات" value={data.pendingCameraRequests} icon={VideocamIcon} color="#2563eb" pulse />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <LiveStatCard label="بلاغات حرجة" value={data.criticalIncidents} icon={WarningAmberIcon} color="#b45309" pulse />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ControlRoomTimeline items={data.timeline} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              height: '100%',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              إحصائيات اليوم
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              متوسط الاستجابة: {formatResponseMs(data.stats.averageResponseMs)}
            </Typography>
            <Box sx={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00776c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
