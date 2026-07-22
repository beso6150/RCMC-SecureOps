import { apiClient, clearAuthStorage, setMustChangePassword, setTokens } from './client';
import type {
  ApiResponse,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  TokenPair,
} from '../types/auth';

export async function login(payload: LoginPayload): Promise<TokenPair> {
  const { data } = await apiClient.post<ApiResponse<TokenPair>>('/auth/login', payload);
  setTokens(data.data.accessToken, data.data.refreshToken);
  setMustChangePassword(data.data.mustChangePassword);
  return data.data;
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const { data } = await apiClient.post<ApiResponse<TokenPair>>('/auth/refresh', {
    refreshToken,
  });
  setTokens(data.data.accessToken, data.data.refreshToken);
  setMustChangePassword(data.data.mustChangePassword);
  return data.data;
}

export async function logout(refreshToken?: string): Promise<void> {
  try {
    await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
  } finally {
    clearAuthStorage();
  }
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post('/auth/change-password', payload);
  clearAuthStorage();
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
  return data.data;
}
