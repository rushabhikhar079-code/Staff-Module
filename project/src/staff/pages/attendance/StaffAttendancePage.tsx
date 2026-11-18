import { useMemo, useState } from 'react';
import { Download, Save, Upload } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { ImportDialog } from '@/staff/components/ImportDialog';
import { attendanceImportSpec } from '@/staff/config/importSpecs';
import { downloadCsv, toCsv, type CsvColumn } from '@/staff/utils/csv';
import { PageLayout } from '@/staff/components/PageLayout';
import { useToast } from '@/staff/components/Toast';
import { Button, Card, ErrorState, Input, LoadingState, SearchInput, Select, StaffIdentity, StaffSelect, StatusBadge } from '@/staff/components/ui';
import { ATTENDANCE_STATUSES } from '@/staff/config/options';
import { useAsync } from '@/staff/hooks/useAsync';
import { staffService } from '@/staff/services/staffService';
import type { Staff } from '@/staff/types';
import { errorMessage, todayIso } from '@/staff/utils/format';

interface Draft {
  status: string;
  remarks: string;
}

interface AttendanceRow {
  staff: Staff;
  status: string;
  remarks: string;
  unsaved: boolean;
}

const UNMARKED = '__unmarked__';

export function StaffAttendancePage({ initialStaffId }: { initialStaffId: string }) {
  const { notify } = useToast();
  const [date, setDate] = useState(todayIso());
  const [staffId, setStaffId] = useState(initialStaffId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  const query = useAsync(async () => {
    const [staff, records] = await Promise.all([staffService.listStaff(), staffService.listAttendance(date)]);
    return { staff, records };
  }, [date]);

  const allRows = useMemo<AttendanceRow[]>(() => {
    const records = query.data?.records ?? [];
    return (query.data?.staff ?? []).map((member) => {
      const saved = records.find((record) => record.staffId === member.id);
      const draft = drafts[member.id];
      return {
        staff: member,
        status: draft?.status ?? saved?.status ?? '',
        remarks: draft?.remarks ?? saved?.remarks ?? '',
        unsaved: draft !== undefined,
      };
    });
  }, [query.data, drafts]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRows.filter(
      (row) =>
        (!staffId || row.staff.id === staffId) &&
        (!term || row.staff.name.toLowerCase().includes(term) || row.staff.staffCode.toLowerCase().includes(term)) &&
        (!statusFilter || (statusFilter === UNMARKED ? row.status === '' : row.status === statusFilter)),
    );
  }, [allRows, staffId, search, statusFilter]);

  const [importing, setImporting] = useState(false);
  const csvColumns: CsvColumn<AttendanceRow>[] = [
    { key: 'staff_code', label: 'Staff code', value: (row) => row.staff.staffCode },
    { key: 'name', label: 'Name', value: (row) => row.staff.name },
    { key: 'date', label: 'Date', value: () => date },
    { key: 'status', label: 'Status', value: (row) => row.status },
    { key: 'remarks', label: 'Remarks', value: (row) => row.remarks },
  ];

  const summary = useMemo(() => {
    const counts: Record<string, number> = { [UNMARKED]: 0 };
    ATTENDANCE_STATUSES.forEach((status) => (counts[status] = 0));
    allRows.forEach((row) => {
      if (row.status === '') counts[UNMARKED] += 1;
      else counts[row.status] = (counts[row.status] ?? 0) + 1;
    });
    return counts;
  }, [allRows]);

  const unsavedCount = Object.values(drafts).filter((draft) => draft.status).length;

  const updateRow = (row: AttendanceRow, patch: Partial<Draft>) => {
    setDrafts((previous) => ({
      ...previous,
      [row.staff.id]: { status: row.status, remarks: row.remarks, ...patch },
    }));
  };

  const changeDate = (value: string) => {
    setDate(value);
    setDrafts({});
  };

  const saveAll = async () => {
    const entries = Object.entries(drafts).filter(([, draft]) => draft.status);
    if (entries.length === 0) {
      notify('Mark a status for at least one staff member before saving.', 'error');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(entries.map(([id, draft]) => staffService.saveAttendance(id, date, draft.status, draft.remarks)));
      notify(`Attendance saved for ${entries.length} staff member${entries.length === 1 ? '' : 's'}.`);
      setDrafts({});
      query.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AttendanceRow>[] = [
    { key: 'staff', header: 'Staff', render: (row) => <StaffIdentity staff={row.staff} /> },
    {
      key: 'status',
      header: 'Status',
      className: 'min-w-[170px]',
      render: (row) => (
        <Select aria-label={`Attendance status for ${row.staff.name}`} className="h-9" value={row.status} onChange={(event) => updateRow(row, { status: event.target.value })}>
          <option value="">Not marked</option>
          {ATTENDANCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      className: 'min-w-[200px]',
      render: (row) => (
        <Input
          aria-label={`Remarks for ${row.staff.name}`}
          className="h-9"
          maxLength={200}
          placeholder="Optional"
          value={row.remarks}
          onChange={(event) => updateRow(row, { remarks: event.target.value })}
        />
      ),
    },
    {
      key: 'state',
      header: 'State',
      render: (row) =>
        row.unsaved ? (
          <span className="text-xs font-medium text-warning-700">Unsaved</span>
        ) : row.status ? (
          <StatusBadge status={row.status} />
        ) : (
          <span className="text-xs text-muted">Not marked</span>
        ),
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Manage Staff Attendance' }]}
      title="Manage Staff Attendance"
      description="Mark each staff member's attendance for a day, then save the changes."
      actions={
        <>
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(`attendance-${date}.csv`, toCsv(csvColumns, rows))} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <ImportDialog
            open={importing}
            onClose={() => setImporting(false)}
            spec={attendanceImportSpec(query.data?.staff ?? [])}
            onImported={() => query.reload()}
          />
        </>
      }
    >
      <Card bodyClassName="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-date" className="text-[13px] font-medium text-ink">Attendance date</label>
            <Input id="att-date" type="date" value={date} onChange={(event) => changeDate(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-search" className="text-[13px] font-medium text-ink">Find staff</label>
            <SearchInput label="Find staff" placeholder="Name or staff code" value={search} onChange={setSearch} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-staff" className="text-[13px] font-medium text-ink">Staff member</label>
            <StaffSelect id="att-staff" staff={query.data?.staff ?? []} value={staffId} onChange={setStaffId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-status" className="text-[13px] font-medium text-ink">Status</label>
            <Select id="att-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
              <option value={UNMARKED}>Not marked</option>
            </Select>
          </div>
        </div>
      </Card>

      {query.data && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...ATTENDANCE_STATUSES, UNMARKED].map((key) => (
            <div key={key} className="shrink-0 rounded-lg border border-border bg-white px-3 py-2">
              <p className="text-xs text-muted">{key === UNMARKED ? 'Not marked' : key}</p>
              <p className="text-base font-semibold text-ink">{summary[key] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      <Card bodyClassName="p-0">
        {query.loading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(row) => row.staff.id} minWidth="min-w-[720px]" />
        )}
      </Card>

      {unsavedCount > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-primary-200 bg-white p-4 shadow-pop sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink">
            {unsavedCount} unsaved change{unsavedCount === 1 ? '' : 's'} for {date}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDrafts({})} disabled={saving}>
              Discard
            </Button>
            <Button onClick={saveAll} loading={saving}>
              <Save className="h-4 w-4" aria-hidden />
              Save attendance
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
