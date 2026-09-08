import { LabOrderRecord, LabOrderStatus, LabParameterResult, LabResultStatus, LabParameterFlag, Patient, HealthCard, PatientBill } from '../types';
import { StorageService } from './storage';
import { ApiSyncService } from './apiSyncService';
import { AuditService } from './auditService';
import { BillService } from './billService';
import { generateUuid } from '../utils/idGenerator';

const LAB_ORDERS_KEY = 'labmedix_lab_orders_v1';

export interface CreateLabOrderInput {
  patientId: string;
  testId?: string;
  testName: string;
  department?: string;
  category?: string;
  priority?: 'routine' | 'urgent' | 'stat';
  clinicalNotes?: string;
  prescribedByDoctorName?: string;
  mrp: number;
  isPaid?: boolean;
  paymentMethod?: 'cash' | 'upi' | 'wallet' | 'card';
  currentUser?: { id?: string; fullName?: string; role?: string } | null;
}

export const TUBE_TYPES = [
  { id: 'edta', label: 'EDTA (K2/K3) — Lavender Cap', capColor: 'bg-purple-600', tests: 'CBC, ESR, HbA1c, Blood Group' },
  { id: 'plain', label: 'Plain / Clot Activator — Red Cap', capColor: 'bg-red-600', tests: 'LFT, KFT, Lipid Profile, Thyroid, Serology' },
  { id: 'sst', label: 'SST Gel Separator — Gold / Yellow Cap', capColor: 'bg-amber-500', tests: 'Hormones, Immunology, Tumor Markers' },
  { id: 'fluoride', label: 'Sodium Fluoride — Grey Cap', capColor: 'bg-slate-400', tests: 'Fasting Blood Sugar, PPBS, GTT' },
  { id: 'heparin', label: 'Sodium Heparin — Green Cap', capColor: 'bg-emerald-600', tests: 'ABG, Electrolytes, Cytogenetics' },
  { id: 'citrate', label: 'Sodium Citrate — Light Blue Cap', capColor: 'bg-sky-500', tests: 'PT/INR, APTT, D-Dimer' },
  { id: 'sterile_container', label: 'Sterile Urine / Fluid Cup', capColor: 'bg-amber-600', tests: 'Urine R/M, Body Fluids, Sputum' }
];

export class LaboratoryService {
  public static getAll(): LabOrderRecord[] {
    return StorageService.getItem<LabOrderRecord[]>(LAB_ORDERS_KEY, []);
  }

  public static getById(id: string): LabOrderRecord | undefined {
    return this.getAll().find(o => o.id === id || o.orderNumber === id);
  }

  public static getByPatientId(patientId: string): LabOrderRecord[] {
    return this.getAll().filter(o => o.patientId === patientId);
  }

  public static saveOrders(orders: LabOrderRecord[]): void {
    StorageService.setItem(LAB_ORDERS_KEY, orders);
  }

