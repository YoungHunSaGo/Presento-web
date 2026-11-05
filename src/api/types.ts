// 명세(presento-frontend-spec.md) 4·5장 JSON 그대로의 타입. 필드명을 바꾸거나 지어내지 않는다.

export type Purpose = 'INTERVIEW' | 'CLASS' | 'PITCH' | 'ETC';
export type Category = 'DELIVERY' | 'NONVERBAL' | 'CONTENT';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AnalysisStatus = 'WAITING_UPLOAD' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AnalysisStage = 'EXTRACTING_AUDIO' | 'TRANSCRIBING' | 'ANALYZING_NONVERBAL' | 'ANALYZING_CONTENT' | 'GENERATING_FEEDBACK';
export type FeedbackType =
  | 'PACE_FAST' | 'PACE_SLOW' | 'FILLER' | 'LONG_SILENCE' | 'OVER_TIME' | 'UNDER_TIME' | 'GAZE_AWAY'
  | 'POSTURE_UNSTABLE' | 'GESTURE_NONE' | 'GESTURE_EXCESS' | 'STRUCTURE' | 'CLARITY' | 'SLIDE_MISSED';

export interface ApiErrorBody { error: { code: string; message: string; details: unknown } }

export interface User { id: string; email: string; nickname: string; createdAt: string }
export interface AuthResponse { accessToken: string; user: User }

export interface Presentation {
  id: string; title: string; purpose: Purpose; timeLimitSec: number | null; hasSlides: boolean;
  attemptCount: number; latestScore: number | null; createdAt: string;
}
export interface Paged<T> { items: T[]; page: number; size: number; total: number }

export interface Attempt {
  analysisId: string; attemptNo: number; status: AnalysisStatus; overallScore: number | null;
  durationSec: number | null; createdAt: string;
}
export interface PresentationDetail extends Presentation {
  attempts: Attempt[];
}

export interface UploadTicket { uploadUrl: string; method: 'PUT'; headers: Record<string, string>; expiresInSec: number }

export interface HistoryItem {
  attemptNo: number; analysisId: string; createdAt: string; overallScore: number;
  scores: Record<Category, number>; fillerCount: number; syllablesPerMin: number;
}

export interface CreateAnalysisRequest { fileName: string; contentType: string; fileSize: number; source: 'UPLOAD' | 'RECORDING' }
export interface CreateAnalysisResponse { analysisId: string; attemptNo: number; status: AnalysisStatus; upload: UploadTicket }
// 이미 시작한 회차에 다시 부르면 QUEUED 가 아니라 현재 상태가 온다.
export interface StartAnalysisResponse { analysisId: string; status: AnalysisStatus }

export interface AnalysisState {
  analysisId: string; presentationId: string; attemptNo: number; status: AnalysisStatus; stage: AnalysisStage | null;
  progress: number; error: { code: string; message: string } | null; createdAt: string; completedAt: string | null;
}

export interface Feedback {
  id: string; category: Category; type: FeedbackType; severity: Severity; start: number; end: number;
  // 시선·자세 피드백은 인용할 대본이 없어 null 일 수 있다. null 이면 근거 문장 영역을 숨긴다.
  title: string; description: string; evidence: string | null; suggestion: string;
}
export interface Word { text: string; start: number; end: number; tag: 'FILLER' | 'REPEAT' | null }
export interface Segment { id: string; start: number; end: number; text: string; words: Word[] }
export interface ImprovedScript { segmentId: string; start: number; end: number; original: string; improved: string; reason: string }
export interface ExpectedQuestion { question: string; intent: string; answerTip: string }
export interface SlideCoverage { page: number; covered: boolean; note: string | null }

export interface Report {
  analysisId: string; presentationId: string; attemptNo: number; purpose: Purpose; durationSec: number; createdAt: string;
  overall: { score: number; grade: string; summary: string; strengths: string[]; improvements: string[] };
  scores: { category: Category; label: string; score: number }[];
  metrics: {
    speech: {
      syllablesPerMin: number; paceSeries: { t: number; value: number }[]; fillerCount: number;
      fillers: { word: string; count: number }[]; silenceCount: number; longestSilenceSec: number;
      timeLimitSec: number | null; overTimeSec: number;
    };
    // 카메라에 몸이 안 잡혀 측정하지 못한 지표는 null
    nonverbal: { gazeFrontRatio: number | null; postureStability: number | null; gesturePerMin: number | null; lowConfidenceRanges: { start: number; end: number }[] };
  };
  feedbacks: Feedback[];
  transcript: { segments: Segment[] };
  improvedScripts: ImprovedScript[];
  expectedQuestions: ExpectedQuestion[];
  slideCoverage: SlideCoverage[] | null;
}

// ---- 마이페이지 M1–M3 (presento-mypage-spec.md 5장 그대로) ----
export type Period = '30d' | '90d' | 'all';
export type Trend = 'UP' | 'DOWN' | 'FLAT';
export type Metric =
  | 'PACE' | 'FILLER' | 'SILENCE' | 'TIME'
  | 'GAZE' | 'POSTURE' | 'GESTURE'
  | 'STRUCTURE' | 'CLARITY' | 'LANGUAGE';
export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';

export interface MyStats {
  period: Period; from: string | null; to: string;
  presentationCount: number; analysisCount: number; totalPracticeSec: number;
  // 데이터가 없으면 null. 화면에는 '-'로 보인다.
  averageScore: number | null; bestScore: number | null; bestAnalysisId: string | null; recentChange: number | null;
  streakDays: number;
  categoryAverages: Record<Category, number | null>;
  gradeDistribution: Record<Grade, number>;
  purposeBreakdown: { purpose: Purpose; analysisCount: number; averageScore: number | null }[];
  // 항상 12주(월요일 시작), 오래된 순, 0인 주 포함
  weeklyActivity: { weekStart: string; analysisCount: number; practiceSec: number; averageScore: number | null }[];
}

// label·valueText·message 는 서버가 만든 완성 문장이라 그대로 보여 준다.
export interface Insight {
  metric: Metric; category: Category; label: string; score: number; trend: Trend; change: number | null;
  sampleCount: number; valueText: string; message: string;
}

export interface MyInsights {
  status: 'READY' | 'INSUFFICIENT_DATA';
  analysisCount: number; requiredCount: number; basedOnRecent: number;
  // READY 여도 측정된 항목만 와서 비어 있거나 10개보다 적을 수 있다.
  strengths: Insight[]; weaknesses: Insight[]; metrics: Insight[];
  focusTip: string | null;
  topFillers: { word: string; count: number }[];
  frequentFeedbackTypes: { type: string; label: string; count: number }[];
}

export interface ScoreTimelineItem {
  analysisId: string; presentationId: string; presentationTitle: string; purpose: Purpose; attemptNo: number;
  createdAt: string; overallScore: number; grade: Grade; scores: Record<Category, number>;
}
// items 는 오래된 순. total 은 limit 로 잘리기 전 전체 완료 회차 수.
export interface ScoreTimeline { items: ScoreTimelineItem[]; total: number }
