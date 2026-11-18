import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/staff/components/ui';
import { cn } from '@/staff/utils/cn';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const MODAL_SIZES: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, icon, size = 'md', footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-modal-title"
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop animate-[modal-in_180ms_ease-out] sm:rounded-2xl',
          MODAL_SIZES[size],
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 bg-primary-600 px-5 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">{icon}</span>}
            <div className="min-w-0">
              <h2 id="staff-modal-title" className="truncate text-[15px] font-semibold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-xs text-white/80">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'danger', busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}
