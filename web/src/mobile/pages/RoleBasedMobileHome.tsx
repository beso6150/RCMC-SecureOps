import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Grid, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../../api/dashboard';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../auth/rbac';
import { DASHBOARD_QUERY_KEY } from '../../hooks/useSocket';
import {
  MOBILE_ACCESS_DENIED_MESSAGE,
  getMobileHomeActions,
} from '../config/mobileRoleAccess';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { MobileStatCard } from '../components/MobileStatCard';

interface LocationState {
  accessDenied?: boolean;
  message?: string;
}

export function RoleBasedMobileHome() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  const ctx = useMemo(
    () => ({
      roleCode: user?.roleCode ?? '',
      permissions: user?.permissions ?? [],
    }),
    [user?.roleCode, user?.permissions],
  );

  const actions = useMemo(() => getMobileHomeActions(ctx), [ctx]);

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.accessDenied) {
      setDeniedMessage(state.message ?? MOBILE_ACCESS_DENIED_MESSAGE);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل لوحة الجوال…" />;

  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل ملخص العمليات.'}
      </Alert>
    );
  }

  const roleLabel = user ? ROLE_LABELS[user.roleCode] || user.roleNameAr : '';

  return (
    <Box>
      <MobilePageHeader
        title={`مرحباً، ${user?.fullName?.split(' ')[0] ?? 'المستخدم'}`}
        subtitle={`${roleLabel} · آخر تحديث ${new Date(dataUpdatedAt).toLocaleTimeString('ar-SA')}`}
      />

      {deniedMessage ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setDeniedMessage(null)}>
          {deniedMessage}
        </Alert>
      ) : null}

      <Grid container spacing={1.25} sx={{ mb: 2 }}>
        <Grid size={6}>
          <MobileStatCard label="مخالفات اليوم" value={data.todaysViolations} accent="error.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="بلاغات مفتوحة" value={data.openIncidents} accent="warning.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard label="مهام معلّقة" value={data.pendingTasks} accent="secondary.main" />
        </Grid>
        <Grid size={6}>
          <MobileStatCard
            label="إشعارات غير مقروءة"
            value={data.unreadNotifications}
            accent="info.main"
          />
        </Grid>
      </Grid>

      <Typography sx={{ fontWeight: 700, mb: 1 }}>إجراءات حسب الدور</Typography>
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {actions.map(({ id, label, to, Icon }) => (
          <Grid size={6} key={id}>
            <Button
              component={RouterLink}
              to={to}
              className="mobile-btn"
              variant="outlined"
              fullWidth
              sx={{
                minHeight: 88,
                flexDirection: 'column',
                gap: 0.75,
                borderRadius: 2,
                px: 1,
                textAlign: 'center',
              }}
            >
              <Icon fontSize="small" />
              <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                {label}
              </Typography>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
