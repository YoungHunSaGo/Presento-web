import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Trend } from '@/api/types';
import '@/styles/mypage/shared.css';

// 마이페이지 섹션들이 같이 쓰는 틀·상태·표시 조각. 섹션 파일끼리는 서로 import 하지 않고 여기만 쓴다.

/** null·undefined 를 '-'로(명세 2장: averageScore·recentChange·bestScore 등). unit 은 값 뒤에 붙는다. */
export const dash = (n: number | null | undefined, unit = '') => (n == null ? '-' : `${n}${unit}`);

/** 섹션 틀: 제목(h2) + 본문. aside 는 제목 줄 오른쪽(범례 토글 등). */
export function SectionFrame({ id, title, aside, className, children }: { id: string; title: string; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`mp-section${className ? ` ${className}` : ''}`} aria-labelledby={`${id}-h`}>
      <div className="mp-section-head">
        <h2 id={`${id}-h`} className="t-h2">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** 명세 6장: 실패한 영역에만 문구 + 다시 시도. 다른 영역은 그대로 그린다. */
export function SectionError({ onRetry, minHeight = 160 }: { onRetry: () => void; minHeight?: number }) {
  return (
    <div className="mp-state" role="alert" style={{ minHeight }}>
      <p className="t-body c-2">잠시 후 다시 시도해 주세요</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>다시 시도</button>
    </div>
  );
}

/** 섹션 자리를 미리 잡아 두는 로딩 표시. 높이를 실제 내용과 비슷하게 주면 그려질 때 화면이 덜 밀린다. */
export function SectionLoading({ minHeight = 160, label = '불러오는 중' }: { minHeight?: number; label?: string }) {
  return <div className="mp-state mp-loading" role="status" style={{ minHeight }}><span className="t-small c-3">{label}</span></div>;
}

/**
 * 쿼리 하나의 로딩·에러·성공을 한 번에 처리한다. 성공이면 children(data)를 그린다.
 * 필터를 바꾸는 동안(이전 결과를 placeholder 로 보여 줄 때)은 흐리게 두고 aria-busy 를 켠다.
 */
export function QueryView<T>({ query, minHeight, children }: { query: UseQueryResult<T>; minHeight?: number; children: (data: T) => ReactNode }) {
  if (query.isPending) return <SectionLoading minHeight={minHeight} />;
  if (query.isError) return <SectionError minHeight={minHeight} onRetry={() => query.refetch()} />;
  const stale = query.isPlaceholderData;
  return <div className="mp-query" data-stale={stale || undefined} aria-busy={stale || undefined}>{children(query.data)}</div>;
}

// 명세 2장: UP 은 항상 '좋아짐'(추임새가 줄어도 UP). UP 초록 위 화살표, DOWN 빨강 아래 화살표, FLAT 회색 가로선.
export const TREND_LABEL: Record<Trend, string> = { UP: '좋아짐', DOWN: '나빠짐', FLAT: '변화 없음' };
const TREND_PATH: Record<Trend, string> = { UP: 'M12 19V5M5 12l7-7 7 7', DOWN: 'M12 5v14M19 12l-7 7-7-7', FLAT: 'M5 12h14' };

/** 추이 표시. change 를 주면 화살표 옆에 +8 / -7 처럼 붙인다(null 이면 숫자 없이). */
export function TrendMark({ trend, change }: { trend: Trend; change?: number | null }) {
  return (
    <span className={`trend trend-${trend.toLowerCase()}`} role="img" aria-label={change != null ? `${TREND_LABEL[trend]} ${change > 0 ? '+' : ''}${change}` : TREND_LABEL[trend]}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={TREND_PATH[trend]} /></svg>
      {change != null && <span className="trend-num" aria-hidden="true">{change > 0 ? '+' : ''}{change}</span>}
    </span>
  );
}

/**
 * M1 recentChange 처럼 trend 없이 숫자만 오는 값을 화살표로 바꾼다. null 이면 null.
 * TODO(spec): recentChange 에는 FLAT 기준이 정해져 있지 않다. Insight 의 ±5점 기준을 쓸지 묻기 전까지 부호로만 나눈다.
 */
export const trendOf = (change: number | null): Trend | null => (change == null ? null : change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT');
