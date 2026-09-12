import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { InventoryService } from '../../services/inventoryService';
import { HospitalSupplier, PurchaseOrder, GoodsReceivedNote, HospitalInventoryItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Truck,
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  Package,
  Layers,
  Star,
  ExternalLink
} from 'lucide-react';

export const ProcurementSuppliersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<HospitalSupplier[]>(() => InventoryService.getSuppliers());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => InventoryService.getPurchaseOrders());
  const [grns, setGrns] = useState<GoodsReceivedNote[]>(() => InventoryService.getGrns());
  const [inventoryItems, setInventoryItems] = useState<HospitalInventoryItem[]>(() => InventoryService.getInventoryItems());

  const [activeTab, setActiveTab] = useState<'pos' | 'grns' | 'suppliers'>('pos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewPoModalOpen, setIsNewPoModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<PurchaseOrder | null>(null);

  // New Supplier Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierCategory, setSupplierCategory] = useState<HospitalSupplier['category']>('medical_devices');
  const [contactPerson, setContactPerson] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [taxGstNumber, setTaxGstNumber] = useState('');
  const [drugLicenseNumber, setDrugLicenseNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // New PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poPaymentTerms, setPoPaymentTerms] = useState('Net 30');
  const [shippingAddress, setShippingAddress] = useState('Central Receiving Dock, Ground Floor, LABMEDIX Hospital');
  const [taxPercent, setTaxPercent] = useState('12');
  const [poNotes, setPoNotes] = useState('');
  const [poLineItems, setPoLineItems] = useState<
    Array<{ itemId: string; itemName: string; itemCode: string; category: any; unitOfMeasure: string; orderQuantity: number; unitPrice: number }>
  >([]);

  // Selected item to add to PO line items
  const [addItemId, setAddItemId] = useState('');
  const [addItemQty, setAddItemQty] = useState('50');
  const [addItemPrice, setAddItemPrice] = useState('0');

  // GRN State
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [vendorChallanNumber, setVendorChallanNumber] = useState('');
  const [grnItems, setGrnItems] = useState<
    Array<{
      itemId: string;
      itemName: string;
      orderedQty: number;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      batchNumber: string;
      expiryDate?: string;
      unitCost: number;
    }>
  >([]);
  const [qcStatus, setQcStatus] = useState<'passed' | 'partial' | 'rejected'>('passed');
  const [grnRemarks, setGrnRemarks] = useState('');

  const refreshData = () => {
    setSuppliers(InventoryService.getSuppliers());
    setPurchaseOrders(InventoryService.getPurchaseOrders());
    setGrns(InventoryService.getGrns());
    setInventoryItems(InventoryService.getInventoryItems());
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      if (
        e.detail?.key === 'labmedix_suppliers_v1' ||
        e.detail?.key === 'labmedix_purchase_orders_v1' ||
        e.detail?.key === 'labmedix_grns_v1'
      ) {
        refreshData();
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const metrics = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activePos = purchaseOrders.filter(p => p.status === 'ordered' || p.status === 'partially_received').length;
    const totalGrnsCount = grns.length;
    const totalPoSpend = purchaseOrders.reduce((sum, p) => sum + p.grandTotal, 0);
    return { totalSuppliers, activePos, totalGrnsCount, totalPoSpend };
  }, [suppliers, purchaseOrders, grns]);

  const handleAddLineItemToPo = () => {
    if (!addItemId) return;
    const itm = inventoryItems.find(i => i.id === addItemId);
    if (!itm) return;

    if (poLineItems.some(l => l.itemId === addItemId)) {
      showToast('warning', 'Already Added', 'This item is already included in the purchase order.');
      return;
    }

    setPoLineItems(prev => [
      ...prev,
      {
        itemId: itm.id,
        itemName: itm.itemName,
        itemCode: itm.itemCode,
        category: itm.category,
        unitOfMeasure: itm.unitOfMeasure,
        orderQuantity: Number(addItemQty) || 10,
        unitPrice: Number(addItemPrice) || itm.unitPurchasePrice
      }
    ]);

    setAddItemId('');
    setAddItemQty('50');
    setAddItemPrice('0');
  };

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('error', 'Select Supplier', 'Please select a registered vendor.');
      return;
    }
    if (poLineItems.length === 0) {
      showToast('error', 'Line Items Required', 'Please add at least one item to order.');
      return;
    }

    const sup = suppliers.find(s => s.id === selectedSupplierId);
    if (!sup) return;

    try {
      const po = InventoryService.createPurchaseOrder({
        supplierId: sup.id,
        supplierName: sup.supplierName,
        expectedDeliveryDate: expectedDeliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        items: poLineItems,
        taxPercent: Number(taxPercent) || 0,
        paymentTerms: poPaymentTerms,
        shippingAddress,
        notes: poNotes || undefined,
        createdBy: currentUser?.fullName || 'Procurement Officer'
      });

      showToast('success', 'Purchase Order Generated', `Issued ${po.poNumber} to ${sup.supplierName}`);
      setIsNewPoModalOpen(false);
      setPoLineItems([]);
      setPoNotes('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showToast('error', 'Name Required', 'Vendor name is required.');
      return;
    }

    try {
      const sup = InventoryService.createSupplier({
        supplierName: supplierName.trim(),
        category: supplierCategory,
        contactPerson: contactPerson.trim(),
        phone: supplierPhone.trim(),
        email: supplierEmail.trim(),
        address: supplierAddress.trim(),
        taxGstNumber: taxGstNumber.trim(),
        drugLicenseNumber: drugLicenseNumber.trim() || undefined,
        paymentTerms,
        status: 'active',
        ratingStars: 5.0
      });

      showToast('success', 'Supplier Enrolled', `Registered ${sup.supplierName} (${sup.supplierCode})`);
      setIsNewSupplierModalOpen(false);
      setSupplierName('');
      setContactPerson('');
      setSupplierPhone('');
      setTaxGstNumber('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const openGrnModal = (po: PurchaseOrder) => {
    setSelectedPoForGrn(po);
    setVendorInvoiceNumber('');
    setVendorChallanNumber('');
    setQcStatus('passed');
    setGrnRemarks('');

    // Prepopulate GRN lines with remaining ordered quantities
    const initialGrnItems = po.items.map(i => {
      const remaining = i.orderQuantity - (i.receivedQuantity || 0);
      return {
        itemId: i.itemId,
        itemName: i.itemName,
        orderedQty: i.orderQuantity,
        receivedQty: Math.max(0, remaining),
        acceptedQty: Math.max(0, remaining),
        rejectedQty: 0,
        batchNumber: `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        expiryDate: new Date(Date.now() + 365 * 2 * 86400000).toISOString().slice(0, 10),
        unitCost: i.unitPrice
      };
    });
    setGrnItems(initialGrnItems);
    setIsGrnModalOpen(true);
  };

  const handleProcessGrn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForGrn) return;
    if (!vendorInvoiceNumber.trim()) {
      showToast('error', 'Invoice Required', 'Vendor invoice or DC number is required for Goods Receiving.');
      return;
    }

    try {
      const grn = InventoryService.processGoodsReceived({
        poId: selectedPoForGrn.id,
        poNumber: selectedPoForGrn.poNumber,
        supplierName: selectedPoForGrn.supplierName,
        receivedBy: currentUser?.fullName || 'Receiving Store Keeper',
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        vendorChallanNumber: vendorChallanNumber.trim() || undefined,
        items: grnItems,
        qcStatus,
        remarks: grnRemarks || undefined
      });

      showToast('success', 'Goods Received & Stock Replenished', `GRN ${grn.grnNumber} processed. Inventory updated.`);
      setIsGrnModalOpen(false);
      setSelectedPoForGrn(null);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const getPoStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'ordered':
        return { label: 'ORDERED / PENDING', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'partially_received':
        return { label: 'PARTIALLY RECEIVED', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
      case 'received':
        return { label: 'FULLY RECEIVED', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'cancelled':
        return { label: 'CANCELLED', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      default:
        return { label: 'DRAFT', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' };
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-3xl text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-3.5 h-3.5 text-teal-400" />
            Module 30 • Procurement & Supplier Master
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Procurement, Orders & Goods Receiving (GRN)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            End-to-end purchasing lifecycle: requirement specification, purchase order generation, vendor deliveries, Goods Received Notes (GRN), and inventory integration.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refreshData()}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shadow-sm"
            title="Refresh Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsNewSupplierModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
          >
            <Building2 className="w-4 h-4" />
            Register Supplier
          </button>
          <button
            onClick={() => {
              if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);
              setIsNewPoModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enrolled Vendors</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metrics.totalSuppliers}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Verified distributors & OEMs</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Orders (PO)</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.activePos}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting receipt or in transit</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed GRNs</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.totalGrnsCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Goods inspected & accepted</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Orders Spend</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(metrics.totalPoSpend)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cumulative PO commitments</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('pos')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pos'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('grns')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'grns'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Goods Received Notes (GRN) ({grns.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Suppliers & Vendors ({suppliers.length})
        </button>
      </div>

      {activeTab === 'pos' && (
        /* Purchase Orders Table */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Purchase Orders</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Formal procurement orders dispatched to certified vendors</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No purchase orders recorded yet. Click "Create Purchase Order" to generate one.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map(po => {
                    const statusBadge = getPoStatusBadge(po.status);
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {po.poNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{po.supplierName}</div>
                          <div className="text-[11px] text-slate-400">Terms: {po.paymentTerms}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {formatDate(po.orderDate)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {formatDate(po.expectedDeliveryDate)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {po.items.length} lines
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(po.grandTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {po.status === 'ordered' || po.status === 'partially_received' ? (
                            <button
                              onClick={() => openGrnModal(po)}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold text-xs transition-colors shadow-xs"
                            >
                              Receive (GRN)
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Fulfilled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'grns' && (
        /* Goods Received Notes Table */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Goods Received Notes (GRN) Log</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Formal intake, batch tracking, and quality inspection records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Vendor Invoice #</th>
                  <th className="py-3 px-4">Received Date & By</th>
                  <th className="py-3 px-4 text-center">QC Status</th>
                  <th className="py-3 px-4 text-right">Accepted Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {grns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No goods received notes logged yet.
                    </td>
                  </tr>
                ) : (
                  grns.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {g.grnNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {g.poNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {g.supplierName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {g.vendorInvoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div>{new Date(g.receivedDate).toLocaleDateString('en-IN')}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">By: {g.receivedBy}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                          {g.qcStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(g.totalAcceptedAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        /* Suppliers Table */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Certified Vendor Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Registered pharmaceutical and hospital equipment distributors</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Supplier Code & Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">Tax GSTIN</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4 text-center">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{sup.supplierName}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{sup.supplierCode} • {sup.paymentTerms}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                        {sup.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {sup.contactPerson}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div>{sup.phone}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{sup.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {sup.taxGstNumber}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(sup.totalPurchasesAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {sup.ratingStars.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New PO */}
      <Modal isOpen={isNewPoModalOpen} onClose={() => setIsNewPoModalOpen(false)} title="Generate Purchase Order (PO)" maxWidth="xl">
        <form onSubmit={handleCreatePo} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Supplier *</label>
              <select
                required
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.supplierName} ({s.supplierCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={expectedDeliveryDate}
                onChange={e => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Add Line Items Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Add Inventory Line Item to Order
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Select Item</label>
                <select
                  value={addItemId}
                  onChange={e => {
                    setAddItemId(e.target.value);
                    const itm = inventoryItems.find(i => i.id === e.target.value);
                    if (itm) setAddItemPrice(String(itm.unitPurchasePrice));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Item from Inventory Catalog --</option>
                  {inventoryItems.map(i => (
                    <option key={i.id} value={i.id}>
                      [{i.itemCode}] {i.itemName} (Stock: {i.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={addItemQty}
                  onChange={e => setAddItemQty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={addItemPrice}
                  onChange={e => setAddItemPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddLineItemToPo}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                >
                  + Add Line
                </button>
              </div>
            </div>

            {/* List of current line items */}
            {poLineItems.length > 0 && (
              <div className="mt-3 border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2 px-3 text-left">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {poLineItems.map((l, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{l.itemName}</td>
                        <td className="py-2 px-3 text-center">{l.orderQuantity} {l.unitOfMeasure}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(l.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-teal-600">{formatCurrency(l.orderQuantity * l.unitPrice)}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setPoLineItems(poLineItems.filter((_, i) => i !== idx))}
                            className="text-rose-500 font-bold hover:underline"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Applicable GST Tax (%)</label>
              <input
                type="number"
                min="0"
                max="28"
                value={taxPercent}
                onChange={e => setTaxPercent(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
              <input
                type="text"
                value={poPaymentTerms}
                onChange={e => setPoPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Instructions</label>
            <input
              type="text"
              placeholder="e.g. Ensure cold-chain temperature monitoring log is attached upon delivery"
              value={poNotes}
              onChange={e => setPoNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewPoModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20"
            >
              Dispatch Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Goods Received Note (GRN) */}
      <Modal isOpen={isGrnModalOpen} onClose={() => setIsGrnModalOpen(false)} title={`Goods Receiving (GRN) for ${selectedPoForGrn?.poNumber}`} maxWidth="xl">
        <form onSubmit={handleProcessGrn} className="p-4 sm:p-6 space-y-4">
          <div className="bg-teal-50 dark:bg-teal-950/40 p-3 rounded-xl text-xs space-y-1 border border-teal-200 dark:border-teal-800">
            <div className="font-bold text-teal-900 dark:text-teal-200">
              Supplier: {selectedPoForGrn?.supplierName}
            </div>
            <div className="text-[11px] text-teal-700 dark:text-teal-400">
              Ordered on: {selectedPoForGrn?.orderDate && formatDate(selectedPoForGrn.orderDate)} • Total Lines: {selectedPoForGrn?.items.length}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vendor Invoice / DC Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. INV-MT-88410"
                value={vendorInvoiceNumber}
                onChange={e => setVendorInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Challan # (Optional)</label>
              <input
                type="text"
                placeholder="e.g. CHAL-9902"
                value={vendorChallanNumber}
                onChange={e => setVendorChallanNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line by line received items */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Physical Inspection & Batch Details</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {grnItems.map((itm, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{itm.itemName}</span>
                    <span className="text-slate-500 font-normal">Ordered: {itm.orderedQty}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Accepted Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={itm.acceptedQty}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setGrnItems(prev => prev.map((item, i) => i === idx ? { ...item, acceptedQty: val } : item));
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Rejected Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={itm.rejectedQty}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setGrnItems(prev => prev.map((item, i) => i === idx ? { ...item, rejectedQty: val } : item));
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Batch Number</label>
                      <input
                        type="text"
                        value={itm.batchNumber}
                        onChange={e => {
                          const val = e.target.value;
                          setGrnItems(prev => prev.map((item, i) => i === idx ? { ...item, batchNumber: val } : item));
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Expiry Date</label>
                      <input
                        type="date"
                        value={itm.expiryDate || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setGrnItems(prev => prev.map((item, i) => i === idx ? { ...item, expiryDate: val } : item));
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Overall QC Inspection Status</label>
              <select
                value={qcStatus}
                onChange={e => setQcStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="passed">PASSED (All quality checks verified)</option>
                <option value="partial">PARTIAL (Some damaged/rejected units)</option>
                <option value="rejected">REJECTED (Failed quality criteria)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Receiving Remarks</label>
              <input
                type="text"
                placeholder="e.g. Packaging intact, seal verified, entered into store"
                value={grnRemarks}
                onChange={e => setGrnRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGrnModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              Confirm GRN & Replenish Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Supplier */}
      <Modal isOpen={isNewSupplierModalOpen} onClose={() => setIsNewSupplierModalOpen(false)} title="Register Certified Hospital Supplier" maxWidth="md">
        <form onSubmit={handleCreateSupplier} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company / Supplier Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Health Logistics India Pvt Ltd"
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={supplierCategory}
                onChange={e => setSupplierCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="medical_devices">Medical Devices & Instruments</option>
                <option value="pharmaceuticals">Pharmaceuticals & Drugs</option>
                <option value="lab_reagents">Laboratory Reagents & Diagnostics</option>
                <option value="surgical_instruments">Surgical Consumables & OT</option>
                <option value="general_supplies">General Hospital Supplies</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                placeholder="e.g. Debashis Guha"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. +91 98300 11223"
                value={supplierPhone}
                onChange={e => setSupplierPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Official Email</label>
              <input
                type="email"
                placeholder="orders@supplier.com"
                value={supplierEmail}
                onChange={e => setSupplierEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN Tax Number</label>
              <input
                type="text"
                placeholder="e.g. 19AAACC4421K1ZM"
                value={taxGstNumber}
                onChange={e => setTaxGstNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
              <input
                type="text"
                placeholder="e.g. Net 30, Net 15"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Office / Warehouse Address</label>
            <textarea
              rows={2}
              placeholder="e.g. Sector V, Salt Lake, Kolkata"
              value={supplierAddress}
              onChange={e => setSupplierAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewSupplierModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20"
            >
              Enroll Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
