import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardSummary } from '../../types/dashboard';

const CHART_COLORS = ['#0f2d5c', '#00776c', '#0891b2', '#2563eb', '#d97706', '#dc2626'];

interface DashboardChartsProps {
  charts: DashboardSummary['charts'];
}

export function DashboardCharts({ charts }: DashboardChartsProps) {
  const slaData = [
    { name: 'ضمن SLA', value: charts.sla.onTime },
    { name: 'تجاوز SLA', value: charts.sla.breached },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="المخالفات حسب الموقع" subheader="آخر 7 أيام" />
          <CardContent>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={charts.violationsByLocation} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f2d5c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="البلاغات حسب النوع" subheader="آخر 7 أيام" />
          <CardContent>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={charts.incidentsByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {charts.incidentsByType.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="الزوار يومياً" subheader="آخر 7 أيام" />
          <CardContent>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={charts.visitorsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#00776c" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title="أداء SLA للبلاغات" />
          <CardContent>
            <Box sx={{ width: '100%', height: 220, display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer>
                <BarChart data={slaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#16a34a" />
                    <Cell fill="#dc2626" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary">
              إجمالي البلاغات المغلقة: {charts.sla.total}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title="متوسط وقت الاستجابة" />
          <CardContent>
            <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 700 }}>
              {charts.averageResponseTime.minutes != null
                ? `${charts.averageResponseTime.minutes} دقيقة`
                : '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              متوسط زمن معالجة المخالفات خلال الأسبوع
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
