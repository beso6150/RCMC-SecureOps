import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
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
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { TASKS_QUERY_KEYS, listOverdueTasks, listTasks } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type { OperationalTask, TaskPriority, TaskStatus } from '../../types/tasks';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  formatDateTime,
} from '../../utils/sprint19Labels';

function TaskCard({ task }: { task: OperationalTask }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            color={PRIORITY_COLORS[task.priority]}
            label={PRIORITY_LABELS[task.priority]}
          />
          <Chip size="small" variant="outlined" label={TASK_STATUS_LABELS[task.status]} />
        </Stack>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {task.taskNumber ?? task.id.slice(0, 8)} · {TASK_TYPE_LABELS[task.taskType]}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
          {task.description}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          الاستحقاق: {formatDateTime(task.dueAt)}
        </Typography>
      </CardContent>
      <CardActions>
        <Button component={RouterLink} to={`/tasks/${task.id}`} size="small">
          التفاصيل
        </Button>
      </CardActions>
    </Card>
  );
}

export function TasksCenterPage() {
  const { user } = useAuth();
  const canRead = hasPermission(user?.permissions ?? [], [PermissionCodes.TASKS_READ]);
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');

  const params = useMemo(
    () => ({
      pageSize: 50,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    }),
    [status, priority],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: TASKS_QUERY_KEYS.list(params),
    queryFn: () => listTasks(params),
    enabled: canRead,
    refetchInterval: 30_000,
  });

  const { data: overdueData } = useQuery({
    queryKey: TASKS_QUERY_KEYS.overdue({ pageSize: 5 }),
    queryFn: () => listOverdueTasks({ pageSize: 5 }),
    enabled: canRead,
  });

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض المهام.</Alert>;
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
      <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل المهام.'}</Alert>
    );
  }

  const rows = data?.data ?? [];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 2, gap: 2 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            مركز المهام
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة ومتابعة المهام التشغيلية
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button component={RouterLink} to="/tasks/my" variant="contained">
            مهامي
          </Button>
          <Button component={RouterLink} to="/tasks/overdue" variant="outlined" color="warning">
            المتأخرة ({overdueData?.meta.total ?? 0})
          </Button>
          <Button component={RouterLink} to="/tasks/statistics" variant="outlined">
            الإحصائيات
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            label="الحالة"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
          >
            <MenuItem value="">الكل</MenuItem>
            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الأولوية</InputLabel>
          <Select
            label="الأولوية"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
          >
            <MenuItem value="">الكل</MenuItem>
            {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
              <MenuItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
        بطاقات سريعة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {rows.slice(0, 6).map((task) => (
          <Grid key={task.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <TaskCard task={task} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
        الجدول
      </Typography>
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الرقم</TableCell>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المسند إليه</TableCell>
              <TableCell>الاستحقاق</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  لا توجد مهام
                </TableCell>
              </TableRow>
            ) : (
              rows.map((task) => (
                <TableRow key={task.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/tasks/${task.id}`}
                      size="small"
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    >
                      {task.taskNumber ?? '—'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/tasks/${task.id}`}
                      size="small"
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    >
                      {task.title}
                    </Button>
                  </TableCell>
                  <TableCell>{TASK_TYPE_LABELS[task.taskType]}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
