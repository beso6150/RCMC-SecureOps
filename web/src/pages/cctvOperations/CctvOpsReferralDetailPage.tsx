import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  addReferralNote,
  arriveReferral,
  cancelReferral,
  CCTV_OPS_QUERY_KEYS,
  closeReferral,
  downloadReferralAttachment,
  escalateReferral,
  fetchReferralTimeline,
  fileToBase64,
  getReferral,
  previewReferralAttachment,
  receiveReferral,
  rejectReferral,
  resolveReferral,
  sendReferral,
  startReferral,
  uploadReferralAttachment,
} from '../../api/cctvOperations';
import {
  convertFromReferral,
  findIncidentByReferral,
  OPS_ROOM_QUERY_KEYS,
} from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { AttachmentPreviewDialog } from '../../components/cctvOperations/AttachmentPreviewDialog';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import { DetailSkeleton } from '../../components/cctvOperations/CctvOpsSkeletons';
import {
  REFERRAL_SEVERITY_LABELS,
  REFERRAL_STATUS_LABELS,
  REFERRAL_TYPE_LABELS,
  REFERRAL_UPDATE_TYPE_LABELS,
} from '../../types/cctvOperations';

export function CctvOpsReferralDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [note, setNote] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ name: string; mime: string } | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const canSend = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_SEND]);
  const canReceive = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_RECEIVE]);
  const canStart = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_START]);
  const canArrive = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_ARRIVE]);
  const canResolve = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_RESOLVE]);
  const canReject = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_REJECT]);
  const canCancel = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_CANCEL]);
  const canEscalate = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_ESCALATE]);
  const canClose = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_CLOSE]);
  const canNote = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_ADD_NOTE]);
  const canUpload = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_UPLOAD_ATTACHMENT]);
  const canDownload = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_DOWNLOAD_ATTACHMENT]);
  const canConvertIncident = hasPermission(perms, [
    PermissionCodes.INCIDENTS_CONVERT_REFERRAL,
    PermissionCodes.INCIDENTS_CREATE,
  ]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.referral(id),
    queryFn: () => getReferral(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

  const timelineQuery = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.referralTimeline(id),
    queryFn: () => fetchReferralTimeline(id),
    enabled: Boolean(id) && tab === 2,
  });

  const linkedIncidentQuery = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.linkedByReferral(id),
    queryFn: () => findIncidentByReferral(id),
    enabled: Boolean(id) && canConvertIncident,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: CCTV_OPS_QUERY_KEYS.all });
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const sendMut = useMutation({
    mutationFn: () => sendReferral(id),
    onSuccess: () => {
      invalidate();
      notify('تم الإرسال بواسطة مشغلة CCTV.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإرسال.', 'error'),
  });
  const receiveMut = useMutation({
    mutationFn: () => receiveReferral(id),
    onSuccess: () => {
      invalidate();
      notify('تم استلام الإحالة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الاستلام.', 'error'),
  });
  const startMut = useMutation({
    mutationFn: () => startReferral(id),
    onSuccess: () => {
      invalidate();
      notify('بدأت المعالجة الميدانية.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر البدء.', 'error'),
  });
  const arriveMut = useMutation({
    mutationFn: () => arriveReferral(id),
    onSuccess: () => {
      invalidate();
      notify('تم تسجيل الوصول للموقع.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر تسجيل الوصول.', 'error'),
  });
  const closeMut = useMutation({
    mutationFn: () => closeReferral(id),
    onSuccess: () => {
      invalidate();
      notify('تم إغلاق الإحالة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإغلاق.', 'error'),
  });

  const resolveMut = useMutation({
    mutationFn: () => resolveReferral(id, { resolutionSummary: resolution.trim(), needsFollowUp: false }),
    onSuccess: () => {
      invalidate();
      setResolveOpen(false);
      notify('تم حل الإحالة بواسطة رجل الأمن.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحل.', 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectReferral(id, rejectReason.trim()),
    onSuccess: () => {
      invalidate();
      setRejectOpen(false);
      notify('تم رفض الإحالة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الرفض.', 'error'),
  });

  const escalateMut = useMutation({
    mutationFn: () => escalateReferral(id, escalateReason.trim()),
    onSuccess: () => {
      invalidate();
      setEscalateOpen(false);
      notify('تم تصعيد الإحالة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر التصعيد.', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelReferral(id, cancelReason.trim() || 'إلغاء بواسطة مشغلة المراقبة'),
    onSuccess: () => {
      invalidate();
      setCancelOpen(false);
      notify('تم إلغاء الإحالة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإلغاء.', 'error'),
  });

  const convertMut = useMutation({
    mutationFn: () => convertFromReferral(id),
    onSuccess: (incident) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: OPS_ROOM_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: OPS_ROOM_QUERY_KEYS.linkedByReferral(id) });
      notify(
        `حوّلتِ الإحالة إلى حادث ${incident.incidentNumber ?? incident.id.slice(0, 8)}.`,
      );
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر التحويل إلى حادث.', 'error'),
  });

  const noteMut = useMutation({
    mutationFn: () => addReferralNote(id, note.trim()),
    onSuccess: () => {
      invalidate();
      setNote('');
      notify('تمت إضافة الملاحظة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر إضافة الملاحظة.', 'error'),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const contentBase64 = await fileToBase64(file);
      return uploadReferralAttachment(id, {
        originalFileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        contentBase64,
        attachmentType: file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
      });
    },
    onSuccess: () => {
      invalidate();
      notify('تم رفع الإثبات.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر رفع الملف.', 'error'),
  });

  const loadPreview = useCallback(() => {
    if (!previewId) return Promise.reject(new Error('لا يوجد مرفق.'));
    return previewReferralAttachment(id, previewId);
  }, [id, previewId]);

  if (isLoading) {
    return (
      <Box>
        <CctvOpsPageHeader title="تفاصيل الإحالة" />
        <DetailSkeleton />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box>
        <CctvOpsPageHeader title="تفاصيل الإحالة" />
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الإحالة.'}</Alert>
        <Button component={RouterLink} to="/cctv-operations/referrals" sx={{ mt: 2 }}>
          العودة للإحالات
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <CctvOpsPageHeader
        title={data.referralNumber}
        subtitle={data.title}
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {canSend && data.status === 'NEW' ? (
              <Button variant="contained" onClick={() => sendMut.mutate()}>
                إرسال
              </Button>
            ) : null}
            {canReceive && data.status === 'SENT' ? (
              <Button variant="contained" color="success" onClick={() => receiveMut.mutate()}>
                استلام
              </Button>
            ) : null}
            {canStart && (data.status === 'RECEIVED' || data.status === 'ESCALATED') ? (
              <Button variant="contained" onClick={() => startMut.mutate()}>
                بدء التحقق
              </Button>
            ) : null}
            {canArrive && data.status === 'IN_PROGRESS' && !data.arrivedAt ? (
              <Button variant="outlined" onClick={() => arriveMut.mutate()}>
                وصول للموقع
              </Button>
            ) : null}
            {canResolve && (data.status === 'IN_PROGRESS' || data.status === 'ESCALATED') ? (
              <Button variant="contained" color="success" onClick={() => setResolveOpen(true)}>
                حل
              </Button>
            ) : null}
            {canReject &&
            ['SENT', 'RECEIVED', 'IN_PROGRESS', 'ESCALATED'].includes(data.status) ? (
              <Button color="warning" onClick={() => setRejectOpen(true)}>
                رفض
              </Button>
            ) : null}
            {canEscalate ? (
              <Button color="error" variant="outlined" onClick={() => setEscalateOpen(true)}>
                تصعيد
              </Button>
            ) : null}
            {canCancel && (data.status === 'NEW' || data.status === 'SENT') ? (
              <Button color="error" onClick={() => setCancelOpen(true)}>
                إلغاء
              </Button>
            ) : null}
            {canClose && data.status === 'RESOLVED' ? (
              <Button variant="contained" onClick={() => closeMut.mutate()}>
                إغلاق
              </Button>
            ) : null}
            {canConvertIncident && !linkedIncidentQuery.data ? (
              <Button
                variant="outlined"
                color="secondary"
                disabled={convertMut.isPending}
                onClick={() => convertMut.mutate()}
              >
                تحويل إلى حادث
              </Button>
            ) : null}
            {linkedIncidentQuery.data ? (
              <Button
                component={RouterLink}
                to={`/incidents/${linkedIncidentQuery.data.id}`}
                variant="outlined"
              >
                حادث مرتبط:{' '}
                {linkedIncidentQuery.data.incidentNumber ??
                  linkedIncidentQuery.data.id.slice(0, 8)}
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="تفاصيل" />
        <Tab label="إثباتات" />
        <Tab label="Timeline" />
        <Tab label="رد رجل الأمن" />
        <Tab label="تصعيد" />
      </Tabs>

      {tab === 0 ? (
        <Stack spacing={1.5} sx={{ maxWidth: 800 }}>
          <Typography>
            <strong>النوع:</strong> {REFERRAL_TYPE_LABELS[data.referralType]}
          </Typography>
          <Typography>
            <strong>الخطورة:</strong> {REFERRAL_SEVERITY_LABELS[data.severity]}
          </Typography>
          <Typography>
            <strong>الحالة:</strong> {REFERRAL_STATUS_LABELS[data.status]}
          </Typography>
          <Typography>
            <strong>الوصف:</strong> {data.description}
          </Typography>
          <Typography>
            <strong>المشغلة المرسلة:</strong> {data.createdBy?.fullName ?? '—'}
          </Typography>
          <Typography>
            <strong>المُسند:</strong>{' '}
            {data.assignedUser?.fullName ?? data.assignedGroup?.nameAr ?? '—'}
          </Typography>
          {data.cameraCode ? (
            <Typography>
              <strong>الكاميرا:</strong> {data.cameraCode}
            </Typography>
          ) : null}
          {data.zone ? (
            <Typography>
              <strong>المنطقة:</strong> {data.zone.name ?? data.zone.nameAr ?? data.zone.code}
            </Typography>
          ) : null}
          <Typography>
            <strong>وقت الرصد:</strong> {new Date(data.occurredAt).toLocaleString('ar-SA')}
          </Typography>
          {canNote ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <TextField
                label="ملاحظة"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
                size="small"
              />
              <Button
                variant="outlined"
                disabled={!note.trim() || noteMut.isPending}
                onClick={() => noteMut.mutate()}
              >
                إضافة
              </Button>
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      {tab === 1 ? (
        <Box>
          {canUpload ? (
            <Button variant="outlined" component="label" sx={{ mb: 2 }} disabled={uploadMut.isPending}>
              رفع إثبات
              <input
                hidden
                type="file"
                accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMut.mutate(f);
                }}
              />
            </Button>
          ) : null}
          {!data.attachments?.length ? <Alert severity="info">لا توجد إثباتات.</Alert> : null}
          <Stack spacing={1}>
            {data.attachments?.map((a) => (
              <Alert
                key={a.id}
                severity="info"
                action={
                  canDownload ? (
                    <Stack direction="row" spacing={1}>
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                          setPreviewId(a.id);
                          setPreviewMeta({ name: a.originalFileName, mime: a.mimeType });
                        }}
                      >
                        معاينة
                      </Button>
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                          void downloadReferralAttachment(id, a.id).then((blob) => {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = a.originalFileName;
                            link.click();
                            URL.revokeObjectURL(url);
                          });
                        }}
                      >
                        تنزيل
                      </Button>
                    </Stack>
                  ) : null
                }
              >
                {a.originalFileName} · {a.uploadedBy?.fullName ?? '—'} ·{' '}
                {new Date(a.createdAt).toLocaleString('ar-SA')}
              </Alert>
            ))}
          </Stack>
        </Box>
      ) : null}

      {tab === 2 ? (
        <Box>
          {timelineQuery.isLoading ? <Alert severity="info">جاري التحميل…</Alert> : null}
          {!timelineQuery.data?.length && !data.updates?.length ? (
            <Alert severity="info">لا يوجد سجل زمني بعد.</Alert>
          ) : null}
          <Stack spacing={1}>
            {(timelineQuery.data ?? data.updates ?? []).map((u) => (
              <Alert key={u.id} severity="info" icon={false}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {REFERRAL_UPDATE_TYPE_LABELS[u.updateType]}
                  {u.oldStatus && u.newStatus
                    ? ` (${REFERRAL_STATUS_LABELS[u.oldStatus]} ← ${REFERRAL_STATUS_LABELS[u.newStatus]})`
                    : ''}
                </Typography>
                <Typography variant="body2">{u.message ?? '—'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.user?.fullName ?? '—'} · {new Date(u.createdAt).toLocaleString('ar-SA')}
                </Typography>
              </Alert>
            ))}
          </Stack>
        </Box>
      ) : null}

      {tab === 3 ? (
        <Box>
          {!data.responses?.length && !data.resolutionSummary ? (
            <Alert severity="info">لا يوجد رد من رجل الأمن بعد.</Alert>
          ) : null}
          {data.resolutionSummary ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>ملخص الحل</Typography>
              <Typography>{data.resolutionSummary}</Typography>
              {data.resolvedAt ? (
                <Typography variant="caption">
                  {new Date(data.resolvedAt).toLocaleString('ar-SA')}
                </Typography>
              ) : null}
            </Alert>
          ) : null}
          <Stack spacing={1}>
            {data.responses?.map((r) => (
              <Alert key={r.id} severity="info">
                <Typography sx={{ fontWeight: 600 }}>{r.result}</Typography>
                <Typography variant="body2">{r.notes ?? ''}</Typography>
                <Typography variant="caption">
                  {r.responder?.fullName ?? 'رجل الأمن'} ·{' '}
                  {new Date(r.respondedAt).toLocaleString('ar-SA')}
                </Typography>
              </Alert>
            ))}
          </Stack>
        </Box>
      ) : null}

      {tab === 4 ? (
        <Box>
          <Typography sx={{ mb: 1 }}>
            مستوى التصعيد: <strong>{data.escalationLevel}</strong>
          </Typography>
          {data.escalationReason ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {data.escalationReason}
              {data.escalatedAt ? (
                <Typography variant="caption" sx={{ display: "block" }}>
                  {new Date(data.escalatedAt).toLocaleString('ar-SA')}
                </Typography>
              ) : null}
            </Alert>
          ) : (
            <Alert severity="info">لم يتم التصعيد بعد.</Alert>
          )}
          {canEscalate ? (
            <Button variant="outlined" color="error" onClick={() => setEscalateOpen(true)}>
              تصعيد الآن
            </Button>
          ) : null}
        </Box>
      ) : null}

      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>حل الإحالة</DialogTitle>
        <DialogContent>
          <TextField
            label="ملخص النتيجة"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            fullWidth
            required
            multiline
            minRows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>تراجع</Button>
          <Button
            variant="contained"
            disabled={!resolution.trim()}
            onClick={() => resolveMut.mutate()}
          >
            تأكيد الحل
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>رفض الإحالة</DialogTitle>
        <DialogContent>
          <TextField
            label="سبب الرفض"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            fullWidth
            required
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>تراجع</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={!rejectReason.trim()}
            onClick={() => rejectMut.mutate()}
          >
            تأكيد الرفض
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={escalateOpen} onClose={() => setEscalateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تصعيد الإحالة</DialogTitle>
        <DialogContent>
          <TextField
            label="سبب التصعيد"
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            fullWidth
            required
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateOpen(false)}>تراجع</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!escalateReason.trim()}
            onClick={() => escalateMut.mutate()}
          >
            تأكيد التصعيد
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إلغاء الإحالة</DialogTitle>
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
          <Button onClick={() => setCancelOpen(false)}>تراجع</Button>
          <Button color="error" variant="contained" onClick={() => cancelMut.mutate()}>
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>

      <AttachmentPreviewDialog
        open={Boolean(previewId)}
        onClose={() => setPreviewId(null)}
        fileName={previewMeta?.name}
        mimeType={previewMeta?.mime}
        loadBlob={loadPreview}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
      />
    </Box>
  );
}
