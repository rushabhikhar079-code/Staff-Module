import { useMemo, useState } from 'react';
import { Pencil, Wallet } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { SelectField, TextAreaField, TextField } from '@/staff/components/FormFields';
import { Modal } from '@/staff/components/Modal';
import { PageLayout } from '@/staff/components/PageLayout';
import { useToast } from '@/staff/components/Toast';
import { Button, Card, ErrorState, LoadingState, SearchInput, StaffIdentity } from '@/staff/components/ui';
import { PAYMENT_FREQUENCIES } from '@/staff/config/options';
import { useAsync } from '@/staff/hooks/useAsync';
import { staffService } from '@/staff/services/staffService';
import type { PaymentConfig, Staff } from '@/staff/types';
import { errorMessage, formatDate, formatMoney, isPositiveAmount, parseAmount, todayIso } from '@/staff/utils/format';

interface ConfigRow {
  staff: Staff;
  config: PaymentConfig | undefined;
}

export function SetStaffPaymentPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Staff | null>(null);

  const query = useAsync(async () => {
    const [staff, configs] = await Promise.all([staffService.listStaff(), staffService.listPaymentConfigs()]);
    return { staff, configs };
  }, []);

  const rows = useMemo<ConfigRow[]>(() => {
    const term = search.trim().toLowerCase();
    return (query.data?.staff ?? [])
      .filter((member) => !term || member.name.toLowerCase().includes(term) || member.staffCode.toLowerCase().includes(term))
      .map((member) => ({ staff: member, config: query.data?.configs.find((item) => item.staffId === member.id) }));
  }, [query.data, search]);

  const columns: Column<ConfigRow>[] = [
    { key: 'staff', header: 'Staff', render: (row) => <StaffIdentity staff={row.staff} /> },
    { key: 'designation', header: 'Designation', render: (row) => row.staff.designation },
    { key: 'frequency', header: 'Frequency', render: (row) => row.config?.frequency || '—' },
    {
      key: 'salary',
      header: 'Base amount',
      align: 'right',
      render: (row) => (row.config ? formatMoney(row.config.baseSalary) : '—'),
    },
    { key: 'effective', header: 'Effective from', render: (row) => formatDate(row.config?.effectiveFrom ?? '') },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button variant={row.config ? 'outline' : 'primary'} size="sm" onClick={() => setEditing(row.staff)}>
          {row.config ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : null}
          {row.config ? 'Edit' : 'Set payment'}
        </Button>
      ),
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Set Staff Payment' }]}
      title="Set Staff Payment"
      description="Set up how each staff member is paid. This is separate from recording a payment."
    >
      <Card bodyClassName="p-4 sm:p-5">
        <SearchInput label="Search staff" placeholder="Name or staff code" value={search} onChange={setSearch} className="max-w-md" />
      </Card>

      <Card bodyClassName="p-0">
        {query.loading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.staff.id}
            minWidth="min-w-[860px]"
            empty={<div className="px-6 py-14 text-center text-sm text-muted">No staff match this search.</div>}
          />
        )}
      </Card>

      {editing && (
        <PaymentConfigDialog
          key={editing.id}
          staff={editing}
          config={query.data?.configs.find((item) => item.staffId === editing.id)}
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

type ConfigErrors = Partial<Record<'frequency' | 'baseSalary' | 'effectiveFrom', string>>;

interface PaymentConfigDialogProps {
  staff: Staff;
  config: PaymentConfig | undefined;
  onClose: () => void;
  onSaved: () => void;
}

function PaymentConfigDialog({ staff, config, onClose, onSaved }: PaymentConfigDialogProps) {
  const { notify } = useToast();
  const [frequency, setFrequency] = useState(config?.frequency ?? '');
  const [baseSalary, setBaseSalary] = useState(config ? String(config.baseSalary) : '');
  const [effectiveFrom, setEffectiveFrom] = useState(config?.effectiveFrom ?? todayIso());
  const [remarks, setRemarks] = useState(config?.remarks ?? '');
  const [errors, setErrors] = useState<ConfigErrors>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const found: ConfigErrors = {};
    if (!frequency) found.frequency = 'Select a payment frequency.';
    if (!isPositiveAmount(baseSalary)) found.baseSalary = 'Enter an amount of 0 or more.';
    if (!effectiveFrom) found.effectiveFrom = 'Select the effective date.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await staffService.savePaymentConfig(staff.id, {
        frequency,
        baseSalary: parseAmount(baseSalary),
        effectiveFrom,
        remarks,
      });
      notify(config ? 'Payment setup updated.' : 'Payment setup saved.');
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
      title={config ? 'Edit Payment Setup' : 'Set Payment'}
      description={`${staff.name} · ${staff.staffCode}`}
      icon={<Wallet className="h-4 w-4" aria-hidden />}
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
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          id="cfg-frequency"
          label="Payment frequency"
          required
          placeholder="Select frequency"
          options={PAYMENT_FREQUENCIES}
          value={frequency}
          error={errors.frequency}
          onChange={setFrequency}
        />
        <TextField
          id="cfg-amount"
          label="Base amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={baseSalary}
          error={errors.baseSalary}
          onChange={setBaseSalary}
        />
        <TextField
          id="cfg-effective"
          label="Effective from"
          type="date"
          required
          value={effectiveFrom}
          error={errors.effectiveFrom}
          onChange={setEffectiveFrom}
        />
        <TextAreaField id="cfg-remarks" label="Remarks" className="md:col-span-2" maxLength={500} value={remarks} onChange={setRemarks} />
      </div>
    </Modal>
  );
}
