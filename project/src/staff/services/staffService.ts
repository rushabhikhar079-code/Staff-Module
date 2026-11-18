import { repo } from '@/staff/data/repository';
import type {
  Announcement,
  AttendanceRecord,
  InOutRecord,
  LeaveRecord,
  LoanRecord,
  PaymentConfig,
  PaymentRecord,
  PunchRecord,
  Staff,
} from '@/staff/types';

// Single entry point for every Staff screen. When the live API is ready, replace the
// bodies here with fetch calls; the pages keep the same signatures.
export const staffService = {
  listStaff: () => repo.list('staff'),
  createStaff: (data: Omit<Staff, 'id'>) => repo.insert('staff', data),
  updateStaff: (staff: Staff) => repo.update('staff', staff),

  async getOverview() {
    const [staff, leaves, loans, announcements] = await Promise.all([
      repo.list('staff'),
      repo.list('leaves'),
      repo.list('loans'),
      repo.list('announcements'),
    ]);
    return {
      activeStaff: staff.filter((member) => member.status === 'Active').length,
      pendingLeaves: leaves.filter((leave) => leave.status === 'Pending').length,
      activeLoans: loans.filter((loan) => loan.status === 'Active').length,
      draftAnnouncements: announcements.filter((item) => item.status === 'Draft').length,
    };
  },

  async listAttendance(date: string): Promise<AttendanceRecord[]> {
    const rows = await repo.list('attendance');
    return rows.filter((row) => row.date === date);
  },
  saveAttendance: (staffId: string, date: string, status: string, remarks: string) =>
    repo.upsert('attendance', (row) => row.staffId === staffId && row.date === date, { staffId, date, status, remarks }),

  async listInOut(date: string): Promise<InOutRecord[]> {
    const rows = await repo.list('inOut');
    return rows.filter((row) => row.date === date);
  },
  saveInOut: (staffId: string, date: string, inTime: string, outTime: string) =>
    repo.upsert('inOut', (row) => row.staffId === staffId && row.date === date, { staffId, date, inTime, outTime }),

  async listPunches(fromDate: string, toDate: string): Promise<PunchRecord[]> {
    const rows = await repo.list('punches');
    return rows.filter((row) => row.date >= fromDate && row.date <= toDate);
  },

  listPaymentConfigs: () => repo.list('paymentConfigs'),
  savePaymentConfig: (staffId: string, data: Omit<PaymentConfig, 'id' | 'staffId'>) =>
    repo.upsert('paymentConfigs', (row) => row.staffId === staffId, { ...data, staffId }),

  listPayments: () => repo.list('payments'),
  createPayment: (data: Omit<PaymentRecord, 'id'>) => repo.insert('payments', data),
  updatePayment: (payment: PaymentRecord) => repo.update('payments', payment),
  deletePayment: (id: string) => repo.remove('payments', id),

  listLoans: () => repo.list('loans'),
  createLoan: (data: Omit<LoanRecord, 'id'>) => repo.insert('loans', data),
  updateLoan: (loan: LoanRecord) => repo.update('loans', loan),
  deleteLoan: (id: string) => repo.remove('loans', id),

  listLeaves: () => repo.list('leaves'),
  createLeave: (data: Omit<LeaveRecord, 'id'>) => repo.insert('leaves', data),
  updateLeave: (leave: LeaveRecord) => repo.update('leaves', leave),
  deleteLeave: (id: string) => repo.remove('leaves', id),

  resetPreviewData: () => repo.reset(),

  listAnnouncements: () => repo.list('announcements'),
  createAnnouncement: (data: Omit<Announcement, 'id'>) => repo.insert('announcements', data),
  updateAnnouncement: (announcement: Announcement) => repo.update('announcements', announcement),
  deleteAnnouncement: (id: string) => repo.remove('announcements', id),
};
