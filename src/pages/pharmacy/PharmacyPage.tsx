import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PortalService, MedicineOrder } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import {
  PharmacyService,
  PharmacyInventoryItem,
  StockMovement,
  PharmacyDashboardMetrics
} from '../../services/pharmacyService';
import {
  MedicineMasterItem,
  MedicineBatchItem,
  PharmacySupplier,
  PharmacyPurchase,
  PharmacySale,
  PharmacySalesReturn,
  PharmacyPurchaseReturn,
  PharmacyStockAdjustment,
  PharmacyTransaction,
  Patient,
  HealthCard,
  Membership,
  Wallet
} from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { DirectMedicineOrderModal } from '../../components/portal/DirectMedicineOrderModal';
import { PharmacyBillPrintModal } from '../../components/pharmacy/PharmacyBillPrintModal';
import {
  Pill,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  Truck,
  Package,
  FileText,
  DollarSign,
  AlertCircle,
  Eye,
  Building2,
  ShoppingCart,
  Trash2,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Calendar,
  Tag,
  Boxes,
  UserCheck,
  CreditCard,
  ShieldCheck,
  RotateCcw,
  BarChart3,
  SlidersHorizontal,
  Stethoscope,
  Building,
  Check,
  X,
  History,
  QrCode,
  TrendingUp,
  Percent
} from 'lucide-react';

type PharmacyHubTab =
  | 'dashboard'
  | 'pos'
  | 'medicines'
  | 'batches'
  | 'prescriptions'
  | 'purchases'
  | 'suppliers'
  | 'ledger'
  | 'orders';

interface POSCartLine {
  medicine: MedicineMasterItem;
  batch: MedicineBatchItem;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export const PharmacyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<PharmacyHubTab>('dashboard');

