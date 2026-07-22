import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../auth/rbac';
import { NotificationBell } from './NotificationBell';

interface AppTopBarProps {
  onMenuClick: () => void;
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
}

export function AppTopBar({ onMenuClick, colorMode, onToggleColorMode }: AppTopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{ bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton edge="start" onClick={onMenuClick} aria-label="فتح القائمة">
          <MenuIcon />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        <NotificationBell />

        <Tooltip title={colorMode === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}>
          <IconButton onClick={onToggleColorMode} aria-label="تبديل الوضع">
            {colorMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="قائمة المستخدم">
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: 14 }}>
            {user?.fullName?.charAt(0) ?? '?'}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1, minWidth: 220 }}>
            <Typography variant="subtitle2">{user?.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {(user?.roleCode && ROLE_LABELS[user.roleCode]) || user?.roleNameAr}
            </Typography>
          </Box>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/profile');
            }}
          >
            <PersonIcon fontSize="small" sx={{ ml: 1 }} />
            الملف الشخصي
          </MenuItem>
          <MenuItem onClick={() => void handleLogout()}>
            <LogoutIcon fontSize="small" sx={{ ml: 1 }} />
            تسجيل الخروج
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
