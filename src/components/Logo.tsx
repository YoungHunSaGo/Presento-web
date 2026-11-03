const MARK = 'M14.5 3h27a8.5 8.5 0 0 1 0 17h-27a8.5 8.5 0 0 1 0-17Z M10.5 24h43a8.5 8.5 0 0 1 0 17h-43a8.5 8.5 0 0 1 0-17Z M14 29.5h30a3 3 0 0 1 0 6h-30a3 3 0 0 1 0-6Z M14.5 45h15a8.5 8.5 0 0 1 0 17h-15a8.5 8.5 0 0 1 0-17Z';
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo" aria-label="Presento">
      <span className="logo-tile" style={{ width: size * 1.35, height: size * 1.35, borderRadius: size * 0.38 }}>
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72} aria-hidden="true"><path fill="#fff" fillRule="evenodd" d={MARK} /></svg>
      </span>
      <span className="logo-word" style={{ fontSize: size * 0.82 }}>Presento</span>
    </span>
  );
}
