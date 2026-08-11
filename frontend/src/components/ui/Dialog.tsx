import type { ReactNode } from 'react';

export function Dialog({
  title,
  children,
  actions,
  onClose,
  maxWidth = 480,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  maxWidth?: number;
}) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        {title && <div className="dialog-title">{title}</div>}
        <div className="dialog-body">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
