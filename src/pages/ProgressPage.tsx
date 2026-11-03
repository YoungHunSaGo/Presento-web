import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAnalysis } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { STAGES } from '@/lib/format';
import { ErrorState, Loading } from '@/components/Layout';

export function ProgressPage() {
  const { id = '' } = useParams(); const nav = useNavigate();
  // 명세 N3: 2초마다 폴링, COMPLETED 또는 FAILED 가 되면 멈춘다.
  const q = useQuery({ queryKey: ['analysis', id], queryFn: () => getAnalysis(id),
    refetchInterval: (query) => (['COMPLETED', 'FAILED'].includes(query.state.data?.status ?? '') ? false : 2000) });
  useEffect(() => { if (q.data?.status === 'COMPLETED') nav(`/analyses/${id}`, { replace: true }); }, [q.data?.status, id, nav]);
  if (q.isPending) return <main className="page"><Loading label="분석 상태를 불러오는 중" /></main>;
  if (q.isError) return <main className="page"><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></main>;
  const a = q.data; const failed = a.status === 'FAILED';
  const idx = a.stage ? STAGES.findIndex((s) => s.stage === a.stage) : a.status === 'QUEUED' ? -1 : 0;
  return (
    <main className="page page-center">
      <div className="progress-col stack" style={{ gap: 'var(--s-6)' }}>
        <h1 className="t-h1">{a.attemptNo}회차 {failed ? '분석 실패' : a.status === 'QUEUED' ? '분석 준비 중' : '분석 중'}</h1>
        {failed ? (
          <p className="t-body c-err" style={{ fontWeight: 600 }} role="alert">{a.error?.message ?? '분석하지 못했습니다.'}</p>
        ) : (
          <>
            <p className="t-data-large" aria-live="polite">{a.progress}%</p>
            <div className="progress" role="progressbar" aria-valuenow={a.progress} aria-valuemin={0} aria-valuemax={100} aria-label="분석 진행률"><span style={{ width: `${a.progress}%` }} /></div>
          </>
        )}
        <ol className="stages rule-list">
          {STAGES.map((s, i) => {
            const st = failed ? (i < idx ? 'done' : i === idx ? 'fail' : 'wait') : i < idx ? 'done' : i === idx ? 'now' : 'wait';
            return (
              <li key={s.stage} className={`stage ${st}`}>
                <span className="stage-bar" aria-hidden="true" />
                <span className="grow">{s.label}</span>
                <span className="t-caption">{{ done: '완료', now: '진행 중', fail: '실패', wait: '대기' }[st]}</span>
              </li>
            );
          })}
        </ol>
        {failed && (
          <>
            <div className="stack" style={{ gap: 6 }}>
              <p className="t-body-strong">확인할 것</p>
              {a.error?.code === 'NO_FACE_DETECTED' ? <p className="t-small c-2">얼굴이 화면 가운데에 보이도록 다시 녹화해 주세요.</p>
                : a.error?.code === 'CORRUPTED_VIDEO' ? <p className="t-small c-2">영상이 재생되는지 확인하고 다른 파일로 올려 주세요.</p>
                : a.error?.code === 'AI_SERVICE_ERROR' ? <p className="t-small c-2">일시적인 오류입니다. 같은 영상을 다시 올리면 됩니다.</p>
                : <><p className="t-small c-2">녹화할 때 마이크가 켜져 있었는지</p><p className="t-small c-2">영상을 재생하면 목소리가 들리는지</p></>}
            </div>
            <div className="row" style={{ gap: 20 }}>
              <Link to={`/presentations/${a.presentationId}/record`} className="btn btn-primary">다른 영상 올리기</Link>
              <Link to={`/presentations/${a.presentationId}`} className="link">발표로 돌아가기</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
