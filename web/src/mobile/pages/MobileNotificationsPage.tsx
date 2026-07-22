import { Alert, Box, Button } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NOTIFICATIONS_QUERY_KEYS,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications';
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from '../../utils/sprint19Labels';
import { MobileEmptyState } from '../components/MobileEmptyState';
import { MobileListCard } from '../components/MobileListCard';
import { MobileLoadingState } from '../components/MobileLoadingState';
import { MobilePageHeader } from '../components/MobilePageHeader';
import { useMobileDateFormat } from '../hooks/useMobileDateFormat';

export function MobileNotificationsPage() {
  const { formatRelative } = useMobileDateFormat();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list({ pageSize: 40 }),
    queryFn: () => listNotifications({ pageSize: 40 }),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.all });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.all });
    },
  });

  if (isLoading) return <MobileLoadingState label="جاري تحميل التنبيهات…" />;

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل الإشعارات.'}
      </Alert>
    );
  }

  const rows = data?.data ?? [];
  const unreadCount = rows.filter((n) => n.status === 'UNREAD' || n.status === 'DELIVERED' || n.status === 'SENT').length;

  return (
    <Box>
      <MobilePageHeader
        title="التنبيهات"
        subtitle={unreadCount > 0 ? `${unreadCount} غير مقروء` : 'جميع التنبيهات مقروءة'}
        action={
          unreadCount > 0 ? (
            <Button
              className="mobile-btn"
              size="small"
              variant="outlined"
              sx={{ minHeight: 40 }}
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              قراءة الكل
            </Button>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <MobileEmptyState title="لا توجد تنبيهات" description="صندوق الإشعارات فارغ حالياً." />
      ) : (
        rows.map((row) => (
          <MobileListCard
            key={row.id}
            title={row.title}
            subtitle={
              row.body ||
              (row.category ? NOTIFICATION_CATEGORY_LABELS[row.category] : undefined) ||
              'إشعار'
            }
            meta={`${PRIORITY_LABELS[row.priority] ?? row.priority} · ${formatRelative(row.createdAt)}`}
            statusLabel={NOTIFICATION_STATUS_LABELS[row.status] ?? row.status}
            statusColor={PRIORITY_COLORS[row.priority] ?? 'default'}
            onClick={
              row.status === 'UNREAD' || row.status === 'DELIVERED' || row.status === 'SENT'
                ? () => markReadMutation.mutate(row.id)
                : undefined
            }
          />
        ))
      )}
    </Box>
  );
}
