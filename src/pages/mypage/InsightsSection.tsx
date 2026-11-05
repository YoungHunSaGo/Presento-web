import type { UseQueryResult } from '@tanstack/react-query';
import type { MyInsights } from '@/api/types';
import { QueryView, SectionFrame } from './shared';
import '@/styles/mypage/insights.css';

// 강점(최대 3) / 약점(최대 3) 카드 + 다음 연습 집중 포인트(focusTip) (M2)
// status 가 INSUFFICIENT_DATA 면 카드 대신 requiredCount·analysisCount 안내 문구.
export interface InsightsSectionProps { insights: UseQueryResult<MyInsights> }

export function InsightsSection({ insights }: InsightsSectionProps) {
  return (
    <SectionFrame id="mp-insights" title="강점과 약점">
      <QueryView query={insights} minHeight={220}>{(d) => <p className="mp-placeholder">강점·약점 카드 자리 ({d.status})</p>}</QueryView>
    </SectionFrame>
  );
}
