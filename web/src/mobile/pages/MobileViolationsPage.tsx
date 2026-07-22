import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  VIOLATIONS_QUERY_KEYS,
  listViolations,
  startViolation,
  closeViolation,
} from '../../api/violations';
import { useAuth } from '../../auth/AuthContext';
import { PermissionCodes, hasPermission } from '../../auth/rbac';
import {
  VIOLATION_STATUS_LABELS,
  VIOLATION_TYPE_LABELS,
} from '../../components/cctv/cctvLabels';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { ViolationEvidencePanel } from '../components/ViolationEvidencePanel';
import { ViolationSupervisorActions } from '../components/ViolationSupervisorActions';
import { getViolationCaseCapabilities } from '../hooks/useViolationCaseCapabilities';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';
import { parseViolationNotes } from '../utils/violationMeta';
import { siteFromParkingCode } from '../config/violationCaseConfig';

function statusColor(status: string) {
  if (status === 'RESOLVED' || status === 'CANCELLED') return 'success' as const;
  if (status === 'IN_PROGRESS' || status === 'ASSIGNED') return 'warning' as const;
  if (status === 'NEW') return 'error' as const;
  return 'default' as const;
}

export function MobileViolationsPage() {
  const { user } = useAuth();
  const { formatRelative } = useMobileDateFormat();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = user?.permissions ?? [];
  const roleCode = user?.roleCode ?? '';
  const caps = getViolationCaseCapabilities(roleCode, permissions);
  const [flash, setFlash] = useState<string | null>(null);

  const canUpdate = hasPermission(permissions, [
    PermissionCodes.VIOLATIONS_UPDATE,
    PermissionCodes.VIOLATIONS_CLOSE,
  ]);

  useEffect(() => {
    const state = location.state as { saved?: boolean; notifyHint?: string | null } | null;
    if (state?.saved) {
      setFlash(
        state.notifyHint
          ? `تم حفظ الحالة. ${state.notifyHint}`
          : 'تم حفظ الحالة بنجاح.',
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.list({ pageSize: 40 }),
    queryFn: () => listViolations({ pageSize: 40 }),
    refetchInterval: 45_000,
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => startViolation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['violations'] }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeViolation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['violations'] }),
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل المخالفات…" />;

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل قائمة المخالفات.'}
      </Alert>
    );
  }

  const rows = data?.data ?? [];
  const canCreate = caps.canCreateViolation || caps.canCreateSighting;

  return (
    <Box>
      <MobilePageHeader
        title="مخالفات ورصد المركبات"
        subtitle={`${rows.length} حالة معروضة`}
        action={
          canCreate ? (
            <Button
              component={RouterLink}
              to="/mobile/violations/new"
              className="mobile-btn"
              variant="contained"
              sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
            >
              حالة جديدة
            </Button>
          ) : undefined
        }
      />

      {flash ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFlash(null)}>
          {flash}
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <MobileEmptyState
          title="لا توجد حالات"
          description="ابدأ بتصوير مركبة وإنشاء مخالفة أو رصد."
        />
      ) : (
        rows.map((row) => {
          const { meta } = parseViolationNotes(row.notes);
          const site = siteFromParkingCode(row.parkingCode);
          return (
            <MobileListCard
              key={row.id}
              title={row.plateNumber}
              subtitle={
                meta?.reasonLabel ||
                VIOLATION_TYPE_LABELS[row.violationType ?? ''] ||
                row.violationType
              }
              meta={`${meta?.caseType === 'SIGHTING' ? 'رصد' : 'مخالفة'}${site ? ` · ${site}` : ''} · ${formatRelative(row.createdAt)}`}
              statusLabel={VIOLATION_STATUS_LABELS[row.status] ?? row.status}
              statusColor={statusColor(row.status)}
            >
              {canUpdate && (row.status === 'ASSIGNED' || row.status === 'NEW') ? (
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button
                    className="mobile-btn"
                    variant="contained"
                    fullWidth
                    sx={{ minHeight: 48 }}
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate(row.id)}
                  >
                    بدء المعالجة
                  </Button>
                </Stack>
              ) : null}
              {caps.canApproveOrClose && row.status === 'IN_PROGRESS' ? (
                <Button
                  className="mobile-btn"
                  variant="outlined"
                  color="success"
                  fullWidth
                  sx={{ minHeight: 48, mb: 1 }}
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate(row.id)}
                >
                  اعتماد / إغلاق الحالة
                </Button>
              ) : null}

              <ViolationEvidencePanel
                violation={row}
                roleCode={roleCode}
                permissions={permissions}
              />
              <ViolationSupervisorActions
                violation={row}
                roleCode={roleCode}
                permissions={permissions}
              />
            </MobileListCard>
          );
        })
      )}
    </Box>
  );
}
