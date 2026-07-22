import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';

function AuthSpinner() {
  return (
    <Box
      className="mobile-root"
      sx={{ display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}
    >
      <CircularProgress />
    </Box>
  );
}

/** Protects authenticated mobile routes; redirects to /mobile/login. */
export function MobileProtectedRoute() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/mobile/login" replace state={{ from: location }} />;
  }

  if (mustChangePassword) {
    return <Navigate to="/mobile/change-password" replace />;
  }

  return <Outlet />;
}

/** Allows only guests on mobile login. */
export function MobilePublicOnlyRoute() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthSpinner />;

  if (isAuthenticated) {
    if (mustChangePassword) {
      return <Navigate to="/mobile/change-password" replace />;
    }
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    const target = from?.startsWith('/mobile') ? from : '/mobile';
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

/** Authenticated mobile route for password change (forced or voluntary). */
export function MobilePasswordRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <AuthSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/mobile/login" replace />;
  }

  return <Outlet />;
}
