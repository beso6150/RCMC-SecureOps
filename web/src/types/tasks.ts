export type TaskStatus =
  | 'NEW'
  | 'PENDING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'OVERDUE';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type OperationalTaskType =
  | 'SECURITY_RESPONSE'
  | 'PATROL'
  | 'CHECKPOINT'
  | 'INCIDENT_FOLLOW_UP'
  | 'CCTV_FOLLOW_UP'
  | 'PERMIT_VERIFICATION'
  | 'VISITOR_ASSISTANCE'
  | 'VEHICLE_CHECK'
  | 'HANDOVER'
  | 'REPORT_REVIEW'
  | 'GENERAL';

export type TaskUpdateType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'STARTED'
  | 'NOTE_ADDED'
  | 'EVIDENCE_ADDED'
  | 'WAITING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'REASSIGNED'
  | 'CANCELLED'
  | 'OVERDUE';

export interface TaskUserRef {
  id: string;
  fullName: string;
  employeeNumber: string;
}

export interface TaskEvidence {
  id: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  createdAt: string;
}

export interface OperationalTask {
  id: string;
  taskNumber: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: OperationalTaskType;
  assigneeId: string;
  assignerId: string | null;
  assignedGroupId: string | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  requiresEvidence: boolean;
  entityType: string | null;
  entityId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskUserRef;
  assigner?: TaskUserRef | null;
  evidences?: TaskEvidence[];
}

export interface TaskTimelineEntry {
  id: string;
  taskId: string;
  userId: string;
  updateType: TaskUpdateType;
  oldStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  message: string | null;
  createdAt: string;
  user?: TaskUserRef;
}

export interface ListTasksParams {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: OperationalTaskType;
  assigneeId?: string;
  mine?: boolean;
  overdue?: boolean;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: OperationalTaskType;
  assigneeId: string;
  assignedGroupId?: string | null;
  dueAt?: string | null;
  requiresEvidence?: boolean;
  entityType?: string | null;
  entityId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  notifyAssignee?: boolean;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueAt?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  requiresEvidence?: boolean;
}

export interface CompleteTaskPayload {
  completionNotes?: string | null;
}

export interface RejectTaskPayload {
  reason: string;
}

export interface CancelTaskPayload {
  reason?: string;
}

export interface WaitTaskPayload {
  note?: string;
}

export interface EscalateTaskPayload {
  note?: string;
}

export interface TaskEvidenceUploadPayload {
  originalFileName: string;
  mimeType: string;
  contentBase64: string;
  description?: string | null;
}
