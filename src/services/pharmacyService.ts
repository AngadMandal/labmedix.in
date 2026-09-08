import { StorageService } from './storage';
import { ApiSyncService } from './apiSyncService';
import { BillService, HospitalBill } from './billService';
import { AuditService } from './auditService';
import { CatalogService } from './catalogService';

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
  type: 'STOCK_IN' | 'STOCK_OUT_DISPENSED' | 'STOCK_OUT_EXPIRED' | 'STOCK_OUT_DAMAGED' | 'ADJUSTMENT';
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
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface DispenseRequest {
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  doctorName?: string;
  items: DispenseItem[];
  paymentMode: 'Cash' | 'Card' | 'UPI' | 'Health Wallet';
  paidAmount?: number;
  notes?: string;
  performedBy: string;
  cardNo?: string;
}

const PHARMACY_INVENTORY_KEY = 'labmedix_pharmacy_inventory_v1';
const PHARMACY_MOVEMENTS_KEY = 'labmedix_pharmacy_stock_movements_v1';

export class PharmacyService {
  private static getInitialInventory(): PharmacyInventoryItem[] {
    const catalogMeds = CatalogService.getPharmacyMedicines();
    const now = new Date();
    const futureExpiry = new Date(now.getFullYear() + 1, now.getMonth() + 4, 15).toISOString().split('T')[0];
    const nearExpiry = new Date(now.getFullYear(), now.getMonth() + 1, 20).toISOString().split('T')[0];

    return catalogMeds.map((med, idx) => ({
      id: med.id,
      code: `MED-${String(idx + 1).padStart(3, '0')}`,
      name: med.name,
      genericComposition: med.genericComposition,
      brand: med.brand,
      category: med.category,
      dosageForm: med.dosageForm,
      strength: med.strength,
      packaging: med.packaging,
      batchNumber: `BAT-${now.getFullYear()}-${1000 + idx}`,
      expiryDate: idx === 1 ? nearExpiry : futureExpiry,
      purchasePrice: Math.round(med.mrp * 0.7),
      sellingPrice: med.mrp,
      stockQuantity: idx === 2 ? 8 : (idx + 2) * 25, // One low stock item for realistic alerts
      minStockLevel: 15,
      rackLocation: `Rack ${String.fromCharCode(65 + (idx % 6))}-${(idx % 4) + 1}`,
      prescriptionRequired: med.prescriptionRequired,
      supplier: 'MedLife Distributing Corp',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }));
  }

  public static getInventory(): PharmacyInventoryItem[] {
    const items = StorageService.getItem<PharmacyInventoryItem[]>(
      PHARMACY_INVENTORY_KEY,
      this.getInitialInventory()
    );
    return items;
  }

  public static saveInventoryList(items: PharmacyInventoryItem[]): void {
    StorageService.setItem(PHARMACY_INVENTORY_KEY, items);
  }

  public static getStockMovements(): StockMovement[] {
    return StorageService.getItem<StockMovement[]>(PHARMACY_MOVEMENTS_KEY, []);
  }

