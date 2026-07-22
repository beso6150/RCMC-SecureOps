import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getSocketUrl, STORAGE_KEYS } from '../config/env';
import { SHIFTS_QUERY_KEYS } from '../api/shifts';
import { FIELD_OPS_QUERY_KEYS } from '../api/fieldOperations';
import { CCTV_OPS_QUERY_KEYS } from '../api/cctvOperations';
import { OPS_ROOM_QUERY_KEYS } from '../api/operationsRoom';
import { REPORTS_CENTER_QUERY_KEYS } from '../api/reportsCenter';
import { AUDIT_LOGS_QUERY_KEYS } from '../api/auditLogs';
import { NOTIFICATIONS_QUERY_KEYS } from '../api/notifications';
import { COMMUNICATIONS_QUERY_KEYS } from '../api/communications';
import { TASKS_QUERY_KEYS } from '../api/tasks';
import type { DashboardRefreshEvent } from '../types/dashboard';

export const DASHBOARD_QUERY_KEY = ['dashboard', 'summary'] as const;

let activeSocket: Socket | null = null;

export function getActiveSocket(): Socket | null {
  return activeSocket;
}

export function joinConversationRoom(conversationId: string): void {
  activeSocket?.emit('conversation:join', conversationId);
}

export function leaveConversationRoom(conversationId: string): void {
  activeSocket?.emit('conversation:leave', conversationId);
}

const CCTV_INVALIDATE_KEYS = [
  ['cctv'],
  ['violations'],
  ['incidents'],
  ['visitors'],
  ['camera-requests'],
] as const;

const DIRECTOR_INVALIDATE_KEYS = [['director'], ['complaints'], ['users'], ['reports']] as const;

const FIELD_OPS_SOCKET_EVENTS = [
  'field-map:refresh',
  'personnel:location-updated',
  'patrol:created',
  'patrol:updated',
  'patrol:started',
  'patrol:completed',
  'patrol:cancelled',
  'patrol:visit-recorded',
  'field-alert:created',
  'field-alert:updated',
  'field-alert:acknowledged',
  'field-alert:resolved',
  'incident:location-updated',
] as const;

const CCTV_OPS_SOCKET_EVENTS = [
  'permit:created',
  'permit:updated',
  'permit:shared',
  'permit:viewed',
  'permit:acknowledged',
  'security-referral:created',
  'security-referral:sent',
  'security-referral:assigned',
  'security-referral:received',
  'security-referral:started',
  'security-referral:arrived',
  'security-referral:updated',
  'security-referral:resolved',
  'security-referral:rejected',
  'security-referral:escalated',
  'security-referral:closed',
  'cctv-operations:dashboard-refresh',
] as const;

const INCIDENT_OPS_SOCKET_EVENTS = [
  'incident:created',
  'incident:updated',
  'incident:acknowledged',
  'incident:assessed',
  'incident:assigned',
  'incident:reassigned',
  'incident:responding',
  'incident:arrived',
  'incident:contained',
  'incident:resolved',
  'incident:closed',
  'incident:reopened',
  'incident:cancelled',
  'incident:false-alarm',
  'incident:escalated',
  'incident:support-requested',
  'incident:note-added',
  'incident:contact-logged',
  'incident:task-created',
  'incident:task-completed',
  'incident:follow-up-created',
  'incident:attachment-added',
  'operations-room:refresh',
  'operations-room:critical-alert',
] as const;

const REPORTS_SOCKET_EVENTS = [
  'report:created',
  'report:generated',
  'report:submitted',
  'report:approved',
  'report:rejected',
  'report:returned',
  'report:archived',
  'report:version-created',
  'report:export-ready',
  'reports:dashboard-refresh',
  'kpi:updated',
] as const;

const NOTIFICATION_SOCKET_EVENTS = [
  'notification:new',
  'notification:acknowledged',
  'notification:reminder',
  'notification:escalated',
  'notifications:dashboard-refresh',
] as const;

const COMMUNICATION_SOCKET_EVENTS = [
  'conversation:created',
  'conversation:updated',
  'conversation:closed',
  'message:new',
  'message:deleted',
  'message:attachment',
  'communications:unread-count',
] as const;

