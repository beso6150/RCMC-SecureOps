import { useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CallIcon from '@mui/icons-material/Call';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import { createFieldAlert } from '../../api/fieldOperations';
import { createReferral } from '../../api/cctvOperations';
import type { Violation } from '../../types/cctv';
import { getViolationCaseCapabilities } from '../hooks/useViolationCaseCapabilities';
import { parseViolationNotes } from '../utils/violationMeta';

interface ViolationSupervisorActionsProps {
  violation: Violation;
  roleCode: string;
  permissions: string[];
}

export function ViolationSupervisorActions({
  violation,
  roleCode,
  permissions,
}: ViolationSupervisorActionsProps) {
  const caps = getViolationCaseCapabilities(roleCode, permissions);
  const { meta, freeNotes } = parseViolationNotes(violation.notes);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const employeeName = meta?.employeeName ?? null;
  const employeePhone = meta?.employeePhone ?? null;
  const employeeId = meta?.employeeId ?? null;
  const permitNumber = meta?.hasPermit ? meta.permitNumber : null;

  const alertMutation = useMutation({
    mutationFn: async () => {
      if (!caps.canSendEmployeeAlert) {
        throw new Error('ليست لديك صلاحية إرسال التنبيه.');
      }
      return createFieldAlert({
        title: `تنبيه مخالفة مركبة — ${violation.plateNumber}`,
        description: [
          `لوحة: ${violation.plateNumber}`,
          employeeName ? `الموظف: ${employeeName}` : null,
          permitNumber ? `التصريح: ${permitNumber}` : null,
          meta?.reasonLabel ? `السبب: ${meta.reasonLabel}` : null,
          freeNotes ? `ملاحظات: ${freeNotes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        alertType: 'SECURITY_NOTICE',
        severity: meta?.highPriority ? 'HIGH' : 'MEDIUM',
        assignedUserId: employeeId || undefined,
      });
    },
    onSuccess: () => {
      setError(null);
      setMessage('تم إرسال التنبيه بعد ضغط الزر — لم يُرسل تلقائياً عند الحفظ.');
    },
    onError: (err) => {
      setMessage(null);
      setError((err as Error)?.message ?? 'تعذّر إرسال التنبيه.');
    },
  });

  const referMutation = useMutation({
    mutationFn: async () => {
      if (!caps.canRefer) throw new Error('ليست لديك صلاحية الإحالة.');
      return createReferral({
        title: `إحالة مخالفة مركبة ${violation.plateNumber}`,
        description: [
          `لوحة: ${violation.plateNumber}`,
          meta?.reasonLabel ? `السبب: ${meta.reasonLabel}` : null,
          employeeName ? `الموظف: ${employeeName}` : null,
          freeNotes || null,
        ]
          .filter(Boolean)
          .join('\n'),
        referralType:
          meta?.reasonCode === 'SUSPICIOUS' ? 'SUSPICIOUS_VEHICLE' : 'PARKING_VIOLATION',
        severity: meta?.highPriority ? 'HIGH' : 'MEDIUM',
        notes: `violationId=${violation.id}`,
        sendImmediately: false,
      });
    },
    onSuccess: () => {
      setError(null);
      setMessage('تم إنشاء مسودة إحالة. أرسلها من مركز الإحالات عند الجاهزية.');
    },
    onError: (err) => {
      setMessage(null);
      setError((err as Error)?.message ?? 'تعذّر إنشاء الإحالة.');
    },
  });

  const showPanel =
    caps.canSendEmployeeAlert ||
    caps.canRefer ||
    Boolean(employeeName || employeePhone || permitNumber);

  if (!showPanel) return null;

  const copyPhone = async () => {
    if (!employeePhone) return;
    try {
      await navigator.clipboard.writeText(employeePhone);
      setMessage('تم نسخ رقم الجوال.');
      setError(null);
    } catch {
      setError('تعذّر نسخ الرقم.');
    }
  };

  return (
    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: 'divider' }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>إجراءات المتابعة</Typography>

      {(employeeName || employeePhone || permitNumber) && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2">الموظف: {employeeName ?? '—'}</Typography>
          <Typography variant="body2">الجوال: {employeePhone ?? '—'}</Typography>
          <Typography variant="body2">التصريح: {permitNumber ?? '—'}</Typography>
          {meta?.caseType ? (
            <Typography variant="body2" color="text.secondary">
              نوع الحالة: {meta.caseType === 'SIGHTING' ? 'رصد' : 'مخالفة'}
              {meta.reasonLabel ? ` · ${meta.reasonLabel}` : ''}
            </Typography>
          ) : null}
        </Box>
      )}

      <Stack spacing={1}>
        {caps.canSendEmployeeAlert ? (
          <Button
            className="mobile-btn"
            variant="contained"
            color="warning"
            fullWidth
            sx={{ minHeight: 48 }}
            startIcon={<NotificationsActiveIcon />}
            disabled={alertMutation.isPending}
            onClick={() => alertMutation.mutate()}
          >
            إرسال تنبيه للموظف
          </Button>
        ) : null}

        {employeePhone ? (
          <>
            <Button
              className="mobile-btn"
              variant="outlined"
              fullWidth
              sx={{ minHeight: 48 }}
              startIcon={<ContentCopyIcon />}
              onClick={() => void copyPhone()}
            >
              نسخ رقم الجوال
            </Button>
            <Button
              className="mobile-btn"
              variant="outlined"
              fullWidth
              sx={{ minHeight: 48 }}
              startIcon={<CallIcon />}
              href={`tel:${employeePhone}`}
              component="a"
            >
              اتصال
            </Button>
          </>
        ) : null}

        {caps.canRefer ? (
          <Button
            className="mobile-btn"
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ minHeight: 48 }}
            startIcon={<ForwardToInboxIcon />}
            disabled={referMutation.isPending}
            onClick={() => referMutation.mutate()}
          >
            إحالة
          </Button>
        ) : null}
      </Stack>

      {message ? (
        <Alert severity="success" sx={{ mt: 1 }}>
          {message}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  );
}
