import { api } from './client';
import type {
  AnalysisState, AuthResponse, CreateAnalysisRequest, CreateAnalysisResponse, HistoryItem, Paged, Presentation,
  PresentationDetail, Purpose, Report, StartAnalysisResponse, UploadTicket, User,
} from './types';

// A1 ~ N6 (명세 3장)
export const signup = (body: { email: string; password: string; nickname: string }) => api.post<AuthResponse>('/auth/signup', body).then((r) => r.data);
export const login = (body: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', body).then((r) => r.data);
export const getMe = () => api.get<User>('/users/me').then((r) => r.data);

export const createPresentation = (body: { title: string; purpose: Purpose; timeLimitSec?: number }) =>
  api.post<Presentation>('/presentations', body).then((r) => r.data);
export const listPresentations = (page = 1, size = 20) =>
  api.get<Paged<Presentation>>('/presentations', { params: { page, size } }).then((r) => r.data);
export const getPresentation = (id: string) => api.get<PresentationDetail>(`/presentations/${id}`).then((r) => r.data);
export const updatePresentation = (id: string, body: Partial<{ title: string; purpose: Purpose; timeLimitSec: number | null }>) =>
  api.patch<Presentation>(`/presentations/${id}`, body).then((r) => r.data);
export const deletePresentation = (id: string) => api.delete(`/presentations/${id}`).then(() => undefined);
export const getSlidesUploadUrl = (id: string, body: { fileName: string; contentType: string; fileSize: number }) =>
  api.post<UploadTicket>(`/presentations/${id}/slides/upload-url`, body).then((r) => r.data);
export const getHistory = (id: string) => api.get<{ items: HistoryItem[] }>(`/presentations/${id}/history`).then((r) => r.data);

export const createAnalysis = (presentationId: string, body: CreateAnalysisRequest) =>
  api.post<CreateAnalysisResponse>(`/presentations/${presentationId}/analyses`, body).then((r) => r.data);
export const startAnalysis = (analysisId: string) =>
  api.post<StartAnalysisResponse>(`/analyses/${analysisId}/start`).then((r) => r.data);
export const getAnalysis = (analysisId: string) => api.get<AnalysisState>(`/analyses/${analysisId}`).then((r) => r.data);
export const getReport = (analysisId: string) => api.get<Report>(`/analyses/${analysisId}/report`).then((r) => r.data);
export const getVideoUrl = (analysisId: string) =>
  api.get<{ videoUrl: string; expiresInSec: number }>(`/analyses/${analysisId}/video-url`).then((r) => r.data);
export const deleteAnalysis = (analysisId: string) => api.delete(`/analyses/${analysisId}`).then(() => undefined);
