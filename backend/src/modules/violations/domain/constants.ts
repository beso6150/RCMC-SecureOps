import { ParkingLocationCode, ViolationType, VehicleViolationStatus } from '@prisma/client';

export const PARKING_LOCATIONS: Array<{
  code: ParkingLocationCode;
  locationCode: string;
  nameEn: string;
  nameAr: string;
}> = [
  {
    code: ParkingLocationCode.GROUND_PARKING,
    locationCode: 'GROUND_PARKING',
    nameEn: 'Ground Parking',
    nameAr: 'موقف الأرضي',
  },
  {
    code: ParkingLocationCode.BASEMENT_PARKING,
    locationCode: 'BASEMENT_PARKING',
    nameEn: 'Basement Parking',
    nameAr: 'موقف السرداب',
  },
  {
    code: ParkingLocationCode.WEST_PARKING,
    locationCode: 'WEST_PARKING',
    nameEn: 'West Parking',
    nameAr: 'موقف الغرب',
  },
];

export const RESPONSE_METRIC_KEYS = {
  TOTAL_RESPONSE: 'VIOLATION_TOTAL_RESPONSE',
  ASSIGNMENT: 'VIOLATION_ASSIGNMENT',
} as const;

export const ALLOWED_STATUS_TRANSITIONS: Record<
  VehicleViolationStatus,
  VehicleViolationStatus[]
> = {
  NEW: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

export { ParkingLocationCode, ViolationType, VehicleViolationStatus };
