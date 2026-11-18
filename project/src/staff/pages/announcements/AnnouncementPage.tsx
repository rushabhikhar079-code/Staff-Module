import { useState } from 'react';
import { Download, Eye, Pencil, Plus, Send, Trash2, Upload } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { ImportDialog } from '@/staff/components/ImportDialog';
import { announcementImportSpec } from '@/staff/config/importSpecs';
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
  StatusBadge,
  Textarea,
  type Tone,
} from '@/staff/components/ui';
import { ANNOUNCEMENT_AUDIENCES } from '@/staff/config/options';
import { useAsync } from '@/staff/hooks/useAsync';
import { usePagination } from '@/staff/hooks/usePagination';
import { staffService } from '@/staff/services/staffService';
import type { Announcement, AnnouncementAudience, Staff } from '@/staff/types';
import { errorMessage, formatDate } from '@/staff/utils/format';

interface AnnouncementForm {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  staffIds: string[];
}

type AnnouncementErrors = Partial<Record<keyof AnnouncementForm, string>>;

const STATUS_TONE: Record<Announcement['status'], Tone> = { Draft: 'neutral', Published: 'success' };

function validateAnnouncement(form: AnnouncementForm): AnnouncementErrors {
  const errors: AnnouncementErrors = {};
  if (!form.title.trim()) errors.title = 'Enter a title.';
  if (!form.body.trim()) errors.body = 'Enter the announcement message.';
  if (form.audience === 'Selected Staff' && form.staffIds.length === 0) {
    errors.staffIds = 'Select at least one staff member.';
  }
  return errors;
}

