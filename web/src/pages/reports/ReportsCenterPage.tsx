import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BuildIcon from '@mui/icons-material/Build';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SecurityIcon from '@mui/icons-material/Security';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { fetchReportsDashboard, REPORTS_CENTER_QUERY_KEYS } from '../../api/reportsCenter';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { ReportsCardsSkeleton } from '../../components/reports/ReportsSkeletons';
import { EmptyState, PermissionGate } from '../../components/reports/ReportsStates';
import type { ReportPeriod } from '../../types/reportsCenter';
import {
  PERIOD_LABELS,
  SAVED_REPORT_STATUS_LABELS,
  SAVED_REPORT_TYPE_LABELS,
} from '../../types/reportsCenter';

const SECTIONS = [
  {
    title: 'التقرير الأمني اليومي',
    path: '/reports/daily',
    icon: SecurityIcon,
    permissions: [PermissionCodes.REPORTS_GENERATE_DAILY, PermissionCodes.REPORTS_GENERATE, PermissionCodes.REPORTS_VIEW],
    description: 'ملخص العمليات الأمنية لليوم',
  },
  {
    title: 'تقارير الورديات',
    path: '/reports/shifts',
    icon: ScheduleIcon,
    permissions: [PermissionCodes.REPORTS_GENERATE_SHIFT, PermissionCodes.REPORTS_GENERATE, PermissionCodes.REPORTS_VIEW],
    description: 'تقارير أداء وملخص الوردية',
  },
  {
    title: 'تسليم واستلام الوردية',
    path: '/reports/handover',
    icon: SwapHorizIcon,
    permissions: [PermissionCodes.REPORTS_GENERATE_HANDOVER, PermissionCodes.REPORTS_GENERATE_SHIFT, PermissionCodes.REPORTS_VIEW],
    description: 'تقرير تسليم واستلام الوردية',
  },
  {
    title: 'مؤشرات الأداء',
    path: '/reports/performance',
    icon: AutoGraphIcon,
    permissions: [PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
    description: 'لوحة مؤشرات الأداء التشغيلية',
  },
  {
    title: 'منشئ التقارير المخصص',
    path: '/reports/custom',
    icon: BuildIcon,
    permissions: [PermissionCodes.REPORTS_GENERATE_CUSTOM],
    description: 'بناء تقرير من مصادر بيانات مسموحة',
  },
  {
    title: 'التقارير المحفوظة',
    path: '/reports/saved',
    icon: BookmarkIcon,
    permissions: [PermissionCodes.REPORTS_LIST, PermissionCodes.REPORTS_VIEW],
    description: 'عرض واعتماد وتصدير التقارير',
  },
  {
    title: 'جدولة التقارير',
    path: '/reports/schedules',
    icon: AssessmentIcon,
    permissions: [PermissionCodes.REPORTS_SCHEDULES_VIEW, PermissionCodes.REPORTS_SCHEDULES_MANAGE],
    description: 'جدولة التوليد التلقائي للتقارير',
  },
  {
    title: 'سجلات التدقيق',
    path: '/audit-logs',
    icon: HistoryIcon,
    permissions: [PermissionCodes.AUDIT_LOGS_VIEW, PermissionCodes.AUDIT_READ],
    description: 'مراجعة أحداث النظام الحساسة',
  },
] as const;

const READY_LINKS = [
  { label: 'الحوادث', path: '/reports/incidents' },
  { label: 'الجولات', path: '/reports/patrols' },
  { label: 'إحالات المراقبة', path: '/reports/cctv-referrals' },
  { label: 'التصاريح', path: '/reports/permits' },
  { label: 'الزوار', path: '/reports/visitors' },
  { label: 'مخالفات المركبات', path: '/reports/vehicle-violations' },
] as const;

export function ReportsCenterPage() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const [period, setPeriod] = useState<ReportPeriod>('daily');

  const canViewDashboard = hasPermission(permissions, [PermissionCodes.REPORTS_DASHBOARD_VIEW]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.dashboard(period),
    queryFn: () => fetchReportsDashboard(period),
    enabled: canViewDashboard,
    refetchInterval: 60_000,
  });

  const visibleSections = SECTIONS.filter((s) => hasPermission(permissions, [...s.permissions]));

  return (
    <PermissionGate
      anyOf={[
        PermissionCodes.REPORTS_DASHBOARD_VIEW,
        PermissionCodes.REPORTS_VIEW,
        PermissionCodes.REPORTS_LIST,
        PermissionCodes.REPORTS_READ,
        PermissionCodes.REPORTS_KPI_VIEW,
        PermissionCodes.KPI_VIEW,
      ]}
    >
      <Box>
        <ReportsPageHeader
          title="مركز التقارير"
          subtitle="توليد ومتابعة التقارير الأمنية ومؤشرات الأداء"
          actions={
            canViewDashboard ? (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الفترة</InputLabel>
                <Select
                  label="الفترة"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                >
                  {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
                    <MenuItem key={p} value={p}>
                      {PERIOD_LABELS[p]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null
          }
        />

        {canViewDashboard && isLoading ? <ReportsCardsSkeleton count={6} /> : null}
        {canViewDashboard && isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(error as Error)?.message ?? 'تعذّر تحميل لوحة التقارير.'}
          </Alert>
        ) : null}

        {data ? (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'حوادث الفترة', value: data.summary.incidents },
              { label: 'حوادث مفتوحة', value: data.summary.openIncidents },
              { label: 'مخالفات', value: data.summary.violations },
              { label: 'زوار', value: data.summary.visitors },
              { label: 'بانتظار الاعتماد', value: data.pendingApproval },
              {
                label: 'متوسط الاستجابة (د)',
                value: data.summary.averageResponseMinutes ?? '—',
              },
            ].map((card) => (
              <Grid key={card.label} size={{ xs: 6, sm: 4, md: 2 }}>
                <Card sx={{ height: '100%' }}>
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
        ) : null}

        {!canViewDashboard ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            يمكنك الوصول إلى التقارير المتاحة حسب صلاحياتك من الأقسام أدناه.
          </Alert>
        ) : null}

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          الأقسام
        </Typography>
        {visibleSections.length === 0 ? (
          <EmptyState message="لا توجد أقسام تقارير متاحة لصلاحياتك." />
        ) : (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {visibleSections.map((section) => {
              const Icon = section.icon;
              return (
                <Grid key={section.path} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                        <Icon color="primary" />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {section.title}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {section.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button component={RouterLink} to={section.path} size="small">
                        فتح
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          تقارير جاهزة
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {READY_LINKS.map((link) => (
            <Button
              key={link.path}
              component={RouterLink}
              to={link.path}
              variant="outlined"
              size="small"
            >
              {link.label}
            </Button>
          ))}
        </Stack>

        {data?.recentReports?.length ? (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              أحدث التقارير
            </Typography>
            <Stack spacing={1}>
              {data.recentReports.map((report) => (
                <Card key={report.id} variant="outlined">
                  <CardContent
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                      flexWrap: 'wrap',
                      py: 1.5,
                      '&:last-child': { pb: 1.5 },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{report.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.reportNumber} —{' '}
                        {SAVED_REPORT_TYPE_LABELS[report.reportType] ?? report.reportType} —{' '}
                        {SAVED_REPORT_STATUS_LABELS[report.status] ?? report.status}
                      </Typography>
                    </Box>
                    <Button
                      component={RouterLink}
                      to={`/reports/saved/${report.id}`}
                      size="small"
                    >
                      عرض
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </>
        ) : null}
      </Box>
    </PermissionGate>
  );
}
