import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listUsers } from '../../api/users';
import { createReferral } from '../../api/cctvOperations';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import {
  REFERRAL_SEVERITY_LABELS,
  REFERRAL_TYPE_LABELS,
  type SecurityReferralSeverity,
  type SecurityReferralType,
} from '../../types/cctvOperations';

export function CctvOpsReferralNewPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [referralType, setReferralType] = useState<SecurityReferralType>('SECURITY_OBSERVATION');
  const [severity, setSeverity] = useState<SecurityReferralSeverity>('MEDIUM');
  const [cameraCode, setCameraCode] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [sendImmediately, setSendImmediately] = useState(true);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const usersQuery = useQuery({
    queryKey: ['users', { pageSize: 100, forReferralAssign: true }],
    queryFn: () => listUsers({ pageSize: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      createReferral({
        title: title.trim(),
        description: description.trim(),
        referralType,
        severity,
        cameraCode: cameraCode.trim() || null,
        floorNumber: floorNumber ? Number(floorNumber) : null,
        assignedUserId: assignedUserId || null,
        notes: notes.trim() || null,
        sendImmediately,
      }),
    onSuccess: (referral) => {
      setSnack({
        open: true,
        message: sendImmediately
          ? 'تم الإرسال بواسطة مشغلة CCTV.'
          : 'تم إنشاء الإحالة بواسطة مشغلة المراقبة.',
        severity: 'success',
      });
      navigate(`/cctv-operations/referrals/${referral.id}`);
    },
    onError: (e: Error) =>
      setSnack({ open: true, message: e.message ?? 'تعذّر إنشاء الإحالة.', severity: 'error' }),
  });

  const canSubmit = title.trim() && description.trim();

  return (
    <Box>
      <CctvOpsPageHeader
        title="إنشاء إحالة أمنية"
        subtitle="إرسال ملاحظة ميدانية من مشغلة المراقبة"
      />

      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        <TextField label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
        <TextField
          label="الوصف"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          fullWidth
          multiline
          minRows={4}
        />
        <FormControl fullWidth>
          <InputLabel>نوع الإحالة</InputLabel>
          <Select
            label="نوع الإحالة"
            value={referralType}
            onChange={(e) => setReferralType(e.target.value as SecurityReferralType)}
          >
            {(Object.keys(REFERRAL_TYPE_LABELS) as SecurityReferralType[]).map((k) => (
              <MenuItem key={k} value={k}>
                {REFERRAL_TYPE_LABELS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>الخطورة</InputLabel>
          <Select
            label="الخطورة"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SecurityReferralSeverity)}
          >
            {(Object.keys(REFERRAL_SEVERITY_LABELS) as SecurityReferralSeverity[]).map((k) => (
              <MenuItem key={k} value={k}>
                {REFERRAL_SEVERITY_LABELS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="رمز الكاميرا"
            value={cameraCode}
            onChange={(e) => setCameraCode(e.target.value)}
            fullWidth
          />
          <TextField
            label="رقم الطابق"
            type="number"
            value={floorNumber}
            onChange={(e) => setFloorNumber(e.target.value)}
            fullWidth
          />
        </Stack>
        <FormControl fullWidth>
          <InputLabel>إسناد إلى رجل أمن</InputLabel>
          <Select
            label="إسناد إلى رجل أمن"
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
          >
            <MenuItem value="">بدون إسناد مباشر</MenuItem>
            {(usersQuery.data?.data ?? []).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.fullName} ({u.employeeNumber})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="ملاحظات"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <FormControlLabel
          control={
            <Switch checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} />
          }
          label="إرسال فوري للوردية"
        />
        {severity === 'CRITICAL' ? (
          <Alert severity="warning">الإحالات الحرجة تُصعَّد فوراً للمشرف ومدير العمليات.</Alert>
        ) : null}

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            حفظ الإحالة
          </Button>
          <Button onClick={() => navigate('/cctv-operations/referrals')}>إلغاء</Button>
        </Stack>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
      />
    </Box>
  );
}
