import { useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { createAnalysis, startAnalysis } from '@/api/endpoints';
import { errorMessage, putToUploadUrl } from '@/api/client';

export const VIDEO_MAX = 500 * 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** 명세 핵심 흐름: N1(회차 + 업로드 URL) → URL로 직접 PUT → N2(분석 시작) → 진행 화면 */
export function useUploadAndStart(presentationId: string) {
  const nav = useNavigate();
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  async function run(file: Blob, fileName: string, source: 'UPLOAD' | 'RECORDING') {
    setError(null); setBusy(true); setPercent(0); ctrl.current = new AbortController();
    try {
      const contentType = (file.type || 'video/webm').split(';')[0];
      const created = await createAnalysis(presentationId, { fileName, contentType, fileSize: file.size, source });
      await putToUploadUrl(created.upload, file, setPercent, ctrl.current.signal);
      await startAnalysis(created.analysisId);
      nav(`/analyses/${created.analysisId}/progress`);
    } catch (e) {
      if (axios.isCancel(e)) { setPercent(null); return; }
      setError(errorMessage(e, '업로드하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.')); setPercent(null);
    } finally { setBusy(false); }
  }
  return { run, percent, error, busy, setError, cancel: () => ctrl.current?.abort() };
}
