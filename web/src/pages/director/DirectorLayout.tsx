import { Outlet, useLocation } from 'react-router-dom';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const TABS = [
  { label: 'لوحة مدير الأمن', path: '/director' },
  { label: 'إدارة المستخدمين', path: '/director/users' },
  { label: 'إدارة الصلاحيات', path: '/director/permissions' },
  { label: 'إدارة الشكاوى', path: '/director/complaints' },
  { label: 'الإحصائيات', path: '/director/statistics' },
  { label: 'التقارير', path: '/director/reports' },
  { label: 'إعدادات النظام', path: '/director/settings' },
] as const;

export function DirectorLayout() {
  const { pathname } = useLocation();

  const activeTab =
    TABS.find((t) =>
      t.path === '/director' ? pathname === '/director' : pathname.startsWith(t.path),
    )?.path ?? '/director';

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          لوحة مدير الأمن
        </Typography>
        <Typography variant="body2" color="text.secondary">
          إدارة شاملة للمستخدمين والصلاحيات والشكاوى والتقارير وإعدادات النظام
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
        {TABS.map((tab) => (
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
