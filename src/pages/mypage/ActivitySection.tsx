import type { UseQueryResult } from '@tanstack/react-query';
import type { MyStats } from '@/api/types';
import { QueryView, SectionFrame } from './shared';
import '@/styles/mypage/activity.css';

// 주간 활동 막대(M1 weeklyActivity: 최근 12주, 0인 주 포함) + 목적별 기록 표(M1 purposeBreakdown)
export interface ActivitySectionProps { stats: UseQueryResult<MyStats> }

export function ActivitySection({ stats }: ActivitySectionProps) {
  return (
    <SectionFrame id="mp-activity" title="활동 기록">
      <QueryView query={stats} minHeight={220}>{(d) => <p className="mp-placeholder">주간 활동·목적별 기록 자리 ({d.weeklyActivity.length}주)</p>}</QueryView>
    </SectionFrame>
  );
}
