import { api } from './client';
import type {
  AnalysisState, AuthResponse, CreateAnalysisRequest, CreateAnalysisResponse, HistoryItem, MyInsights, MyStats, Paged, Period,
  Presentation, PresentationDetail, Purpose, Report, ScoreTimeline, StartAnalysisResponse, UploadTicket, User,
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

// M1 ~ M3 (presento-mypage-spec.md 3·4장). purpose 가 null(목적 전체)이면 쿼리에서 아예 뺀다.
// axios 는 값이 undefined 인 params 를 보내지 않는다.
const mypageParams = (period: Period, purpose: Purpose | null) => ({ period, purpose: purpose ?? undefined });
export const getMyStats = (period: Period, purpose: Purpose | null) =>
  api.get<MyStats>('/users/me/stats', { params: mypageParams(period, purpose) }).then((r) => r.data);
export const getMyInsights = (period: Period, purpose: Purpose | null) =>
  api.get<MyInsights>('/users/me/insights', { params: mypageParams(period, purpose) }).then((r) => r.data);
// limit 은 1~200, 서버 기본 50. 최근 limit 개를 오래된 순으로 준다.
export const getScoreTimeline = (period: Period, purpose: Purpose | null, limit = 50) =>
  api.get<ScoreTimeline>('/users/me/score-timeline', { params: { ...mypageParams(period, purpose), limit } }).then((r) => r.data);
