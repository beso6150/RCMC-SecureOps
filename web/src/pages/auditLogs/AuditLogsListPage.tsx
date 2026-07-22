import DownloadIcon from '@mui/icons-material/Download';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AUDIT_LOGS_QUERY_KEYS,
  exportAuditLogs,
  fetchAuditLogStatistics,
  fetchAuditLogs,
} from '../../api/auditLogs';
import { triggerBlobDownload } from '../../api/reportsCenter';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { ReportsCardsSkeleton, ReportsTableSkeleton } from '../../components/reports/ReportsSkeletons';
import { EmptyState, PermissionGate } from '../../components/reports/ReportsStates';
import type { AuditAction, AuditSeverity } from '../../types/auditLogs';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_SEVERITY_LABELS,
} from '../../types/auditLogs';

export function AuditLogsListPage() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canExport = hasPermission(permissions, [PermissionCodes.AUDIT_LOGS_EXPORT]);
  const canStats = hasPermission(permissions, [
    PermissionCodes.AUDIT_LOGS_STATISTICS,
    PermissionCodes.AUDIT_LOGS_VIEW,
    PermissionCodes.AUDIT_READ,
  ]);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | ''>('');
  const [severity, setSeverity] = useState<AuditSeverity | ''>('');
  const [module, setModule] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const params = {
    page,
    pageSize: 20,
    ...(action ? { action } : {}),
    ...(severity ? { severity } : {}),
    ...(module.trim() ? { module: module.trim() } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };

  const listQuery = useQuery({
    queryKey: AUDIT_LOGS_QUERY_KEYS.list(params),
    queryFn: () => fetchAuditLogs(params),
  });

  const statsQuery = useQuery({
    queryKey: AUDIT_LOGS_QUERY_KEYS.statistics({ module: module.trim() || undefined }),
    queryFn: () => fetchAuditLogStatistics({ module: module.trim() || undefined }),
    enabled: canStats,
  });

  const handleExport = async () => {
    setExporting(true);
    setErrMsg(null);
    try {
      const blob = await exportAuditLogs(params);
      triggerBlobDownload(blob, 'audit-logs.csv');
    } catch (err) {
      setErrMsg((err as Error)?.message ?? 'فشل تصدير سجلات التدقيق.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PermissionGate anyOf={[PermissionCodes.AUDIT_LOGS_VIEW, PermissionCodes.AUDIT_READ]}>
      <Box>
        <ReportsPageHeader
          title="سجلات التدقيق"
          subtitle="مراجعة أحداث النظام وعمليات التصدير والوصول الحساسة"
          actions={
            canExport ? (
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={exporting}
                onClick={() => void handleExport()}
              >
                تصدير CSV
              </Button>
            ) : null
          }
        />

        {errMsg ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg(null)}>
            {errMsg}
          </Alert>
        ) : null}

        {canStats && statsQuery.isLoading ? <ReportsCardsSkeleton count={4} /> : null}
        {statsQuery.data ? (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'إجمالي السجلات', value: statsQuery.data.total },
              { label: 'فاشلة', value: statsQuery.data.failed },
              { label: 'نسبة النجاح %', value: statsQuery.data.successRate },
              {
                label: 'أحداث حرجة',
                value:
                  statsQuery.data.bySeverity.find((s) => s.severity === 'CRITICAL')?.count ?? 0,
              },
            ].map((card) => (
              <Grid key={card.label} size={{ xs: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : null}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الإجراء</InputLabel>
            <Select
              label="الإجراء"
              value={action}
              onChange={(e) => {
                setAction(e.target.value as AuditAction | '');
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
                <MenuItem key={a} value={a}>
                  {AUDIT_ACTION_LABELS[a]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الخطورة</InputLabel>
            <Select
              label="الخطورة"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as AuditSeverity | '');
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {(Object.keys(AUDIT_SEVERITY_LABELS) as AuditSeverity[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {AUDIT_SEVERITY_LABELS[s]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="الوحدة"
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
          />
          <TextField
            size="small"
            label="بحث"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </Stack>

        {listQuery.isLoading ? <ReportsTableSkeleton /> : null}
        {listQuery.isError ? (
          <Alert severity="error">
            {(listQuery.error as Error)?.message ?? 'تعذّر تحميل سجلات التدقيق.'}
          </Alert>
        ) : null}
        {listQuery.data && listQuery.data.data.length === 0 ? (
          <EmptyState message="لا توجد سجلات مطابقة." />
        ) : null}

        <Stack spacing={1}>
          {(listQuery.data?.data ?? []).map((row) => (
            <Card key={row.id} variant="outlined">
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
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {AUDIT_ACTION_LABELS[row.action] ?? row.action} — {row.entityType}
                    </Typography>
                    <Chip
                      size="small"
                      label={AUDIT_SEVERITY_LABELS[row.severity] ?? row.severity}
                      color={
                        row.severity === 'CRITICAL'
                          ? 'error'
                          : row.severity === 'HIGH'
                            ? 'warning'
                            : 'default'
                      }
                    />
                    {!row.success ? <Chip size="small" color="error" label="فشل" /> : null}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {row.actor?.fullName ?? 'نظام'} —{' '}
                    {new Date(row.createdAt).toLocaleString('ar-SA')}
                    {row.module ? ` — ${row.module}` : ''}
                    {row.description ? ` — ${row.description}` : ''}
                  </Typography>
                </Box>
                <Button component={RouterLink} to={`/audit-logs/${row.id}`} size="small">
                  تفاصيل
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {(listQuery.data?.meta.totalPages ?? 0) > 1 ? (
          <Pagination
            page={page}
            count={listQuery.data!.meta.totalPages}
            onChange={(_, p) => setPage(p)}
            color="primary"
            sx={{ mt: 2, alignSelf: 'center', display: 'flex', justifyContent: 'center' }}
          />
        ) : null}
      </Box>
    </PermissionGate>
  );
}
