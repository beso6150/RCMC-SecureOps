import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  TextField,
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
import { fetchFieldOpsStatistics, FIELD_OPS_QUERY_KEYS } from '../../api/fieldOperations';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { CardsSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import {
  ALERT_SEVERITY_LABELS,
  ALERT_TYPE_LABELS,
  PATROL_STATUS_LABELS,
} from '../../types/fieldOperations';

const CHART_COLORS = ['#0f2d5c', '#00776c', '#0891b2', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FieldStatisticsPage() {
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [appliedFrom, setAppliedFrom] = useState(defaultFromDate);
  const [appliedTo, setAppliedTo] = useState(defaultToDate);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.statistics(appliedFrom, appliedTo),
    queryFn: () => fetchFieldOpsStatistics(appliedFrom, appliedTo),
  });

  return (
    <Box>
      <FieldOpsPageHeader
        title="إحصائيات العمليات الميدانية"
        subtitle="مؤشرات الجولات والتنبيهات وتغطية النقاط"
        showSos={false}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-end' } }}>
            <TextField
              label="من تاريخ"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 160 }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => {
                setAppliedFrom(from);
                setAppliedTo(to);
              }}
            >
              عرض
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? <CardsSkeleton count={4} /> : null}
      {isError ? (
        <Alert severity="error">
          {(error as Error)?.message ?? 'تعذّر تحميل إحصائيات العمليات الميدانية.'}
        </Alert>
      ) : null}

      {data ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {data.sosCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    نداءات استغاثة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {data.completionRate != null
                      ? `${Math.round(data.completionRate * 100)}%`
                      : '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    نسبة إكمال الجولات
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {data.averagePatrolDurationMinutes != null
                      ? Math.round(data.averagePatrolDurationMinutes)
                      : '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    متوسط مدة الجولة (د)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {data.patrolsByStatus.reduce((s, x) => s + x.count, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    إجمالي الجولات
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="الجولات حسب الحالة" />
                <CardContent sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={data.patrolsByStatus.map((x) => ({
                        name: PATROL_STATUS_LABELS[x.status],
                        count: x.count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f2d5c" name="العدد" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="التنبيهات حسب الخطورة" />
                <CardContent sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={data.alertsBySeverity.map((x) => ({
                          name: ALERT_SEVERITY_LABELS[x.severity],
                          value: x.count,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {data.alertsBySeverity.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="زيارات النقاط يومياً" />
                <CardContent sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={data.visitsByDay.map((d) => ({
                        day: new Date(d.day).toLocaleDateString('ar-SA', {
                          month: 'short',
                          day: 'numeric',
                        }),
                        count: d.count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#00776c" name="زيارات" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="التنبيهات حسب النوع" />
                <CardContent sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={data.alertsByType.map((x) => ({
                        name: ALERT_TYPE_LABELS[x.alertType],
                        count: x.count,
                      }))}
                      layout="vertical"
                      margin={{ left: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0891b2" name="العدد" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title="تغطية النقاط الأمنية" />
                <CardContent sx={{ height: 300 }}>
                  {(data.checkpointCoverage?.length ?? 0) === 0 ? (
                    <Alert severity="info">لا توجد بيانات تغطية للنقاط في الفترة المحددة.</Alert>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart
                        data={data.checkpointCoverage.slice(0, 12).map((c) => ({
                          name: c.name,
                          visits: c.visits,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="visits" fill="#2563eb" name="الزيارات" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}
