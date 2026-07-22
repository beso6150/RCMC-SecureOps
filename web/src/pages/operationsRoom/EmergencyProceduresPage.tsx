import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listEmergencyProcedures,
  OPS_ROOM_QUERY_KEYS,
  setEmergencyProcedureActive,
} from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsTableSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import { OPS_SEVERITY_LABELS } from '../../types/operationsRoom';

export function EmergencyProceduresPage() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const queryClient = useQueryClient();
  const canView = hasPermission(perms, [
    PermissionCodes.EMERGENCY_PROCEDURES_VIEW,
    PermissionCodes.EMERGENCY_PROCEDURES_MANAGE,
    PermissionCodes.INCIDENTS_READ,
  ]);
  const canManage = hasPermission(perms, [PermissionCodes.EMERGENCY_PROCEDURES_MANAGE]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.procedures(canManage),
    queryFn: () => listEmergencyProcedures(canManage),
    enabled: canView,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setEmergencyProcedureActive(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPS_ROOM_QUERY_KEYS.procedures(canManage) });
    },
  });

  if (!canView) {
    return (
      <Box>
        <OpsRoomPageHeader title="إجراءات الطوارئ" />
        <Alert severity="warning">ليس لديك صلاحية عرض إجراءات الطوارئ.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <OpsRoomPageHeader
        title="إجراءات الطوارئ"
        subtitle="إرشادات الاستجابة السريعة حسب نوع البلاغ ودرجة الخطورة"
      />

      {isLoading ? <OpsTableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">
          {(error as Error)?.message ?? 'تعذّر تحميل إجراءات الطوارئ.'}
        </Alert>
      ) : null}
      {data && data.length === 0 ? (
        <Alert severity="info">لا توجد إجراءات طوارئ مسجّلة.</Alert>
      ) : null}

      {data && data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الرمز</TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell>نوع البلاغ</TableCell>
                <TableCell>الخطورة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الوصف</TableCell>
                {canManage ? <TableCell align="center">إجراء</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.code}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell>{row.incidentTypeCode}</TableCell>
                  <TableCell>
                    {row.severity ? OPS_SEVERITY_LABELS[row.severity] : 'الكل'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={row.isActive ? 'success' : 'default'}
                      label={row.isActive ? 'مفعّل' : 'معطّل'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 320 }} noWrap>
                      {row.description}
                    </Typography>
                  </TableCell>
                  {canManage ? (
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={toggleMut.isPending}
                        onClick={() =>
                          toggleMut.mutate({ id: row.id, isActive: !row.isActive })
                        }
                      >
                        {row.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      {canManage ? (
        <Stack sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            إدارة كاملة لإنشاء/تعديل الإجراءات تتم عبر واجهة الإدارة عند توفرها.
          </Typography>
        </Stack>
      ) : null}
    </Box>
  );
}
