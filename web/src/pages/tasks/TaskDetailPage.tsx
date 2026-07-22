import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  TASKS_QUERY_KEYS,
  acceptTask,
  addTaskEvidence,
  cancelTask,
  completeTask,
  escalateTask,
  getTask,
  getTaskTimeline,
  rejectTask,
  startTask,
  waitTask,
} from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_UPDATE_LABELS,
  fileToBase64,
  formatDateTime,
} from '../../utils/sprint19Labels';

type DialogMode = 'complete' | 'reject' | 'cancel' | 'wait' | 'escalate' | null;

export function TaskDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const canRead = hasPermission(perms, [PermissionCodes.TASKS_READ]);
  const canAccept = hasPermission(perms, [PermissionCodes.TASKS_ACCEPT]);
  const canStart = hasPermission(perms, [PermissionCodes.TASKS_START]);
  const canWait = hasPermission(perms, [PermissionCodes.TASKS_WAIT]);
  const canComplete = hasPermission(perms, [
    PermissionCodes.TASKS_COMPLETE,
    PermissionCodes.TASKS_UPDATE,
  ]);
  const canReject = hasPermission(perms, [
    PermissionCodes.TASKS_REJECT,
    PermissionCodes.TASKS_UPDATE,
  ]);
  const canCancel = hasPermission(perms, [
    PermissionCodes.TASKS_CANCEL,
    PermissionCodes.TASKS_UPDATE,
  ]);
  const canEscalate = hasPermission(perms, [PermissionCodes.TASKS_ESCALATE]);
  const canEvidence = hasPermission(perms, [PermissionCodes.TASKS_EVIDENCE]);
  const canTimeline = hasPermission(perms, [
    PermissionCodes.TASKS_TIMELINE,
    PermissionCodes.TASKS_READ,
  ]);

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: task, isLoading, isError, error: loadError } = useQuery({
    queryKey: TASKS_QUERY_KEYS.detail(id),
    queryFn: () => getTask(id),
    enabled: canRead && Boolean(id),
  });

  const { data: timeline = [] } = useQuery({
    queryKey: TASKS_QUERY_KEYS.timeline(id),
    queryFn: () => getTaskTimeline(id),
    enabled: canTimeline && Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });
  };

  const runAction = useMutation({
    mutationFn: async () => {
      if (!task) throw new Error('المهمة غير موجودة');
      if (dialog === 'complete') return completeTask(task.id, { completionNotes: note || null });
      if (dialog === 'reject') return rejectTask(task.id, { reason: note });
      if (dialog === 'cancel') return cancelTask(task.id, { reason: note || undefined });
      if (dialog === 'wait') return waitTask(task.id, { note: note || undefined });
      if (dialog === 'escalate') return escalateTask(task.id, { note: note || undefined });
      throw new Error('إجراء غير معروف');
    },
    onSuccess: () => {
      setDialog(null);
      setNote('');
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const quickMutation = useMutation({
    mutationFn: async (action: 'accept' | 'start') => {
      if (action === 'accept') return acceptTask(id);
      return startTask(id);
    },
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const evidenceMutation = useMutation({
    mutationFn: async (file: File) => {
      const contentBase64 = await fileToBase64(file);
      return addTaskEvidence(id, {
        originalFileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        contentBase64,
      });
    },
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض تفاصيل المهمة.</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !task) {
    return (
      <Alert severity="error">
        {(loadError as Error)?.message ?? 'تعذّر تحميل المهمة.'}
      </Alert>
    );
  }

  const openStatuses = !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(task.status);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 2, gap: 2 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {task.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {task.taskNumber ?? task.id} · {TASK_TYPE_LABELS[task.taskType]}
          </Typography>
        </Box>
        <Button component={RouterLink} to="/tasks" variant="outlined">
          العودة
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip color={PRIORITY_COLORS[task.priority]} label={PRIORITY_LABELS[task.priority]} />
        <Chip label={TASK_STATUS_LABELS[task.status]} variant="outlined" />
        {task.requiresEvidence ? <Chip label="يتطلب دليلًا" color="warning" /> : null}
      </Stack>

      <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
        {task.description}
      </Typography>

      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="body2">المسند إليه: {task.assignee?.fullName ?? '—'}</Typography>
        <Typography variant="body2">المُسنِد: {task.assigner?.fullName ?? '—'}</Typography>
        <Typography variant="body2">الاستحقاق: {formatDateTime(task.dueAt)}</Typography>
        <Typography variant="body2">القبول: {formatDateTime(task.acceptedAt)}</Typography>
        <Typography variant="body2">البدء: {formatDateTime(task.startedAt)}</Typography>
        <Typography variant="body2">الإكمال: {formatDateTime(task.completedAt)}</Typography>
        {task.completionNotes ? (
          <Typography variant="body2">ملاحظات الإكمال: {task.completionNotes}</Typography>
        ) : null}
        {task.rejectionReason ? (
          <Typography variant="body2" color="error">
            سبب الرفض: {task.rejectionReason}
          </Typography>
        ) : null}
      </Stack>

      {openStatuses ? (
        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
          {canAccept && ['ASSIGNED', 'PENDING', 'NEW'].includes(task.status) ? (
            <Button
              variant="contained"
              disabled={quickMutation.isPending}
              onClick={() => quickMutation.mutate('accept')}
            >
              قبول
            </Button>
          ) : null}
          {canStart && ['ACCEPTED', 'ASSIGNED', 'WAITING', 'OVERDUE'].includes(task.status) ? (
            <Button
              variant="contained"
              color="secondary"
              disabled={quickMutation.isPending}
              onClick={() => quickMutation.mutate('start')}
            >
              بدء
            </Button>
          ) : null}
          {canWait && ['ACCEPTED', 'IN_PROGRESS', 'OVERDUE'].includes(task.status) ? (
            <Button variant="outlined" onClick={() => setDialog('wait')}>
              انتظار
            </Button>
          ) : null}
          {canComplete &&
          ['IN_PROGRESS', 'WAITING', 'ACCEPTED', 'OVERDUE'].includes(task.status) ? (
            <Button variant="contained" color="success" onClick={() => setDialog('complete')}>
              إكمال
            </Button>
          ) : null}
          {canReject && ['ASSIGNED', 'ACCEPTED', 'PENDING'].includes(task.status) ? (
            <Button variant="outlined" color="error" onClick={() => setDialog('reject')}>
              رفض
            </Button>
          ) : null}
          {canCancel ? (
            <Button variant="outlined" color="warning" onClick={() => setDialog('cancel')}>
              إلغاء
            </Button>
          ) : null}
          {canEscalate ? (
            <Button variant="outlined" color="error" onClick={() => setDialog('escalate')}>
              تصعيد
            </Button>
          ) : null}
          {canEvidence ? (
            <Button variant="outlined" component="label" disabled={evidenceMutation.isPending}>
              إرفاق دليل
              <input
                hidden
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) evidenceMutation.mutate(file);
                  e.target.value = '';
                }}
              />
            </Button>
          ) : null}
        </Stack>
      ) : null}

      {(task.evidences?.length ?? 0) > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            الأدلة
          </Typography>
          <Stack spacing={0.5}>
            {task.evidences!.map((ev) => (
              <Typography key={ev.id} variant="body2">
                {ev.originalFileName} · {formatDateTime(ev.createdAt)}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      {canTimeline ? (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            الخط الزمني
          </Typography>
          {timeline.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              لا توجد أحداث
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {timeline.map((entry) => (
                <Box
                  key={entry.id}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                >
                  <Typography variant="subtitle2">
                    {TASK_UPDATE_LABELS[entry.updateType] ?? entry.updateType}
                    {entry.oldStatus && entry.newStatus
                      ? ` · ${TASK_STATUS_LABELS[entry.oldStatus]} ← ${TASK_STATUS_LABELS[entry.newStatus]}`
                      : ''}
                  </Typography>
                  {entry.message ? (
                    <Typography variant="body2" color="text.secondary">
                      {entry.message}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.disabled">
                    {entry.user?.fullName ?? ''} · {formatDateTime(entry.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      ) : null}

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {dialog === 'complete'
            ? 'إكمال المهمة'
            : dialog === 'reject'
              ? 'رفض المهمة'
              : dialog === 'cancel'
                ? 'إلغاء المهمة'
                : dialog === 'wait'
                  ? 'وضع المهمة بانتظار'
                  : 'تصعيد المهمة'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={dialog === 'reject' ? 'سبب الرفض (مطلوب)' : 'ملاحظة'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={
              runAction.isPending || (dialog === 'reject' && !note.trim())
            }
            onClick={() => runAction.mutate()}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
