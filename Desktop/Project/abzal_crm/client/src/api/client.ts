import type { CasePayload, SessionUser } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path = '') {
  return `${API_URL}${path}`;
}

export function getToken() {
  return localStorage.getItem('crm_token');
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem('crm_token', token);
  localStorage.setItem('crm_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user');
}

export function getCurrentUser(): SessionUser | null {
  const raw = localStorage.getItem('crm_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Ошибка запроса');
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  register: (name: string, username: string, password: string) =>
    request<{ token: string; user: SessionUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, password })
    }),
  listCases: (params: URLSearchParams) => request(`/api/cases?${params.toString()}`),
  getCase: (id: string) => request(`/api/cases/${id}`),
  createCase: (payload: CasePayload) =>
    request('/api/cases', { method: 'POST', body: JSON.stringify(payload) }),
  updateCase: (id: string, payload: CasePayload) =>
    request(`/api/cases/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCase: (id: string) => request(`/api/cases/${id}`, { method: 'DELETE' }),
  acknowledgeControlDate: (id: string) => request(`/api/cases/control-dates/${id}/acknowledge`, { method: 'POST' }),
  dictionaries: () => request<{ workStatuses: string[]; dgds: string[] }>('/api/cases/dictionaries'),
  runNotifications: () => request('/api/notifications/run', { method: 'POST', body: JSON.stringify({}) })
  ,
  dashboard: () => request('/api/cases/dashboard')
};
