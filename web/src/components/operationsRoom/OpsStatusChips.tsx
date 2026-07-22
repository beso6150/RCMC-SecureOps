import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import {
  OPS_INCIDENT_STATUS_LABELS,
  OPS_SEVERITY_LABELS,
  type OpsIncidentSeverity,
  type OpsIncidentStatus,
} from '../../types/operationsRoom';

function statusColor(status: OpsIncidentStatus): ChipProps['color'] {
  switch (status) {
    case 'CRITICAL' as never:
    case 'ESCALATED':
    case 'FALSE_ALARM':
      return 'error';
    case 'RESOLVED':
    case 'CLOSED':
      return 'success';
    case 'ON_HOLD':
    case 'CANCELLED':
      return 'default';
    case 'RESPONDING':
    case 'ON_SCENE':
    case 'CONTAINED':
    case 'IN_PROGRESS':
      return 'info';
    case 'ASSIGNED':
    case 'ACKNOWLEDGED':
    case 'ASSESSING':
      return 'warning';
    default:
      return 'primary';
  }
}

function severityColor(severity: OpsIncidentSeverity): ChipProps['color'] {
  switch (severity) {
    case 'CRITICAL':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    default:
      return 'default';
  }
}

export function OpsStatusChip({ status }: { status: OpsIncidentStatus | string }) {
  const key = status as OpsIncidentStatus;
  return (
    <Chip
      size="small"
      color={statusColor(key)}
      label={OPS_INCIDENT_STATUS_LABELS[key] ?? status}
    />
  );
}

export function OpsSeverityChip({ severity }: { severity: OpsIncidentSeverity | string }) {
  const key = severity as OpsIncidentSeverity;
  return (
    <Chip
      size="small"
      color={severityColor(key)}
      label={OPS_SEVERITY_LABELS[key] ?? severity}
      variant={key === 'CRITICAL' || key === 'HIGH' ? 'filled' : 'outlined'}
    />
  );
}
