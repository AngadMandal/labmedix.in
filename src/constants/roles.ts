import { Role, Permission } from '../types';

export interface RoleConfig {
  role: Role;
  name: string;
  badgeColor: string;
  description: string;
  permissions: Permission[];
}

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  super_admin: {
    role: 'super_admin',
    name: 'Super Admin',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    description: 'Full system control, database operations, user management, and company configuration.',
    permissions: ['all']
  },
  admin: {
    role: 'admin',
    name: 'Administrator',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    description: 'Full operational control over patients, cards, memberships, wallets, reports, EMR scheduling, and staff users.',
    permissions: [
      'patient_create', 'patient_read', 'patient_update', 'patient_delete', 'patient_print', 'patient_export',
      'card_create', 'card_read', 'card_update', 'card_print', 'card_export', 'card_status_change', 'card_renew', 'card_replace', 'card_delete', 'card_issue',
      'card_request_create', 'card_request_edit', 'card_request_submit', 'card_request_view', 'card_request_view_own', 'card_request_view_all', 'card_request_approve', 'card_request_reject', 'card_cancel', 'card_bill_print',
      'wallet_read', 'wallet_credit', 'wallet_debit', 'wallet_adjust',
      'membership_manage', 'family_manage', 'backup_manage', 'settings_manage', 'audit_view',
      'reports_view', 'catalog_manage', 'package_manage',
      'ngo_manage', 'ngo_view', 'camp_manage', 'grant_manage', 'users_manage',
      'doctor_view', 'doctor_manage', 'test_view',
      'bill_create', 'bill_view', 'bill_view_own', 'bill_view_all', 'bill_cancel', 'bill_print', 'bill_view_due', 'payment_collect',
      'card_transactions_view', 'card_transactions_view_own', 'card_transactions_view_all', 'transactions_manage'
    ]
  },
  doctor: {
    role: 'doctor',
    name: 'Licensed Physician / Doctor',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    description: 'Exclusive clinical authority to diagnose, prescribe medications, modify dosages, order investigations, and sign official medical prescriptions.',
    permissions: [
      'patient_read', 'patient_update', 'card_read', 'card_request_create', 'card_request_submit', 'card_request_view', 'card_request_view_own', 'card_bill_print', 'wallet_read',
      'emr_read', 'emr_create', 'emr_edit', 'emr_prescribe', 'doctor_view'
    ]
  },
  manager: {
    role: 'manager',
    name: 'Branch Manager',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    description: 'Oversees daily patient operations, branch revenue, approvals, and staff audit reports.',
    permissions: [
      'patient_create', 'patient_read', 'patient_update', 'patient_print', 'patient_export',
      'card_create', 'card_read', 'card_update', 'card_print', 'card_export', 'card_status_change', 'card_renew', 'card_replace', 'card_issue',
      'card_request_create', 'card_request_edit', 'card_request_submit', 'card_request_view', 'card_request_view_own', 'card_request_view_all', 'card_request_approve', 'card_request_reject', 'card_bill_print',
      'wallet_read', 'wallet_credit', 'wallet_debit',
      'membership_manage', 'family_manage', 'audit_view', 'reports_view', 'catalog_manage', 'package_manage',
      'doctor_view', 'test_view', 'bill_create', 'bill_view', 'bill_view_own', 'bill_view_all', 'bill_print', 'bill_view_due', 'payment_collect',
      'card_transactions_view', 'card_transactions_view_own', 'card_transactions_view_all'
    ]
  },
  reception: {
    role: 'reception',
    name: 'Front Desk Reception',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Fast-track walk-in registrations, quick searches, card requests, and wallet deposits.',
    permissions: [
      'patient_create', 'patient_read', 'patient_update', 'patient_print',
      'card_create', 'card_read', 'card_print', 'card_export',
      'card_request_create', 'card_request_submit', 'card_request_view', 'card_request_view_own', 'card_bill_print',
      'wallet_read', 'wallet_credit',
      'family_manage',
      'bill_create', 'bill_view', 'bill_view_own', 'bill_print', 'payment_collect',
      'card_transactions_view_own'
    ]
  },
  cashier: {
    role: 'cashier',
    name: 'Cashier / Billing Specialist',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    description: 'Manages OPD billing, cash desk POS deductions, wallet top-ups, cash desk vouchers, and daily revenue reconciliation.',
    permissions: [
      'patient_read', 'patient_print', 'card_read', 'card_request_view', 'card_request_view_own',
      'wallet_read', 'wallet_credit', 'wallet_debit', 'voucher_redeem', 'reports_view',
      'bill_create', 'bill_view', 'bill_view_own', 'bill_cancel', 'bill_print', 'bill_view_due', 'payment_collect',
      'card_transactions_view_own'
    ]
  },
  lab_staff: {
    role: 'lab_staff',
    name: 'Laboratory Technician',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    description: 'Verifies patient card membership for laboratory diagnostic testing discounts.',
    permissions: [
      'patient_read', 'card_read', 'wallet_read', 'wallet_debit', 'catalog_manage', 'test_view'
    ]
  },
  phlebotomist: {
    role: 'phlebotomist',
    name: 'Phlebotomist / Specimen Collector',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    description: 'Specialist in blood and clinical specimen collection, barcode labeling, sample accessioning, and test routing.',
    permissions: [
      'patient_read', 'card_read', 'catalog_manage', 'test_view'
    ]
  },
  marketing: {
    role: 'marketing',
    name: 'Marketing Executive',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    description: 'Promotes health packages, tracks campaign registrations, and views card metrics.',
    permissions: [
      'patient_read', 'card_read', 'card_request_view', 'card_request_view_own', 'reports_view'
    ]
  },
  card_operator: {
    role: 'card_operator',
    name: 'CR80 Card Operator',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800',
    description: 'Specialist in high-resolution PVC CR80 card generation, batch printing, and exports.',
    permissions: [
      'patient_read', 'card_create', 'card_read', 'card_print', 'card_export', 'card_renew', 'card_replace', 'card_issue',
      'card_request_view', 'card_request_view_own', 'card_bill_print'
    ]
  },
  read_only: {
    role: 'read_only',
    name: 'Auditor (Read Only)',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    description: 'View-only access for compliance, inspection, and verification without edit privileges.',
    permissions: [
      'patient_read', 'card_read', 'card_request_view', 'card_request_view_own', 'wallet_read', 'audit_view', 'reports_view',
      'bill_view_own', 'card_transactions_view_own'
    ]
  }
};

