export function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  if (bars.length === 0) return null;
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, marginTop: 8, overflowX: 'auto' }}>
      {bars.map((bar, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flex: '0 0 auto', minWidth: 32, height: '100%' }}>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>{bar.value}</div>
          <div
            style={{
              width: '100%', maxWidth: 28,
              height: `${(bar.value / max) * 100}%`,
              background: i === bars.length - 1 ? 'var(--color-accent-600)' : 'var(--color-accent-300)',
              minHeight: bar.value > 0 ? 2 : 0,
            }}
          />
          <div className="text-muted" style={{ fontSize: 10 }}>{bar.label}</div>
        </div>
      ))}
    </div>
  );
}
