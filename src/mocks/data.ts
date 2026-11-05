// 명세 4·5장 예시 JSON을 바탕으로 한 목업 데이터. 필드는 명세 그대로이고, 배열 항목만 시연용으로 늘렸다.
import type {
  Attempt, Category, Feedback, Grade, HistoryItem, Insight, Metric, MyInsights, MyStats, Period, Presentation, PresentationDetail, Purpose, Report,
  ScoreTimelineItem, Segment, Trend, User, Word,
} from '@/api/types';

export const mockUser: User = { id: 'u-1a2b', email: 'student@ycu.ac.kr', nickname: '영훈', createdAt: '2026-11-03T17:04:00+09:00' };

export const mockPresentations: Presentation[] = [
  { id: 'p-7f3c', title: '캡스톤 중간 발표', purpose: 'CLASS', timeLimitSec: 300, hasSlides: true, attemptCount: 3, latestScore: 82, createdAt: '2026-11-03T17:10:00+09:00' },
  { id: 'p-2b81', title: '카카오 인턴 1차 면접', purpose: 'INTERVIEW', timeLimitSec: 180, hasSlides: false, attemptCount: 0, latestScore: null, createdAt: '2026-11-01T19:00:00+09:00' },
  { id: 'p-c40a', title: 'AI 경진대회 본선 피칭', purpose: 'PITCH', timeLimitSec: 420, hasSlides: true, attemptCount: 0, latestScore: null, createdAt: '2026-10-30T13:00:00+09:00' },
  { id: 'p-9e17', title: '동아리 신입 OT 소개', purpose: 'ETC', timeLimitSec: null, hasSlides: false, attemptCount: 0, latestScore: null, createdAt: '2026-10-28T10:00:00+09:00' },
];

export const mockDetail = (p: Presentation): PresentationDetail => {
  const attempts: Attempt[] = p.id === 'p-7f3c'
    ? [
        { analysisId: 'a-9d21', attemptNo: 3, status: 'COMPLETED', overallScore: 82, durationSec: 287.4, createdAt: '2026-11-05T20:00:00+09:00' },
        { analysisId: 'a-55e0', attemptNo: 2, status: 'FAILED', overallScore: null, durationSec: null, createdAt: '2026-11-04T21:30:00+09:00' },
        { analysisId: 'a-1c4f', attemptNo: 1, status: 'COMPLETED', overallScore: 64, durationSec: 312.0, createdAt: '2026-11-03T21:00:00+09:00' },
      ]
    : [];
  // 서버처럼 회차 수와 최근 점수는 attempts 에서 계산한다.
  const latest = attempts.find((a) => a.status === 'COMPLETED');
  return { ...p, attemptCount: attempts.length, latestScore: latest?.overallScore ?? null, attempts };
};

export const mockHistory: HistoryItem[] = [
  { attemptNo: 1, analysisId: 'a-1c4f', createdAt: '2026-11-03T21:00:00+09:00', overallScore: 64, scores: { DELIVERY: 58, NONVERBAL: 70, CONTENT: 65 }, fillerCount: 31, syllablesPerMin: 392 },
  { attemptNo: 3, analysisId: 'a-9d21', createdAt: '2026-11-05T20:00:00+09:00', overallScore: 82, scores: { DELIVERY: 80, NONVERBAL: 84, CONTENT: 81 }, fillerCount: 9, syllablesPerMin: 341 },
];

const FILLERS = new Set(['음', '이제', '약간']);
function seg(id: string, start: number, end: number, text: string, repeatIndex: number[] = []): Segment {
  const parts = text.split(' ');
  const step = (end - start) / parts.length;
  const words: Word[] = parts.map((w, i) => ({
    text: w, start: +(start + i * step).toFixed(2), end: +(start + (i + 0.9) * step).toFixed(2),
    tag: FILLERS.has(w) ? 'FILLER' : repeatIndex.includes(i) ? 'REPEAT' : null,
  }));
  return { id, start, end, text, words };
}

