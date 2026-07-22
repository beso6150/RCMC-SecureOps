import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TimerIcon from '@mui/icons-material/Timer';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DIRECTOR_QUERY_KEYS, fetchDirectorDashboard } from '../../api/director';
import { DashboardCharts } from '../../components/dashboard/DashboardCharts';
import { COMPLAINT_STATUS_LABELS, formatDate, USER_STATUS_LABELS } from './directorLabels';
import { Sprint19DashboardWidgets } from '../../components/dashboard/Sprint19DashboardWidgets';

const STAT_CARDS = [
  { key: 'todaysViolations' as const, label: 'مخالفات اليوم', icon: DirectionsCarFilledIcon, color: '#dc2626' },
  { key: 'openIncidents' as const, label: 'بلاغات مفتوحة', icon: ReportProblemIcon, color: '#d97706' },
  { key: 'todaysVisitors' as const, label: 'زوار اليوم', icon: GroupsIcon, color: '#0891b2' },
  { key: 'openComplaints' as const, label: 'شكاوى مفتوحة', icon: SupportAgentIcon, color: '#7c3aed' },
  { key: 'averageResponseMinutes' as const, label: 'متوسط الاستجابة', icon: TimerIcon, color: '#00776c', suffix: ' د' },
  { key: 'onlineUsersEstimate' as const, label: 'مستخدمون متصلون', icon: PeopleIcon, color: '#2563eb' },
];

export function DirectorDashboardPage() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: DIRECTOR_QUERY_KEYS.dashboard,
    queryFn: fetchDirectorDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل لوحة مدير الأمن.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          آخر تحديث: {new Date(dataUpdatedAt).toLocaleTimeString('ar-SA')}
        </Typography>
      </Box>

      <Sprint19DashboardWidgets />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {STAT_CARDS.map(({ key, label, icon: Icon, color, suffix }) => (
          <Grid key={key} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: `${color}18`,
                      color,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {data[key] != null ? `${data[key]}${suffix ?? ''}` : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {data.charts && <DashboardCharts charts={data.charts} />}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title="أحدث الشكاوى" />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>العنوان</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>المقدّم</TableCell>
                      <TableCell>التاريخ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentComplaints.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.title}</TableCell>
                        <TableCell>
                          <Chip
                            label={COMPLAINT_STATUS_LABELS[row.status] ?? row.status}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{row.submitter?.fullName ?? '—'}</TableCell>
                        <TableCell>{formatDate(row.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {data.recentComplaints.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary" align="center">
                            لا توجد شكاوى
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title="أحدث المستخدمين" />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الاسم</TableCell>
                      <TableCell>الدور</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>آخر دخول</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentUsers.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.fullName}</TableCell>
                        <TableCell>{row.role?.nameEn ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={USER_STATUS_LABELS[row.status] ?? row.status}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatDate(row.lastLoginAt)}</TableCell>
                      </TableRow>
                    ))}
                    {data.recentUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary" align="center">
                            لا يوجد مستخدمون
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
