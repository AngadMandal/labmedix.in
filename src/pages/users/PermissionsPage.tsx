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
    category: 'Patient Care & Demographics',
    description: 'Patient directory registration, profiles, editing and export',
    permissions: [
      { key: 'patient_create', label: 'Create Patients', description: 'Register walk-in and online patients' },
      { key: 'patient_read', label: 'View Patients', description: 'Inspect patient medical records and directory' },
      { key: 'patient_update', label: 'Edit Patients', description: 'Update demographics and contact details' },
      { key: 'patient_delete', label: 'Delete Patients', description: 'Permanently remove patient files' },
      { key: 'patient_print', label: 'Print Records', description: 'Print patient profiles, slips and barcodes' },
      { key: 'patient_export', label: 'Export Database', description: 'Export patient records to Excel / CSV' }
    ]
  },
  {
    category: 'Health Cards & CR80 Studio',
    description: 'Smart card issuance, renewals, replacements and printing',
    permissions: [
      { key: 'card_read', label: 'Scan & Read Cards', description: 'Scan QR / NFC to verify cardholder status' },
      { key: 'card_create', label: 'Create Health Cards', description: 'Enroll patients into smart health cards' },
      { key: 'card_issue', label: 'Direct Card Issuance', description: 'Mint and activate cards without prior approval' },
      { key: 'card_status_change', label: 'Suspend / Block Cards', description: 'Change card status (active, suspended, blocked)' },
      { key: 'card_renew', label: 'Renew Cards', description: 'Extend validity of expired membership cards' },
      { key: 'card_replace', label: 'Replace Lost Cards', description: 'Re-issue replacement cards with new numbers' },
      { key: 'card_print', label: 'Print Dual-Side PVC', description: 'Direct thermal printing and canvas export' },
      { key: 'card_export', label: 'Export Card Graphics', description: 'Download CR80 PNG and batch print sheets' },
      { key: 'card_delete', label: 'Revoke Cards', description: 'Permanently revoke and delete card records' }
    ]
  },
  {
    category: 'Card Requests Workflow',
    description: 'Dedicated staff card intake, sequential request IDs and approval',
    permissions: [
      { key: 'card_request_create', label: 'Create Card Requests', description: 'Staff can submit card applications for approval' },
      { key: 'card_request_submit', label: 'Submit Requests', description: 'Transmit card requests to Super Admin queue' },
      { key: 'card_request_view_own', label: 'View Own Submissions', description: 'View requests submitted by current user' },
      { key: 'card_request_view_all', label: 'View All Requests', description: 'Inspect all staff card requests clinic-wide' },
      { key: 'card_request_approve', label: 'Approve Applications', description: 'Authorize card applications and issue cards' },
      { key: 'card_request_reject', label: 'Reject / Return Requests', description: 'Reject or request additional applicant info' },
      { key: 'card_bill_print', label: 'Print Bill & Slips', description: 'Print patient card request receipt & slip' }
    ]
  },
  {
    category: 'Clinical EMR, OPD & Doctors',
    description: 'Physician prescriptions, appointments, SOAP notes and consultation fees',
    permissions: [
      { key: 'appointment_view', label: 'View Appointments', description: 'View OPD consultation calendar and queue' },
      { key: 'appointment_manage', label: 'Manage Appointments', description: 'Schedule, reschedule and cancel appointments' },
      { key: 'emr_read', label: 'View Clinical EMR', description: 'Inspect patient prescriptions and diagnoses' },
      { key: 'emr_create', label: 'Create Consultations', description: 'Open clinical encounter and queue tokens' },
      { key: 'emr_edit', label: 'Edit Clinical Notes', description: 'Modify SOAP clinical observations' },
      { key: 'emr_prescribe', label: 'Sign & Prescribe Rx', description: 'Exclusive authority to prescribe medications' },
      { key: 'doctor_view', label: 'View Doctors Directory', description: 'Inspect physician master and OPD timings' },
      { key: 'doctor_manage', label: 'Manage Doctor Profiles', description: 'Configure consultation fees and credentials' }
    ]
  },
  {
    category: 'Diagnostics Laboratory & Pharmacy',
    description: 'Pathology catalog, sample accessioning, lab orders and medicine dispensing',
    permissions: [
      { key: 'test_view', label: 'View Diagnostic Catalog', description: 'Inspect tests, parameters and turnaround times' },
      { key: 'catalog_manage', label: 'Manage Diagnostic Catalog', description: 'Update test directory, rates and health packages' },
      { key: 'lab_order_manage', label: 'Process Lab Investigations', description: 'Accession samples, barcode tubes and enter results' },
      { key: 'pharmacy_dispense', label: 'Dispense Medicines', description: 'Fulfill doctor prescriptions and pack medicines' }
    ]
  },
  {
    category: 'Billing, POS & Financial Ledger',
    description: 'Hospital invoices, cash drawer collections, settlements and wallet',
    permissions: [
      { key: 'bill_create', label: 'Create Hospital Invoices', description: 'Generate OPD, Lab, Pharmacy and Card bills' },
      { key: 'bill_view_own', label: 'View Own Generated Bills', description: 'View invoices created by authenticated user' },
      { key: 'bill_view_all', label: 'View All Clinic Invoices', description: 'Inspect all clinic-wide billing records' },
      { key: 'bill_print', label: 'Print Invoices & Receipts', description: 'Print patient tax invoices with QR seals' },
      { key: 'bill_cancel', label: 'Cancel Bills & Refunds', description: 'Void bills and process refund disbursements' },
      { key: 'payment_collect', label: 'Collect Payments', description: 'Accept cash, UPI and card payments at counter' },
      { key: 'card_transactions_view_own', label: 'View Own Collections', description: 'Audit own cash drawer receipts' },
      { key: 'card_transactions_view_all', label: 'View All Clinic Revenue', description: 'Full financial audit of all transactions' },
      { key: 'wallet_read', label: 'View Wallet Balances', description: 'Check patient health wallet deposits' },
      { key: 'wallet_credit', label: 'Top-Up Wallet Funds', description: 'Recharge patient prepaid balance' },
      { key: 'wallet_debit', label: 'Deduct Wallet Balance', description: 'Cashless POS deductions for services' }
    ]
  },
  {
    category: 'Governance, Security & System',
    description: 'Role-based access, audit trails, database backups and integrations',
    permissions: [
      { key: 'users_manage', label: 'Manage Staff Users', description: 'Create staff accounts and assign roles' },
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
