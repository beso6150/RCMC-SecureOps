import {
  Alert,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { listOpsIncidents, OPS_ROOM_QUERY_KEYS } from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsTableSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import { OpsSeverityChip, OpsStatusChip } from '../../components/operationsRoom/OpsStatusChips';

export function IncidentFollowUpPage() {
  const { user } = useAuth();
  const canView = hasPermission(user?.permissions ?? [], [
    PermissionCodes.INCIDENTS_FOLLOW_UPS,
    PermissionCodes.INCIDENTS_VIEW_ALL,
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.OPERATIONS_ROOM_VIEW,
  ]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.incidents({ pageSize: 100, status: 'RESOLVED' }),
    queryFn: async () => {
      const [resolved, closed, all] = await Promise.all([
        listOpsIncidents({ pageSize: 50, status: 'RESOLVED' }),
        listOpsIncidents({ pageSize: 50, status: 'CLOSED' }),
        listOpsIncidents({ pageSize: 50 }),
      ]);
      const merged = [...resolved.data, ...closed.data, ...all.data];
      const byId = new Map(merged.map((r) => [r.id, r]));
      const rows = [...byId.values()].filter((r) => r.requiresFollowUp);
      return { data: rows, meta: { page: 1, pageSize: rows.length, total: rows.length } };
    },
    enabled: canView,
    refetchInterval: 30_000,
  });

  if (!canView) {
    return (
      <Box>
        <OpsRoomPageHeader title="المتابعة اللاحقة" />
        <Alert severity="warning">ليس لديك صلاحية عرض المتابعة اللاحقة.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <OpsRoomPageHeader
        title="المتابعة اللاحقة"
        subtitle="بلاغات تتطلب متابعة بعد الحل أو الإغلاق"
      />

      {isLoading ? <OpsTableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المتابعة.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? (
        <Alert severity="info">لا توجد حالات تحتاج متابعة لاحقة.</Alert>
      ) : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الرقم</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الخطورة</TableCell>
                <TableCell>استحقاق المتابعة</TableCell>
                <TableCell align="center">فتح</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.incidentNumber ?? '—'}</TableCell>
                  <TableCell>
                    {row.title} <Chip size="small" color="warning" label="متابعة" sx={{ ml: 1 }} />
                  </TableCell>
                  <TableCell>
                    <OpsStatusChip status={row.status} />
                  </TableCell>
                  <TableCell>
                    <OpsSeverityChip severity={row.severity} />
                  </TableCell>
                  <TableCell>
                    {row.followUpDueAt
                      ? new Date(row.followUpDueAt).toLocaleString('ar-SA')
                      : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Button component={RouterLink} to={`/incidents/${row.id}`} size="small">
                      تفاصيل
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
