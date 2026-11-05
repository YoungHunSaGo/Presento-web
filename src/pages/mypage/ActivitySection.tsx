import type { UseQueryResult } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MyStats } from '@/api/types';
import { PURPOSE_LABEL, minutesLabel } from '@/lib/format';
import { QueryView, SectionFrame, dash } from './shared';
import '@/styles/mypage/activity.css';

// 주간 활동 막대(M1 weeklyActivity: 최근 12주, 0인 주 포함) + 목적별 기록 표(M1 purposeBreakdown)
export interface ActivitySectionProps { stats: UseQueryResult<MyStats> }

type Week = MyStats['weeklyActivity'][number];

export function ActivitySection({ stats }: ActivitySectionProps) {
  return (
    <SectionFrame id="mp-activity" title="활동 기록">
      <QueryView query={stats} minHeight={280}>
        {(d) => (
          <div className="mp-act">
            <WeeklyActivity weeks={d.weeklyActivity} />
            <PurposeBreakdown rows={d.purposeBreakdown} />
          </div>
        )}
      </QueryView>
    </SectionFrame>
  );
}

// weekStart 는 'YYYY-MM-DD'(한국 날짜). new Date('YYYY-MM-DD')는 UTC 자정이라 시간대에 따라 하루 밀릴 수 있어
// 숫자로 나눠 로컬 날짜로 만든다.
const parseYmd = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };
const shortDate = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`;
const longDate = (dt: Date) => `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
/** 월요일 시작 주의 기간 문구(예: 11월 2일 ~ 11월 8일) */
const weekRange = (weekStart: string) => {
  const start = parseYmd(weekStart);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return `${longDate(start)} ~ ${longDate(end)}`;
};

function WeeklyActivity({ weeks }: { weeks: Week[] }) {
  // TODO(spec): weeklyActivity 는 기간 필터와 상관없이 항상 최근 12주로 온다. 30일·90일 필터일 때 각 주의 횟수도
  // 그 기간으로 잘리는지(잘리면 30일보다 오래된 주는 연습했어도 0으로 보임) 명세에 없다. 묻기 전까지 받은 값을 그대로 그린다.
  const total = weeks.reduce((n, w) => n + w.analysisCount, 0);
  const totalSec = Math.round(weeks.reduce((n, w) => n + w.practiceSec, 0) * 10) / 10;
  const activeWeeks = weeks.filter((w) => w.analysisCount > 0).length;
  const max = Math.max(0, ...weeks.map((w) => w.analysisCount));

  return (
    <figure className="mp-act-block mp-weekly" aria-labelledby="mp-weekly-h">
      <div className="mp-act-head">
        <h3 id="mp-weekly-h" className="t-title">주간 활동</h3>
        <p className="mp-weekly-sum t-small c-2">
          최근 12주 <strong className="mp-act-num">{total}회</strong>
          {/* 요약 카드의 총 연습 시간처럼 분 단위로 반올림해 같은 값이 두 곳에서 다르게 보이지 않게 한다. */}
          {total > 0 && <> · {minutesLabel(Math.round(totalSec / 60) * 60)} · 연습한 주 {activeWeeks}주</>}
        </p>
      </div>
      <div className="mp-weekly-chart" aria-hidden="true">
        <ResponsiveContainer>
          <BarChart data={weeks} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="weekStart" tickFormatter={(v: string) => shortDate(parseYmd(v))} interval="preserveEnd" minTickGap={8}
              tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'var(--font-data)' }} axisLine={{ stroke: 'var(--line-2)' }} tickLine={false} />
            {/* 횟수라 정수 눈금만. 전부 0이거나 작아도 눈금이 몇 개는 보이게 위쪽을 최소 4로 두고,
                짝수로 올려 0·2·4·7처럼 간격이 어긋난 눈금이 나오지 않게 한다. */}
            <YAxis allowDecimals={false} domain={[0, Math.max(4, Math.ceil(max / 2) * 2)]} width={28}
              tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<WeekTooltip />} cursor={{ fill: 'rgba(14, 15, 18, 0.05)' }} isAnimationActive={false} />
            <Bar dataKey="analysisCount" shape={WeekBar} maxBarSize={32} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* 차트를 못 보는 경우를 위한 주별 목록(화면에는 숨김).
          표(display: table)는 width: 1px·overflow: hidden 이 먹지 않아 내용 폭만큼 커지므로, 숨김 클래스는 감싼 div 에 둔다. */}
      <div className="visually-hidden">
        <table>
          <caption>주별 연습 횟수, 오래된 순</caption>
          <thead><tr><th scope="col">주</th><th scope="col">연습 수</th><th scope="col">연습 시간</th><th scope="col">평균 점수</th></tr></thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekStart}>
                <th scope="row">{weekRange(w.weekStart)}</th>
                <td>{w.analysisCount}회</td><td>{minutesLabel(w.practiceSec)}</td><td>{dash(w.averageScore, '점')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

interface BarShapeProps { x: number; y: number; width: number; height: number; payload: Week }

/** 0인 주도 빠뜨리지 않고 바닥에 얇은 회색 막대로 그린다(명세: 0인 주 포함). */
function WeekBar(props: unknown) {
  const { x, y, width, height, payload } = props as BarShapeProps;
  if (payload.analysisCount === 0) return <rect x={x} y={y - 3} width={width} height={3} rx={1.5} fill="var(--line-2)" />;
  return <Rectangle x={x} y={y} width={width} height={height} radius={[4, 4, 0, 0]} fill="var(--ink)" />;
}

function WeekTooltip({ active, payload }: { active?: boolean; payload?: { payload: Week }[] }) {
  const w = active ? payload?.[0]?.payload : undefined;
  if (!w) return null;
  return (
    <div className="mp-weekly-tip">
      <p className="mp-weekly-tip-h">{weekRange(w.weekStart)}</p>
      <dl>
        <div><dt>연습</dt><dd>{w.analysisCount}회</dd></div>
        <div><dt>연습 시간</dt><dd>{minutesLabel(w.practiceSec)}</dd></div>
        <div><dt>평균 점수</dt><dd>{dash(w.averageScore, '점')}</dd></div>
      </dl>
    </div>
  );
}

function PurposeBreakdown({ rows }: { rows: MyStats['purposeBreakdown'] }) {
  return (
    <section className="mp-act-block" aria-labelledby="mp-purpose-h">
      <div className="mp-act-head">
        <h3 id="mp-purpose-h" className="t-title">목적별 기록</h3>
      </div>
      {rows.length === 0 ? (
        <p className="mp-act-empty t-small c-3">아직 목적별 기록이 없어요</p>
      ) : (
        // 서버가 회차 수 많은 순으로 정렬해 준다(명세 4장). 순서를 바꾸지 않는다.
        <table className="mp-ptable">
          <thead>
            <tr><th scope="col">목적</th><th scope="col" className="r">연습 수</th><th scope="col" className="r">평균 점수</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.purpose}>
                <th scope="row">{PURPOSE_LABEL[r.purpose]}</th>
                <td className="r">{r.analysisCount}회</td>
                <td className="r">{dash(r.averageScore, '점')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
