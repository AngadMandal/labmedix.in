import {
  HospitalInventoryItem,
  HospitalSupplier,
  PurchaseOrder,
  GoodsReceivedNote,
  InventoryIssueRecord,
  InventoryCategory,
  PurchaseOrderStatus
} from '../types';
import { StorageService, STORAGE_KEYS } from './storage';
import { ApiSyncService } from './apiSyncService';
import { AuditService } from './auditService';
import { generateUuid } from '../utils/idGenerator';

// Default hospital items for clinical inventory initialization
const DEFAULT_INVENTORY_ITEMS: HospitalInventoryItem[] = [
  {
    id: 'item_surg_gloves',
    itemCode: 'MED-GLV-75',
    itemName: 'Sterile Surgical Gloves (Size 7.5)',
    category: 'surgical_ot',
    unitOfMeasure: 'pair',
    currentStock: 450,
    minimumStockLevel: 100,
    reorderQuantity: 500,
    batchNumber: 'GLV-2026-B8',
    expiryDate: '2028-06-30',
    unitPurchasePrice: 38,
    storeLocation: 'OT Sterile Core Room A',
    lastRestockedDate: '2026-08-15',
    status: 'in_stock'
  },
  {
    id: 'item_iv_cannula',
    itemCode: 'MED-CAN-20',
    itemName: 'IV Cannula with Injection Port 20G (Pink)',
    category: 'medical_supply',
    unitOfMeasure: 'piece',
    currentStock: 280,
    minimumStockLevel: 80,
    reorderQuantity: 300,
    batchNumber: 'CNL-2026-K1',
    expiryDate: '2029-01-31',
    unitPurchasePrice: 42,
    storeLocation: 'Central Medical Store Bin 14',
    lastRestockedDate: '2026-08-20',
    status: 'in_stock'
  },
  {
    id: 'item_suture_vicryl',
    itemCode: 'SURG-SUT-V30',
    itemName: 'Vicryl Suture 3-0 Round Body (Absorbable)',
    category: 'surgical_ot',
    unitOfMeasure: 'foil',
    currentStock: 65,
    minimumStockLevel: 50,
    reorderQuantity: 100,
    batchNumber: 'VCR-26-891',
    expiryDate: '2028-11-30',
    unitPurchasePrice: 240,
    storeLocation: 'OT Consumable Rack 3',
    lastRestockedDate: '2026-07-28',
    status: 'in_stock'
  },
  {
    id: 'item_ns_500',
    itemCode: 'MED-IVF-NS500',
    itemName: 'Normal Saline (0.9% NaCl) 500ml Ecoflac',
    category: 'medical_supply',
    unitOfMeasure: 'bottle',
    currentStock: 40,
    minimumStockLevel: 60,
    reorderQuantity: 200,
    batchNumber: 'NS-26-4402',
    expiryDate: '2027-09-30',
    unitPurchasePrice: 48,
    storeLocation: 'IV Fluids Bay - Ground Floor',
    lastRestockedDate: '2026-08-02',
    status: 'low_stock'
  },
  {
    id: 'item_cbc_diluent',
    itemCode: 'LAB-REAG-DIL',
    itemName: 'CBC 5-Part Hematology Diluent 20 Liters',
    category: 'lab_reagent',
    unitOfMeasure: 'drum',
    currentStock: 6,
    minimumStockLevel: 4,
    reorderQuantity: 10,
    batchNumber: 'DIL-8840-X',
    expiryDate: '2027-04-15',
    unitPurchasePrice: 3200,
    storeLocation: 'Diagnostic Lab Reagent Store',
    lastRestockedDate: '2026-08-10',
    status: 'in_stock'
  },
  {
    id: 'item_syringe_5ml',
    itemCode: 'MED-SYR-05',
    itemName: 'Disposable Syringe 5ml with 24G Needle (Luer Lock)',
    category: 'medical_supply',
    unitOfMeasure: 'piece',
    currentStock: 1200,
    minimumStockLevel: 250,
    reorderQuantity: 1000,
    batchNumber: 'SYR-2026-M2',
    expiryDate: '2029-03-31',
    unitPurchasePrice: 6.5,
    storeLocation: 'Central Medical Store Bin 08',
    lastRestockedDate: '2026-08-25',
    status: 'in_stock'
  },
  {
    id: 'item_xray_film',
    itemCode: 'RAD-FLM-1417',
    itemName: 'Digital Medical X-Ray Film 14x17 inches (100 Sheets)',
    category: 'radiology_film',
    unitOfMeasure: 'box',
    currentStock: 8,
    minimumStockLevel: 10,
    reorderQuantity: 20,
    batchNumber: 'FLM-26-90',
    expiryDate: '2027-12-31',
    unitPurchasePrice: 4800,
    storeLocation: 'Radiology Darkroom Cabinet B',
    lastRestockedDate: '2026-07-15',
    status: 'low_stock'
  },
  {
    id: 'item_gauze_swabs',
    itemCode: 'MED-GAU-1010',
    itemName: 'Sterile Cotton Gauze Swabs 10x10cm (100s Pack)',
    category: 'medical_supply',
    unitOfMeasure: 'pack',
    currentStock: 180,
    minimumStockLevel: 50,
    reorderQuantity: 200,
    batchNumber: 'GZ-26-118',
    expiryDate: '2028-10-31',
    unitPurchasePrice: 165,
    storeLocation: 'Wound Care Supply Station',
    lastRestockedDate: '2026-08-18',
    status: 'in_stock'
  }
];

