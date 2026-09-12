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
      'patient_create', 'patient_read', 'patient_update', 'patient_delete', 'patient_print', 'patient_export', 'patient_search', 'patient_slip_print', 'clinical_view',
      'card_create', 'card_read', 'card_update', 'card_print', 'card_export', 'card_status_change', 'card_renew', 'card_replace', 'card_delete', 'card_issue',
      'card_request_create', 'card_request_edit', 'card_request_submit', 'card_request_view', 'card_request_view_own', 'card_request_view_all', 'card_request_approve', 'card_request_reject', 'card_request_return', 'card_cancel', 'card_bill_print', 'card_enrollment_open', 'card_plan_configure', 'card_pricing_configure', 'card_benefit_configure',
      'wallet_read', 'wallet_credit', 'wallet_debit', 'wallet_adjust',
      'membership_manage', 'family_manage', 'family_member_add', 'family_view', 'family_limit_configure', 'backup_manage', 'settings_manage', 'audit_view', 'audit_export',
      'reports_view', 'catalog_manage', 'package_manage',
      'ngo_manage', 'ngo_view', 'camp_manage', 'grant_manage', 'users_manage', 'staff_create', 'user_create', 'role_assign', 'permission_assign', 'user_status_toggle', 'staff_department_assign', 'user_activity_review',
      'doctor_view', 'doctor_manage', 'test_view',
      'bill_create', 'bill_view', 'bill_view_own', 'bill_view_all', 'bill_cancel', 'bill_print', 'bill_view_due', 'payment_collect', 'pricing_configure', 'refund_approve', 'finance_view', 'financial_analytics_view',
      'card_transactions_view', 'card_transactions_view_own', 'card_transactions_view_all', 'transactions_view_own', 'transactions_view_all', 'transactions_manage',
      'appointment_manage', 'appointment_view', 'appointment_create', 'appointment_reschedule', 'appointment_cancel', 'appointment_checkin',
      'lab_order_create', 'lab_order_view', 'lab_order_manage', 'specimen_collect', 'specimen_receive', 'specimen_process', 'result_enter', 'result_draft_save', 'result_submit_verification', 'result_verify', 'report_finalize', 'report_amend', 'barcode_print', 'report_download', 'report_share',
      'pharmacy_dispense', 'prescription_view', 'medicine_dispense', 'pharmacy_sale_create', 'pharmacy_stock_manage', 'pharmacy_bill_print',
      'pharmacy_purchase_manage', 'pharmacy_supplier_manage', 'pharmacy_batch_manage', 'pharmacy_return_process', 'pharmacy_adjust_stock', 'pharmacy_reports_view',
      'notifications_view', 'notifications_send', 'print_center_view', 'print_center_manage',
      'permissions_manage'
    ]
  },
  doctor: {
    role: 'doctor',
    name: 'Licensed Physician / Doctor',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    description: 'Exclusive clinical authority to diagnose, prescribe medications, modify dosages, order investigations, and sign official medical prescriptions.',
    permissions: [
      'patient_read', 'clinical_view', 'patient_search',
      'card_read', 'card_request_create', 'card_request_submit', 'card_request_view_own', 'card_bill_print', 'wallet_read',
      'emr_read', 'emr_create', 'emr_edit', 'emr_prescribe', 'doctor_view',
      'appointment_view', 'consultation_open', 'consultation_complete', 'prescription_add', 'investigation_order', 'followup_add',
      'lab_order_create', 'lab_order_view', 'result_verify', 'report_finalize', 'report_download',
      'prescription_view', 'bill_view_own'
    ]
  },
  manager: {
    role: 'manager',
    name: 'Branch Manager',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    description: 'Oversees daily patient operations, branch revenue, approvals, and staff audit reports.',
    permissions: [
      'patient_create', 'patient_read', 'patient_update', 'patient_print', 'patient_export', 'patient_search', 'patient_slip_print',
      'card_create', 'card_read', 'card_update', 'card_print', 'card_export', 'card_status_change', 'card_renew', 'card_replace', 'card_issue',
      'card_request_create', 'card_request_edit', 'card_request_submit', 'card_request_view', 'card_request_view_own', 'card_request_view_all', 'card_request_approve', 'card_request_reject', 'card_request_return', 'card_bill_print',
      'wallet_read', 'wallet_credit', 'wallet_debit',
      'membership_manage', 'family_manage', 'family_member_add', 'family_view', 'audit_view', 'reports_view', 'catalog_manage', 'package_manage',
      'doctor_view', 'test_view', 'bill_create', 'bill_view', 'bill_view_own', 'bill_view_all', 'bill_print', 'bill_view_due', 'payment_collect', 'finance_view',
      'card_transactions_view', 'card_transactions_view_own', 'card_transactions_view_all', 'transactions_view_own', 'transactions_view_all', 'transactions_manage',
      'appointment_view', 'appointment_manage', 'lab_order_create', 'lab_order_view', 'lab_order_manage', 'pharmacy_dispense',
      'pharmacy_sale_create', 'pharmacy_stock_manage', 'pharmacy_purchase_manage', 'pharmacy_supplier_manage', 'pharmacy_batch_manage', 'pharmacy_return_process', 'pharmacy_adjust_stock', 'pharmacy_reports_view',
      'notifications_view', 'notifications_send', 'print_center_view', 'print_center_manage'
    ]
  },
  reception: {
    role: 'reception',
    name: 'Front Desk Reception',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Fast-track walk-in registrations, quick searches, appointment booking, card intake, and billing.',
    permissions: [
      'patient_create', 'patient_read', 'patient_update', 'patient_search', 'patient_slip_print', 'patient_print',
      'card_read', 'card_enrollment_open', 'card_request_create', 'card_request_submit', 'card_request_view_own', 'card_bill_print',
      'family_member_add', 'family_view',
      'appointment_view', 'appointment_create', 'appointment_reschedule', 'appointment_cancel', 'appointment_checkin', 'appointment_manage',
      'lab_order_create', 'lab_order_view', 'report_download',
      'bill_create', 'bill_view_own', 'bill_print', 'payment_collect',
      'wallet_read', 'wallet_credit',
      'card_transactions_view_own', 'transactions_view_own',
      'notifications_view', 'notifications_send', 'print_center_view'
    ]
  },
  cashier: {
    role: 'cashier',
    name: 'Cashier / Billing Specialist',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    description: 'Manages OPD billing, cash desk POS deductions, wallet top-ups, cash desk vouchers, and daily revenue reconciliation.',
    permissions: [
      'patient_read', 'patient_search', 'patient_print', 'card_read',
      'wallet_read', 'wallet_credit', 'wallet_debit', 'voucher_redeem',
      'bill_create', 'bill_view_own', 'bill_print', 'payment_collect',
      'card_transactions_view_own', 'transactions_view_own',
      'print_center_view', 'print_center_manage'
    ]
  },
  lab_staff: {
    role: 'lab_staff',
    name: 'Laboratory Technician',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    description: 'Processes diagnostic specimens, accessions samples, enters test results, and submits for verification.',
    permissions: [
      'patient_read', 'patient_search', 'card_read', 'wallet_read', 'wallet_debit', 'catalog_manage', 'test_view',
      'lab_order_view', 'specimen_receive', 'specimen_process', 'result_enter', 'result_draft_save', 'result_submit_verification'
    ]
  },
  phlebotomist: {
    role: 'phlebotomist',
    name: 'Phlebotomist / Specimen Collector',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    description: 'Specialist in blood and clinical specimen collection, barcode labeling, sample accessioning, and test routing.',
    permissions: [
      'patient_read', 'patient_search', 'card_read', 'test_view',
      'lab_order_view', 'specimen_collect', 'barcode_print'
    ]
  },
  pharmacist: {
    role: 'pharmacist',
    name: 'Clinical Pharmacist',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Specialist in medicine dispensing, pharmacy prescription orders, drug inventory, and patient medication verification.',
    permissions: [
      'patient_read', 'card_read', 'wallet_read',
      'prescription_view', 'medicine_dispense', 'pharmacy_dispense', 'pharmacy_sale_create', 'pharmacy_stock_manage', 'pharmacy_bill_print',
      'pharmacy_purchase_manage', 'pharmacy_supplier_manage', 'pharmacy_batch_manage', 'pharmacy_return_process', 'pharmacy_adjust_stock', 'pharmacy_reports_view',
      'bill_create', 'bill_view_own'
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
  'cards',
  'card_requests',
  'families',
  'appointments',
  'doctors',
  'laboratory',
  'pharmacy',
  'billing',
  'transactions',
  'reports',
  'users',
  'permissions',
  'activity',
  'settings',
  'emr',
  'doctor_master',
  'test_master',
  'ngo_welfare',
  'card_studio',
  'print_sheet',
  'card_dispatch',
  'memberships',
  'wallet',
  'cash_desk_vouchers',
  'integrations',
  'backup',
  'website_cms',
  'system_monitoring',
  'notifications',
  'print_center'
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
  },
  {
    key: 'card_requests',
    name: 'Card Requests & Issuance',
    href: '/card-requests',
    category: 'cards',
    description: 'Staff health card applications, sequential LMX-REQ request IDs, printable slips & Super Admin approval.',
    associatedPermissions: ['card_request_view', 'card_request_view_own', 'card_request_create', 'card_request_approve', 'card_issue']
  },
  {
    key: 'appointments',
    name: 'Appointments & OPD Queue',
    href: '/appointments',
    category: 'clinical',
    description: 'Patient appointments scheduling, doctor calendar, OPD waiting room queue & token workflow.',
    associatedPermissions: ['appointment_view', 'appointment_manage', 'emr_read', 'patient_read']
  },
  {
    key: 'doctors',
    name: 'Doctors Directory & Clinical Desk',
    href: '/doctors',
    category: 'clinical',
    description: 'Physician master directory, consultation schedules, specialty matrix & EMR linkage.',
    associatedPermissions: ['doctor_view', 'doctor_manage', 'emr_read']
  },
  {
    key: 'laboratory',
    name: 'Laboratory & Diagnostics Hub',
    href: '/laboratory',
    category: 'clinical',
    description: 'Diagnostic test catalog, active lab investigation orders, sample accessioning & barcode printing.',
    associatedPermissions: ['test_view', 'catalog_manage', 'lab_order_manage', 'patient_read']
  },
  {
    key: 'pharmacy',
    name: 'Pharmacy & Dispensing Hub',
    href: '/pharmacy',
    category: 'clinical',
    description: 'Active prescription medicine dispensing queue, stock status & delivery tracking.',
    associatedPermissions: ['patient_read', 'pharmacy_dispense', 'catalog_manage']
  },
  {
    key: 'billing',
    name: 'Billing & Hospital Invoices',
    href: '/billing',
    category: 'finance',
    description: 'Unified billing for Card registrations, OPD visits, Lab diagnostics & Pharmacy with printable receipts.',
    associatedPermissions: ['bill_view', 'bill_view_own', 'bill_create', 'bill_print', 'payment_collect']
  },
  {
    key: 'transactions',
    name: 'Financial Ledger & Revenue',
    href: '/transactions',
    category: 'finance',
    description: 'Centralized financial ledger: staff-wise own collection tracking vs Super Admin full clinic audit.',
    associatedPermissions: ['card_transactions_view', 'card_transactions_view_own', 'wallet_read', 'transactions_manage']
  },
  {
    key: 'notifications',
    name: 'Notifications & Communication',
    href: '/notifications',
    category: 'admin',
    description: 'Appointment reminders, test ready alerts, billing notices & WhatsApp/SMS dispatch log.',
    associatedPermissions: ['notifications_view', 'notifications_send', 'all']
  },
  {
    key: 'print_center',
    name: 'Standard Bill & Print Center',
    href: '/print-center',
    category: 'finance',
    description: 'A4 half-page standardized bills, preview, reprint tracking, and print history log.',
    associatedPermissions: ['print_center_view', 'print_center_manage', 'bill_print', 'all']
  },
  {
    key: 'permissions',
    name: 'RBAC & Action Permissions Matrix',
    href: '/permissions',
    category: 'system',
    description: 'Action-level role-based access control matrix & granular permission enforcement.',
    associatedPermissions: ['users_manage', 'permissions_manage', 'all']
  }
];

