import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type {
  FieldAlert,
  FieldMapSnapshot,
  PersonnelLocation,
  SecurityCheckpoint,
  SecurityZone,
} from '../../types/fieldOperations';
import {
  ALERT_SEVERITY_LABELS,
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  CHECKPOINT_TYPE_LABELS,
  ZONE_TYPE_LABELS,
} from '../../types/fieldOperations';
import type { MapSelection } from './FieldSecurityMap';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission, PermissionCodes } from '../../auth/rbac';

interface MapDetailDrawerProps {
  open: boolean;
  selection: MapSelection | null;
  data: FieldMapSnapshot | undefined;
  onClose: () => void;
  onAcknowledgeAlert?: (id: string) => void;
  onResolveAlert?: (id: string) => void;
}

function findEntity(data: FieldMapSnapshot, selection: MapSelection) {
  switch (selection.kind) {
    case 'zone':
      return data.zones.find((z) => z.id === selection.id) ?? null;
    case 'checkpoint':
      return data.checkpoints.find((c) => c.id === selection.id) ?? null;
    case 'personnel':
      return data.personnel.find((p) => p.id === selection.id) ?? null;
    case 'incident':
      return data.incidents.find((i) => i.id === selection.id) ?? null;
    case 'violation':
      return data.violations.find((v) => v.id === selection.id) ?? null;
    case 'alert':
      return data.alerts.find((a) => a.id === selection.id) ?? null;
    case 'cctv':
      return data.cctvPoints.find((c) => c.id === selection.id) ?? null;
    default:
      return null;
  }
}

export function MapDetailDrawer({
  open,
  selection,
  data,
  onClose,
  onAcknowledgeAlert,
  onResolveAlert,
}: MapDetailDrawerProps) {
  const { user } = useAuth();
  const canAck = hasPermission(user?.permissions ?? [], [PermissionCodes.FIELD_ALERTS_ACKNOWLEDGE]);
  const canResolve = hasPermission(user?.permissions ?? [], [PermissionCodes.FIELD_ALERTS_RESOLVE]);
  const canManageCheckpoints = hasPermission(user?.permissions ?? [], [
    PermissionCodes.CHECKPOINTS_UPDATE,
  ]);

  const entity = data && selection ? findEntity(data, selection) : null;

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 380 } } }}
    >
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          تفاصيل العنصر
        </Typography>

        {!selection || !entity ? (
          <Alert severity="info">اختر عنصراً من الخريطة لعرض التفاصيل.</Alert>
        ) : selection.kind === 'zone' ? (
          <ZoneDetails zone={entity as SecurityZone} />
        ) : selection.kind === 'checkpoint' ? (
          <CheckpointDetails
            checkpoint={entity as SecurityCheckpoint}
            canManage={canManageCheckpoints}
          />
        ) : selection.kind === 'personnel' ? (
          <PersonnelDetails person={entity as PersonnelLocation} />
        ) : selection.kind === 'incident' ? (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {(entity as { title: string }).title}
            </Typography>
            <Chip size="small" label={(entity as { severity: string }).severity} color="error" />
            <Typography variant="body2" color="text.secondary">
              الحالة: {(entity as { status: string }).status}
            </Typography>
            <Button
              component={RouterLink}
              to="/incidents"
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              فتح البلاغات
            </Button>
          </Stack>
        ) : selection.kind === 'violation' ? (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              مخالفة {(entity as { plateNumber: string }).plateNumber}
            </Typography>
            <Typography variant="body2">الحالة: {(entity as { status: string }).status}</Typography>
            <Button component={RouterLink} to="/violations" variant="outlined" size="small">
              فتح المخالفات
            </Button>
          </Stack>
        ) : selection.kind === 'alert' ? (
          <AlertDetails
            alert={entity as FieldAlert}
            canAck={canAck}
            canResolve={canResolve}
            onAcknowledge={onAcknowledgeAlert}
            onResolve={onResolveAlert}
          />
        ) : (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {(entity as { name: string }).name}
            </Typography>
            <Alert severity="info">نقطة كاميرا — جاهزة للربط لاحقاً.</Alert>
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />
        <Button fullWidth onClick={onClose}>
          إغلاق
        </Button>
      </Box>
    </Drawer>
  );
}

function ZoneDetails({ zone }: { zone: SecurityZone }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {zone.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        الرمز: {zone.code}
      </Typography>
      <Chip size="small" label={ZONE_TYPE_LABELS[zone.zoneType]} />
      {zone.floorNumber != null ? (
        <Typography variant="body2">الطابق: {zone.floorNumber}</Typography>
      ) : null}
      <Typography variant="body2">{zone.description || 'لا يوجد وصف.'}</Typography>
      <Button component={RouterLink} to="/field-operations/zones" size="small" variant="outlined">
        إدارة المناطق
      </Button>
    </Stack>
  );
}

function CheckpointDetails({
  checkpoint,
  canManage,
}: {
  checkpoint: SecurityCheckpoint;
  canManage: boolean;
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {checkpoint.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        الرمز: {checkpoint.code}
      </Typography>
      <Chip size="small" label={CHECKPOINT_TYPE_LABELS[checkpoint.checkpointType]} />
      <Typography variant="body2">
        الموقع على الخريطة: ({checkpoint.mapX.toFixed(0)}, {checkpoint.mapY.toFixed(0)})
      </Typography>
      {canManage ? (
        <Button
          component={RouterLink}
          to="/field-operations/checkpoints"
          size="small"
          variant="contained"
        >
          إدارة النقاط
        </Button>
      ) : null}
    </Stack>
  );
}

function PersonnelDetails({ person }: { person: PersonnelLocation }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {person.user?.fullName ?? 'فرد أمني'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        الرقم الوظيفي: {person.user?.employeeNumber ?? '—'}
      </Typography>
      <Typography variant="body2">المنطقة: {person.zone?.name ?? 'غير محددة'}</Typography>
      <Typography variant="body2">
        الإحداثيات: ({person.mapX.toFixed(0)}, {person.mapY.toFixed(0)})
      </Typography>
      <Typography variant="caption" color="text.secondary">
        آخر تحديث: {new Date(person.recordedAt).toLocaleString('ar-SA')}
      </Typography>
    </Stack>
  );
}

function AlertDetails({
  alert,
  canAck,
  canResolve,
  onAcknowledge,
  onResolve,
}: {
  alert: FieldAlert;
  canAck: boolean;
  canResolve: boolean;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {alert.title}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip size="small" label={ALERT_TYPE_LABELS[alert.alertType]} />
        <Chip size="small" label={ALERT_SEVERITY_LABELS[alert.severity]} color="warning" />
        <Chip size="small" label={ALERT_STATUS_LABELS[alert.status]} />
      </Stack>
      <Typography variant="body2">{alert.description}</Typography>
      <Stack direction="row" spacing={1}>
        {canAck && alert.status === 'NEW' ? (
          <Button size="small" variant="outlined" onClick={() => onAcknowledge?.(alert.id)}>
            استلام
          </Button>
        ) : null}
        {canResolve && alert.status !== 'RESOLVED' && alert.status !== 'CANCELLED' ? (
          <Button size="small" variant="contained" onClick={() => onResolve?.(alert.id)}>
            حل
          </Button>
        ) : null}
      </Stack>
      <Button component={RouterLink} to="/field-operations/alerts" size="small">
        كل التنبيهات
      </Button>
    </Stack>
  );
}
