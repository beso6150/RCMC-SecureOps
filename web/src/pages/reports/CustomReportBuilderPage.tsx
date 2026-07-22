import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  defaultDateRange,
  fromDateInputValue,
  generateCustomReport,
  REPORTS_CENTER_QUERY_KEYS,
  toDateInputValue,
} from '../../api/reportsCenter';
import { PermissionCodes } from '../../auth/rbac';
import { ReportsPageHeader } from '../../components/reports/ReportsPageHeader';
import { PermissionGate } from '../../components/reports/ReportsStates';
import {
  CUSTOM_DATA_SOURCE_LABELS,
  CUSTOM_DATA_SOURCES,
  CUSTOM_FIELD_ALLOWLIST,
  type CustomDataSource,
} from '../../types/reportsCenter';

export function CustomReportBuilderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initial = defaultDateRange(7);
  const [title, setTitle] = useState('تقرير مخصص');
  const [dateFrom, setDateFrom] = useState(toDateInputValue(initial.dateFrom));
  const [dateTo, setDateTo] = useState(toDateInputValue(initial.dateTo));
  const [selected, setSelected] = useState<CustomDataSource[]>(['incidents', 'patrols']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fieldsPreview = useMemo(() => {
    const out: Partial<Record<CustomDataSource, string[]>> = {};
    for (const src of selected) {
      out[src] = [...CUSTOM_FIELD_ALLOWLIST[src]];
    }
    return out;
  }, [selected]);

  const mutation = useMutation({
    mutationFn: () =>
      generateCustomReport({
        title: title.trim() || 'تقرير مخصص',
        dateFrom: fromDateInputValue(dateFrom, false),
        dateTo: fromDateInputValue(dateTo, true),
        dataSources: selected,
        fields: fieldsPreview,
      }),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: REPORTS_CENTER_QUERY_KEYS.all });
      void navigate(`/reports/saved/${report.id}`);
    },
    onError: (err) => setErrorMsg((err as Error)?.message ?? 'تعذّر توليد التقرير المخصص.'),
  });

  const toggleSource = (src: CustomDataSource) => {
    setSelected((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src],
    );
  };

  return (
    <PermissionGate anyOf={[PermissionCodes.REPORTS_GENERATE_CUSTOM]}>
      <Box>
        <ReportsPageHeader
          title="منشئ التقارير المخصص"
          subtitle="اختر مصادر البيانات المسموحة وولّد تقريراً مخصصاً دون استعلامات حرة"
        />

        {errorMsg ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        ) : null}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="عنوان التقرير"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="من تاريخ"
                  type="date"
                  size="small"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="إلى تاريخ"
                  type="date"
                  size="small"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>

              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                مصادر البيانات
              </Typography>
              <FormGroup row>
                {CUSTOM_DATA_SOURCES.map((src) => (
                  <FormControlLabel
                    key={src}
                    control={
                      <Checkbox
                        checked={selected.includes(src)}
                        onChange={() => toggleSource(src)}
                      />
                    }
                    label={CUSTOM_DATA_SOURCE_LABELS[src]}
                  />
                ))}
              </FormGroup>

              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                الحقول المعتمدة (معاينة)
              </Typography>
              {selected.length === 0 ? (
                <Alert severity="warning">اختر مصدر بيانات واحداً على الأقل.</Alert>
              ) : (
                <Stack spacing={1}>
                  {selected.map((src) => (
                    <Typography key={src} variant="body2" color="text.secondary">
                      {CUSTOM_DATA_SOURCE_LABELS[src]}: {CUSTOM_FIELD_ALLOWLIST[src].join('، ')}
                    </Typography>
                  ))}
                </Stack>
              )}

              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                disabled={selected.length === 0 || mutation.isPending}
                onClick={() => {
                  setErrorMsg(null);
                  mutation.mutate();
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                {mutation.isPending ? 'جارٍ التوليد…' : 'توليد التقرير'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </PermissionGate>
  );
}
