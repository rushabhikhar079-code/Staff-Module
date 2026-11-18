import { useState } from 'react';
import { ChevronDown, GraduationCap, X } from 'lucide-react';
import { STAFF_HOME_ROUTE, STAFF_NAV_GROUPS, type StaffRoute } from '@/staff/config/navigation';
import { cn } from '@/staff/utils/cn';

interface SidebarNavProps {
  activePath: string;
  open: boolean;
  onClose: () => void;
}

function NavLink({ route, active, onNavigate }: { route: StaffRoute; active: boolean; onNavigate: () => void }) {
  const Icon = route.icon;
  return (
    <a
      href={`#${route.path}`}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150',
        active ? 'bg-white/15 font-medium text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-white" aria-hidden />}
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-snug">{route.label}</span>
    </a>
  );
}

export function SidebarNav({ activePath, open, onClose }: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/40 transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        aria-label="Staff navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-primary-600 text-white transition-transform duration-300 ease-out',
          'lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-600">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-semibold leading-tight">Institute Magica</p>
              <p className="text-xs text-white/70">Staff Module</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          <NavLink route={STAFF_HOME_ROUTE} active={activePath === STAFF_HOME_ROUTE.path} onNavigate={onClose} />

          {STAFF_NAV_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = !collapsed[group.id];
            const panelId = `staff-nav-${group.id}`;
            return (
              <div key={group.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-white/60 transition-colors hover:text-white"
                >
                  <GroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="flex-1">{group.label}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !isOpen && '-rotate-90')} aria-hidden />
                </button>
                <div id={panelId} hidden={!isOpen} className="mt-1 space-y-0.5">
                  {group.items.map((route) => (
                    <NavLink key={route.path} route={route} active={activePath === route.path} onNavigate={onClose} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
