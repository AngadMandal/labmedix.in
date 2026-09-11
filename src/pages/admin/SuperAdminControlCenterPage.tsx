import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { StorageService, STORAGE_KEYS } from '../../services/storage';
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
import { BackupService } from '../../services/backupService';
import { FirestoreBackupService } from '../../services/firestoreBackupService';
import { AuditService } from '../../services/auditService';
import { useFirestoreLiveData } from '../../hooks/useFirestoreLiveData';
import { FirestoreConnectionStatus } from '../../components/common/FirestoreConnectionStatus';
import {
  Patient,
  HealthCard,
  User,
  MedicineMasterItem,
  PatientBill,
  CentralTransaction,
  AuditLog,
  CompanyProfile,
  BackupHistoryRecord,
  BackupSystemStatus,
  FirestoreCloudSnapshot
} from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  Crown,
  LayoutDashboard,
  Database,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  History,
  Sliders,
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
  Clock,
  ArrowRight,
  Zap,
  Tag,
  Check,
  X,
  Layers,
  Sparkles,
  Server,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Flame,
  FileSpreadsheet,
  Lock,
  Building,
  RotateCcw,
  CheckCircle
} from 'lucide-react';

export type SuperAdminSection =
  | 'dashboard'
  | 'master_data'
  | 'import_export'
  | 'data_quality'
  | 'backup_recovery'
  | 'security_permissions'
  | 'audit_logs'
  | 'system_config';

type ControlMasterDataCategory =
  | 'patients'
  | 'cards'
  | 'medicines'
  | 'tests'
  | 'doctors'
  | 'billing'
  | 'transactions';

