import { useState } from 'react';
import { Download, Eye, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { ImportDialog } from '@/staff/components/ImportDialog';
import { loanImportSpec } from '@/staff/config/importSpecs';
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
import { LOAN_STATUSES } from '@/staff/config/options';
import { useAsync } from '@/staff/hooks/useAsync';
import { usePagination } from '@/staff/hooks/usePagination';
import { staffService } from '@/staff/services/staffService';
import type { LoanRecord, Staff } from '@/staff/types';
import { errorMessage, formatDate, formatMoney, isPositiveAmount, parseAmount } from '@/staff/utils/format';

interface LoanForm {
  staffId: string;
  amount: string;
  issuedDate: string;
  repaidAmount: string;
  purpose: string;
  status: string;
}

type LoanErrors = Partial<Record<keyof LoanForm, string>>;

const STATUS_TONE: Record<string, Tone> = { Active: 'info', Closed: 'success' };

function validateLoan(form: LoanForm): LoanErrors {
  const errors: LoanErrors = {};
  const repaid = Number(form.repaidAmount);
  if (!form.staffId) errors.staffId = 'Select a staff member.';
  if (!isPositiveAmount(form.amount)) errors.amount = 'Enter an amount greater than 0.';
  if (!form.issuedDate) errors.issuedDate = 'Select the issued date.';
  if (form.repaidAmount.trim() === '' || !Number.isFinite(repaid) || repaid < 0) {
    errors.repaidAmount = 'Enter 0 or a positive amount.';
  }
  if (!LOAN_STATUSES.includes(form.status)) errors.status = 'Select a status.';
  return errors;
}

function LoanFormDialog({
  staff,
  loan,
  defaultStaffId,
  onClose,
  onSaved,
}: {
  staff: Staff[];
  loan: LoanRecord | null;
  defaultStaffId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [form, setForm] = useState<LoanForm>({
    staffId: loan?.staffId ?? defaultStaffId,
    amount: loan ? String(loan.amount) : '',
    issuedDate: loan?.issuedDate ?? '',
    repaidAmount: loan ? String(loan.repaidAmount) : '0',
    purpose: loan?.purpose ?? '',
    status: loan?.status ?? LOAN_STATUSES[0],
  });
  const [errors, setErrors] = useState<LoanErrors>({});
  const [saving, setSaving] = useState(false);

  const update = (key: keyof LoanForm) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const nextErrors = validateLoan(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const payload = {
      staffId: form.staffId,
      amount: parseAmount(form.amount),
      issuedDate: form.issuedDate,
      repaidAmount: parseAmount(form.repaidAmount),
      purpose: form.purpose.trim(),
      status: form.status,
    };
    setSaving(true);
    try {
      if (loan) {
        await staffService.updateLoan({ ...loan, ...payload });
        notify('Loan details updated.');
      } else {
        await staffService.createLoan(payload);
        notify('Loan record added.');
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
      title={loan ? 'Edit loan' : 'Add loan'}
      description="Repaid amount is stored exactly as entered."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {loan ? 'Update loan' : 'Save loan'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Staff" htmlFor="loan-staff" required error={errors.staffId} className="sm:col-span-2">
          <StaffSelect
            id="loan-staff"
            staff={staff}
            value={form.staffId}
            onChange={update('staffId')}
            placeholder="Select staff"
            invalid={!!errors.staffId}
          />
        </Field>
        <Field label="Loan amount" htmlFor="loan-amount" required error={errors.amount}>
          <Input id="loan-amount" inputMode="decimal" value={form.amount} invalid={!!errors.amount} onChange={(e) => update('amount')(e.target.value)} />
        </Field>
        <Field label="Issued date" htmlFor="loan-issued" required error={errors.issuedDate}>
          <Input id="loan-issued" type="date" value={form.issuedDate} invalid={!!errors.issuedDate} onChange={(e) => update('issuedDate')(e.target.value)} />
        </Field>
        <Field label="Repaid amount" htmlFor="loan-repaid" required error={errors.repaidAmount}>
          <Input id="loan-repaid" inputMode="decimal" value={form.repaidAmount} invalid={!!errors.repaidAmount} onChange={(e) => update('repaidAmount')(e.target.value)} />
        </Field>
        <Field label="Status" htmlFor="loan-status" required error={errors.status}>
          <Select id="loan-status" value={form.status} invalid={!!errors.status} onChange={(e) => update('status')(e.target.value)}>
            {LOAN_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Purpose" htmlFor="loan-purpose" className="sm:col-span-2">
          <Textarea id="loan-purpose" rows={3} value={form.purpose} onChange={(e) => update('purpose')(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function StaffLoanPage({ initialStaffId }: { initialStaffId: string }) {
  const { notify } = useToast();
  const query = useAsync(async () => {
    const [staff, loans] = await Promise.all([staffService.listStaff(), staffService.listLoans()]);
    return { staff, loans };
  }, []);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [staffId, setStaffId] = useState(initialStaffId);
  const [editing, setEditing] = useState<LoanRecord | 'new' | null>(null);
  const [viewing, setViewing] = useState<LoanRecord | null>(null);
  const [deleting, setDeleting] = useState<LoanRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const staff = query.data?.staff ?? [];
  const staffName = (id: string) => staff.find((member) => member.id === id)?.name ?? 'Unknown staff';
  const term = search.trim().toLowerCase();

  const rows = (query.data?.loans ?? []).filter(
    (loan) =>
      (!staffId || loan.staffId === staffId) &&
      (!status || loan.status === status) &&
      (!term || staffName(loan.staffId).toLowerCase().includes(term) || loan.purpose.toLowerCase().includes(term)),
  );
  const pager = usePagination(rows);
  const [importing, setImporting] = useState(false);
  const csvColumns: CsvColumn<LoanRecord>[] = [
    { key: 'staff_code', label: 'Staff code', value: (loan) => staff.find((member) => member.id === loan.staffId)?.staffCode ?? '' },
    { key: 'staff_name', label: 'Staff name', value: (loan) => staffName(loan.staffId) },
    { key: 'amount', label: 'Amount', value: (loan) => loan.amount },
    { key: 'issued_date', label: 'Issued date', value: (loan) => loan.issuedDate },
    { key: 'repaid_amount', label: 'Repaid amount', value: (loan) => loan.repaidAmount },
    { key: 'purpose', label: 'Purpose', value: (loan) => loan.purpose },
    { key: 'status', label: 'Status', value: (loan) => loan.status },
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await staffService.deleteLoan(deleting.id);
      notify('Loan record deleted.');
      setDeleting(null);
      query.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<LoanRecord>[] = [
    { key: 'staff', header: 'Staff', render: (row) => <span className="font-medium text-ink">{staffName(row.staffId)}</span> },
    { key: 'issued', header: 'Issued', render: (row) => formatDate(row.issuedDate) },
    { key: 'amount', header: 'Loan amount', align: 'right', render: (row) => formatMoney(row.amount) },
    { key: 'repaid', header: 'Repaid', align: 'right', render: (row) => formatMoney(row.repaidAmount) },
    { key: 'purpose', header: 'Purpose', render: (row) => <span className="line-clamp-2 max-w-xs">{row.purpose || '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} tone={STATUS_TONE[row.status] ?? 'neutral'} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="icon" aria-label="View loan" onClick={() => setViewing(row)}>
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label="Edit loan" onClick={() => setEditing(row)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete loan" onClick={() => setDeleting(row)}>
            <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Staff Loan' }]}
      title="Staff Loan"
      description="Record staff loans, the amount repaid so far and the current loan status."
      actions={
        <>
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(`staff-loans-${todayIso()}.csv`, toCsv(csvColumns, rows))} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            Add loan
          </Button>
          <ImportDialog
            open={importing}
            onClose={() => setImporting(false)}
            spec={loanImportSpec(staff)}
            onImported={() => query.reload()}
          />
        </>
      }
    >
      <Card bodyClassName="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <SearchInput label="Search loans" placeholder="Staff name or purpose" value={search} onChange={setSearch} />
          <StaffSelect staff={staff} value={staffId} onChange={setStaffId} placeholder="All staff" />
          <Select aria-label="Loan status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {LOAN_STATUSES.map((item) => (
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
              minWidth="min-w-[900px]"
              empty={<div className="px-6 py-14 text-center text-sm text-muted">No loans match these filters.</div>}
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
        <LoanFormDialog
          key={editing === 'new' ? 'new' : editing.id}
          staff={staff}
          loan={editing === 'new' ? null : editing}
          defaultStaffId={staffId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            query.reload();
          }}
        />
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Loan details" footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}>
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
              <dt className="text-muted">Loan amount</dt>
              <dd className="font-medium text-ink">{formatMoney(viewing.amount)}</dd>
            </div>
            <div>
              <dt className="text-muted">Repaid amount</dt>
              <dd className="font-medium text-ink">{formatMoney(viewing.repaidAmount)}</dd>
            </div>
            <div>
              <dt className="text-muted">Issued date</dt>
              <dd className="font-medium text-ink">{formatDate(viewing.issuedDate)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Purpose</dt>
              <dd className="text-ink">{viewing.purpose || '—'}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete loan record?"
        message={deleting ? `Remove the ${formatMoney(deleting.amount)} loan for ${staffName(deleting.staffId)}. This cannot be undone.` : ''}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </PageLayout>
  );
}
