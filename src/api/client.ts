import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from './types';

export const TOKEN_KEY = 'presento.accessToken';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 명세 1장: 401(UNAUTHORIZED)을 받으면 로그인 화면으로 이동. 로그인 실패(INVALID_CREDENTIALS)는 화면에서 처리.
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiErrorBody>) => {
    const code = error.response?.data?.error?.code;
    if (error.response?.status === 401 && code !== 'INVALID_CREDENTIALS') {
      localStorage.removeItem(TOKEN_KEY);
      if (!['/login', '/signup'].includes(window.location.pathname)) window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** 명세 1장 에러 형식의 message 를 그대로 꺼낸다. */
export function errorMessage(err: unknown, fallback = '잠시 후 다시 시도해 주세요.'): string {
  const e = err as AxiosError<ApiErrorBody>;
  return e?.response?.data?.error?.message ?? fallback;
}
export function errorCode(err: unknown): string | undefined {
  return (err as AxiosError<ApiErrorBody>)?.response?.data?.error?.code;
}

/** 발급받은 업로드 URL로 직접 PUT. 인증 헤더가 붙지 않도록 인스턴스가 아닌 기본 axios 사용(명세 N1). */
export async function putToUploadUrl(
  ticket: { uploadUrl: string; headers: Record<string, string> },
  body: Blob,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  await axios.put(ticket.uploadUrl, body, {
    headers: ticket.headers,
    signal,
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / (e.total ?? body.size ?? 1)) * 100)),
  });
}
