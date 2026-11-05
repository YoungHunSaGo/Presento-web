import type { UseQueryResult } from '@tanstack/react-query';
import type { MyStats, ScoreTimeline } from '@/api/types';
import { QueryView, SectionFrame } from './shared';
import '@/styles/mypage/summary.css';

// 요약 카드 4개(M1: 완료한 연습 수, 총 연습 시간, 평균 점수 + recentChange 화살표, 연속 연습일)
// + 점수 추이 꺾은선(M3: x=회차 날짜, y=종합 점수, 범례로 전달력·비언어·내용 선 토글, 점 클릭 → /analyses/{analysisId})
export interface SummarySectionProps { stats: UseQueryResult<MyStats>; timeline: UseQueryResult<ScoreTimeline> }

export function SummarySection({ stats, timeline }: SummarySectionProps) {
  return (
    <SectionFrame id="mp-summary" title="요약">
      <QueryView query={stats} minHeight={120}>{(d) => <p className="mp-placeholder">요약 카드 자리 (완료 {d.analysisCount}회)</p>}</QueryView>
      <QueryView query={timeline} minHeight={260}>{(d) => <p className="mp-placeholder">점수 추이 차트 자리 ({d.items.length}회차)</p>}</QueryView>
    </SectionFrame>
  );
}
