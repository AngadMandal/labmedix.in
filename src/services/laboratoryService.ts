import {
  LabOrderRecord,
  LabOrderStatus,
  LabParameterResult,
  LabResultStatus,
  LabParameterFlag,
  Patient,
  HealthCard,
  PatientBill,
  SpecimenRecord,
  SpecimenStatus,
  SpecimenRejectionReason,
  LaboratorySettings,
  PrinterLabelFormat,
  BookedTestConfig,
  MasterTestParameter
} from '../types';
import { StorageService } from './storage';
import { ApiSyncService } from './apiSyncService';
import { AuditService } from './auditService';
import { BillService } from './billService';
import { DoctorMasterService } from './doctorMasterService';
import { CardBenefitService } from './cardBenefitService';
import { CatalogService } from './catalogService';
import { TestMasterService } from './testMasterService';
import { generateUuid, generateLabOrderId, generateSampleBarcode } from '../utils/idGenerator';

export const LAB_ORDERS_KEY = 'labmedix_portal_lab_bookings_v1';
export const SPECIMENS_KEY = 'labmedix_specimens_v1';
export const LAB_SETTINGS_KEY = 'labmedix_lab_settings_v1';

export interface CreateLabOrderInput {
  patientId: string;
  testId?: string;
  testName?: string;
  testIds?: string[];
  testNames?: string[];
  bookedTests?: BookedTestConfig[];
  department?: string;
  category?: string;
  priority?: 'routine' | 'urgent' | 'stat';
  clinicalNotes?: string;
  prescribedByDoctorName?: string;
  mrp: number;
  isPaid?: boolean;
  paymentMethod?: 'cash' | 'upi' | 'wallet' | 'card';
  collectionType?: 'lab_visit' | 'home_collection' | 'inpatient';
  scheduledDate?: string;
  scheduledTime?: string;
  currentUser?: { id?: string; fullName?: string; role?: string } | null;
}

export const TUBE_TYPES = [
  { id: 'edta', label: 'EDTA (K2/K3) — Lavender Cap', capColor: 'bg-purple-600', tests: 'CBC, ESR, HbA1c, Blood Group', sampleType: 'Whole Blood' },
  { id: 'plain', label: 'Plain / Clot Activator — Red Cap', capColor: 'bg-red-600', tests: 'LFT, KFT, Lipid Profile, Thyroid, Serology', sampleType: 'Serum' },
  { id: 'sst', label: 'SST Gel Separator — Gold / Yellow Cap', capColor: 'bg-amber-500', tests: 'Hormones, Immunology, Tumor Markers', sampleType: 'Serum' },
  { id: 'fluoride', label: 'Sodium Fluoride — Grey Cap', capColor: 'bg-slate-400', tests: 'Fasting Blood Sugar, PPBS, GTT', sampleType: 'Fluoride Plasma' },
  { id: 'heparin', label: 'Sodium Heparin — Green Cap', capColor: 'bg-emerald-600', tests: 'ABG, Electrolytes, Cytogenetics', sampleType: 'Heparinized Plasma' },
  { id: 'citrate', label: 'Sodium Citrate — Light Blue Cap', capColor: 'bg-sky-500', tests: 'PT/INR, APTT, D-Dimer', sampleType: 'Citrated Plasma' },
  { id: 'sterile_container', label: 'Sterile Urine / Fluid Cup', capColor: 'bg-amber-600', tests: 'Urine R/M, Body Fluids, Sputum', sampleType: 'Urine / Body Fluid' }
];

export const REJECTION_REASONS: SpecimenRejectionReason[] = [
  'Incorrect container / tube type',
  'Insufficient specimen volume (QNS)',
  'Tube leakage / Damaged container',
  'Gross Hemolysis',
  'Clotted whole blood',
  'Mislabeled / Label unreadable',
  'Unidentified specimen',
  'Incorrect specimen / sample type',
  'Delayed / degraded sample transit',
  'Temperature abuse / Cold-chain failure',
  'Other clinical reason'
];

export const DEFAULT_LAB_SETTINGS: LaboratorySettings = {
  defaultLabelFormat: 'tube_50x25',
  autoAccessionPrefix: 'ACC',
  autoReportPrefix: 'LMDX-RPT',
  autoBarcodePrefix: 'SMP',
  criticalAlertEnabled: true,
  criticalAlertSound: true,
  defaultTatHours: 4,
  allowTechnicianDraftSave: true,
  requireReprintReason: true
};

export class LaboratoryService {
  // ── ORDER REPOSITORY ─────────────────────────────────────────

