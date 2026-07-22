import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import SearchIcon from '@mui/icons-material/Search';
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
  IconButton,
  InputAdornment,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ROLES_QUERY_KEYS, listRoles } from '../../api/roles';
import { SETTINGS_QUERY_KEYS, listDepartments, listShifts } from '../../api/settings';
import { SHIFTS_QUERY_KEYS, fetchShiftOverview } from '../../api/shifts';
import {
  USERS_QUERY_KEYS,
  createUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from '../../api/users';
import type { CreateUserPayload, UserRecord, UserStatus } from '../../types/director';
import { USER_STATUS_LABELS, formatDate } from './directorLabels';

const EMPTY_FORM: CreateUserPayload = {
  nationalId: '',
  employeeNumber: '',
  fullName: '',
  email: '',
  phone: '',
  jobTitle: '',
  roleId: '',
  departmentId: null,
  shiftId: null,
  groupId: null,
  status: 'PENDING_FIRST_LOGIN',
};

export function DirectorUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const listParams = { page: page + 1, pageSize, search: search || undefined };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: USERS_QUERY_KEYS.list(listParams),
    queryFn: () => listUsers(listParams),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ROLES_QUERY_KEYS.list,
    queryFn: listRoles,
  });

  const { data: departments = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.departments,
    queryFn: listDepartments,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.shifts,
    queryFn: listShifts,
  });

  const { data: shiftOverview } = useQuery({
    queryKey: SHIFTS_QUERY_KEYS.overview,
    queryFn: fetchShiftOverview,
  });
  const groups = shiftOverview?.groups ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['users'] });
    void queryClient.invalidateQueries({ queryKey: ['director'] });
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setSnackbar({ open: true, message: 'تم إنشاء المستخدم بنجاح', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateUserPayload> }) =>
      updateUser(id, payload),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setSnackbar({ open: true, message: 'تم تحديث المستخدم', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      setSnackbar({ open: true, message: 'تم إعادة تعيين كلمة المرور', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM, roleId: roles[0]?.id ?? '' });
    setDialogOpen(true);
  };

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    setForm({
      nationalId: user.nationalId,
      employeeNumber: user.employeeNumber,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      jobTitle: user.jobTitle,
      roleId: user.roleId,
      departmentId: user.departmentId,
      shiftId: user.shiftId,
      groupId: user.groupId,
      status: user.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        payload: {
          roleId: form.roleId,
          departmentId: form.departmentId,
          shiftId: form.shiftId,
          groupId: form.groupId,
          status: form.status,
          phone: form.phone,
          email: form.email,
          jobTitle: form.jobTitle,
        },
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDeactivate = (user: UserRecord) => {
    if (window.confirm(`هل تريد إلغاء تفعيل ${user.fullName}؟`)) {
      updateMutation.mutate({ id: user.id, payload: { status: 'INACTIVE' as UserStatus } });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المستخدمين.'}</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          إدارة المستخدمين
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          مستخدم جديد
        </Button>
      </Stack>

      <TextField
        size="small"
        placeholder="بحث بالاسم أو البريد أو الرقم الوظيفي..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setSearch(searchInput);
            setPage(0);
          }
        }}
        sx={{ mb: 2, minWidth: 320 }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearch(searchInput); setPage(0); }}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الرقم الوظيفي</TableCell>
              <TableCell>البريد</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>القسم</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>آخر دخول</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>{user.employeeNumber}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role?.nameAr ?? user.role?.nameEn ?? '—'}</TableCell>
                <TableCell>{user.department?.nameAr ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={USER_STATUS_LABELS[user.status] ?? user.status}
                    size="small"
                    color={user.status === 'ACTIVE' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="إعادة تعيين كلمة المرور">
                    <IconButton size="small" onClick={() => resetMutation.mutate(user.id)}>
                      <LockResetIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="إلغاء التفعيل">
                    <IconButton size="small" color="error" onClick={() => handleDeactivate(user)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!data?.data.length && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    لا يوجد مستخدمون
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {data?.meta && (
        <TablePagination
          component="div"
          count={data.meta.total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="صفوف لكل صفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!editingUser && (
              <>
                <TextField
                  label="رقم الهوية"
                  value={form.nationalId}
                  onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="الرقم الوظيفي"
                  value={form.employeeNumber}
                  onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
                  required
                  fullWidth
                />
              </>
            )}
            <TextField
              label="الاسم الكامل"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              fullWidth
              disabled={Boolean(editingUser)}
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="الهاتف"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="المسمى الوظيفي"
              value={form.jobTitle ?? ''}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>الدور</InputLabel>
              <Select
                label="الدور"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              >
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.nameAr} ({r.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>القسم</InputLabel>
              <Select
                label="القسم"
                value={form.departmentId ?? ''}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value || null })
                }
              >
                <MenuItem value="">—</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الوردية</InputLabel>
              <Select
                label="الوردية"
                value={form.shiftId ?? ''}
                onChange={(e) => setForm({ ...form, shiftId: e.target.value || null })}
              >
                <MenuItem value="">—</MenuItem>
                {shifts.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nameAr} ({s.startTime}–{s.endTime})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>المجموعة</InputLabel>
              <Select
                label="المجموعة"
                value={form.groupId ?? ''}
                onChange={(e) => setForm({ ...form, groupId: e.target.value || null })}
              >
                <MenuItem value="">—</MenuItem>
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.label?.nameAr ?? g.nameAr} ({g.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الحالة</InputLabel>
              <Select
                label="الحالة"
                value={form.status ?? 'PENDING_FIRST_LOGIN'}
                onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
              >
                {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
