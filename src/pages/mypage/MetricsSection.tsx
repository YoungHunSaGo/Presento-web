import type { UseQueryResult } from '@tanstack/react-query';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import type { Category, Insight, Metric, MyInsights, MyStats } from '@/api/types';
import { CATEGORY_LABEL } from '@/lib/format';
import { QueryView, SectionFrame, TrendMark } from './shared';
import '@/styles/mypage/metrics.css';

// 항목별 점수: 레이더(M1 categoryAverages) + 세부 항목 표(M2 metrics: 점수 막대, 추이)
// + 자주 쓰는 추임새(M2 topFillers) + 자주 받은 피드백(M2 frequentFeedbackTypes)
// 레이더는 M1, 나머지는 M2 만 본다. 한쪽이 실패해도 다른 쪽은 그대로 그린다(명세 6장).
export interface MetricsSectionProps { stats: UseQueryResult<MyStats>; insights: UseQueryResult<MyInsights> }

const CATEGORIES: Category[] = ['DELIVERY', 'NONVERBAL', 'CONTENT'];

// 명세 M2 'metric 값' 표(순서 그대로). 서버 metrics 는 측정된 항목만 와서, 빠진 항목 줄의 이름은 여기서 가져온다.
// TODO(spec): 빠진 항목의 이름은 서버가 주지 않아 명세 표의 label 을 프론트에 옮겨 두었다. 서버 label 이 바뀌면 같이 고쳐야 한다.
const METRIC_TABLE: { metric: Metric; category: Category; label: string }[] = [
  { metric: 'PACE', category: 'DELIVERY', label: '말 속도' },
  { metric: 'FILLER', category: 'DELIVERY', label: '추임새' },
  { metric: 'SILENCE', category: 'DELIVERY', label: '긴 침묵' },
  { metric: 'TIME', category: 'DELIVERY', label: '시간 관리' },
  { metric: 'GAZE', category: 'NONVERBAL', label: '시선' },
  { metric: 'POSTURE', category: 'NONVERBAL', label: '자세' },
  { metric: 'GESTURE', category: 'NONVERBAL', label: '제스처' },
  { metric: 'STRUCTURE', category: 'CONTENT', label: '구조' },
  { metric: 'CLARITY', category: 'CONTENT', label: '명확성' },
  { metric: 'LANGUAGE', category: 'CONTENT', label: '언어 표현' },
];

const NOT_MEASURED = '측정 안 됨';
const pct = (n: number) => `${Math.max(0, Math.min(100, n))}%`;

export function MetricsSection({ stats, insights }: MetricsSectionProps) {
  return (
    <SectionFrame id="mp-metrics" title="항목별 점수">
      <div className="mpm">
        <div className="mpm-area mpm-area-radar">
          <h3 className="mpm-h">카테고리 평균</h3>
          <QueryView query={stats} minHeight={320}>{(d) => <CategoryRadar averages={d.categoryAverages} />}</QueryView>
        </div>
        <div className="mpm-area mpm-area-table">
          <h3 className="mpm-h">세부 항목</h3>
          <QueryView query={insights} minHeight={480}>{(d) => <MetricTable d={d} />}</QueryView>
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

// ---- 세부 항목 표(M2 metrics) ----

function MetricTable({ d }: { d: MyInsights }) {
  if (d.metrics.length === 0) {
    // 명세 '데이터 부족 예'는 metrics 가 빈 배열이다. 열 줄 모두 '측정 안 됨'으로 채우지 않고 짧게 알린다.
    // TODO(spec): INSUFFICIENT_DATA 일 때 metrics 가 항상 비는지는 예시로만 알 수 있다. 항목이 오면 아래 표를 그대로 그린다.
    return d.status === 'INSUFFICIENT_DATA'
      ? <p className="mpm-note">분석을 {d.requiredCount}회 이상 완료하면 항목별 점수를 보여 드려요. (현재 {d.analysisCount}회)</p>
      : <p className="mpm-note">아직 측정된 항목이 없어요</p>;
  }
  const got = new Map<Metric, Insight>(d.metrics.map((m) => [m.metric, m]));
  return (
    <>
      {/* TODO(spec): 항목 점수(score)의 집계 구간이 basedOnRecent(판정에 쓴 최근 회차 수)와 같다고 보고 적었다. */}
      <p className="mpm-basis">최근 {d.basedOnRecent}회 분석 기준</p>
      {/* 좁은 화면에서 줄을 카드처럼 접으려고 표 요소를 grid 로 바꾼다. 일부 브라우저가 이때 표 의미를 버려 role 을 직접 단다. */}
      <table className="mpm-table" role="table">
        <caption className="visually-hidden">세부 항목별 점수, 추이, 수치</caption>
        <thead className="mpm-thead" role="rowgroup">
          <tr className="mpm-tr mpm-tr-head" role="row">
            <th scope="col" role="columnheader" className="mpm-c-label">항목</th>
            <th scope="col" role="columnheader" className="mpm-c-score">점수</th>
            <th scope="col" role="columnheader" className="mpm-c-trend">추이</th>
            <th scope="col" role="columnheader" className="mpm-c-value">수치</th>
            <th scope="col" role="columnheader" className="visually-hidden">설명</th>
          </tr>
        </thead>
        {CATEGORIES.map((c) => (
          <tbody key={c} className="mpm-group" role="rowgroup">
            <tr className="mpm-tr mpm-tr-group" role="row">
              <th scope="rowgroup" role="rowheader" colSpan={5}>{CATEGORY_LABEL[c]}</th>
            </tr>
            {METRIC_TABLE.filter((t) => t.category === c).map((t) => {
              const m = got.get(t.metric);
              return m ? <MetricRow key={t.metric} m={m} /> : (
                <tr key={t.metric} className="mpm-tr mpm-tr-missing" role="row">
                  <th scope="row" role="rowheader" className="mpm-c-label">{t.label}</th>
                  <td role="cell" className="mpm-c-missing" colSpan={4}>{NOT_MEASURED}</td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </>
  );
}

function MetricRow({ m }: { m: Insight }) {
  return (
    <tr className="mpm-tr" role="row">
      <th scope="row" role="rowheader" className="mpm-c-label">{m.label}</th>
      <td role="cell" className="mpm-c-score">
        <span className="mpm-score">
          <span className="mpm-score-num">{m.score}</span>
          <span className="mpm-bar" aria-hidden="true"><span style={{ width: pct(m.score) }} /></span>
        </span>
      </td>
      <td role="cell" className="mpm-c-trend"><TrendMark trend={m.trend} change={m.change} /></td>
      <td role="cell" className="mpm-c-value">{m.valueText}</td>
      <td role="cell" className="mpm-c-msg">{m.message}</td>
    </tr>
  );
}
