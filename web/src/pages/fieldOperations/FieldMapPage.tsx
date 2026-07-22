import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  acknowledgeFieldAlert,
  fetchFieldMap,
  FIELD_OPS_QUERY_KEYS,
  resolveFieldAlert,
} from '../../api/fieldOperations';
import { FieldOpsPageHeader } from '../../components/fieldOperations/FieldOpsPageHeader';
import { FieldSecurityMap, type MapSelection } from '../../components/fieldOperations/FieldSecurityMap';
import { MapDetailDrawer } from '../../components/fieldOperations/MapDetailDrawer';
import { MapSkeleton } from '../../components/fieldOperations/FieldSkeletons';
import type { FieldMapFilters } from '../../types/fieldOperations';

export function FieldMapPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FieldMapFilters>({});
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.map(filters),
    queryFn: () => fetchFieldMap(filters),
    refetchInterval: 45_000,
  });

  const floors = useMemo(() => {
    const set = new Set<number>();
    data?.zones.forEach((z) => {
      if (z.floorNumber != null) set.add(z.floorNumber);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [data?.zones]);

  const ackMutation = useMutation({
    mutationFn: acknowledgeFieldAlert,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveFieldAlert(id, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all }),
  });

  const setFilter = (key: keyof FieldMapFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  return (
    <Box>
      <FieldOpsPageHeader
        title="الخريطة الأمنية"
        subtitle="خريطة SVG تفاعلية للمناطق والنقاط والأفراد والبلاغات والتنبيهات"
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  label="النوع"
                  value={filters.type ?? ''}
                  onChange={(e) => setFilter('type', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="personnel">أفراد</MenuItem>
                  <MenuItem value="checkpoint">نقاط</MenuItem>
                  <MenuItem value="incident">بلاغات</MenuItem>
                  <MenuItem value="violation">مخالفات</MenuItem>
                  <MenuItem value="alert">تنبيهات</MenuItem>
                  <MenuItem value="cctv">كاميرات</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الموقع / المنطقة</InputLabel>
                <Select
                  label="الموقع / المنطقة"
                  value={filters.zoneId ?? ''}
                  onChange={(e) => setFilter('zoneId', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {(data?.zones ?? []).map((z) => (
                    <MenuItem key={z.id} value={z.id}>
                      {z.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الطابق</InputLabel>
                <Select
                  label="الطابق"
                  value={filters.floor ?? ''}
                  onChange={(e) => setFilter('floor', String(e.target.value))}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {floors.map((f) => (
                    <MenuItem key={f} value={String(f)}>
                      طابق {f}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الوردية</InputLabel>
                <Select
                  label="الوردية"
                  value={filters.shift ?? ''}
                  onChange={(e) => setFilter('shift', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="MORNING">صباحية</MenuItem>
                  <MenuItem value="EVENING">مسائية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>المجموعة</InputLabel>
                <Select
                  label="المجموعة"
                  value={filters.group ?? ''}
                  onChange={(e) => setFilter('group', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="A">أ</MenuItem>
                  <MenuItem value="B">ب</MenuItem>
                  <MenuItem value="C">ج</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  label="الحالة"
                  value={filters.status ?? ''}
                  onChange={(e) => setFilter('status', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="OPEN">مفتوح</MenuItem>
                  <MenuItem value="IN_PROGRESS">قيد التنفيذ</MenuItem>
                  <MenuItem value="NEW">جديد</MenuItem>
                  <MenuItem value="ACTIVE">نشط</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الخطورة</InputLabel>
                <Select
                  label="الخطورة"
                  value={filters.severity ?? ''}
                  onChange={(e) => setFilter('severity', e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="LOW">منخفض</MenuItem>
                  <MenuItem value="MEDIUM">متوسط</MenuItem>
                  <MenuItem value="HIGH">مرتفع</MenuItem>
                  <MenuItem value="CRITICAL">حرج</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isLoading ? <MapSkeleton /> : null}
      {isError ? (
        <Alert severity="error">
          {(error as Error)?.message ?? 'تعذّر تحميل الخريطة الأمنية.'}
        </Alert>
      ) : null}

      {data ? (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              مناطق {data.zones.length} · نقاط {data.checkpoints.length} · أفراد{' '}
              {data.personnel.length} · بلاغات {data.incidents.length} · تنبيهات {data.alerts.length}
            </Typography>
          </Stack>
          <FieldSecurityMap
            data={data}
            selected={selection}
            onSelect={(s) => {
              setSelection(s);
              setDrawerOpen(true);
            }}
          />
          <MapDetailDrawer
            open={drawerOpen}
            selection={selection}
            data={data}
            onClose={() => setDrawerOpen(false)}
            onAcknowledgeAlert={(id) => ackMutation.mutate(id)}
            onResolveAlert={(id) => resolveMutation.mutate(id)}
          />
        </>
      ) : null}

      {!isLoading && !isError && data && data.zones.length === 0 && data.checkpoints.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          لا توجد عناصر على الخريطة بعد. أضف مناطق ونقاطاً أمنية للبدء.
        </Alert>
      ) : null}
    </Box>
  );
}
