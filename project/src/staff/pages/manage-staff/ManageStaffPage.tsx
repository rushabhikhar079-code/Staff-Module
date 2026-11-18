import { useMemo, useState } from 'react';
import { Download, Eye, Pencil, Plus, Power, PowerOff, Upload } from 'lucide-react';
import { DataTable, type Column } from '@/staff/components/DataTable';
import { ConfirmDialog } from '@/staff/components/Modal';
import { ImportDialog } from '@/staff/components/ImportDialog';
import { PageLayout } from '@/staff/components/PageLayout';
import { useToast } from '@/staff/components/Toast';
import { Button, Card, ErrorState, LoadingState, Pagination, Select, SearchInput, StaffIdentity, StatusBadge } from '@/staff/components/ui';
import { STAFF_DEPARTMENTS } from '@/staff/config/options';
import { staffImportSpec } from '@/staff/config/importSpecs';
import { useAsync } from '@/staff/hooks/useAsync';
import { usePagination } from '@/staff/hooks/usePagination';
import { staffService } from '@/staff/services/staffService';
import type { Staff } from '@/staff/types';
import { downloadCsv, toCsv, type CsvColumn } from '@/staff/utils/csv';
import { errorMessage, formatDate, todayIso } from '@/staff/utils/format';
import { StaffDetailDialog } from '@/staff/pages/manage-staff/StaffDetailDialog';
import { StaffFormDialog } from '@/staff/pages/manage-staff/StaffFormDialog';

type SortOption = 'name-asc' | 'name-desc' | 'joined-desc';

const STAFF_CSV_COLUMNS: CsvColumn<Staff>[] = [
  { key: 'staff_code', label: 'Staff code', value: (m) => m.staffCode },
  { key: 'name', label: 'Name', value: (m) => m.name },
  { key: 'gender', label: 'Gender', value: (m) => m.gender },
  { key: 'date_of_birth', label: 'Date of birth', value: (m) => m.dateOfBirth },
  { key: 'mobile', label: 'Mobile', value: (m) => m.mobile },
  { key: 'email', label: 'Email', value: (m) => m.email },
  { key: 'address', label: 'Address', value: (m) => m.address },
  { key: 'designation', label: 'Designation', value: (m) => m.designation },
  { key: 'department', label: 'Department', value: (m) => m.department },
  { key: 'employment_type', label: 'Employment type', value: (m) => m.employmentType },
  { key: 'joining_date', label: 'Joining date', value: (m) => m.joiningDate },
  { key: 'biometric_id', label: 'Biometric ID', value: (m) => m.biometricId },
  { key: 'status', label: 'Status', value: (m) => m.status },
  { key: 'notes', label: 'Notes', value: (m) => m.notes },
  { key: 'clear_date', label: 'Clear date', value: (m) => m.clearDate ?? '' },
  { key: 'working_hours', label: 'Working hours', value: (m) => m.workingHours ?? '' },
  { key: 'employee_number', label: 'Employee number', value: (m) => m.employeeNumber ?? '' },
  { key: 'staff_type', label: 'Staff type', value: (m) => m.staffType ?? '' },
  { key: 'first_name', label: 'First name', value: (m) => m.firstName ?? '' },
  { key: 'middle_name', label: 'Middle name', value: (m) => m.middleName ?? '' },
  { key: 'last_name', label: 'Last name', value: (m) => m.lastName ?? '' },
  { key: 'correspondence_address', label: 'Correspondence address', value: (m) => m.correspondenceAddress ?? '' },
  { key: 'country', label: 'Country', value: (m) => m.country ?? '' },
  { key: 'state', label: 'State', value: (m) => m.state ?? '' },
  { key: 'city', label: 'City', value: (m) => m.city ?? '' },
  { key: 'pin_code', label: 'Pin code', value: (m) => m.pinCode ?? '' },
  { key: 'permanent_address', label: 'Permanent address', value: (m) => m.permanentAddress ?? '' },
  { key: 'permanent_country', label: 'Permanent country', value: (m) => m.permanentCountry ?? '' },
  { key: 'permanent_state', label: 'Permanent state', value: (m) => m.permanentState ?? '' },
  { key: 'permanent_city', label: 'Permanent city', value: (m) => m.permanentCity ?? '' },
  { key: 'permanent_pin_code', label: 'Permanent pin code', value: (m) => m.permanentPinCode ?? '' },
  { key: 'phone', label: 'Phone', value: (m) => m.phone ?? '' },
  { key: 'category', label: 'Category', value: (m) => m.category ?? '' },
  { key: 'years_experience', label: 'Years of experience', value: (m) => m.yearsExperience ?? '' },
  { key: 'last_employer', label: 'Last employer', value: (m) => m.lastEmployer ?? '' },
  { key: 'education', label: 'Education', value: (m) => m.education ?? '' },
  { key: 'home_branch', label: 'Home branch', value: (m) => m.homeBranch ?? '' },
  { key: 'subjects', label: 'Subjects', value: (m) => (m.subjects ?? []).join('; ') },
  { key: 'batches', label: 'Batch', value: (m) => (m.batches ?? []).join('; ') },
  { key: 'role', label: 'Role', value: (m) => m.role ?? '' },
  { key: 'user_id', label: 'User ID', value: (m) => m.userId ?? '' },
  { key: 'more_branches_access', label: 'More branches access', value: (m) => (m.moreBranchesAccess ? 'Yes' : 'No') },
  { key: 'branch_access', label: 'Branch access', value: (m) => (m.branchAccess ?? []).join('; ') },
];

