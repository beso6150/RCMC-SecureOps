import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  arriveReferral,
  CCTV_OPS_QUERY_KEYS,
  listAssignedReferralsInbox,
  receiveReferral,
  resolveReferral,
  startReferral,
} from '../../api/cctvOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import {
  REFERRAL_SEVERITY_LABELS,
  REFERRAL_STATUS_LABELS,
  type SecurityReferral,
} from '../../types/cctvOperations';

export function CctvOpsGuardInboxSection() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const queryClient = useQueryClient();
  const canView = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_VIEW]);
  const canReceive = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_RECEIVE]);
  const canStart = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_START]);
  const canArrive = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_ARRIVE]);
  const canResolve = hasPermission(perms, [PermissionCodes.SECURITY_REFERRALS_RESOLVE]);

  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const enabled =
    canView && (canReceive || canStart || canArrive || canResolve);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.inbox({ pageSize: 10 }),
    queryFn: () => listAssignedReferralsInbox({ pageSize: 10 }),
    enabled,
    refetchInterval: 20_000,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: CCTV_OPS_QUERY_KEYS.all });

  const receiveMut = useMutation({
    mutationFn: receiveReferral,
    onSuccess: invalidate,
    onError: (e: Error) => setErrorMsg(e.message ?? 'تعذّر الاستلام.'),
  });
  const startMut = useMutation({
    mutationFn: startReferral,
    onSuccess: invalidate,
    onError: (e: Error) => setErrorMsg(e.message ?? 'تعذّر البدء.'),
  });
  const arriveMut = useMutation({
    mutationFn: arriveReferral,
    onSuccess: invalidate,
    onError: (e: Error) => setErrorMsg(e.message ?? 'تعذّر تسجيل الوصول.'),
  });
  const resolveMut = useMutation({
    mutationFn: ({ id, summary }: { id: string; summary: string }) =>
      resolveReferral(id, { resolutionSummary: summary }),
    onSuccess: () => {
      invalidate();
      setResolveId(null);
      setResolution('');
    },
    onError: (e: Error) => setErrorMsg(e.message ?? 'تعذّر الحل.'),
  });

  if (!enabled) return null;

  const rows: SecurityReferral[] = data?.data ?? [];

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
        إحالات المراقبة
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        الإحالات المسندة إليك من مشغلة كاميرات المراقبة CCTV
      </Typography>

      {isLoading ? <Alert severity="info">جاري تحميل الإحالات…</Alert> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل إحالات المراقبة.'}</Alert>
      ) : null}
      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      ) : null}
      {!isLoading && !isError && rows.length === 0 ? (
        <Alert severity="info">لا توجد إحالات مسندة حالياً.</Alert>
      ) : null}

      <Stack spacing={2}>
        {rows.map((row) => (
          <Card key={row.id} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {row.referralNumber} — {row.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {REFERRAL_STATUS_LABELS[row.status]} · {REFERRAL_SEVERITY_LABELS[row.severity]} ·
                    المشغلة المرسلة: {row.createdBy?.fullName ?? '—'}
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  {canReceive && row.status === 'SENT' ? (
                    <Button
                      size="large"
                      variant="contained"
                      color="success"
                      onClick={() => receiveMut.mutate(row.id)}
                    >
                      استلام
                    </Button>
                  ) : null}
                  {canStart && row.status === 'RECEIVED' ? (
                    <Button size="large" variant="contained" onClick={() => startMut.mutate(row.id)}>
                      بدء التحقق
                    </Button>
                  ) : null}
                  {canArrive && row.status === 'IN_PROGRESS' && !row.arrivedAt ? (
                    <Button size="large" variant="outlined" onClick={() => arriveMut.mutate(row.id)}>
                      وصول للموقع
                    </Button>
                  ) : null}
                  {canResolve && (row.status === 'IN_PROGRESS' || row.status === 'ESCALATED') ? (
                    <Button
                      size="large"
                      variant="contained"
                      color="secondary"
                      onClick={() => setResolveId(row.id)}
                    >
                      حل
                    </Button>
                  ) : null}
                  <Button
                    size="large"
                    component={RouterLink}
                    to={`/cctv-operations/referrals/${row.id}`}
                  >
                    التفاصيل
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={Boolean(resolveId)} onClose={() => setResolveId(null)} fullWidth maxWidth="sm">
        <DialogTitle>حل الإحالة</DialogTitle>
        <DialogContent>
          <TextField
            label="ملخص النتيجة"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            fullWidth
            required
            multiline
            minRows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveId(null)}>تراجع</Button>
          <Button
            variant="contained"
            disabled={!resolveId || !resolution.trim()}
            onClick={() => {
              if (resolveId) resolveMut.mutate({ id: resolveId, summary: resolution.trim() });
            }}
          >
            تأكيد الحل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
