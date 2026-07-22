import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import { AppSidebar, DRAWER_WIDTH } from '../components/layout/AppSidebar';
import { AppTopBar } from '../components/layout/AppTopBar';
import { BreadcrumbsNav } from '../components/layout/BreadcrumbsNav';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from '../hooks/useSocket';

interface DashboardLayoutProps {
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
}

export function DashboardLayout({ colorMode, onToggleColorMode }: DashboardLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { user } = useAuth();

  useSocket(Boolean(user));

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          transition: theme.transitions.create(['width', 'margin']),
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppTopBar
          onMenuClick={() => setSidebarOpen((v) => !v)}
          colorMode={colorMode}
          onToggleColorMode={onToggleColorMode}
        />
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
          <BreadcrumbsNav />
          <Outlet />
        </Container>
        <Box
          component="footer"
          sx={{
            py: 1.5,
            px: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            RCMC SecureOps v1.0.0
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Developed by Bassam Alharbi
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
