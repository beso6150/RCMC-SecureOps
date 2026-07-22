import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import GroupsIcon from '@mui/icons-material/Groups';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerIcon from '@mui/icons-material/Timer';
import type { DashboardSummary } from '../../types/dashboard';

interface StatCardsProps {
  summary: DashboardSummary;
}

const cards = [
  {
    key: 'todaysViolations' as const,
    label: 'مخالفات اليوم',
    icon: DirectionsCarFilledIcon,
    color: '#dc2626',
  },
  {
    key: 'todaysVisitors' as const,
    label: 'زوار اليوم',
    icon: GroupsIcon,
    color: '#0891b2',
  },
  {
    key: 'openIncidents' as const,
    label: 'بلاغات مفتوحة',
    icon: ReportProblemIcon,
    color: '#d97706',
  },
  {
    key: 'unreadNotifications' as const,
    label: 'إشعارات غير مقروءة',
    icon: NotificationsActiveIcon,
    color: '#7c3aed',
  },
  {
    key: 'pendingTasks' as const,
    label: 'مهام معلّقة',
    icon: AssignmentIcon,
    color: '#2563eb',
  },
  {
    key: 'overdueTasks' as const,
    label: 'مهام متأخرة',
    icon: WarningAmberIcon,
    color: '#b45309',
  },
];

export function StatCards({ summary }: StatCardsProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map(({ key, label, icon: Icon, color }) => (
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
                    {summary[key]}
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

      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
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
                  bgcolor: '#00776c18',
                  color: '#00776c',
                }}
              >
                <TimerIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {summary.averageResponseMinutes != null
                    ? `${summary.averageResponseMinutes} د`
                    : '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  متوسط الاستجابة
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
