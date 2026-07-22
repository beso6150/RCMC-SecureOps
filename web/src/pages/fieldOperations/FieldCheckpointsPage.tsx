import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import QrCodeIcon from '@mui/icons-material/QrCode';
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
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  createCheckpoint,
  deleteCheckpoint,
  FIELD_OPS_QUERY_KEYS,
  listCheckpoints,
  listZones,
  regenerateCheckpointQr,
  updateCheckpoint,
} from '../../api/fieldOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { QrCodePanel } from '../../components/fieldOperations/QrCodePanel';
import { TableSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import {
  CHECKPOINT_TYPE_LABELS,
  type CheckpointType,
  type SecurityCheckpoint,
} from '../../types/fieldOperations';
import { createClientSyncId } from '../../utils/patrolOfflineQueue';

interface CheckpointForm {
  name: string;
  code: string;
  description: string;
  zoneId: string;
  mapX: string;
  mapY: string;
  checkpointType: CheckpointType;
  requiredForPatrol: boolean;
  isActive: boolean;
}

const emptyForm = (): CheckpointForm => ({
  name: '',
  code: '',
  description: '',
  zoneId: '',
  mapX: '100',
  mapY: '100',
  checkpointType: 'GENERAL',
  requiredForPatrol: true,
  isActive: true,
});

export function FieldCheckpointsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const canCreate = hasPermission(perms, [PermissionCodes.CHECKPOINTS_CREATE]);
  const canUpdate = hasPermission(perms, [PermissionCodes.CHECKPOINTS_UPDATE]);
  const canDelete = hasPermission(perms, [PermissionCodes.CHECKPOINTS_DELETE]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SecurityCheckpoint | null>(null);
  const [qrTarget, setQrTarget] = useState<SecurityCheckpoint | null>(null);
  const [form, setForm] = useState<CheckpointForm>(emptyForm());
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.checkpoints({ pageSize: 200 }),
    queryFn: () => listCheckpoints({ pageSize: 200 }),
  });

  const { data: zones } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.zones({ pageSize: 200, isActive: true }),
    queryFn: () => listZones({ pageSize: 200, isActive: true }),
    enabled: open,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all });
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || null,
        zoneId: form.zoneId,
        mapX: Number(form.mapX) || 0,
        mapY: Number(form.mapY) || 0,
        checkpointType: form.checkpointType,
        requiredForPatrol: form.requiredForPatrol,
        isActive: form.isActive,
        ...(editing ? {} : { qrCodeValue: `CP-${form.code.trim() || createClientSyncId()}` }),
      };
      if (editing) return updateCheckpoint(editing.id, payload);
      return createCheckpoint(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
      notify(editing ? 'تم تحديث النقطة.' : 'تم إنشاء النقطة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحفظ.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCheckpoint,
    onSuccess: () => {
      invalidate();
      notify('تم حذف النقطة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحذف.', 'error'),
  });

  const regenMutation = useMutation({
    mutationFn: regenerateCheckpointQr,
    onSuccess: (cp) => {
      invalidate();
      setQrTarget(cp);
      notify('تم توليد رمز QR جديد.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر توليد QR.', 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (cp: SecurityCheckpoint) => {
    setEditing(cp);
    setForm({
      name: cp.name,
      code: cp.code,
      description: cp.description ?? '',
      zoneId: cp.zoneId,
      mapX: String(cp.mapX),
      mapY: String(cp.mapY),
      checkpointType: cp.checkpointType,
      requiredForPatrol: cp.requiredForPatrol,
      isActive: cp.isActive,
    });
    setOpen(true);
  };

  return (
    <Box>
      <FieldOpsPageHeader
        title="النقاط الأمنية"
        subtitle="إدارة نقاط التفتيش ورمز QR وموضعها على الخريطة"
        actions={
          canCreate ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              نقطة جديدة
            </Button>
          ) : null
        }
      />

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل النقاط.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? <Alert severity="info">لا توجد نقاط أمنية بعد.</Alert> : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>الرمز</TableCell>
                <TableCell>المنطقة</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الخريطة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.zone?.name ?? row.zoneId}</TableCell>
                  <TableCell>{CHECKPOINT_TYPE_LABELS[row.checkpointType]}</TableCell>
                  <TableCell>
                    ({row.mapX.toFixed(0)}, {row.mapY.toFixed(0)})
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={row.isActive ? 'success' : 'default'}
                      label={row.isActive ? 'نشط' : 'موقوف'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="QR">
                      <IconButton size="small" onClick={() => setQrTarget(row)}>
                        <QrCodeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canUpdate ? (
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete ? (
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm('هل تريد حذف هذه النقطة؟')) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'تعديل نقطة' : 'نقطة جديدة'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="الاسم"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="الرمز"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="الوصف"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <FormControl fullWidth>
              <InputLabel>المنطقة</InputLabel>
              <Select
                label="المنطقة"
                value={form.zoneId}
                onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))}
              >
                {(zones?.data ?? []).map((z) => (
                  <MenuItem key={z.id} value={z.id}>
                    {z.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                label="النوع"
                value={form.checkpointType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkpointType: e.target.value as CheckpointType }))
                }
              >
                {(Object.keys(CHECKPOINT_TYPE_LABELS) as CheckpointType[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {CHECKPOINT_TYPE_LABELS[k]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField
                label="mapX"
                type="number"
                value={form.mapX}
                onChange={(e) => setForm((f) => ({ ...f, mapX: e.target.value }))}
                fullWidth
              />
              <TextField
                label="mapY"
                type="number"
                value={form.mapY}
                onChange={(e) => setForm((f) => ({ ...f, mapY: e.target.value }))}
                fullWidth
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={form.requiredForPatrol}
                  onChange={(e) => setForm((f) => ({ ...f, requiredForPatrol: e.target.checked }))}
                />
              }
              label="مطلوبة للجولة"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
              }
              label="نشطة"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={
              !form.name.trim() ||
              !form.code.trim() ||
              !form.zoneId ||
              saveMutation.isPending
            }
            onClick={() => saveMutation.mutate()}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(qrTarget)} onClose={() => setQrTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>رمز QR — {qrTarget?.name}</DialogTitle>
        <DialogContent>
          {qrTarget ? <QrCodePanel value={qrTarget.qrCodeValue} label={qrTarget.name} /> : null}
        </DialogContent>
        <DialogActions>
          {canUpdate && qrTarget ? (
            <Button onClick={() => regenMutation.mutate(qrTarget.id)} disabled={regenMutation.isPending}>
              توليد جديد
            </Button>
          ) : null}
          <Button onClick={() => setQrTarget(null)}>إغلاق</Button>
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