export const MODULE_KEYS = [
  'dashboard',
  'patients',
  'emr',
  'doctor_master',
  'test_master',
  'ngo_welfare',
  'cards',
  'card_studio',
  'print_sheet',
  'card_dispatch',
  'memberships',
  'families',
  'wallet',
  'cash_desk_vouchers',
  'reports',
  'users',
  'integrations',
  'activity',
  'backup',
  'settings',
  'website_cms',
  'system_monitoring'
] as const;

export type SystemModuleKey = typeof MODULE_KEYS[number];

export interface SystemModuleInfo {
  key: SystemModuleKey;
  name: string;
  href: string;
  category: 'clinical' | 'cards' | 'finance' | 'admin' | 'system';
  description: string;
  associatedPermissions: Permission[];
}

export const SYSTEM_MODULES: SystemModuleInfo[] = [
  {
    key: 'dashboard',
    name: 'Dashboard Overview',
    href: '/dashboard',
    category: 'admin',
    description: 'System KPI metrics, quick actions & registration chart.',
    associatedPermissions: ['all', 'patient_read']
  },
  {
    key: 'patients',
    name: 'Patients Management',
    href: '/patients',
    category: 'clinical',
    description: 'Patient directory, registration, search & medical profiles.',
    associatedPermissions: ['patient_read', 'patient_create', 'patient_update', 'patient_delete', 'patient_print', 'patient_export']
  },
  {
    key: 'emr',
    name: 'Doctor EMR & Rx',
    href: '/emr',
    category: 'clinical',
    description: 'Physician prescription pad, SOAP notes, appointments & queue.',
    associatedPermissions: ['emr_read', 'emr_create', 'emr_edit', 'emr_prescribe']
  },
  {
    key: 'doctor_master',
    name: 'Doctor Master & Commission',
    href: '/doctor-master',
    category: 'clinical',
    description: 'Physician master directory, auto credentials generator, consultation fees matrix, and blood commission ledger.',
    associatedPermissions: ['all', 'users_manage', 'doctor_manage', 'doctor_view', 'emr_read']
  },
  {
    key: 'test_master',
    name: 'Test Master & Packages',
    href: '/test-master',
    category: 'clinical',
    description: 'Master diagnostic tests directory, rates, bulk upload, and Auto Health Package bundling engine.',
    associatedPermissions: ['all', 'catalog_manage', 'package_manage', 'test_view', 'patient_read']
  },
  {
    key: 'ngo_welfare',
    name: 'NGO & CSR Welfare Hub',
    href: '/ngo-welfare',
    category: 'clinical',
    description: 'NGO & CSR partners, free medical & diagnostic camps, rural outreach, patient charity grants & 80G tax fund ledger.',
    associatedPermissions: ['all', 'ngo_manage', 'ngo_view', 'camp_manage', 'grant_manage']
  },
  {
    key: 'cards',
    name: 'Health Cards',
    href: '/cards',
    category: 'cards',
    description: 'Smart digital health cards directory, renewal & status control.',
    associatedPermissions: ['card_read', 'card_create', 'card_update', 'card_status_change', 'card_renew', 'card_replace', 'card_delete', 'card_issue', 'card_request_create', 'card_request_view', 'card_request_approve', 'card_request_reject']
  },
  {
    key: 'card_studio',
    name: 'CR80 PVC Studio',
    href: '/card-studio',
    category: 'cards',
    description: 'Dual-side live visual card canvas editor, themes & PNG export.',
    associatedPermissions: ['card_print', 'card_export']
  },
  {
    key: 'print_sheet',
    name: 'A4 Multi-Card Print',
    href: '/cards/print-sheet',
    category: 'cards',
    description: 'Batch 8-card grid layout for A4 PVC lamination printing.',
    associatedPermissions: ['card_print']
  },
  {
    key: 'card_dispatch',
    name: 'Card Printing & Dispatch Hub',
    href: '/cards/printing-dispatch',
    category: 'cards',
    description: 'Complete PVC card production queue, contactless chip QC, batch printing, courier manifest & live doorstep delivery tracking.',
    associatedPermissions: ['card_print', 'card_read', 'card_create']
  },
  {
    key: 'memberships',
    name: 'Membership Plans',
    href: '/memberships',
    category: 'clinical',
    description: 'Silver, Gold, Platinum, VIP tier benefits & discount matrix.',
    associatedPermissions: ['membership_manage']
  },
  {
    key: 'families',
    name: 'Family Shield Groups',
    href: '/families',
    category: 'clinical',
    description: 'Shared household health coverage & dependent linking.',
    associatedPermissions: ['family_manage']
  },
  {
    key: 'wallet',
    name: 'Health Wallet & Float',
    href: '/wallet',
    category: 'finance',
    description: 'Prepaid balance ledger, top-up receipts & cashless POS deductions.',
    associatedPermissions: ['wallet_read', 'wallet_credit', 'wallet_debit', 'wallet_adjust']
  },
  {
    key: 'reports',
    name: 'Reports & Analytics',
    href: '/reports',
    category: 'admin',
    description: 'Revenue breakdowns, card issuance analytics & PDF/Excel exports.',
    associatedPermissions: ['reports_view']
  },
  {
    key: 'users',
    name: 'Staff & User Management',
    href: '/users',
    category: 'system',
    description: 'Role-based access, granular user permissions & security PINs.',
    associatedPermissions: ['users_manage']
  },
  {
    key: 'integrations',
    name: 'Integrations Hub',
    href: '/integrations',
    category: 'system',
    description: '25+ official API gateways (Zoho, WhatsApp, ABDM, Firebase, LIS).',
    associatedPermissions: ['settings_manage']
  },
  {
    key: 'activity',
    name: 'Audit & Activity Logs',
    href: '/activity',
    category: 'system',
    description: 'Immutable chronological event ledger & compliance history.',
    associatedPermissions: ['audit_view']
  },
  {
    key: 'backup',
    name: 'Backup & Restore',
    href: '/backup',
    category: 'system',
    description: 'Encrypted JSON/SQL snapshots, Cloud backups & disaster recovery.',
    associatedPermissions: ['backup_manage']
  },
  {
    key: 'settings',
    name: 'Company Settings',
    href: '/settings',
    category: 'system',
    description: 'Hospital branding, logo, hotline numbers & card defaults.',
    associatedPermissions: ['settings_manage']
  },
  {
    key: 'website_cms',
    name: '3D Website & CMS Studio',
    href: '/website-cms',
    category: 'system',
    description: 'Super Admin Live 3D Website Customizer, Hero announcements, Card tiers pricing & Public CMS.',
    associatedPermissions: ['all', 'settings_manage']
  },
  {
    key: 'cash_desk_vouchers',
    name: 'Cash Desk Voucher Engine',
    href: '/cash-desk-vouchers',
    category: 'finance',
    description: 'Super Admin High-Security Cryptographic PIN Voucher Generator, Batch Issuer & Cash Desk POS Redemption.',
    associatedPermissions: ['all', 'voucher_manage']
  },
  {
    key: 'system_monitoring',
    name: 'System Monitoring & Telemetry',
    href: '/system-monitoring',
    category: 'system',
    description: 'Super Admin Real-Time Performance Telemetry, API Latency Metrics, Memory Footprint & Audit Distribution Charts.',
    associatedPermissions: ['all', 'audit_view']
  }
];

