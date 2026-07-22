import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';

export const FIELD_OPS_SETTING_KEYS = {
  LOCATION_FRESHNESS_MINUTES: 'field_ops.location_freshness_minutes',
  LOCATION_RETENTION_DAYS: 'field_ops.location_retention_days',
  LOCATION_UPDATE_THROTTLE_SECONDS: 'field_ops.location_update_throttle_seconds',
} as const;

export const FIELD_OPS_SETTING_DEFAULTS = {
  locationFreshnessMinutes: 15,
  locationRetentionDays: 7,
  locationUpdateThrottleSeconds: 30,
} as const;

export const FIELD_OPS_SYSTEM_SETTINGS = [
  {
    key: FIELD_OPS_SETTING_KEYS.LOCATION_FRESHNESS_MINUTES,
    value: FIELD_OPS_SETTING_DEFAULTS.locationFreshnessMinutes,
    description: 'Minutes before a personnel location is considered stale',
    isPublic: false,
  },
  {
    key: FIELD_OPS_SETTING_KEYS.LOCATION_RETENTION_DAYS,
    value: FIELD_OPS_SETTING_DEFAULTS.locationRetentionDays,
    description: 'Days to retain personnel location history (expiresAt)',
    isPublic: false,
  },
  {
    key: FIELD_OPS_SETTING_KEYS.LOCATION_UPDATE_THROTTLE_SECONDS,
    value: FIELD_OPS_SETTING_DEFAULTS.locationUpdateThrottleSeconds,
    description: 'Minimum seconds between location updates per user',
    isPublic: false,
  },
] as const;

export interface FieldOpsSettings {
  locationFreshnessMinutes: number;
  locationRetentionDays: number;
  locationUpdateThrottleSeconds: number;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

export async function loadFieldOpsSettings(): Promise<FieldOpsSettings> {
  const keys = Object.values(FIELD_OPS_SETTING_KEYS);
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: keys }, deletedAt: null },
  });

  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  return {
    locationFreshnessMinutes: asPositiveNumber(
      byKey.get(FIELD_OPS_SETTING_KEYS.LOCATION_FRESHNESS_MINUTES),
      FIELD_OPS_SETTING_DEFAULTS.locationFreshnessMinutes,
    ),
    locationRetentionDays: asPositiveNumber(
      byKey.get(FIELD_OPS_SETTING_KEYS.LOCATION_RETENTION_DAYS),
      FIELD_OPS_SETTING_DEFAULTS.locationRetentionDays,
    ),
    locationUpdateThrottleSeconds: asPositiveNumber(
      byKey.get(FIELD_OPS_SETTING_KEYS.LOCATION_UPDATE_THROTTLE_SECONDS),
      FIELD_OPS_SETTING_DEFAULTS.locationUpdateThrottleSeconds,
    ),
  };
}

export function locationExpiresAt(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() + retentionDays * 86_400_000);
}

export type FieldOpsSettingSeed = (typeof FIELD_OPS_SYSTEM_SETTINGS)[number];

export function toPrismaJsonValue(value: number): Prisma.InputJsonValue {
  return value;
}
