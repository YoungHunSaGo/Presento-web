import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMe, getMyInsights, getMyStats, getScoreTimeline } from '@/api/endpoints';
import { errorCode, errorStatus } from '@/api/client';
import type { Period, Purpose } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';

// 마이페이지 필터(presento-mypage-spec.md 2·3장). purpose 가 null 이면 '목적 전체'라 쿼리에서 뺀다.
export const PERIOD_OPTIONS: { value: Period; label: string }[] = [{ value: '30d', label: '30일' }, { value: '90d', label: '90일' }, { value: 'all', label: '전체' }];
export const DEFAULT_PERIOD: Period = 'all';
const PURPOSES: Purpose[] = ['INTERVIEW', 'CLASS', 'PITCH', 'ETC'];
const isPeriod = (v: string | null): v is Period => PERIOD_OPTIONS.some((o) => o.value === v);
const isPurpose = (v: string | null): v is Purpose => PURPOSES.includes(v as Purpose);

/**
 * 필터 상태는 주소의 ?period=&purpose= 에 둔다. 새로고침·뒤로 가기에도 유지되고, 개발용 ?mock= 등 다른 값은 건드리지 않는다.
 * 기본값(전체 기간, 목적 전체)은 주소에서 빼 둔다. 정해진 값만 보내야 400 이 안 나므로, 주소에 이상한 값이 있으면 기본값으로 읽는다.
 */
export function useMypageFilters() {
  const [params, setParams] = useSearchParams();
  const rawPeriod = params.get('period'); const rawPurpose = params.get('purpose');
  const period: Period = isPeriod(rawPeriod) ? rawPeriod : DEFAULT_PERIOD;
  const purpose: Purpose | null = isPurpose(rawPurpose) ? rawPurpose : null;
  const write = useCallback((patch: { period?: Period; purpose?: Purpose | null }, replace = false) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (patch.period !== undefined) { if (patch.period === DEFAULT_PERIOD) next.delete('period'); else next.set('period', patch.period); }
    if (patch.purpose !== undefined) { if (patch.purpose === null) next.delete('purpose'); else next.set('purpose', patch.purpose); }
    return next;
  }, { replace }), [setParams]);
  const setPeriod = useCallback((p: Period) => write({ period: p }), [write]);
  const setPurpose = useCallback((p: Purpose | null) => write({ purpose: p }), [write]);
  // 명세 6장: 400 VALIDATION_ERROR 면 기본값으로 되돌린다. 기록을 남기지 않게 replace.
  const reset = useCallback(() => write({ period: DEFAULT_PERIOD, purpose: null }, true), [write]);
  // 주소에 정해지지 않은 값이 있으면 그 값만 기본값으로 정리해 화면과 주소를 맞춘다(올바른 다른 필터는 둔다).
  const badPeriod = rawPeriod !== null && !isPeriod(rawPeriod); const badPurpose = rawPurpose !== null && !isPurpose(rawPurpose);
  useEffect(() => {
    if (badPeriod || badPurpose) write({ period: badPeriod ? DEFAULT_PERIOD : undefined, purpose: badPurpose ? null : undefined }, true);
  }, [badPeriod, badPurpose, write]);
  return { period, purpose, setPeriod, setPurpose, reset };
}
export type MypageFilters = ReturnType<typeof useMypageFilters>;

/** 세 API 중 하나라도 400 VALIDATION_ERROR 면 필터를 기본값으로 되돌린다(명세 6장). */
export function useResetFiltersOnValidationError(reset: () => void, ...errors: unknown[]) {
  const bad = errors.some((e) => errorStatus(e) === 400 && errorCode(e) === 'VALIDATION_ERROR');
  useEffect(() => { if (bad) reset(); }, [bad, reset]);
}

// 키는 명세 예시 ['mypage', 'stats', period, purpose] 그대로. 필터를 바꾸는 동안에는 이전 결과를 placeholder 로 두어
// 화면이 비었다 다시 그려지지 않게 한다(isPlaceholderData 로 구분 가능). 4xx 재시도 없음·5xx 1회 재시도는 main.tsx 기본값.
const STALE = 60_000;
export const useMyStats = (period: Period, purpose: Purpose | null) =>
  useQuery({ queryKey: ['mypage', 'stats', period, purpose], queryFn: () => getMyStats(period, purpose), staleTime: STALE, placeholderData: keepPreviousData });
export const useMyInsights = (period: Period, purpose: Purpose | null) =>
  useQuery({ queryKey: ['mypage', 'insights', period, purpose], queryFn: () => getMyInsights(period, purpose), staleTime: STALE, placeholderData: keepPreviousData });
export const useScoreTimeline = (period: Period, purpose: Purpose | null) =>
  useQuery({ queryKey: ['mypage', 'timeline', period, purpose], queryFn: () => getScoreTimeline(period, purpose), staleTime: STALE, placeholderData: keepPreviousData });

/** A3 내 정보. 로그인 때 저장한 사용자를 먼저 보여 주고 서버 값으로 바꾼다. */
export function useMe() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000, placeholderData: user ?? undefined });
}
