import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  VIOLATIONS_QUERY_KEYS,
  assignViolation,
  closeViolation,
  listViolations,
  startViolation,
} from '../../api/violations';
import { ElapsedTimer } from '../../components/cctv/ElapsedTimer';
import { PriorityChip, QueueStatusChip } from '../../components/cctv/QueueStatusChip';
import {
  OPEN_VIOLATION_STATUSES,
  PARKING_LABELS,
  SEVERITY_LABELS,
  VIOLATION_STATUS_LABELS,
  VIOLATION_TYPE_LABELS,
} from '../../components/cctv/cctvLabels';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type { Violation } from '../../types/cctv';

const REFETCH_MS = 60_000;

function violationPriority(v: Violation): string {
  const highTypes = ['BLOCKING', 'UNAUTHORIZED_ZONE'];
  return highTypes.includes(v.violationType) ? 'HIGH' : 'MEDIUM';
}

export function CctvViolationsQueuePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const canAssign = hasPermission(user?.permissions ?? [], [PermissionCodes.VIOLATIONS_ASSIGN]);
  const canStart = hasPermission(user?.permissions ?? [], [PermissionCodes.VIOLATIONS_UPDATE]);
  const canClose = hasPermission(user?.permissions ?? [], [PermissionCodes.VIOLATIONS_CLOSE]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.list({ pageSize: 50 }),
    queryFn: () => listViolations({ pageSize: 50 }),
    refetchInterval: REFETCH_MS,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['violations'] });
    void queryClient.invalidateQueries({ queryKey: ['cctv'] });
  };

  const assignMutation = useMutation({
    mutationFn: (id: string) => assignViolation(id, {}),
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const startMutation = useMutation({
    mutationFn: startViolation,
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeViolation(id, { status: 'RESOLVED' }),
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const rows =
    data?.data.filter((v) =>
      OPEN_VIOLATION_STATUSES.includes(v.status as (typeof OPEN_VIOLATION_STATUSES)[number]),
    ) ?? [];

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المخالفات.'}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        طابور مخالفات المركبات ({rows.length})
      </Typography>

      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>اللوحة</TableCell>
              <TableCell>الموقف</TableCell>
              <TableCell>المُبلّغ</TableCell>
              <TableCell>المُسند إليه</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المدة</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell align="left">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد مخالفات مفتوحة</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const priority = violationPriority(row);
                const assignee = row.supervisor?.fullName ?? row.cctvOperator?.fullName ?? '—';
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.plateNumber}</TableCell>
                    <TableCell>{PARKING_LABELS[row.parkingCode] ?? row.parkingCode}</TableCell>
                    <TableCell>{row.createdBy.fullName}</TableCell>
                    <TableCell>{assignee}</TableCell>
                    <TableCell>
                      <QueueStatusChip
                        label={VIOLATION_STATUS_LABELS[row.status] ?? row.status}
                        status={row.status}
                      />
                    </TableCell>
                    <TableCell>
                      <ElapsedTimer since={row.createdAt} />
                    </TableCell>
                    <TableCell>
                      <PriorityChip
                        label={SEVERITY_LABELS[priority] ?? VIOLATION_TYPE_LABELS[row.violationType]}
                        severity={priority}
                      />
                    </TableCell>
                    <TableCell align="left">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-start' }}>
                        {canAssign && row.status === 'NEW' ? (
                          <Tooltip title="إسناد">
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={assignMutation.isPending}
                              onClick={() => assignMutation.mutate(row.id)}
                            >
                              <AssignmentIndIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        {canStart && (row.status === 'ASSIGNED' || row.status === 'NEW') ? (
                          <Tooltip title="بدء">
                            <IconButton
                              size="small"
                              color="secondary"
                              disabled={startMutation.isPending}
                              onClick={() => startMutation.mutate(row.id)}
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        {canClose && row.status !== 'RESOLVED' && row.status !== 'CANCELLED' ? (
                          <Tooltip title="إغلاق">
                            <IconButton
                              size="small"
                              color="success"
                              disabled={closeMutation.isPending}
                              onClick={() => closeMutation.mutate(row.id)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
