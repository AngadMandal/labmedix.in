export type Role =
  | 'super_admin'
  | 'admin'
  | 'doctor'
  | 'manager'
  | 'reception'
  | 'cashier'
  | 'lab_staff'
  | 'phlebotomist'
  | 'pharmacist'
  | 'marketing'
  | 'card_operator'
  | 'read_only';

export type Permission =
  | 'all'
  | 'patient_create'
  | 'patient_read'
  | 'patient_update'
  | 'patient_delete'
  | 'patient_print'
  | 'patient_export'
  | 'card_create'
  | 'card_read'
  | 'card_update'
  | 'card_print'
  | 'card_export'
  | 'card_status_change'
  | 'card_renew'
  | 'card_replace'
  | 'card_delete'
  | 'card_issue'
  | 'card_request_create'
  | 'card_request_view'
  | 'card_request_approve'
  | 'card_request_reject'
  | 'wallet_read'
  | 'wallet_credit'
  | 'wallet_debit'
  | 'wallet_adjust'
  | 'membership_manage'
  | 'family_manage'
  | 'backup_manage'
  | 'settings_manage'
  | 'audit_view'
  | 'users_manage'
  | 'reports_view'
  | 'emr_read'
  | 'emr_create'
  | 'emr_edit'
  | 'emr_prescribe'
  | 'catalog_manage'
  | 'package_manage'
  | 'voucher_manage'
  | 'voucher_redeem'
  | 'ngo_manage'
  | 'ngo_view'
  | 'camp_manage'
  | 'grant_manage'
  | 'doctor_view'
  | 'doctor_manage'
  | 'test_view'
  | 'bill_create'
  | 'bill_view'
  | 'bill_cancel'
  | 'payment_collect'
  | 'card_request_edit'
  | 'card_request_submit'
  | 'card_request_view_own'
  | 'card_request_view_all'
  | 'card_cancel'
  | 'card_bill_print'
  | 'card_transactions_view'
  | 'card_transactions_view_own'
  | 'card_transactions_view_all'
  | 'bill_view_own'
  | 'bill_view_all'
  | 'bill_print'
  | 'bill_view_due'
  | 'transactions_manage'
  | 'appointment_manage'
  | 'appointment_view'
  | 'lab_order_manage'
  | 'pharmacy_dispense'
  | 'permissions_manage'
  // Granular Patient Workflow
  | 'patient_search'
  | 'patient_slip_print'
  | 'clinical_view'
  // Granular Card Operations
  | 'card_enrollment_open'
  | 'card_request_return'
  | 'card_plan_configure'
  | 'card_pricing_configure'
  | 'card_benefit_configure'
  // Family Health Shield
  | 'family_member_add'
  | 'family_view'
  | 'family_limit_configure'
  // Appointments & OPD Consultation
  | 'appointment_create'
  | 'appointment_reschedule'
  | 'appointment_cancel'
  | 'appointment_checkin'
  | 'consultation_open'
  | 'consultation_complete'
  | 'prescription_add'
  | 'investigation_order'
  | 'followup_add'
  // Diagnostics Laboratory
  | 'lab_order_create'
  | 'lab_order_view'
  | 'specimen_collect'
  | 'specimen_receive'
  | 'specimen_process'
  | 'result_enter'
  | 'result_draft_save'
  | 'result_submit_verification'
  | 'result_verify'
  | 'report_finalize'
  | 'report_amend'
  | 'barcode_print'
  | 'report_download'
  | 'report_share'
  // Billing & Finance
  | 'discount_override'
  | 'finance_view'
  | 'financial_analytics_view'
  | 'pricing_configure'
  | 'refund_approve'
  // Pharmacy
  | 'prescription_view'
  | 'medicine_dispense'
  | 'pharmacy_sale_create'
  | 'pharmacy_stock_manage'
  | 'pharmacy_bill_print'
  | 'pharmacy_purchase_manage'
  | 'pharmacy_supplier_manage'
  | 'pharmacy_batch_manage'
  | 'pharmacy_return_process'
  | 'pharmacy_adjust_stock'
  | 'pharmacy_reports_view'
  | 'pharmacy_discount_override'
  | 'pharmacy_bill_cancel'
  | 'pharmacy_shift_close'
  // Transactions
  | 'transactions_view_own'
  | 'transactions_view_all'
  // Notifications & Communication
  | 'notifications_view'
  | 'notifications_send'
  // Standard Bill & Print Center
  | 'print_center_view'
  | 'print_center_manage'
  // Hospital Clinical Departments
  | 'emergency_manage'
  | 'emergency_view'
  | 'emergency_triage'
  | 'ipd_manage'
  | 'ipd_view'
  | 'ipd_admit'
  | 'ipd_discharge'
  | 'ward_manage'
  | 'ward_view'
  | 'bed_manage'
  | 'nursing_manage'
  | 'nursing_view'
  | 'nursing_administer'
  | 'ot_manage'
  | 'ot_view'
  | 'ot_schedule'
  | 'anaesthesia_manage'
  | 'anaesthesia_view'
  | 'anaesthesia_pac'
  | 'radiology_manage'
  | 'radiology_view'
  | 'radiology_report'
  | 'blood_bank_manage'
  | 'blood_bank_view'
  | 'blood_bank_issue'
  // Inventory & Store
  | 'inventory_manage'
  | 'inventory_view'
  | 'inventory_adjust'
  | 'inventory_issue'
  // Procurement & Suppliers
  | 'procurement_manage'
  | 'procurement_view'
  | 'procurement_po_create'
  | 'procurement_grn_process'
  // User Governance & Audit
  | 'staff_create'
  | 'user_create'
  | 'role_assign'
  | 'permission_assign'
  | 'user_status_toggle'
  | 'staff_department_assign'
  | 'user_activity_review'
  | 'audit_export';

export interface User {
  id: string;
  uid?: string;
  staffId?: string;
  employeeNo?: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  companyId?: string;
  designation?: string;
  avatar?: string;
  photoUrl?: string;
  bloodGroup?: string;
  status: 'active' | 'inactive';
  pinCode?: string;
  password?: string;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
  workPhone?: string;
  department?: string;
  accessZone?: string;
  nationalId?: string;
  licenseNo?: string;
  joiningDate?: string;
  expiryDate?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  cardThemeWish?: string;
  cardMaterialWish?: string;
  barcodeDataUrl?: string;
  qrCodeDataUrl?: string;
  customPermissions?: Permission[];
  allowedModules?: string[];
  emailSent?: boolean;
}

export interface Address {
  villageArea: string;
  postOffice: string;
  policeStation: string;
  district: string;
  state: string;
  pinCode: string;
  fullAddress: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  mobile: string;
}

export interface MedicalInfo {
  allergies?: string;
  importantNotes?: string;
  chronicConditions?: string;
  emergencyNotes?: string;
  bloodGroup: string;
}

export type BloodGroupStatus = 'verified' | 'unverified' | 'unknown' | 'not_tested';

export interface BloodGroupHistoryEntry {
  id: string;
  bloodGroup: string;
  status: BloodGroupStatus;
  updatedAt: string;
  updatedBy: string;
  verifiedByDoctorOrLab?: string;
  notes?: string;
}