function AnnouncementFormDialog({
  staff,
  announcement,
  onClose,
  onSaved,
}: {
  staff: Staff[];
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [form, setForm] = useState<AnnouncementForm>({
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    audience: announcement?.audience ?? ANNOUNCEMENT_AUDIENCES[0],
    staffIds: announcement?.staffIds ?? [],
  });
  const [errors, setErrors] = useState<AnnouncementErrors>({});
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  const toggleStaff = (id: string) =>
    setForm((prev) => ({
      ...prev,
      staffIds: prev.staffIds.includes(id) ? prev.staffIds.filter((item) => item !== id) : [...prev.staffIds, id],
    }));

  const submit = async (status: Announcement['status']) => {
    const nextErrors = validateAnnouncement(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      staffIds: form.audience === 'Selected Staff' ? form.staffIds : [],
      status,
      updatedAt: new Date().toISOString(),
    };
    setSaving(status === 'Draft' ? 'draft' : 'publish');
    try {
      if (announcement) {
        await staffService.updateAnnouncement({ ...announcement, ...payload });
      } else {
        await staffService.createAnnouncement(payload);
      }
      notify(status === 'Draft' ? 'Draft saved.' : 'Announcement marked as published.');
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={announcement ? 'Edit announcement' : 'New announcement'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving !== null}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => submit('Draft')} loading={saving === 'draft'} disabled={saving !== null}>
            Save draft
          </Button>
          <Button onClick={() => submit('Published')} loading={saving === 'publish'} disabled={saving !== null}>
            <Send className="h-4 w-4" aria-hidden />
            Mark as published
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-4">
          <Field label="Title" htmlFor="ann-title" required error={errors.title}>
            <Input id="ann-title" value={form.title} invalid={!!errors.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </Field>
          <Field label="Message" htmlFor="ann-body" required error={errors.body}>
            <Textarea id="ann-body" rows={6} value={form.body} invalid={!!errors.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} />
          </Field>
          <Field label="Audience" htmlFor="ann-audience" required>
            <Select
              id="ann-audience"
              value={form.audience}
              onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as AnnouncementAudience }))}
            >
              {ANNOUNCEMENT_AUDIENCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          {form.audience === 'Selected Staff' && (
            <Field label="Selected staff" error={errors.staffIds} hint="Tick each staff member who should receive this announcement.">
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-white p-2">
                {staff.map((member) => (
                  <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-primary-50/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-400"
                      checked={form.staffIds.includes(member.id)}
                      onChange={() => toggleStaff(member.id)}
                    />
                    <span className="text-ink">{member.name}</span>
                  </label>
                ))}
              </div>
            </Field>
          )}
        </div>

        <div className="rounded-xl border border-border bg-page p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Preview</p>
          <h3 className="mt-2 text-base font-semibold text-ink">{form.title.trim() || 'Announcement title'}</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{form.body.trim() || 'The announcement message appears here.'}</p>
          <p className="mt-4 text-xs text-muted">
            Audience: {form.audience === 'All Staff' ? 'All staff' : `${form.staffIds.length} selected staff`}
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function AnnouncementPage() {
  const { notify } = useToast();
  const query = useAsync(async () => {
    const [staff, announcements] = await Promise.all([staffService.listStaff(), staffService.listAnnouncements()]);
    return { staff, announcements };
  }, []);

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);

  const staff = query.data?.staff ?? [];
  const term = search.trim().toLowerCase();
  const rows = (query.data?.announcements ?? [])
    .filter((item) => !term || item.title.toLowerCase().includes(term) || item.body.toLowerCase().includes(term))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pager = usePagination(rows);
  const [importing, setImporting] = useState(false);
  const csvColumns: CsvColumn<Announcement>[] = [
    { key: 'title', label: 'Title', value: (item) => item.title },
    { key: 'body', label: 'Message', value: (item) => item.body },
    { key: 'audience', label: 'Audience', value: (item) => item.audience },
    { key: 'status', label: 'Status', value: (item) => item.status },
    { key: 'updated_at', label: 'Updated', value: (item) => item.updatedAt },
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await staffService.deleteAnnouncement(deleting.id);
      notify('Announcement deleted.');
      setDeleting(null);
      query.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Announcement>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.title}</p>
          <p className="truncate text-xs text-muted">{row.body}</p>
        </div>
      ),
    },
    {
      key: 'audience',
      header: 'Audience',
      render: (row) => (row.audience === 'All Staff' ? 'All staff' : `${row.staffIds.length} selected`),
    },
    { key: 'updated', header: 'Last updated', render: (row) => formatDate(row.updatedAt.slice(0, 10)) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} tone={STATUS_TONE[row.status]} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="icon" aria-label="View announcement" onClick={() => setViewing(row)}>
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label="Edit announcement" onClick={() => setEditing(row)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete announcement" onClick={() => setDeleting(row)}>
            <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Announcement' }]}
      title="Announcement"
      description="Write announcements for all staff or selected members. Publishing only marks the record; no message is delivered from here."
      actions={
        <>
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(`announcements-${todayIso()}.csv`, toCsv(csvColumns, rows))} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            New announcement
          </Button>
          <ImportDialog
            open={importing}
            onClose={() => setImporting(false)}
            spec={announcementImportSpec()}
            onImported={() => query.reload()}
          />
        </>
      }
    >
      <Card bodyClassName="p-4 sm:p-5">
        <SearchInput label="Search announcements" placeholder="Search title or message" value={search} onChange={setSearch} className="max-w-md" />
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
              minWidth="min-w-[760px]"
              empty={<div className="px-6 py-14 text-center text-sm text-muted">No announcements yet. Create one to get started.</div>}
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
        <AnnouncementFormDialog
          key={editing === 'new' ? 'new' : editing.id}
          staff={staff}
          announcement={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            query.reload();
          }}
        />
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? 'Announcement'} footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <div className="grid gap-3 text-sm">
            <StatusBadge status={viewing.status} tone={STATUS_TONE[viewing.status]} />
            <p className="whitespace-pre-line leading-relaxed text-ink">{viewing.body}</p>
            <p className="text-xs text-muted">
              Audience: {viewing.audience === 'All Staff' ? 'All staff' : `${viewing.staffIds.length} selected staff`}
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete announcement?"
        message={deleting ? `"${deleting.title}" will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </PageLayout>
  );
}
