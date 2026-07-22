import { RoleCodes, PermissionCodes, hasPermission } from '../../auth/rbac';

export interface ViolationCaseCapabilities {
  canCreateViolation: boolean;
  canCreateSighting: boolean;
  canCapture: boolean;
  canAddPhotos: boolean;
  canReviewPhotos: boolean;
  canSendEmployeeAlert: boolean;
  canApproveOrClose: boolean;
  canAddNotes: boolean;
  canRefer: boolean;
}

export function getViolationCaseCapabilities(
  roleCode: string,
  permissions: string[],
): ViolationCaseCapabilities {
  const canCreate = hasPermission(permissions, [PermissionCodes.VIOLATIONS_CREATE]);
  const canUpdate = hasPermission(permissions, [PermissionCodes.VIOLATIONS_UPDATE]);
  const canClose = hasPermission(permissions, [PermissionCodes.VIOLATIONS_CLOSE]);
  const canRefer = hasPermission(permissions, [
    PermissionCodes.SECURITY_REFERRALS_CREATE,
    PermissionCodes.SECURITY_REFERRALS_SEND,
  ]);
  const canAlert = hasPermission(permissions, [
    PermissionCodes.FIELD_ALERTS_CREATE,
    PermissionCodes.NOTIFICATIONS_UPDATE,
  ]);

  const isGuard = roleCode === RoleCodes.SECURITY_GUARD;
  const isSupervisor = roleCode === RoleCodes.SECURITY_SUPERVISOR;
  const isCctv = roleCode === RoleCodes.CCTV_OPERATOR;

  return {
    canCreateViolation: (isGuard || isSupervisor || canCreate) && (canCreate || canUpdate),
    canCreateSighting: (isGuard || isSupervisor || canCreate) && (canCreate || canUpdate),
    canCapture: isGuard || isSupervisor || canCreate,
    canAddPhotos: isSupervisor || ((isGuard || isCctv) && canUpdate),
    canReviewPhotos: isSupervisor || isCctv || isGuard,
    canSendEmployeeAlert: isSupervisor || (isCctv && canAlert) || canAlert,
    canApproveOrClose: isSupervisor && (canClose || canUpdate),
    canAddNotes: isSupervisor || isCctv || isGuard || canUpdate,
    canRefer: isCctv || isSupervisor || canRefer,
  };
}
