import type { UseQueryResult } from '@tanstack/react-query';
import type { Insight, MyInsights } from '@/api/types';
import { QueryView, SectionFrame, TREND_LABEL, TrendMark } from './shared';
import '@/styles/mypage/insights.css';

// 강점(최대 3) / 약점(최대 3) 카드 + 다음 연습 집중 포인트(focusTip) (M2)
// status 가 INSUFFICIENT_DATA 면 카드 대신 requiredCount·analysisCount 안내 문구.
export interface InsightsSectionProps { insights: UseQueryResult<MyInsights> }

export function InsightsSection({ insights }: InsightsSectionProps) {
  return (
    <SectionFrame id="mp-insights" title="강점과 약점">
      <QueryView query={insights} minHeight={220}>{(d) => <Ready d={d} />}</QueryView>
    </SectionFrame>
  );
}

function Ready({ d }: { d: MyInsights }) {
  return (
    <div className="ins">
      <div className="ins-cols">
        {/* 서버가 이미 정렬해 준다(강점은 점수 높은 순, 약점은 낮은 순). 순서를 바꾸지 않는다. */}
        <InsightColumn kind="strength" title="강점" order="점수 높은 순" items={d.strengths} empty="아직 뚜렷한 강점이 없어요" />
        <InsightColumn kind="weakness" title="약점" order="점수 낮은 순" items={d.weaknesses} empty="뚜렷한 약점이 없어요. 좋아요!" />
      </div>
    </div>
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
