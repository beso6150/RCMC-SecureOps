import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { CCTV_OPS_QUERY_KEYS, listFollowUpReferrals, listReferrals } from '../../api/cctvOperations';
import { CctvOpsPageHeader } from '../../components/cctvOperations/CctvOpsPageHeader';
import { TableSkeleton } from '../../components/cctvOperations/CctvOpsSkeletons';
import {
  REFERRAL_SEVERITY_LABELS,
  REFERRAL_STATUS_LABELS,
  REFERRAL_TYPE_LABELS,
} from '../../types/cctvOperations';

export function CctvOpsFollowUpPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_OPS_QUERY_KEYS.followUp({ pageSize: 50 }),
    queryFn: async () => {
      try {
        return await listFollowUpReferrals({ pageSize: 50, needsFollowUp: true });
      } catch {
        return listReferrals({ pageSize: 50, needsFollowUp: true });
      }
    },
    refetchInterval: 30_000,
  });

  return (
    <Box>
      <CctvOpsPageHeader
        title="متابعة الحالات"
        subtitle="إحالات تحتاج متابعة من مشغلة المراقبة أو المشرف"
      />

      {isLoading ? <TableSkeleton /> : null}
      {isError ? (
        <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المتابعة.'}</Alert>
      ) : null}
      {data && data.data.length === 0 ? (
        <Alert severity="info">لا توجد حالات تحتاج متابعة حالياً.</Alert>
      ) : null}

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
                <TableCell>المُسند</TableCell>
                <TableCell align="center">فتح</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.referralNumber}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <span>{row.title}</span>
                      {row.needsFollowUp ? <Chip size="small" color="warning" label="متابعة" /> : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{REFERRAL_TYPE_LABELS[row.referralType]}</TableCell>
                  <TableCell>{REFERRAL_SEVERITY_LABELS[row.severity]}</TableCell>
                  <TableCell>{REFERRAL_STATUS_LABELS[row.status]}</TableCell>
                  <TableCell>{row.assignedUser?.fullName ?? '—'}</TableCell>
                  <TableCell align="center">
                    <Button
                      component={RouterLink}
                      to={`/cctv-operations/referrals/${row.id}`}
                      size="small"
                    >
                      تفاصيل
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
