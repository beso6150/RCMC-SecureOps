import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { fetchSavedReports, REPORTS_CENTER_QUERY_KEYS } from '../../api/reportsCenter';
import { PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { ReportsTableSkeleton } from '../../components/reports/ReportsSkeletons';
import { EmptyState, PermissionGate } from '../../components/reports/ReportsStates';
import type { SavedReportStatus, SavedReportType } from '../../types/reportsCenter';
import {
  SAVED_REPORT_STATUS_LABELS,
  SAVED_REPORT_TYPE_LABELS,
} from '../../types/reportsCenter';

const REPORT_TYPES = Object.keys(SAVED_REPORT_TYPE_LABELS) as SavedReportType[];
const STATUSES = Object.keys(SAVED_REPORT_STATUS_LABELS) as SavedReportStatus[];

export function SavedReportsListPage() {
  const [page, setPage] = useState(1);
  const [reportType, setReportType] = useState<SavedReportType | ''>('');
  const [status, setStatus] = useState<SavedReportStatus | ''>('');

  const params = {
    page,
    pageSize: 15,
    ...(reportType ? { reportType } : {}),
    ...(status ? { status } : {}),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.saved(params),
    queryFn: () => fetchSavedReports(params),
  });

  return (
    <PermissionGate anyOf={[PermissionCodes.REPORTS_LIST, PermissionCodes.REPORTS_VIEW]}>
      <Box>
        <ReportsPageHeader
          title="التقارير المحفوظة"
          subtitle="عرض وتصفية التقارير المُنشأة والمعتمدة"
          actions={
            <Button component={RouterLink} to="/reports" variant="outlined" size="small">
              مركز التقارير
            </Button>
          }
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 2 }}
          className="no-print"
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>نوع التقرير</InputLabel>
            <Select
              label="نوع التقرير"
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as SavedReportType | '');
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {REPORT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {SAVED_REPORT_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              label="الحالة"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as SavedReportStatus | '');
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {SAVED_REPORT_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {isLoading ? <ReportsTableSkeleton /> : null}
        {isError ? (
          <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل التقارير.'}</Alert>
        ) : null}
        {data && data.data.length === 0 ? (
          <EmptyState message="لا توجد تقارير مطابقة للتصفية." actionLabel="توليد جديد" actionTo="/reports" />
        ) : null}

        {data && data.data.length > 0 ? (
          <Stack spacing={1}>
            {data.data.map((report) => (
              <Card key={report.id} variant="outlined">
                <CardContent
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    py: 1.5,
                    '&:last-child': { pb: 1.5 },
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{report.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.reportNumber} —{' '}
                      {SAVED_REPORT_TYPE_LABELS[report.reportType] ?? report.reportType} —{' '}
                      {SAVED_REPORT_STATUS_LABELS[report.status] ?? report.status} —{' '}
                      {new Date(report.generatedAt).toLocaleString('ar-SA')}
                      {report.generatedBy?.fullName
                        ? ` — بواسطة ${report.generatedBy.fullName}`
                        : ''}
                    </Typography>
                  </Box>
                  <Button component={RouterLink} to={`/reports/saved/${report.id}`} size="small">
                    عرض
                  </Button>
                </CardContent>
              </Card>
            ))}
            {data.meta.totalPages > 1 ? (
              <Pagination
                className="no-print"
                page={page}
                count={data.meta.totalPages}
                onChange={(_, p) => setPage(p)}
                color="primary"
                sx={{ alignSelf: 'center', mt: 1 }}
              />
            ) : null}
          </Stack>
        ) : null}
      </Box>
    </PermissionGate>
  );
}
