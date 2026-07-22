import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  defaultDateRange,
  fetchKpiOverview,
  fromDateInputValue,
  REPORTS_CENTER_QUERY_KEYS,
  toDateInputValue,
} from '../../api/reportsCenter';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { ReportsCardsSkeleton } from '../../components/reports/ReportsSkeletons';
import { PermissionGate } from '../../components/reports/ReportsStates';
import type { AvgMetric, KpiOverview } from '../../types/reportsCenter';

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

function formatAvg(m?: AvgMetric | null): string {
  if (!m || m.averageMinutes == null) return '—';
  return `${m.averageMinutes} د (${m.sampleCount})`;
}

type TabKey =
  | 'overview'
  | 'incidents'
  | 'response'
  | 'patrols'
  | 'cctv'
  | 'permits'
  | 'violations'
  | 'visitors'
  | 'personnel'
  | 'shifts';

const TAB_DEFS: Array<{ key: TabKey; label: string; permissions: string[] }> = [
  {
    key: 'overview',
    label: 'نظرة عامة',
    permissions: [PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
  },
  {
    key: 'incidents',
    label: 'الحوادث',
    permissions: [PermissionCodes.KPI_INCIDENTS, PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
  },
  {
    key: 'response',
    label: 'أوقات الاستجابة',
    permissions: [PermissionCodes.KPI_RESPONSE_TIMES, PermissionCodes.KPI_VIEW],
  },
  {
    key: 'patrols',
    label: 'الجولات',
    permissions: [PermissionCodes.KPI_PATROLS, PermissionCodes.KPI_VIEW],
  },
  {
    key: 'cctv',
    label: 'إحالات المراقبة',
    permissions: [PermissionCodes.KPI_CCTV_REFERRALS, PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
  },
  {
    key: 'permits',
    label: 'التصاريح',
    permissions: [PermissionCodes.KPI_PERMITS, PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
  },
  {
    key: 'violations',
    label: 'المخالفات',
    permissions: [PermissionCodes.KPI_VIOLATIONS, PermissionCodes.KPI_VIEW],
  },
  {
    key: 'visitors',
    label: 'الزوار',
    permissions: [PermissionCodes.KPI_VISITORS, PermissionCodes.KPI_VIEW],
  },
  {
    key: 'personnel',
    label: 'الأفراد والمجموعات',
    permissions: [PermissionCodes.KPI_PERSONNEL, PermissionCodes.KPI_GROUPS, PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
  },
  {
    key: 'shifts',
    label: 'الورديات',
    permissions: [PermissionCodes.KPI_SHIFTS, PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
  },
];

function renderTab(tab: TabKey, data: KpiOverview) {
  switch (tab) {
    case 'overview':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="حوادث" value={data.incidents.total} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="جولات" value={data.patrols.total} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="إحالات المراقبة" value={data.cctvReferrals.total} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="على رأس العمل" value={data.personnel.onDutyCount} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="وردية مفتوحة" value={data.shifts.open} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="متوسط الاستجابة" value={formatAvg(data.responseTimes.overall)} />
          </Grid>
        </Grid>
      );
    case 'incidents':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="الإجمالي" value={data.incidents.total} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="مفتوحة" value={data.incidents.open} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="مغلقة" value={data.incidents.closed} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="متوسط الإقرار" value={formatAvg(data.incidents.avgAckMinutes)} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="متوسط الحل" value={formatAvg(data.incidents.avgResolveMinutes)} />
          </Grid>
        </Grid>
      );
    case 'response':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <MetricCard label="المتوسط العام" value={formatAvg(data.responseTimes.overall)} />
          </Grid>
          {Object.entries(data.responseTimes.byMetric ?? {}).map(([key, metric]) => (
            <Grid key={key} size={{ xs: 6, md: 4 }}>
              <MetricCard label={key} value={formatAvg(metric)} />
            </Grid>
          ))}
        </Grid>
      );
    case 'patrols':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="الإجمالي" value={data.patrols.total} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="مكتملة" value={data.patrols.completed} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="قيد التنفيذ" value={data.patrols.inProgress} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="ملغاة" value={data.patrols.cancelled} />
          </Grid>
        </Grid>
      );
    case 'cctv':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="إجمالي الإحالات" value={data.cctvReferrals.total} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="متوسط الاستلام" value={formatAvg(data.cctvReferrals.avgReceive)} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="متوسط الحل" value={formatAvg(data.cctvReferrals.avgResolve)} />
          </Grid>
          {(data.cctvReferrals.byStatus ?? []).map((row) => (
            <Grid key={row.status} size={{ xs: 6, md: 3 }}>
              <MetricCard label={row.status} value={row.count} />
            </Grid>
          ))}
        </Grid>
      );
    case 'permits':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="إجمالي التصاريح" value={data.permits.total} />
          </Grid>
          {(data.permits.byStatus ?? []).map((row) => (
            <Grid key={row.status} size={{ xs: 6, md: 3 }}>
              <MetricCard label={row.status} value={row.count} />
            </Grid>
          ))}
        </Grid>
      );
    case 'violations':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="إجمالي المخالفات" value={data.violations.total} />
          </Grid>
          {(data.violations.byStatus ?? []).map((row) => (
            <Grid key={row.status} size={{ xs: 6, md: 3 }}>
              <MetricCard label={row.status} value={row.count} />
            </Grid>
          ))}
        </Grid>
      );
    case 'visitors':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="إجمالي الزوار" value={data.visitors.total} />
          </Grid>
          {(data.visitors.byStatus ?? []).map((row) => (
            <Grid key={row.status} size={{ xs: 6, md: 3 }}>
              <MetricCard label={row.status} value={row.count} />
            </Grid>
          ))}
        </Grid>
      );
    case 'personnel':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="على رأس العمل" value={data.personnel.onDutyCount} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="عدد المجموعات" value={data.groups.total} />
          </Grid>
          {(data.groups.items ?? []).map((g) => (
            <Grid key={g.id} size={{ xs: 6, md: 3 }}>
              <MetricCard label={g.nameAr || g.nameEn} value={g.code} />
            </Grid>
          ))}
        </Grid>
      );
    case 'shifts':
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="إجمالي الورديات" value={data.shifts.total} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="مفتوحة" value={data.shifts.open} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="مغلقة" value={data.shifts.closed} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="صباحية" value={data.shifts.byKind?.MORNING ?? 0} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricCard label="مسائية" value={data.shifts.byKind?.EVENING ?? 0} />
          </Grid>
        </Grid>
      );
    default:
      return null;
  }
}

