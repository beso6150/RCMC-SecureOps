import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  NOTIFICATIONS_QUERY_KEYS,
  createNotificationRule,
  deleteNotificationRule,
  listNotificationRules,
  updateNotificationRule,
} from '../../api/notifications';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type { NotificationCategory, NotificationPriority } from '../../types/notifications';
import {
  NOTIFICATION_CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  formatDateTime,
} from '../../utils/sprint19Labels';

const EMPTY_FORM = {
  name: '',
  eventType: '',
  category: 'INCIDENT' as NotificationCategory,
  notificationPriority: 'NORMAL' as NotificationPriority,
  requiresAcknowledgement: false,
  reminderAfterMinutes: '',
  escalationAfterMinutes: '',
  maxReminders: '2',
  isActive: true,
};

export function NotificationRulesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canRead = hasPermission(user?.permissions ?? [], [
    PermissionCodes.NOTIFICATIONS_RULES_READ,
  ]);
  const canManage = hasPermission(user?.permissions ?? [], [
    PermissionCodes.NOTIFICATIONS_RULES_MANAGE,
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.rules,
    queryFn: listNotificationRules,
    enabled: canRead,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.rules });
  };

  const createMutation = useMutation({
    mutationFn: createNotificationRule,
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateNotificationRule(id, { isActive }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotificationRule,
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض قواعد الإشعارات.</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        {(loadError as Error)?.message ?? 'تعذّر تحميل قواعد الإشعارات.'}
      </Alert>
    );
  }

  const rows = data ?? [];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3, gap: 2 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            قواعد الإشعارات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            قواعد التسليم والتذكير والتصعيد حسب نوع الحدث
          </Typography>
        </Box>
        {canManage ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            قاعدة جديدة
          </Button>
        ) : null}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الحدث</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>تأكيد</TableCell>
              <TableCell>نشطة</TableCell>
              <TableCell>تاريخ الإنشاء</TableCell>
              {canManage ? <TableCell align="left">إجراء</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 8 : 7} align="center" sx={{ py: 4 }}>
                  لا توجد قواعد
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {row.eventType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {NOTIFICATION_CATEGORY_LABELS[row.category] ?? row.category}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={PRIORITY_COLORS[row.notificationPriority]}
                      label={PRIORITY_LABELS[row.notificationPriority]}
                    />
                  </TableCell>
                  <TableCell>{row.requiresAcknowledgement ? 'نعم' : 'لا'}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Switch
                        size="small"
                        checked={row.isActive}
                        onChange={(e) =>
                          toggleMutation.mutate({ id: row.id, isActive: e.target.checked })
                        }
                      />
                    ) : row.isActive ? (
                      'نعم'
                    ) : (
                      'لا'
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  {canManage ? (
                    <TableCell align="left">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (window.confirm('حذف هذه القاعدة؟')) {
                            deleteMutation.mutate(row.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>قاعدة إشعار جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="الاسم"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="نوع الحدث"
              value={form.eventType}
              onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
              fullWidth
              helperText="مثال: incident.critical"
            />
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                label="الفئة"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as NotificationCategory }))
                }
              >
                {(Object.keys(NOTIFICATION_CATEGORY_LABELS) as NotificationCategory[]).map(
                  (c) => (
                    <MenuItem key={c} value={c}>
                      {NOTIFICATION_CATEGORY_LABELS[c]}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الأولوية</InputLabel>
              <Select
                label="الأولوية"
                value={form.notificationPriority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notificationPriority: e.target.value as NotificationPriority,
                  }))
                }
              >
                {(Object.keys(PRIORITY_LABELS) as NotificationPriority[]).map((p) => (
                  <MenuItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={form.requiresAcknowledgement}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, requiresAcknowledgement: e.target.checked }))
                  }
                />
              }
              label="يتطلب تأكيدًا"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="تذكير بعد (دقائق)"
                value={form.reminderAfterMinutes}
                onChange={(e) => setForm((f) => ({ ...f, reminderAfterMinutes: e.target.value }))}
                fullWidth
              />
              <TextField
                label="تصعيد بعد (دقائق)"
                value={form.escalationAfterMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, escalationAfterMinutes: e.target.value }))
                }
                fullWidth
              />
            </Stack>
            <TextField
              label="أقصى تذكيرات"
              value={form.maxReminders}
              onChange={(e) => setForm((f) => ({ ...f, maxReminders: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!form.name.trim() || !form.eventType.trim() || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                name: form.name.trim(),
                eventType: form.eventType.trim(),
                category: form.category,
                notificationPriority: form.notificationPriority,
                requiresAcknowledgement: form.requiresAcknowledgement,
                reminderAfterMinutes: form.reminderAfterMinutes
                  ? Number(form.reminderAfterMinutes)
                  : null,
                escalationAfterMinutes: form.escalationAfterMinutes
                  ? Number(form.escalationAfterMinutes)
                  : null,
                maxReminders: Number(form.maxReminders) || 2,
                isActive: true,
              })
            }
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
