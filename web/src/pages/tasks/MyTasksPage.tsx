import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  TASKS_QUERY_KEYS,
  acceptTask,
  listMyTasks,
  startTask,
} from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type { TaskStatus } from '../../types/tasks';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  formatDateTime,
} from '../../utils/sprint19Labels';

type MyTab = 'active' | 'waiting' | 'done' | 'all';

function tabStatuses(tab: MyTab): TaskStatus[] | null {
  if (tab === 'active') return ['NEW', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'OVERDUE'];
  if (tab === 'waiting') return ['WAITING'];
  if (tab === 'done') return ['COMPLETED', 'REJECTED', 'CANCELLED'];
  return null;
}

export function MyTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const canRead = hasPermission(perms, [PermissionCodes.TASKS_READ]);
  const canAccept = hasPermission(perms, [PermissionCodes.TASKS_ACCEPT]);
  const canStart = hasPermission(perms, [PermissionCodes.TASKS_START]);
  const [tab, setTab] = useState<MyTab>('active');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: TASKS_QUERY_KEYS.my({ pageSize: 50 }),
    queryFn: () => listMyTasks({ pageSize: 50 }),
    enabled: canRead,
    refetchInterval: 20_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });
  };

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'start' }) => {
      if (action === 'accept') return acceptTask(id);
      return startTask(id);
    },
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    const statuses = tabStatuses(tab);
    if (!statuses) return all;
    return all.filter((t) => statuses.includes(t.status));
  }, [data, tab]);

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض مهامك.</Alert>;
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
        {(loadError as Error)?.message ?? 'تعذّر تحميل مهامي.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        مهامي
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        واجهة ميدانية بأزرار كبيرة للمهام المسندة إليك
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Tabs
        value={tab}
        onChange={(_, v: MyTab) => setTab(v)}
        variant="scrollable"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="active" label="نشطة" />
        <Tab value="waiting" label="بانتظار" />
        <Tab value="done" label="منتهية" />
        <Tab value="all" label="الكل" />
      </Tabs>

      <Stack spacing={2}>
        {rows.length === 0 ? (
          <Alert severity="info">لا توجد مهام في هذا التصنيف</Alert>
        ) : (
          rows.map((task) => (
            <Card key={task.id} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    color={PRIORITY_COLORS[task.priority]}
                    label={PRIORITY_LABELS[task.priority]}
                  />
                  <Chip size="small" label={TASK_STATUS_LABELS[task.status]} />
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {task.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {task.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  الاستحقاق: {formatDateTime(task.dueAt)}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap' }}>
                <Button
                  component={RouterLink}
                  to={`/tasks/${task.id}`}
                  variant="outlined"
                  size="large"
                  sx={{ minHeight: 48, minWidth: 120 }}
                >
                  التفاصيل
                </Button>
                {canAccept && (task.status === 'ASSIGNED' || task.status === 'PENDING') ? (
                  <Button
                    variant="contained"
                    size="large"
                    sx={{ minHeight: 48, minWidth: 120 }}
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate({ id: task.id, action: 'accept' })}
                  >
                    قبول
                  </Button>
                ) : null}
                {canStart && (task.status === 'ACCEPTED' || task.status === 'ASSIGNED') ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    sx={{ minHeight: 48, minWidth: 120 }}
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate({ id: task.id, action: 'start' })}
                  >
                    بدء
                  </Button>
                ) : null}
              </CardActions>
            </Card>
          ))
        )}
      </Stack>
    </Box>
  );
}