export function PerformanceKpisPage() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const initial = defaultDateRange(7);
  const [from, setFrom] = useState(toDateInputValue(initial.dateFrom));
  const [to, setTo] = useState(toDateInputValue(initial.dateTo));

  const visibleTabs = TAB_DEFS.filter((t) => hasPermission(permissions, t.permissions));
  const [tab, setTab] = useState<TabKey>(visibleTabs[0]?.key ?? 'overview');

  const params = {
    from: fromDateInputValue(from, false),
    to: fromDateInputValue(to, true),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.kpi(params),
    queryFn: () => fetchKpiOverview(params),
  });

  return (
    <PermissionGate anyOf={[PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW]}>
      <Box>
        <ReportsPageHeader
          title="مؤشرات الأداء"
          subtitle="لوحة مؤشرات الأداء التشغيلية للحوادث والجولات والورديات والمراقبة"
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} className="no-print">
          <TextField
            label="من"
            type="date"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="إلى"
            type="date"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>

        <Tabs
          value={visibleTabs.some((t) => t.key === tab) ? tab : visibleTabs[0]?.key}
          onChange={(_, v: TabKey) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ mb: 2 }}
          className="no-print"
        >
          {visibleTabs.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>

        {isLoading ? <ReportsCardsSkeleton count={6} /> : null}
        {isError ? (
          <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المؤشرات.'}</Alert>
        ) : null}
        {data ? renderTab(tab, data) : null}
        {!isLoading && !isError && !data ? (
          <Alert severity="info">لا توجد مؤشرات ضمن الفترة المحددة.</Alert>
        ) : null}
      </Box>
    </PermissionGate>
  );
}