// Default verified medical distributors & manufacturers
const DEFAULT_SUPPLIERS: HospitalSupplier[] = [
  {
    id: 'supp_medtech_01',
    supplierCode: 'SUP-MED-001',
    supplierName: 'MedTech Instruments & Disposables India Pvt Ltd',
    category: 'medical_devices',
    contactPerson: 'Sanjay Sengupta (Sales Director)',
    phone: '+91 98301 22440',
    email: 'orders@medtechindia.com',
    address: 'Plot 42, Salt Lake Sector V, Kolkata, WB - 700091',
    taxGstNumber: '19AAACM4421K1ZM',
    drugLicenseNumber: 'WB-KOL-DL-8812',
    paymentTerms: 'Net 30',
    status: 'active',
    totalPurchasesAmount: 384000,
    ratingStars: 4.9
  },
  {
    id: 'supp_lifeline_02',
    supplierCode: 'SUP-REAG-002',
    supplierName: 'LifeLine Diagnostics & Reagents Ltd',
    category: 'lab_reagents',
    contactPerson: 'Dr. Meenakshi Iyer',
    phone: '+91 98210 55198',
    email: 'supplies@lifelinereagents.in',
    address: 'Industrial Estate Phase 2, Taratala, Kolkata - 700088',
    taxGstNumber: '19AABCL9901M1ZQ',
    drugLicenseNumber: 'WB-KOL-DL-9931',
    paymentTerms: 'Net 15',
    status: 'active',
    totalPurchasesAmount: 215000,
    ratingStars: 4.8
  },
  {
    id: 'supp_bengal_surg_03',
    supplierCode: 'SUP-SURG-003',
    supplierName: 'Bengal Surgical & Suture Corporation',
    category: 'surgical_instruments',
    contactPerson: 'Partha Pratim Dutta',
    phone: '+91 98312 99044',
    email: 'bengalsurgical@vsnl.net',
    address: '12 College Square Medical Market, Kolkata - 700073',
    taxGstNumber: '19AACPB1104P1Z3',
    paymentTerms: 'Net 30',
    status: 'active',
    totalPurchasesAmount: 142000,
    ratingStars: 4.7
  }
];

