import { OperationalStatus } from '@prisma/client';
import {
  AVAILABLE_OPERATIONAL_STATUSES,
  BUSY_OPERATIONAL_STATUSES,
} from '../domain/constants.js';

export interface MapPoint {
  mapX: number;
  mapY: number;
}

export interface NearestPersonnelCandidate {
  userId: string;
  fullName: string;
  employeeNumber: string;
  operationalStatus: OperationalStatus;
  mapX: number;
  mapY: number;
  zoneId?: string | null;
  recordedAt?: Date | null;
  locationSource: 'personnel' | 'zone_fallback';
  isFresh: boolean;
}

export interface RankedPersonnel extends NearestPersonnelCandidate {
  distance: number;
  selectionReason: string;
}

export function euclideanDistance(a: MapPoint, b: MapPoint): number {
  const dx = a.mapX - b.mapX;
  const dy = a.mapY - b.mapY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isBusyStatus(status: OperationalStatus): boolean {
  return BUSY_OPERATIONAL_STATUSES.includes(status);
}

export function isAvailableForNearest(status: OperationalStatus): boolean {
  return AVAILABLE_OPERATIONAL_STATUSES.includes(status);
}

export function isLocationFresh(
  recordedAt: Date | null | undefined,
  now: Date,
  freshnessMinutes: number,
): boolean {
  if (!recordedAt) return false;
  const ageMs = now.getTime() - recordedAt.getTime();
  return ageMs <= freshnessMinutes * 60_000;
}

/**
 * Rank available personnel by Euclidean map distance.
 * Prefers fresh personnel locations; zone fallback coords are allowed when marked.
 */
export function rankNearestPersonnel(
  target: MapPoint,
  candidates: NearestPersonnelCandidate[],
  limit = 3,
): RankedPersonnel[] {
  const ranked = candidates
    .filter((c) => isAvailableForNearest(c.operationalStatus))
    .map((c) => {
      const distance = euclideanDistance(target, { mapX: c.mapX, mapY: c.mapY });
      const selectionReason = buildSelectionReason(c, distance);
      return { ...c, distance, selectionReason };
    })
    .sort((a, b) => {
      if (a.isFresh !== b.isFresh) return a.isFresh ? -1 : 1;
      return a.distance - b.distance;
    });

  return ranked.slice(0, limit);
}

function buildSelectionReason(c: NearestPersonnelCandidate, distance: number): string {
  const distLabel = distance.toFixed(1);
  if (c.locationSource === 'zone_fallback') {
    return `أقرب حسب إحداثيات المنطقة (مسافة ${distLabel})`;
  }
  if (!c.isFresh) {
    return `موقع قديم — أقرب متاح (مسافة ${distLabel})`;
  }
  return `أقرب موقع حي (مسافة ${distLabel})`;
}
