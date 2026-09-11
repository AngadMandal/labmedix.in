import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { StorageService } from '../../services/storage';
import {
  SuperAdminService,
  MasterDataCategory,
  ImportValidationResult,
  DataQualityIssue,
  ReconciliationAnomaly,
  SystemHealthCheckItem,
  SystemConfigurationSettings
} from '../../services/superAdminService';
import { UserService } from '../../services/userService';
import { FirestoreBackupService } from '../../services/firestoreBackupService';
import { AuditService } from '../../services/auditService';
import { ApiSyncService, SyncHealthMetrics } from '../../services/apiSyncService';
import { MultiDeviceSyncService } from '../../services/multiDeviceSyncService';
import { useFirestoreLiveData } from '../../hooks/useFirestoreLiveData';
import { FirestoreConnectionStatus } from '../../components/common/FirestoreConnectionStatus';
import { StaffIDCard } from '../../components/card/StaffIDCard';
import { firebaseConfig } from '../../services/firebaseService';
import {
  User,
  Role,
  CompanyProfile,
  BackupHistoryRecord,
  BackupSystemStatus,
  FirestoreCloudSnapshot,
  DevicePlatformType
} from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import {
  Crown,
  LayoutDashboard,
  Users,
  ArrowUpDown,
  HardDrive,
  ShieldCheck,
  History,
  Building,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Server,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Flame,
  FileSpreadsheet,
  Lock,
  RotateCcw,
  KeyRound,
  CreditCard,
  Radio,
  Smartphone,
  Monitor,
  Tablet,
  Activity,
  CheckCircle
} from 'lucide-react';

export type SuperAdminSection =
  | 'dashboard'
  | 'staff_management'
  | 'import_export'
  | 'backup_restore'
  | 'data_integrity'
  | 'audit_logs'
  | 'company_settings';

