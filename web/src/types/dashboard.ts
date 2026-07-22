import type { ShiftOpsBoard } from './shifts';

export interface ChartPoint {
  name: string;
  value: number;
}

export interface VisitorsByDayPoint {
  day: string;
  value: number;
}

export interface DashboardSummary {
  todaysViolations: number;
  todaysVisitors: number;
  openIncidents: number;
  unreadNotifications: number;
  pendingTasks: number;
  overdueTasks: number;
  averageResponseMs: number | null;
  averageResponseMinutes: number | null;
  shifts?: ShiftOpsBoard;
  charts: {
    violationsByLocation: ChartPoint[];
    incidentsByType: ChartPoint[];
    visitorsByDay: VisitorsByDayPoint[];
    averageResponseTime: {
      milliseconds: number | null;
      minutes: number | null;
    };
    sla: {
      onTime: number;
      breached: number;
      total: number;
    };
  };
  tables: {
    latestViolations: LatestViolation[];
    latestIncidents: LatestIncident[];
    latestVisitors: LatestVisitor[];
    unreadNotifications: UnreadNotification[];
  };
  lastSyncHint: string;
}

export interface LatestViolation {
  id: string;
  plateNumber: string;
  status: string;
  parkingCode: string | null;
  createdAt: string;
  violationType: string | null;
}

export interface LatestIncident {
  id: string;
  title: string;
  status: string;
  severity: string;
  typeNameAr: string | null;
  createdAt: string;
}

export interface LatestVisitor {
  id: string;
  visitorName: string;
  status: string;
  visitDate: string | null;
  createdAt: string;
}

export interface UnreadNotification {
  id: string;
  title: string;
  body: string | null;
  status: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    employeeNumber: string;
  } | null;
}

export interface DashboardRefreshEvent {
  reason?: string;
}
