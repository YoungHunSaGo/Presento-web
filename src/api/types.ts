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
export interface PresentationDetail extends Omit<Presentation, 'attemptCount' | 'latestScore' | 'createdAt'> {
  attempts: Attempt[];
}

export interface UploadTicket { uploadUrl: string; method: 'PUT'; headers: Record<string, string>; expiresInSec: number }

export interface HistoryItem {
  attemptNo: number; analysisId: string; createdAt: string; overallScore: number;
  scores: Record<Category, number>; fillerCount: number; syllablesPerMin: number;
}

export interface CreateAnalysisRequest { fileName: string; contentType: string; fileSize: number; source: 'UPLOAD' | 'RECORDING' }
export interface CreateAnalysisResponse { analysisId: string; attemptNo: number; status: AnalysisStatus; upload: UploadTicket }

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
    nonverbal: { gazeFrontRatio: number; postureStability: number; gesturePerMin: number; lowConfidenceRanges: { start: number; end: number }[] };
  };
  feedbacks: Feedback[];
  transcript: { segments: Segment[] };
  improvedScripts: ImprovedScript[];
  expectedQuestions: ExpectedQuestion[];
  slideCoverage: SlideCoverage[] | null;
}
