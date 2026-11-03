import type { Feedback } from '@/api/types';
import { clock } from '@/lib/format';

interface Props {
  duration: number; feedbacks: Feedback[]; selectedId?: string | null; current?: number;
  lowConfidence?: { start: number; end: number }[]; onSelect?: (f: Feedback) => void; ticks?: boolean; compact?: boolean;
}
/** 근거 타임라인: 파랑은 타임스탬프 근거에만 쓴다. 선택한 클립은 네 모서리 핸들이 달린 상자로 표시. */
export function EvidenceTrack({ duration, feedbacks, selectedId, current, lowConfidence = [], onSelect, ticks = true, compact = false }: Props) {
  const pct = (s: number) => `${(Math.min(Math.max(s, 0), duration) / duration) * 100}%`;
  const width = (a: number, b: number) => `max(${compact ? 10 : 16}px, ${((b - a) / duration) * 100}%)`;
  const marks = ticks ? Array.from({ length: Math.floor(duration / 60) + 1 }, (_, i) => i * 60).concat(duration % 60 > 15 ? [duration] : []) : [];
  return (
    <div className={`etrack${compact ? ' compact' : ''}`}>
      <div className="etrack-line" role="list" aria-label="피드백 구간">
        {lowConfidence.map((r, i) => <span key={`lc${i}`} className="etrack-lc" style={{ left: pct(r.start), width: width(r.start, r.end) }} title="얼굴 인식이 어려워 평가에서 뺀 구간" />)}
        {feedbacks.map((f, i) => {
          const on = f.id === selectedId;
          return (
            <button key={f.id} role="listitem" className={`etrack-clip${on ? ' on' : ''}`} style={{ left: pct(f.start), width: width(f.start, f.end) }}
              onClick={() => onSelect?.(f)} disabled={!onSelect} aria-label={`클립 ${i + 1}, ${clock(f.start)}부터, ${f.title}`}>
              {on && <><i className="h tl" /><i className="h tr" /><i className="h bl" /><i className="h br" /></>}
            </button>
          );
        })}
        {current != null && <span className="etrack-head" style={{ left: pct(current) }} aria-hidden="true" />}
      </div>
      {ticks && <div className="etrack-ticks t-data c-3" aria-hidden="true">{marks.map((m) => <span key={m}>{clock(m)}</span>)}</div>}
    </div>
  );
}