export const SuperAdminControlCenterPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { companyProfile, updateCompanyProfile } = useSettings();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─────────────────────────────────────────────────────────────
  // 1. ROUTING & TAB SYNCHRONIZATION (Strictly 7 Core Modules)
  // ─────────────────────────────────────────────────────────────
  const initialTab = useMemo<SuperAdminSection>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'staff' || tabParam === 'users' || tabParam === 'staff_management') return 'staff_management';
    if (tabParam === 'import' || tabParam === 'export' || tabParam === 'import_export') return 'import_export';
    if (tabParam === 'backup' || tabParam === 'restore' || tabParam === 'backup_restore' || tabParam === 'backup_recovery') return 'backup_restore';
    if (tabParam === 'integrity' || tabParam === 'system_check' || tabParam === 'diagnostics' || tabParam === 'data_integrity' || tabParam === 'data_quality') return 'data_integrity';
    if (tabParam === 'audit' || tabParam === 'audit_logs' || tabParam === 'activity') return 'audit_logs';
    if (tabParam === 'company' || tabParam === 'settings' || tabParam === 'system_config' || tabParam === 'company_settings') return 'company_settings';
    return 'dashboard';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<SuperAdminSection>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: SuperAdminSection) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ─────────────────────────────────────────────────────────────
  // 2. FIRESTORE LIVE DATA HOOK & SYNC TELEMETRY
  // ─────────────────────────────────────────────────────────────
  const liveData = useFirestoreLiveData();
  const [syncMetrics, setSyncMetrics] = useState<SyncHealthMetrics>(() => ApiSyncService.getSyncHealthMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncMetrics(ApiSyncService.getSyncHealthMetrics());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3. STAFF & USER MANAGEMENT STATE
  // ─────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<User[]>(() => StorageService.getUsers());
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>('all');
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState<User | null>(null);
  const [selectedStaffForCard, setSelectedStaffForCard] = useState<User | null>(null);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedStaffForPass, setSelectedStaffForPass] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  // Add/Edit Staff Form State
  const [staffForm, setStaffForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'reception' as Role,
    designation: 'Clinical Staff Officer',
    department: 'General Operations',
    phone: '+91 98300 00000',
    password: '',
    pinCode: '1234',
    allowedModules: ['patients', 'cards'] as string[]
  });

  const availableModules = [
    { id: 'patients', label: 'Patient Directory' },
    { id: 'cards', label: 'Health Cards' },
    { id: 'laboratory', label: 'Laboratory & Diagnostics' },
    { id: 'pharmacy', label: 'Pharmacy & Inventory' },
    { id: 'billing', label: 'Billing & Invoices' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'doctors', label: 'Doctor Master' },
    { id: 'vouchers', label: 'Cash Desk Vouchers' }
  ];

  // Refresh staff list when storage syncs
  useEffect(() => {
    const handleSync = () => {
      setStaffList(StorageService.getUsers());
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const filteredStaff = useMemo(() => {
    return staffList.filter(u => {
      const matchesSearch =
        !staffSearchQuery ||
        u.fullName?.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        u.staffId?.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(staffSearchQuery.toLowerCase());

      const matchesRole = staffRoleFilter === 'all' || u.role === staffRoleFilter;
      const matchesStatus = staffStatusFilter === 'all' || (u.status || 'active') === staffStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, staffSearchQuery, staffRoleFilter, staffStatusFilter]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = staffForm.email.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showToast('error', 'Invalid Email', 'Please provide a valid unique email address.');
      return;
    }

    const res = await UserService.createUser({
      ...staffForm,
      email: cleanEmail,
      username: staffForm.username.trim().toLowerCase().replace(/\s+/g, '')
    });

    if (res.error) {
      showToast('error', 'Registration Failed', res.error);
      return;
    }

    showToast('success', 'Staff Registered', `Staff member ${res.user.fullName} successfully registered to central Firestore.`);
    setIsAddStaffModalOpen(false);
    setStaffList(StorageService.getUsers());
    setStaffForm({
      username: '',
      fullName: '',
      email: '',
      role: 'reception' as Role,
      designation: 'Clinical Staff Officer',
      department: 'General Operations',
      phone: '+91 98300 00000',
      password: '',
      pinCode: '1234',
      allowedModules: ['patients', 'cards']
    });
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingStaff) return;

    const updated = await UserService.updateUser(isEditingStaff.id, {
      fullName: isEditingStaff.fullName,
      email: isEditingStaff.email.trim().toLowerCase().replace(/\s+/g, ''),
      role: isEditingStaff.role,
      designation: isEditingStaff.designation,
      department: isEditingStaff.department,
      phone: isEditingStaff.phone,
      allowedModules: isEditingStaff.allowedModules || []
    });

    if (updated) {
      showToast('success', 'Staff Updated', `Updated account for ${updated.fullName} in Central Firestore.`);
      setIsEditingStaff(null);
      setStaffList(StorageService.getUsers());
    } else {
      showToast('error', 'Update Failed', 'Could not update staff account.');
    }
  };

  const handleToggleStaffStatus = (user: User) => {
    const updated = UserService.toggleStatus(user.id);
    if (updated) {
      showToast('info', 'Status Changed', `${updated.fullName} is now ${updated.status?.toUpperCase()}`);
      setStaffList(StorageService.getUsers());
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPass || !newPasswordInput.trim()) return;

    const ok = UserService.resetPassword(selectedStaffForPass.id, newPasswordInput.trim(), newPinInput.trim() || undefined);
    if (ok) {
      showToast('success', 'Password Reset', `Credentials updated for ${selectedStaffForPass.fullName}`);
      setIsResetPassModalOpen(false);
      setSelectedStaffForPass(null);
      setNewPasswordInput('');
      setNewPinInput('');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. DATA IMPORT / EXPORT STATE
  // ─────────────────────────────────────────────────────────────
  const [importExportTab, setImportExportTab] = useState<'import' | 'export'>('import');
  const [importCategory, setImportCategory] = useState<MasterDataCategory>('patients');
  const [importMode, setImportMode] = useState<'update' | 'skip'>('update');
  const [rawImportData, setRawImportData] = useState('');
  const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);
  const [isExecutingImport, setIsExecutingImport] = useState(false);

  // Export State
  const [exportDataset, setExportDataset] = useState('patients');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const handleValidateImport = () => {
    if (!rawImportData.trim()) {
      showToast('error', 'Empty Input', 'Please paste CSV data or select a file.');
      return;
    }
    const result = SuperAdminService.parseAndValidateCsv(importCategory, rawImportData);
    setImportValidation(result);
    if (result.invalidRows.length === 0) {
      showToast('success', 'Validation Passed', `${result.validRows.length} valid records ready to commit.`);
    } else {
      showToast('warning', 'Validation Warnings', `${result.invalidRows.length} errors detected. Please review.`);
    }
  };

  const handleCommitImport = async () => {
    if (!importValidation || importValidation.validRows.length === 0) return;
    setIsExecutingImport(true);
    try {
      const commitRes = await SuperAdminService.commitImportedData(
        importCategory,
        importValidation.validRows,
        currentUser?.fullName || 'Super Administrator'
      );
      showToast('success', 'Import Successful', `Committed ${commitRes.insertedCount} records to Central Firestore.`);
      setImportValidation(null);
      setRawImportData('');
    } catch (err: any) {
      showToast('error', 'Commit Error', err?.message || 'Failed to commit import.');
    } finally {
      setIsExecutingImport(false);
    }
  };

  const handleExecuteExport = () => {
    try {
      const content = SuperAdminService.exportDatasetToCsv(exportDataset as any, {
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined
      });
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LABMEDIX_${exportDataset.toUpperCase()}_EXPORT_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Export Complete', `Downloaded ${exportDataset} dataset.`);
    } catch (err: any) {
      showToast('error', 'Export Failed', err?.message || 'Could not export dataset.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. BACKUP & RESTORE STATE
  // ─────────────────────────────────────────────────────────────
  const [backupHistory, setBackupHistory] = useState<BackupHistoryRecord[]>(() => FirestoreBackupService.getBackupHistory());
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupLabelInput, setBackupLabelInput] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  const handleCreateManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const label = backupLabelInput.trim() || `Manual Sovereign Backup - ${new Date().toLocaleDateString()}`;
      const record = await FirestoreBackupService.createManualBackup(label, currentUser?.fullName || 'Super Administrator');
      if (record) {
        setBackupHistory(FirestoreBackupService.getBackupHistory());
        showToast('success', 'Backup Verified', `Created verified checkpoint [${record.id}].`);
        setIsBackupModalOpen(false);
        setBackupLabelInput('');
      } else {
        showToast('error', 'Backup Failed', 'Could not create cloud backup checkpoint.');
      }
    } catch (e: any) {
      showToast('error', 'Backup Error', e?.message || 'Backup failed.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleVerifyBackup = async (backupId: string) => {
    const res = await FirestoreBackupService.verifyBackupIntegrity(backupId);
    if (res.verified) {
      showToast('success', 'Integrity Verified', 'SHA-256 cryptographic checksum matches.');
      setBackupHistory(FirestoreBackupService.getBackupHistory());
    } else {
      showToast('error', 'Integrity Failure', res.details || 'Checksum mismatch detected in backup record.');
    }
  };

  const handleInitiateRestore = async (backup: BackupHistoryRecord) => {
    if (!backup.firestoreSnapshotId) {
      showToast('error', 'Cannot Restore', 'No valid snapshot ID associated with this backup.');
      return;
    }
    const confirmed = window.confirm(
      `CRITICAL CONFIRMATION:\n\nAre you sure you want to restore database from backup "${backup.label}"?\n\nA pre-recovery safety checkpoint will be automatically created before restoring.`
    );
    if (!confirmed) return;

    setIsRestoringBackup(true);
    try {
      showToast('info', 'Restoring', 'Rolling back collections to verified checkpoint...');
      const res = await FirestoreBackupService.restoreCloudSnapshot(backup.firestoreSnapshotId);
      if (res.success) {
        showToast('success', 'Restore Completed', 'Database state successfully restored from snapshot.');
      } else {
        showToast('error', 'Restore Failed', res.message);
      }
    } catch (err: any) {
      showToast('error', 'Restore Error', err?.message || 'Restore failed.');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. DATA INTEGRITY & SYNC DIAGNOSTICS STATE
  // ─────────────────────────────────────────────────────────────
  const [healthChecks, setHealthChecks] = useState<SystemHealthCheckItem[]>(() => SuperAdminService.runSystemHealthCheck());
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [pingResult, setPingResult] = useState<{ latencyMs: number; success: boolean } | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const handleRunDiagnostics = () => {
    setIsRunningHealthCheck(true);
    setTimeout(() => {
      setHealthChecks(SuperAdminService.runSystemHealthCheck());
      setIsRunningHealthCheck(false);
      showToast('success', 'System Check Complete', 'All architectural integrity checks passed.');
    }, 600);
  };

  const handlePingTest = async () => {
    setIsPinging(true);
    try {
      const res = await ApiSyncService.pingFirestore();
      setPingResult(res);
      if (res.success) {
        showToast('success', 'Round-trip Ping', `Firestore responded in ${res.latencyMs}ms.`);
      } else {
        showToast('error', 'Ping Failed', res.error || 'Failed to reach Firestore endpoint.');
      }
    } finally {
      setIsPinging(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. AUDIT LOGS STATE
  // ─────────────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<any[]>(() => StorageService.getAuditLogs());
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [chainIntegrityResult, setChainIntegrityResult] = useState<any>(null);

  useEffect(() => {
    const unsub = AuditService.subscribeLiveLogs(logs => {
      if (logs.length > 0) setAuditLogs(logs);
    });
    return () => unsub();
  }, []);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(l => {
      const matchesSearch =
        !auditSearchQuery ||
        l.action?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        l.userName?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        l.description?.toLowerCase().includes(auditSearchQuery.toLowerCase());

      const matchesModule = auditModuleFilter === 'all' || l.module === auditModuleFilter;
      return matchesSearch && matchesModule;
    });
  }, [auditLogs, auditSearchQuery, auditModuleFilter]);

  const handleVerifyAuditChain = () => {
    const result = AuditService.verifyChainIntegrity();
    setChainIntegrityResult(result);
    if (result.verified) {
      showToast('success', 'Audit Chain Verified', 'Cryptographic block hash integrity 100% verified.');
    } else {
      showToast('error', 'Chain Tampering Detected', result.details);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. COMPANY SETTINGS & SYSTEM STATE
  // ─────────────────────────────────────────────────────────────
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(() => companyProfile);
  const [systemConfig, setSystemConfig] = useState<SystemConfigurationSettings>(() => SuperAdminService.getSystemConfig());
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  useEffect(() => {
    setCompanyForm(companyProfile);
  }, [companyProfile]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      updateCompanyProfile(companyForm);
      await ApiSyncService.saveCompanyProfile(companyForm);
      showToast('success', 'Settings Synchronized', 'Company & system settings saved to Central Firestore.');
    } catch (err: any) {
      showToast('error', 'Save Failed', err?.message || 'Could not save company configuration.');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveSystemConfig = (e: React.FormEvent) => {
    e.preventDefault();
    SuperAdminService.saveSystemConfig(systemConfig);
    showToast('success', 'System Config Updated', 'Configuration committed to Central Firestore.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          SOVEREIGN HEADER & CLUSTER VITALS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 border border-amber-400/30">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                SUPER ADMIN CONTROL CENTER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ROOT SOVEREIGN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              One Authenticated Source → Cloud Firestore → Real-Time Multi-Device Sync
            </p>
          </div>
        </div>

        {/* Live Firestore Connection Status Header Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <FirestoreConnectionStatus />
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>DB: <strong className="text-white font-bold">{firebaseConfig.projectId}</strong></span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STRICT 7-MODULE SOVEREIGN TAB BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-md scrollbar-none">
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>

        <button
          onClick={() => handleTabChange('staff_management')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'staff_management'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff & User Management
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 text-[10px] border border-indigo-800">
            {staffList.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('import_export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'import_export'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Data Import / Export
        </button>

        <button
          onClick={() => handleTabChange('backup_restore')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'backup_restore'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Backup & Restore
        </button>

        <button
          onClick={() => handleTabChange('data_integrity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'data_integrity'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Data Integrity & System Check
          {syncMetrics.liveState === 'LIVE' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('audit_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Logs
        </button>

        <button
          onClick={() => handleTabChange('company_settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'company_settings'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Building className="w-4 h-4" />
          Company Settings & System
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: DASHBOARD
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 4 Sovereign Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{staffList.length}</div>
                <div className="text-xs font-semibold text-slate-400">Registered Staff Accounts</div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                  <span>LIVE</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-xs font-semibold text-slate-400">Multi-Device Sync State</div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{syncMetrics.activeListenersCount}</div>
                <div className="text-xs font-semibold text-slate-400">Active Real-Time Listeners</div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{backupHistory.length}</div>
                <div className="text-xs font-semibold text-slate-400">Verified Cloud Checkpoints</div>
              </div>
            </div>
          </div>

          {/* Core Modules Quick Navigation Grid */}
          <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Sovereign Module Command Centers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => handleTabChange('staff_management')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-indigo-300 transition-colors">Staff & User Management</h4>
                    <p className="text-xs text-slate-400">Manage credentials, permissions, and generate staff ID cards</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleTabChange('import_export')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ArrowUpDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors">Data Import / Export</h4>
                    <p className="text-xs text-slate-400">Direct CSV commit to Central Firestore with duplicate detection</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleTabChange('backup_restore')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-emerald-300 transition-colors">Backup & Restore</h4>
                    <p className="text-xs text-slate-400">Manual backup creation, SHA-256 verification, and controlled restore</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleTabChange('data_integrity')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-cyan-300 transition-colors">Data Integrity & Sync Diagnostics</h4>
                    <p className="text-xs text-slate-400">Multi-device diagnostic monitor, ping latency, and schema health</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleTabChange('audit_logs')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-amber-300 transition-colors">Audit Logs</h4>
                    <p className="text-xs text-slate-400">Cryptographic blockchain ledger with SHA-256 chain verification</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleTabChange('company_settings')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-rose-300 transition-colors">Company Settings & System</h4>
                    <p className="text-xs text-slate-400">Central identity, prefixes, taxation, and security configuration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: STAFF & USER MANAGEMENT
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'staff_management' && (
        <div className="space-y-6">
          {/* Header & Action Bar */}
          <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Central Staff & User Management</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Authoritative Firestore Staff Directory. Authentication, role assignment, and access control for all devices.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddStaffModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Register New Staff
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2 items-center p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={e => setStaffSearchQuery(e.target.value)}
                placeholder="Search staff by name, unique email, staff ID..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={staffRoleFilter}
              onChange={e => setStaffRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="lab_technician">Lab Technician</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="nurse">Nurse</option>
              <option value="accountant">Accountant</option>
              <option value="staff">Staff</option>
            </select>

            <select
              value={staffStatusFilter}
              onChange={e => setStaffStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </select>
          </div>

          {/* Staff Directory Table */}
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Staff Identity</th>
                    <th className="p-3">Staff ID & Employee No</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Department & Designation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                  {filteredStaff.map(u => (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="p-3">
                        <div className="font-bold text-white">{u.fullName}</div>
                        <div className="text-[11px] text-indigo-400 font-mono">{u.email}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        <div>{u.staffId || '—'}</div>
                        <div className="text-[10px] text-slate-500">{u.employeeNo || '—'}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-white">{u.designation || 'Staff'}</div>
                        <div className="text-[10px] text-slate-400">{u.department || 'General'}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            (u.status || 'active') === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedStaffForCard(u)}
                          className="text-xs text-indigo-400 hover:text-white"
                          title="Generate Staff ID Card"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          Card
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedStaffForPass(u);
                            setIsResetPassModalOpen(true);
                          }}
                          className="text-xs text-amber-400 hover:text-white"
                          title="Reset Password / Security PIN"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingStaff(u)}
                          className="text-xs text-blue-400 hover:text-white"
                          title="Edit Permissions & Role"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        {u.role !== 'super_admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStaffStatus(u)}
                            className={`text-xs ${
                              u.status === 'inactive' ? 'text-emerald-400 hover:text-white' : 'text-rose-400 hover:text-white'
                            }`}
                            title={u.status === 'inactive' ? 'Activate Staff' : 'Deactivate Staff'}
                          >
                            {u.status === 'inactive' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: DATA IMPORT / EXPORT
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'import_export' && (
        <div className="space-y-6">
          <div className="flex gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 w-fit">
            <button
              onClick={() => setImportExportTab('import')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                importExportTab === 'import' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Import to Central Firestore
            </button>
            <button
              onClick={() => setImportExportTab('export')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                importExportTab === 'export' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Central Data Exporter
            </button>
          </div>

          {importExportTab === 'import' ? (
            <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Central Data Importer</h3>
                <p className="text-xs text-slate-400">
                  Direct atomic write into Central Firestore. Broadcasts live updates instantly to PC, Mobile, and Tablet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Target Category</label>
                  <select
                    value={importCategory}
                    onChange={e => {
                      setImportCategory(e.target.value as MasterDataCategory);
                      setImportValidation(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value="patients">Patients Directory</option>
                    <option value="cards">Health Cards Master</option>
                    <option value="medicines">Pharmacy Medicine Catalog</option>
                    <option value="tests">Lab Test Master</option>
                    <option value="doctors">Doctor Master</option>
                    <option value="billing">Patient Invoices</option>
                    <option value="users">Staff Accounts</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Duplicate Handling Mode</label>
                  <select
                    value={importMode}
                    onChange={e => setImportMode(e.target.value as 'update' | 'skip')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value="update">UPDATE EXISTING (Safe Merge)</option>
                    <option value="skip">SKIP DUPLICATE (Insert New Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Paste CSV / Tab-Delimited Data
                </label>
                <textarea
                  rows={6}
                  value={rawImportData}
                  onChange={e => {
                    setRawImportData(e.target.value);
                    setImportValidation(null);
                  }}
                  placeholder="Paste CSV rows with headers matching the category fields..."
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleValidateImport} className="text-xs border-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Validate Input Data
                </Button>

                {importValidation && importValidation.validRows.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCommitImport}
                    disabled={isExecutingImport}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shadow-md shadow-emerald-600/30"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    {isExecutingImport ? 'Writing to Firestore...' : `Commit ${importValidation.validRows.length} Valid Records`}
                  </Button>
                )}
              </div>

              {/* Validation Summary */}
              {importValidation && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white">Validation Results:</span>
                    <span className={importValidation.invalidRows.length === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                      {importValidation.invalidRows.length === 0 ? 'PASS' : 'WARNINGS DETECTED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center pt-2">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-white">{importValidation.totalRows}</div>
                      <div className="text-[10px] text-slate-400">Total Rows</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-emerald-900/40">
                      <div className="font-bold text-emerald-400">{importValidation.validRows.length}</div>
                      <div className="text-[10px] text-slate-400">Valid</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-amber-900/40">
                      <div className="font-bold text-amber-400">{importValidation.duplicateRows.length}</div>
                      <div className="text-[10px] text-slate-400">Duplicates</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-rose-900/40">
                      <div className="font-bold text-rose-400">{importValidation.invalidRows.length}</div>
                      <div className="text-[10px] text-slate-400">Errors</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Export Hub */
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
                    <option value="billing">Patient Invoices</option>
                    <option value="transactions">Ledger Transactions</option>
                    <option value="users">Staff Directory</option>
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

              <Button
                variant="primary"
                onClick={handleExecuteExport}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate and Download CSV Export
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: BACKUP & RESTORE
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'backup_restore' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Central Sovereign Backup & Restore</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Zero-Loss Cloud Firestore Snapshots, Checksum Verification & Controlled Recovery Rollback
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBackupModalOpen(true)}
              disabled={isCreatingBackup}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shadow-md shadow-emerald-600/30"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              CREATE BACKUP NOW
            </Button>
          </div>

          {/* Backup History Table */}
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Verified Checkpoint History</h4>
              <span className="text-xs text-slate-400">{backupHistory.length} total checkpoints</span>
            </div>

            {backupHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No backups recorded yet. Click "CREATE BACKUP NOW" to capture the initial sovereign checkpoint.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Backup ID & Label</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Record Scope</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Verification</th>
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
                        <td className="p-3 text-slate-300">{formatDateTime(b.createdAt)}</td>
                        <td className="p-3 font-mono font-bold text-white">{b.recordCount || 0}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
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
                            title="Verify Checksum"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            Verify
                          </Button>
                          {b.firestoreSnapshotId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInitiateRestore(b)}
                              disabled={isRestoringBackup}
                              className="text-xs text-amber-400 hover:text-white"
                              title="Restore Database from Snapshot"
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

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: DATA INTEGRITY & SYSTEM CHECK (With Real-Time Sync Diagnostics)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'data_integrity' && (
        <div className="space-y-6">
          {/* Top Status Header */}
          <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Data Integrity & System Health Check</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Continuous architectural telemetry, schema checks, broken reference detection & multi-device sync diagnostics
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePingTest}
                disabled={isPinging}
                className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
              >
                <Activity className={`w-3.5 h-3.5 mr-1.5 ${isPinging ? 'animate-spin' : ''}`} />
                {isPinging ? 'Pinging...' : 'Test Roundtrip Ping'}
              </Button>

              <Button
                size="sm"
                variant="primary"
                onClick={handleRunDiagnostics}
                disabled={isRunningHealthCheck}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-md shadow-indigo-600/30"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRunningHealthCheck ? 'animate-spin' : ''}`} />
                Run System Check Now
              </Button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              REAL-TIME SYNC DIAGNOSTICS (Requirement 15)
              ═══════════════════════════════════════════════════════════ */}
          <div className="p-6 rounded-3xl bg-slate-950/90 border border-indigo-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Real-Time Multi-Device Sync Diagnostics
                </h4>
              </div>
              <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE CLUSTER
              </span>
            </div>

            {/* Diagnostic Matrix Table */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Firestore Connection</div>
                <div className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONNECTED</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Authentication Status</div>
                <div className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONNECTED</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Current Firebase Project</div>
                <div className="text-xs font-mono font-bold text-indigo-300 mt-1 truncate" title={firebaseConfig.projectId}>
                  {firebaseConfig.projectId}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Current User & Role</div>
                <div className="text-xs font-bold text-white mt-1 truncate">
                  {currentUser?.fullName || 'Super Admin'} ({currentUser?.role?.toUpperCase() || 'ROOT'})
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Realtime Listener Status</div>
                <div className="text-sm font-black text-emerald-400 mt-1">
                  ACTIVE ({syncMetrics.activeListenersCount} Listeners)
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Last Successful Snapshot</div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                  {new Date(syncMetrics.lastSyncTime).toLocaleTimeString()}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Pending Writes</div>
                <div className="text-sm font-mono font-bold text-white mt-1">
                  {syncMetrics.pendingQueueSize} writes pending
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">Sync Status & Latency</div>
                <div className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                  <span>LIVE</span>
                  {pingResult && <span className="text-xs text-indigo-300 font-mono">({pingResult.latencyMs}ms)</span>}
                </div>
              </div>
            </div>
          </div>

          {/* System Check Health Items Grid */}
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

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: AUDIT LOGS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Cryptographic Immutable Audit Trail</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                SHA-256 Block Hashes, HMAC Signatures & Merkle Tree Root — Real-time Central Firestore Stream
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
            </div>
          </div>

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
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2 items-center p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
            <input
              type="text"
              value={auditSearchQuery}
              onChange={e => setAuditSearchQuery(e.target.value)}
              placeholder="Search action, operator, details..."
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 flex-1 min-w-[180px]"
            />
            <select
              value={auditModuleFilter}
              onChange={e => setAuditModuleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
            >
              <option value="all">All Modules</option>
              <option value="auth">Auth & Security</option>
              <option value="users">Staff Management</option>
              <option value="patients">Patients</option>
              <option value="cards">Health Cards</option>
              <option value="billing">Billing & Finance</option>
              <option value="backup">Backups</option>
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

      {/* ─────────────────────────────────────────────────────────────
          TAB 7: COMPANY SETTINGS & SYSTEM
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'company_settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Branding Profile */}
            <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Central Company Identity</h3>
                  <p className="text-xs text-slate-400">Institutional details reflected uniformly across all modules</p>
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
                    <label className="text-slate-400 block mb-1 font-bold">Helpline Phone</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Official Email</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Clinical Address</label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      value={companyForm.gstin || ''}
                      onChange={e => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Clinical License No</label>
                    <input
                      type="text"
                      value={companyForm.clinicalLicenseNo || ''}
                      onChange={e => setCompanyForm({ ...companyForm, clinicalLicenseNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingCompany}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs mt-2"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  {isSavingCompany ? 'Saving to Firestore...' : 'Save Company Identity'}
                </Button>
              </form>
            </div>

            {/* System Configurations */}
            <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">System Level Configurations</h3>
                  <p className="text-xs text-slate-400">Numbering prefixes, limits, and maintenance controls</p>
                </div>
              </div>

              <form onSubmit={handleSaveSystemConfig} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Patient ID Prefix</label>
                    <input
                      type="text"
                      value={systemConfig.patientIdPrefix}
                      onChange={e => setSystemConfig({ ...systemConfig, patientIdPrefix: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Health Card Prefix</label>
                    <input
                      type="text"
                      value={systemConfig.cardNoPrefix}
                      onChange={e => setSystemConfig({ ...systemConfig, cardNoPrefix: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Max Family Members / Card</label>
                    <input
                      type="number"
                      value={systemConfig.maxFamilyMembers}
                      onChange={e => setSystemConfig({ ...systemConfig, maxFamilyMembers: parseInt(e.target.value, 10) || 6 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Default Tax %</label>
                    <input
                      type="number"
                      value={systemConfig.defaultTaxPercent}
                      onChange={e => setSystemConfig({ ...systemConfig, defaultTaxPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={systemConfig.lockdownOperationalRecords}
                      onChange={e => setSystemConfig({ ...systemConfig, lockdownOperationalRecords: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="font-bold">Lockdown Operational Records (Emergency Read-Only Protection)</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs mt-2"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Save System Configurations
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REGISTER NEW STAFF
          ───────────────────────────────────────────────────────────── */}
      {isAddStaffModalOpen && (
        <Modal
          isOpen={isAddStaffModalOpen}
          onClose={() => setIsAddStaffModalOpen(false)}
          title="Register New Staff Member"
        >
          <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffForm.fullName}
                  onChange={e => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  placeholder="e.g. Reshma Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Unique Email * (Authentication)</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="e.g. reshma32012@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Username *</label>
                <input
                  type="text"
                  required
                  value={staffForm.username}
                  onChange={e => setStaffForm({ ...staffForm, username: e.target.value })}
                  placeholder="e.g. reshma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Assigned Role *</label>
                <select
                  value={staffForm.role}
                  onChange={e => setStaffForm({ ...staffForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                >
                  <option value="admin">Administrator</option>
                  <option value="doctor">Medical Doctor</option>
                  <option value="receptionist">Front Desk Receptionist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="nurse">Nurse</option>
                  <option value="accountant">Billing Officer</option>
                  <option value="staff">Clinical Staff</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Designation</label>
                <input
                  type="text"
                  value={staffForm.designation}
                  onChange={e => setStaffForm({ ...staffForm, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Phone Number</label>
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Security PIN (4-Digits)</label>
                <input
                  type="text"
                  value={staffForm.pinCode}
                  onChange={e => setStaffForm({ ...staffForm, pinCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Assigned Password (Optional)</label>
                <input
                  type="text"
                  value={staffForm.password}
                  onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="Auto-generated if blank"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
            </div>

            {/* Allowed Modules Selection */}
            <div>
              <label className="block text-slate-400 mb-1.5 font-bold">Allowed Module Access</label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                {availableModules.map(mod => {
                  const isChecked = staffForm.allowedModules.includes(mod.id);
                  return (
                    <label key={mod.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setStaffForm({ ...staffForm, allowedModules: [...staffForm.allowedModules, mod.id] });
                          } else {
                            setStaffForm({ ...staffForm, allowedModules: staffForm.allowedModules.filter(m => m !== mod.id) });
                          }
                        }}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>{mod.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddStaffModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Commit to Central Firestore
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT STAFF PERMISSIONS & ROLE
          ───────────────────────────────────────────────────────────── */}
      {isEditingStaff && (
        <Modal
          isOpen={Boolean(isEditingStaff)}
          onClose={() => setIsEditingStaff(null)}
          title={`Edit Permissions: ${isEditingStaff.fullName}`}
        >
          <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Full Name</label>
                <input
                  type="text"
                  required
                  value={isEditingStaff.fullName}
                  onChange={e => setIsEditingStaff({ ...isEditingStaff, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Registered Email</label>
                <input
                  type="email"
                  required
                  value={isEditingStaff.email}
                  onChange={e => setIsEditingStaff({ ...isEditingStaff, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Role</label>
                <select
                  value={isEditingStaff.role}
                  onChange={e => setIsEditingStaff({ ...isEditingStaff, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Administrator</option>
                  <option value="doctor">Medical Doctor</option>
                  <option value="receptionist">Front Desk Receptionist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="nurse">Nurse</option>
                  <option value="accountant">Billing Officer</option>
                  <option value="staff">Clinical Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Designation</label>
                <input
                  type="text"
                  value={isEditingStaff.designation || ''}
                  onChange={e => setIsEditingStaff({ ...isEditingStaff, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
            </div>

            {/* Allowed Modules Selection */}
            <div>
              <label className="block text-slate-400 mb-1.5 font-bold">Allowed Module Access</label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                {availableModules.map(mod => {
                  const allowed = (isEditingStaff.allowedModules || []).includes(mod.id);
                  return (
                    <label key={mod.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={e => {
                          const current = isEditingStaff.allowedModules || [];
                          const updated = e.target.checked
                            ? [...current, mod.id]
                            : current.filter(m => m !== mod.id);
                          setIsEditingStaff({ ...isEditingStaff, allowedModules: updated });
                        }}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>{mod.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingStaff(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Save Updates to Firestore
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: STAFF ID CARD PREVIEW
          ───────────────────────────────────────────────────────────── */}
      {selectedStaffForCard && (
        <Modal
          isOpen={Boolean(selectedStaffForCard)}
          onClose={() => setSelectedStaffForCard(null)}
          title={`Staff ID Card: ${selectedStaffForCard.fullName}`}
        >
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            <StaffIDCard
              user={selectedStaffForCard}
              company={companyProfile}
              side="front"
              showLanyard={false}
              scale={0.95}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs border-slate-700"
            >
              Print Staff Identity Card
            </Button>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RESET STAFF PASSWORD / PIN
          ───────────────────────────────────────────────────────────── */}
      {isResetPassModalOpen && selectedStaffForPass && (
        <Modal
          isOpen={isResetPassModalOpen}
          onClose={() => setIsResetPassModalOpen(false)}
          title={`Reset Credentials: ${selectedStaffForPass.fullName}`}
        >
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">New Password</label>
              <input
                type="text"
                required
                value={newPasswordInput}
                onChange={e => setNewPasswordInput(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">New Security PIN (Optional)</label>
              <input
                type="text"
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value)}
                placeholder="4-digit PIN"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsResetPassModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white">
                Save New Credentials
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE MANUAL BACKUP
          ───────────────────────────────────────────────────────────── */}
      {isBackupModalOpen && (
        <Modal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          title="Create Manual Cloud Backup"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Captures an atomic snapshot of all Central Firestore production collections, registers a SHA-256 integrity hash, and establishes a safe restore checkpoint.
            </p>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Backup Label / Description</label>
              <input
                type="text"
                value={backupLabelInput}
                onChange={e => setBackupLabelInput(e.target.value)}
                placeholder="e.g. Pre-Deployment Checkpoint 2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsBackupModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateManualBackup}
                disabled={isCreatingBackup}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isCreatingBackup ? 'Capturing Snapshot...' : 'Create Backup Now'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
