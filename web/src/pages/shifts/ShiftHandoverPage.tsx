import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
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
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  approveHandover,
  approveTakeover,
  fetchHandoverBoard,
  fetchShiftAssignable,
  SHIFTS_QUERY_KEYS,
  upsertHandover,
} from '../../api/shifts';
import { useCountdownMs } from '../../hooks/useCountdownMs';
import { HANDOVER_STEP_LABELS, SESSION_STATUS_LABELS } from '../../types/shifts';
import { formatMsToHMS } from '../../utils/formatDuration';

function groupLabel(group?: { label?: { nameAr: string }; nameAr?: string; code?: string } | null) {
  if (!group) return '—';
  return group.label?.nameAr ?? group.nameAr ?? group.code ?? '—';
}

export function ShiftHandoverPage() {
  const queryClient = useQueryClient();
  const [outgoingId, setOutgoingId] = useState('');
  const [incomingId, setIncomingId] = useState('');
  const [notes, setNotes] = useState('');
  const [equipmentNotes, setEquipmentNotes] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: SHIFTS_QUERY_KEYS.handover,
    queryFn: fetchHandoverBoard,
    refetchInterval: 15_000,
  });

  const { data: assignable = [] } = useQuery({
    queryKey: SHIFTS_QUERY_KEYS.assignable,
    queryFn: fetchShiftAssignable,
  });

  const supervisors = useMemo(
    () =>
      assignable.filter(
        (person) =>
          person.role.code === 'SECURITY_SUPERVISOR' ||
          person.role.code === 'OPERATIONS_MANAGER' ||
          person.role.code === 'SECURITY_DIRECTOR',
      ),
    [assignable],
  );

  const countdown = useCountdownMs(data?.session?.msRemaining ?? 0, Boolean(data?.session));

  useEffect(() => {
    if (data?.handover) {
      setOutgoingId(data.handover.outgoingSupervisorId);
      setIncomingId(data.handover.incomingSupervisorId);
      setNotes(data.handover.notes ?? '');
      setEquipmentNotes(data.handover.equipmentNotes ?? '');
    }
  }, [data?.handover]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: SHIFTS_QUERY_KEYS.all });
  };

  const upsertMutation = useMutation({
    mutationFn: upsertHandover,
    onSuccess: () => {
      invalidate();
      setSnackbar({ open: true, message: 'تم حفظ سجل التسليم والاستلام بنجاح.', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message || 'تعذّر حفظ سجل التسليم.', severity: 'error' });
    },
  });

  const approveHandoverMutation = useMutation({
    mutationFn: approveHandover,
    onSuccess: () => {
      invalidate();
      setSnackbar({ open: true, message: 'تم اعتماد التسليم من المشرف المسلّم.', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message || 'تعذّر اعتماد التسليم.', severity: 'error' });
    },
  });

  const approveTakeoverMutation = useMutation({
    mutationFn: approveTakeover,
    onSuccess: () => {
      invalidate();
      setSnackbar({ open: true, message: 'تم اعتماد الاستلام وإغلاق الوردية.', severity: 'success' });
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message || 'تعذّر اعتماد الاستلام.', severity: 'error' });
    },
  });

  const handover = data?.handover;
  const session = data?.session;
  const stats = data?.stats;
  const history = data?.history ?? [];
  const outgoingGroup = data?.outgoingGroup ?? session?.group ?? null;
  const incomingGroup = data?.incomingGroup ?? null;

  const sessionClosed = session?.status === 'CLOSED';
  const canClose =
    handover?.handoverStatus === 'APPROVED' && handover?.takeoverStatus === 'APPROVED';

  const closeBlockedReason = useMemo(() => {
    if (sessionClosed) return null;
    if (!handover) return 'يجب حفظ سجل التسليم واختيار المشرفين أولاً.';
    if (handover.handoverStatus !== 'APPROVED') {
      return 'لا يمكن إغلاق الوردية حتى يعتمد المشرف المسلّم التسليم.';
    }
    if (handover.takeoverStatus !== 'APPROVED') {
      return 'لا يمكن إغلاق الوردية حتى يعتمد المشرف المستلم الاستلام.';
    }
    return null;
  }, [handover, sessionClosed]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          جاري تحميل لوحة التسليم والاستلام...
        </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message || 'تعذّر تحميل لوحة التسليم والاستلام.'}
      </Alert>
    );
  }

  if (!session) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          تسليم واستلام الوردية
        </Typography>
        <Alert severity="info">لا توجد وردية نشطة حالياً لعملية التسليم والاستلام.</Alert>
      </Box>
    );
  }

  const handleSave = () => {
    if (!outgoingId || !incomingId) {
      setSnackbar({
        open: true,
        message: 'يرجى اختيار المشرف المسلّم والمشرف المستلم.',
        severity: 'error',
      });
      return;
    }
    if (outgoingId === incomingId) {
      setSnackbar({
        open: true,
        message: 'يجب أن يختلف المشرف المسلّم عن المشرف المستلم.',
        severity: 'error',
      });
      return;
    }
    upsertMutation.mutate({
      sessionId: session.id,
      outgoingSupervisorId: outgoingId,
      incomingSupervisorId: incomingId,
      notes: notes.trim() || null,
      equipmentNotes: equipmentNotes.trim() || null,
    });
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          تسليم واستلام الوردية
        </Typography>
        {isFetching ? <Chip size="small" label="جاري التحديث..." /> : null}
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {session.kindLabel?.nameAr ?? 'الوردية الحالية'} — {groupLabel(session.group)}
            </Typography>
            <Chip
              label={SESSION_STATUS_LABELS[session.status]}
              size="small"
              color={sessionClosed ? 'default' : 'primary'}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              متبقٍ: {formatMsToHMS(countdown)}
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                المجموعة المسلّمة
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{groupLabel(outgoingGroup)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                المجموعة المستلمة
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{groupLabel(incomingGroup)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                فترة الوردية
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {new Date(session.startsAt).toLocaleString('ar-SA')} —{' '}
                {new Date(session.endsAt).toLocaleString('ar-SA')}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        ملخص الحالة الأمنية
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats?.openIncidents ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                بلاغات مفتوحة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats?.closedIncidents ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                بلاغات مغلقة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats?.patrols ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                جولات
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats?.violations ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                مخالفات
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            بيانات التسليم والاستلام
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="outgoing-label">المستخدم الذي سلّم (المشرف المسلّم)</InputLabel>
                <Select
                  labelId="outgoing-label"
                  label="المستخدم الذي سلّم (المشرف المسلّم)"
                  value={outgoingId}
                  onChange={(e) => setOutgoingId(e.target.value)}
                  disabled={sessionClosed || handover?.handoverStatus === 'APPROVED'}
                >
                  {supervisors.length === 0 ? (
                    <MenuItem disabled value="">
                      لا يوجد مشرفون متاحون في الوردية الحالية
                    </MenuItem>
                  ) : (
                    supervisors.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.fullName} ({s.employeeNumber}) — {s.role.nameAr}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="incoming-label">المستخدم الذي استلم (المشرف المستلم)</InputLabel>
                <Select
                  labelId="incoming-label"
                  label="المستخدم الذي استلم (المشرف المستلم)"
                  value={incomingId}
                  onChange={(e) => setIncomingId(e.target.value)}
                  disabled={sessionClosed}
                >
                  {supervisors.length === 0 ? (
                    <MenuItem disabled value="">
                      لا يوجد مشرفون متاحون
                    </MenuItem>
                  ) : (
                    supervisors.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.fullName} ({s.employeeNumber}) — {s.role.nameAr}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="الملاحظات"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={sessionClosed}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="العهد أو المعدات"
                value={equipmentNotes}
                onChange={(e) => setEquipmentNotes(e.target.value)}
                disabled={sessionClosed}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={sessionClosed || upsertMutation.isPending}
              >
                {upsertMutation.isPending
                  ? 'جاري الحفظ...'
                  : handover
                    ? 'حفظ سجل التسليم والاستلام'
                    : 'حفظ سجل التسليم والاستلام'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {handover ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              خطوات الاعتماد
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={handover.handoverStatus === 'APPROVED' ? <CheckCircleIcon /> : undefined}
                  label={`التسليم: ${HANDOVER_STEP_LABELS[handover.handoverStatus]} — ${handover.outgoingSupervisor.fullName}`}
                  color={handover.handoverStatus === 'APPROVED' ? 'success' : 'warning'}
                />
                <Button
                  variant="outlined"
                  onClick={() => approveHandoverMutation.mutate(handover.id)}
                  disabled={
                    sessionClosed ||
                    handover.handoverStatus === 'APPROVED' ||
                    approveHandoverMutation.isPending
                  }
                >
                  اعتماد التسليم
                </Button>
              </Stack>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={handover.takeoverStatus === 'APPROVED' ? <CheckCircleIcon /> : undefined}
                  label={`الاستلام: ${HANDOVER_STEP_LABELS[handover.takeoverStatus]} — ${handover.incomingSupervisor.fullName}`}
                  color={handover.takeoverStatus === 'APPROVED' ? 'success' : 'warning'}
                />
                <Button
                  variant="outlined"
                  onClick={() => approveTakeoverMutation.mutate(handover.id)}
                  disabled={
                    sessionClosed ||
                    handover.handoverStatus !== 'APPROVED' ||
                    handover.takeoverStatus === 'APPROVED' ||
                    approveTakeoverMutation.isPending
                  }
                >
                  اعتماد الاستلام
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {!canClose && !sessionClosed && closeBlockedReason ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {closeBlockedReason}
        </Alert>
      ) : null}

      {sessionClosed ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          تم إغلاق الوردية بنجاح بعد اعتماد التسليم والاستلام.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          لا يمكن إغلاق جلسة الوردية إلا بعد اعتماد التسليم من المشرف المسلّم واعتماد الاستلام من
          المشرف المستلم.
        </Alert>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        سجل عمليات التسليم السابقة
      </Typography>
      {history.length === 0 ? (
        <Alert severity="info">لا توجد عمليات تسليم سابقة بعد.</Alert>
      ) : (
        <TableContainer component={Card}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>الوردية / المجموعة</TableCell>
                <TableCell>المسلّم</TableCell>
                <TableCell>المستلم</TableCell>
                <TableCell align="right">بلاغات مفتوحة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>ملاحظات / عهد</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    {new Date(row.updatedAt).toLocaleString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    {row.session.kindLabel.nameAr} — {groupLabel(row.session.group)}
                  </TableCell>
                  <TableCell>{row.outgoingSupervisor.fullName}</TableCell>
                  <TableCell>{row.incomingSupervisor.fullName}</TableCell>
                  <TableCell align="right">{row.openIncidentsCount}</TableCell>
                  <TableCell>
                    {HANDOVER_STEP_LABELS[row.handoverStatus]} /{' '}
                    {HANDOVER_STEP_LABELS[row.takeoverStatus]}
                  </TableCell>
                  <TableCell>
                    {[row.notes, row.equipmentNotes].filter(Boolean).join(' | ') || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
