import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  NOTIFICATIONS_QUERY_KEYS,
  listNotificationPreferences,
  upsertNotificationPreference,
} from '../../api/notifications';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type {
  NotificationCategory,
  NotificationPreference,
  NotificationPriority,
} from '../../types/notifications';
import {
  NOTIFICATION_CATEGORY_LABELS,
  PRIORITY_LABELS,
} from '../../utils/sprint19Labels';

const ALL_CATEGORIES = Object.keys(NOTIFICATION_CATEGORY_LABELS) as NotificationCategory[];

interface PrefDraft {
  category: NotificationCategory;
  inAppEnabled: boolean;
  socketEnabled: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursFrom: string;
  quietHoursTo: string;
  minimumPriority: NotificationPriority;
}

function toDraft(category: NotificationCategory, pref?: NotificationPreference): PrefDraft {
  return {
    category,
    inAppEnabled: pref?.inAppEnabled ?? true,
    socketEnabled: pref?.socketEnabled ?? true,
    soundEnabled: pref?.soundEnabled ?? false,
    quietHoursEnabled: pref?.quietHoursEnabled ?? false,
    quietHoursFrom: pref?.quietHoursFrom ?? '22:00',
    quietHoursTo: pref?.quietHoursTo ?? '06:00',
    minimumPriority: pref?.minimumPriority ?? 'LOW',
  };
}

export function NotificationPreferencesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canRead = hasPermission(user?.permissions ?? [], [
    PermissionCodes.NOTIFICATIONS_PREFERENCES_READ,
    PermissionCodes.NOTIFICATIONS_READ,
  ]);
  const canUpdate = hasPermission(user?.permissions ?? [], [
    PermissionCodes.NOTIFICATIONS_PREFERENCES_UPDATE,
    PermissionCodes.NOTIFICATIONS_UPDATE,
  ]);
  const [selected, setSelected] = useState<NotificationCategory>('INCIDENT');
  const [draft, setDraft] = useState<PrefDraft>(toDraft('INCIDENT'));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.preferences,
    queryFn: listNotificationPreferences,
    enabled: canRead,
  });

  const byCategory = useMemo(() => {
    const map = new Map<NotificationCategory, NotificationPreference>();
    for (const row of data ?? []) map.set(row.category, row);
    return map;
  }, [data]);

  useEffect(() => {
    setDraft(toDraft(selected, byCategory.get(selected)));
  }, [selected, byCategory]);

  const saveMutation = useMutation({
    mutationFn: upsertNotificationPreference,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.preferences });
      setMessage('تم حفظ التفضيلات');
      setError(null);
    },
    onError: (e: Error) => {
      setError(e.message);
      setMessage(null);
    },
  });

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض تفضيلات الإشعارات.</Alert>;
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
        {(loadError as Error)?.message ?? 'تعذّر تحميل التفضيلات.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        تفضيلات الإشعارات
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        تحكم بالقنوات والحد الأدنى للأولوية وساعات الهدوء لكل فئة. الإشعارات العاجلة والحرجة لا تُكتم.
      </Typography>

      {message ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>الفئة</InputLabel>
              <Select
                label="الفئة"
                value={selected}
                onChange={(e) => setSelected(e.target.value as NotificationCategory)}
              >
                {ALL_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {NOTIFICATION_CATEGORY_LABELS[c]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={draft.inAppEnabled}
                  disabled={!canUpdate}
                  onChange={(e) => setDraft((d) => ({ ...d, inAppEnabled: e.target.checked }))}
                />
              }
              label="إشعارات داخل التطبيق"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.socketEnabled}
                  disabled={!canUpdate}
                  onChange={(e) => setDraft((d) => ({ ...d, socketEnabled: e.target.checked }))}
                />
              }
              label="تحديث فوري عبر المقبس"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.soundEnabled}
                  disabled={!canUpdate}
                  onChange={(e) => setDraft((d) => ({ ...d, soundEnabled: e.target.checked }))}
                />
              }
              label="الصوت"
            />

            <FormControl size="small" sx={{ maxWidth: 280 }}>
              <InputLabel>الحد الأدنى للأولوية</InputLabel>
              <Select
                label="الحد الأدنى للأولوية"
                value={draft.minimumPriority}
                disabled={!canUpdate}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    minimumPriority: e.target.value as NotificationPriority,
                  }))
                }
              >
                {(Object.keys(PRIORITY_LABELS) as NotificationPriority[]).map((p) => (
                  <MenuItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={draft.quietHoursEnabled}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, quietHoursEnabled: e.target.checked }))
                  }
                />
              }
              label="ساعات الهدوء"
            />
            {draft.quietHoursEnabled ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  size="small"
                  label="من"
                  type="time"
                  value={draft.quietHoursFrom}
                  disabled={!canUpdate}
                  onChange={(e) => setDraft((d) => ({ ...d, quietHoursFrom: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  size="small"
                  label="إلى"
                  type="time"
                  value={draft.quietHoursTo}
                  disabled={!canUpdate}
                  onChange={(e) => setDraft((d) => ({ ...d, quietHoursTo: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            ) : null}

            {canUpdate ? (
              <Box>
                <Button
                  variant="contained"
                  disabled={saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      category: draft.category,
                      inAppEnabled: draft.inAppEnabled,
                      socketEnabled: draft.socketEnabled,
                      soundEnabled: draft.soundEnabled,
                      quietHoursEnabled: draft.quietHoursEnabled,
                      quietHoursFrom: draft.quietHoursEnabled ? draft.quietHoursFrom : null,
                      quietHoursTo: draft.quietHoursEnabled ? draft.quietHoursTo : null,
                      minimumPriority: draft.minimumPriority,
                    })
                  }
                >
                  حفظ التفضيلات
                </Button>
              </Box>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
