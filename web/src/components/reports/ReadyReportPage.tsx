import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  defaultDateRange,
  fetchSavedReports,
  fromDateInputValue,
  generateDailyReport,
  generateReport,
  generateShiftReport,
  REPORTS_CENTER_QUERY_KEYS,
  toDateInputValue,
  todayRange,
} from '../../api/reportsCenter';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission } from '../../auth/rbac';
import type { SavedReportType } from '../../types/reportsCenter';
import { SAVED_REPORT_STATUS_LABELS, SAVED_REPORT_TYPE_LABELS } from '../../types/reportsCenter';
import { ReportsPageHeader } from './ReportsPageHeader';
import { EmptyState, ErrorState, PermissionGate } from './ReportsStates';
import { ReportsTableSkeleton } from './ReportsSkeletons';

export interface ReadyReportPageConfig {
  title: string;
  subtitle: string;
  reportType: SavedReportType;
  /** Permission(s) required to view the page */
  viewPermissions: string[];
  /** Permission(s) required to generate */
  generatePermissions: string[];
  generateMode?: 'generic' | 'daily' | 'shift';
  defaultDaysBack?: number;
  useTodayRange?: boolean;
}

export function ReadyReportPage({ config }: { config: ReadyReportPageConfig }) {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initial =
    config.useTodayRange ? todayRange() : defaultDateRange(config.defaultDaysBack ?? 1);
  const [dateFrom, setDateFrom] = useState(toDateInputValue(initial.dateFrom));
  const [dateTo, setDateTo] = useState(toDateInputValue(initial.dateTo));
  const [shiftType, setShiftType] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canGenerate = hasPermission(permissions, config.generatePermissions);

  const listQuery = useQuery({
    queryKey: REPORTS_CENTER_QUERY_KEYS.saved({
      reportType: config.reportType,
      pageSize: 10,
    }),
    queryFn: () =>
      fetchSavedReports({ reportType: config.reportType, page: 1, pageSize: 10 }),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dateFrom: fromDateInputValue(dateFrom, false),
        dateTo: fromDateInputValue(dateTo, true),
        shiftType: shiftType.trim() || null,
        reportType: config.reportType,
      };
      if (config.generateMode === 'daily') {
        return generateDailyReport(payload);
      }
      if (config.generateMode === 'shift') {
        return generateShiftReport(payload);
      }
      return generateReport(payload);
    },
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: REPORTS_CENTER_QUERY_KEYS.all });
      void navigate(`/reports/saved/${report.id}`);
    },
    onError: (err) => {
      setErrorMsg((err as Error)?.message ?? 'تعذّر توليد التقرير.');
    },
  });

  return (
    <PermissionGate anyOf={config.viewPermissions}>
      <Box>
        <ReportsPageHeader
          title={config.title}
          subtitle={config.subtitle}
          actions={
            <Button component={RouterLink} to="/reports" variant="outlined" size="small">
              مركز التقارير
            </Button>
          }
        />

        {errorMsg ? <ErrorState message={errorMsg} /> : null}

        <Card sx={{ mb: 3 }} className="no-print">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              توليد {SAVED_REPORT_TYPE_LABELS[config.reportType]}
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, mb: 2 }}
            >
              <TextField
                label="من تاريخ"
                type="date"
                size="small"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={!canGenerate}
              />
              <TextField
                label="إلى تاريخ"
                type="date"
                size="small"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={!canGenerate}
              />
              {(config.reportType === 'SHIFT_REPORT' ||
                config.reportType === 'HANDOVER_REPORT' ||
                config.reportType === 'SHIFT_PERFORMANCE') && (
                <TextField
                  label="نوع الوردية"
                  size="small"
                  placeholder="صباحية / مسائية"
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  disabled={!canGenerate}
                />
              )}
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                disabled={!canGenerate || generateMutation.isPending}
                onClick={() => {
                  setErrorMsg(null);
                  generateMutation.mutate();
                }}
              >
                {generateMutation.isPending ? 'جارٍ التوليد…' : 'توليد التقرير'}
              </Button>
            </Stack>
            {!canGenerate ? (
              <Alert severity="warning">ليست لديك صلاحية لتوليد هذا التقرير.</Alert>
            ) : null}
          </CardContent>
        </Card>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          أحدث التقارير
        </Typography>
        {listQuery.isLoading ? <ReportsTableSkeleton rows={5} /> : null}
        {listQuery.isError ? (
          <ErrorState
            message={(listQuery.error as Error)?.message ?? 'تعذّر تحميل التقارير.'}
          />
        ) : null}
        {listQuery.data && listQuery.data.data.length === 0 ? (
          <EmptyState message="لا توجد تقارير محفوظة من هذا النوع بعد." />
        ) : null}
        {listQuery.data && listQuery.data.data.length > 0 ? (
          <Stack spacing={1}>
            {listQuery.data.data.map((report) => (
              <Card key={report.id} variant="outlined">
                <CardContent
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 1,
                    alignItems: 'center',
                    py: 1.5,
                    '&:last-child': { pb: 1.5 },
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{report.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.reportNumber} —{' '}
                      {SAVED_REPORT_STATUS_LABELS[report.status] ?? report.status} —{' '}
                      {new Date(report.generatedAt).toLocaleString('ar-SA')}
                    </Typography>
                  </Box>
                  <Button
                    component={RouterLink}
                    to={`/reports/saved/${report.id}`}
                    size="small"
                  >
                    عرض
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : null}
      </Box>
    </PermissionGate>
  );
}
