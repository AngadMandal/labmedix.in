import { 
  PatientBill, 
  PharmacySale, 
  CardApplicationRequest, 
  LabOrderRecord, 
  Patient, 
  HealthCard, 
  CompanyProfile 
} from '../types';
import { UniversalInvoiceData, UniversalInvoiceItem } from '../types/invoice';

export class UniversalInvoiceService {
  /**
   * Transforms a standard PatientBill (OPD, IPD, Emergency, Registration, General) into UniversalInvoiceData
   */
  public static fromPatientBill(
    bill: PatientBill,
    company: CompanyProfile,
    options?: {
      patient?: Patient | null;
      card?: HealthCard | null;
      staffName?: string;
      isReprint?: boolean;
      reprintCount?: number;
    }
  ): UniversalInvoiceData {
    const rawCategory = (bill.billCategory || 'general').toLowerCase();
    let category: UniversalInvoiceData['category'] = 'general';
    let categoryLabel = 'Hospital Service';

    if (rawCategory.includes('opd') || rawCategory.includes('consult')) {
      category = 'opd';
      categoryLabel = 'OPD Consultation Bill';
    } else if (rawCategory.includes('lab') || rawCategory.includes('patholog') || rawCategory.includes('diagnost')) {
      category = 'laboratory';
      categoryLabel = 'Diagnostic & Laboratory Bill';
    } else if (rawCategory.includes('pharm')) {
      category = 'pharmacy';
      categoryLabel = 'Pharmacy Bill';
    } else if (rawCategory.includes('card') || rawCategory.includes('enroll') || bill.isCardIssued) {
      category = 'health_card';
      categoryLabel = 'Health Card Registration Bill';
    } else if (rawCategory.includes('ipd') || rawCategory.includes('admit')) {
      category = 'ipd';
      categoryLabel = 'IPD Admission & Care Bill';
    } else if (rawCategory.includes('emerg')) {
      category = 'emergency';
      categoryLabel = 'Emergency & Triage Care Bill';
    }

    // Process item rows
    const items: UniversalInvoiceItem[] = (bill.items && bill.items.length > 0)
      ? bill.items.map((item, idx) => ({
          sl: idx + 1,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          discountAmount: 0,
          total: item.total || (item.quantity * item.unitPrice)
        }))
      : [{
          sl: 1,
          description: bill.isCardIssued
            ? `Smart Health Card Enrollment (${bill.membershipName || 'Annual Plan'})`
            : `${categoryLabel} - Standard Services`,
          quantity: 1,
          unitPrice: bill.baseCardCharge || bill.netPayable,
          discountAmount: bill.discountAmount || 0,
          total: bill.netPayable
        }];

    // If family members were charged separately
    if (bill.additionalMembers && bill.additionalMembers > 0 && bill.additionalMemberCharge) {
      items.push({
        sl: items.length + 1,
        description: `Additional Family Dependents (${bill.additionalMembers} Members)`,
        quantity: bill.additionalMembers,
        unitPrice: Math.round(bill.additionalMemberCharge / bill.additionalMembers),
        discountAmount: 0,
        total: bill.additionalMemberCharge
      });
    }

    const grossAmount = (bill as any).subtotal || items.reduce((sum, it) => sum + it.total, 0);
    const healthCardDiscount = (bill.healthCardNumber || bill.healthCardId) ? (bill.discountAmount || 0) : 0;
    const otherDiscount = (!bill.healthCardNumber && !bill.healthCardId) ? (bill.discountAmount || 0) : 0;
    const paidAmount = bill.paidAmount !== undefined ? bill.paidAmount : bill.netPayable;
    const dueAmount = Math.max(0, bill.netPayable - paidAmount);

    let paymentStatus: UniversalInvoiceData['paymentStatus'] = 'paid';
    if (bill.paymentStatus === 'refunded') paymentStatus = 'refunded';
    else if (bill.paymentStatus === 'cancelled') paymentStatus = 'cancelled';
    else if (dueAmount > 0 && paidAmount > 0) paymentStatus = 'partially_paid';
    else if (dueAmount > 0 && paidAmount === 0) paymentStatus = 'due';

    return {
      invoiceNumber: bill.billNumber,
      category,
      categoryLabel,
      titleBadge: 'TAX INVOICE',
      templateVersion: 'v1.0',
      date: bill.createdAt || bill.date || new Date().toISOString(),
      isReprint: options?.isReprint || false,
      reprintCount: options?.reprintCount || 0,

      patientName: bill.patientName || options?.patient?.fullName || 'Walk-in Patient',
      patientId: bill.patientId || options?.patient?.id,
      patientMobile: bill.patientMobile || options?.patient?.mobile,
      patientAgeGender: options?.patient ? `${options.patient.age} Yrs / ${(options.patient.gender || '').toUpperCase()}` : undefined,
      patientAddress: bill.patientAddress || options?.patient?.address?.fullAddress,
      referringDoctor: (bill as any).referringDoctor || (bill as any).doctorName,

      healthCardNumber: bill.healthCardNumber || options?.card?.cardNumber,
      healthCardTier: options?.card?.tier || (bill as any).healthCardTier,
      hasHealthCard: Boolean(bill.healthCardNumber || options?.card?.cardNumber),

      items,
      grossAmount,
      healthCardDiscount,
      otherDiscount,
      totalDiscount: bill.discountAmount || 0,
      taxAmount: (bill as any).taxAmount || 0,
      netPayable: bill.netPayable,
      paidAmount,
      dueAmount,

      paymentMethod: bill.paymentMethod || 'Cash',
      paymentStatus,
      transactionId: bill.transactionId,

      authorizedStaffName: bill.authorizedStaff?.name || options?.staffName || 'Authorized Cashier',
      authorizedStaffRole: bill.authorizedStaff?.role || 'Billing Desk',
      notes: bill.notes,
      barcodeValue: bill.billNumber
    };
  }

