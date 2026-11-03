import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPresentation, getSlidesUploadUrl } from '@/api/endpoints';
import { errorMessage, putToUploadUrl } from '@/api/client';
import type { Purpose } from '@/api/types';
import { PURPOSE_LABEL, bytes } from '@/lib/format';

const PDF_MAX = 20 * 1024 * 1024;

export function NewPresentationPage() {
  const nav = useNavigate(); const qc = useQueryClient();
  const [title, setTitle] = useState(''); const [purpose, setPurpose] = useState<Purpose>('CLASS');
  const [minutes, setMinutes] = useState(''); const [pdf, setPdf] = useState<File | null>(null); const [pdfErr, setPdfErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: async () => {
      const p = await createPresentation({ title: title.trim(), purpose, ...(minutes ? { timeLimitSec: Math.round(Number(minutes) * 60) } : {}) });
      if (pdf) { const t = await getSlidesUploadUrl(p.id, { fileName: pdf.name, contentType: 'application/pdf', fileSize: pdf.size }); await putToUploadUrl(t, pdf); }
      return p;
    },
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ['presentations'] }); nav(`/presentations/${p.id}`); },
  });
  const pick = (f: File | undefined) => {
    setPdfErr(null); if (!f) return setPdf(null);
    if (f.type !== 'application/pdf') { setPdf(null); return setPdfErr('PDF 파일만 올릴 수 있어요.'); }
    if (f.size > PDF_MAX) { setPdf(null); return setPdfErr('PDF는 20MB 이하만 업로드할 수 있어요.'); }
    setPdf(f);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); if (title.trim()) m.mutate(); };
  return (
    <main className="page page-center">
      <form className="form-col stack" onSubmit={submit} style={{ gap: 'var(--s-8)' }}>
        <h1 className="t-h1">새 발표</h1>
        <label className="field"><span>발표 제목</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 캡스톤 중간 발표" required /></label>
        <fieldset className="radios"><legend className="field-legend">발표 목적</legend>
          {(Object.keys(PURPOSE_LABEL) as Purpose[]).map((k) => (
            <label key={k} className="radio"><input type="radio" name="purpose" value={k} checked={purpose === k} onChange={() => setPurpose(k)} /><span>{PURPOSE_LABEL[k]}</span></label>
          ))}
        </fieldset>
        <div className="stack" style={{ gap: 6 }}>
          <label className="field" style={{ maxWidth: 200 }}><span>제한 시간 (분, 선택)</span>
            <input className="input" inputMode="decimal" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d.]/g, ''))} placeholder="5" /></label>
          <p className="field-msg">비워 두면 시간 초과를 평가하지 않습니다.</p>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="field-legend">발표 자료 PDF (선택)</span>
          <div className="row" style={{ gap: 12 }}>
            <label className="btn btn-secondary">파일 선택<input type="file" accept="application/pdf" className="visually-hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
            <span className="t-small">{pdf ? `${pdf.name}, ${bytes(pdf.size)}` : '선택한 파일 없음'}</span>
          </div>
          <p className={`field-msg${pdfErr ? ' err' : ''}`}>{pdfErr ?? '20MB까지. 올리면 다음 회차부터 빠뜨린 슬라이드를 찾습니다.'}</p>
        </div>
        {m.isError && <p className="field-msg err" role="alert">{errorMessage(m.error)}</p>}
        <div className="row" style={{ gap: 20 }}>
          <button className="btn btn-primary" disabled={!title.trim() || m.isPending}>발표 만들기</button>
          <Link to="/" className="link">취소</Link>
        </div>
      </form>
    </main>
  );
}
