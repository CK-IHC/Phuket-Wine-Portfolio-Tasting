import { createContext, useContext, useState, type ReactNode } from 'react';

export interface PrintColumn {
  key: string;
  label: string;
}

export interface PrintPayload {
  title: string;
  subtitle?: string;
  columns: PrintColumn[];
  rows: Record<string, string>[];
}

interface PrintContextValue {
  payload: PrintPayload | null;
  printNow: (payload: PrintPayload) => void;
}

const PrintContext = createContext<PrintContextValue | null>(null);

export function PrintProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<PrintPayload | null>(null);

  const printNow = (next: PrintPayload) => {
    setPayload(next);
    setTimeout(() => window.print(), 50);
  };

  return <PrintContext.Provider value={{ payload, printNow }}>{children}</PrintContext.Provider>;
}

export function usePrint() {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error('usePrint must be used within PrintProvider');
  return ctx;
}
