import { Link } from 'react-router-dom';
import type { Purpose } from '@/api/types';
import { PURPOSE_LABEL, fullDateLabel } from '@/lib/format';
import {
  DEFAULT_PERIOD, PERIOD_OPTIONS, useMe, useMyInsights, useMyStats, useMypageFilters, useResetFiltersOnValidationError, useScoreTimeline,
  type MypageFilters,
} from '@/hooks/useMypage';
import { SummarySection } from './mypage/SummarySection';
import { InsightsSection } from './mypage/InsightsSection';
import { MetricsSection } from './mypage/MetricsSection';
import { ActivitySection } from './mypage/ActivitySection';
import '@/styles/mypage/page.css';

// 명세(presento-mypage-spec.md) 2장 레이아웃 순서. 세 API 는 같은 period·purpose 로 함께 부르고,
// 각 섹션이 자기 쿼리의 로딩·오류·다시 시도를 따로 그려 하나가 실패해도 나머지는 보인다(6장).
export function MyPage() {
  const f = useMypageFilters();
  const stats = useMyStats(f.period, f.purpose);
  const insights = useMyInsights(f.period, f.purpose);
  const timeline = useScoreTimeline(f.period, f.purpose);
  useResetFiltersOnValidationError(f.reset, stats.error, insights.error, timeline.error);
  // 빈 상태는 M1 이 성공했고 그 결과가 지금 필터의 것일 때만 판단한다(실패·이전 필터 결과로는 바꾸지 않는다).
  const empty = stats.isSuccess && !stats.isPlaceholderData && stats.data.analysisCount === 0;

  return (
    <main className="page mp">
      <header className="mp-top">
        <Profile />
        <FilterBar f={f} />
      </header>
      {empty ? <EmptyState f={f} /> : (
        <div className="mp-body">
          <SummarySection stats={stats} timeline={timeline} />
          <InsightsSection insights={insights} />
          <MetricsSection stats={stats} insights={insights} />
          <ActivitySection stats={stats} />
        </div>
      )}
    </main>
  );
}

function Profile() {
  const { user: u, isError } = useMe();
  return (
    <div className="mp-profile">
      <h1 className="t-h1">{u?.nickname ?? '마이페이지'}</h1>
      {u ? (
        <p className="mp-profile-meta t-small c-2"><span>{u.email}</span><span>가입일 {fullDateLabel(u.createdAt)}</span></p>
      ) : isError ? <p className="t-small c-3">내 정보를 불러오지 못했어요</p> : null}
    </div>
  );
}

function FilterBar({ f }: { f: MypageFilters }) {
  return (
    <div className="mp-filters">
      <div className="mp-seg" role="group" aria-label="기간">
        {PERIOD_OPTIONS.map((o) => (
          <button key={o.value} type="button" className="mp-seg-btn" aria-pressed={f.period === o.value}
            onClick={() => { if (f.period !== o.value) f.setPeriod(o.value); }}>{o.label}</button>
        ))}
      </div>
      <label className="mp-purpose">
        <span className="visually-hidden">발표 목적</span>
        <select className="input" value={f.purpose ?? ''} onChange={(e) => f.setPurpose((e.target.value || null) as Purpose | null)}>
          <option value="">목적 전체</option>
          {(Object.keys(PURPOSE_LABEL) as Purpose[]).map((k) => <option key={k} value={k}>{PURPOSE_LABEL[k]}</option>)}
        </select>
      </label>
    </div>
  );
}

// 명세 2장: 완료한 연습이 0회면 필터 아래 전체를 빈 상태로 바꾼다.
// TODO(spec): 기간·목적을 좁혀서 0회가 된 경우도 같은 빈 상태인지 명세에 없다. 지금은 같은 화면에 '전체 보기'만 더한다.
function EmptyState({ f }: { f: MypageFilters }) {
  const filtered = f.period !== DEFAULT_PERIOD || f.purpose !== null;
  return (
    <div className="mp-empty">
      <p className="t-title">{filtered ? '선택한 기간·목적에는 완료한 연습이 없어요' : '아직 완료한 연습이 없어요'}</p>
      <div className="row wrap" style={{ gap: 'var(--s-3)', justifyContent: 'center' }}>
        <Link to="/presentations/new" className="btn btn-primary">첫 발표를 연습해 보세요</Link>
        {filtered && <button type="button" className="btn btn-secondary" onClick={f.reset}>전체 보기</button>}
      </div>
    </div>
  );
}