export interface Patient {
  id: string; // e.g. LMDX-2026-000001
  fullName: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  mobile: string;
  whatsapp?: string;
  email?: string;
  bloodGroup: string;
  bloodGroupStatus?: BloodGroupStatus;
  bloodGroupHistory?: BloodGroupHistoryEntry[];
  photoUrl: string;
  address: Address;
  emergencyContact: EmergencyContact;
  medicalInfo: MedicalInfo;
  portalPassword?: string;
  maritalStatus?: string;
  occupation?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  referral?: {
    source: string;
    name?: string;
    details?: string;
    contact?: string;
    cardNo?: string;
    doctorId?: string;
    notes?: string;
  };
  vitalsAtReg?: {
    bp?: string;
    pulse?: number;
    rbs?: string;
    spo2?: number;
    temperature?: string;
    respiratoryRate?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  familyId?: string;
  isFamilyHead?: boolean;
  healthCardId?: string;
  membershipId?: string;
  walletId: string;
  isDemo?: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type CardStatus =
  | 'active'
  | 'pending'
  | 'expired'
  | 'suspended'
  | 'lost'
  | 'replaced'
  | 'cancelled'
  | 'deleted';

export type CardMaterial = 'gloss' | 'matte' | 'metallic' | 'hologram';

export type CardThemePreset =
  | 'executive_navy'
  | 'emerald_health'
  | 'royal_gold'
  | 'platinum_elite'
  | 'clean_minimal'
  | 'crimson_care';

export interface CardDesignConfig {
  preset: CardThemePreset;
  material: CardMaterial;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  showChip: boolean;
  showContactless: boolean;
  showEmergencyBadge: boolean;
  showBarcode: boolean;
  showSignatureStrip: boolean;
  showFamilyBadge?: boolean;
  customTagline?: string;

  // Central Super Admin Controls
  cardTitle?: string;
  cardTierTitle?: string;
  cardPrefix?: string;
  validityDays?: number;
  logoSize?: 'sm' | 'md' | 'lg';
  logoPosition?: 'left' | 'center' | 'right';
  qrPosition?: 'bottom-right' | 'bottom-left';
  showBackQrVerification?: boolean;
  activeVersion?: string;
  cardholderFields?: {
    showDob?: boolean;
    showAge?: boolean;
    showBloodGroup?: boolean;
    showPatientId?: boolean;
    showIssueDate?: boolean;
    showValidUntil?: boolean;
    showStatusBadge?: boolean;
  };
}

export interface CardDesignVersion {
  id: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  createdBy: string;
  changesSummary: string;
  config: CardDesignConfig;
  termsAndConditions: string[];
}

export interface CardStatusHistory {
  id: string;
  cardId: string;
  date: string;
  previousStatus: CardStatus;
  newStatus: CardStatus;
  changedBy: string;
  reason: string;
}

export interface HealthCard {
  id: string;
  cardNumber: string; // e.g. LHC-2026-000001
  patientId: string;
  membershipId: string;
  tier?: string; // e.g. standard, gold, platinum, family_shield
  issueDate: string;
  expiryDate: string;
  status: CardStatus;
  cvv: string; // 3-digit security code on card back
  verificationCode: string; // e.g. VER-8942-1049
  nfcUid?: string; // 7-byte contactless chip hex UID e.g. 04:E2:89:1A:B5:4C:80
  nfcStandard?: 'ISO/IEC 14443 Type A' | 'MIFARE Classic 1K/4K' | 'NTAG213/215/216' | 'FeliCa';
  nfcPayload?: string; // Contactless tap URL or encoded payload
  designConfig: CardDesignConfig;
  statusHistory: CardStatusHistory[];
  replacedByCardId?: string;
  replacesCardId?: string;
  replacementReason?: string;
  renewedCount: number;
  lastRenewedAt?: string;
  isDemo?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BenefitPackageItem {
  id: string;
  title: string;
  category: 'consultation' | 'diagnostics' | 'pharmacy' | 'preventive' | 'hospital' | 'concierge';
  description: string;
  quantityOrLimit?: string;
  valueInInr?: number;
}

export interface FamilyPlanPolicy {
  allowedRelationships: string[];
  primaryAgeMinimum: number;
  childAgeMaximum: number;
  allowSharedWallet: boolean;
  allowDependentCards: boolean;
  additionalMemberFee?: number;
}

export interface Membership {
  id: string;
  name: string;
  slug: string;
  tierRank?: number;
  description?: string;
  validityMonths: number;
  registrationFee: number;
  annualRenewalFee: number;
  opdDiscount: number;
  labDiscount: number;
  pharmacyDiscount: number;
  homeCollectionDiscount: number;
  emergencyDiscount?: number;
  ipdDiscount?: number;
  teleconsultDiscount?: number;
  cashbackPercentage?: number;
  specialBenefits: string[];
  benefitPackages?: BenefitPackageItem[];
  color: string;
  badgeIcon: string;
  isFamilyPlan: boolean;
  maxFamilyMembers?: number;
  familyPolicy?: FamilyPlanPolicy;
  isRecommended?: boolean;
  isPopular?: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export type FamilyMemberStatus =
  | 'added'
  | 'pending'
  | 'active_under_primary'
  | 'individual_card_requested'
  | 'individual_card_approved'
  | 'individual_card_issued'
  | 'removed';

export interface FamilyMemberLink {
  patientId: string;
  relationship: string;
  isPrimary: boolean;
  status?: FamilyMemberStatus;
  individualCardId?: string;
  individualCardNumber?: string;
  addedAt?: string;
  additionalFeePaid?: boolean;
  additionalFeeAmount?: number;
}

export interface FamilyGroup {
  id: string;
  familyName: string;
  primaryPatientId: string;
  members: FamilyMemberLink[];
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'credit' | 'debit' | 'refund' | 'adjustment';

export interface WalletTransaction {
  id: string;
  walletId: string;
  patientId: string;
  type: TransactionType;
  amount: number;
  openingBalance: number;
  closingBalance: number;
  referenceNo: string;
  notes: string;
  date: string;
  createdBy: string;
  grossAmount?: number;
  discountAmount?: number;
  discountPercentage?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentStatus?: 'paid' | 'partial_due' | 'unpaid_due';
  verificationStatus?: 'verified' | 'pending_verification' | 'failed';
  utrNumber?: string;
  gatewaySignature?: string;
  paymentChannel?: string;
  verifiedAt?: string;
  department?: string;
  recommendingDoctorId?: string;
  recommendingDoctorName?: string;
  lineItems?: any[];
}

export interface SampleDispatchRecord {
  id: string;
  sampleBarcode: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  testNames: string[];
  department: string;
  sampleType: 'Whole Blood (EDTA)' | 'Serum (Clot Activator)' | 'Urine' | 'Plasma (Fluoride)' | 'Swab/Culture' | 'Biopsy Tissue';
  vialColorCode: 'Lavender' | 'Red' | 'Yellow/SST' | 'Grey' | 'Blue' | 'Green';
  collectionTimestamp: string;
  collectedBy: string;
  dispatchStatus: 'pending_collection' | 'collected' | 'dispatched' | 'in_transit' | 'received_at_lab' | 'testing' | 'report_ready' | 'delivered';
  dispatchDestination: string;
  courierTechnicianName: string;
  courierVehicleNo: string;
  dispatchedAt?: string;
  expectedReportTime?: string;
  notes?: string;
}

export interface Wallet {
  id: string;
  patientId: string;
  balance: number;
  totalCredits: number;
  totalDebits: number;
  totalDue?: number;
  status: 'active' | 'frozen';
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditModule =
  | 'auth'
  | 'patient'
  | 'card'
  | 'card_dispatch'
  | 'membership'
  | 'wallet'
  | 'family'
  | 'backup'
  | 'settings'
  | 'security'
  | 'users'
  | 'clinical'
  | 'portal'
  | 'pharmacy'
  | 'laboratory'
  | 'billing'
  | 'emergency'
  | 'ipd'
  | 'ward'
  | 'nursing'
  | 'ot'
  | 'anaesthesia'
  | 'radiology'
  | 'blood_bank'
  | 'inventory'
  | 'procurement';

export type AuditSeverity = 'info' | 'financial' | 'security' | 'warning' | 'critical';

export interface AuditLog {
  id: string;
  index?: number;
  action: string;
  module: AuditModule;
  severity?: AuditSeverity;
  userId: string;
  userName: string;
  userRole?: string;
  timestamp: string;
  referenceId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  prevHash?: string;
  hash?: string;
  digitalSignature?: string;
  merkleRoot?: string;
  nonce?: number;
  metadata?: Record<string, any>;
}

export interface ZohoPaymentConfig {
  enabled: boolean;
  environment: 'production' | 'sandbox';
  isConnected?: boolean;
  authStatus?: 'authenticated' | 'disconnected' | 'pending';
  connectedEmail?: string;
  merchantAccountId: string;
  accountHolderName: string;
  apiKey: string;
  signingKey: string;
  webhookUrl: string;
  autoCapture: boolean;
  enableUpi: boolean;
  enableCards: boolean;
  enableNetBanking: boolean;
  enableInternational: boolean;
  settlementSchedule: 'instant' | 't1' | 't2';
  settlementBank?: string;
  lastPingStatus?: 'online' | 'error' | 'untested';
  lastPingLatencyMs?: number;
  lastPingTimestamp?: string;
}

export interface CompanyLogoMetadata {
  url: string;
  storageRef?: string;
  fileType?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
  uploadedAt?: string;
  uploadedBy?: string;
  isActive: boolean;
}

export interface DocumentBrandingConfig {
  bill: {
    headerTitle?: string;
    showLogo: boolean;
    showGstin: boolean;
    showDrugLicense: boolean;
    footerNotice?: string;
    termsAndConditions?: string[];
    showQrCode: boolean;
    showBarcode: boolean;
    maxItemsPerPage?: number;
  };
  diagnosticReport: {
    headerTitle?: string;
    showLogo: boolean;
    showNablLogo?: boolean;
    labDirectorName?: string;
    labDirectorDegree?: string;
    pathologistName?: string;
    technicianName?: string;
    footerDisclaimer?: string;
  };
  healthCard: {
    cardTitle?: string;
    showLogo: boolean;
    showWatermark: boolean;
    watermarkText?: string;
    cardFooterNotice?: string;
    helplineText?: string;
  };
  prescription: {
    headerTitle?: string;
    showLogo: boolean;
    showDoctorContact: boolean;
    rxFooterNotice?: string;
  };
}

export interface SystemSettingsConfig {
  numbering: {
    patientPrefix: string;
    healthCardPrefix: string;
    cardRequestPrefix: string;
    billPrefix: string;
    invoicePrefix: string;
    transactionPrefix: string;
    labReportPrefix: string;
  };
  dateTime: {
    timeZone: string;
    dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD MMM YYYY';
    timeFormat: '12h' | '24h';
  };
  printing: {
    paperSize: 'A4' | 'Half-Page' | 'Thermal-80mm';
    defaultLayout: 'portrait' | 'landscape';
    autoPrintOnSave: boolean;
    cutLineMarker: boolean;
    margins: { top: number; bottom: number; left: number; right: number };
  };
  notifications: {
    whatsappEnabled: boolean;
    whatsappApiKey?: string;
    smsEnabled: boolean;
    smsSenderId?: string;
    smsApiKey?: string;
    emailEnabled: boolean;
    emailSenderName?: string;
    emailFromAddress?: string;
  };
  security: {
    sessionTimeoutMinutes: number;
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    requirePinForBilling: boolean;
    enforcePasswordPolicy: boolean;
  };
}

export interface CompanyProfile {
  companyId?: string;
  name: string;
  legalName?: string;
  tagline: string;
  estdYear: string;
  logoUrl: string;
  logoMetadata?: CompanyLogoMetadata;
  subtitle: string;
  address: string;
  postOffice: string;
  policeStation: string;
  district: string;
  state: string;
  pinCode: string;
  phone: string;
  helpline: string;
  ambulanceHelpline?: string;
  bloodBankHelpline?: string;
  whatsapp: string;
  email: string;
  website: string;
  registrationNo: string;
  isoCertification?: string;
  clinicalLicenseNo?: string;
  gstin?: string;
  cardValidityMonths?: number;
  cardFooterNotice?: string;
  cardSecurityWatermark?: string;
  currencySymbol?: string;
  sessionTimeoutMinutes?: number;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  documentBranding?: DocumentBrandingConfig;
  systemConfig?: SystemSettingsConfig;
  validationStatus?: 'complete' | 'warning' | 'incomplete';
  services: {
    id: string;
    title: string;
    icon: string;
    description: string;
  }[];
  termsAndConditions: string[];
  zohoPayments?: ZohoPaymentConfig;
  nfcSettings?: NFCSettings;
  upiSettings?: UpiMerchantSettings;
  registrationSettings?: ClinicRegistrationSettings;
}

export interface ClinicRegistrationSettings {
  enableClinicalTriageDefault: boolean; // default: false (OFF)
  maxIncludedFamilyMembers: number; // default: 5
  additionalMemberFee: number; // default: 299 (in INR)
  cardIssuanceDefault: boolean; // default: false (OFF)
}

export interface PatientBill {
  id: string; // e.g. BILL-2026-000001
  billNumber: string;
  date: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  patientAddress?: string;
  healthCardId?: string;
  healthCardNumber?: string;
  membershipName?: string;
  isCardIssued: boolean;
  familyMemberCount: number;
  includedMembers: number;
  additionalMembers: number;
  baseCardCharge: number;
  additionalMemberCharge: number;
  discountAmount: number;
  netPayable: number;
  paidAmount: number;
  paymentStatus: 'paid' | 'pending' | 'waived';
  paymentMethod: 'cash' | 'upi' | 'card' | 'netbanking' | 'wallet';
  transactionId?: string;
  authorizedStaff: {
    id: string;
    name: string;
    role: string;
  };
  notes?: string;
  billCategory?:
    | 'registration'
    | 'card_enrollment'
    | 'opd_consultation'
    | 'lab_diagnostics'
    | 'pharmacy_dispensing'
    | 'emergency'
    | 'ipd'
    | 'ot_surgery'
    | 'anaesthesia'
    | 'radiology'
    | 'blood_bank'
    | 'general';
  items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  createdAt: string;
}

export interface UpiMerchantSettings {
  enabled: boolean;
  merchantVpa: string;
  merchantName: string;
  merchantMcc?: string;
  googlePayMerchantId?: string;
  googlePayBusinessName?: string;
  enableDeepLinks?: boolean;
  autoVerifySimulation?: boolean;
}

export interface NFCSettings {
  enabled: boolean;
  defaultStandard: 'ISO/IEC 14443 Type A' | 'MIFARE Classic 1K/4K' | 'NTAG213/215/216' | 'FeliCa';
  frequency: string; // '13.56 MHz'
  payloadType: 'verification_url' | 'deep_link' | 'ndef_json' | 'vcard';
  autoWriteOnIssue: boolean;
  securityKey: string;
  enableWebNfcApi: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system' | 'auto_schedule';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  autoSchedule?: {
    enabled: boolean;
    dayStartHour: number; // 0-23, default 7 (7:00 AM)
    nightStartHour: number; // 0-23, default 19 (7:00 PM)
  };
}

export interface BackupData {
  version: string;
  backupVersion: string;
  createdDate: string;
  checksum?: string;
  sizeBytes?: number;
  recordCounts: {
    patients: number;
    healthCards: number;
    memberships: number;
    families: number;
    wallets: number;
    walletTransactions: number;
    auditLogs: number;
    users: number;
  };
  data: {
    patients: Patient[];
    healthCards: HealthCard[];
    memberships: Membership[];
    families: FamilyGroup[];
    wallets: Wallet[];
    walletTransactions: WalletTransaction[];
    auditLogs: AuditLog[];
    companyProfile: CompanyProfile;
    users: User[];
  };
}

export interface SnapshotRecord {
  id: string;
  timestamp: string;
  title: string;
  tag?: 'manual' | 'pre-restore' | 'eod' | 'system' | 'cloud_sync' | 'auto_live';
  sizeBytes?: number;
  recordCounts: Record<string, number>;
  data: BackupData | any;
  isCloudSynced?: boolean;
  cloudSyncTimestamp?: string;
  checksum?: string;
}

export interface FirestoreCloudSnapshot {
  id: string;
  title: string;
  timestamp: string;
  tag: 'manual' | 'auto_live' | 'pre-restore' | 'eod' | 'system' | 'cloud_sync';
  sizeBytes: number;
  checksum: string;
  recordCounts: {
    patients: number;
    healthCards: number;
    memberships: number;
    families: number;
    wallets: number;
    walletTransactions: number;
    auditLogs: number;
    users: number;
    appointments?: number;
    emrEncounters?: number;
    doctors?: number;
    vouchers?: number;
  };
  data: BackupData | any;
  createdBy: string;
  isVerified: boolean;
  version: string;
}

export interface FirestoreWalRecord {
  id: string;
  collection: string;
  docId: string;
  operation: 'set' | 'update' | 'delete' | 'batch_upsert';
  payload: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'committed' | 'failed';
  errorMessage?: string;
}

export interface FirestoreDriftReport {
  collection: string;
  displayName: string;
  localCount: number;
  cloudCount: number;
  status: 'synced' | 'local_ahead' | 'cloud_ahead' | 'drift_detected';
  driftCount: number;
}

export interface BackupHistoryRecord {
  id: string;
  label: string;
  type: 'manual' | 'scheduled' | 'pre_restore' | 'cloud_sync' | 'auto';
  status: 'processing' | 'successful' | 'failed';
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  verificationStatus: 'pending' | 'verified' | 'unverified' | 'tampered' | 'corrupted' | 'failed';
  verifiedAt?: string;
  firestoreSnapshotId?: string;
  sizeBytes?: number;
  recordCount?: number;
  checksum?: string;
  errorMessage?: string;
  failureReason?: string;
}

export interface BackupSystemStatus {
  lastSuccessfulBackup: string | null;
  nextScheduledBackup: string;
  health: 'good' | 'warning' | 'critical';
  totalBackups: number;
  failedCount: number;
  processingCount: number;
}

export interface VerificationResult {
  verified: boolean;
  type?: 'health_card' | 'staff_pass' | 'diagnostic_report';
  cardStatus: CardStatus | 'not_found';
  message: string;
  verificationCode: string;
  card?: HealthCard;
  patient?: {
    fullName: string;
    maskedPatientId: string;
    maskedCardNumber: string;
    bloodGroup: string;
    gender: string;
    age: number;
    photoUrl?: string;
  };
  staff?: {
    id: string;
    staffId: string;
    fullName: string;
    username: string;
    role: Role;
    designation: string;
    department: string;
    accessZone?: string;
    nationalId?: string;
    licenseNo?: string;
    bloodGroup?: string;
    photoUrl?: string;
    status: 'active' | 'inactive';
    email: string;
    phone?: string;
    workPhone?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
    joiningDate?: string;
    cardThemeWish?: string;
    cardMaterialWish?: string;
  };
  report?: {
    reportNumber: string;
    orderNumber: string;
    bookingNo: string;
    patientName: string;
    maskedPatientId: string;
    age: number;
    gender: string;
    testName: string;
    testCategory: string;
    department: string;
    sampleBarcode: string;
    specimenType: string;
    sampleCollectedAt: string;
    sampleReceivedAt: string;
    reportDate: string;
    status: 'draft' | 'verified' | 'finalized' | 'amended';
    isLocked: boolean;
    technicianName: string;
    technicianDesignation: string;
    reportingDoctorName: string;
    reportingDoctorDesignation: string;
    reportingDoctorRegNo: string;
    laboratoryName: string;
    centerLocation: string;
    verificationHash: string;
    verificationCode?: string;
  };
  membership?: {
    name: string;
    color: string;
    opdDiscount: number;
    labDiscount: number;
    pharmacyDiscount: number;
    homeCollectionDiscount: number;
    specialBenefits: string[];
  };
  issueDate?: string;
  expiryDate?: string;
  company: CompanyProfile;
}

export interface PrescribedMedication {
  id: string;
  name: string;
  composition?: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  instructions?: string;
}

export interface OrderedLabTest {
  id: string;
  testName: string;
  category: string;
  urgency: 'routine' | 'urgent';
  estimatedCost: number;
}

export type LabOrderStatus =
  | 'ordered'
  | 'booked'
  | 'order_created'
  | 'billing_pending'
  | 'ready_for_collection'
  | 'collection_pending'
  | 'sample_collection_pending'
  | 'phlebotomy_assigned'
  | 'phlebotomist_assigned'
  | 'collected'
  | 'sample_collected'
  | 'accessioned'
  | 'received'
  | 'sample_received_in_lab'
  | 'in_lab'
  | 'processing'
  | 'result_pending'
  | 'results_entered'
  | 'verification_pending'
  | 'results_verified'
  | 'verified'
  | 'finalized'
  | 'report_ready'
  | 'delivered'
  | 'report_delivered'
  | 'cancelled'
  | 'rejected'
  | 'recollection_required'
  | 'recollection_needed';

export type LabResultStatus =
  | 'pending_entry'
  | 'draft_entered'
  | 'submitted_for_verification'
  | 'verified'
  | 'final'
  | 'amended';

export type LabParameterFlag = 'normal' | 'low' | 'high' | 'critical';

export type TestResultType =
  | 'numeric'
  | 'text'
  | 'positive_negative'
  | 'reactive_non_reactive'
  | 'qualitative'
  | 'multi_parameter';

export interface AgeGenderReferenceRange {
  gender?: 'male' | 'female' | 'all';
  minAgeYears?: number;
  maxAgeYears?: number;
  referenceRange: string;
  minVal?: number;
  maxVal?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface CalculationRule {
  targetParameterCode: string;
  targetParameterName: string;
  formulaDescription: string;
  requiredParameterCodes: string[];
  conditionDescription?: string;
  unit?: string;
}

export interface MasterTestParameter {
  id: string;
  parameterCode?: string;
  parameterName: string;
  method?: string;
  resultType: TestResultType;
  unit: string;
  defaultReferenceRange: string;
  minVal?: number;
  maxVal?: number;
  criticalLow?: number;
  criticalHigh?: number;
  ageGenderRanges?: AgeGenderReferenceRange[];
  qualitativeOptions?: string[];
  required?: boolean;
  displayOrder: number;
  reportOrder: number;
  remarks?: string;
  isCalculated?: boolean;
  calculationFormula?: string;
  calculationDependencies?: string[];
}

export interface LabPanelItem {
  id: string;
  code: string;
  name: string;
  category: string;
  department: string;
  specimen: string;
  type: 'panel' | 'package';
  tag?: string;
  description?: string;
  individualTestIds: string[]; // Strict reference to Individual Tests (no duplication)
  mrp: number;
  offerPrice?: number;
  fastingRequired: boolean;
  tatHours: number;
  popular?: boolean;
  status: 'active' | 'inactive';
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookedTestConfig {
  testId: string;
  testCode: string;
  testName: string;
  department: string;
  specimen: string;
  method?: string;
  tatHours?: number;
  panelId?: string;
  panelName?: string;
  isFromPanel?: boolean;
  parameters: MasterTestParameter[];
}

export interface LabParameterResult {
  id?: string;
  testId?: string;
  testName?: string;
  panelId?: string;
  panelName?: string;
  isFromPanel?: boolean;
  parameterId?: string;
  parameterCode?: string;
  parameterName: string;
  observedValue: string;
  unit: string;
  referenceRange: string;
  flag: LabParameterFlag;
  critical?: boolean;
  method?: string;
  notes?: string;
  resultType?: TestResultType;
  displayOrder?: number;
  reportOrder?: number;
  required?: boolean;
  qualitativeOptions?: string[];
  minVal?: number;
  maxVal?: number;
  criticalLow?: number;
  criticalHigh?: number;
  isCalculated?: boolean;
  calculationFormula?: string;
  calculationDependencies?: string[];
}

export type SpecimenStatus =
  | 'awaiting_collection'
  | 'collected'
  | 'accessioned'
  | 'received'
  | 'in_analysis'
  | 'rejected'
  | 'recollection_required';

export type SpecimenRejectionReason =
  | 'Incorrect container / tube type'
  | 'Insufficient specimen volume (QNS)'
  | 'Tube leakage / Damaged container'
  | 'Gross Hemolysis'
  | 'Clotted whole blood'
  | 'Mislabeled / Label unreadable'
  | 'Unidentified specimen'
  | 'Incorrect specimen / sample type'
  | 'Delayed / degraded sample transit'
  | 'Temperature abuse / Cold-chain failure'
  | 'Other clinical reason';

export interface SpecimenRecord {
  id: string; // e.g. SPEC-2026-00101
  accessionNumber: string; // e.g. ACC-2026-00042
  barcode: string;
  labOrderId: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
  testId?: string;
  testName: string;
  department: string;
  sampleType: string; // Blood, Urine, Serum, Sputum, etc.
  tubeType: string; // EDTA, Plain, SST, Fluoride, Citrate, Sterile Cup
  capColor?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: SpecimenStatus;
  
  // Phlebotomy / Collection
  collectedAt?: string;
  collectedBy?: string;
  collectorId?: string;
  phlebotomistVehicle?: string;
  coldChainTemperature?: string;
  
  // Accessioning & Reception
  accessionedAt?: string;
  accessionedBy?: string;
  receivedAt?: string;
  receivedBy?: string;
  receivingStaffId?: string;
  
  // Rejection & Recollection
  rejectionReason?: SpecimenRejectionReason | string;
  rejectionNotes?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  recollectionRequired?: boolean;
  recollectionRequestedAt?: string;
  recollectionRequestedBy?: string;
  recollectionOriginalSpecimenId?: string;
  replacementSpecimenId?: string;
  
  // Label & Audit
  labelPrintCount?: number;
  lastLabelPrintedAt?: string;
  lastReprintReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type PrinterLabelFormat =
  | 'tube_50x25'   // 50mm x 25mm (Standard Vacutainer)
  | 'tube_50x30'   // 50mm x 30mm (Standard Lab Tube)
  | 'bag_75x50'    // 75mm x 50mm (Large Container / Transport Bag)
  | 'pediatric_38x19'; // 38mm x 19mm (Pediatric / Cryovial)

export interface LaboratorySettings {
  id?: string;
  defaultLabelFormat: PrinterLabelFormat;
  autoAccessionPrefix: string; // default "ACC"
  autoReportPrefix: string;    // default "LMDX-RPT"
  autoBarcodePrefix: string;   // default "SMP"
  criticalAlertEnabled: boolean;
  criticalAlertSound: boolean;
  defaultTatHours: number;
  allowTechnicianDraftSave: boolean;
  requireReprintReason: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LabOrderRecord {
  id: string; // e.g. LAB-ORD-2026-000101
  orderNumber: string;
  bookingNo?: string;
  accessionNumber?: string;
  specimenId?: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: 'male' | 'female' | 'other';
  healthCardId?: string;
  cardNo?: string;
  cardTier?: string;
  membershipTier?: string;
  testNames?: string[];
  testName?: string;
  testId?: string;
  bookedTestIds?: string[];
  bookedTests?: BookedTestConfig[];
  category?: string;
  department: string;
  specimenType?: string;
  sampleType?: string;
  tubeType?: string; // e.g. EDTA (Lavender), Serum (Red), etc.
  sampleTubeType?: string;
  vialBarcode?: string;
  sampleBarcode?: string;
  urgency?: 'routine' | 'urgent' | 'emergency';
  priority?: 'routine' | 'urgent' | 'stat';
  orderingDoctorName?: string;
  prescribedByDoctorName?: string;
  orderingDoctorId?: string;
  encounterNo?: string;
  status: LabOrderStatus;
  resultStatus?: LabResultStatus;
  paymentStatus?: 'paid' | 'pending' | 'partially_paid' | 'waived' | 'paid_counter';
  grossAmount?: number;
  grossPrice?: number;
  mrp?: number;
  discountPercentage?: number;
  discountAmount?: number;
  netAmount?: number;
  netPayable?: number;
  netPrice?: number;
  paidAmount?: number;
  dueAmount?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  billId?: string;
  billNumber?: string;
  transactionId?: string;
  collectionType?: 'lab_visit' | 'home_collection' | 'inpatient';
  scheduledDate?: string;
  scheduledTime?: string;
  fastingRequired?: boolean;
  
  // Logistics & Home Collection Tracking
  assignedPhlebotomist?: string;
  phlebotomistVehicle?: string;
  logisticsStage?: string;
  collectionEtaTime?: string;
  collectionEtaMinutes?: number;
  coldChainTemperature?: string;
  boxSealBarcode?: string;
  
  // Staff tracking
  createdByStaffId?: string;
  createdByStaffName?: string;
  phlebotomistId?: string;
  phlebotomistName?: string;
  collectedAt?: string;
  sampleCollectedAt?: string;
  sampleCollectedBy?: string;
  accessionedAt?: string;
  accessionedBy?: string;
  receivedInLabAt?: string;
  sampleReceivedAt?: string;
  sampleReceivedBy?: string;
  receivedByTechnician?: string;
  
  // Rejection & Recollection Tracking
  rejectionReason?: SpecimenRejectionReason | string;
  rejectionNotes?: string;
  rejectedAt?: string;
  recollectionRequired?: boolean;
  recollectionNotes?: string;
  previousSpecimenBarcodes?: string[];
  
  // Results & Verification
  parameters?: LabParameterResult[];
  results?: LabParameterResult[];
  testResults?: LabParameterResult[];
  technicianRemarks?: string;
  technicianNotes?: string;
  clinicalNotes?: string;
  resultsEnteredAt?: string;
  resultsEnteredBy?: string;
  resultsDraftSavedAt?: string;
  hasCriticalResult?: boolean;
  criticalResultNotifiedAt?: string;
  criticalResultNotes?: string;
  
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedDoctorName?: string;
  verifiedDoctorRegistrationNo?: string;
  verifiedByDoctorName?: string;
  pathologistName?: string;
  pathologistNotes?: string;
  verifyingDoctorRegNo?: string;
  verifyingDoctorDesignation?: string;
  isLocked?: boolean;
  lockedAt?: string;
  reportUrl?: string;
  reportNumber?: string;
  reportReadyAt?: string;
  
  // TAT Monitoring
  tatHours?: number;
  tatTargetTime?: string;
  isTatDelayed?: boolean;
  
  // Amendment tracking if report corrected
  amendmentHistory?: Array<{
    amendedAt: string;
    amendedBy: string;
    reason: string;
    previousParameters: LabParameterResult[];
  }>;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface LabTechnicianItem {
  id: string;
  technicianCode: string; // e.g. LT-001
  name: string;
  qualification: string;
  designation: string;
  department: string;
  regNumber: string;
  phone: string;
  email: string;
  signatureUrl?: string;
  stampUrl?: string;
  status: 'active' | 'on_leave' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticReportRecord {
  id: string;
  reportNumber: string; // LMDX-RPT-YYYY-XXXXXX
  orderId: string;
  orderNumber: string;
  bookingNo: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone?: string;
  cardNo?: string;
  membershipTier?: string;
  referringDoctorName: string;
  sampleBarcode: string;
  sampleTubeType: string;
  sampleCollectedAt?: string;
  sampleReceivedAt?: string;
  testName: string;
  testCategory: string; // Hematology | Biochemistry | Clinical Pathology | Serology | Microbiology | Hormones | Urine | etc.
  department: string;
  bookedTests?: BookedTestConfig[];
  parameters: LabParameterResult[];
  clinicalImpression?: string;
  technicianId?: string;
  technicianName?: string;
  technicianQualification?: string;
  technicianDesignation?: string;
  technicianRegNo?: string;
  technicianSignatureUrl?: string;
  reportingDoctorId?: string;
  reportingDoctorName?: string;
  reportingDoctorQualification?: string;
  reportingDoctorDesignation?: string;
  reportingDoctorRegNo?: string;
  reportingDoctorSignatureUrl?: string;
  reportingDoctorStampUrl?: string;
  companySnapshot?: CompanyProfile;
  status: 'draft' | 'verified' | 'finalized' | 'amended';
  isLocked: boolean;
  lockedAt?: string;
  finalizedAt?: string;
  verificationCode: string;
  verificationHash?: string;
  qrVerificationUrl?: string;
  amendmentHistory?: Array<{
    amendedAt: string;
    amendedBy: string;
    reason: string;
    previousParameters: LabParameterResult[];
  }>;
  createdAt: string;
  updatedAt: string;
}


export interface ClinicalVitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseRate?: number;
  temperature?: number;
  spo2?: number;
  respiratoryRate?: number;
  bloodSugar?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: string;
}

export interface VitalsRecord {
  id: string;
  patientId: string;
  recordedAt: string;
  bpSystolic: number;
  bpDiastolic: number;
  pulseRate: number;
  bloodSugar: number;
  sugarType: 'fasting' | 'post_prandial' | 'random';
  temperature?: number;
  spo2?: number;
  respiratoryRate?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: string;
  notes?: string;
  recordedBy?: string;
}

export interface ClinicalEncounter {
  id: string;
  encounterNo: string;
  patientId: string;
  patientName: string;
  cardNo?: string;
  cardId?: string;
  securitySeal?: string;
  isLiveVerified?: boolean;
  doctorId: string;
  doctorName: string;
  doctorSpeciality: string;
  doctorRegNo: string;
  department: string;
  date: string;
  chiefComplaints: string[];
  historyOfPresentIllness: string;
  allergies?: string[];
  chronicConditions?: string[];
  vitals: ClinicalVitals;
  examinationNotes: string;
  diagnoses: string[];
  medications: PrescribedMedication[];
  labOrders: OrderedLabTest[];
  dietAndAdvice: string[];
  followUpDays?: number;
  followUpDate?: string;
  appointmentSlot?: string;
  patientPreferredTime?: string;
  appointmentType?: 'routine_followup' | 'investigation_review' | 'emergency' | 'patient_wish';
  correctionNotes?: string;
  lastCorrectedAt?: string;
  status: 'completed' | 'draft' | 'referred' | 'corrected';
  createdAt: string;
  updatedAt: string;
}

export interface PatientAppointment {
  id: string;
  appointmentNo: string;
  queueToken?: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  cardNo?: string;
  cardId?: string;
  securitySeal?: string;
  isLiveVerified?: boolean;
  cardTier: string;
  cardTierColor: string;
  doctorId: string;
  doctorName: string;
  doctorSpeciality: string;
  department: string;
  consultationMode: 'physical_opd' | 'telemedicine_video';
  patientWishDate: string;
  patientWishSlot: string;
  patientWishTime: string;
  doctorConfirmedDate?: string;
  doctorConfirmedSlot?: string;
  doctorConfirmedTime?: string;
  doctorNotes?: string;
  chiefComplaint: string;
  status: 'pending_doctor_approval' | 'doctor_confirmed' | 'waiting' | 'in_consultation' | 'completed' | 'rescheduled' | 'cancelled' | 'no_show';
  telemedicineRoomUrl?: string;
  consultationFee: number;
  walletDebitStatus?: 'paid' | 'pending' | 'free_card_benefit';
  billId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationFamilyMember {
  id: string;
  fullName: string;
  relationship: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  dob?: string;
  bloodGroup: string;
  mobile?: string;
  photoUrl?: string;
  medicalNotes?: string;
  issueCard?: boolean; // Whether an individual CR80 Health Card is explicitly requested
  status?: FamilyMemberStatus;
  individualCardId?: string;
  individualCardNumber?: string;
}

export interface CardApplicationHistoryItem {
  id: string;
  date: string;
  status: string;
  title: string;
  note: string;
  actor: string;
}

export interface CardApplicationRequest {
  id: string; // app_xxxx
  applicationNo: string; // LMX-REQ-2026-000001 or APP-2026-XXXXX
  trackingId: string; // Unique Card Request / Tracking ID e.g. LMX-REQ-2026-000001
  fullName: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  mobile: string;
  whatsapp?: string;
  email?: string;
  bloodGroup: string;
  photoUrl?: string;
  address: Address;
  emergencyContact: EmergencyContact;
  medicalInfo: MedicalInfo;
  portalPassword?: string;
  clinicalVitals?: ClinicalVitals;
  governmentIdType?: string;
  governmentIdNumber?: string;
  referralSource?: string;
  referralDetails?: Record<string, any>;
  doctorRecommendation?: string;
  cardThemeConfig?: Record<string, any>;
  familyMembers?: ApplicationFamilyMember[];
  membershipId: string;
  membershipName: string;
  membershipPrice: number;
  initialDeposit?: number;
  totalPaidAmount: number;
  paymentMethod: string;
  paymentReference: string;
  paymentStatus:
    | 'pending'
    | 'processing'
    | 'paid'
    | 'failed'
    | 'pending_verification'
    | 'cancelled'
    | 'refunded';
  status:
    | 'draft'
    | 'submitted'
    | 'pending_review'
    | 'under_review'
    | 'pending_approval'
    | 'pending_verification'
    | 'info_required'
    | 'returned_for_correction'
    | 'approved'
    | 'processing'
    | 'card_processing'
    | 'ready'
    | 'issued'
    | 'card_issued'
    | 'rejected'
    | 'payment_pending'
    | 'payment_failed'
    | 'cancelled';
  rejectionReason?: string;
  infoRequiredNote?: string;
  adminNotes?: Array<{ id: string; note: string; addedBy: string; addedAt: string }>;
  processingHistory?: CardApplicationHistoryItem[];
  approvedPatientId?: string;
  approvedCardNumber?: string;
  approvedBy?: string;
  approvedAt?: string;
  smsNotificationSent?: boolean;
  emailNotificationSent?: boolean;
  smsContent?: string;
  emailContent?: string;
  requestSource?: 'public_portal' | 'staff_portal' | 'reception_desk' | 'doctor_referral';
  submittedByStaffId?: string;
  submittedByStaffName?: string;
  submittedByStaffRole?: string;
  submittedByStaffEmail?: string;
  patientId?: string;
  extraFamilyMembersCount?: number;
  extraFamilyMembersFee?: number;
  billId?: string;
  billNumber?: string;
  transactionId?: string;
  urgency?: 'normal' | 'urgent' | 'emergency';
  justificationNotes?: string;
  dispatchPreference?: 'collect_at_clinic' | 'courier' | 'digital_only';
  createdAt: string;
  updatedAt: string;
}

export interface StaffCardTransaction {
  id: string; // txn_xxxx or TXN-REQ-XXXX
  transactionId: string;
  transactionNumber?: string;
  requestId: string;
  requestNumber?: string;
  applicationNo: string;
  staffUserId: string;
  staffEmail: string;
  staffName: string;
  staffRole: string;
  patientId: string;
  patientName: string;
  patientMobile?: string;
  cardId?: string;
  cardNumber?: string;
  membershipId: string;
  membershipName: string;
  planName?: string;
  planFee?: number;
  extraMembersCount?: number;
  extraMembersFee?: number;
  amount: number;
  baseAmount: number;
  additionalMemberAmount: number;
  discountAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partially_paid' | 'waived' | 'failed';
  status?: string;
  paymentMethod: string;
  paymentReference?: string;
  billNumber: string;
  billId: string;
  companyId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CentralTransaction {
  id: string; // TXN-YYYY-XXXXXX
  transactionId: string;
  billNumber: string;
  billId?: string;
  patientId?: string;
  patientName: string;
  patientMobile?: string;
  service: string;
  module: 'consultation' | 'laboratory' | 'pharmacy' | 'cards' | 'family' | 'wallet' | 'opd' | 'lab' | 'other' | 'general';
  relatedModule?: string;
  amount: number;
  discount?: number;
  tax?: number;
  paid: number;
  due: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'netbanking' | 'wallet' | string;
  paymentStatus: 'paid' | 'partial_due' | 'unpaid_due' | 'partial' | 'pending' | 'waived' | 'refunded';
  status?: string;
  membershipName?: string;
  paymentReference?: string;
  staffId?: string;
  staffName: string;
  staffRole?: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  referenceNo?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

export type VoucherCategory =
  | 'opd_consultation'
  | 'diagnostic_lab'
  | 'pharmacy_meds'
  | 'emergency_float'
  | 'health_card_topup'
  | 'all_purpose_cash';

export type VoucherStatus = 'pending' | 'active' | 'redeemed' | 'expired' | 'locked' | 'voided';

export interface CashDeskVoucher {
  id: string; // vch_xxxx
  voucherCode: string; // e.g. LMDX-CSH-2026-XXXXX
  pin: string; // 6 to 8 digit cryptographic numeric PIN
  securityHash: string; // High-entropy verification hash
  authSealCode: string; // e.g. AUTH-SEAL-8924-K9X
  entropyScore?: number; // Entropy bits e.g. 256
  amount: number;
  category: VoucherCategory;
  categoryName: string;
  status: VoucherStatus;
  patientId?: string; // Optional: linked to specific patient
  patientName?: string;
  patientPhone?: string;
  bearerType: 'specific_patient' | 'cash_desk_bearer';
  departmentRestriction?: string;
  doctorRestrictionId?: string;
  doctorRestrictionName?: string;
  validFrom: string;
  validUntil: string;
  issuedBy: string; // Super Admin name
  issuedByUserId: string;
  issueNotes?: string;
  batchId?: string;
  failedPinAttempts: number;
  maxPinAttempts: number;
  isLocked: boolean;
  redeemedAt?: string;
  redeemedBy?: string;
  redeemedPatientId?: string;
  redeemedPatientName?: string;
  redemptionTransactionRef?: string;
  redemptionNotes?: string;
  redemptionChannel?: 'cash_desk_pos' | 'wallet_credit' | 'opd_bill' | 'lab_bill' | 'pharmacy_bill';
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherBatchCreatePayload {
  count: number;
  amount: number;
  category: VoucherCategory;
  validityDays: number;
  bearerType: 'specific_patient' | 'cash_desk_bearer';
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  departmentRestriction?: string;
  doctorRestrictionName?: string;
  notes?: string;
  pinLength?: 6 | 8;
}

// ── NGO & Social Welfare Module Interfaces ──

export type NgoPartnerCategory =
  | 'charity_trust'
  | 'corporate_csr'
  | 'rotary_lions'
  | 'gov_welfare'
  | 'religious_trust'
  | 'foundation';

export interface NgoPartner {
  id: string; // ngo_xxxx
  ngoCode: string; // e.g. NGO-ROTARY-01
  name: string;
  category: NgoPartnerCategory;
  registrationNumber: string;
  taxExemption80G: string;
  taxExemption12A?: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  address: string;
  district?: string;
  state?: string;
  logoUrl?: string;
  mouSignedDate: string;
  mouValidTill: string;
  mouScope: string;
  totalGrantDeposited: number;
  totalAidDisbursed: number;
  activeBalance: number;
  status: 'active' | 'inactive' | 'suspended';
  coBrandedCardEnabled: boolean;
  coBrandCardPrefix?: string;
  defaultDiscountPercent?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type HealthCampCategory =
  | 'general_health'
  | 'diabetes_cardiac'
  | 'eye_vision'
  | 'pediatric_maternal'
  | 'senior_citizen'
  | 'blood_donation'
  | 'specialist_opd';

export type HealthCampStatus = 'scheduled' | 'active_today' | 'completed' | 'cancelled';

export interface HealthCamp {
  id: string; // camp_xxxx
  campCode: string; // e.g. CAMP-2026-081
  title: string;
  ngoPartnerId: string;
  ngoPartnerName: string;
  category: HealthCampCategory;
  campDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  locationAddress: string;
  villageOrPanchayat?: string;
  district: string;
  assignedDoctorIds: string[];
  assignedDoctorNames: string[];
  coordinatorName: string;
  coordinatorPhone: string;
  targetBeneficiaries: number;
  registeredCount: number;
  attendedCount: number;
  testsConductedCount: number;
  freeCardsIssuedCount: number;
  allocatedBudget: number;
  actualSpent: number;
  status: HealthCampStatus;
  freeServicesOffered: string[];
  summaryNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CampAttendeeStatus = 'registered' | 'screened' | 'investigated' | 'prescribed' | 'referred';

export interface CampAttendee {
  id: string; // att_xxxx
  campId: string;
  campCode: string;
  tokenNumber: string; // e.g. T-001
  patientId?: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  villageOrLocality: string;
  vitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    bloodSugar?: number;
    spo2?: number;
    pulseRate?: number;
    weightKg?: number;
    heightCm?: number;
    bmi?: string;
  };
  prescribedTests: string[];
  doctorObservations?: string;
  freeMedicinesDispensed?: string;
  healthCardIssued: boolean;
  cardNumber?: string;
  subsidyAmount: number;
  registeredAt: string;
  status: CampAttendeeStatus;
}

export type CharityGrantCategory =
  | 'bpl_relief'
  | 'emergency_icu'
  | 'cancer_care'
  | 'dialysis_subsidy'
  | 'free_surgery'
  | 'lab_diagnostics'
  | 'senior_aid';

export type CharityGrantStatus = 'pending' | 'approved' | 'disbursed' | 'rejected';

export interface CharityGrant {
  id: string; // grt_xxxx
  grantNumber: string; // e.g. GRANT-2026-0045
  patientId: string;
  patientName: string;
  patientPhone: string;
  bplOrAadhaar: string;
  ngoPartnerId: string;
  ngoPartnerName: string;
  medicalCaseTitle: string;
  category: CharityGrantCategory;
  estimatedTotalBill: number;
  subsidyPercent: number;
  approvedGrantAmount: number;
  approvalStatus: CharityGrantStatus;
  approvedBy?: string;
  approvalDate?: string;
  disbursementDate?: string;
  justification: string;
  voucherId?: string;
  walletTxId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NgoTransactionType = 'deposit' | 'grant_disbursement' | 'camp_expense' | 'adjustment';

export interface NgoFundTransaction {
  id: string; // ngotx_xxxx
  receiptNumber: string; // e.g. 80G-REC-2026-102
  ngoPartnerId: string;
  ngoPartnerName: string;
  type: NgoTransactionType;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cheque' | 'neft_rtgs' | 'upi_csr' | 'grant_allocation';
  referenceNumber: string;
  date: string;
  purpose: string;
  taxExemption80GIssued: boolean;
  balanceAfter: number;
  recordedBy: string;
  createdAt: string;
}

export interface NgoCoBrandCardPayload {
  patientId: string;
  ngoPartnerId: string;
  tierName: string;
  sponsorSubsidy: number;
  notes?: string;
}

// ── Card Printing, Production & Dispatch Hub Types ──
export type CardPrintStatus =
  | 'pending_print'
  | 'in_print_queue'
  | 'printed'
  | 'laminated'
  | 'qc_passed'
  | 'qc_failed';

export type CardDispatchStatus =
  | 'unallocated'
  | 'queued'
  | 'packaged'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned';

export type CardDispatchPriority = 'urgent' | 'high' | 'standard' | 'camp_bulk';

export type CardCourierPartner =
  | 'speed_post'
  | 'bluedart'
  | 'delhivery'
  | 'dtdc'
  | 'executive_hand'
  | 'counter_pickup'
  | 'ngo_camp';

export interface CardDispatchTimelineEvent {
  id: string;
  status: CardDispatchStatus | CardPrintStatus;
  title: string;
  description: string;
  location?: string;
  timestamp: string;
  actor: string;
}

export interface CardDispatchRecord {
  id: string; // e.g. DSP-2026-0001
  cardId: string;
  cardNumber: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  patientEmail?: string;
  bloodGroup?: string;
  address: Address;
  membershipName: string;
  membershipColor: string;
  photoUrl?: string;
  printStatus: CardPrintStatus;
  dispatchStatus: CardDispatchStatus;
  priority: CardDispatchPriority;
  courierPartner: CardCourierPartner;
  consignmentNo: string; // AWB or Postal Barcode e.g. EK894021948IN
  trackingUrl?: string;
  batchId?: string;
  
  // Production milestones
  printedAt?: string;
  printedBy?: string;
  printFormat?: 'cr80_pvc' | 'a4_laminated' | 'smart_chip_rfid';
  
  // QC check
  qcCheckedAt?: string;
  qcCheckedBy?: string;
  nfcUidVerified?: string;
  barcodeVerified?: boolean;
  qcNotes?: string;
  
  // Packaging & Welcome Kit
  packagedAt?: string;
  packagedBy?: string;
  envelopeBarcode?: string;
  kitContents: string[]; // e.g. CR80 Dual-Chip PVC Card, Emergency QR Lanyard, Handbook
  
  // Handover & Shipping
  dispatchedAt?: string;
  dispatchedBy?: string;
  deliveryExecutiveName?: string;
  deliveryExecutivePhone?: string;
  estimatedDelivery?: string;
  
  // Delivery proof
  deliveredAt?: string;
  deliveredTo?: string;
  deliveredRelationship?: string;
  receiverSignatureOrOtp?: string;
  
  // Return / Issue
  returnedAt?: string;
  returnReason?: string;
  
  // Communications
  smsNotificationSent: boolean;
  whatsappNotificationSent: boolean;
  lastNotifiedAt?: string;
  
  timeline: CardDispatchTimelineEvent[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardDispatchBatch {
  id: string; // e.g. BATCH-2026-001
  batchName: string;
  manifestNumber: string; // e.g. MNF-2026-KOL-09
  courierPartner: CardCourierPartner;
  courierPickupPerson?: string;
  courierPickupPhone?: string;
  recordIds: string[];
  totalCards: number;
  status: 'open' | 'locked' | 'handed_over' | 'closed';
  handoverTime?: string;
  handoverOfficer?: string;
  createdAt: string;
  notes?: string;
}

/* =======================================================================
   CENTRALIZED MULTI-DEVICE MANAGEMENT & SESSION TRACKING INTERFACES
   ======================================================================= */

export type DevicePlatformType = 'Desktop' | 'Laptop' | 'Tablet' | 'Mobile';
export type DeviceSessionStatus = 'active' | 'idle' | 'revoked' | 'offline';

export interface DeviceSessionRecord {
  id: string; // Same as deviceId
  deviceId: string;
  userId?: string;
  username?: string;
  userFullName?: string;
  userRole?: string;
  deviceName: string;
  platform: DevicePlatformType;
  browser: string;
  os: string;
  screenResolution?: string;
  ipAddress?: string;
  status: DeviceSessionStatus;
  isCurrentDevice?: boolean;
  lastActiveAt: string;
  registeredAt: string;
  currentRoute?: string;
  walPendingCount?: number;
  syncLatencyMs?: number;
  totalSyncEventsReceived?: number;
  lastSyncTimestamp?: string;
  appVersion?: string;
}

export interface MultiDeviceSyncEvent {
  id: string;
  collection: string;
  docId: string;
  action: 'upsert' | 'delete' | 'reconcile';
  originDeviceId: string;
  originDeviceName?: string;
  originUser?: string;
  timestamp: string;
  payloadSnippet?: string;
}

export interface CentralMultiDeviceMetrics {
  totalRegisteredDevices: number;
  activeDevicesCount: number;
  idleDevicesCount: number;
  revokedDevicesCount: number;
  averageLatencyMs: number;
  lastCentralSyncTime: string;
  walQueueSize: number;
  isCentralFirestoreLive: boolean;
}

/* =======================================================================
   STANDALONE PHARMACY MANAGEMENT HUB INTERFACES
   ======================================================================= */

export interface MedicineMasterItem {
  id: string;
  code: string; // e.g. MED-001
  barcode: string;
  name: string; // Brand / Product Name e.g. Telma 40mg
  genericName: string; // e.g. Telmisartan
  brandName: string; // e.g. Glenmark
  manufacturer: string; // e.g. Glenmark Pharmaceuticals Ltd
  category: string; // Cardiovascular, Anti-Diabetic, Antibiotics, etc.
  dosageForm: string; // Tablet, Capsule, Syrup, Injection, Ointment, etc.
  strength: string; // 40mg, 500mg, 100ml, etc.
  packSize: string; // 10 Tablets/Strip, 100ml Bottle, 1 Vial
  unit: string; // Tablets, Capsules, Strips, Bottles, Vials, Ampoules, Tubes
  hsnSac?: string; // HSN Code e.g. 300490
  taxGstRate: number; // GST % (0, 5, 12, 18, 28)
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  discountRules?: {
    maxDiscountPercent: number;
    allowedRole?: string;
  };
  reorderLevel: number;
  minStock: number;
  maxStock: number;
  prescriptionRequired: boolean;
  status: 'active' | 'inactive';
  description?: string;
  rackLocation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineBatchItem {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  mfgDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  purchaseQty: number;
  freeQty: number;
  availableQty: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: string;
  barcode?: string;
  status: 'active' | 'quarantine' | 'recalled' | 'expired' | 'depleted';
  createdAt: string;
  updatedAt: string;
}

export interface PharmacySupplier {
  id: string;
  supplierCode: string; // e.g. SUP-001
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  drugLicenseNo: string;
  paymentTerms: string; // e.g. "Net 30 Days", "Immediate", "COD"
  outstandingAmount: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyPurchaseItem {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  mrp: number;
  sellingPrice: number;
  taxGstPercent: number;
  taxAmount: number;
  totalAmount: number;
}

export interface PharmacyPurchase {
  id: string;
  purchaseInvoiceNo: string;
  supplierId: string;
  supplierName: string;
  supplierGst?: string;
  invoiceDate: string;
  receivedDate: string;
  items: PharmacyPurchaseItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  netTotal: number;
  paidAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: string;
  receivedBy: string;
  notes?: string;
  status: 'received' | 'draft' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyPurchaseReturn {
  id: string;
  returnNumber: string; // e.g. PR-2026-001
  supplierId: string;
  supplierName: string;
  purchaseInvoiceNo: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  returnRate: number;
  returnAmount: number;
  reason: string;
  authorizedBy: string;
  returnDate: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string;
}

export interface PharmacySaleItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  dispensedQuantity?: number;
  prescriptionItemId?: string;
  mrp: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxGstPercent: number;
  taxAmount: number;
  totalAmount: number;
}

export type PharmacySaleType = 'RETAIL' | 'PRESCRIPTION' | 'walkin' | 'patient_linked' | 'prescription';
export type PharmacySourceType = 'RETAIL' | 'PRESCRIPTION';

export interface PharmacySale {
  id: string;
  invoiceNumber: string; // e.g. LM-PH-2026-000001, PHARM-RET-2026-0001, or PHARM-RX-2026-0001
  saleDate: string;
  saleType: PharmacySaleType;
  sourceType: PharmacySourceType;
  customerType?: 'walkin' | 'registered' | 'card_holder';
  customerId?: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  patientCardNo?: string;
  cardTier?: string;
  doctorId?: string;
  prescribingDoctor?: string;
  prescriptionId?: string; // null / undefined for Retail sales
  dispensingStatus?: 'pending' | 'partially_dispensed' | 'fully_dispensed';
  items: PharmacySaleItem[];
  subtotal: number;
  discountAmount: number;
  healthCardDiscount: number;
  manualDiscountAmount?: number;
  manualDiscountPercent?: number;
  manualDiscountReason?: string;
  manualDiscountApprovedBy?: string;
  taxAmount: number;
  roundOff?: number;
  netTotal: number;
  paidAmount: number;
  dueAmount: number;
  cashReceived?: number;
  changeGiven?: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Health Wallet' | 'Bank Transfer';
  dispensedBy: string;
  status: 'dispensed' | 'returned' | 'cancelled';
  notes?: string;
  isReprint?: boolean;
  reprintCount?: number;
  lastReprintAt?: string;
  lastReprintBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface PharmacySalesReturn {
  id: string;
  returnNumber: string; // e.g. SR-2026-001
  returnType: 'RETAIL' | 'PRESCRIPTION';
  originalInvoiceNo: string;
  saleId: string;
  patientName: string;
  prescriptionId?: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  refundRate: number;
  refundAmount: number;
  returnReason: string;
  stockAction: 'return_to_active' | 'quarantine_damaged' | 'discard_expired';
  authorizedBy: string;
  returnDate: string;
  createdAt: string;
}

export interface PharmacyStockAdjustment {
  id: string;
  adjustmentNumber: string; // e.g. ADJ-2026-001
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  adjustmentType: 'stock_increase' | 'stock_decrease' | 'damaged' | 'expired' | 'audit_reconciliation' | 'correction';
  previousQty: number;
  adjustedQty: number;
  newQty: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export interface PharmacyTransaction {
  id: string;
  transactionId: string; // e.g. PTX-2026-001
  type: 'sale' | 'purchase' | 'sales_return' | 'purchase_return' | 'adjustment' | 'payment_collection' | 'refund';
  referenceId: string; // Invoice #, PR #, etc.
  entityName: string; // Patient or Supplier Name
  amount: number;
  flow: 'inflow' | 'outflow' | 'non_monetary';
  paymentMethod: string;
  performedBy: string;
  notes: string;
  timestamp: string;
}

export interface PharmacyHeldBill {
  id: string;
  holdNumber: string; // e.g. HOLD-2026-0001
  customerType: 'walkin' | 'registered' | 'card_holder';
  patientName: string;
  patientPhone?: string;
  patientId?: string;
  patientCardNo?: string;
  cardTier?: string;
  items: PharmacySaleItem[];
  subtotal: number;
  discountAmount: number;
  manualDiscountPercent?: number;
  manualDiscountReason?: string;
  healthCardDiscount: number;
  taxAmount: number;
  netTotal: number;
  paymentMode?: 'Cash' | 'Card' | 'UPI' | 'Health Wallet' | 'Bank Transfer';
  heldBy: string;
  notes?: string;
  heldAt: string;
}

export interface PharmacyShiftClosing {
  id: string;
  shiftNumber: string; // e.g. SHIFT-2026-0001
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime: string;
  openingCash: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  otherSales: number;
  totalReturnsAmount: number;
  refundsAmount: number;
  totalDiscountsAmount: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  totalSales: number;
  totalTransactions: number;
  notes?: string;
  closedAt: string;
}

// ============================================================================
// NOTIFICATIONS & COMMUNICATION (Module 24)
// ============================================================================

export type NotificationChannel = 'whatsapp' | 'sms' | 'email';

export type NotificationTrigger =
  | 'appointment_reminder'
  | 'report_ready'
  | 'billing_receipt'
  | 'card_renewal'
  | 'card_status'
  | 'custom_broadcast';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface NotificationRecord {
  id: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  patientId?: string;
  cardNumber?: string;
  channel: NotificationChannel;
  trigger: NotificationTrigger;
  title: string;
  message: string;
  status: NotificationStatus;
  sentAt: string;
  deliveredAt?: string;
  metadata?: {
    appointmentId?: string;
    reportNumber?: string;
    invoiceNumber?: string;
    trackingId?: string;
    apiResponse?: string;
    whatsappUrl?: string;
    error?: string;
  };
  dispatchedBy?: string;
}

// ============================================================================
// STANDARD BILL & PRINT CENTER (Module 19)
// ============================================================================

export type PrintDocumentType =
  | 'patient_bill'
  | 'opd_slip'
  | 'lab_receipt'
  | 'pharmacy_pos'
  | 'card_slip';

export interface BillPrintRecord {
  id: string;
  documentType: PrintDocumentType;
  referenceNumber: string;
  patientName: string;
  patientId?: string;
  printedBy: string;
  printCount: number; // 1 = Original, >1 = Official Duplicate / Reprint
  lastPrintedAt: string;
  reprintReason?: string;
  paperFormat: 'A4_half_page' | 'A4_full' | 'thermal_receipt';
}

// ============================================================================
// CLINICAL HOSPITAL DEPARTMENTS (Modules 7-12, 15, 16)
// ============================================================================

// 1. EMERGENCY & CASUALTY (Module 7)
export type EmergencyTriagePriority = 'red' | 'yellow' | 'green' | 'black';
export type EmergencyStatus =
  | 'triaged'
  | 'under_treatment'
  | 'admitted_ipd'
  | 'discharged'
  | 'transferred'
  | 'deceased';

export interface EmergencyEncounter {
  id: string;
  encounterNumber: string;
  patientId: string;
  uhid?: string;
  patientName: string;
  age: number;
  gender: string;
  contactNumber: string;
  arrivalMode: 'ambulance' | 'walk_in' | 'wheelchair' | 'stretcher';
  chiefComplaint: string;
  priority: EmergencyTriagePriority;
  vitals: {
    bpSystolic?: number;
    bpDiastolic?: number;
    pulse?: number;
    temperature?: number;
    spo2?: number;
    respiratoryRate?: number;
    gcsScore?: number;
    painScore?: number;
  };
  attendingDoctorId?: string;
  attendingDoctorName?: string;
  triageNotes: string;
  treatmentNotes?: string;
  medicationsAdministered?: Array<{
    medicineName: string;
    dose: string;
    route: string;
    administeredAt: string;
  }>;
  status: EmergencyStatus;
  convertedToIpdAdmissionId?: string;
  totalEstimatedCharges: number;
  isBilled?: boolean;
  billId?: string;
  arrivedAt: string;
  dischargedAt?: string;
}

// 2. INPATIENT DEPARTMENT (IPD) & ADMISSION (Module 8)
export type AdmissionStatus = 'admitted' | 'transferred' | 'discharge_planned' | 'discharged';
export type AdmissionType = 'emergency' | 'planned_opd' | 'transfer';

export interface IpdDoctorRound {
  id: string;
  admissionId: string;
  doctorId: string;
  doctorName: string;
  timestamp: string;
  clinicalNotes: string;
  treatmentAdvice: string;
  vitalsRecorded?: Record<string, any>;
}

export interface IpdAdmission {
  id: string;
  admissionNumber: string;
  patientId: string;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  bloodGroup?: string;
  contactNumber: string;
  admissionDate: string;
  admissionType: AdmissionType;
  wardId: string;
  wardName: string;
  bedNumber: string;
  attendingDoctorId: string;
  attendingDoctorName: string;
  department: string;
  admittingDiagnosis: string;
  status: AdmissionStatus;
  rounds?: IpdDoctorRound[];
  dailyRoomRate: number;
  advancePaid: number;
  totalCharges: number;
  estimatedDischargeDate?: string;
  actualDischargeDate?: string;
  dischargeSummary?: {
    diagnosis: string;
    hospitalCourse: string;
    conditionAtDischarge: string;
    medicationsOnDischarge: string;
    followUpAdvice: string;
    signedByDoctor: string;
  };
  isFinalBilled?: boolean;
  finalBillId?: string;
}

// 3. WARD & BED MANAGEMENT (Module 9)
export type BedStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';
export type WardType = 'general' | 'icu' | 'ccu' | 'nicu' | 'picu' | 'private' | 'semi_private' | 'emergency';

export interface HospitalBed {
  id: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  status: BedStatus;
  type: string;
  dailyRate: number;
  currentPatientId?: string;
  currentPatientName?: string;
  currentAdmissionId?: string;
  occupiedSince?: string;
  oxygenSupported: boolean;
  ventilatorSupported: boolean;
}

export interface HospitalWard {
  id: string;
  name: string;
  code: string;
  floor: string;
  type: WardType;
  totalBeds: number;
  dailyRate: number;
  supervisorName?: string;
}

// 4. NURSING DEPARTMENT (Module 10)
export interface NursePatientTask {
  id: string;
  admissionId: string;
  patientName: string;
  bedNumber: string;
  nurseId?: string;
  nurseName: string;
  taskType: 'vitals' | 'medication' | 'dressing' | 'iv_fluid' | 'catheter_care' | 'diet';
  description: string;
  dueTime: string;
  completedAt?: string;
  isCompleted: boolean;
  notes?: string;
}

export interface MedicationAdminRecord {
  id: string;
  admissionId: string;
  patientName: string;
  bedNumber: string;
  medicineName: string;
  dosage: string;
  route: string;
  scheduledTime: string;
  administeredTime?: string;
  status: 'scheduled' | 'given' | 'omitted' | 'refused';
  administeredByNurse?: string;
  remarks?: string;
}

export interface IntakeOutputRecord {
  id: string;
  admissionId: string;
  patientName?: string;
  date: string;
  shift: 'morning' | 'evening' | 'night';
  intakeOralMl: number;
  intakeIvMl: number;
  outputUrineMl: number;
  outputDrainsMl: number;
  outputVomitusMl: number;
  balanceNetMl: number;
  recordedByNurse: string;
}

export interface ShiftHandoverNote {
  id: string;
  wardName: string;
  shift: string;
  date: string;
  outgoingNurse: string;
  incomingNurse: string;
  summary: string;
  criticalPatientsCount: number;
  pendingTasksCount: number;
  createdAt: string;
}

// 5. OPERATION THEATRE (OT) & SURGERY (Module 11)
export type SurgeryStatus = 'scheduled' | 'in_preparation' | 'in_surgery' | 'recovery' | 'completed' | 'cancelled';
export type SurgeryCategory =
  | 'general_surgery'
  | 'orthopedic'
  | 'gynaecology'
  | 'cardiac'
  | 'neuro'
  | 'ent'
  | 'ophthalmology'
  | 'urology'
  | 'emergency';

export interface SurgeryBooking {
  id: string;
  otNumber: string;
  patientId: string;
  patientName: string;
  uhid?: string;
  admissionId?: string;
  procedureName: string;
  category: SurgeryCategory;
  leadSurgeonId: string;
  leadSurgeonName: string;
  anaesthetistId?: string;
  anaesthetistName?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledDurationMinutes: number;
  status: SurgeryStatus;
  whoChecklistCompleted: boolean;
  intraOpNotes?: string;
  postOpInstructions?: string;
  theatreCharges: number;
  surgeonCharges: number;
  anaesthesiaCharges: number;
  totalCharges: number;
  isBilled?: boolean;
  billId?: string;
}

// 6. ANAESTHESIA MANAGEMENT (Module 12)
export type AsaPacGrade = 'ASA_I' | 'ASA_II' | 'ASA_III' | 'ASA_IV' | 'ASA_V' | 'ASA_VI' | 'ASA_E';
export type AnaesthesiaType = 'general' | 'spinal' | 'epidural' | 'regional_block' | 'local' | 'sedation_mac';

export interface AnaesthesiaRecord {
  id: string;
  surgeryId: string;
  patientId: string;
  patientName: string;
  anaesthetistName: string;
  pacEvaluationDate: string;
  asaGrade: AsaPacGrade;
  mallampatiScore: 1 | 2 | 3 | 4;
  airwayAssessment: string;
  cardiacHistory?: string;
  respiratoryHistory?: string;
  allergies?: string;
  proposedAnaesthesiaType: AnaesthesiaType;
  preOpMedications?: string;
  npoStatusHours: number;
  pacStatus: 'cleared' | 'cleared_high_risk' | 'deferred';
  intraOpVitalsLog?: Array<{
    time: string;
    bp: string;
    pulse: number;
    spo2: number;
    etco2?: number;
  }>;
  aldreteRecoveryScore?: number;
  recoveryNotes?: string;
}

// 7. RADIOLOGY & IMAGING (Module 15)
export type RadiologyModality = 'x_ray' | 'ultrasound' | 'ct_scan' | 'mri' | 'mammography' | 'dexa' | 'ecg';
export type RadiologyStatus = 'ordered' | 'scheduled' | 'technician_completed' | 'reported' | 'verified';

export interface RadiologyInvestigation {
  id: string;
  accessionNumber: string;
  patientId: string;
  patientName: string;
  uhid?: string;
  referringDoctor?: string;
  modality: RadiologyModality;
  studyName: string;
  bodyPart: string;
  clinicalIndication: string;
  orderedAt: string;
  scheduledFor?: string;
  status: RadiologyStatus;
  technicianName?: string;
  technicianCompletedAt?: string;
  radiologistName?: string;
  radiologistFindings?: string;
  impression?: string;
  recommendations?: string;
  verifiedAt?: string;
  cost: number;
  isBilled?: boolean;
  billId?: string;
}

// 8. BLOOD BANK MANAGEMENT (Module 16)
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Bombay_Oh';
export type BloodComponentType = 'whole_blood' | 'prbc' | 'ffp' | 'platelet_concentrate' | 'cryoprecipitate';
export type BloodUnitStatus = 'in_stock' | 'cross_matched' | 'issued' | 'expired' | 'discarded';

export interface BloodUnitRecord {
  id: string;
  unitBarcode: string;
  bloodGroup: BloodGroup;
  componentType: BloodComponentType;
  volumeMl: number;
  collectionDate: string;
  expiryDate: string;
  storageLocation: string;
  donorId?: string;
  status: BloodUnitStatus;
  hivTest: 'negative' | 'positive';
  hcvTest: 'negative' | 'positive';
  hbsAgTest: 'negative' | 'positive';
  vdrlTest: 'negative' | 'positive';
  malariaTest: 'negative' | 'positive';
  issuedToPatientId?: string;
  issuedToPatientName?: string;
  issuedAt?: string;
}

export interface BloodIssueRequest {
  id: string;
  requestNumber: string;
  patientId: string;
  patientName: string;
  wardOrOt: string;
  bloodGroup: BloodGroup;
  componentRequired: BloodComponentType;
  unitsRequested: number;
  crossMatchCompatibility: 'compatible' | 'incompatible' | 'pending';
  urgency: 'routine' | 'urgent' | 'emergency_crash';
  assignedUnitBarcodes?: string[];
  requestStatus: 'requested' | 'cross_matching' | 'issued' | 'cancelled';
  requisitionDoctor: string;
  requestedAt: string;
}

export interface BloodDonor {
  id: string;
  donorRegNumber: string;
  fullName: string;
  gender: string;
  age: number;
  contactNumber: string;
  bloodGroup: BloodGroup;
  weightKg: number;
  hemoglobinGmDl: number;
  lastDonationDate?: string;
  isEligible: boolean;
  screeningNotes?: string;
}

// -------------------------------------------------------------
// MODULE 29 & 30: INVENTORY / STORE & PROCUREMENT / SUPPLIERS
// -------------------------------------------------------------

export type InventoryCategory =
  | 'medical_supply'
  | 'surgical_ot'
  | 'lab_reagent'
  | 'general'
  | 'radiology_film'
  | 'linen_laundry';

export interface HospitalInventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: InventoryCategory;
  unitOfMeasure: string;
  currentStock: number;
  minimumStockLevel: number;
  reorderQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  unitPurchasePrice: number;
  storeLocation: string;
  lastRestockedDate?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired';
}

export interface HospitalSupplier {
  id: string;
  supplierCode: string;
  supplierName: string;
  category: 'medical_devices' | 'pharmaceuticals' | 'lab_reagents' | 'general_supplies' | 'surgical_instruments';
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxGstNumber: string;
  drugLicenseNumber?: string;
  paymentTerms: string;
  status: 'active' | 'suspended' | 'blacklisted';
  totalPurchasesAmount: number;
  ratingStars: number;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  category: InventoryCategory;
  unitOfMeasure: string;
  orderQuantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  status: PurchaseOrderStatus;
  paymentTerms: string;
  shippingAddress: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  supplierName: string;
  receivedDate: string;
  receivedBy: string;
  vendorInvoiceNumber: string;
  vendorChallanNumber?: string;
  items: {
    itemId: string;
    itemName: string;
    orderedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    batchNumber: string;
    expiryDate?: string;
    unitCost: number;
    totalCost: number;
  }[];
  totalAcceptedAmount: number;
  qcStatus: 'passed' | 'partial' | 'rejected';
  remarks?: string;
}

export interface InventoryIssueRecord {
  id: string;
  issueNumber: string;
  itemId: string;
  itemName: string;
  category: InventoryCategory;
  quantityIssued: number;
  unitOfMeasure: string;
  departmentIssuedTo: 'OT' | 'ICU' | 'Emergency' | 'Laboratory' | 'Radiology' | 'Wards' | 'OPD';
  requisitionedBy: string;
  issuedBy: string;
  issueDate: string;
  remarks?: string;
}


