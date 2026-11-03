import type { AnalysisStage, Purpose } from '@/api/types';

export const PURPOSE_LABEL: Record<Purpose, string> = { INTERVIEW: '면접', CLASS: '수업 발표', PITCH: '피칭·대회', ETC: '기타' };

// 명세 6장 stage 화면 문구
export const STAGES: { stage: AnalysisStage; label: string }[] = [
  { stage: 'EXTRACTING_AUDIO', label: '영상에서 음성을 꺼내는 중' },
  { stage: 'TRANSCRIBING', label: '말을 받아쓰는 중' },
  { stage: 'ANALYZING_NONVERBAL', label: '시선과 자세를 보는 중' },
  { stage: 'ANALYZING_CONTENT', label: '발표 내용을 살펴보는 중' },
  { stage: 'GENERATING_FEEDBACK', label: '피드백을 정리하는 중' },
];

export const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export const shortDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
export const minutesLabel = (sec: number) => {
  const m = Math.floor(sec / 60); const s = Math.round(sec % 60);
  return s ? `${m}분 ${s}초` : `${m}분`;
};
export const dateTimeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const dateLabel = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
export const bytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`);
