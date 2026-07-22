import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import type { AxiosError } from 'axios';
import * as authApi from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import type { ApiErrorBody } from '../../types/auth';

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

export function MobileChangePasswordPage() {
  const navigate = useNavigate();
  const { clearMustChangePassword, mustChangePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      clearMustChangePassword();
      reset();
      if (mustChangePassword) {
        navigate('/mobile/login', {
          replace: true,
          state: { message: 'تم تغيير كلمة المرور. يرجى تسجيل الدخول مجدداً.' },
        });
      } else {
        setSuccess('تم تحديث كلمة المرور بنجاح.');
        navigate('/mobile/profile', { replace: true });
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setError(axiosErr.response?.data?.message ?? 'تعذّر تغيير كلمة المرور.');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <LockResetIcon color="warning" sx={{ fontSize: 36 }} />
        <Typography sx={{ fontWeight: 800, fontSize: '1.25rem' }}>تغيير كلمة المرور</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {mustChangePassword
          ? 'يجب تغيير كلمة المرور قبل متابعة استخدام التطبيق.'
          : 'حدّث كلمة المرور الخاصة بحسابك.'}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      ) : null}

      <Box
        component="form"
        className="mobile-card"
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        sx={{ p: 2.5 }}
      >
        <TextField
          {...register('currentPassword')}
          className="mobile-input"
          label="كلمة المرور الحالية"
          type="password"
          fullWidth
          margin="normal"
          error={Boolean(errors.currentPassword)}
          helperText={errors.currentPassword?.message}
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        />
        <TextField
          {...register('newPassword')}
          className="mobile-input"
          label="كلمة المرور الجديدة"
          type="password"
          fullWidth
          margin="normal"
          error={Boolean(errors.newPassword)}
          helperText={errors.newPassword?.message}
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        />
        <TextField
          {...register('confirmPassword')}
          className="mobile-input"
          label="تأكيد كلمة المرور"
          type="password"
          fullWidth
          margin="normal"
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message}
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        />
        <Button
          type="submit"
          className="mobile-btn"
          variant="contained"
          fullWidth
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 2, minHeight: 48 }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'حفظ كلمة المرور'}
        </Button>
      </Box>
    </Box>
  );
}
