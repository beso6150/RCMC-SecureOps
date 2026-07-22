import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  COMMUNICATIONS_QUERY_KEYS,
  closeConversation,
  countUnreadConversations,
  createConversation,
  getConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from '../../api/communications';
import { listUsers } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import { joinConversationRoom, leaveConversationRoom } from '../../hooks/useSocket';
import type { ConversationType, InternalConversation } from '../../types/communications';
import type { UserRecord } from '../../types/director';
import {
  CONVERSATION_TYPE_LABELS,
  formatDateTime,
} from '../../utils/sprint19Labels';

function conversationTitle(c: InternalConversation, myId: string): string {
  if (c.title?.trim()) return c.title;
  const others = c.participants
    .filter((p) => p.userId !== myId && !p.leftAt)
    .map((p) => p.user?.fullName ?? p.userId);
  return others.length ? others.join('، ') : c.conversationNumber;
}

function isUnread(c: InternalConversation, myId: string): boolean {
  if (!c.lastMessageAt) return false;
  const me = c.participants.find((p) => p.userId === myId && !p.leftAt);
  if (!me) return false;
  if (!me.lastReadAt) return true;
  return new Date(c.lastMessageAt).getTime() > new Date(me.lastReadAt).getTime();
}

export function CommunicationsPage() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const perms = user?.permissions ?? [];
  const myId = user?.id ?? '';
  const canRead = hasPermission(perms, [PermissionCodes.COMMUNICATIONS_READ]);
  const canCreate = hasPermission(perms, [PermissionCodes.COMMUNICATIONS_CREATE]);
  const canSend = hasPermission(perms, [
    PermissionCodes.COMMUNICATIONS_SEND,
    PermissionCodes.COMMUNICATIONS_CREATE,
  ]);
  const canClose = hasPermission(perms, [
    PermissionCodes.COMMUNICATIONS_UPDATE,
    PermissionCodes.COMMUNICATIONS_MANAGE,
  ]);

  const [composeOpen, setComposeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ConversationType>('DIRECT');
  const [participants, setParticipants] = useState<UserRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: convData, isLoading, isError, error: loadError } = useQuery({
    queryKey: COMMUNICATIONS_QUERY_KEYS.conversations({ pageSize: 50 }),
    queryFn: () => listConversations({ pageSize: 50 }),
    enabled: canRead,
    refetchInterval: 30_000,
  });

  const { data: activeConv } = useQuery({
    queryKey: COMMUNICATIONS_QUERY_KEYS.conversation(id ?? ''),
    queryFn: () => getConversation(id!),
    enabled: canRead && Boolean(id),
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: COMMUNICATIONS_QUERY_KEYS.messages(id ?? '', { pageSize: 100 }),
    queryFn: () => listMessages(id!, { pageSize: 100 }),
    enabled: canRead && Boolean(id),
    refetchInterval: 15_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', { pageSize: 50, forComm: true }],
    queryFn: () => listUsers({ pageSize: 50 }),
    enabled: composeOpen && canCreate,
  });

  useEffect(() => {
    if (!id) return;
    joinConversationRoom(id);
    void markConversationRead(id).then(() => {
      void queryClient.invalidateQueries({ queryKey: COMMUNICATIONS_QUERY_KEYS.all });
    });
    return () => leaveConversationRoom(id);
  }, [id, queryClient]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: COMMUNICATIONS_QUERY_KEYS.all });
  };

  const createMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (c) => {
      invalidate();
      setComposeOpen(false);
      setNewTitle('');
      setParticipants([]);
      navigate(`/communications/${c.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(id!, { content }),
    onSuccess: () => {
      setDraft('');
      invalidate();
      void queryClient.invalidateQueries({
        queryKey: COMMUNICATIONS_QUERY_KEYS.messages(id ?? ''),
      });
    },
    onError: (e: Error) => setError(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeConversation(id!),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const conversations = useMemo(() => convData?.data ?? [], [convData?.data]);
  const unreadEstimate = useMemo(
    () => countUnreadConversations(conversations, myId),
    [conversations, myId],
  );
  const messages = messagesData?.data ?? [];

  if (!canRead) {
    return <Alert severity="warning">ليست لديك صلاحية عرض الاتصالات الداخلية.</Alert>;
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
        {(loadError as Error)?.message ?? 'تعذّر تحميل المحادثات.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2, gap: 2 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            الاتصالات الداخلية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadEstimate > 0
              ? `${unreadEstimate} محادثة بها رسائل جديدة`
              : 'لا توجد رسائل جديدة'}
          </Typography>
        </Box>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setComposeOpen(true)}>
            محادثة جديدة
          </Button>
        ) : null}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr 240px' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          minHeight: 520,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ borderLeft: { md: 1 }, borderColor: 'divider', overflow: 'auto' }}>
          <List dense disablePadding>
            {conversations.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary" variant="body2">
                  لا توجد محادثات
                </Typography>
              </Box>
            ) : (
              conversations.map((c) => {
                const unread = isUnread(c, myId);
                return (
                  <ListItemButton
                    key={c.id}
                    selected={c.id === id}
                    onClick={() => navigate(`/communications/${c.id}`)}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: unread ? 700 : 500 }}
                          noWrap
                        >
                          {conversationTitle(c, myId)}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={CONVERSATION_TYPE_LABELS[c.conversationType]}
                            variant="outlined"
                          />
                          {c.isClosed ? <Chip size="small" label="مغلقة" /> : null}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
              })
            )}
          </List>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          {!id ? (
            <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, p: 3 }}>
              <Typography color="text.secondary">اختر محادثة أو أنشئ واحدة جديدة</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {activeConv
                    ? conversationTitle(activeConv, myId)
                    : 'المحادثة التشغيلية'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activeConv?.conversationNumber ?? ''}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {messagesLoading ? (
                  <CircularProgress size={28} />
                ) : messages.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    لا توجد رسائل بعد
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {messages.map((m) => {
                      const mine = m.senderId === myId;
                      return (
                        <Box
                          key={m.id}
                          sx={{
                            alignSelf: mine ? 'flex-start' : 'flex-end',
                            maxWidth: '80%',
                            bgcolor: mine ? 'primary.main' : 'action.hover',
                            color: mine ? 'primary.contrastText' : 'text.primary',
                            px: 1.5,
                            py: 1,
                            borderRadius: 2,
                          }}
                        >
                          {!mine ? (
                            <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>
                              {m.sender?.fullName ?? 'مستخدم'}
                            </Typography>
                          ) : null}
                          <Typography variant="body2">
                            {m.isDeleted ? 'تم حذف الرسالة' : m.content || '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.75 }}>
                            {formatDateTime(m.createdAt)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
              {canSend && !activeConv?.isClosed ? (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="اكتب رسالة..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && draft.trim()) {
                        e.preventDefault();
                        sendMutation.mutate(draft.trim());
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    disabled={!draft.trim() || sendMutation.isPending}
                    onClick={() => sendMutation.mutate(draft.trim())}
                  >
                    إرسال
                  </Button>
                </Stack>
              ) : null}
            </>
          )}
        </Box>

        <Box sx={{ borderRight: { md: 1 }, borderColor: 'divider', p: 2, display: { xs: id ? 'block' : 'none', md: 'block' } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            معلومات المحادثة
          </Typography>
          {!activeConv ? (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="body2">
                النوع: {CONVERSATION_TYPE_LABELS[activeConv.conversationType]}
              </Typography>
              <Typography variant="body2">
                الحالة: {activeConv.isClosed ? 'مغلقة' : 'مفتوحة'}
              </Typography>
              <Typography variant="body2">
                آخر رسالة: {formatDateTime(activeConv.lastMessageAt)}
              </Typography>
              <Divider />
              <Typography variant="caption" color="text.secondary">
                المشاركون
              </Typography>
              {activeConv.participants
                .filter((p) => !p.leftAt)
                .map((p) => (
                  <Typography key={p.id} variant="body2">
                    {p.user?.fullName ?? p.userId}
                  </Typography>
                ))}
              {canClose && !activeConv.isClosed ? (
                <Button
                  color="warning"
                  variant="outlined"
                  size="small"
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate()}
                >
                  إغلاق المحادثة
                </Button>
              ) : null}
            </Stack>
          )}
        </Box>
      </Box>

      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>محادثة جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="العنوان (اختياري)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                label="النوع"
                value={newType}
                onChange={(e) => setNewType(e.target.value as ConversationType)}
              >
                {(Object.keys(CONVERSATION_TYPE_LABELS) as ConversationType[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {CONVERSATION_TYPE_LABELS[t]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              options={(usersData?.data ?? []).filter((u) => u.id !== myId)}
              getOptionLabel={(u) => `${u.fullName} (${u.employeeNumber})`}
              value={participants}
              onChange={(_, v) => setParticipants(v)}
              renderInput={(params) => <TextField {...params} label="المشاركون" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={participants.length === 0 || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                title: newTitle.trim() || null,
                conversationType: newType,
                participantUserIds: participants.map((p) => p.id),
              })
            }
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
