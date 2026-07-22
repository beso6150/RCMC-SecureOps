import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { TASKS_QUERY_KEYS, listOverdueTasks } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  formatDateTime,
} from '../../utils/sprint19Labels';

export function OverdueTasksPage() {
  const { user } = useAuth();
  const canRead = hasPermission(user?.permissions ?? [], [PermissionCodes.TASKS_READ]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: TASKS_QUERY_KEYS.overdue({ pageSize: 100 }),
    queryFn: () => listOverdueTasks({ pageSize: 100 }),
    enabled: canRead,
    refetchInterval: 30_000,
  });

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض المهام المتأخرة.</Alert>;
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
        {(error as Error)?.message ?? 'تعذّر تحميل المهام المتأخرة.'}
      </Alert>
    );
  }

  const rows = data?.data ?? [];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3, gap: 2 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            المهام المتأخرة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {rows.length} مهمة تجاوزت موعد الاستحقاق
          </Typography>
        </Box>
        <Button component={RouterLink} to="/tasks" variant="outlined">
          مركز المهام
        </Button>
      </Stack>

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المسند إليه</TableCell>
              <TableCell>الاستحقاق</TableCell>
              <TableCell align="left">إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  لا توجد مهام متأخرة
                </TableCell>
              </TableRow>
            ) : (
              rows.map((task) => (
                <TableRow key={task.id} hover>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={PRIORITY_COLORS[task.priority]}
                      label={PRIORITY_LABELS[task.priority]}
                    />
                  </TableCell>
                  <TableCell>{TASK_STATUS_LABELS[task.status]}</TableCell>
                  <TableCell>{task.assignee?.fullName ?? '—'}</TableCell>
                  <TableCell>{formatDateTime(task.dueAt)}</TableCell>
                  <TableCell align="left">
                    <Button component={RouterLink} to={`/tasks/${task.id}`} size="small">
                      فتح
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
