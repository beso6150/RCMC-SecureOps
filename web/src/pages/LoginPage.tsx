import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { getMustChangePassword } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types/auth';

const loginSchema = z.object({
  nationalId: z.string().trim().min(10, 'رقم الهوية يجب أن يكون 10 أرقام على الأقل').max(20),
  employeeNumber: z.string().trim().min(1, 'رقم الموظف مطلوب').max(50),
  password: z.string().max(128).optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nationalId: '', employeeNumber: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      const payload = {
        nationalId: values.nationalId,
        employeeNumber: values.employeeNumber,
        ...(values.password?.trim() ? { password: values.password.trim() } : {}),
      };
      await login(payload);
      if (getMustChangePassword()) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setError(axiosErr.response?.data?.message ?? 'فشل تسجيل الدخول. تحقق من البيانات.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <SecurityIcon color="secondary" fontSize="large" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                المشرف الأمني الذكي
              </Typography>
              <Typography variant="body2" color="text.secondary">
                تسجيل الدخول إلى RCMC SecureOps
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
            <TextField
              {...register('nationalId')}
              label="رقم الهوية الوطنية"
              fullWidth
              margin="normal"
              autoComplete="username"
              error={Boolean(errors.nationalId)}
              helperText={errors.nationalId?.message}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <TextField
              {...register('employeeNumber')}
              label="رقم الموظف"
              fullWidth
              margin="normal"
              autoComplete="username"
              error={Boolean(errors.employeeNumber)}
              helperText={errors.employeeNumber?.message}
            />
            <TextField
              {...register('password')}
              label="كلمة المرور"
              type="password"
              fullWidth
              margin="normal"
              autoComplete="current-password"
              helperText="اتركها فارغة في أول تسجيل دخول (تُستخدم رقم الموظف افتراضياً)"
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 2 }}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'دخول'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
