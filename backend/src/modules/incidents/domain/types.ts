import {
  IncidentHistoryAction,
  IncidentSeverity,
  IncidentStatus,
  ParkingLocationCode,
  Prisma,
} from '@prisma/client';

export interface CreateIncidentData {
  typeId: string;
  title: string;
  description: string;
  notes?: string | null;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  incidentNumber?: string | null;
  source?: import('@prisma/client').IncidentSource | null;
  parkingCode?: ParkingLocationCode | null;
  floorId?: string | null;
  meetingRoomId?: string | null;
  locationId?: string | null;
  zoneId?: string | null;
  checkpointId?: string | null;
  patrolSessionId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  shiftId?: string | null;
  reporterId: string;
  assigneeId?: string | null;
  supervisorId?: string | null;
  opsManagerId?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  occurredAt?: Date;
  reportedAt?: Date | null;
  startedAt?: Date | null;
  slaDueAt?: Date | null;
  clientSyncId?: string | null;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
    localPath?: string | null;
  }>;
}

export interface UpdateIncidentData {
  typeId?: string;
  title?: string;
  description?: string;
  notes?: string | null;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  parkingCode?: ParkingLocationCode | null;
  floorId?: string | null;
  meetingRoomId?: string | null;
  locationId?: string | null;
  zoneId?: string | null;
  checkpointId?: string | null;
  patrolSessionId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  shiftId?: string | null;
  assigneeId?: string | null;
  supervisorId?: string | null;
  opsManagerId?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  startedAt?: Date | null;
  closedAt?: Date | null;
  resolvedAt?: Date | null;
  slaDueAt?: Date | null;
  durationMs?: number | null;
  pdfPath?: string | null;
}

export interface IncidentListFilters {
  page?: number;
  pageSize?: number;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  typeId?: string;
  typeCode?: string;
  parkingCode?: ParkingLocationCode;
  locationId?: string;
  floorId?: string;
  meetingRoomId?: string;
  reporterId?: string;
  assigneeId?: string;
  supervisorId?: string;
  opsManagerId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface AddIncidentHistoryData {
  incidentId: string;
  action: IncidentHistoryAction;
  actorId?: string | null;
  fromStatus?: IncidentStatus | null;
  toStatus?: IncidentStatus | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: typeof incidentInclude;
}>;

export const incidentInclude = {
  type: true,
  floor: true,
  meetingRoom: true,
  location: true,
  shift: true,
  reporter: { select: { id: true, fullName: true, employeeNumber: true, roleId: true } },
  assignee: { select: { id: true, fullName: true, employeeNumber: true } },
  supervisor: { select: { id: true, fullName: true, employeeNumber: true } },
  opsManager: { select: { id: true, fullName: true, employeeNumber: true } },
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
  },
  comments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, fullName: true, employeeNumber: true } },
    },
  },
  history: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      actor: { select: { id: true, fullName: true, employeeNumber: true } },
    },
  },
  responseTimes: {
    orderBy: { startedAt: 'asc' as const },
  },
} satisfies Prisma.IncidentInclude;
