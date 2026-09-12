import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PortalService, BloodTestBooking } from '../../services/portalService';
import { CatalogService, LabTestItem, HealthPackageItem } from '../../services/catalogService';
import { LaboratoryService, TUBE_TYPES } from '../../services/laboratoryService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import {
  Patient,
  HealthCard,
  LabOrderRecord,
  SpecimenRecord,
  LaboratorySettings,
  PrinterLabelFormat,
  LabTechnicianItem
} from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { generateSampleBarcode } from '../../utils/idGenerator';
import { PhlebotomySampleDispatchModal, PHLEBOTOMIST_PRESETS } from '../../components/patients/PhlebotomySampleDispatchModal';
import { LabReportPrintModal } from '../../components/emr/LabReportPrintModal';
import { LabResultEntryModal } from '../../components/laboratory/LabResultEntryModal';
import { LabVerificationModal } from '../../components/laboratory/LabVerificationModal';
import { CreateLabOrderModal } from '../../components/laboratory/CreateLabOrderModal';
import { SpecimenReceptionModal } from '../../components/laboratory/SpecimenReceptionModal';
import { SpecimenLabelPrinterModal } from '../../components/laboratory/SpecimenLabelPrinterModal';
import { CriticalResultActionModal } from '../../components/laboratory/CriticalResultActionModal';
import { ReportAmendmentModal } from '../../components/laboratory/ReportAmendmentModal';
import { TechnicianMasterEditModal } from '../../components/laboratory/TechnicianMasterEditModal';
import { DoctorMasterEditModal } from '../../components/emr/DoctorMasterEditModal';
import { TechnicianMasterService } from '../../services/technicianMasterService';
import { DoctorMasterService, DoctorMasterItem } from '../../services/doctorMasterService';
import { DiagnosticReportService } from '../../services/diagnosticReportService';
import { AuditService } from '../../services/auditService';
import { WorkflowPermissionService } from '../../services/workflowPermissionService';
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
  Box,
  Sliders,
  RotateCcw,
  AlertTriangle,
  History,
  ShieldAlert,
  Flame,
  FileSpreadsheet,
  Settings,
  ArrowRight,
  ExternalLink,
  Lock
} from 'lucide-react';

export type LabTab =
  | 'dashboard'
  | 'queue'
  | 'orders'
  | 'collection'
  | 'accessioning'
  | 'labels'
  | 'processing'
  | 'verification'
  | 'critical'
  | 'reports'
  | 'catalog'
  | 'packages'
  | 'doctors_technicians'
  | 'tat'
  | 'history'
  | 'settings';

export interface LaboratoryPageProps {
  initialTab?: LabTab;
}

