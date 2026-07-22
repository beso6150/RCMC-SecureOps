import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createViolation } from '../../api/violations';
import { uploadBase64 } from '../../api/uploads';
import { listUsers } from '../../api/users';
import { searchPermits } from '../../api/cctv';
import { useAuth } from '../../auth/AuthContext';
import type { UserRecord } from '../../types/director';
import {
  MOBILE_CASE_TYPES,
  MOBILE_PARKING_SITES,
  PERMIT_NUMBER_PREFIX,
  VEHICLE_TYPE_OPTIONS,
  getActiveCaseReasons,
  parkingCodeFromSite,
  type MobileCaseType,
  type MobileParkingSiteCode,
} from '../config/violationCaseConfig';
import { getViolationCaseCapabilities } from '../hooks/useViolationCaseCapabilities';
import { attemptPlateRecognition } from '../services/plateRecognition';
import {
  notifyViolationStakeholders,
  shouldNotifyDirector,
} from '../services/violationNotifications';
import { encodeViolationNotes } from '../utils/violationMeta';
import { MobilePageHeader } from '../components/MobilePageHeader';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1]! : result);
    };
    reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

export function MobileViolationCaseFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const caps = getViolationCaseCapabilities(user?.roleCode ?? '', user?.permissions ?? []);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const reasons = useMemo(() => getActiveCaseReasons(), []);

  const [caseType, setCaseType] = useState<MobileCaseType>('VIOLATION');
  const [site, setSite] = useState<MobileParkingSiteCode>('G');
  const [reasonCode, setReasonCode] = useState(reasons[0]?.code ?? 'OTHER');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<UserRecord | null>(null);
  const [hasPermit, setHasPermit] = useState(false);
  const [permitNumber, setPermitNumber] = useState(PERMIT_NUMBER_PREFIX);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate =
    (caseType === 'VIOLATION' && caps.canCreateViolation) ||
    (caseType === 'SIGHTING' && caps.canCreateSighting);

  const employeesQuery = useQuery({
    queryKey: ['users', 'mobile-search', employeeQuery],
    queryFn: () => listUsers({ search: employeeQuery.trim(), pageSize: 8, status: 'ACTIVE' }),
    enabled: employeeQuery.trim().length >= 2 && !selectedEmployee,
  });

  const platePermitQuery = useQuery({
    queryKey: ['permits', 'by-plate', plateNumber],
    queryFn: () => searchPermits(plateNumber.trim()),
    enabled: plateNumber.trim().length >= 3,
  });

  const reason = reasons.find((r) => r.code === reasonCode);

  const onCaptureFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming]);
    setPreviews((prev) => [...prev, ...incoming.map((f) => URL.createObjectURL(f))]);

    const primary = incoming[0];
    if (!primary || !caps.canCapture) return;

    setOcrBusy(true);
    setOcrMessage(null);
    try {
      const result = await attemptPlateRecognition(primary);
      if (result.plateNumber) setPlateNumber(result.plateNumber);
      if (result.vehicleType) setVehicleType(result.vehicleType);
      setOcrMessage(result.message ?? (result.plateNumber ? 'تم اقتراح بيانات من الصورة.' : null));
    } finally {
      setOcrBusy(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canCreate) throw new Error('ليست لديك صلاحية إنشاء الحالة.');
      if (!plateNumber.trim()) throw new Error('رقم اللوحة مطلوب.');
      if (!reasonCode) throw new Error('سبب الحالة مطلوب.');
      if (files.length === 0) throw new Error('أرفق صورة واحدةً للمركبة على الأقل.');
      if (hasPermit) {
        const p = permitNumber.trim().toUpperCase();
        if (!p.startsWith(PERMIT_NUMBER_PREFIX)) {
          throw new Error(`رقم التصريح يجب أن يبدأ بـ ${PERMIT_NUMBER_PREFIX}`);
        }
        if (p.length <= PERMIT_NUMBER_PREFIX.length) {
          throw new Error('أدخل رقم التصريح كاملاً.');
        }
      }

      const attachments = [];
      for (const [index, file] of files.entries()) {
        const contentBase64 = await fileToBase64(file);
        const uploaded = await uploadBase64({
          fileName: file.name || `vehicle-${Date.now()}.jpg`,
          mimeType: file.type || 'image/jpeg',
          contentBase64,
          folder: 'violations',
        });
        attachments.push({
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          storageKey: uploaded.storageKey,
          imagePath: uploaded.url,
          sortOrder: index,
        });
      }

      const employeeName = selectedEmployee?.fullName?.trim() || employeeQuery.trim() || null;
      const employeePhone = selectedEmployee?.phone ?? null;
      const employeeId = selectedEmployee?.id ?? null;
      const highPriority = Boolean(reason?.highPriority);

      const metaNotes = encodeViolationNotes(
        {
          version: 1,
          caseType,
          reasonCode,
          reasonLabel: reason?.label ?? reasonCode,
          vehicleType: vehicleType || null,
          hasPermit,
          permitNumber: hasPermit ? permitNumber.trim().toUpperCase() : null,
          employeeId,
          employeeName,
          employeePhone,
          highPriority,
        },
        notes,
      );

      const created = await createViolation({
        plateNumber: plateNumber.trim().toUpperCase(),
        violationType: reason?.mapsToViolationType ?? 'OTHER',
        parkingCode: parkingCodeFromSite(site),
        notes: metaNotes,
        imagePath: attachments[0]?.imagePath,
        ocrResult: plateNumber.trim().toUpperCase(),
        ocrConfidence: null,
        vehicleColor: vehicleType || null,
        autoAssign: true,
        attachments,
        clientSyncId: crypto.randomUUID(),
      });

      const notifyResult = await notifyViolationStakeholders({
        violationId: created.id,
        reasonCode,
        reasonLabel: reason?.label ?? reasonCode,
        plateNumber: created.plateNumber,
        caseType,
        highPriority,
        notifyDirector: shouldNotifyDirector(reason, highPriority),
      });

      return { created, notifyResult };
    },
    onSuccess: ({ notifyResult }) => {
      setFormError(null);
      navigate('/mobile/violations', {
        replace: true,
        state: {
          saved: true,
          notifyHint: notifyResult.notified ? null : (notifyResult.skippedReason ?? null),
        },
      });
    },
    onError: (err) => {
      setFormError((err as Error)?.message ?? 'تعذّر حفظ الحالة.');
    },
  });

  const matchedPermit = platePermitQuery.data?.[0];
  const displayEmployeeName =
    selectedEmployee?.fullName ||
    employeeQuery.trim() ||
    matchedPermit?.employeeName ||
    matchedPermit?.ownerName ||
    null;
  const displayPhone =
    selectedEmployee?.phone || matchedPermit?.employeePhone || matchedPermit?.ownerPhone || null;

  if (!canCreate) {
    return (
      <Alert severity="warning">ليست لديك صلاحية إنشاء مخالفة أو رصد مركبة.</Alert>
    );
  }

  return (
    <Box>
      <MobilePageHeader
        title="حالة مركبة جديدة"
        subtitle="تصوير · موقع ثابت · مخالفة أو رصد"
      />

      {formError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      ) : null}
      {ocrMessage ? (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setOcrMessage(null)}>
          {ocrMessage}
        </Alert>
      ) : null}

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>1) تصوير المركبة</Typography>
        <Stack spacing={1}>
          {caps.canCapture ? (
            <Button
              className="mobile-btn"
              variant="contained"
              fullWidth
              sx={{ minHeight: 48 }}
              disabled={ocrBusy}
              onClick={() => cameraRef.current?.click()}
            >
              {ocrBusy ? <CircularProgress size={22} color="inherit" /> : '📷 تصوير المركبة'}
            </Button>
          ) : null}
          <Button
            className="mobile-btn"
            variant="outlined"
            fullWidth
            sx={{ minHeight: 48 }}
            onClick={() => galleryRef.current?.click()}
          >
            🖼 اختيار صورة
          </Button>
        </Stack>

        <TextField
          className="mobile-input"
          label="رقم اللوحة"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          fullWidth
          margin="normal"
          required
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        />
        <TextField
          className="mobile-input"
          select
          label="نوع المركبة"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          fullWidth
          margin="normal"
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        >
          <MenuItem value="">غير محدد</MenuItem>
          {VEHICLE_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <FormControl fullWidth>
          <FormLabel sx={{ fontWeight: 700, mb: 1 }}>2) الموقع</FormLabel>
          <RadioGroup
            value={site}
            onChange={(e) => setSite(e.target.value as MobileParkingSiteCode)}
          >
            {MOBILE_PARKING_SITES.map((item) => (
              <FormControlLabel
                key={item.code}
                value={item.code}
                control={<Radio />}
                label={item.label}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <FormControl fullWidth>
          <FormLabel sx={{ fontWeight: 700, mb: 1 }}>3) نوع الحالة</FormLabel>
          <RadioGroup
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as MobileCaseType)}
          >
            {MOBILE_CASE_TYPES.map((item) => (
              <FormControlLabel
                key={item.value}
                value={item.value}
                control={<Radio />}
                label={item.label}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>4) سبب الحالة</Typography>
        <TextField
          className="mobile-input"
          select
          fullWidth
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        >
          {reasons.map((item) => (
            <MenuItem key={item.code} value={item.code}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>5) بيانات الموظف</Typography>
        <TextField
          className="mobile-input"
          label="اسم الموظف (اختياري)"
          value={selectedEmployee ? selectedEmployee.fullName : employeeQuery}
          onChange={(e) => {
            setSelectedEmployee(null);
            setEmployeeQuery(e.target.value);
          }}
          fullWidth
          margin="normal"
          helperText="اكتب حرفين على الأقل لعرض الاقتراحات، أو أدخل الاسم يدوياً"
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        />
        {!selectedEmployee && (employeesQuery.data?.data?.length ?? 0) > 0 ? (
          <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {employeesQuery.data!.data.map((emp) => (
              <ListItemButton
                key={emp.id}
                onClick={() => {
                  setSelectedEmployee(emp);
                  setEmployeeQuery(emp.fullName);
                }}
              >
                <ListItemText
                  primary={emp.fullName}
                  secondary={`${emp.employeeNumber}${emp.phone ? ` · ${emp.phone}` : ''}`}
                />
              </ListItemButton>
            ))}
          </List>
        ) : null}
      </Box>

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <FormControl fullWidth>
          <FormLabel sx={{ fontWeight: 700, mb: 1 }}>6) تصريح الوقوف</FormLabel>
          <RadioGroup
            value={hasPermit ? 'yes' : 'no'}
            onChange={(e) => setHasPermit(e.target.value === 'yes')}
          >
            <FormControlLabel value="yes" control={<Radio />} label="يوجد تصريح" />
            <FormControlLabel value="no" control={<Radio />} label="لا يوجد تصريح" />
          </RadioGroup>
        </FormControl>
        {hasPermit ? (
          <TextField
            className="mobile-input"
            label="رقم التصريح"
            value={permitNumber}
            onChange={(e) => {
              const raw = e.target.value.toUpperCase();
              setPermitNumber(
                raw.startsWith(PERMIT_NUMBER_PREFIX)
                  ? raw
                  : `${PERMIT_NUMBER_PREFIX}${raw.replace(/^RCMC-?/i, '')}`,
              );
            }}
            fullWidth
            margin="normal"
            helperText={`يجب أن يبدأ بـ ${PERMIT_NUMBER_PREFIX}`}
            slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
          />
        ) : null}
      </Box>

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>7) الأدلة</Typography>
        <Typography variant="body2" color="text.secondary">
          عدد الصور: <strong>{files.length}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          آخر صورة: <strong>{files[files.length - 1]?.name ?? 'لا توجد'}</strong>
        </Typography>
        {previews[previews.length - 1] ? (
          <Box
            component="img"
            src={previews[previews.length - 1]}
            alt="آخر دليل"
            sx={{
              width: '100%',
              maxHeight: 180,
              objectFit: 'cover',
              borderRadius: 2,
              mb: 1,
              border: 1,
              borderColor: 'divider',
            }}
          />
        ) : null}
        <Button
          className="mobile-btn"
          variant="outlined"
          fullWidth
          sx={{ minHeight: 48 }}
          disabled={files.length === 0}
          onClick={() => setViewerOpen(true)}
        >
          عرض جميع الصور
        </Button>
      </Box>

      <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>8) الملاحظات</Typography>
        <TextField
          className="mobile-input"
          label="ملاحظات (اختياري)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          slotProps={{ htmlInput: { style: { fontSize: 16 } } }}
        />
      </Box>

      {(displayEmployeeName || displayPhone || (hasPermit && permitNumber)) && (
        <Box className="mobile-card" sx={{ mb: 1.5, p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>بيانات الموظف / التصريح</Typography>
          <Typography variant="body2">الاسم: {displayEmployeeName ?? '—'}</Typography>
          <Typography variant="body2">الجوال: {displayPhone ?? '—'}</Typography>
          <Typography variant="body2">
            التصريح: {hasPermit ? permitNumber : matchedPermit ? 'مرتبط بلوحة' : 'لا يوجد'}
          </Typography>
        </Box>
      )}

      <Button
        className="mobile-btn"
        variant="contained"
        color="secondary"
        fullWidth
        sx={{ minHeight: 52, mb: 1 }}
        disabled={saveMutation.isPending || ocrBusy}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'حفظ الحالة'}
      </Button>
      <Button
        className="mobile-btn"
        variant="text"
        fullWidth
        sx={{ minHeight: 48 }}
        onClick={() => navigate('/mobile/violations')}
      >
        إلغاء
      </Button>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void onCaptureFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void onCaptureFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <Dialog open={viewerOpen} onClose={() => setViewerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>جميع الصور</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {previews.map((src, index) => (
              <Box key={`${src}-${index}`}>
                <Typography variant="caption" color="text.secondary">
                  {files[index]?.name ?? `صورة ${index + 1}`}
                </Typography>
                <Box
                  component="img"
                  src={src}
                  alt={`دليل ${index + 1}`}
                  sx={{ width: '100%', borderRadius: 1, mt: 0.5 }}
                />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button sx={{ minHeight: 48 }} onClick={() => setViewerOpen(false)}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
