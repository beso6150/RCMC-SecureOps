import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { listOpsIncidents, OPS_ROOM_QUERY_KEYS } from '../../api/operationsRoom';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { OpsRoomPageHeader } from '../../components/operationsRoom/OpsRoomPageHeader';
import { OpsTableSkeleton } from '../../components/operationsRoom/OpsRoomSkeletons';
import { OpsSeverityChip, OpsStatusChip } from '../../components/operationsRoom/OpsStatusChips';
import {
  OPS_INCIDENT_STATUS_LABELS,
  OPS_SEVERITY_LABELS,
  type OpsIncidentSeverity,
  type OpsIncidentStatus,
} from '../../types/operationsRoom';

export function IncidentsListPage() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const canView = hasPermission(perms, [
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_VIEW_ALL,
    PermissionCodes.INCIDENTS_VIEW_ASSIGNED,
  ]);
  const canCreate = hasPermission(perms, [PermissionCodes.INCIDENTS_CREATE]);

  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');

  const params = useMemo(
    () => ({
      pageSize: 50,
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [status, severity, search],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: OPS_ROOM_QUERY_KEYS.incidents(params),
    queryFn: () => listOpsIncidents(params),
    enabled: canView,
    refetchInterval: 20_000,
  });

  if (!canView) {
    return (
      <Box>
        <OpsRoomPageHeader title="البلاغات والحوادث" />
        <Alert severity="warning">ليس لديك صلاحية عرض البلاغات.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <OpsRoomPageHeader
        title="البلاغات والحوادث"
        subtitle="قائمة كاملة مع تصفية حسب الحالة والخطورة"
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {canCreate ? (
              <Button
                component={RouterLink}
                to="/incidents/new"
                variant="contained"
                startIcon={<AddIcon />}
              >
                تسجيل حادث
              </Button>
            ) : null}
            <Button component={RouterLink} to="/cctv/incidents" variant="outlined" size="small">
              طابور CCTV
            </Button>
            <Button component={RouterLink} to="/operations-room" variant="outlined" size="small">
              غرفة العمليات
            </Button>
          </Stack>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>الحالة</InputLabel>
          <Select label="الحالة" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            {(Object.keys(OPS_INCIDENT_STATUS_LABELS) as OpsIncidentStatus[]).map((k) => (
              <MenuItem key={k} value={k}>
                {OPS_INCIDENT_STATUS_LABELS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الخطورة</InputLabel>
          <Select label="الخطورة" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            {(Object.keys(OPS_SEVERITY_LABELS) as OpsIncidentSeverity[]).map((k) => (
              <MenuItem key={k} value={k}>
                {OPS_SEVERITY_LABELS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? <OpsTableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل البلاغات.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? <Alert severity="info">لا توجد بلاغات مطابقة.</Alert> : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الرقم</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الخطورة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>المُبلِّغ</TableCell>
                <TableCell>المُسند</TableCell>
                <TableCell align="center">تفاصيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.incidentNumber ?? '—'}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.type?.nameAr ?? '—'}</TableCell>
                  <TableCell>
                    <OpsSeverityChip severity={row.severity} />
                  </TableCell>
                  <TableCell>
                    <OpsStatusChip status={row.status} />
                  </TableCell>
                  <TableCell>{row.reporter?.fullName ?? '—'}</TableCell>
                  <TableCell>{row.assignee?.fullName ?? '—'}</TableCell>
                  <TableCell align="center">
                    <Button component={RouterLink} to={`/incidents/${row.id}`} size="small">
                      فتح
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}
