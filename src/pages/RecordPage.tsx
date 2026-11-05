import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPresentation } from '@/api/endpoints';
import { BackLink } from '@/components/Layout';
import { VIDEO_MAX, VIDEO_TYPES, useUploadAndStart } from '@/hooks/useUploadAndStart';
import { bytes, clock, minutesLabel } from '@/lib/format';

export function RecordPage() {
  const { id = '' } = useParams();
  const p = useQuery({ queryKey: ['presentation', id], queryFn: () => getPresentation(id) });
  const [tab, setTab] = useState<'upload' | 'record'>('upload');
  const nextNo = (p.data?.attempts[0]?.attemptNo ?? 0) + 1;
  const up = useUploadAndStart(id);
  return (
    <main className="page page-center">
      <div className="record-col stack" style={{ gap: 'var(--s-6)' }}>
        <BackLink to={`/presentations/${id}`}>{p.data?.title ?? '발표'}</BackLink>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="t-h1">{p.data ? `${nextNo}회차 영상` : '영상'}</h1>
          <p className="t-small c-2">mp4, mov, webm. 10분, 2GB까지.{p.data?.timeLimitSec ? ` 제한 시간 ${minutesLabel(p.data.timeLimitSec)}.` : ''}</p>
        </div>
        <div className="tabs" role="tablist" aria-label="영상 입력 방법">
          {/* 두 탭이 업로드 상태(up)를 같이 쓰므로, 탭을 바꿀 때 다른 탭의 에러 문구를 지운다. */}
          <button role="tab" className="tab" aria-selected={tab === 'upload'} onClick={() => { setTab('upload'); up.setError(null); }} disabled={up.busy}>파일 업로드</button>
          <button role="tab" className="tab" aria-selected={tab === 'record'} onClick={() => { setTab('record'); up.setError(null); }} disabled={up.busy}>웹캠 녹화</button>
        </div>
        {tab === 'upload' ? <UploadPanel up={up} /> : <RecordPanel up={up} limitSec={p.data?.timeLimitSec ?? null} attemptNo={nextNo} />}
      </div>
    </main>
  );
}

type Up = ReturnType<typeof useUploadAndStart>;

function UploadPanel({ up }: { up: Up }) {
  const [file, setFile] = useState<File | null>(null); const [over, setOver] = useState(false);
  const choose = (f?: File) => {
    up.setError(null); if (!f) return;
    if (!VIDEO_TYPES.includes(f.type)) return up.setError('mp4, mov, webm 영상만 올릴 수 있어요.');
    if (f.size > VIDEO_MAX) return up.setError('영상은 2GB 이하만 업로드할 수 있어요.');
    setFile(f); up.run(f, f.name, 'UPLOAD');
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]); };
  return (
    <div className="stack" style={{ gap: 'var(--s-6)' }}>
      {!up.busy && (
        <label className={`dropzone${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
          <span className="t-body-strong">영상 파일을 여기로 끌어다 놓거나</span>
          <span className="btn btn-secondary">파일 선택</span>
          <input type="file" accept="video/mp4,video/quicktime,video/webm" className="visually-hidden" onChange={(e) => choose(e.target.files?.[0])} />
        </label>
      )}
      {up.busy && file && up.percent != null && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row between">
            <span className="row" style={{ gap: 16, alignItems: 'baseline' }}><span className="t-body-strong">{file.name}</span>
              <span className="t-data c-2">{bytes((file.size * up.percent) / 100)} / {bytes(file.size)}</span></span>
            <button className="link" onClick={up.cancel}>업로드 취소</button>
          </div>
          <div className="progress" role="progressbar" aria-valuenow={up.percent} aria-valuemin={0} aria-valuemax={100} aria-label="업로드 진행률"><span style={{ width: `${up.percent}%` }} /></div>
          <p className="t-small c-2">업로드가 끝나면 분석이 자동으로 시작됩니다.</p>
        </div>
      )}
      {up.error && <p className="field-msg err" role="alert">{up.error}</p>}
    </div>
  );
}

function RecordPanel({ up, limitSec, attemptNo }: { up: Up; limitSec: number | null; attemptNo: number }) {
  const live = useRef<HTMLVideoElement>(null); const rec = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null); const [camErr, setCamErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false); const [elapsed, setElapsed] = useState(0); const [blob, setBlob] = useState<Blob | null>(null);
  const previewUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    let s: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((m) => { s = m; setStream(m); if (live.current) live.current.srcObject = m; })
      .catch(() => setCamErr('카메라나 마이크를 쓸 수 없습니다. 브라우저 주소창의 권한 설정에서 허용해 주세요.'));
    return () => s?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => { if (!recording) return; const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, [recording]);
  useEffect(() => { if (recording && elapsed >= 600) stop(); }, [elapsed, recording]); // 명세: 10분 초과 영상은 분석 불가

  function start() {
    if (!stream) return; setBlob(null); setElapsed(0); chunks.current = [];
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => setBlob(new Blob(chunks.current, { type: (r.mimeType || 'video/webm').split(';')[0] }));
    r.start(1000); rec.current = r; setRecording(true);
  }
  function stop() { rec.current?.stop(); setRecording(false); }
  const ext = blob?.type.includes('mp4') ? 'mp4' : 'webm';
  return (
    <div className="recorder">
      <div className="cam">
        {previewUrl && !recording ? <video src={previewUrl} controls playsInline /> : <video ref={live} autoPlay muted playsInline />}
        {recording && <span className="rec-badge">녹화 중</span>}
        {camErr && <p className="cam-msg">{camErr}</p>}
      </div>
      <div className="stack" style={{ gap: 'var(--s-4)' }}>
        <p className="row" style={{ gap: 8, alignItems: 'baseline' }}><span className="t-data-large">{clock(elapsed)}</span>{limitSec ? <span className="t-data c-3">/ {clock(limitSec)}</span> : null}</p>
        {limitSec ? <div className="progress" aria-hidden="true"><span style={{ width: `${Math.min(100, (elapsed / limitSec) * 100)}%` }} /></div> : null}
        {stream && !camErr && <p className="t-small" style={{ color: 'var(--text-2)' }}>{stream.getAudioTracks().length ? '마이크 입력 정상' : '마이크가 연결되지 않았습니다.'}</p>}
        {up.busy && up.percent != null && <div className="progress" role="progressbar" aria-valuenow={up.percent} aria-label="업로드 진행률"><span style={{ width: `${up.percent}%` }} /></div>}
        <div className="row wrap" style={{ gap: 10 }}>
          {recording ? <button className="btn btn-secondary" onClick={stop}>녹화 멈추기</button>
            : <button className="btn btn-secondary" onClick={start} disabled={!stream || up.busy}>{blob ? '다시 녹화' : '녹화 시작'}</button>}
          <button className="btn btn-primary" disabled={!blob || recording || up.busy} onClick={() => blob && up.run(blob, `take${attemptNo}.${ext}`, 'RECORDING')}>분석하기</button>
        </div>
        {up.error && <p className="field-msg err" role="alert">{up.error}</p>}
      </div>
    </div>
  );
}
