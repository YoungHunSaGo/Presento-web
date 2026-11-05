import { http, HttpResponse, delay } from 'msw';
import type { AnalysisState, MyInsights, MyStats, Period, Presentation, Purpose } from '@/api/types';
import {
  filterSeed, insightsFor, mockDetail, mockHistory, mockInsights, mockInsightsInsufficient, mockPresentations, mockReport, mockReportAttempt1,
  mockStats, mockTimelineSeed, mockUser, statsFrom,
} from './data';

const B = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
const err = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message, details: null } }, { status });
const authed = (req: Request) => (req.headers.get('Authorization') ?? '').startsWith('Bearer ');

const presentations: Presentation[] = [...mockPresentations];
// 명세 6장: N3 목업은 호출될 때마다 progress 가 올라가다 COMPLETED 가 된다.
const analyses = new Map<string, AnalysisState>();
// 업로드 URL로 PUT이 끝난 영상 키(videos/<analysisId>). 서버처럼 N2에서 업로드 여부를 본다.
const uploadedVideos = new Set<string>();
const STAGE_AT = (p: number) => (p < 10 ? 'EXTRACTING_AUDIO' : p < 40 ? 'TRANSCRIBING' : p < 65 ? 'ANALYZING_NONVERBAL' : p < 80 ? 'ANALYZING_CONTENT' : 'GENERATING_FEEDBACK') as AnalysisState['stage'];

// ---- 마이페이지 M1–M3 ----
// 개발용 전환: 화면 주소에 ?mock= 를 붙이면 목업 응답이 바뀐다(MSW 핸들러는 페이지에서 돌아 location 이 화면 주소다).
//   ?mock=insufficient     완료 2회. M2 가 INSUFFICIENT_DATA(명세 '데이터 부족 예'), M1·M3 은 2회분
//   ?mock=empty            완료 0회 빈 상태
//   ?mock=error            세 API 모두 500 INTERNAL_ERROR
//   ?mock=error-stats | error-insights | error-timeline   그 API 하나만 500 (나머지 영역은 그려지는지 확인용)
// 필터도 목업 결과를 바꾼다: 목적=수업 발표는 약점 없음, 목적=면접은 강점 없음, 목적=피칭·대회·기타는 완료 0회.
// 기간은 목업 회차가 모두 최근 2주 안이라 from·period 값만 바뀐다.
const PERIODS: Period[] = ['30d', '90d', 'all'];
const PURPOSES: Purpose[] = ['INTERVIEW', 'CLASS', 'PITCH', 'ETC'];
const mockMode = () => new URLSearchParams(location.search).get('mock');
type MypageQuery = { period: Period; purpose: Purpose | null; limit: number };
/** 명세 3장 공통 쿼리 검사. 틀리면 400 응답을, 맞으면 읽은 값을 돌려준다. 빈 purpose(`purpose=`)는 전체로 본다. */
function mypageQuery(req: Request, api: 'stats' | 'insights' | 'timeline'): Response | MypageQuery {
  if (!authed(req)) return err(401, 'UNAUTHORIZED', '다시 로그인해 주세요.');
  const mode = mockMode();
  if (mode === 'error' || mode === `error-${api}`) return err(500, 'INTERNAL_ERROR', '잠시 후 다시 시도해 주세요.');
  const q = new URL(req.url).searchParams;
  const period = (q.get('period') ?? 'all') as Period; const purpose = (q.get('purpose') || null) as Purpose | null;
  const limitRaw = q.get('limit') ?? '50'; const limit = Number(limitRaw);
  if (!PERIODS.includes(period)) return err(400, 'VALIDATION_ERROR', 'period 는 30d, 90d, all 중 하나여야 해요.');
  if (purpose && !PURPOSES.includes(purpose)) return err(400, 'VALIDATION_ERROR', 'purpose 는 INTERVIEW, CLASS, PITCH, ETC 중 하나여야 해요.');
  if (!/^\d+$/.test(limitRaw) || limit < 1 || limit > 200) return err(400, 'VALIDATION_ERROR', 'limit 은 1~200 사이여야 해요.');
  return { period, purpose, limit };
}
// 전환·필터에 맞는 완료 회차 목록
const mypageSeed = ({ period, purpose }: MypageQuery) => {
  const mode = mockMode();
  if (mode === 'empty') return [];
  if (mode === 'insufficient') return mockTimelineSeed.slice(-2);
  return filterSeed(period, purpose);
};

