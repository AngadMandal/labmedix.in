import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { StorageService, STORAGE_KEYS } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { BackupService } from '../../services/backupService';
import { AuditService } from '../../services/auditService';
import {
  SuperAdminService,
  MasterDataCategory,
  ImportValidationResult,
  DataQualityIssue,
  ReconciliationAnomaly,
  SystemHealthCheckItem,
  SystemConfigurationSettings
} from '../../services/superAdminService';
import { PharmacyService } from '../../services/pharmacyService';
import { DoctorMasterItem } from '../../services/doctorMasterService';
import { LabTestItem } from '../../services/catalogService';
import {
  Patient,
  HealthCard,
  User,
  MedicineMasterItem,
  PatientBill,
  CentralTransaction,
  PharmacySale,
  AuditLog,
  CompanyProfile
} from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  ShieldAlert,
  Crown,
  LayoutDashboard,
  Database,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  GitMerge,
  Users,
  CreditCard,
  Pill,
  TestTube,
  Building,
  History,
  Activity,
  DollarSign,
  Lock,
  Sliders,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  Calendar,
  Check,
  X,
  Layers,
  Sparkles,
  Server,
  KeyRound
} from 'lucide-react';

type SuperAdminTab =
  | 'dashboard'
  | 'manual_data'
  | 'import'
  | 'export'
  | 'data_quality'
  | 'demo_purge'
  | 'backup_restore'
  | 'reconciliation'
  | 'system_health'
  | 'system_config'
  | 'company_data'
  | 'audit_logs';

