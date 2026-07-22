import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchNearestPersonnel, FIELD_OPS_QUERY_KEYS, listZones, listCheckpoints } from '../../api/fieldOperations';

interface IncidentFieldLocationSectionProps {
  zoneId?: string | null;
  floorId?: string | null;
  floorLabel?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  checkpointId?: string | null;
  editable?: boolean;
  onChange?: (patch: {
    zoneId?: string | null;
    mapX?: number | null;
    mapY?: number | null;
    checkpointId?: string | null;
  }) => void;
}

/** Optional location block for incident create/detail flows — safe no-op when coords absent. */
export function IncidentFieldLocationSection({
  zoneId,
  floorLabel,
  mapX,
  mapY,
  checkpointId,
  editable = false,
  onChange,
}: IncidentFieldLocationSectionProps) {
  const { data: zones } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.zones({ pageSize: 200 }),
    queryFn: () => listZones({ pageSize: 200 }),
    enabled: editable,
  });

  const { data: checkpoints } = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.checkpoints({ pageSize: 200 }),
    queryFn: () => listCheckpoints({ pageSize: 200 }),
    enabled: editable,
  });

  const hasCoords = mapX != null && mapY != null && Number.isFinite(mapX) && Number.isFinite(mapY);

  const nearestQuery = useQuery({
    queryKey: FIELD_OPS_QUERY_KEYS.nearestPersonnel(mapX ?? undefined, mapY ?? undefined),
    queryFn: () => fetchNearestPersonnel(mapX as number, mapY as number, 5),
    enabled: hasCoords,
  });

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        الموقع الميداني
      </Typography>

      {editable ? (
        <Stack spacing={2} sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>المنطقة</InputLabel>
            <Select
              label="المنطقة"
              value={zoneId ?? ''}
              onChange={(e) => onChange?.({ zoneId: e.target.value || null })}
            >
              <MenuItem value="">بدون</MenuItem>
              {(zones?.data ?? []).map((z) => (
                <MenuItem key={z.id} value={z.id}>
                  {z.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>أقرب نقطة أمنية</InputLabel>
            <Select
              label="أقرب نقطة أمنية"
              value={checkpointId ?? ''}
              onChange={(e) => onChange?.({ checkpointId: e.target.value || null })}
            >
              <MenuItem value="">بدون</MenuItem>
              {(checkpoints?.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      ) : (
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          <Typography variant="body2">المنطقة: {zoneId ? zoneId : 'غير محددة'}</Typography>
          {floorLabel ? <Typography variant="body2">الطابق: {floorLabel}</Typography> : null}
          <Typography variant="body2">
            الإحداثيات:{' '}
            {hasCoords ? `(${(mapX as number).toFixed(0)}, ${(mapY as number).toFixed(0)})` : 'غير محددة'}
          </Typography>
          <Typography variant="body2">أقرب نقطة: {checkpointId ?? '—'}</Typography>
        </Stack>
      )}

      {hasCoords ? (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            أقرب الأفراد
          </Typography>
          {nearestQuery.isLoading ? (
            <CircularProgress size={22} />
          ) : nearestQuery.isError ? (
            <Alert severity="warning">تعذّر جلب أقرب الأفراد.</Alert>
          ) : (nearestQuery.data?.length ?? 0) === 0 ? (
            <Alert severity="info">لا يوجد أفراد قريبون حالياً.</Alert>
          ) : (
            <Stack spacing={0.75}>
              {nearestQuery.data?.map((p) => (
                <Typography key={p.userId} variant="body2">
                  {p.fullName} · {p.employeeNumber} · المسافة ≈ {p.distance.toFixed(0)}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