const feedbacks: Feedback[] = [
  { id: 'f-01', category: 'DELIVERY', type: 'PACE_FAST', severity: 'WARNING', start: 0.0, end: 31.2, title: '도입부 말이 빨라요',
    description: '첫 30초가 분당 402음절로 평균보다 18% 빨라요. 청중이 주제를 잡기 전에 넘어가요.',
    evidence: '오늘 저희가 발표할 주제는 AI 기반 발표 피드백 서비스인데요', suggestion: '첫 문장 뒤에 1초 쉬고, 주제 문장을 한 번 더 천천히 말해 보세요.' },
  { id: 'f-02', category: 'DELIVERY', type: 'FILLER', severity: 'WARNING', start: 95.2, end: 108.0, title: '추임새가 몰린 구간',
    description: "13초 동안 '이제' 1번, '약간' 2번이 나왔어요. 확신 없이 들릴 수 있어요.",
    evidence: '그래서 이제 약간 이 기능이 있으면 사용자가 약간 편하게 쓸 수 있을 것 같아서', suggestion: '개선 스크립트 탭의 다듬은 문장으로 다시 말해 보세요.' },
  { id: 'f-03', category: 'DELIVERY', type: 'LONG_SILENCE', severity: 'INFO', start: 161.0, end: 164.8, title: '3.8초 침묵',
    description: '5번에서 6번 슬라이드로 넘어가는 동안 말이 멈췄어요.', evidence: '(침묵)', suggestion: "'다음으로 ~를 보겠습니다'처럼 넘어가는 말을 미리 정해 두세요." },
  { id: 'f-04', category: 'NONVERBAL', type: 'GAZE_AWAY', severity: 'INFO', start: 190.0, end: 204.0, title: '화면 밖을 봤어요',
    description: '14초 동안 정면 시선 비율이 41%로 떨어졌어요. 메모를 읽은 것으로 보여요.', evidence: null, suggestion: '핵심 문장은 외워서 카메라를 보며 말해 보세요.' },
  { id: 'f-05', category: 'CONTENT', type: 'SLIDE_MISSED', severity: 'CRITICAL', start: 232.0, end: 245.0, title: '4번 슬라이드를 설명 없이 넘겼어요',
    description: "'경쟁 서비스 비교' 슬라이드를 설명하지 않았어요. 차별점의 근거라서 질문이 나오기 쉬워요.", evidence: '다음으로 넘어가서 수익 모델을 보면', suggestion: '기존 서비스와 다른 점 두 가지를 30초 안에 말해 보세요.' },
];

