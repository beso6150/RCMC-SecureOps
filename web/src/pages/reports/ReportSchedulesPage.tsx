import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  createReportSchedule,
  deleteReportSchedule,
  disableReportSchedule,
  enableReportSchedule,
  fetchReportSchedules,
  REPORTS_CENTER_QUERY_KEYS,
  runReportScheduleNow,
} from '../../api/reportsCenter';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { ReportsTableSkeleton } from '../../components/reports/ReportsSkeletons';
import { EmptyState, PermissionGate } from '../../components/reports/ReportsStates';
import type {
  ReportScheduleFrequency,
  SavedReportType,
  SchedulePayload,
} from '../../types/reportsCenter';
import {
  SAVED_REPORT_TYPE_LABELS,
  SCHEDULE_FREQUENCY_LABELS,
} from '../../types/reportsCenter';

const EMPTY_FORM: SchedulePayload = {
  name: '',
  reportType: 'DAILY_SECURITY',
  frequency: 'DAILY',
  timeOfDay: '06:00',
  generatePdf: true,
  generateCsv: false,
  isActive: true,
};

export function ReportSchedulesPage() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canManage = hasPermission(permissions, [PermissionCodes.REPORTS_SCHEDULES_MANAGE]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SchedulePayload>(EMPTY_FORM);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.schedules,
    queryFn: fetchReportSchedules,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: REPORTS_CENTER_QUERY_KEYS.schedules });

  const createMutation = useMutation({
    mutationFn: () => createReportSchedule(form),
    onSuccess: () => {
      setOpen(false);
      setForm(EMPTY_FORM);
      setMsg({ type: 'success', text: 'تم إنشاء الجدولة.' });
      invalidate();
    },
    onError: (err) => setMsg({ type: 'error', text: (err as Error)?.message ?? 'فشل الإنشاء.' }),
  });

  const toggleActive = async (id: string, active: boolean) => {
    try {
      if (active) await enableReportSchedule(id);
      else await disableReportSchedule(id);
      setMsg({ type: 'success', text: active ? 'تم التفعيل.' : 'تم الإيقاف.' });
      invalidate();
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error)?.message ?? 'فشل التحديث.' });
    }
  };

  const runNow = async (id: string) => {
    try {
      await runReportScheduleNow(id);
      setMsg({ type: 'success', text: 'تم تشغيل الجدولة الآن.' });
      invalidate();
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error)?.message ?? 'فشل التشغيل.' });
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteReportSchedule(id);
      setMsg({ type: 'success', text: 'تم حذف الجدولة.' });
      invalidate();
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error)?.message ?? 'فشل الحذف.' });
    }
  };

  return (
    <PermissionGate
      anyOf={[PermissionCodes.REPORTS_SCHEDULES_VIEW, PermissionCodes.REPORTS_SCHEDULES_MANAGE]}
    >
      <Box>
        <ReportsPageHeader
          title="جدولة التقارير"
          subtitle="إدارة التوليد التلقائي للتقارير حسب الوردية أو الجدول الزمني"
          actions={
            canManage ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpen(true)}
              >
                جدولة جديدة
              </Button>
            ) : null
          }
        />

        {msg ? (
          <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
            {msg.text}
          </Alert>
        ) : null}

        {isLoading ? <ReportsTableSkeleton /> : null}
        {isError ? (
          <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الجداول.'}</Alert>
        ) : null}
        {data && data.length === 0 ? (
          <EmptyState message="لا توجد جداول تقارير حالياً." />
        ) : null}

        <Stack spacing={1}>
          {(data ?? []).map((schedule) => (
            <Card key={schedule.id} variant="outlined">
              <CardContent
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>{schedule.name}</Typography>
                    <Chip
                      size="small"
                      label={schedule.isActive ? 'مفعّل' : 'موقوف'}
                      color={schedule.isActive ? 'success' : 'default'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {SAVED_REPORT_TYPE_LABELS[schedule.reportType] ?? schedule.reportType} —{' '}
                    {SCHEDULE_FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency} —{' '}
                    {schedule.timeOfDay}
                    {schedule.nextRunAt
                      ? ` — التشغيل القادم: ${new Date(schedule.nextRunAt).toLocaleString('ar-SA')}`
                      : ''}
                  </Typography>
                </Box>
                {canManage ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={schedule.isActive}
                          onChange={(_, checked) => void toggleActive(schedule.id, checked)}
                        />
                      }
                      label="تفعيل"
                    />
                    <Button
                      size="small"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => void runNow(schedule.id)}
                    >
                      تشغيل الآن
                    </Button>
                    <Button size="small" color="error" onClick={() => void remove(schedule.id)}>
                      حذف
                    </Button>
                  </Stack>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>جدولة تقرير جديدة</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="الاسم"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
              />
              <FormControl fullWidth size="small">
                <InputLabel>نوع التقرير</InputLabel>
                <Select
                  label="نوع التقرير"
                  value={form.reportType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reportType: e.target.value as SavedReportType }))
                  }
                >
                  {(Object.keys(SAVED_REPORT_TYPE_LABELS) as SavedReportType[]).map((t) => (
                    <MenuItem key={t} value={t}>
                      {SAVED_REPORT_TYPE_LABELS[t]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>التكرار</InputLabel>
                <Select
                  label="التكرار"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      frequency: e.target.value as ReportScheduleFrequency,
                    }))
                  }
                >
                  {(Object.keys(SCHEDULE_FREQUENCY_LABELS) as ReportScheduleFrequency[]).map(
                    (f) => (
                      <MenuItem key={f} value={f}>
                        {SCHEDULE_FREQUENCY_LABELS[f]}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
              <TextField
                label="وقت التشغيل"
                type="time"
                value={form.timeOfDay}
                onChange={(e) => setForm((f) => ({ ...f, timeOfDay: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              {form.frequency === 'WEEKLY' ? (
                <TextField
                  label="يوم الأسبوع (0=الأحد)"
                  type="number"
                  value={form.dayOfWeek ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))
                  }
                  slotProps={{ htmlInput: { min: 0, max: 6 } }}
                />
              ) : null}
              {form.frequency === 'MONTHLY' ? (
                <TextField
                  label="يوم الشهر"
                  type="number"
                  value={form.dayOfMonth ?? 1}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dayOfMonth: Number(e.target.value) }))
                  }
                  slotProps={{ htmlInput: { min: 1, max: 28 } }}
                />
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>إلغاء</Button>
            <Button
              variant="contained"
              disabled={!form.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              حفظ
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  );
}
