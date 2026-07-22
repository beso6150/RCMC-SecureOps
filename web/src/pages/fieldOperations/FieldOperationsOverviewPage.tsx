import MapIcon from '@mui/icons-material/Map';
import RouteIcon from '@mui/icons-material/Route';
import PlaceIcon from '@mui/icons-material/Place';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LayersIcon from '@mui/icons-material/Layers';
import BarChartIcon from '@mui/icons-material/BarChart';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { fetchFieldOpsOverview, FIELD_OPS_QUERY_KEYS } from '../../api/fieldOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { CardsSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import { ALERT_SEVERITY_LABELS, PATROL_STATUS_LABELS } from '../../types/fieldOperations';
import { useOnlineStatus } from '../../hooks/usePatrolOfflineSync';

const SECTIONS = [
  {
    title: 'الخريطة الأمنية',
    path: '/field-operations/map',
    icon: MapIcon,
    permission: PermissionCodes.FIELD_MAP_VIEW,
    description: 'عرض المناطق والأفراد والبلاغات والتنبيهات',
  },
  {
    title: 'الجولات الأمنية',
    path: '/field-operations/patrols',
    icon: DirectionsWalkIcon,
    permission: PermissionCodes.PATROL_SESSIONS_VIEW,
    description: 'إنشاء وإسناد وبدء وإكمال الجولات',
  },
  {
    title: 'مسارات الجولات',
    path: '/field-operations/patrols/routes',
    icon: RouteIcon,
    permission: PermissionCodes.PATROL_ROUTES_VIEW,
    description: 'إدارة مسارات نقاط التفتيش',
  },
  {
    title: 'النقاط الأمنية',
    path: '/field-operations/checkpoints',
    icon: PlaceIcon,
    permission: PermissionCodes.CHECKPOINTS_VIEW,
    description: 'CRUD وQR وموضع على الخريطة',
  },
  {
    title: 'التنبيهات الميدانية',
    path: '/field-operations/alerts',
    icon: NotificationsActiveIcon,
    permission: PermissionCodes.FIELD_ALERTS_VIEW,
    description: 'متابعة التنبيهات ونداءات الاستغاثة',
  },
  {
    title: 'المواقع والمناطق',
    path: '/field-operations/zones',
    icon: LayersIcon,
    permission: PermissionCodes.SECURITY_ZONES_VIEW,
    description: 'إدارة المناطق والطوابق والمواقف',
  },
  {
    title: 'الإحصائيات',
    path: '/field-operations/statistics',
    icon: BarChartIcon,
    permission: PermissionCodes.FIELD_MAP_VIEW,
    description: 'مؤشرات الجولات والتنبيهات',
  },
] as const;

export function FieldOperationsOverviewPage() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const permissions = user?.permissions ?? [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.overview,
    queryFn: fetchFieldOpsOverview,
    refetchInterval: 30_000,
  });

  const visibleSections = SECTIONS.filter((s) => hasPermission(permissions, [s.permission]));

  return (
    <Box>
      <FieldOpsPageHeader
        title="العمليات الميدانية"
        subtitle="نظرة عامة على الخريطة والجولات والنقاط والتنبيهات"
        actions={
          <Chip
            size="small"
            color={online ? 'success' : 'warning'}
            label={online ? 'متصل' : 'غير متصل'}
          />
        }
      />

      {isLoading ? <CardsSkeleton count={4} /> : null}

      {isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error)?.message ?? 'تعذّر تحميل نظرة العمليات الميدانية.'}
        </Alert>
      ) : null}

      {data ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'تنبيهات مفتوحة', value: data.openAlerts },
            { label: 'تنبيهات حرجة', value: data.criticalAlerts },
            { label: 'جولات نشطة', value: data.activePatrols },
            { label: 'جولات مكتملة اليوم', value: data.completedPatrolsToday },
            { label: 'متأخرة / فائتة', value: data.lateOrMissedPatrols },
            { label: 'متاحون', value: data.availablePersonnel ?? 0 },
            { label: 'مشغولون', value: data.busyPersonnel ?? 0 },
            { label: 'نقاط نشطة', value: data.activeCheckpoints },
            { label: 'مناطق نشطة', value: data.activeZones },
            { label: 'أفراد على الخريطة', value: data.personnelOnline },
            { label: 'بلاغات مفتوحة', value: data.openIncidentsOnMap },
          ].map((card) => (
            <Grid key={card.label} size={{ xs: 6, sm: 4, md: 3 }}>
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
            <Grid key={section.path} size={{ xs: 12, sm: 6, md: 4 }}>
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

      {data?.recentAlerts?.length ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            أحدث التنبيهات
          </Typography>
          <Stack spacing={1}>
            {data.recentAlerts.slice(0, 5).map((a) => (
              <Card key={a.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {a.title}
                    </Typography>
                    <Chip size="small" label={ALERT_SEVERITY_LABELS[a.severity]} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      ) : null}

      {data?.recentPatrols?.length ? (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            أحدث الجولات
          </Typography>
          <Stack spacing={1}>
            {data.recentPatrols.slice(0, 5).map((p) => (
              <Card key={p.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.route?.name ?? 'جولة'} · {p.assignedUser?.fullName ?? 'غير مُسند'}
                    </Typography>
                    <Chip size="small" label={PATROL_STATUS_LABELS[p.status]} />
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
