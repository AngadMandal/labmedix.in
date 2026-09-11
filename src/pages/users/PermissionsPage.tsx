import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StorageService } from '../../services/storage';
import { ROLE_CONFIGS, hasPermission, checkUserPermission } from '../../constants/roles';
import { Role, Permission, User } from '../../types';
import {
  ShieldCheck,
  Search,
  Filter,
  Users,
  Check,
  X,
  Lock,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Shield,
  KeyRound,
  Eye,
  Edit,
  Save
} from 'lucide-react';

interface PermissionCategoryGroup {
  category: string;
  description: string;
  permissions: {
    key: Permission;
    label: string;
    description: string;
  }[];
}

const PERMISSION_GROUPS: PermissionCategoryGroup[] = [
  {
    category: 'Patient Care & Registration',
    description: 'Patient directory registration, profiles, editing, slips, clinical history',
    permissions: [
      { key: 'patient_create', label: 'Create Patients', description: 'Register walk-in and online patients' },
      { key: 'patient_read', label: 'View Patients', description: 'Inspect patient medical records and directory' },
      { key: 'patient_search', label: 'Search Patients', description: 'Search directory by mobile, ID, name, or Aadhaar' },
      { key: 'patient_update', label: 'Edit Patients', description: 'Update demographics and contact details' },
      { key: 'patient_delete', label: 'Delete Patients', description: 'Permanently remove patient files' },
      { key: 'patient_slip_print', label: 'Print Patient Slip', description: 'Print registration intake slip & barcode' },
      { key: 'patient_print', label: 'Print Records', description: 'Print patient profiles, slips and barcodes' },
      { key: 'patient_export', label: 'Export Database', description: 'Export patient records to Excel / CSV' },
      { key: 'clinical_view', label: 'View Clinical EMR History', description: 'Inspect patient past diagnoses and consultations' }
    ]
  },
  {
    category: 'Health Cards & CR80 Studio',
    description: 'Smart card issuance, renewals, replacements, pricing and printing',
    permissions: [
      { key: 'card_read', label: 'Scan & Read Cards', description: 'Scan QR / NFC to verify cardholder status' },
      { key: 'card_create', label: 'Create Health Cards', description: 'Enroll patients into smart health cards' },
      { key: 'card_enrollment_open', label: 'Open Enrollment', description: 'Initiate card enrollment workflow' },
      { key: 'card_issue', label: 'Direct Card Issuance', description: 'Mint and activate cards without prior approval' },
      { key: 'card_status_change', label: 'Suspend / Block Cards', description: 'Change card status (active, suspended, blocked)' },
      { key: 'card_renew', label: 'Renew Cards', description: 'Extend validity of expired membership cards' },
      { key: 'card_replace', label: 'Replace Lost Cards', description: 'Re-issue replacement cards with new numbers' },
      { key: 'card_print', label: 'Print Dual-Side PVC', description: 'Direct thermal printing and canvas export' },
      { key: 'card_export', label: 'Export Card Graphics', description: 'Download CR80 PNG and batch print sheets' },
      { key: 'card_delete', label: 'Revoke Cards', description: 'Permanently revoke and delete card records' },
      { key: 'card_plan_configure', label: 'Configure Plans', description: 'Define membership tiers and benefits' },
      { key: 'card_pricing_configure', label: 'Configure Pricing', description: 'Set standard base membership prices' },
      { key: 'card_benefit_configure', label: 'Configure Benefits', description: 'Define discount percentages across OPD/Lab/Pharmacy' }
    ]
  },
  {
    category: 'Card Requests Workflow',
    description: 'Dedicated staff card intake, sequential request IDs, self-approval prevention',
    permissions: [
      { key: 'card_request_create', label: 'Create Card Requests', description: 'Staff can submit card applications for approval' },
      { key: 'card_request_submit', label: 'Submit Requests', description: 'Transmit card requests to Super Admin queue' },
      { key: 'card_request_view_own', label: 'View Own Submissions', description: 'View requests submitted by current user' },
      { key: 'card_request_view_all', label: 'View All Requests', description: 'Inspect all staff card requests clinic-wide' },
      { key: 'card_request_approve', label: 'Approve Applications', description: 'Authorize card applications and issue cards' },
      { key: 'card_request_reject', label: 'Reject Applications', description: 'Reject invalid applicant submissions' },
      { key: 'card_request_return', label: 'Return for Correction', description: 'Send application back to staff with instructions' },
      { key: 'card_bill_print', label: 'Print Bill & Slips', description: 'Print patient card request receipt & slip' }
    ]
  },
  {
    category: 'Family Health Shield',
    description: 'Add family members to primary card, limits, and relationship governance',
    permissions: [
      { key: 'family_member_add', label: 'Add Family Members', description: 'Link dependents to primary health card' },
      { key: 'family_view', label: 'View Family Shield', description: 'Inspect linked family members and coverage' },
      { key: 'family_limit_configure', label: 'Configure Family Limits', description: 'Set max included family members & add-on charges' },
      { key: 'family_manage', label: 'Manage Family Shield', description: 'Full administrative governance over family groups' }
    ]
  },
  {
    category: 'Appointments & Doctor EMR',
    description: 'OPD scheduling, doctor consultation, SOAP notes, prescriptions and referrals',
    permissions: [
      { key: 'appointment_view', label: 'View Appointments', description: 'View OPD consultation calendar and queue' },
      { key: 'appointment_create', label: 'Schedule Appointments', description: 'Book doctor consultation appointments' },
      { key: 'appointment_reschedule', label: 'Reschedule Appointments', description: 'Change appointment date, time or physician' },
      { key: 'appointment_cancel', label: 'Cancel Appointments', description: 'Cancel scheduled OPD consultations' },
      { key: 'appointment_checkin', label: 'Patient Queue Check-in', description: 'Mark patient arrived and generate queue token' },
      { key: 'appointment_manage', label: 'Manage Appointments', description: 'Full management of doctor schedules and OPD queue' },
      { key: 'consultation_open', label: 'Open Consultation', description: 'Launch EMR doctor consultation workspace' },
      { key: 'consultation_complete', label: 'Complete Consultation', description: 'Finalize clinical encounter and sign encounter summary' },
      { key: 'prescription_add', label: 'Prescribe Medications', description: 'Write prescription medications, dosages and directions' },
      { key: 'investigation_order', label: 'Order Diagnostic Tests', description: 'Order laboratory investigations from consultation' },
      { key: 'followup_add', label: 'Schedule Follow-up', description: 'Schedule patient follow-up review visit' },
      { key: 'emr_read', label: 'View Clinical EMR', description: 'Inspect patient prescriptions and diagnoses' },
      { key: 'emr_create', label: 'Create Consultations', description: 'Open clinical encounter and queue tokens' },
      { key: 'emr_edit', label: 'Edit Clinical Notes', description: 'Modify SOAP clinical observations' },
      { key: 'emr_prescribe', label: 'Sign & Prescribe Rx', description: 'Exclusive authority to prescribe medications' },
      { key: 'doctor_view', label: 'View Doctors Directory', description: 'Inspect physician master and OPD timings' },
      { key: 'doctor_manage', label: 'Manage Doctor Profiles', description: 'Configure consultation fees and credentials' }
    ]
  },
  {
    category: 'Laboratory & Diagnostic Lifecycle',
    description: 'Phlebotomy collection, accessioning, result entry, verification, and locked reports',
    permissions: [
      { key: 'lab_order_create', label: 'Create Lab Orders', description: 'Order diagnostic tests and generate requisition' },
      { key: 'lab_order_view', label: 'View Lab Orders', description: 'Inspect diagnostic orders and specimen statuses' },
      { key: 'specimen_collect', label: 'Phlebotomy Sample Collection', description: 'Collect blood/urine specimens and print tube barcodes' },
      { key: 'specimen_receive', label: 'Receive Specimen in Lab', description: 'Accession and accept specimen at central diagnostic desk' },
      { key: 'specimen_process', label: 'Process Specimen', description: 'Run analyzer calibration and process samples' },
      { key: 'result_enter', label: 'Enter Analytical Results', description: 'Enter observed parameter findings from analyzer' },
      { key: 'result_draft_save', label: 'Save Result Drafts', description: 'Save interim findings without submitting' },
      { key: 'result_submit_verification', label: 'Submit for Verification', description: 'Transmit findings to doctor / pathologist for sign-off' },
      { key: 'result_verify', label: 'Review & Verify Results', description: 'Authorized doctor / verifier review of analytical values' },
      { key: 'report_finalize', label: 'Approve & Finalize Report', description: 'Sign, seal and lock official diagnostic report' },
      { key: 'report_amend', label: 'Authorize Report Amendment', description: 'Initiate formal report correction with audit trail' },
      { key: 'barcode_print', label: 'Print Specimen Barcodes', description: 'Generate barcode tube labels for phlebotomy' },
      { key: 'report_download', label: 'Download Verified Reports', description: 'Print and download official A4 diagnostic reports' },
      { key: 'report_share', label: 'Share Reports', description: 'Send official report link via WhatsApp / Email' },
      { key: 'test_view', label: 'View Diagnostic Catalog', description: 'Inspect tests, parameters and turnaround times' },
      { key: 'catalog_manage', label: 'Manage Diagnostic Catalog', description: 'Update test directory, rates and health packages' },
      { key: 'lab_order_manage', label: 'Manage Lab Operations', description: 'Full administrative control over diagnostic operations' }
    ]
  },
  {
    category: 'Pharmacy Operations',
    description: 'Doctor prescription fulfillment, medicine dispensing, stock and billing',
    permissions: [
      { key: 'prescription_view', label: 'View Prescriptions', description: 'Inspect doctor EMR prescriptions for dispensing' },
      { key: 'medicine_dispense', label: 'Dispense Medications', description: 'Dispense medicines as prescribed by doctor' },
      { key: 'pharmacy_sale_create', label: 'Create Pharmacy Sale', description: 'Process counter medicine sales' },
      { key: 'pharmacy_stock_manage', label: 'Manage Pharmacy Stock', description: 'Update inventory, batch numbers and expiry dates' },
      { key: 'pharmacy_bill_print', label: 'Print Pharmacy Invoices', description: 'Print itemized medication receipt' },
      { key: 'pharmacy_dispense', label: 'Dispense Pharmacy Items', description: 'Full dispensing workflow access' }
    ]
  },
  {
    category: 'Billing, Financial Ledger & Discounts',
    description: 'Hospital invoices, cash drawer collections, settlements, and discount override security',
    permissions: [
      { key: 'bill_create', label: 'Create Hospital Invoices', description: 'Generate OPD, Lab, Pharmacy and Card bills' },
      { key: 'bill_view_own', label: 'View Own Generated Bills', description: 'View invoices created by authenticated cashier' },
      { key: 'bill_view_all', label: 'View All Clinic Invoices', description: 'Inspect all clinic-wide billing records' },
      { key: 'bill_print', label: 'Print Invoices & Receipts', description: 'Print patient tax invoices with QR seals' },
      { key: 'bill_cancel', label: 'Cancel Bills & Void', description: 'Void bills and process refund disbursements' },
      { key: 'discount_override', label: 'Manual Discount Override', description: 'Special authority to override automatic card discounts' },
      { key: 'payment_collect', label: 'Collect Payments', description: 'Accept cash, UPI and card payments at counter' },
      { key: 'refund_approve', label: 'Approve Cashier Refunds', description: 'Authorize financial reimbursement to patient' },
      { key: 'pricing_configure', label: 'Configure Base Pricing', description: 'Set standard hospital service and procedure prices' },
      { key: 'finance_view', label: 'View Cashier Register Ledger', description: 'Audit daily cash desk drawer settlements' },
      { key: 'financial_analytics_view', label: 'View Financial Analytics', description: 'Inspect clinic revenue metrics and P&L' },
      { key: 'transactions_view_own', label: 'View Own Collections', description: 'Audit own cash drawer receipts' },
      { key: 'transactions_view_all', label: 'View All Clinic Revenue', description: 'Full financial audit of all transactions' },
      { key: 'wallet_read', label: 'View Wallet Balances', description: 'Check patient health wallet deposits' },
      { key: 'wallet_credit', label: 'Top-Up Wallet Funds', description: 'Recharge patient prepaid balance' },
      { key: 'wallet_debit', label: 'Deduct Wallet Balance', description: 'Cashless POS deductions for services' },
      { key: 'transactions_manage', label: 'Manage Financial Ledgers', description: 'Settlements, reconciliation and audits' }
    ]
  },
  {
    category: 'Governance, Security & System Administration',
    description: 'Role-based access, audit trails, staff account lifecycle and cloud backups',
    permissions: [
      { key: 'users_manage', label: 'Manage Staff Users', description: 'Create staff accounts and assign roles' },
      { key: 'staff_create', label: 'Create Staff Accounts', description: 'Provision new employee profiles' },
      { key: 'user_create', label: 'Create System Users', description: 'Provision authentication credentials' },
      { key: 'role_assign', label: 'Assign Clinical Roles', description: 'Assign roles to staff profiles' },
      { key: 'permission_assign', label: 'Assign Granular Permissions', description: 'Grant or revoke individual workflow actions' },
      { key: 'user_status_toggle', label: 'Activate / Suspend Staff', description: 'Immediately lock or unlock staff access' },
      { key: 'staff_department_assign', label: 'Assign Department', description: 'Set staff clinical department' },
      { key: 'user_activity_review', label: 'Review Staff Activity', description: 'Inspect detailed staff action logs' },
      { key: 'audit_export', label: 'Export Audit Logs', description: 'Download cryptographic compliance audit trails' },
      { key: 'permissions_manage', label: 'Manage RBAC Matrix', description: 'Configure granular permission policies' },
      { key: 'membership_manage', label: 'Manage Card Tiers', description: 'Configure Silver, Gold, Platinum benefits' },
      { key: 'family_manage', label: 'Manage Family Shield', description: 'Configure family groups and member limits' },
      { key: 'audit_view', label: 'Inspect Audit Logs', description: 'View cryptographic system activity log' },
      { key: 'reports_view', label: 'View Analytics Reports', description: 'Inspect executive revenue & operational reports' },
      { key: 'backup_manage', label: 'Manage Cloud Backups', description: 'Export encrypted snapshots and disaster recovery' },
      { key: 'settings_manage', label: 'Clinic Configurations', description: 'Hospital profile, branding, API gateways' }
    ]
  }
];