  // Core Data
  const [medicines, setMedicines] = useState<MedicineMasterItem[]>(() => PharmacyService.getMedicines());
  const [batches, setBatches] = useState<MedicineBatchItem[]>(() => PharmacyService.getBatches());
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>(() => PharmacyService.getSuppliers());
  const [purchases, setPurchases] = useState<PharmacyPurchase[]>(() => PharmacyService.getPurchases());
  const [sales, setSales] = useState<PharmacySale[]>(() => PharmacyService.getSales());
  const [salesReturns, setSalesReturns] = useState<PharmacySalesReturn[]>(() => PharmacyService.getSalesReturns());
  const [purchaseReturns, setPurchaseReturns] = useState<PharmacyPurchaseReturn[]>(() => PharmacyService.getPurchaseReturns());
  const [adjustments, setAdjustments] = useState<PharmacyStockAdjustment[]>(() => PharmacyService.getStockAdjustments());
  const [transactions, setTransactions] = useState<PharmacyTransaction[]>(() => PharmacyService.getPharmacyTransactions());
  const [movements, setMovements] = useState<StockMovement[]>(() => PharmacyService.getStockMovements());
  const [orders, setOrders] = useState<MedicineOrder[]>(() => PortalService.getPharmacyOrders());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getMemberships());
  const [wallets, setWallets] = useState<Wallet[]>(() => StorageService.getWallets());

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Metrics
  const metrics = useMemo<PharmacyDashboardMetrics>(() => {
    return PharmacyService.getDashboardMetrics();
  }, [medicines, batches, sales, purchases, salesReturns]);

  // Doctor Prescriptions
  const doctorPrescriptions = useMemo(() => {
    return PharmacyService.getDoctorPrescriptions();
  }, [activeTab]);

  // =========================================================================
  // POS STATE & ACTIONS
  // =========================================================================
  const [posMode, setPosMode] = useState<'walkin' | 'patient'>('walkin');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [prescribingDocName, setPrescribingDocName] = useState('');
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('all');
  const [posCart, setPosCart] = useState<POSCartLine[]>([]);
  const [posPaymentMode, setPosPaymentMode] = useState<'Cash' | 'Card' | 'UPI' | 'Health Wallet'>('Cash');
  const [posPaidAmountInput, setPosPaidAmountInput] = useState<string>('');
  const [isDispensing, setIsDispensing] = useState(false);
  const [printedSale, setPrintedSale] = useState<PharmacySale | null>(null);

  // Patient / Health Card Resolver
  const selectedPatientObj = useMemo(() => {
    if (posMode === 'walkin' || !selectedPatientId) return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [posMode, selectedPatientId, patients]);

  const activePatientCard = useMemo(() => {
    if (!selectedPatientObj) return null;
    return cards.find(c => c.patientId === selectedPatientObj.id && c.status === 'active') || null;
  }, [selectedPatientObj, cards]);

  const patientMembership = useMemo(() => {
    if (!activePatientCard) return null;
    return (
      memberships.find(
        m =>
          m.id === activePatientCard.membershipId ||
          m.name.toLowerCase() === (activePatientCard.tier || '').toLowerCase() ||
          (activePatientCard as any).membershipTier === m.name
      ) || null
    );
  }, [activePatientCard, memberships]);

  // Default Health Card pharmacy discount % (e.g. 10% - 20%)
  const defaultHealthCardDiscount = useMemo(() => {
    if (patientMembership && patientMembership.pharmacyDiscount) {
      return patientMembership.pharmacyDiscount;
    }
    if (activePatientCard) return 15; // default 15% for active cardholder
    return 0;
  }, [patientMembership, activePatientCard]);

  // Add Medicine to POS Cart (Auto FEFO)
  const handleAddToCart = (med: MedicineMasterItem, specificBatch?: MedicineBatchItem) => {
    // Find candidate batch
    let batchToUse = specificBatch;
    if (!batchToUse) {
      const candidates = PharmacyService.getFefoRecommendedBatches(med.id);
      if (candidates.length === 0) {
        showToast('error', 'Zero Available Stock', `No unexpired active batches available for "${med.name}".`);
        return;
      }
      batchToUse = candidates[0];
    }

    if (batchToUse.availableQty <= 0) {
      showToast('error', 'Out of Stock', `Batch ${batchToUse.batchNumber} has 0 available units.`);
      return;
    }

    setPosCart(prev => {
      const existing = prev.find(line => line.medicine.id === med.id && line.batch.id === batchToUse!.id);
      if (existing) {
        if (existing.quantity >= batchToUse!.availableQty) {
          showToast('warning', 'Batch Stock Limit', `Only ${batchToUse!.availableQty} units available in Batch ${batchToUse!.batchNumber}.`);
          return prev;
        }
        return prev.map(line =>
          line.medicine.id === med.id && line.batch.id === batchToUse!.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...prev,
        {
          medicine: med,
          batch: batchToUse!,
          quantity: 1,
          unitPrice: batchToUse!.sellingPrice || med.sellingPrice,
          discountPercent: defaultHealthCardDiscount
        }
      ];
    });
  };

  const handleUpdateCartQty = (batchId: string, qty: number) => {
    if (qty <= 0) {
      setPosCart(prev => prev.filter(line => line.batch.id !== batchId));
      return;
    }
    setPosCart(prev =>
      prev.map(line => {
        if (line.batch.id === batchId) {
          if (qty > line.batch.availableQty) {
            showToast('warning', 'Stock Limit', `Cannot exceed batch available quantity (${line.batch.availableQty}).`);
            return line;
          }
          return { ...line, quantity: qty };
        }
        return line;
      })
    );
  };

  const handleUpdateCartDiscount = (batchId: string, disc: number) => {
    const clamped = Math.max(0, Math.min(100, disc));
    setPosCart(prev =>
      prev.map(line => (line.batch.id === batchId ? { ...line, discountPercent: clamped } : line))
    );
  };

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return posCart.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0);
  }, [posCart]);

  const cartDiscount = useMemo(() => {
    return posCart.reduce((acc, line) => {
      return acc + (line.unitPrice * line.quantity * line.discountPercent) / 100;
    }, 0);
  }, [posCart]);

  const cartNetTotal = useMemo(() => {
    return Math.max(0, Math.round((cartSubtotal - cartDiscount) * 100) / 100);
  }, [cartSubtotal, cartDiscount]);

  const posPaidAmount = useMemo(() => {
    if (posPaidAmountInput === '') return cartNetTotal;
    const val = parseFloat(posPaidAmountInput);
    return isNaN(val) ? 0 : val;
  }, [posPaidAmountInput, cartNetTotal]);

  const posDueAmount = useMemo(() => {
    return Math.max(0, Math.round((cartNetTotal - posPaidAmount) * 100) / 100);
  }, [cartNetTotal, posPaidAmount]);

  // Dispense & Bill Execution
  const handleExecuteDispense = async () => {
    if (posCart.length === 0) {
      showToast('error', 'Cart Empty', 'Please select at least one medicine before dispensing.');
      return;
    }

    const patientName = selectedPatientObj
      ? selectedPatientObj.fullName
      : walkinName.trim() || 'Walk-in Customer';
    const patientPhone = selectedPatientObj ? selectedPatientObj.mobile : walkinPhone.trim() || undefined;

    setIsDispensing(true);
    try {
      const result = await PharmacyService.dispenseSale({
        patientId: selectedPatientObj ? selectedPatientObj.id : undefined,
        patientName,
        patientPhone,
        doctorName: prescribingDocName.trim() || undefined,
        cardNo: activePatientCard ? activePatientCard.cardNumber : undefined,
        saleType: selectedPatientObj ? 'patient_linked' : 'walkin',
        paymentMode: posPaymentMode,
        paidAmount: posPaidAmount,
        notes: `Counter POS Dispensed: ${posCart.length} item(s)`,
        performedBy: currentUser?.fullName || 'Clinical Pharmacist',
        items: posCart.map(line => ({
          medicineId: line.medicine.id,
          batchId: line.batch.id,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent
        }))
      });

      // Update state
      setSales(PharmacyService.getSales());
      setBatches(PharmacyService.getBatches());
      setMedicines(PharmacyService.getMedicines());
      setTransactions(PharmacyService.getPharmacyTransactions());
      setMovements(PharmacyService.getStockMovements());

      // Open print receipt
      setPrintedSale(result.sale);

      // Reset cart
      setPosCart([]);
      setPosPaidAmountInput('');
      setWalkinName('');
      setWalkinPhone('');
      setPrescribingDocName('');

      showToast('success', 'Sale Dispensed', `Tax Invoice #${result.sale.invoiceNumber} generated.`);
    } catch (err: any) {
      showToast('error', 'Dispense Failed', err?.message || 'Could not complete dispensing.');
    } finally {
      setIsDispensing(false);
    }
  };

  // 1-Click Load Doctor Prescription into POS Cart
  const handleLoadPrescriptionIntoPOS = (prescription: (typeof doctorPrescriptions)[0]) => {
    // Switch to POS
    setActiveTab('pos');
    setPosMode('patient');
    setSelectedPatientId(prescription.patientId);
    setPrescribingDocName(prescription.doctorName);

    // Auto-match prescribed medicines with master
    const medsMaster = PharmacyService.getMedicines();
    const newCart: POSCartLine[] = [];

    for (const rxMed of prescription.medications) {
      const normalizedRxName = rxMed.name.toLowerCase();
      const matched = medsMaster.find(
        m => m.name.toLowerCase().includes(normalizedRxName) ||
             (m.genericName && m.genericName.toLowerCase().includes(normalizedRxName))
      );

      if (matched) {
        const fefoBatches = PharmacyService.getFefoRecommendedBatches(matched.id);
        if (fefoBatches.length > 0) {
          newCart.push({
            medicine: matched,
            batch: fefoBatches[0],
            quantity: 1,
            unitPrice: fefoBatches[0].sellingPrice || matched.sellingPrice,
            discountPercent: defaultHealthCardDiscount
          });
        }
      }
    }

    if (newCart.length > 0) {
      setPosCart(newCart);
      showToast('success', 'Prescription Loaded', `Loaded ${newCart.length} medicine(s) from Dr. ${prescription.doctorName}'s Rx.`);
    } else {
      showToast('info', 'Prescription Opened', `Patient & Doctor set. Search medicines to dispense for Dr. ${prescription.doctorName}.`);
    }
  };

  // =========================================================================
  // MEDICINE MASTER MODALS & FORMS
  // =========================================================================
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicineMasterItem | null>(null);
  const [medFormData, setMedFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    genericName: '',
    brandName: '',
    manufacturer: '',
    category: 'Cardiovascular & Hypertension',
    dosageForm: 'Tablet',
    strength: '',
    packSize: '10 Tablets / Strip',
    unit: 'Tablets',
    hsnSac: '30049099',
    taxGstRate: 12,
    mrp: 100,
    purchasePrice: 65,
    sellingPrice: 100,
    reorderLevel: 25,
    minStock: 15,
    maxStock: 250,
    prescriptionRequired: true,
    rackLocation: 'Rack A-1',
    description: ''
  });

  const handleOpenAddMedModal = () => {
    setEditingMed(null);
    setMedFormData({
      code: `MED-${String(medicines.length + 1).padStart(3, '0')}`,
      barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: '',
      genericName: '',
      brandName: '',
      manufacturer: '',
      category: 'Cardiovascular & Hypertension',
      dosageForm: 'Tablet',
      strength: '',
      packSize: '10 Tablets / Strip',
      unit: 'Tablets',
      hsnSac: '30049099',
      taxGstRate: 12,
      mrp: 100,
      purchasePrice: 65,
      sellingPrice: 100,
      reorderLevel: 25,
      minStock: 15,
      maxStock: 250,
      prescriptionRequired: true,
      rackLocation: 'Rack A-1',
      description: ''
    });
    setIsMedModalOpen(true);
  };

  const handleOpenEditMedModal = (med: MedicineMasterItem) => {
    setEditingMed(med);
    setMedFormData({
      code: med.code,
      barcode: med.barcode,
      name: med.name,
      genericName: med.genericName,
      brandName: med.brandName,
      manufacturer: med.manufacturer,
      category: med.category,
      dosageForm: med.dosageForm,
      strength: med.strength,
      packSize: med.packSize,
      unit: med.unit,
      hsnSac: med.hsnSac || '30049099',
      taxGstRate: med.taxGstRate,
      mrp: med.mrp,
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      reorderLevel: med.reorderLevel,
      minStock: med.minStock,
      maxStock: med.maxStock,
      prescriptionRequired: med.prescriptionRequired,
      rackLocation: med.rackLocation || 'Rack A-1',
      description: med.description || ''
    });
    setIsMedModalOpen(true);
  };

  const handleSaveMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medFormData.name.trim()) {
      showToast('error', 'Medicine Name Required', 'Please enter a brand/medicine name.');
      return;
    }
    if (medFormData.sellingPrice <= 0) {
      showToast('error', 'Invalid Price', 'Selling price (MRP) must be greater than zero.');
      return;
    }

    try {
      await PharmacyService.saveMedicine({
        id: editingMed ? editingMed.id : undefined,
        ...medFormData
      });
      setMedicines(PharmacyService.getMedicines());
      setIsMedModalOpen(false);
      setEditingMed(null);
      showToast('success', 'Medicine Master Updated', `"${medFormData.name}" successfully saved.`);
    } catch (err: any) {
      showToast('error', 'Save Failed', err?.message || 'Could not save medicine.');
    }
  };

  // =========================================================================
  // PURCHASES (INWARD GOODS) MODAL & FORM
  // =========================================================================
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState('');
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{
      medicineId: string;
      batchNumber: string;
      mfgDate: string;
      expiryDate: string;
      quantity: number;
      freeQuantity: number;
      purchaseRate: number;
      mrp: number;
      taxGstPercent: number;
    }>
  >([]);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('Bank Transfer');
  const [purchasePaidAmountInput, setPurchasePaidAmountInput] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  const handleAddPurchaseLine = () => {
    const defaultMed = medicines[0];
    setPurchaseItems(prev => [
      ...prev,
      {
        medicineId: defaultMed ? defaultMed.id : '',
        batchNumber: `BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        mfgDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        quantity: 50,
        freeQuantity: 0,
        purchaseRate: defaultMed ? defaultMed.purchasePrice : 50,
        mrp: defaultMed ? defaultMed.mrp : 80,
        taxGstPercent: defaultMed ? defaultMed.taxGstRate : 12
      }
    ]);
  };

  const handleSavePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseSupplierId) {
      showToast('error', 'Supplier Required', 'Please select a registered supplier.');
      return;
    }
    if (!purchaseInvoiceNo.trim()) {
      showToast('error', 'Invoice Number Required', 'Please enter supplier purchase invoice number.');
      return;
    }
    if (purchaseItems.length === 0) {
      showToast('error', 'No Line Items', 'Please add at least one medicine item to the purchase.');
      return;
    }

    setIsSubmittingPurchase(true);
    try {
      const paidVal = purchasePaidAmountInput !== '' ? parseFloat(purchasePaidAmountInput) : undefined;

      const result = await PharmacyService.recordPurchase({
        purchaseInvoiceNo: purchaseInvoiceNo.trim(),
        supplierId: purchaseSupplierId,
        invoiceDate: purchaseInvoiceDate,
        items: purchaseItems,
        paidAmount: paidVal,
        paymentMethod: purchasePaymentMethod,
        performedBy: currentUser?.fullName || 'Pharmacy Store Manager'
      });

      setPurchases(PharmacyService.getPurchases());
      setBatches(PharmacyService.getBatches());
      setSuppliers(PharmacyService.getSuppliers());
      setTransactions(PharmacyService.getPharmacyTransactions());
      setMovements(PharmacyService.getStockMovements());

      setIsPurchaseModalOpen(false);
      setPurchaseItems([]);
      setPurchaseInvoiceNo('');
      setPurchasePaidAmountInput('');

      showToast('success', 'Purchase Recorded', `Inward bill ${result.purchase.purchaseInvoiceNo} recorded with ${result.batchesCreated.length} batch(es).`);
    } catch (err: any) {
      showToast('error', 'Purchase Failed', err?.message || 'Could not record purchase.');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  // =========================================================================
  // SUPPLIERS MODAL & FORM
  // =========================================================================
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    drugLicenseNo: '',
    paymentTerms: 'Net 30 Days'
  });

  const handleSaveSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name.trim() || !supplierFormData.phone.trim()) {
      showToast('error', 'Required Fields', 'Supplier name and phone are required.');
      return;
    }

    try {
      await PharmacyService.saveSupplier(supplierFormData);
      setSuppliers(PharmacyService.getSuppliers());
      setIsSupplierModalOpen(false);
      setSupplierFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstNumber: '',
        drugLicenseNo: '',
        paymentTerms: 'Net 30 Days'
      });
      showToast('success', 'Supplier Saved', `Supplier "${supplierFormData.name}" added to master.`);
    } catch (err: any) {
      showToast('error', 'Supplier Save Failed', err?.message || 'Could not save supplier.');
    }
  };

  // =========================================================================
  // STOCK ADJUSTMENT & RETURNS MODAL
  // =========================================================================
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustBatchId, setAdjustBatchId] = useState('');
  const [adjustType, setAdjustType] = useState<PharmacyStockAdjustment['adjustmentType']>('audit_reconciliation');
  const [adjustQtyDiff, setAdjustQtyDiff] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const handleSaveAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustBatchId) {
      showToast('error', 'Select Batch', 'Please choose a medicine batch to adjust.');
      return;
    }
    if (adjustQtyDiff === 0) {
      showToast('error', 'Invalid Quantity', 'Adjustment quantity cannot be 0.');
      return;
    }
    if (!adjustReason.trim()) {
      showToast('error', 'Reason Required', 'Mandatory auditable reason must be provided.');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const b = batches.find(b => b.id === adjustBatchId);
      if (!b) throw new Error('Batch not found.');

      await PharmacyService.recordStockAdjustment({
        medicineId: b.medicineId,
        batchId: b.id,
        adjustmentType: adjustType,
        adjustedQty: adjustQtyDiff,
        reason: adjustReason.trim(),
        performedBy: currentUser?.fullName || 'Pharmacy Auditor'
      });

      setBatches(PharmacyService.getBatches());
      setAdjustments(PharmacyService.getStockAdjustments());
      setTransactions(PharmacyService.getPharmacyTransactions());
      setMovements(PharmacyService.getStockMovements());

      setIsAdjustModalOpen(false);
      setAdjustReason('');
      setAdjustQtyDiff(0);
      showToast('success', 'Stock Adjusted', 'Adjustment recorded in audit trail and stock updated.');
    } catch (err: any) {
      showToast('error', 'Adjustment Failed', err?.message || 'Could not perform adjustment.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Central Sync Handler
  const handleCentralSync = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      setMedicines(PharmacyService.getMedicines());
      setBatches(PharmacyService.getBatches());
      setSuppliers(PharmacyService.getSuppliers());
      setPurchases(PharmacyService.getPurchases());
      setSales(PharmacyService.getSales());
      setTransactions(PharmacyService.getPharmacyTransactions());
      setMovements(PharmacyService.getStockMovements());
      setOrders(PortalService.getPharmacyOrders());
      setPatients(StorageService.getPatients());
      showToast('success', 'Multi-Device Sync Complete', 'Central pharmacy master, batches, ledger and sales synchronized.');
    } catch {
      showToast('info', 'Local Cache Updated', 'Synchronized from local database.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time Firestore synchronization listener
  useEffect(() => {
    const unsubMeds = ApiSyncService.subscribeToCollection<MedicineMasterItem>('pharmacyMedicines', (items) => {
      if (items && items.length > 0) setMedicines(items);
    });
    const unsubBatches = ApiSyncService.subscribeToCollection<MedicineBatchItem>('pharmacyBatches', (items) => {
      if (items && items.length > 0) setBatches(items);
    });
    const unsubSales = ApiSyncService.subscribeToCollection<PharmacySale>('pharmacySales', (items) => {
      if (items && items.length > 0) setSales(items);
    });

    const handleDataSynced = (e: CustomEvent) => {
      setMedicines(PharmacyService.getMedicines());
      setBatches(PharmacyService.getBatches());
      setSales(PharmacyService.getSales());
      setTransactions(PharmacyService.getPharmacyTransactions());
    };
    window.addEventListener('labmedix_data_synced', handleDataSynced as EventListener);

    return () => {
      unsubMeds();
      unsubBatches();
      unsubSales();
      window.removeEventListener('labmedix_data_synced', handleDataSynced as EventListener);
    };
  }, []);

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOP HERO BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border border-emerald-500/30 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/40">
              <Pill className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Pharmacy Management Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Hospital-Grade • Standalone
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Batch-wise inventory, FEFO expiry control, Doctor EMR prescription fulfillment, Health Card tier discounts, and live ledger sync.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCentralSync}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pos');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS Counter</span>
          </button>

          <button
            onClick={() => {
              setIsPurchaseModalOpen(true);
              if (purchaseItems.length === 0) handleAddPurchaseLine();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold border border-teal-500/30 transition"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Inward Purchase</span>
          </button>

          <button
            onClick={handleOpenAddMedModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'pos', label: 'POS & Dispensing', icon: ShoppingCart, badge: posCart.length > 0 ? posCart.length : undefined },
          { id: 'medicines', label: 'Medicine Master', icon: Pill, count: medicines.length },
          { id: 'batches', label: 'Batch Stock & FEFO', icon: Boxes, count: batches.length },
          { id: 'prescriptions', label: 'Doctor Prescriptions', icon: Stethoscope, badge: doctorPrescriptions.length > 0 ? doctorPrescriptions.length : undefined },
          { id: 'purchases', label: 'Purchases & Inward', icon: ArrowDownCircle, count: purchases.length },
          { id: 'suppliers', label: 'Suppliers Master', icon: Building2, count: suppliers.length },
          { id: 'ledger', label: 'Ledger & Audit', icon: Layers, count: transactions.length },
          { id: 'orders', label: 'Online Orders', icon: Truck, count: orders.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PharmacyHubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-emerald-700 font-black animate-pulse">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.badge === undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: PHARMACY DASHBOARD
          ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Today's Sales */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Today's Sales</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrency(metrics.todaySalesAmount)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>{metrics.todaySalesCount} invoices billed</span>
                <span className="text-emerald-400 font-mono font-bold">
                  Cash: {formatCurrency(metrics.cashCollectedToday)}
                </span>
              </div>
            </div>

            {/* 2. Total Stock Valuation */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Total Inventory Value</span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Boxes className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrency(metrics.stockValuationMrp)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Purchase Cost: {formatCurrency(metrics.stockValuationPurchase)}</span>
                <span className="font-mono text-slate-300 font-bold">{metrics.totalStockUnits} units</span>
              </div>
            </div>

            {/* 3. Low Stock & Out of Stock */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Stock Alerts</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {metrics.lowStockCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">Low Stock</span>
                <span className="text-slate-600 font-mono">•</span>
                <span className="text-2xl font-black text-rose-400 font-mono">
                  {metrics.outOfStockCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">Out of Stock</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Total SKUs: {metrics.totalMedicinesCount}</span>
                <button
                  onClick={() => setActiveTab('medicines')}
                  className="text-amber-400 hover:underline font-bold"
                >
                  View Items →
                </button>
              </div>
            </div>

            {/* 4. Expiry Forecast Alerts */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>FEFO Expiry Warnings</span>
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-rose-950/60 text-rose-300 border border-rose-500/30">
                  {metrics.expiredBatchesCount} Expired
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-amber-950/60 text-amber-300 border border-amber-500/30">
                  {metrics.nearExpiry30DaysCount} &lt;30d
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-blue-950/60 text-blue-300 border border-blue-500/30">
                  {metrics.nearExpiry60DaysCount} &lt;60d
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>&lt;90d: {metrics.nearExpiry90DaysCount} batches</span>
                <button
                  onClick={() => setActiveTab('batches')}
                  className="text-rose-400 hover:underline font-bold"
                >
                  Audit Batches →
                </button>
              </div>
            </div>
          </div>

          {/* Quick Operations Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab('pos')}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 transition flex items-center gap-3 text-left group"
            >
              <span className="p-3 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-white block">New POS Sale</strong>
                <span className="text-[10px] text-slate-400">Walk-in or Cardholder</span>
              </div>
            </button>

            <button
              onClick={() => {
                setIsPurchaseModalOpen(true);
                if (purchaseItems.length === 0) handleAddPurchaseLine();
              }}
              className="p-4 rounded-2xl bg-gradient-to-br from-teal-900/40 to-slate-900 border border-teal-500/30 hover:border-teal-500/60 transition flex items-center gap-3 text-left group"
            >
              <span className="p-3 rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/30 group-hover:scale-105 transition">
                <ArrowDownCircle className="w-5 h-5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-white block">Inward Purchase</strong>
                <span className="text-[10px] text-slate-400">Receive supplier stock</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('prescriptions')}
              className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-500/30 hover:border-cyan-500/60 transition flex items-center gap-3 text-left group"
            >
              <span className="p-3 rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/30 group-hover:scale-105 transition">
                <Stethoscope className="w-5 h-5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-white block">Doctor Prescriptions</strong>
                <span className="text-[10px] text-slate-400">{doctorPrescriptions.length} pending EMR Rx</span>
              </div>
            </button>

            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 hover:border-amber-500/60 transition flex items-center gap-3 text-left group"
            >
              <span className="p-3 rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/30 group-hover:scale-105 transition">
                <SlidersHorizontal className="w-5 h-5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-white block">Stock Adjustment</strong>
                <span className="text-[10px] text-slate-400">Audited reconciliation</span>
              </div>
            </button>
          </div>

          {/* Dual Columns: Recent Sales & Live Expiry Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Sales (7 Cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <History className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Recent Dispensing Invoices</h3>
                    <p className="text-[10px] text-slate-400">Real-time point of sale transactions</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className="text-xs text-emerald-400 hover:underline font-bold"
                >
                  Full Ledger →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Invoice #</th>
                      <th className="px-3 py-2.5">Patient / Customer</th>
                      <th className="px-3 py-2.5">Items</th>
                      <th className="px-3 py-2.5">Amount</th>
                      <th className="px-3 py-2.5">Payment</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sales.slice(0, 5).map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-white">
                          {sale.invoiceNumber}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-white">{sale.patientName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {sale.patientCardNo ? `Card: ${sale.patientCardNo}` : 'Walk-in'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                            {sale.items.length} item(s)
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-emerald-400">
                          {formatCurrency(sale.netTotal)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-800 text-slate-300">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => setPrintedSale(sale)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white transition"
                            title="Print Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Near Expiry Batches Notice (5 Cols) */}
            <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Critical FEFO Expiry Track</h3>
                    <p className="text-[10px] text-slate-400">Batches requiring prompt clearance</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('batches')}
                  className="text-xs text-rose-400 hover:underline font-bold"
                >
                  Manage →
                </button>
              </div>

              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {batches
                  .filter(b => b.availableQty > 0)
                  .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
                  .slice(0, 4)
                  .map(batch => {
                    const today = new Date().toISOString().split('T')[0];
                    const isExpired = batch.expiryDate < today;
                    return (
                      <div
                        key={batch.id}
                        className={`p-3 rounded-2xl border transition ${
                          isExpired
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : 'bg-amber-950/20 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <strong className="text-xs text-white block">{batch.medicineName}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Batch: {batch.batchNumber} • Stock: {batch.availableQty} units
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              isExpired
                                ? 'bg-rose-900 text-rose-200'
                                : 'bg-amber-900 text-amber-200'
                            }`}
                          >
                            {isExpired ? 'EXPIRED' : `Exp: ${batch.expiryDate}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: MEDICINE MASTER
          ===================================================================== */}
      {activeTab === 'medicines' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={posSearchTerm}
                onChange={e => setPosSearchTerm(e.target.value)}
                placeholder="Search by Medicine Name, Generic Composition, Brand, Barcode, HSN..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddMedModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-emerald-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Code & Product</th>
                    <th className="px-4 py-3">Generic & Manufacturer</th>
                    <th className="px-4 py-3">Category & Form</th>
                    <th className="px-4 py-3">HSN & GST</th>
                    <th className="px-4 py-3 text-right">Purchase Price</th>
                    <th className="px-4 py-3 text-right">MRP / Selling</th>
                    <th className="px-4 py-3 text-center">Active Stock</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {medicines
                    .filter(m => {
                      if (!posSearchTerm.trim()) return true;
                      const q = posSearchTerm.toLowerCase().trim();
                      return (
                        m.name.toLowerCase().includes(q) ||
                        m.genericName.toLowerCase().includes(q) ||
                        m.brandName.toLowerCase().includes(q) ||
                        m.code.toLowerCase().includes(q) ||
                        (m.barcode && m.barcode.includes(q))
                      );
                    })
                    .map(med => {
                      const medBatches = batches.filter(b => b.medicineId === med.id);
                      const totalAvailable = medBatches.reduce((acc, b) => acc + b.availableQty, 0);

                      return (
                        <tr key={med.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-white text-sm">{med.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {med.code} • Barcode: {med.barcode || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-200">{med.genericName}</div>
                            <div className="text-[10px] text-slate-500">{med.manufacturer}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                              {med.category}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">{med.dosageForm} • {med.strength}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px]">
                            <div>HSN: {med.hsnSac || '3004'}</div>
                            <div className="text-emerald-400">GST: {med.taxGstRate}%</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">
                            {formatCurrency(med.purchasePrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-white">
                            {formatCurrency(med.sellingPrice)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                                totalAvailable === 0
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                  : totalAvailable <= med.minStock
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {totalAvailable} {med.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenEditMedModal(med)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs transition"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: BATCH-WISE INVENTORY & FEFO CONTROL
          ===================================================================== */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Boxes className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Batch-Wise Inventory & FEFO Priority Engine</h2>
                <p className="text-[10px] text-slate-400">
                  Every batch is traced to its supplier, manufacturing date, and expiry. Earliest expiring batch is prioritized automatically.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-600/30"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Record Stock Adjustment</span>
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Batch #</th>
                    <th className="px-4 py-3">Medicine Name</th>
                    <th className="px-4 py-3">Mfg Date</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">FEFO Status</th>
                    <th className="px-4 py-3">Supplier & Invoice</th>
                    <th className="px-4 py-3 text-right">Cost / MRP</th>
                    <th className="px-4 py-3 text-center">Available Stock</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {batches.map(batch => {
                    const today = new Date().toISOString().split('T')[0];
                    const isExpired = batch.expiryDate < today;
                    const diffDays = Math.round(
                      (new Date(batch.expiryDate).getTime() - new Date().getTime()) / 86400000
                    );

                    return (
                      <tr key={batch.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-bold text-white font-mono">
                          {batch.batchNumber}
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <div className="font-bold text-white">{batch.medicineName}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {batch.mfgDate || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          <span
                            className={
                              isExpired
                                ? 'text-rose-400'
                                : diffDays <= 30
                                ? 'text-orange-400'
                                : diffDays <= 60
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {batch.expiryDate}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isExpired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-950 text-rose-300 border border-rose-500/30">
                              EXPIRED • DO NOT DISPENSE
                            </span>
                          ) : diffDays <= 30 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-orange-950 text-orange-300 border border-orange-500/30 animate-pulse">
                              Expiring &lt;30d (1st FEFO)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              FEFO Eligible
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-400 text-[11px]">
                          <div>{batch.supplierName}</div>
                          <div className="font-mono text-[9px] text-slate-500">{batch.invoiceNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-slate-400">{formatCurrency(batch.purchasePrice)}</div>
                          <div className="text-white font-bold">{formatCurrency(batch.mrp)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-white font-black text-xs">
                            {batch.availableQty} units
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              batch.status === 'active'
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {batch.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: POS & DISPENSING COUNTER
          ===================================================================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Medicine & FEFO Selector */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Medicines for Counter Dispensing
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  ✓ FEFO Batch Auto-Allocated
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={posSearchTerm}
                  onChange={e => setPosSearchTerm(e.target.value)}
                  placeholder="Scan barcode or search medicine by name, generic composition, or brand..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Medicine Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {medicines
                  .filter(m => {
                    if (!posSearchTerm.trim()) return true;
                    const q = posSearchTerm.toLowerCase();
                    return (
                      m.name.toLowerCase().includes(q) ||
                      m.genericName.toLowerCase().includes(q) ||
                      m.brandName.toLowerCase().includes(q) ||
                      m.code.toLowerCase().includes(q) ||
                      (m.barcode && m.barcode.includes(q))
                    );
                  })
                  .map(med => {
                    const fefoBatches = PharmacyService.getFefoRecommendedBatches(med.id);
                    const totalAvailable = batches
                      .filter(b => b.medicineId === med.id)
                      .reduce((acc, b) => acc + b.availableQty, 0);

                    const recommendedBatch = fefoBatches[0];
                    const isOutOfStock = totalAvailable <= 0;

                    return (
                      <div
                        key={med.id}
                        className={`p-3 rounded-2xl border transition flex flex-col justify-between ${
                          isOutOfStock
                            ? 'bg-slate-900/50 border-slate-800 opacity-60'
                            : 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-xs text-white block">{med.name}</strong>
                              <span className="text-[10px] text-slate-400 block">{med.genericName}</span>
                            </div>
                            <span className="font-mono text-xs font-black text-emerald-400">
                              {formatCurrency(med.sellingPrice)}
                            </span>
                          </div>

                          {recommendedBatch ? (
                            <div className="text-[10px] font-mono text-slate-400 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 flex justify-between items-center">
                              <span>FEFO: {recommendedBatch.batchNumber}</span>
                              <span className="text-emerald-400 font-bold">Exp: {recommendedBatch.expiryDate}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-rose-400 bg-rose-950/20 p-1.5 rounded-lg border border-rose-500/20">
                              No unexpired batches available
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-700/60 text-[11px]">
                          <span className="font-mono text-slate-400">
                            Available: <strong className="text-white">{totalAvailable}</strong>
                          </span>

                          <button
                            onClick={() => handleAddToCart(med)}
                            disabled={isOutOfStock || !recommendedBatch}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Patient Link, Health Card & Cart Checkout */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              {/* Customer Selector Mode */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPosMode('walkin')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    posMode === 'walkin'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Walk-in Customer
                </button>
                <button
                  type="button"
                  onClick={() => setPosMode('patient')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    posMode === 'patient'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hospital Patient / Card
                </button>
              </div>

              {/* Customer Metadata Inputs */}
              {posMode === 'walkin' ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={walkinName}
                      onChange={e => setWalkinName(e.target.value)}
                      placeholder="e.g. Rahul Sen"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Contact Mobile</label>
                    <input
                      type="text"
                      value={walkinPhone}
                      onChange={e => setWalkinPhone(e.target.value)}
                      placeholder="e.g. 9830012345"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <label className="text-[10px] text-slate-400 font-bold block">
                    Select Patient (UHID / Cardholder)
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Choose Registered Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.mobile}) • UHID: {p.id}
                      </option>
                    ))}
                  </select>

                  {/* Active Health Card Banner */}
                  {activePatientCard && (
                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="font-bold text-white font-mono">
                            {activePatientCard.cardNumber}
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Tier: <strong className="capitalize">{activePatientCard.tier || (activePatientCard as any).membershipTier || 'Active Member'}</strong>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs font-mono">
                        {defaultHealthCardDiscount}% OFF
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Prescribing Doctor Input */}
              <div className="text-xs">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  Prescribing Doctor / Hospital OPD (Optional)
                </label>
                <input
                  type="text"
                  value={prescribingDocName}
                  onChange={e => setPrescribingDocName(e.target.value)}
                  placeholder="e.g. Dr. Subhashish Roy, MD"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Cart Items ({posCart.length})</span>
                  {posCart.length > 0 && (
                    <button
                      onClick={() => setPosCart([])}
                      className="text-[10px] text-rose-400 hover:underline font-normal"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {posCart.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
                    No medicines selected yet. Click "+ Add" on the left.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {posCart.map(line => {
                      const lineTotal =
                        line.unitPrice * line.quantity * (1 - line.discountPercent / 100);

                      return (
                        <div
                          key={line.batch.id}
                          className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-xs text-white block">{line.medicine.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Batch: {line.batch.batchNumber} • Exp: {line.batch.expiryDate}
                              </span>
                            </div>
                            <button
                              onClick={() => handleUpdateCartQty(line.batch.id, 0)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                              <span className="text-[10px] text-slate-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max={line.batch.availableQty}
                                value={line.quantity}
                                onChange={e =>
                                  handleUpdateCartQty(line.batch.id, parseInt(e.target.value) || 1)
                                }
                                className="w-12 bg-transparent text-white font-mono font-bold text-center focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                              <span className="text-[10px] text-slate-400">Disc%:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={line.discountPercent}
                                onChange={e =>
                                  handleUpdateCartDiscount(
                                    line.batch.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-10 bg-transparent text-white font-mono text-center focus:outline-none text-emerald-400"
                              />
                            </div>

                            <span className="font-mono font-bold text-white">
                              {formatCurrency(lineTotal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Checkout Calculation Box */}
              {posCart.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Discount Savings:</span>
                      <span className="font-mono">-{formatCurrency(cartDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                    <span>Net Bill Total:</span>
                    <span className="font-mono text-emerald-400">{formatCurrency(cartNetTotal)}</span>
                  </div>

                  {/* Payment Mode */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {(['Cash', 'Card', 'UPI', 'Health Wallet'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPosPaymentMode(mode)}
                        className={`py-1.5 rounded-xl text-[10px] font-bold border transition ${
                          posPaymentMode === mode
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* Paid & Due */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Paid (₹)</label>
                      <input
                        type="number"
                        placeholder={cartNetTotal.toString()}
                        value={posPaidAmountInput}
                        onChange={e => setPosPaidAmountInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Due Balance</label>
                      <div
                        className={`px-3 py-2 rounded-xl font-mono text-xs font-bold border ${
                          posDueAmount > 0
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {formatCurrency(posDueAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Dispense Action Button */}
                  <button
                    onClick={handleExecuteDispense}
                    disabled={isDispensing}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isDispensing
                        ? 'Dispensing & Generating Tax Invoice...'
                        : `Dispense & Generate Invoice ${formatCurrency(cartNetTotal)}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: DOCTOR PRESCRIPTIONS (EMR INTEGRATION)
          ===================================================================== */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Stethoscope className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Live Hospital Doctor Prescriptions Queue</h2>
                <p className="text-[10px] text-slate-400">
                  Doctor-signed digital prescriptions ready for verification & 1-click dispensing.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              {doctorPrescriptions.length} Active Prescriptions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctorPrescriptions.length === 0 ? (
              <div className="col-span-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                No unfulfilled doctor prescriptions currently in the hospital EMR queue.
              </div>
            ) : (
              doctorPrescriptions.map(rx => (
                <div
                  key={rx.encounterId}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-xl"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-sm text-white block">{rx.patientName}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Rx #: {rx.encounterNo} • {formatDate(rx.date)}
                        </span>
                      </div>
                      {rx.cardNo && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          {rx.cardNo}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                      <div className="text-cyan-400 font-bold">{rx.doctorName}</div>
                      <div className="text-[10px] text-slate-500">{rx.doctorSpeciality}</div>
                      {rx.diagnoses && rx.diagnoses.length > 0 && (
                        <div className="text-[10px] text-slate-400">
                          Diagnosis: <strong>{rx.diagnoses.join(', ')}</strong>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Prescribed Medicines ({rx.medications.length})
                      </span>
                      <div className="space-y-1">
                        {rx.medications.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-white">{m.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {m.dosage} • {m.frequency} • {m.duration}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLoadPrescriptionIntoPOS(rx)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Transfer to POS & Dispense</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: PURCHASES & INWARD GOODS
          ===================================================================== */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <ArrowDownCircle className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Purchase Management & Inward Invoices</h2>
                <p className="text-[10px] text-slate-400">
                  Track vendor purchase bills, auto-generate batch inventory, and update supplier credit accounts.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsPurchaseModalOpen(true);
                if (purchaseItems.length === 0) handleAddPurchaseLine();
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-teal-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Record Inward Purchase</span>
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Invoice # & Date</th>
                    <th className="px-4 py-3">Supplier Name</th>
                    <th className="px-4 py-3">Items Inward</th>
                    <th className="px-4 py-3 text-right">Taxable Subtotal</th>
                    <th className="px-4 py-3 text-right">Total GST</th>
                    <th className="px-4 py-3 text-right">Net Bill Amount</th>
                    <th className="px-4 py-3 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No purchase invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    purchases.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-bold text-white">
                          <div>{p.purchaseInvoiceNo}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.invoiceDate}</div>
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <div className="font-bold text-white">{p.supplierName}</div>
                          <div className="text-[10px] text-slate-500">{p.supplierGst || 'Unregistered'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                            {p.items.length} SKU(s)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {formatCurrency(p.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-right text-teal-400">
                          {formatCurrency(p.taxTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-white">
                          {formatCurrency(p.netTotal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              p.paymentStatus === 'paid'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: SUPPLIERS MASTER
          ===================================================================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Pharmaceutical Supplier Master</h2>
                <p className="text-[10px] text-slate-400">
                  Manage registered medicine vendors, drug licenses, GST numbers, and outstanding balances.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Register Supplier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map(sup => (
              <div
                key={sup.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-xl"
              >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-sm text-white block">{sup.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{sup.supplierCode}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      {sup.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] space-y-1 font-mono">
                    <div>
                      <span className="text-slate-500">Contact:</span> {sup.contactPerson || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">Phone:</span> {sup.phone}
                    </div>
                    <div>
                      <span className="text-slate-500">GSTIN:</span> {sup.gstNumber || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">DL No:</span> {sup.drugLicenseNo || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">Terms:</span> {sup.paymentTerms}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Outstanding:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {formatCurrency(sup.outstandingAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: LEDGER, ADJUSTMENTS & AUDIT
          ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Pharmacy Transaction Ledger & Audit Trail</h2>
                <p className="text-[10px] text-slate-400">
                  Immutable record of all sales, purchases, returns, adjustments, and refunds.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-600/30"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Record Stock Adjustment</span>
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Tx ID & Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Reference / Bill</th>
                    <th className="px-4 py-3">Party Name</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Payment Mode</th>
                    <th className="px-4 py-3">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-bold text-white">
                        <div>{tx.transactionId}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{formatDateTime(tx.timestamp)}</div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === 'sale'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : tx.type === 'purchase'
                              ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                              : tx.type === 'sales_return' || tx.type === 'purchase_return'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {tx.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-300">{tx.referenceId}</td>
                      <td className="px-4 py-3 font-sans text-white">{tx.entityName}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span
                          className={
                            tx.flow === 'inflow'
                              ? 'text-emerald-400'
                              : tx.flow === 'outflow'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }
                        >
                          {tx.flow === 'outflow' ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{tx.paymentMethod}</td>
                      <td className="px-4 py-3 font-sans text-slate-300">{tx.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 9: ONLINE ORDERS (PRESERVED WORKFLOW)
          ===================================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Truck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Patient Portal Online Delivery Orders</h2>
                <p className="text-[10px] text-slate-400">
                  Doorstep deliveries & counter pickup requests from the patient portal.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Delivery Mode</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No online delivery orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map(ord => (
                      <tr key={ord.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-white">{ord.orderNo}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{ord.patientName}</div>
                          <div className="text-[10px] text-slate-400">{ord.patientPhone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {ord.deliveryMode === 'express_home_delivery' ? 'Doorstep Delivery' : 'Pickup'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{ord.items.length} item(s)</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                          {formatCurrency(Number(ord.netTotal || ord.grossTotal || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD / EDIT MEDICINE (MEDICINE MASTER)
          ===================================================================== */}
      {isMedModalOpen && (
        <Modal
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          title={editingMed ? `Edit Medicine Master: ${editingMed.name}` : 'Add New Medicine to Master Catalog'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveMedicineSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Brand / Product Name *</label>
                <input
                  type="text"
                  value={medFormData.name}
                  onChange={e => setMedFormData({ ...medFormData, name: e.target.value })}
                  placeholder="e.g. Telma 40mg Tablet"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Generic Composition *</label>
                <input
                  type="text"
                  value={medFormData.genericName}
                  onChange={e => setMedFormData({ ...medFormData, genericName: e.target.value })}
                  placeholder="e.g. Telmisartan 40mg"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={medFormData.manufacturer}
                  onChange={e => setMedFormData({ ...medFormData, manufacturer: e.target.value })}
                  placeholder="e.g. Glenmark Pharma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Category</label>
                <input
                  type="text"
                  value={medFormData.category}
                  onChange={e => setMedFormData({ ...medFormData, category: e.target.value })}
                  placeholder="e.g. Cardiovascular"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Dosage Form</label>
                <select
                  value={medFormData.dosageForm}
                  onChange={e => setMedFormData({ ...medFormData, dosageForm: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment / Gel</option>
                  <option value="Drops">Drops</option>
                  <option value="Inhaler">Inhaler</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Strength</label>
                <input
                  type="text"
                  value={medFormData.strength}
                  onChange={e => setMedFormData({ ...medFormData, strength: e.target.value })}
                  placeholder="e.g. 40mg"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Pack Size</label>
                <input
                  type="text"
                  value={medFormData.packSize}
                  onChange={e => setMedFormData({ ...medFormData, packSize: e.target.value })}
                  placeholder="Strip of 10"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">HSN/SAC Code</label>
                <input
                  type="text"
                  value={medFormData.hsnSac}
                  onChange={e => setMedFormData({ ...medFormData, hsnSac: e.target.value })}
                  placeholder="30049099"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">GST Rate (%)</label>
                <select
                  value={medFormData.taxGstRate}
                  onChange={e => setMedFormData({ ...medFormData, taxGstRate: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 font-mono"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={medFormData.purchasePrice}
                  onChange={e => setMedFormData({ ...medFormData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Selling Price (MRP) *</label>
                <input
                  type="number"
                  min="0"
                  value={medFormData.sellingPrice}
                  onChange={e => setMedFormData({ ...medFormData, sellingPrice: parseFloat(e.target.value) || 0, mrp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Min Stock Alert Level</label>
                <input
                  type="number"
                  min="1"
                  value={medFormData.minStock}
                  onChange={e => setMedFormData({ ...medFormData, minStock: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="medRxReq"
                checked={medFormData.prescriptionRequired}
                onChange={e => setMedFormData({ ...medFormData, prescriptionRequired: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700 focus:ring-emerald-500"
              />
              <label htmlFor="medRxReq" className="text-slate-300 font-bold">
                Doctor Prescription Required (Schedule H / Rx Only)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md shadow-emerald-600/30"
              >
                Save Medicine
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          MODAL: INWARD PURCHASE INVOICE
          ===================================================================== */}
      {isPurchaseModalOpen && (
        <Modal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          title="Record Inward Purchase Bill (Supplier Stock In)"
          maxWidth="4xl"
        >
          <form onSubmit={handleSavePurchaseSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Supplier *</label>
                <select
                  value={purchaseSupplierId}
                  onChange={e => setPurchaseSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  required
                >
                  <option value="">-- Select Registered Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.supplierCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Supplier Invoice # *</label>
                <input
                  type="text"
                  value={purchaseInvoiceNo}
                  onChange={e => setPurchaseInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-2026-908"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={purchaseInvoiceDate}
                  onChange={e => setPurchaseInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                  Purchase Line Items & Batch Allocation
                </span>
                <button
                  type="button"
                  onClick={handleAddPurchaseLine}
                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {purchaseItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="md:col-span-3">
                      <label className="text-[9px] text-slate-400 block">Medicine</label>
                      <select
                        value={item.medicineId}
                        onChange={e => {
                          const mId = e.target.value;
                          const m = medicines.find(med => med.id === mId);
                          setPurchaseItems(prev =>
                            prev.map((pi, pidx) =>
                              pidx === idx
                                ? {
                                    ...pi,
                                    medicineId: mId,
                                    purchaseRate: m ? m.purchasePrice : pi.purchaseRate,
                                    mrp: m ? m.mrp : pi.mrp
                                  }
                                : pi
                            )
                          );
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px]"
                      >
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[9px] text-slate-400 block">Batch No</label>
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={e => {
                          const v = e.target.value;
                          setPurchaseItems(prev =>
                            prev.map((pi, pidx) => (pidx === idx ? { ...pi, batchNumber: v } : pi))
                          );
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-[11px]"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[9px] text-slate-400 block">Expiry Date</label>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={e => {
                          const v = e.target.value;
                          setPurchaseItems(prev =>
                            prev.map((pi, pidx) => (pidx === idx ? { ...pi, expiryDate: v } : pi))
                          );
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px]"
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] text-slate-400 block">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => {
                          const v = parseInt(e.target.value) || 1;
                          setPurchaseItems(prev =>
                            prev.map((pi, pidx) => (pidx === idx ? { ...pi, quantity: v } : pi))
                          );
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-center text-[11px]"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] text-slate-400 block">Free</label>
                      <input
                        type="number"
                        min="0"
                        value={item.freeQuantity}
                        onChange={e => {
                          const v = parseInt(e.target.value) || 0;
                          setPurchaseItems(prev =>
                            prev.map((pi, pidx) => (pidx === idx ? { ...pi, freeQuantity: v } : pi))
                          );
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-center text-[11px]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[9px] text-slate-400 block">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.purchaseRate}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          setPurchaseItems(prev =>
                            prev.map((pi, pidx) => (pidx === idx ? { ...pi, purchaseRate: v } : pi))
                          );
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-[11px]"
                      />
                    </div>

                    <div className="md:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => setPurchaseItems(prev => prev.filter((_, pidx) => pidx !== idx))}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 mt-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Amount Paid Now (₹)</label>
                <input
                  type="number"
                  value={purchasePaidAmountInput}
                  onChange={e => setPurchasePaidAmountInput(e.target.value)}
                  placeholder="0 (or full amount)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Payment Method</label>
                <select
                  value={purchasePaymentMethod}
                  onChange={e => setPurchasePaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPurchase}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition shadow-md shadow-teal-600/30 disabled:opacity-50"
              >
                {isSubmittingPurchase ? 'Processing...' : 'Confirm Inward Stock Bill'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          MODAL: REGISTER SUPPLIER
          ===================================================================== */}
      {isSupplierModalOpen && (
        <Modal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          title="Register Pharmaceutical Distributor / Supplier"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveSupplierSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Supplier Company Name *</label>
              <input
                type="text"
                value={supplierFormData.name}
                onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                placeholder="e.g. Abbott Healthcare Logistics"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={supplierFormData.contactPerson}
                  onChange={e => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={supplierFormData.phone}
                  onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  placeholder="+91 98310 12345"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={supplierFormData.gstNumber}
                  onChange={e => setSupplierFormData({ ...supplierFormData, gstNumber: e.target.value })}
                  placeholder="19AAECM4421P1Z4"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Drug License Number</label>
                <input
                  type="text"
                  value={supplierFormData.drugLicenseNo}
                  onChange={e => setSupplierFormData({ ...supplierFormData, drugLicenseNo: e.target.value })}
                  placeholder="WB-KOL-20B-184920"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Warehouse Address</label>
              <input
                type="text"
                value={supplierFormData.address}
                onChange={e => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                placeholder="Industrial Hub, Salt Lake, Kolkata"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/30"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          MODAL: STOCK ADJUSTMENT & AUDIT
          ===================================================================== */}
      {isAdjustModalOpen && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Audited Stock Adjustment & Physical Reconciliation"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveAdjustmentSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Select Batch *</label>
              <select
                value={adjustBatchId}
                onChange={e => setAdjustBatchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
                required
              >
                <option value="">-- Choose Batch to Adjust --</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.medicineName} • Batch: {b.batchNumber} (Avail: {b.availableQty})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="audit_reconciliation">Audit Reconciliation</option>
                  <option value="stock_increase">Physical Count Increase</option>
                  <option value="stock_decrease">Physical Count Decrease</option>
                  <option value="damaged">Damaged / Broken Ampoules</option>
                  <option value="expired">Expired Stock Removal</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  Adjustment Qty (+/-) *
                </label>
                <input
                  type="number"
                  value={adjustQtyDiff}
                  onChange={e => setAdjustQtyDiff(parseInt(e.target.value) || 0)}
                  placeholder="e.g. -5 or +10"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Mandatory Auditable Reason *
              </label>
              <textarea
                rows={3}
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="State the clinical, physical audit or damage justification..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAdjust}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-md shadow-amber-600/30 disabled:opacity-50"
              >
                {isSubmittingAdjust ? 'Auditing...' : 'Confirm Audited Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          MODAL: OFFICIAL PHARMACY TAX INVOICE PRINT
          ===================================================================== */}
      {printedSale && (
        <PharmacyBillPrintModal
          isOpen={!!printedSale}
          onClose={() => setPrintedSale(null)}
          sale={printedSale}
          patient={selectedPatientObj}
          card={activePatientCard}
        />
      )}
    </div>
  );
};
