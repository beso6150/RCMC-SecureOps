import { Chip, type ChipProps } from '@mui/material';

const STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary'> = {
  NEW: 'info',
  PENDING: 'warning',
  ASSIGNED: 'primary',
  IN_PROGRESS: 'secondary',
  ON_HOLD: 'warning',
  RESOLVED: 'success',
  COMPLETED: 'success',
  CLOSED: 'success',
  CANCELLED: 'default',
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

interface QueueStatusChipProps {
  label: string;
  status: string;
  size?: ChipProps['size'];
}

export function QueueStatusChip({ label, status, size = 'small' }: QueueStatusChipProps) {
  return (
    <Chip
      label={label}
      size={size}
      color={STATUS_COLORS[status] ?? 'default'}
      variant="outlined"
      sx={{ fontWeight: 600, minWidth: 72 }}
    />
  );
}

interface PriorityChipProps {
  label: string;
  severity: string;
}

export function PriorityChip({ label, severity }: PriorityChipProps) {
  return (
    <Chip
      label={label}
      size="small"
      color={STATUS_COLORS[severity] ?? 'default'}
      sx={{ fontWeight: 600 }}
    />
  );
}
