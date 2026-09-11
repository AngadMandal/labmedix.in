import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import {
  HealthCardImpactReportService,
  HealthCardImpactReportData,
  ReportPeriodPreset,
  CardWiseBeneficiaryRecord
} from '../../services/healthCardImpactReportService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  HeartHandshake,
  Calendar,
  CreditCard,
  Users,
  Receipt,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Building,
  Sparkles,
  ArrowUpRight,
  UserCheck,
  Stethoscope,
  TestTube,
  Pill,
  Package,
  Layers,
  Award,
  ChevronRight,
  ShieldAlert,
  Download,
  Maximize2,
  Minimize2,
  Activity,
  Image as ImageIcon
} from 'lucide-react';

export const HealthCardImpactReportPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { companyProfile } = useSettings();
  const { showToast } = useToast();

  // Sovereign Security Check
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Period State
  const [periodPreset, setPeriodPreset] = useState<ReportPeriodPreset>('card_start_to_today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [reportVersion, setReportVersion] = useState<number>(1);

  // View Mode: Management Deep-Dive vs NGO / CSR Presentation View
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [displayLayout, setDisplayLayout] = useState<'table' | 'cards'>('table');

  // Table Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState<'bills' | 'gross' | 'discount' | 'savings' | 'family' | 'date'>('savings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected Card for Detail Drawer/Modal
  const [selectedCard, setSelectedCard] = useState<CardWiseBeneficiaryRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Export Loading
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Printable container ref
  const reportRef = useRef<HTMLDivElement>(null);

  // Generate Report Data (Memoized on filters & version trigger)
  const reportData: HealthCardImpactReportData = useMemo(() => {
    return HealthCardImpactReportService.generateReport({
      preset: periodPreset,
      startDate: customStartDate || undefined,
      endDate: customEndDate || undefined,
    });
  }, [periodPreset, customStartDate, customEndDate, reportVersion]);

  // Recalculate handler
  const handleRecalculate = () => {
    setReportVersion(v => v + 1);
    showToast('success', 'Report Recalculated', 'Report metrics successfully recalculated from live Firestore records.');
  };

  // Filtered & Sorted Card Records
  const filteredCards = useMemo(() => {
    return reportData.cardRecords.filter(card => {
      // Search
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesCardNo = card.cardNumber.toLowerCase().includes(query);
        const matchesName = card.cardholderName.toLowerCase().includes(query);
        const matchesPatId = card.patientId.toLowerCase().includes(query);
        const matchesMobile = card.mobile.includes(query);
        const matchesFamily = card.familyMembers.some(f => f.fullName.toLowerCase().includes(query));
        if (!matchesCardNo && !matchesName && !matchesPatId && !matchesMobile && !matchesFamily) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all' && card.status !== statusFilter) {
        return false;
      }

      // Tier
      if (tierFilter !== 'all' && card.tier.toLowerCase() !== tierFilter.toLowerCase()) {
        return false;
      }

      // Service Filter
      if (serviceFilter !== 'all') {
        if (!card.servicesUsed.includes(serviceFilter as any)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortBy) {
        case 'bills':
          valA = a.billsCount;
          valB = b.billsCount;
          break;
        case 'gross':
          valA = a.grossBill;
          valB = b.grossBill;
          break;
        case 'discount':
          valA = a.discount;
          valB = b.discount;
          break;
        case 'savings':
          valA = a.savings;
          valB = b.savings;
          break;
        case 'family':
          valA = a.familyMembersCount;
          valB = b.familyMembersCount;
          break;
        case 'date':
          return sortOrder === 'asc'
            ? a.startDate.localeCompare(b.startDate)
            : b.startDate.localeCompare(a.startDate);
        default:
          valA = a.savings;
          valB = b.savings;
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [reportData.cardRecords, searchQuery, statusFilter, serviceFilter, tierFilter, sortBy, sortOrder]);

  // Export handlers
  const handleExportExcel = () => {
    try {
      HealthCardImpactReportService.downloadExcel(reportData);
      showToast('success', 'Export Complete', 'Excel/CSV impact report generated and downloaded.');
    } catch (err: any) {
      showToast('error', 'Export Failed', err.message || 'Failed to export CSV');
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await HealthCardImpactReportService.exportPdf(
        'ngo-report-printable-area',
        `LabMedix_HealthCard_NGO_Impact_${reportData.startDate}_to_${reportData.endDate}.pdf`
      );
      showToast('success', 'PDF Exported', 'Official A4 Executive PDF generated successfully.');
    } catch (err: any) {
      showToast('error', 'Export Failed', err.message || 'Failed to export PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    HealthCardImpactReportService.printReport();
  };

  // If unauthorized role, render HTTP 403 screen
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">403 — Unauthorized Access</h1>
          <p className="text-sm text-slate-400 mb-6">
            The Health Card Impact & Beneficiary Report is restricted strictly to the Sovereign Super Administrator.
            Your role does not have authorization to view this data.
          </p>
          <div className="text-xs font-mono text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            User: {currentUser?.fullName || 'Anonymous'} | Role: {currentUser?.role || 'Guest'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* 1. Header & Executive Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                SUPER ADMIN PANEL ONLY
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <HeartHandshake className="w-3.5 h-3.5" />
                NGO / CSR / MANAGEMENT REPORT
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                LIVE FIRESTORE ENGINE
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Health Card Impact & Beneficiary Report
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Audit-grade analytics and beneficiary impact accounting for {companyProfile.name}.
              Accurately tracking cardholders, family coverage, service utilization, and financial savings.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle */}
            <button
              onClick={() => setPresentationMode(!presentationMode)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all duration-150 ${
                presentationMode
                  ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/50'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span>{presentationMode ? 'NGO Presentation Mode ON' : 'Switch to NGO Mode'}</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-2 shadow-xs transition-colors"
              title="Print official report"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Export Excel / CSV */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-2 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel (UTF-8 BOM)</span>
            </button>

            {/* Export A4 PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Export A4 PDF'}</span>
            </button>
          </div>
        </div>

        {/* 2. REPORT PERIOD SELECTOR (Section 1) */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Period:
            </span>

            {[
              { id: 'card_start_to_today', label: 'Card Start Date → Today' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'previous_year', label: 'Previous Year' },
              { id: 'custom', label: 'Custom Range' },
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setPeriodPreset(preset.id as ReportPeriodPreset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodPreset === preset.id
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date Range Badges / Inputs */}
          <div className="flex items-center gap-3 flex-wrap">
            {periodPreset === 'custom' ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate || reportData.startDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate || reportData.endDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
                <button
                  onClick={handleRecalculate}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                <span className="text-slate-400">From:</span>
                <span className="text-emerald-400 font-bold">{formatDate(reportData.startDate)}</span>
                <span className="text-slate-400">To:</span>
                <span className="text-blue-400 font-bold">{formatDate(reportData.endDate)}</span>
              </div>
            )}

            <button
              onClick={handleRecalculate}
              className="text-xs text-slate-400 hover:text-white underline ml-1"
            >
              Sync Fresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Printable Canvas Wrapper */}
      <div id="ngo-report-printable-area" ref={reportRef} className="space-y-6">

        {/* 3. TOP SUMMARY — NGO IMPACT (Section 2) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
          {/* Total Health Cards */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Health Cards</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {reportData.summary.totalHealthCards.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cards issued during selected reporting period.
            </p>
          </div>

          {/* Active Cards */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Cards</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight">
              {reportData.summary.activeCards.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cards currently in active verified status.
            </p>
          </div>

          {/* Total Cardholders */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Cardholders</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {reportData.summary.totalCardholders.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Unique primary enrolled cardholders.
            </p>
          </div>

          {/* Total Family Beneficiaries */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Family Beneficiaries</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-amber-300 tracking-tight">
              {reportData.summary.totalFamilyBeneficiaries.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Eligible family members linked to primary cards.
            </p>
          </div>

          {/* Total Beneficiaries (Primary + Family) */}
          <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden col-span-1 sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-indigo-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Beneficiaries Reach</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {reportData.summary.totalBeneficiaries.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-indigo-200/70 mt-1">
              Primary cardholders + eligible family dependents.
            </p>
          </div>

          {/* Total Bills */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Bills Finalized</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {reportData.summary.totalBills.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Eligible completed bills by Health Card users.
            </p>
          </div>

          {/* Total Bill Value (Gross) */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Bill Value</span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">GROSS</span>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-200 tracking-tight">
              {formatCurrency(reportData.summary.totalBillValue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Gross clinical value before health card subsidies.
            </p>
          </div>

          {/* Total Discount Provided */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Discount Provided</span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">BENEFIT</span>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(reportData.summary.totalDiscountProvided)}
            </div>
            <p className="text-[11px] text-emerald-200/70 mt-1">
              Actual financial subsidy delivered to beneficiaries.
            </p>
          </div>

          {/* Total Beneficiary Savings */}
          <div className="bg-gradient-to-br from-emerald-900/60 via-slate-900 to-blue-950/60 border-2 border-emerald-500/60 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-300 mb-2">
              <span className="text-xs font-black uppercase tracking-wider">Total Beneficiary Savings</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-emerald-300 tracking-tight">
              {formatCurrency(reportData.summary.totalBeneficiarySavings)}
            </div>
            <p className="text-[11px] text-emerald-200/80 mt-1 font-medium">
              Net savings realized through the Health Card program.
            </p>
          </div>
        </section>

        {/* 4. PROGRAM IMPACT STATISTICS FOR NGO/CSR (Section 10) */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Program Impact Statistics
              </h2>
              <p className="text-xs text-slate-400">
                Key performance indicators formatted for NGO, CSR board, and healthcare governance reports.
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full">
              CSR Metrics
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Beneficiary Reach</span>
              <span className="text-xl font-bold text-white block">
                {reportData.programStats.beneficiaryReach.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400">Unique individuals</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Service Utilization</span>
              <span className="text-xl font-bold text-blue-400 block">
                {reportData.programStats.serviceUtilization.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400">Eligible services used</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Financial Benefit</span>
              <span className="text-xl font-bold text-emerald-400 block">
                {formatCurrency(reportData.programStats.financialBenefit)}
              </span>
              <span className="text-[10px] text-slate-400">Discounts granted</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Card Utilization</span>
              <span className="text-xl font-bold text-purple-400 block">
                {reportData.programStats.cardUtilizationPercent}%
              </span>
              <span className="text-[10px] text-slate-400">Active cards utilized</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Avg Savings / Bill</span>
              <span className="text-xl font-bold text-amber-300 block">
                {formatCurrency(reportData.programStats.avgSavingsPerBill)}
              </span>
              <span className="text-[10px] text-slate-400">Per patient bill</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Avg Savings / Person</span>
              <span className="text-xl font-bold text-emerald-300 block">
                {formatCurrency(reportData.programStats.avgSavingsPerBeneficiary)}
              </span>
              <span className="text-[10px] text-slate-400">Per beneficiary</span>
            </div>
          </div>
        </section>

        {/* 5. SERVICE-WISE BENEFIT MATRIX (Section 9) & MONTHLY IMPACT TREND (Section 11) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Service Matrix */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Service-Wise Benefit Provided
                </h2>
                <p className="text-xs text-slate-400">
                  Itemized subsidy delivery across clinical departments.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                Section 9
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4">Service</th>
                    <th className="pb-3 px-3 text-right">Bills / Uses</th>
                    <th className="pb-3 px-3 text-right">Gross Value</th>
                    <th className="pb-3 px-3 text-right">Discount</th>
                    <th className="pb-3 px-3 text-right">Beneficiary Paid</th>
                    <th className="pb-3 pl-4 text-right">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {reportData.serviceMatrix.map(service => (
                    <tr key={service.serviceKey} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pr-4 font-sans font-semibold text-slate-200 flex items-center gap-2">
                        {service.serviceKey === 'doctor' && <Stethoscope className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        {service.serviceKey === 'laboratory' && <TestTube className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        {service.serviceKey === 'pharmacy' && <Pill className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {service.serviceKey === 'packages' && <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {service.serviceKey === 'others' && <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span>{service.serviceName}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">{service.billsCount}</td>
                      <td className="py-3 px-3 text-right text-slate-300">{formatCurrency(service.grossValue)}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-bold">{formatCurrency(service.discount)}</td>
                      <td className="py-3 px-3 text-right text-slate-200">{formatCurrency(service.beneficiaryPaid)}</td>
                      <td className="py-3 pl-4 text-right text-emerald-300 font-bold">{formatCurrency(service.savings)}</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-slate-700 font-bold bg-slate-950/50">
                    <td className="py-3 pr-4 font-sans text-white uppercase tracking-wider">TOTAL</td>
                    <td className="py-3 px-3 text-right text-white">{reportData.summary.totalBills}</td>
                    <td className="py-3 px-3 text-right text-white">{formatCurrency(reportData.summary.totalBillValue)}</td>
                    <td className="py-3 px-3 text-right text-emerald-400">{formatCurrency(reportData.summary.totalDiscountProvided)}</td>
                    <td className="py-3 px-3 text-right text-white">
                      {formatCurrency(reportData.summary.totalBillValue - reportData.summary.totalDiscountProvided)}
                    </td>
                    <td className="py-3 pl-4 text-right text-emerald-400">{formatCurrency(reportData.summary.totalBeneficiarySavings)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Trends & Most Active Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* Monthly Trend */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Monthly Impact Trend
                  </h2>
                  <p className="text-xs text-slate-400">Month-over-month growth and savings delivered.</p>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Section 11
                </span>
              </div>

              {reportData.monthlyTrends.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No monthly activity recorded in the selected period.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportData.monthlyTrends.slice(-5).map(trend => {
                    const maxSavings = Math.max(...reportData.monthlyTrends.map(m => m.savingsDelivered), 1);
                    const pct = Math.round((trend.savingsDelivered / maxSavings) * 100);
                    return (
                      <div key={trend.monthKey} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-white">{trend.monthLabel}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {formatCurrency(trend.savingsDelivered)} saved
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Cards: <strong className="text-slate-200">{trend.cardsIssued}</strong></span>
                          <span>Bills: <strong className="text-slate-200">{trend.billsGenerated}</strong></span>
                          <span>Benefit: <strong className="text-emerald-300">{formatCurrency(trend.discountProvided)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Most Active Health Cards (Section 12) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Most Active Health Cards
                  </h2>
                  <p className="text-xs text-slate-400">Highest utilization by finalized bills & savings.</p>
                </div>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  Top Utilizers
                </span>
              </div>

              <div className="space-y-2.5">
                {reportData.mostActiveCards.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No active card bills found for this period.
                  </div>
                ) : (
                  reportData.mostActiveCards.map((card, idx) => (
                    <div
                      key={card.cardId}
                      onClick={() => {
                        setSelectedCard(card);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-3 bg-slate-950/60 hover:bg-slate-850 rounded-xl border border-slate-800 hover:border-blue-500/40 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">
                          #{idx + 1}
                        </span>

                        {/* Photo Thumbnail */}
                        <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                          {card.photoAvailable && card.cardholderPhotoUrl ? (
                            <img src={card.cardholderPhotoUrl} alt={card.cardholderName} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {card.cardholderName}
                          </span>
                          <span className="text-[10px] font-mono text-blue-400 block truncate">
                            {card.cardNumber} • {card.billsCount} bills
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {formatCurrency(card.savings)}
                        </span>
                        <span className="text-[10px] text-slate-400">Total Saved</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 6. CARD-WISE BENEFICIARY SECTION (Section 3, 4, 13, 15) */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Card-Wise Beneficiary Impact
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">
                  {filteredCards.length} {filteredCards.length === 1 ? 'Card' : 'Cards'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Showing individual cardholder utilization, verified cardholder photos, family coverage, and savings.
              </p>
            </div>

            {/* Layout switch & sorting */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Table vs Photo Card Grid switch */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setDisplayLayout('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    displayLayout === 'table' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => setDisplayLayout('cards')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    displayLayout === 'cards' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photo Vouchers</span>
                </button>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-200 font-semibold focus:outline-hidden"
                >
                  <option value="savings" className="bg-slate-900">Highest Savings</option>
                  <option value="bills" className="bg-slate-900">Most Bills</option>
                  <option value="gross" className="bg-slate-900">Gross Billing</option>
                  <option value="family" className="bg-slate-900">Family Members</option>
                  <option value="date" className="bg-slate-900">Start Date</option>
                </select>
                <button
                  onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
                  className="text-blue-400 font-bold ml-1 hover:text-blue-300"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>
          </div>

          {/* Search & Filters Bar (Section 13) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Card No, Cardholder, UHID, Mobile, Family..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="all">All Card Statuses</option>
                <option value="active">Active Only</option>
                <option value="issued">Issued</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div>
              <select
                value={tierFilter}
                onChange={e => setTierFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="all">All Membership Tiers</option>
                <option value="standard">Standard</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="family_shield">Family Shield</option>
              </select>
            </div>

            {/* Service Filter */}
            <div>
              <select
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="all">All Services Used</option>
                <option value="doctor">Doctor Consultation</option>
                <option value="laboratory">Laboratory / Diagnostics</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="packages">Health Packages</option>
              </select>
            </div>
          </div>

          {/* TABLE VIEW (Section 3 & 4) */}
          {displayLayout === 'table' ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Photo</th>
                    <th className="py-3 px-4">Card No.</th>
                    <th className="py-3 px-4">Cardholder</th>
                    <th className="py-3 px-3">Start Date</th>
                    <th className="py-3 px-3 text-center">Family Members</th>
                    <th className="py-3 px-3 text-right">Bills</th>
                    <th className="py-3 px-3 text-right">Gross Bill</th>
                    <th className="py-3 px-3 text-right">Discount</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Savings</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                  {filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                        No health card records found matching your filters in the selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map(card => (
                      <tr key={card.cardId} className="hover:bg-slate-800/40 transition-colors">
                        {/* Actual Photo (Section 4) */}
                        <td className="py-3 px-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0">
                            {card.photoAvailable && card.cardholderPhotoUrl ? (
                              <img
                                src={card.cardholderPhotoUrl}
                                alt={card.cardholderName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px] font-sans font-bold text-slate-400 text-center leading-tight px-1">
                                Photo Not Available
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Card Number */}
                        <td className="py-3 px-4 font-bold text-blue-400">
                          <div>{card.cardNumber}</div>
                          <span className={`text-[10px] uppercase font-sans font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            card.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {card.status}
                          </span>
                        </td>

                        {/* Cardholder Details */}
                        <td className="py-3 px-4 font-sans">
                          <div className="font-bold text-white text-xs">{card.cardholderName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {card.patientId} • {card.mobile}
                          </div>
                        </td>

                        {/* Start Date */}
                        <td className="py-3 px-3 text-slate-300">
                          {formatDate(card.startDate)}
                        </td>

                        {/* Family Members Count */}
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold">
                            {card.familyMembersCount}
                          </span>
                        </td>

                        {/* Finalized Bills */}
                        <td className="py-3 px-3 text-right text-slate-300 font-bold">
                          {card.billsCount}
                        </td>

                        {/* Gross Bill */}
                        <td className="py-3 px-3 text-right text-slate-300">
                          {formatCurrency(card.grossBill)}
                        </td>

                        {/* Discount */}
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                          {formatCurrency(card.discount)}
                        </td>

                        {/* Paid */}
                        <td className="py-3 px-3 text-right text-slate-200">
                          {formatCurrency(card.netPaid)}
                        </td>

                        {/* Savings */}
                        <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                          {formatCurrency(card.savings)}
                        </td>

                        {/* Action Drawer Trigger */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedCard(card);
                              setIsDetailModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-sans font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center gap-1 mx-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* PHOTO VOUCHERS GALLERY (Section 15) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCards.map(card => (
                <div
                  key={card.cardId}
                  className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg relative flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Top Tag & Card No */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                        HEALTH CARD
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        card.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {card.status}
                      </span>
                    </div>

                    {/* Photo + Identity */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center shadow-md">
                        {card.photoAvailable && card.cardholderPhotoUrl ? (
                          <img src={card.cardholderPhotoUrl} alt={card.cardholderName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-[9px] text-slate-400 text-center font-bold px-1">
                            Photo Not Available
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white block truncate">{card.cardholderName}</span>
                        <span className="text-xs font-mono text-blue-400 block">{card.cardNumber}</span>
                        <span className="text-[10px] font-mono text-slate-400 block">{card.patientId}</span>
                      </div>
                    </div>

                    {/* Metadata stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 mb-3 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Start Date</span>
                        <span className="text-slate-200 font-semibold">{formatDate(card.startDate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Family Members</span>
                        <span className="text-slate-200 font-semibold">{card.familyMembersCount} Members</span>
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="space-y-1.5 text-xs font-mono border-t border-slate-800/80 pt-3 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Total Bills:</span>
                        <span className="text-white font-bold">{card.billsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Gross Billing:</span>
                        <span className="text-slate-300">{formatCurrency(card.grossBill)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Discount:</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(card.discount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Paid Amount:</span>
                        <span className="text-slate-200">{formatCurrency(card.netPaid)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800 text-emerald-300 font-bold">
                        <span className="font-sans">Total Savings:</span>
                        <span>{formatCurrency(card.savings)}</span>
                      </div>
                    </div>

                    {/* Services Used Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-4">
                      {card.servicesUsed.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic">No services utilized yet</span>
                      ) : (
                        card.servicesUsed.map(s => (
                          <span
                            key={s}
                            className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCard(card);
                      setIsDetailModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Card Benefit Drawer</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* 7. CARD-WISE FINANCIAL IMPACT MODAL / DRAWER (Section 5, 6, 7) */}
      {selectedCard && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Health Card Utilization — ${selectedCard.cardNumber}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Header with Photo & Details */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Photo Box */}
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-xl">
                {selectedCard.photoAvailable && selectedCard.cardholderPhotoUrl ? (
                  <img src={selectedCard.cardholderPhotoUrl} alt={selectedCard.cardholderName} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[10px] font-bold text-slate-400 text-center px-2">
                    Photo Not Available
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {selectedCard.tier}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    selectedCard.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedCard.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">{selectedCard.cardholderName}</h3>
                <div className="text-xs text-slate-400 font-mono mt-1 space-x-3">
                  <span>Card No: <strong className="text-blue-400">{selectedCard.cardNumber}</strong></span>
                  <span>UHID: <strong className="text-slate-300">{selectedCard.patientId}</strong></span>
                  <span>Mobile: <strong className="text-slate-300">{selectedCard.mobile}</strong></span>
                </div>

                <div className="text-xs text-slate-400 font-mono mt-1.5 space-x-3">
                  <span>Start Date: <strong className="text-slate-200">{formatDate(selectedCard.startDate)}</strong></span>
                  <span>Expiry Date: <strong className="text-slate-200">{formatDate(selectedCard.expiryDate)}</strong></span>
                </div>
              </div>

              {/* Savings Badge */}
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 text-center shrink-0 sm:min-w-[160px]">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block mb-1">
                  Total Beneficiary Savings
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono block">
                  {formatCurrency(selectedCard.savings)}
                </span>
                <span className="text-[10px] text-emerald-300/70 block mt-0.5">
                  Across {selectedCard.billsCount} Finalized Bills
                </span>
              </div>
            </div>

            {/* CARD START DATE → UTILIZATION JOURNEY (Section 6) */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-blue-400" />
                Card Start Date → Utilization Timeline
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Card Start Date</span>
                  <span className="font-bold text-slate-200">{selectedCard.journey.startDate}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Card Activated</span>
                  <span className="font-bold text-emerald-400">ACTIVE</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Services Used</span>
                  <span className="font-bold text-blue-400">{selectedCard.journey.servicesUsedCount}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Bills Generated</span>
                  <span className="font-bold text-slate-200">{selectedCard.journey.billsCount}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Discount Received</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(selectedCard.journey.discountReceived)}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Total Savings</span>
                  <span className="font-bold text-emerald-300">{formatCurrency(selectedCard.journey.totalSavings)}</span>
                </div>
              </div>
            </div>

            {/* SERVICE-WISE BENEFIT BREAKDOWN FOR THIS CARD (Section 5) */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Service-Wise Benefit Breakdown
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                      <th className="pb-2">Service Category</th>
                      <th className="pb-2 text-right">Uses / Bills</th>
                      <th className="pb-2 text-right">Gross Value</th>
                      <th className="pb-2 text-right">Discount</th>
                      <th className="pb-2 text-right">Amount Paid</th>
                      <th className="pb-2 text-right">Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[
                      { key: 'doctor', label: 'Doctor Consultation' },
                      { key: 'laboratory', label: 'Laboratory / Diagnostics' },
                      { key: 'pharmacy', label: 'Pharmacy Dispensing' },
                      { key: 'packages', label: 'Health Packages' },
                      { key: 'others', label: 'Other Services' },
                    ].map(s => {
                      const item = selectedCard.serviceBreakdown[s.key] || { uses: 0, gross: 0, discount: 0, paid: 0, savings: 0 };
                      return (
                        <tr key={s.key} className="hover:bg-slate-800/30">
                          <td className="py-2.5 font-sans font-semibold text-slate-200">{s.label}</td>
                          <td className="py-2.5 text-right text-slate-300">{item.uses}</td>
                          <td className="py-2.5 text-right text-slate-300">{formatCurrency(item.gross)}</td>
                          <td className="py-2.5 text-right text-emerald-400 font-bold">{formatCurrency(item.discount)}</td>
                          <td className="py-2.5 text-right text-slate-200">{formatCurrency(item.paid)}</td>
                          <td className="py-2.5 text-right text-emerald-300 font-bold">{formatCurrency(item.savings)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FAMILY BENEFICIARY INFORMATION (Section 7) */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Family Beneficiary Information
                </h4>
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {selectedCard.familyMembers.length} Linked Family Members
                </span>
              </div>

              {selectedCard.familyMembers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No family members currently registered under this health card.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCard.familyMembers.map((fam, idx) => (
                    <div key={fam.patientId} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-white block">{fam.fullName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {fam.relationship} {fam.age ? `• ${fam.age} yrs` : ''} {fam.gender ? `• ${fam.gender}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs">
                        <span className="text-slate-300 block">{fam.billsCount} bills</span>
                        <span className="text-emerald-400 font-bold block">{formatCurrency(fam.savings)} saved</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Close Action */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HealthCardImpactReportPage;
