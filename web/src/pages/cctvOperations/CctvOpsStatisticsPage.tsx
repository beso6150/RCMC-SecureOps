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
import { CCTV_OPS_QUERY_KEYS, fetchCctvOpsStatistics } from '../../api/cctvOperations';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import { CardsSkeleton } from '../../components/cctvOperations/CctvOpsSkeletons';
import {
  PERMIT_STATUS_LABELS,
  REFERRAL_SEVERITY_LABELS,
  REFERRAL_STATUS_LABELS,
  type SecurityPermitStatus,
  type SecurityReferralSeverity,
  type SecurityReferralStatus,
} from '../../types/cctvOperations';

const CHART_COLORS = ['#0f2d5c', '#00776c', '#0891b2', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toChartData(
  record: Record<string, number> | undefined,
  labels: Record<string, string>,
): Array<{ name: string; value: number }> {
  if (!record) return [];
  return Object.entries(record).map(([k, value]) => ({
    name: labels[k] ?? k,
    value,
  }));
}

export function CctvOpsStatisticsPage() {
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [appliedFrom, setAppliedFrom] = useState(defaultFromDate);
  const [appliedTo, setAppliedTo] = useState(defaultToDate);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.statistics(appliedFrom, appliedTo),
    queryFn: () => fetchCctvOpsStatistics(appliedFrom, appliedTo),
  });

  const permitsByStatus = toChartData(
    data?.permitsByStatus,
    PERMIT_STATUS_LABELS as Record<string, string>,
  );
  const referralsByStatus = toChartData(
    data?.referralsByStatus,
    REFERRAL_STATUS_LABELS as Record<string, string>,
  );
  const referralsBySeverity = toChartData(
    data?.referralsBySeverity,
    REFERRAL_SEVERITY_LABELS as Record<string, string>,
  );

  return (
    <Box>
      <CctvOpsPageHeader
        title="إحصائيات عمليات المراقبة"
        subtitle="مؤشرات التصاريح والإحالات لمشغلة المراقبة"
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
          {(error as Error)?.message ?? 'تعذّر تحميل إحصائيات عمليات المراقبة.'}
        </Alert>
      ) : null}

      {data ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'إجمالي التصاريح', value: data.totalPermits ?? Object.values(data.permitsByStatus ?? {}).reduce((a, b) => a + b, 0) },
              { label: 'إجمالي الإحالات', value: data.totalReferrals ?? Object.values(data.referralsByStatus ?? {}).reduce((a, b) => a + b, 0) },
              { label: 'تصعيدات', value: data.escalationCount ?? 0 },
              {
                label: 'متوسط الاستلام (دقيقة)',
                value: data.averageReceiveMinutes != null ? Math.round(data.averageReceiveMinutes) : '—',
              },
            ].map((card) => (
              <Grid key={card.label} size={{ xs: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
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

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    التصاريح حسب الحالة
                  </Typography>
                  {permitsByStatus.length === 0 ? (
                    <Alert severity="info">لا توجد بيانات.</Alert>
                  ) : (
                    <Box sx={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart data={permitsByStatus}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0f2d5c" name="العدد" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    الإحالات حسب الحالة
                  </Typography>
                  {referralsByStatus.length === 0 ? (
                    <Alert severity="info">لا توجد بيانات.</Alert>
                  ) : (
                    <Box sx={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart data={referralsByStatus}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#00776c" name="العدد" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    الإحالات حسب الخطورة
                  </Typography>
                  {referralsBySeverity.length === 0 ? (
                    <Alert severity="info">لا توجد بيانات.</Alert>
                  ) : (
                    <Box sx={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={referralsBySeverity} dataKey="value" nameKey="name" outerRadius={90} label>
                            {referralsBySeverity.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    ملخص الحالات
                  </Typography>
                  <Stack spacing={0.5}>
                    {(Object.keys(REFERRAL_STATUS_LABELS) as SecurityReferralStatus[]).map((k) => (
                      <Typography key={k} variant="body2">
                        {REFERRAL_STATUS_LABELS[k]}: {data.referralsByStatus?.[k] ?? 0}
                      </Typography>
                    ))}
                    {(Object.keys(PERMIT_STATUS_LABELS) as SecurityPermitStatus[]).slice(0, 4).map((k) => (
                      <Typography key={k} variant="body2" color="text.secondary">
                        تصريح {PERMIT_STATUS_LABELS[k]}: {data.permitsByStatus?.[k] ?? 0}
                      </Typography>
                    ))}
                    {(Object.keys(REFERRAL_SEVERITY_LABELS) as SecurityReferralSeverity[]).map((k) => (
                      <Typography key={k} variant="caption" color="text.secondary">
                        خطورة {REFERRAL_SEVERITY_LABELS[k]}: {data.referralsBySeverity?.[k] ?? 0}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}
