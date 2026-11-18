import type { ReactNode } from 'react';
import { CalendarCheck, CalendarDays, Clock, CreditCard, Fingerprint, HandCoins, Wallet } from 'lucide-react';
import { Modal } from '@/staff/components/Modal';
import { Avatar, Button, StatusBadge } from '@/staff/components/ui';
import { navigateTo } from '@/staff/hooks/useHashRoute';
import type { Staff } from '@/staff/types';
import { formatDate } from '@/staff/utils/format';

const QUICK_LINKS = [
  { label: 'Attendance', path: '/staff/attendance', icon: CalendarCheck },
  { label: 'Biometric records', path: '/staff/biometric', icon: Fingerprint },
  { label: 'In/Out times', path: '/staff/in-out', icon: Clock },
  { label: 'Payment setup', path: '/staff/payment-setup', icon: Wallet },
  { label: 'Payments', path: '/staff/payments', icon: CreditCard },
  { label: 'Loans', path: '/staff/loans', icon: HandCoins },
  { label: 'Leaves', path: '/staff/leaves', icon: CalendarDays },
];

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{value || '—'}</dd>
    </div>
  );
}

interface StaffDetailDialogProps {
  staff: Staff;
  onClose: () => void;
  onEdit: () => void;
}

export function StaffDetailDialog({ staff, onClose, onEdit }: StaffDetailDialogProps) {
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Staff Profile"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>Edit Staff</Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-slate-50/60 p-4 sm:flex-row sm:items-center">
          <Avatar name={staff.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-ink">{staff.name}</p>
            <p className="text-sm text-muted">
              {staff.designation} · {staff.department}
            </p>
            <p className="mt-1 text-xs text-muted">Staff code {staff.staffCode}</p>
          </div>
          <StatusBadge status={staff.status} />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Mobile" value={staff.mobile} />
          <Detail label="Email" value={staff.email} />
          <Detail label="Address" value={staff.address} />
          <Detail label="Gender" value={staff.gender} />
          <Detail label="Date of birth" value={formatDate(staff.dateOfBirth)} />
          <Detail label="Biometric ID" value={staff.biometricId} />
          <Detail label="Employment type" value={staff.employmentType} />
          <Detail label="Joining date" value={formatDate(staff.joiningDate)} />
          <Detail label="Notes" value={staff.notes} />
        </dl>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">Related records</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigateTo(link.path, { staff: staff.id })}
                  className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-left text-xs font-medium text-ink transition-colors hover:border-primary-300 hover:bg-primary-50/60"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                  <span className="leading-tight">{link.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Modal>
  );
}
