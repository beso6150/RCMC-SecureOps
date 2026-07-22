import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './AuthContext';
import { canAccessRoute } from './rbac';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface ProtectedRouteProps {
  requirePasswordChanged?: boolean;
}

export function ProtectedRoute({ requirePasswordChanged = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, mustChangePassword, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requirePasswordChanged && mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (
    user &&
    !canAccessRoute(location.pathname, {
      roleCode: user.roleCode,
      permissions: user.permissions,
    })
  ) {
    return (
      <ForbiddenPage message={`ليست لديك صلاحية لفتح الصفحة: ${location.pathname}`} />
    );
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? '/'} replace />;
  }

  return <Outlet />;
}

export function ForcePasswordRoute() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
