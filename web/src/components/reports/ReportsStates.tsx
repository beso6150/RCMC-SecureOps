import { Alert, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ForbiddenPage } from '../../pages/ForbiddenPage';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission } from '../../auth/rbac';

interface PermissionGateProps {
  anyOf: string[];
  children: React.ReactNode;
  message?: string;
}

export function PermissionGate({ anyOf, children, message }: PermissionGateProps) {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  if (!hasPermission(permissions, anyOf)) {
    return <ForbiddenPage message={message ?? 'ليست لديك صلاحية لعرض هذا القسم.'} />;
  }
  return <>{children}</>;
}

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionTo?: string;
}

export function EmptyState({ message, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <Alert
      severity="info"
      action={
        actionLabel && actionTo ? (
          <Button component={RouterLink} to={actionTo} color="inherit" size="small">
            {actionLabel}
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity="error">{message}</Alert>
    </Box>
  );
}
