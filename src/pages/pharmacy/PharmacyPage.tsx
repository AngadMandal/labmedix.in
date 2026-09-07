import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PortalService, MedicineOrder } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
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
  MapPin,
  Phone,
  CreditCard,
  Building2,
  ShieldCheck
} from 'lucide-react';

export const PharmacyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // State
  const [orders, setOrders] = useState<MedicineOrder[]>(() => PortalService.getPharmacyOrders());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getMemberships());
  const [wallets, setWallets] = useState<Wallet[]>(() => StorageService.getWallets());

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [inspectOrder, setInspectOrder] = useState<MedicineOrder | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [activePatientForOrder, setActivePatientForOrder] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = ApiSyncService.subscribeToCollection<MedicineOrder>('pharmacyOrders', (items) => {
      if (items) {
        setOrders(PortalService.getPharmacyOrders());
      }
    });
    return () => unsub();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      setOrders(PortalService.getPharmacyOrders());
      setPatients(StorageService.getPatients());
      showToast('success', 'Central Sync Complete', 'Pharmacy orders updated from central Firestore.');
    } catch {
      setOrders(PortalService.getPharmacyOrders());
      showToast('info', 'Local Cache Updated', 'Pharmacy orders refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Status Progression
  const handleAdvanceStatus = (order: MedicineOrder) => {
    let nextStatus: MedicineOrder['status'] = 'packed';
    if (order.status === 'placed') nextStatus = 'packed';
    else if (order.status === 'packed') nextStatus = order.deliveryType === 'home_delivery' ? 'out_for_delivery' : 'delivered';
    else if (order.status === 'out_for_delivery') nextStatus = 'delivered';

    const updated = PortalService.updatePharmacyOrderStatus(order.id, nextStatus);
    if (updated) {
      setOrders(PortalService.getPharmacyOrders());
      showToast('success', 'Status Advanced', `Order ${order.orderNo} is now ${nextStatus.replace(/_/g, ' ')}.`);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      if (deliveryFilter !== 'all' && ord.deliveryType !== deliveryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNo = (ord.orderNo || '').toLowerCase().includes(q);
        const matchesPatient = (ord.patientName || '').toLowerCase().includes(q);
        const matchesPhone = (ord.deliveryPhone || '').toLowerCase().includes(q);
        const matchesMed = (ord.items || []).some(item => item.name.toLowerCase().includes(q) || item.genericComposition?.toLowerCase().includes(q));
        if (!matchesNo && !matchesPatient && !matchesPhone && !matchesMed) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, deliveryFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const placed = orders.filter(o => o.status === 'placed').length;
    const packed = orders.filter(o => o.status === 'packed').length;
    const outForDelivery = orders.filter(o => o.status === 'out_for_delivery').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const revenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.netAmount || o.grossAmount || 0)), 0);

    return { total, placed, packed, outForDelivery, delivered, revenue };
  }, [orders]);

  // Filtered patients for order picker
  const filteredPatientsForPicker = useMemo(() => {
    if (!patientSearchTerm.trim()) return patients.slice(0, 5);
    const q = patientSearchTerm.toLowerCase();
    return patients.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      p.mobileNumber.includes(q) ||
      (p.uhid && p.uhid.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [patientSearchTerm, patients]);

  const activePatientMembership = useMemo(() => {
    if (!activePatientForOrder) return memberships[0] || { id: 'mem_1', name: 'Standard', color: '#0D9488', tier: 'silver' };
    const patientCard = cards.find(c => c.patientId === activePatientForOrder.id && c.status === 'active');
    return memberships.find(m => m.id === patientCard?.membershipId) || memberships[0];
  }, [activePatientForOrder, cards, memberships]);

  const activePatientWallet = useMemo(() => {
    if (!activePatientForOrder) return 0;
    const w = wallets.find(wall => wall.patientId === activePatientForOrder.id);
    return w ? w.balance : 0;
  }, [activePatientForOrder, wallets]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-blue-900/20 border border-emerald-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <Pill className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Pharmacy & Dispensing Hub
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Hospital Workflow
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            Doctor EMR prescription fulfillment, prescription packing queue & hospital doorstep dispensing.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition shadow-lg shadow-emerald-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Prescription Order</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics.total}</p>
          <span className="text-[10px] text-slate-500">All prescription requisitions</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>New & Placed</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-300">{metrics.placed}</p>
          <span className="text-[10px] text-amber-500/80">Pending pharmacist packing</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-teal-400 text-xs font-bold">
            <span>Packed & Ready</span>
            <Package className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-teal-300">{metrics.packed}</p>
          <span className="text-[10px] text-teal-500/80">Ready at counter</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Dispensed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{metrics.delivered}</p>
          <span className="text-[10px] text-emerald-500/80">Handed to patient</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
            <span>Pharmacy Revenue</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300">{formatCurrency(metrics.revenue)}</p>
          <span className="text-[10px] text-cyan-500/80">Total gross medicine sales</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order # (MED-2026-...), Patient, Phone, Medicine name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="placed">Placed / New</option>
          <option value="packed">Packed & Ready</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Dispensed / Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={deliveryFilter}
          onChange={(e) => setDeliveryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Delivery Types</option>
          <option value="hospital_pickup">Hospital Pharmacy Pickup</option>
          <option value="home_delivery">Doorstep Express Delivery</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Prescription Dispensing Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-800 text-emerald-400 border border-slate-700">
              {filteredOrders.length} orders
            </span>
          </h2>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Pill className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-bold text-white">No Pharmacy Orders</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No active prescription orders match your search or filter criteria.
            </p>
          </div>
        ) : (
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
                {filteredOrders.map((ord) => {
                  const statusBadges: Record<string, { label: string; color: string }> = {
                    placed: { label: 'New / Placed', color: 'bg-amber-950 text-amber-300 border-amber-500/30' },
                    packed: { label: 'Packed & Ready', color: 'bg-teal-950 text-teal-300 border-teal-500/30' },
                    out_for_delivery: { label: 'Out for Delivery', color: 'bg-blue-950 text-blue-300 border-blue-500/30 animate-pulse' },
                    delivered: { label: 'Dispensed / Delivered', color: 'bg-emerald-950 text-emerald-300 border-emerald-500/30' },
                    cancelled: { label: 'Cancelled', color: 'bg-rose-950 text-rose-300 border-rose-500/30' }
                  };
                  const badge = statusBadges[ord.status] || { label: ord.status, color: 'bg-slate-800 text-slate-300 border-slate-700' };

                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Order # */}
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-white">{ord.orderNo}</div>
                        <div className="text-[10px] text-slate-400">{formatDate(ord.createdAt)}</div>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3 font-medium text-white">
                        <div>{ord.patientName}</div>
                        <div className="text-[10px] text-slate-400">{ord.deliveryPhone || 'N/A'}</div>
                      </td>

                      {/* Delivery Mode */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {ord.deliveryType === 'home_delivery' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-500/30">
                              <Truck className="w-3 h-3" /> Doorstep Delivery
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              <Building2 className="w-3 h-3" /> Pharmacy Pickup
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">
                          {ord.items.length} item(s)
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-xs truncate">
                          {ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 font-black text-white">
                        {formatCurrency(Number(ord.netAmount || ord.grossAmount || 0))}
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          ord.paymentStatus === 'paid'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}>
                          {ord.paymentStatus || 'pending'} ({ord.paymentMode || 'cash'})
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Modal */}
                          <button
                            onClick={() => setInspectOrder(ord)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Inspect Order Breakdown"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Progression Action */}
                          {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                            <button
                              onClick={() => handleAdvanceStatus(ord)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                            >
                              {ord.status === 'placed' ? 'Pack Order' : ord.status === 'packed' ? (ord.deliveryType === 'home_delivery' ? 'Dispatch' : 'Dispense') : 'Mark Delivered'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Picker for New Order */}
      {isNewOrderModalOpen && !activePatientForOrder && (
        <Modal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
          title="Select Patient for Medicine Order"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder="Search patient by name, mobile, or UHID..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:border-emerald-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800">
              {filteredPatientsForPicker.map(p => (
                <div
                  key={p.id}
                  onClick={() => setActivePatientForOrder(p)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/70 transition"
                >
                  <div>
                    <div className="font-bold text-white">{p.fullName}</div>
                    <div className="text-[10px] text-slate-400">{p.mobileNumber} • Age {p.age || 'N/A'}</div>
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
          membership={activePatientMembership as any}
          walletBalance={activePatientWallet}
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
          maxWidth="max-w-xl"
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
                <span className="text-slate-300">{inspectOrder.deliveryPhone}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Dispensed Medicines</h4>
              <div className="divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                {inspectOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
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
              <span>{formatCurrency(Number(inspectOrder.netAmount || inspectOrder.grossAmount || 0))}</span>
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
