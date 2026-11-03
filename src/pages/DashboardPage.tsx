import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPresentation, listPresentations } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { Purpose } from '@/api/types';
import { PURPOSE_LABEL, dateLabel, minutesLabel } from '@/lib/format';
import { ErrorState, Loading } from '@/components/Layout';

export function DashboardPage() {
  const q = useQuery({ queryKey: ['presentations'], queryFn: () => listPresentations() });
  if (q.isPending) return <main className="page"><Loading /></main>;
  if (q.isError) return <main className="page"><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></main>;
  if (q.data.items.length === 0) return <FirstVisit />;
  return (
    <main className="page stack" style={{ gap: 'var(--s-8)' }}>
      <div className="row between">
        <h1 className="t-h1">내 발표</h1>
        <Link to="/presentations/new" className="btn btn-primary">발표 만들기</Link>
      </div>
      <table className="ptable">
        <thead><tr><th>발표</th><th>목적</th><th className="r">연습</th><th className="r">최근 점수</th><th className="r">만든 날</th></tr></thead>
        <tbody>
          {q.data.items.map((p) => (
            <tr key={p.id}>
              <td><Link to={`/presentations/${p.id}`} className="ptable-title">{p.title}</Link>
                <span className="t-small c-2">{[p.timeLimitSec ? `제한 ${minutesLabel(p.timeLimitSec)}` : null, p.hasSlides ? '슬라이드 있음' : null].filter(Boolean).join(', ') || '\u00a0'}</span></td>
              <td className="t-small">{PURPOSE_LABEL[p.purpose]}</td>
              <td className="r t-data">{p.attemptCount}회</td>
              <td className="r">{p.latestScore != null ? <span className="t-data-strong">{p.latestScore}</span> : <span className="c-3">–</span>}</td>
              <td className="r t-small c-2">{dateLabel(p.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function FirstVisit() {
  const nav = useNavigate(); const qc = useQueryClient();
  const [title, setTitle] = useState(''); const [purpose, setPurpose] = useState<Purpose>('CLASS');
  const m = useMutation({ mutationFn: () => createPresentation({ title: title.trim(), purpose }), onSuccess: (p) => { qc.invalidateQueries({ queryKey: ['presentations'] }); nav(`/presentations/${p.id}`); } });
  const submit = (e: FormEvent) => { e.preventDefault(); if (title.trim()) m.mutate(); };
  return (
    <main className="page page-center">
      <form className="first-visit stack" onSubmit={submit} style={{ gap: 'var(--s-6)' }}>
        <h1 className="t-h1">내 발표</h1>
        <p className="t-body c-2">아직 만든 발표가 없습니다.</p>
        <div className="row inline-create">
          <label className="field grow"><span>발표 제목</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 캡스톤 중간 발표" /></label>
          <label className="field"><span>발표 목적</span>
            <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
              {(Object.keys(PURPOSE_LABEL) as Purpose[]).map((k) => <option key={k} value={k}>{PURPOSE_LABEL[k]}</option>)}
            </select></label>
          <button className="btn btn-primary" disabled={!title.trim() || m.isPending}>발표 만들기</button>
        </div>
        {m.isError && <p className="field-msg err" role="alert">{errorMessage(m.error)}</p>}
      </form>
    </main>
  );
}
