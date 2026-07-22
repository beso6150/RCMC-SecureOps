import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { AUDIT_LOGS_QUERY_KEYS, fetchAuditLog } from '../../api/auditLogs';
import { PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { ReportsDetailSkeleton } from '../../components/reports/ReportsSkeletons';
import { PermissionGate } from '../../components/reports/ReportsStates';
import { AUDIT_ACTION_LABELS, AUDIT_SEVERITY_LABELS } from '../../types/auditLogs';

export function AuditLogDetailPage() {
  const { id = '' } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: AUDIT_LOGS_QUERY_KEYS.detail(id),
    queryFn: () => fetchAuditLog(id),
    enabled: Boolean(id),
  });

  return (
    <PermissionGate anyOf={[PermissionCodes.AUDIT_LOGS_VIEW, PermissionCodes.AUDIT_READ]}>
      <Box>
        <ReportsPageHeader
          title="تفاصيل سجل التدقيق"
          subtitle={data ? `${AUDIT_ACTION_LABELS[data.action] ?? data.action} — ${data.entityType}` : undefined}
          actions={
            <Button component={RouterLink} to="/audit-logs" variant="outlined" size="small">
              العودة للقائمة
            </Button>
          }
        />

        {isLoading ? <ReportsDetailSkeleton /> : null}
        {isError ? (
          <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل السجل.'}</Alert>
        ) : null}

        {data ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={AUDIT_SEVERITY_LABELS[data.severity] ?? data.severity} color="primary" />
              <Chip
                label={data.success ? 'نجاح' : 'فشل'}
                color={data.success ? 'success' : 'error'}
              />
              {data.module ? <Chip label={data.module} variant="outlined" /> : null}
            </Stack>

            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  الفاعل
                </Typography>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                  {data.actor?.fullName ?? 'نظام'}
                  {data.actor?.employeeNumber ? ` (${data.actor.employeeNumber})` : ''}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  الوقت
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  {new Date(data.createdAt).toLocaleString('ar-SA')}
                </Typography>

                {data.description ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      الوصف
                    </Typography>
                    <Typography sx={{ mb: 1.5 }}>{data.description}</Typography>
                  </>
                ) : null}

                {data.failureReason ? (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {data.failureReason}
                  </Alert>
                ) : null}

                <Typography variant="body2" color="text.secondary">
                  المعرّفات
                </Typography>
                <Typography sx={{ mb: 1.5, direction: "ltr", textAlign: "left" }}>
                  entityId: {data.entityId ?? '—'} | requestId: {data.requestId ?? '—'} | ip:{' '}
                  {data.ipAddress ?? '—'}
                </Typography>

                {data.oldValues != null ? (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      القيم السابقة
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        p: 1.5,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: 12,
                        dir: 'ltr',
                        textAlign: 'left',
                        mb: 1.5,
                      }}
                    >
                      {JSON.stringify(data.oldValues, null, 2)}
                    </Box>
                  </>
                ) : null}

                {data.newValues != null ? (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      القيم الجديدة
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        p: 1.5,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: 12,
                        dir: 'ltr',
                        textAlign: 'left',
                      }}
                    >
                      {JSON.stringify(data.newValues, null, 2)}
                    </Box>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </Stack>
        ) : null}
      </Box>
    </PermissionGate>
  );
}
