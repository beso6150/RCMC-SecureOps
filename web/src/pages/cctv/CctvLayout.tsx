import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { RoleCodes } from '../../auth/rbac';

interface CctvTab {
  label: string;
  path: string;
  statsOnly?: boolean;
}

const ALL_TABS: CctvTab[] = [
  { label: 'غرفة التحكم', path: '/cctv' },
  { label: 'شاشة العمليات', path: '/cctv/operations', statsOnly: true },
  { label: 'البلاغات المباشرة', path: '/cctv/incidents' },
  { label: 'مخالفات المركبات', path: '/cctv/violations' },
  { label: 'إثبات الحالات', path: '/cctv/case-proofs' },
  { label: 'طلبات الاستعلام', path: '/cctv/inquiries' },
];

const STATS_ONLY_PATHS = ['/cctv', '/cctv/operations'];

export function CctvLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isStatsOnly = user?.roleCode === RoleCodes.PROJECT_MANAGER;

  const tabs = isStatsOnly
    ? ALL_TABS.filter((t) => t.statsOnly || t.path === '/cctv')
    : ALL_TABS;

  if (isStatsOnly && !STATS_ONLY_PATHS.includes(pathname)) {
    return <Navigate to="/cctv/operations" replace />;
  }

  const activeTab = tabs.find((t) =>
    t.path === '/cctv' ? pathname === '/cctv' : pathname.startsWith(t.path),
  )?.path ?? (isStatsOnly ? '/cctv/operations' : '/cctv');

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          غرفة التحكم CCTV
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isStatsOnly
            ? 'عرض إحصائي للعمليات — بدون صلاحية إدارة الطوابير'
            : 'مراقبة مباشرة للبلاغات والمخالفات وطلبات الكاميرات'}
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 42,
          '& .MuiTab-root': { minHeight: 42, fontWeight: 600, fontSize: '0.85rem' },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.path}
            label={tab.label}
            value={tab.path}
            component={RouterLink}
            to={tab.path}
          />
        ))}
      </Tabs>

      <Outlet />
    </Box>
  );
}
