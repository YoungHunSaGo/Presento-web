import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPresentation, getReport, getVideoUrl } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { Feedback, Report, Segment } from '@/api/types';
import { clock, shortDuration } from '@/lib/format';
import { BackLink, ErrorState, Loading } from '@/components/Layout';
import { EvidenceTrack } from '@/components/EvidenceTrack';
import { FlaggedWord } from '@/components/FlaggedWord';
import { usePlayback } from '@/hooks/usePlayback';

type Tab = 'clips' | 'transcript' | 'scripts' | 'questions' | 'slides' | 'summary';
const TABS: { key: Tab; label: string }[] = [
  { key: 'clips', label: '클립' }, { key: 'transcript', label: '대본' }, { key: 'scripts', label: '개선 스크립트' },
  { key: 'questions', label: '예상 질문' }, { key: 'slides', label: '슬라이드' }, { key: 'summary', label: '요약' },
];

export function ReportPage() {
  const { id = '' } = useParams();
  const r = useQuery({ queryKey: ['report', id], queryFn: () => getReport(id) });
  // 명세 N5: 1시간 뒤 만료되므로 리포트 화면에 들어올 때마다 새로 받는다.
  const v = useQuery({ queryKey: ['video-url', id], queryFn: () => getVideoUrl(id), staleTime: 0, gcTime: 0 });
  const p = useQuery({ queryKey: ['presentation', r.data?.presentationId], queryFn: () => getPresentation(r.data!.presentationId), enabled: !!r.data });
  if (r.isPending) return <main className="page"><Loading label="리포트를 불러오는 중" /></main>;
  if (r.isError) return <main className="page"><ErrorState message={errorMessage(r.error)} onRetry={() => r.refetch()} /></main>;
  return <ReportView report={r.data} videoUrl={v.data?.videoUrl} title={p.data?.title} nextNo={(p.data?.attempts[0]?.attemptNo ?? r.data.attemptNo) + 1} />;
}

