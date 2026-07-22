import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  NOTIFICATIONS_QUERY_KEYS,
  acknowledgeNotification,
  fetchNotificationStatistics,
  fetchUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { useAuth } from '../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../auth/rbac';
import type {
  ListNotificationsParams,
  NotificationKind,
  NotificationPriority,
  NotificationRecord,
  NotificationStatus,
} from '../types/notifications';
import {
  NOTIFICATION_KIND_LABELS,
  NOTIFICATION_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  formatDateTime,
} from '../utils/sprint19Labels';
import { getSafeInternalPath } from '../utils/safeActionUrl';

type InboxTab =
  | 'all'
  | 'unread'
  | 'action'
  | 'ack'
  | 'urgent'
  | 'critical'
  | 'expired';

const TAB_DEFS: Array<{ id: InboxTab; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'unread', label: 'غير المقروءة' },
  { id: 'action', label: 'تحتاج إجراء' },
  { id: 'ack', label: 'تحتاج تأكيدًا' },
  { id: 'urgent', label: 'عاجلة' },
  { id: 'critical', label: 'حرجة' },
  { id: 'expired', label: 'منتهية' },
];

function matchesTab(row: NotificationRecord, tab: InboxTab): boolean {
  const unread = row.status === 'UNREAD' || row.isRead === false;
  switch (tab) {
    case 'all':
      return true;
    case 'unread':
      return unread;
    case 'action':
      return row.kind === 'ACTION_REQUIRED';
    case 'ack':
      return (
        Boolean(row.requiresAcknowledgement) &&
        !row.acknowledgedAt &&
        row.status !== 'ACKNOWLEDGED' &&
        row.status !== 'EXPIRED' &&
        row.status !== 'CANCELLED'
      );
    case 'urgent':
      return row.priority === 'URGENT' || row.kind === 'URGENT';
    case 'critical':
      return row.priority === 'CRITICAL' || row.kind === 'CRITICAL';
    case 'expired':
      return row.status === 'EXPIRED' || row.status === 'CANCELLED';
    default:
      return true;
  }
}

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const canUpdate = hasPermission(perms, [PermissionCodes.NOTIFICATIONS_UPDATE]);
  const canAck = hasPermission(perms, [
    PermissionCodes.NOTIFICATIONS_ACKNOWLEDGE,
    PermissionCodes.NOTIFICATIONS_UPDATE,
  ]);
  const canPrefs = hasPermission(perms, [
    PermissionCodes.NOTIFICATIONS_PREFERENCES_READ,
    PermissionCodes.NOTIFICATIONS_READ,
  ]);
  const canRules = hasPermission(perms, [PermissionCodes.NOTIFICATIONS_RULES_READ]);

  const [tab, setTab] = useState<InboxTab>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | ''>('');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const listParams: ListNotificationsParams = useMemo(() => {
    const params: ListNotificationsParams = { pageSize: 100 };
    if (tab === 'unread') params.isRead = false;
    if (tab === 'urgent') params.priority = 'URGENT';
    if (tab === 'critical') params.priority = 'CRITICAL';
    if (tab === 'expired') params.status = 'EXPIRED';
    if (priorityFilter) params.priority = priorityFilter;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [tab, priorityFilter, statusFilter]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list(listParams),
    queryFn: () => listNotifications(listParams),
    refetchInterval: 60_000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount,
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.statistics,
    queryFn: fetchNotificationStatistics,
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.all });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const ackMutation = useMutation({
    mutationFn: acknowledgeNotification,
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const rows = (data?.data ?? []).filter((row) => matchesTab(row, tab));

  const openRow = (row: NotificationRecord) => {
    if (row.status === 'UNREAD' || row.isRead === false) {
      markReadMutation.mutate(row.id);
    }
    const safe = getSafeInternalPath(row.actionUrl);
    if (safe) navigate(safe);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الإشعارات.'}</Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 2, gap: 2 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            مركز الإشعارات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات غير مقروءة'}
            {stats?.requiresAcknowledgement
              ? ` · ${stats.requiresAcknowledgement} تحتاج تأكيدًا`
              : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {canPrefs ? (
            <Button
              component={RouterLink}
              to="/notifications/preferences"
              variant="outlined"
              startIcon={<SettingsIcon />}
            >
              التفضيلات
            </Button>
          ) : null}
          {canRules ? (
            <Button component={RouterLink} to="/notifications/rules" variant="outlined">
              القواعد
            </Button>
          ) : null}
          {canUpdate && unreadCount > 0 ? (
            <Button
              variant="contained"
              startIcon={<DoneAllIcon />}
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              تحديد الكل كمقروء
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      <Tabs
        value={tab}
        onChange={(_, v: InboxTab) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {TAB_DEFS.map((t) => (
          <Tab key={t.id} value={t.id} label={t.label} />
        ))}
      </Tabs>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الأولوية</InputLabel>
          <Select
            label="الأولوية"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as NotificationPriority | '')}
          >
            <MenuItem value="">الكل</MenuItem>
            {(Object.keys(PRIORITY_LABELS) as NotificationPriority[]).map((p) => (
              <MenuItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | '')}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(NOTIFICATION_STATUS_LABELS).map(([code, label]) => (
              <MenuItem key={code} value={code}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell align="left">إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد إشعارات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const unread = row.status === 'UNREAD' || row.isRead === false;
                const needsAck =
                  Boolean(row.requiresAcknowledgement) &&
                  !row.acknowledgedAt &&
                  row.status !== 'ACKNOWLEDGED';
                return (
                  <TableRow
                    key={row.id}
                    hover
                    sx={unread ? { bgcolor: 'action.hover' } : undefined}
                    onClick={() => openRow(row)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontWeight: unread ? 700 : 400 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'inherit' }}>
                        {row.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.shortBody || row.body}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.kind ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            NOTIFICATION_KIND_LABELS[row.kind as NotificationKind] ?? row.kind
                          }
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={PRIORITY_LABELS[row.priority] ?? row.priority}
                        size="small"
                        color={PRIORITY_COLORS[row.priority] ?? 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={NOTIFICATION_STATUS_LABELS[row.status] ?? row.status}
                        size="small"
                        color={unread ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell align="left" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        {unread && canUpdate ? (
                          <Tooltip title="تحديد كمقروء">
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={markReadMutation.isPending}
                              onClick={() => markReadMutation.mutate(row.id)}
                            >
                              <MarkEmailReadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        {needsAck && canAck ? (
                          <Tooltip title="تأكيد الاستلام">
                            <IconButton
                              size="small"
                              color="error"
                              disabled={ackMutation.isPending}
                              onClick={() => ackMutation.mutate(row.id)}
                            >
                              <VerifiedUserIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