export const ROLE_DEFAULT_MODULES: Record<Role, SystemModuleKey[]> = {
  super_admin: [
    'dashboard', 'patients', 'cards', 'card_requests', 'families', 'appointments', 'doctors', 'laboratory', 'pharmacy', 'billing', 'transactions', 'reports', 'users', 'permissions', 'activity', 'settings',
    'doctor_master', 'test_master', 'ngo_welfare', 'card_studio', 'print_sheet', 'card_dispatch',
    'memberships', 'wallet', 'website_cms', 'integrations', 'backup', 'cash_desk_vouchers', 'system_monitoring', 'notifications', 'print_center'
  ],
  admin: [
    'dashboard', 'patients', 'cards', 'card_requests', 'families', 'appointments', 'doctors', 'laboratory', 'pharmacy', 'billing', 'transactions', 'reports', 'users', 'permissions', 'activity', 'settings',
    'doctor_master', 'test_master', 'ngo_welfare', 'card_studio', 'print_sheet', 'card_dispatch',
    'memberships', 'wallet', 'integrations', 'backup', 'notifications', 'print_center'
  ],
  doctor: ['emr', 'dashboard', 'patients', 'appointments', 'doctors', 'laboratory', 'pharmacy', 'cards', 'wallet'],
  reception: ['dashboard', 'patients', 'cards', 'card_requests', 'families', 'appointments', 'billing', 'transactions', 'wallet', 'notifications', 'print_center'],
  cashier: ['dashboard', 'patients', 'billing', 'transactions', 'wallet', 'cash_desk_vouchers', 'cards', 'reports', 'print_center'],
  manager: ['dashboard', 'patients', 'cards', 'card_requests', 'families', 'appointments', 'doctors', 'laboratory', 'pharmacy', 'billing', 'transactions', 'memberships', 'wallet', 'reports', 'activity', 'notifications', 'print_center'],
  lab_staff: ['dashboard', 'patients', 'laboratory', 'test_master', 'cards', 'wallet'],
  phlebotomist: ['dashboard', 'patients', 'laboratory', 'test_master', 'cards'],
  pharmacist: ['dashboard', 'patients', 'pharmacy', 'cards', 'billing', 'wallet', 'print_center'],
  marketing: ['dashboard', 'patients', 'cards', 'card_requests', 'reports', 'notifications'],
  card_operator: ['dashboard', 'patients', 'cards', 'card_requests', 'card_studio', 'print_sheet', 'card_dispatch'],
  read_only: ['dashboard', 'patients', 'cards', 'appointments', 'laboratory', 'pharmacy', 'billing', 'transactions', 'activity']
};