export const ROLE_DEFAULT_MODULES: Record<Role, SystemModuleKey[]> = {
  super_admin: [
    'dashboard', 'patients', 'doctor_master', 'test_master', 'ngo_welfare', 'cards', 'card_studio', 'print_sheet', 'card_dispatch',
    'memberships', 'families', 'wallet', 'reports', 'users', 'website_cms', 'integrations',
    'activity', 'backup', 'settings', 'cash_desk_vouchers', 'system_monitoring'
  ],
  admin: [
    'dashboard', 'patients', 'doctor_master', 'test_master', 'ngo_welfare', 'cards', 'card_studio', 'print_sheet', 'card_dispatch',
    'memberships', 'families', 'wallet', 'reports', 'users', 'integrations',
    'activity', 'backup', 'settings'
  ],
  doctor: ['emr', 'dashboard', 'patients', 'ngo_welfare', 'cards', 'wallet'],
  reception: ['dashboard', 'patients', 'ngo_welfare', 'cards', 'card_studio', 'print_sheet', 'card_dispatch', 'wallet', 'families'],
  cashier: ['dashboard', 'patients', 'wallet', 'cash_desk_vouchers', 'cards', 'reports'],
  manager: ['dashboard', 'patients', 'ngo_welfare', 'cards', 'card_studio', 'print_sheet', 'card_dispatch', 'memberships', 'families', 'wallet', 'reports', 'activity'],
  lab_staff: ['dashboard', 'patients', 'cards', 'wallet', 'test_master', 'ngo_welfare'],
  phlebotomist: ['dashboard', 'patients', 'cards', 'test_master'],
  marketing: ['dashboard', 'patients', 'ngo_welfare', 'cards', 'card_dispatch'],
  card_operator: ['dashboard', 'patients', 'cards', 'card_studio', 'print_sheet', 'card_dispatch', 'ngo_welfare'],
  read_only: ['dashboard', 'patients', 'ngo_welfare', 'cards', 'card_dispatch', 'wallet', 'activity']
};