export class InventoryService {
  private static loadList<T>(key: string, defaultData: T[]): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(defaultData));
        return defaultData;
      }
      return JSON.parse(raw);
    } catch {
      return defaultData;
    }
  }

  private static saveList<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key } }));
  }

  // ==========================================
  // INVENTORY ITEMS
  // ==========================================

  public static getInventoryItems(): HospitalInventoryItem[] {
    return this.loadList<HospitalInventoryItem>(STORAGE_KEYS.INVENTORY_ITEMS, DEFAULT_INVENTORY_ITEMS);
  }

  public static createInventoryItem(input: Omit<HospitalInventoryItem, 'id' | 'status'>): HospitalInventoryItem {
    const list = this.getInventoryItems();
    const status: HospitalInventoryItem['status'] =
      input.currentStock <= 0 ? 'out_of_stock' : input.currentStock <= input.minimumStockLevel ? 'low_stock' : 'in_stock';

    const newItem: HospitalInventoryItem = {
      ...input,
      id: `item_${generateUuid().slice(0, 8)}`,
      status
    };

    list.unshift(newItem);
    this.saveList(STORAGE_KEYS.INVENTORY_ITEMS, list);
    ApiSyncService.saveDocument('inventory_items', newItem.id, newItem).catch(() => {});

    AuditService.log(
      'INVENTORY_ITEM_CREATED',
      'inventory',
      `Created inventory item [${newItem.itemCode}] ${newItem.itemName} (${newItem.currentStock} ${newItem.unitOfMeasure})`,
      newItem.id,
      { code: newItem.itemCode, category: newItem.category }
    );

    return newItem;
  }

  public static updateInventoryItem(id: string, updates: Partial<HospitalInventoryItem>): HospitalInventoryItem {
    const list = this.getInventoryItems();
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Inventory item not found');

    const updated: HospitalInventoryItem = { ...list[idx], ...updates };

    if (updated.currentStock <= 0) {
      updated.status = 'out_of_stock';
    } else if (updated.currentStock <= updated.minimumStockLevel) {
      updated.status = 'low_stock';
    } else {
      updated.status = 'in_stock';
    }

    list[idx] = updated;
    this.saveList(STORAGE_KEYS.INVENTORY_ITEMS, list);
    ApiSyncService.saveDocument('inventory_items', updated.id, updated).catch(() => {});

    AuditService.log(
      'INVENTORY_ITEM_UPDATED',
      'inventory',
      `Updated inventory item [${updated.itemCode}] ${updated.itemName}`,
      updated.id
    );

    return updated;
  }

  public static adjustStock(itemId: string, newStock: number, reason: string, adjustedBy: string): HospitalInventoryItem {
    const list = this.getInventoryItems();
    const idx = list.findIndex(i => i.id === itemId);
    if (idx === -1) throw new Error('Inventory item not found');

    const oldStock = list[idx].currentStock;
    list[idx].currentStock = Math.max(0, newStock);

    if (list[idx].currentStock <= 0) {
      list[idx].status = 'out_of_stock';
    } else if (list[idx].currentStock <= list[idx].minimumStockLevel) {
      list[idx].status = 'low_stock';
    } else {
      list[idx].status = 'in_stock';
    }

    this.saveList(STORAGE_KEYS.INVENTORY_ITEMS, list);
    ApiSyncService.saveDocument('inventory_items', list[idx].id, list[idx]).catch(() => {});

    AuditService.log(
      'INVENTORY_STOCK_ADJUSTED',
      'inventory',
      `Stock adjusted for ${list[idx].itemName} from ${oldStock} to ${newStock} ${list[idx].unitOfMeasure}. Reason: ${reason} (by ${adjustedBy})`,
      list[idx].id,
      { oldStock, newStock, reason, adjustedBy },
      'warning'
    );

    return list[idx];
  }

  // ==========================================
  // DEPARTMENTAL ISSUE / REQUISITIONS
  // ==========================================

  public static getIssues(): InventoryIssueRecord[] {
    return this.loadList<InventoryIssueRecord>(STORAGE_KEYS.INVENTORY_ISSUES, []);
  }

  public static issueToDepartment(input: {
    itemId: string;
    quantityIssued: number;
    departmentIssuedTo: 'OT' | 'ICU' | 'Emergency' | 'Laboratory' | 'Radiology' | 'Wards' | 'OPD';
    requisitionedBy: string;
    issuedBy: string;
    remarks?: string;
  }): InventoryIssueRecord {
    const items = this.getInventoryItems();
    const itemIdx = items.findIndex(i => i.id === input.itemId);
    if (itemIdx === -1) throw new Error('Item not found in inventory');

    if (items[itemIdx].currentStock < input.quantityIssued) {
      throw new Error(`Insufficient stock. Current stock is ${items[itemIdx].currentStock} ${items[itemIdx].unitOfMeasure}`);
    }

    // Deduct stock
    items[itemIdx].currentStock -= input.quantityIssued;
    if (items[itemIdx].currentStock <= 0) {
      items[itemIdx].status = 'out_of_stock';
    } else if (items[itemIdx].currentStock <= items[itemIdx].minimumStockLevel) {
      items[itemIdx].status = 'low_stock';
    }
    this.saveList(STORAGE_KEYS.INVENTORY_ITEMS, items);

    // Record issue
    const issues = this.getIssues();
    const count = issues.length + 1;
    const year = new Date().getFullYear();
    const issueNumber = `ISSUE-${year}-${count.toString().padStart(5, '0')}`;

    const newIssue: InventoryIssueRecord = {
      id: `iss_${generateUuid().slice(0, 8)}`,
      issueNumber,
      itemId: items[itemIdx].id,
      itemName: items[itemIdx].itemName,
      category: items[itemIdx].category,
      quantityIssued: input.quantityIssued,
      unitOfMeasure: items[itemIdx].unitOfMeasure,
      departmentIssuedTo: input.departmentIssuedTo,
      requisitionedBy: input.requisitionedBy,
      issuedBy: input.issuedBy,
      issueDate: new Date().toISOString(),
      remarks: input.remarks
    };

    issues.unshift(newIssue);
    this.saveList(STORAGE_KEYS.INVENTORY_ISSUES, issues);
    ApiSyncService.saveDocument('inventory_issues', newIssue.id, newIssue).catch(() => {});

    AuditService.log(
      'INVENTORY_DEPARTMENT_ISSUE',
      'inventory',
      `Issued ${newIssue.quantityIssued} ${newIssue.unitOfMeasure} of ${newIssue.itemName} to [${newIssue.departmentIssuedTo}]. Remaining: ${items[itemIdx].currentStock}`,
      newIssue.id,
      { department: newIssue.departmentIssuedTo, qty: newIssue.quantityIssued }
    );

    return newIssue;
  }

  // ==========================================
  // SUPPLIERS MASTER
  // ==========================================

  public static getSuppliers(): HospitalSupplier[] {
    return this.loadList<HospitalSupplier>(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  }

  public static createSupplier(input: Omit<HospitalSupplier, 'id' | 'supplierCode' | 'totalPurchasesAmount'>): HospitalSupplier {
    const list = this.getSuppliers();
    const count = list.length + 1;
    const supplierCode = `SUP-${count.toString().padStart(3, '0')}`;

    const newSup: HospitalSupplier = {
      ...input,
      id: `sup_${generateUuid().slice(0, 8)}`,
      supplierCode,
      totalPurchasesAmount: 0
    };

    list.unshift(newSup);
    this.saveList(STORAGE_KEYS.SUPPLIERS, list);
    ApiSyncService.saveDocument('suppliers', newSup.id, newSup).catch(() => {});

    AuditService.log(
      'SUPPLIER_CREATED',
      'procurement',
      `Registered vendor/supplier [${newSup.supplierCode}] ${newSup.supplierName} (${newSup.category})`,
      newSup.id
    );

    return newSup;
  }

  public static updateSupplier(id: string, updates: Partial<HospitalSupplier>): HospitalSupplier {
    const list = this.getSuppliers();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Supplier not found');

    const updated: HospitalSupplier = { ...list[idx], ...updates };
    list[idx] = updated;
    this.saveList(STORAGE_KEYS.SUPPLIERS, list);
    ApiSyncService.saveDocument('suppliers', updated.id, updated).catch(() => {});

    AuditService.log(
      'SUPPLIER_UPDATED',
      'procurement',
      `Updated supplier record for ${updated.supplierName}`,
      updated.id
    );

    return updated;
  }

  // ==========================================
  // PURCHASE ORDERS (PO)
  // ==========================================

  public static getPurchaseOrders(): PurchaseOrder[] {
    return this.loadList<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS, []);
  }

  public static createPurchaseOrder(input: {
    supplierId: string;
    supplierName: string;
    expectedDeliveryDate: string;
    items: {
      itemId: string;
      itemName: string;
      itemCode: string;
      category: InventoryCategory;
      unitOfMeasure: string;
      orderQuantity: number;
      unitPrice: number;
    }[];
    taxPercent: number;
    paymentTerms: string;
    shippingAddress: string;
    notes?: string;
    createdBy: string;
  }): PurchaseOrder {
    const pos = this.getPurchaseOrders();
    const count = pos.length + 1;
    const year = new Date().getFullYear();
    const poNumber = `PO-${year}-${count.toString().padStart(5, '0')}`;

    const mappedItems = input.items.map(item => ({
      ...item,
      totalPrice: item.orderQuantity * item.unitPrice,
      receivedQuantity: 0
    }));

    const subtotal = mappedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = (subtotal * (input.taxPercent || 0)) / 100;
    const grandTotal = subtotal + taxAmount;

    const newPO: PurchaseOrder = {
      id: `po_${generateUuid().slice(0, 8)}`,
      poNumber,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: input.expectedDeliveryDate,
      items: mappedItems,
      subtotal,
      taxPercent: input.taxPercent || 0,
      taxAmount,
      grandTotal,
      status: 'ordered',
      paymentTerms: input.paymentTerms,
      shippingAddress: input.shippingAddress,
      notes: input.notes,
      createdBy: input.createdBy
    };

    pos.unshift(newPO);
    this.saveList(STORAGE_KEYS.PURCHASE_ORDERS, pos);
    ApiSyncService.saveDocument('purchase_orders', newPO.id, newPO).catch(() => {});

    AuditService.log(
      'PURCHASE_ORDER_GENERATED',
      'procurement',
      `Issued Purchase Order ${newPO.poNumber} to ${newPO.supplierName} for ₹${newPO.grandTotal.toLocaleString('en-IN')}`,
      newPO.id,
      { poNumber: newPO.poNumber, amount: newPO.grandTotal, itemsCount: newPO.items.length },
      'financial'
    );

    return newPO;
  }

  public static updatePoStatus(poId: string, status: PurchaseOrderStatus, notes?: string): PurchaseOrder {
    const pos = this.getPurchaseOrders();
    const idx = pos.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Purchase Order not found');

    pos[idx].status = status;
    if (notes) pos[idx].notes = `${pos[idx].notes ? pos[idx].notes + ' | ' : ''}${notes}`;

    this.saveList(STORAGE_KEYS.PURCHASE_ORDERS, pos);
    ApiSyncService.saveDocument('purchase_orders', pos[idx].id, pos[idx]).catch(() => {});

    AuditService.log(
      'PURCHASE_ORDER_STATUS_CHANGED',
      'procurement',
      `PO ${pos[idx].poNumber} marked as ${status.toUpperCase()}`,
      pos[idx].id
    );

    return pos[idx];
  }

  // ==========================================
  // GOODS RECEIVED NOTES (GRN) & RECEIVING
  // ==========================================

  public static getGrns(): GoodsReceivedNote[] {
    return this.loadList<GoodsReceivedNote>(STORAGE_KEYS.GOODS_RECEIVED_NOTES, []);
  }

  public static processGoodsReceived(input: {
    poId: string;
    poNumber: string;
    supplierName: string;
    receivedBy: string;
    vendorInvoiceNumber: string;
    vendorChallanNumber?: string;
    items: {
      itemId: string;
      itemName: string;
      orderedQty: number;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      batchNumber: string;
      expiryDate?: string;
      unitCost: number;
    }[];
    qcStatus: 'passed' | 'partial' | 'rejected';
    remarks?: string;
  }): GoodsReceivedNote {
    const grns = this.getGrns();
    const count = grns.length + 1;
    const year = new Date().getFullYear();
    const grnNumber = `GRN-${year}-${count.toString().padStart(5, '0')}`;

    const processedItems = input.items.map(item => ({
      ...item,
      totalCost: item.acceptedQty * item.unitCost
    }));

    const totalAcceptedAmount = processedItems.reduce((sum, item) => sum + item.totalCost, 0);

    const newGrn: GoodsReceivedNote = {
      id: `grn_${generateUuid().slice(0, 8)}`,
      grnNumber,
      poId: input.poId,
      poNumber: input.poNumber,
      supplierName: input.supplierName,
      receivedDate: new Date().toISOString(),
      receivedBy: input.receivedBy,
      vendorInvoiceNumber: input.vendorInvoiceNumber,
      vendorChallanNumber: input.vendorChallanNumber,
      items: processedItems,
      totalAcceptedAmount,
      qcStatus: input.qcStatus,
      remarks: input.remarks
    };

    // 1. Replenish inventory items with accepted quantities and batch details
    const inventoryItems = this.getInventoryItems();
    processedItems.forEach(recItem => {
      const itmIdx = inventoryItems.findIndex(i => i.id === recItem.itemId);
      if (itmIdx !== -1) {
        inventoryItems[itmIdx].currentStock += recItem.acceptedQty;
        inventoryItems[itmIdx].batchNumber = recItem.batchNumber;
        if (recItem.expiryDate) inventoryItems[itmIdx].expiryDate = recItem.expiryDate;
        inventoryItems[itmIdx].lastRestockedDate = new Date().toISOString().slice(0, 10);
        inventoryItems[itmIdx].unitPurchasePrice = recItem.unitCost;

        if (inventoryItems[itmIdx].currentStock <= 0) {
          inventoryItems[itmIdx].status = 'out_of_stock';
        } else if (inventoryItems[itmIdx].currentStock <= inventoryItems[itmIdx].minimumStockLevel) {
          inventoryItems[itmIdx].status = 'low_stock';
        } else {
          inventoryItems[itmIdx].status = 'in_stock';
        }
      }
    });
    this.saveList(STORAGE_KEYS.INVENTORY_ITEMS, inventoryItems);

    // 2. Update Purchase Order received quantities and status
    const pos = this.getPurchaseOrders();
    const poIdx = pos.findIndex(p => p.id === input.poId);
    if (poIdx !== -1) {
      let allFullyReceived = true;
      pos[poIdx].items.forEach(poItem => {
        const matchingRec = processedItems.find(r => r.itemId === poItem.itemId);
        if (matchingRec) {
          poItem.receivedQuantity = (poItem.receivedQuantity || 0) + matchingRec.acceptedQty;
        }
        if ((poItem.receivedQuantity || 0) < poItem.orderQuantity) {
          allFullyReceived = false;
        }
      });
      pos[poIdx].status = allFullyReceived ? 'received' : 'partially_received';
      this.saveList(STORAGE_KEYS.PURCHASE_ORDERS, pos);
    }

    // 3. Update Supplier purchase totals
    const suppliers = this.getSuppliers();
    const supIdx = suppliers.findIndex(s => s.supplierName === input.supplierName);
    if (supIdx !== -1) {
      suppliers[supIdx].totalPurchasesAmount = (suppliers[supIdx].totalPurchasesAmount || 0) + totalAcceptedAmount;
      this.saveList(STORAGE_KEYS.SUPPLIERS, suppliers);
    }

    // 4. Save GRN
    grns.unshift(newGrn);
    this.saveList(STORAGE_KEYS.GOODS_RECEIVED_NOTES, grns);
    ApiSyncService.saveDocument('goods_received_notes', newGrn.id, newGrn).catch(() => {});

    AuditService.log(
      'GOODS_RECEIVED_NOTE_VERIFIED',
      'procurement',
      `Goods Received Note ${newGrn.grnNumber} processed for PO ${newGrn.poNumber} (${newGrn.supplierName}) - Total Accepted: ₹${totalAcceptedAmount.toLocaleString('en-IN')}`,
      newGrn.id,
      { grnNumber: newGrn.grnNumber, invoice: newGrn.vendorInvoiceNumber, qc: newGrn.qcStatus },
      'security'
    );

    return newGrn;
  }

  // ==========================================
  // INVENTORY KPI & ANALYTICS
  // ==========================================

  public static getInventoryMetrics() {
    const items = this.getInventoryItems();
    const pos = this.getPurchaseOrders();
    const suppliers = this.getSuppliers();

    const totalStockValue = items.reduce((sum, i) => sum + i.currentStock * i.unitPurchasePrice, 0);
    const lowStockCount = items.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock').length;
    const pendingPoCount = pos.filter(p => p.status === 'ordered' || p.status === 'partially_received').length;

    return {
      totalItems: items.length,
      totalStockValue,
      lowStockCount,
      totalSuppliers: suppliers.length,
      pendingPoCount
    };
  }
}
