import { useMemo, useState } from 'react';
import { Download, RefreshCw, Usb } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { PageLayout } from '@/staff/components/PageLayout';
import { Button, Card, ErrorState, Input, LoadingState, SearchInput, StaffIdentity, StaffSelect } from '@/staff/components/ui';
import { useAsync } from '@/staff/hooks/useAsync';
import { staffService } from '@/staff/services/staffService';
import type { PunchRecord, Staff } from '@/staff/types';
import { downloadCsv, toCsv, type CsvColumn } from '@/staff/utils/csv';
import { formatDate, shiftIso, todayIso } from '@/staff/utils/format';

interface PunchRow extends PunchRecord {
  staff: Staff | undefined;
}

export function BiometricAttendancePage({ initialStaffId }: { initialStaffId: string }) {
  const [fromDate, setFromDate] = useState(shiftIso(todayIso(), -6));
  const [toDate, setToDate] = useState(todayIso());
  const [staffId, setStaffId] = useState(initialStaffId);
  const [search, setSearch] = useState('');

  const rangeInvalid = fromDate > toDate;

  const query = useAsync(async () => {
    const [staff, punches] = await Promise.all([staffService.listStaff(), staffService.listPunches(fromDate, toDate)]);
    return { staff, punches };
  }, [fromDate, toDate]);

  const rows = useMemo<PunchRow[]>(() => {
    const staff = query.data?.staff ?? [];
    const term = search.trim().toLowerCase();
    return (query.data?.punches ?? [])
      .map((punch) => ({ ...punch, staff: staff.find((member) => member.id === punch.staffId) }))
      .filter(
        (row) =>
          (!staffId || row.staffId === staffId) &&
          (!term ||
            (row.staff?.name ?? '').toLowerCase().includes(term) ||
            (row.staff?.staffCode ?? '').toLowerCase().includes(term) ||
            (row.staff?.biometricId ?? '').toLowerCase().includes(term)),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.punchIn.localeCompare(a.punchIn));
  }, [query.data, staffId, search]);

  const columns: Column<PunchRow>[] = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'staff',
      header: 'Staff',
      render: (row) =>
        row.staff ? <StaffIdentity staff={row.staff} /> : <span className="text-muted">Unknown staff</span>,
    },
    { key: 'bio', header: 'Biometric ID', render: (row) => row.staff?.biometricId || '—' },
    { key: 'in', header: 'In', render: (row) => row.punchIn || '—' },
    { key: 'out', header: 'Out', render: (row) => row.punchOut || '—' },
    { key: 'device', header: 'Device', render: (row) => row.deviceName || '—' },
  ];

  const csvColumns: CsvColumn<PunchRow>[] = [
    { key: 'date', label: 'Date', value: (row) => row.date },
    { key: 'staffCode', label: 'Staff Code', value: (row) => row.staff?.staffCode ?? '' },
    { key: 'name', label: 'Name', value: (row) => row.staff?.name ?? '' },
    { key: 'punchIn', label: 'Punch In', value: (row) => row.punchIn },
    { key: 'punchOut', label: 'Punch Out', value: (row) => row.punchOut },
    { key: 'device', label: 'Device', value: (row) => row.deviceName },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Get Staff Biometric Attendance' }]}
      title="Get Staff Biometric Attendance"
      description="Review punch records captured by biometric devices for a chosen period."
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => downloadCsv(`biometric-attendance-${fromDate}-to-${toDate}.csv`, toCsv(csvColumns, rows))}
            disabled={rows.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <Button variant="outline" onClick={query.reload} disabled={query.loading || rangeInvalid}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </Button>
        </>
      }
    >
      <div role="note" className="flex items-start gap-3 rounded-xl border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm text-warning-700">
        <Usb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">No biometric device connected.</span> Live device sync is not configured in this preview.
          The punches below are local preview records only.
        </p>
      </div>

      <Card bodyClassName="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.4fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio-from" className="text-[13px] font-medium text-ink">From</label>
            <Input id="bio-from" type="date" value={fromDate} invalid={rangeInvalid} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio-to" className="text-[13px] font-medium text-ink">To</label>
            <Input id="bio-to" type="date" value={toDate} invalid={rangeInvalid} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio-staff" className="text-[13px] font-medium text-ink">Staff member</label>
            <StaffSelect id="bio-staff" staff={query.data?.staff ?? []} value={staffId} onChange={setStaffId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio-search" className="text-[13px] font-medium text-ink">Search</label>
            <SearchInput label="Search punches" placeholder="Name, staff code or biometric ID" value={search} onChange={setSearch} />
          </div>
        </div>
        {rangeInvalid && <p role="alert" className="mt-3 text-xs text-danger-600">The From date must be on or before the To date.</p>}
      </Card>

      <Card bodyClassName="p-0">
        {query.loading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : (
          <DataTable
            columns={columns}
            rows={rangeInvalid ? [] : rows}
            rowKey={(row) => `${row.staffId}-${row.date}-${row.punchIn}-${row.deviceName}`}
            empty={
              <div className="px-6 py-14 text-center text-sm text-muted">
                {rangeInvalid ? 'Choose a valid date range to see punch records.' : 'No punch records found for this period.'}
              </div>
            }
          />
        )}
      </Card>
    </PageLayout>
  );
}