  /**
   * Transforms a PharmacySale into UniversalInvoiceData
   */
  public static fromPharmacySale(
    sale: PharmacySale,
    company: CompanyProfile,
    options?: {
      patient?: Patient | null;
      card?: HealthCard | null;
      isReprint?: boolean;
      reprintCount?: number;
    }
  ): UniversalInvoiceData {
    const isReprint = options?.isReprint || sale.isReprint || false;
    const reprintCount = options?.reprintCount || sale.reprintCount || (isReprint ? 1 : 0);

    const items: UniversalInvoiceItem[] = (sale.items || []).map((item, idx) => ({
      sl: idx + 1,
      description: item.medicineName,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      taxPercent: item.taxGstPercent,
      taxAmount: item.taxAmount,
      total: item.totalAmount
    }));

    const dueAmount = sale.dueAmount || 0;
    let paymentStatus: UniversalInvoiceData['paymentStatus'] = 'paid';
    if (dueAmount > 0 && sale.paidAmount > 0) paymentStatus = 'partially_paid';
    else if (dueAmount > 0 && sale.paidAmount === 0) paymentStatus = 'due';

    const healthCardDiscount = sale.healthCardDiscount || (sale.patientCardNo ? (sale.discountAmount || 0) : 0);
    const otherDiscount = Math.max(0, (sale.discountAmount || 0) - healthCardDiscount);

    return {
      invoiceNumber: sale.invoiceNumber,
      category: 'pharmacy',
      categoryLabel: sale.sourceType === 'PRESCRIPTION' ? 'Prescription Dispensing' : 'Retail Pharmacy (OTC)',
      titleBadge: 'TAX INVOICE',
      templateVersion: 'v1.0',
      date: sale.saleDate || sale.createdAt || new Date().toISOString(),
      isReprint,
      reprintCount,

      patientName: sale.patientName || 'Retail Customer',
      patientId: sale.patientId || options?.patient?.id,
      patientMobile: sale.patientPhone || options?.patient?.mobile,
      patientAgeGender: options?.patient ? `${options.patient.age} Yrs / ${(options.patient.gender || '').toUpperCase()}` : undefined,
      referringDoctor: sale.prescribingDoctor,
      department: '24x7 Retail Pharmacy Division',

      healthCardNumber: sale.patientCardNo || options?.card?.cardNumber,
      healthCardTier: sale.cardTier || options?.card?.tier,
      hasHealthCard: Boolean(sale.patientCardNo || options?.card?.cardNumber),

      items,
      grossAmount: sale.subtotal,
      healthCardDiscount,
      otherDiscount,
      totalDiscount: sale.discountAmount || 0,
      taxableAmount: Math.max(0, sale.netTotal - (sale.taxAmount || 0)),
      taxAmount: sale.taxAmount || 0,
      cgstAmount: Math.round(((sale.taxAmount || 0) / 2) * 100) / 100,
      sgstAmount: Math.round(((sale.taxAmount || 0) / 2) * 100) / 100,
      roundOff: sale.roundOff,
      netPayable: sale.netTotal,
      paidAmount: sale.paidAmount,
      dueAmount,

      paymentMethod: sale.paymentMethod || 'Cash',
      paymentStatus,
      cashReceived: sale.cashReceived,
      changeGiven: sale.changeGiven,

      authorizedStaffName: sale.dispensedBy || 'Registered Pharmacist',
      authorizedStaffRole: 'Hospital Pharmacist',
      notes: sale.manualDiscountReason ? `Discount Reason: ${sale.manualDiscountReason}` : undefined,
      terms: [
        'Medicines returnable within 48h with original invoice in unsealed, intact condition.',
        'Refrigerated & Schedule H/X medications cannot be returned under drug control laws.'
      ],
      barcodeValue: sale.invoiceNumber
    };
  }

