import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  createOpsIncident,
  listIncidentTypes,
  OPS_ROOM_QUERY_KEYS,
} from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsDetailSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import {
  OPS_SEVERITY_LABELS,
  type OpsIncidentSeverity,
} from '../../types/operationsRoom';

export function IncidentNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canCreate = hasPermission(user?.permissions ?? [], [PermissionCodes.INCIDENTS_CREATE]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [typeId, setTypeId] = useState('');
  const [severity, setSeverity] = useState<OpsIncidentSeverity>('MEDIUM');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.types,
    queryFn: listIncidentTypes,
    enabled: canCreate,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createOpsIncident({
        typeId,
        title: title.trim(),
        description: description.trim(),
        severity,
        notes: notes.trim() || null,
      }),
    onSuccess: (incident) => {
      void queryClient.invalidateQueries({ queryKey: OPS_ROOM_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ['incidents'] });
      navigate(`/incidents/${incident.id}`);
    },
    onError: (e: Error) => setErrorMsg(e.message ?? 'تعذّر تسجيل الحادث.'),
  });

  if (!canCreate) {
    return (
      <Box>
        <OpsRoomPageHeader title="تسجيل حادث" />
        <Alert severity="warning">ليس لديك صلاحية تسجيل حادث جديد.</Alert>
      </Box>
    );
  }

  if (typesQuery.isLoading) {
    return (
      <Box>
        <OpsRoomPageHeader title="تسجيل حادث" />
        <OpsDetailSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <OpsRoomPageHeader
        title="تسجيل حادث"
        subtitle="إنشاء بلاغ أمني جديد لغرفة العمليات"
        actions={
          <Button component={RouterLink} to="/incidents" variant="outlined">
            العودة للقائمة
          </Button>
        }
      />

      {typesQuery.isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(typesQuery.error as Error)?.message ?? 'تعذّر تحميل أنواع البلاغات.'}
        </Alert>
      ) : null}
      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      ) : null}

      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        <TextField
          label="العنوان"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
        />
        <TextField
          label="الوصف"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          minRows={4}
        />
        <FormControl fullWidth required>
          <InputLabel>نوع البلاغ</InputLabel>
          <Select
            label="نوع البلاغ"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            {(typesQuery.data ?? []).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.nameAr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>الخطورة</InputLabel>
          <Select
            label="الخطورة"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as OpsIncidentSeverity)}
          >
            {(Object.keys(OPS_SEVERITY_LABELS) as OpsIncidentSeverity[]).map((k) => (
              <MenuItem key={k} value={k}>
                {OPS_SEVERITY_LABELS[k]}
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
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            disabled={
              createMut.isPending ||
              title.trim().length < 2 ||
              description.trim().length < 2 ||
              !typeId
            }
            onClick={() => createMut.mutate()}
          >
            حفظ وتسجيل
          </Button>
          <Button component={RouterLink} to="/incidents" variant="text">
            إلغاء
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
