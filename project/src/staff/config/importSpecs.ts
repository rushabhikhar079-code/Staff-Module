import { ANNOUNCEMENT_AUDIENCES, ATTENDANCE_STATUSES, LEAVE_STATUSES, LEAVE_TYPES, LOAN_STATUSES, PAYMENT_METHODS } from '@/staff/config/options';
import type { ImportSpec } from '@/staff/components/ImportDialog';
import { staffService } from '@/staff/services/staffService';
import type { Announcement, AnnouncementAudience, LeaveRecord, LoanRecord, PaymentRecord, Staff } from '@/staff/types';
import { formatMoney, isPositiveAmount, parseAmount, todayIso } from '@/staff/utils/format';
import type { CsvRow } from '@/staff/utils/csv';

type Outcome<T> = { value: T } | { error: string };

function requireText(row: CsvRow, key: string, label: string): string | { error: string } {
  const value = (row[key] ?? '').trim();
  return value ? value : { error: `${label} is required.` };
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function optionalDate(row: CsvRow, key: string, label: string): string | { error: string } {
  const value = (row[key] ?? '').trim();
  if (!value) return '';
  return isIsoDate(value) ? value : { error: `${label} must use the format YYYY-MM-DD.` };
}

function matchOption(value: string, options: readonly string[]): string | undefined {
  return options.find((option) => option.toLowerCase() === value.trim().toLowerCase());
}

function splitList(value: string | undefined): string[] {
  return (value ?? '').split(';').map((item) => item.trim()).filter(Boolean);
}

function csvBoolean(value: string | undefined): boolean {
  return ['true', 'yes', '1'].includes((value ?? '').trim().toLowerCase());
}

function staffByCode(staff: Staff[], code: string): Staff | undefined {
  return staff.find((member) => member.staffCode.toLowerCase() === code.toLowerCase());
}

function staffCodeOutcome(staff: Staff[], row: CsvRow): Staff | { error: string } {
  const code = requireText(row, 'staff_code', 'Staff code');
  if (typeof code !== 'string') return code;
  const member = staffByCode(staff, code);
  return member ?? { error: `No staff member has the code "${code}".` };
}

function firstError(...results: Array<string | { error: string }>): { error: string } | null {
  for (const result of results) {
    if (typeof result !== 'string') return result;
  }
  return null;
}

function fail<T>(error: { error: string }): Outcome<T> {
  return { error: error.error };
}

interface StaffImportItem {
  existingId?: string;
  data: Omit<Staff, 'id'>;
}

export function staffImportSpec(staff: Staff[]): ImportSpec<StaffImportItem> {
  return {
    fileLabel: 'Staff',
    fields: [
      { key: 'staff_code', label: 'Staff code', required: true },
      { key: 'name', label: 'Name', required: true },
      { key: 'gender', label: 'Gender' },
      { key: 'date_of_birth', label: 'Date of birth' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'employment_type', label: 'Employment type' },
      { key: 'joining_date', label: 'Joining date' },
      { key: 'biometric_id', label: 'Biometric ID' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes' },
      { key: 'clear_date', label: 'Clear date' },
      { key: 'working_hours', label: 'Working hours' },
      { key: 'employee_number', label: 'Employee number' },
      { key: 'staff_type', label: 'Staff type' },
      { key: 'first_name', label: 'First name' },
      { key: 'middle_name', label: 'Middle name' },
      { key: 'last_name', label: 'Last name' },
      { key: 'correspondence_address', label: 'Correspondence address' },
      { key: 'country', label: 'Country' },
      { key: 'state', label: 'State' },
      { key: 'city', label: 'City' },
      { key: 'pin_code', label: 'Pin code' },
      { key: 'permanent_address', label: 'Permanent address' },
      { key: 'permanent_country', label: 'Permanent country' },
      { key: 'permanent_state', label: 'Permanent state' },
      { key: 'permanent_city', label: 'Permanent city' },
      { key: 'permanent_pin_code', label: 'Permanent pin code' },
      { key: 'phone', label: 'Phone' },
      { key: 'category', label: 'Category' },
      { key: 'years_experience', label: 'Years of experience' },
      { key: 'last_employer', label: 'Last employer' },
      { key: 'education', label: 'Education' },
      { key: 'home_branch', label: 'Home branch' },
      { key: 'subjects', label: 'Subjects (semicolon separated)' },
      { key: 'batches', label: 'Batch (semicolon separated)' },
      { key: 'role', label: 'Role' },
      { key: 'user_id', label: 'User ID' },
      { key: 'more_branches_access', label: 'More branches access' },
      { key: 'branch_access', label: 'Branch access (semicolon separated)' },
    ],
    describe: (item) => `${item.data.staffCode} · ${item.data.name} (${item.data.status})`,
    validate: (row) => {
      const code = requireText(row, 'staff_code', 'Staff code');
      const name = requireText(row, 'name', 'Name');
      const joined = optionalDate(row, 'joining_date', 'Joining date');
      const dob = optionalDate(row, 'date_of_birth', 'Date of birth');
      const failure = firstError(code, name, joined, dob);
      if (failure) return failure;
      const rawStatus = (row.status ?? '').trim();
      const status = rawStatus ? matchOption(rawStatus, ['Active', 'Inactive']) : 'Active';
      if (!status) return { error: 'Status must be Active or Inactive.' };
      const existing = staffByCode(staff, code as string);
      return {
        value: {
          existingId: existing?.id,
          data: {
            staffCode: code as string,
            name: name as string,
            gender: row.gender ?? '',
            dateOfBirth: dob as string,
            mobile: row.mobile ?? '',
            email: row.email ?? '',
            address: row.address ?? '',
            designation: row.designation ?? '',
            department: row.department ?? '',
            employmentType: row.employment_type ?? '',
            joiningDate: joined as string,
            biometricId: row.biometric_id ?? '',
            status: status as 'Active' | 'Inactive',
            notes: row.notes ?? '',
            clearDate: row.clear_date ?? '',
            workingHours: row.working_hours ?? '',
            employeeNumber: row.employee_number ?? '',
            manualEmployeeNumber: Boolean(row.employee_number),
            staffType: row.staff_type ?? '',
            firstName: row.first_name ?? '',
            middleName: row.middle_name ?? '',
            lastName: row.last_name ?? '',
            correspondenceAddress: row.correspondence_address ?? row.address ?? '',
            country: row.country ?? '',
            state: row.state ?? '',
            city: row.city ?? '',
            pinCode: row.pin_code ?? '',
            permanentAddress: row.permanent_address ?? '',
            permanentCountry: row.permanent_country ?? '',
            permanentState: row.permanent_state ?? '',
            permanentCity: row.permanent_city ?? '',
            permanentPinCode: row.permanent_pin_code ?? '',
            phone: row.phone ?? '',
            category: row.category ?? '',
            yearsExperience: row.years_experience ?? '',
            lastEmployer: row.last_employer ?? '',
            education: row.education ?? '',
            homeBranch: row.home_branch ?? '',
            subjects: splitList(row.subjects),
            batches: splitList(row.batches),
            role: row.role ?? '',
            userId: row.user_id ?? '',
            moreBranchesAccess: csvBoolean(row.more_branches_access),
            branchAccess: splitList(row.branch_access),
          },
        },
      };
    },
    save: async (items) => {
      const current = await staffService.listStaff();
      for (const item of items) {
        const existing = item.existingId
          ? current.find((member) => member.id === item.existingId)
          : current.find((member) => member.staffCode.toLowerCase() === item.data.staffCode.toLowerCase());
        if (existing) {
          const updated = { ...existing, ...item.data, id: existing.id };
          await staffService.updateStaff(updated);
          current.splice(current.indexOf(existing), 1, updated);
        } else {
          const created = await staffService.createStaff(item.data);
          current.push(created);
        }
      }
    },
  };
}

interface AttendanceImportItem {
  staffId: string;
  date: string;
  status: string;
  remarks: string;
}

export function attendanceImportSpec(staff: Staff[]): ImportSpec<AttendanceImportItem> {
  return {
    fileLabel: 'Attendance',
    fields: [
      { key: 'staff_code', label: 'Staff code', required: true },
      { key: 'date', label: 'Date', required: true },
      { key: 'status', label: 'Status', required: true },
      { key: 'remarks', label: 'Remarks' },
    ],
    describe: (item) => `${item.date} · ${item.status}`,
    validate: (row) => {
      const member = staffCodeOutcome(staff, row);
      if ('error' in member) return fail(member);
      const date = optionalDate(row, 'date', 'Date');
      if (typeof date !== 'string') return fail(date);
      if (!date) return { error: 'Date is required.' };
      const status = matchOption(row.status ?? '', ATTENDANCE_STATUSES);
      if (!status) return { error: `Status must be one of: ${ATTENDANCE_STATUSES.join(', ')}.` };
      return { value: { staffId: member.id, date, status, remarks: row.remarks ?? '' } };
    },
    save: async (items) => {
      for (const item of items) {
        await staffService.saveAttendance(item.staffId, item.date, item.status, item.remarks);
      }
    },
  };
}

interface InOutImportItem {
  staffId: string;
  date: string;
  inTime: string;
  outTime: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function inOutImportSpec(staff: Staff[]): ImportSpec<InOutImportItem> {
  return {
    fileLabel: 'In-Out Times',
    fields: [
      { key: 'staff_code', label: 'Staff code', required: true },
      { key: 'date', label: 'Date', required: true },
      { key: 'in_time', label: 'In time' },
      { key: 'out_time', label: 'Out time' },
    ],
    describe: (item) => `${item.date} · in ${item.inTime || '—'} · out ${item.outTime || '—'}`,
    validate: (row) => {
      const member = staffCodeOutcome(staff, row);
      if ('error' in member) return fail(member);
      const date = optionalDate(row, 'date', 'Date');
      if (typeof date !== 'string') return fail(date);
      if (!date) return { error: 'Date is required.' };
      const inTime = row.in_time ?? '';
      const outTime = row.out_time ?? '';
      if (!inTime && !outTime) return { error: 'Enter an in time, an out time, or both.' };
      if ((inTime && !TIME_PATTERN.test(inTime)) || (outTime && !TIME_PATTERN.test(outTime))) {
        return { error: 'Times must use the 24-hour format HH:MM.' };
      }
      return { value: { staffId: member.id, date, inTime, outTime } };
    },
    save: async (items) => {
      for (const item of items) {
        await staffService.saveInOut(item.staffId, item.date, item.inTime, item.outTime);
      }
    },
  };
}

export function paymentImportSpec(staff: Staff[]): ImportSpec<Omit<PaymentRecord, 'id'>> {
  return {
    fileLabel: 'Payments',
    fields: [
      { key: 'staff_code', label: 'Staff code', required: true },
      { key: 'payment_date', label: 'Payment date', required: true },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'method', label: 'Method', required: true },
      { key: 'reference', label: 'Reference' },
      { key: 'receipt_no', label: 'Receipt no' },
      { key: 'remarks', label: 'Remarks' },
    ],
    describe: (item) => `${item.paymentDate} · ${formatMoney(item.amount)} · ${item.method}`,
    validate: (row) => {
      const member = staffCodeOutcome(staff, row);
      if ('error' in member) return fail(member);
      const date = optionalDate(row, 'payment_date', 'Payment date');
      if (typeof date !== 'string') return fail(date);
      if (!date) return { error: 'Payment date is required.' };
      if (!isPositiveAmount(row.amount ?? '')) return { error: 'Amount must be a number greater than zero.' };
      const method = matchOption(row.method ?? '', PAYMENT_METHODS);
      if (!method) return { error: `Method must be one of: ${PAYMENT_METHODS.join(', ')}.` };
      return {
        value: {
          staffId: member.id,
          paymentDate: date,
          amount: parseAmount(row.amount ?? ''),
          method,
          reference: row.reference ?? '',
          receiptNo: row.receipt_no ?? '',
          remarks: row.remarks ?? '',
        },
      };
    },
    save: async (items) => {
      for (const item of items) {
        await staffService.createPayment(item);
      }
    },
  };
}

export function loanImportSpec(staff: Staff[]): ImportSpec<Omit<LoanRecord, 'id'>> {
  return {
    fileLabel: 'Loans',
    fields: [
      { key: 'staff_code', label: 'Staff code', required: true },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'issued_date', label: 'Issued date', required: true },
      { key: 'repaid_amount', label: 'Repaid amount' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'status', label: 'Status' },
    ],
    describe: (item) => `${item.issuedDate} · ${formatMoney(item.amount)} · ${item.status}`,
    validate: (row) => {
      const member = staffCodeOutcome(staff, row);
      if ('error' in member) return fail(member);
      if (!isPositiveAmount(row.amount ?? '')) return { error: 'Amount must be a number greater than zero.' };
      const issued = optionalDate(row, 'issued_date', 'Issued date');
      if (typeof issued !== 'string') return fail(issued);
      if (!issued) return { error: 'Issued date is required.' };
      const repaidRaw = (row.repaid_amount ?? '').trim();
      if (repaidRaw && !(Number.isFinite(parseAmount(repaidRaw)) && parseAmount(repaidRaw) >= 0)) {
        return { error: 'Repaid amount must be zero or more.' };
      }
      const status = row.status ? matchOption(row.status, LOAN_STATUSES) : 'Active';
      if (!status) return { error: `Status must be one of: ${LOAN_STATUSES.join(', ')}.` };
      return {
        value: {
          staffId: member.id,
          amount: parseAmount(row.amount ?? ''),
          issuedDate: issued,
          repaidAmount: repaidRaw ? parseAmount(repaidRaw) : 0,
          purpose: row.purpose ?? '',
          status: status as LoanRecord['status'],
        },
      };
    },
    save: async (items) => {
      for (const item of items) {
        await staffService.createLoan(item);
      }
    },
  };
}

export function leaveImportSpec(staff: Staff[]): ImportSpec<Omit<LeaveRecord, 'id'>> {
  return {
    fileLabel: 'Leaves',
    fields: [
      { key: 'staff_code', label: 'Staff code', required: true },
      { key: 'leave_type', label: 'Leave type', required: true },
      { key: 'from_date', label: 'From date', required: true },
      { key: 'to_date', label: 'To date', required: true },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
    ],
    describe: (item) => `${item.leaveType} · ${item.fromDate} to ${item.toDate} · ${item.status}`,
    validate: (row) => {
      const member = staffCodeOutcome(staff, row);
      if ('error' in member) return fail(member);
      const type = matchOption(row.leave_type ?? '', LEAVE_TYPES);
      if (!type) return { error: `Leave type must be one of: ${LEAVE_TYPES.join(', ')}.` };
      const from = optionalDate(row, 'from_date', 'From date');
      if (typeof from !== 'string') return fail(from);
      const to = optionalDate(row, 'to_date', 'To date');
      if (typeof to !== 'string') return fail(to);
      if (!from || !to) return { error: 'From date and to date are required.' };
      if (to < from) return { error: 'To date cannot be before from date.' };
      const status = row.status ? matchOption(row.status, LEAVE_STATUSES) : 'Pending';
      if (!status) return { error: `Status must be one of: ${LEAVE_STATUSES.join(', ')}.` };
      return {
        value: {
          staffId: member.id,
          leaveType: type as LeaveRecord['leaveType'],
          fromDate: from,
          toDate: to,
          reason: row.reason ?? '',
          status: status as LeaveRecord['status'],
        },
      };
    },
    save: async (items) => {
      for (const item of items) {
        await staffService.createLeave(item);
      }
    },
  };
}

export function announcementImportSpec(): ImportSpec<Omit<Announcement, 'id'>> {
  return {
    fileLabel: 'Announcements',
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'body', label: 'Message' },
      { key: 'audience', label: 'Audience', required: true },
      { key: 'status', label: 'Status' },
    ],
    describe: (item) => `${item.title} · ${item.audience} · ${item.status}`,
    validate: (row) => {
      const title = requireText(row, 'title', 'Title');
      if (typeof title !== 'string') return fail(title);
      const audience = matchOption(row.audience ?? '', ANNOUNCEMENT_AUDIENCES) as AnnouncementAudience | undefined;
      if (!audience) return { error: `Audience must be one of: ${ANNOUNCEMENT_AUDIENCES.join(', ')}.` };
      if (audience === 'Selected Staff') {
        return { error: 'Selected Staff announcements must be created in the app, where you choose the recipients.' };
      }
      const status = row.status ? matchOption(row.status, ['Draft', 'Published']) : 'Draft';
      if (!status) return { error: 'Status must be Draft or Published.' };
      return {
        value: {
          title,
          body: row.body ?? '',
          audience,
          staffIds: [],
          status: status as Announcement['status'],
          updatedAt: todayIso(),
        },
      };
    },
    save: async (items) => {
      for (const item of items) {
        await staffService.createAnnouncement(item);
      }
    },
  };
}
