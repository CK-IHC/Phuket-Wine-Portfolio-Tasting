import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastContextValue {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Longer messages (e.g. surfaced error details / fix instructions) get
    // proportionally more time on screen, up to a cap, instead of vanishing
    // before anyone can finish reading them.
    const duration = Math.min(2400 + Math.max(0, msg.length - 40) * 80, 20000);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {visible && (
        <div className="toast" onClick={dismiss} style={{ cursor: 'pointer' }} title={message.length > 40 ? 'Tap to dismiss' : undefined}>
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
