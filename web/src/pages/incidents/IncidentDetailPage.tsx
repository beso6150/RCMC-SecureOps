import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  acknowledgeIncident,
  addIncidentFollowUp,
  addIncidentNote,
  addIncidentTask,
  arriveIncident,
  cancelOpsIncident,
  closeOpsIncident,
  containIncident,
  escalateIncident,
  falseAlarmIncident,
  getOpsIncident,
  OPS_ROOM_QUERY_KEYS,
  reopenIncident,
  requestSupportIncident,
  resolveOpsIncident,
  respondIncident,
} from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { IncidentFieldLocationSection } from '../../components/fieldOperations/IncidentFieldLocationSection';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsDetailSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import { OpsSeverityChip, OpsStatusChip } from '../../components/operationsRoom/OpsStatusChips';
import {
  OPS_INCIDENT_STATUS_LABELS,
  OPS_SOURCE_LABELS,
} from '../../types/operationsRoom';

export function IncidentDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [followTitle, setFollowTitle] = useState('');
  const [followDesc, setFollowDesc] = useState('');
  const [followDue, setFollowDue] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [reasonOpen, setReasonOpen] = useState<'cancel' | 'false' | 'escalate' | 'reopen' | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

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
  const canClose = hasPermission(perms, [PermissionCodes.INCIDENTS_CLOSE]);
  const canCancel = hasPermission(perms, [
    PermissionCodes.INCIDENTS_CANCEL,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canEscalate = hasPermission(perms, [
    PermissionCodes.INCIDENTS_ESCALATE,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canFalse = hasPermission(perms, [
    PermissionCodes.INCIDENTS_FALSE_ALARM,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canReopen = hasPermission(perms, [
    PermissionCodes.INCIDENTS_REOPEN,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canSupport = hasPermission(perms, [
    PermissionCodes.INCIDENTS_REQUEST_SUPPORT,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canNotes = hasPermission(perms, [
    PermissionCodes.INCIDENTS_NOTES,
    PermissionCodes.INCIDENTS_COMMENT,
  ]);
  const canTasks = hasPermission(perms, [
    PermissionCodes.INCIDENTS_TASKS,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);
  const canFollowUps = hasPermission(perms, [
    PermissionCodes.INCIDENTS_FOLLOW_UPS,
    PermissionCodes.INCIDENTS_HANDLE,
  ]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.incident(id),
    queryFn: () => getOpsIncident(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: OPS_ROOM_QUERY_KEYS.all });
    void queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const onActionError = (e: Error) => notify(e.message ?? 'تعذّر تنفيذ الإجراء.', 'error');

  const ackMut = useMutation({
    mutationFn: () => acknowledgeIncident(id),
    onSuccess: () => {
      invalidate();
      notify('تم اعتماد البلاغ.');
    },
    onError: onActionError,
  });
  const respondMut = useMutation({
    mutationFn: () => respondIncident(id),
    onSuccess: () => {
      invalidate();
      notify('بدأت الاستجابة.');
    },
    onError: onActionError,
  });
  const arriveMut = useMutation({
    mutationFn: () => arriveIncident(id),
    onSuccess: () => {
      invalidate();
      notify('تم تسجيل الوصول للموقع.');
    },
    onError: onActionError,
  });
  const containMut = useMutation({
    mutationFn: () => containIncident(id),
    onSuccess: () => {
      invalidate();
      notify('تم احتواء الحالة.');
    },
    onError: onActionError,
  });
  const supportMut = useMutation({
    mutationFn: () => requestSupportIncident(id, {}),
    onSuccess: () => {
      invalidate();
      notify('تم طلب المؤازرة.');
    },
    onError: onActionError,
  });
  const closeMut = useMutation({
    mutationFn: () => closeOpsIncident(id, {}),
    onSuccess: () => {
      invalidate();
      notify('تم إغلاق البلاغ.');
    },
    onError: onActionError,
  });
  const resolveMut = useMutation({
    mutationFn: () =>
      resolveOpsIncident(id, {
        resolutionSummary: resolution.trim(),
        requiresFollowUp: false,
      }),
    onSuccess: () => {
      invalidate();
      setResolveOpen(false);
      notify('تم حل البلاغ.');
    },
    onError: onActionError,
  });
  const reasonMut = useMutation({
    mutationFn: async () => {
      if (reasonOpen === 'cancel') return cancelOpsIncident(id, { notes: reason.trim() });
      if (reasonOpen === 'false') return falseAlarmIncident(id, { reason: reason.trim() });
      if (reasonOpen === 'escalate') return escalateIncident(id, { reason: reason.trim() });
      return reopenIncident(id, { reason: reason.trim() });
    },
    onSuccess: () => {
      invalidate();
      setReasonOpen(null);
      setReason('');
      notify('تم تنفيذ الإجراء.');
    },
    onError: onActionError,
  });
  const noteMut = useMutation({
    mutationFn: () => addIncidentNote(id, { content: note.trim() }),
    onSuccess: () => {
      invalidate();
      setNote('');
      notify('تمت إضافة الملاحظة.');
    },
    onError: onActionError,
  });
  const taskMut = useMutation({
    mutationFn: () => addIncidentTask(id, { title: taskTitle.trim() }),
    onSuccess: () => {
      invalidate();
      setTaskTitle('');
      notify('تمت إضافة المهمة.');
    },
    onError: onActionError,
  });
  const followMut = useMutation({
    mutationFn: () =>
      addIncidentFollowUp(id, {
        title: followTitle.trim(),
        description: followDesc.trim(),
        dueAt: followDue,
      }),
    onSuccess: () => {
      invalidate();
      setFollowTitle('');
      setFollowDesc('');
      setFollowDue('');
      notify('تمت إضافة متابعة لاحقة.');
    },
    onError: onActionError,
  });

  if (isLoading) {
    return (
      <Box>
        <OpsRoomPageHeader title="تفاصيل البلاغ" />
        <OpsDetailSkeleton />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box>
        <OpsRoomPageHeader title="تفاصيل البلاغ" />
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل البلاغ.'}</Alert>
        <Button component={RouterLink} to="/incidents" sx={{ mt: 2 }}>
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <OpsRoomPageHeader
        title={data.incidentNumber ?? 'بلاغ'}
        subtitle={data.title}
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {canAck && ['NEW', 'REPORTED', 'ASSIGNED', 'ESCALATED'].includes(data.status) ? (
              <Button variant="contained" onClick={() => ackMut.mutate()} disabled={ackMut.isPending}>
                اعتماد
              </Button>
            ) : null}
            {canRespond && ['ASSIGNED', 'ACKNOWLEDGED', 'REOPENED'].includes(data.status) ? (
              <Button
                variant="contained"
                onClick={() => respondMut.mutate()}
                disabled={respondMut.isPending}
              >
                استجابة
              </Button>
            ) : null}
            {canArrive && ['RESPONDING', 'ASSIGNED'].includes(data.status) ? (
              <Button
                variant="contained"
                onClick={() => arriveMut.mutate()}
                disabled={arriveMut.isPending}
              >
                وصول للموقع
              </Button>
            ) : null}
            {canContain && ['ON_SCENE', 'IN_PROGRESS'].includes(data.status) ? (
              <Button
                variant="contained"
                onClick={() => containMut.mutate()}
                disabled={containMut.isPending}
              >
                احتواء
              </Button>
            ) : null}
            {canResolve && ['CONTAINED', 'IN_PROGRESS', 'ON_SCENE'].includes(data.status) ? (
              <Button variant="contained" color="success" onClick={() => setResolveOpen(true)}>
                حل
              </Button>
            ) : null}
            {canClose && data.status === 'RESOLVED' ? (
              <Button
                variant="contained"
                onClick={() => closeMut.mutate()}
                disabled={closeMut.isPending}
              >
                إغلاق
              </Button>
            ) : null}
            {canSupport ? (
              <Button
                variant="outlined"
                onClick={() => supportMut.mutate()}
                disabled={supportMut.isPending}
              >
                طلب مؤازرة
              </Button>
            ) : null}
            {canEscalate ? (
              <Button color="warning" variant="outlined" onClick={() => setReasonOpen('escalate')}>
                تصعيد
              </Button>
            ) : null}
            {canFalse ? (
              <Button color="inherit" variant="outlined" onClick={() => setReasonOpen('false')}>
                إنذار كاذب
              </Button>
            ) : null}
            {canCancel ? (
              <Button color="error" variant="outlined" onClick={() => setReasonOpen('cancel')}>
                إلغاء
              </Button>
            ) : null}
            {canReopen && ['CLOSED', 'RESOLVED'].includes(data.status) ? (
              <Button variant="outlined" onClick={() => setReasonOpen('reopen')}>
                إعادة فتح
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
      >
        <OpsStatusChip status={data.status} />
        <OpsSeverityChip severity={data.severity} />
        {data.source ? (
          <Typography variant="body2" color="text.secondary">
            المصدر: {OPS_SOURCE_LABELS[data.source] ?? data.source}
          </Typography>
        ) : null}
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="نظرة عامة" />
        <Tab label="الخط الزمني" />
        <Tab label="ملاحظات" />
        <Tab label="مهام ومتابعة" />
        <Tab label="مرفقات" />
      </Tabs>

      {tab === 0 ? (
        <Stack spacing={2}>
          <Typography variant="body1">{data.description}</Typography>
          <Typography variant="body2">النوع: {data.type?.nameAr ?? '—'}</Typography>
          <Typography variant="body2">المُبلِّغ: {data.reporter?.fullName ?? '—'}</Typography>
          <Typography variant="body2">المُسند: {data.assignee?.fullName ?? '—'}</Typography>
          <Typography variant="body2">المشرف: {data.supervisor?.fullName ?? '—'}</Typography>
          {data.resolutionSummary ? (
            <Typography variant="body2">ملخص الحل: {data.resolutionSummary}</Typography>
          ) : null}
          <Divider />
          <IncidentFieldLocationSection
            zoneId={data.zoneId}
            floorId={data.floorId}
            floorLabel={data.floor?.nameAr ?? null}
            mapX={data.mapX}
            mapY={data.mapY}
            checkpointId={data.checkpointId ?? data.checkpoint?.id ?? null}
          />
        </Stack>
      ) : null}

      {tab === 1 ? (
        <Stack spacing={1.5}>
          {(data.history ?? []).length === 0 ? (
            <Alert severity="info">لا يوجد سجل بعد.</Alert>
          ) : (
            (data.history ?? []).map((h) => (
              <Box key={h.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {h.action}
                  {h.toStatus ? ` → ${OPS_INCIDENT_STATUS_LABELS[h.toStatus] ?? h.toStatus}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {h.actor?.fullName ?? '—'} · {new Date(h.createdAt).toLocaleString('ar-SA')}
                </Typography>
                {h.notes ? <Typography variant="body2">{h.notes}</Typography> : null}
              </Box>
            ))
          )}
        </Stack>
      ) : null}

      {tab === 2 ? (
        <Stack spacing={2}>
          {(data.notesList ?? []).map((n) => (
            <Box key={n.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
              <Typography variant="body2">{n.content}</Typography>
              <Typography variant="caption" color="text.secondary">
                {n.createdBy?.fullName ?? '—'} · {new Date(n.createdAt).toLocaleString('ar-SA')}
              </Typography>
            </Box>
          ))}
          {canNotes ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                label="ملاحظة جديدة"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                variant="contained"
                disabled={!note.trim() || noteMut.isPending}
                onClick={() => noteMut.mutate()}
              >
                إضافة
              </Button>
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      {tab === 3 ? (
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              المهام
            </Typography>
            {(data.tasks ?? []).length === 0 ? <Alert severity="info">لا توجد مهام.</Alert> : null}
            {(data.tasks ?? []).map((t) => (
              <Typography key={t.id} variant="body2" sx={{ mb: 0.5 }}>
                • {t.title} — {t.status}
              </Typography>
            ))}
            {canTasks ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="مهمة جديدة"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  disabled={!taskTitle.trim() || taskMut.isPending}
                  onClick={() => taskMut.mutate()}
                >
                  إضافة
                </Button>
              </Stack>
            ) : null}
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              المتابعة اللاحقة
            </Typography>
            {(data.followUps ?? []).length === 0 ? (
              <Alert severity="info">لا توجد متابعات.</Alert>
            ) : null}
            {(data.followUps ?? []).map((f) => (
              <Typography key={f.id} variant="body2" sx={{ mb: 0.5 }}>
                • {f.title} — {f.status} — استحقاق{' '}
                {new Date(f.dueAt).toLocaleDateString('ar-SA')}
              </Typography>
            ))}
            {canFollowUps ? (
              <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="عنوان المتابعة"
                  value={followTitle}
                  onChange={(e) => setFollowTitle(e.target.value)}
                />
                <TextField
                  size="small"
                  label="الوصف"
                  value={followDesc}
                  onChange={(e) => setFollowDesc(e.target.value)}
                  multiline
                  minRows={2}
                />
                <TextField
                  size="small"
                  label="تاريخ الاستحقاق"
                  type="datetime-local"
                  value={followDue}
                  onChange={(e) => setFollowDue(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button
                  variant="contained"
                  disabled={
                    !followTitle.trim() ||
                    !followDesc.trim() ||
                    !followDue ||
                    followMut.isPending
                  }
                  onClick={() => followMut.mutate()}
                >
                  إضافة متابعة
                </Button>
              </Stack>
            ) : null}
          </Box>
        </Stack>
      ) : null}

      {tab === 4 ? (
        <Stack spacing={1}>
          {(data.attachments ?? []).length === 0 ? (
            <Alert severity="info">لا توجد مرفقات.</Alert>
          ) : (
            (data.attachments ?? []).map((a) => (
              <Typography key={a.id} variant="body2">
                {a.originalFileName ?? a.fileName} ({a.mimeType})
              </Typography>
            ))
          )}
        </Stack>
      ) : null}

      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>حل البلاغ</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="ملخص الحل"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!resolution.trim() || resolveMut.isPending}
            onClick={() => resolveMut.mutate()}
          >
            تأكيد الحل
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(reasonOpen)} onClose={() => setReasonOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {reasonOpen === 'cancel'
            ? 'إلغاء البلاغ'
            : reasonOpen === 'false'
              ? 'إنذار كاذب'
              : reasonOpen === 'escalate'
                ? 'تصعيد'
                : 'إعادة فتح'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            label="السبب"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasonOpen(null)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={reason.trim().length < 2 || reasonMut.isPending}
            onClick={() => reasonMut.mutate()}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
      />
    </Box>
  );
}
