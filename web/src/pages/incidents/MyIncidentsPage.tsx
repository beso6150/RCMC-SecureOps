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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  acknowledgeIncident,
  arriveIncident,
  containIncident,
  listOpsIncidents,
  OPS_ROOM_QUERY_KEYS,
  resolveOpsIncident,
  respondIncident,
} from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsCardsSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import { OpsSeverityChip, OpsStatusChip } from '../../components/operationsRoom/OpsStatusChips';

export function MyIncidentsPage() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const queryClient = useQueryClient();
  const canView = hasPermission(perms, [
    PermissionCodes.INCIDENTS_VIEW_ASSIGNED,
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_VIEW_ALL,
  ]);
  const canAck = hasPermission(perms, [
    PermissionCodes.INCIDENTS_ACKNOWLEDGE,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canRespond = hasPermission(perms, [
    PermissionCodes.INCIDENTS_RESPOND,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canArrive = hasPermission(perms, [
    PermissionCodes.INCIDENTS_ARRIVE,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canContain = hasPermission(perms, [
    PermissionCodes.INCIDENTS_CONTAIN,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canResolve = hasPermission(perms, [
    PermissionCodes.INCIDENTS_RESOLVE,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.incidents({ mine: true, pageSize: 50 }),
    queryFn: () => listOpsIncidents({ mine: true, pageSize: 50 }),
    enabled: canView,
    refetchInterval: 12_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: OPS_ROOM_QUERY_KEYS.all });
    void queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  const actionMut = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'ack' | 'respond' | 'arrive' | 'contain' | 'resolve';
    }) => {
      if (action === 'ack') return acknowledgeIncident(id);
      if (action === 'respond') return respondIncident(id);
      if (action === 'arrive') return arriveIncident(id);
      if (action === 'contain') return containIncident(id);
      return resolveOpsIncident(id, { resolutionSummary: 'تم الحل من الميدان' });
    },
    onSuccess: invalidate,
  });

  if (!canView) {
    return (
      <Box>
        <OpsRoomPageHeader title="الحوادث المسندة إليّ" />
        <Alert severity="warning">ليس لديك صلاحية عرض الحوادث المسندة.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <OpsRoomPageHeader
        title="الحوادث المسندة إليّ"
        subtitle="إجراءات سريعة لرجل الأمن خلال الوردية"
      />

      {isLoading ? <OpsCardsSkeleton count={3} /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الحوادث المسندة.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? (
        <Alert severity="info">لا توجد حوادث مسندة إليك حالياً.</Alert>
      ) : null}

      <Grid container spacing={2}>
        {(data?.data ?? []).map((row) => (
          <Grid key={row.id} size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {row.incidentNumber ?? 'بلاغ'} — {row.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <OpsStatusChip status={row.status} />
                    <OpsSeverityChip severity={row.severity} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {row.type?.nameAr ?? '—'}
                  </Typography>
                </Stack>
              </CardContent>
              <CardActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
                {canAck && ['NEW', 'REPORTED', 'ASSIGNED', 'ESCALATED'].includes(row.status) ? (
                  <Button
                    size="large"
                    variant="contained"
                    disabled={actionMut.isPending}
                    onClick={() => actionMut.mutate({ id: row.id, action: 'ack' })}
                  >
                    اعتماد
                  </Button>
                ) : null}
                {canRespond && ['ASSIGNED', 'ACKNOWLEDGED'].includes(row.status) ? (
                  <Button
                    size="large"
                    variant="contained"
                    disabled={actionMut.isPending}
                    onClick={() => actionMut.mutate({ id: row.id, action: 'respond' })}
                  >
                    استجابة
                  </Button>
                ) : null}
                {canArrive && row.status === 'RESPONDING' ? (
                  <Button
                    size="large"
                    variant="contained"
                    disabled={actionMut.isPending}
                    onClick={() => actionMut.mutate({ id: row.id, action: 'arrive' })}
                  >
                    وصول
                  </Button>
                ) : null}
                {canContain && ['ON_SCENE', 'IN_PROGRESS'].includes(row.status) ? (
                  <Button
                    size="large"
                    variant="contained"
                    disabled={actionMut.isPending}
                    onClick={() => actionMut.mutate({ id: row.id, action: 'contain' })}
                  >
                    احتواء
                  </Button>
                ) : null}
                {canResolve && ['CONTAINED', 'ON_SCENE', 'IN_PROGRESS'].includes(row.status) ? (
                  <Button
                    size="large"
                    color="success"
                    variant="contained"
                    disabled={actionMut.isPending}
                    onClick={() => actionMut.mutate({ id: row.id, action: 'resolve' })}
                  >
                    حل
                  </Button>
                ) : null}
                <Button component={RouterLink} to={`/incidents/${row.id}`} size="large">
                  التفاصيل
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
