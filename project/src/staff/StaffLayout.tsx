import { useState, type ReactNode } from 'react';
import { Database, Menu, RotateCcw } from 'lucide-react';
import { ConfirmDialog } from '@/staff/components/Modal';
import { SidebarNav } from '@/staff/components/SidebarNav';
import { useToast } from '@/staff/components/Toast';
import { Button } from '@/staff/components/ui';
import { findStaffRoute } from '@/staff/config/navigation';
import { useHashRoute } from '@/staff/hooks/useHashRoute';
import { staffService } from '@/staff/services/staffService';
import { StaffOverviewPage } from '@/staff/pages/StaffOverviewPage';
import { ManageStaffPage } from '@/staff/pages/manage-staff/ManageStaffPage';
import { StaffAttendancePage } from '@/staff/pages/attendance/StaffAttendancePage';
import { BiometricAttendancePage } from '@/staff/pages/attendance/BiometricAttendancePage';
import { InOutTimePage } from '@/staff/pages/attendance/InOutTimePage';
import { SetStaffPaymentPage } from '@/staff/pages/payments/SetStaffPaymentPage';
import { MakeStaffPaymentPage } from '@/staff/pages/payments/MakeStaffPaymentPage';
import { StaffLoanPage } from '@/staff/pages/loans/StaffLoanPage';
import { LeaveManagementPage } from '@/staff/pages/leaves/LeaveManagementPage';
import { AnnouncementPage } from '@/staff/pages/announcements/AnnouncementPage';

const PAGES: Record<string, (params: URLSearchParams) => ReactNode> = {
  '/staff': () => <StaffOverviewPage />,
  '/staff/manage': () => <ManageStaffPage />,
  '/staff/attendance': (params) => <StaffAttendancePage initialStaffId={params.get('staff') ?? ''} />,
  '/staff/biometric': (params) => <BiometricAttendancePage initialStaffId={params.get('staff') ?? ''} />,
  '/staff/in-out': (params) => <InOutTimePage initialStaffId={params.get('staff') ?? ''} />,
  '/staff/payment-setup': () => <SetStaffPaymentPage />,
  '/staff/payments': (params) => <MakeStaffPaymentPage initialStaffId={params.get('staff') ?? ''} />,
  '/staff/loans': (params) => <StaffLoanPage initialStaffId={params.get('staff') ?? ''} />,
  '/staff/leaves': (params) => <LeaveManagementPage initialStaffId={params.get('staff') ?? ''} />,
  '/staff/announcements': () => <AnnouncementPage />,
};

export function StaffLayout() {
  const { pathname, params } = useHashRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const { notify } = useToast();

  const resetPreview = () => {
    staffService.resetPreviewData();
    setResetOpen(false);
    setDataVersion((version) => version + 1);
    notify('Preview data reset to the original sample records.');
  };
  const route = findStaffRoute(pathname);
  const renderPage = PAGES[route.path] ?? PAGES['/staff'];

  return (
    <div className="min-h-screen bg-page lg:flex">
      <SidebarNav activePath={route.path} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden />
            </button>
            <p className="truncate text-sm font-medium text-muted">
              Staff <span className="mx-1.5 text-slate-300">/</span> <span className="text-ink">{route.label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 sm:inline-flex">
              <Database className="h-3.5 w-3.5" aria-hidden />
              Local preview data
            </span>
            {import.meta.env.DEV && (
              <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset preview data
              </Button>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div key={`${route.path}?${params.toString()}#${dataVersion}`} className="animate-[page-in_220ms_ease-out]">
            {renderPage(params)}
          </div>
        </main>

        <ConfirmDialog
          open={resetOpen}
          title="Reset preview data?"
          message="All changes made in this browser will be replaced with the original sample records. This only affects local preview data and is only available in development."
          confirmLabel="Reset data"
          tone="danger"
          onConfirm={resetPreview}
          onCancel={() => setResetOpen(false)}
        />
      </div>
    </div>
  );
}
