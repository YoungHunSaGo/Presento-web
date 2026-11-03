import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 영상 재생 상태. 영상 URL이 없거나(목업) 불러오지 못하면 내부 시계로 재생을 흉내 내서
 * 타임라인·대본 동기화를 그대로 시연할 수 있게 한다.
 */
export function usePlayback(duration: number, src: string | undefined) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [virtual, setVirtual] = useState(!src);
  useEffect(() => setVirtual(!src), [src]);

  useEffect(() => {
    if (!virtual || !playing) return;
    let last = performance.now(); let raf = 0;
    const tick = (now: number) => { setTime((t) => { const n = t + (now - last) / 1000; return n >= duration ? (setPlaying(false), duration) : n; }); last = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [virtual, playing, duration]);

  const onTimeUpdate = useCallback(() => { if (videoRef.current) setTime(videoRef.current.currentTime); }, []);
  const play = useCallback(() => { setPlaying(true); if (!virtual) videoRef.current?.play().catch(() => setVirtual(true)); }, [virtual]);
  const pause = useCallback(() => { setPlaying(false); if (!virtual) videoRef.current?.pause(); }, [virtual]);
  const seek = useCallback((t: number) => { const c = Math.max(0, Math.min(duration, t)); setTime(c); if (!virtual && videoRef.current) videoRef.current.currentTime = c; }, [duration, virtual]);
  const bind = {
    ref: videoRef, onTimeUpdate, onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false),
    onError: () => setVirtual(true),
  };
  return { time, playing, virtual, play, pause, seek, bind };
}
