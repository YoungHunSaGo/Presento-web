import type { UseQueryResult } from '@tanstack/react-query';
import type { Insight, MyInsights } from '@/api/types';
import { QueryView, SectionFrame, TREND_LABEL, TrendMark } from './shared';
import '@/styles/mypage/insights.css';

// 강점(최대 3) / 약점(최대 3) 카드 + 다음 연습 집중 포인트(focusTip) (M2)
// status 가 INSUFFICIENT_DATA 면 카드 대신 requiredCount·analysisCount 안내 문구.
export interface InsightsSectionProps { insights: UseQueryResult<MyInsights> }

export function InsightsSection({ insights }: InsightsSectionProps) {
  // 판정에 쓴 회차 수(basedOnRecent, 최대 10)를 제목 옆에 작게 둔다. READY 이고 지금 필터의 결과일 때만.
  // TODO(spec): 이 표시와 문구('최근 N회 기준')는 명세에 없다. 넣을지·문구를 무엇으로 할지 확인 필요.
  const current = insights.isSuccess && !insights.isPlaceholderData ? insights.data : null;
  const basis = current?.status === 'READY' && current.basedOnRecent > 0
    ? <span className="t-caption c-3">최근 <span className="num">{current.basedOnRecent}</span>회 기준</span> : null;
  return (
    <SectionFrame id="mp-insights" title="강점과 약점" aside={basis}>
      <QueryView query={insights} minHeight={220}>{(d) => (d.status === 'INSUFFICIENT_DATA' ? <Insufficient d={d} /> : <Ready d={d} />)}</QueryView>
    </SectionFrame>
  );
}

/**
 * 명세 2장: 데이터가 적으면 강점·약점·집중 포인트 영역 대신 이 문구만 보인다(문구는 명세 그대로).
 * 옆의 칸 막대는 '몇 회 남았는지'를 보조로 보여 줄 뿐이라 읽기 도구에서는 숨긴다.
 */
function Insufficient({ d }: { d: MyInsights }) {
  const steps = Math.max(1, Math.min(d.requiredCount, MAX_STEPS));
  // 칸 하나가 1회. requiredCount 가 칸 수보다 크면 비율로 줄여 채운다.
  const filled = d.requiredCount <= MAX_STEPS ? Math.min(d.analysisCount, steps)
    : Math.min(steps, Math.floor((d.analysisCount / d.requiredCount) * steps));
  return (
    <div className="ins-insufficient">
      <span className="ins-steps" aria-hidden="true">
        {Array.from({ length: steps }, (_, i) => <span key={i} className={i < filled ? 'on' : undefined} />)}
      </span>
      <p className="t-body">분석을 {d.requiredCount}회 이상 완료하면 강점과 약점을 알려드려요. (현재 {d.analysisCount}회)</p>
    </div>
  );
}
const MAX_STEPS = 10;

function Ready({ d }: { d: MyInsights }) {
  return (
    <div className="ins">
      <div className="ins-cols">
        {/* 서버가 이미 정렬해 준다(강점은 점수 높은 순, 약점은 낮은 순). 순서를 바꾸지 않는다. */}
        <InsightColumn kind="strength" title="강점" order="점수 높은 순" items={d.strengths} empty="아직 뚜렷한 강점이 없어요" />
        <InsightColumn kind="weakness" title="약점" order="점수 낮은 순" items={d.weaknesses} empty="뚜렷한 약점이 없어요. 좋아요!" />
      </div>
      {/* 명세: focusTip 은 약점이 있을 때만 문자열이다. null 이면 상자를 그리지 않는다(빈 문자열도 같이 거른다). */}
      {d.focusTip && <FocusTip tip={d.focusTip} />}
    </div>
  );
}

/** 다음 연습 집중 포인트. 이 영역에서 가장 눈에 띄어야 해서 진한 면(ink) 위에 둔다. */
function FocusTip({ tip }: { tip: string }) {
  return (
    <aside className="ins-focus" aria-labelledby="mp-insights-focus-h">
      <svg className="ins-focus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" />
      </svg>
      <div className="ins-focus-body">
        <h3 id="mp-insights-focus-h" className="ins-focus-title t-caption">다음 연습 집중 포인트</h3>
        <p className="t-title">{tip}</p>
      </div>
    </aside>
  );
}

type Kind = 'strength' | 'weakness';

/**
 * 강점·약점 한 칸. 색만으로 나누지 않도록 제목(강점/약점)과 정렬 설명, 머리 표시(채운 칸 / 빈 칸)를 같이 둔다.
 * 명세상 최대 3개라 그대로 다 그린다.
 */
function InsightColumn({ kind, title, order, items, empty }: { kind: Kind; title: string; order: string; items: Insight[]; empty: string }) {
  const headId = `mp-insights-${kind}-h`;
  return (
    <div className={`ins-col ins-col-${kind}`} role="group" aria-labelledby={headId}>
      <div className="ins-col-head">
        <span className="ins-col-mark" aria-hidden="true" />
        <h3 id={headId} className="t-title">{title}</h3>
        {items.length > 0 && <span className="t-caption c-3">{order}</span>}
      </div>
      {items.length === 0 ? (
        <p className="ins-empty t-small c-2">{empty}</p>
      ) : (
        <ol className="ins-list">
          {items.map((it, i) => <InsightCard key={it.metric} item={it} rank={i + 1} />)}
        </ol>
      )}
    </div>
  );
}

/** 카드 한 장. label·valueText·message 는 서버 문장 그대로 쓴다(명세: 프론트에서 문장을 새로 만들지 않는다). */
function InsightCard({ item, rank }: { item: Insight; rank: number }) {
  return (
    <li className="ins-card">
      <div className="ins-card-top">
        <span className="ins-rank t-data" aria-hidden="true">{rank}</span>
        <p className="ins-label t-body-strong">{item.label}</p>
        {/* UP 은 항상 '좋아짐'(추임새가 줄어도 UP). TrendMark 가 화살표·색·읽기 문구를 맡고,
            화살표만으로는 방향의 뜻(위=좋아짐)이 헷갈릴 수 있어 같은 말을 글자로도 보인다. change 가 null 이면 숫자 없이. */}
        <span className="ins-trend">
          <TrendMark trend={item.trend} change={item.change} />
          <span className="t-caption c-3" aria-hidden="true">{TREND_LABEL[item.trend]}</span>
        </span>
      </div>
      <div className="ins-score">
        <span className="ins-score-num"><span className="ins-score-val">{item.score}</span><span className="ins-score-unit">점</span></span>
        <span className="ins-value t-small">{item.valueText}</span>
      </div>
      <span className="ins-meter" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} /></span>
      <p className="ins-msg t-small c-2">{item.message}</p>
    </li>
  );
}
