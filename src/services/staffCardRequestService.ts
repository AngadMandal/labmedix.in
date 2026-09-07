import {
  CardApplicationRequest,
  PatientBill,
  StaffCardTransaction,
  Patient,
  User,
  Membership,
  CompanyProfile,
  ApplicationFamilyMember,
  ClinicalVitals
} from '../types';
import { StorageService } from './storage';
import { PortalService } from './portalService';
import { BillService } from './billService';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { checkUserPermission } from '../constants/roles';

export interface SubmitStaffCardRequestParams {
  patientMode: 'existing' | 'new';
  patientId?: string;
  fullName: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  mobile: string;
  whatsapp?: string;
  email?: string;
  bloodGroup: string;
  photoUrl?: string;
  address: {
    villageArea?: string;
    postOffice?: string;
    policeStation?: string;
    district?: string;
    state?: string;
    pinCode?: string;
    fullAddress: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    mobile: string;
  };
  maritalStatus?: string;
  occupation?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  referralChannel?: string;
  referralDetails?: Record<string, any>;
  clinicalTriage?: ClinicalVitals;
  allergies?: string;
  chronicConditions?: string;
  importantNotes?: string;
  familyMembers?: ApplicationFamilyMember[];
  membership: Membership;
  initialDeposit?: number;
  discountAmount?: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentStatus?: 'paid' | 'pending' | 'pending_verification';
  paidAmount?: number;
  urgency?: 'normal' | 'urgent' | 'emergency';
  justificationNotes?: string;
  dispatchPreference?: 'collect_at_clinic' | 'courier' | 'digital_only';
  issueCardDirectly?: boolean; // Default false; only allowed if staff has card_issue permission
  currentUser: User;
}

export interface StaffCardRequestSubmissionResult {
  success: boolean;
  application: CardApplicationRequest;
  bill: PatientBill;
  transaction: StaffCardTransaction;
  error?: string;
}

export interface StaffCardKpis {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  issuedRequests: number;
  rejectedRequests: number;
  returnedRequests: number;
  cancelledRequests: number;
  totalTransactions: number;
  totalBillingAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
}

