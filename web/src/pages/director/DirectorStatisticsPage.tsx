import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
import { COMPLAINTS_QUERY_KEYS, fetchComplaintStatistics } from '../../api/complaints';
import { REPORTS_QUERY_KEYS, fetchReportSummary } from '../../api/reports';
import {
  SETTINGS_QUERY_KEYS,
  fetchViolationStatistics,
  fetchVisitorStatistics,
} from '../../api/settings';
import type { ReportPeriod } from '../../types/director';
import { COMPLAINT_STATUS_LABELS, PERIOD_LABELS } from './directorLabels';

const CHART_COLORS = ['#0f2d5c', '#00776c', '#0891b2', '#2563eb', '#d97706', '#dc2626'];

export function DirectorStatisticsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('daily');

  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErr } =
    useQuery({
      queryKey: REPORTS_QUERY_KEYS.summary(period),
      queryFn: () => fetchReportSummary(period),
    });

  const { data: violationStats, isLoading: violLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.violationStats(),
    queryFn: () => fetchViolationStatistics(),
  });

  const { data: visitorStats, isLoading: visitorLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.visitorStats(),
    queryFn: () => fetchVisitorStatistics(),
  });

  const { data: complaintStats, isLoading: complaintLoading } = useQuery({
    queryKey: COMPLAINTS_QUERY_KEYS.statistics(),
    queryFn: () => fetchComplaintStatistics(),
  });

  const isLoading = summaryLoading || violLoading || visitorLoading || complaintLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (summaryError) {
    return (
      <Alert severity="error">
        {(summaryErr as Error)?.message ?? 'تعذّر تحميل الإحصائيات.'}
      </Alert>
    );
  }

  const complaintPie = complaintStats?.byStatus.map((s) => ({
    name: COMPLAINT_STATUS_LABELS[s.status],
    value: s.count,
  })) ?? [];

  const violationDaily = violationStats?.dailyViolations.map((d) => ({
    day: new Date(d.day).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    count: d.count,
  })) ?? [];

  const visitorByFloor = visitorStats?.visitorsByFloor.map((f) => ({
    name: f.floor?.nameAr ?? 'غير محدد',
    value: f.count,
  })) ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          الإحصائيات
        </Typography>
        <ToggleButtonGroup
          size="small"
          value={period}
          exclusive
          onChange={(_, v: ReportPeriod | null) => v && setPeriod(v)}
        >
          {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
            <ToggleButton key={p} value={p}>
              {PERIOD_LABELS[p]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'المخالفات', value: summary.violations },
            { label: 'البلاغات', value: summary.incidents },
            { label: 'الزوار', value: summary.visitors },
            { label: 'الشكاوى', value: summary.complaints },
            { label: 'بلاغات مفتوحة', value: summary.openIncidents },
            { label: 'متوسط الاستجابة (د)', value: summary.averageResponseMinutes ?? '—' },
          ].map((item) => (
            <Grid key={item.label} size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="المخالفات اليومية" subheader={summary?.label} />
            <CardContent>
              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={violationDaily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#0f2d5c" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="الزوار حسب الطابق" />
            <CardContent>
              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={visitorByFloor}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#00776c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="الشكاوى حسب الحالة" />
            <CardContent>
              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={complaintPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {complaintPie.map((_, index) => (
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

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="الشكاوى يومياً" />
            <CardContent>
              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={complaintStats?.byDay ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {violationStats && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader title="المخالفات حسب الموقع" />
              <CardContent>
                <Box sx={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={violationStats.violationsByLocation.map((v) => ({
                        name: v.location?.nameAr ?? v.parkingCode,
                        count: v.count,
                      }))}
                      layout="vertical"
                      margin={{ left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f2d5c" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
