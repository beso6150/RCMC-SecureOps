import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchOpsRoomStatistics, OPS_ROOM_QUERY_KEYS } from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsCardsSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import { OPS_SOURCE_LABELS } from '../../types/operationsRoom';

const CHART_COLORS = ['#0f2d5c', '#00776c', '#0891b2', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncidentStatisticsPage() {
  const { user } = useAuth();
  const canView = hasPermission(user?.permissions ?? [], [
    PermissionCodes.OPERATIONS_ROOM_VIEW,
    PermissionCodes.OPERATIONS_ROOM_MANAGE,
    PermissionCodes.INCIDENTS_VIEW_ALL,
  ]);

  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [appliedFrom, setAppliedFrom] = useState(defaultFromDate);
  const [appliedTo, setAppliedTo] = useState(defaultToDate);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.statistics(appliedFrom, appliedTo),
    queryFn: () => fetchOpsRoomStatistics(appliedFrom, appliedTo),
    enabled: canView,
  });

  if (!canView) {
    return (
      <Box>
        <OpsRoomPageHeader title="إحصائيات الحوادث" />
        <Alert severity="warning">ليس لديك صلاحية عرض إحصائيات غرفة العمليات.</Alert>
      </Box>
    );
  }

  const byType =
    data?.byType.map((t) => ({
      name: t.type?.nameAr ?? t.typeId.slice(0, 8),
      value: t.count,
    })) ?? [];
  const bySource =
    data?.bySource.map((s) => ({
      name: s.source ? OPS_SOURCE_LABELS[s.source] ?? s.source : 'غير محدد',
      value: s.count,
    })) ?? [];

  return (
    <Box>
      <OpsRoomPageHeader
        title="إحصائيات الحوادث"
        subtitle="مؤشرات البلاغات لغرفة العمليات الأمنية"
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'flex-end' } }}
          >
            <TextField
              label="من تاريخ"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => {
                setAppliedFrom(from);
                setAppliedTo(to);
              }}
            >
              تطبيق
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? <OpsCardsSkeleton count={5} /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الإحصائيات.'}</Alert>
      ) : null}

      {data ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'الإجمالي', value: data.total },
              { label: 'مفتوحة', value: data.open },
              { label: 'مغلقة', value: data.closed },
              { label: 'ملغاة', value: data.cancelled },
              { label: 'إنذار كاذب', value: data.falseAlarm },
            ].map((card) => (
              <Grid key={card.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            متوسط زمن الاستجابة:{' '}
            {data.avgResponseMs != null
              ? `${Math.round(data.avgResponseMs / 60_000)} دقيقة`
              : '—'}
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    حسب النوع
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={byType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0f2d5c" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    حسب المصدر
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={bySource} dataKey="value" nameKey="name" outerRadius={100} label>
                        {bySource.map((_, i) => (
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
          </Grid>
        </>
      ) : null}
    </Box>
  );
}
