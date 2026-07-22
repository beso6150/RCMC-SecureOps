import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
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
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  fetchShiftOverview,
  fetchShiftPersonnel,
  SHIFTS_QUERY_KEYS,
  updateCycleConfig,
  updatePersonnelStatus,
} from '../../api/shifts';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { useCountdownMs } from '../../hooks/useCountdownMs';
import type { OperationalStatus, ShiftCard } from '../../types/shifts';
import {
  ALL_OPERATIONAL_STATUSES,
  OPERATIONAL_STATUS_LABELS,
  SESSION_STATUS_LABELS,
} from '../../types/shifts';
import { formatMsToHMS } from '../../utils/formatDuration';

function ShiftCardView({ card }: { card: ShiftCard }) {
  return (
    <Card
      sx={{
        height: '100%',
        border: card.isActive ? '2px solid' : '1px solid',
        borderColor: card.isActive ? 'primary.main' : 'divider',
      }}
    >
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {card.kindLabel.nameAr}
          </Typography>
          {card.isActive ? <Chip label="نشطة" color="primary" size="small" /> : null}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          المجموعة: {card.group.label.nameAr}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          الحراس: {card.guardCount} · المشرفون: {card.supervisorCount}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          الحالة: {SESSION_STATUS_LABELS[card.status]}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function ShiftsManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canUpdate = hasPermission(user?.permissions ?? [], [PermissionCodes.SHIFTS_UPDATE]);
  const canManage = hasPermission(user?.permissions ?? [], [PermissionCodes.SHIFTS_MANAGE]);

  const [cycleForm, setCycleForm] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: overview, isLoading, isError, error } = useQuery({
    queryKey: SHIFTS_QUERY_KEYS.overview,
    queryFn: fetchShiftOverview,
    refetchInterval: 30_000,
  });

  const { data: personnel = [], isLoading: personnelLoading } = useQuery({
    queryKey: SHIFTS_QUERY_KEYS.personnel(),
    queryFn: () => fetchShiftPersonnel(),
    enabled: Boolean(overview),
  });

  const countdown = useCountdownMs(overview?.msRemainingToSwitch ?? 0, Boolean(overview));

  useEffect(() => {
    if (!overview) return;
    setCycleForm({
      cycleStartDate: overview.cycleStart.slice(0, 10),
      morningStartTime: overview.config.morningStartTime,
      morningEndTime: overview.config.morningEndTime,
      eveningStartTime: overview.config.eveningStartTime,
      eveningEndTime: overview.config.eveningEndTime,
      timezone: overview.config.timezone,
    });
  }, [overview]);

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: OperationalStatus }) =>
      updatePersonnelStatus(userId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SHIFTS_QUERY_KEYS.all });
      setSnackbar({ open: true, message: 'تم تحديث الحالة التشغيلية.', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message ?? 'تعذّر تحديث الحالة.', severity: 'error' });
    },
  });

  const configMutation = useMutation({
    mutationFn: updateCycleConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SHIFTS_QUERY_KEYS.all });
      setSnackbar({ open: true, message: 'تم حفظ إعدادات الدورة.', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message ?? 'تعذّر حفظ الإعدادات.', severity: 'error' });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !overview) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل بيانات الورديات.'}
      </Alert>
    );
  }

  const restingLabel =
    overview.restingGroups.length > 0
      ? overview.restingGroups.map((g) => g.label.nameAr).join('، ')
      : 'لا توجد';

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        إدارة الورديات
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ShiftCardView card={overview.morning} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ShiftCardView card={overview.evening} />
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            دورة الورديات
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {overview.groups.map((g) => {
              const isMorning = g.code === overview.morning.group.code;
              const isEvening = g.code === overview.evening.group.code;
              const isResting = overview.restingGroups.some((r) => r.code === g.code);
              const isActiveGroup =
                g.code === overview.morning.group.code && overview.morning.isActive
                  ? true
                  : g.code === overview.evening.group.code && overview.evening.isActive;
              return (
                <Chip
                  key={g.id}
                  label={g.label.nameAr}
                  color={isActiveGroup ? 'primary' : isMorning || isEvening ? 'secondary' : 'default'}
                  variant={isResting ? 'outlined' : 'filled'}
                />
              );
            })}
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                بداية الدورة
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {new Date(overview.cycleStart).toLocaleDateString('ar-SA')}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                نهاية الدورة
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {new Date(overview.cycleEnd).toLocaleDateString('ar-SA')}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                اليوم الحالي في الدورة
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {overview.currentCycleDay}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                الوقت المتبقي للتبديل
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                {formatMsToHMS(countdown)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                المجموعات في الراحة
              </Typography>
              <Typography variant="body1">{restingLabel}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                المجموعة التالية
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {overview.nextGroup.label.nameAr}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            طاقم الوردية النشطة
          </Typography>
          {personnelLoading ? (
            <CircularProgress size={28} />
          ) : personnel.length === 0 ? (
            <Alert severity="info">لا يوجد أفراد في المجموعة النشطة حالياً.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الاسم</TableCell>
                    <TableCell>الرقم الوظيفي</TableCell>
                    <TableCell>الدور</TableCell>
                    <TableCell>الحالة التشغيلية</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {personnel.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.fullName}</TableCell>
                      <TableCell>{p.employeeNumber}</TableCell>
                      <TableCell>{p.role.nameAr}</TableCell>
                      <TableCell>
                        {canUpdate ? (
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <Select
                              value={p.operationalStatus}
                              onChange={(e) =>
                                statusMutation.mutate({
                                  userId: p.id,
                                  status: e.target.value as OperationalStatus,
                                })
                              }
                              disabled={statusMutation.isPending}
                            >
                              {ALL_OPERATIONAL_STATUSES.map((s) => (
                                <MenuItem key={s} value={s}>
                                  {OPERATIONAL_STATUS_LABELS[s].emoji} {OPERATIONAL_STATUS_LABELS[s].nameAr}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Chip
                            size="small"
                            label={`${OPERATIONAL_STATUS_LABELS[p.operationalStatus].emoji} ${OPERATIONAL_STATUS_LABELS[p.operationalStatus].nameAr}`}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 600 }}>إعدادات دورة الورديات</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="تاريخ بداية الدورة"
                  type="date"
                  value={cycleForm.cycleStartDate ?? ''}
                  onChange={(e) => setCycleForm((f) => ({ ...f, cycleStartDate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="بداية الصباحية"
                  value={cycleForm.morningStartTime ?? ''}
                  onChange={(e) => setCycleForm((f) => ({ ...f, morningStartTime: e.target.value }))}
                  placeholder="06:00"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="نهاية الصباحية"
                  value={cycleForm.morningEndTime ?? ''}
                  onChange={(e) => setCycleForm((f) => ({ ...f, morningEndTime: e.target.value }))}
                  placeholder="14:00"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="بداية المسائية"
                  value={cycleForm.eveningStartTime ?? ''}
                  onChange={(e) => setCycleForm((f) => ({ ...f, eveningStartTime: e.target.value }))}
                  placeholder="14:00"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="نهاية المسائية"
                  value={cycleForm.eveningEndTime ?? ''}
                  onChange={(e) => setCycleForm((f) => ({ ...f, eveningEndTime: e.target.value }))}
                  placeholder="22:00"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="المنطقة الزمنية"
                  value={cycleForm.timezone ?? ''}
                  onChange={(e) => setCycleForm((f) => ({ ...f, timezone: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => configMutation.mutate(cycleForm)}
                  disabled={configMutation.isPending}
                >
                  حفظ الإعدادات
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ) : null}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