export const handlers = [
  http.post(`${B}/auth/signup`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; nickname: string };
    if (!body.password || body.password.length < 8) return err(400, 'VALIDATION_ERROR', '비밀번호는 8자 이상이어야 해요.');
    if (body.email === 'taken@ycu.ac.kr') return err(409, 'EMAIL_ALREADY_EXISTS', '이미 가입된 이메일이에요.');
    return HttpResponse.json({ accessToken: 'mock-token', user: { ...mockUser, email: body.email, nickname: body.nickname } }, { status: 201 });
  }),
  http.post(`${B}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    await delay(300);
    if (body.password !== 'presento1234') return err(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 맞지 않아요.');
    return HttpResponse.json({ accessToken: 'mock-token', user: { ...mockUser, email: body.email } });
  }),
  http.get(`${B}/users/me`, ({ request }) => (authed(request) ? HttpResponse.json(mockUser) : err(401, 'UNAUTHORIZED', '다시 로그인해 주세요.'))),
  // 경로가 /users/me 아래라 위 핸들러와 겹치지 않게 각각 정확한 경로로 둔다.
  http.get(`${B}/users/me/stats`, async ({ request }) => {
    const q = mypageQuery(request, 'stats'); if (q instanceof Response) return q;
    await delay(300);
    const seed = mypageSeed(q);
    // 필터 없는 기본 요청은 명세 예시 그대로
    const body: MyStats = seed.length === mockTimelineSeed.length && q.period === 'all' ? mockStats : statsFrom(seed, q.period);
    return HttpResponse.json(body);
  }),
  http.get(`${B}/users/me/insights`, async ({ request }) => {
    const q = mypageQuery(request, 'insights'); if (q instanceof Response) return q;
    await delay(450);
    const n = mypageSeed(q).length;
    const body: MyInsights = mockMode() === 'insufficient' ? mockInsightsInsufficient
      : q.purpose === 'CLASS' ? insightsFor(n, { FILLER: { score: 71, trend: 'UP', change: 9 }, PACE: { score: 72, trend: 'UP', change: 5 } })
        : q.purpose === 'INTERVIEW' ? insightsFor(n, { GAZE: { score: 79, trend: 'FLAT', change: -2 } })
          : n === mockTimelineSeed.length ? mockInsights : insightsFor(n);
    return HttpResponse.json(body);
  }),
  http.get(`${B}/users/me/score-timeline`, async ({ request }) => {
    const q = mypageQuery(request, 'timeline'); if (q instanceof Response) return q;
    await delay(350);
    const seed = mypageSeed(q);
    // 최근 limit 개를 오래된 순으로. total 은 자르기 전 개수.
    return HttpResponse.json({ items: seed.slice(-q.limit).map(({ practiceSec: _, ...item }) => item), total: seed.length });
  }),

  http.get(`${B}/presentations`, () => HttpResponse.json({ items: presentations, page: 1, size: 20, total: presentations.length })),
  http.post(`${B}/presentations`, async ({ request }) => {
    const body = (await request.json()) as Pick<Presentation, 'title' | 'purpose'> & { timeLimitSec?: number };
    if (!body.title?.trim()) return err(400, 'VALIDATION_ERROR', '발표 제목을 입력해 주세요.');
    const p: Presentation = { id: `p-${Math.random().toString(16).slice(2, 6)}`, title: body.title, purpose: body.purpose, timeLimitSec: body.timeLimitSec ?? null, hasSlides: false, attemptCount: 0, latestScore: null, createdAt: new Date().toISOString() };
    presentations.unshift(p);
    return HttpResponse.json(p, { status: 201 });
  }),
  http.get(`${B}/presentations/:id`, ({ params }) => {
    const p = presentations.find((x) => x.id === params.id);
    return p ? HttpResponse.json(mockDetail(p)) : err(404, 'NOT_FOUND', '발표를 찾을 수 없어요.');
  }),
  http.patch(`${B}/presentations/:id`, async ({ params, request }) => {
    const p = presentations.find((x) => x.id === params.id); if (!p) return err(404, 'NOT_FOUND', '발표를 찾을 수 없어요.');
    Object.assign(p, await request.json()); return HttpResponse.json(p);
  }),
  http.delete(`${B}/presentations/:id`, ({ params }) => {
    const i = presentations.findIndex((x) => x.id === params.id); if (i >= 0) presentations.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${B}/presentations/:id/slides/upload-url`, async ({ request }) => {
    const body = (await request.json()) as { fileSize: number; contentType: string };
    if (body.contentType !== 'application/pdf') return err(415, 'UNSUPPORTED_FILE_TYPE', 'PDF 파일만 올릴 수 있어요.');
    if (body.fileSize > 20 * 1024 * 1024) return err(413, 'FILE_TOO_LARGE', 'PDF는 20MB 이하만 업로드할 수 있어요.');
    return HttpResponse.json({ uploadUrl: 'https://presento-bucket.s3.amazonaws.com/slides/mock', method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, expiresInSec: 600 });
  }),
  http.get(`${B}/presentations/:id/history`, ({ params }) => HttpResponse.json({ items: params.id === 'p-7f3c' ? mockHistory : [] })),

  http.post(`${B}/presentations/:id/analyses`, async ({ params, request }) => {
    const body = (await request.json()) as { contentType: string; fileSize: number };
    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(body.contentType.split(';')[0])) return err(415, 'UNSUPPORTED_FILE_TYPE', 'mp4, mov, webm 영상만 올릴 수 있어요.');
    if (body.fileSize > 2 * 1024 * 1024 * 1024) return err(413, 'FILE_TOO_LARGE', '영상은 2GB 이하만 업로드할 수 있어요.');
    const id = `a-${Math.random().toString(16).slice(2, 6)}`;
    analyses.set(id, { analysisId: id, presentationId: String(params.id), attemptNo: 4, status: 'WAITING_UPLOAD', stage: null, progress: 0, error: null, createdAt: new Date().toISOString(), completedAt: null });
    return HttpResponse.json({ analysisId: id, attemptNo: 4, status: 'WAITING_UPLOAD', upload: { uploadUrl: `https://presento-bucket.s3.amazonaws.com/videos/${id}`, method: 'PUT', headers: { 'Content-Type': body.contentType }, expiresInSec: 900 } }, { status: 201 });
  }),
  http.put('https://presento-bucket.s3.amazonaws.com/*', async ({ request }) => {
    await delay(600);
    const m = new URL(request.url).pathname.match(/^\/videos\/([^/]+)$/); if (m) uploadedVideos.add(m[1]);
    return new HttpResponse(null, { status: 200 });
  }),
  http.post(`${B}/analyses/:id/start`, ({ params }) => {
    const a = analyses.get(String(params.id)); if (!a) return err(404, 'NOT_FOUND', '분석 회차를 찾을 수 없어요.');
    // 서버처럼 이미 시작한 회차는 되돌리지 않고 현재 상태만 알려준다.
    if (a.status === 'WAITING_UPLOAD') {
      if (!uploadedVideos.has(a.analysisId)) return err(409, 'UPLOAD_NOT_FOUND', '영상 업로드가 아직 끝나지 않았어요. 업로드를 마친 뒤 다시 시도해 주세요.');
      a.status = 'QUEUED';
    }
    return HttpResponse.json({ analysisId: a.analysisId, status: a.status }, { status: 202 });
  }),
  http.get(`${B}/analyses/:id`, ({ params }) => {
    const id = String(params.id);
    let a = analyses.get(id);
    if (!a) a = { analysisId: id, presentationId: 'p-7f3c', attemptNo: 3, status: 'COMPLETED', stage: null, progress: 100, error: null, createdAt: mockReport.createdAt, completedAt: mockReport.createdAt };
    if (a.status === 'QUEUED' || a.status === 'PROCESSING') {
      a.status = 'PROCESSING'; a.progress = Math.min(100, a.progress + 9); a.stage = STAGE_AT(a.progress);
      if (a.progress >= 100) { a.status = 'COMPLETED'; a.stage = null; a.completedAt = new Date().toISOString(); }
    }
    if (id === 'a-55e0') a = { ...a, attemptNo: 2, status: 'FAILED', stage: 'TRANSCRIBING', progress: 18, error: { code: 'NO_SPEECH_DETECTED', message: '영상에서 목소리를 찾지 못했어요.' } };
    return HttpResponse.json(a);
  }),
  http.get(`${B}/analyses/:id/report`, ({ params }) => {
    const a = analyses.get(String(params.id));
    if (a && a.status !== 'COMPLETED') return err(409, 'ANALYSIS_NOT_READY', '아직 분석 중이에요.');
    if (params.id === 'a-1c4f') return HttpResponse.json(mockReportAttempt1);
    return HttpResponse.json({ ...mockReport, analysisId: String(params.id), attemptNo: a?.attemptNo ?? mockReport.attemptNo });
  }),
  // 목업에는 실제 영상이 없어 빈 URL을 준다. 플레이어는 이 경우 내부 시계로 재생을 흉내 낸다.
  // 서버처럼 업로드 전 회차는 409. a-novideo 는 리포트는 있고 영상만 없는 경우를 화면에서 확인하는 용도.
  http.get(`${B}/analyses/:id/video-url`, ({ params }) => {
    if (analyses.get(String(params.id))?.status === 'WAITING_UPLOAD' || params.id === 'a-novideo') return err(409, 'UPLOAD_NOT_FOUND', '아직 업로드된 영상이 없어요.');
    // a-expired: 업로드 후 7일이 지나 원본 영상만 지워진 회차(410 VIDEO_EXPIRED).
    if (params.id === 'a-expired') return err(410, 'VIDEO_EXPIRED', '보관 기간(7일)이 지나 영상이 삭제됐어요. 리포트는 그대로 볼 수 있어요.');
    return HttpResponse.json({ videoUrl: '', expiresInSec: 3600 });
  }),
  http.delete(`${B}/analyses/:id`, () => new HttpResponse(null, { status: 204 })),
];
