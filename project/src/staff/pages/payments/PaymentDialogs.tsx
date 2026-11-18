import { useState } from 'react';
import { Printer } from 'lucide-react';
import { SelectField, TextAreaField, TextField } from '@/staff/components/FormFields';
import { Modal } from '@/staff/components/Modal';
import { useToast } from '@/staff/components/Toast';
import { Button, StaffSelect } from '@/staff/components/ui';
import { PAYMENT_METHODS } from '@/staff/config/options';
import { staffService } from '@/staff/services/staffService';
import type { PaymentRecord, Staff } from '@/staff/types';
import { errorMessage, formatDate, formatMoney, isPositiveAmount, parseAmount, todayIso } from '@/staff/utils/format';

type PaymentErrors = Partial<Record<'staffId' | 'paymentDate' | 'amount' | 'method', string>>;

interface PaymentFormDialogProps {
  staff: Staff[];
  payment: PaymentRecord | null;
  defaultStaffId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function PaymentFormDialog({ staff, payment, defaultStaffId, onClose, onSaved }: PaymentFormDialogProps) {
  const { notify } = useToast();
  const [staffId, setStaffId] = useState(payment?.staffId ?? defaultStaffId);
  const [paymentDate, setPaymentDate] = useState(payment?.paymentDate ?? todayIso());
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [method, setMethod] = useState(payment?.method ?? '');
  const [reference, setReference] = useState(payment?.reference ?? '');
  const [receiptNo, setReceiptNo] = useState(payment?.receiptNo ?? '');
  const [remarks, setRemarks] = useState(payment?.remarks ?? '');
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [saving, setSaving] = useState(false);
  const isEdit = payment !== null;
  const selectedStaff = staff.find((member) => member.id === (payment?.staffId ?? staffId));

  const submit = async () => {
    const found: PaymentErrors = {};
    if (!isEdit && !staffId) found.staffId = 'Select a staff member.';
    if (!paymentDate) found.paymentDate = 'Select the payment date.';
    if (!isEdit && (!isPositiveAmount(amount) || parseAmount(amount) <= 0)) found.amount = 'Enter an amount greater than 0.';
    if (!isEdit && !method) found.method = 'Select a payment method.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      if (payment) {
        await staffService.updatePayment({ ...payment, paymentDate, receiptNo, remarks });
      } else {
        await staffService.createPayment({
          staffId,
          paymentDate,
          amount: parseAmount(amount),
          method,
          reference,
          receiptNo,
          remarks,
        });
      }
      notify(isEdit ? 'Receipt details updated.' : 'Payment recorded.');
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
      size="md"
      title={isEdit ? 'Modify Payment Receipt Details' : 'Record Payment'}
      description={isEdit ? 'Update the receipt date, number or remarks.' : 'Enter the payment details. Fields marked * are required.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Update' : 'Save payment'}
          </Button>
        </>
      }
    >
      {isEdit ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-4 py-3 md:col-span-2">
            <p className="text-xs text-muted">Staff member</p>
            <p className="text-sm font-medium text-ink">{selectedStaff?.name ?? 'Unknown staff'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs text-muted">Paid amount</p>
            <p className="text-sm font-semibold text-ink">{payment ? formatMoney(payment.amount) : '—'}</p>
          </div>
          <TextField id="pay-date" label="Receipt date" type="date" required value={paymentDate} error={errors.paymentDate} onChange={setPaymentDate} />
          <TextField id="pay-receipt" label="Receipt number" value={receiptNo} onChange={setReceiptNo} />
          <TextAreaField id="pay-remarks" label="Remarks" className="md:col-span-2" maxLength={500} value={remarks} onChange={setRemarks} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="pay-staff" className="text-[13px] font-medium text-ink">
              Staff member <span className="text-danger-600">*</span>
            </label>
            <StaffSelect id="pay-staff" staff={staff} value={staffId} onChange={setStaffId} placeholder="Select staff member" invalid={!!errors.staffId} />
            {errors.staffId && <p role="alert" className="text-xs text-danger-600">{errors.staffId}</p>}
          </div>
          <TextField id="pay-date" label="Payment date" type="date" required value={paymentDate} error={errors.paymentDate} onChange={setPaymentDate} />
          <TextField
            id="pay-amount"
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            error={errors.amount}
            onChange={setAmount}
          />
          <SelectField id="pay-method" label="Payment method" required placeholder="Select method" options={PAYMENT_METHODS} value={method} error={errors.method} onChange={setMethod} />
          <TextField id="pay-reference" label="Reference / transaction number" value={reference} onChange={setReference} />
          <TextField id="pay-receipt" label="Receipt number" value={receiptNo} onChange={setReceiptNo} />
          <TextAreaField id="pay-remarks" label="Remarks" className="md:col-span-2" maxLength={500} value={remarks} onChange={setRemarks} />
        </div>
      )}
    </Modal>
  );
}

interface ReceiptDialogProps {
  payment: PaymentRecord;
  staffName: string;
  onClose: () => void;
}

export function ReceiptDialog({ payment, staffName, onClose }: ReceiptDialogProps) {
  const rows: [string, string][] = [
    ['Receipt number', payment.receiptNo || '—'],
    ['Staff member', staffName],
    ['Payment date', formatDate(payment.paymentDate)],
    ['Method', payment.method],
    ['Reference', payment.reference || '—'],
    ['Remarks', payment.remarks || '—'],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Payment Receipt"
      description="Preview of the stored payment details."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-border rounded-lg border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="min-w-0 break-words font-medium text-ink">{value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between bg-primary-50 px-4 py-3">
          <dt className="text-sm font-medium text-primary-700">Amount</dt>
          <dd className="text-lg font-semibold text-primary-700">{formatMoney(payment.amount)}</dd>
        </div>
      </dl>
    </Modal>
  );
}
