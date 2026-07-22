import type { ParkingLocationCode, ViolationType } from '../../types/cctv';

/** Fixed parking sites for mobile case form (G / B / W). */
export const MOBILE_PARKING_SITES = [
  {
    code: 'G' as const,
    parkingCode: 'GROUND_PARKING' as ParkingLocationCode,
    label: 'G - المواقف الأرضية',
  },
  {
    code: 'B' as const,
    parkingCode: 'BASEMENT_PARKING' as ParkingLocationCode,
    label: 'B - البيسمنت',
  },
  {
    code: 'W' as const,
    parkingCode: 'WEST_PARKING' as ParkingLocationCode,
    label: 'W - المواقف الغربية',
  },
] as const;

export type MobileParkingSiteCode = (typeof MOBILE_PARKING_SITES)[number]['code'];

export type MobileCaseType = 'VIOLATION' | 'SIGHTING';

export const MOBILE_CASE_TYPES: Array<{ value: MobileCaseType; label: string }> = [
  { value: 'VIOLATION', label: 'مخالفة مركبة' },
  { value: 'SIGHTING', label: 'رصد مركبة' },
];

/**
 * Case reasons — frontend catalog ready for future admin CRUD API.
 * Keep stable `code` values for meta persistence.
 */
export interface MobileCaseReason {
  code: string;
  label: string;
  mapsToViolationType: ViolationType;
  notifyDirector: boolean;
  highPriority?: boolean;
  active: boolean;
  sortOrder: number;
}

export const DEFAULT_MOBILE_CASE_REASONS: MobileCaseReason[] = [
  {
    code: 'OUTSIDE_WORK_HOURS',
    label: 'الوقوف خارج وقت العمل',
    mapsToViolationType: 'ILLEGAL_PARKING',
    notifyDirector: true,
    highPriority: true,
    active: true,
    sortOrder: 1,
  },
  {
    code: 'NO_PERMIT',
    label: 'الوقوف بدون تصريح',
    mapsToViolationType: 'NO_PERMIT',
    notifyDirector: true,
    highPriority: true,
    active: true,
    sortOrder: 2,
  },
  {
    code: 'WRONG_SPOT',
    label: 'الوقوف في مكان غير مخصص',
    mapsToViolationType: 'UNAUTHORIZED_ZONE',
    notifyDirector: false,
    active: true,
    sortOrder: 3,
  },
  {
    code: 'DISABLED_SPOT',
    label: 'الوقوف في موقف ذوي الإعاقة',
    mapsToViolationType: 'UNAUTHORIZED_ZONE',
    notifyDirector: false,
    highPriority: true,
    active: true,
    sortOrder: 4,
  },
  {
    code: 'BLOCKING',
    label: 'إعاقة الحركة',
    mapsToViolationType: 'BLOCKING',
    notifyDirector: false,
    highPriority: true,
    active: true,
    sortOrder: 5,
  },
  {
    code: 'ABANDONED',
    label: 'مركبة متروكة',
    mapsToViolationType: 'OTHER',
    notifyDirector: false,
    active: true,
    sortOrder: 6,
  },
  {
    code: 'SUSPICIOUS',
    label: 'مركبة مشتبه بها',
    mapsToViolationType: 'OTHER',
    notifyDirector: true,
    highPriority: true,
    active: true,
    sortOrder: 7,
  },
  {
    code: 'OTHER',
    label: 'أخرى',
    mapsToViolationType: 'OTHER',
    notifyDirector: false,
    active: true,
    sortOrder: 8,
  },
];

const REASONS_STORAGE_KEY = 'rcmc.mobile.caseReasons';

/** Loads reasons (local override first — future admin sync can replace this). */
export function getMobileCaseReasons(): MobileCaseReason[] {
  try {
    const raw = localStorage.getItem(REASONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MobileCaseReason[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* keep defaults */
  }
  return DEFAULT_MOBILE_CASE_REASONS;
}

export function getActiveCaseReasons(): MobileCaseReason[] {
  return getMobileCaseReasons()
    .filter((r) => r.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const VEHICLE_TYPE_OPTIONS = [
  { value: 'SEDAN', label: 'سيدان' },
  { value: 'SUV', label: 'دفع رباعي' },
  { value: 'PICKUP', label: 'بيك أب' },
  { value: 'VAN', label: 'فان' },
  { value: 'BUS', label: 'حافلة' },
  { value: 'MOTORCYCLE', label: 'دراجة نارية' },
  { value: 'TRUCK', label: 'شاحنة' },
  { value: 'OTHER', label: 'أخرى' },
] as const;

export const PERMIT_NUMBER_PREFIX = 'RCMC-';

export function parkingCodeFromSite(site: MobileParkingSiteCode): ParkingLocationCode {
  const found = MOBILE_PARKING_SITES.find((s) => s.code === site);
  return found?.parkingCode ?? 'GROUND_PARKING';
}

export function siteFromParkingCode(code: string | undefined): MobileParkingSiteCode | null {
  const found = MOBILE_PARKING_SITES.find((s) => s.parkingCode === code);
  return found?.code ?? null;
}
