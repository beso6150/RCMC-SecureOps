import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CCTV_QUERY_KEYS,
  cancelCameraRequest,
  completeCameraRequest,
  createCameraRequest,
  listCameraRequests,
  searchPermits,
  startCameraRequest,
} from '../../api/cctv';
import { ElapsedTimer } from '../../components/cctv/ElapsedTimer';
import { QueueStatusChip } from '../../components/cctv/QueueStatusChip';
import {
  CAMERA_REQUEST_STATUS_LABELS,
  formatResponseMs,
} from '../../components/cctv/cctvLabels';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';
import type { CameraRequest, CameraRequestStatus, CompleteCameraRequestPayload } from '../../types/cctv';

const REFETCH_MS = 60_000;

const STATUS_TABS: Array<{ label: string; value?: CameraRequestStatus }> = [
  { label: 'الكل', value: undefined },
  { label: 'معلّقة', value: 'PENDING' },
  { label: 'قيد التنفيذ', value: 'IN_PROGRESS' },
  { label: 'مكتملة', value: 'COMPLETED' },
];

export function CctvInquiriesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<CameraRequestStatus | undefined>(undefined);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState<CameraRequest | null>(null);
  const [createPlate, setCreatePlate] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [completeForm, setCompleteForm] = useState<CompleteCameraRequestPayload>({});

  const canCreate = hasPermission(user?.permissions ?? [], [PermissionCodes.CAMERA_REQUESTS_CREATE]);
  const canHandle = hasPermission(user?.permissions ?? [], [PermissionCodes.CAMERA_REQUESTS_HANDLE]);

  const listParams = { pageSize: 50, ...(statusFilter ? { status: statusFilter } : {}) };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: CCTV_QUERY_KEYS.requests(listParams),
    queryFn: () => listCameraRequests(listParams),
    refetchInterval: REFETCH_MS,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['camera-requests'] });
    void queryClient.invalidateQueries({ queryKey: ['cctv'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createCameraRequest({ plateNumber: createPlate, notes: createNotes || null }),
    onSuccess: () => {
      setCreateOpen(false);
      setCreatePlate('');
      setCreateNotes('');
      invalidate();
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const startMutation = useMutation({
    mutationFn: startCameraRequest,
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompleteCameraRequestPayload }) =>
      completeCameraRequest(id, payload),
    onSuccess: () => {
      setCompleteOpen(null);
      setCompleteForm({});
      invalidate();
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelCameraRequest,
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const searchMutation = useMutation({
    mutationFn: searchPermits,
    onSuccess: (permits) => {
      if (permits.length === 0) {
        setActionError('لم يُعثر على تصاريح لهذه اللوحة');
        return;
      }
      const p = permits[0];
      setCompleteForm((prev) => ({
        ...prev,
        employeeName: p.employeeName ?? p.ownerName,
        phone: p.employeePhone ?? p.ownerPhone,
        permitStatus: p.status,
        vehicleType: p.vehicleType,
        ownerName: p.ownerName,
        permitId: p.id,
      }));
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const rows = data?.data ?? [];

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل طلبات الاستعلام.'}</Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          طلبات الاستعلام ({rows.length})
        </Typography>
        {canCreate ? (
          <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setCreateOpen(true)}>
            طلب جديد
          </Button>
        ) : null}
      </Box>

      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      <Tabs
        value={statusFilter ?? 'ALL'}
        onChange={(_, v) => setStatusFilter(v === 'ALL' ? undefined : v)}
        sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
      >
        {STATUS_TABS.map((tab) => (
          <Tab key={tab.label} label={tab.label} value={tab.value ?? 'ALL'} />
        ))}
      </Tabs>

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>اللوحة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>طالب الطلب</TableCell>
              <TableCell>المشغّل</TableCell>
              <TableCell>الموظف / القسم</TableCell>
              <TableCell>الهاتف</TableCell>
              <TableCell>حالة التصريح</TableCell>
              <TableCell>المركبة</TableCell>
              <TableCell>زمن الاستجابة</TableCell>
              <TableCell>المدة</TableCell>
              <TableCell align="left">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد طلبات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.plateNumber}</TableCell>
                  <TableCell>
                    <QueueStatusChip
                      label={CAMERA_REQUEST_STATUS_LABELS[row.status] ?? row.status}
                      status={row.status}
                    />
                  </TableCell>
                  <TableCell>{row.requestedBy.fullName}</TableCell>
                  <TableCell>{row.assignedOperator?.fullName ?? '—'}</TableCell>
                  <TableCell>
                    {row.employeeName ?? '—'}
                    {row.departmentName ? ` / ${row.departmentName}` : ''}
                  </TableCell>
                  <TableCell>{row.phone ?? '—'}</TableCell>
                  <TableCell>{row.permitStatus ?? row.permit?.status ?? '—'}</TableCell>
                  <TableCell>{row.vehicleType ?? row.permit?.vehicleType ?? '—'}</TableCell>
                  <TableCell>{formatResponseMs(row.responseTimeMs)}</TableCell>
                  <TableCell>
                    <ElapsedTimer since={row.createdAt} />
                  </TableCell>
                  <TableCell align="left">
                    <Stack direction="row" spacing={0.5}>
                      {canHandle && row.status === 'PENDING' ? (
                        <Tooltip title="بدء المعالجة">
                          <IconButton
                            size="small"
                            color="secondary"
                            disabled={startMutation.isPending}
                            onClick={() => startMutation.mutate(row.id)}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {canHandle && row.status === 'IN_PROGRESS' ? (
                        <Tooltip title="إكمال">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setCompleteOpen(row);
                              setCompleteForm({
                                employeeName: row.employeeName,
                                departmentName: row.departmentName,
                                phone: row.phone,
                                permitStatus: row.permitStatus,
                                vehicleType: row.vehicleType,
                                ownerName: row.ownerName,
                              });
                            }}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {(canCreate || canHandle) &&
                      (row.status === 'PENDING' || row.status === 'IN_PROGRESS') ? (
                        <Tooltip title="إلغاء">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(row.id)}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>طلب استعلام كاميرا</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="رقم اللوحة"
              value={createPlate}
              onChange={(e) => setCreatePlate(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="ملاحظات"
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={createPlate.length < 2 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(completeOpen)}
        onClose={() => setCompleteOpen(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إكمال طلب — {completeOpen?.plateNumber}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Button
              startIcon={<SearchIcon />}
              variant="outlined"
              size="small"
              disabled={searchMutation.isPending || !completeOpen}
              onClick={() => completeOpen && searchMutation.mutate(completeOpen.plateNumber)}
              sx={{ alignSelf: 'flex-start' }}
            >
              بحث التصاريح
            </Button>
            <TextField
              label="اسم الموظف"
              value={completeForm.employeeName ?? ''}
              onChange={(e) => setCompleteForm((f) => ({ ...f, employeeName: e.target.value }))}
              fullWidth
            />
            <TextField
              label="القسم"
              value={completeForm.departmentName ?? ''}
              onChange={(e) => setCompleteForm((f) => ({ ...f, departmentName: e.target.value }))}
              fullWidth
            />
            <TextField
              label="الهاتف"
              value={completeForm.phone ?? ''}
              onChange={(e) => setCompleteForm((f) => ({ ...f, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="حالة التصريح"
              value={completeForm.permitStatus ?? ''}
              onChange={(e) => setCompleteForm((f) => ({ ...f, permitStatus: e.target.value }))}
              fullWidth
            />
            <TextField
              label="نوع المركبة"
              value={completeForm.vehicleType ?? ''}
              onChange={(e) => setCompleteForm((f) => ({ ...f, vehicleType: e.target.value }))}
              fullWidth
            />
            <TextField
              label="ملاحظات الاستجابة"
              value={completeForm.responseNotes ?? ''}
              onChange={(e) => setCompleteForm((f) => ({ ...f, responseNotes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(null)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={completeMutation.isPending || !completeOpen}
            onClick={() =>
              completeOpen &&
              completeMutation.mutate({ id: completeOpen.id, payload: completeForm })
            }
          >
            إكمال
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