export const SuperAdminControlCenterPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { companyProfile, updateCompanyProfile } = useSettings();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─────────────────────────────────────────────────────────────
  // 1. ROUTING & TAB SYNCHRONIZATION
  // ─────────────────────────────────────────────────────────────
  const initialTab = useMemo<SuperAdminSection>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'backup' || tabParam === 'backup_restore' || tabParam === 'backup_recovery') return 'backup_recovery';
    if (tabParam === 'activity' || tabParam === 'audit_logs' || tabParam === 'audit') return 'audit_logs';
    if (tabParam === 'manual_data' || tabParam === 'master_data') return 'master_data';
    if (tabParam === 'import' || tabParam === 'export' || tabParam === 'import_export') return 'import_export';
    if (tabParam === 'data_quality' || tabParam === 'reconciliation' || tabParam === 'demo_purge') return 'data_quality';
    if (tabParam === 'system_health' || tabParam === 'security' || tabParam === 'security_permissions') return 'security_permissions';
    if (tabParam === 'system_config' || tabParam === 'company_data' || tabParam === 'config') return 'system_config';
    return 'dashboard';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<SuperAdminSection>(initialTab);

  const handleTabChange = (tab: SuperAdminSection) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ─────────────────────────────────────────────────────────────
  // 2. FIRESTORE LIVE DATA HOOK (Zero Conflict Root Truth)
  // ─────────────────────────────────────────────────────────────
  const liveData = useFirestoreLiveData();

  // Master Data collections
  const [dataCategory, setDataCategory] = useState<ControlMasterDataCategory>('patients');
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [medicines, setMedicines] = useState<MedicineMasterItem[]>(() => PharmacyService.getMedicines());
  const [tests, setTests] = useState<LabTestItem[]>(() => StorageService.getItem<LabTestItem[]>(STORAGE_KEYS.LAB_TESTS, []));
  const [doctors, setDoctors] = useState<DoctorMasterItem[]>(() => StorageService.getItem<DoctorMasterItem[]>(STORAGE_KEYS.DOCTORS, []));
  const [bills, setBills] = useState<PatientBill[]>(() => StorageService.getItem<PatientBill[]>(STORAGE_KEYS.BILLS, []));
  const [transactions, setTransactions] = useState<CentralTransaction[]>(() => StorageService.getItem<CentralTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []));

  // Sync from liveData when updated from Firestore
  useEffect(() => {
    if (liveData.patients.length > 0) setPatients(liveData.patients);
    if (liveData.cards.length > 0) setCards(liveData.cards);
  }, [liveData.patients, liveData.cards]);

  // Master Data Modals
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState('');
  const [mergeSecondaryId, setMergeSecondaryId] = useState('');

  // Import / Export Hub State
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('import');
  const [importModule, setImportModule] = useState<MasterDataCategory>('patients');
  const [rawCsvContent, setRawCsvContent] = useState('');
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [exportDataset, setExportDataset] = useState('patients');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState('all');

  // Data Quality & Reconciliation State
  const [dqSubTab, setDqSubTab] = useState<'quality' | 'reconcile' | 'purge'>('quality');
  const [qualityIssues, setQualityIssues] = useState<DataQualityIssue[]>(() => SuperAdminService.scanDataQuality());
  const [reconcileAnomalies, setReconcileAnomalies] = useState<ReconciliationAnomaly[]>(() => SuperAdminService.reconcileTransactions());
  const [demoStats, setDemoStats] = useState(() => SuperAdminService.getDemoDataSummary());
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  // Backup & Recovery State
  const [backupStatus, setBackupStatus] = useState<BackupSystemStatus>(() => FirestoreBackupService.getBackupStatus());
  const [backupHistory, setBackupHistory] = useState<BackupHistoryRecord[]>(() => FirestoreBackupService.getBackupHistory());
  const [cloudSnapshots, setCloudSnapshots] = useState<FirestoreCloudSnapshot[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupLabelInput, setBackupLabelInput] = useState('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPullingCloud, setIsPullingCloud] = useState(false);

  // Security & Permissions State
  const [healthChecks, setHealthChecks] = useState<SystemHealthCheckItem[]>(() => SuperAdminService.runSystemHealthCheck());
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);

  // Audit Logs State
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [chainIntegrityResult, setChainIntegrityResult] = useState<any>(null);

  // System Configuration State
  const [systemConfig, setSystemConfig] = useState<SystemConfigurationSettings>(() => SuperAdminService.getSystemConfig());
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(companyProfile);

  useEffect(() => {
    setCompanyForm(companyProfile);
  }, [companyProfile]);

  // Refresh all local & cached data
  const refreshAllData = () => {
    setPatients(StorageService.getPatients());
    setCards(StorageService.getCards());
    setMedicines(PharmacyService.getMedicines());
    setTests(StorageService.getItem<LabTestItem[]>(STORAGE_KEYS.LAB_TESTS, []));
    setDoctors(StorageService.getItem<DoctorMasterItem[]>(STORAGE_KEYS.DOCTORS, []));
    setBills(StorageService.getItem<PatientBill[]>(STORAGE_KEYS.BILLS, []));
    setTransactions(StorageService.getItem<CentralTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []));
    setDemoStats(SuperAdminService.getDemoDataSummary());
    setQualityIssues(SuperAdminService.scanDataQuality());
    setReconcileAnomalies(SuperAdminService.reconcileTransactions());
    setHealthChecks(SuperAdminService.runSystemHealthCheck());
    setBackupStatus(FirestoreBackupService.getBackupStatus());
    setBackupHistory(FirestoreBackupService.getBackupHistory());
    liveData.refresh();
    showToast('info', 'Control Center Synced', 'Refreshed all master collections and real-time state.');
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: MASTER DATA
  // ─────────────────────────────────────────────────────────────
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
      showToast('success', isNew ? 'Patient Created' : 'Patient Updated', `Successfully saved record for ${saved.fullName} (${saved.id}).`);
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

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: IMPORT / EXPORT
  // ─────────────────────────────────────────────────────────────
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
        showToast('info', 'File Validated', `Parsed ${result.totalRows} rows: ${result.validRows.length} valid, ${result.duplicateRows.length} duplicates, ${result.invalidRows.length} invalid.`);
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
      showToast('success', 'Export Successful', `Exported ${exportDataset} dataset.`);
    } catch (err: any) {
      showToast('error', 'Export Failed', err.message || 'Could not export dataset.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: DATA QUALITY & RECONCILIATION & SAFE PURGE
  // ─────────────────────────────────────────────────────────────
  const handleExecutePurge = async () => {
    if (confirmationInput !== 'PURGE-DEMO-DATA-2026') {
      showToast('error', 'Confirmation Mismatch', 'You must type "PURGE-DEMO-DATA-2026" exactly.');
      return;
    }
    try {
      setIsPurging(true);
      const result = await SuperAdminService.executeSafeDemoDataPurge(
        confirmationInput,
        currentUser?.fullName || 'Super Admin'
      );
      setPurgeResult(result.message);
      refreshAllData();
      setConfirmationInput('');
      showToast('success', 'Purge Executed', result.message);
    } catch (err: any) {
      showToast('error', 'Purge Failed', err.message || 'Could not purge demo data.');
    } finally {
      setIsPurging(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: BACKUP & RECOVERY (Root Sovereign)
  // ─────────────────────────────────────────────────────────────
  const handleCreateManualBackup = async () => {
    try {
      setIsCreatingBackup(true);
      const label = backupLabelInput.trim() || `Manual Backup — ${new Date().toLocaleString('en-IN')}`;
      setIsBackupModalOpen(false);
      setBackupLabelInput('');

      showToast('info', 'Backup Initiated', 'Capturing full system state and uploading to Cloud Firestore...');
      const record = await FirestoreBackupService.createManualBackup(label, currentUser?.fullName || 'Super Admin');

      setBackupHistory(FirestoreBackupService.getBackupHistory());
      setBackupStatus(FirestoreBackupService.getBackupStatus());

      if (record.status === 'successful') {
        showToast('success', 'Backup Successful', `Created backup "${record.label}" with ${record.recordCount || 0} records.`);
      } else {
        showToast('error', 'Backup Failed', record.failureReason || 'Backup could not complete.');
      }
    } catch (err: any) {
      showToast('error', 'Backup Error', err?.message || 'Failed to trigger backup.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleVerifyBackup = async (backupId: string) => {
    showToast('info', 'Verifying Integrity', 'Running cryptographic SHA-256 integrity check...');
    const result = await FirestoreBackupService.verifyBackupIntegrity(backupId);
    setBackupHistory(FirestoreBackupService.getBackupHistory());
    if (result.verified) {
      showToast('success', 'Backup Verified', result.details);
    } else {
      showToast('error', 'Verification Failed', result.details);
    }
  };

  const handlePullFromFirestoreCloud = async () => {
    try {
      setIsPullingCloud(true);
      showToast('info', 'Cloud Sync Initiated', 'Pulling all collections from Firestore Cloud to local cache...');
      const res = await FirestoreBackupService.pullAllFromFirestore();
      if (res.success) {
        refreshAllData();
        showToast('success', 'Zero-Loss Pull Complete', `Successfully pulled and cached ${res.pulledCount} cloud records.`);
      } else {
        showToast('error', 'Pull Failed', res.error || 'Could not pull data from Firestore.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Cloud pull failed.');
    } finally {
      setIsPullingCloud(false);
    }
  };

  const handleDownloadBackupJson = () => {
    try {
      BackupService.exportBackupJson();
      showToast('success', 'Download Complete', 'Standard JSON backup file saved to downloads.');
    } catch (err: any) {
      showToast('error', 'Download Failed', err?.message || 'Export failed.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: AUDIT LOG CHAIN INTEGRITY
  // ─────────────────────────────────────────────────────────────
  const handleVerifyAuditChain = () => {
    const res = AuditService.verifyChainIntegrity();
    setChainIntegrityResult(res);
    if (res.verified) {
      showToast('success', 'Blockchain Integrity Verified', `All ${res.totalBlocks} blocks cryptographically valid.`);
    } else {
      showToast('error', 'Integrity Alert', `Found ${res.corruptedBlocks} corrupted blocks in audit ledger!`);
    }
  };

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    const logs = liveData.auditLogs.length > 0 ? liveData.auditLogs : StorageService.getAuditLogs();
    return logs.filter(l => {
      const matchMod = auditModuleFilter === 'all' || l.module === auditModuleFilter;
      const matchSev = auditSeverityFilter === 'all' || l.severity === auditSeverityFilter;
      const q = auditSearchQuery.toLowerCase();
      const matchQ = !q ||
        l.action.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        (l.hash && l.hash.toLowerCase().includes(q));
      return matchMod && matchSev && matchQ;
    });
  }, [liveData.auditLogs, auditModuleFilter, auditSeverityFilter, auditSearchQuery]);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      updateCompanyProfile(companyForm);
      AuditService.log('COMPANY_PROFILE_UPDATED', 'settings', 'Super Admin updated company details.');
      showToast('success', 'Company Profile Updated', 'Hospital profile and branding saved.');
    } catch (err: any) {
      showToast('error', 'Save Failed', err?.message || 'Failed to save company profile.');
    }
  };

  const handleSaveConfig = () => {
    try {
      setIsSavingConfig(true);
      SuperAdminService.saveSystemConfig(systemConfig, currentUser?.fullName || 'Super Admin');
      showToast('success', 'Settings Saved', 'System configuration parameters updated.');
    } catch (err: any) {
      showToast('error', 'Failed', err?.message || 'Could not save configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8 ROOT SOVEREIGN NAVIGATION TABS
  // ─────────────────────────────────────────────────────────────
  const navTabs: { key: SuperAdminSection; label: string; icon: React.FC<any>; count?: number }[] = [
    { key: 'dashboard', label: 'Central Dashboard', icon: LayoutDashboard },
    { key: 'master_data', label: 'Master Data', icon: Database, count: liveData.patientCount + liveData.cardCount },
    { key: 'import_export', label: 'Import / Export', icon: ArrowUpDown },
    { key: 'data_quality', label: 'Data Quality & Reconcile', icon: CheckCircle2, count: qualityIssues.length + reconcileAnomalies.length },
    { key: 'backup_recovery', label: 'Backup & Recovery', icon: HardDrive },
    { key: 'security_permissions', label: 'Security & Permissions', icon: ShieldCheck },
    { key: 'audit_logs', label: 'Audit Logs', icon: History, count: liveData.auditLogCount },
    { key: 'system_config', label: 'System Configuration', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── HEADER BANNER ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/30">
            <Crown className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Super Admin Control Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                ROOT SOVEREIGN
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Single central authority layer — One Authenticated Source → Cloud Firestore → Live Multi-Device Sync
            </p>
          </div>
        </div>

        {/* Status Indicators & Master Actions */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <FirestoreConnectionStatus />
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Sync All
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBackupModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-md shadow-indigo-600/30"
          >
            <HardDrive className="w-3.5 h-3.5 mr-1.5" />
            Instant Backup
          </Button>
        </div>
      </div>

      {/* ── CLEAN 8-SECTION TAB NAVIGATION BAR ───────────────────────── */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-indigo-900/80 text-indigo-200' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT AREA ─────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* ════════════════════════════════════════════════════════════════
            TAB 1: CENTRAL DASHBOARD
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Live Firestore Vitals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Patients in Firestore</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">{liveData.patientCount}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Real-time synced from cloud
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Health Cards Issued</span>
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">{liveData.cardCount}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live QR & Card Registry
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Audit Trail Blocks</span>
                  <History className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">{liveData.auditLogCount}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-purple-400 mt-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SHA-256 Ledger Verified
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Active Staff Accounts</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white">{liveData.userCount}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                  <span>Role Based Access Control</span>
                </div>
              </div>
            </div>

            {/* Cloud Firestore & Backup Health Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sovereign Cloud Vitals */}
              <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Central Firestore Synchronizer</h3>
                      <p className="text-xs text-slate-400">Zero duplicate paths — all devices sync here</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      liveData.connectionState === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {liveData.connectionState.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Last Sync Check</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {liveData.lastSyncTime ? new Date(liveData.lastSyncTime).toLocaleTimeString('en-IN') : 'Continuous'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Offline Fallback Engine</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> IndexedDB WAL Active
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePullFromFirestoreCloud}
                    disabled={isPullingCloud}
                    className="flex-1 text-xs border-slate-700 hover:bg-slate-800"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isPullingCloud ? 'animate-spin' : ''}`} />
                    Pull Cloud to Local Cache
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTabChange('backup_recovery')}
                    className="flex-1 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                  >
                    <HardDrive className="w-3.5 h-3.5 mr-1.5" />
                    Manage Backups
                  </Button>
                </div>
              </div>

              {/* Master Backup Status Card */}
              <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Automated Backup Engine</h3>
                      <p className="text-xs text-slate-400">Continuous snapshots with cryptographic checksums</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      backupStatus.health === 'good'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {backupStatus.health.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Last Successful Backup</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {backupStatus.lastSuccessfulBackup
                        ? new Date(backupStatus.lastSuccessfulBackup).toLocaleString('en-IN')
                        : 'None yet'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Next Scheduled Run</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {new Date(backupStatus.nextScheduledBackup).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsBackupModalOpen(true)}
                    disabled={isCreatingBackup}
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create Backup Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadBackupJson}
                    className="text-xs border-slate-700 hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download JSON
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Navigation Directives */}
            <div className="p-6 rounded-3xl bg-slate-950/40 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Operational Control Directives</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Master Data', key: 'master_data', icon: Database, color: 'text-blue-400', desc: 'Patients, Cards, Bills' },
                  { label: 'Bulk Import/Export', key: 'import_export', icon: ArrowUpDown, color: 'text-indigo-400', desc: 'CSV & Excel ETL' },
                  { label: 'Data Quality', key: 'data_quality', icon: CheckCircle2, color: 'text-emerald-400', desc: 'Audit & Safe Purge' },
                  { label: 'Cloud Backups', key: 'backup_recovery', icon: HardDrive, color: 'text-cyan-400', desc: 'Snapshots & Rollbacks' },
                  { label: 'Security & RBAC', key: 'security_permissions', icon: ShieldCheck, color: 'text-amber-400', desc: 'Diagnostics & Vitals' },
                  { label: 'Audit Ledger', key: 'audit_logs', icon: History, color: 'text-purple-400', desc: 'SHA-256 Merkle Root' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleTabChange(item.key as SuperAdminSection)}
                      className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
                    >
                      <Icon className={`w-5 h-5 ${item.color} mb-2 group-hover:scale-110 transition-transform`} />
                      <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: MASTER DATA MANAGEMENT
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'master_data' && (
          <div className="space-y-6">
            {/* Category Selector Bar & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex overflow-x-auto gap-2 scrollbar-none">
                {[
                  { id: 'patients', label: 'Patients', count: patients.length },
                  { id: 'cards', label: 'Health Cards', count: cards.length },
                  { id: 'medicines', label: 'Pharmacy Drugs', count: medicines.length },
                  { id: 'tests', label: 'Lab Tests', count: tests.length },
                  { id: 'doctors', label: 'Doctors Master', count: doctors.length },
                  { id: 'billing', label: 'Invoices', count: bills.length },
                  { id: 'transactions', label: 'Ledger Txns', count: transactions.length },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setDataCategory(cat.id as ControlMasterDataCategory)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      dataCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label} ({cat.count})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search records..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {dataCategory === 'patients' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsMergeModalOpen(true)}
                      className="text-xs border-indigo-500/40 text-indigo-300"
                    >
                      <GitMerge className="w-3.5 h-3.5 mr-1" />
                      Merge
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setEditingPatient({});
                        setIsPatientModalOpen(true);
                      }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Patient
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Master Data Table */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    {dataCategory === 'patients' && (
                      <tr>
                        <th className="p-3">UHID</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Mobile Phone</th>
                        <th className="p-3">Age / Gender</th>
                        <th className="p-3">Registered</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    )}
                    {dataCategory === 'cards' && (
                      <tr>
                        <th className="p-3">Card Number</th>
                        <th className="p-3">Patient ID</th>
                        <th className="p-3">Tier</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    )}
                    {dataCategory === 'medicines' && (
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Drug Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">MRP (₹)</th>
                        <th className="p-3">Selling Price</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    )}
                    {dataCategory === 'tests' && (
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Test Title</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">MRP (₹)</th>
                        <th className="p-3">TAT Hours</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    )}
                    {dataCategory === 'doctors' && (
                      <tr>
                        <th className="p-3">Doctor Name</th>
                        <th className="p-3">Speciality</th>
                        <th className="p-3">Reg. Number</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-right">Consultation Fee</th>
                      </tr>
                    )}
                    {dataCategory === 'billing' && (
                      <tr>
                        <th className="p-3">Bill Number</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Net Payable</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    )}
                    {dataCategory === 'transactions' && (
                      <tr>
                        <th className="p-3">Txn ID</th>
                        <th className="p-3">Module</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3 text-right">Payment Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {dataCategory === 'patients' &&
                      patients
                        .filter(p => !searchQuery || p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.mobile?.includes(searchQuery))
                        .slice(0, 100)
                        .map(p => (
                          <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3 font-mono text-indigo-300 font-bold">{p.id}</td>
                            <td className="p-3 text-white font-bold">{p.fullName}</td>
                            <td className="p-3 font-mono">{p.mobile}</td>
                            <td className="p-3">{p.age}y / {p.gender}</td>
                            <td className="p-3 text-slate-400">{formatDate(p.createdAt || '')}</td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPatient(p);
                                  setIsPatientModalOpen(true);
                                }}
                                className="text-xs text-indigo-400 hover:text-white"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                    {dataCategory === 'cards' &&
                      cards
                        .filter(c => !searchQuery || c.cardNumber?.includes(searchQuery))
                        .slice(0, 100)
                        .map(c => (
                          <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3 font-mono text-emerald-300 font-bold">{c.cardNumber}</td>
                            <td className="p-3 font-mono text-slate-300">{c.patientId}</td>
                            <td className="p-3 capitalize">{c.tier || 'Standard'}</td>
                            <td className="p-3 font-mono text-slate-400">{c.expiryDate}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  c.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {c.status === 'active' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateCardStatus(c.id, 'suspended')}
                                  className="text-xs text-amber-400 hover:text-white"
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateCardStatus(c.id, 'active')}
                                  className="text-xs text-emerald-400 hover:text-white"
                                >
                                  Activate
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}

                    {dataCategory === 'medicines' &&
                      medicines.slice(0, 100).map(m => (
                        <tr key={m.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-mono text-indigo-300">{m.code}</td>
                          <td className="p-3 font-bold text-white">{m.name}</td>
                          <td className="p-3 text-slate-400">{m.category}</td>
                          <td className="p-3 font-mono">{formatCurrency(m.mrp)}</td>
                          <td className="p-3 font-mono text-emerald-400">{formatCurrency(m.sellingPrice)}</td>
                          <td className="p-3 text-right">
                            <span className="text-emerald-400 text-xs">Active</span>
                          </td>
                        </tr>
                      ))}

                    {dataCategory === 'tests' &&
                      tests.slice(0, 100).map(t => (
                        <tr key={t.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-mono text-indigo-300">{t.code}</td>
                          <td className="p-3 font-bold text-white">{t.name}</td>
                          <td className="p-3 text-slate-400">{t.department}</td>
                          <td className="p-3 font-mono">{formatCurrency(t.mrp)}</td>
                          <td className="p-3 text-slate-400">{t.tatHours} hrs</td>
                          <td className="p-3 text-right">
                            <span className="text-emerald-400 text-xs">Active</span>
                          </td>
                        </tr>
                      ))}

                    {dataCategory === 'doctors' &&
                      doctors.slice(0, 100).map(d => (
                        <tr key={d.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-bold text-white">{d.name}</td>
                          <td className="p-3 text-indigo-300">{d.speciality}</td>
                          <td className="p-3 font-mono text-slate-400">{d.regNumber || 'N/A'}</td>
                          <td className="p-3 font-mono">{d.phone}</td>
                          <td className="p-3 text-right font-mono font-bold text-white">{formatCurrency(d.standardFee || 0)}</td>
                        </tr>
                      ))}

                    {dataCategory === 'billing' &&
                      bills.slice(0, 100).map(b => (
                        <tr key={b.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-mono text-indigo-300">{b.billNumber || b.id}</td>
                          <td className="p-3 font-bold text-white">{b.patientName}</td>
                          <td className="p-3 text-slate-400">{formatDate(b.createdAt)}</td>
                          <td className="p-3 font-mono font-bold text-white">{formatCurrency(b.netPayable)}</td>
                          <td className="p-3 uppercase text-[10px] font-bold text-slate-300">{b.paymentMethod}</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                              {b.paymentStatus || 'PAID'}
                            </span>
                          </td>
                        </tr>
                      ))}

                    {dataCategory === 'transactions' &&
                      transactions.slice(0, 100).map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-mono text-indigo-300">{tx.id}</td>
                          <td className="p-3 capitalize">{tx.module}</td>
                          <td className="p-3 text-slate-400">{formatDateTime(tx.createdAt)}</td>
                          <td className="p-3 font-mono font-bold text-white">{formatCurrency(tx.amount)}</td>
                          <td className="p-3 text-right text-emerald-400 text-xs font-bold uppercase">{tx.paymentStatus}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3: IMPORT / EXPORT HUB (Consolidated)
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'import_export' && (
          <div className="space-y-6">
            {/* Toggle Mode */}
            <div className="flex gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 w-fit">
              <button
                onClick={() => setImportExportMode('import')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  importExportMode === 'import' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                Bulk Data Importer
              </button>
              <button
                onClick={() => setImportExportMode('export')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  importExportMode === 'export' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Download className="w-4 h-4" />
                Central Data Exporter
              </button>
            </div>

            {importExportMode === 'import' ? (
              <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Bulk Data CSV/Excel Importer</h3>
                    <p className="text-xs text-slate-400">Validate data against business schema before committing to Firestore</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={importModule}
                      onChange={e => {
                        setImportModule(e.target.value as MasterDataCategory);
                        setValidationResult(null);
                        setRawCsvContent('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="patients">Patients</option>
                      <option value="cards">Health Cards</option>
                      <option value="medicines">Pharmacy Drugs</option>
                      <option value="tests">Lab Tests</option>
                      <option value="doctors">Doctors Master</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs border-slate-700">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Get CSV Template
                    </Button>
                  </div>
                </div>

                {/* Upload Drag/Drop Zone */}
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 text-center space-y-3 transition-colors">
                  <Upload className="w-10 h-10 text-indigo-400 mx-auto" />
                  <div className="text-sm font-bold text-white">Upload CSV File for {importModule.toUpperCase()}</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    UTF-8 CSV format with standard headers. Duplicate detection and schema validation execute before commit.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white cursor-pointer transition-colors shadow-md">
                    <Upload className="w-3.5 h-3.5" />
                    Browse CSV File
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Validation Preview & Commit */}
                {validationResult && (
                  <div className="space-y-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                          Valid: {validationResult.validRows.length}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold">
                          Duplicates: {validationResult.duplicateRows.length}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold">
                          Invalid: {validationResult.invalidRows.length}
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleCommitImport}
                        disabled={isImporting || validationResult.validRows.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        {isImporting ? 'Committing...' : `Commit ${validationResult.validRows.length} Valid Records`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Export Module */
              <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">Central Data Exporter</h3>
                  <p className="text-xs text-slate-400">Export master records with cryptographic HMAC signature</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Dataset to Export</label>
                    <select
                      value={exportDataset}
                      onChange={e => setExportDataset(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    >
                      <option value="patients">Patients Directory</option>
                      <option value="cards">Health Cards</option>
                      <option value="medicines">Pharmacy Inventory</option>
                      <option value="tests">Lab Test Catalog</option>
                      <option value="doctors">Doctors Master</option>
                      <option value="bills">Patient Invoices</option>
                      <option value="transactions">Ledger Transactions</option>
                      <option value="audit_logs">Audit Trail Ledger</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Start Date (Optional)</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">End Date (Optional)</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                <Button variant="primary" onClick={handleExportData} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  <Download className="w-4 h-4 mr-2" />
                  Generate and Download CSV Export
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 4: DATA QUALITY & RECONCILIATION & SAFE PURGE (Merged)
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'data_quality' && (
          <div className="space-y-6">
            {/* Sub-tab navigation */}
            <div className="flex gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 w-fit">
              <button
                onClick={() => setDqSubTab('quality')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dqSubTab === 'quality' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Data Quality Scanner ({qualityIssues.length})
              </button>
              <button
                onClick={() => setDqSubTab('reconcile')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dqSubTab === 'reconcile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Financial Reconciliation ({reconcileAnomalies.length})
              </button>
              <button
                onClick={() => setDqSubTab('purge')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dqSubTab === 'purge' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Demo Safe Purge ({demoStats.totalDemoItems})
              </button>
            </div>

            {dqSubTab === 'quality' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Scans all collections for orphaned cards, invalid phone formats, and missing mandatory patient fields.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQualityIssues(SuperAdminService.scanDataQuality());
                      showToast('info', 'Scanned', 'Completed live data quality scan.');
                    }}
                    className="text-xs border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Rescan Quality
                  </Button>
                </div>

                {qualityIssues.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">100% Clean Data Integrity</h4>
                    <p className="text-xs text-emerald-300">No orphaned records, corrupted cards, or schema violations found.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {qualityIssues.map(issue => (
                      <div key={issue.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{issue.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300">
                              {issue.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
                          <span className="text-[10px] text-slate-500 font-mono">Entity: {issue.entityName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dqSubTab === 'reconcile' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Compares invoice totals against central ledger transactions to flag revenue discrepancies.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReconcileAnomalies(SuperAdminService.reconcileTransactions());
                      showToast('info', 'Reconciled', 'Financial audit scan finished.');
                    }}
                    className="text-xs border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-check Ledger
                  </Button>
                </div>

                {reconcileAnomalies.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">Ledger Fully Balanced</h4>
                    <p className="text-xs text-emerald-300">All invoices match ledger credits. Zero financial drift detected.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reconcileAnomalies.map(anom => (
                      <div key={anom.id} className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-rose-300">{anom.type.toUpperCase()}: {anom.referenceId}</div>
                          <p className="text-xs text-slate-300 mt-1">{anom.description}</p>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Discrepancy: <span className="font-mono text-white font-bold">{formatCurrency(anom.difference || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dqSubTab === 'purge' && (
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-rose-500/40 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Demo Data Safe Purge & Reset</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Wipes all sample demo patients, fictitious cards, mock prescriptions, and simulated billing tests. Real registered patients and verified cards are safely preserved.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Demo Patients</span>
                    <span className="text-lg font-black text-rose-400">{demoStats.patientsCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Demo Cards</span>
                    <span className="text-lg font-black text-rose-400">{demoStats.cardsCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Demo Invoices</span>
                    <span className="text-lg font-black text-rose-400">{demoStats.billsCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Total Demo Records</span>
                    <span className="text-lg font-black text-rose-400">{demoStats.totalDemoItems}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
                  <div className="text-xs font-bold text-rose-200">
                    Type <code className="bg-rose-950 px-2 py-0.5 rounded text-rose-400 font-mono">PURGE-DEMO-DATA-2026</code> to unlock:
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={confirmationInput}
                      onChange={e => setConfirmationInput(e.target.value)}
                      placeholder="PURGE-DEMO-DATA-2026"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-rose-500/40 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono"
                    />
                    <Button
                      variant="primary"
                      onClick={handleExecutePurge}
                      disabled={isPurging || confirmationInput !== 'PURGE-DEMO-DATA-2026'}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs disabled:opacity-40"
                    >
                      <Flame className="w-3.5 h-3.5 mr-1" />
                      {isPurging ? 'Purging...' : 'Execute Purge'}
                    </Button>
                  </div>
                </div>

                {purgeResult && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs">
                    {purgeResult}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 5: BACKUP & RECOVERY (Root Sovereign Central System)
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'backup_recovery' && (
          <div className="space-y-6">
            {/* Master Control Bar */}
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Central Sovereign Backup & Recovery</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Unified Cloud Firestore Snapshots, Checksum Verification & Zero-Loss Rollback Engine
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePullFromFirestoreCloud}
                  disabled={isPullingCloud}
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                >
                  <Cloud className="w-3.5 h-3.5 mr-1.5" />
                  Zero-Loss Cloud Pull
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBackupModalOpen(true)}
                  disabled={isCreatingBackup}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shadow-md shadow-emerald-600/30"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Backup Now
                </Button>
              </div>
            </div>

            {/* Backup History Table */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Backup History & Snapshots</h4>
                <span className="text-xs text-slate-400">{backupHistory.length} total checkpoints</span>
              </div>

              {backupHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No backups recorded yet. Click "Create Backup Now" to capture the initial sovereign checkpoint.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Backup ID & Label</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Records</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Integrity Check</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                      {backupHistory.map(b => (
                        <tr key={b.id} className="hover:bg-slate-900/40">
                          <td className="p-3">
                            <div className="font-bold text-white">{b.label}</div>
                            <div className="font-mono text-[10px] text-indigo-400">{b.id}</div>
                          </td>
                          <td className="p-3 uppercase text-[10px] font-bold text-slate-400">{b.type}</td>
                          <td className="p-3 text-slate-400">{formatDateTime(b.createdAt)}</td>
                          <td className="p-3 font-mono font-bold text-white">{b.recordCount || 0}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                b.status === 'successful'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : b.status === 'processing'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                b.verificationStatus === 'verified'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {b.verificationStatus}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVerifyBackup(b.id)}
                              className="text-xs text-indigo-400 hover:text-white"
                              title="Verify Cryptographic Checksum"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              Verify
                            </Button>
                            {b.firestoreSnapshotId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (confirm(`Restore database from snapshot "${b.label}"? A pre-restore checkpoint will be created automatically.`)) {
                                    showToast('info', 'Restoring', 'Rolling back collections...');
                                    const res = await FirestoreBackupService.restoreCloudSnapshot(b.firestoreSnapshotId!);
                                    if (res.success) {
                                      refreshAllData();
                                      showToast('success', 'Restored', 'Database restored successfully.');
                                    } else {
                                      showToast('error', 'Restore Failed', res.message);
                                    }
                                  }
                                }}
                                className="text-xs text-amber-400 hover:text-white"
                                title="Rollback to this snapshot"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Restore
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 6: SECURITY & PERMISSIONS
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'security_permissions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Security Posture & System Vitals</h3>
                <p className="text-xs text-slate-400">Continuous hardware telemetry, encryption status & privilege audit</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsRunningHealthCheck(true);
                  setTimeout(() => {
                    setHealthChecks(SuperAdminService.runSystemHealthCheck());
                    setIsRunningHealthCheck(false);
                    showToast('success', 'Scan Complete', 'All diagnostic vitals scanned.');
                  }, 500);
                }}
                disabled={isRunningHealthCheck}
                className="text-xs border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRunningHealthCheck ? 'animate-spin' : ''}`} />
                Run Full Security Scan
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthChecks.map(check => (
                <div key={check.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      check.status === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : check.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{check.name}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          check.status === 'healthy'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 7: AUDIT LOGS (Cryptographic Blockchain Ledger)
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-6">
            {/* Audit Header & Blockchain Verification */}
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Cryptographic Immutable Audit Trail</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  SHA-256 Block Hashes, HMAC Signatures & Merkle Tree Root — Real-time Firestore Cloud Stream
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleVerifyAuditChain}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs shadow-md shadow-purple-600/30"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Verify Chain Integrity
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const csv = SuperAdminService.exportDatasetToCsv('audit_logs', {});
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `LabMedix_audit_ledger_${Date.now()}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                    showToast('success', 'Exported', 'Audit ledger exported to CSV.');
                  }}
                  className="text-xs border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export Ledger
                </Button>
              </div>
            </div>

            {/* Verification Result Alert */}
            {chainIntegrityResult && (
              <div
                className={`p-4 rounded-2xl border ${
                  chainIntegrityResult.verified
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                } space-y-1 text-xs`}
              >
                <div className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {chainIntegrityResult.verified ? 'Cryptographic Chain Integrity 100% Intact' : 'Integrity Tampering Detected'}
                </div>
                <div>{chainIntegrityResult.details}</div>
                <div className="font-mono text-[10px] text-slate-400 pt-1">
                  Merkle Root: {chainIntegrityResult.merkleRoot}
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 items-center p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
              <input
                type="text"
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                placeholder="Search action, user, hash..."
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 flex-1 min-w-[180px]"
              />
              <select
                value={auditModuleFilter}
                onChange={e => setAuditModuleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
              >
                <option value="all">All Modules</option>
                <option value="auth">Auth & Security</option>
                <option value="patient">Patients</option>
                <option value="card">Health Cards</option>
                <option value="billing">Billing & Finance</option>
                <option value="backup">Backups</option>
                <option value="admin">System Admin</option>
              </select>
              <select
                value={auditSeverityFilter}
                onChange={e => setAuditSeverityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="financial">Financial</option>
                <option value="security">Security</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Audit Table */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Block #</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Cryptographic Hash</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {filteredAuditLogs.slice(0, 100).map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono text-purple-400 font-bold">#{log.index || 0}</td>
                        <td className="p-3 font-bold text-white">{log.action}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-slate-400">{log.module}</td>
                        <td className="p-3 text-slate-300">{log.userName}</td>
                        <td className="p-3 text-slate-400">{formatDateTime(log.timestamp)}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={log.hash}>
                          {log.hash || 'GENESIS'}
                        </td>
                        <td className="p-3 text-slate-300 max-w-xs truncate" title={log.description}>
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 8: SYSTEM CONFIGURATION & COMPANY BRANDING (Merged)
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'system_config' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Profile Branding */}
              <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Hospital Branding & Identity</h3>
                    <p className="text-xs text-slate-400">Institutional details reflected on all cards and invoices</p>
                  </div>
                </div>

                <form onSubmit={handleSaveCompany} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Hospital / Clinic Name</label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Contact Phone</label>
                      <input
                        type="text"
                        value={companyForm.phone}
                        onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Contact Email</label>
                      <input
                        type="email"
                        value={companyForm.email}
                        onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Physical Address</label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                    Save Hospital Identity
                  </Button>
                </form>
              </div>

              {/* Global System Configuration */}
              <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Operational System Parameters</h3>
                    <p className="text-xs text-slate-400">Global prefixes, limits & maintenance directives</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Patient ID Prefix</label>
                      <input
                        type="text"
                        value={systemConfig.patientIdPrefix}
                        onChange={e => setSystemConfig({ ...systemConfig, patientIdPrefix: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Card No Prefix</label>
                      <input
                        type="text"
                        value={systemConfig.cardNoPrefix}
                        onChange={e => setSystemConfig({ ...systemConfig, cardNoPrefix: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Default Tax (%)</label>
                      <input
                        type="number"
                        value={systemConfig.defaultTaxPercent}
                        onChange={e => setSystemConfig({ ...systemConfig, defaultTaxPercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-bold">Max Family Members</label>
                      <input
                        type="number"
                        value={systemConfig.maxFamilyMembers}
                        onChange={e => setSystemConfig({ ...systemConfig, maxFamilyMembers: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <div className="font-bold text-white">Lockdown Operational Records</div>
                      <div className="text-[11px] text-slate-400">Restricts historical record modification</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemConfig.lockdownOperationalRecords}
                      onChange={e => setSystemConfig({ ...systemConfig, lockdownOperationalRecords: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600 rounded"
                    />
                  </div>
                  <Button
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    variant="primary"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                  >
                    Save Operational Parameters
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────── */}

      {/* Manual Backup Modal */}
      {isBackupModalOpen && (
        <Modal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          title="Create Instant Sovereign Backup"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Captures all patients, cards, memberships, invoices, doctors, and audit records into an immutable Cloud Firestore checkpoint.
            </p>
            <div>
              <label className="text-slate-400 block mb-1 font-bold">Backup Label / Note</label>
              <input
                type="text"
                value={backupLabelInput}
                onChange={e => setBackupLabelInput(e.target.value)}
                placeholder={`Manual Snapshot — ${new Date().toLocaleDateString('en-IN')}`}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsBackupModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateManualBackup}
                disabled={isCreatingBackup}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isCreatingBackup ? 'Creating...' : 'Trigger Backup'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Patient Add/Edit Modal */}
      {isPatientModalOpen && (
        <Modal
          isOpen={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          title={editingPatient?.id ? 'Edit Master Patient' : 'Add New Master Patient'}
        >
          <form onSubmit={handleSavePatient} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-bold">Full Name *</label>
              <input
                type="text"
                required
                value={editingPatient?.fullName || ''}
                onChange={e => setEditingPatient({ ...editingPatient, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={editingPatient?.mobile || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Gender</label>
                <select
                  value={editingPatient?.gender || 'male'}
                  onChange={e => setEditingPatient({ ...editingPatient, gender: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Age</label>
                <input
                  type="number"
                  value={editingPatient?.age || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, age: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Blood Group</label>
                <input
                  type="text"
                  value={editingPatient?.bloodGroup || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, bloodGroup: e.target.value })}
                  placeholder="e.g. O+"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setIsPatientModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Save Patient Record
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Patient Merge Modal */}
      {isMergeModalOpen && (
        <Modal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          title="Merge Duplicate Patients"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Select Primary Target (retained) and Secondary Source (merged & archived). Cards, prescriptions, and billing will be redirected to the Primary UHID.
            </p>
            <div>
              <label className="text-slate-400 block mb-1 font-bold">Primary Patient (Retained UHID)</label>
              <select
                value={mergePrimaryId}
                onChange={e => setMergePrimaryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
              >
                <option value="">-- Select Primary Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.id}) — {p.mobile}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-bold">Secondary Patient (Merged & Deactivated)</label>
              <select
                value={mergeSecondaryId}
                onChange={e => setMergeSecondaryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
              >
                <option value="">-- Select Secondary Patient --</option>
                {patients
                  .filter(p => p.id !== mergePrimaryId)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.id}) — {p.mobile}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsMergeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleMergePatients}
                disabled={!mergePrimaryId || !mergeSecondaryId}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Confirm Merge
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SuperAdminControlCenterPage;
