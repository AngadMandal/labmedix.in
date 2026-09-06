import { PatientBill, Patient, HealthCard, Membership, User } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { generateUuid } from '../utils/idGenerator';

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
   * Generates and stores a complete patient enrollment bill
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
      transactionId: `TXN-BILL-${Date.now().toString(36).toUpperCase()}`,
      authorizedStaff,
      notes: params.notes || (params.isCardIssued
        ? `Health Card enrollment bill for ${params.patient.fullName} (${params.membership?.name || 'Standard'})`
        : `Patient registration bill for ${params.patient.fullName} (No Card)`),
      createdAt: now
    };

    // Save locally and sync to central Firestore
    StorageService.saveBill(bill);

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
        paymentStatus: bill.paymentStatus
      },
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
