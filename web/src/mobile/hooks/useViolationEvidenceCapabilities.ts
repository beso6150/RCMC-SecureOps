import { RoleCodes } from '../../auth/rbac';
import { hasPermission, PermissionCodes } from '../../auth/rbac';

export interface ViolationEvidenceCapabilities {
  canCapture: boolean;
  canPickGallery: boolean;
  canMultiUpload: boolean;
  canAddNotes: boolean;
  canSetLocation: boolean;
  canAddDuringProcessing: boolean;
  canReviewPhotos: boolean;
  canRequestMorePhotos: boolean;
  canUploadFromSystem: boolean;
}

export function getViolationEvidenceCapabilities(
  roleCode: string,
  permissions: string[],
): ViolationEvidenceCapabilities {
  const canUpdate = hasPermission(permissions, [
    PermissionCodes.VIOLATIONS_UPDATE,
    PermissionCodes.VIOLATIONS_CREATE,
  ]);

  const isGuard = roleCode === RoleCodes.SECURITY_GUARD;
  const isSupervisor = roleCode === RoleCodes.SECURITY_SUPERVISOR;
  const isCctv = roleCode === RoleCodes.CCTV_OPERATOR;

  return {
    canCapture: (isGuard || isSupervisor) && canUpdate,
    canPickGallery: (isGuard || isSupervisor || (isCctv && canUpdate)) && canUpdate,
    canMultiUpload: (isGuard || isSupervisor) && canUpdate,
    canAddNotes: (isGuard || isSupervisor) && canUpdate,
    canSetLocation: (isGuard || isSupervisor) && canUpdate,
    canAddDuringProcessing: isSupervisor && canUpdate,
    canReviewPhotos: isGuard || isSupervisor || isCctv || canUpdate,
    canRequestMorePhotos: isSupervisor && canUpdate,
    canUploadFromSystem: isCctv && canUpdate,
  };
}
