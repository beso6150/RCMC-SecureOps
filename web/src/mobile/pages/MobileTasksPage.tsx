import { Alert, Box, Button, Stack } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TASKS_QUERY_KEYS, listMyTasks, acceptTask, startTask, completeTask } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { PermissionCodes, hasPermission } from '../../auth/rbac';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from '../../utils/sprint19Labels';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

export function MobileTasksPage() {
  const { user } = useAuth();
  const { formatRelative } = useMobileDateFormat();
  const queryClient = useQueryClient();
  const permissions = user?.permissions ?? [];

  const canAccept = hasPermission(permissions, [PermissionCodes.TASKS_ACCEPT]);
  const canStart = hasPermission(permissions, [PermissionCodes.TASKS_START]);
  const canComplete = hasPermission(permissions, [PermissionCodes.TASKS_COMPLETE]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: TASKS_QUERY_KEYS.my({ pageSize: 40 }),
    queryFn: () => listMyTasks({ pageSize: 40 }),
    refetchInterval: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptTask(id),
    onSuccess: invalidate,
  });
  const startMutation = useMutation({
    mutationFn: (id: string) => startTask(id),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => completeTask(id, {}),
    onSuccess: invalidate,
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل المهام…" />;

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل المهام المسندة إليك.'}
      </Alert>
    );
  }

  const rows = data?.data ?? [];

  return (
    <Box>
      <MobilePageHeader title="مهامي" subtitle={`${rows.length} مهمة معروضة`} />

      {rows.length === 0 ? (
        <MobileEmptyState title="لا توجد مهام" description="ليس لديك مهام مسندة حالياً." />
      ) : (
        rows.map((row) => (
          <MobileListCard
            key={row.id}
            title={row.title}
            subtitle={TASK_TYPE_LABELS[row.taskType] ?? row.taskType}
            meta={`${PRIORITY_LABELS[row.priority] ?? row.priority} · ${formatRelative(row.dueAt ?? row.createdAt)}`}
            statusLabel={TASK_STATUS_LABELS[row.status] ?? row.status}
            statusColor={PRIORITY_COLORS[row.priority] ?? 'default'}
          >
            <Stack direction="row" spacing={1}>
              {canAccept && (row.status === 'ASSIGNED' || row.status === 'NEW' || row.status === 'PENDING') ? (
                <Button
                  className="mobile-btn"
                  variant="outlined"
                  fullWidth
                  sx={{ minHeight: 48 }}
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(row.id)}
                >
                  قبول
                </Button>
              ) : null}
              {canStart && (row.status === 'ACCEPTED' || row.status === 'ASSIGNED') ? (
                <Button
                  className="mobile-btn"
                  variant="contained"
                  fullWidth
                  sx={{ minHeight: 48 }}
                  disabled={startMutation.isPending}
                  onClick={() => startMutation.mutate(row.id)}
                >
                  بدء
                </Button>
              ) : null}
              {canComplete && (row.status === 'IN_PROGRESS' || row.status === 'WAITING') ? (
                <Button
                  className="mobile-btn"
                  variant="contained"
                  color="success"
                  fullWidth
                  sx={{ minHeight: 48 }}
                  disabled={completeMutation.isPending}
                  onClick={() => completeMutation.mutate(row.id)}
                >
                  إكمال
                </Button>
              ) : null}
            </Stack>
          </MobileListCard>
        ))
      )}
    </Box>
  );
}
