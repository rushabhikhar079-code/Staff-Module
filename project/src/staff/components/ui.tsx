import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, Search } from 'lucide-react';
import type { Staff } from '@/staff/types';
import { cn } from '@/staff/utils/cn';
import { initials } from '@/staff/utils/format';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm' | 'icon';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800',
  secondary: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  outline: 'border border-border bg-white text-ink hover:border-primary-300 hover:bg-primary-50/60',
  ghost: 'text-muted hover:bg-slate-100 hover:text-ink',
  danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: 'h-10 gap-2 px-4 text-sm',
  sm: 'h-8 gap-1.5 px-3 text-xs',
  icon: 'h-8 w-8 p-0',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const CONTROL_BASE =
  'w-full rounded-lg border bg-white text-sm text-ink placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-muted';

function controlTone(invalid?: boolean): string {
  return invalid ? 'border-danger-600 focus:border-danger-600' : 'border-border hover:border-slate-300 focus:border-primary-500';
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlTone(invalid), 'h-10 px-3', className)}
      {...rest}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlTone(invalid), 'h-10 px-3 pr-8', className)}
      {...rest}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlTone(invalid), 'min-h-[88px] px-3 py-2', className)}
      {...rest}
    />
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-border pb-2 text-sm font-semibold text-primary-700">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Card({ title, description, actions, children, className, bodyClassName }: CardProps) {
  return (
    <section className={cn('rounded-xl border border-border bg-white shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success-50 text-success-700 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  danger: 'bg-danger-50 text-danger-700 ring-danger-600/20',
  info: 'bg-primary-50 text-primary-700 ring-primary-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const STATUS_TONES: Record<string, Tone> = {
  Active: 'success',
  Present: 'success',
  Approved: 'success',
  Published: 'success',
  Pending: 'warning',
  Late: 'warning',
  'Half Day': 'warning',
  Draft: 'warning',
  Inactive: 'danger',
  Absent: 'danger',
  Rejected: 'danger',
  'On Leave': 'info',
  Closed: 'neutral',
};

export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  if (!status) {
    return <span className="text-xs text-muted">Not marked</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_CLASSES[tone ?? STATUS_TONES[status] ?? 'neutral'],
      )}
    >
      {status}
    </span>
  );
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700',
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-16 w-16 text-lg ring-4 ring-white',
      )}
    >
      {initials(name)}
    </span>
  );
}

export function StaffIdentity({ staff }: { staff: Staff }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={staff.name} />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{staff.name}</p>
        <p className="text-xs text-muted">{staff.staffCode}</p>
      </div>
    </div>
  );
}

interface StaffSelectProps {
  staff: Staff[];
  value: string;
  onChange: (staffId: string) => void;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function StaffSelect({ staff, value, onChange, placeholder = 'All staff', invalid, id, label, disabled, className }: StaffSelectProps) {
  return (
    <Select
      id={id}
      aria-label={label ?? placeholder}
      value={value}
      invalid={invalid}
      disabled={disabled}
      className={className}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {staff.map((member) => (
        <option key={member.id} value={member.id}>
          {member.name} ({member.staffCode})
        </option>
      ))}
    </Select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="pl-9"
      />
    </div>
  );
}

export const PAGE_SIZES = [10, 20, 50];

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Previous
        </Button>
        <span className="px-1 text-ink">
          Page {page} of {pageCount}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Select
          aria-label="Rows per page"
          className="h-8 w-20 text-xs"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function LoadingState({ label = 'Loading records…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-sm text-muted">
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Inbox className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-ink">Records could not be loaded</p>
      <p className="max-w-sm text-xs text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