  public static generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const existing = this.getAll();
    const count = existing.length + 1;
    return `LMDX-LAB-${year}-${String(count).padStart(6, '0')}`;
  }

  public static generateSampleBarcode(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `LMX-SMP-${year}-${random}`;
  }

  /**
   * Diagnostic parameters master template
   */
  public static getParameterTemplates(testName: string): { name: string; unit: string; referenceRange: string }[] {
    const lower = (testName || '').toLowerCase();

    if (lower.includes('cbc') || lower.includes('complete blood count') || lower.includes('hemogram')) {
      return [
        { name: 'Hemoglobin (Hb)', unit: 'g/dL', referenceRange: '13.0 - 17.0' },
        { name: 'Total Leukocyte Count (TLC / WBC)', unit: 'cells/mcL', referenceRange: '4000 - 11000' },
        { name: 'RBC Count', unit: 'million/mcL', referenceRange: '4.5 - 5.5' },
        { name: 'Platelet Count', unit: 'lakh/mcL', referenceRange: '1.5 - 4.5' },
        { name: 'Packed Cell Volume (PCV / Hematocrit)', unit: '%', referenceRange: '40 - 50' },
        { name: 'Mean Corpuscular Volume (MCV)', unit: 'fL', referenceRange: '80 - 100' },
        { name: 'Neutrophils', unit: '%', referenceRange: '40 - 70' },
        { name: 'Lymphocytes', unit: '%', referenceRange: '20 - 45' },
        { name: 'Eosinophils', unit: '%', referenceRange: '1 - 6' },
        { name: 'Monocytes', unit: '%', referenceRange: '2 - 8' },
        { name: 'Basophils', unit: '%', referenceRange: '0 - 1' },
        { name: 'ESR (Westergren)', unit: 'mm/1st hr', referenceRange: '0 - 15' }
      ];
    }

    if (lower.includes('lft') || lower.includes('liver')) {
      return [
        { name: 'Bilirubin - Total', unit: 'mg/dL', referenceRange: '0.2 - 1.2' },
        { name: 'Bilirubin - Direct (Conjugated)', unit: 'mg/dL', referenceRange: '0.0 - 0.3' },
        { name: 'Bilirubin - Indirect', unit: 'mg/dL', referenceRange: '0.2 - 0.8' },
        { name: 'SGOT / AST', unit: 'U/L', referenceRange: '10 - 40' },
        { name: 'SGPT / ALT', unit: 'U/L', referenceRange: '7 - 56' },
        { name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', referenceRange: '44 - 147' },
        { name: 'Total Protein', unit: 'g/dL', referenceRange: '6.0 - 8.3' },
        { name: 'Albumin', unit: 'g/dL', referenceRange: '3.5 - 5.5' },
        { name: 'Globulin', unit: 'g/dL', referenceRange: '2.0 - 3.5' },
        { name: 'A/G Ratio', unit: '', referenceRange: '1.2 - 2.2' }
      ];
    }

    if (lower.includes('kft') || lower.includes('rft') || lower.includes('kidney') || lower.includes('renal')) {
      return [
        { name: 'Blood Urea', unit: 'mg/dL', referenceRange: '15 - 45' },
        { name: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', referenceRange: '7 - 20' },
        { name: 'Serum Creatinine', unit: 'mg/dL', referenceRange: '0.7 - 1.3' },
        { name: 'Serum Uric Acid', unit: 'mg/dL', referenceRange: '3.5 - 7.2' },
        { name: 'Serum Sodium (Na+)', unit: 'mEq/L', referenceRange: '135 - 145' },
        { name: 'Serum Potassium (K+)', unit: 'mEq/L', referenceRange: '3.5 - 5.1' },
        { name: 'Serum Chloride (Cl-)', unit: 'mEq/L', referenceRange: '96 - 106' },
        { name: 'Serum Calcium', unit: 'mg/dL', referenceRange: '8.5 - 10.5' }
      ];
    }

    if (lower.includes('lipid')) {
      return [
        { name: 'Total Cholesterol', unit: 'mg/dL', referenceRange: '125 - 200' },
        { name: 'Triglycerides', unit: 'mg/dL', referenceRange: '50 - 150' },
        { name: 'HDL Cholesterol (Good)', unit: 'mg/dL', referenceRange: '40 - 60' },
        { name: 'LDL Cholesterol (Bad)', unit: 'mg/dL', referenceRange: '60 - 100' },
        { name: 'VLDL Cholesterol', unit: 'mg/dL', referenceRange: '10 - 30' },
        { name: 'Cholesterol / HDL Ratio', unit: '', referenceRange: '3.0 - 5.0' }
      ];
    }

    if (lower.includes('thyroid') || lower.includes('tft')) {
      return [
        { name: 'T3 - Total Triiodothyronine', unit: 'ng/dL', referenceRange: '80 - 200' },
        { name: 'T4 - Total Thyroxine', unit: 'mcg/dL', referenceRange: '4.5 - 12.0' },
        { name: 'TSH - Thyroid Stimulating Hormone', unit: 'uIU/mL', referenceRange: '0.4 - 4.5' }
      ];
    }

    if (lower.includes('sugar') || lower.includes('glucose') || lower.includes('fasting') || lower.includes('rbs')) {
      return [
        { name: 'Fasting Blood Glucose (FBS)', unit: 'mg/dL', referenceRange: '70 - 100' }
      ];
    }

    if (lower.includes('hba1c') || lower.includes('glycated')) {
      return [
        { name: 'HbA1c (Glycosylated Hemoglobin)', unit: '%', referenceRange: '4.0 - 5.6' },
        { name: 'Estimated Average Glucose (eAG)', unit: 'mg/dL', referenceRange: '70 - 115' }
      ];
    }

    if (lower.includes('urine')) {
      return [
        { name: 'Color & Appearance', unit: '', referenceRange: 'Pale Yellow, Clear' },
        { name: 'Specific Gravity', unit: '', referenceRange: '1.005 - 1.030' },
        { name: 'pH', unit: '', referenceRange: '5.0 - 8.0' },
        { name: 'Albumin / Protein', unit: '', referenceRange: 'Nil' },
        { name: 'Sugar / Glucose', unit: '', referenceRange: 'Nil' }
      ];
    }

    // Generic default for single analyte
    return [
      { name: testName, unit: 'mg/dL', referenceRange: 'Normal' }
    ];
  }

  /**
   * Helper to determine flag (normal, low, high, critical)
   */
  public static evaluateFlag(observedStr: string, referenceRange: string): LabParameterFlag {
    const observed = parseFloat(observedStr);
    if (isNaN(observed)) return 'normal';

    const rangeMatch = referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (!rangeMatch) return 'normal';

    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);

    if (observed < min) {
      if (observed < min * 0.7) return 'critical';
      return 'low';
    }
    if (observed > max) {
      if (observed > max * 1.3) return 'critical';
      return 'high';
    }
    return 'normal';
  }

  /**
   * Phase 1: Create Laboratory Requisition & Billing Integration
   */
  public static createOrder(input: CreateLabOrderInput): LabOrderRecord {
    const patients = StorageService.getPatients();
    const patient = patients.find(p => p.id === input.patientId);
    if (!patient) {
      throw new Error(`Patient not found with ID ${input.patientId}`);
    }

    const cards = StorageService.getCards();
    const card = patient.healthCardId ? cards.find(c => c.id === patient.healthCardId) : cards.find(c => c.patientId === patient.id);
    const memberships = StorageService.getMemberships();
    const membership = card ? memberships.find(m => m.id === card.membershipId) : undefined;

    // Calculate cardholder discount
    let discountPct = 0;
    if (membership) {
      discountPct = membership.labDiscount ?? (membership.id.includes('gold') ? 25 : membership.id.includes('plat') ? 35 : 15);
    }
    const discountAmount = Math.round((input.mrp * discountPct) / 100);
    const netPayable = Math.max(0, input.mrp - discountAmount);

    const now = new Date().toISOString();
    const orderNumber = this.generateOrderNumber();
    const orderId = `ord_${generateUuid().slice(0, 8)}`;

    // Prepare default parameter slots
    const templateParams = this.getParameterTemplates(input.testName);
    const initialParameters: LabParameterResult[] = templateParams.map(t => ({
      id: `prm_${generateUuid().slice(0, 6)}`,
      parameterName: t.name,
      observedValue: '',
      unit: t.unit,
      referenceRange: t.referenceRange,
      flag: 'normal'
    }));

    // Generate billing record
    const billNumber = BillService.generateBillNumber();
    const billId = `bill_${generateUuid().slice(0, 8)}`;
    const newBill: PatientBill = {
      id: billId,
      billNumber,
      date: now,
      patientId: patient.id,
      patientName: patient.fullName,
      patientMobile: patient.mobile,
      patientAddress: patient.address?.fullAddress || '',
      healthCardId: card?.id,
      healthCardNumber: card?.cardNumber,
      membershipName: membership?.name,
      isCardIssued: false,
      familyMemberCount: 1,
      includedMembers: 1,
      additionalMembers: 0,
      baseCardCharge: 0,
      additionalMemberCharge: 0,
      discountAmount,
      netPayable,
      paidAmount: input.isPaid ? netPayable : 0,
      paymentStatus: input.isPaid ? 'paid' : 'pending',
      paymentMethod: input.paymentMethod || 'cash',
      transactionId: `TXN-LAB-${Date.now().toString(36).toUpperCase()}`,
      authorizedStaff: {
        id: input.currentUser?.id || 'usr_staff',
        name: input.currentUser?.fullName || 'Diagnostic Desk',
        role: input.currentUser?.role || 'lab_staff'
      },
      notes: `Lab Requisition for ${input.testName} (${orderNumber})`,
      billCategory: 'lab_diagnostics',
      items: [
        {
          description: input.testName,
          quantity: 1,
          unitPrice: input.mrp,
          total: input.mrp
        }
      ],
      createdAt: now
    };

    StorageService.saveBill(newBill);
    if (input.isPaid) {
      BillService.recordBillTransaction(newBill, input.currentUser as any);
    }

    const newOrder: LabOrderRecord = {
      id: orderId,
      orderNumber,
      bookingNo: orderNumber,
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.mobile,
      patientAge: patient.age,
      patientGender: patient.gender,
      healthCardId: card?.id,
      cardNo: card?.cardNumber,
      membershipTier: membership?.name,
      testId: input.testId,
      testName: input.testName,
      department: input.department || 'Clinical Pathology',
      category: input.category || 'Biochemistry',
      priority: input.priority || 'routine',
      clinicalNotes: input.clinicalNotes || '',
      prescribedByDoctorName: input.prescribedByDoctorName || 'Self / Walk-in Consultation',
      status: 'booked',
      parameters: initialParameters,
      mrp: input.mrp,
      discountPercentage: discountPct,
      discountAmount,
      netPayable,
      billId,
      paymentStatus: input.isPaid ? 'paid' : 'pending',
      createdAt: now,
      updatedAt: now
    };

    const orders = this.getAll();
    orders.unshift(newOrder);
    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', newOrder.id, newOrder).catch(() => {});

    AuditService.log(
      'LAB_ORDER_CREATED',
      'clinical',
      `Created lab order ${orderNumber} for ${patient.fullName} (${input.testName})`,
      orderId
    );

    return newOrder;
  }

  /**
   * Phase 2: Phlebotomy Sample Collection & Accessioning
   */
  public static accessionSample(
    orderId: string,
    details: {
      tubeType: string;
      barcode?: string;
      phlebotomistName: string;
      phlebotomistId?: string;
      specimenNotes?: string;
    }
  ): LabOrderRecord {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const now = new Date().toISOString();
    const barcode = details.barcode?.trim() || this.generateSampleBarcode();

    order.sampleBarcode = barcode;
    order.sampleTubeType = details.tubeType;
    order.sampleCollectedAt = now;
    order.phlebotomistName = details.phlebotomistName;
    order.phlebotomistId = details.phlebotomistId;
    order.status = 'sample_collected';
    order.updatedAt = now;

    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    AuditService.log(
      'LAB_SAMPLE_ACCESSIONED',
      'clinical',
      `Accessioned specimen with barcode ${barcode} (${details.tubeType}) for ${order.patientName}`,
      order.id
    );

    return order;
  }

  /**
   * Phase 3: Sample Received in Laboratory
   */
  public static receiveSampleInLab(orderId: string, staffName: string): LabOrderRecord {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date().toISOString();
    order.sampleReceivedAt = now;
    order.status = 'in_lab';
    order.updatedAt = now;

    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    AuditService.log('LAB_SAMPLE_RECEIVED', 'clinical', `Sample received in clinical lab by ${staffName}`, order.id);
    return order;
  }

  /**
   * Phase 4: Technician Result Entry (Non-locked parameters)
   */
  public static saveResults(
    orderId: string,
    parameters: LabParameterResult[],
    enteredBy: string,
    technicianNotes?: string
  ): LabOrderRecord {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    if (order.isLocked) {
      throw new Error('Report is officially locked by verifying pathologist and cannot be modified.');
    }

    const now = new Date().toISOString();
    // Auto-calculate flags for each parameter
    const enrichedParams = parameters.map(p => ({
      ...p,
      flag: p.flag || this.evaluateFlag(p.observedValue, p.referenceRange)
    }));

    order.parameters = enrichedParams;
    order.resultsEnteredAt = now;
    order.resultsEnteredBy = enteredBy;
    order.status = 'results_entered';
    if (technicianNotes) {
      order.clinicalNotes = order.clinicalNotes ? `${order.clinicalNotes} | Tech Notes: ${technicianNotes}` : technicianNotes;
    }
    order.updatedAt = now;

    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    AuditService.log('LAB_RESULTS_ENTERED', 'clinical', `Technician ${enteredBy} entered ${parameters.length} test parameters`, order.id);
    return order;
  }

  /**
   * Phase 5: Pathologist Verification & Report Locking
   */
  public static verifyAndLockReport(
    orderId: string,
    verification: {
      doctorName: string;
      registrationNo: string;
      notes?: string;
    }
  ): LabOrderRecord {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    if (!order.parameters || order.parameters.length === 0 || order.parameters.every(p => !p.observedValue.trim())) {
      throw new Error('Cannot verify lab report without entering parameter observed values.');
    }

    const now = new Date().toISOString();
    order.verifiedAt = now;
    order.verifiedByDoctorName = verification.doctorName;
    order.verifiedDoctorRegistrationNo = verification.registrationNo;
    order.pathologistNotes = verification.notes?.trim() || 'Clinically correlated and verified.';
    order.isLocked = true;
    order.status = 'verified';
    order.updatedAt = now;

    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    AuditService.log(
      'LAB_REPORT_VERIFIED_AND_LOCKED',
      'clinical',
      `Dr. ${verification.doctorName} (Reg: ${verification.registrationNo}) verified and locked report for ${order.orderNumber}`,
      order.id
    );

    return order;
  }
}