export const mockReport: Report = {
  analysisId: 'a-9d21', presentationId: 'p-7f3c', attemptNo: 3, purpose: 'CLASS', durationSec: 287.4, createdAt: '2026-11-05T20:00:00+09:00',
  overall: {
    score: 82, grade: 'B+',
    summary: "핵심 메시지가 분명하고 시선 처리가 안정적이에요. 도입부 말 속도와 '약간' 같은 추임새만 줄이면 좋아요.",
    strengths: ['결론에서 핵심을 다시 정리함', '정면 시선 비율이 높음'],
    improvements: ['도입 30초의 말 속도가 빠름', "'약간', '이제' 반복"],
  },
  scores: [
    { category: 'DELIVERY', label: '전달력', score: 80 },
    { category: 'NONVERBAL', label: '비언어', score: 84 },
    { category: 'CONTENT', label: '내용 구성', score: 81 },
  ],
  metrics: {
    speech: {
      syllablesPerMin: 341, paceSeries: [{ t: 0, value: 402 }, { t: 30, value: 355 }, { t: 60, value: 330 }, { t: 90, value: 338 }, { t: 120, value: 345 }, { t: 150, value: 336 }, { t: 180, value: 340 }, { t: 210, value: 332 }, { t: 240, value: 341 }, { t: 270, value: 329 }],
      fillerCount: 9, fillers: [{ word: '약간', count: 4 }, { word: '이제', count: 3 }, { word: '음', count: 2 }],
      silenceCount: 3, longestSilenceSec: 3.8, timeLimitSec: 300, overTimeSec: 0,
    },
    nonverbal: { gazeFrontRatio: 0.78, postureStability: 0.86, gesturePerMin: 6.2, lowConfidenceRanges: [{ start: 120.0, end: 128.5 }] },
  },
  feedbacks,
  transcript: {
    segments: [
      seg('s-001', 0.0, 6.4, '안녕하세요 음 오늘 저희가 발표할 주제는'),
      seg('s-002', 6.4, 13.0, 'AI 기반 발표 피드백 서비스 Presento입니다'),
      seg('s-003', 13.0, 24.0, '발표 연습을 할 때 저희는 저희는 늘 같은 고민을 했는데요', [5]),
      seg('s-004', 24.0, 38.0, '내가 어디서 틀렸는지 근거가 없다는 점이었습니다'),
      seg('s-005', 38.0, 51.0, '그래서 이제 영상을 올리면 고칠 장면만 잘라서 보여줍니다'),
      seg('s-006', 51.0, 58.0, '먼저 말 속도와 추임새를 분석하고'),
      seg('s-007', 58.0, 72.0, '다음으로 시선과 자세를 봅니다'),
      seg('s-008', 72.0, 95.2, '마지막으로 발표 내용이 슬라이드와 맞는지 확인합니다'),
      seg('s-014', 95.2, 108.0, '그래서 이제 약간 이 기능이 있으면 사용자가 약간 편하게 쓸 수 있을 것 같아서'),
      seg('s-015', 108.0, 120.0, '연습할 때마다 고칠 점을 바로 확인할 수 있습니다'),
    ],
  },
  improvedScripts: [
    { segmentId: 's-014', start: 95.2, end: 108.0, original: '그래서 이제 약간 이 기능이 있으면 사용자가 약간 편하게 쓸 수 있을 것 같아서',
      improved: '이 기능으로 사용자는 연습할 때마다 고칠 점을 바로 확인할 수 있습니다.', reason: "추임새를 빼고, '것 같다'를 단정형으로 바꿔 자신감 있게 들리게 했어요." },
    { segmentId: 's-001', start: 0.0, end: 6.4, original: '안녕하세요 음 오늘 저희가 발표할 주제는',
      improved: '안녕하세요. 오늘 소개할 서비스는 Presento입니다.', reason: '한 문장을 둘로 나눠서, 첫 문장 뒤에 자연스럽게 쉬는 자리가 생기게 했어요.' },
  ],
  expectedQuestions: [
    { question: '기존 발표 연습 앱과 무엇이 다른가요?', intent: '차별점 확인', answerTip: '타임스탬프 근거 피드백을 예시 화면과 함께 설명하세요.' },
    { question: '분석 결과가 맞는지는 어떻게 확인했나요?', intent: '신뢰성 검증', answerTip: '직접 녹화한 발표에서 사람이 표시한 구간과 비교한 결과가 있다면 숫자로 말하세요.' },
    { question: '올린 영상은 어디에 저장되고 언제 지워지나요?', intent: '개인정보', answerTip: '저장 위치와 보관 기간을 한 문장으로 준비하세요.' },
    { question: '대학생 말고 누가 쓸 수 있나요?', intent: '확장성', answerTip: '면접 준비생처럼 발표 목적 선택지에 이미 있는 사용자부터 말하세요.' },
    { question: '수익은 어떻게 내나요?', intent: '사업성', answerTip: '발표에서 짧게 지나간 수익 모델 부분을 이 답변으로 보완하세요.' },
  ],
  slideCoverage: [
    { page: 1, covered: true, note: null }, { page: 2, covered: true, note: null }, { page: 3, covered: true, note: null },
    { page: 4, covered: false, note: "'경쟁 서비스 비교' 슬라이드를 설명하지 않았어요." },
    { page: 5, covered: true, note: null }, { page: 6, covered: true, note: null }, { page: 7, covered: true, note: null }, { page: 8, covered: true, note: null },
  ],
};

