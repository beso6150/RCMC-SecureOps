import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns';
import SecurityIcon from '@mui/icons-material/Security';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { CCTV_OPS_QUERY_KEYS, fetchCctvOpsDashboard } from '../../api/cctvOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import { CardsSkeleton } from '../../components/cctvOperations/CctvOpsSkeletons';
import {
  REFERRAL_SEVERITY_LABELS,
  REFERRAL_STATUS_LABELS,
} from '../../types/cctvOperations';

const SECTIONS = [
  {
    title: 'التصاريح',
    path: '/cctv-operations/permits',
    icon: AssignmentIcon,
    permission: PermissionCodes.PERMITS_VIEW,
    description: 'إنشاء ومشاركة ومتابعة تصاريح الدخول',
  },
  {
    title: 'الإحالات الأمنية',
    path: '/cctv-operations/referrals',
    icon: SecurityIcon,
    permission: PermissionCodes.SECURITY_REFERRALS_VIEW,
    description: 'إنشاء وإرسال ومتابعة الإحالات الميدانية',
  },
  {
    title: 'متابعة الحالات',
    path: '/cctv-operations/follow-up',
    icon: FollowTheSignsIcon,
    permission: PermissionCodes.SECURITY_REFERRALS_VIEW,
    description: 'الحالات التي تحتاج متابعة من مشغلة المراقبة',
  },
  {
    title: 'إحصائيات عمليات المراقبة',
    path: '/cctv-operations/statistics',
    icon: BarChartIcon,
    permission: PermissionCodes.CCTV_OPS_DASHBOARD_VIEW,
    description: 'مؤشرات التصاريح والإحالات',
  },
] as const;

export function CctvOpsOverviewPage() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.dashboard,
    queryFn: fetchCctvOpsDashboard,
    refetchInterval: 30_000,
    enabled: hasPermission(permissions, [PermissionCodes.CCTV_OPS_DASHBOARD_VIEW]),
  });

  const visibleSections = SECTIONS.filter((s) => hasPermission(permissions, [s.permission]));

  return (
    <Box>
      <CctvOpsPageHeader
        title="مركز عمليات المراقبة"
        subtitle="لوحة مشغلة المراقبة للتصاريح والإحالات الأمنية"
      />

      {isLoading ? <CardsSkeleton count={4} /> : null}

      {isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error)?.message ?? 'تعذّر تحميل مركز عمليات المراقبة.'}
        </Alert>
      ) : null}

      {data ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'تصاريح نشطة', value: data.activePermits },
            { label: 'مسودات تصاريح', value: data.draftPermits },
            { label: 'مشاركات اليوم', value: data.sharedPermitsToday },
            { label: 'إحالات مفتوحة', value: data.openReferrals },
            { label: 'مُرسلة', value: data.sentReferrals },
            { label: 'قيد المعالجة', value: data.inProgressReferrals },
            { label: 'مصعّدة', value: data.escalatedReferrals },
            { label: 'محلول اليوم', value: data.resolvedToday },
            { label: 'تحتاج متابعة', value: data.needsFollowUp },
            { label: 'حرجة مفتوحة', value: data.criticalOpen },
          ].map((card) => (
            <Grid key={card.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
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

      {!isLoading && !isError && !data ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          لا توجد بيانات حالياً.
        </Alert>
      ) : null}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        الأقسام
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Grid key={section.path} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                    <Icon color="secondary" />
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

      {data?.recentReferrals?.length ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            أحدث الإحالات
          </Typography>
          <Stack spacing={1}>
            {data.recentReferrals.slice(0, 5).map((r) => (
              <Card key={r.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {r.referralNumber} — {r.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {REFERRAL_STATUS_LABELS[r.status]} ·{' '}
                        {REFERRAL_SEVERITY_LABELS[r.severity]}
                      </Typography>
                    </Box>
                    <Button
                      component={RouterLink}
                      to={`/cctv-operations/referrals/${r.id}`}
                      size="small"
                    >
                      تفاصيل
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}
