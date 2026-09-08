import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PortalService, MedicineOrder } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { PharmacyService, PharmacyInventoryItem, StockMovement } from '../../services/pharmacyService';
import { HospitalBill } from '../../services/billService';
import { Patient, HealthCard, Membership, Wallet } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { DirectMedicineOrderModal } from '../../components/portal/DirectMedicineOrderModal';
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
  CreditCard
} from 'lucide-react';

type PharmacyTab = 'pos' | 'inventory' | 'stock_in' | 'alerts' | 'orders';

interface POSCartItem {
  medicine: PharmacyInventoryItem;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export const PharmacyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<PharmacyTab>('pos');

  // Core Data
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>(() => PharmacyService.getInventory());
  const [movements, setMovements] = useState<StockMovement[]>(() => PharmacyService.getStockMovements());
  const [orders, setOrders] = useState<MedicineOrder[]>(() => PortalService.getPharmacyOrders());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getMemberships());
  const [wallets, setWallets] = useState<Wallet[]>(() => StorageService.getWallets());

  const [isRefreshing, setIsRefreshing] = useState(false);

  // POS State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('walkin');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI' | 'Health Wallet'>('Cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispensedBillReceipt, setDispensedBillReceipt] = useState<HospitalBill | null>(null);

  // Inventory Filter & Form State
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<PharmacyInventoryItem | null>(null);
  const [medFormData, setMedFormData] = useState({
    name: '',
    genericComposition: '',
    brand: '',
    category: 'General',
    dosageForm: 'Tablet',
    strength: '',
    packaging: 'Strip of 10 Tablets',
    batchNumber: '',
    expiryDate: '',
    purchasePrice: 0,
    sellingPrice: 0,
    stockQuantity: 50,
    minStockLevel: 15,
    rackLocation: 'Rack A-1',
    prescriptionRequired: false,
    supplier: 'MedLife Distributing Corp'
  });

  // Stock In Form State
  const [stockInMedId, setStockInMedId] = useState<string>('');
  const [stockInQty, setStockInQty] = useState<number>(10);
  const [stockInBatch, setStockInBatch] = useState<string>('');
  const [stockInExpiry, setStockInExpiry] = useState<string>('');
  const [stockInPurchasePrice, setStockInPurchasePrice] = useState<number>(0);
  const [stockInSellingPrice, setStockInSellingPrice] = useState<number>(0);
  const [stockInSupplier, setStockInSupplier] = useState<string>('');
  const [stockInNotes, setStockInNotes] = useState<string>('');
  const [isSubmittingStockIn, setIsSubmittingStockIn] = useState(false);

  // Orders Tab Filter & State
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<string>('all');
  const [inspectOrder, setInspectOrder] = useState<MedicineOrder | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [activePatientForOrder, setActivePatientForOrder] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Real-time Firestore synchronization
  useEffect(() => {
    const unsubInv = ApiSyncService.subscribeToCollection<PharmacyInventoryItem>('pharmacyInventory', (items) => {
      if (items && items.length > 0) {
        setInventory(items);
        PharmacyService.saveInventoryList(items);
      }
    });

    const unsubOrders = ApiSyncService.subscribeToCollection<MedicineOrder>('pharmacyOrders', () => {
      setOrders(PortalService.getPharmacyOrders());
    });

    const handleSync = (e: CustomEvent) => {
      if (!e.detail?.key || e.detail.key === 'labmedix_pharmacy_inventory_v1') {
        setInventory(PharmacyService.getInventory());
        setMovements(PharmacyService.getStockMovements());
      }
      if (!e.detail?.key || e.detail.key === 'labmedix_portal_pharmacy_orders_v1') {
        setOrders(PortalService.getPharmacyOrders());
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    return () => {
      unsubInv();
      unsubOrders();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      setInventory(PharmacyService.getInventory());
      setMovements(PharmacyService.getStockMovements());
      setOrders(PortalService.getPharmacyOrders());
      setPatients(StorageService.getPatients());
      showToast('success', 'Central Sync Complete', 'Pharmacy inventory, ledger and orders refreshed.');
    } catch {
      setInventory(PharmacyService.getInventory());
      setOrders(PortalService.getPharmacyOrders());
      showToast('info', 'Local Cache Updated', 'Pharmacy data refreshed from local storage.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // POS Calculations
  const selectedPatientObj = useMemo(() => {
    if (selectedPatientId === 'walkin') return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [selectedPatientId, patients]);

  const patientCard = useMemo(() => {
    if (!selectedPatientObj) return null;
    return cards.find(c => c.patientId === selectedPatientObj.id && c.status === 'active') || null;
  }, [selectedPatientObj, cards]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const cartDiscount = useMemo(() => {
    return cart.reduce((acc, item) => {
      const discount = (item.unitPrice * item.quantity * (item.discountPercent || 0)) / 100;
      return acc + discount;
    }, 0);
  }, [cart]);

  const cartNetTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - cartDiscount);
  }, [cartSubtotal, cartDiscount]);

  const posPaidAmount = useMemo(() => {
    if (paidAmountInput === '') return cartNetTotal;
    const val = parseFloat(paidAmountInput);
    return isNaN(val) ? 0 : val;
  }, [paidAmountInput, cartNetTotal]);

  const posDueAmount = useMemo(() => {
    return Math.max(0, cartNetTotal - posPaidAmount);
  }, [cartNetTotal, posPaidAmount]);

  // POS Add to Cart
  const handleAddToCart = (med: PharmacyInventoryItem) => {
    if (med.stockQuantity <= 0) {
      showToast('error', 'Out of Stock', `"${med.name}" has 0 units in stock. Cannot dispense.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.medicine.id === med.id);
      if (existing) {
        if (existing.quantity >= med.stockQuantity) {
          showToast('warning', 'Stock Limit Reached', `Only ${med.stockQuantity} units of "${med.name}" available.`);
          return prev;
        }
        return prev.map(item =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          medicine: med,
          quantity: 1,
          unitPrice: med.sellingPrice,
          discountPercent: 0
        }
      ];
    });
  };

  const handleUpdateCartQty = (medId: string, newQty: number) => {
    const item = cart.find(c => c.medicine.id === medId);
    if (!item) return;

    if (newQty <= 0) {
      setCart(prev => prev.filter(c => c.medicine.id !== medId));
      return;
    }

    if (newQty > item.medicine.stockQuantity) {
      showToast('warning', 'Stock Limit Exceeded', `Cannot dispense more than available stock (${item.medicine.stockQuantity}).`);
      return;
    }

    setCart(prev =>
      prev.map(c => (c.medicine.id === medId ? { ...c, quantity: newQty } : c))
    );
  };

  const handleUpdateCartDiscount = (medId: string, discount: number) => {
    const clamped = Math.max(0, Math.min(100, discount));
    setCart(prev =>
      prev.map(c => (c.medicine.id === medId ? { ...c, discountPercent: clamped } : c))
    );
  };

  // Dispense Action
  const handleDispense = async () => {
    if (cart.length === 0) {
      showToast('error', 'Cart Empty', 'Please add medicines to the cart before dispensing.');
      return;
    }

    const patientName = selectedPatientObj ? selectedPatientObj.fullName : walkinName.trim() || 'Walk-in Customer';
    const patientPhone = selectedPatientObj ? selectedPatientObj.mobile : walkinPhone.trim() || '';

    setIsDispensing(true);
    try {
      const result = await PharmacyService.dispense({
        patientId: selectedPatientObj ? selectedPatientObj.id : undefined,
        patientName,
        patientPhone,
        doctorName: doctorName.trim() || undefined,
        cardNo: patientCard ? patientCard.cardNumber : undefined,
        paymentMode,
        paidAmount: posPaidAmount,
        notes: `POS Dispensed: ${cart.length} item(s)`,
        performedBy: currentUser?.fullName || 'Pharmacy Staff',
        items: cart.map(c => ({
          medicineId: c.medicine.id,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          discountPercent: c.discountPercent
        }))
      });

      setInventory(result.items);
      setMovements(PharmacyService.getStockMovements());
      setDispensedBillReceipt(result.bill);
      setCart([]);
      setPaidAmountInput('');
      setWalkinName('');
      setWalkinPhone('');
      setDoctorName('');
      showToast('success', 'Dispense Successful', `Bill #${result.bill.billNumber} created with live ledger sync.`);
    } catch (err: any) {
      showToast('error', 'Dispense Failed', err?.message || 'Could not complete dispensing.');
    } finally {
      setIsDispensing(false);
    }
  };

  // Stock In Submission
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInMedId) {
      showToast('error', 'Select Medicine', 'Please choose a medicine to stock in.');
      return;
    }
    if (stockInQty <= 0) {
      showToast('error', 'Invalid Quantity', 'Stock In quantity must be greater than zero.');
      return;
    }

    setIsSubmittingStockIn(true);
    try {
      const updated = await PharmacyService.stockIn({
        medicineId: stockInMedId,
        quantity: stockInQty,
        batchNumber: stockInBatch.trim() || undefined,
        expiryDate: stockInExpiry.trim() || undefined,
        purchasePrice: stockInPurchasePrice > 0 ? stockInPurchasePrice : undefined,
        sellingPrice: stockInSellingPrice > 0 ? stockInSellingPrice : undefined,
        supplier: stockInSupplier.trim() || undefined,
        notes: stockInNotes.trim() || undefined,
        performedBy: currentUser?.fullName || 'Staff'
      });

      setInventory(PharmacyService.getInventory());
      setMovements(PharmacyService.getStockMovements());
      showToast('success', 'Stock Added', `Added ${stockInQty} units to ${updated.name}. New stock: ${updated.stockQuantity}`);
      setStockInQty(10);
      setStockInNotes('');
    } catch (err: any) {
      showToast('error', 'Stock In Failed', err?.message || 'Could not record stock in.');
    } finally {
      setIsSubmittingStockIn(false);
    }
  };

  // Pre-fill Stock In from Medicine selection
  const handleSelectMedForStockIn = (medId: string) => {
    setStockInMedId(medId);
    const med = inventory.find(m => m.id === medId);
    if (med) {
      setStockInBatch(med.batchNumber || '');
      setStockInExpiry(med.expiryDate || '');
      setStockInPurchasePrice(med.purchasePrice || 0);
      setStockInSellingPrice(med.sellingPrice || 0);
      setStockInSupplier(med.supplier || '');
    }
  };

  // Medicine Save / Edit
  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medFormData.name.trim()) {
      showToast('error', 'Name Required', 'Medicine name is required.');
      return;
    }
    if (medFormData.sellingPrice <= 0) {
      showToast('error', 'Price Required', 'Selling price (MRP) must be greater than zero.');
      return;
    }

    try {
      await PharmacyService.saveMedicine({
        id: editingMedicine ? editingMedicine.id : undefined,
        ...medFormData
      });
      setInventory(PharmacyService.getInventory());
      setIsAddMedicineModalOpen(false);
      setEditingMedicine(null);
      showToast('success', 'Medicine Saved', `"${medFormData.name}" updated in inventory master.`);
    } catch (err: any) {
      showToast('error', 'Save Failed', err?.message || 'Failed to save medicine.');
    }
  };

  const openEditModal = (med: PharmacyInventoryItem) => {
    setEditingMedicine(med);
    setMedFormData({
      name: med.name,
      genericComposition: med.genericComposition,
      brand: med.brand,
      category: med.category,
      dosageForm: med.dosageForm,
      strength: med.strength,
      packaging: med.packaging,
      batchNumber: med.batchNumber,
      expiryDate: med.expiryDate,
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      stockQuantity: med.stockQuantity,
      minStockLevel: med.minStockLevel,
      rackLocation: med.rackLocation,
      prescriptionRequired: med.prescriptionRequired,
      supplier: med.supplier || ''
    });
    setIsAddMedicineModalOpen(true);
  };

  const openAddModal = () => {
    setEditingMedicine(null);
    setMedFormData({
      name: '',
      genericComposition: '',
      brand: '',
      category: 'General',
      dosageForm: 'Tablet',
      strength: '',
      packaging: 'Strip of 10 Tablets',
      batchNumber: `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      purchasePrice: 0,
      sellingPrice: 0,
      stockQuantity: 30,
      minStockLevel: 15,
      rackLocation: 'Rack A-1',
      prescriptionRequired: false,
      supplier: 'MedLife Distributing Corp'
    });
    setIsAddMedicineModalOpen(true);
  };

  // Alerts logic
  const lowStockItems = useMemo(() => PharmacyService.getLowStockAlerts(), [inventory]);
  const expiryAlerts = useMemo(() => PharmacyService.getExpiryAlerts(90), [inventory]);

  // Inventory Filter
  const filteredInventory = useMemo(() => {
    return inventory.filter(med => {
      if (selectedCategory !== 'all' && med.category !== selectedCategory) return false;
      if (inventorySearch.trim()) {
        const q = inventorySearch.toLowerCase().trim();
        const matchName = med.name.toLowerCase().includes(q);
        const matchGen = med.genericComposition.toLowerCase().includes(q);
        const matchBrand = med.brand.toLowerCase().includes(q);
        const matchCode = med.code.toLowerCase().includes(q);
        const matchBatch = med.batchNumber.toLowerCase().includes(q);
        return matchName || matchGen || matchBrand || matchCode || matchBatch;
      }
      return true;
    });
  }, [inventory, selectedCategory, inventorySearch]);

  const categories = useMemo(() => {
    const set = new Set(inventory.map(m => m.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [inventory]);

  // Online Orders Filter
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (orderStatusFilter !== 'all' && ord.status !== orderStatusFilter) return false;
      if (orderDeliveryFilter !== 'all' && ord.deliveryMode !== orderDeliveryFilter) return false;

      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const matchesNo = (ord.orderNo || '').toLowerCase().includes(q);
        const matchesPatient = (ord.patientName || '').toLowerCase().includes(q);
        const matchesPhone = (ord.patientPhone || '').toLowerCase().includes(q);
        const matchesMed = (ord.items || []).some(item => (item.medicineName || '').toLowerCase().includes(q));
        if (!matchesNo && !matchesPatient && !matchesPhone && !matchesMed) {
          return false;
        }
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderDeliveryFilter, orderSearchQuery]);

  const handleAdvanceOrderStatus = (order: MedicineOrder) => {
    let nextStatus: MedicineOrder['status'] = 'packed';
    if (order.status === 'order_placed') nextStatus = 'packed';
    else if (order.status === 'packed') nextStatus = order.deliveryMode === 'express_home_delivery' ? 'out_for_delivery' : 'delivered';
    else if (order.status === 'out_for_delivery') nextStatus = 'delivered';

    const updated = PortalService.updatePharmacyOrderStatus(order.id, nextStatus);
    if (updated) {
      ApiSyncService.saveDocument('pharmacyOrders', updated.id, updated).catch(() => {});
      setOrders(PortalService.getPharmacyOrders());
      showToast('success', 'Status Advanced', `Order ${order.orderNo} is now ${nextStatus.replace(/_/g, ' ')}.`);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border border-emerald-500/30 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Pill className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Pharmacy & POS Dispensing Hub
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Live Inventory & Ledger
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Real-time medicine dispensing, zero negative-stock enforcement, batch/expiry tracking, and automated hospital billing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'pos'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS & Dispense</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-emerald-700 font-black">
              {cart.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Medicine Inventory</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {inventory.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stock_in')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'stock_in'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          <span>Stock In & Restock</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Stock & Expiry Alerts</span>
          {(lowStockItems.length > 0 || expiryAlerts.expired.length > 0 || expiryAlerts.expiringSoon.length > 0) && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
              {lowStockItems.length + expiryAlerts.expired.length + expiryAlerts.expiringSoon.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Delivery Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {orders.length}
          </span>
        </button>
      </div>

      {/* TAB 1: POS / DISPENSE COUNTER */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Medicine Search & Selector */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Medicines for Dispensing
                </span>
                <span className="text-[10px] text-slate-500">
                  Click "+ Add" to put medicine into checkout cart
                </span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={posSearchTerm}
                  onChange={(e) => setPosSearchTerm(e.target.value)}
                  placeholder="Search medicine by name, generic, brand, code, or batch..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Medicine Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {inventory
                  .filter(m => {
                    if (!posSearchTerm.trim()) return true;
                    const q = posSearchTerm.toLowerCase();
                    return (
                      m.name.toLowerCase().includes(q) ||
                      m.genericComposition.toLowerCase().includes(q) ||
                      m.code.toLowerCase().includes(q) ||
                      m.brand.toLowerCase().includes(q) ||
                      m.batchNumber.toLowerCase().includes(q)
                    );
                  })
                  .map(med => {
                    const isOutOfStock = med.stockQuantity <= 0;
                    const isLowStock = med.stockQuantity <= med.minStockLevel;
                    return (
                      <div
                        key={med.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isOutOfStock
                            ? 'bg-slate-900/50 border-rose-900/30 opacity-60'
                            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs text-white leading-tight">{med.name}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">
                              {med.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{med.genericComposition}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>Batch: <strong className="text-slate-300">{med.batchNumber}</strong></span>
                            <span>•</span>
                            <span>Exp: <strong className="text-slate-300">{med.expiryDate}</strong></span>
                          </div>
                        </div>

                        <div className="pt-3 mt-2 border-t border-slate-700/60 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-emerald-400">
                              {formatCurrency(med.sellingPrice)}
                            </div>
                            <div className="text-[10px] flex items-center gap-1">
                              <span className={isOutOfStock ? 'text-rose-400 font-bold' : isLowStock ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                Stock: {med.stockQuantity}
                              </span>
                              {med.rackLocation && (
                                <span className="text-slate-500">({med.rackLocation})</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddToCart(med)}
                            disabled={isOutOfStock}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isOutOfStock
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                            }`}
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

          {/* Right 5 Columns: Patient Information & Cart Checkout */}
          <div className="lg:col-span-5 space-y-4">
            {/* Patient & Doctor Context */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Patient / Customer</span>
              </h3>

              <div className="space-y-2">
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="walkin">Walk-in Guest / Counter Customer</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.mobile || 'No Phone'}) • ID: {p.id}
                    </option>
                  ))}
                </select>

                {selectedPatientId === 'walkin' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      placeholder="Customer Name (Optional)"
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      placeholder="Phone (Optional)"
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  selectedPatientObj && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{selectedPatientObj.fullName}</span>
                        <span className="text-emerald-400">{patientCard ? `Card: ${patientCard.cardNumber}` : 'No Health Card'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Phone: {selectedPatientObj.mobile} • Age: {selectedPatientObj.age || 'N/A'} • Gender: {selectedPatientObj.gender}
                      </div>
                    </div>
                  )
                )}

                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Prescribing Doctor (e.g. Dr. A. Sharma)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Cart Items */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>Dispensing Cart ({cart.length})</span>
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-1">
                  <Pill className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">No items added to cart yet.</p>
                  <p className="text-[10px]">Select medicines from the left panel.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cart.map(item => {
                    const itemTotal = item.unitPrice * item.quantity * (1 - item.discountPercent / 100);
                    return (
                      <div
                        key={item.medicine.id}
                        className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-xs text-white">{item.medicine.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Batch: {item.medicine.batchNumber} • Max Stock: {item.medicine.stockQuantity}
                            </div>
                          </div>
                          <button
                            onClick={() => handleUpdateCartQty(item.medicine.id, 0)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs">
                          {/* Qty Controls */}
                          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-slate-400">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              max={item.medicine.stockQuantity}
                              value={item.quantity}
                              onChange={(e) => handleUpdateCartQty(item.medicine.id, parseInt(e.target.value) || 1)}
                              className="w-12 bg-transparent text-white font-mono font-bold text-center focus:outline-none"
                            />
                          </div>

                          {/* Discount % */}
                          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-slate-400">Disc %:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => handleUpdateCartDiscount(item.medicine.id, parseFloat(e.target.value) || 0)}
                              className="w-10 bg-transparent text-white font-mono text-center focus:outline-none"
                            />
                          </div>

                          {/* Total */}
                          <div className="text-right font-mono font-bold text-emerald-400">
                            {formatCurrency(itemTotal)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Price Breakdown */}
              {cart.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span className="font-mono">-{formatCurrency(cartDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-800">
                    <span>Net Bill Total:</span>
                    <span className="font-mono text-emerald-400">{formatCurrency(cartNetTotal)}</span>
                  </div>

                  {/* Payment Mode & Collection */}
                  <div className="space-y-2 pt-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['Cash', 'Card', 'UPI', 'Health Wallet'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMode(mode)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                            paymentMode === mode
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">
                          Amount Paid
                        </label>
                        <input
                          type="number"
                          placeholder={cartNetTotal.toString()}
                          value={paidAmountInput}
                          onChange={(e) => setPaidAmountInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">
                          Due Balance
                        </label>
                        <div className={`px-3 py-2 rounded-xl font-mono text-xs font-bold border ${
                          posDueAmount > 0
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {formatCurrency(posDueAmount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dispense Action Button */}
                  <button
                    onClick={handleDispense}
                    disabled={isDispensing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isDispensing ? 'Dispensing & Invoicing...' : `Dispense & Bill ${formatCurrency(cartNetTotal)}`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & MASTER */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Controls & Search */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Filter by medicine name, generic composition, brand, or batch..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Medicine Catalog Master</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-800 text-emerald-400 border border-slate-700">
                  {filteredInventory.length} SKU(s)
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Code & Name</th>
                    <th className="px-4 py-3">Generic & Category</th>
                    <th className="px-4 py-3">Batch & Expiry</th>
                    <th className="px-4 py-3">Rack</th>
                    <th className="px-4 py-3">Purchase</th>
                    <th className="px-4 py-3">Selling (MRP)</th>
                    <th className="px-4 py-3">Stock Level</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredInventory.map(med => {
                    const isOutOfStock = med.stockQuantity <= 0;
                    const isLowStock = med.stockQuantity <= med.minStockLevel;
                    return (
                      <tr key={med.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{med.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{med.code} • {med.dosageForm}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-slate-300">{med.genericComposition}</div>
                          <div className="text-[10px] text-slate-500">{med.category} • {med.brand}</div>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <div className="text-slate-200">{med.batchNumber}</div>
                          <div className="text-[10px] text-slate-400">{med.expiryDate}</div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {med.rackLocation || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono text-slate-400">
                          {formatCurrency(med.purchasePrice)}
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                          {formatCurrency(med.sellingPrice)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-mono font-black text-xs ${
                              isOutOfStock
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                : isLowStock
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {med.stockQuantity} units
                            </span>
                            {isLowStock && !isOutOfStock && (
                              <span className="text-[10px] text-amber-400 font-bold">Low</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                handleSelectMedForStockIn(med.id);
                                setActiveTab('stock_in');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[10px] transition"
                            >
                              Restock
                            </button>
                            <button
                              onClick={() => openEditModal(med)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition"
                            >
                              Edit
                            </button>
                          </div>
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

      {/* TAB 3: STOCK IN & RESTOCK */}
      {activeTab === 'stock_in' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Form */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleStockInSubmit} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                <span>Record Stock In (Purchase / Restock)</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Select Medicine</label>
                  <select
                    value={stockInMedId}
                    onChange={(e) => handleSelectMedForStockIn(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">-- Choose Medicine --</option>
                    {inventory.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code}) — Current: {m.stockQuantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Quantity to Add</label>
                    <input
                      type="number"
                      min="1"
                      value={stockInQty}
                      onChange={(e) => setStockInQty(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={stockInBatch}
                      onChange={(e) => setStockInBatch(e.target.value)}
                      placeholder="e.g. BAT-2026-99"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={stockInExpiry}
                      onChange={(e) => setStockInExpiry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={stockInSupplier}
                      onChange={(e) => setStockInSupplier(e.target.value)}
                      placeholder="e.g. MedLife Pharma"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Purchase Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={stockInPurchasePrice}
                      onChange={(e) => setStockInPurchasePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Selling Price / MRP (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={stockInSellingPrice}
                      onChange={(e) => setStockInSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Invoice / Movement Notes</label>
                  <input
                    type="text"
                    value={stockInNotes}
                    onChange={(e) => setStockInNotes(e.target.value)}
                    placeholder="e.g. Monthly replenishment batch #412"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingStockIn}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>{isSubmittingStockIn ? 'Updating Inventory...' : 'Confirm Stock In'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right 7 Cols: Movement History Ledger */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Stock Movement Audit Ledger</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {movements.length} log records
                </span>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Date & Time</th>
                      <th className="px-3 py-2.5">Medicine</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Qty</th>
                      <th className="px-3 py-2.5">Balance</th>
                      <th className="px-3 py-2.5">Staff / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No stock movements recorded yet.
                        </td>
                      </tr>
                    ) : (
                      movements.map(m => (
                        <tr key={m.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                          <td className="px-3 py-2 text-slate-400">{formatDateTime(m.timestamp)}</td>
                          <td className="px-3 py-2 font-bold text-white font-sans">{m.medicineName}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              m.type === 'STOCK_IN'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-950 text-blue-300 border border-blue-500/30'
                            }`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-bold text-white">
                            {m.type === 'STOCK_IN' ? `+${m.quantity}` : `-${m.quantity}`}
                          </td>
                          <td className="px-3 py-2 text-slate-400">
                            {m.previousStock} → <strong className="text-white">{m.newStock}</strong>
                          </td>
                          <td className="px-3 py-2 text-slate-400 font-sans">
                            <div>{m.performedBy}</div>
                            {m.referenceId && <div className="text-[9px] text-slate-500 font-mono">{m.referenceId}</div>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ALERTS (LOW STOCK & EXPIRY) */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Low Stock Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Low Stock Warnings ({lowStockItems.length})
              </h2>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
                All medicines are currently above minimum threshold.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {lowStockItems.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.genericComposition}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                        {item.stockQuantity} left
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-amber-500/20">
                      <span>Threshold: {item.minStockLevel} units</span>
                      <button
                        onClick={() => {
                          handleSelectMedForStockIn(item.id);
                          setActiveTab('stock_in');
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition"
                      >
                        Restock Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiry Section */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Expiry Alerts ({expiryAlerts.expired.length} Expired, {expiryAlerts.expiringSoon.length} Near Expiry)
              </h2>
            </div>

            {expiryAlerts.expired.length === 0 && expiryAlerts.expiringSoon.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
                No medicines are expired or expiring within the next 90 days.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {expiryAlerts.expired.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-400">Batch: {item.batchNumber}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900 text-rose-200 uppercase">
                        EXPIRED
                      </span>
                    </div>
                    <div className="text-[10px] text-rose-300 font-mono">
                      Expiry Date: {item.expiryDate} • Stock: {item.stockQuantity}
                    </div>
                  </div>
                ))}

                {expiryAlerts.expiringSoon.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-400">Batch: {item.batchNumber}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900 text-amber-200 uppercase">
                        Expiring Soon
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-300 font-mono">
                      Expiry Date: {item.expiryDate} • Stock: {item.stockQuantity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ONLINE DELIVERY ORDERS (PRESERVED WORKFLOW) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search by Order #, Patient, Phone, Medicine..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="order_placed">Placed / New</option>
              <option value="packed">Packed & Ready</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Dispensed / Delivered</option>
            </select>

            <select
              value={orderDeliveryFilter}
              onChange={(e) => setOrderDeliveryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Delivery Types</option>
              <option value="counter_pickup">Pharmacy Pickup</option>
              <option value="express_home_delivery">Doorstep Delivery</option>
            </select>

            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Order # & Date</th>
                    <th className="px-4 py-3">Patient Name</th>
                    <th className="px-4 py-3">Delivery Mode</th>
                    <th className="px-4 py-3">Prescription Items</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No online delivery orders found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(ord => {
                      const statusBadges: Record<string, { label: string; color: string }> = {
                        order_placed: { label: 'New / Placed', color: 'bg-amber-950 text-amber-300 border-amber-500/30' },
                        packed: { label: 'Packed & Ready', color: 'bg-teal-950 text-teal-300 border-teal-500/30' },
                        out_for_delivery: { label: 'Out for Delivery', color: 'bg-blue-950 text-blue-300 border-blue-500/30 animate-pulse' },
                        delivered: { label: 'Dispensed / Delivered', color: 'bg-emerald-950 text-emerald-300 border-emerald-500/30' }
                      };
                      const badge = statusBadges[ord.status] || { label: ord.status, color: 'bg-slate-800 text-slate-300 border-slate-700' };

                      return (
                        <tr key={ord.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-mono">
                            <div className="font-bold text-white">{ord.orderNo}</div>
                            <div className="text-[10px] text-slate-400">{formatDate(ord.createdAt)}</div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{ord.patientName}</div>
                            <div className="text-[10px] text-slate-400">{ord.patientPhone || 'N/A'}</div>
                          </td>

                          <td className="px-4 py-3">
                            {ord.deliveryMode === 'express_home_delivery' ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-500/30">
                                <Truck className="w-3 h-3" /> Doorstep
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                <Building2 className="w-3 h-3" /> Pickup
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-200">{ord.items.length} item(s)</div>
                            <div className="text-[10px] text-slate-400 max-w-xs truncate">
                              {ord.items.map(i => `${i.medicineName} (x${i.quantity})`).join(', ')}
                            </div>
                          </td>

                          <td className="px-4 py-3 font-mono font-bold text-white">
                            {formatCurrency(Number(ord.netTotal || ord.grossTotal || 0))}
                          </td>

                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              ord.paymentStatus === 'paid_wallet'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}>
                              {ord.paymentStatus === 'paid_wallet' ? 'Wallet' : 'Cash'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInspectOrder(ord)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="Inspect Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {ord.status !== 'delivered' && (
                                <button
                                  onClick={() => handleAdvanceOrderStatus(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                                >
                                  {ord.status === 'order_placed' ? 'Pack' : ord.status === 'packed' ? (ord.deliveryMode === 'express_home_delivery' ? 'Dispatch' : 'Dispense') : 'Delivered'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MEDICINE */}
      {isAddMedicineModalOpen && (
        <Modal
          isOpen={isAddMedicineModalOpen}
          onClose={() => setIsAddMedicineModalOpen(false)}
          title={editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Add New Medicine to Inventory'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveMedicine} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Brand / Product Name *</label>
                <input
                  type="text"
                  value={medFormData.name}
                  onChange={(e) => setMedFormData({ ...medFormData, name: e.target.value })}
                  placeholder="e.g. Telma 40mg Tablet"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Generic Composition</label>
                <input
                  type="text"
                  value={medFormData.genericComposition}
                  onChange={(e) => setMedFormData({ ...medFormData, genericComposition: e.target.value })}
                  placeholder="e.g. Telmisartan 40mg"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Category</label>
                <input
                  type="text"
                  value={medFormData.category}
                  onChange={(e) => setMedFormData({ ...medFormData, category: e.target.value })}
                  placeholder="e.g. Cardiac & BP"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Dosage Form</label>
                <select
                  value={medFormData.dosageForm}
                  onChange={(e) => setMedFormData({ ...medFormData, dosageForm: e.target.value })}
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

              <div>
                <label className="block text-slate-400 font-bold mb-1">Packaging</label>
                <input
                  type="text"
                  value={medFormData.packaging}
                  onChange={(e) => setMedFormData({ ...medFormData, packaging: e.target.value })}
                  placeholder="Strip of 10 Tablets"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Batch Number</label>
                <input
                  type="text"
                  value={medFormData.batchNumber}
                  onChange={(e) => setMedFormData({ ...medFormData, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={medFormData.expiryDate}
                  onChange={(e) => setMedFormData({ ...medFormData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Rack / Storage Location</label>
                <input
                  type="text"
                  value={medFormData.rackLocation}
                  onChange={(e) => setMedFormData({ ...medFormData, rackLocation: e.target.value })}
                  placeholder="e.g. Rack B-3"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={medFormData.purchasePrice}
                  onChange={(e) => setMedFormData({ ...medFormData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  value={medFormData.sellingPrice}
                  onChange={(e) => setMedFormData({ ...medFormData, sellingPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Current Stock</label>
                <input
                  type="number"
                  min="0"
                  value={medFormData.stockQuantity}
                  onChange={(e) => setMedFormData({ ...medFormData, stockQuantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Min. Alert Level</label>
                <input
                  type="number"
                  min="1"
                  value={medFormData.minStockLevel}
                  onChange={(e) => setMedFormData({ ...medFormData, minStockLevel: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="rxRequired"
                checked={medFormData.prescriptionRequired}
                onChange={(e) => setMedFormData({ ...medFormData, prescriptionRequired: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700 focus:ring-emerald-500"
              />
              <label htmlFor="rxRequired" className="text-slate-300 font-bold">
                Doctor Prescription Required (Schedule H / Rx)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddMedicineModalOpen(false)}
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

      {/* MODAL: DISPENSED RECEIPT / INVOICE */}
      {dispensedBillReceipt && (
        <Modal
          isOpen={!!dispensedBillReceipt}
          onClose={() => setDispensedBillReceipt(null)}
          title={`Hospital Pharmacy Invoice #${dispensedBillReceipt.billNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/30 flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm text-white">LABMEDIX HEALTHCARE PHARMACY</h3>
                <p className="text-[10px] text-slate-400">Cash Counter Dispensing & Tax Invoice</p>
                <div className="text-[10px] font-mono text-emerald-400 mt-1">
                  Invoice #: {dispensedBillReceipt.billNumber} • {formatDateTime(dispensedBillReceipt.createdAt)}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                dispensedBillReceipt.paymentStatus === 'paid'
                  ? 'bg-emerald-900 text-emerald-200 border border-emerald-500/30'
                  : 'bg-amber-900 text-amber-200 border border-amber-500/30'
              }`}>
                {dispensedBillReceipt.paymentStatus}
              </span>
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px]">Patient Name:</span>
                <span className="font-bold text-white">{dispensedBillReceipt.patientName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Doctor / Prescriber:</span>
                <span className="text-slate-200">{(dispensedBillReceipt as any).doctorName || 'Hospital OPD'}</span>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <div className="px-3 py-2 bg-slate-900 text-slate-400 font-mono text-[10px] grid grid-cols-12">
                <span className="col-span-6">Medicine Description</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>
              {(dispensedBillReceipt.items || []).map((item: any, idx: number) => (
                <div key={idx} className="px-3 py-2 grid grid-cols-12 items-center">
                  <span className="col-span-6 font-bold text-white">{item.description || item.name}</span>
                  <span className="col-span-2 text-center font-mono">{item.quantity}</span>
                  <span className="col-span-2 text-right font-mono text-slate-400">{formatCurrency(item.unitPrice)}</span>
                  <span className="col-span-2 text-right font-mono font-bold text-white">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(dispensedBillReceipt.baseCardCharge || dispensedBillReceipt.netPayable)}</span>
              </div>
              {Number(dispensedBillReceipt.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>-{formatCurrency(dispensedBillReceipt.discountAmount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-800">
                <span>Net Total:</span>
                <span className="text-emerald-400">{formatCurrency(dispensedBillReceipt.netPayable)}</span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1">
                <span>Amount Paid ({dispensedBillReceipt.paymentMethod}):</span>
                <span>{formatCurrency(dispensedBillReceipt.paidAmount)}</span>
              </div>
              {(dispensedBillReceipt.netPayable - dispensedBillReceipt.paidAmount) > 0 && (
                <div className="flex justify-between text-rose-400 font-black">
                  <span>Due Balance:</span>
                  <span>{formatCurrency(dispensedBillReceipt.netPayable - dispensedBillReceipt.paidAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={() => setDispensedBillReceipt(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: DIRECT ORDER PICKER & MODAL */}
      {isNewOrderModalOpen && !activePatientForOrder && (
        <Modal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
          title="Select Patient for Medicine Order"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder="Search patient by name, mobile, or ID..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:border-emerald-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800">
              {patients
                .filter(p => {
                  if (!patientSearchTerm.trim()) return true;
                  const q = patientSearchTerm.toLowerCase();
                  return (
                    (p.fullName || '').toLowerCase().includes(q) ||
                    (p.mobile || '').includes(q) ||
                    (p.id && p.id.toLowerCase().includes(q))
                  );
                })
                .slice(0, 10)
                .map(p => (
                  <div
                    key={p.id}
                    onClick={() => setActivePatientForOrder(p)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/70 transition"
                  >
                    <div>
                      <div className="font-bold text-white">{p.fullName}</div>
                      <div className="text-[10px] text-slate-400">{p.mobile} • Age {p.age || 'N/A'}</div>
                    </div>
                    <button className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">
                      Select
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Direct Medicine Order Modal */}
      {activePatientForOrder && (
        <DirectMedicineOrderModal
          isOpen={!!activePatientForOrder}
          onClose={() => {
            setActivePatientForOrder(null);
            setIsNewOrderModalOpen(false);
          }}
          patient={activePatientForOrder}
          membership={memberships[0] as any}
          walletBalance={wallets.find(w => w.patientId === activePatientForOrder.id)?.balance || 0}
          onOrderSuccess={() => {
            setOrders(PortalService.getPharmacyOrders());
            setActivePatientForOrder(null);
            setIsNewOrderModalOpen(false);
            showToast('success', 'Order Placed', 'Prescription order queued for dispensing.');
          }}
        />
      )}

      {/* Inspect Order Modal */}
      {inspectOrder && (
        <Modal
          isOpen={!!inspectOrder}
          onClose={() => setInspectOrder(null)}
          title={`Prescription Order #${inspectOrder.orderNo}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient Name:</span>
                <strong className="text-white">{inspectOrder.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Delivery Address:</span>
                <span className="text-slate-300 text-right">{inspectOrder.deliveryAddress || 'Hospital Pharmacy Counter'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact Phone:</span>
                <span className="text-slate-300">{inspectOrder.patientPhone}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Dispensed Medicines</h4>
              <div className="divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                {inspectOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{item.medicineName}</div>
                      <div className="text-[10px] text-slate-400">{item.dosage} • {item.genericComposition}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-white font-bold">{formatCurrency(item.unitPrice * item.quantity)}</div>
                      <div className="text-[10px] text-slate-500">Qty: {item.quantity} x {formatCurrency(item.unitPrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex justify-between items-center text-sm font-black text-white">
              <span>Total Invoice Amount:</span>
              <span>{formatCurrency(Number(inspectOrder.netTotal || inspectOrder.grossTotal || 0))}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInspectOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