export function hasPermission(userRole: Role, permission: Permission): boolean {
  if (userRole === 'super_admin') return true;
  const config = ROLE_CONFIGS[userRole];
  if (!config) return false;
  if (config.permissions.includes('all')) return true;
  if (config.permissions.includes(permission)) return true;

  // Granular compatibility aliases
  if (permission === 'patient_search' && (config.permissions.includes('patient_read') || config.permissions.includes('patient_create'))) return true;
  if (permission === 'patient_slip_print' && (config.permissions.includes('patient_print') || config.permissions.includes('patient_create'))) return true;
  if (permission === 'card_enrollment_open' && (config.permissions.includes('card_request_create') || config.permissions.includes('card_create'))) return true;
  if (permission === 'appointment_create' && config.permissions.includes('appointment_manage')) return true;
  if (permission === 'appointment_checkin' && config.permissions.includes('appointment_manage')) return true;
  if (permission === 'lab_order_create' && (config.permissions.includes('lab_order_manage') || config.permissions.includes('lab_order_create'))) return true;
  if (permission === 'lab_order_view' && (config.permissions.includes('lab_order_manage') || config.permissions.includes('test_view'))) return true;
  if (permission === 'specimen_collect' && config.permissions.includes('lab_order_manage')) return true;
  if (permission === 'barcode_print' && (config.permissions.includes('lab_order_manage') || config.permissions.includes('specimen_collect'))) return true;
  if (permission === 'result_enter' && config.permissions.includes('lab_order_manage')) return true;
  if (permission === 'result_draft_save' && config.permissions.includes('lab_order_manage')) return true;
  if (permission === 'result_submit_verification' && config.permissions.includes('lab_order_manage')) return true;
  if (permission === 'medicine_dispense' && config.permissions.includes('pharmacy_dispense')) return true;
  if (permission === 'prescription_view' && (config.permissions.includes('pharmacy_dispense') || config.permissions.includes('emr_read'))) return true;
  if (permission === 'transactions_view_own' && (config.permissions.includes('card_transactions_view_own') || config.permissions.includes('bill_view_own'))) return true;
  if (permission === 'transactions_view_all' && config.permissions.includes('card_transactions_view_all')) return true;
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
    if (user.customPermissions.includes(permission)) return true;

    // Granular compatibility aliases for custom permissions
    if (permission === 'patient_search' && (user.customPermissions.includes('patient_read') || user.customPermissions.includes('patient_create'))) return true;
    if (permission === 'patient_slip_print' && (user.customPermissions.includes('patient_print') || user.customPermissions.includes('patient_create'))) return true;
    if (permission === 'card_enrollment_open' && (user.customPermissions.includes('card_request_create') || user.customPermissions.includes('card_create'))) return true;
    if (permission === 'appointment_create' && user.customPermissions.includes('appointment_manage')) return true;
    if (permission === 'appointment_checkin' && user.customPermissions.includes('appointment_manage')) return true;
    if (permission === 'lab_order_create' && (user.customPermissions.includes('lab_order_manage') || user.customPermissions.includes('lab_order_create'))) return true;
    if (permission === 'lab_order_view' && (user.customPermissions.includes('lab_order_manage') || user.customPermissions.includes('test_view'))) return true;
    if (permission === 'specimen_collect' && user.customPermissions.includes('lab_order_manage')) return true;
    if (permission === 'barcode_print' && (user.customPermissions.includes('lab_order_manage') || user.customPermissions.includes('specimen_collect'))) return true;
    if (permission === 'result_enter' && user.customPermissions.includes('lab_order_manage')) return true;
    if (permission === 'result_draft_save' && user.customPermissions.includes('lab_order_manage')) return true;
    if (permission === 'result_submit_verification' && user.customPermissions.includes('lab_order_manage')) return true;
    if (permission === 'medicine_dispense' && user.customPermissions.includes('pharmacy_dispense')) return true;
    if (permission === 'prescription_view' && (user.customPermissions.includes('pharmacy_dispense') || user.customPermissions.includes('emr_read'))) return true;
    if (permission === 'transactions_view_own' && (user.customPermissions.includes('card_transactions_view_own') || user.customPermissions.includes('bill_view_own'))) return true;
    if (permission === 'transactions_view_all' && user.customPermissions.includes('card_transactions_view_all')) return true;
    if (permission === 'card_request_view' && (user.customPermissions.includes('card_request_view_own') || user.customPermissions.includes('card_request_view_all') || user.customPermissions.includes('card_request_create'))) return true;
    if (permission === 'card_request_view_own' && (user.customPermissions.includes('card_request_view') || user.customPermissions.includes('card_request_view_all') || user.customPermissions.includes('card_request_create'))) return true;
    if (permission === 'card_request_submit' && user.customPermissions.includes('card_request_create')) return true;
    if (permission === 'card_bill_print' && (user.customPermissions.includes('bill_print') || user.customPermissions.includes('bill_view') || user.customPermissions.includes('card_request_create'))) return true;
    if (permission === 'bill_print' && (user.customPermissions.includes('card_bill_print') || user.customPermissions.includes('bill_view'))) return true;
    if (permission === 'bill_view' && (user.customPermissions.includes('bill_view_own') || user.customPermissions.includes('bill_view_all'))) return true;
    if (permission === 'bill_view_own' && (user.customPermissions.includes('bill_view') || user.customPermissions.includes('bill_view_all') || user.customPermissions.includes('bill_create'))) return true;
    if (permission === 'card_transactions_view_own' && (user.customPermissions.includes('card_transactions_view') || user.customPermissions.includes('card_transactions_view_all') || user.customPermissions.includes('card_request_create'))) return true;

    return false;
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