import { useMemo, useState } from 'react';
import { Download, Pencil, Upload } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { Modal } from '@/staff/components/Modal';
import { ImportDialog } from '@/staff/components/ImportDialog';
import { PageLayout } from '@/staff/components/PageLayout';
import { inOutImportSpec } from '@/staff/config/importSpecs';
import { downloadCsv, toCsv, type CsvColumn } from '@/staff/utils/csv';
import { TextField } from '@/staff/components/FormFields';
import { useToast } from '@/staff/components/Toast';
import { Button, Card, ErrorState, Input, LoadingState, SearchInput, StaffIdentity, StaffSelect, StatusBadge } from '@/staff/components/ui';
import { useAsync } from '@/staff/hooks/useAsync';
import { staffService } from '@/staff/services/staffService';
import type { InOutRecord, Staff } from '@/staff/types';
import { errorMessage, todayIso } from '@/staff/utils/format';

interface InOutRow {
  staff: Staff;
  record: InOutRecord | undefined;
}

export function InOutTimePage({ initialStaffId }: { initialStaffId: string }) {
  const [date, setDate] = useState(todayIso());
  const [staffId, setStaffId] = useState(initialStaffId);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Staff | null>(null);
  const [importing, setImporting] = useState(false);

  const query = useAsync(async () => {
    const [staff, records] = await Promise.all([staffService.listStaff(), staffService.listInOut(date)]);
    return { staff, records };
  }, [date]);

  const rows = useMemo<InOutRow[]>(() => {
    const term = search.trim().toLowerCase();
    return (query.data?.staff ?? [])
      .filter(
        (member) =>
          (!staffId || member.id === staffId) &&
          (!term || member.name.toLowerCase().includes(term) || member.staffCode.toLowerCase().includes(term)),
      )
      .map((member) => ({ staff: member, record: query.data?.records.find((item) => item.staffId === member.id) }));
  }, [query.data, staffId, search]);

  const csvColumns: CsvColumn<InOutRow>[] = [
    { key: 'staff_code', label: 'Staff code', value: (row) => row.staff.staffCode },
    { key: 'name', label: 'Name', value: (row) => row.staff.name },
    { key: 'date', label: 'Date', value: () => date },
    { key: 'in_time', label: 'In time', value: (row) => row.record?.inTime ?? '' },
    { key: 'out_time', label: 'Out time', value: (row) => row.record?.outTime ?? '' },
  ];

  const columns: Column<InOutRow>[] = [
    { key: 'staff', header: 'Staff', render: (row) => <StaffIdentity staff={row.staff} /> },
    { key: 'in', header: 'In time', render: (row) => row.record?.inTime || '—' },
    { key: 'out', header: 'Out time', render: (row) => row.record?.outTime || '—' },
    {
      key: 'state',
      header: 'Record',
      render: (row) =>
        row.record ? <StatusBadge status="Recorded" tone="success" /> : <StatusBadge status="Not recorded" tone="neutral" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => setEditing(row.staff)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {row.record ? 'Edit' : 'Enter times'}
        </Button>
      ),
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Staff In/Out Attendance Time' }]}
      title="Staff In/Out Attendance Time"
      description="Record the in and out time for each staff member on a given day."
      actions={
        <>
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(`in-out-${date}.csv`, toCsv(csvColumns, rows))} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <ImportDialog
            open={importing}
            onClose={() => setImporting(false)}
            spec={inOutImportSpec(query.data?.staff ?? [])}
            onImported={() => query.reload()}
          />
        </>
      }
    >

      <Card bodyClassName="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="io-date" className="text-[13px] font-medium text-ink">Date</label>
            <Input id="io-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="io-staff" className="text-[13px] font-medium text-ink">Staff member</label>
            <StaffSelect id="io-staff" staff={query.data?.staff ?? []} value={staffId} onChange={setStaffId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="io-search" className="text-[13px] font-medium text-ink">Search</label>
            <SearchInput label="Search staff" placeholder="Name or staff code" value={search} onChange={setSearch} />
          </div>
        </div>
      </Card>

      <Card bodyClassName="p-0">
        {query.loading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(row) => row.staff.id} minWidth="min-w-[640px]" />
        )}
      </Card>

      {editing && (
        <InOutDialog
          key={editing.id}
          staff={editing}
          date={date}
          record={query.data?.records.find((item) => item.staffId === editing.id)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            query.reload();
          }}
        />
      )}
    </PageLayout>
  );
}

interface InOutDialogProps {
  staff: Staff;
  date: string;
  record: InOutRecord | undefined;
  onClose: () => void;
  onSaved: () => void;
}

function InOutDialog({ staff, date, record, onClose, onSaved }: InOutDialogProps) {
  const { notify } = useToast();
  const [inTime, setInTime] = useState(record?.inTime ?? '');
  const [outTime, setOutTime] = useState(record?.outTime ?? '');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!inTime && !outTime) {
      setError('Enter an in time, an out time, or both.');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await staffService.saveInOut(staff.id, date, inTime, outTime);
      notify(`In/out time saved for ${staff.name}.`);
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="In/Out Time"
      description={`${staff.name} · ${date.split('-').reverse().join('-')}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="io-in" label="In time" type="time" value={inTime} error={error} onChange={setInTime} />
        <TextField id="io-out" label="Out time" type="time" value={outTime} onChange={setOutTime} />
      </div>
    </Modal>
  );
}