// 1회차(a-1c4f) 리포트: 명세 P7 history 의 1회차 값(64점, 추임새 31회)에 맞춘 목업
export const mockReportAttempt1: Report = {
  ...mockReport, analysisId: 'a-1c4f', attemptNo: 1, durationSec: 312.0, createdAt: '2026-11-03T21:00:00+09:00',
  overall: { ...mockReport.overall, score: 64, grade: 'C+', summary: '내용은 준비됐지만 말 속도가 빠르고 추임새가 많아 핵심이 묻혀요.' },
  scores: [{ category: 'DELIVERY', label: '전달력', score: 58 }, { category: 'NONVERBAL', label: '비언어', score: 70 }, { category: 'CONTENT', label: '내용 구성', score: 65 }],
  metrics: { ...mockReport.metrics, speech: { ...mockReport.metrics.speech, syllablesPerMin: 392, fillerCount: 31, fillers: [{ word: '약간', count: 9 }, { word: '이제', count: 12 }, { word: '음', count: 10 }] },
    // 1회차는 카메라에 상반신이 안 잡혀 자세·제스처를 측정하지 못한 경우를 시연
    nonverbal: { ...mockReport.metrics.nonverbal, postureStability: null, gesturePerMin: null } },
  feedbacks: [
    { ...feedbacks[0], id: 'f-11', start: 0, end: 44, description: '첫 44초가 분당 415음절로 빨라요.' },
    { ...feedbacks[1], id: 'f-12', start: 58, end: 92 },
    { ...feedbacks[1], id: 'f-13', start: 110, end: 149 },
    { ...feedbacks[2], id: 'f-14', start: 171, end: 180 },
    { ...feedbacks[1], id: 'f-15', start: 201, end: 228 },
    { ...feedbacks[4], id: 'f-16', start: 251, end: 270, type: 'OVER_TIME', title: '제한 시간을 넘겼어요', description: '5분 제한보다 12초 길었어요.', evidence: '마지막으로 정리하면', suggestion: '결론 슬라이드를 한 문장으로 줄여 보세요.' },
  ],
  slideCoverage: null,
};

// ---- 마이페이지 M1–M3 목업 (presento-mypage-spec.md 4장) ----
// 완료 회차 12개가 원본이다. 필터가 없을 때(period=all, 목적 전체)는 명세 예시 JSON을 그대로 주고,
// 목적 필터·데이터 부족 경우는 이 목록에서 서버 규칙대로 계산한다.
// 주별 합계(5회 1210.3초 72점 / 7회 1664.2초 76점), 목적별 기록, 등급 분포, 연속 3일, 최근 변화 +6은 예시와 맞춰 두었다.
export const MYPAGE_NOW = '2026-11-05T20:00:00+09:00';
type TimelineSeed = ScoreTimelineItem & { practiceSec: number };
const tl = (analysisId: string, presentationId: string, presentationTitle: string, purpose: Purpose, attemptNo: number, createdAt: string,
  overallScore: number, grade: Grade, D: number, N: number, C: number, practiceSec: number): TimelineSeed =>
  ({ analysisId, presentationId, presentationTitle, purpose, attemptNo, createdAt: `${createdAt}:00+09:00`, overallScore, grade, scores: { DELIVERY: D, NONVERBAL: N, CONTENT: C }, practiceSec });
