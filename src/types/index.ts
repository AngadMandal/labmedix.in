export type Role =
  | 'super_admin'
  | 'admin'
  | 'doctor'
  | 'manager'
  | 'reception'
  | 'cashier'
  | 'lab_staff'
  | 'phlebotomist'
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
  | 'permissions_manage';

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

export interface FamilyMemberLink {
  patientId: string;
  relationship: string;
  isPrimary: boolean;
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
  | 'portal';

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

export interface CompanyProfile {
  companyId?: string;
  name: string;
  tagline: string;
  estdYear: string;
  logoUrl: string;
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
  billCategory?: 'registration' | 'card_enrollment' | 'opd_consultation' | 'lab_diagnostics' | 'pharmacy_dispensing' | 'general';
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

export interface VerificationResult {
  verified: boolean;
  type?: 'health_card' | 'staff_pass';
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
  status: 'pending_doctor_approval' | 'doctor_confirmed' | 'in_consultation' | 'completed' | 'rescheduled' | 'cancelled';
  telemedicineRoomUrl?: string;
  consultationFee: number;
  walletDebitStatus?: 'paid' | 'pending' | 'free_card_benefit';
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
  issueCard?: boolean; // Whether an individual CR80 Health Card is requested for this member
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

