export function LineChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? 15 + (i / (points.length - 1)) * 270 : 150;
    const y = 90 - (p.value / max) * 70;
    return { ...p, x, y };
  });
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const area = `${polyline} ${coords[coords.length - 1].x},90 ${coords[0].x},90`;

  return (
    <div style={{ position: 'relative', width: '100%', height: 190, marginTop: 8 }}>
      <svg viewBox="0 0 300 115" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-400)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#lineAreaGrad)" />
        <polyline points={polyline} fill="none" stroke="var(--color-accent-600)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4} fill="#fff" stroke="var(--color-accent-600)" strokeWidth={2} />
        ))}
      </svg>
      {coords.map((c, i) => (
        <div key={i}>
          <div style={{ position: 'absolute', left: `${(c.x / 300) * 100}%`, top: `${((c.y - 14) / 115) * 100}%`, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.value}</div>
          <div style={{ position: 'absolute', left: `${(c.x / 300) * 100}%`, top: `${(98 / 115) * 100}%`, transform: 'translateX(-50%)', fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap' }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}
