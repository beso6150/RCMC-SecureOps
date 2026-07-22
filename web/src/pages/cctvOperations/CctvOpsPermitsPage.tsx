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
import { CCTV_OPS_QUERY_KEYS, listPermits } from '../../api/cctvOperations';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import { TableSkeleton } from '../../components/cctvOperations/CctvOpsSkeletons';
import {
  PERMIT_IMPORTANCE_LABELS,
  PERMIT_STATUS_LABELS,
  PERMIT_TYPE_LABELS,
  type SecurityPermitStatus,
} from '../../types/cctvOperations';

export function CctvOpsPermitsPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user?.permissions ?? [], [PermissionCodes.PERMITS_CREATE]);
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
    queryKey: CCTV_OPS_QUERY_KEYS.permits(params),
    queryFn: () => listPermits(params),
    refetchInterval: 30_000,
  });

  return (
    <Box>
      <CctvOpsPageHeader
        title="التصاريح"
        subtitle="إدارة تصاريح الدخول والمشاركة مع رجال الأمن"
        actions={
          canCreate ? (
            <Button
              component={RouterLink}
              to="/cctv-operations/permits/new"
              variant="contained"
              startIcon={<AddIcon />}
            >
              إنشاء تصريح
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
          placeholder="رقم / اسم / لوحة"
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>الحالة</InputLabel>
          <Select label="الحالة" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            {(Object.keys(PERMIT_STATUS_LABELS) as SecurityPermitStatus[]).map((k) => (
              <MenuItem key={k} value={k}>
                {PERMIT_STATUS_LABELS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل التصاريح.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? <Alert severity="info">لا توجد تصاريح.</Alert> : null}

      {data && data.data.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الرقم</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الحامل</TableCell>
                <TableCell>الأهمية</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الصلاحية</TableCell>
                <TableCell align="center">تفاصيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.permitNumber}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{PERMIT_TYPE_LABELS[row.permitType]}</TableCell>
                  <TableCell>{row.holderName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={PERMIT_IMPORTANCE_LABELS[row.importance]} />
                  </TableCell>
                  <TableCell>{PERMIT_STATUS_LABELS[row.status]}</TableCell>
                  <TableCell>
                    {new Date(row.validFrom).toLocaleDateString('ar-SA')} —{' '}
                    {new Date(row.validTo).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      component={RouterLink}
                      to={`/cctv-operations/permits/${row.id}`}
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
