import { useState } from 'react';
import { Download, Eye, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { ImportDialog } from '@/staff/components/ImportDialog';
import { paymentImportSpec } from '@/staff/config/importSpecs';
import { downloadCsv, toCsv, type CsvColumn } from '@/staff/utils/csv';
import { todayIso } from '@/staff/utils/format';
import { ConfirmDialog } from '@/staff/components/Modal';
import { PageLayout } from '@/staff/components/PageLayout';
import { useToast } from '@/staff/components/Toast';
import { Button, Card, ErrorState, Input, LoadingState, Pagination, SearchInput, Select, StaffSelect } from '@/staff/components/ui';
import { PAYMENT_METHODS } from '@/staff/config/options';
import { useAsync } from '@/staff/hooks/useAsync';
import { usePagination } from '@/staff/hooks/usePagination';
import { staffService } from '@/staff/services/staffService';
import type { PaymentRecord } from '@/staff/types';
import { errorMessage, formatDate, formatMoney } from '@/staff/utils/format';
import { PaymentFormDialog, ReceiptDialog } from '@/staff/pages/payments/PaymentDialogs';

export function MakeStaffPaymentPage({ initialStaffId }: { initialStaffId: string }) {
  const { notify } = useToast();
  const query = useAsync(async () => {
    const [staff, payments] = await Promise.all([staffService.listStaff(), staffService.listPayments()]);
    return { staff, payments };
  }, []);

  const [staffId, setStaffId] = useState(initialStaffId);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [formTarget, setFormTarget] = useState<PaymentRecord | 'new' | null>(null);
  const [viewing, setViewing] = useState<PaymentRecord | null>(null);
  const [deleting, setDeleting] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const staff = query.data?.staff ?? [];
  const staffName = (id: string) => staff.find((member) => member.id === id)?.name ?? 'Unknown staff';

  const term = search.trim().toLowerCase();
  const rows = (query.data?.payments ?? [])
    .filter(
      (row) =>
        (!staffId || row.staffId === staffId) &&
        (!method || row.method === method) &&
        (!fromDate || row.paymentDate >= fromDate) &&
        (!toDate || row.paymentDate <= toDate) &&
        (!term ||
          row.receiptNo.toLowerCase().includes(term) ||
          row.reference.toLowerCase().includes(term) ||
          staffName(row.staffId).toLowerCase().includes(term)),
    )
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const pager = usePagination(rows);
  const [importing, setImporting] = useState(false);
  const csvColumns: CsvColumn<PaymentRecord>[] = [
    { key: 'staff_code', label: 'Staff code', value: (row) => staff.find((member) => member.id === row.staffId)?.staffCode ?? '' },
    { key: 'staff_name', label: 'Staff name', value: (row) => staffName(row.staffId) },
    { key: 'payment_date', label: 'Payment date', value: (row) => row.paymentDate },
    { key: 'amount', label: 'Amount', value: (row) => row.amount },
    { key: 'method', label: 'Method', value: (row) => row.method },
    { key: 'reference', label: 'Reference', value: (row) => row.reference },
    { key: 'receipt_no', label: 'Receipt no', value: (row) => row.receiptNo },
    { key: 'remarks', label: 'Remarks', value: (row) => row.remarks },
  ];
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await staffService.deletePayment(deleting.id);
      notify('Payment record deleted.');
      setDeleting(null);
      query.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<PaymentRecord>[] = [
    { key: 'receipt', header: 'Receipt No.', render: (row) => row.receiptNo || '—' },
    { key: 'staff', header: 'Staff', render: (row) => <span className="font-medium">{staffName(row.staffId)}</span> },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.paymentDate) },
    { key: 'method', header: 'Method', render: (row) => row.method },
    { key: 'ref', header: 'Reference', render: (row) => row.reference || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatMoney(row.amount) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="icon" aria-label="View receipt" onClick={() => setViewing(row)}>
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label="Edit receipt details" onClick={() => setFormTarget(row)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete payment" onClick={() => setDeleting(row)}>
            <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Make Staff Payment' }]}
      title="Make Staff Payment"
      description="Record payments made to staff and review the payment history."
      actions={
        <>
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(`staff-payments-${todayIso()}.csv`, toCsv(csvColumns, rows))} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <Button onClick={() => setFormTarget('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            Record payment
          </Button>
          <ImportDialog
            open={importing}
            onClose={() => setImporting(false)}
            spec={paymentImportSpec(staff)}
            onImported={() => query.reload()}
          />
        </>
      }
    >
      <Card bodyClassName="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <SearchInput label="Search payments" placeholder="Receipt, reference or staff" value={search} onChange={setSearch} />
          <StaffSelect staff={staff} value={staffId} onChange={setStaffId} placeholder="All staff" />
          <Select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>
      </Card>

      <div className="rounded-xl border border-border bg-white px-5 py-3 text-sm text-ink shadow-card">
        {rows.length} payment{rows.length === 1 ? '' : 's'} · Total <span className="font-semibold text-primary-700">{formatMoney(total)}</span>
      </div>

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
              empty={<div className="px-6 py-14 text-center text-sm text-muted">No payments match these filters.</div>}
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

      {formTarget && (
        <PaymentFormDialog
          key={formTarget === 'new' ? 'new' : formTarget.id}
          staff={staff}
          payment={formTarget === 'new' ? null : formTarget}
          defaultStaffId={staffId}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            query.reload();
          }}
        />
      )}

      {viewing && <ReceiptDialog payment={viewing} staffName={staffName(viewing.staffId)} onClose={() => setViewing(null)} />}

      <ConfirmDialog
        open={!!deleting}
        title="Delete payment record?"
        message={deleting ? `Remove the ${formatMoney(deleting.amount)} payment for ${staffName(deleting.staffId)}. This cannot be undone.` : ''}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </PageLayout>
  );
}
