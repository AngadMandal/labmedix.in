import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PortalService, BloodTestBooking, LabTestResultParameter } from '../../services/portalService';
import { CatalogService, LabTestItem, HealthPackageItem } from '../../services/catalogService';
import { LaboratoryService } from '../../services/laboratoryService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { Patient, HealthCard } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { generateSampleBarcode } from '../../utils/idGenerator';
import { PhlebotomySampleLabelModal } from '../../components/patients/PhlebotomySampleLabelModal';
import { PhlebotomySampleDispatchModal, PHLEBOTOMIST_PRESETS } from '../../components/patients/PhlebotomySampleDispatchModal';
import { LabReportPrintModal } from '../../components/emr/LabReportPrintModal';
import { LabResultEntryModal } from '../../components/laboratory/LabResultEntryModal';
import { LabVerificationModal } from '../../components/laboratory/LabVerificationModal';
import { CreateLabOrderModal } from '../../components/laboratory/CreateLabOrderModal';
import { TechnicianMasterEditModal } from '../../components/laboratory/TechnicianMasterEditModal';
import { DoctorMasterEditModal } from '../../components/emr/DoctorMasterEditModal';
import { TechnicianMasterService } from '../../services/technicianMasterService';
import { DoctorMasterService, DoctorMasterItem } from '../../services/doctorMasterService';
import { DiagnosticReportService } from '../../services/diagnosticReportService';
import { LabTechnicianItem } from '../../types';
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
  Activity,
  CheckSquare,
  Stethoscope,
  PenTool,
  Award,
  FileCheck,
  Edit3,
  Trash2,
  Building,
  Check,
  Share2,
  Truck,
  Navigation,
  MapPin,
  Phone,
  Box
} from 'lucide-react';