  public static recordMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): StockMovement {
    const movements = this.getStockMovements();
    const newMovement: StockMovement = {
      ...movement,
      id: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString()
    };
    movements.unshift(newMovement);
    StorageService.setItem(PHARMACY_MOVEMENTS_KEY, movements.slice(0, 500));
    ApiSyncService.saveDocument('stockMovements', newMovement.id, newMovement).catch(() => {});
    return newMovement;
  }

  public static async saveMedicine(
    item: Partial<PharmacyInventoryItem> & { name: string; sellingPrice: number }
  ): Promise<PharmacyInventoryItem> {
    const items = this.getInventory();
    const nowIso = new Date().toISOString();

    let targetItem: PharmacyInventoryItem;
    if (item.id) {
      const idx = items.findIndex(m => m.id === item.id);
      if (idx >= 0) {
        targetItem = {
          ...items[idx],
          ...item,
          updatedAt: nowIso
        };
        items[idx] = targetItem;
      } else {
        targetItem = {
          id: item.id,
          code: item.code || `MED-${items.length + 1}`,
          name: item.name,
          genericComposition: item.genericComposition || '',
          brand: item.brand || 'Generic',
          category: item.category || 'General',
          dosageForm: item.dosageForm || 'Tablet',
          strength: item.strength || '',
          packaging: item.packaging || 'Standard Box',
          batchNumber: item.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
          expiryDate: item.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          purchasePrice: Number(item.purchasePrice) || Math.round(Number(item.sellingPrice) * 0.7),
          sellingPrice: Number(item.sellingPrice),
          stockQuantity: Number(item.stockQuantity) || 0,
          minStockLevel: Number(item.minStockLevel) || 10,
          rackLocation: item.rackLocation || 'Rack A-1',
          prescriptionRequired: !!item.prescriptionRequired,
          supplier: item.supplier || 'Standard Vendor',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        items.push(targetItem);
      }
    } else {
      const newId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      targetItem = {
        id: newId,
        code: item.code || `MED-${String(items.length + 1).padStart(3, '0')}`,
        name: item.name,
        genericComposition: item.genericComposition || '',
        brand: item.brand || 'Generic',
        category: item.category || 'General',
        dosageForm: item.dosageForm || 'Tablet',
        strength: item.strength || '',
        packaging: item.packaging || 'Standard Box',
        batchNumber: item.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
        expiryDate: item.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        purchasePrice: Number(item.purchasePrice) || Math.round(Number(item.sellingPrice) * 0.7),
        sellingPrice: Number(item.sellingPrice),
        stockQuantity: Number(item.stockQuantity) || 0,
        minStockLevel: Number(item.minStockLevel) || 10,
        rackLocation: item.rackLocation || 'Rack A-1',
        prescriptionRequired: !!item.prescriptionRequired,
        supplier: item.supplier || 'Standard Vendor',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      items.push(targetItem);
    }

    this.saveInventoryList(items);
    await ApiSyncService.saveDocument('pharmacyInventory', targetItem.id, targetItem);
    AuditService.log(
      item.id ? 'MEDICINE_UPDATED' : 'MEDICINE_CREATED',
      'pharmacy',
      `Medicine record saved: ${targetItem.name} (${targetItem.code}), Stock: ${targetItem.stockQuantity}`,
      targetItem.id
    );

    return targetItem;
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
    const items = this.getInventory();
    const idx = items.findIndex(m => m.id === params.medicineId);
    if (idx < 0) {
      throw new Error(`Medicine with ID ${params.medicineId} not found in inventory.`);
    }

    const prev = items[idx];
    const prevStock = prev.stockQuantity;
    const addedQty = Math.max(1, Math.floor(params.quantity));
    const newStock = prevStock + addedQty;

    const updatedItem: PharmacyInventoryItem = {
      ...prev,
      stockQuantity: newStock,
      batchNumber: params.batchNumber || prev.batchNumber,
      expiryDate: params.expiryDate || prev.expiryDate,
      purchasePrice: params.purchasePrice !== undefined ? Number(params.purchasePrice) : prev.purchasePrice,
      sellingPrice: params.sellingPrice !== undefined ? Number(params.sellingPrice) : prev.sellingPrice,
      supplier: params.supplier || prev.supplier,
      updatedAt: new Date().toISOString()
    };

    items[idx] = updatedItem;
    this.saveInventoryList(items);
    await ApiSyncService.saveDocument('pharmacyInventory', updatedItem.id, updatedItem);

    this.recordMovement({
      medicineId: updatedItem.id,
      medicineName: updatedItem.name,
      batchNumber: updatedItem.batchNumber,
      type: 'STOCK_IN',
      quantity: addedQty,
      previousStock: prevStock,
      newStock,
      notes: params.notes || `Stock-in restocking (+${addedQty})`,
      performedBy: params.performedBy
    });

    AuditService.log(
      'STOCK_IN',
      'pharmacy',
      `Stock-in (+${addedQty}) for ${updatedItem.name}. New Stock: ${newStock}`,
      updatedItem.id
    );

    return updatedItem;
  }

  public static async stockOut(params: {
    medicineId: string;
    quantity: number;
    reason: 'EXPIRED' | 'DAMAGED' | 'ADJUSTMENT';
    notes?: string;
    performedBy: string;
  }): Promise<PharmacyInventoryItem> {
    const items = this.getInventory();
    const idx = items.findIndex(m => m.id === params.medicineId);
    if (idx < 0) {
      throw new Error(`Medicine with ID ${params.medicineId} not found.`);
    }

    const prev = items[idx];
    const prevStock = prev.stockQuantity;
    const deduction = Math.max(1, Math.floor(params.quantity));

    if (prevStock < deduction) {
      throw new Error(`Cannot stock out ${deduction} units. Available stock is only ${prevStock}.`);
    }

    const newStock = prevStock - deduction;
    const updatedItem: PharmacyInventoryItem = {
      ...prev,
      stockQuantity: newStock,
      updatedAt: new Date().toISOString()
    };

    items[idx] = updatedItem;
    this.saveInventoryList(items);
    await ApiSyncService.saveDocument('pharmacyInventory', updatedItem.id, updatedItem);

    const movementType = params.reason === 'EXPIRED' 
      ? 'STOCK_OUT_EXPIRED' 
      : params.reason === 'DAMAGED' 
        ? 'STOCK_OUT_DAMAGED' 
        : 'ADJUSTMENT';

    this.recordMovement({
      medicineId: updatedItem.id,
      medicineName: updatedItem.name,
      batchNumber: updatedItem.batchNumber,
      type: movementType,
      quantity: deduction,
      previousStock: prevStock,
      newStock,
      notes: params.notes || `Stock-out: ${params.reason} (-${deduction})`,
      performedBy: params.performedBy
    });

    AuditService.log(
      'STOCK_OUT',
      'pharmacy',
      `Stock-out (-${deduction}, reason: ${params.reason}) for ${updatedItem.name}. New Stock: ${newStock}`,
      updatedItem.id
    );

    return updatedItem;
  }

  public static async dispense(request: DispenseRequest): Promise<{
    bill: HospitalBill;
    items: PharmacyInventoryItem[];
    movements: StockMovement[];
  }> {
    if (!request.items || request.items.length === 0) {
      throw new Error('Dispense request must contain at least one item.');
    }

    const inventory = this.getInventory();
    const validatedItems: { med: PharmacyInventoryItem; reqItem: DispenseItem }[] = [];

    // Step 1: Validate stock for all items
    for (const reqItem of request.items) {
      const med = inventory.find(m => m.id === reqItem.medicineId);
      if (!med) {
        throw new Error(`Medicine ID "${reqItem.medicineId}" does not exist in inventory.`);
      }
      if (med.stockQuantity < reqItem.quantity) {
        throw new Error(
          `Insufficient stock for "${med.name}". Requested: ${reqItem.quantity}, Available: ${med.stockQuantity}. Negative inventory is prevented.`
        );
      }
      validatedItems.push({ med, reqItem });
    }

    // Step 2: Prepare bill line items
    const lineItems = validatedItems.map(({ med, reqItem }) => {
      const unitPrice = reqItem.unitPrice || med.sellingPrice;
      const discount = reqItem.discountPercent || 0;
      const total = unitPrice * reqItem.quantity * (1 - discount / 100);
      return {
        description: `${med.name} [Batch: ${med.batchNumber}]`,
        quantity: reqItem.quantity,
        unitPrice,
        total: Math.round(total * 100) / 100
      };
    });

    const subtotal = lineItems.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
    const itemTotal = lineItems.reduce((acc, curr) => acc + curr.total, 0);
    const overallDiscount = Math.max(0, subtotal - itemTotal);

    const paymentMethodMap: Record<string, 'cash' | 'upi' | 'card' | 'wallet' | 'netbanking'> = {
      'Cash': 'cash',
      'UPI': 'upi',
      'Card': 'card',
      'Health Wallet': 'wallet'
    };
    const mappedPaymentMethod = paymentMethodMap[request.paymentMode] || 'cash';

    // Step 3: Create Hospital Bill & sync to Ledger
    const bill = BillService.createHospitalBill({
      patientId: request.patientId || 'walkin_patient',
      patientName: request.patientName,
      patientMobile: request.patientPhone,
      healthCardNumber: request.cardNo,
      billCategory: 'pharmacy_dispensing',
      items: lineItems,
      discountAmount: overallDiscount,
      paidAmount: request.paidAmount !== undefined ? request.paidAmount : itemTotal,
      paymentMethod: mappedPaymentMethod,
      notes: request.notes || `Counter POS Dispensing by ${request.performedBy}`
    });

    // Step 4: Atomic Stock Deduction & Movement Tracking
    const updatedInventoryList: PharmacyInventoryItem[] = [...inventory];
    const generatedMovements: StockMovement[] = [];

    for (const { med, reqItem } of validatedItems) {
      const idx = updatedInventoryList.findIndex(m => m.id === med.id);
      const prevStock = updatedInventoryList[idx].stockQuantity;
      const newStock = prevStock - reqItem.quantity;

      const updatedMed: PharmacyInventoryItem = {
        ...updatedInventoryList[idx],
        stockQuantity: newStock,
        updatedAt: new Date().toISOString()
      };

      updatedInventoryList[idx] = updatedMed;
      await ApiSyncService.saveDocument('pharmacyInventory', updatedMed.id, updatedMed);

      const mov = this.recordMovement({
        medicineId: updatedMed.id,
        medicineName: updatedMed.name,
        batchNumber: updatedMed.batchNumber,
        type: 'STOCK_OUT_DISPENSED',
        quantity: reqItem.quantity,
        previousStock: prevStock,
        newStock,
        referenceId: bill.billNumber,
        notes: `POS Dispensed to ${request.patientName} (${bill.billNumber})`,
        performedBy: request.performedBy
      });
      generatedMovements.push(mov);
    }

    this.saveInventoryList(updatedInventoryList);

    AuditService.log(
      'MEDICINES_DISPENSED',
      'pharmacy',
      `POS Dispensed ${lineItems.length} medicines to ${request.patientName}. Bill: ${bill.billNumber}`,
      bill.id
    );

    return {
      bill,
      items: updatedInventoryList,
      movements: generatedMovements
    };
  }

  public static getLowStockAlerts(threshold?: number): PharmacyInventoryItem[] {
    const items = this.getInventory();
    return items.filter(item => {
      const min = threshold !== undefined ? threshold : item.minStockLevel;
      return item.stockQuantity <= min;
    });
  }

  public static getExpiryAlerts(daysThreshold = 90): {
    expired: PharmacyInventoryItem[];
    expiringSoon: PharmacyInventoryItem[];
  } {
    const items = this.getInventory();
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 86400000);

    const expired: PharmacyInventoryItem[] = [];
    const expiringSoon: PharmacyInventoryItem[] = [];

    for (const item of items) {
      const exp = new Date(item.expiryDate);
      if (exp < now) {
        expired.push(item);
      } else if (exp <= thresholdDate) {
        expiringSoon.push(item);
      }
    }

    return { expired, expiringSoon };
  }
}
