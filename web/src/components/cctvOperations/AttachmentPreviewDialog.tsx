import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { triggerBlobDownload } from '../../api/cctvOperations';

interface AttachmentPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  fileName?: string | null;
  mimeType?: string | null;
  loadBlob: () => Promise<Blob>;
}

export function AttachmentPreviewDialog({
  open,
  onClose,
  title = 'معاينة المرفق',
  fileName,
  mimeType,
  loadBlob,
}: AttachmentPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open) return;
    let revoked = false;
    setLoading(true);
    setError(null);
    setObjectUrl(null);
    setBlob(null);

    void loadBlob()
      .then((b) => {
        if (revoked) return;
        setBlob(b);
        setObjectUrl(URL.createObjectURL(b));
      })
      .catch((e: Error) => {
        if (!revoked) setError(e.message ?? 'تعذّر تحميل المرفق.');
      })
      .finally(() => {
        if (!revoked) setLoading(false);
      });

    return () => {
      revoked = true;
    };
  }, [open, loadBlob]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const resolvedMime = mimeType ?? blob?.type ?? '';
  const isImage = resolvedMime.startsWith('image/');
  const isPdf = resolvedMime === 'application/pdf';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <IconButton onClick={onClose} size="small" aria-label="إغلاق">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : null}
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : null}
        {!loading && !error && objectUrl ? (
          <Box>
            {isImage ? (
              <Box
                component="img"
                src={objectUrl}
                alt={fileName ?? 'مرفق'}
                sx={{ maxWidth: '100%', maxHeight: 480, display: 'block', mx: 'auto' }}
              />
            ) : null}
            {isPdf ? (
              <Box
                component="iframe"
                src={objectUrl}
                title={fileName ?? 'PDF'}
                sx={{ width: '100%', height: 480, border: 0 }}
              />
            ) : null}
            {!isImage && !isPdf ? (
              <Stack spacing={1} sx={{ alignItems: 'center', py: 4 }}>
                <Typography>لا تتوفر معاينة لهذا النوع من الملفات.</Typography>
                <Typography variant="body2" color="text.secondary">
                  {fileName ?? 'مرفق'}
                </Typography>
              </Stack>
            ) : null}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={!blob}
          onClick={() => {
            if (blob) triggerBlobDownload(blob, fileName ?? 'attachment');
          }}
        >
          تنزيل
        </Button>
      </DialogActions>
    </Dialog>
  );
}
