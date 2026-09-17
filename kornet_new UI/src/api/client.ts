import axios, { type AxiosRequestConfig } from 'axios';
import { COMPANY_HEADER_NAME } from '../config/companies';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';

const AUTH_ROUTES = ['/auth/login', '/auth/refresh', '/auth/logout'];

/** Bare instance for auth endpoints — never carries interceptors (avoids refresh recursion). */
export const authApi = axios.create({ baseURL: '/api' });

/** Main instance used by all data services. */
export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const isAuthRoute = AUTH_ROUTES.some((r) => url.includes(r));

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!isAuthRoute) {
    const company = useCompanyStore.getState().selectedCompanyCode;
    if (company) {
      config.headers = config.headers ?? {};
      config.headers[COMPANY_HEADER_NAME] = company;
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';
    const isAuthRoute = AUTH_ROUTES.some((r) => url.includes(r));

    if (status !== 401 || isAuthRoute || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = useAuthStore
        .getState()
        .refresh()
        .finally(() => {
          refreshPromise = null;
        });
    }
    const newToken = await refreshPromise;
    if (!newToken) return Promise.reject(error);

    original.headers = original.headers ?? {};
    (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
    return api(original);
  },
);

/** Convenience helpers returning parsed data. */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<T>(url, config);
  return res.data;
}
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<T>(url, body, config);
  return res.data;
}
export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.patch<T>(url, body, config);
  return res.data;
}
export async function apiDelete(url: string, config?: AxiosRequestConfig): Promise<void> {
  await api.delete(url, config);
}
