import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Link,
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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  INCIDENTS_QUERY_KEYS,
  assignIncident,
  closeIncident,
  listIncidents,
  startIncident,
} from '../../api/incidents';
import { ElapsedTimer } from '../../components/cctv/ElapsedTimer';
import { PriorityChip, QueueStatusChip } from '../../components/cctv/QueueStatusChip';
import {
  INCIDENT_STATUS_LABELS,
  OPEN_INCIDENT_STATUSES,
  SEVERITY_LABELS,
} from '../../components/cctv/cctvLabels';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';

const REFETCH_MS = 60_000;

interface CctvIncidentsQueuePageProps {
  typeCode?: string;
  title?: string;
}

export function CctvIncidentsQueuePage({
  typeCode,
  title = 'طابور البلاغات المباشرة',
}: CctvIncidentsQueuePageProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const canAssign = hasPermission(user?.permissions ?? [], [PermissionCodes.INCIDENTS_HANDLE]);
  const canStart = hasPermission(user?.permissions ?? [], [PermissionCodes.INCIDENTS_HANDLE]);
  const canClose = hasPermission(user?.permissions ?? [], [PermissionCodes.INCIDENTS_CLOSE]);

  const listParams = { pageSize: 50, ...(typeCode ? { typeCode } : {}) };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: INCIDENTS_QUERY_KEYS.list(listParams),
    queryFn: () => listIncidents(listParams),
    refetchInterval: REFETCH_MS,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['incidents'] });
    void queryClient.invalidateQueries({ queryKey: ['cctv'] });
  };

  const assignMutation = useMutation({
    mutationFn: (id: string) => assignIncident(id, {}),
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const startMutation = useMutation({
    mutationFn: startIncident,
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeIncident(id, {}),
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  let rows =
    data?.data.filter((i) =>
      OPEN_INCIDENT_STATUSES.includes(i.status as (typeof OPEN_INCIDENT_STATUSES)[number]),
    ) ?? [];

  if (typeCode) {
    rows = rows.filter((i) => i.type.code === typeCode);
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل البلاغات.'}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {title} ({rows.length})
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
              <TableCell>البلاغ</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>المُبلّغ</TableCell>
              <TableCell>المشرف</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المدة</TableCell>
              <TableCell align="left">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد بلاغات مفتوحة</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.id.slice(0, 8)}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.type.nameAr}</TableCell>
                  <TableCell>
                    <PriorityChip
                      label={SEVERITY_LABELS[row.severity] ?? row.severity}
                      severity={row.severity}
                    />
                  </TableCell>
                  <TableCell>{row.reporter.fullName}</TableCell>
                  <TableCell>{row.supervisor?.fullName ?? '—'}</TableCell>
                  <TableCell>
                    <QueueStatusChip
                      label={INCIDENT_STATUS_LABELS[row.status] ?? row.status}
                      status={row.status}
                    />
                  </TableCell>
                  <TableCell>
                    <ElapsedTimer since={row.createdAt} />
                  </TableCell>
                  <TableCell align="left">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-start' }}>
                      <Tooltip title="فتح">
                        <IconButton
                          size="small"
                          component={Link}
                          href={`/incidents?id=${row.id}`}
                          target="_blank"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
                      {canClose && row.status !== 'CLOSED' && row.status !== 'CANCELLED' ? (
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