// 오래된 순. a-1c4f·a-9d21 은 기존 발표 상세·리포트 목업과 같은 회차라 점을 누르면 그 리포트가 열린다(다른 id 도 리포트 목업이 열린다).
export const mockTimelineSeed: TimelineSeed[] = [
  tl('a-3f10', 'p-6b42', '삼성 SW 직무 면접', 'INTERVIEW', 1, '2026-10-26T21:10', 78, 'B', 73, 80, 84, 238.1),
  tl('a-4c22', 'p-6b42', '삼성 SW 직무 면접', 'INTERVIEW', 2, '2026-10-27T22:05', 79, 'B', 74, 80, 84, 251.4),
  tl('a-5e31', 'p-3e9a', '전공 세미나 발표', 'CLASS', 1, '2026-10-29T19:30', 84, 'B+', 80, 82, 86, 226.8),
  tl('a-6a47', 'p-a817', '자기소개 1분 스피치', 'INTERVIEW', 1, '2026-10-30T23:00', 69, 'C+', 63, 72, 78, 262.0),
  tl('a-7b58', 'p-a817', '자기소개 1분 스피치', 'INTERVIEW', 2, '2026-10-31T23:40', 48, 'D', 46, 55, 60, 232.0),
  tl('a-8d63', 'p-3e9a', '전공 세미나 발표', 'CLASS', 2, '2026-11-03T10:20', 86, 'B+', 82, 84, 88, 205.3),
  tl('a-1c4f', 'p-7f3c', '캡스톤 중간 발표', 'CLASS', 1, '2026-11-03T21:00', 64, 'C+', 58, 70, 65, 312.0),
  tl('a-2e70', 'p-3e9a', '전공 세미나 발표', 'CLASS', 3, '2026-11-04T09:10', 57, 'C', 56, 62, 66, 198.6),
  tl('a-0f84', 'p-3e9a', '전공 세미나 발표', 'CLASS', 4, '2026-11-04T13:00', 76, 'B', 71, 78, 83, 221.0),
  tl('a-b392', 'p-3e9a', '전공 세미나 발표', 'CLASS', 5, '2026-11-04T22:30', 77, 'B', 72, 79, 84, 214.7),
  tl('a-c4a5', 'p-6b42', '삼성 SW 직무 면접', 'INTERVIEW', 3, '2026-11-05T09:30', 88, 'A', 85, 86, 89, 225.2),
  tl('a-9d21', 'p-7f3c', '캡스톤 중간 발표', 'CLASS', 3, '2026-11-05T20:00', 82, 'B+', 80, 84, 81, 287.4),
];

