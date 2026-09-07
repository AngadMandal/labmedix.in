import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PortalService, BloodTestBooking, LabTestResultParameter } from '../../services/portalService';
import { CatalogService, LabTestItem, HealthPackageItem } from '../../services/catalogService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { Patient, HealthCard } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { PhlebotomySampleLabelModal } from '../../components/patients/PhlebotomySampleLabelModal';
import { LabReportPrintModal } from '../../components/emr/LabReportPrintModal';
import { Modal } from '../../components/common/Modal';
import {
  TestTube,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  QrCode,
  Tag,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
  FileText,
  ThermometerSnowflake,
  ShieldCheck,
  User,
  FlaskConical,
  Activity
} from 'lucide-react';

export const LaboratoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'accessioning' | 'catalog' | 'packages'>('orders');

  // Core Data
  const [labOrders, setLabOrders] = useState<BloodTestBooking[]>(() => PortalService.getLabBookings());
  const [tests, setTests] = useState<LabTestItem[]>(() => CatalogService.getTests());
  const [packages, setPackages] = useState<HealthPackageItem[]>(() => CatalogService.getPackages());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedOrderForBarcode, setSelectedOrderForBarcode] = useState<BloodTestBooking | null>(null);
  const [selectedOrderForReport, setSelectedOrderForReport] = useState<BloodTestBooking | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // Accessioning quick-entry state
  const [accessionOrderId, setAccessionOrderId] = useState('');
  const [sampleTubeType, setSampleTubeType] = useState('EDTA (K2/K3) - Lavender Cap');
  const [sampleBarcode, setSampleBarcode] = useState('');
  const [phlebotomistName, setPhlebotomistName] = useState(() => currentUser?.fullName || 'Senior Phlebotomist');

  // Walk-in Lab Test Modal State
  const [walkinPatientId, setWalkinPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time Firestore sync & cross-tab events
  useEffect(() => {
    const unsub = ApiSyncService.subscribeToCollection<BloodTestBooking>('labBookings', (items) => {
      if (items) {
        setLabOrders(PortalService.getLabBookings());
      }
    });

    const handleSync = (e: CustomEvent) => {
      if (!e.detail?.key || e.detail.key === 'labmedix_portal_lab_bookings_v1') {
        setLabOrders(PortalService.getLabBookings());
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    return () => {
      unsub();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      setLabOrders(PortalService.getLabBookings());
      setTests(CatalogService.getTests());
      setPackages(CatalogService.getPackages());
      showToast('success', 'Central Sync Complete', 'Diagnostic laboratory data updated from Firestore.');
    } catch {
      setLabOrders(PortalService.getLabBookings());
      showToast('info', 'Local Cache Updated', 'Laboratory orders refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Status progression
  const handleMarkSampleCollected = (order: BloodTestBooking) => {
    const code = order.sampleBarcode || `LMX-BAR-${Date.now().toString().slice(-6)}`;
    const updated = PortalService.markSampleCollected(order.id, {
      barcode: code,
      tubeType: order.sampleTubeType || 'EDTA Tube',
      phlebotomist: currentUser?.fullName || 'Central Lab Phlebotomist'
    });
    if (updated) {
      ApiSyncService.saveDocument('labBookings', updated.id, updated).catch(() => {});
      setLabOrders(PortalService.getLabBookings());
      showToast('success', 'Specimen Accessioned', `Sample collected with Barcode: ${code}`);
    }
  };

  const handleReceiveInLab = (order: BloodTestBooking) => {
    const updated = PortalService.receiveSampleInLab(order.id, currentUser?.fullName || 'Senior Lab Technologist');
    if (updated) {
      ApiSyncService.saveDocument('labBookings', updated.id, updated).catch(() => {});
      setLabOrders(PortalService.getLabBookings());
      showToast('success', 'Sample Received in Lab', `Order ${order.bookingNo} is now undergoing clinical analysis.`);
    }
  };

  const handleReleaseReport = (order: BloodTestBooking) => {
    const defaultParams: LabTestResultParameter[] = [
      { parameterName: 'Hemoglobin (Hb)', observedValue: '14.2', referenceRange: '13.0 - 17.0', unit: 'g/dL', flag: 'normal' },
      { parameterName: 'Total Leukocyte Count (TLC)', observedValue: '7,800', referenceRange: '4,000 - 11,000', unit: 'cells/mcL', flag: 'normal' },
      { parameterName: 'Platelet Count', observedValue: '2.5', referenceRange: '1.5 - 4.5', unit: 'Lakhs/mcL', flag: 'normal' }
    ];
    const updated = PortalService.updateTestResults(order.id, defaultParams, 'All haematological parameters within normal biological reference intervals.');
    if (updated) {
      ApiSyncService.saveDocument('labBookings', updated.id, updated).catch(() => {});
      setLabOrders(PortalService.getLabBookings());
      showToast('success', 'Report Released', `Diagnostic report ready for ${order.patientName}.`);
    }
  };

  // Quick Accessioning Submit
  const handleQuickAccessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const order = labOrders.find(o => o.bookingNo === accessionOrderId || o.id === accessionOrderId);
    if (!order) {
      showToast('error', 'Order Not Found', 'Please enter a valid Lab Booking Number (e.g. LAB-2026-XXXX).');
      return;
    }

    const code = sampleBarcode.trim() || `LMX-${Math.floor(100000 + Math.random() * 900000)}`;
    PortalService.markSampleCollected(order.id, {
      barcode: code,
      tubeType: sampleTubeType,
      phlebotomist: phlebotomistName
    });

    setLabOrders(PortalService.getLabBookings());
    setSelectedOrderForBarcode(order);
    showToast('success', 'Accessioning Complete', `Specimen ${code} labeled and accessioned.`);
    setAccessionOrderId('');
    setSampleBarcode('');
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return labOrders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNo = (order.bookingNo || '').toLowerCase().includes(q);
        const matchesPatient = (order.patientName || '').toLowerCase().includes(q);
        const matchesPhone = (order.patientPhone || '').toLowerCase().includes(q);
        const matchesTest = (order.testName || '').toLowerCase().includes(q);
        const matchesBarcode = (order.sampleBarcode || '').toLowerCase().includes(q);
        const matchesCard = (order.cardNo || '').toLowerCase().includes(q);
        if (!matchesNo && !matchesPatient && !matchesPhone && !matchesTest && !matchesBarcode && !matchesCard) {
          return false;
        }
      }
      return true;
    });
  }, [labOrders, statusFilter, searchQuery]);

  // Filtered Tests Catalog
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (departmentFilter !== 'all' && t.department !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tests, departmentFilter, searchQuery]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set(tests.map(t => t.department).filter(Boolean));
    return Array.from(set);
  }, [tests]);

  // Metrics
  const metrics = useMemo(() => {
    const total = labOrders.length;
    const pending = labOrders.filter(o => o.status === 'confirmed' || o.status === 'phlebotomist_assigned').length;
    const collected = labOrders.filter(o => o.status === 'sample_collected').length;
    const processing = labOrders.filter(o => o.status === 'processing').length;
    const ready = labOrders.filter(o => o.status === 'report_ready').length;

    return { total, pending, collected, processing, ready };
  }, [labOrders]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-900/40 via-cyan-900/30 to-blue-900/20 border border-teal-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/30">
              <TestTube className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Laboratory & Diagnostics Hub
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Hospital Workflow
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            Pathology investigation queue, specimen accessioning, barcode label printing & test catalog.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={() => setActiveTab('accessioning')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold border border-teal-500/30 transition shadow-sm"
          >
            <Tag className="w-4 h-4" />
            <span>Phlebotomy Station</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Orders</span>
            <TestTube className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics.total}</p>
          <span className="text-[10px] text-slate-500">All registered investigations</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>Awaiting Collection</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-300">{metrics.pending}</p>
          <span className="text-[10px] text-amber-500/80">Pending phlebotomy</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-xs font-bold">
            <span>Sample Collected</span>
            <Tag className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-300">{metrics.collected}</p>
          <span className="text-[10px] text-purple-500/80">Barcoded specimens</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
            <span>In Lab Analysis</span>
            <FlaskConical className="w-4 h-4 text-cyan-400 animate-bounce" />
          </div>
          <p className="text-2xl font-black text-cyan-300">{metrics.processing}</p>
          <span className="text-[10px] text-cyan-500/80">Analyzer processing</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Report Ready</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{metrics.ready}</p>
          <span className="text-[10px] text-emerald-500/80">Authorized by Pathologist</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TestTube className="w-4 h-4" />
          <span>Active Test Orders ({labOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('accessioning')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'accessioning'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Sample Accessioning Station</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Diagnostic Test Master ({tests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('packages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'packages'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Health Packages ({packages.length})</span>
        </button>
      </div>

      {/* Tab 1: Active Test Orders Queue */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order # (LAB-2026-...), Patient, Test Name, Barcode, or Card No..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed / Booked</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="processing">In Lab Processing</option>
              <option value="report_ready">Report Ready</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <TestTube className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-base font-bold text-white">No Laboratory Orders</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No active diagnostic test requisitions match your criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Order # & Date</th>
                      <th className="px-4 py-3">Patient Details</th>
                      <th className="px-4 py-3">Investigation Name</th>
                      <th className="px-4 py-3">Prescribed By</th>
                      <th className="px-4 py-3">Specimen Barcode</th>
                      <th className="px-4 py-3">Net Fee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredOrders.map((order) => {
                      const statusBadges: Record<string, { label: string; color: string }> = {
                        confirmed: { label: 'Booked / Pending Sample', color: 'bg-amber-950 text-amber-300 border-amber-500/30' },
                        sample_collected: { label: 'Sample Collected', color: 'bg-purple-950 text-purple-300 border-purple-500/30' },
                        processing: { label: 'In Lab Processing', color: 'bg-cyan-950 text-cyan-300 border-cyan-500/30 animate-pulse' },
                        report_ready: { label: 'Report Ready', color: 'bg-emerald-950 text-emerald-300 border-emerald-500/30' }
                      };
                      const badge = statusBadges[order.status] || { label: order.status, color: 'bg-slate-800 text-slate-300 border-slate-700' };

                      return (
                        <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono">
                            <div className="font-bold text-white">{order.bookingNo}</div>
                            <div className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</div>
                          </td>

                          <td className="px-4 py-3 font-medium text-white">
                            <div>{order.patientName}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>{order.patientPhone || 'N/A'}</span>
                              {order.cardNo && (
                                <span className="text-teal-400 font-mono">Card: {order.cardNo}</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-bold text-white">{order.testName}</div>
                            <div className="text-[10px] text-slate-400">{order.category}</div>
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            {order.prescribedByDoctorName ? (
                              <span className="font-medium text-teal-300">Dr. {order.prescribedByDoctorName}</span>
                            ) : (
                              <span className="text-slate-500">Walk-in Patient</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono">
                            {order.sampleBarcode ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
                                {order.sampleBarcode}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Not collected</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-black text-white">
                            {formatCurrency(Number(order.netPrice || order.grossPrice || 0))}
                          </td>

                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Print Barcode Label */}
                              <button
                                onClick={() => setSelectedOrderForBarcode(order)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="Print Barcode Tube Label"
                              >
                                <Tag className="w-4 h-4" />
                              </button>

                              {/* Progression Action */}
                              {order.status === 'confirmed' && (
                                <button
                                  onClick={() => handleMarkSampleCollected(order)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition"
                                >
                                  Collect Sample
                                </button>
                              )}

                              {order.status === 'sample_collected' && (
                                <button
                                  onClick={() => handleReceiveInLab(order)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition"
                                >
                                  Receive in Lab
                                </button>
                              )}

                              {order.status === 'processing' && (
                                <button
                                  onClick={() => handleReleaseReport(order)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                                >
                                  Release Report
                                </button>
                              )}

                              {order.status === 'report_ready' && (
                                <button
                                  onClick={() => setSelectedOrderForReport(order)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                                >
                                  <Printer className="w-3 h-3" /> Report
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
        </div>
      )}

      {/* Tab 2: Sample Accessioning Station */}
      {activeTab === 'accessioning' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-400" />
                <span>Quick Accessioning Scanner</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Scan requisition barcode or enter booking number to print specimen tube label.
              </p>
            </div>

            <form onSubmit={handleQuickAccessionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Booking / Order # *</label>
                <input
                  type="text"
                  value={accessionOrderId}
                  onChange={(e) => setAccessionOrderId(e.target.value)}
                  placeholder="E.g. LAB-2026-1234"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Tube / Specimen Type</label>
                <select
                  value={sampleTubeType}
                  onChange={(e) => setSampleTubeType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-teal-500"
                >
                  <option value="EDTA (K2/K3) - Lavender Cap">EDTA (K2/K3) - Lavender Cap (CBC / HbA1c)</option>
                  <option value="Serum Gel / Clot Activator - Gold/Red Cap">Serum Gel / Clot Activator - Gold/Red Cap (Biochemistry / LFT)</option>
                  <option value="Sodium Fluoride - Grey Cap">Sodium Fluoride - Grey Cap (Fasting Blood Sugar)</option>
                  <option value="Sodium Citrate - Light Blue Cap">Sodium Citrate - Light Blue Cap (Coagulation PT/INR)</option>
                  <option value="Sterile Urine Container - Yellow Cap">Sterile Urine Container - Yellow Cap</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Custom Barcode (Optional)</label>
                <input
                  type="text"
                  value={sampleBarcode}
                  onChange={(e) => setSampleBarcode(e.target.value)}
                  placeholder="Auto-generated if left blank..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Phlebotomist Staff</label>
                <input
                  type="text"
                  value={phlebotomistName}
                  onChange={(e) => setPhlebotomistName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-teal-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4" />
                <span>Accession & Generate Label</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span>Recent Accessioned Specimens</span>
            </h2>

            <div className="divide-y divide-slate-800">
              {labOrders.filter(o => o.sampleBarcode).slice(0, 8).map(order => (
                <div key={order.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-purple-300">{order.sampleBarcode}</span>
                      <span>•</span>
                      <span>{order.patientName}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {order.testName} • {order.sampleTubeType || 'Standard Specimen'}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedOrderForBarcode(order)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Label</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Diagnostic Test Master Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests by name, test code, or category..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.slice(0, 30).map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition space-y-2">
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-teal-300 border border-slate-700">
                    {t.code}
                  </span>
                  <span className="font-black text-white text-base">
                    {formatCurrency(t.mrp)}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm leading-snug">{t.name}</h3>

                <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Specimen: <strong className="text-slate-300">{t.specimen}</strong></span>
                  <span>TAT: <strong className="text-slate-300">{t.tatHours} hrs</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Health Check Packages */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition flex flex-col justify-between space-y-4 shadow-lg">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {pkg.tag || 'Comprehensive'}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{pkg.packageCode}</span>
                </div>

                <h3 className="text-lg font-black text-white">{pkg.name}</h3>
                <p className="text-xs text-slate-400">{pkg.description}</p>

                <div className="space-y-1 pt-2">
                  <span className="text-[11px] font-bold text-slate-300">Includes {pkg.parametersCount || pkg.includedTests.length} Tests / Parameters:</span>
                  <div className="flex flex-wrap gap-1">
                    {pkg.includedTests.slice(0, 4).map((testName, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {testName}
                      </span>
                    ))}
                    {pkg.includedTests.length > 4 && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-teal-400 font-bold">
                        +{pkg.includedTests.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs line-through text-slate-500 mr-2">{formatCurrency(pkg.mrp)}</span>
                  <span className="text-xl font-black text-white">{formatCurrency(pkg.offerPrice)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barcode Label Modal */}
      {selectedOrderForBarcode && (
        <PhlebotomySampleLabelModal
          isOpen={!!selectedOrderForBarcode}
          onClose={() => setSelectedOrderForBarcode(null)}
          booking={selectedOrderForBarcode}
        />
      )}

      {/* Lab Report Print Modal */}
      {selectedOrderForReport && (
        <LabReportPrintModal
          isOpen={!!selectedOrderForReport}
          onClose={() => setSelectedOrderForReport(null)}
          booking={selectedOrderForReport}
        />
      )}
    </div>
  );
};
