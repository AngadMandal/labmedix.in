import React, { useState, useMemo } from 'react';
import { CashDeskVoucher, VoucherCategory, VoucherStatus, Role } from '../../types';
import { CashDeskVoucherService, VOUCHER_CATEGORIES } from '../../services/cashDeskVoucherService';
import { StorageService } from '../../services/storage';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { VoucherSlipModal } from '../../components/vouchers/VoucherSlipModal';
import { VoucherRedeemModal } from '../../components/vouchers/VoucherRedeemModal';
import { VoucherCreateModal } from '../../components/vouchers/VoucherCreateModal';
import { CashDeskVoucherAnalytics } from '../../components/vouchers/CashDeskVoucherAnalytics';
import { exportVouchersToCsv, exportVouchersToPdf } from '../../utils/voucherExport';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Plus,
  Layers,
  Flame,
  Search,
  Filter,
  Printer,
  Copy,
  Check,
  Eye,
  EyeOff,
  Coins,
  CreditCard,
  Building2,
  User,
  Stethoscope,
  FlaskConical,
  Pill,
  RefreshCw,
  QrCode,
  ScanLine,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  KeyRound,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const CashDeskBillVouchersPage: React.FC = () => {
  const { showToast } = useToast();
  const currentUser = StorageService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [vouchers, setVouchers] = useState<CashDeskVoucher[]>(() => CashDeskVoucherService.getPublicVouchers());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bearerFilter, setBearerFilter] = useState<string>('all');

  // Visualizations & User Settings
  const [showAnalytics, setShowAnalytics] = useState<boolean>(true);
  const [autoPrintOnCreation, setAutoPrintOnCreation] = useState<boolean>(() => {
    return StorageService.getVoucherSettings().autoPrintOnCreation;
  });
  const [autoPrintTrigger, setAutoPrintTrigger] = useState<boolean>(false);

  // Modals
  const [selectedVoucherForSlip, setSelectedVoucherForSlip] = useState<CashDeskVoucher | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemVoucherCode, setRedeemVoucherCode] = useState<string>('');

  // Local PIN visibility toggles per row
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);

  const refreshVouchers = () => {
    setVouchers(CashDeskVoucherService.getPublicVouchers());
  };

  React.useEffect(() => {
    const handleSync = () => {
      refreshVouchers();
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => {
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const metrics = useMemo(() => CashDeskVoucherService.getVoucherMetrics(), [vouchers]);

  // Filtered vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.voucherCode.toLowerCase().includes(q) ||
        v.pin.includes(q) ||
        v.authSealCode.toLowerCase().includes(q) ||
        (v.patientName && v.patientName.toLowerCase().includes(q)) ||
        (v.patientId && v.patientId.toLowerCase().includes(q)) ||
        (v.departmentRestriction && v.departmentRestriction.toLowerCase().includes(q)) ||
        (v.issuedBy && v.issuedBy.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && v.status === 'active' && new Date(v.validUntil) >= new Date()) ||
        (statusFilter === 'redeemed' && v.status === 'redeemed') ||
        (statusFilter === 'locked' && (v.status === 'locked' || v.isLocked)) ||
        (statusFilter === 'expired' && (v.status === 'expired' || new Date(v.validUntil) < new Date())) ||
        (statusFilter === 'voided' && v.status === 'voided');

      const matchesCat = categoryFilter === 'all' || v.category === categoryFilter;
      const matchesBearer = bearerFilter === 'all' || v.bearerType === bearerFilter;

      return matchesSearch && matchesStatus && matchesCat && matchesBearer;
    });
  }, [vouchers, searchQuery, statusFilter, categoryFilter, bearerFilter]);

  const togglePinReveal = (voucherId: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [voucherId]: !prev[voucherId]
    }));
  };

  const handleToggleAutoPrint = () => {
    const nextVal = !autoPrintOnCreation;
    setAutoPrintOnCreation(nextVal);
    StorageService.saveVoucherSettings({ autoPrintOnCreation: nextVal });
    showToast(
      'info',
      'Auto-Print Setting Updated',
      `Auto-print voucher on creation is now ${nextVal ? 'ENABLED' : 'DISABLED'}.`
    );
  };

  const handleCopyCode = (voucher: CashDeskVoucher) => {
    navigator.clipboard.writeText(voucher.voucherCode);
    setCopiedVoucherId(voucher.id);
    showToast('success', 'Copied', `Voucher Code ${voucher.voucherCode} copied!`);
    setTimeout(() => setCopiedVoucherId(null), 2000);
  };

  const handleCopyPin = (voucher: CashDeskVoucher) => {
    navigator.clipboard.writeText(voucher.pin);
    showToast('success', 'PIN Copied', `PIN for ${voucher.voucherCode} copied to clipboard!`);
  };

  const handleOpenSlip = (voucher: CashDeskVoucher, shouldAutoPrint: boolean = false) => {
    setSelectedVoucherForSlip(voucher);
    setAutoPrintTrigger(shouldAutoPrint);
    setIsSlipModalOpen(true);
  };

  const handleOpenRedeem = (voucherCode?: string) => {
    setRedeemVoucherCode(voucherCode || '');
    setIsRedeemModalOpen(true);
  };

  const handleRegeneratePin = (voucher: CashDeskVoucher) => {
    if (confirm(`Regenerate new high-entropy cryptographic PIN for Voucher ${voucher.voucherCode}?`)) {
      const res = CashDeskVoucherService.regeneratePin(voucher.id);
      if (res.success) {
        showToast('success', 'New PIN Active', `New PIN generated for ${voucher.voucherCode}: ${res.newPin || ''}`);
        refreshVouchers();
      } else {
        showToast('error', 'PIN Reset Failed', res.error || 'Failed to regenerate PIN.');
      }
    }
  };

  const handleUnlock = (voucher: CashDeskVoucher) => {
    const res = CashDeskVoucherService.unlockVoucher(voucher.id);
    if (res.success) {
      showToast('success', 'Voucher Unlocked', `Voucher ${voucher.voucherCode} unlocked successfully.`);
      refreshVouchers();
    } else {
      showToast('error', 'Unlock Failed', res.error || 'Failed to unlock voucher.');
    }
  };

  const handleApprove = (voucher: CashDeskVoucher) => {
    if (currentUser?.role !== 'super_admin') {
      showToast('error', 'Access Denied', 'Only Super Admin can approve vouchers.');
      return;
    }
    const vouchers = StorageService.getCashDeskVouchers();
    const target = vouchers.find(x => x.id === voucher.id);
    if (target) {
      target.status = 'active';
      StorageService.saveCashDeskVouchers(vouchers);
      refreshVouchers();
      showToast('success', 'Voucher Approved', `Voucher ${voucher.voucherCode} is now active.`);
    }
  };

  const handleVoid = (voucher: CashDeskVoucher) => {
    const reason = prompt(`Reason for voiding Voucher ${voucher.voucherCode}:`, 'Super Admin Cancellation');
    if (reason !== null) {
      const res = CashDeskVoucherService.voidVoucher(voucher.id, reason);
      if (res.success) {
        showToast('success', 'Voucher Voided', `Voucher ${voucher.voucherCode} has been voided.`);
        refreshVouchers();
      } else {
        showToast('error', 'Void Failed', res.error || 'Failed to void voucher.');
      }
    }
  };

  const handleExportCsv = () => {
    exportVouchersToCsv(filteredVouchers, 'Hospital_Cash_Desk_Vouchers_Filtered');
    showToast('success', 'Export Complete', `${filteredVouchers.length} filtered vouchers exported as CSV.`);
  };

  const handleExportPdf = () => {
    const company = StorageService.getCompanyProfile();
    exportVouchersToPdf(filteredVouchers, company, {
      searchQuery,
      statusFilter,
      categoryFilter,
      bearerFilter
    });
    showToast('success', 'PDF Generated', `Official Hospital Cash Desk Ledger PDF downloaded successfully!`);
  };

  // Switch to Super Admin profile helper
  const handleSwitchToSuperAdmin = () => {
    const users = StorageService.getUsers();
    const superAdmin = users.find(u => u.role === 'super_admin');
    if (superAdmin) {
      StorageService.setCurrentUser(superAdmin);
      window.location.reload();
    }
  };

  // Seed standard recommended vouchers
  const handleSeedRecommended = () => {
    const updated = CashDeskVoucherService.seedStandardRecommendedVouchers();
    setVouchers(updated);
    showToast('success', 'Recommended Vouchers Active', '6 Standard Hospital Recommended Vouchers have been seeded successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/40 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Cash Desk POS & Finance Ledger
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Cryptographic PIN & Anti-Brute-Force
            </span>
            {isSuperAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Super Admin Sovereign Mode
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            Hospital Cash Desk Voucher Engine
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 max-w-2xl leading-relaxed">
            Automated generation, cryptographic PIN authorization, monthly revenue visualization, exportable ledger reports, and single-use POS redemption.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seed Recommended Standard Vouchers */}
          <Button
            variant="outline"
            size="sm"
            className="bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
            leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
            onClick={handleSeedRecommended}
            title="Load 6 recommended standard hospital vouchers (OPD, Lab, Cash Desk, Topup, Pharmacy, Emergency)"
          >
            Load Recommended Vouchers
          </Button>

          {/* Auto-print Toggle Switch */}
          <button
            type="button"
            onClick={handleToggleAutoPrint}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              autoPrintOnCreation
                ? 'bg-teal-500/20 text-teal-300 border-teal-400/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Auto-print voucher slip immediately upon creation"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Auto-Print: {autoPrintOnCreation ? 'ON' : 'OFF'}</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            leftIcon={<ScanLine className="w-4 h-4 text-teal-300" />}
            onClick={() => handleOpenRedeem()}
          >
            Cash Desk POS Redeem
          </Button>

          {(isSuperAdmin || currentUser?.role === 'admin') && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              leftIcon={<Layers className="w-4 h-4 text-indigo-300" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Auto Batch Fleet
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Create Voucher
          </Button>
        </div>
      </div>

      {/* Analytics Visualization Section (Recharts) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Monthly Revenue & Daily Voucher Trends
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>{showAnalytics ? 'Collapse Charts' : 'Expand Visual Charts'}</span>
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showAnalytics && (
          <CashDeskVoucherAnalytics vouchers={vouchers} />
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'all', label: `All (${vouchers.length})` },
              { key: 'active', label: `Active (${metrics.activeCount})` },
              { key: 'redeemed', label: `Redeemed (${metrics.redeemedCount})` },
              { key: 'locked', label: `Locked (${metrics.lockedCount})` },
              { key: 'expired', label: `Expired (${metrics.expiredCount})` }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export Actions & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={handleExportCsv}
              title="Export current filtered vouchers as CSV for Excel"
            >
              Export CSV ({filteredVouchers.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="w-4 h-4 text-rose-600" />}
              onClick={handleExportPdf}
              title="Export official accounting PDF ledger report"
            >
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={refreshVouchers}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative sm:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Voucher Code, PIN, Patient Name, Auth Seal..."
              className="w-full px-3.5 py-2 pl-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none dark:text-white"
            >
              <option value="all">All Hospital Categories</option>
              {(Object.keys(VOUCHER_CATEGORIES) as VoucherCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {VOUCHER_CATEGORIES[cat].name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={bearerFilter}
              onChange={e => setBearerFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none dark:text-white"
            >
              <option value="all">All Bearer Types</option>
              <option value="specific_patient">Registered Patients Only</option>
              <option value="cash_desk_bearer">Cash Desk Float Bearers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vouchers Data Ledger Table */}
      <div className="p-0 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Voucher Code & Seal</th>
                <th className="py-3 px-4">Category & Purpose</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Cryptographic PIN</th>
                <th className="py-3 px-4">Bearer / Patient</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Coins className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold">No Cash Desk Vouchers found matching filter criteria.</p>
                    <p className="text-xs pt-1">Create a new voucher or batch to get started.</p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map(v => {
                  const isExpired = new Date(v.validUntil) < new Date();
                  const isPinRevealed = !!revealedPins[v.id];

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Code & Seal */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(v)}
                            className="font-mono font-bold text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1 group"
                          >
                            <span>{v.voucherCode}</span>
                            {copiedVoucherId === v.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-300 group-hover:text-blue-500" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {v.authSealCode}
                          </span>
                          {v.batchId && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                              Batch {v.batchId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                          {v.categoryName || v.category}
                        </span>
                        {v.departmentRestriction && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {v.departmentRestriction}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          {formatCurrency(v.amount)}
                        </span>
                      </td>

                      {/* Cryptographic PIN */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tracking-wider">
                            {isPinRevealed ? v.pin : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinReveal(v.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title={isPinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                          >
                            {isPinRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPin(v)}
                            className="text-slate-400 hover:text-blue-500"
                            title="Copy PIN"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {v.failedPinAttempts && v.failedPinAttempts > 0 ? (
                          <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                            {v.failedPinAttempts}/3 Failed PIN attempts
                          </span>
                        ) : null}
                      </td>

                      {/* Bearer / Patient */}
                      <td className="py-3 px-4">
                        {v.bearerType === 'specific_patient' && v.patientName ? (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[160px]">
                              {v.patientName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {v.patientId || v.patientPhone || 'Patient Bearer'}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Cash Desk Bearer
                          </span>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 dark:text-slate-300 font-medium block">
                          Till {formatDate(v.validUntil)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Issued {formatDate(v.validFrom)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {v.isLocked || v.status === 'locked' ? (
                          <Badge variant="danger" size="sm" className="font-bold">
                            LOCKED (3x FAIL)
                          </Badge>
                        ) : v.status === 'redeemed' ? (
                          <div>
                            <Badge variant="info" size="sm" className="font-bold">
                              REDEEMED
                            </Badge>
                            <span className="text-[9px] text-slate-400 block mt-0.5 truncate max-w-[120px]">
                              by {v.redeemedBy || 'Cashier'}
                            </span>
                          </div>
                        ) : isExpired ? (
                          <Badge variant="warning" size="sm" className="font-bold">
                            EXPIRED
                          </Badge>
                        ) : v.status === 'voided' ? (
                          <Badge variant="neutral" size="sm" className="font-bold">
                            VOIDED
                          </Badge>
                        ) : v.status === 'pending' ? (
                          <Badge variant="warning" size="sm" className="font-bold">
                            PENDING APPROVAL
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm" className="font-bold">
                            ACTIVE
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Official Slip */}
                          <button
                            type="button"
                            onClick={() => handleOpenSlip(v, false)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Print & View Official Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* POS Redeem */}
                          {v.status === 'active' && !isExpired && (
                            <button
                              type="button"
                              onClick={() => handleOpenRedeem(v.voucherCode)}
                              className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors"
                              title="Redeem at Cash Desk POS"
                            >
                              <ScanLine className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Unlock */}
                          {(v.isLocked || v.status === 'locked') && (
                            <button
                              type="button"
                              onClick={() => handleUnlock(v)}
                              className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-200 transition-colors"
                              title="Unlock Voucher (Super Admin)"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Regenerate PIN */}
                          {v.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleRegeneratePin(v)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              title="Regenerate Strong PIN"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {v.status === 'pending' && currentUser?.role === 'super_admin' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(v)}
                              className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 hover:bg-teal-200 transition-colors"
                              title="Approve Voucher"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Void Voucher */}
                          {v.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleVoid(v)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Void / Revoke Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Slip Modal */}
      <VoucherSlipModal
        voucher={selectedVoucherForSlip}
        isOpen={isSlipModalOpen}
        onClose={() => {
          setIsSlipModalOpen(false);
          setAutoPrintTrigger(false);
        }}
        onRedeemClick={v => handleOpenRedeem(v.voucherCode)}
        autoPrintOnOpen={autoPrintTrigger}
      />

      {/* Create Modal */}
      <VoucherCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={newVoucherOrBatch => {
          refreshVouchers();
          const shouldAuto = StorageService.getVoucherSettings().autoPrintOnCreation;
          if (Array.isArray(newVoucherOrBatch)) {
            // Batch created
            if (newVoucherOrBatch.length > 0) {
              handleOpenSlip(newVoucherOrBatch[0], shouldAuto);
            }
          } else {
            handleOpenSlip(newVoucherOrBatch, shouldAuto);
          }
        }}
      />

      {/* Redeem Modal */}
      <VoucherRedeemModal
        initialVoucherCode={redeemVoucherCode}
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        onSuccess={v => {
          refreshVouchers();
          handleOpenSlip(v, false);
        }}
      />
    </div>
  );
};