const day = (iso: string) => iso.slice(0, 10); // +09:00 문자열의 앞 10자리 = 한국 날짜
const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const sum1 = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 10) / 10;
// 최근 12주의 월요일(2026-08-17 ~ 2026-11-02), 오래된 순
const WEEKS = Array.from({ length: 12 }, (_, i) => addDays('2026-11-02', (i - 11) * 7));
const weekOf = (ymd: string) => addDays(ymd, -((new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7));

// '오늘 포함 최근 30일·90일'의 시작 시각
export const periodFrom = (period: Period) => (period === 'all' ? null : `${addDays(day(MYPAGE_NOW), period === '30d' ? -29 : -89)}T00:00:00+09:00`);
export const filterSeed = (period: Period, purpose: Purpose | null) => {
  const from = periodFrom(period);
  return mockTimelineSeed.filter((x) => (!purpose || x.purpose === purpose) && (!from || day(x.createdAt) >= day(from)));
};

/** 회차 목록에서 M1 응답을 계산한다(명세 4장 M1 표의 규칙). */
export function statsFrom(items: TimelineSeed[], period: Period): MyStats {
  const scores = items.map((x) => x.overallScore);
  const best = items.reduce<TimelineSeed | null>((b, x) => (!b || x.overallScore > b.overallScore ? x : b), null);
  const s10 = scores.slice(-10);
  const recentChange = items.length >= 6 ? avg(s10.slice(-5))! - avg(s10.slice(0, -5))! : null;
  const days = new Set(items.map((x) => day(x.createdAt))); const today = day(MYPAGE_NOW);
  let cur = days.has(today) ? today : addDays(today, -1); let streakDays = 0;
  while (days.has(cur)) { streakDays++; cur = addDays(cur, -1); }
  const gradeDistribution: Record<Grade, number> = { 'A+': 0, A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, D: 0 };
  items.forEach((x) => { gradeDistribution[x.grade]++; });
  const catAvg = (c: Category) => avg(items.map((x) => x.scores[c]));
  return {
    period, from: periodFrom(period), to: MYPAGE_NOW,
    presentationCount: new Set(items.map((x) => x.presentationId)).size, analysisCount: items.length,
    totalPracticeSec: sum1(items.map((x) => x.practiceSec)),
    averageScore: avg(scores), bestScore: best?.overallScore ?? null, bestAnalysisId: best?.analysisId ?? null, recentChange, streakDays,
    categoryAverages: { DELIVERY: catAvg('DELIVERY'), NONVERBAL: catAvg('NONVERBAL'), CONTENT: catAvg('CONTENT') },
    gradeDistribution,
    purposeBreakdown: [...new Set(items.map((x) => x.purpose))]
      .map((purpose) => { const xs = items.filter((x) => x.purpose === purpose); return { purpose, analysisCount: xs.length, averageScore: avg(xs.map((x) => x.overallScore)) }; })
      .sort((a, b) => b.analysisCount - a.analysisCount),
    weeklyActivity: WEEKS.map((weekStart) => {
      const xs = items.filter((x) => weekOf(day(x.createdAt)) === weekStart);
      return { weekStart, analysisCount: xs.length, practiceSec: sum1(xs.map((x) => x.practiceSec)), averageScore: avg(xs.map((x) => x.overallScore)) };
    }),
  };
}

// 명세 M1 예시 그대로. 예시에서 줄인 주는 0회로 채워 항상 12개.
// TODO(spec): 예시의 bestAnalysisId 는 a-9d21(최고 88점)인데 M3 예시와 기존 목업의 a-9d21 은 82점이다. 서버 실제 응답으로 확인 필요.
export const mockStats: MyStats = {
  period: 'all', from: null, to: MYPAGE_NOW,
  presentationCount: 4, analysisCount: 12, totalPracticeSec: 2874.5, averageScore: 74, bestScore: 88, bestAnalysisId: 'a-9d21', recentChange: 6, streakDays: 3,
  categoryAverages: { DELIVERY: 70, NONVERBAL: 76, CONTENT: 79 },
  gradeDistribution: { 'A+': 0, A: 1, 'B+': 3, B: 4, 'C+': 2, C: 1, D: 1 },
  purposeBreakdown: [{ purpose: 'CLASS', analysisCount: 7, averageScore: 75 }, { purpose: 'INTERVIEW', analysisCount: 5, averageScore: 72 }],
  weeklyActivity: WEEKS.map((weekStart) => (weekStart === '2026-10-26' ? { weekStart, analysisCount: 5, practiceSec: 1210.3, averageScore: 72 }
    : weekStart === '2026-11-02' ? { weekStart, analysisCount: 7, practiceSec: 1664.2, averageScore: 76 }
      : { weekStart, analysisCount: 0, practiceSec: 0, averageScore: null })),
};

const ins = (metric: Metric, category: Category, label: string, score: number, trend: Trend, change: number | null, sampleCount: number, valueText: string, message: string): Insight =>
  ({ metric, category, label, score, trend, change, sampleCount, valueText, message });
// 명세 예시의 세 항목(PACE·FILLER·GAZE)에 나머지 항목을 더했다. 강점(>=80)·약점(<70) 판정이 예시와 같도록 나머지는 70~79점이거나 표본 1회다.
// LANGUAGE 는 '측정 안 됨' 경우를 보려고 뺐다. CLARITY 는 표본 4회 미만이라 FLAT·change null.
const METRICS: Insight[] = [
  ins('PACE', 'DELIVERY', '말 속도', 63, 'FLAT', 2, 10, '분당 424음절', '말이 조금 빨라요. 핵심 문장 앞에서 속도를 늦춰 보세요.'),
  ins('FILLER', 'DELIVERY', '추임새', 58, 'UP', 12, 10, '분당 4.8회', "'약간', '이제'가 자주 나와요. 문장 사이에 말 대신 잠깐 쉬어 보세요."),
  ins('SILENCE', 'DELIVERY', '긴 침묵', 74, 'FLAT', -1, 10, '분당 0.8회', '긴 침묵은 드물어요. 문장 사이 쉼을 지금처럼 짧게 유지해 보세요.'),
  ins('TIME', 'DELIVERY', '시간 관리', 77, 'UP', 6, 7, '제한 시간의 92% 사용', '제한 시간 안에 마무리하고 있어요.'),
  ins('GAZE', 'NONVERBAL', '시선', 89, 'UP', 8, 10, '정면 79%', '청중을 안정적으로 바라보고 있어요.'),
  ins('POSTURE', 'NONVERBAL', '자세', 78, 'FLAT', 3, 10, '안정성 86%', '자세가 대체로 안정적이에요.'),
  ins('GESTURE', 'NONVERBAL', '제스처', 72, 'DOWN', -7, 6, '분당 6.2회', '제스처가 조금 줄었어요. 핵심을 말할 때 손을 함께 써 보세요.'),
  ins('STRUCTURE', 'CONTENT', '구조', 79, 'UP', 5, 10, '회차당 지적 1.2건', '도입-본론-결론 흐름이 잡혀 가고 있어요.'),
  ins('CLARITY', 'CONTENT', '명확성', 81, 'FLAT', null, 1, '회차당 지적 0.8건', '핵심 주장을 한 문장으로 먼저 말해 보세요.'),
];
const byMetric = (m: Metric) => METRICS.find((x) => x.metric === m)!;

// 명세 M2 예시 그대로(metrics 는 측정된 전체 항목, topFillers·frequentFeedbackTypes 는 5개까지 늘림)
export const mockInsights: MyInsights = {
  status: 'READY', analysisCount: 12, requiredCount: 3, basedOnRecent: 10,
  strengths: [byMetric('GAZE')],
  weaknesses: [byMetric('FILLER'), byMetric('PACE')],
  metrics: METRICS,
  focusTip: '다음 연습에서는 추임새를 분당 1회 이하로 줄이는 데 집중해 보세요.',
  topFillers: [{ word: '약간', count: 21 }, { word: '이제', count: 14 }, { word: '음', count: 9 }, { word: '그', count: 6 }, { word: '뭐랄까', count: 4 }],
  frequentFeedbackTypes: [
    { type: 'FILLER', label: '추임새', count: 9 }, { type: 'PACE_FAST', label: '말 속도 빠름', count: 6 }, { type: 'GAZE_AWAY', label: '시선 이탈', count: 4 },
    { type: 'STRUCTURE', label: '구조 미흡', count: 3 }, { type: 'OVER_TIME', label: '시간 초과', count: 2 },
  ],
};
// 명세 M2 '데이터 부족 예' 그대로
export const mockInsightsInsufficient: MyInsights = {
  status: 'INSUFFICIENT_DATA', analysisCount: 2, requiredCount: 3, basedOnRecent: 2, strengths: [], weaknesses: [], metrics: [], focusTip: null,
  topFillers: [{ word: '음', count: 3 }], frequentFeedbackTypes: [],
};

/** 필터를 걸었을 때의 M2. 항목 점수를 조금 바꾸고 강점·약점은 서버 판정 규칙(>=80 / <70, 표본 2회 이상)대로 다시 고른다. */
export function insightsFor(count: number, patch: Partial<Record<Metric, Partial<Insight>>> = {}): MyInsights {
  if (count < 3) return { ...mockInsightsInsufficient, analysisCount: count, basedOnRecent: count, topFillers: count ? mockInsightsInsufficient.topFillers : [] };
  const metrics = METRICS.map((m) => ({ ...m, ...patch[m.metric], sampleCount: Math.min(m.sampleCount, count) }));
  const judged = metrics.filter((m) => m.sampleCount >= 2);
  const weaknesses = judged.filter((m) => m.score < 70).sort((a, b) => a.score - b.score).slice(0, 3);
  return {
    ...mockInsights, analysisCount: count, basedOnRecent: Math.min(count, 10), metrics, weaknesses,
    strengths: judged.filter((m) => m.score >= 80).sort((a, b) => b.score - a.score).slice(0, 3),
    focusTip: weaknesses.length ? mockInsights.focusTip : null,
  };
}
