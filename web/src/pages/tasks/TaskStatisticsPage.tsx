import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  TASKS_QUERY_KEYS,
  listMyTasks,
  listOverdueTasks,
  listTasks,
} from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type { TaskPriority, TaskStatus } from '../../types/tasks';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../utils/sprint19Labels';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Backend has no GET /tasks/statistics — aggregates from list/my/overdue.
 */
export function TaskStatisticsPage() {
  const { user } = useAuth();
  const canRead = hasPermission(user?.permissions ?? [], [PermissionCodes.TASKS_READ]);

  const { data: allData, isLoading, isError, error } = useQuery({
    queryKey: TASKS_QUERY_KEYS.list({ pageSize: 100 }),
    queryFn: () => listTasks({ pageSize: 100 }),
    enabled: canRead,
  });

  const { data: myData } = useQuery({
    queryKey: TASKS_QUERY_KEYS.my({ pageSize: 100 }),
    queryFn: () => listMyTasks({ pageSize: 100 }),
    enabled: canRead,
  });

  const { data: overdueData } = useQuery({
    queryKey: TASKS_QUERY_KEYS.overdue({ pageSize: 100 }),
    queryFn: () => listOverdueTasks({ pageSize: 100 }),
    enabled: canRead,
  });

  const stats = useMemo(() => {
    const rows = allData?.data ?? [];
    const byStatus = {} as Record<TaskStatus, number>;
    const byPriority = {} as Record<TaskPriority, number>;
    for (const t of rows) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    }
    return {
      total: allData?.meta.total ?? rows.length,
      mine: myData?.meta.total ?? myData?.data.length ?? 0,
      overdue: overdueData?.meta.total ?? overdueData?.data.length ?? 0,
      byStatus,
      byPriority,
    };
  }, [allData, myData, overdueData]);

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض إحصائيات المهام.</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل إحصائيات المهام.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        إحصائيات المهام
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ملخص مُجمَّع من قوائم المهام (لا يوجد مسار إحصائيات منفصل في الواجهة الخلفية)
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="إجمالي المهام" value={stats.total} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="مهامي" value={stats.mine} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="متأخرة" value={stats.overdue} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                حسب الحالة
              </Typography>
              <Stack spacing={0.75}>
                {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                  <Typography key={s} variant="body2">
                    {TASK_STATUS_LABELS[s]}: {stats.byStatus[s] ?? 0}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                حسب الأولوية
              </Typography>
              <Stack spacing={0.75}>
                {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                  <Typography key={p} variant="body2">
                    {PRIORITY_LABELS[p]}: {stats.byPriority[p] ?? 0}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
