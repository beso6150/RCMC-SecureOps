import { prisma } from '../../../shared/database/prisma.js';

export interface EscalationSettings {
  escalateReceiveMinutes: number;
  escalateHighReceiveMinutes: number;
  escalateStartMinutes: number;
  criticalNotifyDirector: boolean;
}

const DEFAULTS: EscalationSettings = {
  escalateReceiveMinutes: 5,
  escalateHighReceiveMinutes: 3,
  escalateStartMinutes: 10,
  criticalNotifyDirector: true,
};

function asPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export const CCTV_OPS_SETTING_KEYS = {
  ESCALATE_RECEIVE_MINUTES: 'cctv_ops.escalate_receive_minutes',
  ESCALATE_HIGH_RECEIVE_MINUTES: 'cctv_ops.escalate_high_receive_minutes',
  ESCALATE_START_MINUTES: 'cctv_ops.escalate_start_minutes',
  CRITICAL_NOTIFY_DIRECTOR: 'cctv_ops.critical_notify_director',
} as const;

export const CCTV_OPS_SYSTEM_SETTINGS = [
  {
    key: CCTV_OPS_SETTING_KEYS.ESCALATE_RECEIVE_MINUTES,
    value: DEFAULTS.escalateReceiveMinutes,
    description: 'Minutes before escalating unreceived referrals',
    isPublic: false,
  },
  {
    key: CCTV_OPS_SETTING_KEYS.ESCALATE_HIGH_RECEIVE_MINUTES,
    value: DEFAULTS.escalateHighReceiveMinutes,
    description: 'Minutes before escalating unreceived HIGH referrals',
    isPublic: false,
  },
  {
    key: CCTV_OPS_SETTING_KEYS.ESCALATE_START_MINUTES,
    value: DEFAULTS.escalateStartMinutes,
    description: 'Minutes after receive before escalating if verification not started',
    isPublic: false,
  },
  {
    key: CCTV_OPS_SETTING_KEYS.CRITICAL_NOTIFY_DIRECTOR,
    value: DEFAULTS.criticalNotifyDirector,
    description: 'Notify security director immediately for CRITICAL referrals',
    isPublic: false,
  },
] as const;

export async function loadEscalationSettings(): Promise<EscalationSettings> {
  const keys = Object.values(CCTV_OPS_SETTING_KEYS);
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: keys }, deletedAt: null },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  return {
    escalateReceiveMinutes: asPositiveNumber(
      byKey.get(CCTV_OPS_SETTING_KEYS.ESCALATE_RECEIVE_MINUTES),
      DEFAULTS.escalateReceiveMinutes,
    ),
    escalateHighReceiveMinutes: asPositiveNumber(
      byKey.get(CCTV_OPS_SETTING_KEYS.ESCALATE_HIGH_RECEIVE_MINUTES),
      DEFAULTS.escalateHighReceiveMinutes,
    ),
    escalateStartMinutes: asPositiveNumber(
      byKey.get(CCTV_OPS_SETTING_KEYS.ESCALATE_START_MINUTES),
      DEFAULTS.escalateStartMinutes,
    ),
    criticalNotifyDirector: asBoolean(
      byKey.get(CCTV_OPS_SETTING_KEYS.CRITICAL_NOTIFY_DIRECTOR),
      DEFAULTS.criticalNotifyDirector,
    ),
  };
}

export function shouldEscalateUnreceived(params: {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sentAt: Date;
  now?: Date;
  settings: EscalationSettings;
}): { escalate: boolean; reason: string; notifyDirector: boolean; notifyOps: boolean } {
  const now = params.now ?? new Date();
  const ageMin = (now.getTime() - params.sentAt.getTime()) / 60_000;

  if (params.severity === 'CRITICAL') {
    return {
      escalate: true,
      reason: 'إحالة حرجة — تصعيد فوري للمشرف ومدير العمليات ومدير الأمن',
      notifyDirector: params.settings.criticalNotifyDirector,
      notifyOps: true,
    };
  }

  if (params.severity === 'HIGH' && ageMin >= params.settings.escalateHighReceiveMinutes) {
    return {
      escalate: true,
      reason: `لم تُستلم إحالة عالية الخطورة خلال ${params.settings.escalateHighReceiveMinutes} دقائق`,
      notifyDirector: false,
      notifyOps: true,
    };
  }

  if (ageMin >= params.settings.escalateReceiveMinutes) {
    return {
      escalate: true,
      reason: `لم تُستلم الإحالة خلال ${params.settings.escalateReceiveMinutes} دقائق`,
      notifyDirector: false,
      notifyOps: false,
    };
  }

  return { escalate: false, reason: '', notifyDirector: false, notifyOps: false };
}
