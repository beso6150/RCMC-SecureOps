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
import LockResetIcon from '@mui/icons-material/LockReset';
import * as authApi from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import type { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types/auth';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').max(128),
    newPassword: z.string().min(10, 'كلمة المرور الجديدة 10 أحرف على الأقل').max(128),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const { clearMustChangePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      clearMustChangePassword();
      navigate('/login', {
        replace: true,
        state: { message: 'تم تغيير كلمة المرور. يرجى تسجيل الدخول مجدداً.' },
      });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setError(axiosErr.response?.data?.message ?? 'تعذّر تغيير كلمة المرور.');
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <LockResetIcon color="warning" fontSize="large" />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              تغيير كلمة المرور
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            يجب تغيير كلمة المرور قبل المتابعة إلى النظام.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
            <TextField
              {...register('currentPassword')}
              label="كلمة المرور الحالية"
              type="password"
              fullWidth
              margin="normal"
              error={Boolean(errors.currentPassword)}
              helperText={errors.currentPassword?.message}
            />
            <TextField
              {...register('newPassword')}
              label="كلمة المرور الجديدة"
              type="password"
              fullWidth
              margin="normal"
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword?.message}
            />
            <TextField
              {...register('confirmPassword')}
              label="تأكيد كلمة المرور"
              type="password"
              fullWidth
              margin="normal"
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword?.message}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 2 }}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'حفظ كلمة المرور'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
