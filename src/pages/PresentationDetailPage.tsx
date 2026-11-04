import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { deleteAnalysis, deletePresentation, getHistory, getPresentation, getReport, updatePresentation } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { Attempt, Feedback, Report, Severity } from '@/api/types';
import { PURPOSE_LABEL, clock, dateTimeLabel, minutesLabel } from '@/lib/format';
import { BackLink, ErrorState, Loading } from '@/components/Layout';
import { EvidenceTrack } from '@/components/EvidenceTrack';

const SEV_RANK: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export function PresentationDetailPage() {
  const { id = '' } = useParams(); const nav = useNavigate(); const qc = useQueryClient();
  const p = useQuery({ queryKey: ['presentation', id], queryFn: () => getPresentation(id) });
  const h = useQuery({ queryKey: ['history', id], queryFn: () => getHistory(id) });
  const completed = (p.data?.attempts ?? []).filter((a) => a.status === 'COMPLETED');
  const reports = useQueries({ queries: completed.map((a) => ({ queryKey: ['report', a.analysisId], queryFn: () => getReport(a.analysisId), staleTime: 60_000 })) });
  const reportOf = (aid: string) => reports[completed.findIndex((a) => a.analysisId === aid)]?.data as Report | undefined;

  const [editing, setEditing] = useState(false); const [title, setTitle] = useState(''); const [confirmDel, setConfirmDel] = useState(false);
  const save = useMutation({ mutationFn: () => updatePresentation(id, { title: title.trim() }), onSuccess: () => { setEditing(false); qc.invalidateQueries({ queryKey: ['presentation', id] }); qc.invalidateQueries({ queryKey: ['presentations'] }); } });
  const del = useMutation({ mutationFn: () => deletePresentation(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['presentations'] }); nav('/'); } });
  const delAttempt = useMutation({ mutationFn: (aid: string) => deleteAnalysis(aid), onSuccess: () => qc.invalidateQueries({ queryKey: ['presentation', id] }) });

  if (p.isPending) return <main className="page"><Loading /></main>;
  if (p.isError) return <main className="page"><ErrorState message={errorMessage(p.error)} onRetry={() => p.refetch()} /></main>;
  const d = p.data; const nextNo = (d.attempts[0]?.attemptNo ?? 0) + 1;
  const latest = completed[0] ? reportOf(completed[0].analysisId) : undefined;
  const watch = latest ? [...latest.feedbacks].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.start - b.start).slice(0, 3) : [];
  const meta = [PURPOSE_LABEL[d.purpose], d.timeLimitSec ? `제한 ${minutesLabel(d.timeLimitSec)}` : null, d.hasSlides ? '슬라이드 PDF 있음' : null].filter(Boolean).join(', ');

  return (
    <main className="page stack" style={{ gap: 'var(--s-8)' }}>
      <BackLink to="/">내 발표</BackLink>
      <div className="row between wrap" style={{ gap: 'var(--s-6)', alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 6 }}>
          {editing ? (
            <form className="row" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); if (title.trim()) save.mutate(); }}>
              <input className="input" style={{ width: 420 }} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} autoFocus aria-label="발표 제목" />
              <button className="btn btn-primary" disabled={!title.trim() || save.isPending}>저장</button>
              <button type="button" className="link" onClick={() => setEditing(false)}>취소</button>
            </form>
          ) : <h1 className="t-h1">{d.title}</h1>}
          <p className="t-small c-2">{meta}</p>
        </div>
        <div className="row" style={{ gap: 20 }}>
          {!editing && <button className="link link-plain" onClick={() => { setTitle(d.title); setEditing(true); }}>수정</button>}
          {confirmDel ? (
            <span className="row" style={{ gap: 12 }}><span className="t-small">회차와 영상까지 모두 삭제됩니다.</span>
              <button className="link link-danger" onClick={() => del.mutate()} disabled={del.isPending}>삭제</button>
              <button className="link link-plain" onClick={() => setConfirmDel(false)}>취소</button></span>
          ) : <button className="link link-plain link-danger" onClick={() => setConfirmDel(true)}>삭제</button>}
          <Link to={`/presentations/${id}/record`} className="btn btn-primary">{nextNo}회차 연습하기</Link>
        </div>
      </div>
      {(save.isError || del.isError) && <p className="field-msg err" role="alert">{errorMessage(save.error ?? del.error)}</p>}

      <div className="detail-grid">
        <section className="stack" style={{ gap: 'var(--s-3)' }} aria-labelledby="attempts-h">
          <h2 id="attempts-h" className="t-h2">회차</h2>
          {d.attempts.length === 0 && <p className="t-body c-2">아직 연습한 회차가 없습니다. 첫 영상을 올려 보세요.</p>}
          <ol className="attempts rule-list">
            {d.attempts.map((a) => <AttemptRow key={a.analysisId} a={a} report={reportOf(a.analysisId)} presentationId={id} onDelete={() => delAttempt.mutate(a.analysisId)} />)}
          </ol>
          {h.data && h.data.items.length >= 2 && (
            <figure className="history" aria-label="회차별 종합 점수">
              <h3 className="t-title">점수 변화</h3>
              <div style={{ height: 180 }}>
                <ResponsiveContainer>
                  <LineChart data={h.data.items} margin={{ top: 16, right: 24, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="attemptNo" tickFormatter={(v) => `${v}회차`} tick={{ fontSize: 13, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[40, 100]} tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v}점`, '종합']} labelFormatter={(l) => `${l}회차`} />
                    <Line type="linear" dataKey="overallScore" stroke="var(--ink)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--ink)' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </figure>
          )}
        </section>
        {watch.length > 0 && latest && (
          <aside className="stack" style={{ gap: 'var(--s-4)' }} aria-labelledby="watch-h">
            <h2 id="watch-h" className="t-h2">다음 연습에서 볼 것</h2>
            {watch.map((f: Feedback) => (
              <div key={f.id} className="stack" style={{ gap: 4 }}>
                <span className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                  <Link className="t-data c-ev" to={`/analyses/${latest.analysisId}?t=${f.start}`}>{clock(f.start)}</Link>
                  <span className="t-body-strong">{f.title}</span></span>
                <p className="t-small c-2">{f.suggestion}</p>
              </div>
            ))}
          </aside>
        )}
      </div>
    </main>
  );
}

function AttemptRow({ a, report, presentationId, onDelete }: { a: Attempt; report?: Report; presentationId: string; onDelete: () => void }) {
  const meta = [dateTimeLabel(a.createdAt), a.durationSec ? minutesLabel(a.durationSec) : null].filter(Boolean).join(', ');
  return (
    <li className="attempt">
      <div className="stack" style={{ gap: 2, minWidth: 170 }}><span className="t-body-strong">{a.attemptNo}회차</span><span className="t-caption c-3">{meta}</span></div>
      {a.status === 'COMPLETED' && (
        <>
          <Link to={`/analyses/${a.analysisId}`} className="attempt-track" aria-label={`${a.attemptNo}회차 리포트 열기`}>
            {report ? <EvidenceTrack compact ticks={false} duration={report.durationSec} feedbacks={report.feedbacks} /> : <span className="t-caption c-3">리포트 불러오는 중</span>}
            {report && <span className="t-caption c-3">클립 {report.feedbacks.length}개</span>}
          </Link>
          <span className="t-data-strong">{a.overallScore}</span>
        </>
      )}
      {a.status === 'FAILED' && (
        <span className="row wrap" style={{ gap: 16 }}>
          <span className="t-small c-err" style={{ fontWeight: 600 }}>분석하지 못했습니다.</span>
          <Link to={`/presentations/${presentationId}/record`} className="link">다른 영상 올리기</Link>
          <button className="link link-plain link-muted" onClick={onDelete}>회차 삭제</button>
        </span>
      )}
      {(a.status === 'QUEUED' || a.status === 'PROCESSING' || a.status === 'WAITING_UPLOAD') && (
        <Link to={`/analyses/${a.analysisId}/progress`} className="link">분석 진행 보기</Link>
      )}
    </li>
  );
}
