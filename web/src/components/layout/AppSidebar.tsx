import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { useAuth } from '../../auth/AuthContext';
import { getVisibleNavItems } from '../../auth/rbac';

const DRAWER_WIDTH = 280;

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

function isNavItemSelected(pathname: string, itemPath: string, allPaths: string[]): boolean {
  if (itemPath === '/') {
    return pathname === '/';
  }

  if (pathname === itemPath) {
    return true;
  }

  if (!pathname.startsWith(`${itemPath}/`)) {
    return false;
  }

  // Prefer the longest matching nav path so /shifts does not steal /shifts/handover.
  const longerMatch = allPaths.some(
    (path) =>
      path !== itemPath &&
      path.startsWith(`${itemPath}/`) &&
      (pathname === path || pathname.startsWith(`${path}/`)),
  );

  return !longerMatch;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const { user } = useAuth();

  const items = useMemo(() => {
    if (!user) return [];
    return getVisibleNavItems({ roleCode: user.roleCode, permissions: user.permissions });
  }, [user]);

  const allPaths = useMemo(() => items.map((item) => item.path), [items]);

  const content = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2, gap: 1.5, minHeight: 72 }}>
        <SecurityIcon color="secondary" />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            المشرف الأمني
          </Typography>
          <Typography variant="caption" color="text.secondary">
            RCMC SecureOps
          </Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1, flex: 1 }}>
        {items.map((item) => {
          const selected = isNavItemSelected(location.pathname, item.path, allPaths);
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.id}
              component={RouterLink}
              to={item.path}
              selected={selected}
              onClick={isMobile ? onClose : undefined}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
        },
      }}
    >
      {content}
    </Drawer>
  );
}

export { DRAWER_WIDTH };