const ROLES: Role[] = [
  'super_admin',
  'admin',
  'doctor',
  'manager',
  'reception',
  'cashier',
  'lab_staff',
  'phlebotomist',
  'card_operator',
  'marketing',
  'read_only'
];

export const PermissionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeView, setActiveView] = useState<'matrix' | 'staff_overrides'>('matrix');

  const staffUsers = useMemo(() => StorageService.getUsers(), []);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return PERMISSION_GROUPS.filter(group => {
      if (selectedCategory !== 'all' && group.category !== selectedCategory) return false;
      return true;
    }).map(group => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return group;
      const matchedPerms = group.permissions.filter(p =>
        p.label.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
      return { ...group, permissions: matchedPerms };
    }).filter(group => group.permissions.length > 0);
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/20 border border-purple-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-500/30">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Action-Level RBAC & Permissions Matrix
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Security Governance
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            Granular action-level access control across 11 hospital roles and 65+ discrete operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('matrix')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
              activeView === 'matrix'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Role Policy Matrix
          </button>
          <button
            onClick={() => setActiveView('staff_overrides')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
              activeView === 'staff_overrides'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Staff User Overrides ({staffUsers.length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search permissions by action name, key, or category..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Action Categories ({PERMISSION_GROUPS.length})</option>
          {PERMISSION_GROUPS.map(g => (
            <option key={g.category} value={g.category}>{g.category}</option>
          ))}
        </select>
      </div>

      {/* Matrix View */}
      {activeView === 'matrix' && (
        <div className="space-y-6">
          {filteredGroups.map(group => (
            <div key={group.category} className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">{group.category}</h3>
                  <p className="text-[11px] text-slate-400">{group.description}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-purple-300">
                  {group.permissions.length} actions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-950/40 text-slate-400 text-[10px] font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 min-w-[240px]">Action & Description</th>
                      {ROLES.map(role => (
                        <th key={role} className="px-3 py-3 text-center min-w-[90px]">
                          <div className="capitalize font-bold text-slate-300">{role.replace('_', ' ')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {group.permissions.map(perm => (
                      <tr key={perm.key} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{perm.label}</div>
                          <div className="text-[11px] text-slate-400">{perm.description}</div>
                          <code className="text-[9px] font-mono text-slate-500">{perm.key}</code>
                        </td>

                        {ROLES.map(role => {
                          const allowed = hasPermission(role, perm.key);
                          return (
                            <td key={role} className="px-3 py-3 text-center">
                              {allowed ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shadow-xs">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800/40 text-slate-600">
                                  <X className="w-3 h-3" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Overrides View */}
      {activeView === 'staff_overrides' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">Active Staff Account Permissions</h2>
            <p className="text-xs text-slate-400">
              Review custom action-level permission overrides assigned to individual staff members.
            </p>
          </div>

          <div className="divide-y divide-slate-800">
            {staffUsers.map(user => (
              <div key={user.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{user.fullName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-500/30">
                      {user.role}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      user.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Username: {user.username} • UID: {user.uid || user.id} • Staff ID: {user.staffId || 'N/A'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Custom Overrides:</span>
                    <div className="font-mono text-xs font-bold text-purple-300">
                      {user.customPermissions && user.customPermissions.length > 0
                        ? `${user.customPermissions.length} custom actions`
                        : 'Inherits Role Defaults'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
