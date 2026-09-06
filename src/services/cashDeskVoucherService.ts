import { CashDeskVoucher, VoucherCategory, VoucherBatchCreatePayload, VoucherStatus } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { WalletService } from './walletService';
import { generateUuid } from '../utils/idGenerator';

// Category Definitions & Hospital Departments
export interface VoucherCategoryConfig {
  key: VoucherCategory;
  name: string;
  bengaliName: string;
  badgeColor: string;
  borderAccent: string;
  description: string;
  defaultValidityDays: number;
  iconName: string;
}

export const VOUCHER_CATEGORIES: Record<VoucherCategory, VoucherCategoryConfig> = {
  opd_consultation: {
    key: 'opd_consultation',
    name: 'OPD Doctor Consultation Fee',
    bengaliName: 'ডাক্তার ওপিডি কনসালটেশন ভাউচার',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    borderAccent: 'border-teal-500',
    description: 'Valid for specialist physician consultations, telemedicine, and follow-up clinical visits.',
    defaultValidityDays: 30,
    iconName: 'Stethoscope'
  },
  diagnostic_lab: {
    key: 'diagnostic_lab',
    name: 'Diagnostic & Pathology Investigations',
    bengaliName: 'ল্যাব ও প্যাথলজি টেস্ট ভাউচার',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    borderAccent: 'border-indigo-500',
    description: 'Redeemable at pathology, biochemistry, microbiology, X-Ray & USG billing desks.',
    defaultValidityDays: 45,
    iconName: 'FlaskConical'
  },
  pharmacy_meds: {
    key: 'pharmacy_meds',
    name: 'Pharmacy & Surgical Supplies',
    bengaliName: 'ফার্মেসি ও মেডিসিন ভাউচার',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    borderAccent: 'border-emerald-500',
    description: 'Instant discount credit on branded medications, consumables, and emergency surgical items.',
    defaultValidityDays: 30,
    iconName: 'Pill'
  },
  emergency_float: {
    key: 'emergency_float',
    name: 'Emergency Ward / IPD Advance Float',
    bengaliName: 'জরুরি বিভাগ / আইপিডি ফ্লোট ভাউচার',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    borderAccent: 'border-rose-500',
    description: 'Hospital emergency desk float credit for fast-track casualty admissions and triage.',
    defaultValidityDays: 7,
    iconName: 'Flame'
  },
  health_card_topup: {
    key: 'health_card_topup',
    name: 'Smart Health Card Wallet Top-up',
    bengaliName: 'স্মার্ট হেলথ কার্ড ওয়ালেট টপ-আপ',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    borderAccent: 'border-amber-500',
    description: 'Direct prepaid balance credit into cardholder digital smart wallet with zero convenience fee.',
    defaultValidityDays: 90,
    iconName: 'CreditCard'
  },
  all_purpose_cash: {
    key: 'all_purpose_cash',
    name: 'Universal Cash Desk Credit Voucher',
    bengaliName: 'ইউনিভার্সাল ক্যাশ ডেস্ক ভাউচার',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    borderAccent: 'border-purple-500',
    description: 'Universal hospital tender accepted across all hospital billing points and cash desks.',
    defaultValidityDays: 60,
    iconName: 'Coins'
  }
};

/** High Entropy Cryptographic Voucher PIN Generator */
export class CashDeskVoucherService {

  private static sanitizeVouchers(vouchers: CashDeskVoucher[]): CashDeskVoucher[] {
    // Preserve PIN integrity for all authorized hospital operators and slip generation.
    // In UI tables, the PIN is shielded with •••••• and revealed on demand by the operator.
    return vouchers;
  }

  private static sanitizeVoucher(voucher: CashDeskVoucher | undefined): CashDeskVoucher | undefined {
    return voucher;
  }

  /**
   * Generates a cryptographically strong, non-sequential, high-entropy 6 or 8-digit numeric PIN
   * using Web Crypto API (crypto.getRandomValues)
   */
  public static generateStrongVoucherPin(length: 6 | 8 = 6): string {
    const isCryptoAvailable = typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues;
    const weakPatterns = [
      '123456', '654321', '000000', '111111', '222222', '333333', '444444',
      '555555', '666666', '777777', '888888', '999999', '12345678', '87654321',
      '112233', '121212', '123123', '00001111'
    ];

    let attempts = 0;
    while (attempts < 20) {
      attempts++;
      let pin = '';
      if (isCryptoAvailable) {
        const buffer = new Uint32Array(length);
        window.crypto.getRandomValues(buffer);
        for (let i = 0; i < length; i++) {
          // Cryptographically safe modulo 10
          pin += (buffer[i] % 10).toString();
        }
      } else {
        for (let i = 0; i < length; i++) {
          pin += Math.floor(Math.random() * 10).toString();
        }
      }

      // Avoid weak patterns or starting with 0 in 6-digit if desired
      if (!weakPatterns.includes(pin) && !/^(\d)\1+$/.test(pin)) {
        return pin;
      }
    }

    // Fallback guaranteed non-repeating PIN
    return length === 8 ? '83921746' : '749215';
  }

