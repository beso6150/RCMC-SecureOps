import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../auth/rbac';
import { MobilePageHeader } from '../components/MobilePageHeader';

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: 'flex-start', py: 1.25 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'end' }}>
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}

export function MobileProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/mobile/login', { replace: true });
  };

  return (
    <Box>
      <MobilePageHeader title="حسابي" subtitle="الملف الشخصي وإعدادات الدخول" />

      <Box className="mobile-card" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.15rem' }}>{user.fullName}</Typography>
        <Chip
          label={ROLE_LABELS[user.roleCode] || user.roleNameAr}
          color="secondary"
          size="small"
          sx={{ mt: 1, mb: 1 }}
        />
        <Divider sx={{ my: 1 }} />
        <ProfileRow label="رقم الهوية" value={user.nationalId} />
        <ProfileRow label="رقم الموظف" value={user.employeeNumber} />
        <ProfileRow label="البريد" value={user.email} />
        <ProfileRow label="الجوال" value={user.phone} />
        <ProfileRow label="المسمى" value={user.jobTitle} />
        <ProfileRow label="القسم" value={user.departmentNameAr} />
        <ProfileRow label="الوردية" value={user.shiftNameAr} />
        <ProfileRow
          label="آخر دخول"
          value={
            user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ar-SA') : null
          }
        />
      </Box>

      <Stack spacing={1.25}>
        <Button
          component={RouterLink}
          to="/mobile/change-password"
          className="mobile-btn"
          variant="outlined"
          fullWidth
          startIcon={<LockResetOutlinedIcon />}
          sx={{ minHeight: 48 }}
        >
          تغيير كلمة المرور
        </Button>
        <Button
          className="mobile-btn"
          variant="contained"
          color="error"
          fullWidth
          startIcon={<LogoutOutlinedIcon />}
          sx={{ minHeight: 48 }}
          onClick={() => void handleLogout()}
        >
          تسجيل الخروج
        </Button>
      </Stack>
    </Box>
  );
}
