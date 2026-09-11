import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatalogService, LabTestItem, HealthPackageItem } from '../../services/catalogService';
import { LabPanelItem } from '../../types';
import {
  DiagnosticAIService,
  AI_SYMPTOM_KNOWLEDGE_BASE,
  AISymptomMapping,
  AISymptomTestItem,
  AIPackageRecommendation
} from '../../services/diagnosticAIService';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { PhlebotomySampleLabelModal } from '../../components/patients/PhlebotomySampleLabelModal';
import { PhlebotomySampleDispatchModal } from '../../components/patients/PhlebotomySampleDispatchModal';
import { LabReportPrintModal } from '../../components/emr/LabReportPrintModal';
import { LabResultEntryModal } from '../../components/laboratory/LabResultEntryModal';
import { PortalService, BloodTestBooking, LabTestResultParameter } from '../../services/portalService';
import { TestMasterService } from '../../services/testMasterService';
import { MasterTestParameter, TestResultType } from '../../types';
import { PatientService } from '../../services/patientService';
import { CardService } from '../../services/cardService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  TestTube,
  Package,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Edit2,
  Trash2,
  Upload,
  Download,
  Sparkles,
  Zap,
  Tag,
  ShieldCheck,
  Lock,
  Layers,
  Flame,
  Printer,
  ChevronRight,
  TrendingDown,
  Clock,
  FlaskConical,
  HeartPulse,
  Activity,
  FileSpreadsheet,
  BrainCircuit,
  Bot,
  Lightbulb,
  Stethoscope,
  Thermometer,
  Shield,
  Heart,
  Eye,
  Briefcase,
  CopyPlus,
  CheckSquare,
  Square,
  ArrowRight,
  RotateCcw,
  Sliders,
  DollarSign,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  ClipboardList,
  Send
} from 'lucide-react';

