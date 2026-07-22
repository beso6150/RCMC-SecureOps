import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { CCTV_OPS_QUERY_KEYS, listReferrals } from '../../api/cctvOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import { TableSkeleton } from '../../components/cctvOperations/CctvOpsSkeletons';
import {
  REFERRAL_SEVERITY_LABELS,
  REFERRAL_STATUS_LABELS,
  REFERRAL_TYPE_LABELS,
  type SecurityReferralStatus,
} from '../../types/cctvOperations';

export function CctvOpsReferralsPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user?.permissions ?? [], [
    PermissionCodes.SECURITY_REFERRALS_CREATE,
  ]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const params = useMemo(
    () => ({
      pageSize: 50,
      ...(status ? { status } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [status, search],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.referrals(params),
    queryFn: () => listReferrals(params),
    refetchInterval: 20_000,
  });

  return (
    <Box>
      <CctvOpsPageHeader
        title="الإحالات الأمنية"
        subtitle="إحالات مشغلة المراقبة إلى رجال الأمن في الميدان"
        actions={
          canCreate ? (
            <Button
              component={RouterLink}
              to="/cctv-operations/referrals/new"
              variant="contained"
              startIcon={<AddIcon />}
            >
              إنشاء إحالة أمنية
            </Button>
          ) : null
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
            {(Object.keys(REFERRAL_STATUS_LABELS) as SecurityReferralStatus[]).map((k) => (
              <MenuItem key={k} value={k}>
                {REFERRAL_STATUS_LABELS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الإحالات.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? <Alert severity="info">لا توجد إحالات.</Alert> : null}

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
                <TableCell>المشغلة المرسلة</TableCell>
                <TableCell>المُسند</TableCell>
                <TableCell align="center">تفاصيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.referralNumber}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{REFERRAL_TYPE_LABELS[row.referralType]}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={row.severity === 'CRITICAL' || row.severity === 'HIGH' ? 'error' : 'default'}
                      label={REFERRAL_SEVERITY_LABELS[row.severity]}
                    />
                  </TableCell>
                  <TableCell>{REFERRAL_STATUS_LABELS[row.status]}</TableCell>
                  <TableCell>{row.createdBy?.fullName ?? '—'}</TableCell>
                  <TableCell>{row.assignedUser?.fullName ?? row.assignedGroup?.nameAr ?? '—'}</TableCell>
                  <TableCell align="center">
                    <Button
                      component={RouterLink}
                      to={`/cctv-operations/referrals/${row.id}`}
                      size="small"
                    >
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
