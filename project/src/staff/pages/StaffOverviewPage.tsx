import { useAsync } from '@/staff/hooks/useAsync';
import { staffService } from '@/staff/services/staffService';
import { PageLayout } from '@/staff/components/PageLayout';
import { Card, ErrorState, LoadingState, StatusBadge } from '@/staff/components/ui';
import { STAFF_NAV_GROUPS } from '@/staff/config/navigation';
import { navigateTo } from '@/staff/hooks/useHashRoute';
import { formatDate, formatMoney, todayIso } from '@/staff/utils/format';
import { ArrowRight } from 'lucide-react';

export function StaffOverviewPage() {
  const overview = useAsync(async () => {
    const today = todayIso();
    const [staff, attendance, payments, leaves, loans, announcements] = await Promise.all([
      staffService.listStaff(),
      staffService.listAttendance(today),
      staffService.listPayments(),
      staffService.listLeaves(),
      staffService.listLoans(),
      staffService.listAnnouncements(),
    ]);
    return { staff, attendance, payments, leaves, loans, announcements };
  }, []);

  const data = overview.data;
  const activeStaff = data?.staff.filter((member) => member.status === 'Active') ?? [];
  const presentToday = data?.attendance.filter((row) => row.status === 'Present').length ?? 0;
  const pendingLeaves = data?.leaves.filter((leave) => leave.status === 'Pending') ?? [];
  const activeLoans = data?.loans.filter((loan) => loan.status === 'Active') ?? [];
  const recentPayments = [...(data?.payments ?? [])]
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
    .slice(0, 5);
  const recentStaff = [...(data?.staff ?? [])]
    .sort((a, b) => b.joiningDate.localeCompare(a.joiningDate))
    .slice(0, 5);
  const staffName = (id: string) => data?.staff.find((member) => member.id === id)?.name ?? 'Unknown staff';

  const summaries = [
    { label: 'Active staff', value: activeStaff.length, hint: `${data?.staff.length ?? 0} total records` },
    { label: 'Present today', value: presentToday, hint: `${data?.attendance.length ?? 0} attendance entries today` },
    { label: 'Pending leaves', value: pendingLeaves.length, hint: 'Awaiting a decision' },
    { label: 'Active loans', value: activeLoans.length, hint: `${data?.loans.length ?? 0} loan records` },
    { label: 'Payments recorded', value: data?.payments.length ?? 0, hint: 'All payment entries' },
    {
      label: 'Announcements',
      value: data?.announcements.length ?? 0,
      hint: `${data?.announcements.filter((item) => item.status === 'Draft').length ?? 0} in draft`,
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff' }]}
      title="Staff Overview"
      description="Summary of local preview records. Choose an operation to continue."
    >
      {overview.error && <ErrorState message={overview.error} onRetry={overview.reload} />}
      {overview.loading && <LoadingState />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {summaries.map((item) => (
              <Card key={item.label} bodyClassName="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
                <p className="mt-1 text-xs text-muted">{item.hint}</p>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            {STAFF_NAV_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <section key={group.id}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                    <GroupIcon className="h-4 w-4 text-primary-600" aria-hidden />
                    {group.label}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => navigateTo(item.path)}
                          className="group flex items-center gap-4 rounded-xl border border-border bg-white p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-pop focus-visible:ring-2 focus-visible:ring-primary-400"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-medium text-ink">{item.label}</span>
                          <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Recently joined staff" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {recentStaff.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-ink">{member.name}</span>
                    <span className="shrink-0 text-xs text-muted">{formatDate(member.joiningDate)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Recent payments" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {recentPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate text-ink">{staffName(payment.staffId)}</span>
                    <span className="shrink-0 font-medium text-ink">{formatMoney(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Pending leave requests" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {pendingLeaves.slice(0, 5).map((leave) => (
                  <li key={leave.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate text-ink">{staffName(leave.staffId)}</span>
                    <StatusBadge status={leave.status} />
                  </li>
                ))}
                {pendingLeaves.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">No pending leave requests.</li>}
              </ul>
            </Card>

            <Card title="Announcements" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {data.announcements.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate text-ink">{item.title}</span>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
                {data.announcements.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">No announcements yet.</li>}
              </ul>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}
