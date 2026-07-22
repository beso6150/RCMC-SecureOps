import {
  Alert,
  Box,
  Button,
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

export function CriticalIncidentsPage() {
  const { user } = useAuth();
  const canView = hasPermission(user?.permissions ?? [], [
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_VIEW_ALL,
    PermissionCodes.OPERATIONS_ROOM_VIEW,
  ]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.incidents({ severity: 'CRITICAL', pageSize: 50 }),
    queryFn: () => listOpsIncidents({ severity: 'CRITICAL', pageSize: 50 }),
    enabled: canView,
    refetchInterval: 10_000,
  });

  if (!canView) {
    return (
      <Box>
        <OpsRoomPageHeader title="الحالات الحرجة" />
        <Alert severity="warning">ليس لديك صلاحية عرض الحالات الحرجة.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <OpsRoomPageHeader
        title="الحالات الحرجة"
        subtitle="بلاغات بدرجة خطورة حرجة تتطلب انتباهاً فورياً في الوردية"
      />

      {isLoading ? <OpsTableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الحالات الحرجة.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? (
        <Alert severity="info">لا توجد حالات حرجة حالياً.</Alert>
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
                <TableCell>المُسند</TableCell>
                <TableCell align="center">فتح</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.incidentNumber ?? '—'}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <OpsStatusChip status={row.status} />
                  </TableCell>
                  <TableCell>
                    <OpsSeverityChip severity={row.severity} />
                  </TableCell>
                  <TableCell>{row.assignee?.fullName ?? '—'}</TableCell>
                  <TableCell align="center">
                    <Button component={RouterLink} to={`/incidents/${row.id}`} size="small" color="error">
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
