import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  PharmacyHeldBill,
  PharmacyShiftClosing,
  Patient,
  HealthCard,
  Membership,
  Wallet
} from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { DirectMedicineOrderModal } from '../../components/portal/DirectMedicineOrderModal';
import { PharmacyBillPrintModal } from '../../components/pharmacy/PharmacyBillPrintModal';
import { RetailPosHoldBillsModal } from '../../components/pharmacy/RetailPosHoldBillsModal';
import { PharmacyShiftClosingModal } from '../../components/pharmacy/PharmacyShiftClosingModal';
import { PharmacyBillCancelModal } from '../../components/pharmacy/PharmacyBillCancelModal';
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
  Percent,
  Calculator
} from 'lucide-react';

type PharmacyHubTab =
  | 'dashboard'
  | 'retail'
  | 'prescriptions'
  | 'returns'
  | 'medicines'
  | 'batches'
  | 'purchases'
  | 'suppliers'
  | 'ledger'
  | 'orders'
  | 'pos';

interface POSCartLine {
  medicine: MedicineMasterItem;
  batch: MedicineBatchItem;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface PharmacyPageProps {
  initialTab?: PharmacyHubTab;
}

export const PharmacyPage: React.FC<PharmacyPageProps> = ({ initialTab }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  // Active Tab with URL synchronization
  const tabParam = (searchParams.get('tab') as PharmacyHubTab) || initialTab;
  const [activeTab, setActiveTab] = useState<PharmacyHubTab>(tabParam || 'dashboard');

  useEffect(() => {
    const currentParam = (searchParams.get('tab') as PharmacyHubTab) || initialTab;
    if (currentParam) {
      setActiveTab(currentParam);
    }
  }, [searchParams, initialTab]);

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
  const [posPaymentMode, setPosPaymentMode] = useState<'Cash' | 'Card' | 'UPI' | 'Health Wallet' | 'Bank Transfer'>('Cash');
  const [posPaidAmountInput, setPosPaidAmountInput] = useState<string>('');
  const [posCashReceivedInput, setPosCashReceivedInput] = useState<string>('');
  const [posManualDiscountPercent, setPosManualDiscountPercent] = useState<number>(0);
  const [posManualDiscountReason, setPosManualDiscountReason] = useState<string>('');
  const [isManualDiscountOpen, setIsManualDiscountOpen] = useState<boolean>(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [isDispensing, setIsDispensing] = useState(false);
  const [printedSale, setPrintedSale] = useState<PharmacySale | null>(null);

  // Hold Bills, Shift Closing & Cancellation State
  const [heldBills, setHeldBills] = useState<PharmacyHeldBill[]>(() => PharmacyService.getHeldBills());
  const [isHoldBillsModalOpen, setIsHoldBillsModalOpen] = useState(false);
  const [isShiftClosingModalOpen, setIsShiftClosingModalOpen] = useState(false);
  const [cancellingSale, setCancellingSale] = useState<PharmacySale | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Retail Bills History Filter
  const [posBillSearchTerm, setPosBillSearchTerm] = useState('');
  const [posBillStatusFilter, setPosBillStatusFilter] = useState<'all' | 'dispensed' | 'cancelled' | 'returned'>('all');

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

  // Batch switcher in cart
  const handleSwitchCartBatch = (currentBatchId: string, targetBatchId: string) => {
    const targetBatch = batches.find(b => b.id === targetBatchId);
    if (!targetBatch) return;
    setPosCart(prev =>
      prev.map(line => {
        if (line.batch.id === currentBatchId) {
          return {
            ...line,
            batch: targetBatch,
            unitPrice: targetBatch.sellingPrice || line.medicine.sellingPrice,
            quantity: Math.min(line.quantity, targetBatch.availableQty)
          };
        }
        return line;
      })
    );
  };

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return Math.round(posCart.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0) * 100) / 100;
  }, [posCart]);

  const cartItemDiscount = useMemo(() => {
    return Math.round(posCart.reduce((acc, line) => {
      return acc + (line.unitPrice * line.quantity * line.discountPercent) / 100;
    }, 0) * 100) / 100;
  }, [posCart]);

  const cartManualDiscount = useMemo(() => {
    if (posManualDiscountPercent <= 0) return 0;
    const remaining = cartSubtotal - cartItemDiscount;
    return Math.round((remaining * (posManualDiscountPercent / 100)) * 100) / 100;
  }, [cartSubtotal, cartItemDiscount, posManualDiscountPercent]);

  const cartTotalDiscount = useMemo(() => {
    return Math.round((cartItemDiscount + cartManualDiscount) * 100) / 100;
  }, [cartItemDiscount, cartManualDiscount]);

  const cartTax = useMemo(() => {
    return Math.round(posCart.reduce((acc, line) => {
      const lineGross = line.unitPrice * line.quantity;
      const lineDisc = (lineGross * line.discountPercent) / 100;
      const lineNet = lineGross - lineDisc;
      const gst = line.medicine.taxGstRate || 12;
      return acc + (lineNet * gst) / (100 + gst);
    }, 0) * 100) / 100;
  }, [posCart]);

  const cartUnroundedNet = useMemo(() => {
    return Math.max(0, cartSubtotal - cartTotalDiscount);
  }, [cartSubtotal, cartTotalDiscount]);

  const cartNetTotal = useMemo(() => {
    return Math.round(cartUnroundedNet); // Round-off to nearest rupee
  }, [cartUnroundedNet]);

  const cartRoundOff = useMemo(() => {
    return Math.round((cartNetTotal - cartUnroundedNet) * 100) / 100;
  }, [cartNetTotal, cartUnroundedNet]);

  const posPaidAmount = useMemo(() => {
    if (posPaidAmountInput === '') return cartNetTotal;
    const val = parseFloat(posPaidAmountInput);
    return isNaN(val) ? 0 : val;
  }, [posPaidAmountInput, cartNetTotal]);

  const posDueAmount = useMemo(() => {
    return Math.max(0, Math.round((cartNetTotal - posPaidAmount) * 100) / 100);
  }, [cartNetTotal, posPaidAmount]);

  const posCashReceived = useMemo(() => {
    if (posCashReceivedInput === '') return posPaidAmount;
    const val = parseFloat(posCashReceivedInput);
    return isNaN(val) ? 0 : val;
  }, [posCashReceivedInput, posPaidAmount]);

  const posChangeGiven = useMemo(() => {
    if (posPaymentMode !== 'Cash' || posCashReceived <= posPaidAmount) return 0;
    return Math.round((posCashReceived - posPaidAmount) * 100) / 100;
  }, [posPaymentMode, posCashReceived, posPaidAmount]);

  // Direct Barcode Scanner Key Handler (Enter to Add)
  const handleBarcodeScanEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && posSearchTerm.trim()) {
      const q = posSearchTerm.trim().toLowerCase();
      const matchedMed = medicines.find(m => 
        (m.barcode && m.barcode.toLowerCase() === q) || 
        m.code.toLowerCase() === q ||
        m.name.toLowerCase() === q
      );
      if (matchedMed) {
        handleAddToCart(matchedMed);
        setPosSearchTerm('');
        showToast('success', 'Barcode Scanned', `${matchedMed.name} added to cart via barcode.`);
      }
    }
  };

  // Hold Current Bill
  const handleHoldCurrentBill = async () => {
    if (posCart.length === 0) {
      showToast('error', 'Cart Empty', 'Please add items before placing bill on hold.');
      return;
    }
    try {
      const patientName = selectedPatientObj
        ? selectedPatientObj.fullName
        : walkinName.trim() || 'Walk-in Customer';
      const patientPhone = selectedPatientObj ? selectedPatientObj.mobile : walkinPhone.trim() || undefined;

      const held = await PharmacyService.holdBill({
        customerType: activePatientCard ? 'card_holder' : selectedPatientObj ? 'registered' : 'walkin',
        patientName,
        patientPhone,
        patientId: selectedPatientObj ? selectedPatientObj.id : undefined,
        patientCardNo: activePatientCard ? activePatientCard.cardNumber : undefined,
        cardTier: activePatientCard ? (activePatientCard.tier || (activePatientCard as any).membershipTier) : undefined,
        items: posCart.map(line => {
          const gross = line.unitPrice * line.quantity;
          const disc = Math.round((gross * line.discountPercent / 100) * 100) / 100;
          return {
            medicineId: line.medicine.id,
            medicineName: line.medicine.name,
            batchId: line.batch.id,
            batchNumber: line.batch.batchNumber,
            expiryDate: line.batch.expiryDate,
            quantity: line.quantity,
            mrp: line.batch.mrp,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            discountAmount: disc,
            taxGstPercent: line.medicine.taxGstRate || 12,
            taxAmount: 0,
            totalAmount: gross - disc
          };
        }),
        subtotal: cartSubtotal,
        discountAmount: cartTotalDiscount,
        manualDiscountPercent: posManualDiscountPercent > 0 ? posManualDiscountPercent : undefined,
        manualDiscountReason: posManualDiscountReason ? posManualDiscountReason : undefined,
        healthCardDiscount: activePatientCard ? cartItemDiscount : 0,
        taxAmount: cartTax,
        netTotal: cartNetTotal,
        paymentMode: posPaymentMode,
        heldBy: currentUser?.fullName || 'Counter Cashier'
      });

      setHeldBills(PharmacyService.getHeldBills());
      setPosCart([]);
      setWalkinName('');
      setWalkinPhone('');
      setPosPaidAmountInput('');
      setPosCashReceivedInput('');
      setPosManualDiscountPercent(0);
      setPosManualDiscountReason('');
      showToast('info', 'Bill Placed on Hold', `Bill ${held.holdNumber} saved to queue. You can resume it anytime.`);
    } catch (err: any) {
      showToast('error', 'Hold Failed', err?.message || 'Could not hold bill.');
    }
  };

  // Resume Held Bill into POS Cart
  const handleResumeHeldBill = (bill: PharmacyHeldBill) => {
    const medsMaster = PharmacyService.getMedicines();
    const allBatches = PharmacyService.getBatches();
    const restoredCart: POSCartLine[] = [];

    for (const it of bill.items) {
      const med = medsMaster.find(m => m.id === it.medicineId);
      let batch = allBatches.find(b => b.id === it.batchId);
      if (!batch && med) {
        const candidates = PharmacyService.getFefoRecommendedBatches(med.id);
        batch = candidates[0];
      }
      if (med && batch) {
        restoredCart.push({
          medicine: med,
          batch,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent
        });
      }
    }

    setPosCart(restoredCart);
    if (bill.patientId) {
      setPosMode('patient');
      setSelectedPatientId(bill.patientId);
    } else {
      setPosMode('walkin');
      setWalkinName(bill.patientName || '');
      setWalkinPhone(bill.patientPhone || '');
    }
    if (bill.manualDiscountPercent) setPosManualDiscountPercent(bill.manualDiscountPercent);
    if (bill.manualDiscountReason) setPosManualDiscountReason(bill.manualDiscountReason);
    if (bill.paymentMode) setPosPaymentMode(bill.paymentMode as any);

    PharmacyService.deleteHeldBill(bill.id);
    setHeldBills(PharmacyService.getHeldBills());
    showToast('success', 'Bill Resumed', `Restored ${restoredCart.length} items from ${bill.holdNumber} into POS cart.`);
  };

  // Reprint Sale Action
  const handleReprintSale = async (sale: PharmacySale) => {
    try {
      const updated = await PharmacyService.reprintSale(sale.id, currentUser?.fullName || 'Counter Cashier');
      setSales(PharmacyService.getSales());
      setPrintedSale(updated);
      showToast('info', 'Reprint Triggered', `Reprint #${updated.reprintCount || 1} generated for ${updated.invoiceNumber}.`);
    } catch (err: any) {
      showToast('error', 'Reprint Failed', err?.message || 'Could not reprint invoice.');
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (sale: PharmacySale) => {
    setCancellingSale(sale);
    setIsCancelModalOpen(true);
  };

  // Dispense & Bill Execution (Retail OTC Workflow)
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
      const result = await PharmacyService.dispenseRetailSale({
        patientId: selectedPatientObj ? selectedPatientObj.id : undefined,
        patientName,
        patientPhone,
        cardNo: activePatientCard ? activePatientCard.cardNumber : undefined,
        cardTier: activePatientCard ? (activePatientCard.tier || (activePatientCard as any).membershipTier) : undefined,
        customerType: activePatientCard ? 'card_holder' : selectedPatientObj ? 'registered' : 'walkin',
        paymentMode: posPaymentMode,
        paidAmount: posPaidAmount,
        cashReceived: posPaymentMode === 'Cash' ? posCashReceived : undefined,
        manualDiscountPercent: posManualDiscountPercent > 0 ? posManualDiscountPercent : undefined,
        manualDiscountAmount: cartManualDiscount > 0 ? cartManualDiscount : undefined,
        manualDiscountReason: posManualDiscountReason || undefined,
        manualDiscountApprovedBy: posManualDiscountPercent > 0 ? (currentUser?.fullName || 'Authorized Supervisor') : undefined,
        notes: `Retail Counter OTC Sale: ${posCart.length} item(s)`,
        performedBy: currentUser?.fullName || 'Retail Pharmacist',
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
      setPosCashReceivedInput('');
      setWalkinName('');
      setWalkinPhone('');
      setPrescribingDocName('');
      setPosManualDiscountPercent(0);
      setPosManualDiscountReason('');

      showToast('success', 'Retail Sale Completed', `Official A4 Half-Page Tax Invoice #${result.sale.invoiceNumber} generated.`);
    } catch (err: any) {
      showToast('error', 'Dispense Failed', err?.message || 'Could not complete dispensing.');
    } finally {
      setIsDispensing(false);
    }
  };

  // =========================================================================
  // PRESCRIPTION PHARMACY WORKFLOW STATE & ACTIONS
  // =========================================================================
  const [rxFilter, setRxFilter] = useState<'all' | 'pending' | 'dispensed'>('pending');
  const [selectedRxForDispense, setSelectedRxForDispense] = useState<(typeof doctorPrescriptions)[0] | null>(null);
  const [rxDispenseLines, setRxDispenseLines] = useState<Array<{
    medicineId: string;
    batchId: string;
    prescribedName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    availableQty: number;
    batchNumber: string;
    expiryDate: string;
  }>>([]);
  const [rxSafetyChecks, setRxSafetyChecks] = useState({
    dosageVerified: true,
    allergyScreened: true,
    interactionChecked: true
  });
  const [rxPharmacistNotes, setRxPharmacistNotes] = useState('');
  const [rxPaymentMode, setRxPaymentMode] = useState<'Cash' | 'Card' | 'UPI' | 'Health Wallet'>('Cash');
  const [rxPaidAmountInput, setRxPaidAmountInput] = useState('');
  const [isDispensingRx, setIsDispensingRx] = useState(false);

  // Manual External Prescription Modal State
  const [isExternalRxModalOpen, setIsExternalRxModalOpen] = useState(false);
  const [externalRxForm, setExternalRxForm] = useState({
    patientName: '',
    patientPhone: '',
    doctorName: '',
    doctorRegNo: '',
    hospitalOrClinic: '',
    medicinesText: ''
  });

  const handleOpenDispenseRxModal = (rx: (typeof doctorPrescriptions)[0]) => {
    setSelectedRxForDispense(rx);
    const medsMaster = PharmacyService.getMedicines();
    const lines: typeof rxDispenseLines = [];

    const rxPatient = patients.find(p => p.id === rx.patientId);
    const rxCard = rxPatient ? cards.find(c => c.patientId === rxPatient.id && c.status === 'active') : null;
    const rxDiscount = rxCard ? 15 : 0;

    for (const m of rx.medications) {
      const normalizedName = m.name.toLowerCase();
      const matchedMed = medsMaster.find(med => 
        med.name.toLowerCase().includes(normalizedName) ||
        (med.genericName && med.genericName.toLowerCase().includes(normalizedName))
      );

      if (matchedMed) {
        const fefoBatches = PharmacyService.getFefoRecommendedBatches(matchedMed.id);
        const chosenBatch = fefoBatches.length > 0 ? fefoBatches[0] : null;
        lines.push({
          medicineId: matchedMed.id,
          batchId: chosenBatch ? chosenBatch.id : '',
          prescribedName: m.name,
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          duration: m.duration || '',
          quantity: 10,
          unitPrice: chosenBatch?.sellingPrice || matchedMed.sellingPrice,
          discountPercent: rxDiscount,
          availableQty: chosenBatch?.availableQty || 0,
          batchNumber: chosenBatch?.batchNumber || 'N/A',
          expiryDate: chosenBatch?.expiryDate || 'N/A'
        });
      } else {
        lines.push({
          medicineId: medsMaster[0]?.id || '',
          batchId: '',
          prescribedName: m.name,
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          duration: m.duration || '',
          quantity: 10,
          unitPrice: 0,
          discountPercent: rxDiscount,
          availableQty: 0,
          batchNumber: '',
          expiryDate: ''
        });
      }
    }

    setRxDispenseLines(lines);
    setRxSafetyChecks({
      dosageVerified: true,
      allergyScreened: true,
      interactionChecked: true
    });
    setRxPharmacistNotes('');
    setRxPaidAmountInput('');
  };

  const rxDispenseSubtotal = useMemo(() => {
    return rxDispenseLines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  }, [rxDispenseLines]);

  const rxDispenseDiscount = useMemo(() => {
    return rxDispenseLines.reduce((acc, l) => acc + (l.unitPrice * l.quantity * l.discountPercent) / 100, 0);
  }, [rxDispenseLines]);

  const rxDispenseNetTotal = useMemo(() => {
    return Math.max(0, Math.round((rxDispenseSubtotal - rxDispenseDiscount) * 100) / 100);
  }, [rxDispenseSubtotal, rxDispenseDiscount]);

  const handleConfirmDispenseRx = async () => {
    if (!selectedRxForDispense) return;
    const validLines = rxDispenseLines.filter(l => l.batchId && l.quantity > 0);
    if (validLines.length === 0) {
      showToast('error', 'No Valid Batches', 'Please assign active batches to the prescribed medicines before dispensing.');
      return;
    }
    if (!rxSafetyChecks.dosageVerified || !rxSafetyChecks.allergyScreened) {
      showToast('warning', 'Clinical Sign-off Required', 'Pharmacist must verify dosage and screen for allergies.');
      return;
    }

    setIsDispensingRx(true);
    try {
      const result = await PharmacyService.dispensePrescriptionSale({
        prescriptionId: selectedRxForDispense.encounterId,
        doctorId: selectedRxForDispense.doctorId,
        doctorName: selectedRxForDispense.doctorName,
        patientId: selectedRxForDispense.patientId,
        patientName: selectedRxForDispense.patientName,
        patientPhone: selectedRxForDispense.patientPhone,
        cardNo: selectedRxForDispense.cardNo,
        sourceType: selectedRxForDispense.sourceType || 'OPD',
        paymentMode: rxPaymentMode,
        paidAmount: rxPaidAmountInput !== '' ? parseFloat(rxPaidAmountInput) : rxDispenseNetTotal,
        notes: rxPharmacistNotes.trim() || `Prescription #${selectedRxForDispense.encounterNo} Dispensed`,
        performedBy: currentUser?.fullName || 'Prescription Pharmacist',
        items: validLines.map(l => ({
          medicineId: l.medicineId,
          batchId: l.batchId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent
        }))
      });

      setSales(PharmacyService.getSales());
      setBatches(PharmacyService.getBatches());
      setMedicines(PharmacyService.getMedicines());
      setTransactions(PharmacyService.getPharmacyTransactions());
      setMovements(PharmacyService.getStockMovements());

      setSelectedRxForDispense(null);
      setPrintedSale(result.sale);
      showToast('success', 'Prescription Dispensed', `Official Rx Tax Invoice #${result.sale.invoiceNumber} generated.`);
    } catch (err: any) {
      showToast('error', 'Dispense Failed', err?.message || 'Could not complete dispensing.');
    } finally {
      setIsDispensingRx(false);
    }
  };

  const handleOpenDispensedInvoice = (invoiceNo: string) => {
    const sale = sales.find(s => s.invoiceNumber === invoiceNo);
    if (sale) {
      setPrintedSale(sale);
    } else {
      showToast('info', 'Invoice Not Found', `Invoice ${invoiceNo} could not be located.`);
    }
  };

  // =========================================================================
  // RETURNS MANAGEMENT & AUDIT STATE
  // =========================================================================
  const [returnsFilter, setReturnsFilter] = useState<'ALL' | 'RETAIL' | 'PRESCRIPTION'>('ALL');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnFormType, setReturnFormType] = useState<'RETAIL' | 'PRESCRIPTION'>('RETAIL');
  const [returnSelectedSaleId, setReturnSelectedSaleId] = useState('');
  const [returnSelectedBatchId, setReturnSelectedBatchId] = useState('');
  const [returnSelectedMedicineId, setReturnSelectedMedicineId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnUnitPrice, setReturnUnitPrice] = useState(0);
  const [returnRestockCondition, setReturnRestockCondition] = useState<'restockable' | 'damaged_quarantined'>('restockable');
  const [returnReason, setReturnReason] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const eligibleReturnSales = useMemo(() => {
    return sales.filter(s => {
      if (returnFormType === 'RETAIL') return s.sourceType === 'RETAIL' || s.saleType === 'RETAIL' || !s.prescriptionId;
      return s.sourceType === 'PRESCRIPTION' || s.saleType === 'PRESCRIPTION' || !!s.prescriptionId;
    });
  }, [sales, returnFormType]);

  const selectedReturnSaleObj = useMemo(() => {
    return sales.find(s => s.id === returnSelectedSaleId) || null;
  }, [sales, returnSelectedSaleId]);

  const handleSaveReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSelectedSaleId) {
      showToast('error', 'Sale Required', 'Please select a sale invoice to process return against.');
      return;
    }
    if (!returnSelectedMedicineId || !returnSelectedBatchId) {
      showToast('error', 'Medicine Required', 'Please select the returned medicine.');
      return;
    }
    if (returnQuantity <= 0) {
      showToast('error', 'Invalid Quantity', 'Return quantity must be at least 1.');
      return;
    }
    if (!returnReason.trim()) {
      showToast('error', 'Reason Required', 'Mandatory clinical/customer reason must be provided.');
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const batchObj = batches.find(b => b.id === returnSelectedBatchId);
      await PharmacyService.recordSalesReturn({
        originalInvoiceNo: selectedReturnSaleObj ? selectedReturnSaleObj.invoiceNumber : '',
        medicineId: returnSelectedMedicineId,
        batchNumber: batchObj ? batchObj.batchNumber : 'BAT-DEFAULT',
        quantity: returnQuantity,
        refundRate: returnUnitPrice,
        returnReason: returnReason.trim(),
        returnType: returnFormType,
        stockAction: returnRestockCondition === 'restockable' ? 'return_to_active' : 'quarantine_damaged',
        authorizedBy: currentUser?.fullName || 'Pharmacy Quality Inspector'
      });

      setSalesReturns(PharmacyService.getSalesReturns());
      setBatches(PharmacyService.getBatches());
      setTransactions(PharmacyService.getPharmacyTransactions());
      setMovements(PharmacyService.getStockMovements());

      setIsReturnModalOpen(false);
      setReturnReason('');
      setReturnQuantity(1);
      showToast(
        'success',
        'Return Completed',
        returnRestockCondition === 'restockable'
          ? 'Passed pharmacist inspection. Restocked to shelf inventory & refunded.'
          : 'Failed inspection. Quarantined & scrapped without restocking.'
      );
    } catch (err: any) {
      showToast('error', 'Return Failed', err?.message || 'Could not process return.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // 1-Click Load Doctor Prescription into Retail POS Cart
  const handleLoadPrescriptionIntoPOS = (prescription: (typeof doctorPrescriptions)[0]) => {
    setActiveTab('retail');
    setPosMode('patient');
    setSelectedPatientId(prescription.patientId);
    setPrescribingDocName(prescription.doctorName);

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
              setActiveTab('retail');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Retail Pharmacy (OTC)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('prescriptions');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold transition shadow-lg shadow-cyan-700/30"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Prescription Pharmacy (Rx)</span>
            {metrics.pendingPrescriptionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-cyan-800 font-black animate-pulse">
                {metrics.pendingPrescriptionsCount}
              </span>
            )}
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
          { id: 'retail', label: 'Retail Pharmacy (OTC)', icon: ShoppingCart, badge: posCart.length > 0 ? posCart.length : undefined },
          { id: 'prescriptions', label: 'Prescription Pharmacy (Rx)', icon: Stethoscope, badge: metrics.pendingPrescriptionsCount > 0 ? metrics.pendingPrescriptionsCount : undefined },
          { id: 'returns', label: 'Sales & Rx Returns', icon: RotateCcw, count: salesReturns.length },
          { id: 'medicines', label: 'Medicine Master', icon: Pill, count: medicines.length },
          { id: 'batches', label: 'Batch Stock & FEFO', icon: Boxes, count: batches.length },
          { id: 'purchases', label: 'Purchases & Inward', icon: ArrowDownCircle, count: purchases.length },
          { id: 'suppliers', label: 'Suppliers Master', icon: Building2, count: suppliers.length },
          { id: 'ledger', label: 'Ledger & Audit', icon: Layers, count: transactions.length },
          { id: 'orders', label: 'Online Orders', icon: Truck, count: orders.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'retail' && activeTab === 'pos');
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
          TAB 1: PHARMACY DASHBOARD (SEGREGATED WORKFLOW COUNTERS)
          ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* SECTION 1: RETAIL PHARMACY WORKFLOW */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-emerald-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShoppingCart className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Retail Pharmacy Workflow
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Direct / OTC / Walk-in
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Non-prescription medicine sales, fast counter POS, patient health card discounts, and retail returns
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('retail')}
                className="self-start md:self-auto px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Launch Retail Counter</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Retail Sales</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {formatCurrency(metrics.todayRetailSalesAmount)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {metrics.todayRetailSalesCount} walk-in/OTC receipts today
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Retail Revenue</span>
                <div className="text-xl font-black text-white font-mono">
                  {formatCurrency(metrics.totalRetailRevenue)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Cumulative direct OTC turnover
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Retail Transactions</span>
                <div className="text-xl font-black text-slate-200 font-mono">
                  {metrics.retailSalesCount}
                </div>
                <div className="text-[10px] text-slate-500">
                  Total billed retail invoices (PHARM-RET)
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Retail Returns</span>
                <div className="text-xl font-black text-amber-400 font-mono">
                  {metrics.retailReturnsCount}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Refunds: {formatCurrency(metrics.retailReturnsAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRESCRIPTION PHARMACY WORKFLOW */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-cyan-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Stethoscope className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Prescription Pharmacy Workflow
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      Doctor Prescriptions (EMR)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Clinical dosage verification, doctor-linked dispensing, FEFO batch selection, and prescription status tracking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('prescriptions')}
                className="self-start md:self-auto px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Open Rx Queue ({metrics.pendingPrescriptionsCount})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Prescriptions</span>
                <div className="text-xl font-black text-cyan-400 font-mono">
                  {metrics.pendingPrescriptionsCount}
                </div>
                <div className="text-[10px] text-slate-500">
                  Awaiting pharmacist review & dispensing
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispensed Prescriptions</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {metrics.dispensedPrescriptionsCount}
                </div>
                <div className="text-[10px] text-slate-500">
                  Fulfilled & tagged with PHARM-RX bills
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prescription Sales Value</span>
                <div className="text-xl font-black text-white font-mono">
                  {formatCurrency(metrics.prescriptionSalesAmount)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Today: {formatCurrency(metrics.todayPrescriptionSalesAmount)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prescription Returns</span>
                <div className="text-xl font-black text-rose-400 font-mono">
                  {metrics.prescriptionReturnsCount}
                </div>
                <div className="text-[10px] text-slate-500">
                  Doctor-recalled / Ward returns
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: COMMON INVENTORY & EXPIRE MANAGEMENT */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-blue-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Boxes className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Common Inventory & FEFO Expiry Core
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Unified Stock Ledger
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time stock deduction, shared medicine master, batch inventory, and FEFO expiry protection
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('batches')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
                >
                  Audit Batches
                </button>
                <button
                  onClick={() => setActiveTab('medicines')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/20"
                >
                  Medicine Master
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inventory Valuation</span>
                <div className="text-xl font-black text-white font-mono">
                  {formatCurrency(metrics.stockValuationMrp)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Cost: {formatCurrency(metrics.stockValuationPurchase)} • {metrics.totalStockUnits} units
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active SKUs & Batches</span>
                <div className="text-xl font-black text-slate-200 font-mono">
                  {metrics.totalMedicinesCount} SKUs
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {batches.length} trackable active batches
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Level Alerts</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-amber-400 font-mono">{metrics.lowStockCount}</span>
                  <span className="text-[10px] text-slate-400">Low</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xl font-black text-rose-400 font-mono">{metrics.outOfStockCount}</span>
                  <span className="text-[10px] text-slate-400">Out</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Automated reorder triggers active
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FEFO Expiry Warnings</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black font-mono bg-rose-950/80 text-rose-300 border border-rose-500/30">
                    {metrics.expiredBatchesCount} Exp
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black font-mono bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    {metrics.nearExpiry30DaysCount} &lt;30d
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black font-mono bg-blue-950/80 text-blue-300 border border-blue-500/30">
                    {metrics.nearExpiry60DaysCount} &lt;60d
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  &lt;90d: {metrics.nearExpiry90DaysCount} batches
                </div>
              </div>
            </div>
          </div>

          {/* Quick Operations Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab('retail')}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 transition flex items-center gap-3 text-left group"
            >
              <span className="p-3 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-white block">Retail POS Sale</strong>
                <span className="text-[10px] text-slate-400">Direct OTC / Walk-in / Card</span>
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
                <strong className="text-xs font-bold text-white block">Prescription Queue</strong>
                <span className="text-[10px] text-slate-400">{metrics.pendingPrescriptionsCount} pending doctor Rx</span>
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
              onClick={() => setActiveTab('returns')}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 hover:border-amber-500/60 transition flex items-center gap-3 text-left group"
            >
              <span className="p-3 rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/30 group-hover:scale-105 transition">
                <RotateCcw className="w-5 h-5" />
              </span>
              <div>
                <strong className="text-xs font-bold text-white block">Sales & Rx Returns</strong>
                <span className="text-[10px] text-slate-400">Pharmacist inspection audit</span>
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
          TAB 4: RETAIL PHARMACY (OTC / DIRECT COUNTER SALES)
          ===================================================================== */}
      {(activeTab === 'retail' || activeTab === 'pos') && (
        <div className="space-y-4">
          {/* Top Operational Banner */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    Retail Pharmacy POS & Counter Billing
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Direct OTC • No Rx Required
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Fast barcode scanner, FEFO batches, Health Card discounts, cash change calculation & official A4 half-page tax receipts
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Invoice Series: <strong className="text-emerald-400">LM-PH-YYYY-XXXXXX</strong>
              </span>

              {/* Held Bills Button */}
              <button
                type="button"
                onClick={() => setIsHoldBillsModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  heldBills.length > 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Held Bills</span>
                {heldBills.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                    {heldBills.length}
                  </span>
                )}
              </button>

              {/* Shift Closing Button */}
              <button
                type="button"
                onClick={() => setIsShiftClosingModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Shift / Day Closing</span>
              </button>
            </div>
          </div>

          {/* POS Workbench Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Medicine & FEFO Selector */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Over-the-Counter & Retail Medicines
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ✓ FEFO Batch Auto-Allocated
                  </span>
                </div>

                {/* Search & Barcode Scan Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={posSearchTerm}
                    onChange={e => setPosSearchTerm(e.target.value)}
                    onKeyDown={handleBarcodeScanEnter}
                    placeholder="Scan barcode [Press Enter to add] or search by brand, generic, code..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
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
                              Stock: <strong className="text-white">{totalAvailable}</strong>
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

            {/* Right 5 Columns: Patient Link, Health Card & Smart Cart Checkout */}
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
                      Search & Select Patient (UHID / Name / Mobile)
                    </label>
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={e => setPatientSearchQuery(e.target.value)}
                      placeholder="Type patient name, phone, or UHID to filter..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs mb-1 focus:border-emerald-500"
                    />
                    <select
                      value={selectedPatientId}
                      onChange={e => setSelectedPatientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 font-medium"
                    >
                      <option value="">-- Choose Registered Patient --</option>
                      {patients
                        .filter(p => {
                          if (!patientSearchQuery.trim()) return true;
                          const q = patientSearchQuery.toLowerCase();
                          return (
                            p.fullName.toLowerCase().includes(q) ||
                            (p.mobile && p.mobile.includes(q)) ||
                            p.id.toLowerCase().includes(q)
                          );
                        })
                        .map(p => (
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

                {/* OTC Direct Workflow Indicator */}
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-emerald-300 font-bold">OTC Direct Sale</span>
                  </div>
                  <span className="text-[10px] text-slate-400">No Doctor Prescription Required</span>
                </div>

                {/* Smart Cart Items List */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Smart Cart ({posCart.length})</span>
                    <div className="flex items-center gap-3">
                      {posCart.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleHoldCurrentBill}
                            className="text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                            title="Pause cart and save to held queue"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Hold Bill</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosCart([])}
                            className="text-[10px] text-rose-400 hover:underline font-normal"
                          >
                            Clear All
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {posCart.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
                      No medicines selected yet. Search or scan barcode on the left.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                      {posCart.map(line => {
                        const lineGross = line.unitPrice * line.quantity;
                        const lineTotal = lineGross * (1 - line.discountPercent / 100);
                        const medBatches = batches.filter(b => b.medicineId === line.medicine.id && b.status === 'active' && b.availableQty > 0);

                        return (
                          <div
                            key={line.batch.id}
                            className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-2"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <strong className="text-xs text-white block">{line.medicine.name}</strong>
                                <span className="text-[10px] text-slate-400 block">{line.medicine.genericName}</span>
                              </div>
                              <button
                                onClick={() => handleUpdateCartQty(line.batch.id, 0)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Batch Switcher Selector */}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span>Batch:</span>
                              <select
                                value={line.batch.id}
                                onChange={e => handleSwitchCartBatch(line.batch.id, e.target.value)}
                                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-emerald-500"
                              >
                                {medBatches.map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.batchNumber} (Exp: {b.expiryDate} • Stock: {b.availableQty})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Qty, Discount, and Rate Controls */}
                            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-700/60">
                              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(line.batch.id, line.quantity - 1)}
                                  className="text-slate-400 hover:text-white px-1 font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={line.batch.availableQty}
                                  value={line.quantity}
                                  onChange={e =>
                                    handleUpdateCartQty(line.batch.id, parseInt(e.target.value) || 1)
                                  }
                                  className="w-10 bg-transparent text-white font-mono font-bold text-center focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(line.batch.id, line.quantity + 1)}
                                  className="text-slate-400 hover:text-white px-1 font-bold"
                                >
                                  +
                                </button>
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
                                  className="w-10 bg-transparent text-white font-mono text-center focus:outline-none text-emerald-400 font-bold"
                                />
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-bold text-white block">
                                  {formatCurrency(lineTotal)}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  @{formatCurrency(line.unitPrice)}
                                </span>
                              </div>
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
                    {/* Subtotal */}
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal (Gross):</span>
                      <span className="font-mono">{formatCurrency(cartSubtotal)}</span>
                    </div>

                    {/* Item Discount Savings */}
                    {cartItemDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Cart Item Savings:</span>
                        <span className="font-mono">-{formatCurrency(cartItemDiscount)}</span>
                      </div>
                    )}

                    {/* Manual Discount Row */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setIsManualDiscountOpen(!isManualDiscountOpen)}
                        className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{isManualDiscountOpen ? 'Hide Override Discount' : '+ Manual Override Discount'}</span>
                      </button>
                      {cartManualDiscount > 0 && (
                        <span className="font-mono text-purple-400 font-bold">
                          -{formatCurrency(cartManualDiscount)}
                        </span>
                      )}
                    </div>

                    {/* Manual Discount Form Box */}
                    {isManualDiscountOpen && (
                      <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-purple-300 font-bold">Discount %:</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={posManualDiscountPercent || ''}
                            onChange={e => setPosManualDiscountPercent(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                            placeholder="0%"
                            className="w-16 px-2 py-1 rounded bg-slate-900 border border-purple-500/50 text-white font-mono text-center"
                          />
                        </div>
                        <input
                          type="text"
                          value={posManualDiscountReason}
                          onChange={e => setPosManualDiscountReason(e.target.value)}
                          placeholder="Mandatory reason for discount override..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-purple-500/50 text-white text-[11px]"
                        />
                      </div>
                    )}

                    {/* Round-off */}
                    {cartRoundOff !== 0 && (
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Round-Off:</span>
                        <span className="font-mono">{cartRoundOff > 0 ? `+${cartRoundOff.toFixed(2)}` : cartRoundOff.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Grand Total */}
                    <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                      <span>GRAND BILL TOTAL:</span>
                      <span className="font-mono text-emerald-400 text-base">{formatCurrency(cartNetTotal)}</span>
                    </div>

                    {/* Payment Mode Selector */}
                    <div className="grid grid-cols-5 gap-1 pt-1">
                      {(['Cash', 'Card', 'UPI', 'Health Wallet', 'Bank Transfer'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPosPaymentMode(mode)}
                          className={`py-1.5 rounded-xl text-[9.5px] font-bold border transition ${
                            posPaymentMode === mode
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    {/* Cash Tender & Automatic Change Calculation */}
                    {posPaymentMode === 'Cash' ? (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              Cash Received (₹)
                            </label>
                            <input
                              type="number"
                              placeholder={cartNetTotal.toString()}
                              value={posCashReceivedInput}
                              onChange={e => setPosCashReceivedInput(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-emerald-400 font-bold block mb-1">
                              Automatic Change
                            </label>
                            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-black text-sm">
                              {formatCurrency(posChangeGiven)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Non-Cash Paid & Due */
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Paid Amount (₹)</label>
                          <input
                            type="number"
                            placeholder={cartNetTotal.toString()}
                            value={posPaidAmountInput}
                            onChange={e => setPosPaidAmountInput(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Due Balance</label>
                          <div
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                              posDueAmount > 0
                                ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                                : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {formatCurrency(posDueAmount)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dispense Action Button */}
                    <button
                      onClick={handleExecuteDispense}
                      disabled={isDispensing}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isDispensing
                          ? 'Dispensing & Generating A4 Invoice...'
                          : `Complete & Generate Bill (${formatCurrency(cartNetTotal)})`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================================
              RECENT RETAIL PHARMACY BILLS & AUDIT HISTORY
              =================================================================== */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileText className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Retail Billing History & Invoice Archive
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Search past retail sales, print official A4 half-page invoices, reprint, or process authorized reversals
                  </p>
                </div>
              </div>

              {/* Status Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={posBillSearchTerm}
                    onChange={e => setPosBillSearchTerm(e.target.value)}
                    placeholder="Search by Invoice, Customer, Phone, Cashier..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-64"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-[10px]">
                  {(['all', 'dispensed', 'cancelled', 'returned'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPosBillStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-bold capitalize transition ${
                        posBillStatusFilter === st
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* History Table */}
            <div className="rounded-2xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Invoice No.</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Customer / Patient</th>
                    <th className="px-3 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-right">Net Bill</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sales
                    .filter(s => s.sourceType === 'RETAIL' || s.saleType === 'RETAIL' || !s.prescriptionId)
                    .filter(s => {
                      if (posBillStatusFilter !== 'all' && s.status !== posBillStatusFilter) return false;
                      if (!posBillSearchTerm.trim()) return true;
                      const q = posBillSearchTerm.toLowerCase();
                      return (
                        s.invoiceNumber.toLowerCase().includes(q) ||
                        s.patientName.toLowerCase().includes(q) ||
                        (s.patientPhone && s.patientPhone.includes(q)) ||
                        (s.patientId && s.patientId.toLowerCase().includes(q)) ||
                        (s.dispensedBy && s.dispensedBy.toLowerCase().includes(q))
                      );
                    })
                    .map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                          {sale.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                          {formatDateTime(sale.saleDate)}
                        </td>
                        <td className="px-4 py-3">
                          <strong className="text-white block">{sale.patientName}</strong>
                          {sale.patientPhone && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Ph: {sale.patientPhone}
                            </span>
                          )}
                          {sale.patientCardNo && (
                            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {sale.patientCardNo}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-slate-300">
                          {sale.items.length}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                          {formatCurrency(sale.netTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
                          {formatCurrency(sale.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-[11px]">
                          <span className="font-mono uppercase">{sale.paymentMethod}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                          {sale.dispensedBy}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              sale.status === 'dispensed'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                : sale.status === 'cancelled'
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View / Print A4 Half-Page */}
                            <button
                              type="button"
                              onClick={() => setPrintedSale(sale)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1 border border-slate-700"
                              title="Preview and Print Official A4 Half-Page Invoice"
                            >
                              <Printer className="w-3 h-3 text-emerald-400" />
                              <span>Print</span>
                            </button>

                            {/* Reprint */}
                            {sale.status === 'dispensed' && (
                              <button
                                type="button"
                                onClick={() => handleReprintSale(sale)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold transition flex items-center gap-1 border border-slate-700"
                                title="Official Reprint with audit logging"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reprint</span>
                              </button>
                            )}

                            {/* Cancel / Reverse */}
                            {sale.status === 'dispensed' && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancelModal(sale)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 text-[10px] font-medium transition border border-slate-700 hover:border-rose-500/30"
                                title="Non-destructive cancellation and reversal"
                              >
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: PRESCRIPTION PHARMACY (DOCTOR RX DISPENSING)
          ===================================================================== */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {/* Top Operational Header */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Stethoscope className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    Prescription Pharmacy Queue
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    Doctor Approved • Clinical Review
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Doctor-signed prescriptions from OPD, IPD, and Emergency • Pharmacist clinical verification, FEFO batch allocation & Rx labeling
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExternalRxModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enter External Rx</span>
              </button>
            </div>
          </div>

          {/* Queue Filter Bar */}
          <div className="flex items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              {(['pending', 'dispensed', 'all'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setRxFilter(tabKey)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition capitalize text-xs ${
                    rxFilter === tabKey
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tabKey === 'all'
                    ? `All Prescriptions (${doctorPrescriptions.length})`
                    : tabKey === 'pending'
                    ? `Pending Dispense (${doctorPrescriptions.filter(r => !r.isDispensed).length})`
                    : `Dispensed (${doctorPrescriptions.filter(r => r.isDispensed).length})`}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              Series: <strong className="text-cyan-400">PHARM-RX</strong>
            </span>
          </div>

          {/* Prescriptions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctorPrescriptions
              .filter(rx => {
                if (rxFilter === 'pending') return !rx.isDispensed;
                if (rxFilter === 'dispensed') return rx.isDispensed;
                return true;
              })
              .length === 0 ? (
              <div className="col-span-full p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs space-y-2">
                <Stethoscope className="w-8 h-8 mx-auto text-slate-600" />
                <p>No prescriptions found for the selected filter.</p>
              </div>
            ) : (
              doctorPrescriptions
                .filter(rx => {
                  if (rxFilter === 'pending') return !rx.isDispensed;
                  if (rxFilter === 'dispensed') return rx.isDispensed;
                  return true;
                })
                .map(rx => (
                  <div
                    key={rx.encounterId}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-xl relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-sm text-white block">{rx.patientName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Rx: #{rx.encounterNo} • {formatDate(rx.date)}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                            rx.isDispensed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {rx.isDispensed ? 'DISPENSED' : 'PENDING DISPENSE'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-400 font-bold">Dr. {rx.doctorName}</span>
                          <span className="text-[9px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-900">
                            {rx.sourceType || 'OPD'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {rx.doctorSpeciality || 'Consultant Physician'}
                        </div>
                        {rx.diagnoses && rx.diagnoses.length > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Diagnosis: <strong>{rx.diagnoses.join(', ')}</strong>
                          </div>
                        )}
                        {rx.cardNo && (
                          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Health Card: {rx.cardNo}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Prescribed Medicines ({rx.medications.length})
                        </span>
                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                          {rx.medications.map((m, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center"
                            >
                              <div>
                                <div className="font-bold text-white text-[11px]">{m.name}</div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  {m.dosage} • {m.frequency} • {m.duration}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      {rx.isDispensed ? (
                        <button
                          onClick={() => handleOpenDispensedInvoice(rx.dispensedInvoiceNo!)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                        >
                          <Printer className="w-4 h-4" />
                          <span>View Invoice #{rx.dispensedInvoiceNo}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDispenseRxModal(rx)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition shadow-md shadow-cyan-600/30 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Dispense Rx (FEFO)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: SALES & RX RETURNS (INSPECTION & RESTOCKING AUDIT)
          ===================================================================== */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <RotateCcw className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    Pharmacy Sales & Prescription Returns
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Mandatory Quality Inspection
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Separated handling for Retail OTC returns and Doctor Prescription returns • Inspection gate for restocking vs quarantine disposal
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setReturnFormType('RETAIL');
                setIsReturnModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-md shadow-amber-600/30 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Process Sales Return</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              {(['ALL', 'RETAIL', 'PRESCRIPTION'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setReturnsFilter(tabKey)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition capitalize text-xs ${
                    returnsFilter === tabKey
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tabKey === 'ALL'
                    ? `All Returns (${salesReturns.length})`
                    : tabKey === 'RETAIL'
                    ? `Retail Returns (${salesReturns.filter(r => r.returnType === 'RETAIL').length})`
                    : `Prescription Returns (${salesReturns.filter(r => r.returnType === 'PRESCRIPTION').length})`}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Total Returns: <strong className="text-amber-400">{salesReturns.length} logged</strong>
            </span>
          </div>

          {/* Returns Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Return ID & Date</th>
                    <th className="px-4 py-3">Workflow Type</th>
                    <th className="px-4 py-3">Invoice Ref</th>
                    <th className="px-4 py-3">Medicine & Batch</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3">Pharmacist Inspection</th>
                    <th className="px-4 py-3 text-right">Refund Amount</th>
                    <th className="px-4 py-3">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {salesReturns
                    .filter(ret => {
                      if (returnsFilter === 'RETAIL') return ret.returnType === 'RETAIL';
                      if (returnsFilter === 'PRESCRIPTION') return ret.returnType === 'PRESCRIPTION';
                      return true;
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No sales returns recorded in this view.
                      </td>
                    </tr>
                  ) : (
                    salesReturns
                      .filter(ret => {
                        if (returnsFilter === 'RETAIL') return ret.returnType === 'RETAIL';
                        if (returnsFilter === 'PRESCRIPTION') return ret.returnType === 'PRESCRIPTION';
                        return true;
                      })
                      .map(ret => (
                        <tr key={ret.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-bold text-white">
                            <div>{ret.returnNumber}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{formatDateTime(ret.returnDate)}</div>
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                ret.returnType === 'PRESCRIPTION'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {ret.returnType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-300">
                            <div>{ret.originalInvoiceNo}</div>
                            {ret.prescriptionId && (
                              <div className="text-[9px] text-cyan-400">Rx Ref: #{ret.prescriptionId.slice(-6)}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <div>
                              <span className="font-bold text-white">{ret.medicineName}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Batch: {ret.batchNumber}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-white">
                            {ret.quantity}
                          </td>
                          <td className="px-4 py-3 font-sans">
                            {ret.stockAction === 'return_to_active' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                                Restocked to Shelf
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950 text-rose-300 border border-rose-500/30">
                                Quarantined / Scrapped
                              </span>
                            )}
                            <div className="text-[10px] text-slate-400 mt-0.5 italic">{ret.returnReason}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-400">
                            -{formatCurrency(ret.refundAmount)}
                          </td>
                          <td className="px-4 py-3 font-sans text-slate-400 text-[11px]">
                            {ret.authorizedBy}
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
          MODAL: PRESCRIPTION DISPENSE & CLINICAL VERIFICATION
          ===================================================================== */}
      {selectedRxForDispense && (
        <Modal
          isOpen={!!selectedRxForDispense}
          onClose={() => setSelectedRxForDispense(null)}
          title={`Clinical Verification & Dispensing: Rx #${selectedRxForDispense.encounterNo}`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs text-slate-300">
            {/* 1. Header Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Patient Information</span>
                <strong className="text-white text-sm block mt-0.5">{selectedRxForDispense.patientName}</strong>
                <div className="text-slate-400 text-[11px] font-mono">
                  {selectedRxForDispense.patientPhone || 'No contact provided'}
                </div>
                {selectedRxForDispense.cardNo && (
                  <div className="text-emerald-400 font-bold font-mono text-[10px] mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Card: {selectedRxForDispense.cardNo}
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Prescribing Doctor</span>
                <strong className="text-cyan-400 text-sm block mt-0.5">Dr. {selectedRxForDispense.doctorName}</strong>
                <div className="text-slate-400 text-[11px]">
                  {selectedRxForDispense.doctorSpeciality || 'Consultant Physician'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Dept: {selectedRxForDispense.sourceType || 'OPD'}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Prescription Ref</span>
                <div className="font-mono text-white text-xs font-bold mt-0.5">
                  Encounter #{selectedRxForDispense.encounterNo}
                </div>
                <div className="text-slate-400 text-[10px] font-mono">
                  Prescribed: {formatDate(selectedRxForDispense.date)}
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Doctor Signature Verified
                </span>
              </div>
            </div>

            {/* 2. Medication Allocation Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Prescribed Medicines & FEFO Batch Allocation
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Earliest Expiry Batch Pre-Selected
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Prescribed Drug</th>
                      <th className="px-3 py-2.5">Dosage / Instructions</th>
                      <th className="px-3 py-2.5">Assigned Batch (FEFO)</th>
                      <th className="px-3 py-2.5 text-center">Dispense Qty</th>
                      <th className="px-3 py-2.5 text-right">Unit Rate</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rxDispenseLines.map((line, idx) => {
                      const availBatches = batches.filter(b => b.medicineId === line.medicineId && b.availableQty > 0);
                      const lineTotal = line.unitPrice * line.quantity * (1 - line.discountPercent / 100);

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-white">{line.prescribedName}</div>
                            <div className="text-[10px] text-slate-400">
                              {medicines.find(m => m.id === line.medicineId)?.genericName || 'Matched SKU'}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-300 text-[11px]">
                            <div>{line.dosage || '1 Tablet'}</div>
                            <div className="text-[10px] text-slate-500">{line.frequency} • {line.duration}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            {availBatches.length > 0 ? (
                              <select
                                value={line.batchId}
                                onChange={e => {
                                  const chosen = availBatches.find(b => b.id === e.target.value);
                                  setRxDispenseLines(prev =>
                                    prev.map((l, i) =>
                                      i === idx && chosen
                                        ? {
                                            ...l,
                                            batchId: chosen.id,
                                            batchNumber: chosen.batchNumber,
                                            expiryDate: chosen.expiryDate,
                                            availableQty: chosen.availableQty,
                                            unitPrice: chosen.sellingPrice
                                          }
                                        : l
                                    )
                                  );
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-[11px]"
                              >
                                {availBatches.map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.batchNumber} (Exp: {b.expiryDate} • Avail: {b.availableQty})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 px-2 py-1 rounded border border-rose-500/30">
                                Stock Out - Substitute Needed
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              max={line.availableQty || 100}
                              value={line.quantity}
                              onChange={e => {
                                const q = parseInt(e.target.value) || 1;
                                setRxDispenseLines(prev =>
                                  prev.map((l, i) => (i === idx ? { ...l, quantity: q } : l))
                                );
                              }}
                              className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-center font-bold"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                            {formatCurrency(line.unitPrice)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-cyan-400">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Clinical Pharmacist Safety Checklist */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px] block">
                Mandatory Pharmacist Clinical Safety Sign-Off
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rxSafetyChecks.dosageVerified}
                    onChange={e =>
                      setRxSafetyChecks(prev => ({ ...prev, dosageVerified: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-0"
                  />
                  <span className="text-xs text-white">Dosage & Regimen Verified</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rxSafetyChecks.allergyScreened}
                    onChange={e =>
                      setRxSafetyChecks(prev => ({ ...prev, allergyScreened: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-0"
                  />
                  <span className="text-xs text-white">Allergies & Contraindications Screened</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rxSafetyChecks.interactionChecked}
                    onChange={e =>
                      setRxSafetyChecks(prev => ({ ...prev, interactionChecked: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-0"
                  />
                  <span className="text-xs text-white">Drug-Drug Interactions Checked</span>
                </label>
              </div>

              <div className="pt-2">
                <input
                  type="text"
                  value={rxPharmacistNotes}
                  onChange={e => setRxPharmacistNotes(e.target.value)}
                  placeholder="Clinical dispensing remarks / patient advisory instructions..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* 4. Payment & Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="space-y-2">
                <span className="font-bold text-slate-400 text-[10px] uppercase block">Payment Mode</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Cash', 'Card', 'UPI', 'Health Wallet'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRxPaymentMode(mode)}
                      className={`py-1.5 rounded-xl text-[10px] font-bold border transition ${
                        rxPaymentMode === mode
                          ? 'bg-cyan-600 text-white border-cyan-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    value={rxPaidAmountInput}
                    placeholder={rxDispenseNetTotal.toString()}
                    onChange={e => setRxPaidAmountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-right flex flex-col justify-end">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Value:</span>
                  <span>{formatCurrency(rxDispenseSubtotal)}</span>
                </div>
                {rxDispenseDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Card Discount:</span>
                    <span>-{formatCurrency(rxDispenseDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>Net Payable:</span>
                  <span className="text-cyan-400">{formatCurrency(rxDispenseNetTotal)}</span>
                </div>
              </div>
            </div>

            {/* 5. Footer Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRxForDispense(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispenseRx}
                disabled={isDispensingRx}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isDispensingRx ? 'Dispensing Rx...' : `Confirm & Dispense Rx ${formatCurrency(rxDispenseNetTotal)}`}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =====================================================================
          MODAL: PROCESS SALES RETURN WITH PHARMACIST QUALITY INSPECTION
          ===================================================================== */}
      {isReturnModalOpen && (
        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title="Process Medicine Return (Quality Inspection & Restocking Audit)"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveReturnSubmit} className="space-y-4 text-xs">
            {/* Return Workflow Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setReturnFormType('RETAIL');
                  setReturnSelectedSaleId('');
                }}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  returnFormType === 'RETAIL'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Retail Return (OTC Customer)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReturnFormType('PRESCRIPTION');
                  setReturnSelectedSaleId('');
                }}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  returnFormType === 'PRESCRIPTION'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Prescription Return (Doctor / Ward)</span>
              </button>
            </div>

            {/* Sale Invoice Selection */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Select Original {returnFormType === 'RETAIL' ? 'Retail (PHARM-RET)' : 'Prescription (PHARM-RX)'} Invoice *
              </label>
              <select
                value={returnSelectedSaleId}
                onChange={e => {
                  const saleId = e.target.value;
                  setReturnSelectedSaleId(saleId);
                  const sale = sales.find(s => s.id === saleId);
                  if (sale && sale.items.length > 0) {
                    setReturnSelectedMedicineId(sale.items[0].medicineId);
                    setReturnSelectedBatchId(sale.items[0].batchId);
                    setReturnUnitPrice(sale.items[0].unitPrice);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
                required
              >
                <option value="">-- Choose Invoice to Return Against --</option>
                {eligibleReturnSales.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.invoiceNumber} • {s.patientName} ({formatDate(s.saleDate)}) • {s.items.length} item(s) • {formatCurrency(s.netTotal)}
                  </option>
                ))}
              </select>
            </div>

            {/* Item Selection from Invoice */}
            {selectedReturnSaleObj && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Returned Medicine Item *</label>
                  <select
                    value={`${returnSelectedMedicineId}_${returnSelectedBatchId}`}
                    onChange={e => {
                      const [medId, batchId] = e.target.value.split('_');
                      setReturnSelectedMedicineId(medId);
                      setReturnSelectedBatchId(batchId);
                      const item = selectedReturnSaleObj.items.find(i => i.medicineId === medId && i.batchId === batchId);
                      if (item) {
                        setReturnUnitPrice(item.unitPrice);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
                    required
                  >
                    {selectedReturnSaleObj.items.map(item => (
                      <option key={`${item.medicineId}_${item.batchId}`} value={`${item.medicineId}_${item.batchId}`}>
                        {item.medicineName} • Batch: {item.batchNumber} (Sold: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Return Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={returnQuantity}
                    onChange={e => setReturnQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                    required
                  />
                </div>
              </div>
            )}

            {/* MANDATORY PHARMACIST QUALITY INSPECTION */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] block">
                Mandatory Pharmacist Inspection & Quarantine Decision
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2 cursor-pointer transition ${
                    returnRestockCondition === 'restockable'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="inspection"
                    checked={returnRestockCondition === 'restockable'}
                    onChange={() => setReturnRestockCondition('restockable')}
                    className="mt-0.5 text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <strong className="block text-xs text-emerald-300">Passed Inspection (Restockable)</strong>
                    <span className="text-[10px] text-slate-400">
                      Unopened packaging, intact strip, cold chain maintained. Will return to sellable batch stock.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-2 cursor-pointer transition ${
                    returnRestockCondition === 'damaged_quarantined'
                      ? 'bg-rose-950/40 border-rose-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="inspection"
                    checked={returnRestockCondition === 'damaged_quarantined'}
                    onChange={() => setReturnRestockCondition('damaged_quarantined')}
                    className="mt-0.5 text-rose-600 focus:ring-0"
                  />
                  <div>
                    <strong className="block text-xs text-rose-300">Failed / Quarantined (Scrap)</strong>
                    <span className="text-[10px] text-slate-400">
                      Broken seal, damaged foil, temperature breach, or expired. Will NOT be restocked.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Mandatory Auditable Reason *
              </label>
              <textarea
                rows={2}
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="e.g. Doctor stopped medication, adverse reaction, patient over-purchased OTC..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-amber-500"
                required
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <div className="text-xs">
                <span className="text-slate-400">Refund Amount: </span>
                <strong className="text-amber-400 font-mono text-sm">
                  {formatCurrency(returnUnitPrice * returnQuantity)}
                </strong>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-md shadow-amber-600/30 disabled:opacity-50"
                >
                  {isSubmittingReturn ? 'Auditing Return...' : 'Confirm Inspected Return'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          MODAL: MANUAL EXTERNAL DOCTOR PRESCRIPTION ENTRY
          ===================================================================== */}
      {isExternalRxModalOpen && (
        <Modal
          isOpen={isExternalRxModalOpen}
          onClose={() => setIsExternalRxModalOpen(false)}
          title="Enter Valid External Doctor Prescription"
          maxWidth="lg"
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!externalRxForm.patientName || !externalRxForm.doctorName) {
                showToast('error', 'Missing Information', 'Patient name and doctor name are required.');
                return;
              }
              showToast('success', 'External Rx Logged', `Prescription for ${externalRxForm.patientName} added to verification queue.`);
              setIsExternalRxModalOpen(false);
              setExternalRxForm({
                patientName: '',
                patientPhone: '',
                doctorName: '',
                doctorRegNo: '',
                hospitalOrClinic: '',
                medicinesText: ''
              });
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  value={externalRxForm.patientName}
                  onChange={e => setExternalRxForm({ ...externalRxForm, patientName: e.target.value })}
                  placeholder="e.g. Ananya Das"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Patient Phone</label>
                <input
                  type="text"
                  value={externalRxForm.patientPhone}
                  onChange={e => setExternalRxForm({ ...externalRxForm, patientPhone: e.target.value })}
                  placeholder="e.g. 9831098765"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Prescribing Doctor *</label>
                <input
                  type="text"
                  value={externalRxForm.doctorName}
                  onChange={e => setExternalRxForm({ ...externalRxForm, doctorName: e.target.value })}
                  placeholder="e.g. Dr. A. K. Banerjee"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Medical Council Reg No</label>
                <input
                  type="text"
                  value={externalRxForm.doctorRegNo}
                  onChange={e => setExternalRxForm({ ...externalRxForm, doctorRegNo: e.target.value })}
                  placeholder="e.g. MCI-58291"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Hospital / Clinic Name</label>
              <input
                type="text"
                value={externalRxForm.hospitalOrClinic}
                onChange={e => setExternalRxForm({ ...externalRxForm, hospitalOrClinic: e.target.value })}
                placeholder="e.g. Apollo Gleneagles Hospital, Kolkata"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Prescribed Medicines & Instructions</label>
              <textarea
                rows={3}
                value={externalRxForm.medicinesText}
                onChange={e => setExternalRxForm({ ...externalRxForm, medicinesText: e.target.value })}
                placeholder="List medications with dosage, frequency, and duration..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsExternalRxModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-md shadow-cyan-600/30"
              >
                Log Prescription
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          MODAL: OFFICIAL A4 HALF-PAGE PHARMACY TAX INVOICE PRINT / REPRINT / PDF
          ===================================================================== */}
      {printedSale && (
        <PharmacyBillPrintModal
          isOpen={!!printedSale}
          onClose={() => setPrintedSale(null)}
          sale={printedSale}
          patient={selectedPatientObj}
          card={activePatientCard}
          onSaleUpdated={(updated) => {
            setSales(PharmacyService.getSales());
            setPrintedSale(updated);
          }}
        />
      )}

      {/* =====================================================================
          MODAL: HELD BILLS QUEUE
          ===================================================================== */}
      <RetailPosHoldBillsModal
        isOpen={isHoldBillsModalOpen}
        onClose={() => setIsHoldBillsModalOpen(false)}
        heldBills={heldBills}
        onResumeBill={handleResumeHeldBill}
        onDeleteBill={(id) => {
          PharmacyService.deleteHeldBill(id);
          setHeldBills(PharmacyService.getHeldBills());
          showToast('info', 'Held Bill Discarded', 'Unfinished cart removed from queue.');
        }}
      />

      {/* =====================================================================
          MODAL: PHARMACY SHIFT / DAY CLOSING
          ===================================================================== */}
      <PharmacyShiftClosingModal
        isOpen={isShiftClosingModalOpen}
        onClose={() => setIsShiftClosingModalOpen(false)}
        onShiftClosed={(closing) => {
          showToast('success', 'Shift Closed', `Day closing record ${closing.shiftNumber} saved and verified.`);
        }}
      />

      {/* =====================================================================
          MODAL: NON-DESTRUCTIVE BILL CANCELLATION
          ===================================================================== */}
      {cancellingSale && (
        <PharmacyBillCancelModal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false);
            setCancellingSale(null);
          }}
          sale={cancellingSale}
          onSaleCancelled={(cancelled) => {
            setSales(PharmacyService.getSales());
            setBatches(PharmacyService.getBatches());
            setTransactions(PharmacyService.getPharmacyTransactions());
            setMovements(PharmacyService.getStockMovements());
            showToast('info', 'Bill Cancelled', `Invoice ${cancelled.invoiceNumber} has been reversed and marked cancelled.`);
          }}
        />
      )}
    </div>
  );
};
