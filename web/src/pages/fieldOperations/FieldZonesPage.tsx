import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
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
  createZone,
  deleteZone,
  FIELD_OPS_QUERY_KEYS,
  listZones,
  updateZone,
} from '../../api/fieldOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { TableSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import {
  ZONE_TYPE_LABELS,
  type SecurityZone,
  type SecurityZoneType,
} from '../../types/fieldOperations';

interface ZoneForm {
  name: string;
  code: string;
  description: string;
  zoneType: SecurityZoneType;
  parentId: string;
  floorNumber: string;
  mapX: string;
  mapY: string;
  width: string;
  height: string;
  color: string;
  isActive: boolean;
}

const emptyForm = (): ZoneForm => ({
  name: '',
  code: '',
  description: '',
  zoneType: 'FLOOR',
  parentId: '',
  floorNumber: '',
  mapX: '80',
  mapY: '80',
  width: '180',
  height: '120',
  color: '#0f766e',
  isActive: true,
});

export function FieldZonesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const canCreate = hasPermission(perms, [PermissionCodes.SECURITY_ZONES_CREATE]);
  const canUpdate = hasPermission(perms, [PermissionCodes.SECURITY_ZONES_UPDATE]);
  const canDelete = hasPermission(perms, [PermissionCodes.SECURITY_ZONES_DELETE]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SecurityZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm());
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.zones({ pageSize: 200 }),
    queryFn: () => listZones({ pageSize: 200 }),
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
        zoneType: form.zoneType,
        parentId: form.parentId || null,
        floorNumber: form.floorNumber ? Number(form.floorNumber) : null,
        mapX: Number(form.mapX) || 0,
        mapY: Number(form.mapY) || 0,
        width: Number(form.width) || 100,
        height: Number(form.height) || 80,
        color: form.color || '#0f766e',
        isActive: form.isActive,
      };
      if (editing) return updateZone(editing.id, payload);
      return createZone(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
      notify(editing ? 'تم تحديث المنطقة.' : 'تم إنشاء المنطقة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحفظ.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteZone,
    onSuccess: () => {
      invalidate();
      notify('تم حذف المنطقة.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحذف.', 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (zone: SecurityZone) => {
    setEditing(zone);
    setForm({
      name: zone.name,
      code: zone.code,
      description: zone.description ?? '',
      zoneType: zone.zoneType,
      parentId: zone.parentId ?? '',
      floorNumber: zone.floorNumber != null ? String(zone.floorNumber) : '',
      mapX: String(zone.mapX),
      mapY: String(zone.mapY),
      width: String(zone.width),
      height: String(zone.height),
      color: zone.color,
      isActive: zone.isActive,
    });
    setOpen(true);
  };

  return (
    <Box>
      <FieldOpsPageHeader
        title="إدارة المواقع والمناطق"
        subtitle="المباني والطوابق والمواقف والمناطق الأمنية على الخريطة"
        actions={
          canCreate ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              منطقة جديدة
            </Button>
          ) : null
        }
      />

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المناطق.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? <Alert severity="info">لا توجد مناطق بعد.</Alert> : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>الرمز</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الطابق</TableCell>
                <TableCell>الموضع</TableCell>
                <TableCell>الحالة</TableCell>
                {(canUpdate || canDelete) && <TableCell align="center">إجراءات</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: 0.5,
                          bgcolor: row.color,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <span>{row.name}</span>
                    </Stack>
                  </TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{ZONE_TYPE_LABELS[row.zoneType]}</TableCell>
                  <TableCell>{row.floorNumber ?? '—'}</TableCell>
                  <TableCell>
                    ({row.mapX.toFixed(0)}, {row.mapY.toFixed(0)}) · {row.width.toFixed(0)}×
                    {row.height.toFixed(0)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={row.isActive ? 'success' : 'default'}
                      label={row.isActive ? 'نشط' : 'موقوف'}
                    />
                  </TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell align="center">
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
                              if (window.confirm('هل تريد حذف هذه المنطقة؟')) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'تعديل منطقة' : 'منطقة جديدة'}</DialogTitle>
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
              <InputLabel>النوع</InputLabel>
              <Select
                label="النوع"
                value={form.zoneType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, zoneType: e.target.value as SecurityZoneType }))
                }
              >
                {(Object.keys(ZONE_TYPE_LABELS) as SecurityZoneType[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {ZONE_TYPE_LABELS[k]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>المنطقة الأم</InputLabel>
              <Select
                label="المنطقة الأم"
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              >
                <MenuItem value="">بدون</MenuItem>
                {(data?.data ?? [])
                  .filter((z) => z.id !== editing?.id)
                  .map((z) => (
                    <MenuItem key={z.id} value={z.id}>
                      {z.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="رقم الطابق"
              type="number"
              value={form.floorNumber}
              onChange={(e) => setForm((f) => ({ ...f, floorNumber: e.target.value }))}
              fullWidth
            />
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
            <Stack direction="row" spacing={2}>
              <TextField
                label="العرض"
                type="number"
                value={form.width}
                onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))}
                fullWidth
              />
              <TextField
                label="الارتفاع"
                type="number"
                value={form.height}
                onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="اللون"
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
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
            disabled={!form.name.trim() || !form.code.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            حفظ
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
