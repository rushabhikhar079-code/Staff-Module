import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

interface PageLayoutProps {
  crumbs: Crumb[];
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ crumbs, title, description, actions, children }: PageLayoutProps) {
  return (
    <div className="relative mx-auto w-full max-w-[1320px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary-300 to-transparent sm:inset-x-6 lg:inset-x-8" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {crumbs.map((crumb, index) => (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
                  {crumb.href ? (
                    <a href={crumb.href} className="transition-colors hover:text-primary-600">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="font-medium text-primary-600" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold leading-[1.2] text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