function ReportView({ report, videoUrl, title, nextNo }: { report: Report; videoUrl?: string; title?: string; nextNo: number }) {
  const [params] = useSearchParams();
  const pb = usePlayback(report.durationSec, videoUrl || undefined);
  const clips = useMemo(() => [...report.feedbacks].sort((a, b) => a.start - b.start), [report.feedbacks]);
  const [selected, setSelected] = useState<string | null>(clips[0]?.id ?? null);
  const [clipOnly, setClipOnly] = useState(false);
  const [tab, setTab] = useState<Tab>('clips');
  const fillerCount = useMemo(() => Object.fromEntries(report.metrics.speech.fillers.map((f) => [f.word, f.count])), [report]);

  const go = (f: Feedback, autoplay = true) => { setSelected(f.id); pb.seek(f.start); if (autoplay) pb.play(); };
  useEffect(() => { const t = Number(params.get('t')); if (!Number.isNaN(t) && params.get('t')) { const f = clips.find((c) => Math.abs(c.start - t) < 0.5); if (f) go(f, false); else pb.seek(t); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 클립만 이어 보기: 지금 클립 끝을 넘으면 다음 클립 시작으로 건너뛴다.
  useEffect(() => {
    if (!clipOnly || !pb.playing) return;
    const cur = clips.find((c) => c.id === selected);
    if (cur && pb.time >= cur.end) { const i = clips.indexOf(cur); const nx = clips[i + 1]; if (nx) go(nx); else pb.pause(); }
  }, [pb.time, clipOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  // 재생 위치가 다른 클립에 들어가면 선택을 따라간다.
  useEffect(() => { const inClip = clips.find((c) => pb.time >= c.start && pb.time < c.end); if (inClip && inClip.id !== selected) setSelected(inClip.id); }, [pb.time]); // eslint-disable-line react-hooks/exhaustive-deps

  const selIdx = clips.findIndex((c) => c.id === selected);
  const segNow = report.transcript.segments.find((s) => pb.time >= s.start && pb.time < s.end);
  const flagDetail = (w: string, tag: 'FILLER' | 'REPEAT') => tag === 'FILLER' ? (fillerCount[w] ? `이 발표에서 ${fillerCount[w]}번 나온 말입니다.` : '말과 말 사이를 채우는 소리입니다.') : '바로 앞 말을 한 번 더 반복했습니다.';
  const words = (s: Segment, onDark = false) => s.words.map((w, i) => (
    <span key={i}>{i > 0 && ' '}{w.tag ? <FlaggedWord word={w.text} kind={w.tag} detail={flagDetail(w.text, w.tag)} onDark={onDark} /> : w.text}</span>
  ));
  const sp = report.metrics.speech; const nv = report.metrics.nonverbal;

  return (
    <main className="page stack report" style={{ gap: 'var(--s-6)' }}>
      <div className="row between wrap" style={{ gap: 'var(--s-6)', alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 8 }}>
          <BackLink to={`/presentations/${report.presentationId}`}>{title ?? '발표'}</BackLink>
          <h1 className="t-h1">{report.attemptNo}회차 리포트</h1>
        </div>
        <div className="row" style={{ gap: 28 }}>
          <span className="t-h2">{report.overall.score}점</span>
          <Link to={`/presentations/${report.presentationId}/record`} className="btn btn-primary">{nextNo}회차 연습하기</Link>
        </div>
      </div>

      <EvidenceTrack duration={report.durationSec} feedbacks={clips} selectedId={selected} current={pb.time} lowConfidence={nv.lowConfidenceRanges} onSelect={(f) => go(f)} />

      <div className="report-grid">
        <section className="report-main" aria-label="피드백">
          <div className="tabs" role="tablist">
            {TABS.map((t) => <button key={t.key} role="tab" className="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>)}
          </div>
          <div className="tabpanel" role="tabpanel">
            {tab === 'clips' && (
              <ol className="clips rule-list">
                {clips.map((f, i) => (
                  <li key={f.id}>
                    <button className={`clip${f.id === selected ? ' on' : ''}`} onClick={() => go(f)} aria-current={f.id === selected || undefined}>
                      <span className="clip-frame" aria-hidden="true"><span className="t-data">{shortDuration(f.end - f.start)}</span><span className="clip-cap">{f.evidence}</span></span>
                      <span className="stack" style={{ gap: 3, textAlign: 'left' }}>
                        <span className="row" style={{ gap: 8, alignItems: 'baseline' }}><span className="t-caption">클립 {i + 1}</span><span className="t-data c-ev">{clock(f.start)}</span></span>
                        <span className="t-title">{f.title}</span>
                        <span className="t-small c-2">{f.description}</span>
                        <span className="t-small" style={{ fontWeight: 600 }}>다음엔 {f.suggestion}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {tab === 'transcript' && <Transcript segments={report.transcript.segments} now={segNow?.id} onSeek={pb.seek} render={(s) => words(s)} />}
            {tab === 'scripts' && (
              <ol className="rule-list">
                {report.improvedScripts.map((s) => (
                  <li key={s.segmentId} className="script">
                    <button className="t-data c-ev link link-plain" onClick={() => pb.seek(s.start)}>{clock(s.start)} – {clock(s.end)}</button>
                    <div className="script-compare">
                      <div className="stack" style={{ gap: 6 }}><span className="t-caption c-3">원문</span>
                        <p className="t-small c-2">{s.original.split(' ').map((w, i) => <span key={i}>{i > 0 && ' '}{fillerCount[w] ? <FlaggedWord word={w} kind="FILLER" detail={flagDetail(w, 'FILLER')} /> : w}</span>)}</p></div>
                      <div className="stack" style={{ gap: 6 }}><span className="t-caption c-3">개선문</span><p className="t-body">{s.improved}</p></div>
                    </div>
                    <p className="t-small c-2">{s.reason}</p>
                  </li>
                ))}
              </ol>
            )}
            {tab === 'questions' && (
              <ol className="rule-list">
                {report.expectedQuestions.map((q) => (
                  <li key={q.question} className="question"><p className="t-title">{q.question}</p><p className="t-caption c-3">질문 의도: {q.intent}</p><p className="t-small c-2">{q.answerTip}</p></li>
                ))}
              </ol>
            )}
            {tab === 'slides' && <Slides report={report} onSeek={(t) => { const f = clips.find((c) => c.type === 'SLIDE_MISSED' && c.start <= t + 1); if (f) go(f); }} />}
            {tab === 'summary' && (
              <div className="stack summary" style={{ gap: 'var(--s-6)' }}>
                <p className="t-body">{report.overall.summary}</p>
                <div className="two">
                  <Block title="잘한 점">{report.overall.strengths.map((s) => <p key={s} className="t-small">{s}</p>)}</Block>
                  <Block title="고칠 점">{report.overall.improvements.map((s) => <p key={s} className="t-small">{s}</p>)}</Block>
                </div>
                <dl className="mtable">{report.scores.map((s) => <Row key={s.category} k={s.label} v={`${s.score}`} />)}<Row k="등급" v={report.overall.grade} /></dl>
              </div>
            )}
          </div>
        </section>

        <aside className="report-side stack" style={{ gap: 'var(--s-4)' }} aria-label="영상">
          <div className="player">
            {videoUrl ? <video {...pb.bind} src={videoUrl} playsInline preload="metadata" /> : null}
            <div className="player-cap" aria-live="off">{segNow ? <p>{words(segNow, true)}</p> : null}</div>
            {selIdx >= 0 && <span className="player-badge t-caption"><span className="t-data">클립 {selIdx + 1} / {clips.length}</span> {clips[selIdx].title}</span>}
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => (pb.playing ? pb.pause() : pb.play())}>{pb.playing ? '일시정지' : '재생'}</button>
            <button className="btn btn-secondary" onClick={() => selIdx > 0 && go(clips[selIdx - 1])} disabled={selIdx <= 0}>이전 클립</button>
            <button className="btn btn-secondary" onClick={() => selIdx < clips.length - 1 && go(clips[selIdx + 1])} disabled={selIdx >= clips.length - 1}>다음 클립</button>
          </div>
          <div className="row between">
            <label className="switch"><input type="checkbox" checked={clipOnly} onChange={(e) => { setClipOnly(e.target.checked); if (e.target.checked && clips[0]) go(clips[selIdx >= 0 ? selIdx : 0]); }} /><span className="switch-ui" aria-hidden="true" />
              <span className="t-small" style={{ fontWeight: 600 }}>클립만 이어 보기 ({shortDuration(clips.reduce((a, c) => a + c.end - c.start, 0))})</span></label>
            <span className="t-data"><b>{clock(pb.time)}</b> <span className="c-3">/ {clock(report.durationSec)}</span></span>
          </div>
        </aside>
        <section className="report-metrics stack" style={{ gap: 'var(--s-3)' }} aria-label="측정값">
          <h2 className="t-h2">측정값</h2>
          <dl className="mtable">
            <Row k="말 속도" v={`${sp.syllablesPerMin} 음절/분`} note={sp.paceSeries[0] ? `도입 30초 ${sp.paceSeries[0].value}` : undefined} />
            <Row k="추임새" v={`${sp.fillerCount}회`} note={sp.fillers.map((f) => `${f.word} ${f.count}`).join(', ')} />
            <Row k="침묵" v={`${sp.silenceCount}회`} note={`가장 길게 ${sp.longestSilenceSec}초`} />
            <Row k="정면 시선" v={`${Math.round(nv.gazeFrontRatio * 100)}%`} />
            <Row k="자세 안정도" v={`${Math.round(nv.postureStability * 100)}%`} />
            <Row k="제스처" v={`${nv.gesturePerMin}회/분`} />
            <Row k="발표 시간" v={shortDuration(report.durationSec)} note={sp.timeLimitSec ? `제한 ${shortDuration(sp.timeLimitSec)}${sp.overTimeSec ? `, ${sp.overTimeSec}초 초과` : ''}` : undefined} />
          </dl>
        </section>
      </div>
    </main>
  );
}

function Transcript({ segments, now, onSeek, render }: { segments: Segment[]; now?: string; onSeek: (t: number) => void; render: (s: Segment) => ReactNode }) {
  const box = useRef<HTMLOListElement>(null);
  // 명세: 재생 중인 문장 하이라이트 + 자동 스크롤
  useEffect(() => { box.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [now]);
  return (
    <ol className="transcript" ref={box}>
      {segments.map((s) => (
        <li key={s.id} className={`seg${s.id === now ? ' now' : ''}`} aria-current={s.id === now || undefined}>
          <button className="t-data seg-time" onClick={() => onSeek(s.start)} aria-label={`${clock(s.start)}로 이동`}>{clock(s.start)}</button>
          <p className="t-body">{render(s)}</p>
        </li>
      ))}
    </ol>
  );
}

function Slides({ report, onSeek }: { report: Report; onSeek: (t: number) => void }) {
  const cov = report.slideCoverage;
  if (!cov) return (
    <div className="stack" style={{ gap: 'var(--s-3)', paddingTop: 'var(--s-6)' }}>
      <p className="t-body">이 발표에는 PDF가 없어 슬라이드 일치도를 계산하지 않았습니다.</p>
      <p className="t-small c-2">발표 자료를 올리면 다음 회차부터 빠뜨린 슬라이드를 찾습니다.</p>
      <Link to={`/presentations/${report.presentationId}`} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>발표 자료 PDF 올리기</Link>
    </div>
  );
  const missed = cov.filter((c) => !c.covered);
  const slideClip = report.feedbacks.find((f) => f.type === 'SLIDE_MISSED');
  return (
    <div className="stack" style={{ gap: 'var(--s-4)', paddingTop: 'var(--s-4)' }}>
      <p className="row" style={{ gap: 10, alignItems: 'baseline' }}><span className="t-title">{cov.length}장 중 {cov.length - missed.length}장 설명</span>{missed.length > 0 && <span className="t-small c-2">설명하지 않은 슬라이드 {missed.length}장</span>}</p>
      {/* TODO(spec): 페이지 썸네일 이미지는 명세에 없다. 프론트에서 PDF를 렌더링할지 백엔드가 이미지를 줄지 결정 필요. */}
      <ol className="pages">{cov.map((c) => (
        <li key={c.page} className={`page-tile${c.covered ? '' : ' miss'}`}><span className="t-data">{c.page}</span><span className="t-caption">{c.covered ? '설명함' : '설명 안 함'}</span></li>
      ))}</ol>
      {missed.map((c) => (
        <div key={c.page} className="missed">
          <p className="row" style={{ gap: 10, alignItems: 'baseline' }}><span className="t-body-strong">{c.page}번 슬라이드</span>
            {slideClip && <button className="t-data c-ev link" onClick={() => onSeek(slideClip.start)}>{clock(slideClip.start)}</button>}</p>
          {c.note && <p className="t-small">{c.note}</p>}
        </div>
      ))}
    </div>
  );
}

const Block = ({ title, children }: { title: string; children: ReactNode }) => <div className="stack" style={{ gap: 6 }}><p className="t-body-strong">{title}</p>{children}</div>;
const Row = ({ k, v, note }: { k: string; v: string; note?: string }) => (<div className="mrow"><dt className="t-small c-2">{k}</dt><dd className="t-data" style={{ fontWeight: 700 }}>{v}</dd>{note ? <dd className="t-caption c-3">{note}</dd> : <dd />}</div>);