export function hasPermission(userRole: Role, permission: Permission): boolean {
  if (userRole === 'super_admin') return true;
  const config = ROLE_CONFIGS[userRole];
  if (!config) return false;
  if (config.permissions.includes('all')) return true;
  if (config.permissions.includes(permission)) return true;

  // Granular compatibility aliases
  if (permission === 'card_request_view' && (config.permissions.includes('card_request_view_own') || config.permissions.includes('card_request_view_all'))) return true;
  if (permission === 'card_request_view_own' && (config.permissions.includes('card_request_view') || config.permissions.includes('card_request_view_all') || config.permissions.includes('card_request_create'))) return true;
  if (permission === 'card_request_submit' && config.permissions.includes('card_request_create')) return true;
  if (permission === 'card_bill_print' && (config.permissions.includes('bill_print') || config.permissions.includes('bill_view') || config.permissions.includes('card_request_create'))) return true;
  if (permission === 'bill_print' && (config.permissions.includes('card_bill_print') || config.permissions.includes('bill_view'))) return true;
  if (permission === 'bill_view' && (config.permissions.includes('bill_view_own') || config.permissions.includes('bill_view_all'))) return true;
  if (permission === 'bill_view_own' && (config.permissions.includes('bill_view') || config.permissions.includes('bill_view_all') || config.permissions.includes('bill_create'))) return true;
  if (permission === 'card_transactions_view_own' && (config.permissions.includes('card_transactions_view') || config.permissions.includes('card_transactions_view_all') || config.permissions.includes('card_request_create'))) return true;

  return false;
}

export function checkUserPermission(user: { role: Role; customPermissions?: Permission[]; allowedModules?: string[] } | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.customPermissions && user.customPermissions.length > 0) {
    if (user.customPermissions.includes('all')) return true;
    return user.customPermissions.includes(permission);
  }
  return hasPermission(user.role, permission);
}

export function checkUserModuleAccess(user: { role: Role; allowedModules?: string[]; customPermissions?: Permission[] } | null | undefined, moduleKey: SystemModuleKey): boolean {
  if (!user) return false;
  // Dashboard is always accessible to any authenticated staff
  if (moduleKey === 'dashboard') return true;
  // Super Admin has unrestricted access to all modules
  if (user.role === 'super_admin') return true;

  // If Super Admin has explicitly set allowedModules for this user, that list is authoritative
  if (user.allowedModules && user.allowedModules.length > 0) {
    return user.allowedModules.includes(moduleKey);
  }

  // Doctor EMR — restricted to doctor/admin roles OR explicit allowedModules grant above
  if (moduleKey === 'emr') {
    return user.role === 'doctor' || user.role === 'admin';
  }

  // Fall back to role-default module list
  const defaults = ROLE_DEFAULT_MODULES[user.role] || ['dashboard'];
  return defaults.includes(moduleKey);
}