const TASK_SOCKET_EVENTS = [
  'task:updated',
  'task:escalated',
  'tasks:dashboard-refresh',
] as const;

export function useSocket(enabled: boolean): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) return;

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current = socket;
    activeSocket = socket;

    const invalidateDashboard = (_payload?: DashboardRefreshEvent) => {
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateCctvQueues = () => {
      for (const queryKey of CCTV_INVALIDATE_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    const invalidateDirector = () => {
      for (const queryKey of DIRECTOR_INVALIDATE_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateShifts = () => {
      void queryClient.invalidateQueries({ queryKey: SHIFTS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateFieldOps = () => {
      void queryClient.invalidateQueries({ queryKey: FIELD_OPS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateCctvOps = () => {
      void queryClient.invalidateQueries({ queryKey: CCTV_OPS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateIncidentOps = () => {
      void queryClient.invalidateQueries({ queryKey: OPS_ROOM_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ['incidents'] });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateReports = () => {
      void queryClient.invalidateQueries({ queryKey: REPORTS_CENTER_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateAuditLogs = () => {
      void queryClient.invalidateQueries({ queryKey: AUDIT_LOGS_QUERY_KEYS.all });
    };

    const invalidateNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateCommunications = () => {
      void queryClient.invalidateQueries({ queryKey: COMMUNICATIONS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    const invalidateTasks = () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    };

    socket.on('dashboard:refresh', invalidateDashboard);
    socket.on('cctv:refresh', invalidateCctvQueues);
    socket.on('camera_request:updated', invalidateCctvQueues);
    socket.on('director:refresh', invalidateDirector);
    socket.on('shifts:refresh', invalidateShifts);

    for (const eventName of FIELD_OPS_SOCKET_EVENTS) {
      socket.on(eventName, invalidateFieldOps);
    }

    for (const eventName of CCTV_OPS_SOCKET_EVENTS) {
      socket.on(eventName, invalidateCctvOps);
    }

    for (const eventName of INCIDENT_OPS_SOCKET_EVENTS) {
      socket.on(eventName, invalidateIncidentOps);
    }

    for (const eventName of REPORTS_SOCKET_EVENTS) {
      socket.on(eventName, invalidateReports);
    }

    for (const eventName of NOTIFICATION_SOCKET_EVENTS) {
      socket.on(eventName, invalidateNotifications);
    }

    for (const eventName of COMMUNICATION_SOCKET_EVENTS) {
      socket.on(eventName, invalidateCommunications);
    }

    for (const eventName of TASK_SOCKET_EVENTS) {
      socket.on(eventName, invalidateTasks);
    }

    socket.on('audit-log:critical-event', invalidateAuditLogs);

    return () => {
      socket.off('dashboard:refresh', invalidateDashboard);
      socket.off('cctv:refresh', invalidateCctvQueues);
      socket.off('camera_request:updated', invalidateCctvQueues);
      socket.off('director:refresh', invalidateDirector);
      socket.off('shifts:refresh', invalidateShifts);

      for (const eventName of FIELD_OPS_SOCKET_EVENTS) {
        socket.off(eventName, invalidateFieldOps);
      }

      for (const eventName of CCTV_OPS_SOCKET_EVENTS) {
        socket.off(eventName, invalidateCctvOps);
      }

      for (const eventName of INCIDENT_OPS_SOCKET_EVENTS) {
        socket.off(eventName, invalidateIncidentOps);
      }

      for (const eventName of REPORTS_SOCKET_EVENTS) {
        socket.off(eventName, invalidateReports);
      }

      for (const eventName of NOTIFICATION_SOCKET_EVENTS) {
        socket.off(eventName, invalidateNotifications);
      }

      for (const eventName of COMMUNICATION_SOCKET_EVENTS) {
        socket.off(eventName, invalidateCommunications);
      }

      for (const eventName of TASK_SOCKET_EVENTS) {
        socket.off(eventName, invalidateTasks);
      }

      socket.off('audit-log:critical-event', invalidateAuditLogs);

      socket.disconnect();
      socketRef.current = null;
      if (activeSocket === socket) activeSocket = null;
    };
  }, [enabled, queryClient]);
}
