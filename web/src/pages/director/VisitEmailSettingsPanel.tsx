import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SETTINGS_QUERY_KEYS } from '../../api/settings';
import type { VisitEmailInboxSettings } from '../../types/visitIntake';
import { DEFAULT_VISIT_EMAIL_SETTINGS } from '../../types/visitIntake';
import {
  loadVisitEmailSettings,
  processVisitMessage,
  saveVisitEmailSettings,
  testVisitEmailConnection,
} from '../../visitors/intake/processVisitMessage';

interface VisitEmailSettingsPanelProps {
  onNotify?: (message: string, severity: 'success' | 'error') => void;
}

export function VisitEmailSettingsPanel({ onNotify }: VisitEmailSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VisitEmailInboxSettings>({ ...DEFAULT_VISIT_EMAIL_SETTINGS });
  const [sampleSubject, setSampleSubject] = useState('طلب زيارة');
  const [sampleBody, setSampleBody] = useState(
    [
      'اسم الزائر: أحمد العتيبي',
      'اليوم: الأحد',
      'التاريخ: 2026/07/26',
      'وقت الوصول: 10:30',
      'القاعة: قاعة الاجتماعات 3',
      'عدد مواقف الزوار: 2',
      'الجوال: 0551234567',
      'الملاحظات: زيارة عمل',
    ].join('\n'),
  );
  const [sampleSender, setSampleSender] = useState('visitor.desk@rcmc.gov.sa');
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...SETTINGS_QUERY_KEYS.system, 'visit-email'],
    queryFn: loadVisitEmailSettings,
  });

  useEffect(() => {
    if (data) setForm({ ...DEFAULT_VISIT_EMAIL_SETTINGS, ...data });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => saveVisitEmailSettings(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.system });
      onNotify?.('تم حفظ إعدادات بريد الزيارات', 'success');
      setLocalMessage('تم حفظ الإعدادات. يمكن ربط أي صندوق بريد لاحقاً عبر هذه الحقول.');
    },
    onError: (err: Error) => {
      onNotify?.(err.message, 'error');
      setLocalMessage(err.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => testVisitEmailConnection(form),
    onSuccess: (result) => {
      onNotify?.(result.message, result.ok ? 'success' : 'error');
      setLocalMessage(result.message);
    },
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      processVisitMessage({
        subject: sampleSubject,
        body: sampleBody,
        senderEmail: sampleSender,
      }),
    onSuccess: (result) => {
      const missing = result.extraction.missingFields.length
        ? ` · حقول ناقصة: ${result.extraction.missingFields.join(', ')}`
        : ' · بيانات مكتملة';
      const notify = result.notifiedSupervisor
        ? ' · تم إشعار المشرف'
        : ' · إشعار المشرف بانتظار Backend';
      const msg = `تم إنشاء طلب زيارة (${result.visitorId.slice(0, 8)}…) بحالة بانتظار الاعتماد${missing}${notify}`;
      onNotify?.(msg, 'success');
      setLocalMessage(msg);
      void queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
    onError: (err: Error) => {
      onNotify?.(err.message, 'error');
      setLocalMessage(err.message);
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل إعدادات بريد الزيارات.'}
      </Alert>
    );
  }

  const setField = <K extends keyof VisitEmailInboxSettings>(
    key: K,
    value: VisitEmailInboxSettings[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            إعدادات بريد الزيارات
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            جهّز النظام للربط بأي صندوق بريد يُدخل لاحقاً. لا يتم إنشاء بريد فعلي من هذه الصفحة.
            عند تفعيل القراءة الخلفية ستُستخرج بيانات الزيارة تلقائياً من الرسائل والمرفقات.
          </Typography>

          {localMessage ? (
            <Alert severity="info" sx={{ mb: 2 }} onClose={() => setLocalMessage(null)}>
              {localMessage}
            </Alert>
          ) : null}

          <Stack spacing={2}>
            <TextField
              label="عنوان البريد الإلكتروني"
              value={form.emailAddress}
              onChange={(e) => setField('emailAddress', e.target.value)}
              fullWidth
              placeholder="visits@example.com"
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="IMAP Host"
                value={form.imapHost}
                onChange={(e) => setField('imapHost', e.target.value)}
                fullWidth
                placeholder="imap.example.com"
              />
              <TextField
                label="المنفذ"
                type="number"
                value={form.imapPort}
                onChange={(e) => setField('imapPort', Number(e.target.value) || 993)}
                sx={{ width: { xs: '100%', md: 160 } }}
              />
            </Stack>
            <TextField
              label="اسم المستخدم"
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              fullWidth
              autoComplete="username"
            />
            <TextField
              label="كلمة المرور"
              type="password"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              fullWidth
              autoComplete="current-password"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.useSslTls}
                  onChange={(e) => setField('useSslTls', e.target.checked)}
                />
              }
              label="SSL/TLS"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.enabled}
                  onChange={(e) => setField('enabled', e.target.checked)}
                />
              }
              label="تفعيل استقبال طلبات الزيارة من البريد (عند جاهزية الخادم)"
            />
            <TextField
              label="فترة الفحص (دقائق)"
              type="number"
              value={form.pollIntervalMinutes}
              onChange={(e) =>
                setField('pollIntervalMinutes', Math.max(1, Number(e.target.value) || 5))
              }
              sx={{ maxWidth: 240 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <CircularProgress size={22} color="inherit" /> : 'حفظ'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<NetworkCheckIcon />}
              disabled={testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              {testMutation.isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'اختبار الاتصال'
              )}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            تجربة طبقة الاستخراج
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            محاكاة رسالة واردة (نص حر) لإنشاء طلب زيارة بحالة «بانتظار الاعتماد» دون IMAP فعلي.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="البريد المرسل"
              value={sampleSender}
              onChange={(e) => setSampleSender(e.target.value)}
              fullWidth
              helperText="النطاق الحالي في الخادم يجب أن يكون @rcmc.gov.sa حتى يُقبل الاستيراد"
            />
            <TextField
              label="الموضوع"
              value={sampleSubject}
              onChange={(e) => setSampleSubject(e.target.value)}
              fullWidth
            />
            <TextField
              label="نص الرسالة"
              value={sampleBody}
              onChange={(e) => setSampleBody(e.target.value)}
              fullWidth
              multiline
              minRows={8}
            />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PlayArrowIcon />}
              disabled={simulateMutation.isPending}
              onClick={() => simulateMutation.mutate()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {simulateMutation.isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'تشغيل الاستخراج وإنشاء الطلب'
              )}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
