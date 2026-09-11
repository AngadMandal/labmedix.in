import { StorageService } from './storage';
import { ApiSyncService } from './apiSyncService';
import { BillService, HospitalBill } from './billService';
import { AuditService } from './auditService';
import { EMRService } from './emrService';
import {
  MedicineMasterItem,
  MedicineBatchItem,
  PharmacySupplier,
  PharmacyPurchase,
  PharmacyPurchaseItem,
  PharmacyPurchaseReturn,
  PharmacySale,
  PharmacySaleItem,
  PharmacySalesReturn,
  PharmacyStockAdjustment,
  PharmacyTransaction,
  PharmacyHeldBill,
  PharmacyShiftClosing
} from '../types';

// Backward-compatible interface for legacy callers
export interface PharmacyInventoryItem {
  id: string;
  code: string;
  name: string;
  genericComposition: string;
  brand: string;
  category: string;
  dosageForm: string;
  strength: string;
  packaging: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  rackLocation: string;
  prescriptionRequired: boolean;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  type: 'STOCK_IN' | 'STOCK_OUT_DISPENSED' | 'STOCK_OUT_EXPIRED' | 'STOCK_OUT_DAMAGED' | 'STOCK_OUT_RETURN' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  notes?: string;
  performedBy: string;
  timestamp: string;
}

export interface DispenseItem {
  medicineId: string;
  batchId?: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
}

export interface DispenseRequest {
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  doctorName?: string;
  doctorId?: string;
  prescriptionId?: string;
  items: DispenseItem[];
  paymentMode: 'Cash' | 'Card' | 'UPI' | 'Health Wallet';
  paidAmount?: number;
  notes?: string;
  performedBy: string;
  cardNo?: string;
  saleType?: 'RETAIL' | 'PRESCRIPTION' | 'walkin' | 'patient_linked' | 'prescription';
}

export interface RetailDispenseRequest {
  customerId?: string;
  customerName?: string;
  patientName?: string;
  customerPhone?: string;
  patientPhone?: string;
  patientId?: string;
  cardNo?: string;
  cardTier?: string;
  customerType?: 'walkin' | 'registered' | 'card_holder';
  items: DispenseItem[];
  paymentMode: 'Cash' | 'Card' | 'UPI' | 'Health Wallet' | 'Bank Transfer';
  paidAmount?: number;
  cashReceived?: number;
  manualDiscountPercent?: number;
  manualDiscountAmount?: number;
  manualDiscountReason?: string;
  manualDiscountApprovedBy?: string;
  notes?: string;
  performedBy: string;
  idempotencyKey?: string;
}

export interface PrescriptionDispenseRequest {
  prescriptionId: string;
  prescriptionItemId?: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  cardNo?: string;
  doctorId: string;
  doctorName: string;
  doctorRegNo?: string;
  department?: string;
  sourceType?: string;
  items: DispenseItem[];
  paymentMode: 'Cash' | 'Card' | 'UPI' | 'Health Wallet';
  paidAmount?: number;
  notes?: string;
  performedBy: string;
}

export interface PharmacyDashboardMetrics {
  // RETAIL METRICS
  todayRetailSalesAmount: number;
  todayRetailSalesCount: number;
  todayRetailReturnsTotal: number;
  todayRetailTransactionsCount: number;
  totalRetailRevenue: number;
  retailSalesCount: number;
  retailReturnsCount: number;
  retailReturnsAmount: number;

  // PRESCRIPTION METRICS
  pendingPrescriptionsCount: number;
  dispensedPrescriptionsCount: number;
  todayPrescriptionSalesAmount: number;
  todayPrescriptionSalesCount: number;
  todayPrescriptionReturnsTotal: number;
  prescriptionSalesAmount: number;
  prescriptionReturnsCount: number;

  // INVENTORY METRICS
  totalMedicinesCount: number;
  totalBatchesCount: number;
  totalStockUnits: number;
  stockValuationPurchase: number;
  stockValuationMrp: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiredBatchesCount: number;
  nearExpiry30DaysCount: number;
  nearExpiry60DaysCount: number;
  nearExpiry90DaysCount: number;

  // CONSOLIDATED TOTALS
  todaySalesAmount: number;
  todaySalesCount: number;
  todayPurchasesAmount: number;
  todayPurchasesCount: number;
  todayDiscountsTotal: number;
  todayReturnsTotal: number;
  cashCollectedToday: number;
  digitalCollectedToday: number;
}

// Storage Keys
const PHARMACY_MEDICINES_KEY = 'labmedix_pharmacy_medicines_v2';
const PHARMACY_BATCHES_KEY = 'labmedix_pharmacy_batches_v2';
const PHARMACY_SUPPLIERS_KEY = 'labmedix_pharmacy_suppliers_v2';
const PHARMACY_PURCHASES_KEY = 'labmedix_pharmacy_purchases_v2';
const PHARMACY_PURCHASE_RETURNS_KEY = 'labmedix_pharmacy_purchase_returns_v2';
const PHARMACY_SALES_KEY = 'labmedix_pharmacy_sales_v2';
const PHARMACY_SALES_RETURNS_KEY = 'labmedix_pharmacy_sales_returns_v2';
const PHARMACY_ADJUSTMENTS_KEY = 'labmedix_pharmacy_stock_adjustments_v2';
const PHARMACY_TRANSACTIONS_KEY = 'labmedix_pharmacy_transactions_v2';
const PHARMACY_HELD_BILLS_KEY = 'labmedix_pharmacy_held_bills_v2';
const PHARMACY_SHIFT_CLOSINGS_KEY = 'labmedix_pharmacy_shift_closings_v2';

// Legacy keys for backward-compatibility
const LEGACY_INVENTORY_KEY = 'labmedix_pharmacy_inventory_v1';
const LEGACY_MOVEMENTS_KEY = 'labmedix_pharmacy_stock_movements_v1';

