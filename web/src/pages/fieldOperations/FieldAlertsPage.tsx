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
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  acknowledgeFieldAlert,
  createFieldAlert,
  FIELD_OPS_QUERY_KEYS,
  listFieldAlerts,
  resolveFieldAlert,
} from '../../api/fieldOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { TableSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import {
  ALERT_SEVERITY_LABELS,
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  type FieldAlertSeverity,
  type FieldAlertType,
} from '../../types/fieldOperations';

export function FieldAlertsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const canCreate = hasPermission(perms, [PermissionCodes.FIELD_ALERTS_CREATE]);
  const canAck = hasPermission(perms, [PermissionCodes.FIELD_ALERTS_ACKNOWLEDGE]);
  const canResolve = hasPermission(perms, [PermissionCodes.FIELD_ALERTS_RESOLVE]);

  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [alertType, setAlertType] = useState<FieldAlertType>('SECURITY_NOTICE');
  const [severity, setSeverity] = useState<FieldAlertSeverity>('MEDIUM');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
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
    queryKey: FIELD_OPS_QUERY_KEYS.alerts(listParams),
    queryFn: () => listFieldAlerts(listParams),
    refetchInterval: 30_000,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all });
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const createMutation = useMutation({
    mutationFn: () =>
      createFieldAlert({
        title: title.trim(),
        description: description.trim(),
        alertType,
        severity,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      notify('تم إنشاء التنبيه.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الإنشاء.', 'error'),
  });

  const ackMutation = useMutation({
    mutationFn: acknowledgeFieldAlert,
    onSuccess: () => {
      invalidate();
      notify('تم استلام التنبيه.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الاستلام.', 'error'),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      resolveFieldAlert(id, { resolutionNote: note || null }),
    onSuccess: () => {
      invalidate();
      setResolveId(null);
      setResolutionNote('');
      notify('تم حل التنبيه.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحل.', 'error'),
  });

  return (
    <Box>
      <FieldOpsPageHeader
        title="التنبيهات الميدانية"
        subtitle="متابعة التنبيهات ونداءات الاستغاثة"
        actions={
          canCreate ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              تنبيه جديد
            </Button>
          ) : null
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
          {Object.entries(ALERT_STATUS_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل التنبيهات.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? <Alert severity="info">لا توجد تنبيهات.</Alert> : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>العنوان</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الخطورة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الوقت</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{ALERT_TYPE_LABELS[row.alertType]}</TableCell>
                  <TableCell>
                    <Chip size="small" label={ALERT_SEVERITY_LABELS[row.severity]} color="warning" />
                  </TableCell>
                  <TableCell>{ALERT_STATUS_LABELS[row.status]}</TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleString('ar-SA')}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                      {canAck && row.status === 'NEW' ? (
                        <Button size="small" onClick={() => ackMutation.mutate(row.id)}>
                          استلام
                        </Button>
                      ) : null}
                      {canResolve &&
                      row.status !== 'RESOLVED' &&
                      row.status !== 'CANCELLED' ? (
                        <Button size="small" variant="contained" onClick={() => setResolveId(row.id)}>
                          حل
                        </Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تنبيه ميداني جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="العنوان"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="الوصف"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              fullWidth
              multiline
              minRows={3}
            />
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                label="النوع"
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as FieldAlertType)}
              >
                {(Object.keys(ALERT_TYPE_LABELS) as FieldAlertType[])
                  .filter((t) => t !== 'SOS')
                  .map((k) => (
                    <MenuItem key={k} value={k}>
                      {ALERT_TYPE_LABELS[k]}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الخطورة</InputLabel>
              <Select
                label="الخطورة"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as FieldAlertSeverity)}
              >
                {(Object.keys(ALERT_SEVERITY_LABELS) as FieldAlertSeverity[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {ALERT_SEVERITY_LABELS[k]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!title.trim() || !description.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resolveId)} onClose={() => setResolveId(null)} fullWidth maxWidth="sm">
        <DialogTitle>حل التنبيه</DialogTitle>
        <DialogContent>
          <TextField
            label="ملاحظة الحل"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveId(null)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!resolveId || resolveMutation.isPending}
            onClick={() =>
              resolveId && resolveMutation.mutate({ id: resolveId, note: resolutionNote })
            }
          >
            تأكيد
          </Button>
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
