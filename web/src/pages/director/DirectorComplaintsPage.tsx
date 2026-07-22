import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  COMPLAINTS_QUERY_KEYS,
  createComplaint,
  downloadComplaintPdf,
  fetchComplaintStatistics,
  listComplaints,
  reviewComplaint,
  updateComplaint,
} from '../../api/complaints';
import type { Complaint, ComplaintStatus } from '../../types/director';
import {
  COMPLAINT_STATUS_COLORS,
  COMPLAINT_STATUS_LABELS,
  formatDate,
  triggerBlobDownload,
} from './directorLabels';

export function DirectorComplaintsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Complaint | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [reviewForm, setReviewForm] = useState<{ status: ComplaintStatus; reviewNotes: string }>({
    status: 'UNDER_REVIEW',
    reviewNotes: '',
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const listParams = {
    page: page + 1,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: COMPLAINTS_QUERY_KEYS.list(listParams),
    queryFn: () => listComplaints(listParams),
  });

  const { data: stats } = useQuery({
    queryKey: COMPLAINTS_QUERY_KEYS.statistics(),
    queryFn: () => fetchComplaintStatistics(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['complaints'] });
    void queryClient.invalidateQueries({ queryKey: ['director'] });
  };

  const createMutation = useMutation({
    mutationFn: createComplaint,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setForm({ title: '', description: '' });
      setSnackbar({ open: true, message: 'تم إنشاء الشكوى', severity: 'success' });
    },
    onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { title?: string; description?: string } }) =>
      updateComplaint(id, payload),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setSnackbar({ open: true, message: 'تم تحديث الشكوى', severity: 'success' });
    },
    onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: ComplaintStatus; reviewNotes?: string } }) =>
      reviewComplaint(id, payload),
    onSuccess: () => {
      invalidate();
      setReviewOpen(false);
      setSnackbar({ open: true, message: 'تمت مراجعة الشكوى', severity: 'success' });
    },
    onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
  });

  const handlePdf = async (id: string, title: string) => {
    try {
      const blob = await downloadComplaintPdf(id);
      triggerBlobDownload(blob, `complaint-${title.slice(0, 30)}.pdf`);
    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
    }
  };

  const openCreate = () => {
    setEditingComplaint(null);
    setForm({ title: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: Complaint) => {
    setEditingComplaint(c);
    setForm({ title: c.title, description: c.description });
    setDialogOpen(true);
  };

  const openReview = (c: Complaint, status: ComplaintStatus) => {
    setReviewTarget(c);
    setReviewForm({ status, reviewNotes: '' });
    setReviewOpen(true);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{(error as Error)?.message ?? 'تعذّر تحميل الشكاوى.'}</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          إدارة الشكاوى
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          شكوى جديدة
        </Button>
      </Stack>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الشكاوى
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {stats.byStatus.map((s) => (
            <Grid key={s.status} size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {s.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {COMPLAINT_STATUS_LABELS[s.status]}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {stats && stats.repeatOffenders.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              متكررو الشكاوى
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {stats.repeatOffenders.slice(0, 8).map((o) => (
                <Chip
                  key={o.submitterId}
                  label={`${o.submitter?.fullName ?? o.submitterId} (${o.count})`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="بحث..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSearch(searchInput);
              setPage(0);
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearch(searchInput); setPage(0); }}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ComplaintStatus | '');
              setPage(0);
            }}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>المقدّم</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.submitter?.fullName ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={COMPLAINT_STATUS_LABELS[c.status]}
                    size="small"
                    color={COMPLAINT_STATUS_COLORS[c.status]}
                  />
                </TableCell>
                <TableCell>{formatDate(c.createdAt)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(c)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="PDF">
                    <IconButton size="small" onClick={() => void handlePdf(c.id, c.title)}>
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {c.status !== 'APPROVED' && (
                    <Tooltip title="قبول">
                      <IconButton size="small" color="success" onClick={() => openReview(c, 'APPROVED')}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {c.status !== 'REJECTED' && (
                    <Tooltip title="رفض">
                      <IconButton size="small" color="error" onClick={() => openReview(c, 'REJECTED')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {c.status !== 'CLOSED' && (
                    <Tooltip title="إغلاق">
                      <Button size="small" onClick={() => openReview(c, 'CLOSED')}>
                        إغلاق
                      </Button>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!data?.data.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    لا توجد شكاوى
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {data?.meta && (
        <TablePagination
          component="div"
          count={data.meta.total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="صفوف لكل صفحة"
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingComplaint ? 'تعديل شكوى' : 'شكوى جديدة'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="العنوان"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="الوصف"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              fullWidth
              multiline
              rows={4}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (editingComplaint) {
                updateMutation.mutate({ id: editingComplaint.id, payload: form });
              } else {
                createMutation.mutate(form);
              }
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>مراجعة الشكوى</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {reviewTarget?.title} — {COMPLAINT_STATUS_LABELS[reviewForm.status]}
            </Typography>
            <TextField
              label="ملاحظات المراجعة"
              value={reviewForm.reviewNotes}
              onChange={(e) => setReviewForm({ ...reviewForm, reviewNotes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (reviewTarget) {
                reviewMutation.mutate({
                  id: reviewTarget.id,
                  payload: { status: reviewForm.status, reviewNotes: reviewForm.reviewNotes || undefined },
                });
              }
            }}
            disabled={reviewMutation.isPending}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
