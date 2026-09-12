import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { InventoryService } from '../../services/inventoryService';
import { HospitalInventoryItem, InventoryCategory, InventoryIssueRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Boxes,
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  Send,
  Building,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
  ShieldCheck,
  Tag,
  Calendar,
  DollarSign
} from 'lucide-react';

export const InventoryStorePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<HospitalInventoryItem[]>(() => InventoryService.getInventoryItems());
  const [issues, setIssues] = useState<InventoryIssueRecord[]>(() => InventoryService.getIssues());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryCategory>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [activeTab, setActiveTab] = useState<'stock' | 'issues'>('stock');

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HospitalInventoryItem | null>(null);

  // Add Item State
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('medical_supply');
  const [unitOfMeasure, setUnitOfMeasure] = useState('piece');
  const [currentStock, setCurrentStock] = useState('100');
  const [minimumStockLevel, setMinimumStockLevel] = useState('20');
  const [reorderQuantity, setReorderQuantity] = useState('100');
  const [unitPurchasePrice, setUnitPurchasePrice] = useState('50');
  const [storeLocation, setStoreLocation] = useState('Central Medical Store');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Stock Adjustment State
  const [newStockQty, setNewStockQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Departmental Issue State
  const [issueQty, setIssueQty] = useState('1');
  const [departmentIssuedTo, setDepartmentIssuedTo] = useState<'OT' | 'ICU' | 'Emergency' | 'Laboratory' | 'Radiology' | 'Wards' | 'OPD'>('OT');
  const [requisitionedBy, setRequisitionedBy] = useState('');
  const [issueRemarks, setIssueRemarks] = useState('');

  const refreshData = () => {
    setItems(InventoryService.getInventoryItems());
    setIssues(InventoryService.getIssues());
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.key === 'labmedix_inventory_items_v1' || e.detail?.key === 'labmedix_inventory_issues_v1') {
        refreshData();
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const metrics = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock').length;
    const totalValuation = items.reduce((sum, i) => sum + i.currentStock * i.unitPurchasePrice, 0);
    const totalIssuesCount = issues.length;
    return { totalItems, lowStock, totalValuation, totalIssuesCount };
  }, [items, issues]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.storeLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = stockStatusFilter === 'all' || item.status === stockStatusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, stockStatusFilter]);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCode.trim()) {
      showToast('error', 'Validation Error', 'Item code and name are required.');
      return;
    }

    try {
      InventoryService.createInventoryItem({
        itemCode: itemCode.trim().toUpperCase(),
        itemName: itemName.trim(),
        category,
        unitOfMeasure,
        currentStock: Number(currentStock) || 0,
        minimumStockLevel: Number(minimumStockLevel) || 0,
        reorderQuantity: Number(reorderQuantity) || 50,
        unitPurchasePrice: Number(unitPurchasePrice) || 0,
        storeLocation,
        batchNumber: batchNumber || undefined,
        expiryDate: expiryDate || undefined,
        lastRestockedDate: new Date().toISOString().slice(0, 10)
      });

      showToast('success', 'Item Registered', `${itemName} added to hospital inventory.`);
      setIsAddItemModalOpen(false);
      refreshData();
      // reset
      setItemCode('');
      setItemName('');
      setBatchNumber('');
      setExpiryDate('');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!adjustReason.trim()) {
      showToast('error', 'Reason Required', 'Please provide a clinical or audit reason for stock adjustment.');
      return;
    }

    try {
      InventoryService.adjustStock(
        selectedItem.id,
        Number(newStockQty) || 0,
        adjustReason.trim(),
        currentUser?.fullName || 'Store Manager'
      );

      showToast('success', 'Stock Adjusted', `Stock for ${selectedItem.itemName} updated to ${newStockQty} ${selectedItem.unitOfMeasure}.`);
      setIsAdjustModalOpen(false);
      setSelectedItem(null);
      setAdjustReason('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleIssueItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qty = Number(issueQty);
    if (!qty || qty <= 0) {
      showToast('error', 'Invalid Quantity', 'Please enter a valid issue quantity.');
      return;
    }
    if (!requisitionedBy.trim()) {
      showToast('error', 'Requisitioner Required', 'Please specify the doctor, nurse, or technician who requested this supply.');
      return;
    }

    try {
      InventoryService.issueToDepartment({
        itemId: selectedItem.id,
        quantityIssued: qty,
        departmentIssuedTo,
        requisitionedBy: requisitionedBy.trim(),
        issuedBy: currentUser?.fullName || 'Central Store Dispenser',
        remarks: issueRemarks || undefined
      });

      showToast('success', 'Supplies Dispatched', `Issued ${qty} ${selectedItem.unitOfMeasure} of ${selectedItem.itemName} to [${departmentIssuedTo}].`);
      setIsIssueModalOpen(false);
      setSelectedItem(null);
      setIssueRemarks('');
      setRequisitionedBy('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Stock Error', err.message);
    }
  };

  const getCategoryLabel = (c: InventoryCategory) => {
    switch (c) {
      case 'medical_supply':
        return { label: 'Medical Supply', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'surgical_ot':
        return { label: 'OT & Surgical', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'lab_reagent':
        return { label: 'Lab Reagent', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'radiology_film':
        return { label: 'Radiology Film', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
      case 'linen_laundry':
        return { label: 'Linen & Ward', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      default:
        return { label: 'General Hospital', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' };
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            Module 29 • Central Inventory & Store
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Hospital Inventory & Consumable Store
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Centralized inventory matrix managing surgical consumables, medical disposables, diagnostic laboratory reagents, and intra-departmental supply requisitions.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refreshData()}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shadow-sm"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Items / SKU</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metrics.totalItems}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Categorized hospital supplies</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Stock Valuation</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.totalValuation)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Asset value at purchase cost</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Low Stock Alerts</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.lowStock}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">At or below minimum threshold</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dept. Dispatches</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metrics.totalIssuesCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Issued to OT, ICU & Wards</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Live Stock Matrix ({filteredItems.length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'issues'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Send className="w-4 h-4" />
          Departmental Dispatches & Issues ({issues.length})
        </button>
      </div>

      {activeTab === 'stock' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code, item, batch or rack location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">All Categories</option>
                <option value="medical_supply">Medical Supply</option>
                <option value="surgical_ot">OT & Surgical</option>
                <option value="lab_reagent">Lab Reagent</option>
                <option value="radiology_film">Radiology Film</option>
                <option value="linen_laundry">Linen & Ward</option>
                <option value="general">General</option>
              </select>

              <select
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">All Stock Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock (Needs Reorder)</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Item Code & Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Location / Rack</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-center">Batch & Expiry</th>
                    <th className="py-3 px-4 text-center">Stock Level</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No inventory items matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const catBadge = getCategoryLabel(item.category);
                      const isLow = item.status === 'low_stock' || item.status === 'out_of_stock';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {item.itemName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {item.itemCode} • UoM: {item.unitOfMeasure}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadge.color}`}>
                              {catBadge.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {item.storeLocation}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(item.unitPurchasePrice)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {item.batchNumber || '—'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.expiryDate ? `Exp: ${formatDate(item.expiryDate)}` : 'No Expiry'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`font-black text-sm ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                                {item.currentStock}
                              </span>
                              <span className="text-[10px] text-slate-400">{item.unitOfMeasure}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Min: {item.minimumStockLevel}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIssueQty('1');
                                  setIsIssueModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold text-[11px] transition-colors"
                                title="Issue item to hospital department"
                              >
                                Issue
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setNewStockQty(String(item.currentStock));
                                  setIsAdjustModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors"
                                title="Adjust inventory stock"
                              >
                                Adjust
                              </button>
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
      ) : (
        /* Issues Ledger */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Departmental Issue Ledger</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cryptographic record of clinical consumables dispatched to wards, theatres, and ICU</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Issue Voucher</th>
                  <th className="py-3 px-4">Item Dispatched</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4">Requisitioned By</th>
                  <th className="py-3 px-4">Issued By & Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <Send className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No departmental dispatches recorded yet.
                    </td>
                  </tr>
                ) : (
                  issues.map(iss => (
                    <tr key={iss.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {iss.issueNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{iss.itemName}</div>
                        {iss.remarks && <div className="text-[10px] text-slate-400 italic mt-0.5">Note: {iss.remarks}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {iss.departmentIssuedTo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {iss.quantityIssued} {iss.unitOfMeasure}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {iss.requisitionedBy}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div>{iss.issuedBy}</div>
                        <div className="text-slate-400 mt-0.5">{new Date(iss.issueDate).toLocaleString('en-IN')}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Item */}
      <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} title="Register Hospital Inventory Item" maxWidth="lg">
        <form onSubmit={handleCreateItem} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Item Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. SURG-SUT-20"
                value={itemCode}
                onChange={e => setItemCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sterile Vicryl Suture 2-0"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="medical_supply">Medical Supply (Disposables, Cannula, IV sets)</option>
                <option value="surgical_ot">OT & Surgical (Sutures, Blades, Gowns)</option>
                <option value="lab_reagent">Lab Reagent (CBC Diluent, Stains, Kits)</option>
                <option value="radiology_film">Radiology Film (X-Ray, CT Sheets)</option>
                <option value="linen_laundry">Linen & Ward (Bed sheets, Towels)</option>
                <option value="general">General Hospital Consumables</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure (UoM)</label>
              <input
                type="text"
                required
                placeholder="e.g. piece, box, pair, bottle, drum"
                value={unitOfMeasure}
                onChange={e => setUnitOfMeasure(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stock Qty</label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={e => setCurrentStock(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Minimum Reorder Threshold</label>
              <input
                type="number"
                min="0"
                value={minimumStockLevel}
                onChange={e => setMinimumStockLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Cost Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPurchasePrice}
                onChange={e => setUnitPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Store / Rack Location</label>
              <input
                type="text"
                placeholder="e.g. Central Medical Store Bin 04"
                value={storeLocation}
                onChange={e => setStoreLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Batch Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. BATCH-2026-X1"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddItemModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
            >
              Save Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Stock */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title={`Stock Adjustment: ${selectedItem?.itemName}`} maxWidth="sm">
        <form onSubmit={handleStockAdjustment} className="p-4 sm:p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs space-y-1">
            <div className="text-slate-500">Current Stock: <strong className="text-slate-900 dark:text-white font-mono">{selectedItem?.currentStock} {selectedItem?.unitOfMeasure}</strong></div>
            <div className="text-slate-500">Location: <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedItem?.storeLocation}</span></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Physical Count *</label>
            <input
              type="number"
              min="0"
              required
              value={newStockQty}
              onChange={e => setNewStockQty(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Adjustment *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Physical inventory audit discrepancy, damaged packaging, or breakage..."
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Issue Supplies */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title={`Dispatch Supplies: ${selectedItem?.itemName}`} maxWidth="sm">
        <form onSubmit={handleIssueItem} className="p-4 sm:p-6 space-y-4">
          <div className="bg-teal-50 dark:bg-teal-950/40 p-3 rounded-xl text-xs space-y-1 border border-teal-200 dark:border-teal-800">
            <div className="text-teal-900 dark:text-teal-200">Available Stock: <strong className="font-mono font-bold">{selectedItem?.currentStock} {selectedItem?.unitOfMeasure}</strong></div>
            <div className="text-[11px] text-teal-700 dark:text-teal-400">Location: {selectedItem?.storeLocation}</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Department *</label>
            <select
              value={departmentIssuedTo}
              onChange={e => setDepartmentIssuedTo(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            >
              <option value="OT">Operation Theatre (OT Suites)</option>
              <option value="ICU">Intensive Care Unit (ICU / CCU)</option>
              <option value="Emergency">Emergency & Casualty Trauma Center</option>
              <option value="Laboratory">Pathology & Diagnostic Laboratory</option>
              <option value="Radiology">Radiology & Imaging Workstation</option>
              <option value="Wards">Inpatient General & Private Wards</option>
              <option value="OPD">Outpatient Consultation Clinics</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity to Issue *</label>
            <input
              type="number"
              min="1"
              max={selectedItem?.currentStock || 9999}
              required
              value={issueQty}
              onChange={e => setIssueQty(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Requisitioned By (Doctor / Nurse) *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sister Thomas (OT Incharge) / Dr. Roy"
              value={requisitionedBy}
              onChange={e => setRequisitionedBy(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Clinical Note / Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Emergency craniotomy procedure consumption"
              value={issueRemarks}
              onChange={e => setIssueRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
            >
              Authorize Dispatch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