export const LaboratoryPage: React.FC<LaboratoryPageProps> = ({ initialTab }) => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  // Navigation Tab with URL synchronization
  const tabParam = (searchParams.get('tab') as LabTab) || initialTab;
  const [activeTab, setActiveTab] = useState<LabTab>(tabParam || 'dashboard');

  useEffect(() => {
    const currentParam = (searchParams.get('tab') as LabTab) || initialTab;
    if (currentParam) {
      setActiveTab(currentParam);
    }
  }, [searchParams, initialTab]);

  // Core Data Stores
  const [labOrders, setLabOrders] = useState<LabOrderRecord[]>(() => LaboratoryService.getAll());
  const [specimens, setSpecimens] = useState<SpecimenRecord[]>(() => LaboratoryService.getAllSpecimens());
  const [tests, setTests] = useState<LabTestItem[]>(() => CatalogService.getTests());
  const [packages, setPackages] = useState<HealthPackageItem[]>(() => CatalogService.getPackages());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [labSettings, setLabSettings] = useState<LaboratorySettings>(() => LaboratoryService.getSettings());

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
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Patient History Lookup
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);

  // Quick Accessioning form inputs
  const [quickAccessionOrderId, setQuickAccessionOrderId] = useState('');
  const [quickTubeType, setQuickTubeType] = useState('EDTA (K2/K3) — Lavender Cap');
  const [quickBarcode, setQuickBarcode] = useState('');
  const [quickPhlebName, setQuickPhlebName] = useState(() => currentUser?.fullName || 'Central Phlebotomist');

  // Active Modals
  const [selectedOrderForBarcode, setSelectedOrderForBarcode] = useState<LabOrderRecord | null>(null);
  const [selectedOrderForReport, setSelectedOrderForReport] = useState<LabOrderRecord | null>(null);
  const [selectedOrderForResultEntry, setSelectedOrderForResultEntry] = useState<LabOrderRecord | null>(null);
  const [selectedOrderForVerification, setSelectedOrderForVerification] = useState<LabOrderRecord | null>(null);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<LabOrderRecord | null>(null);
  const [selectedOrderForCriticalAction, setSelectedOrderForCriticalAction] = useState<LabOrderRecord | null>(null);
  const [selectedReportForAmendment, setSelectedReportForAmendment] = useState<any | null>(null);
  const [selectedSpecimenForReception, setSelectedSpecimenForReception] = useState<SpecimenRecord | LabOrderRecord | null>(null);
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // Real-time Firestore sync & cross-tab events
  const reloadAllData = () => {
    setLabOrders(LaboratoryService.getAll());
    setSpecimens(LaboratoryService.getAllSpecimens());
    setTests(CatalogService.getTests());
    setPackages(CatalogService.getPackages());
    setTechnicians(TechnicianMasterService.getAllTechnicians());
    setDoctors(DoctorMasterService.getAllDoctors());
    setLabSettings(LaboratoryService.getSettings());
  };

  useEffect(() => {
    const unsubOrders = ApiSyncService.subscribeToCollection<LabOrderRecord>('labBookings', (items) => {
      if (items) reloadAllData();
    });

    const unsubSpecimens = ApiSyncService.subscribeToCollection<SpecimenRecord>('specimens', (items) => {
      if (items) setSpecimens(LaboratoryService.getAllSpecimens());
    });

    const handleSync = (e: CustomEvent) => {
      const key = e.detail?.key;
      if (
        !key ||
        key === 'labmedix_portal_lab_bookings_v1' ||
        key === 'labmedix_specimens_v1' ||
        key === 'labmedix_diagnostic_reports_v1' ||
        key === 'labmedix_technicians_v1' ||
        key === 'labmedix_doctors_v1' ||
        key === 'labmedix_lab_settings_v1'
      ) {
        reloadAllData();
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    return () => {
      unsubOrders();
      unsubSpecimens();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      reloadAllData();
      showToast('success', 'Central Sync Complete', 'Diagnostic laboratory data synchronized live from cloud Firestore.');
    } catch {
      reloadAllData();
      showToast('info', 'Cache Updated', 'Local laboratory repository refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Status Progression Shortcuts
  const handleMarkSampleCollected = (order: LabOrderRecord) => {
    const res = LaboratoryService.markSampleCollected(order.id, {
      barcode: order.sampleBarcode,
      tubeType: order.sampleTubeType,
      phlebotomistName: currentUser?.fullName || 'Senior Phlebotomist',
      phlebotomistId: currentUser?.id
    });
    AuditService.logWorkflowAction(currentUser, 'collect', 'specimen', res.order.id, {
      accessionNumber: res.order.accessionNumber,
      barcode: res.order.sampleBarcode,
      patientName: res.order.patientName
    });
    reloadAllData();
    showToast('success', 'Specimen Accessioned & Labeled', `Accession: ${res.order.accessionNumber} | Barcode: ${res.order.sampleBarcode}`);
    setSelectedOrderForBarcode(res.order);
  };

  const handleReceiveInLab = (order: LabOrderRecord) => {
    LaboratoryService.receiveSpecimenInLab(order.id, currentUser?.fullName || 'Clinical Technologist');
    AuditService.logWorkflowAction(currentUser, 'receive', 'specimen', order.id, {
      orderNumber: order.orderNumber,
      department: order.department,
      patientName: order.patientName
    });
    reloadAllData();
    showToast('success', 'Specimen Received in Lab', `Order ${order.orderNumber} routed to ${order.department}.`);
  };

  // Quick Accession Form Submit
  const handleQuickAccessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const order = labOrders.find(o => o.orderNumber === quickAccessionOrderId || o.bookingNo === quickAccessionOrderId || o.id === quickAccessionOrderId);
    if (!order) {
      showToast('error', 'Requisition Not Found', 'Please enter a valid Lab Order Number (e.g. LAB-ORD-2026-...).');
      return;
    }

    const res = LaboratoryService.markSampleCollected(order.id, {
      barcode: quickBarcode.trim() || undefined,
      tubeType: quickTubeType,
      phlebotomistName: quickPhlebName
    });

    reloadAllData();
    setSelectedOrderForBarcode(res.order);
    showToast('success', 'Accessioning Complete', `Specimen ${res.order.accessionNumber} labeled & accessioned.`);
    setQuickAccessionOrderId('');
    setQuickBarcode('');
  };

  // Filtered Orders Queue
  const filteredOrders = useMemo(() => {
    return labOrders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && order.priority !== priorityFilter) return false;
      if (departmentFilter !== 'all' && order.department !== departmentFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNo = (order.orderNumber || order.bookingNo || '').toLowerCase().includes(q);
        const matchesPatient = (order.patientName || '').toLowerCase().includes(q);
        const matchesPhone = (order.patientPhone || '').toLowerCase().includes(q);
        const matchesTest = (order.testName || '').toLowerCase().includes(q);
        const matchesBarcode = (order.sampleBarcode || '').toLowerCase().includes(q);
        const matchesAccession = (order.accessionNumber || '').toLowerCase().includes(q);
        const matchesCard = (order.cardNo || '').toLowerCase().includes(q);
        if (!matchesNo && !matchesPatient && !matchesPhone && !matchesTest && !matchesBarcode && !matchesAccession && !matchesCard) {
          return false;
        }
      }
      return true;
    });
  }, [labOrders, statusFilter, priorityFilter, departmentFilter, searchQuery]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set(tests.map(t => t.department).filter(Boolean));
    return Array.from(set);
  }, [tests]);

  // Real-time Actual Firestore Metrics (100% Calculated, Zero Fake Data)
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = labOrders.filter(o => (o.createdAt || '').startsWith(today)).length;
    const totalOrders = labOrders.length;
    const pendingOrders = labOrders.filter(o => o.status === 'ordered' || o.status === 'booked' || o.status === 'billing_pending').length;
    const awaitingCollection = labOrders.filter(o => o.status === 'ready_for_collection' || o.status === 'sample_collection_pending' || o.status === 'phlebotomy_assigned').length;
    const collected = labOrders.filter(o => o.status === 'collected' || o.status === 'sample_collected' || o.status === 'accessioned').length;
    const awaitingReception = specimens.filter(s => s.status === 'collected').length;
    const inProcessing = labOrders.filter(o => o.status === 'processing' || o.status === 'in_lab').length;
    const pendingResults = labOrders.filter(o => o.status === 'processing' || o.status === 'result_pending').length;
    const awaitingVerification = labOrders.filter(o => o.status === 'results_entered' || o.status === 'verification_pending').length;
    const finalizedReports = labOrders.filter(o => o.status === 'verified' || o.status === 'finalized' || o.status === 'report_ready').length;
    const recollectionRequired = labOrders.filter(o => o.status === 'recollection_required' || o.recollectionRequired).length;
    const rejectedSpecimens = specimens.filter(s => s.status === 'rejected').length;
    const criticalResults = labOrders.filter(o => o.hasCriticalResult || (o.parameters || []).some(p => p.flag === 'critical' || p.critical)).length;

    // TAT breakdowns
    let withinTat = 0;
    let approachingTat = 0;
    let delayedTat = 0;

    for (const order of labOrders) {
      const tat = LaboratoryService.calculateTat(order);
      if (tat.status === 'within_tat') withinTat++;
      else if (tat.status === 'approaching_tat') approachingTat++;
      else if (tat.status === 'tat_delayed') delayedTat++;
    }

    // Department-wise pending work
    const deptWorkload: Record<string, number> = {};
    for (const order of labOrders) {
      if (order.status !== 'verified' && order.status !== 'finalized' && order.status !== 'cancelled') {
        const dept = order.department || 'Other';
        deptWorkload[dept] = (deptWorkload[dept] || 0) + 1;
      }
    }

    return {
      todayOrders,
      totalOrders,
      pendingOrders,
      awaitingCollection,
      collected,
      awaitingReception,
      inProcessing,
      pendingResults,
      awaitingVerification,
      finalizedReports,
      recollectionRequired,
      rejectedSpecimens,
      criticalResults,
      withinTat,
      approachingTat,
      delayedTat,
      deptWorkload
    };
  }, [labOrders, specimens]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Hospital Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-950 via-slate-900 to-blue-950 border border-teal-500/30 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/40 animate-pulse">
              <TestTube className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                Laboratory & Diagnostics Hub
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/40">
                  Hospital Workflow
                </span>
                {metrics.criticalResults > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    <span>{metrics.criticalResults} Critical Alert</span>
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-300">
                Hospital-grade diagnostic management: requisition, phlebotomy, specimen accessioning, barcode label printing, technician workbench, pathologist sign-off & A4/WhatsApp delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-lg shadow-teal-600/30 transition border border-teal-400/40"
          >
            <Plus className="w-4 h-4" />
            <span>Book Lab Test</span>
          </button>

          <button
            onClick={() => {
              setSelectedSpecimenForReception(null);
              setIsReceptionModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-purple-500/30 transition shadow-sm"
          >
            <Tag className="w-4 h-4 text-purple-400" />
            <span>Specimen Reception</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
            title="Real-time central Firestore synchronization"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* 16-Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin scrollbar-thumb-slate-700">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Activity },
          { id: 'queue', label: `Investigation Queue (${labOrders.length})`, icon: TestTube },
          { id: 'orders', label: 'Lab Orders', icon: FileSpreadsheet },
          { id: 'collection', label: `Phlebotomy (${metrics.awaitingCollection})`, icon: Flame },
          { id: 'accessioning', label: `Accessioning & Reception (${metrics.awaitingReception})`, icon: Tag },
          { id: 'labels', label: 'Barcode & Labels', icon: Printer },
          { id: 'processing', label: `Result Entry (${metrics.inProcessing})`, icon: FlaskConical },
          { id: 'verification', label: `Medical Review (${metrics.awaitingVerification})`, icon: Stethoscope },
          { id: 'critical', label: `Critical Alerts (${metrics.criticalResults})`, icon: ShieldAlert, badgeColor: metrics.criticalResults > 0 ? 'text-rose-400 font-black' : '' },
          { id: 'reports', label: `Diagnostic Reports (${metrics.finalizedReports})`, icon: FileCheck },
          { id: 'catalog', label: `Test Catalog (${tests.length})`, icon: Layers },
          { id: 'packages', label: `Health Packages (${packages.length})`, icon: Package },
          { id: 'doctors_technicians', label: 'Doctors & Technicians', icon: PenTool },
          { id: 'tat', label: `TAT Monitoring (${metrics.delayedTat} Delayed)`, icon: Clock },
          { id: 'history', label: 'Patient Lab History', icon: History },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LabTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              } ${tab.badgeColor || ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: LABORATORY DASHBOARD                                */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Real-time KPI Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-md">
              <span className="text-slate-400 text-[11px] font-bold block truncate">Today's Orders</span>
              <div className="text-2xl font-black text-white">{metrics.todayOrders}</div>
              <span className="text-[10px] text-slate-500">{metrics.totalOrders} total recorded</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-1 shadow-md">
              <span className="text-amber-400 text-[11px] font-bold block truncate">Awaiting Collection</span>
              <div className="text-2xl font-black text-amber-300">{metrics.awaitingCollection}</div>
              <span className="text-[10px] text-amber-500/80">Pending phlebotomy</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-1 shadow-md">
              <span className="text-purple-400 text-[11px] font-bold block truncate">Collected Specimen</span>
              <div className="text-2xl font-black text-purple-300">{metrics.collected}</div>
              <span className="text-[10px] text-purple-500/80">{metrics.awaitingReception} await lab check-in</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-1 shadow-md">
              <span className="text-cyan-400 text-[11px] font-bold block truncate">Processing in Lab</span>
              <div className="text-2xl font-black text-cyan-300">{metrics.inProcessing}</div>
              <span className="text-[10px] text-cyan-500/80">Analyzer execution</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/30 space-y-1 shadow-md">
              <span className="text-blue-400 text-[11px] font-bold block truncate">Verification Pending</span>
              <div className="text-2xl font-black text-blue-300">{metrics.awaitingVerification}</div>
              <span className="text-[10px] text-blue-500/80">Pathologist review</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-1 shadow-md">
              <span className="text-emerald-400 text-[11px] font-bold block truncate">Finalized Reports</span>
              <div className="text-2xl font-black text-emerald-300">{metrics.finalizedReports}</div>
              <span className="text-[10px] text-emerald-500/80">Officially locked & signed</span>
            </div>
          </div>

          {/* Secondary Safety KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-rose-300 text-xs font-bold">Critical Results</span>
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-rose-200">{metrics.criticalResults}</div>
              <span className="text-[10px] text-rose-400">Panic value protocol active</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 text-xs font-bold">Recollection Queued</span>
                <RotateCcw className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-200">{metrics.recollectionRequired}</div>
              <span className="text-[10px] text-amber-400">Replacement draw pending</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-bold">Rejected Specimens</span>
                <AlertTriangle className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-300">{metrics.rejectedSpecimens}</div>
              <span className="text-[10px] text-slate-500">QC rejected with reason</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-bold">TAT Status</span>
                <Clock className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-xs font-mono font-bold flex items-center gap-2 pt-1">
                <span className="text-emerald-400">{metrics.withinTat} On Time</span> •
                <span className="text-amber-400">{metrics.approachingTat} Warn</span> •
                <span className="text-rose-400">{metrics.delayedTat} Delay</span>
              </div>
              <span className="text-[10px] text-slate-500">Benchmark monitoring</span>
            </div>
          </div>

          {/* Department Workload Distribution */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Department Workload Distribution (Active Investigations)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
              {Object.keys(metrics.deptWorkload).length === 0 ? (
                <div className="col-span-full text-center py-6 text-slate-500 text-xs">
                  All departmental investigation queues are fully completed.
                </div>
              ) : (
                Object.entries(metrics.deptWorkload).map(([dept, count]) => (
                  <div key={dept} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 truncate block">{dept}</span>
                    <div className="text-xl font-black text-teal-300">{count}</div>
                    <span className="text-[9px] text-slate-500">active tests</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Master Workflow Operational Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('collection')}
              className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/40 border border-purple-500/30 hover:border-purple-500/60 transition cursor-pointer space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <Flame className="w-5 h-5 text-purple-400" />
                <ArrowRight className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Phlebotomy Station</h4>
              <p className="text-xs text-slate-400">Specimen collection, vacutainer draw confirmation, and cold-chain compliance.</p>
            </div>

            <div
              onClick={() => setActiveTab('accessioning')}
              className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950/40 border border-teal-500/30 hover:border-teal-500/60 transition cursor-pointer space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <Tag className="w-5 h-5 text-teal-400" />
                <ArrowRight className="w-4 h-4 text-teal-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Specimen Reception</h4>
              <p className="text-xs text-slate-400">Barcode scanning, 4-point safety verification checklist, acceptance and controlled QC rejection.</p>
            </div>

            <div
              onClick={() => setActiveTab('verification')}
              className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950/40 border border-blue-500/30 hover:border-blue-500/60 transition cursor-pointer space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <Stethoscope className="w-5 h-5 text-blue-400" />
                <ArrowRight className="w-4 h-4 text-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Pathologist Verification</h4>
              <p className="text-xs text-slate-400">Review analytical findings, digital signature sign-off, and immutable report finalization.</p>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: INVESTIGATION QUEUE                                 */}
      {/* ────────────────────────────────────────────────────────── */}
      {(activeTab === 'queue' || activeTab === 'orders') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order #, Patient Name, Phone, Test, Barcode, Accession #..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none"
            >
              <option value="all">All Workflow Statuses</option>
              <option value="ready_for_collection">Awaiting Collection</option>
              <option value="collected">Collected</option>
              <option value="processing">In Lab Processing</option>
              <option value="results_entered">Results Entered</option>
              <option value="verified">Verified / Finalized</option>
              <option value="recollection_required">Recollection Required</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT / Emergency</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Master Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <TestTube className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No Laboratory Investigations Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No active investigations match your search or filter criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Order # & Date</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Patient Details</th>
                      <th className="px-4 py-3">Investigation & Dept</th>
                      <th className="px-4 py-3">Specimen / Barcode</th>
                      <th className="px-4 py-3">Fee & Billing</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredOrders.map((order) => {
                      const tat = LaboratoryService.calculateTat(order);
                      const isCritical = order.hasCriticalResult || (order.parameters || []).some(p => p.flag === 'critical');

                      return (
                        <tr key={order.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-mono">
                            <div className="font-bold text-white">{order.orderNumber || order.bookingNo}</div>
                            <div className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border ${
                              order.priority === 'stat'
                                ? 'bg-rose-950 text-rose-300 border-rose-500/60 animate-pulse'
                                : order.priority === 'urgent'
                                ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {order.priority || 'routine'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <strong className="text-white block">{order.patientName}</strong>
                            <div className="text-[10px] text-slate-400">
                              {order.patientAge || '—'}Y/{order.patientGender?.[0]?.toUpperCase() || 'M'} • {order.patientPhone || 'No Phone'}
                            </div>
                            {order.cardNo && (
                              <span className="text-teal-400 text-[10px] font-mono">Card: {order.cardNo}</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-bold text-teal-300">{order.testName}</div>
                            <div className="text-[10px] text-slate-400">{order.department}</div>
                            {order.prescribedByDoctorName && (
                              <div className="text-[10px] text-slate-500">Ref: Dr. {order.prescribedByDoctorName}</div>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono text-[11px]">
                            {order.accessionNumber ? (
                              <div className="font-bold text-teal-300">{order.accessionNumber}</div>
                            ) : (
                              <span className="text-slate-500 italic">No accession</span>
                            )}
                            {order.sampleBarcode && (
                              <div className="text-purple-300 font-bold">{order.sampleBarcode}</div>
                            )}
                            <div className="text-[9px] text-slate-500">{order.sampleTubeType || 'Standard Tube'}</div>
                          </td>

                          <td className="px-4 py-3 font-mono">
                            <div className="font-bold text-white">
                              {formatCurrency(Number(order.netPayable || order.netPrice || order.grossPrice || 0))}
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                              order.paymentStatus === 'paid' || order.paymentStatus === 'paid_counter'
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}>
                              {order.paymentStatus?.toUpperCase() || 'PENDING'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider block w-fit border ${
                                order.status === 'verified' || order.status === 'finalized' || order.status === 'report_ready'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                  : order.status === 'processing' || order.status === 'in_lab'
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                                  : order.status === 'results_entered' || order.status === 'verification_pending'
                                  ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                                  : order.status === 'recollection_required'
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                                  : order.status === 'rejected'
                                  ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {order.status?.replace(/_/g, ' ')}
                              </span>

                              {isCritical && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50 text-[9px] font-black flex items-center gap-1 w-fit animate-pulse">
                                  <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                  <span>CRITICAL</span>
                                </span>
                              )}

                              <div className="text-[9px] text-slate-500 font-mono">
                                {tat.status === 'tat_delayed' ? (
                                  <span className="text-rose-400 font-bold">Delayed</span>
                                ) : tat.status === 'approaching_tat' ? (
                                  <span className="text-amber-400 font-bold">~{tat.remainingMinutes}m left</span>
                                ) : (
                                  <span className="text-emerald-400">Within TAT</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Print Barcode Label */}
                              {(can('barcode_print') || can('specimen_collect')) && (
                                <button
                                  onClick={() => setSelectedOrderForBarcode(order)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 transition"
                                  title="Print Specimen Tube Barcode Label"
                                >
                                  <Tag className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Collection action */}
                              {can('specimen_collect') && (order.status === 'ready_for_collection' || order.status === 'ordered' || order.status === 'recollection_required') && (
                                <button
                                  onClick={() => handleMarkSampleCollected(order)}
                                  className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition shadow-sm"
                                >
                                  Collect
                                </button>
                              )}

                              {/* Reception action */}
                              {can('specimen_receive') && order.status === 'collected' && (
                                <button
                                  onClick={() => {
                                    setSelectedSpecimenForReception(order);
                                    setIsReceptionModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] transition shadow-sm"
                                >
                                  Receive Lab
                                </button>
                              )}

                              {/* Result Entry action */}
                              {can('result_enter') && (order.status === 'processing' || order.status === 'in_lab' || order.status === 'results_entered') && (
                                <button
                                  onClick={() => setSelectedOrderForResultEntry(order)}
                                  className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition shadow-sm"
                                >
                                  Enter Results
                                </button>
                              )}

                              {/* Pathologist Verification action */}
                              {(can('result_verify') || can('report_finalize')) && (order.status === 'results_entered' || order.status === 'verification_pending') && (
                                <button
                                  onClick={() => setSelectedOrderForVerification(order)}
                                  className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition shadow-sm"
                                >
                                  Verify & Sign
                                </button>
                              )}

                              {/* Critical Action Documentation */}
                              {isCritical && !order.criticalResultNotifiedAt && (
                                <button
                                  onClick={() => setSelectedOrderForCriticalAction(order)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition shadow-sm flex items-center gap-1"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>Notify MD</span>
                                </button>
                              )}

                              {/* Finalized Report actions */}
                              {(order.status === 'verified' || order.status === 'finalized' || order.status === 'report_ready') && (
                                <>
                                  {(can('report_download') || can('lab_order_view')) && (
                                    <button
                                      onClick={() => setSelectedOrderForReport(order)}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition shadow-sm flex items-center gap-1"
                                      title="View Official A4 Diagnostic Report"
                                    >
                                      <Printer className="w-3 h-3" /> Report
                                    </button>
                                  )}

                                  {can('report_share') && (
                                    <button
                                      onClick={() => {
                                        const rpt = DiagnosticReportService.createOrGetReportForOrder(order as any);
                                        const res = DiagnosticReportService.validateAndPrepareWhatsAppShare(rpt.reportNumber, currentUser);
                                        if (res.success && res.url) {
                                          window.open(res.url, '_blank', 'noopener,noreferrer');
                                          showToast('success', 'WhatsApp Dispatched', `Opened WhatsApp report link for ${order.patientName}.`);
                                        } else {
                                          showToast('error', 'WhatsApp Blocked', res.error || 'Report is not ready for external sharing.');
                                        }
                                      }}
                                      className="p-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 transition"
                                      title="Send Official Report Link via WhatsApp"
                                    >
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                  )}

                                  {can('report_amend') && (
                                    <button
                                      onClick={() => {
                                        const rpt = DiagnosticReportService.createOrGetReportForOrder(order as any);
                                        setSelectedReportForAmendment(rpt);
                                      }}
                                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition border border-slate-700"
                                      title="Amend Report"
                                    >
                                      Amend
                                    </button>
                                  )}
                                </>
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

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: SAMPLE COLLECTION (PHLEBOTOMY QUEUE)                */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'collection' && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-teal-950 border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Flame className="w-5 h-5 text-purple-400" />
                <span>Phlebotomy Sample Collection Station</span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Specimen draw queue with vacutainer tube cap guidance, accession generation, and real-time cold-chain compliance (2°C - 8°C).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-emerald-400" />
                <span>WHO/NABL Cold-Chain Monitored</span>
              </span>
            </div>
          </div>

          {/* Vacutainer Tube Guidance Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {TUBE_TYPES.map(tube => (
              <div key={tube.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${tube.capColor}`} />
                  <span className="font-bold text-white text-[11px] truncate">{tube.label.split(' — ')[0]}</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2">{tube.tests}</p>
              </div>
            ))}
          </div>

          {/* Phlebotomy Awaiting Draw List */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Specimens Awaiting Draw ({metrics.awaitingCollection})</span>
            </h3>

            {labOrders.filter(o => o.status === 'ready_for_collection' || o.status === 'ordered' || o.status === 'recollection_required').length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No specimens currently awaiting collection.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {labOrders
                  .filter(o => o.status === 'ready_for_collection' || o.status === 'ordered' || o.status === 'recollection_required')
                  .map(order => (
                    <div key={order.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-white text-sm">{order.patientName}</strong>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                            order.priority === 'stat' ? 'bg-rose-950 text-rose-300 border border-rose-500/50' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {order.priority}
                          </span>
                          {order.recollectionRequired && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                              RECOLLECTION REQUIRED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {order.testName} • {order.sampleTubeType || 'Standard Vacutainer'} • Req #: {order.orderNumber}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrderForBarcode(order)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Print Label</span>
                        </button>
                        <button
                          onClick={() => handleMarkSampleCollected(order)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md shadow-purple-600/30"
                        >
                          Confirm Draw
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: SPECIMEN ACCESSIONING & RECEPTION                   */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'accessioning' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Accessioning Scanner Widget */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-400" />
                <span>Quick Accessioning Scanner</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Scan requisition barcode or enter order number to accession specimen.
              </p>
            </div>

            <form onSubmit={handleQuickAccessionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Lab Requisition # *</label>
                <input
                  type="text"
                  value={quickAccessionOrderId}
                  onChange={(e) => setQuickAccessionOrderId(e.target.value)}
                  placeholder="E.g. LAB-ORD-2026-..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Tube / Vacutainer Type</label>
                <select
                  value={quickTubeType}
                  onChange={(e) => setQuickTubeType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-teal-500"
                >
                  {TUBE_TYPES.map(t => (
                    <option key={t.id} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Custom Barcode (Optional)</label>
                <input
                  type="text"
                  value={quickBarcode}
                  onChange={(e) => setQuickBarcode(e.target.value)}
                  placeholder="Auto-generated if left blank..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Phlebotomist Staff</label>
                <input
                  type="text"
                  value={quickPhlebName}
                  onChange={(e) => setQuickPhlebName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-teal-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4" />
                <span>Accession & Print Label</span>
              </button>
            </form>
          </div>

          {/* Accessioned Specimens List & Checklist Trigger */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <span>Accessioned Specimens Tracking</span>
              </h2>
              <button
                onClick={() => {
                  setSelectedSpecimenForReception(null);
                  setIsReceptionModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-md"
              >
                Open Reception Checklist
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {specimens.slice(0, 10).map((spec) => (
                <div key={spec.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-teal-300">{spec.accessionNumber || 'ACC-PENDING'}</span>
                      <span>•</span>
                      <span className="font-mono text-purple-300">{spec.barcode}</span>
                      <span>•</span>
                      <span>{spec.patientName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {spec.testName} • {spec.tubeType} • Status: <strong className="text-slate-300 uppercase">{spec.status}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const ord = LaboratoryService.getById(spec.labOrderId);
                        setSelectedOrderForBarcode(ord || null);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 transition"
                      title="Print Barcode Tube Label"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    {spec.status === 'collected' && (
                      <button
                        onClick={() => {
                          setSelectedSpecimenForReception(spec);
                          setIsReceptionModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition shadow-sm"
                      >
                        Verify & Receive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 8: VERIFICATION & PATHOLOGIST REVIEW                   */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-teal-950 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                <Stethoscope className="w-5 h-5 text-blue-400" />
                <span>Authorized Pathologist Verification Queue</span>
              </div>
              <p className="text-xs text-slate-300">
                Medical review of analytical parameter findings, electronic signature stamping, and immutable report finalization.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
              {metrics.awaitingVerification} Reports Awaiting Signature
            </span>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            {labOrders.filter(o => o.status === 'results_entered' || o.status === 'verification_pending').length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                All entered results have been medically verified and signed.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {labOrders
                  .filter(o => o.status === 'results_entered' || o.status === 'verification_pending')
                  .map(order => (
                    <div key={order.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-white text-sm">{order.patientName}</strong>
                          <span className="font-mono text-teal-300">{order.orderNumber}</span>
                          {order.hasCriticalResult && (
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50 text-[10px] font-black animate-pulse">
                              CRITICAL FINDING
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400">
                          {order.testName} • {order.department} • Tech: {order.resultsEnteredBy || 'Technician'}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedOrderForVerification(order)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 text-white font-bold text-xs shadow-lg transition"
                      >
                        Verify & Sign Report
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 9: CRITICAL RESULTS CONSOLE                            */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'critical' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 border border-rose-500/40 space-y-2 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-300 font-black text-sm uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
              <span>Critical Results Alert Console (Panic Values)</span>
            </div>
            <p className="text-xs text-slate-300">
              Laboratory parameters exceeding defined life-critical safety margins. Mandatory verbal/telephonic physician communication required.
            </p>
          </div>

          <div className="space-y-3">
            {labOrders.filter(o => o.hasCriticalResult || (o.parameters || []).some(p => p.flag === 'critical' || p.critical)).length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs rounded-3xl bg-slate-900 border border-slate-800">
                No active critical panic values detected across laboratory test orders.
              </div>
            ) : (
              labOrders
                .filter(o => o.hasCriticalResult || (o.parameters || []).some(p => p.flag === 'critical' || p.critical))
                .map(order => (
                  <div key={order.id} className="p-5 rounded-2xl bg-slate-900 border border-rose-500/40 space-y-3 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm">{order.patientName}</strong>
                        <span className="text-rose-400 font-mono font-bold">Req: {order.orderNumber}</span>
                      </div>
                      <span className="text-slate-400 text-xs">Doctor: Dr. {order.prescribedByDoctorName || 'Attending Physician'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(order.parameters || []).filter(p => p.flag === 'critical' || p.critical).map((cp, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 flex justify-between items-center text-xs">
                          <span className="text-white font-bold">{cp.parameterName}:</span>
                          <span className="text-rose-300 font-black text-sm">{cp.observedValue} {cp.unit}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="text-xs text-slate-400">
                        {order.criticalResultNotifiedAt ? (
                          <span className="text-emerald-400 font-bold">✓ {order.criticalResultNotes}</span>
                        ) : (
                          <span className="text-rose-400 font-bold animate-pulse">Action Pending: Contact Prescribing Physician</span>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedOrderForCriticalAction(order)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Document MD Notification</span>
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 12: TAT MONITORING                                     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'tat' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Turnaround Time (TAT) Real-Time Monitoring</span>
            </h3>
            <p className="text-xs text-slate-300">
              Benchmarking elapsed time against target hours from requisition creation to final medical review.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Target TAT</th>
                    <th className="px-4 py-3">Elapsed</th>
                    <th className="px-4 py-3">TAT Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {labOrders.slice(0, 20).map(order => {
                    const tat = LaboratoryService.calculateTat(order);
                    return (
                      <tr key={order.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-white">{order.orderNumber}</td>
                        <td className="px-4 py-3">{order.patientName}</td>
                        <td className="px-4 py-3 text-teal-300 font-medium">{order.testName}</td>
                        <td className="px-4 py-3 text-slate-400">{formatDateTime(order.createdAt)}</td>
                        <td className="px-4 py-3 font-mono">{order.tatHours || 4} hours</td>
                        <td className="px-4 py-3 font-mono">{Math.floor(tat.elapsedMinutes / 60)}h {tat.elapsedMinutes % 60}m</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                            tat.status === 'tat_delayed'
                              ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                              : tat.status === 'approaching_tat'
                              ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          }`}>
                            {tat.status.replace('_', ' ')}
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

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 13: PATIENT LAB HISTORY                                */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search Patient Name, Phone, or Patient ID for complete longitudinal lab records..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {labOrders
              .filter(o => {
                if (!historySearchQuery.trim()) return false;
                const q = historySearchQuery.toLowerCase();
                return o.patientName.toLowerCase().includes(q) || (o.patientPhone || '').includes(q) || o.patientId.toLowerCase().includes(q);
              })
              .map(order => (
                <div key={order.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-white text-sm">{order.testName}</strong>
                      <div className="text-xs text-slate-400">{formatDate(order.createdAt)} • Ref: Dr. {order.prescribedByDoctorName}</div>
                    </div>
                    <span className="font-mono text-xs text-teal-300 font-bold">{order.orderNumber}</span>
                  </div>

                  {order.parameters && order.parameters.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
                      {order.parameters.map((p, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-950 border border-slate-850">
                          <span className="text-[10px] text-slate-400 truncate block">{p.parameterName}</span>
                          <strong className={`font-mono ${p.flag === 'critical' ? 'text-rose-400' : p.flag === 'high' ? 'text-amber-300' : 'text-white'}`}>
                            {p.observedValue || '—'} {p.unit}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 14: LABORATORY SETTINGS                                */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-400" />
              <span>Laboratory Hub System Configuration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure thermal printer label formats, accession numbering prefixes, and critical alert policies.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Default Barcode Label Dimension</label>
              <select
                value={labSettings.defaultLabelFormat}
                onChange={(e) => {
                  const updated = LaboratoryService.saveSettings({ defaultLabelFormat: e.target.value as PrinterLabelFormat }, currentUser?.fullName);
                  setLabSettings(updated);
                  showToast('success', 'Printer Dimension Saved', e.target.value);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
              >
                <option value="tube_50x25">50 × 25 mm (Standard Vacutainer Tube)</option>
                <option value="tube_50x30">50 × 30 mm (Standard Lab Tube)</option>
                <option value="bag_75x50">75 × 50 mm (Transport Bag / Large Aliquot)</option>
                <option value="pediatric_38x19">38 × 19 mm (Pediatric / Cryovial)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Accession Number Prefix</label>
                <input
                  type="text"
                  value={labSettings.autoAccessionPrefix}
                  onChange={(e) => {
                    const updated = LaboratoryService.saveSettings({ autoAccessionPrefix: e.target.value }, currentUser?.fullName);
                    setLabSettings(updated);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Default Benchmark TAT (Hours)</label>
                <input
                  type="number"
                  value={labSettings.defaultTatHours}
                  onChange={(e) => {
                    const updated = LaboratoryService.saveSettings({ defaultTatHours: parseInt(e.target.value, 10) || 4 }, currentUser?.fullName);
                    setLabSettings(updated);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="critSoundCheck"
                checked={labSettings.criticalAlertSound}
                onChange={(e) => {
                  const updated = LaboratoryService.saveSettings({ criticalAlertSound: e.target.checked }, currentUser?.fullName);
                  setLabSettings(updated);
                }}
                className="rounded border-slate-700 text-teal-600"
              />
              <label htmlFor="critSoundCheck" className="text-slate-300 cursor-pointer">
                Enable Audible Panic Alarm for Critical Laboratory Findings
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODALS INTEGRATION                                         */}
      {/* ────────────────────────────────────────────────────────── */}

      {/* Create Order Modal */}
      <CreateLabOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={() => reloadAllData()}
      />

      {/* Barcode & Label Printer Modal */}
      {selectedOrderForBarcode && (
        <SpecimenLabelPrinterModal
          isOpen={!!selectedOrderForBarcode}
          onClose={() => setSelectedOrderForBarcode(null)}
          order={selectedOrderForBarcode}
        />
      )}

      {/* Specimen Reception & Verification Checklist Modal */}
      {isReceptionModalOpen && (
        <SpecimenReceptionModal
          isOpen={isReceptionModalOpen}
          onClose={() => {
            setIsReceptionModalOpen(false);
            setSelectedSpecimenForReception(null);
          }}
          initialSpecimenOrOrder={selectedSpecimenForReception}
          onProcessed={() => reloadAllData()}
        />
      )}

      {/* Technician Result Entry Modal */}
      {selectedOrderForResultEntry && (
        <LabResultEntryModal
          isOpen={!!selectedOrderForResultEntry}
          onClose={() => setSelectedOrderForResultEntry(null)}
          booking={selectedOrderForResultEntry as any}
          order={selectedOrderForResultEntry as any}
          onResultsSaved={() => reloadAllData()}
        />
      )}

      {/* Pathologist Verification & Signing Modal */}
      {selectedOrderForVerification && (
        <LabVerificationModal
          isOpen={!!selectedOrderForVerification}
          onClose={() => setSelectedOrderForVerification(null)}
          booking={selectedOrderForVerification as any}
          order={selectedOrderForVerification as any}
          onVerified={() => reloadAllData()}
        />
      )}

      {/* Critical Panic Action Modal */}
      {selectedOrderForCriticalAction && (
        <CriticalResultActionModal
          isOpen={!!selectedOrderForCriticalAction}
          onClose={() => setSelectedOrderForCriticalAction(null)}
          order={selectedOrderForCriticalAction}
          onActionRecorded={() => reloadAllData()}
        />
      )}

      {/* Report Amendment Modal */}
      {selectedReportForAmendment && (
        <ReportAmendmentModal
          isOpen={!!selectedReportForAmendment}
          onClose={() => setSelectedReportForAmendment(null)}
          report={selectedReportForAmendment}
          onAmended={() => reloadAllData()}
        />
      )}

      {/* Official A4 Report Print Modal */}
      {selectedOrderForReport && (
        <LabReportPrintModal
          isOpen={!!selectedOrderForReport}
          onClose={() => setSelectedOrderForReport(null)}
          booking={selectedOrderForReport as any}
        />
      )}
    </div>
  );
};
