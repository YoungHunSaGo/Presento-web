import type { UseQueryResult } from '@tanstack/react-query';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import type { Category, MyInsights, MyStats } from '@/api/types';
import { CATEGORY_LABEL } from '@/lib/format';
import { QueryView, SectionFrame } from './shared';
import '@/styles/mypage/metrics.css';

// 항목별 점수: 레이더(M1 categoryAverages) + 세부 항목 표(M2 metrics: 점수 막대, 추이)
// + 자주 쓰는 추임새(M2 topFillers) + 자주 받은 피드백(M2 frequentFeedbackTypes)
// 레이더는 M1, 나머지는 M2 만 본다. 한쪽이 실패해도 다른 쪽은 그대로 그린다(명세 6장).
export interface MetricsSectionProps { stats: UseQueryResult<MyStats>; insights: UseQueryResult<MyInsights> }

const CATEGORIES: Category[] = ['DELIVERY', 'NONVERBAL', 'CONTENT'];

const NOT_MEASURED = '측정 안 됨';

export function MetricsSection({ stats, insights }: MetricsSectionProps) {
  return (
    <SectionFrame id="mp-metrics" title="항목별 점수">
      <div className="mpm">
        <div className="mpm-area mpm-area-radar">
          <h3 className="mpm-h">카테고리 평균</h3>
          <QueryView query={stats} minHeight={320}>{(d) => <CategoryRadar averages={d.categoryAverages} />}</QueryView>
        </div>
        <div className="mpm-area mpm-area-table">
          <QueryView query={insights} minHeight={480}>{(d) => <p className="mp-placeholder">세부 항목 표·추임새·피드백 자리 (항목 {d.metrics.length}개)</p>}</QueryView>
        </div>
      </div>
    </SectionFrame>
  );
}

// ---- 레이더(M1 categoryAverages) ----

function CategoryRadar({ averages }: { averages: MyStats['categoryAverages'] }) {
  // null 은 0점으로 찍지 않는다. Radar 는 null 점을 건너뛰고(connectNulls) 축 이름 아래에 '측정 안 됨'을 적는다.
  const data = CATEGORIES.map((c) => ({ category: c, score: averages[c] }));
  if (data.every((x) => x.score == null)) return <p className="mpm-note">아직 측정된 카테고리 점수가 없어요</p>;
  return (
    <div className="mpm-radar">
      {/* 같은 값을 아래 숫자 목록으로도 읽을 수 있어 차트는 보조 화면 읽기에서 뺀다. */}
      <div className="mpm-radar-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cy="54%" outerRadius="64%" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <PolarGrid stroke="var(--line)" />
            <PolarAngleAxis dataKey="category" tick={(p: AxisTickProps) => <AxisTick {...p} averages={averages} />} />
            <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="var(--ink)" strokeWidth={2} fill="var(--ink)" fillOpacity={0.1} connectNulls
              dot={{ r: 4, fill: 'var(--ink)', fillOpacity: 1, strokeWidth: 0 }} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <dl className="mpm-avg">
        {data.map((x) => (
          <div key={x.category} className="mpm-avg-item">
            <dt>{CATEGORY_LABEL[x.category]}</dt>
            {x.score == null ? <dd className="mpm-avg-none">{NOT_MEASURED}</dd> : <dd className="mpm-avg-num">{x.score}<span>점</span></dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}

type AxisTickProps = { x?: number; y?: number; cy?: number; textAnchor?: 'start' | 'middle' | 'end'; payload?: { value: Category } };

/** 축 끝 이름 + 평균(또는 '측정 안 됨') 두 줄. 위쪽 축은 위로, 아래쪽 축은 아래로 쌓아 도형과 겹치지 않게 한다. */
function AxisTick({ x = 0, y = 0, cy = 0, textAnchor = 'middle', payload, averages }: AxisTickProps & { averages: MyStats['categoryAverages'] }) {
  if (!payload) return null;
  const v = averages[payload.value];
  const top = y < cy - 1;
  return (
    <text x={x} y={top ? y - 22 : y + 12} textAnchor={textAnchor} className="mpm-tick">
      <tspan x={x} className="mpm-tick-name">{CATEGORY_LABEL[payload.value]}</tspan>
      {v == null
        ? <tspan x={x} dy={19} className="mpm-tick-none">{NOT_MEASURED}</tspan>
        : <tspan x={x} dy={19} className="mpm-tick-num">{v}</tspan>}
    </text>
  );
}