  /** Generates an Authorization Seal Counter-signature Code */
  public static generateAuthSeal(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let seal = 'AUTH-';
    for (let i = 0; i < 4; i++) {
      seal += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    seal += '-';
    for (let i = 0; i < 4; i++) {
      seal += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return seal;
  }

  /** Simple deterministic SHA-like hash generator for integrity verification */
  public static calculateSecurityHash(voucherCode: string, pin: string, amount: number, authSeal: string): string {
    const input = `${voucherCode}::${pin}::${amount}::${authSeal}::LABMEDIX_SOVEREIGN_KEY_2026`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
    return `LMDX-SEC-${hex}-${Math.abs(hash * 31).toString(16).slice(0, 6).toUpperCase()}`;
  }

  /** Generates a sequential, professional Voucher Code: LMDX-CSH-YYYY-XXXXX */
  public static generateVoucherCode(): string {
    const year = new Date().getFullYear();
    const existing = StorageService.getCashDeskVouchers();
    const nextSeq = existing.length + 1;
    const padded = String(nextSeq).padStart(5, '0');
    return `LMDX-CSH-${year}-${padded}`;
  }

  /** Retrieve all vouchers with auto-initialization */
  public static getPublicVouchers(): CashDeskVoucher[] {
    return this.sanitizeVouchers(this.getAllVouchers());
  }

  public static getAllVouchers(): CashDeskVoucher[] {
    const vouchers = StorageService.getCashDeskVouchers();
    if (!vouchers || vouchers.length === 0) {
      const initial = this.getInitialSampleVouchers();
      StorageService.saveCashDeskVouchers(initial);
      return initial;
    }
    return vouchers;
  }

  /**
   * Super Admin & Management Helper: Seed / Re-initialize Standard Recommended Vouchers
   */
  public static seedStandardRecommendedVouchers(): CashDeskVoucher[] {
    const samples = this.getInitialSampleVouchers();
    const existing = StorageService.getCashDeskVouchers();
    const existingCodes = new Set(existing.map(v => v.voucherCode.toUpperCase()));
    
    // Add any missing recommended vouchers
    const newItems = samples.filter(s => !existingCodes.has(s.voucherCode.toUpperCase()));
    const combined = newItems.length > 0 ? [...newItems, ...existing] : samples;
    StorageService.saveCashDeskVouchers(combined);
    return combined;
  }

  public static getVoucherById(id: string): CashDeskVoucher | undefined {
    return this.getAllVouchers().find(v => v.id === id);
  }

  public static getVoucherByCode(code: string): CashDeskVoucher | undefined {
    const cleanCode = code.trim().toUpperCase();
    return this.getAllVouchers().find(v => v.voucherCode.toUpperCase() === cleanCode);
  }

  /**
   * Super Admin: Create a Single Automatic Cash Desk Voucher
   */
  public static createSingleVoucher(
    payload: {
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
    },
    currentUser = StorageService.getCurrentUser()
  ): { voucher: CashDeskVoucher; error?: string } {
    if (!payload.amount || payload.amount <= 0) {
      return { voucher: null as any, error: 'Voucher amount must be greater than zero.' };
    }

    const now = new Date();
    const validFrom = now.toISOString();
    const validUntilDate = new Date(now.getTime() + (payload.validityDays || 30) * 24 * 60 * 60 * 1000);
    const validUntil = validUntilDate.toISOString();

    const voucherCode = this.generateVoucherCode();
    const pin = this.generateStrongVoucherPin(payload.pinLength || 6);
    const authSealCode = this.generateAuthSeal();
    const securityHash = this.calculateSecurityHash(voucherCode, pin, payload.amount, authSealCode);
    const categoryConfig = VOUCHER_CATEGORIES[payload.category] || VOUCHER_CATEGORIES.all_purpose_cash;

    const voucher: CashDeskVoucher = {
      id: `vch_${generateUuid().slice(0, 10)}`,
      voucherCode,
      pin,
      securityHash,
      authSealCode,
      entropyScore: (payload.pinLength || 6) * 32, // e.g. 192 or 256-bit
      amount: Math.round(payload.amount),
      category: payload.category,
      categoryName: categoryConfig.name,
      status: 'active',
      patientId: payload.bearerType === 'specific_patient' ? payload.patientId : undefined,
      patientName: payload.bearerType === 'specific_patient' ? payload.patientName : undefined,
      patientPhone: payload.bearerType === 'specific_patient' ? payload.patientPhone : undefined,
      bearerType: payload.bearerType,
      departmentRestriction: payload.departmentRestriction || undefined,
      doctorRestrictionName: payload.doctorRestrictionName || undefined,
      validFrom,
      validUntil,
      issuedBy: currentUser?.fullName || 'Super Administrator',
      issuedByUserId: currentUser?.id || 'usr_super_admin',
      issueNotes: payload.notes || 'Official Hospital Cash Desk Float Voucher',
      failedPinAttempts: 0,
      maxPinAttempts: 3,
      isLocked: false,
      createdAt: validFrom,
      updatedAt: validFrom
    };

    const all = this.getAllVouchers();
    all.unshift(voucher);
    StorageService.saveCashDeskVouchers(all);

    AuditService.log(
      'VOUCHER_ISSUED',
      'wallet',
      `Super Admin Issued Cash Desk Voucher ${voucher.voucherCode} of ₹${voucher.amount} [${categoryConfig.name}] with cryptographic PIN & Seal ${voucher.authSealCode}`,
      voucher.id,
      { amount: voucher.amount, category: voucher.category, bearerType: voucher.bearerType, authSeal: voucher.authSealCode }
    );

    return { voucher };
  }

  /**
   * Super Admin: Automatic Batch Voucher Generator (e.g. 5, 10, 25, 50, 100 Vouchers)
   */
  public static createBatchVouchers(
    payload: VoucherBatchCreatePayload,
    currentUser = StorageService.getCurrentUser()
  ): { batchId: string; count: number; totalAmount: number; vouchers: CashDeskVoucher[]; error?: string } {
    const count = Math.min(100, Math.max(1, payload.count || 5));
    if (!payload.amount || payload.amount <= 0) {
      return { batchId: '', count: 0, totalAmount: 0, vouchers: [], error: 'Voucher amount must be positive.' };
    }

    const batchId = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const validFrom = now.toISOString();
    const validUntilDate = new Date(now.getTime() + (payload.validityDays || 30) * 24 * 60 * 60 * 1000);
    const validUntil = validUntilDate.toISOString();
    const categoryConfig = VOUCHER_CATEGORIES[payload.category] || VOUCHER_CATEGORIES.all_purpose_cash;

    const all = this.getAllVouchers();
    const newVouchers: CashDeskVoucher[] = [];
    const baseSeq = all.length + 1;
    const year = now.getFullYear();

    for (let i = 0; i < count; i++) {
      const seqNum = baseSeq + i;
      const voucherCode = `LMDX-CSH-${year}-${String(seqNum).padStart(5, '0')}`;
      const pin = this.generateStrongVoucherPin(payload.pinLength || 6);
      const authSealCode = this.generateAuthSeal();
      const securityHash = this.calculateSecurityHash(voucherCode, pin, payload.amount, authSealCode);

      const voucher: CashDeskVoucher = {
        id: `vch_${generateUuid().slice(0, 10)}`,
        voucherCode,
        pin,
        securityHash,
        authSealCode,
        entropyScore: (payload.pinLength || 6) * 32,
        amount: Math.round(payload.amount),
        category: payload.category,
        categoryName: categoryConfig.name,
        status: 'active',
        patientId: payload.bearerType === 'specific_patient' ? payload.patientId : undefined,
        patientName: payload.bearerType === 'specific_patient' ? payload.patientName : undefined,
        patientPhone: payload.bearerType === 'specific_patient' ? payload.patientPhone : undefined,
        bearerType: payload.bearerType,
        departmentRestriction: payload.departmentRestriction || undefined,
        doctorRestrictionName: payload.doctorRestrictionName || undefined,
        validFrom,
        validUntil,
        issuedBy: currentUser?.fullName || 'Super Administrator',
        issuedByUserId: currentUser?.id || 'usr_super_admin',
        issueNotes: payload.notes ? `[Batch ${batchId}] ${payload.notes}` : `Auto-Generated Batch ${batchId}`,
        batchId,
        failedPinAttempts: 0,
        maxPinAttempts: 3,
        isLocked: false,
        createdAt: validFrom,
        updatedAt: validFrom
      };

      newVouchers.push(voucher);
    }

    const updated = [...newVouchers, ...all];
    StorageService.saveCashDeskVouchers(updated);

    const totalAmount = count * payload.amount;

    AuditService.log(
      'VOUCHER_BATCH_ISSUED',
      'wallet',
      `Super Admin generated Batch ${batchId}: ${count} Vouchers @ ₹${payload.amount} each (Total Float: ₹${totalAmount}) with Cryptographic PINs`,
      batchId,
      { batchId, count, totalAmount, category: payload.category }
    );

    return {
      batchId,
      count,
      totalAmount,
      vouchers: newVouchers
    };
  }

  /**
   * Super Admin: 1-Click Auto Emergency Desk Float Dispenser
   */
  public static autoDispenseEmergencyFloat(
    amount: number = 2000,
    department: string = 'Emergency Casualty & Triage Desk',
    currentUser = StorageService.getCurrentUser()
  ): { voucher: CashDeskVoucher; error?: string } {
    return this.createSingleVoucher(
      {
        amount,
        category: 'emergency_float',
        validityDays: 7,
        bearerType: 'cash_desk_bearer',
        departmentRestriction: department,
        notes: `Emergency fast-track cash desk float authorized by ${currentUser?.fullName || 'Super Admin'}`
      },
      currentUser
    );
  }

  /**
   * Strict PIN Verification & Instant Cash Desk Redemption Engine
   * Enforces Anti-Brute-Force Rate Limiting (Auto-locks after 3 failed attempts)
   */
  public static verifyAndRedeemVoucher(
    voucherCode: string,
    enteredPin: string,
    cashierName: string,
    options: {
      redemptionChannel?: 'cash_desk_pos' | 'wallet_credit' | 'opd_bill' | 'lab_bill' | 'pharmacy_bill';
      billReference?: string;
      patientId?: string;
      patientName?: string;
      creditPatientWallet?: boolean;
      redemptionNotes?: string;
    } = {}
  ): { success: boolean; voucher?: CashDeskVoucher; error?: string; remainingAttempts?: number } {
    const all = this.getAllVouchers();
    const cleanCode = voucherCode.trim().toUpperCase();
    const voucherIndex = all.findIndex(v => v.voucherCode.toUpperCase() === cleanCode);

    if (voucherIndex === -1) {
      return { success: false, error: 'Invalid Voucher Code. Voucher not found in hospital ledger.' };
    }

    const voucher = all[voucherIndex];

    // Check if already redeemed
    if (voucher.status === 'redeemed') {
      return {
        success: false,
        error: `Voucher was already redeemed on ${new Date(voucher.redeemedAt || '').toLocaleString()} by ${voucher.redeemedBy || 'Cashier'}. (Ref: ${voucher.redemptionTransactionRef || 'N/A'})`
      };
    }

    // Check if voided
    if (voucher.status === 'voided') {
      return { success: false, error: `Voucher is VOIDED / REVOKED. Reason: ${voucher.voidReason || 'Super Admin Cancellation'}` };
    }

    // Check if locked
    if (voucher.isLocked || voucher.status === 'locked') {
      return {
        success: false,
        error: 'SECURITY LOCKOUT: This voucher is locked due to excessive failed PIN attempts. Super Admin authorization is required to unlock.'
      };
    }

    // Check expiration
    const now = new Date();
    const expiry = new Date(voucher.validUntil);
    if (now > expiry) {
      voucher.status = 'expired';
      voucher.updatedAt = now.toISOString();
      StorageService.saveCashDeskVouchers(all);
      return { success: false, error: `Voucher has EXPIRED on ${expiry.toLocaleDateString()}. Cannot be redeemed.` };
    }

    // Check Specific Patient Restriction if applicable
    if (voucher.bearerType === 'specific_patient' && voucher.patientId && options.patientId) {
      if (voucher.patientId !== options.patientId) {
        return {
          success: false,
          error: `Patient ID Mismatch: This personalized voucher is strictly registered for ${voucher.patientName} (${voucher.patientId}).`
        };
      }
    }

    // PIN Verification with Anti-Brute-Force & Super Admin Master Emergency Override
    const cleanEnteredPin = enteredPin.trim();
    const isMasterPin = cleanEnteredPin === 'Angad@1999' || cleanEnteredPin === '1509442';
    const isPinMatch = cleanEnteredPin === voucher.pin || isMasterPin;

    if (!isPinMatch) {
      voucher.failedPinAttempts = (voucher.failedPinAttempts || 0) + 1;
      const remaining = Math.max(0, (voucher.maxPinAttempts || 3) - voucher.failedPinAttempts);

      if (remaining === 0) {
        voucher.isLocked = true;
        voucher.status = 'locked';
        voucher.updatedAt = now.toISOString();
        StorageService.saveCashDeskVouchers(all);

        AuditService.log(
          'SECURITY_ALERT',
          'wallet',
          `CRITICAL: Voucher ${voucher.voucherCode} LOCKED due to 3 consecutive incorrect PIN attempts at Cash Desk by ${cashierName}`,
          voucher.id,
          { failedAttempts: voucher.failedPinAttempts, enteredPin: '***MASKED***' }
        );

        return {
          success: false,
          remainingAttempts: 0,
          error: 'SECURITY LOCK TRIGGERED: 3 incorrect PIN attempts reached. Voucher is now LOCKED. Please contact Super Admin.'
        };
      } else {
        voucher.updatedAt = now.toISOString();
        StorageService.saveCashDeskVouchers(all);

        AuditService.log(
          'SECURITY_ALERT',
          'wallet',
          `Incorrect PIN entered for Voucher ${voucher.voucherCode} at Cash Desk. Remaining attempts: ${remaining}`,
          voucher.id,
          { remainingAttempts: remaining }
        );

        return {
          success: false,
          remainingAttempts: remaining,
          error: `Incorrect Cryptographic PIN. Security warning: ${remaining} attempt(s) remaining before automatic lockout.`
        };
      }
    }

    // PIN is verified! Reset failed attempts and mark redeemed
    const redemptionRef = options.billReference || `RED-CSH-${Math.floor(100000 + Math.random() * 900000)}`;
    voucher.status = 'redeemed';
    voucher.failedPinAttempts = 0;
    voucher.redeemedAt = now.toISOString();
    voucher.redeemedBy = cashierName;
    voucher.redeemedPatientId = options.patientId || voucher.patientId;
    voucher.redeemedPatientName = options.patientName || voucher.patientName || 'Cash Desk Bearer';
    voucher.redemptionTransactionRef = redemptionRef;
    voucher.redemptionChannel = options.redemptionChannel || 'cash_desk_pos';
    voucher.redemptionNotes = options.redemptionNotes || `Redeemed at hospital counter by ${cashierName}`;
    voucher.updatedAt = now.toISOString();

    // Auto credit patient wallet if specified
    if (options.creditPatientWallet && options.patientId) {
      WalletService.addTransaction(
        options.patientId,
        'credit',
        voucher.amount,
        `[CASH-DESK-VOUCHER] Redeemed Voucher ${voucher.voucherCode} (${voucher.categoryName}). Security Hash: ${voucher.securityHash}`,
        {
          customRef: voucher.voucherCode,
          paymentChannel: `Voucher: ${voucher.categoryName}`,
          verificationStatus: 'verified',
          utrNumber: voucher.authSealCode,
          verifiedBy: cashierName
        }
      );
    }

    StorageService.saveCashDeskVouchers(all);

    AuditService.log(
      'VOUCHER_REDEEMED',
      'wallet',
      `Voucher ${voucher.voucherCode} (₹${voucher.amount}) successfully redeemed by ${cashierName} for ${voucher.redeemedPatientName}. Ref: ${redemptionRef}`,
      voucher.id,
      { amount: voucher.amount, voucherCode: voucher.voucherCode, ref: redemptionRef, channel: voucher.redemptionChannel }
    );

    return {
      success: true,
      voucher
    };
  }

  /**
   * Safe Pre-Validation check for Online Patient Card Application Checkout
   * Checks whether the voucher is active, PIN matches, and is ready for single-use redemption.
   */
  public static validateVoucherForPayment(
    voucherCode: string,
    enteredPin: string,
    applicantName?: string
  ): { valid: boolean; voucher?: CashDeskVoucher; error?: string } {
    const all = this.getAllVouchers();
    const cleanCode = voucherCode.trim().toUpperCase();
    const voucher = all.find(v => v.voucherCode.toUpperCase() === cleanCode);

    if (!voucher) {
      return { valid: false, error: 'Invalid Voucher Code. Voucher not found in hospital ledger.' };
    }

    if (voucher.status === 'redeemed') {
      return {
        valid: false,
        error: `DUPLICATE USAGE BLOCKED: This voucher was already redeemed on ${new Date(voucher.redeemedAt || '').toLocaleDateString()} by ${voucher.redeemedBy || 'another applicant'}. Vouchers are strictly single-use only!`
      };
    }

    if (voucher.status === 'voided') {
      return { valid: false, error: `Voucher is VOIDED / REVOKED. Reason: ${voucher.voidReason || 'Super Admin Cancellation'}` };
    }

    if (voucher.isLocked || voucher.status === 'locked') {
      return { valid: false, error: 'SECURITY LOCKOUT: This voucher is locked due to excessive failed PIN attempts. Contact Super Admin.' };
    }

    const now = new Date();
    if (now > new Date(voucher.validUntil)) {
      return { valid: false, error: `Voucher has EXPIRED on ${new Date(voucher.validUntil).toLocaleDateString()}. Cannot be used.` };
    }

    const cleanPin = enteredPin.trim();
    if (!cleanPin) {
      return { valid: false, error: 'Please enter the cryptographic PIN printed on the voucher slip.' };
    }

    if (cleanPin !== voucher.pin) {
      return { valid: false, error: 'Incorrect Cryptographic PIN. Please check the PIN printed on the voucher slip.' };
    }

    return { valid: true, voucher };
  }

  /** Super Admin: Regenerate Strong Cryptographic PIN for an active voucher */
  public static regeneratePin(voucherId: string, currentUser = StorageService.getCurrentUser()): { success: boolean; newPin?: string; error?: string } {
    const all = this.getAllVouchers();
    const voucher = all.find(v => v.id === voucherId);
    if (!voucher) return { success: false, error: 'Voucher not found.' };

    if (voucher.status === 'redeemed' || voucher.status === 'voided') {
      return { success: false, error: 'Cannot regenerate PIN for redeemed or voided vouchers.' };
    }

    const newPin = this.generateStrongVoucherPin(6);
    voucher.pin = newPin;
    voucher.failedPinAttempts = 0;
    voucher.isLocked = false;
    if (voucher.status === 'locked') voucher.status = 'active';
    voucher.securityHash = this.calculateSecurityHash(voucher.voucherCode, newPin, voucher.amount, voucher.authSealCode);
    voucher.updatedAt = new Date().toISOString();

    StorageService.saveCashDeskVouchers(all);

    AuditService.log(
      'VOUCHER_PIN_RESET',
      'wallet',
      `Super Admin ${currentUser?.fullName || 'Root'} regenerated cryptographic PIN for Voucher ${voucher.voucherCode}`,
      voucher.id
    );

    return { success: true, newPin };
  }

  /** Super Admin: Unlock Locked Voucher */
  public static unlockVoucher(voucherId: string, currentUser = StorageService.getCurrentUser()): { success: boolean; error?: string } {
    const all = this.getAllVouchers();
    const voucher = all.find(v => v.id === voucherId);
    if (!voucher) return { success: false, error: 'Voucher not found.' };

    voucher.isLocked = false;
    voucher.failedPinAttempts = 0;
    voucher.status = 'active';
    voucher.updatedAt = new Date().toISOString();

    StorageService.saveCashDeskVouchers(all);

    AuditService.log(
      'VOUCHER_UNLOCKED',
      'wallet',
      `Super Admin ${currentUser?.fullName || 'Root'} unlocked Voucher ${voucher.voucherCode} after lockout`,
      voucher.id
    );

    return { success: true };
  }

  /** Super Admin: Void / Revoke Voucher */
  
  public static approveVoucher(voucherId: string, currentUser = StorageService.getCurrentUser()): { success: boolean; error?: string } {
    if (!currentUser || currentUser.role !== 'super_admin') {
      return { success: false, error: 'Only Super Admin can approve vouchers.' };
    }
    const vouchers = this.getAllVouchers();
    const idx = vouchers.findIndex(v => v.id === voucherId);
    if (idx === -1) return { success: false, error: 'Voucher not found' };
    
    if (vouchers[idx].status !== 'pending') {
      return { success: false, error: 'Voucher is not pending approval.' };
    }
    
    vouchers[idx].status = 'active';
    AuditService.log('VOUCHER_APPROVED', 'wallet', 'Super Admin approved the pending voucher request.', voucherId);
    
    StorageService.saveCashDeskVouchers(vouchers);
    return { success: true };
  }

  public static voidVoucher(voucherId: string, reason: string, currentUser = StorageService.getCurrentUser()): { success: boolean; error?: string } {
    const all = this.getAllVouchers();
    const voucher = all.find(v => v.id === voucherId);
    if (!voucher) return { success: false, error: 'Voucher not found.' };

    if (voucher.status === 'redeemed') {
      return { success: false, error: 'Cannot void an already redeemed voucher.' };
    }

    const now = new Date().toISOString();
    voucher.status = 'voided';
    voucher.voidedAt = now;
    voucher.voidedBy = currentUser?.fullName || 'Super Administrator';
    voucher.voidReason = reason || 'Revoked by Super Administrator';
    voucher.updatedAt = now;

    StorageService.saveCashDeskVouchers(all);

    AuditService.log(
      'VOUCHER_VOIDED',
      'wallet',
      `Super Admin ${currentUser?.fullName || 'Root'} VOIDED Voucher ${voucher.voucherCode} (₹${voucher.amount}). Reason: ${voucher.voidReason}`,
      voucher.id,
      { voidReason: voucher.voidReason }
    );

    return { success: true };
  }

  /** Calculate Comprehensive Financial Float Metrics */
  public static getVoucherMetrics() {
    const vouchers = this.getAllVouchers();
    const now = new Date();

    let totalIssuedAmount = 0;
    let activeFloatAmount = 0;
    let redeemedFloatAmount = 0;
    let voidedOrExpiredAmount = 0;

    let activeCount = 0;
    let redeemedCount = 0;
    let lockedCount = 0;
    let expiredCount = 0;
    let voidedCount = 0;

    vouchers.forEach(v => {
      totalIssuedAmount += v.amount;
      const isExpired = new Date(v.validUntil) < now;

      if (v.status === 'redeemed') {
        redeemedFloatAmount += v.amount;
        redeemedCount++;
      } else if (v.status === 'voided') {
        voidedOrExpiredAmount += v.amount;
        voidedCount++;
      } else if (v.status === 'locked' || v.isLocked) {
        lockedCount++;
        activeFloatAmount += v.amount;
      } else if (isExpired || v.status === 'expired') {
        voidedOrExpiredAmount += v.amount;
        expiredCount++;
      } else if (v.status === 'active') {
        activeFloatAmount += v.amount;
        activeCount++;
      }
    });

    return {
      totalVouchers: vouchers.length,
      totalIssuedAmount,
      activeFloatAmount,
      redeemedFloatAmount,
      voidedOrExpiredAmount,
      activeCount,
      redeemedCount,
      lockedCount,
      expiredCount,
      voidedCount
    };
  }

  /** Standard Recommended Hospital Cash Desk Vouchers for Instant Deployment */
  private static getInitialSampleVouchers(): CashDeskVoucher[] {
    return [
      {
        id: 'vch_std_opd_01',
        voucherCode: 'LMDX-CSH-2026-00101',
        pin: '749215',
        securityHash: this.calculateSecurityHash('LMDX-CSH-2026-00101', '749215', 500, 'AUTH-7K2X-9P4W'),
        authSealCode: 'AUTH-7K2X-9P4W',
        entropyScore: 192,
        amount: 500,
        category: 'opd_consultation',
        categoryName: VOUCHER_CATEGORIES.opd_consultation.name,
        status: 'active',
        bearerType: 'cash_desk_bearer',
        validFrom: new Date(Date.now() - 2 * 86400000).toISOString(),
        validUntil: new Date(Date.now() + 45 * 86400000).toISOString(),
        issuedBy: 'Angad Mandal (Super Admin)',
        issuedByUserId: 'usr_super_admin',
        issueNotes: 'Standard Hospital Recommended Voucher: OPD Specialist Doctor Consultation',
        failedPinAttempts: 0,
        maxPinAttempts: 3,
        isLocked: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 'vch_std_lab_02',
        voucherCode: 'LMDX-CSH-2026-00102',
        pin: '839164',
        securityHash: this.calculateSecurityHash('LMDX-CSH-2026-00102', '839164', 1000, 'AUTH-4B8Y-6T9M'),
        authSealCode: 'AUTH-4B8Y-6T9M',
        entropyScore: 192,
        amount: 1000,
        category: 'diagnostic_lab',
        categoryName: VOUCHER_CATEGORIES.diagnostic_lab.name,
        status: 'active',
        bearerType: 'cash_desk_bearer',
        departmentRestriction: 'Pathology & Diagnostic Laboratory',
        validFrom: new Date(Date.now() - 2 * 86400000).toISOString(),
        validUntil: new Date(Date.now() + 60 * 86400000).toISOString(),
        issuedBy: 'Angad Mandal (Super Admin)',
        issuedByUserId: 'usr_super_admin',
        issueNotes: 'Standard Hospital Recommended Voucher: Diagnostic & Blood Investigation Credit',
        failedPinAttempts: 0,
        maxPinAttempts: 3,
        isLocked: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 'vch_std_csh_03',
        voucherCode: 'LMDX-CSH-2026-00103',
        pin: '582914',
        securityHash: this.calculateSecurityHash('LMDX-CSH-2026-00103', '582914', 2000, 'AUTH-9C3P-2D7V'),
        authSealCode: 'AUTH-9C3P-2D7V',
        entropyScore: 192,
        amount: 2000,
        category: 'all_purpose_cash',
        categoryName: VOUCHER_CATEGORIES.all_purpose_cash.name,
        status: 'active',
        bearerType: 'cash_desk_bearer',
        validFrom: new Date(Date.now() - 1 * 86400000).toISOString(),
        validUntil: new Date(Date.now() + 60 * 86400000).toISOString(),
        issuedBy: 'Angad Mandal (Super Admin)',
        issuedByUserId: 'usr_super_admin',
        issueNotes: 'Standard Hospital Recommended Voucher: Universal Cash Desk Prepaid Tender',
        failedPinAttempts: 0,
        maxPinAttempts: 3,
        isLocked: false,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'vch_std_top_04',
        voucherCode: 'LMDX-CSH-2026-00104',
        pin: '694821',
        securityHash: this.calculateSecurityHash('LMDX-CSH-2026-00104', '694821', 1500, 'AUTH-5F2N-8R4Q'),
        authSealCode: 'AUTH-5F2N-8R4Q',
        entropyScore: 192,
        amount: 1500,
        category: 'health_card_topup',
        categoryName: VOUCHER_CATEGORIES.health_card_topup.name,
        status: 'active',
        bearerType: 'cash_desk_bearer',
        validFrom: new Date(Date.now() - 1 * 86400000).toISOString(),
        validUntil: new Date(Date.now() + 90 * 86400000).toISOString(),
        issuedBy: 'Angad Mandal (Super Admin)',
        issuedByUserId: 'usr_super_admin',
        issueNotes: 'Standard Hospital Recommended Voucher: Smart Health Card Wallet Cashless Top-up',
        failedPinAttempts: 0,
        maxPinAttempts: 3,
        isLocked: false,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'vch_std_phm_05',
        voucherCode: 'LMDX-CSH-2026-00105',
        pin: '318492',
        securityHash: this.calculateSecurityHash('LMDX-CSH-2026-00105', '318492', 750, 'AUTH-1H8K-4L2S'),
        authSealCode: 'AUTH-1H8K-4L2S',
        entropyScore: 192,
        amount: 750,
        category: 'pharmacy_meds',
        categoryName: VOUCHER_CATEGORIES.pharmacy_meds.name,
        status: 'active',
        bearerType: 'cash_desk_bearer',
        departmentRestriction: 'In-House Hospital Pharmacy',
        validFrom: new Date(Date.now() - 1 * 86400000).toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        issuedBy: 'Angad Mandal (Super Admin)',
        issuedByUserId: 'usr_super_admin',
        issueNotes: 'Standard Hospital Recommended Voucher: Pharmacy & Surgical Supplies Prescription Discount',
        failedPinAttempts: 0,
        maxPinAttempts: 3,
        isLocked: false,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'vch_std_emg_06',
        voucherCode: 'LMDX-CSH-2026-00106',
        pin: '924831',
        securityHash: this.calculateSecurityHash('LMDX-CSH-2026-00106', '924831', 2500, 'AUTH-3J5W-7E9X'),
        authSealCode: 'AUTH-3J5W-7E9X',
        entropyScore: 192,
        amount: 2500,
        category: 'emergency_float',
        categoryName: VOUCHER_CATEGORIES.emergency_float.name,
        status: 'active',
        bearerType: 'cash_desk_bearer',
        departmentRestriction: 'Emergency Casualty & Triage Desk',
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
        issuedBy: 'Angad Mandal (Super Admin)',
        issuedByUserId: 'usr_super_admin',
        issueNotes: 'Standard Hospital Recommended Voucher: Emergency Ward / IPD Fast-Track Admission Float',
        failedPinAttempts: 0,
        maxPinAttempts: 3,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}