  /**
   * Transforms a CardApplicationRequest into UniversalInvoiceData
   */
  public static fromCardRequest(
    app: CardApplicationRequest,
    company: CompanyProfile,
    options?: {
      bill?: PatientBill | null;
      staffName?: string;
    }
  ): UniversalInvoiceData {
    const maxIncluded = 5;
    const familyCount = app.familyMembers ? app.familyMembers.length : 0;
    const extraCount = Math.max(0, familyCount - maxIncluded);
    const extraFee = app.extraFamilyMembersFee ?? (extraCount * (company.registrationSettings?.additionalMemberFee || 299));
    const baseFee = app.membershipPrice || 499;
    const totalAmount = app.totalPaidAmount || (baseFee + extraFee + (app.initialDeposit || 0));
    const paidAmount = options?.bill ? options.bill.paidAmount : totalAmount;
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    const items: UniversalInvoiceItem[] = [
      {
        sl: 1,
        description: `Smart Health Card Enrollment (${app.membershipName || 'Standard Plan'})`,
        quantity: 1,
        unitPrice: baseFee,
        discountAmount: 0,
        total: baseFee
      }
    ];

    if (extraCount > 0) {
      items.push({
        sl: 2,
        description: `Additional Family Shield Dependents (${extraCount} Members)`,
        quantity: extraCount,
        unitPrice: company.registrationSettings?.additionalMemberFee || 299,
        discountAmount: 0,
        total: extraFee
      });
    }

    if (app.initialDeposit && app.initialDeposit > 0) {
      items.push({
        sl: items.length + 1,
        description: 'Health Wallet Initial Recharge Float',
        quantity: 1,
        unitPrice: app.initialDeposit,
        discountAmount: 0,
        total: app.initialDeposit
      });
    }

    return {
      invoiceNumber: options?.bill?.billNumber || `BILL-${app.applicationNo || app.trackingId}`,
      category: 'card_request',
      categoryLabel: 'Health Card Application Bill',
      titleBadge: 'TAX INVOICE',
      templateVersion: 'v1.0',
      date: app.createdAt || new Date().toISOString(),

      patientName: app.fullName,
      patientMobile: app.mobile,
      patientAgeGender: `${app.age} Yrs / ${(app.gender || '').toUpperCase()}`,
      patientAddress: app.address?.fullAddress,
      department: 'Health Card Enrollment Division',

      healthCardNumber: app.applicationNo || app.trackingId,
      healthCardTier: app.membershipName,
      hasHealthCard: true,

      items,
      grossAmount: baseFee + extraFee + (app.initialDeposit || 0),
      healthCardDiscount: 0,
      otherDiscount: 0,
      totalDiscount: 0,
      taxAmount: 0,
      netPayable: totalAmount,
      paidAmount,
      dueAmount,

      paymentMethod: app.paymentMethod || 'Cash',
      paymentStatus: dueAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'due'),
      transactionId: app.paymentReference || options?.bill?.transactionId,

      authorizedStaffName: app.submittedByStaffName || options?.staffName || 'Reception Staff',
      authorizedStaffRole: app.submittedByStaffRole || 'Enrollment Desk',
      notes: `Dispatch Preference: ${(app.dispatchPreference || 'clinic').toUpperCase()}`,
      barcodeValue: app.applicationNo || app.trackingId
    };
  }

  /**
   * Transforms a LabOrderRecord into UniversalInvoiceData
   */
  public static fromLabOrder(
    order: LabOrderRecord,
    company: CompanyProfile,
    options?: {
      patient?: Patient | null;
      card?: HealthCard | null;
      staffName?: string;
    }
  ): UniversalInvoiceData {
    const testNames = order.testNames || (order.testName ? [order.testName] : ['Diagnostic Laboratory Investigation']);
    const grossAmount = order.grossAmount || order.grossPrice || order.netPayable || 500;
    const discount = order.discountAmount || 0;
    const netAmount = order.netAmount || order.netPayable || (grossAmount - discount);
    const paidAmount = order.paidAmount !== undefined ? order.paidAmount : (order.isPaid ? netAmount : 0);
    const dueAmount = Math.max(0, netAmount - paidAmount);

    const items: UniversalInvoiceItem[] = testNames.map((name, idx) => ({
      sl: idx + 1,
      description: name,
      quantity: 1,
      unitPrice: Math.round(grossAmount / testNames.length),
      discountAmount: Math.round(discount / testNames.length),
      total: Math.round((grossAmount - discount) / testNames.length)
    }));

    return {
      invoiceNumber: order.billNumber || order.orderNumber,
      category: 'laboratory',
      categoryLabel: 'Diagnostic Pathology & Lab Bill',
      titleBadge: 'TAX INVOICE',
      templateVersion: 'v1.0',
      date: order.scheduledDate || new Date().toISOString(),

      patientName: order.patientName,
      patientId: order.patientId,
      patientMobile: order.patientPhone,
      patientAgeGender: order.patientAge ? `${order.patientAge} Yrs / ${(order.patientGender || '').toUpperCase()}` : undefined,
      referringDoctor: order.orderingDoctorName || order.prescribedByDoctorName,
      department: order.department || 'Clinical Pathology',

      healthCardNumber: order.cardNo || options?.card?.cardNumber,
      healthCardTier: order.cardTier || order.membershipTier || options?.card?.tier,
      hasHealthCard: Boolean(order.cardNo || options?.card?.cardNumber),

      items,
      grossAmount,
      healthCardDiscount: (order.cardNo || options?.card?.cardNumber) ? discount : 0,
      otherDiscount: (!order.cardNo && !options?.card?.cardNumber) ? discount : 0,
      totalDiscount: discount,
      taxAmount: 0,
      netPayable: netAmount,
      paidAmount,
      dueAmount,

      paymentMethod: order.paymentMethod || 'Cash',
      paymentStatus: dueAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'due'),
      transactionId: order.transactionId,

      authorizedStaffName: order.createdByStaffName || options?.staffName || 'Lab Reception',
      authorizedStaffRole: 'Phlebotomy / Billing Desk',
      barcodeValue: order.orderNumber || order.sampleBarcode
    };
  }
}
