import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { PaginatedResponse } from '../types/director';
import type {
  CancelTaskPayload,
  CompleteTaskPayload,
  CreateTaskPayload,
  EscalateTaskPayload,
  ListTasksParams,
  OperationalTask,
  RejectTaskPayload,
  TaskEvidence,
  TaskEvidenceUploadPayload,
  TaskTimelineEntry,
  UpdateTaskPayload,
  WaitTaskPayload,
} from '../types/tasks';

export const TASKS_QUERY_KEYS = {
  all: ['tasks'] as const,
  list: (params?: ListTasksParams) => ['tasks', 'list', params] as const,
  my: (params?: ListTasksParams) => ['tasks', 'my', params] as const,
  overdue: (params?: ListTasksParams) => ['tasks', 'overdue', params] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  timeline: (id: string) => ['tasks', 'timeline', id] as const,
};

export async function listTasks(
  params: ListTasksParams = {},
): Promise<PaginatedResponse<OperationalTask>> {
  const { data } = await apiClient.get<
    ApiResponse<OperationalTask[]> & { meta: PaginatedResponse<OperationalTask>['meta'] }
  >('/tasks', { params });
  return { data: data.data, meta: data.meta };
}

export async function listMyTasks(
  params: ListTasksParams = {},
): Promise<PaginatedResponse<OperationalTask>> {
  const { data } = await apiClient.get<
    ApiResponse<OperationalTask[]> & { meta: PaginatedResponse<OperationalTask>['meta'] }
  >('/tasks/my', { params });
  return { data: data.data, meta: data.meta };
}

export async function listOverdueTasks(
  params: ListTasksParams = {},
): Promise<PaginatedResponse<OperationalTask>> {
  const { data } = await apiClient.get<
    ApiResponse<OperationalTask[]> & { meta: PaginatedResponse<OperationalTask>['meta'] }
  >('/tasks/overdue', { params });
  return { data: data.data, meta: data.meta };
}

export async function getTask(id: string): Promise<OperationalTask> {
  const { data } = await apiClient.get<ApiResponse<OperationalTask>>(`/tasks/${id}`);
  return data.data;
}

export async function getTaskTimeline(id: string): Promise<TaskTimelineEntry[]> {
  const { data } = await apiClient.get<ApiResponse<TaskTimelineEntry[]>>(`/tasks/${id}/timeline`);
  return data.data;
}

export async function createTask(payload: CreateTaskPayload): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>('/tasks', payload);
  return data.data;
}

export async function updateTask(
  id: string,
  payload: UpdateTaskPayload,
): Promise<OperationalTask> {
  const { data } = await apiClient.patch<ApiResponse<OperationalTask>>(`/tasks/${id}`, payload);
  return data.data;
}

export async function acceptTask(id: string): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>(`/tasks/${id}/accept`);
  return data.data;
}

export async function startTask(id: string): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>(`/tasks/${id}/start`);
  return data.data;
}

export async function waitTask(id: string, payload: WaitTaskPayload = {}): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>(
    `/tasks/${id}/wait`,
    payload,
  );
  return data.data;
}

export async function completeTask(
  id: string,
  payload: CompleteTaskPayload = {},
): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>(
    `/tasks/${id}/complete`,
    payload,
  );
  return data.data;
}

export async function rejectTask(
  id: string,
  payload: RejectTaskPayload,
): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>(
    `/tasks/${id}/reject`,
    payload,
  );
  return data.data;
}

export async function cancelTask(
  id: string,
  payload: CancelTaskPayload = {},
): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>(
    `/tasks/${id}/cancel`,
    payload,
  );
  return data.data;
}

export async function escalateTask(
  id: string,
  payload: EscalateTaskPayload = {},
): Promise<OperationalTask> {
  const { data } = await apiClient.post<ApiResponse<OperationalTask>>(
    `/tasks/${id}/escalate`,
    payload,
  );
  return data.data;
}

export async function addTaskEvidence(
  id: string,
  payload: TaskEvidenceUploadPayload,
): Promise<TaskEvidence> {
  const { data } = await apiClient.post<ApiResponse<TaskEvidence>>(
    `/tasks/${id}/evidence`,
    payload,
  );
  return data.data;
}

export async function deleteTask(id: string): Promise<{ deleted: boolean }> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/tasks/${id}`);
  return data.data;
}