export function ManageStaffPage() {
  const { notify } = useToast();
  const list = useAsync(() => staffService.listStaff(), []);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [viewing, setViewing] = useState<Staff | null>(null);
  const [formTarget, setFormTarget] = useState<Staff | 'new' | null>(null);
  const [toggling, setToggling] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  const staff = useMemo(() => list.data ?? [], [list.data]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = staff.filter(
      (member) =>
        (!query || [member.name, member.staffCode, member.mobile].some((value) => value.toLowerCase().includes(query))) &&
        (!department || member.department === department) &&
        (!status || member.status === status),
    );
    return matched.sort((a, b) => {
      if (sortBy === 'joined-desc') return b.joiningDate.localeCompare(a.joiningDate);
      const comparison = a.name.localeCompare(b.name);
      return sortBy === 'name-asc' ? comparison : -comparison;
    });
  }, [staff, search, department, status, sortBy]);

  const pager = usePagination(rows);

  const columns: Column<Staff>[] = [
    { key: 'staff', header: 'Staff', render: (member) => <StaffIdentity staff={member} /> },
    {
      key: 'designation',
      header: 'Designation',
      render: (member) => (
        <div>
          <p>{member.designation}</p>
          <p className="text-xs text-muted">{member.department}</p>
        </div>
      ),
    },
    { key: 'mobile', header: 'Mobile', render: (member) => member.mobile },
    { key: 'joined', header: 'Joined', render: (member) => formatDate(member.joiningDate) },
    { key: 'status', header: 'Status', render: (member) => <StatusBadge status={member.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (member) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="icon" aria-label={`View ${member.name}`} onClick={() => setViewing(member)}>
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label={`Edit ${member.name}`} onClick={() => setFormTarget(member)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={member.status === 'Active' ? `Deactivate ${member.name}` : `Activate ${member.name}`}
            onClick={() => setToggling(member)}
          >
            {member.status === 'Active' ? <PowerOff className="h-4 w-4 text-danger-600" aria-hidden /> : <Power className="h-4 w-4 text-success-600" aria-hidden />}
          </Button>
        </div>
      ),
    },
  ];

  const confirmToggle = async () => {
    if (!toggling) return;
    const nextStatus = toggling.status === 'Active' ? 'Inactive' : 'Active';
    setBusy(true);
    try {
      await staffService.updateStaff({ ...toggling, status: nextStatus });
      notify(nextStatus === 'Active' ? 'Staff member activated.' : 'Staff member deactivated.');
      setToggling(null);
      list.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDepartment('');
    setStatus('');
    setSortBy('name-asc');
  };

  return (
    <PageLayout
      crumbs={[{ label: 'Staff', href: '#/staff' }, { label: 'Manage Staff' }]}
      title="Manage Staff"
      description="Find staff members, review their profiles and keep records up to date."
      actions={
        <>
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(`staff-${todayIso()}.csv`, toCsv(STAFF_CSV_COLUMNS, rows))} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
          <Button onClick={() => setFormTarget('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Staff
          </Button>
        </>
      }
    >
      <Card bodyClassName="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <SearchInput
            label="Search staff"
            placeholder="Search by name, staff code or mobile"
            value={search}
            onChange={setSearch}
          />
          <Select aria-label="Filter by department" value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="">All departments</option>
            {STAFF_DEPARTMENTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
          <Select aria-label="Sort staff" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="joined-desc">Recently joined</option>
          </Select>
          <Button variant="outline" onClick={resetFilters} className="w-full xl:w-auto">
            Reset
          </Button>
        </div>
      </Card>

      <Card bodyClassName="p-0">
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={pager.pageItems}
              rowKey={(member) => member.id}
              empty={
                <div className="px-6 py-14 text-center text-sm text-muted">
                  {staff.length === 0 ? 'No staff records yet. Add the first staff member to get started.' : 'No staff match these filters.'}
                </div>
              }
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

      {viewing && (
        <StaffDetailDialog
          staff={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setFormTarget(viewing);
            setViewing(null);
          }}
        />
      )}

      {formTarget && (
        <StaffFormDialog
          key={formTarget === 'new' ? 'new' : formTarget.id}
          staff={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            list.reload();
          }}
        />
      )}

      <ImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        spec={staffImportSpec(staff)}
        onImported={() => list.reload()}
      />

      <ConfirmDialog
        open={!!toggling}
        title={toggling?.status === 'Active' ? 'Deactivate staff member?' : 'Activate staff member?'}
        message={
          toggling?.status === 'Active'
            ? `${toggling.name} will be marked Inactive. Their records are kept.`
            : `${toggling?.name ?? ''} will be marked Active again.`
        }
        confirmLabel={toggling?.status === 'Active' ? 'Deactivate' : 'Activate'}
        tone={toggling?.status === 'Active' ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={confirmToggle}
        onCancel={() => setToggling(null)}
      />
    </PageLayout>
  );
}