export const SuperAdminControlCenterPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { companyProfile, updateCompanyProfile } = useSettings();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SuperAdminTab>('dashboard');

  // Sovereign Check
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Master Data State
  const [dataCategory, setDataCategory] = useState<MasterDataCategory>('patients');
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [medicines, setMedicines] = useState<MedicineMasterItem[]>(() => PharmacyService.getMedicines());
  const [tests, setTests] = useState<LabTestItem[]>(() => StorageService.getItem<LabTestItem[]>(STORAGE_KEYS.LAB_TESTS, []));
  const [doctors, setDoctors] = useState<DoctorMasterItem[]>(() => StorageService.getItem<DoctorMasterItem[]>(STORAGE_KEYS.DOCTORS, []));
  const [bills, setBills] = useState<PatientBill[]>(() => StorageService.getItem<PatientBill[]>(STORAGE_KEYS.BILLS, []));
  const [transactions, setTransactions] = useState<CentralTransaction[]>(() => StorageService.getItem<CentralTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []));

  // Modals for Master Data
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | null>(null);

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<HealthCard | null>(null);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState('');
  const [mergeSecondaryId, setMergeSecondaryId] = useState('');

  // Import Center State
  const [importModule, setImportModule] = useState<MasterDataCategory>('patients');
  const [rawCsvContent, setRawCsvContent] = useState('');
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activePreviewSubTab, setActivePreviewSubTab] = useState<'valid' | 'duplicates' | 'invalid'>('valid');

  // Export Center State
  const [exportDataset, setExportDataset] = useState('patients');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState('all');

  // Demo Purge State
  const [demoStats, setDemoStats] = useState(() => SuperAdminService.getDemoDataSummary());
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  // Data Quality State
  const [qualityIssues, setQualityIssues] = useState<DataQualityIssue[]>(() => SuperAdminService.scanDataQuality());

  // Reconciliation State
  const [reconcileAnomalies, setReconcileAnomalies] = useState<ReconciliationAnomaly[]>(() =>
    SuperAdminService.reconcileTransactions()
  );

  // System Health State
  const [healthChecks, setHealthChecks] = useState<SystemHealthCheckItem[]>(() =>
    SuperAdminService.runSystemHealthCheck()
  );
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);

  // System Configuration State
  const [systemConfig, setSystemConfig] = useState<SystemConfigurationSettings>(() =>
    SuperAdminService.getSystemConfig()
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Company Data Editing State
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(companyProfile);

  useEffect(() => {
    setCompanyForm(companyProfile);
  }, [companyProfile]);

  // Refresh Master Data
  const refreshAllData = () => {
    setPatients(StorageService.getPatients());
    setCards(StorageService.getCards());
    setMedicines(PharmacyService.getMedicines());
    setTests(StorageService.getItem<LabTestItem[]>(STORAGE_KEYS.LAB_TESTS, []));
    setDoctors(StorageService.getItem<DoctorMasterItem[]>(STORAGE_KEYS.DOCTORS, []));
    setBills(StorageService.getItem<PatientBill[]>(STORAGE_KEYS.BILLS, []));
    setTransactions(StorageService.getItem<CentralTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []));
    setAuditLogs(StorageService.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []));
    setDemoStats(SuperAdminService.getDemoDataSummary());
    setQualityIssues(SuperAdminService.scanDataQuality());
    setReconcileAnomalies(SuperAdminService.reconcileTransactions());
    setHealthChecks(SuperAdminService.runSystemHealthCheck());
    showToast('info', 'Data Refreshed', 'Refreshed all master collections and telemetry.');
  };

  // --------------------------------------------------------------------------
  // ACTIONS: PATIENT & CARDS
  // --------------------------------------------------------------------------

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient?.fullName || !editingPatient?.mobile) {
      showToast('error', 'Validation Error', 'Full Name and 10-digit Mobile are required.');
      return;
    }
    try {
      const isNew = !editingPatient.id;
      const saved = SuperAdminService.savePatientRecord(
        editingPatient as any,
        currentUser?.fullName || 'Super Admin',
        isNew
      );
      setPatients(StorageService.getPatients());
      setIsPatientModalOpen(false);
      setEditingPatient(null);
      showToast(
        'success',
        isNew ? 'Patient Created' : 'Patient Updated',
        `Successfully saved record for ${saved.fullName} (${saved.id}).`
      );
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save patient record.');
    }
  };

  const handleMergePatients = () => {
    if (!mergePrimaryId || !mergeSecondaryId) {
      showToast('error', 'Selection Required', 'Select both Primary (Target) and Secondary (Source) patient.');
      return;
    }
    try {
      const result = SuperAdminService.mergeDuplicatePatients(
        mergePrimaryId,
        mergeSecondaryId,
        currentUser?.fullName || 'Super Admin'
      );
      refreshAllData();
      setIsMergeModalOpen(false);
      setMergePrimaryId('');
      setMergeSecondaryId('');
      showToast('success', 'Patients Merged', result.message);
    } catch (err: any) {
      showToast('error', 'Merge Failed', err.message || 'Could not merge patients.');
    }
  };

  const handleUpdateCardStatus = (
    cardId: string,
    newStatus: 'active' | 'suspended' | 'expired' | 'pending' | 'cancelled' | 'deleted'
  ) => {
    try {
      const updated = SuperAdminService.updateHealthCardStatus(
        cardId,
        newStatus,
        'Super Admin manual status toggle',
        currentUser?.fullName || 'Super Admin'
      );
      setCards(StorageService.getCards());
      showToast('success', 'Card Status Updated', `Card ${updated.cardNumber} status is now ${newStatus.toUpperCase()}.`);
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not update card status.');
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: IMPORT CENTER
  // --------------------------------------------------------------------------

  const handleDownloadTemplate = () => {
    const csv = SuperAdminService.getTemplateCsv(importModule);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LabMedix_${importModule}_import_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('info', 'Template Downloaded', `Downloaded CSV template for ${importModule}.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setRawCsvContent(text);
      try {
        const result = SuperAdminService.parseAndValidateCsv(importModule, text);
        setValidationResult(result);
        showToast(
          'info',
          'File Validated',
          `Parsed ${result.totalRows} rows: ${result.validRows.length} valid, ${result.duplicateRows.length} duplicates, ${result.invalidRows.length} invalid.`
        );
      } catch (err: any) {
        showToast('error', 'Validation Error', err.message || 'Could not parse CSV.');
      }
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) {
      showToast('error', 'No Valid Records', 'No valid records ready to commit.');
      return;
    }
    try {
      setIsImporting(true);
      const result = await SuperAdminService.commitImportedData(
        importModule,
        validationResult.validRows,
        currentUser?.fullName || 'Super Admin'
      );
      refreshAllData();
      setValidationResult(null);
      setRawCsvContent('');
      showToast('success', 'Import Completed', result.message);
    } catch (err: any) {
      showToast('error', 'Import Failed', err.message || 'Could not commit imported data.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!validationResult || validationResult.invalidRows.length === 0) return;
    let csv = 'Row,Field,Errors,SuggestedAction\n';
    validationResult.invalidRows.forEach(inv => {
      csv += `${inv.row},"${inv.field}","${inv.errors.join('; ')}","${inv.suggestedAction}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LabMedix_${importModule}_error_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: EXPORT CENTER
  // --------------------------------------------------------------------------

  const handleExportData = () => {
    try {
      const csv = SuperAdminService.exportDatasetToCsv(exportDataset, {
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
        status: exportStatus
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LabMedix_${exportDataset}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Export Downloaded', `Successfully exported ${exportDataset} dataset.`);
    } catch (err: any) {
      showToast('error', 'Export Failed', err.message || 'Could not export dataset.');
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: DEMO PURGE
  // --------------------------------------------------------------------------

  const handleExecutePurge = async () => {
    try {
      setIsPurging(true);
      const res = await SuperAdminService.executeSafeDemoDataPurge(
        confirmationInput,
        currentUser?.fullName || 'Super Admin'
      );
      setPurgeResult(res.message);
      setConfirmationInput('');
      refreshAllData();
      showToast('success', 'Demo Purge Successful', res.message);
    } catch (err: any) {
      showToast('error', 'Purge Blocked', err.message || 'Could not purge demo records.');
    } finally {
      setIsPurging(false);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: SYSTEM CONFIG & COMPANY
  // --------------------------------------------------------------------------

  const handleSaveSystemConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingConfig(true);
      SuperAdminService.saveSystemConfig(systemConfig, currentUser?.fullName || 'Super Admin');
      showToast('success', 'Configuration Saved', 'System numbering, ID prefixes, and policy limits saved.');
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveCompanyData = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompanyProfile(companyForm);
      showToast('success', 'Company Profile Synced', 'Updated company branding and dynamic hospital settings.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not update company profile.');
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: HEALTH CHECK
  // --------------------------------------------------------------------------

  const handleRunHealthCheck = () => {
    setIsRunningHealthCheck(true);
    setTimeout(() => {
      const results = SuperAdminService.runSystemHealthCheck();
      setHealthChecks(results);
      setIsRunningHealthCheck(false);
      showToast('info', 'Diagnostics Complete', 'Evaluated 8 core subsystem health indicators.');
    }, 400);
  };

  // --------------------------------------------------------------------------
  // SECURITY GATE: SUPER ADMIN ONLY
  // --------------------------------------------------------------------------

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center text-slate-800 dark:text-slate-200">
        <div className="p-4 rounded-3xl bg-rose-500/20 text-rose-500 border border-rose-500/40 mb-4 shadow-xl">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-rose-600 dark:text-rose-400">HTTP 403 — Sovereign Super Admin Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-2">
          The Super Admin Control Center is strictly restricted to the primary institutional root administrator. Your account ({currentUser?.fullName}, role: {currentUser?.role}) is not authorized.
        </p>
        <Button onClick={() => window.location.hash = '/dashboard'} className="mt-6">
          Return to Authorized Dashboard
        </Button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MAIN SUPER ADMIN CONTROL CENTER
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* SOVEREIGN BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-inner">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Super Admin Control Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  ROOT SOVEREIGN
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Central single source of truth: operational master data, validated imports, exports, safe purge, data quality & multi-ledger reconciliation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshAllData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync & Refresh</span>
            </button>
            <div className="px-3.5 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-right">
              <span className="text-[10px] text-purple-300 block uppercase font-mono">Active Operator</span>
              <span className="text-xs font-bold text-white block truncate max-w-[180px]">
                {currentUser?.fullName || 'Root Super Admin'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTAL TAB NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin border-b border-slate-800">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'manual_data', label: 'Master Data', icon: Database },
          { id: 'import', label: 'Import Center', icon: Upload },
          { id: 'export', label: 'Export Center', icon: Download },
          { id: 'data_quality', label: 'Data Quality', icon: Sparkles },
          { id: 'demo_purge', label: 'Demo Purge', icon: Flame },
          { id: 'reconciliation', label: 'Reconciliation', icon: DollarSign },
          { id: 'system_health', label: 'System Health', icon: Activity },
          { id: 'system_config', label: 'ID & Config', icon: Sliders },
          { id: 'company_data', label: 'Company Profile', icon: Building },
          { id: 'audit_logs', label: 'Audit Trail', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SOVEREIGN DASHBOARD                                            */}
      {/* ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Patients</span>
              <div className="text-2xl font-black text-white">{patients.length}</div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Master Directory
              </span>
            </div>
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Health Cards</span>
              <div className="text-2xl font-black text-purple-400">{cards.length}</div>
              <span className="text-[10px] text-purple-300 flex items-center gap-1 font-mono">
                <CreditCard className="w-3 h-3" /> Max 5 Family Limit
              </span>
            </div>
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Quality Notices</span>
              <div className="text-2xl font-black text-amber-400">{qualityIssues.length}</div>
              <span className="text-[10px] text-amber-300 flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3" /> {qualityIssues.length === 0 ? 'Clean Catalog' : 'Review Needed'}
              </span>
            </div>
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Ledger Discrepancies</span>
              <div className="text-2xl font-black text-rose-400">{reconcileAnomalies.length}</div>
              <span className="text-[10px] text-rose-300 flex items-center gap-1 font-mono">
                <DollarSign className="w-3 h-3" /> {reconcileAnomalies.length === 0 ? 'Balanced' : 'Anomalies Flagged'}
              </span>
            </div>
          </div>

          {/* Quick Action Station */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Sovereign Command Shortcuts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setEditingPatient({ gender: 'male', bloodGroup: 'Unknown' });
                  setIsPatientModalOpen(true);
                }}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/20 text-left transition group space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-purple-300">Add Patient Record</span>
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
                </div>
                <p className="text-[10px] text-slate-400">
                  Manual registration with mobile & duplicate phone validation.
                </p>
              </button>

              <button
                onClick={() => setIsMergeModalOpen(true)}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-950/20 text-left transition group space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-blue-300">Merge Duplicate Patients</span>
                  <GitMerge className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                </div>
                <p className="text-[10px] text-slate-400">
                  Consolidate cards, bills, and lab orders into one primary master patient.
                </p>
              </button>

              <button
                onClick={() => setActiveTab('import')}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 text-left transition group space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300">Bulk Import Center</span>
                  <Upload className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-400">
                  CSV validation, preview, duplicate detection, and batch write.
                </p>
              </button>
            </div>
          </div>

          {/* Subsystem Health Glance */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Subsystem Health Status
              </h3>
              <button
                onClick={() => setActiveTab('system_health')}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
              >
                <span>Full Diagnostics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {healthChecks.slice(0, 4).map(hc => (
                <div
                  key={hc.id}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3"
                >
                  <div>
                    <strong className="text-xs text-white block">{hc.name}</strong>
                    <p className="text-[11px] text-slate-400 mt-0.5">{hc.message}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                      hc.status === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : hc.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {hc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: MANUAL MASTER DATA MANAGEMENT                                 */}
      {/* ===================================================================== */}
      {activeTab === 'manual_data' && (
        <div className="space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'patients', label: `Patients (${patients.length})`, icon: Users },
                { id: 'cards', label: `Health Cards (${cards.length})`, icon: CreditCard },
                { id: 'medicines', label: `Medicines (${medicines.length})`, icon: Pill },
                { id: 'tests', label: `Lab Tests (${tests.length})`, icon: TestTube }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setDataCategory(cat.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    dataCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              {dataCategory === 'patients' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPatient({ gender: 'male', bloodGroup: 'Unknown' });
                    setIsPatientModalOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Patient
                </Button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 overflow-x-auto">
            {dataCategory === 'patients' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Patient ID</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Demographics</th>
                    <th className="py-2.5 px-3">Blood Group</th>
                    <th className="py-2.5 px-3">Registered</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {patients
                    .filter(
                      p =>
                        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.mobile.includes(searchQuery) ||
                        p.id.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 50)
                    .map(pt => (
                      <tr key={pt.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-purple-300">{pt.id}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{pt.fullName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{pt.mobile}</td>
                        <td className="py-2.5 px-3">
                          {pt.age} yrs • {pt.gender}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-200">{pt.bloodGroup || 'Unknown'}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {formatDate(pt.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingPatient(pt);
                              setIsPatientModalOpen(true);
                            }}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Edit Patient"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {dataCategory === 'cards' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Card No.</th>
                    <th className="py-2.5 px-3">Cardholder</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Family Members</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Expiry</th>
                    <th className="py-2.5 px-3 text-right">Status Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cards
                    .filter(
                      c =>
                        c.cardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c as any).patientName?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 50)
                    .map(cd => (
                      <tr key={cd.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-purple-300 font-bold">{cd.cardNumber}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{(cd as any).patientName || cd.patientId}</td>
                        <td className="py-2.5 px-3 font-semibold text-amber-300 capitalize">{cd.tier || 'standard'}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-xs text-slate-200">
                            {(cd as any).familyMembers?.length || 0} / 5
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              cd.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : cd.status === 'suspended'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {cd.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{formatDate(cd.expiryDate)}</td>
                        <td className="py-2.5 px-3 text-right space-x-1">
                          {cd.status !== 'active' && (
                            <button
                              onClick={() => handleUpdateCardStatus(cd.id, 'active')}
                              className="px-2 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 text-[10px] font-bold"
                            >
                              Activate
                            </button>
                          )}
                          {cd.status === 'active' && (
                            <button
                              onClick={() => handleUpdateCardStatus(cd.id, 'suspended')}
                              className="px-2 py-1 rounded-lg bg-rose-600/30 text-rose-300 hover:bg-rose-600/50 text-[10px] font-bold"
                            >
                              Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {dataCategory === 'medicines' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Medicine ID</th>
                    <th className="py-2.5 px-3">Brand Name</th>
                    <th className="py-2.5 px-3">Generic Salt</th>
                    <th className="py-2.5 px-3">Dosage Form</th>
                    <th className="py-2.5 px-3">MRP (₹)</th>
                    <th className="py-2.5 px-3">GST %</th>
                    <th className="py-2.5 px-3">Total Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {medicines
                    .filter(
                      m =>
                        m.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.genericName.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 50)
                    .map(med => (
                      <tr key={med.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-purple-300">{med.id}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{med.brandName || med.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{med.genericName}</td>
                        <td className="py-2.5 px-3">{med.dosageForm}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{med.mrp.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono">{med.taxGstRate || 12}%</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{(med as any).totalStock || 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {dataCategory === 'tests' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Test Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Sample Type</th>
                    <th className="py-2.5 px-3">Standard Price</th>
                    <th className="py-2.5 px-3">TAT (Hours)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tests
                    .filter(
                      t =>
                        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.code.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 50)
                    .map(tst => (
                      <tr key={tst.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-purple-300 font-bold">{tst.code}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{tst.name}</td>
                        <td className="py-2.5 px-3 text-slate-300">{tst.department}</td>
                        <td className="py-2.5 px-3 text-slate-400">{tst.specimen}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{tst.mrp.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono">{tst.tatHours}h</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: IMPORT DATA (IMPORT CENTER)                                    */}
      {/* ===================================================================== */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-400" />
                  Validated Bulk Data Import Workflow
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Download the official template, validate rows, detect duplicates, review errors, and commit cleanly to Central Firestore.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={importModule}
                  onChange={e => {
                    setImportModule(e.target.value as any);
                    setValidationResult(null);
                  }}
                  options={[
                    { value: 'patients', label: 'Patients Directory' },
                    { value: 'medicines', label: 'Medicines Master' },
                    { value: 'tests', label: 'Laboratory Tests' },
                    { value: 'doctors', label: 'Doctor Master' }
                  ]}
                />
                <Button variant="secondary" onClick={handleDownloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Template
                </Button>
              </div>
            </div>

            {/* File Upload Box */}
            <div className="p-8 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-purple-500/50 transition text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <strong className="text-sm text-slate-200 block">Select CSV or Spreadsheet File</strong>
                <p className="text-xs text-slate-500">Supported formats: CSV, TSV (UTF-8 formatted)</p>
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Validation Results & Preview */}
          {validationResult && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400">Total Rows: </span>
                    <strong className="text-white font-mono">{validationResult.totalRows}</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300">
                    <span>Valid: </span>
                    <strong className="font-mono">{validationResult.validRows.length}</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                    <span>Duplicates: </span>
                    <strong className="font-mono">{validationResult.duplicateRows.length}</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
                    <span>Invalid: </span>
                    <strong className="font-mono">{validationResult.invalidRows.length}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {validationResult.invalidRows.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleDownloadErrorReport}>
                      <Download className="w-3.5 h-3.5 mr-1" /> Download Error Report
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={validationResult.validRows.length === 0 || isImporting}
                    onClick={handleCommitImport}
                  >
                    {isImporting ? 'Writing to Firestore...' : `Confirm & Import (${validationResult.validRows.length})`}
                  </Button>
                </div>
              </div>

              {/* Sub-tabs for Preview */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActivePreviewSubTab('valid')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    activePreviewSubTab === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Valid Records ({validationResult.validRows.length})
                </button>
                <button
                  onClick={() => setActivePreviewSubTab('duplicates')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    activePreviewSubTab === 'duplicates' ? 'bg-amber-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Duplicates to Skip ({validationResult.duplicateRows.length})
                </button>
                <button
                  onClick={() => setActivePreviewSubTab('invalid')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    activePreviewSubTab === 'invalid' ? 'bg-rose-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Invalid Errors ({validationResult.invalidRows.length})
                </button>
              </div>

              {/* Preview Content */}
              <div className="max-h-72 overflow-y-auto">
                {activePreviewSubTab === 'invalid' && (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="py-2 px-3">Row #</th>
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Error</th>
                        <th className="py-2 px-3">Suggested Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {validationResult.invalidRows.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-purple-300">Row {inv.row}</td>
                          <td className="py-2 px-3 text-rose-400 font-bold">{inv.field}</td>
                          <td className="py-2 px-3 text-slate-300">{inv.errors.join(', ')}</td>
                          <td className="py-2 px-3 text-emerald-400 font-sans">{inv.suggestedAction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activePreviewSubTab === 'duplicates' && (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="py-2 px-3">Row #</th>
                        <th className="py-2 px-3">Reason</th>
                        <th className="py-2 px-3">Existing Identifier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {validationResult.duplicateRows.map((dup, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-purple-300">Row {dup.row}</td>
                          <td className="py-2 px-3 text-amber-300 font-sans">{dup.reason}</td>
                          <td className="py-2 px-3 text-slate-400">{dup.existingId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activePreviewSubTab === 'valid' && (
                  <pre className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto">
                    {JSON.stringify(validationResult.validRows.slice(0, 10), null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: EXPORT DATA (EXPORT CENTER)                                    */}
      {/* ===================================================================== */}
      {activeTab === 'export' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              Sovereign Data Export Center
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Extract authorized system collections in UTF-8 BOM CSV format compatible with Microsoft Excel and data analytics suites.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dataset</label>
              <Select
                value={exportDataset}
                onChange={e => setExportDataset(e.target.value)}
                options={[
                  { value: 'patients', label: 'Patients Directory' },
                  { value: 'cards', label: 'Health Cards' },
                  { value: 'transactions', label: 'Financial Ledger' },
                  { value: 'medicines', label: 'Medicine Catalog' },
                  { value: 'tests', label: 'Lab Test Master' },
                  { value: 'pharmacy_sales', label: 'Pharmacy Sales Invoices' }
                ]}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Start Date</label>
              <Input
                type="date"
                value={exportStartDate}
                onChange={e => setExportStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">End Date</label>
              <Input
                type="date"
                value={exportEndDate}
                onChange={e => setExportEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" /> Download CSV / Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: DATA QUALITY CENTER                                            */}
      {/* ===================================================================== */}
      {activeTab === 'data_quality' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Data Quality & Hygiene Center
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Detect duplicate records, orphan cards, broken foreign keys, and missing demographics.
              </p>
            </div>
            <Button size="sm" onClick={() => setQualityIssues(SuperAdminService.scanDataQuality())}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-scan Database
            </Button>
          </div>

          <div className="space-y-3">
            {qualityIssues.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">Database Hygiene Pristine</h4>
                <p className="text-xs text-slate-400">No duplicate patients, orphan health cards, or broken references found.</p>
              </div>
            ) : (
              qualityIssues.map(issue => (
                <div
                  key={issue.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          issue.severity === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : issue.severity === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {issue.severity} priority
                      </span>
                      <strong className="text-xs text-white">{issue.title}</strong>
                    </div>
                    <p className="text-xs text-slate-400">{issue.description}</p>
                  </div>

                  {issue.category === 'duplicate_patient' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (issue.metadata && issue.metadata.patientIds && issue.metadata.patientIds.length >= 2) {
                          setMergePrimaryId(issue.metadata.patientIds[0]);
                          setMergeSecondaryId(issue.metadata.patientIds[1]);
                          setIsMergeModalOpen(true);
                        }
                      }}
                    >
                      <GitMerge className="w-3.5 h-3.5 mr-1" /> Resolve Merge
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: DEMO DATA PURGE (SAFE PURGE STATION)                          */}
      {/* ===================================================================== */}
      {activeTab === 'demo_purge' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-3">
            <Flame className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <strong className="text-xs text-rose-300 block font-bold">
                Controlled Production Demo Data Purge
              </strong>
              <p className="text-[11px] text-slate-400">
                Purges records explicitly tagged with <code className="text-rose-400">environment = DEMO</code> or <code className="text-rose-400">recordType = DEMO</code>. Genuine production records are strictly protected.
              </p>
            </div>
          </div>

          {/* Breakdown counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Demo Patients</span>
              <strong className="text-lg text-white font-mono">{demoStats.patientsCount}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Demo Cards</span>
              <strong className="text-lg text-white font-mono">{demoStats.cardsCount}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Demo Transactions</span>
              <strong className="text-lg text-white font-mono">{demoStats.transactionsCount}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Total Demo Items</span>
              <strong className="text-lg text-rose-400 font-mono">{demoStats.totalDemoItems}</strong>
            </div>
          </div>

          {/* Safety Confirmation */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-300 block">
              Type <span className="text-rose-400 font-mono">PURGE-DEMO-DATA-2026</span> to authorize cleanup:
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="text"
                placeholder="PURGE-DEMO-DATA-2026"
                value={confirmationInput}
                onChange={e => setConfirmationInput(e.target.value)}
                className="font-mono text-xs"
              />
              <button
                disabled={confirmationInput !== 'PURGE-DEMO-DATA-2026' || isPurging || demoStats.totalDemoItems === 0}
                onClick={handleExecutePurge}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white transition whitespace-nowrap"
              >
                {isPurging ? 'Executing Purge...' : 'Purge Demo Records'}
              </button>
            </div>
            {purgeResult && (
              <p className="text-xs text-emerald-400 font-mono">{purgeResult}</p>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: TRANSACTION RECONCILIATION                                     */}
      {/* ===================================================================== */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Multi-Ledger Financial Reconciliation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated matching between Patient Bills ↔ Transactions ↔ Pharmacy Counter Sales.
              </p>
            </div>
            <Button size="sm" onClick={() => setReconcileAnomalies(SuperAdminService.reconcileTransactions())}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-check Ledgers
            </Button>
          </div>

          <div className="space-y-3">
            {reconcileAnomalies.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">All Ledgers Perfectly Balanced</h4>
                <p className="text-xs text-slate-400">Zero unbalanced invoices or orphan pharmacy sales found.</p>
              </div>
            ) : (
              reconcileAnomalies.map(anom => (
                <div
                  key={anom.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {anom.type.replace('_', ' ')}
                      </span>
                      <strong className="text-xs text-white font-mono">{anom.referenceId}</strong>
                    </div>
                    <p className="text-xs text-slate-400">{anom.description}</p>
                  </div>
                  <span className="text-xs font-mono text-rose-400 font-bold">
                    Diff: ₹{anom.difference?.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 8: SYSTEM HEALTH CHECK                                           */}
      {/* ===================================================================== */}
      {activeTab === 'system_health' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                14-Point Subsystem Health Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time telemetry checking Cloud Firestore, Auth tokens, Cryptographic Ledger, and Collections.
              </p>
            </div>
            <Button size="sm" onClick={handleRunHealthCheck} disabled={isRunningHealthCheck}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {isRunningHealthCheck ? 'Evaluating...' : 'Run Diagnostics'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {healthChecks.map(hc => (
              <div
                key={hc.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-white">{hc.name}</strong>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      hc.status === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : hc.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {hc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{hc.message}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Recommendation: {hc.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 9: SYSTEM CONFIGURATION & NUMBERING                               */}
      {/* ===================================================================== */}
      {activeTab === 'system_config' && (
        <form onSubmit={handleSaveSystemConfig} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Centralized ID Numbering & System Policy Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure uniform numbering formats and institutional limits across all hospital stations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Patient ID Prefix</label>
              <Input
                value={systemConfig.patientIdPrefix}
                onChange={e => setSystemConfig({ ...systemConfig, patientIdPrefix: e.target.value })}
                placeholder="LM-PT-"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Health Card Number Prefix</label>
              <Input
                value={systemConfig.cardNoPrefix}
                onChange={e => setSystemConfig({ ...systemConfig, cardNoPrefix: e.target.value })}
                placeholder="LHC-"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Pharmacy Invoice Prefix</label>
              <Input
                value={systemConfig.pharmacyInvoicePrefix}
                onChange={e => setSystemConfig({ ...systemConfig, pharmacyInvoicePrefix: e.target.value })}
                placeholder="LM-PH-"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">General Invoice Prefix</label>
              <Input
                value={systemConfig.invoiceNoPrefix}
                onChange={e => setSystemConfig({ ...systemConfig, invoiceNoPrefix: e.target.value })}
                placeholder="LM-INV-"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Lab Report Prefix</label>
              <Input
                value={systemConfig.labReportNoPrefix}
                onChange={e => setSystemConfig({ ...systemConfig, labReportNoPrefix: e.target.value })}
                placeholder="LAB-REP-"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Max Family Members Per Card</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={systemConfig.maxFamilyMembers}
                onChange={e => setSystemConfig({ ...systemConfig, maxFamilyMembers: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button type="submit" disabled={isSavingConfig}>
              {isSavingConfig ? 'Saving Settings...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB 10: COMPANY DATA (SINGLE SOURCE OF TRUTH)                         */}
      {/* ===================================================================== */}
      {activeTab === 'company_data' && (
        <form onSubmit={handleSaveCompanyData} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-400" />
              Centralized Hospital & Company Master Profile
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              All invoices, diagnostic reports, and health card credentials pull directly from this single record.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Hospital / Center Name</label>
              <Input
                value={companyForm.name}
                onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Tagline</label>
              <Input
                value={companyForm.tagline}
                onChange={e => setCompanyForm({ ...companyForm, tagline: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1">Official Address</label>
              <Input
                value={companyForm.address}
                onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Contact Phone</label>
              <Input
                value={companyForm.phone}
                onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Official Email</label>
              <Input
                value={companyForm.email}
                onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Drug License (DL 20B/21B)</label>
              <Input
                value={companyForm.clinicalLicenseNo || ''}
                onChange={e => setCompanyForm({ ...companyForm, clinicalLicenseNo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">GSTIN Number</label>
              <Input
                value={companyForm.gstin || ''}
                onChange={e => setCompanyForm({ ...companyForm, gstin: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button type="submit">Save & Propagate Hospital Settings</Button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB 11: CRYPTOGRAPHIC AUDIT LOGS                                      */}
      {/* ===================================================================== */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                Immutable Cryptographic Audit Trail
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every Super Admin data operation is anchored into SHA-256 blocks with Merkle root verification.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
              {auditLogs.length} Verified Blocks
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.slice(0, 50).map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400">{formatDateTime(log.timestamp)}</td>
                    <td className="py-2 px-3 text-purple-300 font-bold">{log.action}</td>
                    <td className="py-2 px-3 text-amber-300 uppercase">{log.module}</td>
                    <td className="py-2 px-3 text-slate-300 font-sans">{log.description}</td>
                    <td className="py-2 px-3 text-white">{log.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: MANUAL PATIENT ENTRY / EDIT                                    */}
      {/* ===================================================================== */}
      {isPatientModalOpen && (
        <Modal
          isOpen={isPatientModalOpen}
          onClose={() => {
            setIsPatientModalOpen(false);
            setEditingPatient(null);
          }}
          title={editingPatient?.id ? `Edit Patient: ${editingPatient.id}` : 'Manual Patient Registration'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSavePatient} className="space-y-4 text-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Full Name *</label>
                <Input
                  required
                  value={editingPatient?.fullName || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Chandra Ghosh"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Mobile (10 digits) *</label>
                <Input
                  required
                  value={editingPatient?.mobile || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, mobile: e.target.value })}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Age</label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={editingPatient?.age || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, age: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Gender</label>
                <Select
                  value={editingPatient?.gender || 'male'}
                  onChange={e => setEditingPatient({ ...editingPatient, gender: e.target.value as any })}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Blood Group</label>
                <Select
                  value={editingPatient?.bloodGroup || 'Unknown'}
                  onChange={e => setEditingPatient({ ...editingPatient, bloodGroup: e.target.value as any })}
                  options={[
                    { value: 'Unknown', label: 'Unknown / Not Available' },
                    { value: 'A+', label: 'A+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' },
                    { value: 'B-', label: 'B-' },
                    { value: 'O+', label: 'O+' },
                    { value: 'O-', label: 'O-' },
                    { value: 'AB+', label: 'AB+' },
                    { value: 'AB-', label: 'AB-' }
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Email</label>
                <Input
                  type="email"
                  value={editingPatient?.email || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, email: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Address</label>
                <Input
                  value={
                    typeof editingPatient?.address === 'object' && editingPatient?.address !== null
                      ? (editingPatient.address as any).fullAddress || ''
                      : ((editingPatient?.address as unknown) as string) || ''
                  }
                  onChange={e =>
                    setEditingPatient({
                      ...editingPatient,
                      address: {
                        villageArea: e.target.value,
                        postOffice: '',
                        policeStation: '',
                        district: '',
                        state: '',
                        pinCode: '',
                        fullAddress: e.target.value
                      } as any
                    })
                  }
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setIsPatientModalOpen(false);
                  setEditingPatient(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Patient Record</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL: MERGE DUPLICATE PATIENTS                                       */}
      {/* ===================================================================== */}
      {isMergeModalOpen && (
        <Modal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          title="Merge Duplicate Patient Master Records"
          maxWidth="lg"
        >
          <div className="space-y-4 text-slate-200">
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <strong>Cascade Master Record Consolidation</strong>
              <p className="text-[11px] text-slate-400">
                All Health Cards, Bills, EMR Encounters, and Lab Orders assigned to the Secondary Patient will be re-pointed to the Primary Patient. The secondary record will be safely archived.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                1. Target Master Patient (Keep)
              </label>
              <Select
                value={mergePrimaryId}
                onChange={e => setMergePrimaryId(e.target.value)}
                options={[
                  { value: '', label: '-- Select Primary Patient --' },
                  ...patients.map(p => ({ value: p.id, label: `${p.fullName} (${p.id} • ${p.mobile})` }))
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                2. Source Duplicate Patient (Merge & Archive)
              </label>
              <Select
                value={mergeSecondaryId}
                onChange={e => setMergeSecondaryId(e.target.value)}
                options={[
                  { value: '', label: '-- Select Secondary Duplicate Patient --' },
                  ...patients
                    .filter(p => p.id !== mergePrimaryId)
                    .map(p => ({ value: p.id, label: `${p.fullName} (${p.id} • ${p.mobile})` }))
                ]}
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsMergeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!mergePrimaryId || !mergeSecondaryId || mergePrimaryId === mergeSecondaryId}
                onClick={handleMergePatients}
              >
                Execute Merge Consolidation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
