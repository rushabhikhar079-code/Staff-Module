import {
  CalendarCheck,
  CalendarDays,
  Clock,
  CreditCard,
  Fingerprint,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface StaffRoute {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface StaffNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: StaffRoute[];
}

export const STAFF_HOME_ROUTE: StaffRoute = {
  path: '/staff',
  label: 'Staff Overview',
  icon: LayoutDashboard,
};

export const STAFF_NAV_GROUPS: StaffNavGroup[] = [
  {
    id: 'management',
    label: 'Staff Management',
    icon: Users,
    items: [{ path: '/staff/manage', label: 'Manage Staff', icon: Users }],
  },
  {
    id: 'attendance',
    label: 'Staff Attendance',
    icon: CalendarCheck,
    items: [
      { path: '/staff/attendance', label: 'Manage Staff Attendance', icon: CalendarCheck },
      { path: '/staff/biometric', label: 'Get Staff Biometric Attendance', icon: Fingerprint },
      { path: '/staff/in-out', label: 'Staff In/Out Attendance Time', icon: Clock },
    ],
  },
  {
    id: 'salary',
    label: 'Staff Salary & Payments',
    icon: Wallet,
    items: [
      { path: '/staff/payment-setup', label: 'Set Staff Payment', icon: Wallet },
      { path: '/staff/payments', label: 'Make Staff Payment', icon: CreditCard },
    ],
  },
  {
    id: 'loan',
    label: 'Staff Loan',
    icon: HandCoins,
    items: [{ path: '/staff/loans', label: 'Manage Staff Loan', icon: HandCoins }],
  },
  {
    id: 'leave',
    label: 'Leave Management',
    icon: CalendarDays,
    items: [{ path: '/staff/leaves', label: 'Leave Management', icon: CalendarDays }],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: Megaphone,
    items: [{ path: '/staff/announcements', label: 'Announcement', icon: Megaphone }],
  },
];

export const ALL_STAFF_ROUTES: StaffRoute[] = [
  STAFF_HOME_ROUTE,
  ...STAFF_NAV_GROUPS.flatMap((group) => group.items),
];

export function findStaffRoute(pathname: string): StaffRoute {
  return ALL_STAFF_ROUTES.find((route) => route.path === pathname) ?? STAFF_HOME_ROUTE;
}
