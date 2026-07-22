import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  fetchOpsRoomDashboard,
  fetchOpsRoomLive,
  OPS_ROOM_QUERY_KEYS,
} from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsCardsSkeleton, OpsTableSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import { OpsSeverityChip, OpsStatusChip } from '../../components/operationsRoom/OpsStatusChips';
import { OPS_INCIDENT_STATUS_LABELS } from '../../types/operationsRoom';

export function OperationsRoomPage() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const canView = hasPermission(perms, [
    PermissionCodes.OPERATIONS_ROOM_VIEW,
    PermissionCodes.OPERATIONS_ROOM_MANAGE,
    PermissionCodes.INCIDENTS_VIEW_ALL,
  ]);
  const canCreate = hasPermission(perms, [PermissionCodes.INCIDENTS_CREATE]);

  const dashboardQuery = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.dashboard,
    queryFn: fetchOpsRoomDashboard,
    refetchInterval: 15_000,
    enabled: canView,
  });

  const liveQuery = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.live(50),
    queryFn: () => fetchOpsRoomLive(50),
    refetchInterval: 10_000,
    enabled: canView,
  });

  if (!canView) {
    return (
      <Box>
        <OpsRoomPageHeader title="غرفة العمليات الأمنية" />
        <Alert severity="warning">ليس لديك صلاحية عرض غرفة العمليات.</Alert>
      </Box>
    );
  }

  const summary = dashboardQuery.data?.summary;

  return (
    <Box>
      <OpsRoomPageHeader
        title="غرفة العمليات الأمنية"
        subtitle="متابعة مباشرة للبلاغات والحوادث خلال الوردية"
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {canCreate ? (
              <Button
                component={RouterLink}
                to="/incidents/new"
                variant="contained"
                startIcon={<AddIcon />}
              >
                تسجيل حادث
              </Button>
            ) : null}
            <Button component={RouterLink} to="/incidents/critical" color="error" startIcon={<WarningAmberIcon />}>
              الحالات الحرجة
            </Button>
            <Button component={RouterLink} to="/incidents" variant="outlined">
              كل البلاغات
            </Button>
          </Stack>
        }
      />

      {dashboardQuery.isLoading ? <OpsCardsSkeleton count={7} /> : null}
      {dashboardQuery.isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(dashboardQuery.error as Error)?.message ?? 'تعذّر تحميل لوحة غرفة العمليات.'}
        </Alert>
      ) : null}

      {summary ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'مفتوحة', value: summary.openCount },
            { label: 'حرجة', value: summary.criticalOpen },
            { label: 'عالية', value: summary.highOpen },
            { label: 'غير مسندة', value: summary.unassigned },
            { label: 'مُصعَّدة', value: summary.escalated },
            { label: 'اليوم', value: summary.createdToday },
            { label: 'أُغلقت اليوم', value: summary.closedToday },
          ].map((card) => (
            <Grid key={card.label} size={{ xs: 6, sm: 4, md: 1.7 }}>
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

      {dashboardQuery.data?.byStatus?.length ? (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {dashboardQuery.data.byStatus.map((row) => (
            <Card key={row.status} variant="outlined" sx={{ px: 1.5, py: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                {OPS_INCIDENT_STATUS_LABELS[row.status] ?? row.status}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {row.count}
              </Typography>
            </Card>
          ))}
        </Stack>
      ) : null}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        البلاغات الحية
      </Typography>

      {liveQuery.isLoading ? <OpsTableSkeleton /> : null}
      {liveQuery.isError ? (
        <Alert severity="error">
          {(liveQuery.error as Error)?.message ?? 'تعذّر تحميل البلاغات الحية.'}
        </Alert>
      ) : null}
      {liveQuery.data && liveQuery.data.length === 0 ? (
        <Alert severity="info">لا توجد بلاغات نشطة حالياً في الوردية.</Alert>
      ) : null}

      {liveQuery.data && liveQuery.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الرقم</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الخطورة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>المُسند</TableCell>
                <TableCell align="center">تفاصيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {liveQuery.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.incidentNumber ?? '—'}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.type?.nameAr ?? '—'}</TableCell>
                  <TableCell>
                    <OpsSeverityChip severity={row.severity} />
                  </TableCell>
                  <TableCell>
                    <OpsStatusChip status={row.status} />
                  </TableCell>
                  <TableCell>{row.assignee?.fullName ?? '—'}</TableCell>
                  <TableCell align="center">
                    <Button component={RouterLink} to={`/incidents/${row.id}`} size="small">
                      فتح
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}
