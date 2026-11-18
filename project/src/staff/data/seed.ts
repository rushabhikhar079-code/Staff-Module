import type {
  AttendanceRecord,
  Announcement,
  InOutRecord,
  LeaveRecord,
  LoanRecord,
  PaymentConfig,
  PaymentRecord,
  PunchRecord,
  Staff,
  StaffDb,
} from '@/staff/types';
import { shiftIso, todayIso } from '@/staff/utils/format';

const ATTENDANCE_CYCLE = ['Present', 'Present', 'Late', 'Absent', 'Half Day', 'Present'];

export function buildSeed(): StaffDb {
  const today = todayIso();
  const now = new Date().toISOString();

  const staff: Staff[] = [
    { id: 'stf-001', staffCode: 'STF-1001', name: 'Priya Nair', gender: 'Female', dateOfBirth: '1989-04-12', mobile: '9810012345', email: 'priya.nair@institute.example', address: '14 Lake View Road, Pune', designation: 'Faculty', department: 'Academics', employmentType: 'Full-time', joiningDate: '2021-06-01', biometricId: '101', status: 'Active', notes: 'Physics and mathematics faculty' },
    { id: 'stf-002', staffCode: 'STF-1002', name: 'Rahul Mehta', gender: 'Male', dateOfBirth: '1985-09-30', mobile: '9822011223', email: 'rahul.mehta@institute.example', address: '7 Station Road, Pune', designation: 'Coordinator', department: 'Administration', employmentType: 'Full-time', joiningDate: '2019-02-15', biometricId: '102', status: 'Active', notes: '' },
    { id: 'stf-003', staffCode: 'STF-1003', name: 'Sneha Iyer', gender: 'Female', dateOfBirth: '1993-01-08', mobile: '9765104455', email: 'sneha.iyer@institute.example', address: '32 Park Street, Pune', designation: 'Accountant', department: 'Accounts', employmentType: 'Full-time', joiningDate: '2022-08-10', biometricId: '103', status: 'Active', notes: '' },
    { id: 'stf-004', staffCode: 'STF-1004', name: 'Vikram Joshi', gender: 'Male', dateOfBirth: '1991-11-21', mobile: '9890566778', email: 'vikram.joshi@institute.example', address: '88 Hill View, Pune', designation: 'Faculty', department: 'Academics', employmentType: 'Part-time', joiningDate: '2023-01-04', biometricId: '104', status: 'Active', notes: 'Chemistry lab in-charge' },
    { id: 'stf-005', staffCode: 'STF-1005', name: 'Meera Kulkarni', gender: 'Female', dateOfBirth: '1997-07-02', mobile: '9011223344', email: 'meera.k@institute.example', address: '5 Garden Colony, Pune', designation: 'Receptionist', department: 'Support Services', employmentType: 'Contract', joiningDate: '2024-03-18', biometricId: '105', status: 'Active', notes: '' },
    { id: 'stf-006', staffCode: 'STF-1006', name: 'Arjun Desai', gender: 'Male', dateOfBirth: '1988-05-17', mobile: '9703345566', email: 'arjun.desai@institute.example', address: '21 River Lane, Pune', designation: 'Office Assistant', department: 'Support Services', employmentType: 'Full-time', joiningDate: '2020-10-01', biometricId: '106', status: 'Inactive', notes: 'On extended leave until review' },
  ];

  const attendance: AttendanceRecord[] = [];
  staff.forEach((member, index) => {
    for (let offset = 0; offset < 4; offset += 1) {
      if (index === 4 && offset === 0) continue;
      const date = shiftIso(today, -offset);
      const status = ATTENDANCE_CYCLE[(index + offset) % ATTENDANCE_CYCLE.length];
      attendance.push({ id: `att-${member.id}-${offset}`, staffId: member.id, date, status, remarks: status === 'Late' ? 'Arrived after 10:00' : '' });
    }
  });

  const inOut: InOutRecord[] = [];
  staff.slice(0, 4).forEach((member, index) => {
    for (let offset = 0; offset < 3; offset += 1) {
      inOut.push({
        id: `io-${member.id}-${offset}`,
        staffId: member.id,
        date: shiftIso(today, -offset),
        inTime: `09:${String(5 + index * 4).padStart(2, '0')}`,
        outTime: `17:${String(15 + index * 5).padStart(2, '0')}`,
      });
    }
  });

  const punches: PunchRecord[] = [];
  staff.forEach((member, index) => {
    for (let offset = 0; offset < 3; offset += 1) {
      punches.push({
        id: `pun-${member.id}-${offset}`,
        staffId: member.id,
        date: shiftIso(today, -offset),
        punchIn: `09:${String(3 + index * 3).padStart(2, '0')}`,
        punchOut: `17:${String(20 + index * 2).padStart(2, '0')}`,
        deviceName: index % 2 === 0 ? 'Main Gate Terminal' : 'Admin Block Terminal',
      });
    }
  });

  const paymentConfigs: PaymentConfig[] = staff.slice(0, 5).map((member, index) => ({
    id: `cfg-${member.id}`,
    staffId: member.id,
    frequency: 'Monthly',
    baseSalary: 45000 + index * 5000,
    effectiveFrom: '2026-04-01',
    remarks: '',
  }));

  const payments: PaymentRecord[] = [
    { id: 'pay-001', staffId: 'stf-001', paymentDate: shiftIso(today, -3), amount: 45000, method: 'Bank Transfer', reference: 'NEFT-884312', receiptNo: 'SR-2026-001', remarks: 'October salary' },
    { id: 'pay-002', staffId: 'stf-002', paymentDate: shiftIso(today, -2), amount: 50000, method: 'UPI', reference: 'UPI-202611', receiptNo: 'SR-2026-002', remarks: '' },
    { id: 'pay-003', staffId: 'stf-003', paymentDate: shiftIso(today, -1), amount: 20000, method: 'Cheque', reference: 'CHQ-004471', receiptNo: 'SR-2026-003', remarks: 'Advance against salary' },
  ];

  const loans: LoanRecord[] = [
    { id: 'loan-001', staffId: 'stf-004', amount: 30000, issuedDate: '2026-08-10', repaidAmount: 10000, purpose: 'Medical expenses', status: 'Active' },
    { id: 'loan-002', staffId: 'stf-005', amount: 12000, issuedDate: '2026-05-02', repaidAmount: 12000, purpose: 'Household emergency', status: 'Closed' },
  ];

  const leaves: LeaveRecord[] = [
    { id: 'lv-001', staffId: 'stf-001', leaveType: 'Casual', fromDate: shiftIso(today, 3), toDate: shiftIso(today, 4), reason: 'Family function', status: 'Pending' },
    { id: 'lv-002', staffId: 'stf-003', leaveType: 'Sick', fromDate: shiftIso(today, -6), toDate: shiftIso(today, -5), reason: 'Fever', status: 'Approved' },
    { id: 'lv-003', staffId: 'stf-004', leaveType: 'Earned', fromDate: shiftIso(today, 10), toDate: shiftIso(today, 12), reason: 'Personal travel', status: 'Pending' },
    { id: 'lv-004', staffId: 'stf-002', leaveType: 'Unpaid', fromDate: shiftIso(today, -12), toDate: shiftIso(today, -12), reason: 'Personal work', status: 'Rejected' },
  ];

  const announcements: Announcement[] = [
    { id: 'ann-001', title: 'Staff meeting on Friday', body: 'All faculty are requested to attend the monthly review meeting in the seminar hall at 3:00 PM.', audience: 'All Staff', staffIds: [], status: 'Published', updatedAt: now },
    { id: 'ann-002', title: 'Attendance register update', body: 'Please ensure your in and out times are verified at the front desk before month end.', audience: 'Selected Staff', staffIds: ['stf-004', 'stf-005'], status: 'Draft', updatedAt: now },
  ];

  return { staff, attendance, inOut, punches, paymentConfigs, payments, loans, leaves, announcements };
}