export const TestMasterPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canManage = isSuperAdmin || currentUser?.role === 'admin' || can('catalog_manage');

  // Main Tabs: Individual Tests vs Panels/Packages Master vs Calculation Studio vs Live Lab Operations Hub
  const [activeTab, setActiveTab] = useState<'test_master' | 'panels_master' | 'calculation_rules' | 'package_builder' | 'lab_operations'>('test_master');

  // Core Data State
  const [tests, setTests] = useState<LabTestItem[]>(() => CatalogService.getLabTests());
  const [panels, setPanels] = useState<LabPanelItem[]>(() => CatalogService.getPanels());
  const [packages, setPackages] = useState<HealthPackageItem[]>(() => CatalogService.getHealthPackages());
  const [labBookings, setLabBookings] = useState<BloodTestBooking[]>(() => PortalService.getLabBookings());
  const [labFilterStatus, setLabFilterStatus] = useState<string>('all');
  const [labSearchQuery, setLabSearchQuery] = useState<string>('');

  // Panel Master Modal State
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<LabPanelItem | null>(null);
  const [panelSearchQuery, setPanelSearchQuery] = useState('');
  const [panelForm, setPanelForm] = useState<{
    code: string;
    name: string;
    category: string;
    department: string;
    specimen: string;
    type: 'panel' | 'package';
    tag: string;
    description: string;
    individualTestIds: string[];
    mrp: number;
    offerPrice: number;
    fastingRequired: boolean;
    tatHours: number;
    popular: boolean;
    status: 'active' | 'inactive';
  }>({
    code: '',
    name: '',
    category: 'Biochemistry',
    department: 'Clinical Biochemistry',
    specimen: 'Serum (2ml)',
    type: 'panel',
    tag: 'CLINICAL PANEL',
    description: '',
    individualTestIds: [],
    mrp: 600,
    offerPrice: 450,
    fastingRequired: true,
    tatHours: 4,
    popular: true,
    status: 'active'
  });

  useEffect(() => {
    const handleSync = (e: CustomEvent) => {
      const key = e.detail?.key;
      if (!key || key === 'LABMEDIX_TEST_MASTER_LIST') {
        setTests(CatalogService.getLabTests());
      }
      if (!key || key === 'LABMEDIX_PANELS_MASTER_LIST') {
        setPanels(CatalogService.getPanels());
      }
      if (!key || key === 'LABMEDIX_HEALTH_PACKAGES_LIST') {
        setPackages(CatalogService.getHealthPackages());
      }
      if (!key || key === 'labmedix_portal_lab_bookings_v1') {
        setLabBookings(PortalService.getLabBookings());
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
  }, []);

  // Lab Operations Modals State
  const [selectedBookingForLabel, setSelectedBookingForLabel] = useState<BloodTestBooking | null>(null);
  const [selectedBookingForDispatch, setSelectedBookingForDispatch] = useState<BloodTestBooking | null>(null);
  const [selectedBookingForResults, setSelectedBookingForResults] = useState<BloodTestBooking | null>(null);
  const [selectedBookingForReport, setSelectedBookingForReport] = useState<BloodTestBooking | null>(null);
  const [showWalkinBookingModal, setShowWalkinBookingModal] = useState<boolean>(false);

  // Result Entry Form State
  const [editingResults, setEditingResults] = useState<LabTestResultParameter[]>([]);
  const [pathologistNotesInput, setPathologistNotesInput] = useState<string>('');
  const [pathologistNameInput, setPathologistNameInput] = useState<string>('Dr. Kaushik Chatterjee, MD (Pathology)');

  // Walk-in Lab Booking Form State
  const [walkinPatientId, setWalkinPatientId] = useState<string>(() => PatientService.getAll()[0]?.id || '');
  const [walkinSelectedTestIds, setWalkinSelectedTestIds] = useState<string[]>([]);
  const [walkinCollectionType, setWalkinCollectionType] = useState<'lab_visit' | 'home_collection'>('lab_visit');
  const [walkinPaymentMode, setWalkinPaymentMode] = useState<'paid_counter' | 'paid_wallet' | 'pay_at_lab'>('paid_counter');

  // Search & Filter State (Single Unified Omni-AI Search)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fastingFilter, setFastingFilter] = useState('all');
  const [selectedAiSymptom, setSelectedAiSymptom] = useState<string | null>(null);

  // Modals State
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isAutoBundleOpen, setIsAutoBundleOpen] = useState(false);
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
  const [isAiPackageGeneratorOpen, setIsAiPackageGeneratorOpen] = useState(false);
  const [isRxStudioOpen, setIsRxStudioOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTestItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<HealthPackageItem | null>(null);
  const [quickLabelTest, setQuickLabelTest] = useState<LabTestItem | null>(null);

  // AI Doctor Prescription Studio State
  const [rxPatientName, setRxPatientName] = useState('Md. Cardholder Patient');
  const [rxPatientAge, setRxPatientAge] = useState<number>(45);
  const [rxPatientGender, setRxPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [rxComplaints, setRxComplaints] = useState('Persistent high-grade fever for 4 days with chills, severe retro-orbital headache, and muscle pain.');
  const [rxDraft, setRxDraft] = useState<ReturnType<typeof DiagnosticAIService.generateDoctorPrescriptionTextDraft> | null>(null);

  // Auto Package Builder Selection State
  const [selectedTestIdsForBundle, setSelectedTestIdsForBundle] = useState<string[]>([]);
  const [bundleName, setBundleName] = useState('');
  const [bundleCategory, setBundleCategory] = useState('Full Body');
  const [bundleDiscount, setBundleDiscount] = useState<number>(40);
  const [bundleTargetGroup, setBundleTargetGroup] = useState('General Adults');

  // Package Form State (for Add & Edit Package)
  const [packageForm, setPackageForm] = useState<{
    id?: string;
    packageCode: string;
    name: string;
    tag: string;
    category: string;
    targetGroup: string;
    mrp: number;
    offerPrice: number;
    fastingRequired: boolean;
    description: string;
    includedTests: string[];
    popular: boolean;
    status: 'active' | 'inactive';
  }>({
    packageCode: '',
    name: '',
    tag: '⭐ BEST VALUE • COMPREHENSIVE',
    category: 'Full Body',
    targetGroup: 'Men & Women (All Ages)',
    mrp: 2500,
    offerPrice: 1299,
    fastingRequired: true,
    description: '',
    includedTests: [],
    popular: true,
    status: 'active'
  });

  // AI Package Generator Input State
  const [aiPatientAge, setAiPatientAge] = useState<number>(45);
  const [aiPatientGender, setAiPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [aiChiefComplaints, setAiChiefComplaints] = useState('Fever for 3 days with headache, body ache and weakness');
  const [aiCoMorbidities, setAiCoMorbidities] = useState<string[]>(['Diabetes']);
  const [generatedAiRecommendation, setGeneratedAiRecommendation] = useState<AIPackageRecommendation | null>(null);

  // Bulk Upload Paste Text State
  const [bulkPasteText, setBulkPasteText] = useState('');

  // Single Test Form State with Parameters
  const [testForm, setTestForm] = useState<{
    code: string;
    name: string;
    category: string;
    department: string;
    specimen: string;
    method: string;
    reportTemplate: string;
    fastingRequired: boolean;
    tatHours: number;
    mrp: number;
    description: string;
    popular: boolean;
    parameters: MasterTestParameter[];
  }>({
    code: '',
    name: '',
    category: 'Biochemistry',
    department: 'Clinical Biochemistry',
    specimen: 'Serum (2ml)',
    method: 'Fully Automated Analyzer',
    reportTemplate: 'standard_pathology',
    fastingRequired: false,
    tatHours: 4,
    mrp: 300,
    description: '',
    popular: false,
    parameters: []
  });

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshData = () => {
    setTests(CatalogService.getLabTests());
    setPackages(CatalogService.getHealthPackages());
  };

  // Distinct Categories
  const categories = useMemo(() => {
    const set = new Set(tests.map(t => t.category));
    return ['all', ...Array.from(set)];
  }, [tests]);

  // Currently Selected AI Clinical Symptom Object
  const activeSymptomMapping = useMemo(() => {
    if (!selectedAiSymptom) return null;
    return AI_SYMPTOM_KNOWLEDGE_BASE.find(s => s.symptomKey === selectedAiSymptom) || null;
  }, [selectedAiSymptom]);

  // AI Semantic Omni-Search Execution
  const aiSearchResult = useMemo(() => {
    return DiagnosticAIService.searchTestsSmart(searchQuery, tests);
  }, [searchQuery, tests]);

  // Filtered Tests (Combines AI Search + Category/Fasting Filters + Symptom Chip Filter)
  const filteredTests = useMemo(() => {
    let result = aiSearchResult.matchedTests;

    if (selectedAiSymptom && activeSymptomMapping) {
      const targetNames = new Set(activeSymptomMapping.recommendedTestNames.map(n => n.toLowerCase()));
      result = result.filter(t =>
        targetNames.has(t.name.toLowerCase()) ||
        activeSymptomMapping.keywords.some(k => t.name.toLowerCase().includes(k) || t.description.toLowerCase().includes(k))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter);
    }

    if (fastingFilter === 'fasting') {
      result = result.filter(t => t.fastingRequired);
    } else if (fastingFilter === 'routine') {
      result = result.filter(t => !t.fastingRequired);
    }

    return result;
  }, [aiSearchResult, selectedAiSymptom, activeSymptomMapping, categoryFilter, fastingFilter]);

  // Calculated Stats
  const stats = useMemo(() => {
    const totalTests = tests.length;
    const fastingCount = tests.filter(t => t.fastingRequired).length;
    const routineCount = totalTests - fastingCount;
    const totalPackages = packages.length;
    const avgRate = totalTests > 0 ? Math.round(tests.reduce((acc, t) => acc + (t.mrp || 0), 0) / totalTests) : 0;

    return { totalTests, fastingCount, routineCount, totalPackages, avgRate };
  }, [tests, packages]);

  // Helper for Vacutainer Cap & Category Colors
  const getCategoryMeta = (category?: string, testName?: string) => {
    const lower = (testName || category || '').toLowerCase();
    if (lower.includes('cbc') || lower.includes('blood count') || lower.includes('hba1c') || lower.includes('esr')) {
      return { capColor: '#8B5CF6', capName: 'EDTA Lavender Top', badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40' };
    }
    if (lower.includes('sugar') || lower.includes('fbs') || lower.includes('ppbs') || lower.includes('glucose')) {
      return { capColor: '#94A3B8', capName: 'Fluoride Gray Top', badge: 'bg-slate-800 text-slate-200 border-slate-600' };
    }
    if (lower.includes('pt/inr') || lower.includes('coagulation') || lower.includes('aptt')) {
      return { capColor: '#38BDF8', capName: 'Citrate Blue Top', badge: 'bg-sky-950/80 text-sky-300 border-sky-500/40' };
    }
    if (lower.includes('electrolyte') || lower.includes('heparin')) {
      return { capColor: '#10B981', capName: 'Heparin Green Top', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' };
    }
    return { capColor: '#FBBF24', capName: 'SST Gold Top', badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40' };
  };

  // Copy Test to Clipboard
  const handleCopyTest = (test: LabTestItem) => {
    if (!test) return;
    const text = `${test.name || 'Test'} (${test.code || 'N/A'}) - Standard Rate: ₹${test.mrp || 0} - Category: ${test.category || 'General'} - Specimen: ${test.specimen || 'Blood'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(test.id);
    showToast('success', 'Test Details Copied', `${test.name || 'Test'} (₹${test.mrp || 0}) copied to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Doctor Rx Studio
  const handleOpenRxStudio = (symptomKey?: string) => {
    const draft = DiagnosticAIService.generateDoctorPrescriptionTextDraft({
      patientName: rxPatientName,
      patientAge: rxPatientAge,
      patientGender: rxPatientGender,
      symptomKey: symptomKey || selectedAiSymptom || undefined,
      customComplaints: rxComplaints,
      selectedTests: tests.filter(t => selectedTestIdsForBundle.includes(t.id))
    });

    setRxDraft(draft);
    setIsRxStudioOpen(true);
  };

  // Copy Complete Doctor Prescription Text
  const handleCopyDoctorPrescription = () => {
    if (!rxDraft) return;
    navigator.clipboard.writeText(rxDraft.formattedPrescriptionFullText);
    triggerCelebrationFireworks();
    showToast('success', 'Doctor Prescription Copied', 'Full formatted prescription draft copied to clipboard.');
  };

  // Direct Transfer to Doctor EMR Module
  const handleTransferToEMR = () => {
    showToast('info', 'Opening Doctor EMR Suite', 'Navigating to Clinical EMR with pre-filled prescription parameters.');
    navigate('/emr');
  };

  // Copy Complete AI Clinical Requisition Slip
  const handleCopyAiRequisitionSlip = (mapping: AISymptomMapping) => {
    const matchingTests = tests.filter(t =>
      mapping.recommendedTestNames.some(name => t.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(t.name.toLowerCase()))
    );

    const totalMrp = matchingTests.reduce((sum, t) => sum + (t.mrp || 0), 0);
    const offerPrice = Math.round(totalMrp * 0.55);

    const lines = [
      `=========================================`,
      `LABMEDIX AI CLINICAL DIAGNOSTIC REQUISITION`,
      `CLINICAL FOCUS: ${mapping.label.toUpperCase()}`,
      `ORGAN SYSTEM: ${mapping.organSystem}`,
      `=========================================`,
      `RATIONALE: ${mapping.clinicalRationale}`,
      `FASTING INSTRUCTIONS: ${mapping.fastingGuidelines}`,
      `SPECIMEN TUBES REQUIRED: ${mapping.sampleTubesRequired.join(' | ')}`,
      `-----------------------------------------`,
      `RECOMMENDED INVESTIGATIONS (${matchingTests.length} Tests):`,
      ...matchingTests.map((t, idx) => `  ${idx + 1}. [${t.code}] ${t.name} (₹${t.mrp}) - ${t.specimen}`),
      `-----------------------------------------`,
      `INDIVIDUAL SUM TOTAL MRP: ₹${totalMrp}`,
      `AI BUNDLED PACKAGE RATE: ₹${offerPrice} (45% OFF)`,
      `=========================================`,
      `Generated by LabMedix AI Clinical Diagnostic Engine`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    triggerCelebrationFireworks();
    showToast('success', 'AI Clinical Requisition Copied', `Complete diagnostic order slip copied to clipboard.`);
  };

  // 1-Click Select All AI Recommended Tests for Auto Bundle
  const handleSelectAllAiRecommendedTests = (mapping: AISymptomMapping) => {
    const matchingTestIds = tests.filter(t =>
      mapping.recommendedTestNames.some(name => t.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(t.name.toLowerCase()))
    ).map(t => t.id);

    setSelectedTestIdsForBundle(prev => Array.from(new Set([...prev, ...matchingTestIds])));
    setBundleName(mapping.suggestedPackageName);
    setBundleCategory(mapping.category);
    triggerCelebrationFireworks();
    showToast('success', 'AI Recommended Tests Selected', `Queued ${matchingTestIds.length} tests for ${mapping.label}.`);
  };

  // 1-Click Mint AI Package directly from Active Symptom Board
  const handleDirectMintAiPackage = (mapping: AISymptomMapping) => {
    const matchingTestIds = tests.filter(t =>
      mapping.recommendedTestNames.some(name => t.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(t.name.toLowerCase()))
    ).map(t => t.id);

    if (matchingTestIds.length === 0) {
      showToast('error', 'No Matching Tests', 'Unable to find matching investigations in the catalog.');
      return;
    }

    const created = CatalogService.autoBuildPackage(
      mapping.suggestedPackageName,
      matchingTestIds,
      45,
      mapping.category,
      'All Adults / Prescribed Patients'
    );

    triggerCelebrationFireworks();
    showToast('success', 'AI Package Minted Live', `Package "${created.name}" is now live in portal and checkout!`);
    refreshData();
    setActiveTab('package_builder');
  };

  // Clone Test
  const handleCloneTest = (test: LabTestItem) => {
    if (!canManage) {
      showToast('error', 'Access Denied', 'You do not have permission to clone tests.');
      return;
    }

    const cloned = CatalogService.addLabTest({
      code: `${test.code}-COPY`,
      name: `${test.name} (Duplicate Copy)`,
      category: test.category,
      department: test.department,
      specimen: test.specimen,
      fastingRequired: test.fastingRequired,
      tatHours: test.tatHours,
      mrp: test.mrp,
      description: test.description,
      popular: false,
      status: 'active'
    });

    triggerCelebrationFireworks();
    showToast('success', 'Test Cloned', `Created copy: ${cloned.name}`);
    refreshData();
  };

  // Refresh Lab Data
  const refreshLabData = () => {
    setLabBookings(PortalService.getLabBookings());
  };

  // Open Results Entry Modal with smart template presets
  const handleOpenResultsModal = (booking: BloodTestBooking) => {
    setSelectedBookingForResults(booking);
    setPathologistNotesInput(booking.pathologistNotes || 'All parameters analyzed on automated clinical chemistry calibrators. Clinically correlate with clinical presentation.');
    setPathologistNameInput(booking.pathologistName || 'Dr. Kaushik Chatterjee, MD (Pathology)');

    if (booking.testResults && booking.testResults.length > 0) {
      setEditingResults([...booking.testResults]);
    } else {
      const lower = booking.testName.toLowerCase();
      if (lower.includes('lipid')) {
        setEditingResults([
          { parameterName: 'Total Cholesterol', observedValue: '198', unit: 'mg/dL', referenceRange: '125 - 200 (Desirable)', flag: 'normal' },
          { parameterName: 'HDL Cholesterol (Good)', observedValue: '48', unit: 'mg/dL', referenceRange: '> 40 (Normal)', flag: 'normal' },
          { parameterName: 'LDL Cholesterol (Bad)', observedValue: '124', unit: 'mg/dL', referenceRange: '< 100 (Optimal), 100-129 (Borderline)', flag: 'high' },
          { parameterName: 'VLDL Cholesterol', observedValue: '26', unit: 'mg/dL', referenceRange: '< 30', flag: 'normal' },
          { parameterName: 'Serum Triglycerides', observedValue: '135', unit: 'mg/dL', referenceRange: '< 150 (Normal)', flag: 'normal' },
          { parameterName: 'Total / HDL Cholesterol Ratio', observedValue: '4.1', unit: 'Ratio', referenceRange: '< 4.5', flag: 'normal' }
        ]);
      } else if (lower.includes('cbc') || lower.includes('blood count') || lower.includes('platelet')) {
        setEditingResults([
          { parameterName: 'Hemoglobin (Hb)', observedValue: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', flag: 'normal' },
          { parameterName: 'Total Leukocyte Count (TLC)', observedValue: '7,400', unit: '/cumm', referenceRange: '4,000 - 11,000', flag: 'normal' },
          { parameterName: 'Neutrophils', observedValue: '62', unit: '%', referenceRange: '40 - 70', flag: 'normal' },
          { parameterName: 'Lymphocytes', observedValue: '28', unit: '%', referenceRange: '20 - 45', flag: 'normal' },
          { parameterName: 'Platelet Count', observedValue: '2.45', unit: 'Lakhs/cumm', referenceRange: '1.50 - 4.50', flag: 'normal' },
          { parameterName: 'ESR (Westergren)', observedValue: '12', unit: 'mm/1st hr', referenceRange: '0 - 15', flag: 'normal' }
        ]);
      } else if (lower.includes('glucose') || lower.includes('sugar') || lower.includes('hba1c')) {
        setEditingResults([
          { parameterName: 'Fasting Blood Glucose (FBS)', observedValue: '112', unit: 'mg/dL', referenceRange: '70 - 99 (Normal), 100-125 (Impaired)', flag: 'high' },
          { parameterName: 'HbA1c (Glycated Hemoglobin)', observedValue: '6.4', unit: '%', referenceRange: '< 5.7 (Normal), 5.7-6.4 (Pre-diabetic)', flag: 'high' },
          { parameterName: 'Estimated Average Glucose (eAG)', observedValue: '137', unit: 'mg/dL', referenceRange: '< 117', flag: 'high' }
        ]);
      } else if (lower.includes('lft') || lower.includes('liver')) {
        setEditingResults([
          { parameterName: 'Total Bilirubin', observedValue: '0.8', unit: 'mg/dL', referenceRange: '0.2 - 1.2', flag: 'normal' },
          { parameterName: 'Direct (Conjugated) Bilirubin', observedValue: '0.2', unit: 'mg/dL', referenceRange: '0.0 - 0.3', flag: 'normal' },
          { parameterName: 'SGPT / ALT', observedValue: '32', unit: 'U/L', referenceRange: '< 45', flag: 'normal' },
          { parameterName: 'SGOT / AST', observedValue: '28', unit: 'U/L', referenceRange: '< 40', flag: 'normal' },
          { parameterName: 'Alkaline Phosphatase (ALP)', observedValue: '88', unit: 'U/L', referenceRange: '30 - 120', flag: 'normal' },
          { parameterName: 'Total Protein', observedValue: '7.4', unit: 'g/dL', referenceRange: '6.4 - 8.3', flag: 'normal' }
        ]);
      } else if (lower.includes('kft') || lower.includes('kidney') || lower.includes('creatinine')) {
        setEditingResults([
          { parameterName: 'Serum Creatinine', observedValue: '0.92', unit: 'mg/dL', referenceRange: '0.6 - 1.2', flag: 'normal' },
          { parameterName: 'Blood Urea Nitrogen (BUN)', observedValue: '15', unit: 'mg/dL', referenceRange: '7 - 20', flag: 'normal' },
          { parameterName: 'Serum Uric Acid', observedValue: '5.2', unit: 'mg/dL', referenceRange: '3.5 - 7.2', flag: 'normal' },
          { parameterName: 'Serum Calcium', observedValue: '9.4', unit: 'mg/dL', referenceRange: '8.5 - 10.5', flag: 'normal' }
        ]);
      } else if (lower.includes('thyroid') || lower.includes('tsh')) {
        setEditingResults([
          { parameterName: 'Total Triiodothyronine (T3)', observedValue: '1.20', unit: 'ng/mL', referenceRange: '0.80 - 2.00', flag: 'normal' },
          { parameterName: 'Total Thyroxine (T4)', observedValue: '8.1', unit: 'ug/dL', referenceRange: '5.1 - 14.1', flag: 'normal' },
          { parameterName: 'TSH (Thyroid Stimulating Hormone)', observedValue: '2.45', unit: 'uIU/mL', referenceRange: '0.35 - 4.94', flag: 'normal' }
        ]);
      } else {
        setEditingResults([
          { parameterName: `${booking.testName} Primary Analyte`, observedValue: 'Normal Profile', unit: '-', referenceRange: 'Biological Norm', flag: 'normal' }
        ]);
      }
    }
  };

  const handleSaveTestResults = () => {
    if (!selectedBookingForResults) return;
    PortalService.updateTestResults(
      selectedBookingForResults.id,
      editingResults,
      pathologistNotesInput,
      pathologistNameInput
    );
    triggerCelebrationFireworks();
    showToast('success', 'Diagnostic Report Completed & Authorized', `Report for ${selectedBookingForResults.bookingNo} is now verified and ready for download!`);
    refreshLabData();
    const updated = PortalService.getLabBookings().find(b => b.id === selectedBookingForResults.id) || null;
    setSelectedBookingForResults(null);
    if (updated) {
      setSelectedBookingForReport(updated);
    }
  };

  const handleReceiveSampleInLab = (booking: BloodTestBooking) => {
    PortalService.receiveSampleInLab(booking.id, currentUser?.fullName || 'Central Diagnostic Laboratory Staff');
    triggerCelebrationFireworks();
    showToast('success', 'Sample Received in Central Lab', `Sample for ${booking.bookingNo} (${booking.patientName}) marked as Processing.`);
    refreshLabData();
  };

  const handleCreateWalkinBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = PatientService.getById(walkinPatientId) || PatientService.getAll()[0];
    if (!patient) {
      showToast('error', 'Patient Required', 'Please select or enter patient.');
      return;
    }
    if (walkinSelectedTestIds.length === 0) {
      showToast('error', 'Select Tests', 'Please select at least 1 test.');
      return;
    }

    const selectedTests = tests.filter(t => walkinSelectedTestIds.includes(t.id));
    const card = StorageService.getCards().find(c => c.patientId === patient.id);
    const membership = card ? StorageService.getMemberships().find(m => m.id === card.membershipId) : StorageService.getMemberships()[0];
    const discountPercent = membership?.labDiscount || 20;

    const gross = selectedTests.reduce((sum, t) => sum + (t.mrp || 0), 0);
    const disc = (gross * discountPercent) / 100;
    const net = gross - disc;

    const booking = PortalService.saveLabBooking({
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.mobile,
      cardTier: membership?.name || 'Standard Card',
      testName: selectedTests.map(t => t.name).join(', '),
      category: selectedTests[0]?.category || 'Pathology',
      collectionType: walkinCollectionType,
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '10:00 AM - 12:00 PM',
      grossPrice: gross,
      discountPercentage: discountPercent,
      discountAmount: disc,
      netPrice: net,
      paymentStatus: walkinPaymentMode,
      status: 'confirmed',
      fastingRequired: selectedTests.some(t => t.fastingRequired),
      prescribedByDoctorName: 'Front Desk Walk-in'
    });

    triggerCelebrationFireworks();
    showToast('success', 'Lab Booking Registered', `Booking #${booking.bookingNo} created for ${patient.fullName}.`);
    refreshLabData();
    setShowWalkinBookingModal(false);
    setWalkinSelectedTestIds([]);
  };

  const filteredLabBookings = useMemo(() => {
    return labBookings.filter(b => {
      const matchStatus = labFilterStatus === 'all' || b.status === labFilterStatus;
      const matchQuery = !labSearchQuery ||
        b.bookingNo.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
        b.patientName.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
        b.patientId.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
        b.testName.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
        (b.prescribedByDoctorName && b.prescribedByDoctorName.toLowerCase().includes(labSearchQuery.toLowerCase()));
      return matchStatus && matchQuery;
    });
  }, [labBookings, labFilterStatus, labSearchQuery]);

  // Save / Update Test
  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      showToast('error', 'Access Denied', 'You do not have permission to manage the test catalog.');
      return;
    }

    let finalParams = testForm.parameters;
    if (!finalParams || finalParams.length === 0) {
      finalParams = TestMasterService.getBlueprintForTest(testForm.name) || [
        {
          id: `p_${testForm.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_1`,
          parameterCode: testForm.code,
          parameterName: testForm.name,
          resultType: 'numeric',
          unit: 'mg/dL',
          defaultReferenceRange: 'Normal',
          displayOrder: 1,
          reportOrder: 1,
          required: true
        }
      ];
    }

    const testPayload = {
      ...testForm,
      parameters: finalParams
    };

    if (editingTest) {
      CatalogService.updateLabTest(editingTest.id, testPayload);
      showToast('success', 'Test Master Updated', `Test "${testForm.name}" updated with ${finalParams.length} parameters configured.`);
    } else {
      CatalogService.addLabTest(testPayload);
      triggerCelebrationFireworks();
      showToast('success', 'Test Created in Master', `New test "${testForm.name}" saved with ${finalParams.length} configured parameters.`);
    }

    refreshData();
    setIsAddTestOpen(false);
    setEditingTest(null);
  };

  // Delete Test
  const handleDeleteTest = (test: LabTestItem) => {
    if (!isSuperAdmin) {
      showToast('warning', 'Super-Admin Authority Required', 'Diagnostic tests can only be removed from master catalog by Super Administrator.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${test.name}" from the diagnostic master catalog?`)) {
      CatalogService.deleteLabTest(test.id);
      showToast('warning', 'Test Removed', `${test.name} removed from catalog.`);
      refreshData();
    }
  };

  // Open Edit Package Modal
  const handleOpenEditPackage = (pkg: HealthPackageItem) => {
    setEditingPackage(pkg);
    setPackageForm({
      id: pkg.id,
      packageCode: pkg.packageCode,
      name: pkg.name,
      tag: pkg.tag || '',
      category: pkg.category,
      targetGroup: pkg.targetGroup || 'General Adults',
      mrp: pkg.mrp,
      offerPrice: pkg.offerPrice,
      fastingRequired: pkg.fastingRequired,
      description: pkg.description || '',
      includedTests: [...pkg.includedTests],
      popular: !!pkg.popular,
      status: pkg.status || 'active'
    });
    setIsEditPackageOpen(true);
  };

  // Save / Update Package
  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      showToast('error', 'Access Denied', 'You do not have permission to edit health packages.');
      return;
    }

    if (editingPackage) {
      CatalogService.updateHealthPackage(editingPackage.id, {
        packageCode: packageForm.packageCode,
        name: packageForm.name,
        tag: packageForm.tag,
        category: packageForm.category,
        targetGroup: packageForm.targetGroup,
        mrp: packageForm.mrp,
        offerPrice: packageForm.offerPrice,
        fastingRequired: packageForm.fastingRequired,
        description: packageForm.description,
        includedTests: packageForm.includedTests,
        popular: packageForm.popular,
        status: packageForm.status
      });
      triggerCelebrationFireworks();
      showToast('success', 'Package Updated', `Package "${packageForm.name}" updated successfully.`);
    } else {
      CatalogService.addHealthPackage({
        packageCode: packageForm.packageCode || `PKG-${Math.floor(100 + Math.random() * 900)}`,
        name: packageForm.name,
        tag: packageForm.tag,
        parametersCount: packageForm.includedTests.length * 4 || 25,
        category: packageForm.category,
        targetGroup: packageForm.targetGroup,
        mrp: packageForm.mrp,
        offerPrice: packageForm.offerPrice,
        fastingRequired: packageForm.fastingRequired,
        description: packageForm.description,
        includedTests: packageForm.includedTests,
        popular: packageForm.popular,
        status: packageForm.status
      });
      triggerCelebrationFireworks();
      showToast('success', 'Package Created', `New package "${packageForm.name}" created.`);
    }

    refreshData();
    setIsEditPackageOpen(false);
    setIsAddPackageOpen(false);
    setEditingPackage(null);
  };

  // Toggle Included Test inside Package Form
  const handleToggleTestInPackageForm = (testName: string) => {
    setPackageForm(prev => {
      const exists = prev.includedTests.includes(testName);
      const nextList = exists
        ? prev.includedTests.filter(n => n !== testName)
        : [...prev.includedTests, testName];

      const selectedTestObjects = tests.filter(t => nextList.includes(t.name));
      const totalMrp = selectedTestObjects.reduce((acc, t) => acc + (t.mrp || 0), 0);
      const computedOffer = Math.round(totalMrp * 0.6);

      return {
        ...prev,
        includedTests: nextList,
        mrp: totalMrp > 0 ? totalMrp : prev.mrp,
        offerPrice: totalMrp > 0 ? computedOffer : prev.offerPrice
      };
    });
  };

  // Bulk Upload Processing
  const handleProcessBulkUpload = () => {
    if (!bulkPasteText.trim()) {
      showToast('error', 'No Data', 'Please paste test names and rates to import.');
      return;
    }

    const lines = bulkPasteText.split('\n');
    const parsedItems: Array<Omit<LabTestItem, 'id'>> = [];

    lines.forEach((line, idx) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      const parts = cleanLine.includes('\t') ? cleanLine.split('\t') : cleanLine.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const rateStr = parts[1].replace(/[^0-9.]/g, '');
        const rate = parseFloat(rateStr) || 200;

        if (name) {
          parsedItems.push({
            code: `LAB-IMP-${100 + idx}`,
            name,
            category: 'Biochemistry',
            department: 'Diagnostic Laboratory',
            specimen: 'Blood / Serum',
            fastingRequired: false,
            tatHours: 4,
            mrp: rate,
            description: `Official diagnostic investigation: ${name}`
          });
        }
      } else if (cleanLine.length > 2) {
        parsedItems.push({
          code: `LAB-IMP-${100 + idx}`,
          name: cleanLine,
          category: 'Biochemistry',
          department: 'Diagnostic Laboratory',
          specimen: 'Blood / Serum',
          fastingRequired: false,
          tatHours: 4,
          mrp: 300,
          description: `Official diagnostic investigation: ${cleanLine}`
        });
      }
    });

    const importedCount = CatalogService.bulkImportTests(parsedItems);
    triggerCelebrationFireworks();
    showToast('success', 'Bulk Import Complete', `${importedCount} tests added to the diagnostic master catalog.`);
    refreshData();
    setIsBulkUploadOpen(false);
    setBulkPasteText('');
  };

  // Run AI Package Generator
  const handleRunAiSynthesizer = () => {
    const recommendation = DiagnosticAIService.generateAIPackageFromClinicalProfile({
      age: aiPatientAge,
      gender: aiPatientGender,
      chiefComplaints: aiChiefComplaints,
      coMorbidities: aiCoMorbidities,
      allTests: tests
    });

    setGeneratedAiRecommendation(recommendation);
    triggerCelebrationFireworks();
    showToast('success', 'AI Diagnostic Analysis Complete', `Synthesized ${recommendation.recommendedTests.length} investigations tailored for patient profile.`);
  };

  // Publish AI Package to Catalog
  const handlePublishAiPackage = () => {
    if (!generatedAiRecommendation) return;

    const testIds = generatedAiRecommendation.recommendedTests.map(t => t.id);
    const created = CatalogService.autoBuildPackage(
      generatedAiRecommendation.packageName,
      testIds,
      generatedAiRecommendation.discountPercentage,
      generatedAiRecommendation.category,
      generatedAiRecommendation.targetGroup
    );

    triggerCelebrationFireworks();
    showToast('success', 'AI Package Published Live', `Package "${created.name}" is now live!`);
    refreshData();
    setIsAiPackageGeneratorOpen(false);
    setGeneratedAiRecommendation(null);
    setActiveTab('package_builder');
  };

  // Auto Package Bundle Generation from Table Checkboxes
  const handleAutoBuildPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTestIdsForBundle.length === 0) {
      showToast('error', 'Select Tests', 'Please select at least 1 test to bundle into a health package.');
      return;
    }

    const created = CatalogService.autoBuildPackage(
      bundleName || 'Custom Preventive Health Package',
      selectedTestIdsForBundle,
      bundleDiscount,
      bundleCategory,
      bundleTargetGroup
    );

    triggerCelebrationFireworks();
    showToast('success', 'Health Package Minted', `Package "${created.name}" created at ${formatCurrency(created.offerPrice)}!`);
    refreshData();
    setIsAutoBundleOpen(false);
    setSelectedTestIdsForBundle([]);
    setBundleName('');
    setActiveTab('package_builder');
  };

  // Toggle selection for Auto Bundle
  const toggleSelectTestForBundle = (testId: string) => {
    setSelectedTestIdsForBundle(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  // Batch Select Category Tests
  const handleBatchSelectCategory = (catName: string) => {
    const matchingTestIds = tests.filter(t => t.category === catName).map(t => t.id);
    setSelectedTestIdsForBundle(prev => Array.from(new Set([...prev, ...matchingTestIds])));
    showToast('info', 'Category Tests Selected', `Added all ${catName} tests to bundle queue.`);
  };

  // Calculate live bundle pricing
  const bundleSummary = useMemo(() => {
    const selected = tests.filter(t => selectedTestIdsForBundle.includes(t.id));
    const grossMrp = selected.reduce((sum, t) => sum + (t.mrp || 0), 0);
    const offer = Math.round(grossMrp * (1 - bundleDiscount / 100));
    const savings = grossMrp - offer;
    return { count: selected.length, grossMrp, offer, savings };
  }, [tests, selectedTestIdsForBundle, bundleDiscount]);

  // Master Test Columns
  const testColumns: Column<LabTestItem>[] = [
    {
      header: 'Bundle',
      className: 'w-12 text-center',
      accessor: (t) => (
        <button
          type="button"
          onClick={() => toggleSelectTestForBundle(t.id)}
          className="text-slate-400 hover:text-teal-400 focus:outline-none"
        >
          {selectedTestIdsForBundle.includes(t.id) ? (
            <CheckSquare className="w-4 h-4 text-teal-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      )
    },
    {
      header: 'Code & Name',
      accessor: (t) => (
        <div>
          <div className="flex items-center gap-2">
            <strong className="text-xs font-black text-slate-900 dark:text-white block hover:text-teal-500 cursor-pointer">
              {t.name}
            </strong>
            {t.popular && (
              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 text-amber-400" />
                POPULAR
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-teal-300 font-bold border border-slate-700">
              {t.code}
            </span>
            <span>•</span>
            <span>{t.department}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Category & Specimen',
      accessor: (t) => {
        const meta = getCategoryMeta(t.category, t.name);
        return (
          <div className="text-xs space-y-0.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${meta.badge}`}>
              {t.category}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: meta.capColor }} />
              <span className="truncate max-w-[140px]">{t.specimen}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Protocol & TAT',
      accessor: (t) => (
        <div>
          {t.fastingRequired ? (
            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 block w-fit">
              ⚠️ Fasting 8-10H
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 block w-fit">
              🌿 Routine Non-Fasting
            </span>
          )}
          <span className="text-[9.5px] text-slate-400 block mt-0.5 font-mono">
            ⚡ TAT: {t.tatHours}h Report
          </span>
        </div>
      )
    },
    {
      header: 'Standard Rate & Perks',
      accessor: (t) => {
        const silverRate = Math.round(t.mrp * 0.85);
        const goldRate = Math.round(t.mrp * 0.75);
        const platRate = Math.round(t.mrp * 0.65);

        return (
          <div className="group relative cursor-help">
            <strong className="text-sm font-black font-mono text-emerald-400 block">
              {formatCurrency(t.mrp)}
            </strong>
            <span className="text-[9.5px] text-teal-400 font-mono">
              Card: {formatCurrency(goldRate)} (25% off)
            </span>

            {/* Hover Tooltip Breakdown */}
            <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-30 p-2 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-mono text-white shadow-2xl space-y-0.5 whitespace-nowrap">
              <div className="text-slate-400 font-bold border-b pb-0.5 border-slate-800">Cardholder Pricing Matrix:</div>
              <div>Standard MRP: <strong>{formatCurrency(t.mrp)}</strong></div>
              <div className="text-slate-300">Silver (-15%): {formatCurrency(silverRate)}</div>
              <div className="text-amber-400">Gold (-25%): {formatCurrency(goldRate)}</div>
              <div className="text-teal-400">Platinum (-35%): {formatCurrency(platRate)}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (t) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            title="Copy Test Name & Rate"
            onClick={() => handleCopyTest(t)}
          >
            {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-teal-400" />}
          </Button>

          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              title="Clone / Duplicate Test"
              onClick={() => handleCloneTest(t)}
            >
              <CopyPlus className="w-3.5 h-3.5 text-indigo-400" />
            </Button>
          )}

          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              title="Edit Test Details"
              onClick={() => {
                setEditingTest(t);
                const params = (t.parameters && t.parameters.length > 0)
                  ? t.parameters
                  : (TestMasterService.getBlueprintForTest(t.name) || []);
                setTestForm({
                  code: t.code,
                  name: t.name,
                  category: t.category,
                  department: t.department,
                  specimen: t.specimen,
                  method: t.method || 'Automated Analyzer',
                  reportTemplate: t.reportTemplate || 'standard_pathology',
                  fastingRequired: t.fastingRequired,
                  tatHours: t.tatHours,
                  mrp: t.mrp,
                  description: t.description,
                  popular: !!t.popular,
                  parameters: params
                });
                setIsAddTestOpen(true);
              }}
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            title="Print Sample Tube Label"
            onClick={() => setQuickLabelTest(t)}
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            title={isSuperAdmin ? 'Delete Test' : 'Super Admin authority required to delete'}
            className={!isSuperAdmin ? 'opacity-30 cursor-not-allowed' : ''}
            onClick={() => handleDeleteTest(t)}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP ULTRA 3D HEADER & COMMAND BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white border border-slate-700/80 shadow-2xl">
        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-0.5 shadow-lg flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Diagnostic Test Master & Health Package Suite
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <BrainCircuit className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    AI Clinical Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-300">
                  Manage official diagnostic pathology rates, AI doctor prescription text drafting, sample tube labeling, and Health Package creation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher */}
            <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-700 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('test_master')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'test_master'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TestTube className="w-3.5 h-3.5" />
                <span>Test Master ({tests.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('package_builder')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'package_builder'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Package Studio ({packages.length})</span>
              </button>
            </div>

            {/* AI Doctor Rx Studio Button */}
            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 text-white font-black shadow-xl"
              leftIcon={<FileText className="w-4 h-4 text-blue-200" />}
              onClick={() => handleOpenRxStudio()}
            >
              📝 AI Doctor Rx Studio
            </Button>

            {/* AI Package Synthesizer Button */}
            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white font-black shadow-xl"
              leftIcon={<BrainCircuit className="w-4 h-4 text-purple-200" />}
              onClick={() => {
                setIsAiPackageGeneratorOpen(true);
                handleRunAiSynthesizer();
              }}
            >
              🤖 AI Package Synthesizer
            </Button>

            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  leftIcon={<Upload className="w-4 h-4 text-teal-400" />}
                  onClick={() => setIsBulkUploadOpen(true)}
                >
                  Bulk Import
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-lg"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingTest(null);
                    setTestForm({
                      code: `LAB-${1000 + tests.length + 1}`,
                      name: '',
                      category: 'Biochemistry',
                      department: 'Clinical Biochemistry',
                      specimen: 'Serum (2ml)',
                      method: 'Fully Automated Analyzer',
                      reportTemplate: 'standard_pathology',
                      fastingRequired: false,
                      tatHours: 4,
                      mrp: 300,
                      description: '',
                      popular: false,
                      parameters: []
                    });
                    setIsAddTestOpen(true);
                  }}
                >
                  Add Test
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. 3D STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider font-mono">Total Master Tests</span>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono">{stats.totalTests}</strong>
            <span className="text-[10px] text-teal-400 block font-bold">100% Ingested</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">Routine Tests</span>
          <div className="mt-2">
            <strong className="text-2xl font-black text-emerald-400 font-mono">{stats.routineCount}</strong>
            <span className="text-[10px] text-slate-400 block">No Fasting Required</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider font-mono">Fasting Tests</span>
          <div className="mt-2">
            <strong className="text-2xl font-black text-rose-400 font-mono">{stats.fastingCount}</strong>
            <span className="text-[10px] text-rose-300 block">8-10H Fasting Protocol</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono">Health Packages</span>
          <div className="mt-2">
            <strong className="text-2xl font-black text-amber-400 font-mono">{stats.totalPackages}</strong>
            <span className="text-[10px] text-amber-400 block">Auto-Bundles Live</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider font-mono">Average Rate</span>
          <div className="mt-2">
            <strong className="text-2xl font-black text-purple-400 font-mono">{formatCurrency(stats.avgRate)}</strong>
            <span className="text-[10px] text-purple-300 block font-mono">Standard MRP Base</span>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE TOP NAVIGATION SUITE TABS (Requirement 3 & 16) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('test_master')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'test_master'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TestTube className="w-4 h-4 text-teal-300" />
            <span>Individual Tests ({tests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('panels_master')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'panels_master'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-300" />
            <span>Panels / Packages ({panels.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculation_rules')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'calculation_rules'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Calculation Engine ({TestMasterService.CALCULATION_RULES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('package_builder')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'package_builder'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4 text-purple-300" />
            <span>Health Bundles ({packages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('lab_operations');
              setLabBookings(PortalService.getLabBookings());
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'lab_operations'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span>🔬 Live Lab Operations ({labBookings.length})</span>
            {labBookings.filter(b => b.status === 'confirmed' || b.status === 'sample_collected').length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full animate-bounce">
                {labBookings.filter(b => b.status === 'confirmed' || b.status === 'sample_collected').length} Action
              </span>
            )}
          </button>
        </div>

        {activeTab === 'lab_operations' && (
          <Button
            size="sm"
            variant="primary"
            className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-lg"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowWalkinBookingModal(true)}
          >
            + New Walk-in Lab Booking & Billing
          </Button>
        )}
      </div>

      {/* 4. WORKSPACE TAB 1: DIAGNOSTIC TEST MASTER */}
      {activeTab === 'test_master' && (
        <div className="space-y-4">
          {/* SINGLE UNIFIED ULTRA AI OMNI-SEARCH & SYMPTOM INTELLIGENCE BAR */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-purple-500/40 space-y-3.5 shadow-2xl">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Single Unified AI Search Input */}
              <div className="relative flex-1">
                <BrainCircuit className="w-4 h-4 text-purple-400 absolute left-3.5 top-3 animate-pulse" />
                <input
                  type="text"
                  placeholder="AI Smart Omni-Search: Type symptoms (fever, chest pain, jaundice), doctor terms (CBC, LFT, FBS, HbA1c), organs (liver, kidney), or test codes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedAiSymptom) setSelectedAiSymptom(null);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-950 border-2 border-purple-500/50 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-400 font-sans shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSelectedAiSymptom(null); }}
                    className="absolute right-3.5 top-2.5 text-xs text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters, Doctor Rx & Auto Bundle Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="all">All Categories ({tests.length})</option>
                  {categories.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={fastingFilter}
                  onChange={(e) => setFastingFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="all">All Protocols</option>
                  <option value="routine">Routine Only</option>
                  <option value="fasting">Fasting Required</option>
                </select>

                {selectedTestIdsForBundle.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg text-xs"
                      leftIcon={<Zap className="w-3.5 h-3.5" />}
                      onClick={() => setIsAutoBundleOpen(true)}
                    >
                      ⚡ Auto-Bundle ({selectedTestIdsForBundle.length})
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 text-xs"
                      leftIcon={<FileText className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenRxStudio()}
                    >
                      📝 Draft Rx ({selectedTestIdsForBundle.length})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* AI Clinical Symptom Quick Prompts Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1 mr-1 font-mono">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                AI Quick Clinical Prompts (1-Click Auto-Prescribe):
              </span>

              {AI_SYMPTOM_KNOWLEDGE_BASE.map((sym) => (
                <button
                  key={sym.symptomKey}
                  type="button"
                  onClick={() => {
                    if (selectedAiSymptom === sym.symptomKey) {
                      setSelectedAiSymptom(null);
                      setSearchQuery('');
                    } else {
                      setSelectedAiSymptom(sym.symptomKey);
                      setSearchQuery('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-md ${
                    selectedAiSymptom === sym.symptomKey
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/30 ring-2 ring-purple-400 font-black'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-purple-500/60 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>{sym.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 🌟 DEDICATED AI CLINICAL ADVISORY BOARD & TEST PRESCRIPTION DRAWER */}
          {activeSymptomMapping && (
            <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/80 border-2 border-purple-500/60 shadow-2xl space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-purple-500/30 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-purple-500/30 text-purple-200 border border-purple-400/40">
                        {activeSymptomMapping.organSystem}
                      </span>
                      <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                        AI Clinical Diagnostic Protocol: {activeSymptomMapping.label}
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs text-purple-200 leading-relaxed max-w-4xl pt-1">
                    <strong>Clinical Pathophysiology & Rationale:</strong> {activeSymptomMapping.clinicalRationale}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-lg"
                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenRxStudio(activeSymptomMapping.symptomKey)}
                  >
                    📝 Suggest Doctor Rx Text
                  </Button>

                  <button
                    type="button"
                    onClick={() => setSelectedAiSymptom(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 hover:text-white font-bold"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Specimen Tubes & Fasting Guidance Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/30 space-y-1">
                  <strong className="text-purple-300 text-[11px] block uppercase font-bold">
                    🧪 Required Phlebotomy Vacutainer Tubes:
                  </strong>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activeSymptomMapping.sampleTubesRequired.map((tube, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-900 text-[10px] text-slate-200 border border-slate-700">
                        {tube}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/30 space-y-1">
                  <strong className="text-amber-300 text-[11px] block uppercase font-bold">
                    ⚠️ Fasting & Preparation Advice:
                  </strong>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {activeSymptomMapping.fastingGuidelines}
                  </p>
                </div>
              </div>

              {/* EXACT TESTS TO BE DONE (KON KON TEST KORTE HOBE) BREAKDOWN GRID */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-black text-white flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-teal-400" />
                    Exact Diagnostic Investigations to be Performed ({activeSymptomMapping.detailedTests.length} Tests):
                  </strong>
                  <span className="text-[11px] text-purple-300 font-mono">
                    Auto-categorized by diagnostic priority
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeSymptomMapping.detailedTests.map((tItem, idx) => {
                    const priorityColor =
                      tItem.priority === 'must_do_urgent'
                        ? 'border-rose-500/50 bg-rose-950/30'
                        : tItem.priority === 'secondary_supporting'
                        ? 'border-amber-500/50 bg-amber-950/30'
                        : 'border-sky-500/50 bg-sky-950/30';

                    const priorityLabel =
                      tItem.priority === 'must_do_urgent'
                        ? '🔴 MUST-DO URGENT'
                        : tItem.priority === 'secondary_supporting'
                        ? '🟡 SECONDARY / SUPPORTING'
                        : '🔵 CONFIRMATORY SPECIAL';

                    const matchedCatTest = tests.find(ct => ct.name.toLowerCase().includes(tItem.name.toLowerCase()) || tItem.name.toLowerCase().includes(ct.name.toLowerCase()));

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-1.5 shadow-md ${priorityColor}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-black uppercase font-mono tracking-wider text-slate-300">
                              {priorityLabel}
                            </span>
                            <h4 className="text-xs font-black text-white mt-0.5">
                              {tItem.name}
                            </h4>
                          </div>

                          <div className="text-right shrink-0 font-mono">
                            {matchedCatTest ? (
                              <strong className="text-xs font-black text-emerald-400 block">
                                {formatCurrency(matchedCatTest.mrp)}
                              </strong>
                            ) : (
                              <span className="text-[10px] text-slate-400">₹300 - ₹600</span>
                            )}
                            <span className={`text-[9px] font-bold ${tItem.fasting ? 'text-rose-300' : 'text-emerald-300'}`}>
                              {tItem.fasting ? '⚠️ Fasting' : '🌿 Routine'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10.5px] text-slate-300 leading-snug">
                          {tItem.indication}
                        </p>

                        <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 pt-1 border-t border-white/10">
                          <span>Sample Tube: <strong className="text-white">{tItem.sampleTube}</strong></span>
                          {matchedCatTest && (
                            <button
                              type="button"
                              onClick={() => handleCopyTest(matchedCatTest)}
                              className="text-teal-400 hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span>Copy Test</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTION TOOLBAR */}
              <div className="p-4 rounded-2xl bg-black/60 border border-purple-500/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    AI Diagnostic Package: <strong>{activeSymptomMapping.suggestedPackageName}</strong>
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    ✨ 45% Special Health Card Discount Applied on Auto-Bundle
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-400/50 text-purple-200 hover:bg-purple-950/40 text-xs"
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() => handleCopyAiRequisitionSlip(activeSymptomMapping)}
                  >
                    Copy Slip
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg text-xs"
                    leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                    onClick={() => handleSelectAllAiRecommendedTests(activeSymptomMapping)}
                  >
                    ⚡ Select All ({activeSymptomMapping.detailedTests.length})
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black shadow-lg text-xs"
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => handleDirectMintAiPackage(activeSymptomMapping)}
                  >
                    🚀 1-Click Mint AI Package
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Category Batch Selection Bar */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
              <span>Quick Category Bundle Select:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['Biochemistry', 'Hematology', 'Hormones', 'Immunology', 'Microbiology'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleBatchSelectCategory(cat)}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500 text-[10.5px] font-bold text-slate-300 hover:text-teal-300"
                >
                  + Select All {cat}
                </button>
              ))}
              {selectedTestIdsForBundle.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTestIdsForBundle([])}
                  className="px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-500/40 text-[10.5px] font-bold text-rose-300 hover:bg-rose-900"
                >
                  Clear Selection ({selectedTestIdsForBundle.length})
                </button>
              )}
            </div>
          </div>

          {/* Master Table with hideSearch={true} (No Duplicate Search Bar) */}
          <DataTable
            data={filteredTests}
            columns={testColumns}
            keyExtractor={(t) => t.id}
            hideSearch={true}
          />
        </div>
      )}

      {/* 4. WORKSPACE TAB 2: PANELS & PACKAGES MASTER (Requirement 2, 3, 4, 16) */}
      {activeTab === 'panels_master' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Panel / Package Master Studio ({panels.length} Configured)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Multi-test diagnostic profiles referencing configured Individual Tests without duplicating parameters. Includes auto-calculations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black shadow-lg"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingPanel(null);
                    setPanelForm({
                      code: `PNL-${100 + panels.length + 1}`,
                      name: '',
                      category: 'Biochemistry',
                      department: 'Clinical Biochemistry',
                      specimen: 'Serum (2ml)',
                      type: 'panel',
                      tag: 'CLINICAL PROFILE',
                      description: '',
                      individualTestIds: [],
                      mrp: 650,
                      offerPrice: 499,
                      fastingRequired: true,
                      tatHours: 4,
                      popular: true,
                      status: 'active'
                    });
                    setIsAddPanelOpen(true);
                  }}
                >
                  + Configure New Panel
                </Button>
              )}
            </div>
          </div>

          {/* Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {panels.map((p) => {
              const discountPct = p.mrp > 0 && p.offerPrice ? Math.round(((p.mrp - p.offerPrice) / p.mrp) * 100) : 0;
              const constituentTests = tests.filter(t => p.individualTestIds?.includes(t.id));

              return (
                <div
                  key={p.id}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-cyan-400 border border-slate-700">
                        {p.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 uppercase">
                        {p.type.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-cyan-400 transition">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {p.description || 'Configured diagnostic panel.'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Department:</span>
                        <span className="font-bold text-slate-200">{p.department}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Specimen Tube:</span>
                        <span className="font-mono text-slate-300 text-[10.5px] truncate max-w-[150px]">{p.specimen}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Fasting:</span>
                        <span className={p.fastingRequired ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {p.fastingRequired ? 'Required (8-10H)' : 'Routine / Not Required'}
                        </span>
                      </div>
                    </div>

                    {/* Referenced Individual Tests */}
                    {constituentTests.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Referenced Tests ({constituentTests.length}):
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {constituentTests.map(t => (
                            <span
                              key={t.id}
                              className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono truncate max-w-[160px]"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5 font-mono">
                        <strong className="text-base font-black text-cyan-400">
                          {formatCurrency(p.offerPrice || p.mrp)}
                        </strong>
                        {p.offerPrice && p.offerPrice < p.mrp && (
                          <span className="text-xs text-slate-500 line-through">
                            {formatCurrency(p.mrp)}
                          </span>
                        )}
                      </div>
                      {discountPct > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 block font-mono">
                          {discountPct}% Special Discount
                        </span>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPanel(p);
                            setPanelForm({
                              code: p.code,
                              name: p.name,
                              category: p.category,
                              department: p.department,
                              specimen: p.specimen,
                              type: p.type,
                              tag: p.tag || 'CLINICAL PROFILE',
                              description: p.description || '',
                              individualTestIds: [...p.individualTestIds],
                              mrp: p.mrp,
                              offerPrice: p.offerPrice || p.mrp,
                              fastingRequired: p.fastingRequired,
                              tatHours: p.tatHours,
                              popular: !!p.popular,
                              status: p.status || 'active'
                            });
                            setIsAddPanelOpen(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm(`Delete panel ${p.name}?`)) {
                              CatalogService.deletePanel(p.id);
                              setPanels(CatalogService.getPanels());
                              showToast('success', 'Panel Deleted', `Deleted panel ${p.name}`);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. WORKSPACE TAB 3: CALCULATION ENGINE & RULES (Requirement 9) */}
      {activeTab === 'calculation_rules' && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-black uppercase tracking-wide">
                Automated Clinical Calculation Engine
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Parameters configured with calculation formulas are evaluated live in the Result Entry module whenever technicians enter primary observations. Calculations only execute when prerequisites and validity boundaries are satisfied (e.g., Friedewald equation valid when Triglycerides &lt; 400 mg/dL).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TestMasterService.CALCULATION_RULES.map((rule, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {rule.targetParameterCode}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{rule.unit || 'unitless'}</span>
                  </div>
                  <strong className="text-xs font-bold text-white block mt-1">
                    {rule.targetParameterName}
                  </strong>
                  <div className="p-2 mt-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-teal-300">
                    Formula: <strong className="text-amber-300">{rule.formulaDescription}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] space-y-1">
                  <div className="text-slate-400">
                    Prerequisites: <span className="font-mono text-slate-200">{rule.requiredParameterCodes.join(', ')}</span>
                  </div>
                  {rule.conditionDescription && (
                    <div className="text-amber-400/90 font-mono">
                      Rule: {rule.conditionDescription}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. WORKSPACE TAB 4: HEALTH PACKAGE STUDIO & AUTO-BUILDER */}
      {activeTab === 'package_builder' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                Health Package Studio & Live Catalog ({packages.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage bundled preventive health profiles, customize included tests, update discount rates, and publish live.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg"
                leftIcon={<BrainCircuit className="w-4 h-4" />}
                onClick={() => {
                  setIsAiPackageGeneratorOpen(true);
                  handleRunAiSynthesizer();
                }}
              >
                🤖 AI Auto-Prescribe Package
              </Button>

              {canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingPackage(null);
                    setPackageForm({
                      packageCode: `PKG-NEW-${Math.floor(100 + Math.random() * 900)}`,
                      name: '',
                      tag: '⭐ BEST VALUE • COMPREHENSIVE',
                      category: 'Full Body',
                      targetGroup: 'Men & Women (All Ages)',
                      mrp: 2500,
                      offerPrice: 1299,
                      fastingRequired: true,
                      description: '',
                      includedTests: [],
                      popular: true,
                      status: 'active'
                    });
                    setIsEditPackageOpen(true);
                  }}
                >
                  + Create New Package
                </Button>
              )}
            </div>
          </div>

          {/* 3D Package Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const discountPct = pkg.mrp > 0 ? Math.round(((pkg.mrp - pkg.offerPrice) / pkg.mrp) * 100) : 0;

              return (
                <div
                  key={pkg.id}
                  className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-teal-500/60 transition-all shadow-xl hover:shadow-2xl flex flex-col justify-between space-y-4 group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                        {pkg.packageCode}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {pkg.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                          pkg.status === 'inactive' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {pkg.status === 'inactive' ? 'INACTIVE' : 'ACTIVE'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <strong className="text-base font-black text-white group-hover:text-teal-400 transition-colors block">
                        {pkg.name}
                      </strong>
                      <span className="text-[11px] text-amber-400 font-bold font-mono block mt-0.5">
                        {pkg.tag}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {pkg.description}
                    </p>

                    {/* Included Tests List Preview */}
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                        Included Tests ({pkg.includedTests.length}):
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-300">
                        {pkg.includedTests.slice(0, 4).map((testName, i) => (
                          <li key={i} className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                            <span className="truncate">{testName}</span>
                          </li>
                        ))}
                        {pkg.includedTests.length > 4 && (
                          <li className="text-[10px] text-teal-400 font-bold font-mono pl-3">
                            + {pkg.includedTests.length - 4} more parameters...
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Pricing Strip */}
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 flex items-center justify-between font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 line-through block">
                          MRP: {formatCurrency(pkg.mrp)}
                        </span>
                        <strong className="text-lg font-black text-emerald-400">
                          {formatCurrency(pkg.offerPrice)}
                        </strong>
                      </div>
                      <span className="px-2 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        SAVE {discountPct}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-400 font-mono">
                      Target: <strong className="text-white">{pkg.targetGroup}</strong>
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-bold text-blue-400 border-blue-500/30 hover:bg-blue-950/40"
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEditPackage(pkg)}
                        >
                          Edit Package
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete Package"
                          className={!isSuperAdmin ? 'opacity-30 cursor-not-allowed' : ''}
                          onClick={() => {
                            if (isSuperAdmin && confirm(`Delete package "${pkg.name}"?`)) {
                              CatalogService.deleteHealthPackage(pkg.id);
                              showToast('warning', 'Package Deleted', `${pkg.name} removed.`);
                              refreshData();
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. WORKSPACE TAB 3: LIVE LAB OPERATIONS, PHLEBOTOMY & RESULT ENTRY HUB */}
      {activeTab === 'lab_operations' && (
        <div className="space-y-6">
          {/* Diagnostic Pipeline Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider block">Pending Requisitions</span>
                <strong className="text-xl font-black text-white font-mono">
                  {labBookings.filter(b => b.status === 'confirmed').length}
                </strong>
                <span className="text-[10px] text-slate-400 block">Awaiting Sample</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-purple-400 uppercase tracking-wider block">Sample Collected</span>
                <strong className="text-xl font-black text-white font-mono">
                  {labBookings.filter(b => b.status === 'sample_collected' || b.status === 'phlebotomist_assigned').length}
                </strong>
                <span className="text-[10px] text-slate-400 block">Cold-Chain En Route</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <TestTube className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-blue-400 uppercase tracking-wider block">Processing in Lab</span>
                <strong className="text-xl font-black text-white font-mono">
                  {labBookings.filter(b => b.status === 'processing').length}
                </strong>
                <span className="text-[10px] text-slate-400 block">On Analyzer / Testing</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <FlaskConical className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider block">Reports Verified</span>
                <strong className="text-xl font-black text-white font-mono">
                  {labBookings.filter(b => b.status === 'report_ready').length}
                </strong>
                <span className="text-[10px] text-emerald-400 block">Available for Download</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Booking No (LAB-...), Patient Name, UHID, Test Investigation, or Doctor..."
                value={labSearchQuery}
                onChange={(e) => setLabSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: 'all', label: 'All Orders' },
                { key: 'confirmed', label: '🟡 Pending Collection' },
                { key: 'sample_collected', label: '🟣 Sample Collected' },
                { key: 'processing', label: '🔵 In Lab Testing' },
                { key: 'report_ready', label: '🟢 Reports Ready' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setLabFilterStatus(f.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                    labFilterStatus === f.key
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostic Orders Table */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10.5px]">
                    <th className="py-3 px-4">Booking No & Date</th>
                    <th className="py-3 px-4">Patient & Card Tier</th>
                    <th className="py-3 px-4">Investigation Ordered</th>
                    <th className="py-3 px-4">Sample Tube & Barcode</th>
                    <th className="py-3 px-4">Billed Amount</th>
                    <th className="py-3 px-4">Diagnostic Status</th>
                    <th className="py-3 px-4 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {filteredLabBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        No diagnostic lab orders found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLabBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <strong className="text-white block">{b.bookingNo}</strong>
                          <span className="text-[10px] text-slate-400">{formatDate(b.scheduledDate || b.createdAt)} • {b.scheduledTime || '08:00 AM'}</span>
                          {b.prescribedByDoctorName && (
                            <span className="text-[10px] text-teal-400 block font-semibold">👨‍⚕️ {b.prescribedByDoctorName}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-white block text-sm">{b.patientName}</strong>
                          <span className="text-[10px] text-indigo-300 font-mono">{b.patientId}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold ml-1">
                            {b.cardTier || 'Health Card'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <strong className="text-slate-100 block">{b.testName}</strong>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400">{b.category}</span>
                            {b.fastingRequired && (
                              <span className="text-[9px] px-1 py-0.2 bg-rose-500/20 text-rose-300 rounded font-bold">
                                Fasting
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {b.sampleBarcode ? (
                            <div>
                              <strong className="text-indigo-400 block">{b.sampleBarcode}</strong>
                              <span className="text-[10px] text-slate-400">{b.sampleTubeType || 'EDTA / SST Tube'}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Not Collected Yet</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-emerald-400 font-bold text-sm">{formatCurrency(b.netPrice)}</span>
                          <span className="text-[10px] text-slate-400 block">MRP: {formatCurrency(b.grossPrice)} (-{b.discountPercentage}%)</span>
                        </td>
                        <td className="py-3 px-4">
                          {b.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock className="w-3 h-3" />
                              Pending Collection
                            </span>
                          )}
                          {b.status === 'phlebotomist_assigned' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              <TestTube className="w-3 h-3" />
                              Phlebotomist Assigned
                            </span>
                          )}
                          {b.status === 'sample_collected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              <TestTube className="w-3 h-3" />
                              Sample Collected
                            </span>
                          )}
                          {b.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
                              <FlaskConical className="w-3 h-3" />
                              Testing in Lab
                            </span>
                          )}
                          {b.status === 'report_ready' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3" />
                              Report Ready & Verified
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Phlebotomy Actions */}
                            {b.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs"
                                leftIcon={<TestTube className="w-3.5 h-3.5" />}
                                onClick={() => setSelectedBookingForDispatch(b)}
                              >
                                Collect Sample
                              </Button>
                            )}

                            {/* Lab Technician Actions */}
                            {b.status === 'sample_collected' && (
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs"
                                leftIcon={<FlaskConical className="w-3.5 h-3.5" />}
                                onClick={() => handleReceiveSampleInLab(b)}
                              >
                                Receive in Lab
                              </Button>
                            )}

                            {(b.status === 'processing' || b.status === 'sample_collected' || b.status === 'report_ready') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950 font-bold text-xs"
                                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenResultsModal(b)}
                              >
                                {b.status === 'report_ready' ? 'Edit Results' : 'Enter Results'}
                              </Button>
                            )}

                            {/* Report Viewer / Downloader */}
                            {b.status === 'report_ready' && (
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs"
                                leftIcon={<Printer className="w-3.5 h-3.5" />}
                                onClick={() => setSelectedBookingForReport(b)}
                              >
                                View / Print PDF
                              </Button>
                            )}

                            {/* Print Tube Label Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Print Vacutainer Tube Label"
                              onClick={() => setSelectedBookingForLabel(b)}
                            >
                              <Printer className="w-3.5 h-3.5 text-purple-400" />
                            </Button>
                          </div>
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

      {/* 6. 📝 AI DOCTOR PRESCRIPTION STUDIO & CLINICAL TEXT SUGGESTER MODAL */}
      {isRxStudioOpen && rxDraft && (
        <Modal
          isOpen={isRxStudioOpen}
          onClose={() => setIsRxStudioOpen(false)}
          title="📝 AI Doctor Prescription Studio & Clinical Requisition Generator"
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs">
            {/* Step-by-Step Patient & Clinical Inputs */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <Stethoscope className="w-4 h-4 text-blue-400" />
                  <span>Step 1: Patient Clinical Profile & History</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  AI Auto-Draft Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Patient Name:</label>
                  <Input
                    value={rxPatientName}
                    onChange={(e) => setRxPatientName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Age (Years):</label>
                  <Input
                    type="number"
                    value={rxPatientAge}
                    onChange={(e) => setRxPatientAge(parseInt(e.target.value, 10) || 40)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Gender:</label>
                  <select
                    value={rxPatientGender}
                    onChange={(e) => setRxPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Chief Complaints & Clinical Presentation:</label>
                <textarea
                  value={rxComplaints}
                  onChange={(e) => setRxComplaints(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 font-bold shadow-lg"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenRxStudio()}
                >
                  Regenerate AI Prescription Draft
                </Button>
              </div>
            </div>

            {/* Generated Prescription Preview Card */}
            <div className="p-5 rounded-3xl bg-slate-950 border-2 border-blue-500/50 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    AI Formatted Clinical Prescription & Requisition Text
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ready to copy into Doctor EMR, WhatsApp, or Print.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md"
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    onClick={handleCopyDoctorPrescription}
                  >
                    📋 Copy Full Rx Text
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-500 text-indigo-300 hover:bg-indigo-950/40 text-xs"
                    leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={handleTransferToEMR}
                  >
                    🏥 Direct Transfer to EMR (/emr)
                  </Button>
                </div>
              </div>

              {/* Step-by-Step Sections Breakdown */}
              <div className="space-y-3 font-sans">
                {/* Step 2: Impression */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                  <strong className="text-[11px] text-blue-300 uppercase font-mono block">
                    Step 2: Provisional Diagnosis & Working Impression:
                  </strong>
                  <p className="text-xs text-white pt-1">
                    {rxDraft.clinicalImpressionText}
                  </p>
                </div>

                {/* Step 3: Advised Investigations */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-[11px] text-emerald-300 uppercase font-mono block">
                      Step 3: Advised Laboratory Investigations ({rxDraft.advisedInvestigationsList.length} Tests):
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono">Priority & Specimen Phlebotomy</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rxDraft.advisedInvestigationsList.map((t, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="overflow-hidden">
                          <strong className="text-white block truncate">{idx + 1}. {t.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{t.sampleTube}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-teal-300 shrink-0">
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 4: Prep & Warnings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                    <strong className="text-[11px] text-amber-300 uppercase font-mono block">
                      Step 4: Phlebotomy Preparation Advice:
                    </strong>
                    <p className="text-xs text-slate-300 pt-1">
                      {rxDraft.phlebotomyInstructionsText}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                    <strong className="text-[11px] text-rose-300 uppercase font-mono block">
                      Step 5: Emergency Red-Flags & Follow-up:
                    </strong>
                    <p className="text-xs text-slate-300 pt-1">
                      {rxDraft.emergencyRedFlagsText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Text View Box */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                  Raw Formatted Text (Editable):
                </label>
                <textarea
                  value={rxDraft.formattedPrescriptionFullText}
                  onChange={(e) => setRxDraft({ ...rxDraft, formattedPrescriptionFullText: e.target.value })}
                  rows={8}
                  className="w-full p-3 rounded-2xl bg-black border border-slate-800 text-xs font-mono text-emerald-300 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsRxStudioOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. ✏️ PACKAGE EDIT & UPDATE MODAL */}
      {isEditPackageOpen && (
        <Modal
          isOpen={isEditPackageOpen}
          onClose={() => setIsEditPackageOpen(false)}
          title={editingPackage ? `Edit Health Package: ${packageForm.name}` : 'Create New Health Package'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Package Code:</label>
                <Input
                  value={packageForm.packageCode}
                  onChange={(e) => setPackageForm({ ...packageForm, packageCode: e.target.value })}
                  placeholder="e.g. PKG-FBE-01"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-300 block">Package Full Title:</label>
                <Input
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  placeholder="e.g. Comprehensive Full Body Health Package"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Category:</label>
                <select
                  value={packageForm.category}
                  onChange={(e) => setPackageForm({ ...packageForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value="Full Body">Full Body</option>
                  <option value="Cardiac">Cardiac</option>
                  <option value="Diabetes">Diabetes</option>
                  <option value="Senior Citizen">Senior Citizen</option>
                  <option value="Women">Women</option>
                  <option value="Liver & Kidney">Liver & Kidney</option>
                  <option value="Pre-Operative">Pre-Operative</option>
                  <option value="Infection">Infection</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Target Group:</label>
                <Input
                  value={packageForm.targetGroup}
                  onChange={(e) => setPackageForm({ ...packageForm, targetGroup: e.target.value })}
                  placeholder="e.g. Men & Women (All Ages)"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Badge / Tagline:</label>
                <Input
                  value={packageForm.tag}
                  onChange={(e) => setPackageForm({ ...packageForm, tag: e.target.value })}
                  placeholder="e.g. ⭐ BEST VALUE • 68 PARAMETERS"
                />
              </div>
            </div>

            {/* Pricing Controls with Live Discount Calculation */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Gross Sum MRP (₹):</label>
                  <Input
                    type="number"
                    value={packageForm.mrp}
                    onChange={(e) => {
                      const newMrp = parseFloat(e.target.value) || 0;
                      setPackageForm({ ...packageForm, mrp: newMrp });
                    }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Special Offer Price (₹):</label>
                  <Input
                    type="number"
                    value={packageForm.offerPrice}
                    onChange={(e) => {
                      const newOffer = parseFloat(e.target.value) || 0;
                      setPackageForm({ ...packageForm, offerPrice: newOffer });
                    }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Calculated Discount:</label>
                  <div className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center font-mono font-bold text-emerald-400 text-sm">
                    {packageForm.mrp > 0
                      ? `${Math.round(((packageForm.mrp - packageForm.offerPrice) / packageForm.mrp) * 100)}% OFF (Save ₹${packageForm.mrp - packageForm.offerPrice})`
                      : '0%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Included Tests Manager */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-300 block">
                  Included Investigations in this Package ({packageForm.includedTests.length}):
                </label>
                <span className="text-[10px] text-teal-400 font-mono">
                  Click any test below to add/remove
                </span>
              </div>

              {/* Selected List */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 max-h-32 overflow-y-auto space-y-1.5">
                {packageForm.includedTests.length === 0 ? (
                  <span className="text-slate-500 italic">No tests currently included. Select from catalog below.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {packageForm.includedTests.map((testName) => (
                      <span
                        key={testName}
                        className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold bg-teal-950 border border-teal-500/40 text-teal-200 flex items-center gap-1.5"
                      >
                        <span className="truncate max-w-[200px]">{testName}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleTestInPackageForm(testName)}
                          className="text-teal-400 hover:text-rose-400 font-black"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Master Test Quick-Selector */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Add from Master Directory:
                </span>
                <div className="max-h-36 overflow-y-auto p-2 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {tests.slice(0, 30).map((t) => {
                    const isSelected = packageForm.includedTests.includes(t.name);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToggleTestInPackageForm(t.name)}
                        className={`p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-teal-900/60 border border-teal-500 text-teal-200'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="font-mono text-[10px] shrink-0">{formatCurrency(t.mrp)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Description & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Clinical Description:</label>
                <textarea
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  rows={2}
                  placeholder="Summary of organ profiles covered and target clinical goals..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageForm.fastingRequired}
                    onChange={(e) => setPackageForm({ ...packageForm, fastingRequired: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  <span>⚠️ Fasting Required (8-10 Hours)</span>
                </label>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="font-bold text-slate-300">Package Status:</span>
                  <select
                    value={packageForm.status}
                    onChange={(e) => setPackageForm({ ...packageForm, status: e.target.value as any })}
                    className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                  >
                    <option value="active">Active & Bookable</option>
                    <option value="inactive">Archived / Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsEditPackageOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 font-black shadow-lg"
              >
                💾 Save & Update Package
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. 🤖 AI HEALTH PACKAGE SYNTHESIZER MODAL */}
      {isAiPackageGeneratorOpen && (
        <Modal
          isOpen={isAiPackageGeneratorOpen}
          onClose={() => setIsAiPackageGeneratorOpen(false)}
          title="🤖 AI Diagnostic Health Package Synthesizer"
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span>Patient Clinical Profile & Symptom Inputs:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Patient Age:</label>
                  <Input
                    type="number"
                    value={aiPatientAge}
                    onChange={(e) => setAiPatientAge(parseInt(e.target.value, 10) || 40)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Gender:</label>
                  <select
                    value={aiPatientGender}
                    onChange={(e) => setAiPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Co-Morbidities:</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !aiCoMorbidities.includes(val)) {
                        setAiCoMorbidities([...aiCoMorbidities, val]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="">+ Add Co-Morbidity</option>
                    <option value="Diabetes">Diabetes Mellitus</option>
                    <option value="Hypertension">Hypertension (High BP)</option>
                    <option value="Cardiovascular">Cardiac / Heart Disease</option>
                    <option value="Smoker">Smoker / Tobacco</option>
                    <option value="Thyroid">Thyroid Disorder</option>
                    <option value="Kidney">Renal / Kidney Disease</option>
                  </select>
                </div>
              </div>

              {aiCoMorbidities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiCoMorbidities.map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setAiCoMorbidities(aiCoMorbidities.filter(c => c !== item))}
                        className="hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Chief Complaints / Presenting Symptoms:</label>
                <textarea
                  value={aiChiefComplaints}
                  onChange={(e) => setAiChiefComplaints(e.target.value)}
                  rows={2}
                  placeholder="e.g. Frequent urination, fatigue, chest heaviness after exertion..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 font-black shadow-lg"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleRunAiSynthesizer}
                >
                  ⚡ Synthesize AI Diagnostic Package
                </Button>
              </div>
            </div>

            {generatedAiRecommendation && (
              <div className="p-5 rounded-3xl bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border-2 border-purple-500/60 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {generatedAiRecommendation.category} • {generatedAiRecommendation.targetGroup}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">
                      {generatedAiRecommendation.packageName}
                    </h3>
                  </div>

                  <span className="px-3 py-1 rounded-2xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    {generatedAiRecommendation.discountPercentage}% CARDHOLDER SAVING
                  </span>
                </div>

                <p className="text-xs text-purple-200 leading-relaxed bg-black/40 p-3 rounded-2xl border border-purple-500/30">
                  {generatedAiRecommendation.clinicalSummary}
                </p>

                <div className="space-y-1.5">
                  <strong className="text-white block font-mono text-[11px] uppercase">
                    AI Recommended Investigations ({generatedAiRecommendation.recommendedTests.length}):
                  </strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {generatedAiRecommendation.recommendedTests.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="overflow-hidden">
                          <strong className="text-xs font-bold text-white block truncate">{t.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{t.category} • {t.specimen}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                          {formatCurrency(t.mrp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[11px] text-slate-400 line-through block">
                      Sum of Individual Tests: {formatCurrency(generatedAiRecommendation.totalMrp)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white">AI Bundled Offer Price:</span>
                      <strong className="text-xl font-black text-emerald-400">
                        {formatCurrency(generatedAiRecommendation.aiOfferPrice)}
                      </strong>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 font-black shadow-lg text-xs"
                    leftIcon={<Check className="w-4 h-4" />}
                    onClick={handlePublishAiPackage}
                  >
                    🚀 Mint & Publish to Portal
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAiPackageGeneratorOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. ADD / EDIT TEST MODAL & PARAMETER STUDIO */}
      {isAddTestOpen && (
        <Modal
          isOpen={isAddTestOpen}
          onClose={() => setIsAddTestOpen(false)}
          title={editingTest ? `Test Master Studio — Edit ${editingTest.name}` : 'Test Master Studio — Configure New Diagnostic Investigation'}
          maxWidth="6xl"
        >
          <form onSubmit={handleSaveTest} className="space-y-4 text-xs">
            {/* Core Test Information */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                1. General Test Master Configuration
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Test Code *</label>
                  <Input
                    value={testForm.code}
                    onChange={(e) => setTestForm({ ...testForm, code: e.target.value })}
                    placeholder="e.g. LAB-CBC-01"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-300 block">Investigation Name *</label>
                  <Input
                    value={testForm.name}
                    onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                    placeholder="e.g. Complete Haemogram with ESR (CBC)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Category *</label>
                  <select
                    value={testForm.category}
                    onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Hormones">Hormones</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Histopathology">Histopathology</option>
                    <option value="Cytology">Cytology</option>
                    <option value="Molecular & PCR">Molecular & PCR</option>
                    <option value="Clinical Pathology">Clinical Pathology</option>
                    <option value="Special Assays">Special Assays</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Department *</label>
                  <Input
                    value={testForm.department}
                    onChange={(e) => setTestForm({ ...testForm, department: e.target.value })}
                    placeholder="e.g. Hematology & Coagulation"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Specimen Requirement *</label>
                  <Input
                    value={testForm.specimen}
                    onChange={(e) => setTestForm({ ...testForm, specimen: e.target.value })}
                    placeholder="e.g. EDTA Whole Blood (2ml)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Standard MRP (₹) *</label>
                  <Input
                    type="number"
                    value={testForm.mrp}
                    onChange={(e) => setTestForm({ ...testForm, mrp: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 350"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Analytical Method</label>
                  <Input
                    value={testForm.method}
                    onChange={(e) => setTestForm({ ...testForm, method: e.target.value })}
                    placeholder="e.g. Automated 5-Part Cell Counter / Photometry"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Turnaround Time (Hours)</label>
                  <Input
                    type="number"
                    value={testForm.tatHours}
                    onChange={(e) => setTestForm({ ...testForm, tatHours: parseInt(e.target.value, 10) || 4 })}
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testForm.fastingRequired}
                      onChange={(e) => setTestForm({ ...testForm, fastingRequired: e.target.checked })}
                      className="rounded text-teal-600"
                    />
                    <span>Fasting Required</span>
                  </label>

                  <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testForm.popular}
                      onChange={(e) => setTestForm({ ...testForm, popular: e.target.checked })}
                      className="rounded text-amber-500"
                    />
                    <span>⭐ Popular</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Parameter Configuration Studio: Single Source of Truth */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                    2. Parameter Configuration Studio ({testForm.parameters.length} Analytes Configured)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Test Master is the single source of truth. Configured parameters will automatically load into Result Entry.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const bp = TestMasterService.getBlueprintForTest(testForm.name) || TestMasterService.getBlueprintForTest(testForm.code);
                      if (bp) {
                        setTestForm(prev => ({ ...prev, parameters: [...bp] }));
                        showToast('success', 'Blueprint Loaded', `Loaded ${bp.length} standard parameters for ${testForm.name}.`);
                      } else {
                        showToast('info', 'No Blueprint Match', 'No standard blueprint found for this name. You can add parameters manually below.');
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Load Blueprint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newP: MasterTestParameter = {
                        id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        parameterCode: `PRM-${testForm.parameters.length + 1}`,
                        parameterName: '',
                        resultType: 'numeric',
                        unit: 'mg/dL',
                        defaultReferenceRange: 'Normal',
                        displayOrder: testForm.parameters.length + 1,
                        reportOrder: testForm.parameters.length + 1,
                        required: true
                      };
                      setTestForm(prev => ({ ...prev, parameters: [...prev.parameters, newP] }));
                    }}
                    className="px-2.5 py-1 rounded-xl bg-teal-950/80 border border-teal-500/40 text-teal-300 hover:text-teal-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Analyte</span>
                  </button>
                </div>
              </div>

              {testForm.parameters.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-slate-400">
                  <TestTube className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="font-bold text-white text-xs">No Parameters Configured Yet</p>
                  <p className="text-[11px] mt-1">Click "Auto-Load Blueprint" or "Add Analyte" to configure test parameters.</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                      <tr>
                        <th className="py-2 px-2 w-10 text-center">#</th>
                        <th className="py-2 px-3">Analyte Name *</th>
                        <th className="py-2 px-2 w-28">Result Type</th>
                        <th className="py-2 px-2 w-20">Unit</th>
                        <th className="py-2 px-3 w-36">Default Ref Range *</th>
                        <th className="py-2 px-2 w-24">Panic Low</th>
                        <th className="py-2 px-2 w-24">Panic High</th>
                        <th className="py-2 px-2 w-10 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {testForm.parameters.map((param, idx) => (
                        <tr key={param.id || idx} className="hover:bg-slate-900/50">
                          <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={param.parameterName}
                              onChange={(e) => {
                                const next = [...testForm.parameters];
                                next[idx] = { ...next[idx], parameterName: e.target.value };
                                setTestForm({ ...testForm, parameters: next });
                              }}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:border-teal-500 focus:outline-none"
                              placeholder="Parameter name..."
                              required
                            />
                            {param.resultType === 'qualitative' && (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  value={param.qualitativeOptions?.join(', ') || ''}
                                  onChange={(e) => {
                                    const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    const next = [...testForm.parameters];
                                    next[idx] = { ...next[idx], qualitativeOptions: opts };
                                    setTestForm({ ...testForm, parameters: next });
                                  }}
                                  className="w-full px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-teal-300 focus:outline-none"
                                  placeholder="Options (comma-separated): Nil, Trace, 1+, 2+, 3+"
                                />
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={param.resultType}
                              onChange={(e) => {
                                const next = [...testForm.parameters];
                                next[idx] = { ...next[idx], resultType: e.target.value as TestResultType };
                                setTestForm({ ...testForm, parameters: next });
                              }}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                            >
                              <option value="numeric">Numeric</option>
                              <option value="positive_negative">Pos / Neg</option>
                              <option value="reactive_non_reactive">Reactive</option>
                              <option value="qualitative">Qualitative</option>
                              <option value="text">Text Note</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={param.unit}
                              onChange={(e) => {
                                const next = [...testForm.parameters];
                                next[idx] = { ...next[idx], unit: e.target.value };
                                setTestForm({ ...testForm, parameters: next });
                              }}
                              className="w-full px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none"
                              placeholder="Unit..."
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={param.defaultReferenceRange}
                              onChange={(e) => {
                                const next = [...testForm.parameters];
                                next[idx] = { ...next[idx], defaultReferenceRange: e.target.value };
                                setTestForm({ ...testForm, parameters: next });
                              }}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono focus:outline-none"
                              placeholder="e.g. 10 - 40"
                              required
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={param.criticalLow ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                const next = [...testForm.parameters];
                                next[idx] = { ...next[idx], criticalLow: val };
                                setTestForm({ ...testForm, parameters: next });
                              }}
                              className="w-full px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-red-400 font-mono focus:outline-none"
                              placeholder="Panic <"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={param.criticalHigh ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                const next = [...testForm.parameters];
                                next[idx] = { ...next[idx], criticalHigh: val };
                                setTestForm({ ...testForm, parameters: next });
                              }}
                              className="w-full px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-red-400 font-mono focus:outline-none"
                              placeholder="Panic >"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setTestForm({
                                  ...testForm,
                                  parameters: testForm.parameters.filter((_, i) => i !== idx)
                                });
                              }}
                              className="text-slate-500 hover:text-red-400 p-1"
                              title="Delete parameter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Description & Clinical Notes */}
            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Clinical Indications / Notes:</label>
              <textarea
                value={testForm.description}
                onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                rows={2}
                placeholder="Description of clinical indications, biomarkers tested, and diagnostic relevance..."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddTestOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-lg">
                {editingTest ? 'Save Test & Publish to Master' : 'Save & Publish Test to Master'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 9. BULK UPLOAD TEST MASTER MODAL */}
      {isBulkUploadOpen && (
        <Modal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          title="Bulk Ingest & Upload Diagnostic Test Master"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-teal-950/80 border border-teal-500/40 text-teal-200 space-y-1">
              <strong className="text-white block font-black">📋 Paste Excel / Tab / CSV Test Rows:</strong>
              <p className="text-[11px] text-teal-300">
                You can copy entire columns directly from Excel or Google Sheets and paste below. Format: <code className="bg-black/40 px-1 py-0.5 rounded text-white">Investigation Name [TAB or COMMA] Rate</code>.
              </p>
            </div>

            <textarea
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              rows={10}
              placeholder={`Example:\nComplete Blood Count\t300\nLipid Profile\t600\nThyroid Profile\t550\nHbA1c\t600`}
              className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 font-black shadow-lg"
                onClick={handleProcessBulkUpload}
              >
                🚀 Import & Synchronize Tests
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 10. AUTO PACKAGE BUILDER MODAL */}
      {isAutoBundleOpen && (
        <Modal
          isOpen={isAutoBundleOpen}
          onClose={() => setIsAutoBundleOpen(false)}
          title="Auto Health Package Bundler Engine"
          maxWidth="lg"
        >
          <form onSubmit={handleAutoBuildPackage} className="space-y-4 text-xs">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Selected Individual Tests:</span>
                <strong className="text-teal-400 font-mono">{bundleSummary.count} Tests</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Sum Total Individual MRP:</span>
                <span className="text-slate-300 font-mono line-through">{formatCurrency(bundleSummary.grossMrp)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800 font-mono">
                <span className="text-white font-black">Calculated Package Offer Price:</span>
                <strong className="text-emerald-400 text-base">{formatCurrency(bundleSummary.offer)}</strong>
              </div>
              <div className="text-[11px] text-emerald-400 font-bold text-right">
                (Cardholder Savings: {formatCurrency(bundleSummary.savings)} • {bundleDiscount}% OFF)
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Package Title / Name:</label>
              <Input
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="e.g. Executive Full Body Wellness Shield"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Discount %:</label>
                <select
                  value={bundleDiscount}
                  onChange={(e) => setBundleDiscount(parseInt(e.target.value, 10) || 40)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value={20}>20% Discount</option>
                  <option value={30}>30% Discount</option>
                  <option value={40}>40% Discount (Recommended)</option>
                  <option value={50}>50% Discount (Mega Saver)</option>
                  <option value={60}>60% Discount (Special Campaign)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Package Category:</label>
                <select
                  value={bundleCategory}
                  onChange={(e) => setBundleCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value="Full Body">Full Body</option>
                  <option value="Cardiac">Cardiac</option>
                  <option value="Diabetes">Diabetes</option>
                  <option value="Senior Citizen">Senior Citizen</option>
                  <option value="Women">Women</option>
                  <option value="Liver & Kidney">Liver & Kidney</option>
                  <option value="Pre-Operative">Pre-Operative</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Target Audience:</label>
                <Input
                  value={bundleTargetGroup}
                  onChange={(e) => setBundleTargetGroup(e.target.value)}
                  placeholder="e.g. All Adults / Senior Citizens"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAutoBundleOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg"
              >
                ⚡ Mint & Publish Health Package
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 11. QUICK SAMPLE TUBE LABEL PREVIEW MODAL */}
      {quickLabelTest && (
        <PhlebotomySampleLabelModal
          isOpen={!!quickLabelTest}
          onClose={() => setQuickLabelTest(null)}
          booking={{
            id: `quick_${quickLabelTest.id}`,
            bookingNo: `LAB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            patientId: 'LMDX-PAT-SPECIMEN',
            patientName: 'Verified Patient Record',
            testName: quickLabelTest.name,
            category: quickLabelTest.category,
            grossPrice: quickLabelTest.mrp,
            discountPercentage: 25,
            discountAmount: Math.round(quickLabelTest.mrp * 0.25),
            netPrice: Math.round(quickLabelTest.mrp * 0.75),
            paymentStatus: 'paid_wallet',
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '09:00 AM',
            collectionType: 'lab_visit',
            status: 'confirmed',
            fastingRequired: quickLabelTest.fastingRequired,
            createdAt: new Date().toISOString()
          }}
        />
      )}

      {/* 12. PHLEBOTOMY SAMPLE DISPATCH & COLLECTION MODAL */}
      {selectedBookingForDispatch && (
        <PhlebotomySampleDispatchModal
          isOpen={!!selectedBookingForDispatch}
          onClose={() => setSelectedBookingForDispatch(null)}
          booking={selectedBookingForDispatch}
          onStatusUpdated={() => refreshLabData()}
          onOpenLabelPrinter={(b) => setSelectedBookingForLabel(b)}
        />
      )}

      {/* 13. PHLEBOTOMY SAMPLE TUBE LABEL MODAL */}
      {selectedBookingForLabel && (
        <PhlebotomySampleLabelModal
          isOpen={!!selectedBookingForLabel}
          onClose={() => setSelectedBookingForLabel(null)}
          booking={selectedBookingForLabel}
        />
      )}

      {/* 14. ENTER TEST RESULTS & BIOLOGICAL VALUES MODAL */}
      {selectedBookingForResults && (
        <LabResultEntryModal
          isOpen={!!selectedBookingForResults}
          onClose={() => setSelectedBookingForResults(null)}
          booking={selectedBookingForResults}
          order={selectedBookingForResults}
          onResultsSaved={() => {
            refreshLabData();
            const updated = PortalService.getLabBookings().find(b => b.id === selectedBookingForResults.id) || null;
            setSelectedBookingForResults(null);
            if (updated) {
              setSelectedBookingForReport(updated);
            }
          }}
        />
      )}

      {/* 15. NEW WALK-IN LAB BOOKING & BILLING MODAL */}
      {showWalkinBookingModal && (
        <Modal
          isOpen={showWalkinBookingModal}
          onClose={() => setShowWalkinBookingModal(false)}
          title="🧾 Front Desk Walk-in Lab Test Booking & Billing"
          maxWidth="4xl"
        >
          <form onSubmit={handleCreateWalkinBooking} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Select Patient:</label>
              <select
                value={walkinPatientId}
                onChange={(e) => setWalkinPatientId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs"
              >
                {PatientService.getAll().map(p => {
                  const card = StorageService.getCards().find(c => c.patientId === p.id);
                  const mem = card ? StorageService.getMemberships().find(m => m.id === card.membershipId) : null;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.id}) — {mem ? `[💳 ${mem.name} - ${mem.labDiscount}% Disc]` : '[Standard Rate]'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Select Diagnostic Tests to Bill:</label>
              <div className="max-h-56 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {tests.slice(0, 40).map(t => {
                  const isSelected = walkinSelectedTestIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setWalkinSelectedTestIds(walkinSelectedTestIds.filter(id => id !== t.id));
                        } else {
                          setWalkinSelectedTestIds([...walkinSelectedTestIds, t.id]);
                        }
                      }}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-950/80 border-teal-500/80 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <strong className="block text-xs">{t.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{t.category}</span>
                      </div>
                      <span className="font-bold font-mono text-emerald-400 text-xs">₹{t.mrp}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Collection Mode:</label>
                <select
                  value={walkinCollectionType}
                  onChange={(e) => setWalkinCollectionType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  <option value="lab_visit">🏥 Lab Visit (Central Diagnostic Centre)</option>
                  <option value="home_collection">🏠 Express Home Collection</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Payment Mode:</label>
                <select
                  value={walkinPaymentMode}
                  onChange={(e) => setWalkinPaymentMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  <option value="paid_counter">💵 Paid Cash at Counter</option>
                  <option value="paid_wallet">💳 Health Wallet (Prepaid Cashless)</option>
                  <option value="pay_at_lab">🟡 Pay Later at Sample Collection</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setShowWalkinBookingModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-lg"
              >
                Confirm Booking & Generate Requisition ({walkinSelectedTestIds.length} Tests)
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 16. OFFICIAL DIAGNOSTIC REPORT PRINT & PDF MODAL */}
      {selectedBookingForReport && (
        <LabReportPrintModal
          isOpen={!!selectedBookingForReport}
          onClose={() => setSelectedBookingForReport(null)}
          booking={selectedBookingForReport}
        />
      )}

      {/* 17. ADD / EDIT PANEL MASTER MODAL */}
      {isAddPanelOpen && (
        <Modal
          isOpen={isAddPanelOpen}
          onClose={() => setIsAddPanelOpen(false)}
          title={editingPanel ? `Panel Master Studio — Edit ${editingPanel.name}` : 'Panel Master Studio — Configure Diagnostic Panel / Package'}
          maxWidth="6xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!canManage) {
                showToast('error', 'Access Denied', 'Permission required to manage panels.');
                return;
              }
              if (!panelForm.name.trim()) {
                showToast('error', 'Panel Name Required', 'Please enter a valid panel name.');
                return;
              }

              if (editingPanel) {
                CatalogService.updatePanel(editingPanel.id, {
                  code: panelForm.code,
                  name: panelForm.name,
                  category: panelForm.category,
                  department: panelForm.department,
                  specimen: panelForm.specimen,
                  type: panelForm.type,
                  tag: panelForm.tag,
                  description: panelForm.description,
                  individualTestIds: panelForm.individualTestIds,
                  mrp: panelForm.mrp,
                  offerPrice: panelForm.offerPrice,
                  fastingRequired: panelForm.fastingRequired,
                  tatHours: panelForm.tatHours,
                  popular: panelForm.popular,
                  status: panelForm.status
                });
                showToast('success', 'Panel Updated', `Updated panel ${panelForm.name}`);
              } else {
                CatalogService.addPanel({
                  code: panelForm.code || `PNL-${Math.floor(100 + Math.random() * 900)}`,
                  name: panelForm.name,
                  category: panelForm.category,
                  department: panelForm.department,
                  specimen: panelForm.specimen,
                  type: panelForm.type,
                  tag: panelForm.tag,
                  description: panelForm.description,
                  individualTestIds: panelForm.individualTestIds,
                  mrp: panelForm.mrp,
                  offerPrice: panelForm.offerPrice,
                  fastingRequired: panelForm.fastingRequired,
                  tatHours: panelForm.tatHours,
                  popular: panelForm.popular,
                  status: panelForm.status
                });
                showToast('success', 'Panel Created', `Configured new panel ${panelForm.name}`);
              }

              setPanels(CatalogService.getPanels());
              setIsAddPanelOpen(false);
              setEditingPanel(null);
            }}
            className="space-y-4 text-xs"
          >
            {/* Panel Basics */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                1. General Panel Configuration
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Panel Code / ID *"
                  value={panelForm.code}
                  onChange={(e) => setPanelForm({ ...panelForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. PNL-LPD-01"
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Panel Name *"
                    value={panelForm.name}
                    onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })}
                    placeholder="e.g. Lipid Profile Comprehensive Panel"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Department"
                  value={panelForm.department}
                  onChange={(e) => setPanelForm({ ...panelForm, department: e.target.value })}
                  options={[
                    { value: 'Clinical Biochemistry', label: 'Clinical Biochemistry' },
                    { value: 'Clinical Pathology & Hematology', label: 'Clinical Pathology & Hematology' },
                    { value: 'Immunoassay / Hormones', label: 'Immunoassay / Hormones' },
                    { value: 'Microbiology & Serology', label: 'Microbiology & Serology' }
                  ]}
                />
                <Input
                  label="Specimen Container / Tube Type *"
                  value={panelForm.specimen}
                  onChange={(e) => setPanelForm({ ...panelForm, specimen: e.target.value })}
                  placeholder="e.g. Serum (2ml Red Cap) or EDTA (Lavender)"
                  required
                />
                <Select
                  label="Category"
                  value={panelForm.category}
                  onChange={(e) => setPanelForm({ ...panelForm, category: e.target.value })}
                  options={[
                    { value: 'Biochemistry', label: 'Biochemistry' },
                    { value: 'Hematology', label: 'Hematology' },
                    { value: 'Endocrinology', label: 'Endocrinology' },
                    { value: 'Diabetes', label: 'Diabetes' },
                    { value: 'Full Body', label: 'Full Body' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="Standard Individual Sum MRP (₹)"
                  type="number"
                  value={panelForm.mrp}
                  onChange={(e) => setPanelForm({ ...panelForm, mrp: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Package Offer Price (₹) *"
                  type="number"
                  value={panelForm.offerPrice}
                  onChange={(e) => setPanelForm({ ...panelForm, offerPrice: parseFloat(e.target.value) || 0 })}
                  required
                />
                <Input
                  label="Turnaround Time (Hours)"
                  type="number"
                  value={panelForm.tatHours}
                  onChange={(e) => setPanelForm({ ...panelForm, tatHours: parseInt(e.target.value, 10) || 4 })}
                />
                <div className="flex items-center gap-3 pt-4">
                  <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={panelForm.fastingRequired}
                      onChange={(e) => setPanelForm({ ...panelForm, fastingRequired: e.target.checked })}
                      className="rounded text-cyan-600"
                    />
                    <span>Fasting Req</span>
                  </label>
                  <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={panelForm.popular}
                      onChange={(e) => setPanelForm({ ...panelForm, popular: e.target.checked })}
                      className="rounded text-amber-500"
                    />
                    <span>⭐ Popular</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Referenced Individual Tests Selector (Requirement 4 & 18: No Duplicate Tests) */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  2. Referenced Individual Tests ({panelForm.individualTestIds.length} Selected)
                </span>
                <span className="text-[10px] text-slate-400">
                  Select constituent investigations already configured in the Individual Test Master. Zero duplicate test definitions are created.
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter available individual tests to include in this panel..."
                  value={panelSearchQuery}
                  onChange={(e) => setPanelSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-950 pr-1">
                {tests
                  .filter(t => !panelSearchQuery || t.name.toLowerCase().includes(panelSearchQuery.toLowerCase()) || t.code.toLowerCase().includes(panelSearchQuery.toLowerCase()))
                  .slice(0, 30)
                  .map(t => {
                    const isChecked = panelForm.individualTestIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`p-2 hover:bg-slate-900 flex items-center justify-between cursor-pointer transition ${
                          isChecked ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setPanelForm(prev => {
                                const exists = prev.individualTestIds.includes(t.id);
                                const updatedIds = exists
                                  ? prev.individualTestIds.filter(id => id !== t.id)
                                  : [...prev.individualTestIds, t.id];
                                return { ...prev, individualTestIds: updatedIds };
                              });
                            }}
                            className="rounded text-cyan-600"
                          />
                          <div>
                            <strong className="text-white text-xs block">{t.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{t.code} • {t.department}</span>
                          </div>
                        </div>
                        <span className="font-mono text-cyan-400 font-bold text-xs">{formatCurrency(t.mrp)}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddPanelOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black shadow-lg"
              >
                {editingPanel ? 'Save Panel Configuration' : 'Create Diagnostic Panel'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
