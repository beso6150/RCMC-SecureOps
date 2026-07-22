import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createSosAlert, FIELD_OPS_QUERY_KEYS } from '../../api/fieldOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';

interface SosButtonProps {
  zoneId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  size?: 'small' | 'medium' | 'large';
}

export function SosButton({ zoneId, mapX, mapY, size = 'medium' }: SosButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = hasPermission(user?.permissions ?? [], [PermissionCodes.FIELD_ALERTS_CREATE]);
  const [open, setOpen] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const mutation = useMutation({
    mutationFn: () =>
      createSosAlert({
        description: 'نداء استغاثة ميداني من تطبيق الويب',
        zoneId: zoneId ?? null,
        mapX: mapX ?? null,
        mapY: mapY ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all });
      setOpen(false);
      setSnack({ open: true, message: 'تم إرسال نداء الاستغاثة بنجاح.', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnack({
        open: true,
        message: err.message ?? 'تعذّر إرسال نداء الاستغاثة.',
        severity: 'error',
      });
    },
  });

  if (!canCreate) return null;

  return (
    <>
      <Button
        color="error"
        variant="contained"
        size={size}
        startIcon={<WarningAmberIcon />}
        onClick={() => setOpen(true)}
        sx={{ fontWeight: 800 }}
      >
        استغاثة SOS
      </Button>

      <Dialog open={open} onClose={() => !mutation.isPending && setOpen(false)}>
        <DialogTitle>تأكيد نداء الاستغاثة</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من إرسال نداء استغاثة SOS؟ سيتم تنبيه المشرفين فوراً عبر النظام (بدون رسائل
            SMS).
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'جاري الإرسال…' : 'تأكيد الإرسال'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