  public static getAll(): LabOrderRecord[] {
    const orders = StorageService.getItem<LabOrderRecord[]>(LAB_ORDERS_KEY, []);
    // Backward compatibility: migrate legacy orders if present
    const legacy = StorageService.getItem<LabOrderRecord[]>('labmedix_lab_orders_v1', []);
    if (legacy && legacy.length > 0) {
      const existingIds = new Set(orders.map(o => o.id || o.orderNumber || o.bookingNo));
      let changed = false;
      for (const item of legacy) {
        if (!existingIds.has(item.id) && !existingIds.has(item.orderNumber)) {
          orders.push(item);
          changed = true;
        }
      }
      if (changed) {
        StorageService.setItem(LAB_ORDERS_KEY, orders);
      }
    }
    return orders;
  }

  public static getById(id: string): LabOrderRecord | undefined {
    return this.getAll().find(o => o.id === id || o.orderNumber === id || o.bookingNo === id);
  }

  public static getByPatientId(patientId: string): LabOrderRecord[] {
    return this.getAll().filter(o => o.patientId === patientId);
  }

  public static saveOrders(orders: LabOrderRecord[]): void {
    StorageService.setItem(LAB_ORDERS_KEY, orders);
    // Notify local listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: LAB_ORDERS_KEY } }));
    }
  }

  // ── SPECIMEN REPOSITORY ──────────────────────────────────────

  public static getAllSpecimens(): SpecimenRecord[] {
    return StorageService.getItem<SpecimenRecord[]>(SPECIMENS_KEY, []);
  }

  public static getSpecimenById(id: string): SpecimenRecord | undefined {
    return this.getAllSpecimens().find(s => s.id === id);
  }

  public static getSpecimenByBarcode(barcode: string): SpecimenRecord | undefined {
    const clean = barcode.trim().toUpperCase();
    return this.getAllSpecimens().find(s => s.barcode.toUpperCase() === clean);
  }

  public static getSpecimenByAccession(accessionNo: string): SpecimenRecord | undefined {
    const clean = accessionNo.trim().toUpperCase();
    return this.getAllSpecimens().find(s => s.accessionNumber.toUpperCase() === clean);
  }

  public static saveSpecimens(specimens: SpecimenRecord[]): void {
    StorageService.setItem(SPECIMENS_KEY, specimens);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: SPECIMENS_KEY } }));
    }
  }

  // ── SETTINGS REPOSITORY ──────────────────────────────────────

  public static getSettings(): LaboratorySettings {
    return StorageService.getItem<LaboratorySettings>(LAB_SETTINGS_KEY, DEFAULT_LAB_SETTINGS);
  }

  public static saveSettings(settings: Partial<LaboratorySettings>, updatedBy?: string): LaboratorySettings {
    const current = this.getSettings();
    const updated: LaboratorySettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'System Administrator'
    };
    StorageService.setItem(LAB_SETTINGS_KEY, updated);
    ApiSyncService.saveDocument('settings', 'laboratory', updated).catch(() => {});
    return updated;
  }

  // ── IDENTIFIER GENERATORS ────────────────────────────────────

  public static generateOrderNumber(): string {
    const existing = this.getAll().map(o => o.orderNumber || o.bookingNo || '');
    return generateLabOrderId(existing);
  }

  public static generateAccessionNumber(): string {
    const settings = this.getSettings();
    const prefix = settings.autoAccessionPrefix || 'ACC';
    const year = new Date().getFullYear();
    const allSpecimens = this.getAllSpecimens();
    const existingNums = allSpecimens
      .map(s => s.accessionNumber)
      .filter(num => num && num.startsWith(`${prefix}-${year}-`));
    
    let max = 0;
    for (const num of existingNums) {
      const parts = num.split('-');
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed) && parsed > max) max = parsed;
    }
    const next = (max + 1).toString().padStart(5, '0');
    return `${prefix}-${year}-${next}`;
  }

  public static generateSpecimenId(): string {
    return `SPEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  public static generateSampleBarcode(): string {
    const existing = this.getAll().map(o => o.sampleBarcode || '').filter(Boolean);
    return generateSampleBarcode(existing);
  }

  // ── PARAMETER TEMPLATES & REFERENCE RANGE ENGINE ─────────────

  public static getParameterTemplates(
    testName: string,
    patientAge?: number,
    patientGender?: string
  ): { name: string; unit: string; referenceRange: string; criticalLow?: number; criticalHigh?: number; resultType?: any; qualitativeOptions?: string[] }[] {
    const test = TestMasterService.getTestByNameOrCode(testName);
    const params = test?.parameters && test.parameters.length > 0
      ? test.parameters
      : (TestMasterService.getBlueprintForTest(testName) || [
          {
            id: 'def_param',
            parameterName: testName || 'Diagnostic Investigation',
            resultType: 'numeric' as const,
            unit: 'mg/dL',
            defaultReferenceRange: 'Normal',
            displayOrder: 1,
            reportOrder: 1
          }
        ]);

    return params.map(p => {
      const resolved = TestMasterService.resolveReferenceRange(p, patientAge, patientGender);
      return {
        name: p.parameterName,
        unit: p.unit,
        referenceRange: resolved.referenceRange,
        criticalLow: resolved.criticalLow,
        criticalHigh: resolved.criticalHigh,
        resultType: p.resultType,
        qualitativeOptions: p.qualitativeOptions
      };
    });
  }

  /**
   * Helper to determine flag (normal, low, high, critical) using Test Master evaluation engine
   */
  public static evaluateFlag(observedStr: string, referenceRange: string, paramMeta?: any): LabParameterFlag {
    const res = TestMasterService.evaluateAbnormalFlag(
      {
        referenceRange,
        minVal: paramMeta?.minVal,
        maxVal: paramMeta?.maxVal,
        criticalLow: paramMeta?.criticalLow,
        criticalHigh: paramMeta?.criticalHigh,
        resultType: paramMeta?.resultType,
        parameterName: paramMeta?.parameterName
      },
      observedStr
    );
    return res.flag;
  }

  public static isCriticalValue(paramName: string, observedStr: string): boolean {
    const val = parseFloat(observedStr);
    if (isNaN(val)) return false;
    const name = paramName.toLowerCase();

    if (name.includes('glucose') || name.includes('sugar')) {
      return val < 45 || val > 450;
    }
    if (name.includes('potassium')) {
      return val < 2.8 || val > 6.5;
    }
    if (name.includes('sodium')) {
      return val < 120 || val > 160;
    }
    if (name.includes('hemoglobin') || name.includes('hb')) {
      return val < 6.0 || val > 20.0;
    }
    if (name.includes('platelet')) {
      return val < 0.25 || val > 9.0;
    }
    if (name.includes('creatinine')) {
      return val > 5.0;
    }
    return false;
  }

  // ── WORKFLOW: ORDER CREATION & BILLING INTEGRATION ───────────

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

    const chargeCalc = CardBenefitService.calculateServiceCharge({
      patientId: patient.id,
      serviceCategory: 'lab',
      grossAmount: input.mrp
    });
    const discountPct = chargeCalc.discountPct;
    const discountAmount = chargeCalc.discountAmount;
    const netPayable = chargeCalc.netPayable;

    const now = new Date().toISOString();
    const orderNumber = this.generateOrderNumber();
    const orderId = `ord_${generateUuid().slice(0, 8)}`;
    const barcode = this.generateSampleBarcode();
    const specimenId = this.generateSpecimenId();

    // Build authoritative bookedTests snapshot from Test Master
    let finalBookedTests: BookedTestConfig[] = [];
    if (input.bookedTests && input.bookedTests.length > 0) {
      finalBookedTests = input.bookedTests;
    } else {
      const requestedTestIds = input.testIds && input.testIds.length > 0
        ? input.testIds
        : (input.testId ? [input.testId] : []);

      const requestedTestNames = input.testNames && input.testNames.length > 0
        ? input.testNames
        : (input.testName ? [input.testName] : []);

      if (requestedTestIds.length > 0) {
        for (const tid of requestedTestIds) {
          // Check if this is a Panel ID first (Requirement 5)
          const panel = CatalogService.getPanelById(tid);
          if (panel) {
            const expanded = TestMasterService.expandPanelToBookedTests(panel, patient.age, patient.gender);
            finalBookedTests.push(...expanded);
            continue;
          }

          const t = TestMasterService.getTestById(tid) || TestMasterService.getTestByNameOrCode(tid);
          if (t) {
            finalBookedTests.push(TestMasterService.createBookedTestConfig(t, patient.age, patient.gender));
          }
        }
      } else if (requestedTestNames.length > 0) {
        for (const tname of requestedTestNames) {
          // Check if name is a Panel
          const cleanName = tname.replace(/^\[Panel\]\s*/i, '').trim();
          const panel = CatalogService.getPanelById(cleanName);
          if (panel) {
            const expanded = TestMasterService.expandPanelToBookedTests(panel, patient.age, patient.gender);
            finalBookedTests.push(...expanded);
            continue;
          }

          const t = TestMasterService.getTestByNameOrCode(cleanName);
          if (t) {
            finalBookedTests.push(TestMasterService.createBookedTestConfig(t, patient.age, patient.gender));
          } else {
            finalBookedTests.push({
              testId: `t_custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              testCode: 'LAB-CUST',
              testName: tname,
              department: input.department || 'Clinical Pathology',
              specimen: 'Standard Specimen',
              parameters: [
                {
                  id: `p_cust_${Date.now()}`,
                  parameterName: tname,
                  resultType: 'numeric',
                  unit: 'mg/dL',
                  defaultReferenceRange: 'Normal',
                  displayOrder: 1,
                  reportOrder: 1,
                  required: true
                }
              ]
            });
          }
        }
      }
    }

    if (finalBookedTests.length === 0) {
      const defaultName = input.testName || 'Diagnostic Investigation';
      const t = TestMasterService.getTestByNameOrCode(defaultName);
      if (t) {
        finalBookedTests.push(TestMasterService.createBookedTestConfig(t, patient.age, patient.gender));
      } else {
        finalBookedTests.push({
          testId: input.testId || `t_gen_${Date.now()}`,
          testCode: 'LAB-GEN',
          testName: defaultName,
          department: input.department || 'Clinical Pathology',
          specimen: 'Standard Specimen',
          parameters: [
            {
              id: `p_gen_1`,
              parameterName: defaultName,
              resultType: 'numeric',
              unit: 'mg/dL',
              defaultReferenceRange: 'Normal',
              displayOrder: 1,
              reportOrder: 1,
              required: true
            }
          ]
        });
      }
    }

    // Automatically build clean partitioned parameter entry structure
    const initialParameters: LabParameterResult[] = TestMasterService.buildInitialResultsFromBookedTests(finalBookedTests);

    const primaryTest = finalBookedTests[0];
    const combinedTestName = finalBookedTests.map(t => t.testName).join(' + ');
    const combinedTestNames = finalBookedTests.map(t => t.testName);
    const combinedTestIds = finalBookedTests.map(t => t.testId);

    // Auto-detect container & tube type across all booked investigations
    const combinedLower = combinedTestName.toLowerCase();
    let detectedTube = TUBE_TYPES[1]; // Plain by default
    if (combinedLower.includes('cbc') || combinedLower.includes('hba1c') || combinedLower.includes('esr')) {
      detectedTube = TUBE_TYPES[0]; // EDTA
    } else if (combinedLower.includes('sugar') || combinedLower.includes('glucose') || combinedLower.includes('fbs') || combinedLower.includes('ppbs')) {
      detectedTube = TUBE_TYPES[3]; // Fluoride
    } else if (combinedLower.includes('urine')) {
      detectedTube = TUBE_TYPES[6]; // Sterile cup
    } else if (combinedLower.includes('pt') || combinedLower.includes('inr') || combinedLower.includes('coagulation')) {
      detectedTube = TUBE_TYPES[5]; // Citrate
    }

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
      healthCardId: chargeCalc.hasActiveCard ? card?.id : undefined,
      healthCardNumber: chargeCalc.hasActiveCard ? card?.cardNumber : undefined,
      membershipName: chargeCalc.hasActiveCard ? (chargeCalc.planName || membership?.name) : 'Standard Hospital Rack',
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
      notes: `Lab Requisition for ${combinedTestName} (${orderNumber})`,
      billCategory: 'lab_diagnostics',
      items: finalBookedTests.length > 1
        ? finalBookedTests.map(bt => ({
            description: bt.testName,
            quantity: 1,
            unitPrice: Math.round(input.mrp / finalBookedTests.length),
            total: Math.round(input.mrp / finalBookedTests.length)
          }))
        : [
            {
              description: combinedTestName,
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
      specimenId,
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.mobile,
      patientAge: patient.age,
      patientGender: patient.gender,
      healthCardId: card?.id,
      cardNo: card?.cardNumber,
      cardTier: membership?.name || card?.membershipId,
      membershipTier: membership?.name,
      testId: primaryTest.testId,
      testName: combinedTestName,
      testNames: combinedTestNames,
      bookedTestIds: combinedTestIds,
      bookedTests: finalBookedTests,
      department: input.department || primaryTest.department,
      category: input.category || 'Biochemistry',
      specimenType: primaryTest.specimen || detectedTube.sampleType,
      sampleTubeType: detectedTube.label,
      sampleBarcode: barcode,
      priority: input.priority || 'routine',
      urgency: input.priority === 'stat' ? 'emergency' : input.priority === 'urgent' ? 'urgent' : 'routine',
      clinicalNotes: input.clinicalNotes || '',
      prescribedByDoctorName: input.prescribedByDoctorName || 'Self / Walk-in Consultation',
      status: input.isPaid ? 'ready_for_collection' : 'billing_pending',
      paymentStatus: input.isPaid ? 'paid' : 'pending',
      parameters: initialParameters,
      testResults: initialParameters,
      mrp: input.mrp,
      grossAmount: input.mrp,
      grossPrice: input.mrp,
      discountPercentage: discountPct,
      discountAmount,
      netAmount: netPayable,
      netPayable,
      netPrice: netPayable,
      billId,
      billNumber,
      collectionType: input.collectionType || 'lab_visit',
      scheduledDate: input.scheduledDate || now.split('T')[0],
      scheduledTime: input.scheduledTime || 'Immediate Walk-in',
      tatHours: primaryTest.tatHours || 4,
      tatTargetTime: new Date(Date.now() + (primaryTest.tatHours || 4) * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
      createdByStaffId: input.currentUser?.id,
      createdByStaffName: input.currentUser?.fullName
    };

    const orders = this.getAll();
    orders.unshift(newOrder);
    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', newOrder.id, newOrder).catch(() => {});

    // Create linked Specimen Record
    const newSpecimen: SpecimenRecord = {
      id: specimenId,
      accessionNumber: '',
      barcode,
      labOrderId: orderId,
      orderNumber,
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.mobile,
      patientAge: patient.age,
      patientGender: patient.gender,
      testId: primaryTest.testId,
      testName: combinedTestName,
      department: newOrder.department,
      sampleType: detectedTube.sampleType,
      tubeType: detectedTube.label,
      capColor: detectedTube.capColor,
      priority: input.priority || 'routine',
      status: 'awaiting_collection',
      labelPrintCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const specimens = this.getAllSpecimens();
    specimens.unshift(newSpecimen);
    this.saveSpecimens(specimens);
    ApiSyncService.saveDocument('specimens', newSpecimen.id, newSpecimen).catch(() => {});

    if (input.prescribedByDoctorName && netPayable > 0) {
      DoctorMasterService.attributeConsultationAndReferral(input.prescribedByDoctorName, 0, netPayable);
    }

    AuditService.log(
      'LAB_ORDER_CREATED',
      'clinical',
      `Created requisition ${orderNumber} for ${patient.fullName} (${input.testName}). Priority: ${newOrder.priority}. Bill: ${billNumber}.`,
      orderId
    );

    return newOrder;
  }

  // ── WORKFLOW: PHLEBOTOMY SPECIMEN COLLECTION & ACCESSIONING ──

  public static markSampleCollected(
    orderId: string,
    details: {
      barcode?: string;
      tubeType?: string;
      phlebotomistName: string;
      phlebotomistId?: string;
      notes?: string;
      collectorVehicle?: string;
      coldChainTemp?: string;
    }
  ): { order: LabOrderRecord; specimen: SpecimenRecord } {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId || o.bookingNo === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date().toISOString();
    const barcode = details.barcode?.trim() || order.sampleBarcode || this.generateSampleBarcode();
    const accessionNo = order.accessionNumber || this.generateAccessionNumber();

    order.sampleBarcode = barcode;
    order.accessionNumber = accessionNo;
    order.sampleTubeType = details.tubeType || order.sampleTubeType || 'Standard Specimen Tube';
    order.sampleCollectedAt = now;
    order.collectedAt = now;
    order.phlebotomistName = details.phlebotomistName;
    order.phlebotomistId = details.phlebotomistId;
    order.sampleCollectedBy = details.phlebotomistName;
    order.status = 'collected';
    order.updatedAt = now;

    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    // Update or create linked SpecimenRecord
    const specimens = this.getAllSpecimens();
    let specimen = specimens.find(s => s.labOrderId === order.id || s.barcode === barcode);
    if (!specimen) {
      const createdSpecimen: SpecimenRecord = {
        id: order.specimenId || this.generateSpecimenId(),
        accessionNumber: accessionNo,
        barcode,
        labOrderId: order.id,
        orderNumber: order.orderNumber,
        patientId: order.patientId,
        patientName: order.patientName,
        patientPhone: order.patientPhone,
        patientAge: order.patientAge,
        patientGender: order.patientGender,
        testName: order.testName || 'Diagnostic Investigation',
        department: order.department,
        sampleType: order.specimenType || 'Blood',
        tubeType: details.tubeType || order.sampleTubeType || 'Standard Tube',
        priority: order.priority || 'routine',
        status: 'collected',
        collectedAt: now,
        collectedBy: details.phlebotomistName,
        collectorId: details.phlebotomistId,
        phlebotomistVehicle: details.collectorVehicle,
        coldChainTemperature: details.coldChainTemp || '3.5°C',
        accessionedAt: now,
        accessionedBy: details.phlebotomistName,
        labelPrintCount: 1,
        lastLabelPrintedAt: now,
        createdAt: now,
        updatedAt: now
      };
      specimens.unshift(createdSpecimen);
      specimen = createdSpecimen;
    } else {
      specimen.accessionNumber = accessionNo;
      specimen.barcode = barcode;
      specimen.status = 'collected';
      specimen.collectedAt = now;
      specimen.collectedBy = details.phlebotomistName;
      specimen.collectorId = details.phlebotomistId;
      specimen.phlebotomistVehicle = details.collectorVehicle || specimen.phlebotomistVehicle;
      specimen.coldChainTemperature = details.coldChainTemp || specimen.coldChainTemperature || '3.5°C';
      specimen.accessionedAt = now;
      specimen.accessionedBy = details.phlebotomistName;
      specimen.updatedAt = now;
    }

    this.saveSpecimens(specimens);
    if (specimen) {
      ApiSyncService.saveDocument('specimens', specimen.id, specimen).catch(() => {});
    }

    AuditService.log(
      'SPECIMEN_COLLECTED',
      'clinical',
      `Collected and accessioned specimen ${accessionNo} (Barcode: ${barcode}) for ${order.patientName} by ${details.phlebotomistName}.`,
      order.id
    );

    return { order, specimen: specimen! };
  }

  // ── WORKFLOW: SPECIMEN RECEPTION IN LABORATORY ────────────────

  public static receiveSpecimenInLab(
    specimenOrOrderId: string,
    receivingStaff: string,
    notes?: string
  ): { order: LabOrderRecord; specimen: SpecimenRecord } {
    const now = new Date().toISOString();
    const specimens = this.getAllSpecimens();
    const specimen = specimens.find(
      s => s.id === specimenOrOrderId || s.barcode === specimenOrOrderId || s.accessionNumber === specimenOrOrderId || s.labOrderId === specimenOrOrderId
    );

    const orders = this.getAll();
    const order = orders.find(
      o => o.id === specimenOrOrderId || o.orderNumber === specimenOrOrderId || o.bookingNo === specimenOrOrderId || (specimen && o.id === specimen.labOrderId)
    );

    if (!order) {
      throw new Error(`Laboratory order matching ${specimenOrOrderId} not found.`);
    }

    order.receivedInLabAt = now;
    order.sampleReceivedAt = now;
    order.sampleReceivedBy = receivingStaff;
    order.receivedByTechnician = receivingStaff;
    order.status = 'processing';
    order.updatedAt = now;
    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    if (specimen) {
      specimen.status = 'received';
      specimen.receivedAt = now;
      specimen.receivedBy = receivingStaff;
      specimen.updatedAt = now;
      this.saveSpecimens(specimens);
      ApiSyncService.saveDocument('specimens', specimen.id, specimen).catch(() => {});
    }

    AuditService.log(
      'SPECIMEN_RECEIVED',
      'clinical',
      `Specimen verified and received in diagnostic lab by ${receivingStaff}. Order ${order.orderNumber} routed to ${order.department}.`,
      order.id
    );

    return { order, specimen: specimen || ({} as SpecimenRecord) };
  }

  // ── WORKFLOW: CONTROLLED SPECIMEN REJECTION & RECOLLECTION ───

  public static rejectSpecimen(
    specimenId: string,
    details: {
      reason: SpecimenRejectionReason | string;
      notes?: string;
      rejectedBy: string;
      requestRecollection?: boolean;
    }
  ): { specimen: SpecimenRecord; order?: LabOrderRecord } {
    if (!details.reason) {
      throw new Error('Controlled rejection requires a mandatory rejection reason.');
    }

    const now = new Date().toISOString();
    const specimens = this.getAllSpecimens();
    const specimen = specimens.find(s => s.id === specimenId || s.barcode === specimenId || s.accessionNumber === specimenId);
    if (!specimen) throw new Error(`Specimen ${specimenId} not found.`);

    specimen.status = 'rejected';
    specimen.rejectionReason = details.reason;
    specimen.rejectionNotes = details.notes;
    specimen.rejectedAt = now;
    specimen.rejectedBy = details.rejectedBy;
    specimen.recollectionRequired = !!details.requestRecollection;
    specimen.updatedAt = now;

    const orders = this.getAll();
    const order = orders.find(o => o.id === specimen.labOrderId);

    if (order) {
      order.rejectionReason = details.reason;
      order.rejectionNotes = details.notes;
      order.rejectedAt = now;

      if (details.requestRecollection) {
        order.status = 'recollection_required';
        order.recollectionRequired = true;
        order.recollectionNotes = `Recollection initiated: ${details.reason}. ${details.notes || ''}`;
        
        // Track historical barcode
        if (!order.previousSpecimenBarcodes) order.previousSpecimenBarcodes = [];
        order.previousSpecimenBarcodes.push(specimen.barcode);

        // Mint new replacement specimen record linked to original
        const newSpecimenId = this.generateSpecimenId();
        const newBarcode = this.generateSampleBarcode();
        const replacementSpecimen: SpecimenRecord = {
          id: newSpecimenId,
          accessionNumber: '', // will be re-accessioned on collection
          barcode: newBarcode,
          labOrderId: order.id,
          orderNumber: order.orderNumber,
          patientId: order.patientId,
          patientName: order.patientName,
          patientPhone: order.patientPhone,
          patientAge: order.patientAge,
          patientGender: order.patientGender,
          testName: order.testName || 'Diagnostic Investigation',
          department: order.department,
          sampleType: order.specimenType || 'Blood',
          tubeType: order.sampleTubeType || 'Standard Tube',
          priority: 'urgent', // elevate recollection to urgent
          status: 'recollection_required',
          recollectionOriginalSpecimenId: specimen.id,
          labelPrintCount: 0,
          createdAt: now,
          updatedAt: now
        };
        specimens.unshift(replacementSpecimen);
        order.specimenId = newSpecimenId;
        order.sampleBarcode = newBarcode;
        specimen.replacementSpecimenId = newSpecimenId;
      } else {
        order.status = 'rejected';
      }

      order.updatedAt = now;
      this.saveOrders(orders);
      ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});
    }

    this.saveSpecimens(specimens);
    ApiSyncService.saveDocument('specimens', specimen.id, specimen).catch(() => {});

    AuditService.log(
      'SPECIMEN_REJECTED',
      'clinical',
      `Specimen ${specimen.accessionNumber || specimen.barcode} rejected by ${details.rejectedBy}. Reason: ${details.reason}. Recollection: ${details.requestRecollection ? 'YES' : 'NO'}.`,
      specimen.id
    );

    return { specimen, order };
  }

  // ── WORKFLOW: BARCODE LABEL REPRINT & AUDIT ──────────────────

  public static recordLabelReprint(specimenIdOrBarcode: string, reason: string, staffName: string): SpecimenRecord {
    const specimens = this.getAllSpecimens();
    const specimen = specimens.find(s => s.id === specimenIdOrBarcode || s.barcode === specimenIdOrBarcode || s.accessionNumber === specimenIdOrBarcode);
    if (!specimen) throw new Error(`Specimen not found for reprint.`);

    const now = new Date().toISOString();
    specimen.labelPrintCount = (specimen.labelPrintCount || 1) + 1;
    specimen.lastLabelPrintedAt = now;
    specimen.lastReprintReason = reason;
    specimen.updatedAt = now;

    this.saveSpecimens(specimens);
    ApiSyncService.saveDocument('specimens', specimen.id, specimen).catch(() => {});

    AuditService.log(
      'BARCODE_REPRINTED',
      'clinical',
      `Reprinted tube barcode label for specimen ${specimen.accessionNumber || specimen.barcode} by ${staffName}. Reason: ${reason}. Reprint count: ${specimen.labelPrintCount}.`,
      specimen.id
    );

    return specimen;
  }

  // ── WORKFLOW: TECHNICIAN RESULT ENTRY ─────────────────────────

  public static saveResults(
    orderId: string,
    parameters: LabParameterResult[],
    enteredBy: string,
    technicianNotes?: string,
    isDraft: boolean = false
  ): LabOrderRecord {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId || o.bookingNo === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    if (order.isLocked) {
      throw new Error('Report is officially locked by verifying pathologist and cannot be modified without amendment.');
    }

    const now = new Date().toISOString();
    let hasCritical = false;

    const enrichedParams = parameters.map(p => {
      const flag = p.flag || this.evaluateFlag(p.observedValue, p.referenceRange);
      const isCritical = flag === 'critical' || this.isCriticalValue(p.parameterName, p.observedValue);
      if (isCritical) hasCritical = true;
      return {
        ...p,
        flag: isCritical ? ('critical' as LabParameterFlag) : flag,
        critical: isCritical
      };
    });

    order.parameters = enrichedParams;
    order.testResults = enrichedParams;
    order.resultsEnteredAt = now;
    order.resultsEnteredBy = enteredBy;
    order.hasCriticalResult = hasCritical;
    order.technicianNotes = technicianNotes;

    if (isDraft) {
      order.status = 'processing';
      order.resultStatus = 'draft_entered';
      order.resultsDraftSavedAt = now;
    } else {
      order.status = 'results_entered';
      order.resultStatus = 'submitted_for_verification';
    }

    order.updatedAt = now;
    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    AuditService.log(
      isDraft ? 'RESULTS_DRAFT_SAVED' : 'RESULTS_SUBMITTED',
      'clinical',
      `${isDraft ? 'Draft saved' : 'Results entered & submitted'} by ${enteredBy} for ${order.patientName} (${enrichedParams.length} parameters). Critical values: ${hasCritical ? 'YES (ALERT)' : 'None'}.`,
      order.id
    );

    return order;
  }

  // ── WORKFLOW: DOCUMENT CRITICAL RESULT ACTION ────────────────

  public static recordCriticalResultAction(
    orderId: string,
    details: {
      physicianContacted: string;
      notifiedBy: string;
      actionNotes: string;
    }
  ): LabOrderRecord {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId || o.bookingNo === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date().toISOString();
    order.criticalResultNotifiedAt = now;
    order.criticalResultNotes = `Notified: Dr. ${details.physicianContacted} by ${details.notifiedBy} at ${new Date(now).toLocaleTimeString()}. Action: ${details.actionNotes}`;
    order.updatedAt = now;

    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    AuditService.log(
      'CRITICAL_RESULT_NOTIFIED',
      'clinical',
      `Critical diagnostic alert communicated to Dr. ${details.physicianContacted} by ${details.notifiedBy}. Action notes documented.`,
      order.id
    );

    return order;
  }

  // ── WORKFLOW: PATHOLOGIST VERIFICATION & REPORT LOCKING ──────

  public static verifyAndLockReport(
    orderId: string,
    verification: {
      doctorName: string;
      registrationNo: string;
      designation?: string;
      notes?: string;
    }
  ): LabOrderRecord {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId || o.bookingNo === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    if (!order.parameters || order.parameters.length === 0 || order.parameters.every(p => !p.observedValue?.trim())) {
      throw new Error('Cannot verify lab report without entering parameter analytical findings.');
    }

    const now = new Date().toISOString();
    order.verifiedAt = now;
    order.verifiedBy = verification.doctorName;
    order.verifiedByDoctorName = verification.doctorName;
    order.pathologistName = verification.doctorName;
    order.verifiedDoctorRegistrationNo = verification.registrationNo;
    order.verifyingDoctorDesignation = verification.designation || 'Consultant Pathologist';
    order.pathologistNotes = verification.notes?.trim() || 'Analytical findings correlated clinically. Quality control verified.';
    order.isLocked = true;
    order.lockedAt = now;
    order.status = 'verified';
    order.resultStatus = 'verified';
    order.reportReadyAt = now;
    order.updatedAt = now;

    this.saveOrders(orders);
    ApiSyncService.saveDocument('labBookings', order.id, order).catch(() => {});

    AuditService.log(
      'LAB_REPORT_VERIFIED_AND_LOCKED',
      'clinical',
      `Dr. ${verification.doctorName} (Reg: ${verification.registrationNo}) verified and officially signed lab report for ${order.orderNumber}.`,
      order.id
    );

    return order;
  }

  // ── TAT ENGINE ───────────────────────────────────────────────

  public static calculateTat(order: LabOrderRecord): {
    elapsedMinutes: number;
    targetMinutes: number;
    remainingMinutes: number;
    status: 'within_tat' | 'approaching_tat' | 'tat_delayed';
  } {
    const created = new Date(order.createdAt).getTime();
    const now = order.reportReadyAt ? new Date(order.reportReadyAt).getTime() : Date.now();
    const elapsedMinutes = Math.max(0, Math.floor((now - created) / 60000));
    const targetMinutes = (order.tatHours || 4) * 60;
    const remainingMinutes = targetMinutes - elapsedMinutes;

    let status: 'within_tat' | 'approaching_tat' | 'tat_delayed' = 'within_tat';
    if (remainingMinutes < 0) {
      status = 'tat_delayed';
    } else if (remainingMinutes <= 60) {
      status = 'approaching_tat';
    }

    return { elapsedMinutes, targetMinutes, remainingMinutes, status };
  }
}
