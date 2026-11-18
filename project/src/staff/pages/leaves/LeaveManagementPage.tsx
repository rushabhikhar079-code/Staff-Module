import { useState } from 'react';
import { Check, Download, Eye, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { ImportDialog } from '@/staff/components/ImportDialog';
import { leaveImportSpec } from '@/staff/config/importSpecs';
import { downloadCsv, toCsv, type CsvColumn } from '@/staff/utils/csv';
import { todayIso } from '@/staff/utils/format';
import { ConfirmDialog, Modal } from '@/staff/components/Modal';
import { PageLayout } from '@/staff/components/PageLayout';
import { useToast } from '@/staff/components/Toast';
import {
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Pagination,
  SearchInput,
  Select,
  StaffSelect,
  StatusBadge,
  Textarea,
  type Tone,
} from '@/staff/components/ui';
import { LEAVE_STATUSES, LEAVE_TYPES } from '@/staff/config/options';
import { useAsync } from '@/staff/hooks/useAsync';
import { usePagination } from '@/staff/hooks/usePagination';
import { staffService } from '@/staff/services/staffService';
import type { LeaveRecord, Staff } from '@/staff/types';
import { errorMessage, formatDate } from '@/staff/utils/format';

interface LeaveForm {
  staffId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

type LeaveErrors = Partial<Record<keyof LeaveForm, string>>;

const STATUS_TONE: Record<string, Tone> = { Pending: 'warning', Approved: 'success', Rejected: 'danger' };

function validateLeave(form: LeaveForm): LeaveErrors {
  const errors: LeaveErrors = {};
  if (!form.staffId) errors.staffId = 'Select a staff member.';
  if (!LEAVE_TYPES.includes(form.leaveType)) errors.leaveType = 'Select a leave type.';
  if (!form.fromDate) errors.fromDate = 'Select the start date.';
  if (!form.toDate) errors.toDate = 'Select the end date.';
  if (form.fromDate && form.toDate && form.toDate < form.fromDate) errors.toDate = 'End date cannot be before the start date.';
  if (!form.reason.trim()) errors.reason = 'Enter a reason for the leave.';
  return errors;
}

function LeaveFormDialog({
  staff,
  leave,
  defaultStaffId,
  onClose,
  onSaved,
}: {
  staff: Staff[];
  leave: LeaveRecord | null;
  defaultStaffId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [form, setForm] = useState<LeaveForm>({
    staffId: leave?.staffId ?? defaultStaffId,
    leaveType: leave?.leaveType ?? '',
    fromDate: leave?.fromDate ?? '',
    toDate: leave?.toDate ?? '',
    reason: leave?.reason ?? '',
  });
  const [errors, setErrors] = useState<LeaveErrors>({});
  const [saving, setSaving] = useState(false);

  const update = (key: keyof LeaveForm) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const nextErrors = validateLeave(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const payload = { ...form, reason: form.reason.trim() };
    setSaving(true);
    try {
      if (leave) {
        await staffService.updateLeave({ ...leave, ...payload });
        notify('Leave application updated.');
      } else {
        await staffService.createLeave({ ...payload, status: 'Pending' });
        notify('Leave application added.');
      }
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
      title={leave ? 'Edit leave application' : 'New leave application'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {leave ? 'Update application' : 'Save application'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Staff" htmlFor="leave-staff" required error={errors.staffId} className="sm:col-span-2">
          <StaffSelect
            id="leave-staff"
            staff={staff}
            value={form.staffId}
            onChange={update('staffId')}
            placeholder="Select staff"
            invalid={!!errors.staffId}
          />
        </Field>
        <Field label="Leave type" htmlFor="leave-type" required error={errors.leaveType}>
          <Select id="leave-type" value={form.leaveType} invalid={!!errors.leaveType} onChange={(e) => update('leaveType')(e.target.value)}>
            <option value="">Select type</option>
            {LEAVE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <div className="hidden sm:block" aria-hidden />
        <Field label="From" htmlFor="leave-from" required error={errors.fromDate}>
          <Input id="leave-from" type="date" value={form.fromDate} invalid={!!errors.fromDate} onChange={(e) => update('fromDate')(e.target.value)} />
        </Field>
        <Field label="To" htmlFor="leave-to" required error={errors.toDate}>
          <Input id="leave-to" type="date" value={form.toDate} invalid={!!errors.toDate} onChange={(e) => update('toDate')(e.target.value)} />
        </Field>
        <Field label="Reason" htmlFor="leave-reason" required error={errors.reason} className="sm:col-span-2">
          <Textarea id="leave-reason" rows={3} value={form.reason} invalid={!!errors.reason} onChange={(e) => update('reason')(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function LeaveManagementPage({ initialStaffId }: { initialStaffId: string }) {
  const { notify } = useToast();
  const query = useAsync(async () => {
    const [staff, leaves] = await Promise.all([staffService.listStaff(), staffService.listLeaves()]);
    return { staff, leaves };
  }, []);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [staffId, setStaffId] = useState(initialStaffId);
  const [editing, setEditing] = useState<LeaveRecord | 'new' | null>(null);
  const [viewing, setViewing] = useState<LeaveRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LeaveRecord | null>(null);

  const staff = query.data?.staff ?? [];
  const staffName = (id: string) => staff.find((member) => member.id === id)?.name ?? 'Unknown staff';
  const term = search.trim().toLowerCase();

  const rows = (query.data?.leaves ?? [])
    .filter(
      (leave) =>
        (!staffId || leave.staffId === staffId) &&
        (!status || leave.status === status) &&
        (!term || staffName(leave.staffId).toLowerCase().includes(term) || leave.leaveType.toLowerCase().includes(term)),
    )
    .sort((a, b) => b.fromDate.localeCompare(a.fromDate));
  const pager = usePagination(rows);
  const [importing, setImporting] = useState(false);
  const csvColumns: CsvColumn<LeaveRecord>[] = [
    { key: 'staff_code', label: 'Staff code', value: (leave) => staff.find((member) => member.id === leave.staffId)?.staffCode ?? '' },
    { key: 'staff_name', label: 'Staff name', value: (leave) => staffName(leave.staffId) },
    { key: 'leave_type', label: 'Leave type', value: (leave) => leave.leaveType },
    { key: 'from_date', label: 'From date', value: (leave) => leave.fromDate },
    { key: 'to_date', label: 'To date', value: (leave) => leave.toDate },
    { key: 'reason', label: 'Reason', value: (leave) => leave.reason },
    { key: 'status', label: 'Status', value: (leave) => leave.status },
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await staffService.deleteLeave(deleting.id);
      notify('Leave application deleted.');
      setDeleting(null);
      query.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (leave: LeaveRecord, nextStatus: 'Approved' | 'Rejected') => {
    setBusyId(leave.id);
    try {
      await staffService.updateLeave({ ...leave, status: nextStatus });
      notify(nextStatus === 'Approved' ? 'Leave approved.' : 'Leave rejected.');
      setViewing(null);
      query.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<LeaveRecord>[] = [
    { key: 'staff', header: 'Staff', render: (row) => <span className="font-medium text-ink">{staffName(row.staffId)}</span> },
    { key: 'type', header: 'Leave type', render: (row) => row.leaveType },
    { key: 'dates', header: 'Dates', render: (row) => `${formatDate(row.fromDate)} to ${formatDate(row.toDate)}` },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} tone={STATUS_TONE[row.status] ?? 'neutral'} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Delete leave" disabled={busyId === row.id} onClick={() => setDeleting(row)}>
            <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
          </Button>
          {row.status === 'Pending' && (
            <>
              <Button variant="outline" size="icon" aria-label="Approve leave" disabled={busyId === row.id} onClick={() => decide(row, 'Approved')}>
                <Check className="h-4 w-4 text-success-600" aria-hidden />
              </Button>
              <Button variant="outline" size="icon" aria-label="Reject leave" disabled={busyId === row.id} onClick={() => decide(row, 'Rejected')}>
                <X className="h-4 w-4 text-danger-600" aria-hidden />
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" aria-label="View leave" onClick={() => setViewing(row)}>
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label="Edit leave" onClick={() => setEditing(row)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Leave Management' }]}
      title="Leave Management"
      description="Review leave applications and approve or reject pending requests."
      actions={
        <>
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(`staff-leaves-${todayIso()}.csv`, toCsv(csvColumns, rows))} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            New application
          </Button>
          <ImportDialog
            open={importing}
            onClose={() => setImporting(false)}
            spec={leaveImportSpec(staff)}
            onImported={() => query.reload()}
          />
        </>
      }
    >
      <Card bodyClassName="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <SearchInput label="Search leaves" placeholder="Staff name or leave type" value={search} onChange={setSearch} />
          <StaffSelect staff={staff} value={staffId} onChange={setStaffId} placeholder="All staff" />
          <Select aria-label="Leave status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {LEAVE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card bodyClassName="p-0">
        {query.loading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={pager.pageItems}
              rowKey={(row) => row.id}
              minWidth="min-w-[820px]"
              empty={<div className="px-6 py-14 text-center text-sm text-muted">No leave applications match these filters.</div>}
            />
            {rows.length > 0 && (
              <Pagination
                page={pager.page}
                pageSize={pager.pageSize}
                total={pager.total}
                onPageChange={pager.onPageChange}
                onPageSizeChange={pager.onPageSizeChange}
              />
            )}
          </>
        )}
      </Card>

      {editing && (
        <LeaveFormDialog
          key={editing === 'new' ? 'new' : editing.id}
          staff={staff}
          leave={editing === 'new' ? null : editing}
          defaultStaffId={staffId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            query.reload();
          }}
        />
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Leave details"
        footer={
          viewing?.status === 'Pending' ? (
            <>
              <Button variant="outline" onClick={() => decide(viewing, 'Rejected')} disabled={busyId === viewing.id}>
                Reject
              </Button>
              <Button onClick={() => decide(viewing, 'Approved')} loading={busyId === viewing.id}>
                Approve
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
          )
        }
      >
        {viewing && (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Staff</dt>
              <dd className="font-medium text-ink">{staffName(viewing.staffId)}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd>
                <StatusBadge status={viewing.status} tone={STATUS_TONE[viewing.status] ?? 'neutral'} />
              </dd>
            </div>
            <div>
              <dt className="text-muted">Leave type</dt>
              <dd className="font-medium text-ink">{viewing.leaveType}</dd>
            </div>
            <div>
              <dt className="text-muted">Dates</dt>
              <dd className="font-medium text-ink">{`${formatDate(viewing.fromDate)} to ${formatDate(viewing.toDate)}`}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Reason</dt>
              <dd className="text-ink">{viewing.reason}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete leave application?"
        message={deleting ? `The leave application for ${staffName(deleting.staffId)} will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        tone="danger"
        busy={busyId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </PageLayout>
  );
}
