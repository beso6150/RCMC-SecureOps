import ArchiveIcon from '@mui/icons-material/Archive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import ReplayIcon from '@mui/icons-material/Replay';
import SendIcon from '@mui/icons-material/Send';
import UndoIcon from '@mui/icons-material/Undo';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  approveReport,
  archiveReport,
  createReportVersion,
  exportSavedReportCsv,
  exportSavedReportPdf,
  fetchSavedReport,
  rejectReport,
  REPORTS_CENTER_QUERY_KEYS,
  returnReport,
  submitReport,
  triggerBlobDownload,
} from '../../api/reportsCenter';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { ReportsPrintStyles } from '../../components/reports/ReportsPrintStyles';
import { ReportsDetailSkeleton } from '../../components/reports/ReportsSkeletons';
import { PermissionGate } from '../../components/reports/ReportsStates';
import {
  SAVED_REPORT_STATUS_LABELS,
  SAVED_REPORT_TYPE_LABELS,
} from '../../types/reportsCenter';

type NoteAction = 'submit' | 'approve' | 'reject' | 'return' | 'archive' | null;

export function SavedReportDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const queryClient = useQueryClient();
  const [noteAction, setNoteAction] = useState<NoteAction>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.savedDetail(id),
    queryFn: () => fetchSavedReport(id),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: REPORTS_CENTER_QUERY_KEYS.all });
    void refetch();
  };

  const runNoteAction = useMutation({
    mutationFn: async () => {
      if (!id || !noteAction) return;
      if (noteAction === 'submit') return submitReport(id, { notes: notes || null });
      if (noteAction === 'approve') return approveReport(id, { notes: notes || null });
      if (noteAction === 'reject') return rejectReport(id, { notes: notes.trim() });
      if (noteAction === 'return') return returnReport(id, { notes: notes || null });
      if (noteAction === 'archive') return archiveReport(id, { notes: notes || null });
    },
    onSuccess: () => {
      setNoteAction(null);
      setNotes('');
      setMsg({ type: 'success', text: 'تم تنفيذ الإجراء بنجاح.' });
      invalidate();
    },
    onError: (err) => {
      setMsg({ type: 'error', text: (err as Error)?.message ?? 'فشل تنفيذ الإجراء.' });
    },
  });

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!id || !data) return;
    setBusy(format);
    try {
      const blob =
        format === 'pdf' ? await exportSavedReportPdf(id) : await exportSavedReportCsv(id);
      triggerBlobDownload(blob, `${data.reportNumber}.${format}`);
      setMsg({ type: 'success', text: 'تم تنزيل الملف.' });
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error)?.message ?? 'فشل التصدير.' });
    } finally {
      setBusy(null);
    }
  };

  const handleVersion = async () => {
    if (!id) return;
    setBusy('version');
    try {
      const next = await createReportVersion(id);
      setMsg({ type: 'success', text: 'تم إنشاء نسخة جديدة.' });
      invalidate();
      void queryClient.setQueryData(REPORTS_CENTER_QUERY_KEYS.savedDetail(next.id), next);
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error)?.message ?? 'فشل إنشاء النسخة.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <PermissionGate anyOf={[PermissionCodes.REPORTS_VIEW]}>
      <ReportsPrintStyles />
      <Box className="report-print-root">
        <ReportsPageHeader
          title={data?.title ?? 'تفاصيل التقرير'}
          subtitle={
            data
              ? `${data.reportNumber} — ${SAVED_REPORT_TYPE_LABELS[data.reportType] ?? data.reportType}`
              : undefined
          }
          actions={
            <Stack direction="row" spacing={1} className="no-print" sx={{ flexWrap: 'wrap' }}>
              <Button component={RouterLink} to="/reports/saved" variant="outlined" size="small">
                العودة للقائمة
              </Button>
              <Button
                size="small"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
              >
                طباعة
              </Button>
              {hasPermission(permissions, [PermissionCodes.REPORTS_EXPORT_PDF]) ? (
                <Button
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  disabled={busy !== null}
                  onClick={() => void handleExport('pdf')}
                >
                  PDF
                </Button>
              ) : null}
              {hasPermission(permissions, [PermissionCodes.REPORTS_EXPORT_CSV]) ? (
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  disabled={busy !== null}
                  onClick={() => void handleExport('csv')}
                >
                  CSV
                </Button>
              ) : null}
            </Stack>
          }
        />

        {msg ? (
          <Alert severity={msg.type} sx={{ mb: 2 }} className="no-print" onClose={() => setMsg(null)}>
            {msg.text}
          </Alert>
        ) : null}

        {isLoading ? <ReportsDetailSkeleton /> : null}
        {isError ? (
          <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل التقرير.'}</Alert>
        ) : null}

        {data ? (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} className="no-print">
              <Chip label={SAVED_REPORT_STATUS_LABELS[data.status] ?? data.status} color="primary" />
              <Chip label={`الإصدار ${data.version}`} variant="outlined" />
              <Chip
                label={`${new Date(data.dateFrom).toLocaleDateString('ar-SA')} → ${new Date(data.dateTo).toLocaleDateString('ar-SA')}`}
                variant="outlined"
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }} className="no-print">
              {hasPermission(permissions, [PermissionCodes.REPORTS_SUBMIT]) &&
              (data.status === 'GENERATED' || data.status === 'DRAFT') ? (
                <Button
                  startIcon={<SendIcon />}
                  variant="contained"
                  onClick={() => setNoteAction('submit')}
                >
                  إرسال للاعتماد
                </Button>
              ) : null}
              {hasPermission(permissions, [PermissionCodes.REPORTS_APPROVE]) &&
              data.status === 'UNDER_REVIEW' ? (
                <Button
                  startIcon={<CheckCircleIcon />}
                  color="success"
                  variant="contained"
                  onClick={() => setNoteAction('approve')}
                >
                  اعتماد
                </Button>
              ) : null}
              {hasPermission(permissions, [PermissionCodes.REPORTS_REJECT]) &&
              data.status === 'UNDER_REVIEW' ? (
                <Button
                  startIcon={<CancelIcon />}
                  color="error"
                  variant="outlined"
                  onClick={() => setNoteAction('reject')}
                >
                  رفض
                </Button>
              ) : null}
              {hasPermission(permissions, [PermissionCodes.REPORTS_RETURN]) &&
              data.status === 'UNDER_REVIEW' ? (
                <Button
                  startIcon={<UndoIcon />}
                  variant="outlined"
                  onClick={() => setNoteAction('return')}
                >
                  إعادة للتعديل
                </Button>
              ) : null}
              {hasPermission(permissions, [PermissionCodes.REPORTS_ARCHIVE]) &&
              data.status === 'APPROVED' ? (
                <Button
                  startIcon={<ArchiveIcon />}
                  variant="outlined"
                  onClick={() => setNoteAction('archive')}
                >
                  أرشفة
                </Button>
              ) : null}
              {hasPermission(permissions, [PermissionCodes.REPORTS_CREATE_VERSION]) ? (
                <Button
                  startIcon={<ReplayIcon />}
                  variant="outlined"
                  disabled={busy !== null}
                  onClick={() => void handleVersion()}
                >
                  إنشاء نسخة
                </Button>
              ) : null}
            </Stack>

            <Box className="print-only" sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {data.title}
              </Typography>
              <Typography variant="body2">
                {data.reportNumber} — {SAVED_REPORT_TYPE_LABELS[data.reportType]} —{' '}
                {SAVED_REPORT_STATUS_LABELS[data.status]}
              </Typography>
            </Box>

            {data.notes ? (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    ملاحظات
                  </Typography>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>{data.notes}</Typography>
                </CardContent>
              </Card>
            ) : null}

            {data.recommendations ? (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    التوصيات
                  </Typography>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>{data.recommendations}</Typography>
                </CardContent>
              </Card>
            ) : null}

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              أقسام التقرير
            </Typography>
            <Stack spacing={2}>
              {(data.sections ?? [])
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((section) => (
                  <Card key={section.id} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        {section.title}
                      </Typography>
                      {section.textContent ? (
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>{section.textContent}</Typography>
                      ) : null}
                      {section.contentJson != null ? (
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            mt: section.textContent ? 1.5 : 0,
                            p: 1.5,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            overflow: 'auto',
                            fontSize: 12,
                            dir: 'ltr',
                            textAlign: 'left',
                          }}
                        >
                          {JSON.stringify(section.contentJson, null, 2)}
                        </Box>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
            </Stack>

            {(data.approvals?.length ?? 0) > 0 ? (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  سجل الاعتماد
                </Typography>
                <Stack spacing={1}>
                  {data.approvals!.map((a) => (
                    <Card key={a.id} variant="outlined">
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {a.action} — {a.approver?.fullName ?? '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(a.createdAt).toLocaleString('ar-SA')}
                          {a.notes ? ` — ${a.notes}` : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </>
            ) : null}
          </>
        ) : null}

        <Dialog open={noteAction !== null} onClose={() => setNoteAction(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            {noteAction === 'reject'
              ? 'رفض التقرير'
              : noteAction === 'approve'
                ? 'اعتماد التقرير'
                : noteAction === 'submit'
                  ? 'إرسال للاعتماد'
                  : noteAction === 'return'
                    ? 'إعادة للتعديل'
                    : 'أرشفة التقرير'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={noteAction === 'reject' ? 'سبب الرفض (مطلوب)' : 'ملاحظات'}
              fullWidth
              multiline
              minRows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNoteAction(null)}>إلغاء</Button>
            <Button
              variant="contained"
              disabled={
                runNoteAction.isPending || (noteAction === 'reject' && notes.trim().length === 0)
              }
              onClick={() => runNoteAction.mutate()}
            >
              تأكيد
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  );
}
