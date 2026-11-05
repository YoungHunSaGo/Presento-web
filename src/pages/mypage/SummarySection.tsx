import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { Category, MyStats, ScoreTimeline, ScoreTimelineItem } from '@/api/types';
import { CATEGORY_LABEL, dateLabel, dateTimeLabel } from '@/lib/format';
import { QueryView, SectionFrame, TrendMark, dash, trendOf } from './shared';
import '@/styles/mypage/summary.css';

// 요약 카드 4개(M1: 완료한 연습 수, 총 연습 시간, 평균 점수 + recentChange 화살표, 연속 연습일)
// + 점수 추이 꺾은선(M3: x=회차 날짜, y=종합 점수, 범례로 전달력·비언어·내용 선 토글, 점 클릭 → /analyses/{analysisId})
export interface SummarySectionProps { stats: UseQueryResult<MyStats>; timeline: UseQueryResult<ScoreTimeline> }

export function SummarySection({ stats, timeline }: SummarySectionProps) {
  // 범례 토글 상태. 필터를 바꿔도(쿼리 결과가 바뀌어도) 유지한다.
  const [shown, setShown] = useState<Record<Category, boolean>>({ DELIVERY: false, NONVERBAL: false, CONTENT: false });
  const chartable = timeline.isSuccess && timeline.data.items.length >= 2;
  return (
    <SectionFrame id="mp-summary" title="요약">
      {/* 카드와 차트는 각자 QueryView 로 감싸, M1·M3 중 하나가 실패해도 다른 쪽은 그린다(명세 6장). */}
      <QueryView query={stats} minHeight={132}>{(d) => <SummaryCards s={d} />}</QueryView>
      <div className="mp-trend">
        <div className="mp-trend-head">
          <h3 id="mp-trend-h" className="t-title">점수 추이</h3>
          {chartable && <TrendLegend shown={shown} onToggle={(c) => setShown((p) => ({ ...p, [c]: !p[c] }))} />}
        </div>
        <QueryView query={timeline} minHeight={300}>{(d) => <TrendChart t={d} shown={shown} />}</QueryView>
      </div>
    </SectionFrame>
  );
}

/* ---------- 요약 카드 (M1) ---------- */

/** 숫자는 데이터 글꼴, 단위는 본문 글꼴로 나눠 그리기 위한 조각. */
type Part = { n: number; unit: string };

/**
 * 총 연습 시간을 읽기 쉬운 단위로. 1분 미만은 초, 1시간 미만은 분, 그 이상은 시간+분.
 * 요약 카드라 초는 분으로 반올림한다(minutesLabel 의 '166분 40초'보다 '2시간 47분'이 한눈에 읽힌다).
 * 버리면 2874.5초(47분 54초)가 47분으로 줄어 보여, 가장 가까운 분(48분)으로 둔다.
 */
function practiceParts(sec: number): Part[] {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return [{ n: s, unit: '초' }];
  const min = Math.round(s / 60);
  const h = Math.floor(min / 60); const m = min % 60;
  if (h === 0) return [{ n: m, unit: '분' }];
  return m ? [{ n: h, unit: '시간' }, { n: m, unit: '분' }] : [{ n: h, unit: '시간' }];
}

/** 값 표시. null 이면 dash 로 '-'(명세 2장). */
function Value({ parts }: { parts: Part[] | null }) {
  if (!parts) return <span className="mp-card-num">{dash(null)}</span>;
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className="mp-card-part">
          <span className="mp-card-num">{p.n}</span><span className="mp-card-unit">{p.unit}</span>
        </span>
      ))}
    </>
  );
}

function SummaryCards({ s }: { s: MyStats }) {
  const trend = trendOf(s.recentChange);
  return (
    <dl className="mp-cards">
      <div className="mp-card">
        <dt className="mp-card-label">완료한 연습 수</dt>
        <dd className="mp-card-value"><Value parts={[{ n: s.analysisCount, unit: '회' }]} /></dd>
        <dd className="mp-card-sub">발표 <span className="t-data">{s.presentationCount}</span>개</dd>
      </div>
      <div className="mp-card">
        <dt className="mp-card-label">총 연습 시간</dt>
        <dd className="mp-card-value"><Value parts={practiceParts(s.totalPracticeSec)} /></dd>
      </div>
      <div className="mp-card">
        <dt className="mp-card-label">평균 점수</dt>
        <dd className="mp-card-value">
          <Value parts={s.averageScore == null ? null : [{ n: s.averageScore, unit: '점' }]} />
        </dd>
        {/* recentChange = 최근 5회 평균 − 직전 5회 평균. 6회 미만이면 null 이라 화살표를 그리지 않는다. */}
        {trend ? (
          <dd className="mp-card-sub"><TrendMark trend={trend} change={s.recentChange} /><span>직전 5회 대비</span></dd>
        ) : (
          <dd className="mp-card-sub c-3">최근 변화 {dash(null)}</dd>
        )}
      </div>
      <div className="mp-card">
        <dt className="mp-card-label">연속 연습일</dt>
        <dd className="mp-card-value"><Value parts={[{ n: s.streakDays, unit: '일' }]} /></dd>
      </div>
    </dl>
  );
}

