import React, { useState, useMemo } from 'react';
import { StorageService } from '../../services/storage';
import { WalletService } from '../../services/walletService';
import { PatientService } from '../../services/patientService';
import { Wallet, WalletTransaction, Patient, TransactionType, HealthCard, Membership } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatsCard } from '../../components/common/StatsCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { VirtualHealthCardWidget } from '../../components/wallet/VirtualHealthCardWidget';
import { WalletReceiptModal, WalletTransactionModal } from '../../components/wallet/WalletTransactionModal';
import { AutoPaymentPOSModal } from '../../components/wallet/AutoPaymentPOSModal';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { useToast } from '../../context/ToastContext';
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
  CreditCard,
  Building,
  RotateCcw,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Lock,
  Unlock,
  Activity,
  CheckCircle2,
  Stethoscope,
  FlaskConical,
  Receipt,
  UserCheck,
  Layers,
  Clock,
  Flame,
  Eye,
  Pill,
  CalendarCheck,
  Building2,
  Percent,
  AlertTriangle,
  QrCode,
  Check,
  HelpCircle,
  Copy,
  ScanLine
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const WalletDashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const currentUser = StorageService.getCurrentUser();
  const [wallets, setWallets] = useState<Wallet[]>(() => WalletService.getAllWallets());
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => WalletService.getTransactions());
  const [activeReceiptTxn, setActiveReceiptTxn] = useState<WalletTransaction | null>(null);

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<'auto_pos' | 'card_search_3d' | 'ledger' | 'wallets_directory' | 'float_analytics'>('auto_pos');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit' | 'refund'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 3D Card ID Search System State
  const [cardSearchInput, setCardSearchInput] = useState('');
  const [searchedPatient, setSearchedPatient] = useState<Patient | null>(null);
  const [searchedCard, setSearchedCard] = useState<HealthCard | null>(null);
  const [searchedMembership, setSearchedMembership] = useState<Membership | null>(null);
  const [searchedWallet, setSearchedWallet] = useState<Wallet | null>(null);

  // Transaction Modal State
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [defaultTxnType, setDefaultTxnType] = useState<TransactionType>('credit');

  // Auto-Payment POS Modal State
  const [isAutoPOSModalOpen, setIsAutoPOSModalOpen] = useState(false);
  const [posPatientId, setPosPatientId] = useState<string>('');

  // Patient Selection Modal for Quick Deposit / Deduction
  const [isPatientSelectModalOpen, setIsPatientSelectModalOpen] = useState(false);

  const patients = PatientService.getAll();
  const cards = StorageService.getCards();
  const memberships = StorageService.getMemberships();
  const company = StorageService.getCompanyProfile();

  // Core Financial Metric Calculations
  const totalFloat = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);
  const totalCredits = wallets.reduce((acc, w) => acc + (w.totalCredits || 0), 0);
  const totalDebits = wallets.reduce((acc, w) => acc + (w.totalDebits || 0), 0);
  const activeWalletsCount = wallets.filter(w => w.status === 'active').length;

  const refreshData = () => {
    setWallets(WalletService.getAllWallets());
    setTransactions(WalletService.getTransactions());
  };

  React.useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => {
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  // 3D Card Search Engine Execution
  const handlePerform3DCardSearch = (term: string) => {
    const q = term.trim().toLowerCase();
    if (!q) {
      setSearchedPatient(null);
      setSearchedCard(null);
      setSearchedMembership(null);
      setSearchedWallet(null);
      return;
    }

    // Search by Card Number, Verification Code, Patient ID, or Phone
    const matchedCard = cards.find(
      c => c.cardNumber.toLowerCase().includes(q) || c.verificationCode.toLowerCase().includes(q)
    );

    let pat: Patient | undefined;
    if (matchedCard) {
      pat = patients.find(p => p.id === matchedCard.patientId);
    } else {
      pat = patients.find(
        p => p.id.toLowerCase().includes(q) ||
             p.fullName.toLowerCase().includes(q) ||
             (p.mobile && p.mobile.includes(q))
      );
    }

    if (pat) {
      const card = cards.find(c => c.patientId === pat.id && c.status === 'active') || null;
      const mem = card ? memberships.find(m => m.id === card.membershipId) || null : null;
      const wall = wallets.find(w => w.patientId === pat.id) || WalletService.getByPatientId(pat.id) || null;

      setSearchedPatient(pat);
      setSearchedCard(card);
      setSearchedMembership(mem);
      setSearchedWallet(wall);
      showToast('success', 'Cardholder Located', `Retrieved real-time escrow balance for ${pat.fullName}.`);
    } else {
      setSearchedPatient(null);
      setSearchedCard(null);
      setSearchedMembership(null);
      setSearchedWallet(null);
      showToast('error', 'Not Found', `No cardholder matched query "${term}".`);
    }
  };

  // Open Transaction Modal for a specific patient
  const handleOpenTransactionForPatient = (p: Patient, type: TransactionType = 'credit') => {
    let w = wallets.find(wall => wall.patientId === p.id) || WalletService.getByPatientId(p.id) || {
      id: `wal_${p.id}`,
      patientId: p.id,
      balance: 0,
      totalCredits: 0,
      totalDebits: 0,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedPatient(p);
    setSelectedWallet(w);
    setDefaultTxnType(type);
    setIsTxnModalOpen(true);
    setIsPatientSelectModalOpen(false);
  };

  // Open Auto-POS for a specific patient
  const handleOpenPOSForPatient = (p: Patient) => {
    setPosPatientId(p.id);
    setIsAutoPOSModalOpen(true);
  };

  // 1-Click Fast Quick Deposit Action
  const handleQuickGlobalAction = (type: TransactionType) => {
    if (patients.length === 0) {
      showToast('error', 'No Patients', 'Please register a patient first.');
      return;
    }
    setDefaultTxnType(type);
    setIsPatientSelectModalOpen(true);
  };

  // 1-Click Fast Transaction Action
  const handleFastAction = (presetAmount: number, presetType: TransactionType, note: string) => {
    const targetPatient = patients[0];
    if (!targetPatient) {
      showToast('error', 'No Patient Found', 'Register a patient first.');
      return;
    }

    const res = WalletService.addTransaction(
      targetPatient.id,
      presetType,
      presetAmount,
      note
    );

    if (res.error) {
      showToast('error', 'Action Failed', res.error);
    } else {
      triggerCelebrationFireworks();
      showToast('success', '1-Click Settlement Completed', `${presetType.toUpperCase()} of ${formatCurrency(presetAmount)} settled for ${targetPatient.fullName}.`);
      refreshData();
      setActiveReceiptTxn(res.transaction);
    }
  };

  // Toggle Wallet Frozen / Active Status
  const handleToggleWalletFreeze = (wallet: Wallet) => {
    const newStatus = wallet.status === 'active' ? 'frozen' : 'active';
    WalletService.updateWalletStatus(wallet.id, newStatus);
    showToast(newStatus === 'frozen' ? 'warning' : 'success', 'Wallet Status Updated', `Wallet for ${wallet.patientId} is now ${newStatus.toUpperCase()}.`);
    refreshData();
  };

  // Quick Direct 80mm POS Print from row
  const handleQuickPrint80mm = (t: WalletTransaction) => {
    const pat = patients.find(p => p.id === t.patientId);
    const crd = cards.find(c => c.patientId === t.patientId && c.status === 'active');
    const mem = crd ? memberships.find(m => m.id === crd.membershipId) : null;
    const printWin = window.open('', '_blank', 'width=450,height=680');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${t.referenceNo}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: monospace, sans-serif; font-size: 11px; margin: 0; padding: 6px; color: #000; -webkit-print-color-adjust: exact !important; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .reason-box { border: 1px dashed #000; background: #fafafa; padding: 6px; margin: 6px 0; }
            .total { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; font-weight: bold; font-size: 12px; margin: 8px 0; }
            .footer { text-align: center; margin-top: 10px; font-size: 8.5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; font-size: 14px;">${company.name || 'LABMEDIX'}</h2>
            <p style="margin:2px 0; font-size: 10px;">${company.tagline || 'Confident In Care'}</p>
            <p style="margin:2px 0; font-size: 8.5px;">Helpline: ${company.helpline || '1800-889-9911'} • ${company.address || 'Kolkata'}</p>
          </div>
          <div class="row"><span>Receipt No:</span><strong>${t.referenceNo}</strong></div>
          <div class="row"><span>Date/Time:</span><span>${formatDateTime(t.date)}</span></div>
          <div class="row"><span>Patient:</span><strong>${pat?.fullName || t.patientId}</strong></div>
          <div class="row"><span>Patient ID:</span><span>${t.patientId}</span></div>
          <div class="row"><span>Card UID:</span><span>${crd?.cardNumber || 'N/A'}</span></div>
          <div class="row"><span>Card Tier:</span><strong>${mem?.name || 'Standard'}</strong></div>

          <!-- REASON FOR BALANCE DEDUCTION / CREDIT -->
          <div class="reason-box">
            <span style="font-size: 9px; text-transform: uppercase; color: #333; font-weight: bold; display: block;">REASON FOR BALANCE SETTLEMENT:</span>
            <p style="margin: 3px 0 0 0; font-size: 10px;">${t.notes}</p>
          </div>

          <div class="row"><span>Opening Float:</span><span>₹${t.openingBalance}</span></div>
          <div class="row total"><span>SETTLED AMOUNT:</span><span>${t.type === 'credit' ? '+' : '-'}₹${t.amount}</span></div>
          <div class="row"><span>Closing Float:</span><strong>₹${t.closingBalance}</strong></div>
          <p style="margin: 2px 0; font-size: 8.5px; color: #555;">Cashier: ${t.createdBy}</p>
          <div class="footer">
            <p>*** OFFICIAL ELECTRONIC CASHLESS RECEIPT ***</p>
            <p>ISO 9001:2015 ACCREDITED • ${company.website || 'labmedix.org'}</p>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 300);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Export Complete Financial Ledger CSV
  const handleExportLedgerCsv = () => {
    const headers = ['Reference No', 'Date & Time', 'Patient Name', 'Patient ID', 'Type', 'Amount (INR)', 'Opening Balance', 'Closing Balance', 'Purpose / Notes', 'Operator'];
    const rows = filteredTransactions.map((t) => {
      const p = patients.find(pat => pat.id === t.patientId);
      return [
        t.referenceNo,
        `"${formatDateTime(t.date)}"`,
        `"${p?.fullName || t.patientId}"`,
        t.patientId,
        t.type.toUpperCase(),
        t.amount,
        t.openingBalance,
        t.closingBalance,
        `"${t.notes.replace(/"/g, '""')}"`,
        `"${t.createdBy}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LABMEDIX_WALLET_LEDGER_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    triggerCelebrationFireworks();
    showToast('success', 'Ledger Exported', 'Downloaded complete financial wallet statement CSV.');
  };

  // Filtered Transactions & Duplicate Detection Scanner
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = patients.find(pat => pat.id === t.patientId);
        const matchesRef = t.referenceNo.toLowerCase().includes(q);
        const matchesPid = t.patientId.toLowerCase().includes(q);
        const matchesNotes = t.notes.toLowerCase().includes(q);
        const matchesName = p ? p.fullName.toLowerCase().includes(q) : false;
        return matchesRef || matchesPid || matchesNotes || matchesName;
      }
      return true;
    });
  }, [transactions, typeFilter, searchQuery, patients]);

  // Transaction Ledger Columns
  const columns: Column<WalletTransaction>[] = [
    {
      header: 'Reference & Time',
      accessor: (t) => (
        <div>
          <strong className="font-mono text-xs text-slate-900 dark:text-white block">{t.referenceNo}</strong>
          <span className="font-mono text-[10px] text-slate-400">{formatDateTime(t.date)}</span>
        </div>
      )
    },
    {
      header: 'Patient Details',
      accessor: (t) => {
        const p = patients.find(pat => pat.id === t.patientId);
        const crd = cards.find(c => c.patientId === t.patientId && c.status === 'active');
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-500/30">
              {p?.fullName ? p.fullName.charAt(0) : 'P'}
            </div>
            <div className="text-xs">
              <strong className="text-slate-900 dark:text-white block">{p?.fullName || t.patientId}</strong>
              <span className="text-[10px] text-slate-500 font-mono">{t.patientId} • {crd?.cardNumber || 'NFC'}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Action Type',
      accessor: (t) => (
        <span className={`px-2.5 py-1 rounded-xl font-bold uppercase text-[10px] border inline-flex items-center gap-1 ${
          t.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
          t.type === 'debit' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' :
          'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        }`}>
          {t.type === 'credit' ? <ArrowDownRight className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-rose-500" />}
          {t.type}
        </span>
      )
    },
    {
      header: 'Amount Settled',
      accessor: (t) => (
        <strong className={`text-sm font-black font-mono ${
          t.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
        }`}>
          {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
        </strong>
      )
    },
    {
      header: 'Closing Float',
      accessor: (t) => (
        <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
          {formatCurrency(t.closingBalance)}
        </span>
      )
    },
    {
      header: 'Verification & UTR',
      accessor: (t) => (
        <div className="space-y-0.5 text-xs">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border inline-flex items-center gap-1 ${
            t.verificationStatus === 'verified' || !t.verificationStatus
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : t.verificationStatus === 'pending_verification'
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
          }`}>
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>{t.verificationStatus === 'verified' || !t.verificationStatus ? 'Verified ✓' : t.verificationStatus}</span>
          </span>
          {t.utrNumber && (
            <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={t.utrNumber}>
              UTR: {t.utrNumber}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Reason for Balance Movement',
      accessor: (t) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate block font-medium">
          {t.notes}
        </span>
      )
    },
    {
      header: 'Receipt & Actions',
      className: 'text-right',
      accessor: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Receipt className="w-3.5 h-3.5" />}
            onClick={() => setActiveReceiptTxn(t)}
            title="View & Print Official Receipt"
          >
            Receipt
          </Button>

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => handleQuickPrint80mm(t)}
            title="Quick 1-Click 80mm POS Thermal Print"
          >
            POS Print
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP EXECUTIVE COMMAND BAR WITH 3D AMBIENT LIGHTING & DYNAMIC LOGO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white border border-slate-700/80 shadow-2xl">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" theme="white" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Patient Health Wallet Command Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  100% RECONCILED & ANTI-DUPLICATE SECURE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Real-time prepaid escrow ledger, itemized balance deduction reasons, 3D card ID search engine, and anti-duplicate audit receipts.
              </p>
            </div>
          </div>

          {/* Action Command Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-amber-500 via-teal-400 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black border-none shadow-lg shadow-amber-500/20 scale-[1.03]"
              leftIcon={<Zap className="w-4 h-4 text-slate-950" />}
              onClick={() => setIsAutoPOSModalOpen(true)}
            >
              Auto-Payment POS (Card Discount)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ScanLine className="w-4 h-4 text-teal-400" />}
              onClick={() => setActiveTab('card_search_3d')}
            >
              3D Card Search
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 text-emerald-400" />}
              onClick={() => handleQuickGlobalAction('credit')}
              className="bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700"
            >
              Deposit Funds
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
              onClick={handleExportLedgerCsv}
              className="bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700"
            >
              Export CSV
            </Button>

            {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'reception' || currentUser?.role === 'card_operator') && (
              <a
                href="#/cash-desk-vouchers"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 transition-all shadow-md"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Cash Desk Vouchers</span>
              </a>
            )}
          </div>
        </div>

        {/* 1-Click Fast Settlement Simulator Bar */}
        <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1 mr-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> 1-Click Fast Settlements:
          </span>
          {[
            { label: '⚡ Doctor Appointment (Card Disc)', amount: 640, type: 'debit' as const, note: '[AUTO-POS] Sr. Cardiologist Consult • Gross: ₹800 - 20% Card Disc = ₹640' },
            { label: '⚡ Comprehensive Lab (25% Disc)', amount: 1875, type: 'debit' as const, note: '[AUTO-POS] Full Body Checkup (68 Tests) • Gross: ₹2,500 - 25% Card Disc = ₹1,875' },
            { label: '⚡ Pharmacy Medicine (15% Disc)', amount: 1572, type: 'debit' as const, note: '[AUTO-POS] Cardiac Prescription • Gross: ₹1,850 - 15% Card Disc = ₹1,572' },
            { label: '+₹5,000 Surgery Escrow Deposit', amount: 5000, type: 'credit' as const, note: 'Daycare OT & Surgery Escrow Cashless Deposit' },
            { label: '+₹2,000 OPD Prepaid Float', amount: 2000, type: 'credit' as const, note: 'Front Desk OPD Cashless Wallet Top-up' }
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFastAction(preset.amount, preset.type, preset.note)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono bg-slate-800 hover:bg-slate-700 text-teal-200 border border-slate-700 transition-all flex items-center gap-1"
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. 3D VIRTUAL HEALTH CARD + 3 ISOMETRIC METRIC CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 4 Cols: 3D Interactive Virtual Health Card Flip Widget */}
        <div className="lg:col-span-4 flex justify-center">
          <VirtualHealthCardWidget
            balance={totalFloat}
            totalCredits={totalCredits}
            totalDebits={totalDebits}
            company={company}
            holderName={patients[0]?.fullName || `${company.name || 'LABMEDIX'} FLOAT`}
            patientId={patients[0]?.id || 'LMDX-HQ-FLOAT'}
          />
        </div>

        {/* Right 8 Cols: 3 Metric Stats Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Deposits (Credits)</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <strong className="text-2xl font-black text-slate-900 dark:text-white block font-mono">
              {formatCurrency(totalCredits)}
            </strong>
            <span className="text-[10px] text-slate-400 block font-mono">
              Lifetime patient top-ups
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Total Deductions (Debits)</span>
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <strong className="text-2xl font-black text-slate-900 dark:text-white block font-mono">
              {formatCurrency(totalDebits)}
            </strong>
            <span className="text-[10px] text-slate-400 block font-mono">
              OPD, Lab & Pharmacy bills
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Active Patient Wallets</span>
              <UserCheck className="w-4 h-4 text-teal-500" />
            </div>
            <strong className="text-2xl font-black text-teal-600 dark:text-teal-400 block font-mono">
              {activeWalletsCount}/{wallets.length}
            </strong>
            <span className="text-[10px] text-emerald-600 font-bold block">
              ● 100% Cashless Ready
            </span>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION VIEW TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs font-bold">
        {[
          { id: 'auto_pos' as const, name: '⚡ Cashless POS (Auto Card Discount)', icon: Zap },
          { id: 'card_search_3d' as const, name: '🔍 3D Card ID & Patient Search', icon: ScanLine },
          { id: 'ledger' as const, name: `📋 Live Ledger (${transactions.length})`, icon: Receipt },
          { id: 'wallets_directory' as const, name: `💳 Patient Wallets (${wallets.length})`, icon: WalletIcon },
          { id: 'float_analytics' as const, name: '📊 Cashless Analytics', icon: Activity }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 4. TAB CONTENTS */}
      {/* ================= TAB 0: 3D CARD ID & PATIENT SEARCH ENGINE ================= */}
      {activeTab === 'card_search_3d' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white border border-slate-700 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
                <ScanLine className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  3D Card ID & Cashless Escrow Verification Terminal
                </h3>
                <p className="text-xs text-slate-300">
                  Instant optical scan & lookup by Card ID (e.g. <code>LHC-2026-000001</code>), Verification Code, Patient ID, or Phone.
                </p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan or enter Card ID (LHC-...), Verification Code (VER-...), Patient ID (LMDX-P-...), or Mobile..."
                  value={cardSearchInput}
                  onChange={(e) => {
                    setCardSearchInput(e.target.value);
                    handlePerform3DCardSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePerform3DCardSearch(cardSearchInput);
                  }}
                  className="w-full text-sm pl-11 pr-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-teal-400 font-mono"
                />
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                leftIcon={<Search className="w-4 h-4" />}
                onClick={() => handlePerform3DCardSearch(cardSearchInput)}
              >
                Search Card
              </Button>
            </div>
          </div>

          {/* Searched Card Result 3D View */}
          {searchedPatient && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-500/40 shadow-xl space-y-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {searchedPatient.photoUrl ? (
                      <img src={searchedPatient.photoUrl} alt={searchedPatient.fullName} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      searchedPatient.fullName.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {searchedPatient.fullName}
                      </h2>
                      {searchedMembership && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 dark:bg-amber-950 border border-amber-300">
                          {searchedMembership.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      ID: <strong>{searchedPatient.id}</strong> • Mobile: <strong>{searchedPatient.mobile}</strong> • Card: <strong className="text-teal-600">{searchedCard?.cardNumber || 'NFC Active'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Zap className="w-4 h-4 text-amber-300" />}
                    onClick={() => handleOpenPOSForPatient(searchedPatient)}
                  >
                    ⚡ Auto-POS Deduct (Card Disc)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => handleOpenTransactionForPatient(searchedPatient, 'credit')}
                  >
                    + Deposit Float
                  </Button>
                </div>
              </div>

              {/* 3D Metric Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Available Health Float</span>
                  <strong className="text-xl font-black text-emerald-600 font-mono block">
                    {formatCurrency(searchedWallet?.balance || 0)}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">OPD & Doctor Discount</span>
                  <strong className="text-xl font-black text-blue-600 font-mono block">
                    {searchedMembership?.opdDiscount || 0}% OFF
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Lab & Pathology Discount</span>
                  <strong className="text-xl font-black text-purple-600 font-mono block">
                    {searchedMembership?.labDiscount || 0}% OFF
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Pharmacy Discount</span>
                  <strong className="text-xl font-black text-teal-600 font-mono block">
                    {searchedMembership?.pharmacyDiscount || 0}% OFF
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 1: AUTOMATED CASHLESS POS TERMINAL ================= */}
      {activeTab === 'auto_pos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: '👨‍⚕️ Doctor Appointment Booking',
                desc: 'Specialist consultation fee with auto OPD discount',
                rate: '20% - 30% Card Discount',
                action: 'Book & Auto-Debit',
                color: 'from-blue-900/40 to-slate-900 border-blue-500/40 text-blue-400'
              },
              {
                title: '🔬 Diagnostic Pathology & Lab',
                desc: 'Full body health packages, CBC, Lipid, HbA1c',
                rate: '25% - 35% Card Discount',
                action: 'Order Lab Tests',
                color: 'from-purple-900/40 to-slate-900 border-purple-500/40 text-purple-400'
              },
              {
                title: '💊 In-House Pharmacy Dispensation',
                desc: 'Prescription medicines with cardholder discount',
                rate: '15% - 20% Card Discount',
                action: 'Dispense Medicines',
                color: 'from-emerald-900/40 to-slate-900 border-emerald-500/40 text-emerald-400'
              },
              {
                title: '🏥 Emergency & Daycare Admission',
                desc: 'Daycare OT procedures & trauma cashless advance',
                rate: 'Priority Cashless Escrow',
                action: 'Admit Cashless',
                color: 'from-amber-900/40 to-slate-900 border-amber-500/40 text-amber-400'
              }
            ].map((card, i) => (
              <div
                key={i}
                className={`p-5 rounded-3xl bg-gradient-to-br ${card.color} border shadow-lg space-y-3 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-950 text-amber-300 border border-slate-800">
                      {card.rate}
                    </span>
                  </div>
                  <strong className="text-sm font-black text-white block mt-2">
                    {card.title}
                  </strong>
                  <p className="text-xs text-slate-400 mt-1">
                    {card.desc}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  leftIcon={<Zap className="w-4 h-4" />}
                  onClick={() => setIsAutoPOSModalOpen(true)}
                >
                  {card.action}
                </Button>
              </div>
            ))}
          </div>

          {/* Quick POS Terminal Banner */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <strong className="text-base font-black text-slate-900 dark:text-white block">
                  Automatic Health Card Discount Engine Active
                </strong>
                <p className="text-xs text-slate-500">
                  Every doctor consult, lab test, and pharmacy bill auto-detects patient card tier and debits only the discounted net balance.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Zap className="w-4 h-4" />}
              onClick={() => setIsAutoPOSModalOpen(true)}
            >
              Launch Auto-POS Terminal
            </Button>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIVE TRANSACTION LEDGER ================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ledger by Reference No, Patient Name, Card ID, Reason for Deduction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                {[
                  { id: 'all' as const, label: 'All Actions' },
                  { id: 'credit' as const, label: '💳 Deposits' },
                  { id: 'debit' as const, label: '🏥 Deductions' },
                  { id: 'refund' as const, label: '↩️ Refunds' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTypeFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      typeFilter === f.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Transaction Ledger Table */}
          <DataTable
            data={filteredTransactions}
            columns={columns}
            keyExtractor={(t) => t.id}
            emptyTitle="No wallet transactions found"
            emptyDescription="Transactions will appear here when patients deposit funds or redeem OPD/Lab bills."
          />
        </div>
      )}

      {/* ================= TAB 3: PATIENT WALLETS DIRECTORY ================= */}
      {activeTab === 'wallets_directory' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <WalletIcon className="w-5 h-5 text-teal-500" />
                  Patient Health Wallets Directory ({wallets.length} Accounts)
                </h3>
                <p className="text-xs text-slate-500">Live balance monitoring, fast credit/debit commands, and fraud prevention locks</p>
              </div>

              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleQuickGlobalAction('credit')}
              >
                Deposit to Any Patient
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((wallet) => {
                const pat = patients.find(p => p.id === wallet.patientId);
                const crd = cards.find(c => c.patientId === wallet.patientId && c.status === 'active');
                const mem = crd ? memberships.find(m => m.id === crd.membershipId) : null;

                return (
                  <div
                    key={wallet.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border">
                          {wallet.patientId}
                        </span>
                        <div className="flex items-center gap-1">
                          {mem && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase font-mono">
                              {mem.name.split(' ')[0]}
                            </span>
                          )}
                          <Badge variant={wallet.status === 'active' ? 'success' : 'danger'} size="sm">
                            {wallet.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-2">
                        <strong className="text-sm font-black text-slate-900 dark:text-white block">
                          {pat?.fullName || 'Patient Account'}
                        </strong>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {pat?.mobile || 'No contact phone'} • Card: {crd?.cardNumber || 'NFC'}
                        </span>
                      </div>

                      <div className="my-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Float Balance</span>
                        <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(wallet.balance)}
                        </strong>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-1">
                        <div>
                          <span>Deposits:</span>
                          <strong className="text-emerald-600 block">+{formatCurrency(wallet.totalCredits)}</strong>
                        </div>
                        <div>
                          <span>Deductions:</span>
                          <strong className="text-rose-600 block">-{formatCurrency(wallet.totalDebits)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Command Buttons */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      {pat && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            className="flex-1"
                            leftIcon={<Zap className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenPOSForPatient(pat)}
                          >
                            Auto-POS
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => handleOpenTransactionForPatient(pat, 'credit')}
                          >
                            + Deposit
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleToggleWalletFreeze(wallet)}
                            className="p-1.5 rounded-lg border text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                            title={wallet.status === 'active' ? 'Freeze Wallet' : 'Unfreeze Wallet'}
                          >
                            {wallet.status === 'active' ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CASHLESS LIQUIDITY ANALYTICS ================= */}
      {activeTab === 'float_analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" />
                Daily Prepaid Deposit vs Deduction Flow
              </h3>
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { day: 'Mon', credits: 12000, debits: 7400 },
                      { day: 'Tue', credits: 18500, debits: 11200 },
                      { day: 'Wed', credits: 15000, debits: 9800 },
                      { day: 'Thu', credits: 24000, debits: 16500 },
                      { day: 'Fri', credits: 21000, debits: 14000 },
                      { day: 'Sat', credits: 29000, debits: 21000 },
                      { day: 'Sun', credits: 19500, debits: 12300 }
                    ]}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="credits" name="Deposits (Credits ₹)" stroke="#10B981" strokeWidth={3} fill="url(#colorCredit)" />
                    <Area type="monotone" dataKey="debits" name="Deductions (Debits ₹)" stroke="#EF4444" strokeWidth={3} fill="url(#colorDebit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Deductions by Category</h3>
              <p className="text-xs text-slate-500">Service utilization breakdown</p>

              <div className="space-y-2 pt-2">
                {[
                  { label: 'Pathology & Diagnostic Tests', pct: 45, amt: totalDebits * 0.45, color: 'bg-teal-500' },
                  { label: 'OPD Doctor Consultations', pct: 35, amt: totalDebits * 0.35, color: 'bg-blue-500' },
                  { label: 'Pharmacy Medicine Dispensation', pct: 15, amt: totalDebits * 0.15, color: 'bg-purple-500' },
                  { label: 'Daycare & Treatment Advance', pct: 5, amt: totalDebits * 0.05, color: 'bg-amber-500' }
                ].map((cat, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{cat.label}</span>
                      <span className="font-mono">{formatCurrency(cat.amt)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automated Cashless POS Modal (Card Discount Engine) */}
      {isAutoPOSModalOpen && (
        <AutoPaymentPOSModal
          isOpen={isAutoPOSModalOpen}
          onClose={() => setIsAutoPOSModalOpen(false)}
          initialPatientId={posPatientId}
          onPaymentSuccess={(txn, updatedWallet) => {
            refreshData();
            setActiveReceiptTxn(txn);
          }}
        />
      )}

      {/* Patient Selection Modal for Quick Deposit / Deduct */}
      <Modal
        isOpen={isPatientSelectModalOpen}
        onClose={() => setIsPatientSelectModalOpen(false)}
        title={`Select Patient for Health Wallet ${defaultTxnType.toUpperCase()}`}
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-slate-500">
            Choose a registered patient from the directory to execute an instant cashless deposit or bill deduction:
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl overflow-hidden">
            {patients.map((p) => {
              const wall = wallets.find(w => w.patientId === p.id);
              const crd = cards.find(c => c.patientId === p.id && c.status === 'active');
              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenTransactionForPatient(p, defaultTxnType)}
                  className="p-3.5 hover:bg-teal-50/60 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-sm">
                      {p.fullName.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-xs text-slate-900 dark:text-white block">{p.fullName}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{p.id} • {crd?.cardNumber || 'NFC'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Available Float:</span>
                    <strong className="text-xs font-black text-emerald-600 font-mono">
                      {formatCurrency(wall?.balance || 0)}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsPatientSelectModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dedicated Transaction Modal */}
      {selectedPatient && selectedWallet && (
        <WalletTransactionModal
          isOpen={isTxnModalOpen}
          onClose={() => {
            setIsTxnModalOpen(false);
            setSelectedPatient(null);
            setSelectedWallet(null);
          }}
          patient={selectedPatient}
          wallet={selectedWallet}
          defaultType={defaultTxnType}
          onSuccess={(txn, updatedWallet) => {
            refreshData();
            setActiveReceiptTxn(txn);
          }}
        />
      )}

      {/* Dedicated 80mm / A4 Receipt Modal */}
      {activeReceiptTxn && (
        <WalletReceiptModal
          isOpen={!!activeReceiptTxn}
          onClose={() => setActiveReceiptTxn(null)}
          transaction={activeReceiptTxn}
          patient={patients.find(p => p.id === activeReceiptTxn.patientId)}
        />
      )}
    </div>
  );
};