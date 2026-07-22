import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addViolationAttachments,
  updateViolation,
  type ViolationAttachmentInput,
} from '../../api/violations';
import { uploadBase64 } from '../../api/uploads';
import { getSocketUrl } from '../../config/env';
import type { Violation, ViolationAttachment } from '../../types/cctv';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  getViolationEvidenceCapabilities,
  type ViolationEvidenceCapabilities,
} from '../hooks/useViolationEvidenceCapabilities';

interface ViolationEvidencePanelProps {
  violation: Violation;
  roleCode: string;
  permissions: string[];
}

function resolveAttachmentUrl(attachment: ViolationAttachment): string | null {
  const path = attachment.imagePath || (attachment.storageKey ? `/uploads/${attachment.storageKey}` : null);
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  return `${getSocketUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

export function ViolationEvidencePanel({
  violation,
  roleCode,
  permissions,
}: ViolationEvidencePanelProps) {
  const queryClient = useQueryClient();
  const caps = useMemo(
    () => getViolationEvidenceCapabilities(roleCode, permissions),
    [roleCode, permissions],
  );

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { capture: captureLocation, loading: geoLoading, error: geoError } = useGeolocation();

  const [notes, setNotes] = useState(violation.notes ?? '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const attachments = violation.attachments ?? [];
  const photoCount = attachments.length + (violation.imagePath && attachments.length === 0 ? 1 : 0);
  const lastAttachment = attachments[attachments.length - 1];
  const lastPreview =
    (lastAttachment ? resolveAttachmentUrl(lastAttachment) : null) ||
    (violation.imagePath
      ? violation.imagePath.startsWith('http')
        ? violation.imagePath
        : `${getSocketUrl()}${violation.imagePath.startsWith('/') ? violation.imagePath : `/${violation.imagePath}`}`
      : null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['violations'] });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded: ViolationAttachmentInput[] = [];
      for (const [index, file] of files.entries()) {
        const contentBase64 = await fileToBase64(file);
        const saved = await uploadBase64({
          fileName: file.name || `violation-${violation.id}-${Date.now()}.jpg`,
          mimeType: file.type || 'image/jpeg',
          contentBase64,
          folder: 'violations',
        });
        uploaded.push({
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
          storageKey: saved.storageKey,
          imagePath: saved.url,
          sortOrder: attachments.length + index,
        });
      }
      return addViolationAttachments(violation.id, uploaded);
    },
    onSuccess: async () => {
      setPendingFiles([]);
      setLocalError(null);
      await invalidate();
    },
    onError: (err) => {
      setLocalError((err as Error)?.message ?? 'تعذّر رفع صور المخالفة.');
    },
  });

  const notesMutation = useMutation({
    mutationFn: async () => {
      let gpsLatitude: number | null | undefined;
      let gpsLongitude: number | null | undefined;
      if (caps.canSetLocation) {
        const pos = await captureLocation();
        if (pos) {
          gpsLatitude = pos.latitude;
          gpsLongitude = pos.longitude;
        }
      }
      return updateViolation(violation.id, {
        notes: notes.trim() || null,
        ...(gpsLatitude !== undefined
          ? { gpsLatitude, gpsLongitude: gpsLongitude ?? null }
          : {}),
      });
    },
    onSuccess: async () => {
      setLocalError(null);
      await invalidate();
    },
    onError: (err) => {
      setLocalError((err as Error)?.message ?? 'تعذّر حفظ الملاحظات.');
    },
  });

  const requestPhotosMutation = useMutation({
    mutationFn: () =>
      updateViolation(violation.id, {
        notes: `${notes.trim() ? `${notes.trim()}\n` : ''}[طلب مشرف] يرجى إرفاق صور إضافية للمخالفة.`,
      }),
    onSuccess: async () => {
      setLocalError(null);
      await invalidate();
    },
  });

  const closed = violation.status === 'RESOLVED' || violation.status === 'CANCELLED';

  const canAddNow =
    !closed &&
    (caps.canCapture || caps.canPickGallery || caps.canUploadFromSystem) &&
    (violation.status !== 'IN_PROGRESS' || caps.canAddDuringProcessing || caps.canUploadFromSystem);

  const onFilesSelected = (files: FileList | null, multi: boolean) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    setPendingFiles(multi ? selected : selected.slice(0, 1));
  };

  return (
    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: 'divider' }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>الأدلة</Typography>

      <Stack spacing={0.5} sx={{ mb: 1.25 }}>
        <Typography variant="body2" color="text.secondary">
          عدد الصور: <strong>{photoCount}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          آخر صورة:{' '}
          <strong>
            {lastAttachment?.fileName ??
              (violation.imagePath ? 'صورة رئيسية' : 'لا توجد صور')}
          </strong>
        </Typography>
      </Stack>

      {lastPreview && caps.canReviewPhotos ? (
        <Box
          component="img"
          src={lastPreview}
          alt="آخر دليل"
          sx={{
            width: '100%',
            maxHeight: 160,
            objectFit: 'cover',
            borderRadius: 2,
            mb: 1,
            border: 1,
            borderColor: 'divider',
          }}
        />
      ) : null}

      <Stack spacing={1}>
        {caps.canReviewPhotos ? (
          <Button
            className="mobile-btn"
            variant="outlined"
            fullWidth
            sx={{ minHeight: 48 }}
            onClick={() => setViewerOpen(true)}
          >
            عرض الصور
          </Button>
        ) : null}

        {canAddNow && caps.canCapture ? (
          <Button
            className="mobile-btn"
            variant="contained"
            fullWidth
            sx={{ minHeight: 48 }}
            onClick={() => cameraInputRef.current?.click()}
          >
            📷 تصوير المركبة
          </Button>
        ) : null}

        {canAddNow && (caps.canPickGallery || caps.canUploadFromSystem) ? (
          <Button
            className="mobile-btn"
            variant="outlined"
            fullWidth
            sx={{ minHeight: 48 }}
            onClick={() => galleryInputRef.current?.click()}
          >
            🖼 اختيار صورة
          </Button>
        ) : null}

        {pendingFiles.length > 0 ? (
          <Alert severity="info">
            تم اختيار {pendingFiles.length} ملف/ملفات. اضغط رفع لإرسالها.
          </Alert>
        ) : null}

        {pendingFiles.length > 0 ? (
          <Button
            className="mobile-btn"
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ minHeight: 48 }}
            disabled={uploadMutation.isPending}
            onClick={() => uploadMutation.mutate(pendingFiles)}
          >
            {uploadMutation.isPending ? 'جاري الرفع…' : `رفع ${pendingFiles.length} صورة`}
          </Button>
        ) : null}

        {caps.canAddNotes ? (
          <>
            <TextField
              className="mobile-input"
              label="ملاحظات"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
            />
            <Button
              className="mobile-btn"
              variant="outlined"
              fullWidth
              sx={{ minHeight: 48 }}
              disabled={notesMutation.isPending || geoLoading}
              onClick={() => notesMutation.mutate()}
            >
              {caps.canSetLocation ? 'حفظ الملاحظات وتحديد الموقع' : 'حفظ الملاحظات'}
            </Button>
          </>
        ) : null}

        {caps.canRequestMorePhotos && !closed ? (
          <Button
            className="mobile-btn"
            variant="text"
            fullWidth
            sx={{ minHeight: 48 }}
            disabled={requestPhotosMutation.isPending}
            onClick={() => requestPhotosMutation.mutate()}
          >
            طلب صور إضافية
          </Button>
        ) : null}
      </Stack>

      {(localError || geoError) && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {localError ?? geoError}
        </Alert>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          onFilesSelected(e.target.files, false);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple={caps.canMultiUpload}
        hidden
        onChange={(e) => {
          onFilesSelected(e.target.files, caps.canMultiUpload);
          e.target.value = '';
        }}
      />

      <Dialog open={viewerOpen} onClose={() => setViewerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>صور الأدلة</DialogTitle>
        <DialogContent dividers>
          {photoCount === 0 ? (
            <Typography color="text.secondary">لا توجد صور مرفقة.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {attachments.length > 0
                ? attachments.map((item) => {
                    const url = resolveAttachmentUrl(item);
                    return (
                      <Box key={item.id}>
                        <Typography variant="caption" color="text.secondary">
                          {item.fileName}
                        </Typography>
                        {url ? (
                          <Box
                            component="img"
                            src={url}
                            alt={item.fileName}
                            sx={{
                              width: '100%',
                              borderRadius: 1,
                              mt: 0.5,
                              border: 1,
                              borderColor: 'divider',
                            }}
                          />
                        ) : null}
                      </Box>
                    );
                  })
                : lastPreview ? (
                    <Box
                      component="img"
                      src={lastPreview}
                      alt="دليل"
                      sx={{ width: '100%', borderRadius: 1 }}
                    />
                  ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewerOpen(false)} sx={{ minHeight: 48 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export type { ViolationEvidenceCapabilities };
