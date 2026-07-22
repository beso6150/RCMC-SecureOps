import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
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
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  SETTINGS_QUERY_KEYS,
  createDepartment,
  createIncidentType,
  createMeetingRoom,
  createShift,
  deleteDepartment,
  deleteMeetingRoom,
  deleteShift,
  listDepartments,
  listFloors,
  listIncidentTypes,
  listMeetingRooms,
  listShifts,
  listSystemSettings,
  updateDepartment,
  updateFloor,
  updateIncidentType,
  updateMeetingRoom,
  updateShift,
  updateSystemSettings,
} from '../../api/settings';
import type { Department, Floor, IncidentType, MeetingRoom, Shift } from '../../types/director';
import { VIOLATION_TYPE_LABELS } from './directorLabels';
import { VisitEmailSettingsPanel } from './VisitEmailSettingsPanel';

type SettingsTab =
  | 'departments'
  | 'shifts'
  | 'floors'
  | 'rooms'
  | 'incidents'
  | 'violations'
  | 'visit-email'
  | 'system';

export function DirectorSettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>('departments');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogType, setDialogType] = useState<SettingsTab>('departments');
  const [editItem, setEditItem] = useState<Department | Shift | Floor | MeetingRoom | IncidentType | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [systemForm, setSystemForm] = useState<Record<string, unknown>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: departments = [], isLoading: deptLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.departments,
    queryFn: listDepartments,
  });

  const { data: shifts = [], isLoading: shiftLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.shifts,
    queryFn: listShifts,
  });

  const { data: floors = [], isLoading: floorLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.floors,
    queryFn: listFloors,
  });

  const { data: meetingRooms = [], isLoading: roomLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.meetingRooms(),
    queryFn: () => listMeetingRooms(),
  });

  const { data: incidentTypes = [], isLoading: incidentLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.incidentTypes,
    queryFn: listIncidentTypes,
  });

  const { data: systemSettings = [], isLoading: systemLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.system,
    queryFn: listSystemSettings,
  });

  const invalidate = (key: readonly string[]) => {
    void queryClient.invalidateQueries({ queryKey: [...key] });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const deptCreate = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.departments); setDialogOpen(false); showSnackbar('تم إنشاء القسم'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const deptUpdate = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateDepartment>[1] }) =>
      updateDepartment(id, payload),
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.departments); setDialogOpen(false); showSnackbar('تم تحديث القسم'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const deptDelete = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.departments); showSnackbar('تم حذف القسم'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const shiftCreate = useMutation({
    mutationFn: createShift,
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.shifts); setDialogOpen(false); showSnackbar('تم إنشاء الوردية'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const shiftUpdate = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateShift>[1] }) =>
      updateShift(id, payload),
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.shifts); setDialogOpen(false); showSnackbar('تم تحديث الوردية'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const shiftDelete = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.shifts); showSnackbar('تم حذف الوردية'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const floorUpdate = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateFloor>[1] }) =>
      updateFloor(id, payload),
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.floors); setDialogOpen(false); showSnackbar('تم تحديث الطابق'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const roomCreate = useMutation({
    mutationFn: createMeetingRoom,
    onSuccess: () => { invalidate(['settings', 'meeting-rooms']); setDialogOpen(false); showSnackbar('تم إنشاء القاعة'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const roomUpdate = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateMeetingRoom>[1] }) =>
      updateMeetingRoom(id, payload),
    onSuccess: () => { invalidate(['settings', 'meeting-rooms']); setDialogOpen(false); showSnackbar('تم تحديث القاعة'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const roomDelete = useMutation({
    mutationFn: deleteMeetingRoom,
    onSuccess: () => { invalidate(['settings', 'meeting-rooms']); showSnackbar('تم حذف القاعة'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const incidentCreate = useMutation({
    mutationFn: createIncidentType,
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.incidentTypes); setDialogOpen(false); showSnackbar('تم إنشاء نوع البلاغ'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const incidentUpdate = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateIncidentType>[1] }) =>
      updateIncidentType(id, payload),
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.incidentTypes); setDialogOpen(false); showSnackbar('تم تحديث نوع البلاغ'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const systemUpdate = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: () => { invalidate(SETTINGS_QUERY_KEYS.system); showSnackbar('تم حفظ الإعدادات'); },
    onError: (e: Error) => showSnackbar(e.message, 'error'),
  });

  const openCreate = (type: SettingsTab) => {
    setDialogType(type);
    setDialogMode('create');
    setEditItem(null);
    setForm({});
    setDialogOpen(true);
  };

  const openEdit = (type: SettingsTab, item: Department | Shift | Floor | MeetingRoom | IncidentType) => {
    setDialogType(type);
    setDialogMode('edit');
    setEditItem(item);
    setForm({ ...item } as Record<string, string | number | boolean>);
    setDialogOpen(true);
  };

  const handleDialogSave = () => {
    if (dialogType === 'departments') {
      const payload = {
        code: String(form.code ?? ''),
        nameEn: String(form.nameEn ?? ''),
        nameAr: String(form.nameAr ?? ''),
        description: form.description ? String(form.description) : undefined,
      };
      if (dialogMode === 'create') deptCreate.mutate(payload);
      else if (editItem) deptUpdate.mutate({ id: editItem.id, payload });
    } else if (dialogType === 'shifts') {
      const payload = {
        code: String(form.code ?? ''),
        nameEn: String(form.nameEn ?? ''),
        nameAr: String(form.nameAr ?? ''),
        startTime: String(form.startTime ?? '08:00'),
        endTime: String(form.endTime ?? '16:00'),
        timezone: String(form.timezone ?? 'Asia/Riyadh'),
      };
      if (dialogMode === 'create') shiftCreate.mutate(payload);
      else if (editItem) shiftUpdate.mutate({ id: editItem.id, payload });
    } else if (dialogType === 'floors') {
      if (editItem) {
        floorUpdate.mutate({
          id: editItem.id,
          payload: {
            code: String(form.code ?? ''),
            nameEn: String(form.nameEn ?? ''),
            nameAr: String(form.nameAr ?? ''),
            level: Number(form.level ?? 0),
          },
        });
      }
    } else if (dialogType === 'rooms') {
      const payload = {
        floorId: String(form.floorId ?? ''),
        code: String(form.code ?? ''),
        nameEn: String(form.nameEn ?? ''),
        nameAr: String(form.nameAr ?? ''),
        capacity: form.capacity ? Number(form.capacity) : null,
        isActive: form.isActive !== false,
      };
      if (dialogMode === 'create') roomCreate.mutate(payload);
      else if (editItem) roomUpdate.mutate({ id: editItem.id, payload });
    } else if (dialogType === 'incidents') {
      const payload = {
        code: String(form.code ?? ''),
        nameAr: String(form.nameAr ?? ''),
        nameEn: String(form.nameEn ?? ''),
        description: form.description ? String(form.description) : null,
        sortOrder: Number(form.sortOrder ?? 100),
        isActive: form.isActive !== false,
      };
      if (dialogMode === 'create') incidentCreate.mutate(payload);
      else if (editItem) incidentUpdate.mutate({ id: editItem.id, payload });
    }
  };

  const handleSystemSave = () => {
    const settings = systemSettings.map((s) => ({
      key: s.key,
      value: systemForm[s.key] ?? s.value,
      description: s.description,
      isPublic: s.isPublic,
    }));
    systemUpdate.mutate(settings);
  };

  const isLoading = deptLoading || shiftLoading || floorLoading || roomLoading || incidentLoading || systemLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        إعدادات النظام
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v: SettingsTab) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="الأقسام" value="departments" />
        <Tab label="الورديات" value="shifts" />
        <Tab label="الطوابق" value="floors" />
        <Tab label="قاعات الاجتماعات" value="rooms" />
        <Tab label="أنواع البلاغات" value="incidents" />
        <Tab label="أنواع المخالفات" value="violations" />
        <Tab label="إعدادات بريد الزيارات" value="visit-email" />
        <Tab label="إعدادات SLA والإشعارات" value="system" />
      </Tabs>

      {tab === 'departments' && (
        <Box>
          <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={() => openCreate('departments')}>
            قسم جديد
          </Button>
          <CrudTable
            rows={departments}
            columns={[
              { key: 'code', label: 'الرمز' },
              { key: 'nameAr', label: 'الاسم (ع)' },
              { key: 'nameEn', label: 'الاسم (En)' },
            ]}
            onEdit={(item) => openEdit('departments', item)}
            onDelete={(item) => {
              if (window.confirm('حذف القسم؟')) deptDelete.mutate(item.id);
            }}
          />
        </Box>
      )}

      {tab === 'shifts' && (
        <Box>
          <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={() => openCreate('shifts')}>
            وردية جديدة
          </Button>
          <CrudTable
            rows={shifts}
            columns={[
              { key: 'code', label: 'الرمز' },
              { key: 'nameAr', label: 'الاسم' },
              { key: 'startTime', label: 'البداية' },
              { key: 'endTime', label: 'النهاية' },
            ]}
            onEdit={(item) => openEdit('shifts', item)}
            onDelete={(item) => {
              if (window.confirm('حذف الوردية؟')) shiftDelete.mutate(item.id);
            }}
          />
        </Box>
      )}

      {tab === 'floors' && (
        <CrudTable
          rows={floors}
          columns={[
            { key: 'code', label: 'الرمز' },
            { key: 'nameAr', label: 'الاسم' },
            { key: 'level', label: 'المستوى' },
          ]}
          onEdit={(item) => openEdit('floors', item)}
        />
      )}

      {tab === 'rooms' && (
        <Box>
          <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={() => openCreate('rooms')}>
            قاعة جديدة
          </Button>
          <CrudTable
            rows={meetingRooms}
            columns={[
              { key: 'code', label: 'الرمز' },
              { key: 'nameAr', label: 'الاسم' },
              { key: 'capacity', label: 'السعة' },
            ]}
            onEdit={(item) => openEdit('rooms', item)}
            onDelete={(item) => {
              if (window.confirm('حذف القاعة؟')) roomDelete.mutate(item.id);
            }}
          />
        </Box>
      )}

      {tab === 'incidents' && (
        <Box>
          <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={() => openCreate('incidents')}>
            نوع بلاغ جديد
          </Button>
          <CrudTable
            rows={incidentTypes}
            columns={[
              { key: 'code', label: 'الرمز' },
              { key: 'nameAr', label: 'الاسم (ع)' },
              { key: 'nameEn', label: 'الاسم (En)' },
              { key: 'sortOrder', label: 'الترتيب' },
            ]}
            onEdit={(item) => openEdit('incidents', item)}
          />
        </Box>
      )}

      {tab === 'violations' && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              أنواع المخالفات (للقراءة فقط)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الرمز</TableCell>
                    <TableCell>التسمية</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(VIOLATION_TYPE_LABELS).map(([code, label]) => (
                    <TableRow key={code}>
                      <TableCell>{code}</TableCell>
                      <TableCell>{label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tab === 'visit-email' && (
        <VisitEmailSettingsPanel
          onNotify={(message, severity) => showSnackbar(message, severity)}
        />
      )}

      {tab === 'system' && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              {systemSettings
                .filter((s) => s.key !== 'visitors.emailInbox')
                .map((s) => (
                <Box key={s.key}>
                  {typeof s.value === 'boolean' ? (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(systemForm[s.key] ?? s.value)}
                          onChange={(e) =>
                            setSystemForm({ ...systemForm, [s.key]: e.target.checked })
                          }
                        />
                      }
                      label={`${s.key}${s.description ? ` — ${s.description}` : ''}`}
                    />
                  ) : (
                    <TextField
                      label={s.key}
                      helperText={s.description ?? undefined}
                      value={String(systemForm[s.key] ?? s.value ?? '')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = Number(raw);
                        setSystemForm({
                          ...systemForm,
                          [s.key]: raw !== '' && !Number.isNaN(num) && typeof s.value === 'number' ? num : raw,
                        });
                      }}
                      fullWidth
                      size="small"
                    />
                  )}
                </Box>
              ))}
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSystemSave}
                disabled={systemUpdate.isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                حفظ الإعدادات
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'إضافة' : 'تعديل'}{' '}
          {dialogType === 'departments' ? 'قسم' : dialogType === 'shifts' ? 'وردية' : dialogType === 'floors' ? 'طابق' : dialogType === 'rooms' ? 'قاعة' : 'نوع بلاغ'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(dialogType === 'departments' || dialogType === 'shifts' || dialogType === 'floors' || dialogType === 'rooms' || dialogType === 'incidents') && (
              <>
                <TextField label="الرمز" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth />
                <TextField label="الاسم (عربي)" value={form.nameAr ?? ''} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} fullWidth />
                <TextField label="الاسم (English)" value={form.nameEn ?? ''} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} fullWidth />
              </>
            )}
            {dialogType === 'departments' && (
              <TextField label="الوصف" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth />
            )}
            {dialogType === 'shifts' && (
              <>
                <TextField label="وقت البداية" placeholder="08:00" value={form.startTime ?? ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} fullWidth />
                <TextField label="وقت النهاية" placeholder="16:00" value={form.endTime ?? ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} fullWidth />
              </>
            )}
            {dialogType === 'floors' && (
              <TextField label="المستوى" type="number" value={form.level ?? 0} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} fullWidth />
            )}
            {dialogType === 'rooms' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>الطابق</InputLabel>
                  <Select
                    label="الطابق"
                    value={String(form.floorId ?? '')}
                    onChange={(e) => setForm({ ...form, floorId: e.target.value })}
                  >
                    <MenuItem value="">—</MenuItem>
                    {floors.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.nameAr}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="السعة" type="number" value={form.capacity ?? ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} fullWidth />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isActive !== false}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                  }
                  label="نشطة"
                />
              </>
            )}
            {dialogType === 'incidents' && (
              <>
                <TextField label="الترتيب" type="number" value={form.sortOrder ?? 100} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} fullWidth />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isActive !== false}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                  }
                  label="نشط"
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleDialogSave}>حفظ</Button>
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

interface CrudRow {
  id: string;
  code?: string;
  nameAr?: string;
  nameEn?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  level?: number;
  capacity?: number | null;
  sortOrder?: number;
}

function CrudTable<T extends CrudRow>({
  rows,
  columns,
  onEdit,
  onDelete,
}: {
  rows: T[];
  columns: { key: keyof CrudRow & string; label: string }[];
  onEdit: (item: T) => void;
  onDelete?: (item: T) => void;
}) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.key}>{c.label}</TableCell>
            ))}
            <TableCell align="center">إجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              {columns.map((c) => (
                <TableCell key={c.key}>{String(row[c.key] ?? '—')}</TableCell>
              ))}
              <TableCell align="center">
                <Tooltip title="تعديل">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {onDelete && (
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={columns.length + 1}>
                <Typography variant="body2" color="text.secondary" align="center">
                  لا توجد بيانات
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