/* ---------- 점수 추이 (M3) ---------- */

const CATEGORIES: Category[] = ['DELIVERY', 'NONVERBAL', 'CONTENT'];
// 종합은 잉크 실선. 항목 선은 근거 파랑(타임스탬프 전용)·추이 초록/빨강을 피해 회색 계열로 두고,
// 회색끼리는 구별이 약하니 선 모양(파선·점선·일점쇄선)으로 한 번 더 나눈다. 범례 견본도 같은 모양.
const SERIES: Record<Category, { color: string; dash: string }> = {
  DELIVERY: { color: 'var(--text-2)', dash: '6 4' },
  NONVERBAL: { color: 'var(--text-3)', dash: '1.5 4' },
  CONTENT: { color: 'var(--text-2)', dash: '10 3 2 3' },
};

function LineSwatch({ color, dash: d, width }: { color: string; dash?: string; width: number }) {
  return (
    <svg className="mp-swatch" viewBox="0 0 24 8" aria-hidden="true">
      <line x1="1" y1="4" x2="23" y2="4" stroke={color} strokeWidth={width} strokeDasharray={d} strokeLinecap="round" />
    </svg>
  );
}

/** 범례. 종합은 항상 그리므로 버튼이 아니고, 항목 3개는 aria-pressed 토글 버튼. */
function TrendLegend({ shown, onToggle }: { shown: Record<Category, boolean>; onToggle: (c: Category) => void }) {
  return (
    <div className="mp-legend" role="group" aria-label="점수 추이에 함께 볼 항목">
      <span className="mp-legend-item mp-legend-fixed"><LineSwatch color="var(--ink)" width={2.5} />종합</span>
      {CATEGORIES.map((c) => (
        <button key={c} type="button" className="mp-legend-item mp-legend-btn" aria-pressed={shown[c]} onClick={() => onToggle(c)}>
          <LineSwatch color={SERIES[c].color} dash={SERIES[c].dash} width={2} />{CATEGORY_LABEL[c]}
        </button>
      ))}
    </div>
  );
}