export const LaboratoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'accessioning' | 'catalog' | 'packages' | 'doctors_technicians'>('orders');

  // Core Data
  const [labOrders, setLabOrders] = useState<BloodTestBooking[]>(() => PortalService.getLabBookings());
  const [tests, setTests] = useState<LabTestItem[]>(() => CatalogService.getTests());
  const [packages, setPackages] = useState<HealthPackageItem[]>(() => CatalogService.getPackages());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());

  // Technicians & Doctors Master
  const [technicians, setTechnicians] = useState<LabTechnicianItem[]>(() => TechnicianMasterService.getAllTechnicians());
  const [doctors, setDoctors] = useState<DoctorMasterItem[]>(() => DoctorMasterService.getAllDoctors());
  const [selectedTechnicianForEdit, setSelectedTechnicianForEdit] = useState<LabTechnicianItem | null>(null);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [selectedDoctorForEdit, setSelectedDoctorForEdit] = useState<DoctorMasterItem | null>(null);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [techSearchQuery, setTechSearchQuery] = useState('');
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedOrderForBarcode, setSelectedOrderForBarcode] = useState<BloodTestBooking | null>(null);
  const [selectedOrderForReport, setSelectedOrderForReport] = useState<BloodTestBooking | null>(null);
  const [selectedOrderForResultEntry, setSelectedOrderForResultEntry] = useState<BloodTestBooking | null>(null);
  const [selectedOrderForVerification, setSelectedOrderForVerification] = useState<BloodTestBooking | null>(null);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<BloodTestBooking | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // Accessioning quick-entry state
  const [accessionOrderId, setAccessionOrderId] = useState('');
  const [sampleTubeType, setSampleTubeType] = useState('EDTA (K2/K3) - Lavender Cap');
  const [sampleBarcode, setSampleBarcode] = useState('');
  const [phlebotomistName, setPhlebotomistName] = useState(() => currentUser?.fullName || 'Senior Phlebotomist');

  // Real-time Firestore sync & cross-tab events
  useEffect(() => {
    const unsub = ApiSyncService.subscribeToCollection<BloodTestBooking>('labBookings', (items) => {
      if (items) {
        setLabOrders(PortalService.getLabBookings());
      }
    });

    const handleSync = (e: CustomEvent) => {
      if (
        !e.detail?.key ||
        e.detail.key === 'labmedix_portal_lab_bookings_v1' ||
        e.detail.key === 'labmedix_technicians_v1' ||
        e.detail.key === 'labmedix_doctors_v1'
      ) {
        setLabOrders(PortalService.getLabBookings());
        setTechnicians(TechnicianMasterService.getAllTechnicians());
        setDoctors(DoctorMasterService.getAllDoctors());
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
      setTechnicians(TechnicianMasterService.getAllTechnicians());
      setDoctors(DoctorMasterService.getAllDoctors());
      showToast('success', 'Central Sync Complete', 'Diagnostic laboratory data updated from Firestore.');
    } catch {
      setLabOrders(PortalService.getLabBookings());
      setTechnicians(TechnicianMasterService.getAllTechnicians());
      setDoctors(DoctorMasterService.getAllDoctors());
      showToast('info', 'Local Cache Updated', 'Laboratory orders refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteTechnician = (tech: LabTechnicianItem) => {
    if (window.confirm(`Are you sure you want to remove ${tech.name} (${tech.technicianCode}) from the authorized technician registry?`)) {
      TechnicianMasterService.deleteTechnician(tech.id, currentUser?.role || 'super_admin');
      setTechnicians(TechnicianMasterService.getAllTechnicians());
      showToast('success', 'Technologist Removed', `${tech.name} has been removed.`);
    }
  };

  const handleToggleTechStatus = (tech: LabTechnicianItem) => {
    const nextStatus = tech.status === 'active' ? 'inactive' : 'active';
    TechnicianMasterService.updateTechnician(tech.id, { status: nextStatus }, currentUser?.role || 'super_admin');
    setTechnicians(TechnicianMasterService.getAllTechnicians());
    showToast('success', 'Status Updated', `${tech.name} is now ${nextStatus === 'active' ? 'Active' : 'Inactive'}.`);
  };

  const handleDeleteDoctor = (doc: DoctorMasterItem) => {
    if (window.confirm(`Are you sure you want to remove Dr. ${doc.name} from the medical registry?`)) {
      DoctorMasterService.deleteDoctor(doc.id, currentUser?.role || 'super_admin');
      setDoctors(DoctorMasterService.getAllDoctors());
      showToast('success', 'Doctor Removed', `Dr. ${doc.name} has been removed.`);
    }
  };

  // Status progression
  const handleMarkSampleCollected = (order: BloodTestBooking) => {
    const code = order.sampleBarcode || generateSampleBarcode(labOrders.map(o => o.sampleBarcode || ''));
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

  // Quick Accessioning Submit
  const handleQuickAccessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const order = labOrders.find(o => o.bookingNo === accessionOrderId || o.id === accessionOrderId);
    if (!order) {
      showToast('error', 'Order Not Found', 'Please enter a valid Lab Booking Number (e.g. LAB-2026-XXXX).');
      return;
    }

    const code = sampleBarcode.trim() || generateSampleBarcode(labOrders.map(o => o.sampleBarcode || ''));
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
            onClick={() => setIsNewOrderModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-lg shadow-teal-600/30 transition border border-teal-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Book Lab Test</span>
          </button>

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

        <button
          onClick={() => setActiveTab('doctors_technicians')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'doctors_technicians'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Doctors & Technicians / Signatures</span>
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
                            {/* Phlebotomy Logistics & Live ETA status badge */}
                            {(order.collectionType === 'home_collection' || order.assignedPhlebotomist || order.logisticsStage) && (
                              <div className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[9px]">
                                <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Truck className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{order.assignedPhlebotomist || (order.collectionType === 'home_collection' ? 'Home Sample' : 'Dispatched')}</span>
                                </span>
                                {order.collectionEtaTime && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                    <span>ETA {order.collectionEtaTime}</span>
                                  </span>
                                )}
                                {order.coldChainTemperature && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                    <ThermometerSnowflake className="w-2.5 h-2.5 text-purple-400" />
                                    <span>{order.coldChainTemperature}</span>
                                  </span>
                                )}
                              </div>
                            )}
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
                              {/* Phlebotomy Fleet Dispatch & ETA Button */}
                              {order.status !== 'report_ready' && (
                                <button
                                  onClick={() => setSelectedOrderForDispatch(order)}
                                  className="px-2 py-1 rounded-lg bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-300 hover:text-white font-bold text-[10px] transition shadow-sm flex items-center gap-1"
                                  title="Phlebotomy Fleet Dispatch, Real-Time ETA & Cold Chain Monitoring"
                                >
                                  <Truck className="w-3 h-3 text-teal-400" />
                                  <span>Dispatch & ETA</span>
                                </button>
                              )}

                              {/* Print Barcode Label */}
                              <button
                                onClick={() => setSelectedOrderForBarcode(order)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="Print Barcode Tube Label"
                              >
                                <Tag className="w-4 h-4" />
                              </button>

                              {/* Progression Action */}
                              {(order.status === 'confirmed' || order.status === 'phlebotomist_assigned') && (
                                <button
                                  onClick={() => handleMarkSampleCollected(order)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition shadow-sm shadow-purple-600/30"
                                >
                                  Collect Sample
                                </button>
                              )}

                              {order.status === 'sample_collected' && (
                                <button
                                  onClick={() => handleReceiveInLab(order)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition shadow-sm shadow-cyan-600/30"
                                >
                                  Receive in Lab
                                </button>
                              )}

                              {order.status === 'processing' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedOrderForResultEntry(order)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition shadow-sm shadow-blue-600/30"
                                  >
                                    Enter Results
                                  </button>
                                  {order.testResults && order.testResults.length > 0 && (
                                    <button
                                      onClick={() => setSelectedOrderForVerification(order)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition shadow-sm shadow-amber-600/30"
                                    >
                                      Verify & Sign
                                    </button>
                                  )}
                                </div>
                              )}

                              {order.status === 'report_ready' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedOrderForReport(order)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition shadow-sm shadow-emerald-600/30 flex items-center gap-1"
                                    title="Open Official A4 Report Preview & PDF"
                                  >
                                    <Printer className="w-3 h-3" /> Report
                                  </button>
                                  <button
                                    onClick={() => {
                                      const rpt = DiagnosticReportService.createOrGetReportForOrder(order);
                                      const res = DiagnosticReportService.validateAndPrepareWhatsAppShare(rpt.reportNumber, currentUser);
                                      if (res.success && res.url) {
                                        window.open(res.url, '_blank', 'noopener,noreferrer');
                                        showToast('success', 'WhatsApp Dispatched', `Opened WhatsApp report link for ${order.patientName}.`);
                                      } else {
                                        showToast('error', 'WhatsApp Blocked', res.error || 'Report is not ready for external sharing.');
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 transition"
                                    title="Send Official Report Link via WhatsApp"
                                  >
                                    <Share2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setSelectedOrderForVerification(order)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[10px] border border-slate-700"
                                    title="Review / Re-verify"
                                  >
                                    Review
                                  </button>
                                </div>
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

          {/* Phlebotomy Fleet & Cold-Chain Logistics Hub Section */}
          <div className="lg:col-span-3 space-y-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-purple-950/40 border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-teal-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Phlebotomy Fleet & Cold-Chain Logistics Operations
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  Real-time field collector fleet status, cold-chain compliance (2°C - 8°C), and specimen transit ETAs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WHO/NABL 2°C - 8°C Monitored (100% Compliant)</span>
                </span>
              </div>
            </div>

            {/* Field Collector Roster Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {PHLEBOTOMIST_PRESETS.map((phleb) => (
                <div
                  key={phleb.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 transition space-y-2 text-xs shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {phleb.bagId}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      phleb.status === 'Active on Road'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/30 animate-pulse'
                        : phleb.status === 'In Transit to Lab'
                        ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {phleb.status}
                    </span>
                  </div>

                  <div>
                    <strong className="text-sm font-bold text-white block">{phleb.name}</strong>
                    <span className="text-[11px] text-slate-400">{phleb.badge}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10.5px] space-y-1 font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Vehicle:</span>
                      <span className="text-amber-300 font-bold">{phleb.vehicle.split(' (')[0]}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Phone:</span>
                      <a href={`tel:${phleb.phone}`} className="text-teal-400 hover:underline">
                        {phleb.phone}
                      </a>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-0.5 border-t border-slate-800">
                      <span>Completed Today:</span>
                      <span className="text-emerald-400 font-bold">{phleb.completedToday} samples</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Active In-Transit & Doorstep Specimens Table */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Active In-Transit & Doorstep Sample Dispatch Queue
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {labOrders.filter(o => o.collectionType === 'home_collection' || o.logisticsStage || o.assignedPhlebotomist).length} Orders Monitored
                </span>
              </div>

              {labOrders.filter(o => o.collectionType === 'home_collection' || o.logisticsStage || o.assignedPhlebotomist).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No doorstep sample dispatch orders currently active. Book a home collection or dispatch a pending order.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">Order / Date</th>
                        <th className="px-3 py-2.5">Patient Details</th>
                        <th className="px-3 py-2.5">Investigation</th>
                        <th className="px-3 py-2.5">Assigned Collector</th>
                        <th className="px-3 py-2.5">Box Seal & Temp</th>
                        <th className="px-3 py-2.5">Live ETA</th>
                        <th className="px-3 py-2.5">Stage</th>
                        <th className="px-3 py-2.5 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {labOrders
                        .filter(o => o.collectionType === 'home_collection' || o.logisticsStage || o.assignedPhlebotomist)
                        .slice(0, 10)
                        .map((order) => (
                          <tr key={order.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-3 py-2.5 font-mono">
                              <div className="font-bold text-white">{order.bookingNo}</div>
                              <div className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <strong className="text-white block">{order.patientName}</strong>
                              <span className="text-[10px] text-slate-400">{order.patientPhone || 'N/A'}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-white">{order.testName}</div>
                              <div className="text-[10px] text-slate-400">{order.category}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-300">
                              <div className="font-bold text-teal-300 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-teal-400" />
                                <span>{order.assignedPhlebotomist || 'Collector Assigned'}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {order.phlebotomistVehicle ? order.phlebotomistVehicle.split(' (')[0] : 'Hero Splendor'}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono">
                              <div className="text-purple-300 font-bold text-[11px]">
                                {order.boxSealBarcode || 'BOX-CC-4921'}
                              </div>
                              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <ThermometerSnowflake className="w-2.5 h-2.5 text-emerald-400" />
                                <span>{order.coldChainTemperature || '3.8°C'} (Compliant)</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono">
                              <div className="text-cyan-300 font-black">
                                {order.collectionEtaTime || '08:30 AM'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                ~{order.collectionEtaMinutes || 20}m transit
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-teal-950 text-teal-300 border border-teal-500/30">
                                {order.logisticsStage ? order.logisticsStage.replace(/_/g, ' ') : order.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedOrderForDispatch(order)}
                                  className="px-2 py-1 rounded-lg bg-teal-950 hover:bg-teal-900 border border-teal-500/40 text-teal-300 hover:text-white font-bold text-[10px] transition"
                                  title="Update Phlebotomy Logistics ETA"
                                >
                                  Adjust ETA
                                </button>
                                {order.status === 'sample_collected' && (
                                  <button
                                    onClick={() => handleReceiveInLab(order)}
                                    className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition shadow-sm"
                                  >
                                    Receive Lab
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedOrderForBarcode(order)}
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                  title="Print Barcode Label"
                                >
                                  <Tag className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
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

      {/* Tab 5: Doctors & Technicians / Signatures Master */}
      {activeTab === 'doctors_technicians' && (
        <div className="space-y-6">
          {/* Top Banner Notice */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <span>Authorized Signatory & Diagnostic Master</span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Certified Medical Laboratory Technologists (MLT) and Consulting Pathologists with verified council registrations and cryptographic digital signatures. Configured credentials and signatures are automatically stamped on verified Diagnostic Reports.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedTechnicianForEdit(null);
                  setIsTechModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-teal-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Technologist</span>
              </button>

              <button
                onClick={() => {
                  setSelectedDoctorForEdit(null);
                  setIsDoctorModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Doctor / Pathologist</span>
              </button>
            </div>
          </div>

          {/* 2-Column Master Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Laboratory Technologists */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    <TestTube className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    Laboratory Technologists ({technicians.length})
                  </h2>
                </div>
              </div>

              {/* Technologist Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={techSearchQuery}
                  onChange={(e) => setTechSearchQuery(e.target.value)}
                  placeholder="Search technologist by name, code, qualification..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Technologists List */}
              <div className="space-y-3">
                {technicians
                  .filter((t) => {
                    if (!techSearchQuery.trim()) return true;
                    const q = techSearchQuery.toLowerCase();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.technicianCode.toLowerCase().includes(q) ||
                      t.qualification.toLowerCase().includes(q) ||
                      t.department.toLowerCase().includes(q)
                    );
                  })
                  .map((tech) => (
                    <div
                      key={tech.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              {tech.technicianCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tech.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {tech.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-white mt-1">{tech.name}</h3>
                          <p className="text-xs text-slate-300">{tech.designation}</p>
                          <p className="text-[11px] text-teal-400">{tech.qualification}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTechnicianForEdit(tech);
                              setIsTechModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold transition border border-slate-700"
                            title="Edit Credentials & Signature"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleTechStatus(tech)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
                            title={tech.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'super_admin' && (
                            <button
                              onClick={() => handleDeleteTechnician(tech)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-rose-400 text-xs font-bold transition border border-slate-700"
                              title="Delete Technologist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <div>
                          <span className="text-slate-500">Department:</span>
                          <p className="text-slate-300 font-medium">{tech.department}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Reg No:</span>
                          <p className="text-slate-300 font-medium">{tech.regNumber || 'Not Specified'}</p>
                        </div>
                      </div>

                      {/* Signature Preview */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Digital Signature:</span>
                        {tech.signatureUrl ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Configured</span>
                            </span>
                            <div className="w-16 h-8 bg-white/95 rounded border border-slate-600 p-0.5 flex items-center justify-center overflow-hidden">
                              <img src={tech.signatureUrl} alt="Signature" className="max-h-full object-contain" />
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pending Signature</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: Reporting Pathologists & Doctors */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    Pathologists & Doctors ({doctors.length})
                  </h2>
                </div>
              </div>

              {/* Doctors Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search doctor by name, qualification, department..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Doctors List */}
              <div className="space-y-3">
                {doctors
                  .filter((d) => {
                    if (!docSearchQuery.trim()) return true;
                    const q = docSearchQuery.toLowerCase();
                    return (
                      d.name.toLowerCase().includes(q) ||
                      d.qualification.toLowerCase().includes(q) ||
                      d.department.toLowerCase().includes(q) ||
                      (d.designation && d.designation.toLowerCase().includes(q))
                    );
                  })
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                doc.isReportingDoctor
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {doc.isReportingDoctor ? 'Reporting Pathologist' : 'Consulting Doctor'}
                            </span>
                            {doc.regNumber && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                {doc.regNumber}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-white mt-1">Dr. {doc.name}</h3>
                          <p className="text-xs text-slate-300">{doc.designation || 'Consultant'}</p>
                          <p className="text-[11px] text-blue-400">{doc.qualification}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedDoctorForEdit(doc);
                              setIsDoctorModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold transition border border-slate-700"
                            title="Edit Credentials & Signature"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'super_admin' && (
                            <button
                              onClick={() => handleDeleteDoctor(doc)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-rose-400 text-xs font-bold transition border border-slate-700"
                              title="Delete Doctor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <div>
                          <span className="text-slate-500">Department:</span>
                          <p className="text-slate-300 font-medium">{doc.department}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Consultation Fee:</span>
                          <p className="text-slate-300 font-medium">{formatCurrency(doc.standardFee || 0)}</p>
                        </div>
                      </div>

                      {/* Signature & Stamp Previews */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Signature:</span>
                          {doc.signatureUrl ? (
                            <div className="w-14 h-7 bg-white/95 rounded border border-slate-600 p-0.5 flex items-center justify-center overflow-hidden">
                              <img src={doc.signatureUrl} alt="Signature" className="max-h-full object-contain" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-400/80">Pending</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Council Stamp:</span>
                          {doc.stampUrl ? (
                            <div className="w-12 h-7 bg-white/95 rounded border border-slate-600 p-0.5 flex items-center justify-center overflow-hidden">
                              <img src={doc.stampUrl} alt="Stamp" className="max-h-full object-contain" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Central Diagnostic Center Identity Card */}
          {(() => {
            const company = StorageService.getCompanyProfile();
            return (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Central Diagnostic Laboratory Profile</h3>
                      <p className="text-xs text-slate-400">
                        Automatically populates report headers, accreditation badges & patient verification certificates.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Live Synced to Diagnostic Reports</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Diagnostic Center</span>
                    <p className="text-xs font-bold text-white truncate">{company.name}</p>
                    <p className="text-[11px] text-teal-400 truncate">{company.tagline || 'Advanced Diagnostic Network'}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Official Contact</span>
                    <p className="text-xs font-bold text-white truncate">{company.phone}</p>
                    <p className="text-[11px] text-slate-400 truncate">{company.email}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Accreditation / Reg #</span>
                    <p className="text-xs font-bold text-white truncate">
                      {company.registrationNo || company.gstin || 'Govt / NABL Reg. Configured'}
                    </p>
                    <p className="text-[11px] text-teal-400 truncate">{company.website || 'labmedix.in'}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Primary Facility Address</span>
                    <p className="text-xs text-slate-300 line-clamp-2">{company.address}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Lab Order / Walk-in Booking Modal */}
      <CreateLabOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={() => {
          setLabOrders(PortalService.getLabBookings());
        }}
      />

      {/* Lab Result Entry Modal for Technicians */}
      {selectedOrderForResultEntry && (
        <LabResultEntryModal
          isOpen={!!selectedOrderForResultEntry}
          onClose={() => setSelectedOrderForResultEntry(null)}
          booking={selectedOrderForResultEntry}
          onResultsSaved={() => {
            setLabOrders(PortalService.getLabBookings());
          }}
        />
      )}

      {/* Lab Verification & Digital Signature Modal for Pathologists */}
      {selectedOrderForVerification && (
        <LabVerificationModal
          isOpen={!!selectedOrderForVerification}
          onClose={() => setSelectedOrderForVerification(null)}
          booking={selectedOrderForVerification}
          onVerified={() => {
            setLabOrders(PortalService.getLabBookings());
          }}
        />
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

      {/* Phlebotomy Sample Dispatch & Logistics ETA Modal */}
      {selectedOrderForDispatch && (
        <PhlebotomySampleDispatchModal
          isOpen={!!selectedOrderForDispatch}
          onClose={() => setSelectedOrderForDispatch(null)}
          booking={selectedOrderForDispatch}
          onStatusUpdated={() => {
            setLabOrders(PortalService.getLabBookings());
          }}
          onOpenLabelPrinter={(b) => setSelectedOrderForBarcode(b)}
        />
      )}

      {/* Technician Master Edit / Add Modal */}
      <TechnicianMasterEditModal
        isOpen={isTechModalOpen}
        onClose={() => {
          setIsTechModalOpen(false);
          setSelectedTechnicianForEdit(null);
        }}
        technician={selectedTechnicianForEdit}
        onSaved={() => {
          setTechnicians(TechnicianMasterService.getAllTechnicians());
        }}
        isSuperAdmin={currentUser?.role === 'super_admin'}
      />

      {/* Doctor Master Edit / Add Modal */}
      <DoctorMasterEditModal
        isOpen={isDoctorModalOpen}
        onClose={() => {
          setIsDoctorModalOpen(false);
          setSelectedDoctorForEdit(null);
        }}
        doctor={selectedDoctorForEdit}
        onSaved={() => {
          setDoctors(DoctorMasterService.getAllDoctors());
        }}
        isSuperAdmin={currentUser?.role === 'super_admin'}
      />
    </div>
  );
};
