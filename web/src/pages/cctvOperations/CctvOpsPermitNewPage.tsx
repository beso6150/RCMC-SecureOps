import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPermit, fileToBase64 } from '../../api/cctvOperations';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import {
  PERMIT_IMPORTANCE_LABELS,
  PERMIT_TYPE_LABELS,
  type PermitImportance,
  type SecurityPermitType,
} from '../../types/cctvOperations';

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CctvOpsPermitNewPage() {
  const navigate = useNavigate();
  const now = new Date();
  const later = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const [permitType, setPermitType] = useState<SecurityPermitType>('VISITOR');
  const [title, setTitle] = useState('');
  const [holderName, setHolderName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostDepartment, setHostDepartment] = useState('');
  const [allowedFloor, setAllowedFloor] = useState('');
  const [validFrom, setValidFrom] = useState(toLocalInput(now));
  const [validTo, setValidTo] = useState(toLocalInput(later));
  const [importance, setImportance] = useState<PermitImportance>('NORMAL');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const attachment = file
        ? {
            originalFileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            contentBase64: await fileToBase64(file),
          }
        : null;
      return createPermit({
        permitType,
        title: title.trim(),
        holderName: holderName.trim(),
        nationalId: nationalId.trim() || null,
        employeeNumber: employeeNumber.trim() || null,
        companyName: companyName.trim() || null,
        vehiclePlate: vehiclePlate.trim() || null,
        vehicleType: vehicleType.trim() || null,
        hostName: hostName.trim() || null,
        hostDepartment: hostDepartment.trim() || null,
        allowedFloor: allowedFloor.trim() || null,
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        importance,
        notes: notes.trim() || null,
        attachment,
      });
    },
    onSuccess: (permit) => {
      setSnack({ open: true, message: 'تم إنشاء التصريح بواسطة مشغلة المراقبة.', severity: 'success' });
      navigate(`/cctv-operations/permits/${permit.id}`);
    },
    onError: (e: Error) =>
      setSnack({ open: true, message: e.message ?? 'تعذّر إنشاء التصريح.', severity: 'error' }),
  });

  const canSubmit = title.trim() && holderName.trim() && validFrom && validTo;

  return (
    <Box>
      <CctvOpsPageHeader title="إنشاء تصريح" subtitle="إدخال تصريح جديد من مشغلة المراقبة" />

      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        <FormControl fullWidth>
          <InputLabel>نوع التصريح</InputLabel>
          <Select
            label="نوع التصريح"
            value={permitType}
            onChange={(e) => setPermitType(e.target.value as SecurityPermitType)}
          >
            {(Object.keys(PERMIT_TYPE_LABELS) as SecurityPermitType[]).map((k) => (
              <MenuItem key={k} value={k}>
                {PERMIT_TYPE_LABELS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
        <TextField
          label="اسم الحامل"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          required
          fullWidth
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="رقم الهوية" value={nationalId} onChange={(e) => setNationalId(e.target.value)} fullWidth />
          <TextField
            label="الرقم الوظيفي"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            fullWidth
          />
        </Stack>
        <TextField label="الشركة" value={companyName} onChange={(e) => setCompanyName(e.target.value)} fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="لوحة المركبة"
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value)}
            fullWidth
          />
          <TextField
            label="نوع المركبة"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="المضيف" value={hostName} onChange={(e) => setHostName(e.target.value)} fullWidth />
          <TextField
            label="إدارة المضيف"
            value={hostDepartment}
            onChange={(e) => setHostDepartment(e.target.value)}
            fullWidth
          />
        </Stack>
        <TextField label="الطابق المسموح" value={allowedFloor} onChange={(e) => setAllowedFloor(e.target.value)} fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="ساري من"
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            required
          />
          <TextField
            label="ساري إلى"
            type="datetime-local"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            required
          />
        </Stack>
        <FormControl fullWidth>
          <InputLabel>الأهمية</InputLabel>
          <Select
            label="الأهمية"
            value={importance}
            onChange={(e) => setImportance(e.target.value as PermitImportance)}
          >
            {(Object.keys(PERMIT_IMPORTANCE_LABELS) as PermitImportance[]).map((k) => (
              <MenuItem key={k} value={k}>
                {PERMIT_IMPORTANCE_LABELS[k]}
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
          minRows={3}
        />
        <Button variant="outlined" component="label">
          إرفاق ملف (اختياري)
          <input
            hidden
            type="file"
            accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        {file ? <Alert severity="info">الملف المحدد: {file.name}</Alert> : null}

        <Stack direction="row" spacing={1}>
          <Button variant="contained" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            حفظ التصريح
          </Button>
          <Button onClick={() => navigate('/cctv-operations/permits')}>إلغاء</Button>
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
