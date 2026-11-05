import type { UseQueryResult } from '@tanstack/react-query';
import type { MyInsights, MyStats } from '@/api/types';
import { QueryView, SectionFrame } from './shared';
import '@/styles/mypage/metrics.css';

// 항목별 점수: 레이더(M1 categoryAverages) + 세부 항목 표(M2 metrics: 점수 막대, 추이)
// + 자주 쓰는 추임새(M2 topFillers) + 자주 받은 피드백(M2 frequentFeedbackTypes)
export interface MetricsSectionProps { stats: UseQueryResult<MyStats>; insights: UseQueryResult<MyInsights> }

export function MetricsSection({ stats, insights }: MetricsSectionProps) {
  return (
    <SectionFrame id="mp-metrics" title="항목별 점수">
      <QueryView query={stats} minHeight={240}>{() => <p className="mp-placeholder">카테고리 레이더 차트 자리</p>}</QueryView>
      <QueryView query={insights} minHeight={240}>{(d) => <p className="mp-placeholder">세부 항목 표·추임새·피드백 자리 (항목 {d.metrics.length}개)</p>}</QueryView>
    </SectionFrame>
  );
}
