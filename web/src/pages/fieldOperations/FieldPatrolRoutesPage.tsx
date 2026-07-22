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
  IconButton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  createPatrolRoute,
  deletePatrolRoute,
  FIELD_OPS_QUERY_KEYS,
  listCheckpoints,
  listPatrolRoutes,
  updatePatrolRoute,
} from '../../api/fieldOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { TableSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import type { PatrolRoute } from '../../types/fieldOperations';

interface RouteForm {
  name: string;
  description: string;
  estimatedDurationMinutes: string;
  checkpointIds: string[];
}

const emptyForm = (): RouteForm => ({
  name: '',
  description: '',
  estimatedDurationMinutes: '60',
  checkpointIds: [],
});

export function FieldPatrolRoutesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission(user?.permissions ?? [], [PermissionCodes.PATROL_ROUTES_MANAGE]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PatrolRoute | null>(null);
  const [form, setForm] = useState<RouteForm>(emptyForm());
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.routes({ pageSize: 100 }),
    queryFn: () => listPatrolRoutes({ pageSize: 100 }),
  });

  const { data: checkpoints } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.checkpoints({ pageSize: 200, isActive: true }),
    queryFn: () => listCheckpoints({ pageSize: 200, isActive: true }),
    enabled: open,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all });
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        estimatedDurationMinutes: Number(form.estimatedDurationMinutes) || 60,
        checkpoints: form.checkpointIds.map((checkpointId, orderIndex) => ({
          checkpointId,
          orderIndex,
          expectedMinutesFromStart: (orderIndex + 1) * 10,
          isRequired: true,
        })),
      };
      if (editing) return updatePatrolRoute(editing.id, payload);
      return createPatrolRoute(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
      notify(editing ? 'تم تحديث المسار.' : 'تم إنشاء المسار.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحفظ.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatrolRoute,
    onSuccess: () => {
      invalidate();
      notify('تم حذف المسار.');
    },
    onError: (e: Error) => notify(e.message ?? 'تعذّر الحذف.', 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (route: PatrolRoute) => {
    setEditing(route);
    setForm({
      name: route.name,
      description: route.description ?? '',
      estimatedDurationMinutes: String(route.estimatedDurationMinutes),
      checkpointIds: (route.checkpoints ?? [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((c) => c.checkpointId),
    });
    setOpen(true);
  };

  const toggleCheckpoint = (id: string) => {
    setForm((prev) => ({
      ...prev,
      checkpointIds: prev.checkpointIds.includes(id)
        ? prev.checkpointIds.filter((x) => x !== id)
        : [...prev.checkpointIds, id],
    }));
  };

  return (
    <Box>
      <FieldOpsPageHeader
        title="مسارات الجولات"
        subtitle="تعريف المسارات وترتيب النقاط الأمنية"
        actions={
          canManage ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              مسار جديد
            </Button>
          ) : null
        }
      />

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المسارات.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? <Alert severity="info">لا توجد مسارات بعد.</Alert> : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>المدة (د)</TableCell>
                <TableCell>النقاط</TableCell>
                <TableCell>الحالة</TableCell>
                {canManage ? <TableCell align="center">إجراءات</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.estimatedDurationMinutes}</TableCell>
                  <TableCell>
                    {row._count?.checkpoints ?? row.checkpoints?.length ?? 0}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={row.isActive ? 'success' : 'default'}
                      label={row.isActive ? 'نشط' : 'موقوف'}
                    />
                  </TableCell>
                  {canManage ? (
                    <TableCell align="center">
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm('هل تريد حذف هذا المسار؟')) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'تعديل مسار' : 'مسار جديد'}</DialogTitle>
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
              label="الوصف"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="المدة التقديرية (دقائق)"
              type="number"
              value={form.estimatedDurationMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimatedDurationMinutes: e.target.value }))
              }
              fullWidth
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              نقاط المسار (بالترتيب)
            </Typography>
            <Stack spacing={0.5} sx={{ maxHeight: 220, overflow: 'auto' }}>
              {(checkpoints?.data ?? []).map((cp) => {
                const selected = form.checkpointIds.includes(cp.id);
                const order = selected ? form.checkpointIds.indexOf(cp.id) + 1 : null;
                return (
                  <Button
                    key={cp.id}
                    size="small"
                    variant={selected ? 'contained' : 'outlined'}
                    onClick={() => toggleCheckpoint(cp.id)}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {order ? `${order}. ` : ''}
                    {cp.name} ({cp.code})
                  </Button>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!form.name.trim() || saveMutation.isPending}
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
