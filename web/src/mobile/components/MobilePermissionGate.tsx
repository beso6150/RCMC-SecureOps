import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  MOBILE_ACCESS_DENIED_MESSAGE,
  canAccessMobileRoute,
} from '../config/mobileRoleAccess';

interface MobilePermissionGateProps {
  children: ReactNode;
}

/**
 * Guards a mobile page by roleCode + permissions.
 * Unauthorized users are sent to /mobile with an Arabic denial message.
 */
export function MobilePermissionGate({ children }: MobilePermissionGateProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/mobile/login" replace state={{ from: location }} />;
  }

  const allowed = canAccessMobileRoute(location.pathname, {
    roleCode: user.roleCode,
    permissions: user.permissions,
  });

  if (!allowed) {
    return (
      <Navigate
        to="/mobile"
        replace
        state={{
          accessDenied: true,
          message: MOBILE_ACCESS_DENIED_MESSAGE,
        }}
      />
    );
  }

  return children;
}
