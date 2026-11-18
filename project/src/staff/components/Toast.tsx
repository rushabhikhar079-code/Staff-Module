import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/staff/utils/cn';

type ToastTone = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current;
      nextId.current += 1;
      setItems((previous) => [...previous, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:inset-x-auto sm:right-6">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm text-ink shadow-pop animate-[toast-in_200ms_ease-out] sm:w-auto',
              item.tone === 'success' ? 'border-success-600/30' : 'border-danger-600/30',
            )}
          >
            {item.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" aria-hidden />
            )}
            <p className="leading-snug">{item.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
