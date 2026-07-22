import { Box, Chip, Stack, Typography } from '@mui/material';
import type { FieldMapSnapshot } from '../../types/fieldOperations';

export type MapEntityKind =
  | 'zone'
  | 'checkpoint'
  | 'personnel'
  | 'incident'
  | 'violation'
  | 'alert'
  | 'cctv';

export interface MapSelection {
  kind: MapEntityKind;
  id: string;
}

interface FieldSecurityMapProps {
  data: FieldMapSnapshot;
  selected?: MapSelection | null;
  onSelect?: (selection: MapSelection) => void;
  height?: number | string;
}

const VIEW_W = 1000;
const VIEW_H = 700;

const LEGEND: Array<{ color: string; label: string }> = [
  { color: '#0f766e', label: 'منطقة / طابق' },
  { color: '#2563eb', label: 'نقطة أمنية' },
  { color: '#16a34a', label: 'أفراد' },
  { color: '#dc2626', label: 'بلاغ' },
  { color: '#d97706', label: 'مخالفة' },
  { color: '#7c3aed', label: 'تنبيه' },
  { color: '#64748b', label: 'كاميرا (تحضير)' },
];

function severityColor(severity?: string): string {
  switch (severity) {
    case 'CRITICAL':
      return '#991b1b';
    case 'HIGH':
      return '#dc2626';
    case 'MEDIUM':
      return '#d97706';
    default:
      return '#2563eb';
  }
}

export function FieldSecurityMap({
  data,
  selected,
  onSelect,
  height = 560,
}: FieldSecurityMapProps) {
  const isSelected = (kind: MapEntityKind, id: string) =>
    selected?.kind === kind && selected.id === id;

  return (
    <Box>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b1728' : '#e8eef6'),
          height,
        }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          height="100%"
          role="img"
          aria-label="الخريطة الأمنية التفاعلية"
          style={{ display: 'block', cursor: 'default' }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(15,45,92,0.08)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={VIEW_W} height={VIEW_H} fill="url(#grid)" />

          {/* Parking strip */}
          <rect x={40} y={560} width={920} height={100} rx={8} fill="rgba(100,116,139,0.18)" />
          <text x={60} y={618} fill="#64748b" fontSize="14" fontFamily="Cairo, Tahoma, sans-serif">
            مواقف السيارات
          </text>

          {data.zones.map((zone) => (
            <g
              key={zone.id}
              onClick={() => onSelect?.({ kind: 'zone', id: zone.id })}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={zone.mapX}
                y={zone.mapY}
                width={zone.width}
                height={zone.height}
                rx={6}
                fill={zone.color || '#0f766e'}
                fillOpacity={isSelected('zone', zone.id) ? 0.45 : 0.22}
                stroke={isSelected('zone', zone.id) ? '#0f2d5c' : zone.color || '#0f766e'}
                strokeWidth={isSelected('zone', zone.id) ? 3 : 1.5}
              />
              <text
                x={zone.mapX + 10}
                y={zone.mapY + 22}
                fill="#0f2d5c"
                fontSize="13"
                fontWeight="700"
                fontFamily="Cairo, Tahoma, sans-serif"
              >
                {zone.name}
                {zone.floorNumber != null ? ` · ط${zone.floorNumber}` : ''}
              </text>
            </g>
          ))}

          {data.cctvPoints.map((cam) => (
            <g
              key={cam.id}
              onClick={() => onSelect?.({ kind: 'cctv', id: cam.id })}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={cam.mapX - 8}
                y={cam.mapY - 8}
                width={16}
                height={16}
                rx={3}
                fill="#64748b"
                stroke={isSelected('cctv', cam.id) ? '#0f2d5c' : '#fff'}
                strokeWidth={2}
              />
            </g>
          ))}

          {data.checkpoints.map((cp) => (
            <g
              key={cp.id}
              onClick={() => onSelect?.({ kind: 'checkpoint', id: cp.id })}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={cp.mapX}
                cy={cp.mapY}
                r={isSelected('checkpoint', cp.id) ? 11 : 8}
                fill="#2563eb"
                stroke="#fff"
                strokeWidth={2}
              />
              <title>{cp.name}</title>
            </g>
          ))}

          {data.violations.map((v) => (
            <g
              key={v.id}
              onClick={() => onSelect?.({ kind: 'violation', id: v.id })}
              style={{ cursor: 'pointer' }}
            >
              <polygon
                points={`${v.mapX},${v.mapY - 10} ${v.mapX + 9},${v.mapY + 8} ${v.mapX - 9},${v.mapY + 8}`}
                fill="#d97706"
                stroke={isSelected('violation', v.id) ? '#0f2d5c' : '#fff'}
                strokeWidth={2}
              />
            </g>
          ))}

          {data.incidents.map((inc) => (
            <g
              key={inc.id}
              onClick={() => onSelect?.({ kind: 'incident', id: inc.id })}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={inc.mapX}
                cy={inc.mapY}
                r={isSelected('incident', inc.id) ? 12 : 9}
                fill={severityColor(inc.severity)}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={inc.mapX}
                y={inc.mapY + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="700"
              >
                !
              </text>
            </g>
          ))}

          {data.alerts.map((alert) =>
            alert.mapX != null && alert.mapY != null ? (
              <g
                key={alert.id}
                onClick={() => onSelect?.({ kind: 'alert', id: alert.id })}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={alert.mapX}
                  cy={alert.mapY}
                  r={isSelected('alert', alert.id) ? 11 : 8}
                  fill="#7c3aed"
                  stroke="#fff"
                  strokeWidth={2}
                />
              </g>
            ) : null,
          )}

          {data.personnel.map((p) => (
            <g
              key={p.id}
              onClick={() => onSelect?.({ kind: 'personnel', id: p.id })}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={p.mapX}
                cy={p.mapY}
                r={isSelected('personnel', p.id) ? 12 : 9}
                fill="#16a34a"
                stroke="#fff"
                strokeWidth={2}
              />
              <circle cx={p.mapX} cy={p.mapY} r={3} fill="#fff" />
            </g>
          ))}
        </svg>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
          المفتاح:
        </Typography>
        {LEGEND.map((item) => (
          <Chip
            key={item.label}
            size="small"
            label={item.label}
            sx={{
              bgcolor: `${item.color}22`,
              borderColor: item.color,
              border: '1px solid',
              '& .MuiChip-label': { fontWeight: 600 },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
