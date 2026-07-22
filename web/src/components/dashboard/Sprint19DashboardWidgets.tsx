import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  COMMUNICATIONS_QUERY_KEYS,
  countUnreadConversations,
  listConversations,
} from '../../api/communications';
import {
  NOTIFICATIONS_QUERY_KEYS,
  fetchNotificationStatistics,
  listNotifications,
} from '../../api/notifications';
import { TASKS_QUERY_KEYS, listMyTasks, listOverdueTasks } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { PermissionCodes, RoleCodes, hasPermission } from '../../auth/rbac';

function WidgetCard({
  title,
  value,
  to,
  hint,
}: {
  title: string;
  value: number | string;
  to: string;
  hint?: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5 }}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {hint}
          </Typography>
        ) : null}
        <Button component={RouterLink} to={to} size="small">
          فتح
        </Button>
      </CardContent>
    </Card>
  );
}

export function Sprint19DashboardWidgets() {
  const { user } = useAuth();
  const role = user?.roleCode ?? '';
  const perms = user?.permissions ?? [];
  const myId = user?.id ?? '';

  const canNotifications = hasPermission(perms, [PermissionCodes.NOTIFICATIONS_READ]);
  const canTasks = hasPermission(perms, [PermissionCodes.TASKS_READ]);
  const canComms = hasPermission(perms, [PermissionCodes.COMMUNICATIONS_READ]);

  const { data: notifStats } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.statistics,
    queryFn: fetchNotificationStatistics,
    enabled: canNotifications,
    refetchInterval: 60_000,
  });

  const { data: criticalNotifs } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list({ priority: 'CRITICAL', pageSize: 20 }),
    queryFn: () => listNotifications({ priority: 'CRITICAL', pageSize: 20 }),
    enabled: canNotifications && role === RoleCodes.SECURITY_DIRECTOR,
  });

  const { data: shiftNotifs } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list({ category: 'SHIFT', pageSize: 20, isRead: false }),
    queryFn: () => listNotifications({ category: 'SHIFT', pageSize: 20, isRead: false }),
    enabled: canNotifications && role === RoleCodes.SECURITY_SUPERVISOR,
  });

  const { data: myTasks } = useQuery({
    queryKey: TASKS_QUERY_KEYS.my({ pageSize: 50 }),
    queryFn: () => listMyTasks({ pageSize: 50 }),
    enabled: canTasks,
  });

  const { data: overdue } = useQuery({
    queryKey: TASKS_QUERY_KEYS.overdue({ pageSize: 50 }),
    queryFn: () => listOverdueTasks({ pageSize: 50 }),
    enabled: canTasks,
  });

  const { data: conversations } = useQuery({
    queryKey: COMMUNICATIONS_QUERY_KEYS.conversations({ pageSize: 50 }),
    queryFn: () => listConversations({ pageSize: 50 }),
    enabled: canComms,
  });

  if (!canNotifications && !canTasks && !canComms) return null;

  const unread = notifStats?.unread ?? 0;
  const ackRequired = notifStats?.requiresAcknowledgement ?? 0;
  const myOpenTasks =
    myTasks?.data.filter((t) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(t.status))
      .length ?? 0;
  const overdueCount = overdue?.meta.total ?? overdue?.data.length ?? 0;
  const activeComms = countUnreadConversations(conversations?.data ?? [], myId);
  const criticalUnacked =
    criticalNotifs?.data.filter(
      (n) => n.requiresAcknowledgement && !n.acknowledgedAt && n.status !== 'ACKNOWLEDGED',
    ).length ?? 0;
  const criticalSystem =
    criticalNotifs?.data.filter((n) => n.category === 'SYSTEM' || n.category === 'SECURITY')
      .length ?? 0;
  const monitoringTasks =
    myTasks?.data.filter((t) => t.taskType === 'CCTV_FOLLOW_UP' || t.taskType === 'SECURITY_RESPONSE')
      .length ?? 0;

  const isGuard = role === RoleCodes.SECURITY_GUARD;
  const isSupervisor = role === RoleCodes.SECURITY_SUPERVISOR;
  const isCctv = role === RoleCodes.CCTV_OPERATOR;
  const isOps = role === RoleCodes.OPERATIONS_MANAGER || role === RoleCodes.PROJECT_MANAGER;
  const isDirector = role === RoleCodes.SECURITY_DIRECTOR;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        {isCctv ? 'ملخص التشغيل للمشغلة' : 'ملخص الإشعارات والمهام والاتصالات'}
      </Typography>

      {isDirector ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          عرض موجز أمني حرج فقط — بدون فيض الإشعارات العادية.
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        {isGuard ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="مهام جديدة/نشطة" value={myOpenTasks} to="/tasks/my" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="إشعارات تحتاج تأكيدًا"
                value={ackRequired}
                to="/notifications"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="إشعارات غير مقروءة" value={unread} to="/notifications" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="إحالات/حوادث" value="—" to="/cctv-operations/referrals" hint="من مركز العمليات" />
            </Grid>
          </>
        ) : null}

        {isSupervisor ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="غير مُؤكَّدة" value={ackRequired} to="/notifications" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="مهام متأخرة" value={overdueCount} to="/tasks/overdue" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="إشعارات الوردية"
                value={shiftNotifs?.data.length ?? 0}
                to="/notifications"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="اتصالات نشطة" value={activeComms} to="/communications" />
            </Grid>
          </>
        ) : null}

        {isCctv ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="إحالات معلّقة"
                value="—"
                to="/cctv-operations/referrals"
                hint="متابعة الإحالات"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="طلبات معلومات"
                value={unread}
                to="/notifications"
                hint="إشعارات المشغلة"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="مهام المراقبة"
                value={monitoringTasks}
                to="/tasks/my"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="رسائل العمليات"
                value={activeComms}
                to="/communications"
              />
            </Grid>
          </>
        ) : null}

        {isOps ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="حوادث حرجة"
                value={notifStats?.byPriority.find((p) => p.priority === 'CRITICAL')?.count ?? 0}
                to="/incidents/critical"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="مهام متأخرة" value={overdueCount} to="/tasks/overdue" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard
                title="حرج غير مُؤكَّد"
                value={ackRequired}
                to="/notifications"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <WidgetCard title="اتصالات" value={activeComms} to="/communications" />
            </Grid>
          </>
        ) : null}

        {isDirector ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <WidgetCard
                title="إشعارات حرجة / أمنية"
                value={criticalSystem || (criticalNotifs?.data.length ?? 0)}
                to="/notifications"
                hint="ملخص أمني فقط"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <WidgetCard
                title="حرج يحتاج تأكيدًا"
                value={criticalUnacked}
                to="/notifications"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <WidgetCard title="مهام متأخرة" value={overdueCount} to="/tasks/overdue" />
            </Grid>
          </>
        ) : null}

        {!isGuard && !isSupervisor && !isCctv && !isOps && !isDirector ? (
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1}>
              {canNotifications ? (
                <Button component={RouterLink} to="/notifications" variant="outlined">
                  الإشعارات ({unread})
                </Button>
              ) : null}
              {canTasks ? (
                <Button component={RouterLink} to="/tasks/my" variant="outlined">
                  مهامي ({myOpenTasks})
                </Button>
              ) : null}
              {canComms ? (
                <Button component={RouterLink} to="/communications" variant="outlined">
                  الاتصالات ({activeComms})
                </Button>
              ) : null}
            </Stack>
          </Grid>
        ) : null}
      </Grid>
    </Box>
  );
}
