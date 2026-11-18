export interface Staff {
  id: string;
  staffCode: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  address: string;
  designation: string;
  department: string;
  employmentType: string;
  joiningDate: string;
  biometricId: string;
  status: 'Active' | 'Inactive';
  notes: string;
  clearDate?: string;
  usedLastEmployeeNumbers?: string;
  workingHours?: string;
  employeeNumber?: string;
  manualEmployeeNumber?: boolean;
  staffType?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  correspondenceAddress?: string;
  country?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  sameAsAbove?: boolean;
  permanentAddress?: string;
  permanentCountry?: string;
  permanentState?: string;
  permanentCity?: string;
  permanentPinCode?: string;
  phone?: string;
  category?: string;
  photoUrl?: string;
  yearsExperience?: string;
  lastEmployer?: string;
  education?: string;
  homeBranch?: string;
  subjects?: string[];
  batches?: string[];
  createLogin?: boolean;
  role?: string;
  userId?: string;
  moreBranchesAccess?: boolean;
  branchAccess?: string[];
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  status: string;
  remarks: string;
}

export interface InOutRecord {
  id: string;
  staffId: string;
  date: string;
  inTime: string;
  outTime: string;
}

export interface PunchRecord {
  id: string;
  staffId: string;
  date: string;
  punchIn: string;
  punchOut: string;
  deviceName: string;
}

export interface PaymentConfig {
  id: string;
  staffId: string;
  frequency: string;
  baseSalary: number;
  effectiveFrom: string;
  remarks: string;
}

export interface PaymentRecord {
  id: string;
  staffId: string;
  paymentDate: string;
  amount: number;
  method: string;
  reference: string;
  receiptNo: string;
  remarks: string;
}

export interface LoanRecord {
  id: string;
  staffId: string;
  amount: number;
  issuedDate: string;
  repaidAmount: number;
  purpose: string;
  status: string;
}

export interface LeaveRecord {
  id: string;
  staffId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
}

export type AnnouncementAudience = 'All Staff' | 'Selected Staff';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  staffIds: string[];
  status: 'Draft' | 'Published';
  updatedAt: string;
}

export interface StaffDb {
  staff: Staff[];
  attendance: AttendanceRecord[];
  inOut: InOutRecord[];
  punches: PunchRecord[];
  paymentConfigs: PaymentConfig[];
  payments: PaymentRecord[];
  loans: LoanRecord[];
  leaves: LeaveRecord[];
  announcements: Announcement[];
}