export class PharmacyService {
  /* =======================================================================
     1. INITIAL SEED DATA FOR PRODUCTION READINESS
     ======================================================================= */
  private static getInitialSuppliers(): PharmacySupplier[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'sup_001',
        supplierCode: 'SUP-001',
        name: 'MedLife Distributing Corp',
        contactPerson: 'Rajesh Sharma',
        phone: '+91 98310 12345',
        email: 'orders@medlifecorp.in',
        address: 'Plot 45, Sector V, Salt Lake, Kolkata, WB 700091',
        gstNumber: '19AAECM4421P1Z4',
        drugLicenseNo: 'WB-KOL-20B-184920',
        paymentTerms: 'Net 30 Days',
        outstandingAmount: 24500,
        status: 'active',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'sup_002',
        supplierCode: 'SUP-002',
        name: 'Abbott Healthcare Logistics',
        contactPerson: 'Priyanka Mukherjee',
        phone: '+91 98301 67890',
        email: 'kolkata.depot@abbott.com',
        address: 'Central Logistics Park, NH-6, Howrah, WB 711302',
        gstNumber: '19AAACA0124P1ZT',
        drugLicenseNo: 'WB-HWH-20B-998231',
        paymentTerms: 'Immediate / 15 Days',
        outstandingAmount: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'sup_003',
        supplierCode: 'SUP-003',
        name: 'Cipla Depot & Distribution',
        contactPerson: 'Amitabha Sengupta',
        phone: '+91 98315 54321',
        email: 'east.supply@cipla.com',
        address: 'Park Circus Industrial Hub, Kolkata, WB 700017',
        gstNumber: '19AABCC4091K1ZX',
        drugLicenseNo: 'WB-KOL-21B-443912',
        paymentTerms: 'Net 45 Days',
        outstandingAmount: 18200,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  private static getInitialMedicines(): MedicineMasterItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'med_001',
        code: 'MED-001',
        barcode: '8901088012015',
        name: 'Telma 40mg Tablet',
        genericName: 'Telmisartan 40mg',
        brandName: 'Telma',
        manufacturer: 'Glenmark Pharmaceuticals Ltd',
        category: 'Cardiovascular & Hypertension',
        dosageForm: 'Tablet',
        strength: '40mg',
        packSize: '15 Tablets / Strip',
        unit: 'Tablets',
        hsnSac: '30049079',
        taxGstRate: 12,
        mrp: 145,
        purchasePrice: 95,
        sellingPrice: 145,
        discountRules: { maxDiscountPercent: 15 },
        reorderLevel: 30,
        minStock: 20,
        maxStock: 300,
        prescriptionRequired: true,
        status: 'active',
        description: 'Antihypertensive Angiotensin II receptor antagonist for essential hypertension management.',
        rackLocation: 'Rack A-1',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'med_002',
        code: 'MED-002',
        barcode: '8901117002011',
        name: 'Augmentin 625 Duo Tablet',
        genericName: 'Amoxicillin 500mg + Potassium Clavulanate 125mg',
        brandName: 'Augmentin',
        manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd',
        category: 'Antibiotics & Anti-Infectives',
        dosageForm: 'Tablet',
        strength: '625mg',
        packSize: '10 Tablets / Strip',
        unit: 'Tablets',
        hsnSac: '30041010',
        taxGstRate: 12,
        mrp: 204,
        purchasePrice: 138,
        sellingPrice: 204,
        discountRules: { maxDiscountPercent: 10 },
        reorderLevel: 25,
        minStock: 15,
        maxStock: 200,
        prescriptionRequired: true,
        status: 'active',
        description: 'Broad-spectrum beta-lactam antibacterial for respiratory, ENT and urinary tract infections.',
        rackLocation: 'Rack B-2',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'med_003',
        code: 'MED-003',
        barcode: '8901234003017',
        name: 'Glycomet GP 1 Tablet',
        genericName: 'Glimepiride 1mg + Metformin Hydrochloride 500mg',
        brandName: 'Glycomet GP',
        manufacturer: 'USV Private Limited',
        category: 'Anti-Diabetic & Endocrine',
        dosageForm: 'Tablet',
        strength: '1mg + 500mg',
        packSize: '15 Tablets / Strip',
        unit: 'Tablets',
        hsnSac: '30049099',
        taxGstRate: 12,
        mrp: 110,
        purchasePrice: 72,
        sellingPrice: 110,
        discountRules: { maxDiscountPercent: 15 },
        reorderLevel: 30,
        minStock: 15,
        maxStock: 250,
        prescriptionRequired: true,
        status: 'active',
        description: 'Combination oral hypoglycemic agent for Type 2 Diabetes Mellitus glycemic control.',
        rackLocation: 'Rack A-3',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'med_004',
        code: 'MED-004',
        barcode: '8901456004013',
        name: 'Pan-D Capsule',
        genericName: 'Pantoprazole Gastro-resistant 40mg + Domperidone Prolonged-release 30mg',
        brandName: 'Pan-D',
        manufacturer: 'Alkem Laboratories Ltd',
        category: 'Gastroenterology & Antacids',
        dosageForm: 'Capsule',
        strength: '40mg + 30mg',
        packSize: '15 Capsules / Strip',
        unit: 'Capsules',
        hsnSac: '30049099',
        taxGstRate: 12,
        mrp: 199,
        purchasePrice: 128,
        sellingPrice: 199,
        discountRules: { maxDiscountPercent: 15 },
        reorderLevel: 30,
        minStock: 20,
        maxStock: 300,
        prescriptionRequired: true,
        status: 'active',
        description: 'Proton pump inhibitor + prokinetic for GERD, acid reflux, peptic ulcers and dyspepsia.',
        rackLocation: 'Rack C-1',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'med_005',
        code: 'MED-005',
        barcode: '8901678005019',
        name: 'Thyronorm 50mcg Tablet',
        genericName: 'Thyroxine Sodium 50mcg',
        brandName: 'Thyronorm',
        manufacturer: 'Abbott India Ltd',
        category: 'Hormones & Thyroid',
        dosageForm: 'Tablet',
        strength: '50mcg',
        packSize: '120 Tablets / Bottle',
        unit: 'Bottles',
        hsnSac: '30043912',
        taxGstRate: 12,
        mrp: 180,
        purchasePrice: 118,
        sellingPrice: 180,
        discountRules: { maxDiscountPercent: 10 },
        reorderLevel: 15,
        minStock: 10,
        maxStock: 150,
        prescriptionRequired: true,
        status: 'active',
        description: 'Synthetic levothyroxine replacement therapy for clinical hypothyroidism.',
        rackLocation: 'Rack D-2',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'med_006',
        code: 'MED-006',
        barcode: '8901890006015',
        name: 'Rosuvas 10mg Tablet',
        genericName: 'Rosuvastatin Calcium 10mg',
        brandName: 'Rosuvas',
        manufacturer: 'Sun Pharmaceutical Industries Ltd',
        category: 'Cardiovascular & Lipid Regulators',
        dosageForm: 'Tablet',
        strength: '10mg',
        packSize: '15 Tablets / Strip',
        unit: 'Tablets',
        hsnSac: '30049079',
        taxGstRate: 12,
        mrp: 235,
        purchasePrice: 152,
        sellingPrice: 235,
        discountRules: { maxDiscountPercent: 15 },
        reorderLevel: 20,
        minStock: 12,
        maxStock: 200,
        prescriptionRequired: true,
        status: 'active',
        description: 'HMG-CoA reductase inhibitor for hypercholesterolemia and cardiovascular prevention.',
        rackLocation: 'Rack A-2',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'med_007',
        code: 'MED-007',
        barcode: '8902012007011',
        name: 'Calpol 650mg Tablet',
        genericName: 'Paracetamol 650mg',
        brandName: 'Calpol',
        manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd',
        category: 'Analgesics & Antipyretics',
        dosageForm: 'Tablet',
        strength: '650mg',
        packSize: '15 Tablets / Strip',
        unit: 'Tablets',
        hsnSac: '30049060',
        taxGstRate: 12,
        mrp: 32,
        purchasePrice: 19,
        sellingPrice: 32,
        discountRules: { maxDiscountPercent: 10 },
        reorderLevel: 40,
        minStock: 25,
        maxStock: 500,
        prescriptionRequired: false,
        status: 'active',
        description: 'First-line antipyretic and analgesic for pain relief and acute pyrexia.',
        rackLocation: 'Rack E-1',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'med_008',
        code: 'MED-008',
        barcode: '8902234008017',
        name: 'Montair LC Tablet',
        genericName: 'Montelukast Sodium 10mg + Levocetirizine Dihydrochloride 5mg',
        brandName: 'Montair LC',
        manufacturer: 'Cipla Ltd',
        category: 'Respiratory & Anti-Allergics',
        dosageForm: 'Tablet',
        strength: '10mg + 5mg',
        packSize: '10 Tablets / Strip',
        unit: 'Tablets',
        hsnSac: '30049099',
        taxGstRate: 12,
        mrp: 185,
        purchasePrice: 120,
        sellingPrice: 185,
        discountRules: { maxDiscountPercent: 15 },
        reorderLevel: 25,
        minStock: 15,
        maxStock: 250,
        prescriptionRequired: true,
        status: 'active',
        description: 'Leukotriene receptor antagonist + H1 antihistamine for allergic rhinitis and asthma prophylaxis.',
        rackLocation: 'Rack B-1',
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  private static getInitialBatches(): MedicineBatchItem[] {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // Helper for formatting YYYY-MM-DD
    const dateStr = (y: number, m: number, d: number) =>
      `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // Near expiry: within 25 days
    const nearExp = dateStr(curYear, curMonth, 28);
    // 60 days expiry
    const exp60 = dateStr(curYear, curMonth + 2, 15);
    // Safe expiry: 1.5 years later
    const safeExp1 = dateStr(curYear + 1, curMonth + 6, 20);
    const safeExp2 = dateStr(curYear + 1, curMonth + 10, 10);
    const pastMfg = dateStr(curYear - 1, curMonth, 10);
    const recMfg = dateStr(curYear, curMonth - 2, 5);

    return [
      // Telma 40mg - 2 batches (FEFO: Batch 101 expires earlier)
      {
        id: 'bat_001',
        medicineId: 'med_001',
        medicineName: 'Telma 40mg Tablet',
        batchNumber: `TEL-${curYear}-881`,
        mfgDate: pastMfg,
        expiryDate: exp60,
        purchaseQty: 60,
        freeQty: 0,
        availableQty: 24,
        purchasePrice: 95,
        mrp: 145,
        sellingPrice: 145,
        supplierId: 'sup_001',
        supplierName: 'MedLife Distributing Corp',
        invoiceNumber: 'INV-ML-2026-091',
        purchaseDate: pastMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'bat_002',
        medicineId: 'med_001',
        medicineName: 'Telma 40mg Tablet',
        batchNumber: `TEL-${curYear}-944`,
        mfgDate: recMfg,
        expiryDate: safeExp1,
        purchaseQty: 100,
        freeQty: 10,
        availableQty: 85,
        purchasePrice: 95,
        mrp: 145,
        sellingPrice: 145,
        supplierId: 'sup_001',
        supplierName: 'MedLife Distributing Corp',
        invoiceNumber: 'INV-ML-2026-140',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },

      // Augmentin 625 - Near Expiry Batch (< 30 days) to demonstrate live alerts
      {
        id: 'bat_003',
        medicineId: 'med_002',
        medicineName: 'Augmentin 625 Duo Tablet',
        batchNumber: `AUG-${curYear}-112`,
        mfgDate: dateStr(curYear - 1, curMonth - 6, 1),
        expiryDate: nearExp,
        purchaseQty: 50,
        freeQty: 0,
        availableQty: 12,
        purchasePrice: 138,
        mrp: 204,
        sellingPrice: 204,
        supplierId: 'sup_002',
        supplierName: 'Abbott Healthcare Logistics',
        invoiceNumber: 'INV-AB-2026-042',
        purchaseDate: dateStr(curYear - 1, curMonth - 5, 10),
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'bat_004',
        medicineId: 'med_002',
        medicineName: 'Augmentin 625 Duo Tablet',
        batchNumber: `AUG-${curYear}-490`,
        mfgDate: recMfg,
        expiryDate: safeExp2,
        purchaseQty: 100,
        freeQty: 5,
        availableQty: 90,
        purchasePrice: 138,
        mrp: 204,
        sellingPrice: 204,
        supplierId: 'sup_002',
        supplierName: 'Abbott Healthcare Logistics',
        invoiceNumber: 'INV-AB-2026-105',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },

      // Glycomet GP 1 - Low stock (only 8 available)
      {
        id: 'bat_005',
        medicineId: 'med_003',
        medicineName: 'Glycomet GP 1 Tablet',
        batchNumber: `GLY-${curYear}-330`,
        mfgDate: recMfg,
        expiryDate: safeExp1,
        purchaseQty: 40,
        freeQty: 0,
        availableQty: 8,
        purchasePrice: 72,
        mrp: 110,
        sellingPrice: 110,
        supplierId: 'sup_003',
        supplierName: 'Cipla Depot & Distribution',
        invoiceNumber: 'INV-CIP-2026-088',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },

      // Pan-D Capsule
      {
        id: 'bat_006',
        medicineId: 'med_004',
        medicineName: 'Pan-D Capsule',
        batchNumber: `PAND-${curYear}-721`,
        mfgDate: recMfg,
        expiryDate: safeExp2,
        purchaseQty: 120,
        freeQty: 10,
        availableQty: 110,
        purchasePrice: 128,
        mrp: 199,
        sellingPrice: 199,
        supplierId: 'sup_001',
        supplierName: 'MedLife Distributing Corp',
        invoiceNumber: 'INV-ML-2026-201',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },

      // Thyronorm 50
      {
        id: 'bat_007',
        medicineId: 'med_005',
        medicineName: 'Thyronorm 50mcg Tablet',
        batchNumber: `THY-${curYear}-409`,
        mfgDate: recMfg,
        expiryDate: safeExp1,
        purchaseQty: 50,
        freeQty: 0,
        availableQty: 45,
        purchasePrice: 118,
        mrp: 180,
        sellingPrice: 180,
        supplierId: 'sup_002',
        supplierName: 'Abbott Healthcare Logistics',
        invoiceNumber: 'INV-AB-2026-302',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },

      // Rosuvas 10mg
      {
        id: 'bat_008',
        medicineId: 'med_006',
        medicineName: 'Rosuvas 10mg Tablet',
        batchNumber: `ROS-${curYear}-615`,
        mfgDate: recMfg,
        expiryDate: safeExp2,
        purchaseQty: 80,
        freeQty: 0,
        availableQty: 62,
        purchasePrice: 152,
        mrp: 235,
        sellingPrice: 235,
        supplierId: 'sup_003',
        supplierName: 'Cipla Depot & Distribution',
        invoiceNumber: 'INV-CIP-2026-140',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },

      // Calpol 650mg
      {
        id: 'bat_009',
        medicineId: 'med_007',
        medicineName: 'Calpol 650mg Tablet',
        batchNumber: `CAL-${curYear}-221`,
        mfgDate: recMfg,
        expiryDate: safeExp1,
        purchaseQty: 250,
        freeQty: 25,
        availableQty: 210,
        purchasePrice: 19,
        mrp: 32,
        sellingPrice: 32,
        supplierId: 'sup_001',
        supplierName: 'MedLife Distributing Corp',
        invoiceNumber: 'INV-ML-2026-098',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },

      // Montair LC
      {
        id: 'bat_010',
        medicineId: 'med_008',
        medicineName: 'Montair LC Tablet',
        batchNumber: `MON-${curYear}-990`,
        mfgDate: recMfg,
        expiryDate: safeExp2,
        purchaseQty: 75,
        freeQty: 0,
        availableQty: 58,
        purchasePrice: 120,
        mrp: 185,
        sellingPrice: 185,
        supplierId: 'sup_003',
        supplierName: 'Cipla Depot & Distribution',
        invoiceNumber: 'INV-CIP-2026-199',
        purchaseDate: recMfg,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ];
  }

  /* =======================================================================
     2. MEDICINE MASTER CRUD & DUPLICATE PROTECTION
     ======================================================================= */
  public static getMedicines(): MedicineMasterItem[] {
    return StorageService.getItem<MedicineMasterItem[]>(PHARMACY_MEDICINES_KEY, this.getInitialMedicines());
  }

  public static saveMedicinesList(items: MedicineMasterItem[]): void {
    StorageService.setItem(PHARMACY_MEDICINES_KEY, items);
    this.syncLegacyInventory();
  }

  public static async saveMedicine(
    item: Partial<MedicineMasterItem> & { name: string; sellingPrice: number }
  ): Promise<MedicineMasterItem> {
    const list = this.getMedicines();
    const nowIso = new Date().toISOString();

    // Duplicate protection: prevent duplicate medicine name or code
    const normalizedName = item.name.trim().toLowerCase();
    const duplicate = list.find(m => {
      if (item.id && m.id === item.id) return false;
      return m.name.trim().toLowerCase() === normalizedName || (item.code && m.code.toLowerCase() === item.code.toLowerCase());
    });

    if (duplicate) {
      throw new Error(`A medicine with name "${duplicate.name}" or code "${duplicate.code}" already exists in Medicine Master.`);
    }

    let savedItem: MedicineMasterItem;
    if (item.id) {
      const idx = list.findIndex(m => m.id === item.id);
      if (idx >= 0) {
        savedItem = {
          ...list[idx],
          ...item,
          updatedAt: nowIso
        };
        list[idx] = savedItem;
      } else {
        savedItem = {
          ...item,
          id: item.id,
          code: item.code || `MED-${String(list.length + 1).padStart(3, '0')}`,
          barcode: item.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          genericName: item.genericName || '',
          brandName: item.brandName || item.name,
          manufacturer: item.manufacturer || 'Standard Labs',
          category: item.category || 'General',
          dosageForm: item.dosageForm || 'Tablet',
          strength: item.strength || '',
          packSize: item.packSize || 'Strip of 10',
          unit: item.unit || 'Tablets',
          taxGstRate: item.taxGstRate !== undefined ? item.taxGstRate : 12,
          mrp: Number(item.mrp) || Number(item.sellingPrice),
          purchasePrice: Number(item.purchasePrice) || Math.round(Number(item.sellingPrice) * 0.7),
          sellingPrice: Number(item.sellingPrice),
          reorderLevel: Number(item.reorderLevel) || 20,
          minStock: Number(item.minStock) || 10,
          maxStock: Number(item.maxStock) || 200,
          prescriptionRequired: !!item.prescriptionRequired,
          status: item.status || 'active',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        list.push(savedItem);
      }
    } else {
      const newId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      savedItem = {
        id: newId,
        code: item.code || `MED-${String(list.length + 1).padStart(3, '0')}`,
        barcode: item.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        name: item.name.trim(),
        genericName: item.genericName || '',
        brandName: item.brandName || item.name,
        manufacturer: item.manufacturer || 'Standard Labs',
        category: item.category || 'General',
        dosageForm: item.dosageForm || 'Tablet',
        strength: item.strength || '',
        packSize: item.packSize || 'Strip of 10',
        unit: item.unit || 'Tablets',
        hsnSac: item.hsnSac || '30049099',
        taxGstRate: item.taxGstRate !== undefined ? item.taxGstRate : 12,
        mrp: Number(item.mrp) || Number(item.sellingPrice),
        purchasePrice: Number(item.purchasePrice) || Math.round(Number(item.sellingPrice) * 0.7),
        sellingPrice: Number(item.sellingPrice),
        reorderLevel: Number(item.reorderLevel) || 20,
        minStock: Number(item.minStock) || 10,
        maxStock: Number(item.maxStock) || 200,
        prescriptionRequired: !!item.prescriptionRequired,
        status: item.status || 'active',
        rackLocation: item.rackLocation || 'Rack A-1',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      list.push(savedItem);
    }

    this.saveMedicinesList(list);
    await ApiSyncService.saveDocument('pharmacyMedicines', savedItem.id, savedItem);
    AuditService.log('MEDICINE_SAVED', 'pharmacy', `Medicine Master updated: ${savedItem.name} (${savedItem.code})`, savedItem.id);

    return savedItem;
  }

  public static async deleteMedicine(id: string): Promise<boolean> {
    const list = this.getMedicines();
    const target = list.find(m => m.id === id);
    if (!target) return false;

    // Check if batches with available stock exist
    const batches = this.getBatchesForMedicine(id);
    const hasStock = batches.some(b => b.availableQty > 0);
    if (hasStock) {
      throw new Error(`Cannot delete medicine "${target.name}". Active stock exists in ${batches.length} batch(es). Please adjust stock to 0 first.`);
    }

    const filtered = list.filter(m => m.id !== id);
    this.saveMedicinesList(filtered);
    await ApiSyncService.deleteDocument('pharmacyMedicines', id);
    AuditService.log('MEDICINE_DELETED', 'pharmacy', `Deleted medicine from master: ${target.name} (${target.code})`, id);
    return true;
  }

  /* =======================================================================
     3. BATCH-WISE INVENTORY & FEFO CONTROL
     ======================================================================= */
  public static getBatches(): MedicineBatchItem[] {
    return StorageService.getItem<MedicineBatchItem[]>(PHARMACY_BATCHES_KEY, this.getInitialBatches());
  }

  public static saveBatchesList(batches: MedicineBatchItem[]): void {
    StorageService.setItem(PHARMACY_BATCHES_KEY, batches);
    this.syncLegacyInventory();
  }

  public static getBatchesForMedicine(medicineId: string): MedicineBatchItem[] {
    return this.getBatches().filter(b => b.medicineId === medicineId);
  }

  /**
   * FEFO: First Expiry, First Out.
   * Returns active, unexpired batches sorted in ascending order of expiryDate.
   */
  public static getFefoRecommendedBatches(medicineId: string): MedicineBatchItem[] {
    const today = new Date().toISOString().split('T')[0];
    const batches = this.getBatchesForMedicine(medicineId);

    return batches
      .filter(b => b.status === 'active' && b.availableQty > 0 && b.expiryDate >= today)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }

  public static async saveBatch(batch: MedicineBatchItem): Promise<MedicineBatchItem> {
    const list = this.getBatches();
    const idx = list.findIndex(b => b.id === batch.id);
    if (idx >= 0) {
      list[idx] = { ...batch, updatedAt: new Date().toISOString() };
    } else {
      list.push(batch);
    }
    this.saveBatchesList(list);
    await ApiSyncService.saveDocument('pharmacyBatches', batch.id, batch);
    return batch;
  }

  public static async quarantineBatch(batchId: string, reason: string, user: string): Promise<MedicineBatchItem> {
    const list = this.getBatches();
    const idx = list.findIndex(b => b.id === batchId);
    if (idx < 0) throw new Error(`Batch ID ${batchId} not found.`);

    const updated: MedicineBatchItem = {
      ...list[idx],
      status: 'quarantine',
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    this.saveBatchesList(list);
    await ApiSyncService.saveDocument('pharmacyBatches', updated.id, updated);

    AuditService.log('BATCH_QUARANTINED', 'pharmacy', `Batch ${updated.batchNumber} (${updated.medicineName}) quarantined by ${user}. Reason: ${reason}`, batchId);
    return updated;
  }

  /* =======================================================================
     4. SUPPLIER MASTER
     ======================================================================= */
  public static getSuppliers(): PharmacySupplier[] {
    return StorageService.getItem<PharmacySupplier[]>(PHARMACY_SUPPLIERS_KEY, this.getInitialSuppliers());
  }

  public static saveSuppliersList(suppliers: PharmacySupplier[]): void {
    StorageService.setItem(PHARMACY_SUPPLIERS_KEY, suppliers);
  }

  public static async saveSupplier(
    supplier: Partial<PharmacySupplier> & { name: string; phone: string }
  ): Promise<PharmacySupplier> {
    const list = this.getSuppliers();
    const nowIso = new Date().toISOString();

    let saved: PharmacySupplier;
    if (supplier.id) {
      const idx = list.findIndex(s => s.id === supplier.id);
      if (idx >= 0) {
        saved = { ...list[idx], ...supplier, updatedAt: nowIso };
        list[idx] = saved;
      } else {
        saved = {
          ...supplier,
          id: supplier.id,
          supplierCode: supplier.supplierCode || `SUP-${String(list.length + 1).padStart(3, '0')}`,
          contactPerson: supplier.contactPerson || '',
          email: supplier.email || '',
          address: supplier.address || '',
          gstNumber: supplier.gstNumber || '',
          drugLicenseNo: supplier.drugLicenseNo || '',
          paymentTerms: supplier.paymentTerms || 'Net 30 Days',
          outstandingAmount: Number(supplier.outstandingAmount) || 0,
          status: supplier.status || 'active',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        list.push(saved);
      }
    } else {
      const newId = `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      saved = {
        id: newId,
        supplierCode: supplier.supplierCode || `SUP-${String(list.length + 1).padStart(3, '0')}`,
        name: supplier.name.trim(),
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone.trim(),
        email: supplier.email || '',
        address: supplier.address || '',
        gstNumber: supplier.gstNumber || '',
        drugLicenseNo: supplier.drugLicenseNo || '',
        paymentTerms: supplier.paymentTerms || 'Net 30 Days',
        outstandingAmount: Number(supplier.outstandingAmount) || 0,
        status: supplier.status || 'active',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      list.push(saved);
    }

    this.saveSuppliersList(list);
    await ApiSyncService.saveDocument('pharmacySuppliers', saved.id, saved);
    AuditService.log('SUPPLIER_SAVED', 'pharmacy', `Supplier saved: ${saved.name} (${saved.supplierCode})`, saved.id);
    return saved;
  }

  /* =======================================================================
     5. PURCHASE MANAGEMENT (INWARD GOODS & BATCH CREATION)
     ======================================================================= */
  public static getPurchases(): PharmacyPurchase[] {
    return StorageService.getItem<PharmacyPurchase[]>(PHARMACY_PURCHASES_KEY, []);
  }

  public static savePurchasesList(purchases: PharmacyPurchase[]): void {
    StorageService.setItem(PHARMACY_PURCHASES_KEY, purchases);
  }

  public static async recordPurchase(params: {
    purchaseInvoiceNo: string;
    supplierId: string;
    invoiceDate: string;
    receivedDate?: string;
    items: Array<{
      medicineId: string;
      batchNumber: string;
      mfgDate: string;
      expiryDate: string;
      quantity: number;
      freeQuantity?: number;
      purchaseRate: number;
      mrp: number;
      sellingPrice?: number;
      taxGstPercent?: number;
    }>;
    paidAmount?: number;
    paymentMethod?: string;
    notes?: string;
    performedBy: string;
  }): Promise<{ purchase: PharmacyPurchase; batchesCreated: MedicineBatchItem[] }> {
    if (!params.items || params.items.length === 0) {
      throw new Error('Purchase must contain at least one medicine line item.');
    }

    const suppliers = this.getSuppliers();
    const supplier = suppliers.find(s => s.id === params.supplierId);
    if (!supplier) throw new Error(`Supplier ID ${params.supplierId} not found.`);

    const medicines = this.getMedicines();
    const batches = this.getBatches();
    const nowIso = new Date().toISOString();

    const purchaseItems: PharmacyPurchaseItem[] = [];
    const createdOrUpdatedBatches: MedicineBatchItem[] = [];

    for (const item of params.items) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (!med) throw new Error(`Medicine ID ${item.medicineId} not found in Medicine Master.`);

      const qty = Math.max(1, Math.floor(item.quantity));
      const freeQty = Math.max(0, Math.floor(item.freeQuantity || 0));
      const totalQty = qty + freeQty;
      const rate = Number(item.purchaseRate) || med.purchasePrice;
      const mrp = Number(item.mrp) || med.mrp;
      const sellingRate = Number(item.sellingPrice) || mrp;
      const gstPercent = item.taxGstPercent !== undefined ? item.taxGstPercent : med.taxGstRate;
      const subtotalItem = qty * rate;
      const taxItem = Math.round((subtotalItem * gstPercent) / 100 * 100) / 100;
      const totalItem = subtotalItem + taxItem;

      const pItem: PharmacyPurchaseItem = {
        id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        medicineId: med.id,
        medicineName: med.name,
        batchNumber: item.batchNumber.trim().toUpperCase(),
        mfgDate: item.mfgDate,
        expiryDate: item.expiryDate,
        quantity: qty,
        freeQuantity: freeQty,
        purchaseRate: rate,
        mrp,
        sellingPrice: sellingRate,
        taxGstPercent: gstPercent,
        taxAmount: taxItem,
        totalAmount: totalItem
      };
      purchaseItems.push(pItem);

      // Check if batch exists or create new
      const existingBatch = batches.find(
        b => b.medicineId === med.id && b.batchNumber.toLowerCase() === pItem.batchNumber.toLowerCase()
      );

      let targetBatch: MedicineBatchItem;
      if (existingBatch) {
        const prevAvail = existingBatch.availableQty;
        targetBatch = {
          ...existingBatch,
          availableQty: prevAvail + totalQty,
          purchaseQty: existingBatch.purchaseQty + qty,
          freeQty: existingBatch.freeQty + freeQty,
          purchasePrice: rate,
          mrp,
          sellingPrice: sellingRate,
          expiryDate: item.expiryDate || existingBatch.expiryDate,
          mfgDate: item.mfgDate || existingBatch.mfgDate,
          status: 'active',
          updatedAt: nowIso
        };
        const bIdx = batches.findIndex(b => b.id === existingBatch.id);
        batches[bIdx] = targetBatch;
      } else {
        targetBatch = {
          id: `bat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          medicineId: med.id,
          medicineName: med.name,
          batchNumber: pItem.batchNumber,
          mfgDate: item.mfgDate,
          expiryDate: item.expiryDate,
          purchaseQty: qty,
          freeQty,
          availableQty: totalQty,
          purchasePrice: rate,
          mrp,
          sellingPrice: sellingRate,
          supplierId: supplier.id,
          supplierName: supplier.name,
          invoiceNumber: params.purchaseInvoiceNo,
          purchaseDate: params.invoiceDate,
          status: 'active',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        batches.push(targetBatch);
      }
      createdOrUpdatedBatches.push(targetBatch);

      // Log stock movement
      this.recordMovement({
        medicineId: med.id,
        medicineName: med.name,
        batchNumber: targetBatch.batchNumber,
        type: 'STOCK_IN',
        quantity: totalQty,
        previousStock: targetBatch.availableQty - totalQty,
        newStock: targetBatch.availableQty,
        referenceId: params.purchaseInvoiceNo,
        notes: `Purchase Inward from ${supplier.name} (${params.purchaseInvoiceNo})`,
        performedBy: params.performedBy
      });
    }

    // Save updated batches
    this.saveBatchesList(batches);

    // Purchase calculations
    const subtotal = purchaseItems.reduce((acc, curr) => acc + (curr.quantity * curr.purchaseRate), 0);
    const taxTotal = purchaseItems.reduce((acc, curr) => acc + curr.taxAmount, 0);
    const netTotal = Math.round((subtotal + taxTotal) * 100) / 100;
    const paidAmount = params.paidAmount !== undefined ? params.paidAmount : 0;
    const unpaidBalance = Math.max(0, netTotal - paidAmount);

    const purchase: PharmacyPurchase = {
      id: `pch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      purchaseInvoiceNo: params.purchaseInvoiceNo,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierGst: supplier.gstNumber,
      invoiceDate: params.invoiceDate,
      receivedDate: params.receivedDate || nowIso.split('T')[0],
      items: purchaseItems,
      subtotal,
      taxTotal,
      discountTotal: 0,
      netTotal,
      paidAmount,
      paymentStatus: unpaidBalance === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: params.paymentMethod || 'Bank Transfer',
      receivedBy: params.performedBy,
      notes: params.notes,
      status: 'received',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const purchases = this.getPurchases();
    purchases.unshift(purchase);
    this.savePurchasesList(purchases);

    // Update supplier outstanding amount if unpaid balance
    if (unpaidBalance > 0) {
      supplier.outstandingAmount = (supplier.outstandingAmount || 0) + unpaidBalance;
      this.saveSuppliersList(suppliers);
    }

    // Record Financial Transaction
    this.recordPharmacyTransaction({
      type: 'purchase',
      referenceId: purchase.purchaseInvoiceNo,
      entityName: supplier.name,
      amount: netTotal,
      flow: 'outflow',
      paymentMethod: purchase.paymentMethod,
      performedBy: params.performedBy,
      notes: `Purchase Inward Bill ${purchase.purchaseInvoiceNo} (${purchaseItems.length} SKUs)`
    });

    await ApiSyncService.saveDocument('pharmacyPurchases', purchase.id, purchase);
    AuditService.log('PURCHASE_RECORDED', 'pharmacy', `Inward purchase ${purchase.purchaseInvoiceNo} recorded from ${supplier.name} for ₹${netTotal}`, purchase.id);

    return { purchase, batchesCreated: createdOrUpdatedBatches };
  }

  /* =======================================================================
     6. PURCHASE RETURN
     ======================================================================= */
  public static getPurchaseReturns(): PharmacyPurchaseReturn[] {
    return StorageService.getItem<PharmacyPurchaseReturn[]>(PHARMACY_PURCHASE_RETURNS_KEY, []);
  }

  public static async recordPurchaseReturn(params: {
    supplierId: string;
    purchaseInvoiceNo: string;
    medicineId: string;
    batchNumber: string;
    quantity: number;
    returnRate: number;
    reason: string;
    authorizedBy: string;
  }): Promise<PharmacyPurchaseReturn> {
    const batches = this.getBatches();
    const batch = batches.find(
      b => b.medicineId === params.medicineId && b.batchNumber.toLowerCase() === params.batchNumber.toLowerCase()
    );

    if (!batch) {
      throw new Error(`Batch ${params.batchNumber} for medicine ID ${params.medicineId} not found.`);
    }

    const qty = Math.max(1, Math.floor(params.quantity));
    if (batch.availableQty < qty) {
      throw new Error(`Cannot return ${qty} units. Only ${batch.availableQty} available in Batch ${batch.batchNumber}.`);
    }

    const prevStock = batch.availableQty;
    batch.availableQty -= qty;
    batch.updatedAt = new Date().toISOString();
    this.saveBatchesList(batches);

    const returnAmount = Math.round(qty * params.returnRate * 100) / 100;
    const suppliers = this.getSuppliers();
    const supplier = suppliers.find(s => s.id === params.supplierId);
    if (supplier) {
      supplier.outstandingAmount = Math.max(0, (supplier.outstandingAmount || 0) - returnAmount);
      this.saveSuppliersList(suppliers);
    }

    const pReturn: PharmacyPurchaseReturn = {
      id: `pret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      returnNumber: `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: params.supplierId,
      supplierName: supplier ? supplier.name : 'Supplier',
      purchaseInvoiceNo: params.purchaseInvoiceNo,
      medicineId: params.medicineId,
      medicineName: batch.medicineName,
      batchNumber: batch.batchNumber,
      quantity: qty,
      returnRate: params.returnRate,
      returnAmount,
      reason: params.reason,
      authorizedBy: params.authorizedBy,
      returnDate: new Date().toISOString().split('T')[0],
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    const pReturns = this.getPurchaseReturns();
    pReturns.unshift(pReturn);
    StorageService.setItem(PHARMACY_PURCHASE_RETURNS_KEY, pReturns);

    this.recordMovement({
      medicineId: batch.medicineId,
      medicineName: batch.medicineName,
      batchNumber: batch.batchNumber,
      type: 'STOCK_OUT_RETURN',
      quantity: qty,
      previousStock: prevStock,
      newStock: batch.availableQty,
      referenceId: pReturn.returnNumber,
      notes: `Purchase Return to ${supplier?.name || 'Vendor'} (${params.reason})`,
      performedBy: params.authorizedBy
    });

    this.recordPharmacyTransaction({
      type: 'purchase_return',
      referenceId: pReturn.returnNumber,
      entityName: supplier ? supplier.name : 'Supplier',
      amount: returnAmount,
      flow: 'inflow',
      paymentMethod: 'Credit Note / Adjustment',
      performedBy: params.authorizedBy,
      notes: `Purchase return ${pReturn.returnNumber} for ${batch.medicineName} (${qty} units)`
    });

    await ApiSyncService.saveDocument('pharmacyPurchaseReturns', pReturn.id, pReturn);
    AuditService.log('PURCHASE_RETURN', 'pharmacy', `Purchase return ${pReturn.returnNumber} processed to ${pReturn.supplierName}`, pReturn.id);

    return pReturn;
  }

  /* =======================================================================
     7. SALES / POS COUNTER & FEFO DISPENSING (RETAIL VS PRESCRIPTION)
     ======================================================================= */
  public static getSales(): PharmacySale[] {
    return StorageService.getItem<PharmacySale[]>(PHARMACY_SALES_KEY, []);
  }

  public static saveSalesList(sales: PharmacySale[]): void {
    StorageService.setItem(PHARMACY_SALES_KEY, sales);
  }

  /**
   * RETAIL PHARMACY WORKFLOW
   * For walk-in, registered patients, and cardholders without prescriptions.
   * Direct medicine OTC / general sales.
   */
  public static async dispenseRetailSale(request: RetailDispenseRequest): Promise<{
    sale: PharmacySale;
    bill: HospitalBill;
    items: PharmacySaleItem[];
  }> {
    if (!request.items || request.items.length === 0) {
      throw new Error('Retail dispense request must contain at least one item.');
    }

    const medicines = this.getMedicines();
    const batches = this.getBatches();
    const today = new Date().toISOString().split('T')[0];

    const saleItems: PharmacySaleItem[] = [];
    const updatedBatches: MedicineBatchItem[] = [];
    const stockMovementsToRecord: Array<Omit<StockMovement, 'id' | 'timestamp'>> = [];

    // Step 1: Validate stock & resolve batch via FEFO
    for (const reqItem of request.items) {
      const med = medicines.find(m => m.id === reqItem.medicineId);
      if (!med) throw new Error(`Medicine ID "${reqItem.medicineId}" not found in master catalog.`);

      let targetBatch: MedicineBatchItem | undefined;

      if (reqItem.batchId) {
        targetBatch = batches.find(b => b.id === reqItem.batchId);
        if (!targetBatch) throw new Error(`Selected batch ID "${reqItem.batchId}" not found.`);
      } else {
        // Automatic FEFO Allocation
        const fefoCandidates = this.getFefoRecommendedBatches(med.id);
        if (fefoCandidates.length === 0) {
          throw new Error(`No active unexpired batches available for "${med.name}". Zero negative-stock enforced.`);
        }
        targetBatch = fefoCandidates[0];
      }

      // Strict safety validation
      if (targetBatch.status === 'quarantine' || targetBatch.status === 'recalled') {
        throw new Error(`Batch "${targetBatch.batchNumber}" for "${med.name}" is ${targetBatch.status.toUpperCase()} and cannot be dispensed.`);
      }
      if (targetBatch.expiryDate < today) {
        throw new Error(`CRITICAL: Batch "${targetBatch.batchNumber}" for "${med.name}" expired on ${targetBatch.expiryDate}. Sale prohibited.`);
      }
      if (targetBatch.availableQty < reqItem.quantity) {
        throw new Error(`Insufficient stock in Batch "${targetBatch.batchNumber}". Available: ${targetBatch.availableQty}, Requested: ${reqItem.quantity}.`);
      }

      const unitPrice = reqItem.unitPrice !== undefined ? reqItem.unitPrice : targetBatch.sellingPrice;
      const discountPercent = reqItem.discountPercent || 0;
      const gross = reqItem.quantity * unitPrice;
      const discountAmount = Math.round((gross * discountPercent) / 100 * 100) / 100;
      const net = gross - discountAmount;
      const gstPercent = med.taxGstRate || 12;
      const taxAmount = Math.round((net * gstPercent) / (100 + gstPercent) * 100) / 100;

      const saleItem: PharmacySaleItem = {
        medicineId: med.id,
        medicineName: med.name,
        batchId: targetBatch.id,
        batchNumber: targetBatch.batchNumber,
        expiryDate: targetBatch.expiryDate,
        quantity: reqItem.quantity,
        mrp: targetBatch.mrp,
        unitPrice,
        discountPercent,
        discountAmount,
        taxGstPercent: gstPercent,
        taxAmount,
        totalAmount: net
      };
      saleItems.push(saleItem);

      // Decrement batch availableQty
      const prevStock = targetBatch.availableQty;
      targetBatch.availableQty -= reqItem.quantity;
      targetBatch.updatedAt = new Date().toISOString();
      updatedBatches.push(targetBatch);

      stockMovementsToRecord.push({
        medicineId: med.id,
        medicineName: med.name,
        batchNumber: targetBatch.batchNumber,
        type: 'STOCK_OUT_DISPENSED',
        quantity: reqItem.quantity,
        previousStock: prevStock,
        newStock: targetBatch.availableQty,
        performedBy: request.performedBy
      });
    }

    // Step 2: Totals & Precise Round-off Calculation
    const subtotal = Math.round(saleItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0) * 100) / 100;
    const itemDiscountTotal = Math.round(saleItems.reduce((acc, curr) => acc + curr.discountAmount, 0) * 100) / 100;
    
    // Manual discount override calculation
    let manualDiscountAmount = 0;
    if (request.manualDiscountAmount !== undefined && request.manualDiscountAmount > 0) {
      manualDiscountAmount = request.manualDiscountAmount;
    } else if (request.manualDiscountPercent !== undefined && request.manualDiscountPercent > 0) {
      manualDiscountAmount = Math.round(((subtotal - itemDiscountTotal) * request.manualDiscountPercent / 100) * 100) / 100;
    }
    
    const discountTotal = Math.round((itemDiscountTotal + manualDiscountAmount) * 100) / 100;
    const taxTotal = Math.round(saleItems.reduce((acc, curr) => acc + curr.taxAmount, 0) * 100) / 100;
    const unroundedNet = Math.max(0, subtotal - discountTotal);
    const netTotal = Math.round(unroundedNet); // Round-off to nearest whole rupee
    const roundOff = Math.round((netTotal - unroundedNet) * 100) / 100;
    
    const paidAmount = request.paidAmount !== undefined ? request.paidAmount : netTotal;
    const dueAmount = Math.max(0, Math.round((netTotal - paidAmount) * 100) / 100);
    const cashReceived = request.cashReceived !== undefined 
      ? request.cashReceived 
      : (request.paymentMode === 'Cash' ? paidAmount : undefined);
    const changeGiven = cashReceived !== undefined 
      ? Math.max(0, Math.round((cashReceived - paidAmount) * 100) / 100) 
      : 0;

    // Idempotency check: prevent duplicate bill submission
    if (request.idempotencyKey) {
      const existing = this.getSales().find(s => s.idempotencyKey === request.idempotencyKey);
      if (existing) {
        return {
          sale: existing,
          bill: null as any,
          items: existing.items
        };
      }
    }

    // Standard official sequential invoice numbering: LM-PH-YYYY-XXXXXX
    const invoiceNumber = this.generateRetailInvoiceNumber();

    const sale: PharmacySale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber,
      saleDate: new Date().toISOString(),
      saleType: 'RETAIL',
      sourceType: 'RETAIL',
      customerType: request.customerType || (request.cardNo ? 'card_holder' : request.patientId ? 'registered' : 'walkin'),
      customerId: request.customerId,
      patientId: request.patientId,
      patientName: request.customerName || request.patientName || 'Walk-in Customer',
      patientPhone: request.customerPhone || request.patientPhone,
      patientCardNo: request.cardNo,
      cardTier: request.cardTier,
      prescriptionId: undefined, // Explicitly undefined for Retail
      items: saleItems,
      subtotal,
      discountAmount: discountTotal,
      healthCardDiscount: request.cardNo ? itemDiscountTotal : 0,
      manualDiscountAmount,
      manualDiscountPercent: request.manualDiscountPercent,
      manualDiscountReason: request.manualDiscountReason,
      manualDiscountApprovedBy: request.manualDiscountApprovedBy,
      taxAmount: taxTotal,
      roundOff,
      netTotal,
      paidAmount,
      dueAmount,
      cashReceived,
      changeGiven,
      paymentMethod: request.paymentMode,
      dispensedBy: request.performedBy,
      status: 'dispensed',
      notes: request.notes,
      idempotencyKey: request.idempotencyKey,
      createdAt: new Date().toISOString()
    };

    // Step 3: Hospital bill
    const paymentMethodMap: Record<string, 'cash' | 'upi' | 'card' | 'wallet' | 'netbanking'> = {
      'Cash': 'cash',
      'UPI': 'upi',
      'Card': 'card',
      'Health Wallet': 'wallet',
      'Bank Transfer': 'netbanking'
    };

    const bill = BillService.createHospitalBill({
      patientId: request.patientId || 'walkin_retail',
      patientName: request.customerName || request.patientName || 'Walk-in Customer',
      patientMobile: request.customerPhone || request.patientPhone,
      healthCardNumber: request.cardNo,
      billCategory: 'pharmacy_dispensing',
      items: saleItems.map(i => ({
        description: `${i.medicineName} [Batch: ${i.batchNumber}]`,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.totalAmount
      })),
      discountAmount: discountTotal,
      paidAmount,
      paymentMethod: paymentMethodMap[request.paymentMode] || 'cash',
      notes: `Retail Pharmacy Sale [Invoice: ${invoiceNumber}] by ${request.performedBy}`
    });

    // Step 4: Persist batches & stock movements
    this.saveBatchesList(batches);

    for (const mov of stockMovementsToRecord) {
      this.recordMovement({
        ...mov,
        referenceId: invoiceNumber,
        notes: `Retail Sale to ${sale.patientName} (${invoiceNumber})`
      });
    }

    // Step 5: Save Sale record & Financial Transaction
    const sales = this.getSales();
    sales.unshift(sale);
    this.saveSalesList(sales);

    this.recordPharmacyTransaction({
      type: 'sale',
      referenceId: sale.invoiceNumber,
      entityName: sale.patientName,
      amount: netTotal,
      flow: 'inflow',
      paymentMethod: sale.paymentMethod,
      performedBy: request.performedBy,
      notes: `Retail Pharmacy Sale ${sale.invoiceNumber} (${saleItems.length} items)`
    });

    await ApiSyncService.saveDocument('pharmacySales', sale.id, sale);
    AuditService.log('RETAIL_PHARMACY_SALE', 'pharmacy', `Retail sale ${sale.invoiceNumber} to ${sale.patientName} for ₹${netTotal}`, sale.id);

    return { sale, bill, items: saleItems };
  }

  /**
   * Generates a unique, standardized sequential retail invoice number.
   * Format: LM-PH-YYYY-XXXXXX (e.g. LM-PH-2026-000001)
   */
  public static generateRetailInvoiceNumber(): string {
    const sales = this.getSales();
    const currentYear = new Date().getFullYear();
    const prefix = `LM-PH-${currentYear}-`;
    const existingNums = sales
      .map(s => s.invoiceNumber)
      .filter(num => num && num.startsWith(prefix))
      .map(num => parseInt(num.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    const nextSeq = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `${prefix}${nextSeq.toString().padStart(6, '0')}`;
  }

  /* =======================================================================
     HELD BILLS (UNFINISHED CARTS MANAGEMENT)
     ======================================================================= */
  public static getHeldBills(): PharmacyHeldBill[] {
    return StorageService.getItem<PharmacyHeldBill[]>(PHARMACY_HELD_BILLS_KEY, []);
  }

  public static saveHeldBills(items: PharmacyHeldBill[]): void {
    StorageService.setItem(PHARMACY_HELD_BILLS_KEY, items);
  }

  public static async holdBill(
    data: Omit<PharmacyHeldBill, 'id' | 'holdNumber' | 'heldAt'>
  ): Promise<PharmacyHeldBill> {
    const heldList = this.getHeldBills();
    const currentYear = new Date().getFullYear();
    const holdNumber = `HOLD-${currentYear}-${(heldList.length + 1).toString().padStart(4, '0')}`;

    const newHold: PharmacyHeldBill = {
      ...data,
      id: `hold_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      holdNumber,
      heldAt: new Date().toISOString()
    };

    heldList.unshift(newHold);
    this.saveHeldBills(heldList);
    await ApiSyncService.saveDocument('pharmacyHeldBills', newHold.id, newHold);
    AuditService.log('PHARMACY_BILL_HELD', 'pharmacy', `Bill ${holdNumber} put on hold by ${data.heldBy} for ${data.patientName}`);
    return newHold;
  }

  public static deleteHeldBill(id: string): void {
    const heldList = this.getHeldBills();
    const filtered = heldList.filter(b => b.id !== id);
    this.saveHeldBills(filtered);
  }

  /* =======================================================================
     BILL CANCELLATION & REVERSAL (NON-DESTRUCTIVE AUDIT)
     ======================================================================= */
  public static async cancelSale(
    saleId: string,
    reason: string,
    cancelledBy: string,
    restock: boolean = true
  ): Promise<PharmacySale> {
    const sales = this.getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) {
      throw new Error(`Sale ID "${saleId}" not found.`);
    }

    const sale = sales[saleIndex];
    if (sale.status === 'cancelled') {
      throw new Error(`Sale "${sale.invoiceNumber}" is already cancelled.`);
    }

    sale.status = 'cancelled';
    sale.cancelledAt = new Date().toISOString();
    sale.cancelledBy = cancelledBy;
    sale.cancellationReason = reason;

    // Conditionally restock medicines to batches
    if (restock && sale.items && sale.items.length > 0) {
      const batches = this.getBatches();
      for (const item of sale.items) {
        const batch = batches.find(b => b.id === item.batchId);
        if (batch) {
          const prevQty = batch.availableQty;
          batch.availableQty += item.quantity;
          batch.updatedAt = new Date().toISOString();

          this.recordMovement({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNumber: batch.batchNumber,
            type: 'STOCK_IN',
            quantity: item.quantity,
            previousStock: prevQty,
            newStock: batch.availableQty,
            referenceId: sale.invoiceNumber,
            notes: `Bill Cancellation Restock: ${sale.invoiceNumber} (${reason})`,
            performedBy: cancelledBy
          });
        }
      }
      this.saveBatchesList(batches);
    }

    // Record Reversal Transaction
    if (sale.paidAmount > 0) {
      this.recordPharmacyTransaction({
        type: 'refund',
        referenceId: sale.invoiceNumber,
        entityName: sale.patientName,
        amount: sale.paidAmount,
        flow: 'outflow',
        paymentMethod: sale.paymentMethod,
        performedBy: cancelledBy,
        notes: `Cancellation Refund for ${sale.invoiceNumber}: ${reason}`
      });
    }

    sales[saleIndex] = sale;
    this.saveSalesList(sales);
    await ApiSyncService.saveDocument('pharmacySales', sale.id, sale);
    AuditService.log('PHARMACY_BILL_CANCELLED', 'pharmacy', `Invoice ${sale.invoiceNumber} cancelled by ${cancelledBy}. Reason: ${reason}`);

    return sale;
  }

  /* =======================================================================
     OFFICIAL REPRINT TRACKING
     ======================================================================= */
  public static async reprintSale(saleId: string, reprintedBy: string): Promise<PharmacySale> {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) {
      throw new Error(`Sale ID "${saleId}" not found.`);
    }

    sale.isReprint = true;
    sale.reprintCount = (sale.reprintCount || 0) + 1;
    sale.lastReprintAt = new Date().toISOString();
    sale.lastReprintBy = reprintedBy;

    this.saveSalesList(sales);
    await ApiSyncService.saveDocument('pharmacySales', sale.id, sale);
    AuditService.log('PHARMACY_BILL_REPRINTED', 'pharmacy', `Invoice ${sale.invoiceNumber} reprinted (Copy #${sale.reprintCount}) by ${reprintedBy}`);
    return sale;
  }

  /* =======================================================================
     SHIFT / DAY CLOSING LEDGER
     ======================================================================= */
  public static getShiftClosings(): PharmacyShiftClosing[] {
    return StorageService.getItem<PharmacyShiftClosing[]>(PHARMACY_SHIFT_CLOSINGS_KEY, []);
  }

  public static saveShiftClosings(items: PharmacyShiftClosing[]): void {
    StorageService.setItem(PHARMACY_SHIFT_CLOSINGS_KEY, items);
  }

  public static getShiftSummary(cashierId?: string): {
    openingCash: number;
    cashSales: number;
    upiSales: number;
    cardSales: number;
    otherSales: number;
    returnsAmount: number;
    refundsAmount: number;
    totalDiscountsAmount: number;
    expectedCash: number;
    totalSales: number;
    totalTransactions: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    const sales = this.getSales().filter(s => {
      const isToday = s.saleDate.startsWith(today);
      const matchesCashier = !cashierId || s.dispensedBy === cashierId;
      return isToday && matchesCashier && s.status !== 'cancelled';
    });

    const returns = this.getSalesReturns().filter(r => {
      const isToday = r.returnDate.startsWith(today);
      return isToday;
    });

    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    let otherSales = 0;
    let totalDiscountsAmount = 0;

    for (const s of sales) {
      totalDiscountsAmount += s.discountAmount || 0;
      if (s.paymentMethod === 'Cash') {
        cashSales += s.paidAmount || 0;
      } else if (s.paymentMethod === 'UPI') {
        upiSales += s.paidAmount || 0;
      } else if (s.paymentMethod === 'Card') {
        cardSales += s.paidAmount || 0;
      } else {
        otherSales += s.paidAmount || 0;
      }
    }

    const returnsAmount = returns.reduce((acc, r) => acc + (r.refundAmount || 0), 0);
    const openingCash = 2000; // Standard configured drawer float
    const expectedCash = Math.max(0, Math.round((openingCash + cashSales - returnsAmount) * 100) / 100);
    const totalSales = Math.round((cashSales + upiSales + cardSales + otherSales) * 100) / 100;
    const totalTransactions = sales.length;

    return {
      openingCash,
      cashSales,
      upiSales,
      cardSales,
      otherSales,
      returnsAmount,
      refundsAmount: returnsAmount,
      totalDiscountsAmount,
      expectedCash,
      totalSales,
      totalTransactions
    };
  }

  public static async closeShift(
    data: Omit<PharmacyShiftClosing, 'id' | 'shiftNumber' | 'closedAt'>
  ): Promise<PharmacyShiftClosing> {
    const closings = this.getShiftClosings();
    const currentYear = new Date().getFullYear();
    const shiftNumber = `SHIFT-${currentYear}-${(closings.length + 1).toString().padStart(4, '0')}`;

    const newShift: PharmacyShiftClosing = {
      ...data,
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      shiftNumber,
      closedAt: new Date().toISOString()
    };

    closings.unshift(newShift);
    this.saveShiftClosings(closings);
    await ApiSyncService.saveDocument('pharmacyShiftClosings', newShift.id, newShift);
    AuditService.log('PHARMACY_SHIFT_CLOSED', 'pharmacy', `Shift ${shiftNumber} closed by ${data.cashierName}. Expected Cash: ₹${data.expectedCash}, Actual: ₹${data.actualCash}, Diff: ₹${data.difference}`);

    return newShift;
  }

  /**
   * PRESCRIPTION PHARMACY WORKFLOW
   * Strictly for medicines dispensed against a doctor-approved prescription.
   */
  public static async dispensePrescriptionSale(request: PrescriptionDispenseRequest): Promise<{
    sale: PharmacySale;
    bill: HospitalBill;
    items: PharmacySaleItem[];
  }> {
    if (!request.items || request.items.length === 0) {
      throw new Error('Prescription dispense request must contain at least one item.');
    }
    if (!request.prescriptionId) {
      throw new Error('Prescription ID is required for prescription dispensing workflow.');
    }
    if (!request.doctorId) {
      throw new Error('Prescribing Doctor ID is required for clinical prescription dispensing.');
    }

    const medicines = this.getMedicines();
    const batches = this.getBatches();
    const today = new Date().toISOString().split('T')[0];

    const saleItems: PharmacySaleItem[] = [];
    const updatedBatches: MedicineBatchItem[] = [];
    const stockMovementsToRecord: Array<Omit<StockMovement, 'id' | 'timestamp'>> = [];

    // Step 1: Validate stock & resolve batch via FEFO
    for (const reqItem of request.items) {
      const med = medicines.find(m => m.id === reqItem.medicineId);
      if (!med) throw new Error(`Medicine ID "${reqItem.medicineId}" not found in master catalog.`);

      let targetBatch: MedicineBatchItem | undefined;

      if (reqItem.batchId) {
        targetBatch = batches.find(b => b.id === reqItem.batchId);
        if (!targetBatch) throw new Error(`Selected batch ID "${reqItem.batchId}" not found.`);
      } else {
        // Automatic FEFO Allocation
        const fefoCandidates = this.getFefoRecommendedBatches(med.id);
        if (fefoCandidates.length === 0) {
          throw new Error(`No active unexpired batches available for "${med.name}". Zero negative-stock enforced.`);
        }
        targetBatch = fefoCandidates[0];
      }

      // Strict safety validation
      if (targetBatch.status === 'quarantine' || targetBatch.status === 'recalled') {
        throw new Error(`Batch "${targetBatch.batchNumber}" for "${med.name}" is ${targetBatch.status.toUpperCase()} and cannot be dispensed.`);
      }
      if (targetBatch.expiryDate < today) {
        throw new Error(`CRITICAL: Batch "${targetBatch.batchNumber}" for "${med.name}" expired on ${targetBatch.expiryDate}. Clinical dispensing prohibited.`);
      }
      if (targetBatch.availableQty < reqItem.quantity) {
        throw new Error(`Insufficient stock in Batch "${targetBatch.batchNumber}". Available: ${targetBatch.availableQty}, Requested: ${reqItem.quantity}.`);
      }

      const unitPrice = reqItem.unitPrice !== undefined ? reqItem.unitPrice : targetBatch.sellingPrice;
      const discountPercent = reqItem.discountPercent || 0;
      const gross = reqItem.quantity * unitPrice;
      const discountAmount = Math.round((gross * discountPercent) / 100 * 100) / 100;
      const net = gross - discountAmount;
      const gstPercent = med.taxGstRate || 12;
      const taxAmount = Math.round((net * gstPercent) / (100 + gstPercent) * 100) / 100;

      const saleItem: PharmacySaleItem = {
        medicineId: med.id,
        medicineName: med.name,
        batchId: targetBatch.id,
        batchNumber: targetBatch.batchNumber,
        expiryDate: targetBatch.expiryDate,
        quantity: reqItem.quantity,
        dispensedQuantity: reqItem.quantity,
        prescriptionItemId: request.prescriptionItemId,
        mrp: targetBatch.mrp,
        unitPrice,
        discountPercent,
        discountAmount,
        taxGstPercent: gstPercent,
        taxAmount,
        totalAmount: net
      };
      saleItems.push(saleItem);

      // Decrement batch availableQty
      const prevStock = targetBatch.availableQty;
      targetBatch.availableQty -= reqItem.quantity;
      targetBatch.updatedAt = new Date().toISOString();
      updatedBatches.push(targetBatch);

      stockMovementsToRecord.push({
        medicineId: med.id,
        medicineName: med.name,
        batchNumber: targetBatch.batchNumber,
        type: 'STOCK_OUT_DISPENSED',
        quantity: reqItem.quantity,
        previousStock: prevStock,
        newStock: targetBatch.availableQty,
        performedBy: request.performedBy
      });
    }

    // Step 2: Totals
    const subtotal = saleItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    const discountTotal = saleItems.reduce((acc, curr) => acc + curr.discountAmount, 0);
    const taxTotal = saleItems.reduce((acc, curr) => acc + curr.taxAmount, 0);
    const netTotal = Math.max(0, Math.round((subtotal - discountTotal) * 100) / 100);
    const paidAmount = request.paidAmount !== undefined ? request.paidAmount : netTotal;
    const dueAmount = Math.max(0, netTotal - paidAmount);

    const invoiceNumber = `PHARM-RX-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const sale: PharmacySale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber,
      saleDate: new Date().toISOString(),
      saleType: 'PRESCRIPTION',
      sourceType: 'PRESCRIPTION',
      patientId: request.patientId,
      patientName: request.patientName,
      patientPhone: request.patientPhone,
      patientCardNo: request.cardNo,
      doctorId: request.doctorId,
      prescribingDoctor: request.doctorName,
      prescriptionId: request.prescriptionId,
      dispensingStatus: 'fully_dispensed',
      items: saleItems,
      subtotal,
      discountAmount: discountTotal,
      healthCardDiscount: request.cardNo ? discountTotal : 0,
      taxAmount: taxTotal,
      netTotal,
      paidAmount,
      dueAmount,
      paymentMethod: request.paymentMode,
      dispensedBy: request.performedBy,
      status: 'dispensed',
      notes: request.notes,
      createdAt: new Date().toISOString()
    };

    // Step 3: Hospital bill
    const paymentMethodMap: Record<string, 'cash' | 'upi' | 'card' | 'wallet' | 'netbanking'> = {
      'Cash': 'cash',
      'UPI': 'upi',
      'Card': 'card',
      'Health Wallet': 'wallet'
    };

    const bill = BillService.createHospitalBill({
      patientId: request.patientId,
      patientName: request.patientName,
      patientMobile: request.patientPhone,
      healthCardNumber: request.cardNo,
      billCategory: 'pharmacy_dispensing',
      items: saleItems.map(i => ({
        description: `${i.medicineName} [Batch: ${i.batchNumber}] (Rx: ${request.prescriptionId})`,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.totalAmount
      })),
      discountAmount: discountTotal,
      paidAmount,
      paymentMethod: paymentMethodMap[request.paymentMode] || 'cash',
      notes: `Prescription Dispensed [Rx: ${request.prescriptionId}, Invoice: ${invoiceNumber}] by ${request.performedBy}`
    });

    // Step 4: Persist batches & stock movements
    this.saveBatchesList(batches);

    for (const mov of stockMovementsToRecord) {
      this.recordMovement({
        ...mov,
        referenceId: invoiceNumber,
        notes: `Prescription Dispensed to ${request.patientName} (Rx #${request.prescriptionId}, Invoice: ${invoiceNumber})`
      });
    }

    // Step 5: Save Sale record & Financial Transaction
    const sales = this.getSales();
    sales.unshift(sale);
    this.saveSalesList(sales);

    this.recordPharmacyTransaction({
      type: 'sale',
      referenceId: sale.invoiceNumber,
      entityName: sale.patientName,
      amount: netTotal,
      flow: 'inflow',
      paymentMethod: sale.paymentMethod,
      performedBy: request.performedBy,
      notes: `Prescription Dispensed Invoice ${sale.invoiceNumber} for Dr. ${request.doctorName}'s Rx #${request.prescriptionId}`
    });

    await ApiSyncService.saveDocument('pharmacySales', sale.id, sale);
    AuditService.log('PRESCRIPTION_DISPENSED', 'pharmacy', `Prescription ${request.prescriptionId} dispensed (${invoiceNumber}) to ${sale.patientName} for ₹${netTotal}`, sale.id);

    return { sale, bill, items: saleItems };
  }

  /**
   * Universal Dispense Dispatcher (backward compatible)
   */
  public static async dispenseSale(request: DispenseRequest): Promise<{
    sale: PharmacySale;
    bill: HospitalBill;
    items: PharmacySaleItem[];
  }> {
    if (request.prescriptionId || request.saleType === 'PRESCRIPTION' || request.saleType === 'prescription') {
      return this.dispensePrescriptionSale({
        prescriptionId: request.prescriptionId || `RX-${Date.now().toString().slice(-4)}`,
        patientId: request.patientId || 'patient_unspecified',
        patientName: request.patientName,
        patientPhone: request.patientPhone,
        cardNo: request.cardNo,
        doctorId: request.doctorId || 'doc_opd',
        doctorName: request.doctorName || 'Hospital OPD Physician',
        items: request.items,
        paymentMode: request.paymentMode,
        paidAmount: request.paidAmount,
        notes: request.notes,
        performedBy: request.performedBy
      });
    }

    return this.dispenseRetailSale({
      customerName: request.patientName,
      customerPhone: request.patientPhone,
      patientId: request.patientId,
      cardNo: request.cardNo,
      items: request.items,
      paymentMode: request.paymentMode,
      paidAmount: request.paidAmount,
      notes: request.notes,
      performedBy: request.performedBy
    });
  }

  /* =======================================================================
     8. SALES RETURN / MEDICINE RETURN (SEPARATED BY SOURCE)
     ======================================================================= */
  public static getSalesReturns(): PharmacySalesReturn[] {
    return StorageService.getItem<PharmacySalesReturn[]>(PHARMACY_SALES_RETURNS_KEY, []);
  }

  public static async recordSalesReturn(params: {
    originalInvoiceNo: string;
    medicineId: string;
    batchNumber: string;
    quantity: number;
    refundRate: number;
    returnReason: string;
    returnType?: 'RETAIL' | 'PRESCRIPTION';
    stockAction: 'return_to_active' | 'quarantine_damaged' | 'discard_expired';
    authorizedBy: string;
  }): Promise<PharmacySalesReturn> {
    const sales = this.getSales();
    const originalSale = sales.find(s => s.invoiceNumber === params.originalInvoiceNo);
    const patientName = originalSale ? originalSale.patientName : 'Customer';
    const detectedReturnType: 'RETAIL' | 'PRESCRIPTION' =
      params.returnType || (originalSale && originalSale.sourceType === 'PRESCRIPTION' ? 'PRESCRIPTION' : 'RETAIL');

    const batches = this.getBatches();
    const batch = batches.find(
      b => b.medicineId === params.medicineId && b.batchNumber.toLowerCase() === params.batchNumber.toLowerCase()
    );

    const qty = Math.max(1, Math.floor(params.quantity));
    const refundAmount = Math.round(qty * params.refundRate * 100) / 100;

    // Only restock if inspection explicitly approves 'return_to_active'
    if (batch && params.stockAction === 'return_to_active') {
      const prevStock = batch.availableQty;
      batch.availableQty += qty;
      batch.updatedAt = new Date().toISOString();
      this.saveBatchesList(batches);

      this.recordMovement({
        medicineId: batch.medicineId,
        medicineName: batch.medicineName,
        batchNumber: batch.batchNumber,
        type: 'STOCK_IN',
        quantity: qty,
        previousStock: prevStock,
        newStock: batch.availableQty,
        referenceId: params.originalInvoiceNo,
        notes: `${detectedReturnType} Return Restocked from ${patientName} (${params.returnReason})`,
        performedBy: params.authorizedBy
      });
    }

    const sReturn: PharmacySalesReturn = {
      id: `sret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      returnNumber: `SR-${detectedReturnType.slice(0, 3)}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      returnType: detectedReturnType,
      originalInvoiceNo: params.originalInvoiceNo,
      saleId: originalSale ? originalSale.id : '',
      prescriptionId: originalSale?.prescriptionId,
      patientName,
      medicineId: params.medicineId,
      medicineName: batch ? batch.medicineName : 'Medicine',
      batchId: batch ? batch.id : '',
      batchNumber: params.batchNumber,
      quantity: qty,
      refundRate: params.refundRate,
      refundAmount,
      returnReason: params.returnReason,
      stockAction: params.stockAction,
      authorizedBy: params.authorizedBy,
      returnDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    const sReturns = this.getSalesReturns();
    sReturns.unshift(sReturn);
    StorageService.setItem(PHARMACY_SALES_RETURNS_KEY, sReturns);

    this.recordPharmacyTransaction({
      type: 'sales_return',
      referenceId: sReturn.returnNumber,
      entityName: patientName,
      amount: refundAmount,
      flow: 'outflow',
      paymentMethod: 'Cash / Refund',
      performedBy: params.authorizedBy,
      notes: `${detectedReturnType} return ${sReturn.returnNumber} against ${params.originalInvoiceNo} (${params.returnReason})`
    });

    await ApiSyncService.saveDocument('pharmacySalesReturns', sReturn.id, sReturn);
    AuditService.log('SALES_RETURN', 'pharmacy', `${detectedReturnType} return ${sReturn.returnNumber} for ₹${refundAmount} authorized by ${params.authorizedBy}`, sReturn.id);

    return sReturn;
  }

  /* =======================================================================
     9. STOCK ADJUSTMENTS & AUDIT TRAIL
     ======================================================================= */
  public static getStockAdjustments(): PharmacyStockAdjustment[] {
    return StorageService.getItem<PharmacyStockAdjustment[]>(PHARMACY_ADJUSTMENTS_KEY, []);
  }

  public static async recordStockAdjustment(params: {
    medicineId: string;
    batchId: string;
    adjustmentType: 'stock_increase' | 'stock_decrease' | 'damaged' | 'expired' | 'audit_reconciliation' | 'correction';
    adjustedQty: number; // positive or negative
    reason: string;
    performedBy: string;
  }): Promise<PharmacyStockAdjustment> {
    if (!params.reason.trim()) {
      throw new Error('Stock adjustment requires an explicit, auditable reason.');
    }

    const batches = this.getBatches();
    const batchIdx = batches.findIndex(b => b.id === params.batchId);
    if (batchIdx < 0) throw new Error(`Batch ID ${params.batchId} not found.`);

    const batch = batches[batchIdx];
    const prevQty = batch.availableQty;
    const newQty = prevQty + params.adjustedQty;

    if (newQty < 0) {
      throw new Error(`Cannot adjust stock below 0. Current available: ${prevQty}, Adjustment: ${params.adjustedQty}`);
    }

    batch.availableQty = newQty;
    batch.updatedAt = new Date().toISOString();
    batches[batchIdx] = batch;
    this.saveBatchesList(batches);

    const adjustment: PharmacyStockAdjustment = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adjustmentNumber: `ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      medicineId: batch.medicineId,
      medicineName: batch.medicineName,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      adjustmentType: params.adjustmentType,
      previousQty: prevQty,
      adjustedQty: params.adjustedQty,
      newQty,
      reason: params.reason.trim(),
      performedBy: params.performedBy,
      timestamp: new Date().toISOString()
    };

    const adjustments = this.getStockAdjustments();
    adjustments.unshift(adjustment);
    StorageService.setItem(PHARMACY_ADJUSTMENTS_KEY, adjustments);

    this.recordMovement({
      medicineId: batch.medicineId,
      medicineName: batch.medicineName,
      batchNumber: batch.batchNumber,
      type: 'ADJUSTMENT',
      quantity: Math.abs(params.adjustedQty),
      previousStock: prevQty,
      newStock: newQty,
      referenceId: adjustment.adjustmentNumber,
      notes: `Adjustment: ${params.adjustmentType} (${params.reason})`,
      performedBy: params.performedBy
    });

    this.recordPharmacyTransaction({
      type: 'adjustment',
      referenceId: adjustment.adjustmentNumber,
      entityName: batch.medicineName,
      amount: 0,
      flow: 'non_monetary',
      paymentMethod: 'N/A',
      performedBy: params.performedBy,
      notes: `Stock adjusted from ${prevQty} to ${newQty} for Batch ${batch.batchNumber}: ${params.reason}`
    });

    await ApiSyncService.saveDocument('pharmacyAdjustments', adjustment.id, adjustment);
    AuditService.log('STOCK_ADJUSTMENT', 'pharmacy', `Stock adjustment ${adjustment.adjustmentNumber} (${prevQty} → ${newQty}) by ${params.performedBy}. Reason: ${params.reason}`, adjustment.id);

    return adjustment;
  }

  /* =======================================================================
     10. UNIFIED PHARMACY FINANCIAL & TRANSACTION LEDGER
     ======================================================================= */
  public static getPharmacyTransactions(): PharmacyTransaction[] {
    return StorageService.getItem<PharmacyTransaction[]>(PHARMACY_TRANSACTIONS_KEY, []);
  }

  public static recordPharmacyTransaction(
    tx: Omit<PharmacyTransaction, 'id' | 'transactionId' | 'timestamp'>
  ): PharmacyTransaction {
    const txs = this.getPharmacyTransactions();
    const newTx: PharmacyTransaction = {
      ...tx,
      id: `ptx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transactionId: `PTX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString()
    };
    txs.unshift(newTx);
    StorageService.setItem(PHARMACY_TRANSACTIONS_KEY, txs.slice(0, 1000));
    ApiSyncService.saveDocument('pharmacyTransactions', newTx.id, newTx).catch(() => {});
    return newTx;
  }

  /* =======================================================================
     11. DOCTOR PRESCRIPTION PROCESSING INTEGRATION
     ======================================================================= */
  public static getDoctorPrescriptions(): Array<{
    encounterId: string;
    encounterNo: string;
    patientId: string;
    patientName: string;
    patientPhone?: string;
    cardNo?: string;
    doctorId: string;
    doctorName: string;
    doctorSpeciality: string;
    date: string;
    diagnoses: string[];
    sourceType?: string;
    isDispensed?: boolean;
    dispensedInvoiceNo?: string;
    medications: Array<{
      id: string;
      name: string;
      composition?: string;
      dosage: string;
      frequency: string;
      timing: string;
      duration: string;
      instructions?: string;
    }>;
  }> {
    const encounters = EMRService.getAllEncounters();
    const sales = this.getSales();

    return encounters
      .filter(e => e.medications && e.medications.length > 0)
      .map(e => {
        const matchingSale = sales.find(s => s.prescriptionId === e.id || s.prescriptionId === e.encounterNo);
        return {
          encounterId: e.id,
          encounterNo: e.encounterNo,
          patientId: e.patientId,
          patientName: e.patientName,
          patientPhone: (e as any).patientPhone,
          cardNo: e.cardNo,
          doctorId: e.doctorId,
          doctorName: e.doctorName,
          doctorSpeciality: e.doctorSpeciality,
          date: e.date || e.createdAt,
          diagnoses: e.diagnoses || [],
          sourceType: (e as any).department || 'OPD',
          isDispensed: !!matchingSale,
          dispensedInvoiceNo: matchingSale?.invoiceNumber,
          medications: e.medications
        };
      });
  }

  /* =======================================================================
     12. LIVE DASHBOARD METRICS & KPI ENGINE (SEPARATED RETAIL VS RX)
     ======================================================================= */
  public static getDashboardMetrics(): PharmacyDashboardMetrics {
    const medicines = this.getMedicines();
    const batches = this.getBatches();
    const sales = this.getSales();
    const purchases = this.getPurchases();
    const sReturns = this.getSalesReturns();
    const prescriptions = this.getDoctorPrescriptions();

    const todayStr = new Date().toISOString().split('T')[0];
    const nowTime = new Date().getTime();

    // Today's Sales Filter
    const todaySales = sales.filter(s => s.saleDate.startsWith(todayStr));

    // RETAIL METRICS
    const todayRetailSales = todaySales.filter(
      s => s.sourceType === 'RETAIL' || s.saleType === 'RETAIL' || (!s.prescriptionId && s.saleType !== 'PRESCRIPTION')
    );
    const todayRetailSalesAmount = todayRetailSales.reduce((acc, s) => acc + s.netTotal, 0);
    const todayRetailSalesCount = todayRetailSales.length;
    const todayRetailReturns = sReturns.filter(r => r.returnDate === todayStr && r.returnType === 'RETAIL');
    const todayRetailReturnsTotal = todayRetailReturns.reduce((acc, r) => acc + r.refundAmount, 0);

    const totalRetailSales = sales.filter(
      s => s.sourceType === 'RETAIL' || s.saleType === 'RETAIL' || (!s.prescriptionId && s.saleType !== 'PRESCRIPTION')
    );
    const totalRetailRevenue = totalRetailSales.reduce((acc, s) => acc + s.netTotal, 0);
    const retailSalesCount = totalRetailSales.length;

    const retailReturns = sReturns.filter(r => r.returnType === 'RETAIL');
    const retailReturnsCount = retailReturns.length;
    const retailReturnsAmount = retailReturns.reduce((acc, r) => acc + r.refundAmount, 0);

    // PRESCRIPTION METRICS
    const todayPrescriptionSales = todaySales.filter(
      s => s.sourceType === 'PRESCRIPTION' || s.saleType === 'PRESCRIPTION' || !!s.prescriptionId
    );
    const todayPrescriptionSalesAmount = todayPrescriptionSales.reduce((acc, s) => acc + s.netTotal, 0);
    const todayPrescriptionSalesCount = todayPrescriptionSales.length;
    const todayPrescriptionReturns = sReturns.filter(r => r.returnDate === todayStr && r.returnType === 'PRESCRIPTION');
    const todayPrescriptionReturnsTotal = todayPrescriptionReturns.reduce((acc, r) => acc + r.refundAmount, 0);

    const totalPrescriptionSales = sales.filter(
      s => s.sourceType === 'PRESCRIPTION' || s.saleType === 'PRESCRIPTION' || !!s.prescriptionId
    );
    const prescriptionSalesAmount = totalPrescriptionSales.reduce((acc, s) => acc + s.netTotal, 0);

    const prescriptionReturns = sReturns.filter(r => r.returnType === 'PRESCRIPTION');
    const prescriptionReturnsCount = prescriptionReturns.length;

    const pendingPrescriptionsCount = prescriptions.filter(p => !p.isDispensed).length;
    const dispensedPrescriptionsCount = prescriptions.filter(p => p.isDispensed).length;

    // INVENTORY METRICS
    let stockValuationPurchase = 0;
    let stockValuationMrp = 0;
    let totalStockUnits = 0;

    for (const b of batches) {
      if (b.availableQty > 0) {
        totalStockUnits += b.availableQty;
        stockValuationPurchase += b.availableQty * b.purchasePrice;
        stockValuationMrp += b.availableQty * b.mrp;
      }
    }

    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const m of medicines) {
      const medBatches = batches.filter(b => b.medicineId === m.id);
      const totalAvailable = medBatches.reduce((acc, b) => acc + b.availableQty, 0);
      if (totalAvailable === 0) {
        outOfStockCount++;
      } else if (totalAvailable <= m.minStock) {
        lowStockCount++;
      }
    }

    let expiredBatchesCount = 0;
    let nearExpiry30DaysCount = 0;
    let nearExpiry60DaysCount = 0;
    let nearExpiry90DaysCount = 0;

    const ms30 = 30 * 86400000;
    const ms60 = 60 * 86400000;
    const ms90 = 90 * 86400000;

    for (const b of batches) {
      if (b.availableQty <= 0) continue;
      const expTime = new Date(b.expiryDate).getTime();
      const diff = expTime - nowTime;

      if (diff < 0) {
        expiredBatchesCount++;
      } else if (diff <= ms30) {
        nearExpiry30DaysCount++;
      } else if (diff <= ms60) {
        nearExpiry60DaysCount++;
      } else if (diff <= ms90) {
        nearExpiry90DaysCount++;
      }
    }

    // CONSOLIDATED TOTALS
    const todaySalesAmount = todaySales.reduce((acc, s) => acc + s.netTotal, 0);
    const todaySalesCount = todaySales.length;

    const todayPurchases = purchases.filter(p => p.createdAt.startsWith(todayStr) || p.invoiceDate === todayStr);
    const todayPurchasesAmount = todayPurchases.reduce((acc, p) => acc + p.netTotal, 0);
    const todayPurchasesCount = todayPurchases.length;

    const todayDiscountsTotal = todaySales.reduce((acc, s) => acc + s.discountAmount, 0);
    const todayReturnsTotal = todayRetailReturnsTotal + todayPrescriptionReturnsTotal;

    let cashCollectedToday = 0;
    let digitalCollectedToday = 0;

    for (const s of todaySales) {
      if (s.paymentMethod === 'Cash') {
        cashCollectedToday += s.paidAmount;
      } else {
        digitalCollectedToday += s.paidAmount;
      }
    }

    return {
      // RETAIL
      todayRetailSalesAmount,
      todayRetailSalesCount,
      todayRetailReturnsTotal,
      todayRetailTransactionsCount: todayRetailSalesCount + todayRetailReturns.length,
      totalRetailRevenue,
      retailSalesCount,
      retailReturnsCount,
      retailReturnsAmount,

      // PRESCRIPTION
      pendingPrescriptionsCount,
      dispensedPrescriptionsCount,
      todayPrescriptionSalesAmount,
      todayPrescriptionSalesCount,
      todayPrescriptionReturnsTotal,
      prescriptionSalesAmount,
      prescriptionReturnsCount,

      // INVENTORY
      totalMedicinesCount: medicines.length,
      totalBatchesCount: batches.length,
      totalStockUnits,
      stockValuationPurchase: Math.round(stockValuationPurchase),
      stockValuationMrp: Math.round(stockValuationMrp),
      lowStockCount,
      outOfStockCount,
      expiredBatchesCount,
      nearExpiry30DaysCount,
      nearExpiry60DaysCount,
      nearExpiry90DaysCount,

      // OVERALL
      todaySalesAmount,
      todaySalesCount,
      todayPurchasesAmount,
      todayPurchasesCount,
      todayDiscountsTotal,
      todayReturnsTotal,
      cashCollectedToday,
      digitalCollectedToday
    };
  }

  /* =======================================================================
     13. BACKWARD COMPATIBILITY ADAPTERS
     ======================================================================= */
  public static getStockMovements(): StockMovement[] {
    return StorageService.getItem<StockMovement[]>(LEGACY_MOVEMENTS_KEY, []);
  }

  public static recordMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): StockMovement {
    const movements = this.getStockMovements();
    const newMovement: StockMovement = {
      ...movement,
      id: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString()
    };
    movements.unshift(newMovement);
    StorageService.setItem(LEGACY_MOVEMENTS_KEY, movements.slice(0, 500));
    ApiSyncService.saveDocument('stockMovements', newMovement.id, newMovement).catch(() => {});
    return newMovement;
  }

  public static getInventory(): PharmacyInventoryItem[] {
    const medicines = this.getMedicines();
    const batches = this.getBatches();

    return medicines.map(m => {
      const medBatches = batches.filter(b => b.medicineId === m.id);
      const totalStock = medBatches.reduce((acc, b) => acc + b.availableQty, 0);
      const activeBatch = medBatches.find(b => b.availableQty > 0) || medBatches[0];

      return {
        id: m.id,
        code: m.code,
        name: m.name,
        genericComposition: m.genericName,
        brand: m.brandName,
        category: m.category,
        dosageForm: m.dosageForm,
        strength: m.strength,
        packaging: m.packSize,
        batchNumber: activeBatch ? activeBatch.batchNumber : 'N/A',
        expiryDate: activeBatch ? activeBatch.expiryDate : new Date().toISOString().split('T')[0],
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice,
        stockQuantity: totalStock,
        minStockLevel: m.minStock,
        rackLocation: m.rackLocation || 'Rack A-1',
        prescriptionRequired: m.prescriptionRequired,
        supplier: activeBatch ? activeBatch.supplierName : 'Distributor',
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      };
    });
  }

  public static saveInventoryList(items: PharmacyInventoryItem[]): void {
    StorageService.setItem(LEGACY_INVENTORY_KEY, items);
  }

  private static syncLegacyInventory(): void {
    const legacyItems = this.getInventory();
    this.saveInventoryList(legacyItems);
  }

  public static async stockIn(params: {
    medicineId: string;
    quantity: number;
    batchNumber?: string;
    expiryDate?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    supplier?: string;
    notes?: string;
    performedBy: string;
  }): Promise<PharmacyInventoryItem> {
    const medicines = this.getMedicines();
    const med = medicines.find(m => m.id === params.medicineId);
    if (!med) throw new Error(`Medicine with ID ${params.medicineId} not found.`);

    const now = new Date();
    const batchNum = params.batchNumber || `BAT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expDate = params.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    const batches = this.getBatches();
    const existing = batches.find(b => b.medicineId === med.id && b.batchNumber === batchNum);

    if (existing) {
      existing.availableQty += params.quantity;
      existing.purchaseQty += params.quantity;
      existing.updatedAt = now.toISOString();
    } else {
      batches.push({
        id: `bat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        medicineId: med.id,
        medicineName: med.name,
        batchNumber: batchNum,
        mfgDate: now.toISOString().split('T')[0],
        expiryDate: expDate,
        purchaseQty: params.quantity,
        freeQty: 0,
        availableQty: params.quantity,
        purchasePrice: params.purchasePrice || med.purchasePrice,
        mrp: med.mrp,
        sellingPrice: params.sellingPrice || med.sellingPrice,
        supplierId: 'sup_001',
        supplierName: params.supplier || 'Standard Supplier',
        invoiceNumber: `STK-${Date.now().toString().slice(-5)}`,
        purchaseDate: now.toISOString().split('T')[0],
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    }

    this.saveBatchesList(batches);
    this.recordMovement({
      medicineId: med.id,
      medicineName: med.name,
      batchNumber: batchNum,
      type: 'STOCK_IN',
      quantity: params.quantity,
      previousStock: 0,
      newStock: params.quantity,
      notes: params.notes || `Stock In (+${params.quantity})`,
      performedBy: params.performedBy
    });

    return this.getInventory().find(i => i.id === med.id)!;
  }

  public static async stockOut(params: {
    medicineId: string;
    quantity: number;
    reason: 'EXPIRED' | 'DAMAGED' | 'ADJUSTMENT';
    notes?: string;
    performedBy: string;
  }): Promise<PharmacyInventoryItem> {
    const batches = this.getBatchesForMedicine(params.medicineId);
    const available = batches.filter(b => b.availableQty > 0);
    if (available.length === 0) throw new Error('No batches with stock available.');

    const target = available[0];
    return this.recordStockAdjustment({
      medicineId: params.medicineId,
      batchId: target.id,
      adjustmentType: params.reason === 'EXPIRED' ? 'expired' : params.reason === 'DAMAGED' ? 'damaged' : 'correction',
      adjustedQty: -params.quantity,
      reason: params.notes || `Stock out: ${params.reason}`,
      performedBy: params.performedBy
    }).then(() => this.getInventory().find(i => i.id === params.medicineId)!);
  }

  public static async dispense(request: DispenseRequest): Promise<{
    bill: HospitalBill;
    items: PharmacyInventoryItem[];
    movements: StockMovement[];
  }> {
    const result = await this.dispenseSale(request);
    return {
      bill: result.bill,
      items: this.getInventory(),
      movements: this.getStockMovements()
    };
  }

  public static getLowStockAlerts(threshold?: number): PharmacyInventoryItem[] {
    const inv = this.getInventory();
    return inv.filter(item => {
      const min = threshold !== undefined ? threshold : item.minStockLevel;
      return item.stockQuantity <= min;
    });
  }

  public static getExpiryAlerts(daysThreshold = 90): {
    expired: PharmacyInventoryItem[];
    expiringSoon: PharmacyInventoryItem[];
  } {
    const batches = this.getBatches();
    const inv = this.getInventory();
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 86400000);

    const expiredIds = new Set<string>();
    const expiringSoonIds = new Set<string>();

    for (const b of batches) {
      if (b.availableQty <= 0) continue;
      const exp = new Date(b.expiryDate);
      if (exp < now) {
        expiredIds.add(b.medicineId);
      } else if (exp <= thresholdDate) {
        expiringSoonIds.add(b.medicineId);
      }
    }

    const expired = inv.filter(i => expiredIds.has(i.id));
    const expiringSoon = inv.filter(i => expiringSoonIds.has(i.id));

    return { expired, expiringSoon };
  }
}
