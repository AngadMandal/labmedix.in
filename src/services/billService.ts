import { PatientBill, Patient, HealthCard, Membership, User, StaffCardTransaction } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { generateUuid } from '../utils/idGenerator';

export type HospitalBill = PatientBill;
export type { PatientBill };

export interface CreateRegistrationBillParams {
  patient: Patient;
  card?: HealthCard;
  membership?: Membership;
  isCardIssued: boolean;
  familyMembersCount: number;
  maxIncludedMembers?: number;
  additionalMemberFee?: number;
  discountAmount?: number;
  paidAmount?: number;
  paymentMethod?: 'cash' | 'upi' | 'card' | 'netbanking' | 'wallet';
  paymentStatus?: 'paid' | 'pending' | 'waived';
  notes?: string;
  currentUser?: User | null;
}

export class BillService {
  /**
   * Generates a sequential, professional bill number
   * Format: BILL-YYYY-XXXXXX (e.g., BILL-2026-000124)
   */
  public static generateBillNumber(existingBills?: PatientBill[]): string {
    const list = existingBills || StorageService.getBills();
    const currentYear = new Date().getFullYear();
    const prefix = `BILL-${currentYear}-`;

    let maxSeq = 0;
    list.forEach(b => {
      if (b.billNumber && b.billNumber.startsWith(prefix)) {
        const numPart = parseInt(b.billNumber.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });

    const nextSeq = (maxSeq + 1).toString().padStart(6, '0');
    return `${prefix}${nextSeq}`;
  }

  /**
   * Calculates enrollment bill breakdown
   */
  public static calculateCharges(params: {
    isCardIssued: boolean;
    membershipPrice?: number;
    familyMembersCount: number;
    maxIncludedMembers?: number;
    additionalMemberFee?: number;
    discountAmount?: number;
  }) {
    const maxIncluded = params.maxIncludedMembers ?? 5;
    const additionalFeePerMember = params.additionalMemberFee ?? 299;
    const discount = Math.max(0, params.discountAmount || 0);

    // If card issuance is OFF, base card charge is 0
    const baseCardCharge = params.isCardIssued ? Math.max(0, params.membershipPrice || 0) : 0;

    const totalFamily = Math.max(0, params.familyMembersCount);
    const includedMembers = Math.min(totalFamily, maxIncluded);
    const additionalMembers = Math.max(0, totalFamily - maxIncluded);
    const additionalMemberCharge = params.isCardIssued ? (additionalMembers * additionalFeePerMember) : 0;

    const subtotal = baseCardCharge + additionalMemberCharge;
    const netPayable = Math.max(0, subtotal - discount);

    return {
      baseCardCharge,
      includedMembers,
      additionalMembers,
      additionalMemberCharge,
      subtotal,
      discountAmount: discount,
      netPayable
    };
  }

  /**
   * Generates and stores a complete patient enrollment bill with linked financial ledger transaction
   */
  public static createRegistrationBill(params: CreateRegistrationBillParams): PatientBill {
    const company = StorageService.getCompanyProfile();
    const regSettings = company.registrationSettings || {
      enableClinicalTriageDefault: false,
      maxIncludedFamilyMembers: 5,
      additionalMemberFee: 299,
      cardIssuanceDefault: false
    };

    const calculation = this.calculateCharges({
      isCardIssued: params.isCardIssued,
      membershipPrice: params.membership?.registrationFee || 0,
      familyMembersCount: params.familyMembersCount,
      maxIncludedMembers: params.maxIncludedMembers ?? regSettings.maxIncludedFamilyMembers,
      additionalMemberFee: params.additionalMemberFee ?? regSettings.additionalMemberFee,
      discountAmount: params.discountAmount
    });

    const billNumber = this.generateBillNumber();
    const billId = `bill_${generateUuid().slice(0, 8)}`;
    const now = new Date().toISOString();

    const staffUser = params.currentUser || StorageService.getCurrentUser();
    const authorizedStaff = {
      id: staffUser?.id || 'usr_desk',
      name: staffUser?.fullName || 'Registration Desk',
      role: staffUser?.role || 'reception'
    };

    const paid = params.paidAmount !== undefined ? params.paidAmount : calculation.netPayable;
    let paymentStatus: 'paid' | 'pending' | 'waived' = params.paymentStatus || 'paid';
    if (paid <= 0 && calculation.netPayable > 0) {
      paymentStatus = 'pending';
    } else if (calculation.netPayable === 0) {
      paymentStatus = 'waived';
    }

    const transactionId = `TXN-BILL-${Date.now().toString(36).toUpperCase()}`;

    const bill: PatientBill = {
      id: billId,
      billNumber,
      date: now,
      patientId: params.patient.id,
      patientName: params.patient.fullName,
      patientMobile: params.patient.mobile,
      patientAddress: params.patient.address?.fullAddress || `${params.patient.address?.district || ''}, ${params.patient.address?.state || ''}`,
      healthCardId: params.card?.id,
      healthCardNumber: params.card?.cardNumber,
      membershipName: params.card ? (params.membership?.name || 'Smart Health Card') : undefined,
      isCardIssued: params.isCardIssued,
      familyMemberCount: params.familyMembersCount,
      includedMembers: calculation.includedMembers,
      additionalMembers: calculation.additionalMembers,
      baseCardCharge: calculation.baseCardCharge,
      additionalMemberCharge: calculation.additionalMemberCharge,
      discountAmount: calculation.discountAmount,
      netPayable: calculation.netPayable,
      paidAmount: paid,
      paymentStatus,
      paymentMethod: params.paymentMethod || 'cash',
      transactionId,
      authorizedStaff,
      billCategory: 'registration',
      notes: params.notes || (params.isCardIssued
        ? `Health Card enrollment bill for ${params.patient.fullName} (${params.membership?.name || 'Standard'})`
        : `Patient registration bill for ${params.patient.fullName} (No Card)`),
      createdAt: now
    };

    // Save locally and sync to central Firestore
    StorageService.saveBill(bill);

    // Atomically record matching financial transaction in the central ledger
    this.recordBillTransaction(bill, staffUser);

    // Audit trail
    AuditService.log(
      'BILL_GENERATED',
      'wallet',
      `Enrollment bill ${bill.billNumber} generated for patient ${params.patient.fullName} (${params.patient.id}). Total: ₹${bill.netPayable} (Paid: ₹${bill.paidAmount} via ${bill.paymentMethod.toUpperCase()}).`,
      bill.id,
      {
        billNumber: bill.billNumber,
        patientId: bill.patientId,
        cardIssued: bill.isCardIssued,
        cardNumber: bill.healthCardNumber,
        netPayable: bill.netPayable,
        paymentStatus: bill.paymentStatus,
        transactionId
      },
      'financial'
    );

    return bill;
  }

  /**
   * Records a corresponding StaffCardTransaction in the hospital financial ledger for any PatientBill
   */
  public static recordBillTransaction(bill: PatientBill, staffUser?: User | null): StaffCardTransaction {
    const user = staffUser || StorageService.getCurrentUser();
    const txnNumber = bill.transactionId || `TXN-BILL-${Date.now().toString(36).toUpperCase()}`;
    const txnId = `txn_${txnNumber.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}`;
    const now = bill.createdAt || new Date().toISOString();

    const dueAmount = Math.max(0, (bill.netPayable || 0) - (bill.paidAmount || 0));

    // Check if transaction already exists (idempotency guard)
    const existingTxns = StorageService.getCardRequestTransactions();
    const existing = existingTxns.find(t => t.id === txnId || t.transactionId === txnNumber || t.billId === bill.id || t.billNumber === bill.billNumber);
    if (existing) {
      return existing;
    }

    const transaction: StaffCardTransaction = {
      id: txnId,
      transactionId: txnNumber,
      requestId: bill.id,
      applicationNo: bill.billNumber,
      staffUserId: bill.authorizedStaff?.id || user?.id || 'staff_desk',
      staffEmail: user?.email || 'billing@labmedix.org',
      staffName: bill.authorizedStaff?.name || user?.fullName || 'Cashier Desk',
      staffRole: bill.authorizedStaff?.role || user?.role || 'cashier',
      patientId: bill.patientId,
      patientName: bill.patientName,
      patientMobile: bill.patientMobile,
      cardId: bill.healthCardId,
      cardNumber: bill.healthCardNumber,
      membershipId: 'hospital_invoice',
      membershipName: bill.membershipName || (bill.billCategory ? bill.billCategory.replace(/_/g, ' ').toUpperCase() : 'Hospital Invoice'),
      amount: bill.netPayable || 0,
      baseAmount: bill.baseCardCharge || bill.netPayable || 0,
      additionalMemberAmount: bill.additionalMemberCharge || 0,
      discountAmount: bill.discountAmount || 0,
      paidAmount: bill.paidAmount || 0,
      dueAmount,
      paymentStatus: bill.paymentStatus === 'paid' ? 'paid' : bill.paymentStatus === 'waived' ? 'waived' : 'pending',
      paymentMethod: bill.paymentMethod || 'cash',
      paymentReference: txnNumber,
      billNumber: bill.billNumber,
      billId: bill.id,
      notes: bill.notes || `Invoice ${bill.billNumber} for ${bill.patientName}`,
      createdAt: now,
      updatedAt: now
    };

    StorageService.saveCardRequestTransaction(transaction);
    ApiSyncService.saveDocument('card_transactions', transaction.id, transaction).catch(() => {});

    // Also mirror into centralized transaction engine
    try {
      import('./transactionService').then(({ TransactionService }) => {
        TransactionService.recordTransaction({
          id: txnNumber,
          transactionId: txnNumber,
          billNumber: bill.billNumber,
          billId: bill.id,
          patientId: bill.patientId,
          patientName: bill.patientName,
          patientMobile: bill.patientMobile,
          service: bill.membershipName || (bill.billCategory ? bill.billCategory.replace(/_/g, ' ').toUpperCase() : 'Hospital Invoice'),
          module: bill.billCategory === 'opd_consultation' ? 'consultation' :
                  bill.billCategory === 'lab_diagnostics' ? 'laboratory' :
                  bill.billCategory === 'pharmacy_dispensing' ? 'pharmacy' :
                  bill.billCategory === 'card_enrollment' ? 'cards' : 'other',
          amount: bill.netPayable || 0,
          discount: bill.discountAmount || 0,
          paid: bill.paidAmount || 0,
          due: dueAmount,
          paymentMethod: bill.paymentMethod || 'cash',
          paymentStatus: bill.paymentStatus === 'paid' ? 'paid' : bill.paymentStatus === 'waived' ? 'waived' : 'partial_due',
          staffId: transaction.staffUserId,
          staffName: transaction.staffName,
          staffRole: transaction.staffRole,
          date: now,
          notes: bill.notes
        }).catch(() => {});
      });
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_card_request_transactions_v1' } }));
    }

    return transaction;
  }

  /**
   * Universal Hospital Bill Generator
   * Supports OPD Consultation, Diagnostics Lab, Pharmacy Medicines, Health Cards, Family Shield & General Services
   */
  public static createHospitalBill(params: {
    patientId: string;
    patientName: string;
    patientMobile?: string;
    patientAddress?: string;
    healthCardId?: string;
    healthCardNumber?: string;
    billCategory: 'opd_consultation' | 'lab_diagnostics' | 'pharmacy_dispensing' | 'card_enrollment' | 'registration' | 'general';
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    discountAmount?: number;
    paidAmount?: number;
    paymentMethod: 'cash' | 'upi' | 'card' | 'netbanking' | 'wallet';
    notes?: string;
    currentUser?: User | null;
  }): PatientBill {
    const existingBills = StorageService.getBills();
    const billNumber = this.generateBillNumber(existingBills);
    const billId = `bill_${generateUuid().slice(0, 8)}`;
    const now = new Date().toISOString();

    const subtotal = params.items.reduce((sum, item) => sum + (Number(item.quantity || 1) * Number(item.unitPrice || 0)), 0);
    const discount = Math.max(0, params.discountAmount || 0);
    const netPayable = Math.max(0, subtotal - discount);
    const paid = params.paidAmount !== undefined ? params.paidAmount : netPayable;

    let paymentStatus: 'paid' | 'pending' | 'waived' = 'paid';
    if (paid < netPayable && paid > 0) {
      paymentStatus = 'pending';
    } else if (paid === 0 && netPayable > 0) {
      paymentStatus = 'pending';
    } else if (netPayable === 0) {
      paymentStatus = 'waived';
    }

    const staffUser = params.currentUser || StorageService.getCurrentUser();
    const authorizedStaff = {
      id: staffUser?.id || 'usr_staff',
      name: staffUser?.fullName || 'Hospital Cashier',
      role: staffUser?.role || 'cashier'
    };

    const transactionId = `TXN-BILL-${Date.now().toString(36).toUpperCase()}`;

    const bill: PatientBill = {
      id: billId,
      billNumber,
      date: now,
      patientId: params.patientId,
      patientName: params.patientName,
      patientMobile: params.patientMobile || '',
      patientAddress: params.patientAddress,
      healthCardId: params.healthCardId,
      healthCardNumber: params.healthCardNumber,
      isCardIssued: !!params.healthCardNumber,
      familyMemberCount: 0,
      includedMembers: 0,
      additionalMembers: 0,
      baseCardCharge: subtotal,
      additionalMemberCharge: 0,
      discountAmount: discount,
      netPayable,
      paidAmount: paid,
      paymentStatus,
      paymentMethod: params.paymentMethod,
      transactionId,
      authorizedStaff,
      billCategory: params.billCategory,
      items: params.items,
      notes: params.notes || `${params.billCategory.replace(/_/g, ' ').toUpperCase()} Bill for ${params.patientName}`,
      createdAt: now
    };

    StorageService.saveBill(bill);
    this.recordBillTransaction(bill, staffUser);

    AuditService.log(
      'HOSPITAL_BILL_CREATED',
      'wallet',
      `Invoice ${bill.billNumber} (${bill.billCategory}) created for ${params.patientName}. Total: ₹${netPayable}, Paid: ₹${paid}.`,
      bill.id,
      { billNumber: bill.billNumber, category: bill.billCategory, netPayable, paid, staff: authorizedStaff.name },
      'financial'
    );

    return bill;
  }

  public static getAll(): PatientBill[] {
    return StorageService.getBills();
  }

  public static getById(id: string): PatientBill | undefined {
    return StorageService.getBillById(id);
  }
}
