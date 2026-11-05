import type { UseQueryResult } from '@tanstack/react-query';
import type { MyStats, ScoreTimeline } from '@/api/types';
import { QueryView, SectionFrame, TrendMark, dash, trendOf } from './shared';
import '@/styles/mypage/summary.css';

// 요약 카드 4개(M1: 완료한 연습 수, 총 연습 시간, 평균 점수 + recentChange 화살표, 연속 연습일)
// + 점수 추이 꺾은선(M3: x=회차 날짜, y=종합 점수, 범례로 전달력·비언어·내용 선 토글, 점 클릭 → /analyses/{analysisId})
export interface SummarySectionProps { stats: UseQueryResult<MyStats>; timeline: UseQueryResult<ScoreTimeline> }

export function SummarySection({ stats, timeline }: SummarySectionProps) {
  return (
    <SectionFrame id="mp-summary" title="요약">
      {/* 카드와 차트는 각자 QueryView 로 감싸, M1·M3 중 하나가 실패해도 다른 쪽은 그린다(명세 6장). */}
      <QueryView query={stats} minHeight={132}>{(d) => <SummaryCards s={d} />}</QueryView>
      <QueryView query={timeline} minHeight={260}>{(d) => <p className="mp-placeholder">점수 추이 차트 자리 ({d.items.length}회차)</p>}</QueryView>
    </SectionFrame>
  );
}

/* ---------- 요약 카드 (M1) ---------- */

/** 숫자는 데이터 글꼴, 단위는 본문 글꼴로 나눠 그리기 위한 조각. */
type Part = { n: number; unit: string };

/**
 * 총 연습 시간을 읽기 쉬운 단위로. 1분 미만은 초, 1시간 미만은 분, 그 이상은 시간+분.
 * 요약 카드라 분 아래 초는 버린다(minutesLabel 의 '166분 40초'보다 '2시간 46분'이 한눈에 읽힌다).
 */
function practiceParts(sec: number): Part[] {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return [{ n: s, unit: '초' }];
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
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
