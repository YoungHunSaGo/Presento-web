// 명세 4·5장 예시 JSON을 바탕으로 한 목업 데이터. 필드는 명세 그대로이고, 배열 항목만 시연용으로 늘렸다.
import type { Feedback, HistoryItem, Presentation, PresentationDetail, Report, Segment, User, Word } from '@/api/types';

export const mockUser: User = { id: 'u-1a2b', email: 'student@ycu.ac.kr', nickname: '영훈', createdAt: '2026-11-03T17:04:00+09:00' };

export const mockPresentations: Presentation[] = [
  { id: 'p-7f3c', title: '캡스톤 중간 발표', purpose: 'CLASS', timeLimitSec: 300, hasSlides: true, attemptCount: 3, latestScore: 82, createdAt: '2026-11-03T17:10:00+09:00' },
  { id: 'p-2b81', title: '카카오 인턴 1차 면접', purpose: 'INTERVIEW', timeLimitSec: 180, hasSlides: false, attemptCount: 5, latestScore: 71, createdAt: '2026-11-01T19:00:00+09:00' },
  { id: 'p-c40a', title: 'AI 경진대회 본선 피칭', purpose: 'PITCH', timeLimitSec: 420, hasSlides: true, attemptCount: 2, latestScore: 66, createdAt: '2026-10-30T13:00:00+09:00' },
  { id: 'p-9e17', title: '동아리 신입 OT 소개', purpose: 'ETC', timeLimitSec: null, hasSlides: false, attemptCount: 0, latestScore: null, createdAt: '2026-10-28T10:00:00+09:00' },
];

export const mockDetail = (p: Presentation): PresentationDetail => ({
  id: p.id, title: p.title, purpose: p.purpose, timeLimitSec: p.timeLimitSec, hasSlides: p.hasSlides,
  attempts: p.id === 'p-7f3c'
    ? [
        { analysisId: 'a-9d21', attemptNo: 3, status: 'COMPLETED', overallScore: 82, durationSec: 287.4, createdAt: '2026-11-05T20:00:00+09:00' },
        { analysisId: 'a-55e0', attemptNo: 2, status: 'FAILED', overallScore: null, durationSec: null, createdAt: '2026-11-04T21:30:00+09:00' },
        { analysisId: 'a-1c4f', attemptNo: 1, status: 'COMPLETED', overallScore: 64, durationSec: 312.0, createdAt: '2026-11-03T21:00:00+09:00' },
      ]
    : [],
});

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
    description: '14초 동안 정면 시선 비율이 41%로 떨어졌어요. 메모를 읽은 것으로 보여요.', evidence: '저희 팀은 사용자 인터뷰를 열두 번 했고', suggestion: '핵심 문장은 외워서 카메라를 보며 말해 보세요.' },
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
  metrics: { ...mockReport.metrics, speech: { ...mockReport.metrics.speech, syllablesPerMin: 392, fillerCount: 31, fillers: [{ word: '약간', count: 9 }, { word: '이제', count: 12 }, { word: '음', count: 10 }] } },
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
