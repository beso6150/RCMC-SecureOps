import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NOTIFICATIONS_QUERY_KEYS,
  fetchNotificationStatistics,
  fetchUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type { NotificationRecord } from '../../types/notifications';
import { PRIORITY_COLORS, PRIORITY_LABELS, formatDateTime } from '../../utils/sprint19Labels';
import { getSafeInternalPath } from '../../utils/safeActionUrl';

function badgeLabel(count: number): string {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const canRead = hasPermission(user?.permissions ?? [], [PermissionCodes.NOTIFICATIONS_READ]);
  const canUpdate = hasPermission(user?.permissions ?? [], [PermissionCodes.NOTIFICATIONS_UPDATE]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount,
    queryFn: fetchUnreadNotificationCount,
    enabled: canRead,
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.statistics,
    queryFn: fetchNotificationStatistics,
    enabled: canRead && Boolean(anchorEl),
    refetchInterval: 60_000,
  });

  const { data: recent } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list({ pageSize: 8 }),
    queryFn: () => listNotifications({ pageSize: 8 }),
    enabled: canRead && Boolean(anchorEl),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.all });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  if (!canRead) return null;

  const ackRequired = stats?.requiresAcknowledgement ?? 0;
  const rows = recent?.data ?? [];

  const openNotification = (row: NotificationRecord) => {
    if (row.status === 'UNREAD' || row.isRead === false) {
      markReadMutation.mutate(row.id);
    }
    const safe = getSafeInternalPath(row.actionUrl);
    setAnchorEl(null);
    if (safe) {
      navigate(safe);
      return;
    }
    navigate('/notifications');
  };

  return (
    <>
      <Tooltip title="الإشعارات">
        <IconButton
          aria-label="الإشعارات"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          color={ackRequired > 0 ? 'error' : 'default'}
        >
          <Badge badgeContent={badgeLabel(unreadCount)} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '92vw' } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              الإشعارات
            </Typography>
            {ackRequired > 0 ? (
              <Chip size="small" color="error" label={`تحتاج تأكيدًا: ${ackRequired}`} />
            ) : null}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {unreadCount > 0 ? `${unreadCount} غير مقروء` : 'لا توجد غير مقروءة'}
          </Typography>
        </Box>
        <Divider />
        <List dense sx={{ maxHeight: 360, overflow: 'auto', py: 0 }}>
          {rows.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                لا توجد إشعارات حديثة
              </Typography>
            </Box>
          ) : (
            rows.map((row) => {
              const unread = row.status === 'UNREAD' || row.isRead === false;
              return (
                <ListItemButton key={row.id} onClick={() => openNotification(row)} alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: unread ? 700 : 500, flex: 1 }}
                          noWrap
                        >
                          {row.title}
                        </Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={PRIORITY_COLORS[row.priority] ?? 'default'}
                          label={PRIORITY_LABELS[row.priority] ?? row.priority}
                        />
                      </Stack>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" color="text.secondary" component="span" noWrap>
                          {row.shortBody || row.body}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.disabled" component="span">
                          {formatDateTime(row.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 1.5, justifyContent: 'space-between' }}>
          {canUpdate ? (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              disabled={unreadCount === 0 || markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              تحديد الكل مقروء
            </Button>
          ) : (
            <span />
          )}
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setAnchorEl(null);
              navigate('/notifications');
            }}
          >
            عرض الكل
          </Button>
        </Stack>
      </Menu>
    </>
  );
}
