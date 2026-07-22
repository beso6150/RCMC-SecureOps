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
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { listUsers } from '../../api/users';
import {
  activatePermit,
  acknowledgePermitShare,
  cancelPermit,
  CCTV_OPS_QUERY_KEYS,
  downloadPermitAttachment,
  getPermit,
  listPermitShares,
  markPermitUsed,
  previewPermitAttachment,
  rejectPermit,
  sharePermit,
} from '../../api/cctvOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { AttachmentPreviewDialog } from '../../components/cctvOperations/AttachmentPreviewDialog';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import { DetailSkeleton } from '../../components/cctvOperations/CctvOpsSkeletons';
import {
  PERMIT_IMPORTANCE_LABELS,
  PERMIT_SHARE_STATUS_LABELS,
  PERMIT_STATUS_LABELS,
  PERMIT_TYPE_LABELS,
} from '../../types/cctvOperations';

export function CctvOpsPermitDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const queryClient = useQueryClient();

  const canActivate = hasPermission(perms, [PermissionCodes.PERMITS_ACTIVATE]);
  const canCancel = hasPermission(perms, [PermissionCodes.PERMITS_CANCEL]);
  const canReject = hasPermission(perms, [PermissionCodes.PERMITS_REJECT]);
  const canShare = hasPermission(perms, [PermissionCodes.PERMITS_SHARE]);
  const canAck = hasPermission(perms, [PermissionCodes.PERMITS_ACKNOWLEDGE]);
  const canDownload = hasPermission(perms, [PermissionCodes.PERMITS_DOWNLOAD_ATTACHMENT]);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.permit(id),
    queryFn: () => getPermit(id),
    enabled: Boolean(id),
  });

  const sharesQuery = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.permitShares(id),
    queryFn: () => listPermitShares(id),
    enabled: Boolean(id),
  });

  const usersQuery = useQuery({
    queryKey: ['users', { pageSize: 100, forPermitShare: true }],
    queryFn: () => listUsers({ pageSize: 100 }),
    enabled: shareOpen,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: CCTV_OPS_QUERY_KEYS.all });
  };
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const activateMut = useMutation({
    mutationFn: () => activatePermit(id),
    onSuccess: () => {
      invalidate();
      notify('تم تفعيل التصريح.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر التفعيل.', 'error'),
  });

  const usedMut = useMutation({
    mutationFn: () => markPermitUsed(id),
    onSuccess: () => {
      invalidate();
      notify('تم تعليم التصريح كمُستخدم.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر التحديث.', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelPermit(id, { cancelReason: cancelReason.trim() || null }),
    onSuccess: () => {
      invalidate();
      setCancelOpen(false);
      notify('تم إلغاء التصريح.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإلغاء.', 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectPermit(id, { rejectReason: rejectReason.trim() }),
    onSuccess: () => {
      invalidate();
      setRejectOpen(false);
      notify('تم رفض التصريح.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الرفض.', 'error'),
  });

  const shareMut = useMutation({
    mutationFn: () =>
      sharePermit(id, {
        sharedWithUserId: shareUserId || null,
        message: shareMessage.trim() || null,
      }),
    onSuccess: () => {
      invalidate();
      setShareOpen(false);
      setShareUserId('');
      setShareMessage('');
      notify('تم الإرسال بواسطة مشغلة CCTV.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر المشاركة.', 'error'),
  });

  const ackMut = useMutation({
    mutationFn: () => acknowledgePermitShare(id, 'acknowledge'),
    onSuccess: () => {
      invalidate();
      notify('تم الإقرار باستلام التصريح.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإقرار.', 'error'),
  });

  const loadPreview = useCallback(() => previewPermitAttachment(id), [id]);

  if (isLoading) {
    return (
      <Box>
        <CctvOpsPageHeader title="تفاصيل التصريح" />
        <DetailSkeleton />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box>
        <CctvOpsPageHeader title="تفاصيل التصريح" />
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل التصريح.'}</Alert>
        <Button component={RouterLink} to="/cctv-operations/permits" sx={{ mt: 2 }}>
          العودة للتصاريح
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <CctvOpsPageHeader
        title={data.permitNumber}
        subtitle={data.title}
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {canActivate && data.status === 'DRAFT' ? (
              <Button variant="contained" onClick={() => activateMut.mutate()}>
                تفعيل
              </Button>
            ) : null}
            {canShare && (data.status === 'ACTIVE' || data.status === 'DRAFT') ? (
              <Button variant="outlined" onClick={() => setShareOpen(true)}>
                مشاركة
              </Button>
            ) : null}
            {data.status === 'ACTIVE' ? (
              <Button variant="outlined" onClick={() => usedMut.mutate()}>
                تعليم كمُستخدم
              </Button>
            ) : null}
            {canReject && data.status === 'DRAFT' ? (
              <Button color="warning" onClick={() => setRejectOpen(true)}>
                رفض
              </Button>
            ) : null}
            {canCancel && data.status !== 'CANCELLED' && data.status !== 'REJECTED' ? (
              <Button color="error" onClick={() => setCancelOpen(true)}>
                إلغاء
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Stack spacing={1.5} sx={{ mb: 3, maxWidth: 720 }}>
        <Typography>
          <strong>النوع:</strong> {PERMIT_TYPE_LABELS[data.permitType]}
        </Typography>
        <Typography>
          <strong>الحامل:</strong> {data.holderName}
        </Typography>
        {data.nationalId ? (
          <Typography>
            <strong>الهوية:</strong> {data.nationalId}
          </Typography>
        ) : null}
        {data.vehiclePlate ? (
          <Typography>
            <strong>اللوحة:</strong> {data.vehiclePlate}
          </Typography>
        ) : null}
        <Typography>
          <strong>الحالة:</strong> {PERMIT_STATUS_LABELS[data.status]}
        </Typography>
        <Typography>
          <strong>الأهمية:</strong> {PERMIT_IMPORTANCE_LABELS[data.importance]}
        </Typography>
        <Typography>
          <strong>الصلاحية:</strong> {new Date(data.validFrom).toLocaleString('ar-SA')} —{' '}
          {new Date(data.validTo).toLocaleString('ar-SA')}
        </Typography>
        {data.createdBy ? (
          <Typography>
            <strong>المشغلة المرسلة:</strong> {data.createdBy.fullName}
          </Typography>
        ) : null}
        {data.notes ? (
          <Typography>
            <strong>ملاحظات:</strong> {data.notes}
          </Typography>
        ) : null}
        {data.attachmentFileName && canDownload ? (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => setPreviewOpen(true)}>
              معاينة المرفق
            </Button>
            <Button
              size="small"
              onClick={() => {
                void downloadPermitAttachment(id).then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = data.attachmentFileName ?? 'attachment';
                  a.click();
                  URL.revokeObjectURL(url);
                });
              }}
            >
              تنزيل المرفق
            </Button>
          </Stack>
        ) : null}
      </Stack>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        المشاركات
      </Typography>
      {sharesQuery.isLoading ? <Alert severity="info">جاري التحميل…</Alert> : null}
      {sharesQuery.data?.length === 0 ? <Alert severity="info">لا توجد مشاركات.</Alert> : null}
      <Stack spacing={1} sx={{ mb: 3 }}>
        {sharesQuery.data?.map((s) => (
          <Alert
            key={s.id}
            severity="info"
            action={
              canAck && s.status !== 'ACKNOWLEDGED' ? (
                <Button color="inherit" size="small" onClick={() => ackMut.mutate()}>
                  إقرار
                </Button>
              ) : null
            }
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <span>
                إلى: {s.sharedWithUser?.fullName ?? s.sharedWithRole ?? s.sharedWithGroup?.nameAr ?? '—'}
              </span>
              <Chip size="small" label={PERMIT_SHARE_STATUS_LABELS[s.status]} />
              <Typography variant="caption" color="text.secondary">
                بواسطة {s.sharedBy?.fullName ?? 'مشغلة المراقبة'} ·{' '}
                {new Date(s.sentAt).toLocaleString('ar-SA')}
              </Typography>
            </Stack>
          </Alert>
        ))}
      </Stack>

      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>مشاركة التصريح</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>المستلم</InputLabel>
              <Select
                label="المستلم"
                value={shareUserId}
                onChange={(e) => setShareUserId(e.target.value)}
              >
                {(usersQuery.data?.data ?? []).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.fullName} ({u.employeeNumber})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="رسالة"
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!shareUserId || shareMut.isPending}
            onClick={() => shareMut.mutate()}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تأكيد إلغاء التصريح</DialogTitle>
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

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>رفض التصريح</DialogTitle>
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

      <AttachmentPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileName={data.attachmentFileName}
        mimeType={data.attachmentMimeType}
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
