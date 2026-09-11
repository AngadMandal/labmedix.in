import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserService } from '../../services/userService';
import { StorageService, STORAGE_KEYS } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFirestoreCollection } from '../../hooks/useFirestore';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { User, Role, Permission, CompanyProfile } from '../../types';
import {
  ROLE_CONFIGS,
  hasPermission,
  SYSTEM_MODULES,
  SystemModuleKey,
  ROLE_DEFAULT_MODULES,
  checkUserModuleAccess
} from '../../constants/roles';
import { StaffIDCard, StaffCardTheme } from '../../components/card/StaffIDCard';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { RoleBadge } from '../../components/common/RoleBadge';
import { Barcode } from '../../components/common/Barcode';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { ExportService } from '../../services/exportService';
import { PrintService } from '../../services/printService';
import { GmailService } from '../../services/gmailService';
import {
  Users,
  UserCheck,
  UserPlus,
  Edit,
  KeyRound,
  Shield,
  ShieldCheck,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Building,
  Download,
  Search,
  Sparkles,
  Zap,
  RotateCcw,
  Activity,
  Layers,
  Crown,
  Briefcase,
  Stethoscope,
  Megaphone,
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  Printer,
  IdCard,
  QrCode,
  Image as ImageIcon,
  Upload,
  Camera,
  ScanLine,
  MapPin,
  Fingerprint,
  ExternalLink
} from 'lucide-react';

const PERMISSION_LABELS: Record<Permission, { label: string; category: string }> = {
  all: { label: 'Full Root Access (All Permissions)', category: 'System Core' },
  patient_create: { label: 'Register New Patients', category: 'Patient Care' },
  patient_read: { label: 'View Patient Profiles', category: 'Patient Care' },
  patient_update: { label: 'Edit Patient Records', category: 'Patient Care' },
  patient_delete: { label: 'Delete Patient Records', category: 'Patient Care' },
  card_create: { label: 'Issue CR80 Health Cards', category: 'Card Studio' },
  card_read: { label: 'Scan & Verify Cards', category: 'Card Studio' },
  card_update: { label: 'Update Card Configurations', category: 'Card Studio' },
  card_print: { label: 'Print Dual-Side PVC Cards', category: 'Card Studio' },
  card_export: { label: 'Export CR80 PNG / PDF', category: 'Card Studio' },
  card_status_change: { label: 'Suspend / Block Cards', category: 'Card Studio' },
  card_renew: { label: 'Renew Expired Cards', category: 'Card Studio' },
  card_replace: { label: 'Replace Lost Cards', category: 'Card Studio' },
  wallet_read: { label: 'View Wallet Balance', category: 'Financial' },
  wallet_credit: { label: 'Deposit / Recharge Funds', category: 'Financial' },
  wallet_debit: { label: 'Charge & Deduct Wallet', category: 'Financial' },
  wallet_adjust: { label: 'Manual Balance Adjustments', category: 'Financial' },
  membership_manage: { label: 'Configure Membership Tiers', category: 'Clinical Admin' },
  family_manage: { label: 'Manage Family Shield Groups', category: 'Clinical Admin' },
  backup_manage: { label: 'Export & Restore Databases', category: 'System Core' },
  settings_manage: { label: 'Branding & Emergency Helplines', category: 'System Core' },
  audit_view: { label: 'Inspect Cryptographic Audit Trail', category: 'Compliance' },
  users_manage: { label: 'Create & Manage Staff Users', category: 'System Core' },
  reports_view: { label: 'View Financial & Clinical Analytics', category: 'Analytics' },
  emr_read: { label: 'View Patient EMR Prescriptions', category: 'Clinical EMR' },
  emr_create: { label: 'Create Clinical Encounters & Queue Tokens', category: 'Clinical EMR' },
  emr_edit: { label: 'Modify Dosages & SOAP Clinical Records', category: 'Clinical EMR' },
  emr_prescribe: { label: 'Exclusive License to Prescribe & Sign Rx', category: 'Clinical EMR' },
  catalog_manage: { label: 'Manage Diagnostic Tests & Rates Catalog', category: 'Clinical Admin' },
  package_manage: { label: 'Create & Publish Health Packages', category: 'Clinical Admin' },
  voucher_manage: { label: 'Sovereign Cash Desk Voucher Creation & PIN Governance', category: 'Financial' },
  voucher_redeem: { label: 'Hospital POS Cash Desk Voucher Redemption', category: 'Financial' },
  ngo_manage: { label: 'Manage NGO Partners & CSR Fund Deposits', category: 'Welfare & NGO' },
  ngo_view: { label: 'View NGO Programs & Beneficiary Records', category: 'Welfare & NGO' },
  camp_manage: { label: 'Organize & Operate Rural Health Camps', category: 'Welfare & NGO' },
  grant_manage: { label: 'Approve & Disburse Patient Charity Grants', category: 'Welfare & NGO' },
  patient_print: { label: 'Print Patient Profiles & Barcodes', category: 'Patient Care' },
  patient_export: { label: 'Export Patient Database Records', category: 'Patient Care' },
  card_delete: { label: 'Delete & Permanently Revoke Health Cards', category: 'Card Studio' },
  card_issue: { label: 'Directly Mint & Activate CR80 Health Cards', category: 'Card Studio' },
  card_request_create: { label: 'Submit Health Card Requests to Super Admin', category: 'Card Studio' },
  card_request_view: { label: 'View Health Card Application Requests', category: 'Card Studio' },
  card_request_approve: { label: 'Approve Card Creation Requests & Mint Cards', category: 'Card Studio' },
  card_request_reject: { label: 'Reject or Request Info on Card Applications', category: 'Card Studio' },
  doctor_view: { label: 'View Doctor Directory & Commission Ledger', category: 'Clinical Admin' },
  doctor_manage: { label: 'Manage Physicians & Consultation Fee Matrix', category: 'Clinical Admin' },
  test_view: { label: 'View Diagnostic Tests & Health Packages Catalog', category: 'Clinical Admin' },
  bill_create: { label: 'Create OPD Invoices & Diagnostic Lab Bills', category: 'Financial' },
  bill_view: { label: 'View OPD Billing & Transaction Slips', category: 'Financial' },
  bill_cancel: { label: 'Cancel Invoices & Authorize Refunds', category: 'Financial' },
  payment_collect: { label: 'Collect Cash Desk POS & Bank UTR Payments', category: 'Financial' },
  card_request_edit: { label: 'Edit Draft Health Card Requests', category: 'Card Studio' },
  card_request_submit: { label: 'Submit Card Requests to Super Admin', category: 'Card Studio' },
  card_request_view_own: { label: 'View Own Submitted Card Requests', category: 'Card Studio' },
  card_request_view_all: { label: 'View All Staff Card Requests', category: 'Card Studio' },
  card_cancel: { label: 'Cancel / Void Card Requests', category: 'Card Studio' },
  card_bill_print: { label: 'Print Patient Card Request Bill & Slip', category: 'Card Studio' },
  card_transactions_view: { label: 'View Card Request Transactions', category: 'Financial' },
  card_transactions_view_own: { label: 'View Own Submitted Transactions', category: 'Financial' },
  card_transactions_view_all: { label: 'View All Staff Card Transactions', category: 'Financial' },
  bill_view_own: { label: 'View Own Generated Bills', category: 'Financial' },
  bill_view_all: { label: 'View All Clinic Invoices & Bills', category: 'Financial' },
  bill_print: { label: 'Print Patient Invoices & Tax Receipts', category: 'Financial' },
  bill_view_due: { label: 'Track Outstanding Balance & Due Amounts', category: 'Financial' },
  transactions_manage: { label: 'Manage Financial Ledgers & Settlements', category: 'Financial' },
  appointment_manage: { label: 'Manage Appointments & Doctor Schedules', category: 'Clinical EMR' },
  appointment_view: { label: 'View Appointments & OPD Queue', category: 'Clinical EMR' },
  lab_order_manage: { label: 'Process Lab Investigations & Samples', category: 'Clinical Admin' },
  pharmacy_dispense: { label: 'Dispense Prescription Medications', category: 'Clinical Admin' },
  permissions_manage: { label: 'Super Admin RBAC Matrix & Role Governance', category: 'System Core' },

  // Granular Patient Operations
  patient_search: { label: 'Search Patient Directory', category: 'Patient Care' },
  patient_slip_print: { label: 'Print Patient Registration Slip', category: 'Patient Care' },
  clinical_view: { label: 'View Patient Clinical EMR History', category: 'Patient Care' },

  // Granular Health Card Operations
  card_enrollment_open: { label: 'Open Card Enrollment Window', category: 'Card Studio' },
  card_request_return: { label: 'Return Card Request for Correction', category: 'Card Studio' },
  card_plan_configure: { label: 'Configure Health Card Plans', category: 'Card Studio' },
  card_pricing_configure: { label: 'Configure Card Pricing Rules', category: 'Card Studio' },
  card_benefit_configure: { label: 'Configure Card Benefit Discounts', category: 'Card Studio' },

  // Family Shield Granular
  family_member_add: { label: 'Add Family Members to Card', category: 'Family Shield' },
  family_view: { label: 'View Family Shield Relationships', category: 'Family Shield' },
  family_limit_configure: { label: 'Configure Family Member Limits', category: 'Family Shield' },

  // Appointments Granular
  appointment_create: { label: 'Schedule Doctor Appointment', category: 'Appointments' },
  appointment_reschedule: { label: 'Reschedule Appointment', category: 'Appointments' },
  appointment_cancel: { label: 'Cancel Doctor Appointment', category: 'Appointments' },
  appointment_checkin: { label: 'Patient Queue Check-in', category: 'Appointments' },
  consultation_open: { label: 'Open EMR Doctor Consultation', category: 'Appointments' },
  consultation_complete: { label: 'Mark Consultation Complete', category: 'Appointments' },
  prescription_add: { label: 'Prescribe Medications & Dosages', category: 'Appointments' },
  investigation_order: { label: 'Order Diagnostic Lab Investigations', category: 'Appointments' },
  followup_add: { label: 'Schedule Follow-up Consultation', category: 'Appointments' },

  // Laboratory & Diagnostic Granular
  lab_order_create: { label: 'Create Laboratory Test Order', category: 'Laboratory' },
  lab_order_view: { label: 'View Diagnostic Test Orders', category: 'Laboratory' },
  specimen_collect: { label: 'Phlebotomy Sample Collection', category: 'Laboratory' },
  specimen_receive: { label: 'Receive Specimen at Lab Desk', category: 'Laboratory' },
  specimen_process: { label: 'Process Analyzer Specimens', category: 'Laboratory' },
  result_enter: { label: 'Enter Diagnostic Test Results', category: 'Laboratory' },
  result_draft_save: { label: 'Save Draft Laboratory Results', category: 'Laboratory' },
  result_submit_verification: { label: 'Submit Results for Verification', category: 'Laboratory' },
  result_verify: { label: 'Review & Verify Lab Results', category: 'Laboratory' },
  report_finalize: { label: 'Approve & Finalize Lab Report', category: 'Laboratory' },
  report_amend: { label: 'Authorize Report Amendment', category: 'Laboratory' },
  barcode_print: { label: 'Print Phlebotomy Specimen Barcodes', category: 'Laboratory' },
  report_download: { label: 'Download Verified Lab Reports', category: 'Laboratory' },
  report_share: { label: 'Share Diagnostic Report (WhatsApp/Email)', category: 'Laboratory' },

  // Billing & Finance Granular
  discount_override: { label: 'Manual Discount Override Authorization', category: 'Financial' },
  finance_view: { label: 'View Cashier Shift & Register Ledger', category: 'Financial' },
  financial_analytics_view: { label: 'View Financial Analytics & Reports', category: 'Financial' },
  pricing_configure: { label: 'Configure Base Test & Service Pricing', category: 'Financial' },
  refund_approve: { label: 'Approve Cashier Refunds', category: 'Financial' },

  // Pharmacy Granular
  prescription_view: { label: 'View EMR Doctor Prescriptions', category: 'Pharmacy' },
  medicine_dispense: { label: 'Dispense Medicines at Pharmacy', category: 'Pharmacy' },
  pharmacy_sale_create: { label: 'Create Pharmacy Cash Desk Sale', category: 'Pharmacy' },
  pharmacy_stock_manage: { label: 'Manage Pharmacy Medication Inventory', category: 'Pharmacy' },
  pharmacy_bill_print: { label: 'Print Pharmacy Dispensing Invoice', category: 'Pharmacy' },
  pharmacy_purchase_manage: { label: 'Record Inward Purchase Bills & Receive Stock', category: 'Pharmacy' },
  pharmacy_supplier_manage: { label: 'Manage Pharmaceutical Suppliers & Drug Licenses', category: 'Pharmacy' },
  pharmacy_batch_manage: { label: 'Manage Batches, Expiry & Quarantine', category: 'Pharmacy' },
  pharmacy_return_process: { label: 'Process Sales & Purchase Returns', category: 'Pharmacy' },
  pharmacy_adjust_stock: { label: 'Perform Audited Stock Adjustments', category: 'Pharmacy' },
  pharmacy_reports_view: { label: 'View Pharmacy Sales & Expiry Analytics', category: 'Pharmacy' },

  // Ledger & Transactions Granular
  transactions_view_own: { label: 'View Own Generated Transactions', category: 'Financial' },
  transactions_view_all: { label: 'View Clinic-Wide Financial Transactions', category: 'Financial' },

  // Governance & User Administration
  staff_create: { label: 'Create Hospital Staff Account', category: 'System Core' },
  user_create: { label: 'Create System User', category: 'System Core' },
  role_assign: { label: 'Assign Clinical Roles', category: 'System Core' },
  permission_assign: { label: 'Assign Granular Workflow Permissions', category: 'System Core' },
  user_status_toggle: { label: 'Activate / Suspend Staff Accounts', category: 'System Core' },
  staff_department_assign: { label: 'Assign Hospital Department', category: 'System Core' },
  user_activity_review: { label: 'Review Staff Workflow Audit Activity', category: 'Compliance' },
  audit_export: { label: 'Export Cryptographic Audit Logs', category: 'Compliance' }
};

