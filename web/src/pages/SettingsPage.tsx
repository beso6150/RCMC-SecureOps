import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { SETTINGS_QUERY_KEYS, listSystemSettings } from '../api/settings';
import { useAuth } from '../auth/AuthContext';
import { RoleCodes } from '../auth/rbac';

function formatSettingValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function SettingsPage() {
  const { user } = useAuth();
  const isDirector = user?.roleCode === RoleCodes.SECURITY_DIRECTOR;

  const {
    data: settings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.system,
    queryFn: listSystemSettings,
    enabled: !isDirector,
    retry: (failureCount, err) => {
      if (isAxiosError(err) && err.response?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const isForbidden = isError && isAxiosError(error) && error.response?.status === 403;

  if (isDirector) {
    return <Navigate to="/director/settings" replace />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        الإعدادات
      </Typography>

      {isForbidden ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          لا تملك صلاحية عرض إعدادات النظام. يمكنك إدارة ملفك الشخصي من الرابط أدناه.
        </Alert>
      ) : isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error)?.message ?? 'تعذّر تحميل الإعدادات.'}
        </Alert>
      ) : settings && settings.length > 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              إعدادات النظام (للقراءة فقط)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المفتاح</TableCell>
                    <TableCell>القيمة</TableCell>
                    <TableCell>الوصف</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {settings.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{s.key}</TableCell>
                      <TableCell>{formatSettingValue(s.value)}</TableCell>
                      <TableCell>{s.description ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              إعدادات الحساب
            </Typography>
            <Typography variant="body2" color="text.secondary">
              لتعديل بياناتك الشخصية أو كلمة المرور، انتقل إلى الملف الشخصي.
            </Typography>
            <Button component={RouterLink} to="/profile" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
              الملف الشخصي
            </Button>
            <Typography variant="body2" color="text.secondary">
              يتم تطبيق المظهر (الوضع الفاتح/الداكن) تلقائياً من شريط التطبيق العلوي.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
