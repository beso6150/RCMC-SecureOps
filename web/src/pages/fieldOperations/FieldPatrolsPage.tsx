import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  assignPatrolSession,
  cancelPatrolSession,
  completePatrolSession,
  createPatrolSession,
  FIELD_OPS_QUERY_KEYS,
  getPatrolSession,
  listPatrolRoutes,
  listPatrolSessions,
  recordPatrolVisit,
  startPatrolSession,
} from '../../api/fieldOperations';
import { fetchShiftAssignable } from '../../api/shifts';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { TableSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import { usePatrolOfflineSync } from '../../hooks/usePatrolOfflineSync';
import { PATROL_STATUS_LABELS, type PatrolSession } from '../../types/fieldOperations';
import {
  createClientSyncId,
  enqueueOfflineVisit,
  setCurrentOfflinePatrol,
} from '../../utils/patrolOfflineQueue';

export function FieldPatrolsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const canCreate = hasPermission(perms, [PermissionCodes.PATROL_SESSIONS_CREATE]);
  const canAssign = hasPermission(perms, [PermissionCodes.PATROL_SESSIONS_ASSIGN]);
  const canStart = hasPermission(perms, [PermissionCodes.PATROL_SESSIONS_START]);
  const canComplete = hasPermission(perms, [PermissionCodes.PATROL_SESSIONS_COMPLETE]);
  const canCancel = hasPermission(perms, [PermissionCodes.PATROL_SESSIONS_CANCEL]);

  const offline = usePatrolOfflineSync(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<PatrolSession | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [routeId, setRouteId] = useState('');
  const [scheduledStartAt, setScheduledStartAt] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const listParams = useMemo(
    () => ({ pageSize: 50, ...(statusFilter ? { status: statusFilter } : {}) }),
    [statusFilter],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.patrols(listParams),
    queryFn: () => listPatrolSessions(listParams),
  });

  const { data: routes } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.routes({ pageSize: 100, isActive: true }),
    queryFn: () => listPatrolRoutes({ pageSize: 100, isActive: true }),
    enabled: createOpen,
  });

  const { data: assignable } = useQuery({
    queryKey: ['shifts', 'assignable'],
    queryFn: fetchShiftAssignable,
    enabled: Boolean(assignOpen) || createOpen,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.patrol(detailId ?? ''),
    queryFn: () => getPatrolSession(detailId!),
    enabled: Boolean(detailId),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all });

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const createMutation = useMutation({
    mutationFn: createPatrolSession,
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setRouteId('');
      setScheduledStartAt('');
      notify('تم إنشاء الجولة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإنشاء.', 'error'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedUserId }: { id: string; assignedUserId: string }) =>
      assignPatrolSession(id, { assignedUserId }),
    onSuccess: () => {
      invalidate();
      setAssignOpen(null);
      notify('تم إسناد الجولة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإسناد.', 'error'),
  });

  const startMutation = useMutation({
    mutationFn: startPatrolSession,
    onSuccess: (session) => {
      setCurrentOfflinePatrol(session);
      offline.refresh();
      invalidate();
      notify('تم بدء الجولة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر البدء.', 'error'),
  });

  const completeMutation = useMutation({
    mutationFn: completePatrolSession,
    onSuccess: () => {
      setCurrentOfflinePatrol(null);
      offline.refresh();
      invalidate();
      notify('تم إكمال الجولة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإكمال.', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelPatrolSession(id, { cancellationReason: reason || null }),
    onSuccess: () => {
      setCancelId(null);
      setCancelReason('');
      invalidate();
      notify('تم إلغاء الجولة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإلغاء.', 'error'),
  });

  const visitMutation = useMutation({
    mutationFn: async ({
      sessionId,
      checkpointId,
    }: {
      sessionId: string;
      checkpointId: string;
    }) => {
      const clientSyncId = createClientSyncId();
      if (!offline.online) {
        enqueueOfflineVisit(sessionId, {
          checkpointId,
          clientSyncId,
          verificationMethod: 'MANUAL',
          visitedAt: new Date().toISOString(),
        });
        offline.refresh();
        return null;
      }
      return recordPatrolVisit(sessionId, {
        checkpointId,
        clientSyncId,
        verificationMethod: 'MANUAL',
      });
    },
    onSuccess: (result) => {
      invalidate();
      notify(result ? 'تم تسجيل زيارة النقطة.' : 'تم حفظ الزيارة محلياً للمزامنة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر تسجيل الزيارة.', 'error'),
  });

  return (
    <Box>
      <FieldOpsPageHeader
        title="الجولات الأمنية"
        subtitle="إدارة جلسات الجولات مع دعم العمل دون اتصال"
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip
              size="small"
              color={offline.online ? 'success' : 'warning'}
              label={offline.online ? 'متصل' : 'غير متصل'}
            />
            {offline.pendingCount > 0 ? (
              <Chip
                size="small"
                color="info"
                label={`معلّق: ${offline.pendingCount}`}
                onClick={() => void offline.flush()}
              />
            ) : null}
            {canCreate ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                جولة جديدة
              </Button>
            ) : null}
          </Stack>
        }
      />

      <FormControl size="small" sx={{ minWidth: 180, mb: 2 }}>
        <InputLabel>الحالة</InputLabel>
        <Select
          label="الحالة"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="">الكل</MenuItem>
          {Object.entries(PATROL_STATUS_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الجولات.'}</Alert>
      ) : null}

      {data && data.data.length === 0 ? (
        <Alert severity="info">لا توجد جولات مطابقة.</Alert>
      ) : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>المسار</TableCell>
                <TableCell>المُسند</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الموعد</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.route?.name ?? row.routeId}</TableCell>
                  <TableCell>{row.assignedUser?.fullName ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={PATROL_STATUS_LABELS[row.status]} />
                  </TableCell>
                  <TableCell>
                    {new Date(row.scheduledStartAt).toLocaleString('ar-SA')}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="التفاصيل">
                      <IconButton size="small" onClick={() => setDetailId(row.id)}>
                        <TimelineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canAssign && (row.status === 'SCHEDULED' || row.status === 'ASSIGNED') ? (
                      <Tooltip title="إسناد">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setAssignOpen(row);
                            setAssignUserId(row.assignedUserId ?? '');
                          }}
                        >
                          <AssignmentIndIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canStart && (row.status === 'ASSIGNED' || row.status === 'SCHEDULED') ? (
                      <Tooltip title="بدء">
                        <IconButton size="small" onClick={() => startMutation.mutate(row.id)}>
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canComplete && row.status === 'IN_PROGRESS' ? (
                      <Tooltip title="إكمال">
                        <IconButton size="small" onClick={() => completeMutation.mutate(row.id)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canCancel &&
                    row.status !== 'COMPLETED' &&
                    row.status !== 'CANCELLED' ? (
                      <Tooltip title="إلغاء">
                        <IconButton size="small" onClick={() => setCancelId(row.id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إنشاء جولة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>المسار</InputLabel>
              <Select label="المسار" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                {(routes?.data ?? []).map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="موعد البدء"
              type="datetime-local"
              value={scheduledStartAt}
              onChange={(e) => setScheduledStartAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!routeId || !scheduledStartAt || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                routeId,
                scheduledStartAt: new Date(scheduledStartAt).toISOString(),
              })
            }
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(assignOpen)} onClose={() => setAssignOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>إسناد الجولة</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>الفرد</InputLabel>
            <Select
              label="الفرد"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            >
              {(assignable ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.fullName} · {p.employeeNumber}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(null)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!assignUserId || !assignOpen || assignMutation.isPending}
            onClick={() =>
              assignOpen &&
              assignMutation.mutate({ id: assignOpen.id, assignedUserId: assignUserId })
            }
          >
            إسناد
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(cancelId)} onClose={() => setCancelId(null)} fullWidth maxWidth="sm">
        <DialogTitle>إلغاء الجولة</DialogTitle>
        <DialogContent>
          <TextField
            label="سبب الإلغاء"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelId(null)}>رجوع</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!cancelId || cancelMutation.isPending}
            onClick={() => cancelId && cancelMutation.mutate({ id: cancelId, reason: cancelReason })}
          >
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detailId)} onClose={() => setDetailId(null)} fullWidth maxWidth="md">
        <DialogTitle>تفاصيل الجولة والجدول الزمني</DialogTitle>
        <DialogContent>
          {detailLoading ? <TableSkeleton rows={4} /> : null}
          {detail ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                المسار: {detail.route?.name ?? detail.routeId}
              </Typography>
              <Typography variant="body2">
                المُسند: {detail.assignedUser?.fullName ?? '—'}
              </Typography>
              <Chip size="small" label={PATROL_STATUS_LABELS[detail.status]} sx={{ alignSelf: 'flex-start' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                الزيارات
              </Typography>
              {(detail.visits?.length ?? 0) === 0 ? (
                <Alert severity="info">لا توجد زيارات مسجّلة بعد.</Alert>
              ) : (
                (detail.visits ?? []).map((v) => (
                  <Box key={v.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {v.checkpoint?.name ?? v.checkpointId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(v.visitedAt).toLocaleString('ar-SA')} · {v.status}
                      {v.clientSyncId ? ` · sync:${v.clientSyncId.slice(0, 8)}` : ''}
                    </Typography>
                  </Box>
                ))
              )}
              {canComplete && detail.status === 'IN_PROGRESS' && detail.route?.checkpoints?.length ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    تسجيل زيارة نقطة
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {detail.route.checkpoints.map((rc) => (
                      <Button
                        key={rc.id}
                        size="small"
                        variant="outlined"
                        disabled={visitMutation.isPending}
                        onClick={() =>
                          visitMutation.mutate({
                            sessionId: detail.id,
                            checkpointId: rc.checkpointId,
                          })
                        }
                      >
                        {rc.checkpoint?.name ?? rc.checkpointId}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailId(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} variant="filled">
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
