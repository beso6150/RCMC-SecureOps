import { apiClient } from '../../api/client';
import type { MobileCaseReason } from '../config/violationCaseConfig';

export interface ViolationNotifyPayload {
  violationId: string;
  reasonCode: string;
  reasonLabel: string;
  plateNumber: string;
  caseType: 'VIOLATION' | 'SIGHTING';
  highPriority: boolean;
  notifyDirector: boolean;
}

/**
 * Frontend-ready notification trigger after saving a case.
 * Prefer dedicated backend endpoint; no silent chat/alert is sent from the client.
 */
export async function notifyViolationStakeholders(
  payload: ViolationNotifyPayload,
): Promise<{ notified: boolean; skippedReason?: string }> {
  try {
    await apiClient.post(`/violations/${payload.violationId}/notify`, {
      roles: buildTargetRoles(payload),
      reasonCode: payload.reasonCode,
      reasonLabel: payload.reasonLabel,
      plateNumber: payload.plateNumber,
      caseType: payload.caseType,
      highPriority: payload.highPriority,
    });
    return { notified: true };
  } catch {
    return {
      notified: false,
      skippedReason:
        'إشعارات أصحاب المصلحة تتطلب Endpoint خلفي POST /violations/:id/notify',
    };
  }
}

export function shouldNotifyDirector(
  reason: MobileCaseReason | undefined,
  highPriority: boolean,
): boolean {
  if (!reason) return highPriority;
  return Boolean(reason.notifyDirector || reason.highPriority || highPriority);
}

function buildTargetRoles(payload: ViolationNotifyPayload): string[] {
  const roles = ['SECURITY_SUPERVISOR', 'CCTV_OPERATOR'];
  if (payload.notifyDirector) roles.push('SECURITY_DIRECTOR');
  return roles;
}
