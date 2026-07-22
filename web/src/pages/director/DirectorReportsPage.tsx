import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { exportReport, fetchReportSummary, REPORTS_QUERY_KEYS } from '../../api/reports';
import type { ReportPeriod } from '../../types/director';
import { PERIOD_LABELS, triggerBlobDownload } from './directorLabels';

export function DirectorReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: REPORTS_QUERY_KEYS.summary(period),
    queryFn: () => fetchReportSummary(period),
  });

  const handleExport = async (format: 'pdf' | 'csv') => {
    setExporting(format);
    try {
      const blob = await exportReport(period, format);
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      triggerBlobDownload(blob, `report-${period}.${ext}`);
      setSnackbar({ open: true, message: 'تم تنزيل التقرير', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
    } finally {
      setExporting(null);
    }
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
      <Alert severity="error">
        {(error as Error)?.message ?? 'تعذّر تحميل التقارير.'}
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          التقارير
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الفترة</InputLabel>
            <Select
              label="الفترة"
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            >
              {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
                <MenuItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => void handleExport('pdf')}
            disabled={exporting !== null}
          >
            تصدير PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => void handleExport('csv')}
            disabled={exporting !== null}
          >
            تصدير Excel (CSV)
          </Button>
        </Stack>
      </Stack>

      {summary && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              ملخص {summary.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              من {new Date(summary.range.from).toLocaleDateString('ar-SA')} إلى{' '}
              {new Date(summary.range.to).toLocaleDateString('ar-SA')}
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'المخالفات', value: summary.violations },
                { label: 'البلاغات', value: summary.incidents },
                { label: 'الزوار', value: summary.visitors },
                { label: 'الشكاوى', value: summary.complaints },
                { label: 'بلاغات مفتوحة', value: summary.openIncidents },
                { label: 'شكاوى مفتوحة', value: summary.openComplaints },
                {
                  label: 'متوسط الاستجابة',
                  value:
                    summary.averageResponseMinutes != null
                      ? `${summary.averageResponseMinutes} دقيقة`
                      : '—',
                },
              ].map((item) => (
                <Grid key={item.label} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

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