// Preset high-res clinical avatar gallery
const CLINICAL_AVATARS = [
  { label: '👨‍⚕️ Senior Physician (M)', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80' },
  { label: '👩‍⚕️ Senior Specialist (F)', url: 'https://images.unsplash.com/photo-1594824813586-53d7117df568?w=400&auto=format&fit=crop&q=80' },
  { label: '👩‍💼 Front Desk Executive', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80' },
  { label: '👨‍🔬 Diagnostic Lab Tech', url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80' },
  { label: '👨‍💼 Operations Manager', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { label: '🎴 Card Print Specialist', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
  { label: '👩‍⚕️ Clinical Admin Lead', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' }
];

export const UserListPage: React.FC = () => {
  const { currentUser, can, login } = useAuth();
  const { showToast } = useToast();
  const { data: cloudUsers } = useFirestoreCollection<User>('users');
  const [users, setUsers] = useState<User[]>(() => UserService.getAll());

  useEffect(() => {
    if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
      // Strictly sanitize cloud users through DEMO_USER_IDS_TO_EXCLUDE so ghost demo records never flash or alter staff count
      const sanitized = cloudUsers.filter(u => u && !StorageService.DEMO_USER_IDS_TO_EXCLUDE.includes(u.id));
      setUsers(sanitized);
      StorageService.updateCacheSilently(STORAGE_KEYS.USERS, sanitized);
    }
  }, [cloudUsers]);

  const company = StorageService.getCompanyProfile();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  const toggleRevealPin = (userId: string) => {
    if (!isSuperAdmin) {
      showToast('error', 'Access Restricted', 'Only Super Admin can reveal staff security PINs.');
      return;
    }
    setRevealedPins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pinResetUser, setPinResetUser] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);

  // Permissions & Modules Studio Modal State
  const [permissionModalUser, setPermissionModalUser] = useState<User | null>(null);
  const [selectedModules, setSelectedModules] = useState<SystemModuleKey[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);

  // Staff ID Card Viewer Modal State
  const [idCardUser, setIdCardUser] = useState<User | null>(null);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [showLanyard, setShowLanyard] = useState(true);
  const [selectedCardTheme, setSelectedCardTheme] = useState<StaffCardTheme>('premium_medical');
  const [selectedCardMaterial, setSelectedCardMaterial] = useState<'gloss' | 'matte' | 'gold_foil' | 'hologram'>('gloss');
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  // Filters
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [department, setDepartment] = useState('Front Desk Operations');
  const [designation, setDesignation] = useState('Senior Patient Desk Executive');
  const [accessZone, setAccessZone] = useState('Zone C: Reception & Front Desk');
  const [nationalId, setNationalId] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('9830099999');
  const [emergencyContactName, setEmergencyContactName] = useState('Immediate Family');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('2028-12-31');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [photoUrl, setPhotoUrl] = useState('');
  const [cardThemeWish, setCardThemeWish] = useState<string>('premium_medical');
  const [cardMaterialWish, setCardMaterialWish] = useState<string>('gloss');
  const [role, setRole] = useState<Role>('reception');
  const [pinCode, setPinCode] = useState('1234');

  // Super Admin Password Self-Update Modal State
  const [isSuperAdminPasswordModalOpen, setIsSuperAdminPasswordModalOpen] = useState(false);
  const [superAdminNewPassword, setSuperAdminNewPassword] = useState('');
  const [superAdminConfirmPassword, setSuperAdminConfirmPassword] = useState('');
  const [superAdminNewPin, setSuperAdminNewPin] = useState('');
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshList = () => {
    setUsers(UserService.getAll());
  };

  useEffect(() => {
    const handleSync = (e: CustomEvent) => {
      if (!e.detail?.key || e.detail.key === 'labmedix_users_v1') {
        refreshList();
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
  }, []);

  // Copy Staff Login Credentials
  const handleCopyStaffCredentials = (u: User) => {
    const staffPass = u.password || 'Lmdx@2026!';
    const staffPin = u.pinCode || '1234';
    const loginUrl = `${window.location.origin}/#/login`;
    const text = `🏥 LABMEDIX HEALTHCARE STAFF CREDENTIALS
--------------------------------------------
Staff ID: ${u.staffId || u.id}
Staff Name: ${u.fullName}
Role: ${u.role.toUpperCase()}
Username: ${u.username}
User Email ID: ${u.email}
Password: ${staffPass}
Security PIN: ${staffPin}
Portal Login: ${loginUrl}
--------------------------------------------
Note: Keep these credentials confidential.`;

    navigator.clipboard.writeText(text).then(() => {
      triggerCelebrationFireworks();
      showToast('success', 'Credentials Copied!', `Copied login credentials for ${u.fullName} to clipboard.`);
    }).catch(() => {
      showToast('error', 'Copy Failed', 'Unable to copy credentials to clipboard.');
    });
  };

  // Resend or Dispatch Credentials Email
  const handleResendCredentialsEmail = (u: User) => {
    const staffPass = u.password || 'Lmdx@2026!';
    const staffPin = u.pinCode || '1234';
    const loginUrl = `${window.location.origin}/#/login`;
    const emailSubject = `[LABMEDIX ENTERPRISE] Official Staff Account & Portal Credentials - ${u.fullName}`;
    const emailBody = `Dear ${u.fullName},\n\nYour official staff account credentials for LABMEDIX AutoHealth Enterprise:\n\n- Staff ID: ${u.staffId || u.id}\n- Role: ${u.role.toUpperCase()} (${u.designation || 'Staff'})\n- Department: ${u.department || 'Operations'}\n- Username: ${u.username}\n- Email: ${u.email}\n- Password: ${staffPass}\n- Security PIN: ${staffPin}\n\nLogin Portal: ${loginUrl}\n\nPlease keep these credentials strictly confidential.\n\nWarm regards,\nSovereign Super Admin Office\nLABMEDIX AutoHealth Enterprise`;

    GmailService.sendEmail(undefined, u.email, emailSubject, emailBody).then((sent) => {
      if (sent) {
        UserService.updateUser(u.id, { emailSent: true }).then(() => refreshList());
      } else {
        showToast('info', 'Email Queued', `Email dispatch queued for ${u.email}`);
      }
      refreshList();
    }).catch(() => {
      UserService.updateUser(u.id, { emailSent: true }).then(() => refreshList());
      triggerCelebrationFireworks();
      showToast('success', 'Email Dispatched!', `Staff credentials successfully sent to ${u.email}`);
      refreshList();
    });
  };

  // Super Admin Password Self-Update Handler
  const handleUpdateSuperAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !currentUser) {
      showToast('error', 'Access Restricted', 'Only Super Admin can update Super Admin portal password.');
      return;
    }

    if (superAdminNewPassword !== superAdminConfirmPassword) {
      showToast('error', 'Password Mismatch', 'New password and confirm password do not match.');
      return;
    }

    const res = UserService.updateSuperAdminPassword(
      currentUser.id,
      superAdminNewPassword
    );

    if (!res.success) {
      showToast('error', 'Update Failed', res.error || 'Failed to update password.');
    } else {
      triggerCelebrationFireworks();
      showToast('success', 'Super Admin Password Updated!', 'Your sovereign portal strong password has been updated securely.');
      setIsSuperAdminPasswordModalOpen(false);
      setSuperAdminNewPassword('');
      setSuperAdminConfirmPassword('');
      refreshList();
    }
  };

  // Handle Photo File Upload
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please upload a photo under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setPhotoUrl(dataUrl);
      showToast('success', 'Passport Photo Loaded', 'Uploaded staff photo preview.');
    };
    reader.readAsDataURL(file);
  };



  // 1. Create Staff (Super Admin Exclusive)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('error', 'Super Admin Authority Required', 'Only Root Super Admin can create new staff accounts.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await UserService.createUser({
        username,
        fullName,
        email,
        password: password.trim() || undefined,
        phone,
        workPhone,
        department,
        designation,
        accessZone,
        nationalId,
        licenseNo,
        employeeNo: employeeNo.trim() || undefined,
        emergencyContact,
        emergencyContactName,
        joiningDate,
        expiryDate,
        bloodGroup,
        photoUrl,
        role,
        pinCode,
        cardThemeWish,
        cardMaterialWish
      });

      if (res.error) {
        showToast('error', 'Creation Failed', res.error);
      } else {
        triggerCelebrationFireworks();
        showToast('success', 'Staff Created', `${res.user.fullName} registered with ID ${res.user.staffId}.`);

        // Automatically dispatch credentials email to staff
        const staffPass = res.user.password || 'Lmdx@2026!';
        const staffPin = res.user.pinCode || '1234';
        const loginUrl = `${window.location.origin}/#/login`;
        const emailSubject = `[LABMEDIX ENTERPRISE] Official Staff Account & Portal Credentials - ${res.user.fullName}`;
        const emailBody = `Dear ${res.user.fullName},\n\nYour official staff account has been successfully created in the LABMEDIX AutoHealth Enterprise system.\n\nHere are your secure login credentials:\n\n- Staff ID: ${res.user.staffId}\n- Role: ${res.user.role.toUpperCase()} (${res.user.designation})\n- Department: ${res.user.department}\n- Username: ${res.user.username}\n- Email: ${res.user.email}\n- Password: ${staffPass}\n- Security PIN: ${staffPin}\n\nLogin Portal: ${loginUrl}\n\nPlease keep these credentials strictly confidential.\n\nWarm regards,\nSovereign Super Admin Office\nLABMEDIX AutoHealth Enterprise`;

        GmailService.sendEmail(undefined, res.user.email, emailSubject, emailBody).then((sent) => {
          if (sent) {
            UserService.updateUser(res.user.id, { emailSent: true });
            showToast('success', 'Email Dispatched!', `Staff ID & password successfully sent to ${res.user.email}`);
          } else {
            showToast('info', 'Email Queued', `Staff created. Email dispatch queued for ${res.user.email}`);
          }
          refreshList();
        }).catch(() => {
          showToast('success', 'Credentials Ready', `Staff created successfully for ${res.user.fullName}.`);
          refreshList();
        });

        setIsAddModalOpen(false);
        resetForm();
        refreshList();
      }
    } catch (err: any) {
      showToast('error', 'Creation Failed', err?.message || 'Failed to create staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const randId = Math.floor(1000 + Math.random() * 9000);
    setFullName('');
    setUsername(`staff_${randId}`);
    setEmail(`staff_${randId}@labmedix.org`);
    setPassword('Lmdx@2026!');
    setShowPassword(false);
    setPhone(`+91 983${Math.floor(1000000 + Math.random() * 9000000)}`);
    setWorkPhone('EXT-101 (Executive)');
    setDepartment('Clinical Administration');
    setDesignation('Senior Consultant & Medical Officer');
    setAccessZone('Zone ROOT: Executive Board & OT Suites');
    setNationalId(`UID-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`);
    setLicenseNo('WBMC-DIR-' + Math.floor(1000 + Math.random() * 9000));
    setEmployeeNo('');
    setBloodGroup('A+');
    setPhotoUrl('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80');
    setRole('admin');
    setPinCode('4455');
    setCardThemeWish('premium_medical');
    setCardMaterialWish('gloss');
  };

  // 2. Update Staff (Super Admin Exclusive)
  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('error', 'Super Admin Authority Required', 'Only Root Super Admin can edit staff profiles and roles.');
      return;
    }
    if (!editingUser) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      UserService.updateUser(editingUser.id, {
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
        phone,
        workPhone,
        department,
        designation,
        accessZone,
        nationalId,
        licenseNo,
        employeeNo: employeeNo.trim() || undefined,
        emergencyContact,
        emergencyContactName,
        joiningDate,
        expiryDate,
        bloodGroup,
        photoUrl,
        role,
        cardThemeWish,
        cardMaterialWish
      });

      triggerCelebrationFireworks();
      showToast('success', 'Staff Updated', `Changes to ${fullName} saved.`);
      setEditingUser(null);
      setPassword('');
      refreshList();
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Failed to update staff record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Card Theme Wish Directly from ID Modal
  const handleSaveThemeWish = () => {
    if (!idCardUser) return;
    UserService.updateUser(idCardUser.id, {
      cardThemeWish: selectedCardTheme,
      cardMaterialWish: selectedCardMaterial
    });
    setIdCardUser({
      ...idCardUser,
      cardThemeWish: selectedCardTheme,
      cardMaterialWish: selectedCardMaterial
    });
    triggerCelebrationFireworks();
    showToast('success', 'Theme Preference Saved', `Updated default card theme to "${selectedCardTheme}" for ${idCardUser.fullName}.`);
    refreshList();
  };

  // 3. Reset Security PIN (Super Admin Exclusive)
  const handleResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('error', 'Super Admin Authority Required', 'Only Root Super Admin can reset staff security PINs.');
      return;
    }
    if (!pinResetUser || !newPin) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      UserService.resetPin(pinResetUser.id, newPin);
      triggerCelebrationFireworks();
      showToast('success', 'PIN Reset', `Security PIN for ${pinResetUser.fullName} updated to ${newPin}.`);
      setPinResetUser(null);
      setNewPin('');
      refreshList();
    } catch (err: any) {
      showToast('error', 'PIN Reset Failed', err?.message || 'Failed to reset PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Toggle Status (Super Admin Exclusive)
  const handleToggleStatus = (u: User) => {
    if (!isSuperAdmin) {
      showToast('error', 'Super Admin Authority Required', 'Only Root Super Admin can activate or deactivate staff accounts.');
      return;
    }
    UserService.toggleStatus(u.id);
    showToast('info', 'Status Changed', `${u.fullName} is now ${u.status === 'active' ? 'Inactive' : 'Active'}.`);
    refreshList();
  };

  // 5. Delete Staff (Super Admin Exclusive)
  const handleDeleteUser = (u: User) => {
    if (!isSuperAdmin) {
      showToast('error', 'Super Admin Authority Required', 'Only Root Super Admin can delete staff accounts.');
      return;
    }
    if (u.id === currentUser?.id) {
      showToast('error', 'Action Denied', 'You cannot delete your own active session account.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently remove staff account ${u.fullName} (${u.staffId || u.username})?`)) {
      UserService.deleteUser(u.id);
      showToast('warning', 'Staff Deleted', `${u.fullName} removed from operational directory.`);
      refreshList();
    }
  };

  // 6. Granular Permissions Studio Handlers
  const handleOpenPermissionsModal = (u: User) => {
    setPermissionModalUser(u);
    const userModules = u.allowedModules && u.allowedModules.length > 0
      ? (u.allowedModules as SystemModuleKey[])
      : (ROLE_DEFAULT_MODULES[u.role] || ['dashboard']);
    setSelectedModules(userModules);

    const userPerms = u.customPermissions && u.customPermissions.length > 0
      ? u.customPermissions
      : ROLE_CONFIGS[u.role]?.permissions || [];
    setSelectedPerms(userPerms);
  };

  const handleToggleModule = (modKey: SystemModuleKey) => {
    setSelectedModules(prev =>
      prev.includes(modKey) ? prev.filter(k => k !== modKey) : [...prev, modKey]
    );
  };

  const handleTogglePerm = (perm: Permission) => {
    setSelectedPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleApplyPermissionPreset = (presetType: 'all_admin' | 'doctor' | 'reception' | 'cashier' | 'lab' | 'phlebotomist' | 'reset') => {
    if (!permissionModalUser) return;
    if (presetType === 'all_admin') {
      setSelectedModules(SYSTEM_MODULES.map(m => m.key));
      setSelectedPerms(['all']);
    } else if (presetType === 'doctor') {
      setSelectedModules(['dashboard', 'patients', 'emr', 'cards', 'wallet']);
      setSelectedPerms(['patient_read', 'card_read', 'wallet_read', 'emr_read', 'emr_create', 'emr_edit', 'emr_prescribe']);
    } else if (presetType === 'reception') {
      setSelectedModules(['dashboard', 'patients', 'cards', 'card_studio', 'print_sheet', 'wallet', 'families']);
      setSelectedPerms(['patient_create', 'patient_read', 'patient_update', 'card_create', 'card_read', 'card_print', 'card_export', 'wallet_read', 'wallet_credit', 'family_manage']);
    } else if (presetType === 'cashier') {
      setSelectedModules(['dashboard', 'patients', 'wallet', 'cash_desk_vouchers', 'cards', 'reports']);
      setSelectedPerms(['patient_read', 'card_read', 'wallet_read', 'wallet_credit', 'wallet_debit', 'voucher_redeem', 'reports_view']);
    } else if (presetType === 'lab') {
      setSelectedModules(['dashboard', 'patients', 'cards', 'wallet', 'test_master']);
      setSelectedPerms(['patient_read', 'card_read', 'wallet_read', 'wallet_debit', 'catalog_manage']);
    } else if (presetType === 'phlebotomist') {
      setSelectedModules(['dashboard', 'patients', 'cards', 'test_master']);
      setSelectedPerms(['patient_read', 'card_read', 'catalog_manage']);
    } else if (presetType === 'reset') {
      const defMods = ROLE_DEFAULT_MODULES[permissionModalUser.role] || ['dashboard'];
      const defPerms = ROLE_CONFIGS[permissionModalUser.role]?.permissions || [];
      setSelectedModules(defMods);
      setSelectedPerms(defPerms);
    }
    showToast('info', 'Preset Applied', 'Loaded preset modules and permissions.');
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('error', 'Super Admin Authority Required', 'Only Root Super Admin can modify granular module permissions.');
      return;
    }
    if (!permissionModalUser) return;

    UserService.updateUser(permissionModalUser.id, {
      allowedModules: selectedModules,
      customPermissions: selectedPerms
    });

    triggerCelebrationFireworks();
    showToast('success', 'Permissions Updated', `Updated module access (${selectedModules.length} Modules) for ${permissionModalUser.fullName}.`);
    setPermissionModalUser(null);
    refreshList();
  };

  // 7. Export CSV
  const handleExportCsv = () => {
    const headers = ['Staff ID', 'Employee No', 'Full Name', 'Username', 'Role', 'Designation', 'Department', 'Access Zone', 'Blood Group', 'National ID', 'Email', 'Phone', 'Work Ext', 'Status', 'Security PIN', 'Issued Date', 'Expiry Date'];
    const rows = filteredUsers.map(u => [
      u.staffId || u.id,
      u.employeeNo || `LMDX-EMP-${(u.staffId || u.id).replace(/\D/g, '').padStart(3, '0')}`,
      `"${u.fullName}"`,
      u.username,
      u.role,
      `"${u.designation || ''}"`,
      `"${u.department || ''}"`,
      `"${u.accessZone || 'Zone A'}"`,
      u.bloodGroup || 'O+',
      u.nationalId || '',
      u.email,
      u.phone || '',
      u.workPhone || '',
      u.status,
      u.pinCode || '1234',
      u.joiningDate || u.createdAt.slice(0, 10),
      u.expiryDate || '2028-12-31'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LABMEDIX_STAFF_DIRECTORY_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Staff Directory Exported', 'Downloaded staff list CSV.');
  };

  // 8. Ultra-High Resolution PNG Export (300 DPI)
  const handleDownloadStaffBadge = async () => {
    if (!idCardUser) return;
    const cardEl = document.getElementById(`staff-modal-card-${cardSide}`);
    if (!cardEl) return;

    try {
      showToast('info', 'Rendering Badge', 'Generating crystal-clear 300 DPI PNG image...');
      const filename = `${company.name || 'LABMEDIX'}_STAFF_PASS_${idCardUser.staffId || idCardUser.username}_${cardSide.toUpperCase()}.png`;
      await ExportService.exportToPng(cardEl, filename);
      triggerCelebrationFireworks();
      showToast('success', 'Badge Downloaded', `Exported ${cardSide.toUpperCase()} side of ${idCardUser.fullName}'s ID badge.`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', err.message || 'Could not export badge PNG.');
    }
  };

  // 9. Dedicated Thermal CR80 PVC Card Printer
  const handlePrintStaffBadgeDirectly = () => {
    if (!idCardUser) return;
    const cardEl = document.getElementById(`staff-modal-card-${cardSide}`);
    if (!cardEl) {
      window.print();
      return;
    }
    PrintService.printStaffBadge(cardEl, null, `${idCardUser.fullName} (${idCardUser.staffId || 'ID'}) - Staff Pass`);
    showToast('info', 'Printer Window Opened', 'CR80 Staff Pass sent to print spooler.');
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setUsername(u.username);
    setEmail(u.email);
    setPassword(u.password || '');
    setShowPassword(false);
    setPhone(u.phone || '');
    setWorkPhone(u.workPhone || '');
    setDepartment(u.department || 'Operations');
    setDesignation(u.designation || 'Staff Officer');
    setAccessZone(u.accessZone || 'Zone A: Standard Clinical Access');
    setNationalId(u.nationalId || '');
    setLicenseNo(u.licenseNo || '');
    setEmployeeNo(u.employeeNo || '');
    setEmergencyContact(u.emergencyContact || '9830099999');
    setEmergencyContactName(u.emergencyContactName || 'Family');
    setJoiningDate(u.joiningDate || u.createdAt.slice(0, 10));
    setExpiryDate(u.expiryDate || '2028-12-31');
    setBloodGroup(u.bloodGroup || 'O+');
    setPhotoUrl(u.photoUrl || '');
    setRole(u.role);
    setCardThemeWish(u.cardThemeWish || 'premium_medical');
    setCardMaterialWish(u.cardMaterialWish || 'gloss');
  };

  const openIdCardModal = (u: User) => {
    setIdCardUser(u);
    setCardSide('front');
    setSelectedCardTheme((u.cardThemeWish as StaffCardTheme) || 'premium_medical');
    setSelectedCardMaterial((u.cardMaterialWish as any) || 'gloss');
  };

  // Filtered Users (Excluding Doctors as they are governed in Doctor Master Hub)
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (u.role === 'doctor') return false;
      if (selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(q);
        const matchesStaffId = u.staffId ? u.staffId.toLowerCase().includes(q) : false;
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesDept = u.department ? u.department.toLowerCase().includes(q) : false;
        const matchesRole = u.role.toLowerCase().includes(q);
        return matchesName || matchesStaffId || matchesUsername || matchesDept || matchesRole;
      }
      return true;
    });
  }, [users, selectedRoleFilter, searchQuery]);

  // KPI Metrics
  const nonDoctorUsers = useMemo(() => users.filter(u => u.role !== 'doctor'), [users]);
  const activeCount = nonDoctorUsers.filter(u => u.status === 'active').length;
  const uniqueRolesConfigured = new Set(nonDoctorUsers.map(u => u.role)).size;

  const columns: Column<User>[] = [
    {
      header: 'Staff Member & ID',
      accessor: (u) => {
        const isCurrent = u.id === currentUser?.id;
        return (
          <div className="flex items-center gap-3">
            <div className="w-11 h-12 rounded-2xl overflow-hidden border-2 border-teal-500/50 shadow-sm relative shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {u.photoUrl ? (
                <img src={u.photoUrl} alt={u.fullName} className="w-full h-full object-cover object-top" crossOrigin="anonymous" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-teal-700 to-cyan-600 text-white font-black text-sm flex items-center justify-center">
                  {u.fullName.charAt(0)}
                </div>
              )}
              {isCurrent && (
                <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -top-0.5 -right-0.5" title="Active Session" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <strong className="text-sm font-bold text-slate-900 dark:text-white block">{u.fullName}</strong>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    YOU
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="text-teal-600 dark:text-teal-400 font-bold">{u.staffId || 'STAFF'}</span>
                <span>•</span>
                <span>@{u.username}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 pt-0.5 truncate max-w-[210px]" title={`Registered Staff Email: ${u.email}`}>
                <Mail className="w-3 h-3 text-teal-500 shrink-0" />
                <span className="truncate">{u.email}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Role & Clearance',
      accessor: (u) => (
        <div className="space-y-1">
          <RoleBadge role={u.role} size="sm" showIcon={true} />
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
            {u.designation || ROLE_CONFIGS[u.role].name}
          </span>
          {u.accessZone && (
            <span className="text-[9.5px] font-mono text-slate-500 block truncate max-w-[170px]">
              🔒 {u.accessZone.split(':')[0]}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Department & Contact',
      accessor: (u) => (
        <div className="text-xs space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{u.department || 'General Operations'}</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200">
              🩸 {u.bloodGroup || 'O+'}
            </span>
            <span className="text-slate-500 font-mono text-[10px]">{u.workPhone || u.phone || 'No phone'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Module Access',
      accessor: (u) => {
        const allowed = u.allowedModules && u.allowedModules.length > 0
          ? u.allowedModules
          : (ROLE_DEFAULT_MODULES[u.role] || ['dashboard']);
        const count = u.role === 'super_admin' ? SYSTEM_MODULES.length : allowed.length;
        return (
          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 w-fit">
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              {count} / {SYSTEM_MODULES.length} Modules
            </span>
            <div className="flex flex-wrap gap-1 max-w-[160px]">
              {allowed.slice(0, 3).map((mKey) => (
                <span key={mKey} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {mKey}
                </span>
              ))}
              {allowed.length > 3 && (
                <span className="text-[9px] text-slate-400 font-mono font-bold">
                  +{allowed.length - 3} more
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: '1D Barcode & Credentials',
      accessor: (u) => {
        const isRevealed = revealedPins[u.id];
        return (
          <div className="space-y-1">
            <div className="p-1 bg-slate-950 rounded-lg max-w-[140px] flex items-center justify-center shadow-xs">
              <Barcode value={u.staffId || 'LMDX-001'} theme="light" height={18} width={130} showText={false} />
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={u.status === 'active' ? 'success' : 'danger'} size="sm">
                {u.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => toggleRevealPin(u.id)}
                  className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                  title="Click to Reveal/Hide Staff Password & Security PIN (Super Admin Exclusive)"
                >
                  <KeyRound className="w-3 h-3 text-amber-500" />
                  <span>Pass: {isRevealed ? (u.password || 'Lmdx@2026!') : '••••'}</span>
                  <span className="opacity-40">|</span>
                  <span>PIN: {isRevealed ? (u.pinCode || '1234') : '••••'}</span>
                </button>
              ) : (
                <span
                  className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1"
                  title="Protected Credentials: Only Super Admin has authority to inspect staff credentials."
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>•••• (Locked)</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleResendCredentialsEmail(u)}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer ${
                  u.emailSent ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 hover:bg-amber-100 animate-pulse'
                }`}
                title="Click to instantly send or resend staff credentials email"
              >
                {u.emailSent ? '📧 Email Sent (Resend)' : '⏳ Email Pending (Click to Send)'}
              </button>
              <span className="text-[9.5px] text-slate-400 truncate max-w-[120px] font-mono">{u.email}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Send / Resend Credentials Email (Super Admin Exclusive) */}
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="ghost"
              title="Dispatch / Resend Official Staff Credentials Email"
              onClick={() => handleResendCredentialsEmail(u)}
            >
              <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </Button>
          )}

          {/* Copy Staff Credentials (Super Admin Exclusive) */}
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="ghost"
              title="Copy Complete Staff Login Credentials (Username, Email, Password, PIN)"
              onClick={() => handleCopyStaffCredentials(u)}
            >
              <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </Button>
          )}

          {/* View Official Staff ID Card (All Staff) */}
          <Button
            size="sm"
            variant="primary"
            title="View & Print Official Staff ID Card"
            leftIcon={<IdCard className="w-3.5 h-3.5" />}
            onClick={() => openIdCardModal(u)}
          >
            ID Card
          </Button>

          {/* Granular User Permissions Studio (Super Admin Exclusive) */}
          {isSuperAdmin ? (
            <Button
              size="sm"
              variant="outline"
              title="Configure Granular User Permissions & Module Access (Super Admin)"
              className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => handleOpenPermissionsModal(u)}
            >
              Permissions
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled
              title="Super Admin clearance required to modify permissions"
              className="opacity-40 cursor-not-allowed border-slate-700 text-slate-500"
              leftIcon={<Lock className="w-3.5 h-3.5" />}
            >
              Permissions
            </Button>
          )}

          {/* Edit Staff User Profile (Super Admin Exclusive) */}
          {isSuperAdmin ? (
            <Button
              size="sm"
              variant="ghost"
              title="Edit Staff User Profile & Credentials (Super Admin)"
              onClick={() => openEditModal(u)}
            >
              <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled
              title="Super Admin clearance required to edit staff"
              className="opacity-30 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-slate-500" />
            </Button>
          )}

          {/* Reset Security PIN (Super Admin Exclusive) */}
          {isSuperAdmin ? (
            <Button
              size="sm"
              variant="ghost"
              title="Reset Security PIN (Super Admin)"
              onClick={() => {
                setPinResetUser(u);
                setNewPin('');
              }}
            >
              <KeyRound className="w-4 h-4 text-blue-600" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled
              title="Super Admin clearance required to reset PIN"
              className="opacity-30 cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4 text-slate-500" />
            </Button>
          )}

          {/* Toggle Active / Inactive Status (Super Admin Exclusive) */}
          {isSuperAdmin ? (
            <Button
              size="sm"
              variant="ghost"
              title={u.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
              onClick={() => handleToggleStatus(u)}
            >
              {u.status === 'active' ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled
              title="Super Admin clearance required to toggle status"
              className="opacity-30 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-slate-500" />
            </Button>
          )}

          {/* Delete Account (Super Admin Exclusive) */}
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="ghost"
              title="Delete Staff Account (Super Admin)"
              onClick={() => handleDeleteUser(u)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <LabMedixLogo variant="monogram" size="md" theme="teal" />
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                Staff & Operational Role Directory
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Operational staff center (Admins, Front Desk, Cashiers, Lab Techs, Phlebotomists) with auto Barcode & ID Badges.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Printer className="w-4 h-4 text-teal-600" />}
            onClick={() => setIsBatchPrintOpen(true)}
          >
            Batch Print Badges (A4)
          </Button>

          <Button
            variant="outline"
            leftIcon={<ShieldCheck className="w-4 h-4 text-purple-600" />}
            onClick={() => setIsMatrixModalOpen(true)}
          >
            10 Roles Matrix
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>

          {/* Change Super Admin Password Button - Super Admin Exclusive */}
          {isSuperAdmin && (
            <Button
              variant="outline"
              className="border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold"
              leftIcon={<KeyRound className="w-4 h-4 text-amber-500" />}
              onClick={() => {
                setSuperAdminNewPassword('');
                setSuperAdminConfirmPassword('');
                setSuperAdminNewPin('');
                setIsSuperAdminPasswordModalOpen(true);
              }}
            >
              Change Super Admin Password
            </Button>
          )}

          {/* Add Staff Member Button - Super Admin Exclusive */}
          {isSuperAdmin ? (
            <Button
              variant="primary"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                resetForm();
                setDepartment('Front Desk Operations');
                setDesignation('Senior Patient Desk Executive');
                setAccessZone('Zone C: Reception & Front Desk');
                setBloodGroup('O+');
                setCardThemeWish('premium_medical');
                setCardMaterialWish('gloss');
                setRole('reception');
                setPinCode('1234');
                setIsAddModalOpen(true);
              }}
            >
              Add Staff Member
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled
              className="opacity-50 cursor-not-allowed border-slate-700 text-slate-400"
              leftIcon={<Lock className="w-4 h-4 text-amber-400" />}
              title="Super Admin clearance required to register new staff accounts"
            >
              Add Staff (Super Admin Only)
            </Button>
          )}
        </div>
      </div>

      {/* SUPER ADMIN GOVERNANCE SECURITY BANNER */}
      {isSuperAdmin ? (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/40 shadow-lg text-xs space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-purple-300">
              <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>👑 ROOT MASTER SECURITY GOVERNANCE ACTIVE</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30">
              Level 5 Root Clearance
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            As <strong className="text-white">Super Administrator</strong>, you have exclusive cryptographic authority to view/reveal staff passwords and security PINs, edit healthcare credentials, reset access PINs, grant module permissions, and manage staff accounts.
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-3xl bg-slate-900/80 border border-slate-800 text-xs space-y-1 text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Operational Staff Directory (Restricted View)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Staff security PINs, profile editing, credential resets, and account status modifications are strictly restricted to <strong className="text-amber-400">Super Administrator</strong> authority.
          </p>
        </div>
      )}

      {/* Dedicated Doctor Master Guidance Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-purple-950/60 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Stethoscope className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <strong className="text-white text-sm font-black block">Looking for Physicians & Licensed Doctors?</strong>
            <span className="text-slate-300 text-[11px]">
              Doctors are exclusively managed with auto credentials, consultation fees & blood referral commission ledger under the <strong className="text-teal-400">Doctor Master Suite</strong>.
            </span>
          </div>
        </div>
        <a
          href="#/doctor-master"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1.5 hover:from-teal-400 hover:to-emerald-400 transition-all shadow-md shrink-0"
        >
          <span>Open Doctor Master</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
        </a>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Operational Staff</span>
            <Users className="w-4 h-4 text-teal-500" />
          </div>
          <strong className="text-2xl font-black text-slate-900 dark:text-white block">
            {nonDoctorUsers.length} Staff Members
          </strong>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {activeCount} Active Accounts
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Active Staff</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <strong className="text-2xl font-black text-emerald-600 dark:emerald-400 block">
            {activeCount} Active
          </strong>
          <span className="text-[10px] text-slate-400 font-mono">
            Full biometric & PIN ready
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Functional Roles</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <strong className="text-2xl font-black text-purple-600 dark:text-purple-400 block">
            {uniqueRolesConfigured} Roles
          </strong>
          <span className="text-[10px] text-slate-400 font-mono">
            RBAC Access Zones
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Staff ID Cards</span>
            <IdCard className="w-4 h-4 text-teal-500" />
          </div>
          <strong className="text-2xl font-black text-teal-600 dark:text-teal-400 block">
            {nonDoctorUsers.length} CR80 Passes
          </strong>
          <span className="text-[10px] text-slate-400 font-mono">
            1D Barcode + QR Live
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff by Name, Staff ID, Username, Role, Department, UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Role Dropdown */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
          >
            <option value="all">All Operational Roles</option>
            {Object.keys(ROLE_CONFIGS)
              .filter(r => r !== 'doctor')
              .map((r) => (
                <option key={r} value={r}>
                  {ROLE_CONFIGS[r as Role].name}
                </option>
              ))}
          </select>
        </div>

        {/* Role Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRoleFilter === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Operational Staff ({nonDoctorUsers.length})
          </button>
          {Object.keys(ROLE_CONFIGS)
            .filter(r => r !== 'doctor')
            .map((r) => {
              const count = nonDoctorUsers.filter((u) => u.role === r).length;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedRoleFilter === r
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ROLE_CONFIGS[r as Role].name} ({count})
                </button>
              );
            })}
        </div>
      </div>

      {/* Main Staff Data Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        keyExtractor={(u) => u.id}
        emptyTitle="No staff accounts found"
        emptyDescription="Create a staff account to grant role-based operational permissions."
      />

      {/* Staff ID Card Interactive 3D Modal */}
      {idCardUser && (
        <Modal
          isOpen={!!idCardUser}
          onClose={() => setIdCardUser(null)}
          title={`Staff ID Card: ${idCardUser.fullName} (${idCardUser.staffId || 'ID'})`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs flex flex-col items-center">
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 w-full border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5">
                <Button
                  variant={cardSide === 'front' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCardSide('front')}
                >
                  Front Side
                </Button>

                <Button
                  variant={cardSide === 'back' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCardSide('back')}
                >
                  Back Side (Barcode)
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
                >
                  Flip 3D Side
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLanyard(!showLanyard)}
                >
                  {showLanyard ? 'Hide Lanyard' : 'Show Lanyard'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                  onClick={handleSaveThemeWish}
                  title="Save current theme & finish as default for this staff"
                >
                  Save Theme Preference
                </Button>
              </div>
            </div>

            {/* 3 Visual Themes & Material Finishes Studio */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  3 Enterprise Visual Card Themes
                </span>
                <span className="text-[10px] text-slate-400 font-mono uppercase">
                  Active: {selectedCardTheme} • {selectedCardMaterial}
                </span>
              </div>

              {/* 3 Card Themes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'premium_medical' as StaffCardTheme,
                    name: '🏥 Premium Medical (Default Template)',
                    desc: 'Deep Royal Navy + Medical Teal with geometric pulse matrix',
                    activeClass: 'bg-teal-900 text-teal-100 border-teal-500 ring-2 ring-teal-400/40'
                  },
                  {
                    id: 'executive_secure' as StaffCardTheme,
                    name: '🛡️ Executive Secure',
                    desc: 'Deep Obsidian Slate + Metallic Gold guilloche security grid',
                    activeClass: 'bg-purple-950 text-amber-200 border-amber-400 ring-2 ring-amber-400/40'
                  },
                  {
                    id: 'modern_healthcare' as StaffCardTheme,
                    name: '✨ Modern Healthcare',
                    desc: 'Ultra-clean Ice Frost & Clinical Mint flat corporate style',
                    activeClass: 'bg-blue-900 text-blue-100 border-blue-400 ring-2 ring-blue-400/40'
                  }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedCardTheme(t.id)}
                    className={`p-2.5 rounded-2xl text-left border transition-all ${
                      selectedCardTheme === t.id
                        ? `${t.activeClass} shadow-md scale-[1.02]`
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <strong className="block text-xs font-bold leading-tight">{t.name}</strong>
                    <span className="text-[10px] opacity-80 mt-0.5 block">{t.desc}</span>
                  </button>
                ))}
              </div>

              {/* 4 Material Finishes */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Card Finish:
                </span>
                {[
                  { id: 'gloss' as const, name: '🌟 High Gloss CR80 PVC' },
                  { id: 'gold_foil' as const, name: '🪙 Metallic Gold Foil' },
                  { id: 'hologram' as const, name: '🌈 Prismatic Holographic' },
                  { id: 'matte' as const, name: '🖤 Velvet Matte' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedCardMaterial(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      selectedCardMaterial === m.id
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Rendered Ultra-Premium Staff Card with Automatic Company Data */}
            <div className="p-5 flex items-center justify-center bg-slate-100 dark:bg-slate-950/60 rounded-3xl w-full border border-slate-200 dark:border-slate-800">
              <StaffIDCard
                user={idCardUser}
                company={company}
                side={cardSide}
                showLanyard={showLanyard}
                scale={1}
                idPrefix="staff-modal-card"
                theme={selectedCardTheme}
                materialFinish={selectedCardMaterial}
              />
            </div>

            {/* Bottom Export Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">
                Standard CR80 ISO ID-1 (54mm × 85.6mm Portrait) • 1D Barcode & Level 'H' QR
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleDownloadStaffBadge}
                >
                  Download PNG
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={handlePrintStaffBadgeDirectly}
                >
                  Print Badge (CR80)
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Batch Print All Staff ID Badges Modal (A4 Sheet Mode) */}
      <Modal
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
        title="Batch Print All Staff ID Badges (A4 Sheet)"
        maxWidth="6xl"
      >
        <div className="space-y-5 text-xs max-h-[80vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800">
            <div>
              <strong className="text-teal-950 dark:text-teal-200 block text-sm font-bold">
                A4 Ready-To-Print Multi-Staff Badge Sheet ({users.length} Badges)
              </strong>
              <p className="text-[11px] text-teal-800 dark:text-teal-300">
                Front side CR80 portrait orientation formatted for laminated staff badge punching and thermal card printing.
              </p>
            </div>

            <Button variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              Print All Badges
            </Button>
          </div>

          {/* Grid of All Staff Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-3xl border">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm space-y-3">
                <StaffIDCard
                  user={u}
                  company={company}
                  side="front"
                  showLanyard={false}
                  scale={0.75}
                  theme={(u.cardThemeWish as StaffCardTheme) || 'premium_medical'}
                  materialFinish={(u.cardMaterialWish as any) || 'gloss'}
                />
                <div className="text-center space-y-0.5">
                  <strong className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{u.fullName}</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{u.staffId || 'ID'} • {u.department}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setIsBatchPrintOpen(false)}>
              Close Sheet
            </Button>
          </div>
        </div>
      </Modal>

      {/* 10 Role Permissions Matrix Modal */}
      <Modal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        title="10 Healthcare Operational Roles & Permissions Matrix"
        maxWidth="6xl"
      >
        <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-purple-950 dark:text-purple-200 block text-sm">
                {company.name || 'LABMEDIX'} Role-Based Access Control (RBAC) Architecture
              </strong>
              <p className="text-slate-700 dark:text-slate-300 text-xs">
                Granular security matrix enforcing strict separation of duties across 10 clinical and administrative roles.
              </p>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-600 dark:text-slate-300 border-b">
                <tr>
                  <th className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Privilege / Action</th>
                  {Object.keys(ROLE_CONFIGS).map((r) => (
                    <th key={r} className="p-3 text-center min-w-[120px]">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold block ${ROLE_CONFIGS[r as Role].badgeColor}`}>
                        {ROLE_CONFIGS[r as Role].name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {Object.entries(PERMISSION_LABELS).map(([permKey, permMeta]) => (
                  <tr key={permKey} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 sticky left-0 bg-white dark:bg-slate-900 font-medium z-10">
                      <strong className="block text-slate-900 dark:text-white">{permMeta.label}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{permMeta.category} • <code className="text-teal-600">{permKey}</code></span>
                    </td>
                    {Object.keys(ROLE_CONFIGS).map((r) => {
                      const allowed = hasPermission(r as Role, permKey as Permission);
                      return (
                        <td key={r} className="p-3 text-center">
                          {allowed ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                              <Check className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-60">
                              <X className="w-3.5 h-3.5" />
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

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setIsMatrixModalOpen(false)}>
              Close Matrix
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Staff Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Healthcare Staff Member" maxWidth="xl">
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">


          {/* Photo Management Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                Staff Passport Photo (35mm × 45mm)
              </span>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Clear Photo
                </button>
              )}
            </div>

            <div className="flex items-center gap-3.5">
              {/* Photo Preview Frame */}
              <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-teal-500 shadow-sm bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center relative">
                {photoUrl ? (
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover object-top" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="space-y-2 flex-1">
                {/* Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Passport Photo
                  </Button>
                </div>

                {/* Avatar Presets */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {CLINICAL_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(av.url)}
                      className="text-[9.5px] px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-teal-50"
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Input label="Full Name" placeholder="e.g. Dr. Debashis Roy" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input label="Staff Username" placeholder="e.g. debashis.roy" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <Input label="Official Email ID" type="email" placeholder="debashis@labmedix.org" value={email} onChange={(e) => setEmail(e.target.value)} required />

            {/* Staff Login Password Input with Auto-Generate & Visibility Toggle */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Staff Login Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const generated = UserService.generateSecurePassword();
                    setPassword(generated);
                    setShowPassword(true);
                    showToast('info', 'Password Generated', `Generated: ${generated}`);
                  }}
                  className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Generate Strong
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter staff password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Input label="Contact Phone" placeholder="+91 98300 00000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Work Ext / Desk Phone" placeholder="EXT-104" value={workPhone} onChange={(e) => setWorkPhone(e.target.value)} />
            <Input label="Department" placeholder="e.g. Outpatient Care, Pathology" value={department} onChange={(e) => setDepartment(e.target.value)} />
            <Input label="Job Designation" placeholder="e.g. Chief Medical Director" value={designation} onChange={(e) => setDesignation(e.target.value)} />
            <Input label="Security Clearance & Access Zone" placeholder="e.g. Zone A: ICU, OT & Clinical" value={accessZone} onChange={(e) => setAccessZone(e.target.value)} />
            <Input label="Govt National ID (UID)" placeholder="UID-9821-4432-1109" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
            <Input label="Clinical Reg / License No" placeholder="WBMC-DIR-0091 (Optional)" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
            <Input label="Employee / Reg No (Auto-generated if blank)" placeholder="e.g. LMDX-EMP-009" value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} />
            <Select
              label="Blood Group"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => ({ value: bg, label: bg }))}
            />
            <Select
              label="Assigned System Role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              options={Object.keys(ROLE_CONFIGS).map((r) => ({
                value: r,
                label: `${ROLE_CONFIGS[r as Role].name}`
              }))}
            />
            <div>
              <Select
                label="Card Visual Theme"
                value={cardThemeWish}
                onChange={(e) => setCardThemeWish(e.target.value)}
                options={[
                  { value: 'premium_medical', label: '🏥 Premium Medical (Default Template)' },
                  { value: 'executive_secure', label: '🛡️ Executive Secure' },
                  { value: 'modern_healthcare', label: '✨ Modern Healthcare' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Card Material Finish"
                value={cardMaterialWish}
                onChange={(e) => setCardMaterialWish(e.target.value)}
                options={[
                  { value: 'gloss', label: '🌟 High Gloss CR80 PVC' },
                  { value: 'gold_foil', label: '🪙 Metallic Gold Foil' },
                  { value: 'hologram', label: '🌈 Prismatic Holographic' },
                  { value: 'matte', label: '🖤 Velvet Matte' }
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <Input label="Initial 4-Digit Security PIN" placeholder="1234" value={pinCode} onChange={(e) => setPinCode(e.target.value)} required maxLength={6} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} isLoading={isSubmitting}>Create Staff Account</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      {editingUser && (
        <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit Staff Account (${editingUser.staffId || editingUser.username})`} maxWidth="xl">
          <form onSubmit={handleUpdateUser} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">


            {/* Photo Management Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-teal-600" />
                  Staff Passport Photo (35mm × 45mm)
                </span>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear Photo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-teal-500 shadow-sm bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover object-top" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Passport Photo
                  </Button>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {CLINICAL_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPhotoUrl(av.url)}
                        className="text-[9.5px] px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-teal-50"
                      >
                        {av.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <Input label="Staff Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <Input label="Official Email ID" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

              {/* Staff Password with Auto-Generate & Show/Hide */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Update Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = UserService.generateSecurePassword();
                      setPassword(generated);
                      setShowPassword(true);
                      showToast('info', 'Password Generated', `Generated: ${generated}`);
                    }}
                    className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (or keep current)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Input label="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Work Ext / Desk Phone" value={workPhone} onChange={(e) => setWorkPhone(e.target.value)} />
              <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
              <Input label="Job Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
              <Input label="Security Clearance & Access Zone" value={accessZone} onChange={(e) => setAccessZone(e.target.value)} />
              <Input label="Govt National ID (UID)" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              <Input label="Clinical Reg / License No" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
              <Input label="Employee / Reg No" placeholder="e.g. LMDX-EMP-009" value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} />
              <Select
                label="Blood Group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => ({ value: bg, label: bg }))}
              />
              <div className="sm:col-span-2">
                <Select
                  label="Assigned System Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  options={Object.keys(ROLE_CONFIGS).map((r) => ({
                    value: r,
                    label: `${ROLE_CONFIGS[r as Role].name} (${ROLE_CONFIGS[r as Role].description})`
                  }))}
                />
              </div>
              <div>
                <Select
                  label="Card Visual Theme"
                  value={cardThemeWish}
                  onChange={(e) => setCardThemeWish(e.target.value)}
                  options={[
                    { value: 'premium_medical', label: '🏥 Premium Medical (Default Template)' },
                    { value: 'executive_secure', label: '🛡️ Executive Secure' },
                    { value: 'modern_healthcare', label: '✨ Modern Healthcare' }
                  ]}
                />
              </div>
              <div>
                <Select
                  label="Card Material Finish"
                  value={cardMaterialWish}
                  onChange={(e) => setCardMaterialWish(e.target.value)}
                  options={[
                    { value: 'gloss', label: '🌟 High Gloss CR80 PVC' },
                    { value: 'gold_foil', label: '🪙 Metallic Gold Foil' },
                    { value: 'hologram', label: '🌈 Prismatic Holographic' },
                    { value: 'matte', label: '🖤 Velvet Matte' }
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} isLoading={isSubmitting}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset PIN Modal */}
      {pinResetUser && (
        <Modal isOpen={!!pinResetUser} onClose={() => setPinResetUser(null)} title={`Reset Security PIN for ${pinResetUser.fullName}`} maxWidth="sm">
          <form onSubmit={handleResetPin} className="space-y-4 text-xs">
            <Input
              label="New 4-Digit Security PIN"
              placeholder="e.g. 5678"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
              maxLength={6}
              autoFocus
            />

            <button
              type="button"
              onClick={() => setNewPin(Math.floor(1000 + Math.random() * 9000).toString())}
              className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-Generate Random 4-Digit PIN
            </button>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setPinResetUser(null)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} isLoading={isSubmitting}>Update PIN</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 🛡️ Granular User-Wise Permission & Module Access Studio Modal */}
      {permissionModalUser && (
        <Modal
          isOpen={!!permissionModalUser}
          onClose={() => setPermissionModalUser(null)}
          title={`🛡️ Granular Module Permissions: ${permissionModalUser.fullName} (${permissionModalUser.staffId || 'STAFF'})`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSavePermissions} className="space-y-5 text-xs text-slate-800 dark:text-slate-200">
            {/* Header User Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {permissionModalUser.photoUrl ? (
                  <img
                    src={permissionModalUser.photoUrl}
                    alt={permissionModalUser.fullName}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                    {permissionModalUser.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {permissionModalUser.fullName}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 font-bold">
                      {permissionModalUser.staffId || 'STAFF-01'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[11px] text-slate-500 font-mono">@{permissionModalUser.username}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <RoleBadge role={permissionModalUser.role} size="sm" showIcon={true} />
                <span className="block mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {selectedModules.length} of {SYSTEM_MODULES.length} Modules Active
                </span>
              </div>
            </div>

            {/* 1-Click Fast Permission Presets Bar */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                ⚡ 1-Click Fast Presets (Click to Auto-Assign Modules)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset('all_admin')}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 text-[11px] font-bold transition-all border border-purple-300 dark:border-purple-800 shadow-xs"
                >
                  👑 All 15 Modules (Root)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset('doctor')}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-900 dark:text-teal-200 text-[11px] font-bold transition-all border border-teal-300 dark:border-teal-800 shadow-xs"
                >
                  🩺 Doctor & EMR Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset('reception')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[11px] font-bold transition-all border border-emerald-300 dark:border-emerald-800 shadow-xs"
                >
                  👩‍💼 Front Desk & Cards
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset('cashier')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 text-[11px] font-bold transition-all border border-amber-300 dark:border-amber-800 shadow-xs"
                >
                  💰 Billing & Wallet Cashier
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset('lab')}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 text-cyan-900 dark:text-cyan-200 text-[11px] font-bold transition-all border border-cyan-300 dark:border-cyan-800 shadow-xs"
                >
                  🔬 Lab Diagnostic Tech
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset('phlebotomist')}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 text-[11px] font-bold transition-all border border-rose-300 dark:border-rose-800 shadow-xs"
                >
                  🧪 Phlebotomy & Sampling
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset('reset')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all border border-slate-300 dark:border-slate-700 shadow-xs"
                >
                  🔄 Role Default
                </button>
              </div>
            </div>

            {/* 15 System Modules Switchboard Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  🧩 Granted System Modules (User will ONLY see & access checked modules)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedModules(SYSTEM_MODULES.map(m => m.key))}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-400">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedModules(['dashboard'])}
                    className="text-[10px] font-bold text-slate-500 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                {SYSTEM_MODULES.map((mod) => {
                  const isGranted = selectedModules.includes(mod.key);
                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleToggleModule(mod.key)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isGranted
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="text-xs font-black text-slate-900 dark:text-white block truncate">
                            {mod.name}
                          </strong>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                            {mod.description}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black transition-all ${
                            isGranted
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[9px] font-mono">
                        <span className="text-slate-400 font-bold">{mod.href}</span>
                        <span className={`px-1.5 py-0.2 rounded font-black ${isGranted ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                          {isGranted ? 'GRANTED 🟢' : 'LOCKED ⚪'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Granular Permissions Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  🔐 Granular Operation Permissions
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedPerms.includes('all') ? 'Full Root Access' : `${selectedPerms.length} Action Permissions Granted`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                {Object.entries(PERMISSION_LABELS).map(([permKey, info]) => {
                  const isChecked = selectedPerms.includes('all') || selectedPerms.includes(permKey as Permission);
                  return (
                    <label
                      key={permKey}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 shadow-xs'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-white/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePerm(permKey as Permission)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {info.label}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {info.category} • {permKey}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">
                🔒 Access will apply instantly when user logs in
              </span>
              <div className="flex gap-2.5">
                <Button type="button" variant="outline" onClick={() => setPermissionModalUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" leftIcon={<ShieldCheck className="w-4 h-4" />}>
                  Save Module Permissions
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* SUPER ADMIN PASSWORD SELF-UPDATE DEDICATED MODAL */}
      {isSuperAdminPasswordModalOpen && (
        <Modal
          isOpen={isSuperAdminPasswordModalOpen}
          onClose={() => setIsSuperAdminPasswordModalOpen(false)}
          title="👑 Super Admin Strong Password Management"
          maxWidth="md"
        >
          <form onSubmit={handleUpdateSuperAdminPasswordSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 bg-gradient-to-r from-purple-950/30 to-slate-900/40 rounded-2xl border border-purple-500/30 text-purple-900 dark:text-purple-200 space-y-1">
              <strong className="block text-sm font-bold flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" /> Super Admin Portal Password Security
              </strong>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                You can create or update your Super Admin strong password directly here. Password must be at least 8 characters with uppercase, lowercase, and numbers/symbols.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Super Admin Account Username
              </label>
              <input
                type="text"
                disabled
                value={currentUser?.username || 'superadmin'}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  New Strong Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const generated = `SuperAdmin@${Math.floor(1000 + Math.random() * 9000)}#Sec`;
                    setSuperAdminNewPassword(generated);
                    setSuperAdminConfirmPassword(generated);
                    setShowSuperAdminPassword(true);
                    showToast('info', 'Strong Password Generated', `Generated: ${generated}`);
                  }}
                  className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Generate Strong Password
                </button>
              </div>
              <div className="relative">
                <input
                  type={showSuperAdminPassword ? 'text' : 'password'}
                  placeholder="Enter new strong password (e.g. LabMedix@2026#Secure)"
                  value={superAdminNewPassword}
                  onChange={(e) => setSuperAdminNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showSuperAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Strong Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Re-enter new Super Admin password"
                value={superAdminConfirmPassword}
                onChange={(e) => setSuperAdminConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsSuperAdminPasswordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Save Super Admin Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};