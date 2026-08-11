import type { ReactNode } from 'react';

export function Field({
  label,
  children,
  hint,
  large = false,
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
  large?: boolean;
}) {
  return (
    <div className="field">
      {label && (
        <label style={large ? { fontSize: 17, fontWeight: 700 } : undefined}>{label}</label>
      )}
      {children}
      {hint && <div className="text-muted" style={{ fontSize: 11 }}>{hint}</div>}
    </div>
  );
}