export class StaffCardRequestService {
  /**
   * Generates sequential Request ID
   * Format: LMX-REQ-YYYY-XXXXXX (e.g. LMX-REQ-2026-000125)
   */
  public static generateRequestId(): string {
    const existing = StorageService.getItem<CardApplicationRequest[]>('labmedix_portal_card_applications_v1', []);
    const currentYear = new Date().getFullYear();
    const prefix = `LMX-REQ-${currentYear}-`;

    let maxSeq = 0;
    existing.forEach((app) => {
      const idStr = app.applicationNo || app.trackingId || '';
      if (idStr.startsWith(prefix)) {
        const numPart = parseInt(idStr.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });

    const nextSeq = (maxSeq + 1).toString().padStart(6, '0');
    return `${prefix}${nextSeq}`;
  }

  /**
   * Submits a new Staff Card Request to Super Admin with atomic Billing & Transaction tracking
   */
  public static async submitStaffCardRequest(
    params: SubmitStaffCardRequestParams
  ): Promise<StaffCardRequestSubmissionResult> {
    const { currentUser, membership } = params;

    // 1. Mandatory Security Verification: Staff active account & permissions
    if (!currentUser || !currentUser.id) {
      throw new Error('Authentication required: Valid staff session not detected.');
    }
    if (currentUser.status === 'inactive') {
      throw new Error('Unauthorized: Staff account has been deactivated by Super Administrator.');
    }
    const canCreate = currentUser.role === 'super_admin' || checkUserPermission(currentUser, 'card_request_create');
    if (!canCreate) {
      throw new Error('Permission Denied: You do not have the required "card_request_create" permission to submit Health Card requests.');
    }

    // 2. Company & Pricing Configuration
    const company: CompanyProfile = StorageService.getCompanyProfile();
    const regSettings = company.registrationSettings || {
      enableClinicalTriageDefault: false,
      maxIncludedFamilyMembers: 5,
      additionalMemberFee: 299,
      cardIssuanceDefault: false
    };

    const maxIncluded = regSettings.maxIncludedFamilyMembers || 5;
    const additionalFeePerMember = regSettings.additionalMemberFee || 299;

    // 3. Family Health Shield Calculation
    const familyList = params.familyMembers || [];
    const totalFamilyCount = familyList.length;
    const includedFamilyCount = Math.min(totalFamilyCount, maxIncluded);
    const extraFamilyCount = Math.max(0, totalFamilyCount - maxIncluded);
    const extraFamilyMembersFee = extraFamilyCount * additionalFeePerMember;

    // 4. Financial Calculations
    const baseCardPrice = Math.max(0, membership.registrationFee || 0);
    const initialFloat = Math.max(0, Number(params.initialDeposit) || 0);
    const discount = Math.max(0, Number(params.discountAmount) || 0);
    const subtotal = baseCardPrice + extraFamilyMembersFee;
    const netTotal = Math.max(0, subtotal - discount + initialFloat);

    const paid = params.paidAmount !== undefined ? Math.max(0, Number(params.paidAmount)) : netTotal;
    const due = Math.max(0, netTotal - paid);

    let paymentStatus: 'paid' | 'pending' | 'partially_paid' | 'waived' | 'failed' = 'paid';
    if (netTotal === 0) {
      paymentStatus = 'waived';
    } else if (paid <= 0) {
      paymentStatus = 'pending';
    } else if (paid < netTotal) {
      paymentStatus = 'partially_paid';
    }

    // 5. Unique Identifiers
    const requestId = this.generateRequestId();
    const appId = `app_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const billNumber = BillService.generateBillNumber();
    const billId = `bill_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const txnNumber = `TXN-REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const txnId = `txn_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    // 6. Direct Card Issuance Guard: OFF by default unless explicit permission
    const canDirectIssue = (currentUser.role === 'super_admin' || checkUserPermission(currentUser, 'card_issue')) && Boolean(params.issueCardDirectly);
    const initialStatus: CardApplicationRequest['status'] = canDirectIssue ? 'approved' : 'pending_review';

    // 7. Assemble CardApplicationRequest
    const newApplication: CardApplicationRequest = {
      id: appId,
      applicationNo: requestId,
      trackingId: requestId,
      fullName: params.fullName.trim(),
      dob: params.dob || '1990-01-01',
      age: params.age || 35,
      gender: params.gender,
      mobile: params.mobile.trim(),
      whatsapp: params.whatsapp?.trim() || params.mobile.trim(),
      email: params.email?.trim() || undefined,
      bloodGroup: params.bloodGroup || 'Unknown / Not Known',
      photoUrl: params.photoUrl || '/logo.jpg',
      address: {
        villageArea: params.address.villageArea || '',
        postOffice: params.address.postOffice || '',
        policeStation: params.address.policeStation || '',
        district: params.address.district || '',
        state: params.address.state || '',
        pinCode: params.address.pinCode || '',
        fullAddress: params.address.fullAddress || 'Walk-In Clinic Registration'
      },
      emergencyContact: {
        name: params.emergencyContact.name.trim() || 'Family',
        relationship: params.emergencyContact.relationship || 'Relative',
        mobile: params.emergencyContact.mobile.trim() || params.mobile.trim()
      },
      medicalInfo: {
        bloodGroup: params.bloodGroup || 'Unknown / Not Known',
        chronicConditions: params.chronicConditions || 'None',
        allergies: params.allergies || 'None',
        importantNotes: params.importantNotes || ''
      },
      familyMembers: familyList,
      extraFamilyMembersCount: extraFamilyCount,
      extraFamilyMembersFee: extraFamilyMembersFee,
      membershipId: membership.id,
      membershipName: membership.name,
      membershipPrice: baseCardPrice,
      initialDeposit: initialFloat,
      totalPaidAmount: netTotal,
      paymentMethod: params.paymentMethod || 'Cash Desk POS',
      paymentReference: params.paymentReference?.trim() || txnNumber,
      paymentStatus: (paymentStatus === 'partially_paid' || paymentStatus === 'waived') ? 'paid' : paymentStatus,
      status: initialStatus,
      requestSource: (params.currentUser.role === 'doctor' ? 'doctor_referral' : params.currentUser.role === 'reception' ? 'reception_desk' : 'staff_portal'),
      submittedByStaffId: currentUser.id,
      submittedByStaffName: currentUser.fullName,
      submittedByStaffRole: currentUser.role,
      submittedByStaffEmail: currentUser.email,
      patientId: params.patientId,
      billId,
      billNumber,
      transactionId: txnNumber,
      urgency: params.urgency || 'normal',
      justificationNotes: params.justificationNotes?.trim() || undefined,
      dispatchPreference: params.dispatchPreference || 'collect_at_clinic',
      adminNotes: [],
      createdAt: now,
      updatedAt: now
    };

    // 8. Assemble PatientBill
    const newBill: PatientBill = {
      id: billId,
      billNumber,
      date: now,
      patientId: params.patientId || `TEMP-${requestId.slice(-6)}`,
      patientName: params.fullName.trim(),
      patientMobile: params.mobile.trim(),
      patientAddress: params.address.fullAddress,
      membershipName: membership.name,
      isCardIssued: canDirectIssue,
      familyMemberCount: totalFamilyCount,
      includedMembers: includedFamilyCount,
      additionalMembers: extraFamilyCount,
      baseCardCharge: baseCardPrice,
      additionalMemberCharge: extraFamilyMembersFee,
      discountAmount: discount,
      netPayable: netTotal,
      paidAmount: paid,
      paymentStatus: paymentStatus === 'partially_paid' ? 'paid' : paymentStatus,
      paymentMethod: (params.paymentMethod?.toLowerCase().includes('upi') ? 'upi' : params.paymentMethod?.toLowerCase().includes('card') ? 'card' : 'cash') as any,
      transactionId: txnNumber,
      authorizedStaff: {
        id: currentUser.id,
        name: currentUser.fullName,
        role: currentUser.role
      },
      notes: `Staff Request #${requestId} for ${params.fullName} (${membership.name}). Included Dependents: ${includedFamilyCount}/${maxIncluded}. Extra Dependents: ${extraFamilyCount} (₹${extraFamilyMembersFee}). Balance Due: ₹${due}.`,
      createdAt: now
    };

    // 9. Assemble StaffCardTransaction
    const newTransaction: StaffCardTransaction = {
      id: txnId,
      transactionId: txnNumber,
      requestId,
      applicationNo: requestId,
      staffUserId: currentUser.id,
      staffEmail: currentUser.email,
      staffName: currentUser.fullName,
      staffRole: currentUser.role,
      patientId: params.patientId || `TEMP-${requestId.slice(-6)}`,
      patientName: params.fullName.trim(),
      membershipId: membership.id,
      membershipName: membership.name,
      amount: netTotal,
      baseAmount: baseCardPrice,
      additionalMemberAmount: extraFamilyMembersFee,
      discountAmount: discount,
      paidAmount: paid,
      dueAmount: due,
      paymentStatus,
      paymentMethod: params.paymentMethod || 'Cash Desk POS',
      paymentReference: params.paymentReference?.trim() || txnNumber,
      billNumber,
      billId,
      notes: `Staff Submission: ${params.fullName} • ${membership.name}`,
      createdAt: now,
      updatedAt: now
    };

    // 10. Atomic Local Storage & Central Firestore Persistence
    PortalService.saveCardApplication(newApplication);
    StorageService.saveBill(newBill);
    StorageService.saveCardRequestTransaction(newTransaction);

    // Multi-device Firestore sync
    await Promise.allSettled([
      ApiSyncService.saveDocument('cardApplications', newApplication.id, newApplication),
      ApiSyncService.saveDocument('bills', newBill.id, newBill),
      ApiSyncService.saveDocument('card_transactions', newTransaction.id, newTransaction)
    ]);

    // 11. Comprehensive Audit Logging
    AuditService.log(
      'STAFF_CARD_REQUEST_SUBMITTED',
      'card',
      `Staff ${currentUser.fullName} (${currentUser.staffId || currentUser.id}) submitted Health Card Request #${requestId} for ${params.fullName} (${membership.name}). Net: ₹${netTotal}, Paid: ₹${paid}, Due: ₹${due}. Bill: ${billNumber}.`,
      newApplication.id,
      {
        requestId,
        applicationId: newApplication.id,
        billNumber,
        transactionId: txnNumber,
        patientName: params.fullName,
        membershipId: membership.id,
        familyCount: totalFamilyCount,
        extraFamilyCount,
        staffId: currentUser.id,
        staffName: currentUser.fullName,
        paymentStatus,
        initialStatus
      },
      'financial'
    );

    return {
      success: true,
      application: newApplication,
      bill: newBill,
      transaction: newTransaction
    };
  }

  /**
   * Returns card requests with Staff-Specific Isolation
   */
  public static getStaffRequests(currentUser: User | null): CardApplicationRequest[] {
    const all = PortalService.getCardApplications();
    if (!currentUser) return [];
    if (currentUser.role === 'super_admin' || checkUserPermission(currentUser, 'card_request_view_all')) {
      return all;
    }
    // Submitting staff view only their own records
    return all.filter(app => app.submittedByStaffId === currentUser.id);
  }

  /**
   * Returns transactions with Staff-Specific Isolation
   */
  public static getStaffTransactions(currentUser: User | null): StaffCardTransaction[] {
    const all = StorageService.getCardRequestTransactions();
    if (!currentUser) return [];
    if (currentUser.role === 'super_admin' || checkUserPermission(currentUser, 'card_transactions_view_all')) {
      return all;
    }
    // Submitting staff view only their own records
    return all.filter(txn => txn.staffUserId === currentUser.id);
  }

  /**
   * Calculates live, Firestore-grounded KPI statistics for the Staff Dashboard
   */
  public static getStaffKpis(currentUser: User | null): StaffCardKpis {
    const requests = this.getStaffRequests(currentUser);
    const transactions = this.getStaffTransactions(currentUser);

    const pendingRequests = requests.filter(r =>
      r.status === 'submitted' || r.status === 'pending_review' || r.status === 'under_review' || r.status === 'pending_approval'
    ).length;

    const approvedRequests = requests.filter(r =>
      r.status === 'approved' || r.status === 'processing' || r.status === 'card_processing'
    ).length;

    const issuedRequests = requests.filter(r =>
      r.status === 'issued' || r.status === 'card_issued' || r.status === 'ready'
    ).length;

    const rejectedRequests = requests.filter(r => r.status === 'rejected').length;
    const returnedRequests = requests.filter(r => r.status === 'returned_for_correction' || r.status === 'info_required').length;
    const cancelledRequests = requests.filter(r => r.status === 'cancelled').length;

    const totalBillingAmount = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalPaidAmount = transactions.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
    const totalDueAmount = transactions.reduce((acc, t) => acc + (t.dueAmount || 0), 0);

    return {
      totalRequests: requests.length,
      pendingRequests,
      approvedRequests,
      issuedRequests,
      rejectedRequests,
      returnedRequests,
      cancelledRequests,
      totalTransactions: transactions.length,
      totalBillingAmount,
      totalPaidAmount,
      totalDueAmount
    };
  }

  /**
   * Super Admin Action: Add Admin Note to Request
   */
  public static async addAdminNote(
    applicationId: string,
    note: string,
    adminUser: User | { fullName?: string; role?: string; id?: string } | string
  ): Promise<{ success: boolean; application?: CardApplicationRequest; error?: string }> {
    if (!note || !note.trim()) {
      return { success: false, error: 'Note content cannot be empty.' };
    }

    const apps = PortalService.getCardApplications();
    const app = apps.find(a => a.id === applicationId);
    if (!app) {
      return { success: false, error: 'Card application request not found.' };
    }

    const adminName = typeof adminUser === 'string'
      ? adminUser
      : adminUser?.fullName || 'Super Administrator';

    const newNote = {
      id: `note_${Date.now()}`,
      note: note.trim(),
      addedBy: adminName,
      addedAt: new Date().toISOString()
    };

    const updatedNotes = [...(app.adminNotes || []), newNote];
    app.adminNotes = updatedNotes;
    app.updatedAt = new Date().toISOString();

    PortalService.saveCardApplication(app);
    await ApiSyncService.saveDocument('cardApplications', app.id, app);

    AuditService.log(
      'ADMIN_NOTE_ADDED',
      'card',
      `Admin note added to Card Request #${app.applicationNo} by ${adminName}: "${note.slice(0, 60)}..."`,
      app.id
    );

    return { success: true, application: app };
  }

  /**
   * Super Admin Action: Return Request for Correction
   */
  public static async returnForCorrection(
    applicationId: string,
    remarks: string,
    adminUser: User | { fullName?: string; role?: string; id?: string } | string
  ): Promise<{ success: boolean; application?: CardApplicationRequest; error?: string }> {
    const apps = PortalService.getCardApplications();
    const app = apps.find(a => a.id === applicationId);
    if (!app) {
      return { success: false, error: 'Card application request not found.' };
    }

    const adminName = typeof adminUser === 'string'
      ? adminUser
      : adminUser?.fullName || 'Super Administrator';

    app.status = 'returned_for_correction';
    app.infoRequiredNote = remarks.trim();
    app.updatedAt = new Date().toISOString();

    const historyItem = {
      id: `hist_${Date.now()}`,
      date: new Date().toISOString(),
      status: 'returned_for_correction',
      title: 'Returned for Correction',
      actor: adminName,
      note: `Returned for correction: ${remarks.trim()}`
    };
    app.processingHistory = [...(app.processingHistory || []), historyItem];

    PortalService.saveCardApplication(app);
    await ApiSyncService.saveDocument('cardApplications', app.id, app);

    AuditService.log(
      'CARD_REQUEST_RETURNED',
      'card',
      `Card Request #${app.applicationNo} returned for correction by ${adminName}. Remarks: ${remarks}`,
      app.id
    );

    return { success: true, application: app };
  }
}
