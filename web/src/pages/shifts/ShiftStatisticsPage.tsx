import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchShiftStatistics, SHIFTS_QUERY_KEYS } from '../../api/shifts';
import { SESSION_STATUS_LABELS } from '../../types/shifts';
import { formatMsToMinutes } from '../../utils/formatDuration';

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ShiftStatisticsPage() {
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [appliedFrom, setAppliedFrom] = useState(defaultFromDate);
  const [appliedTo, setAppliedTo] = useState(defaultToDate);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: SHIFTS_QUERY_KEYS.statistics(appliedFrom, appliedTo),
    queryFn: () => fetchShiftStatistics(appliedFrom, appliedTo),
  });

  const applyFilter = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
    void refetch();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل إحصائيات الورديات.'}
      </Alert>
    );
  }

  const { totals, sessions } = data;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        إحصائيات الورديات
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-end' } }}>
            <TextField
              label="من تاريخ"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 160 }}
            />
            <Button variant="contained" startIcon={<SearchIcon />} onClick={applyFilter}>
              عرض
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card><CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.sessions}</Typography>
            <Typography variant="body2" color="text.secondary">جلسات</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card><CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.openIncidents}</Typography>
            <Typography variant="body2" color="text.secondary">بلاغات مفتوحة</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card><CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.closedIncidents}</Typography>
            <Typography variant="body2" color="text.secondary">بلاغات مغلقة</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card><CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.patrols}</Typography>
            <Typography variant="body2" color="text.secondary">جولات</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card><CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.violations}</Typography>
            <Typography variant="body2" color="text.secondary">مخالفات</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card><CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.complaints}</Typography>
            <Typography variant="body2" color="text.secondary">شكاوى</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card><CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {totals.averagePerformanceScore ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">متوسط الأداء</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {sessions.length === 0 ? (
        <Alert severity="info">لا توجد جلسات وردية في الفترة المحددة.</Alert>
      ) : (
        <TableContainer component={Card}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>الوردية</TableCell>
                <TableCell>المجموعة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="right">بلاغات</TableCell>
                <TableCell align="right">مخالفات</TableCell>
                <TableCell align="right">جولات</TableCell>
                <TableCell align="right">شكاوى</TableCell>
                <TableCell align="right">حراس</TableCell>
                <TableCell align="right">مشرفون</TableCell>
                <TableCell align="right">متوسط الاستجابة</TableCell>
                <TableCell align="right">أسرع</TableCell>
                <TableCell align="right">أبطأ</TableCell>
                <TableCell align="right">الأداء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.sessionId} hover>
                  <TableCell>
                    {new Date(s.startsAt).toLocaleDateString('ar-SA')}
                    <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                      يوم {s.cycleDay}
                    </Typography>
                  </TableCell>
                  <TableCell>{s.kindLabel.nameAr}</TableCell>
                  <TableCell>{s.group.label?.nameAr ?? s.group.nameAr}</TableCell>
                  <TableCell>
                    <Chip size="small" label={SESSION_STATUS_LABELS[s.status]} />
                  </TableCell>
                  <TableCell align="right">
                    {s.closedIncidents}/{s.openIncidents + s.closedIncidents}
                  </TableCell>
                  <TableCell align="right">{s.violations}</TableCell>
                  <TableCell align="right">{s.patrols}</TableCell>
                  <TableCell align="right">{s.complaints}</TableCell>
                  <TableCell align="right">{s.guardCount}</TableCell>
                  <TableCell align="right">{s.supervisorCount}</TableCell>
                  <TableCell align="right">{formatMsToMinutes(s.averageResponseMs)}</TableCell>
                  <TableCell align="right">{formatMsToMinutes(s.fastestResponseMs)}</TableCell>
                  <TableCell align="right">{formatMsToMinutes(s.slowestResponseMs)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={s.performanceScore}
                      color={s.performanceScore >= 80 ? 'success' : s.performanceScore >= 60 ? 'warning' : 'error'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
