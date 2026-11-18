import type { AnnouncementAudience } from '@/staff/types';

// Preview option lists. Confirm each value against the legacy Institute Magica
// dropdown data before connecting to the live backend.
export const GENDERS = ['Male', 'Female', 'Other'];
export const STAFF_DEPARTMENTS = ['Academics', 'Administration', 'Accounts', 'Support Services'];
export const STAFF_DESIGNATIONS = ['Faculty', 'Coordinator', 'Accountant', 'Receptionist', 'Office Assistant'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave'];
export const PAYMENT_FREQUENCIES = ['Monthly', 'Quarterly', 'One Time'];
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Cheque', 'Bank Transfer'];
export const LOAN_STATUSES = ['Active', 'Closed'];
export const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid'];
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];
export const ANNOUNCEMENT_AUDIENCES: AnnouncementAudience[] = ['All Staff', 'Selected Staff'];