type Point = ScoreTimelineItem & { i: number };
const localDay = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const shortDate = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}.${d.getDate()}`; };
const MAX_TICKS = 6;

/**
 * x 눈금: 하루에 여러 회차가 있을 수 있어 그날 첫 회차에만 날짜를 단다. 많으면 고르게 MAX_TICKS 개로 줄인다
 * (375px 에서도 겹치지 않게). 점은 회차마다 같은 간격이다(같은 날 회차가 한 점에 겹치지 않도록).
 */
function dayTicks(points: Point[]): number[] {
  const firsts = points.filter((p, k) => k === 0 || localDay(p.createdAt) !== localDay(points[k - 1].createdAt)).map((p) => p.i);
  if (firsts.length <= MAX_TICKS) return firsts;
  const step = (firsts.length - 1) / (MAX_TICKS - 1);
  return Array.from({ length: MAX_TICKS }, (_, k) => firsts[Math.round(k * step)]);
}

function TrendChart({ t, shown }: { t: ScoreTimeline; shown: Record<Category, boolean> }) {
  const navigate = useNavigate();
  const { items, total } = t;
  if (items.length < 2) {
    // 0회는 페이지가 빈 상태로 바뀌지만, M1·M3 응답 시점이 달라 여기로 올 수 있어 같이 처리한다.
    return (
      <div className="mp-trend-empty">
        <p className="t-body c-2">연습을 2회 이상 완료하면 점수 추이를 보여 드려요.</p>
        {items.length === 1 && (
          <Link className="link" to={`/analyses/${items[0].analysisId}`}>
            {dateLabel(items[0].createdAt)} {items[0].presentationTitle} {items[0].attemptNo}회차 리포트 보기
          </Link>
        )}
      </div>
    );
  }
  const points: Point[] = items.map((it, i) => ({ ...it, i }));
  const ticks = dayTicks(points);
  const open = (p?: Point) => { if (p) navigate(`/analyses/${p.analysisId}`); };
  // 점 클릭 → 그 회차 리포트(명세 2장). 보이는 점보다 넓은 투명 원을 겹쳐 누르기 쉽게 한다.
  // Recharts 는 dot·activeDot 함수에 props 를 unknown 으로 넘긴다(key·cx·cy·payload 가 들어 있다).
  const dot = (active: boolean) => (props: unknown) => {
    const { key, cx, cy, payload } = props as { key?: string; cx?: number; cy?: number; payload?: Point };
    if (cx == null || cy == null) return <g key={key} />;
    return (
      <g key={key} className="mp-trend-dot" onClick={() => open(payload)}>
        <circle cx={cx} cy={cy} r={14} fill="transparent" />
        <circle cx={cx} cy={cy} r={active ? 6 : 4} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  };

  return (
    <figure className="mp-trend-fig" aria-labelledby="mp-trend-h">
      <div className="mp-trend-plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="i" type="category" ticks={ticks} interval={0} tickFormatter={(i: number) => shortDate(points[i].createdAt)}
              tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'var(--font-data)' }} axisLine={{ stroke: 'var(--line-2)' }} tickLine={false} tickMargin={8} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={44}
              tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<TrendTooltip shown={shown} />} cursor={{ stroke: 'var(--line-2)', strokeWidth: 1 }} isAnimationActive={false} />
            {/* 항목 선을 먼저 그려 종합 선과 점이 맨 위에 오게(점 클릭이 가려지지 않게) 한다. */}
            {CATEGORIES.filter((c) => shown[c]).map((c) => (
              <Line key={c} type="linear" dataKey={`scores.${c}`} name={CATEGORY_LABEL[c]} stroke={SERIES[c].color} strokeWidth={2}
                strokeDasharray={SERIES[c].dash} strokeLinecap="round" dot={false} activeDot={false} isAnimationActive={false} />
            ))}
            <Line type="linear" dataKey="overallScore" name="종합" stroke="var(--ink)" strokeWidth={2.5}
              dot={dot(false)} activeDot={dot(true)} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mp-trend-cap t-caption c-3">
        {total > items.length && <span>전체 <span className="t-data">{total}</span>회 중 최근 <span className="t-data">{items.length}</span>회만 보여 줘요. </span>}
        점을 누르면 그 회차 리포트로 이동해요.
      </figcaption>
      <TrendTable points={points} />
    </figure>
  );
}

function TrendTooltip({ active, payload, shown }: TooltipProps<number, string> & { shown: Record<Category, boolean> }) {
  const p = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
  if (!p) return null;
  return (
    <div className="mp-tip">
      <p className="mp-tip-date t-data">{dateTimeLabel(p.createdAt)}</p>
      <p className="mp-tip-title">{p.presentationTitle} <span className="c-2">{p.attemptNo}회차</span></p>
      <p className="mp-tip-score"><span className="t-data-strong">{p.overallScore}</span><span className="mp-tip-unit">점</span><span className="mp-tip-grade t-data">{p.grade}</span></p>
      {CATEGORIES.some((c) => shown[c]) && (
        <dl className="mp-tip-cats">
          {CATEGORIES.filter((c) => shown[c]).map((c) => (
            <div key={c}><dt>{CATEGORY_LABEL[c]}</dt><dd className="t-data">{dash(p.scores[c])}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** 차트를 보지 못하거나 키보드로 쓰는 사람을 위한 표 보기. 회차마다 리포트 링크가 있다. */
function TrendTable({ points }: { points: Point[] }) {
  return (
    <details className="mp-trend-table">
      <summary className="t-small">표로 보기</summary>
      <div className="mp-trend-scroll">
        <table>
          <thead>
            <tr><th scope="col">날짜</th><th scope="col">회차</th><th scope="col">종합</th>{CATEGORIES.map((c) => <th key={c} scope="col">{CATEGORY_LABEL[c]}</th>)}</tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.analysisId}>
                <td className="t-data">{shortDate(p.createdAt)}</td>
                <td><Link className="link link-plain" to={`/analyses/${p.analysisId}`}>{p.presentationTitle} {p.attemptNo}회차</Link></td>
                <td className="t-data">{p.overallScore} <span className="c-3">{p.grade}</span></td>
                {CATEGORIES.map((c) => <td key={c} className="t-data">{dash(p.scores[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
