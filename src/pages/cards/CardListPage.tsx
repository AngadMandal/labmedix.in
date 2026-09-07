import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardService } from '../../services/cardService';
import { PatientService } from '../../services/patientService';
import { StorageService } from '../../services/storage';
import { PortalService, PatientReceiptData } from '../../services/portalService';
import { ApiSyncService } from '../../services/apiSyncService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge, CardStatusBadge } from '../../components/common/Badge';
import { CardRenewalModal } from './CardRenewalModal';
import { CardReplacementModal } from './CardReplacementModal';
import { CardApplicationReviewModal } from '../../components/card/CardApplicationReviewModal';
import { CreateCardRequestModal } from '../../components/card/CreateCardRequestModal';
import { StaffCardRequestBillSlipModal } from '../../components/card/StaffCardRequestBillSlipModal';
import { SuperAdminCardDeleteModal } from '../../components/card/SuperAdminCardDeleteModal';
import { PatientRealMoneyTopUpModal } from '../../components/portal/PatientRealMoneyTopUpModal';
import { DirectLabAndPackageBookingModal } from '../../components/portal/DirectLabAndPackageBookingModal';
import { PatientReceiptModal } from '../../components/portal/PatientReceiptModal';
import { StaffCardRequestService } from '../../services/staffCardRequestService';
import { HealthCard, CardStatus, CardApplicationRequest, Patient, Membership, Wallet, StaffCardTransaction } from '../../types';
import { DEFAULT_MEMBERSHIPS } from '../../constants/memberships';
import { formatDate, formatCurrency, formatDateTime } from '../../utils/formatters';

const FALLBACK_MEMBERSHIP: Membership = DEFAULT_MEMBERSHIPS[0] || {
  id: 'mem_gold',
  name: 'Standard Gold',
  color: '#0D9488',
  registrationFee: 500,
  opdDiscount: 25,
  labDiscount: 30,
  pharmacyDiscount: 15,
  ipdDiscount: 10,
  validityYears: 3,
  description: 'Standard Membership'
};

const getMem = (membershipId: string | undefined, membershipsList: Membership[] = []): Membership => {
  if (!membershipsList || membershipsList.length === 0) return FALLBACK_MEMBERSHIP;
  const found = membershipsList.find(m => m.id === membershipId);
  return found || membershipsList[0] || FALLBACK_MEMBERSHIP;
};
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  CreditCard,
  Palette,
  RefreshCw,
  Layers,
  Printer,
  Eye,
  Filter,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Square,
  Zap,
  Clock,
  Sparkles,
  UserCheck,
  Send,
  Trash2,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  Archive,
  RotateCcw,
  LayoutGrid,
  List,
  Search,
  Wallet as WalletIcon,
  TestTube,
  Flame,
  TrendingUp,
  AlertTriangle,
  QrCode,
  Heart,
  ChevronRight,
  ExternalLink,
  Plus,
  Receipt
} from 'lucide-react';

export const CardListPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Navigation Tabs: Ultra 3D Deck, Operations Table, Archived 30-Day Hub, Applications Queue, Staff Submissions Hub
  const [activeMainView, setActiveMainView] = useState<'deck_3d' | 'table_view' | 'archived_hub' | 'applications_queue' | 'staff_requests_hub'>('deck_3d');
  const [staffSubTab, setStaffSubTab] = useState<'requests' | 'transactions'>('requests');
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>('all');

  // Core Data & State
  const [cards, setCards] = useState<HealthCard[]>(() => CardService.getAll(true));
  const [applications, setApplications] = useState<CardApplicationRequest[]>(() => PortalService.getCardApplications());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getMemberships());
  const [wallets, setWallets] = useState<Wallet[]>(() => StorageService.getWallets());
  const [staffTransactions, setStaffTransactions] = useState<StaffCardTransaction[]>(() => StaffCardRequestService.getStaffTransactions(currentUser));

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Interactive Modals State
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [selectedApplicationForReview, setSelectedApplicationForReview] = useState<CardApplicationRequest | null>(null);
  const [selectedAppForBillSlip, setSelectedAppForBillSlip] = useState<CardApplicationRequest | null>(null);
  const [selectedCardForRenew, setSelectedCardForRenew] = useState<HealthCard | null>(null);
  const [selectedCardForReplace, setSelectedCardForReplace] = useState<HealthCard | null>(null);
  const [selectedCardForDelete, setSelectedCardForDelete] = useState<HealthCard | null>(null);
  const [activePatientForTopUp, setActivePatientForTopUp] = useState<Patient | null>(null);
  const [activePatientForLab, setActivePatientForLab] = useState<Patient | null>(null);
  const [activeReceiptToPrint, setActiveReceiptToPrint] = useState<PatientReceiptData | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const refreshList = () => {
    setCards(CardService.getAll(true));
    setApplications(PortalService.getCardApplications());
    setPatients(StorageService.getPatients());
    setMemberships(StorageService.getMemberships());
    setWallets(StorageService.getWallets());
    setStaffTransactions(StaffCardRequestService.getStaffTransactions(currentUser));
    showToast('info', 'Cards & Patients Synchronized', 'Central database repository updated.');
  };

  useEffect(() => {
    const unsubCards = ApiSyncService.subscribeToCollection<HealthCard>('cards', (items) => {
      if (items) setCards(CardService.getAll(true));
    });
    const unsubPatients = ApiSyncService.subscribeToCollection<Patient>('patients', (items) => {
      if (items) setPatients(StorageService.getPatients());
    });
    const unsubApps = ApiSyncService.subscribeToCollection<CardApplicationRequest>('cardApplications', (items) => {
      if (items) setApplications(PortalService.getCardApplications());
    });
    const unsubWallets = ApiSyncService.subscribeToCollection<Wallet>('wallets', (items) => {
      if (items) setWallets(StorageService.getWallets());
    });
    const unsubTx = ApiSyncService.subscribeToCollection<StaffCardTransaction>('card_transactions', (items) => {
      if (items) setStaffTransactions(StaffCardRequestService.getStaffTransactions(currentUser));
    });

    const handleSync = (e: any) => {
      setCards(CardService.getAll(true));
      setApplications(PortalService.getCardApplications());
      setPatients(StorageService.getPatients());
      setMemberships(StorageService.getMemberships());
      setWallets(StorageService.getWallets());
      setStaffTransactions(StaffCardRequestService.getStaffTransactions(currentUser));
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => {
      unsubCards();
      unsubPatients();
      unsubApps();
      unsubWallets();
      unsubTx();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, [currentUser]);

  // Active / Archived Lists
  const activeCardsList = useMemo(() => cards.filter(c => !c.isDeleted && c.status !== 'deleted'), [cards]);
  const archivedCardsList = useMemo(() => cards.filter(c => c.isDeleted || c.status === 'cancelled' || c.status === 'deleted'), [cards]);
  const pendingAppsCount = applications.filter(a => a.status === 'pending_approval' || a.status === 'submitted' || a.status === 'under_review').length;
  const approvedAppsCount = useMemo(() => applications.filter(a => a.status === 'approved' || a.status === 'issued').length, [applications]);
  const rejectedAppsCount = useMemo(() => applications.filter(a => a.status === 'rejected' || a.status === 'cancelled').length, [applications]);

  const displayedApplications = useMemo(() => {
    if (appFilter === 'all') return applications;
    if (appFilter === 'pending') return applications.filter(a => a.status === 'pending_approval' || a.status === 'submitted' || a.status === 'under_review');
    if (appFilter === 'approved') return applications.filter(a => a.status === 'approved' || a.status === 'issued');
    if (appFilter === 'rejected') return applications.filter(a => a.status === 'rejected' || a.status === 'cancelled');
    return applications;
  }, [applications, appFilter]);

  const staffKpis = useMemo(() => StaffCardRequestService.getStaffKpis(currentUser), [applications, staffTransactions, currentUser]);
  const staffRequests = useMemo(() => StaffCardRequestService.getStaffRequests(currentUser), [applications, currentUser]);

  const filteredStaffRequests = useMemo(() => {
    return staffRequests.filter((req) => {
      if (staffStatusFilter !== 'all') {
        if (staffStatusFilter === 'pending') {
          const isPending = req.status === 'submitted' || req.status === 'pending_review' || req.status === 'under_review' || req.status === 'pending_approval';
          if (!isPending) return false;
        } else if (staffStatusFilter === 'approved') {
          const isApproved = req.status === 'approved' || req.status === 'processing' || req.status === 'card_processing';
          if (!isApproved) return false;
        } else if (staffStatusFilter === 'issued') {
          const isIssued = req.status === 'issued' || req.status === 'card_issued' || req.status === 'ready';
          if (!isIssued) return false;
        } else if (staffStatusFilter === 'rejected') {
          if (req.status !== 'rejected') return false;
        } else if (staffStatusFilter === 'returned') {
          const isReturned = req.status === 'returned_for_correction' || req.status === 'info_required';
          if (!isReturned) return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (req.applicationNo && req.applicationNo.toLowerCase().includes(q)) ||
          (req.trackingId && req.trackingId.toLowerCase().includes(q)) ||
          (req.fullName && req.fullName.toLowerCase().includes(q)) ||
          (req.mobile && req.mobile.includes(q)) ||
          (req.submittedByStaffName && req.submittedByStaffName.toLowerCase().includes(q)) ||
          (req.billNumber && req.billNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [staffRequests, staffStatusFilter, searchQuery]);

  const filteredStaffTransactions = useMemo(() => {
    return staffTransactions.filter((tx) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (tx.transactionNumber && tx.transactionNumber.toLowerCase().includes(q)) ||
          (tx.transactionId && tx.transactionId.toLowerCase().includes(q)) ||
          (tx.billNumber && tx.billNumber.toLowerCase().includes(q)) ||
          (tx.requestNumber && tx.requestNumber.toLowerCase().includes(q)) ||
          (tx.applicationNo && tx.applicationNo.toLowerCase().includes(q)) ||
          (tx.patientName && tx.patientName.toLowerCase().includes(q)) ||
          (tx.staffName && tx.staffName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [staffTransactions, searchQuery]);

  // Filtered Active Cards
  const filteredActiveCards = useMemo(() => {
    return activeCardsList.filter((c) => {
      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'expired') {
          const isExp = c.status === 'expired' || new Date(c.expiryDate) < new Date();
          if (!isExp) return false;
        } else if (c.status !== statusFilter) {
          return false;
        }
      }

      // Tier Filter
      if (tierFilter !== 'all' && c.membershipId !== tierFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = patients.find(pat => pat.id === c.patientId);
        return (
          c.cardNumber.toLowerCase().includes(q) ||
          c.verificationCode.toLowerCase().includes(q) ||
          (p && p.fullName.toLowerCase().includes(q)) ||
          c.patientId.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeCardsList, statusFilter, tierFilter, searchQuery, patients]);

  // Operational KPI Calculations
  const stats = useMemo(() => {
    const totalIssued = activeCardsList.length;
    const activeCount = activeCardsList.filter(c => c.status === 'active' && new Date(c.expiryDate) >= new Date()).length;
    const expiredCount = activeCardsList.filter(c => c.status === 'expired' || new Date(c.expiryDate) < new Date()).length;
    const suspendedCount = activeCardsList.filter(c => c.status === 'suspended').length;
    const archivedCount = archivedCardsList.length;

    return {
      totalIssued,
      activeCount,
      expiredCount,
      suspendedCount,
      archivedCount,
      pendingApps: pendingAppsCount
    };
  }, [activeCardsList, archivedCardsList, pendingAppsCount]);

  const handleApproveCard = (card: HealthCard) => {
    if (isSuperAdmin) {
      CardService.changeStatus(card.id, 'active', 'Card creation approved by Super Admin');
      setCards(CardService.getAll());
      showToast('success', 'Card Approved', `Card ${card.cardNumber} has been activated.`);
    } else {
      showToast('error', 'Access Denied', 'Only Super Admin can approve cards.');
    }
  };

  // Fast Freeze / Unfreeze Toggle
  const handleToggleFreeze = (card: HealthCard) => {
    const nextStatus: CardStatus = card.status === 'suspended' ? 'active' : 'suspended';
    const reason = card.status === 'suspended' ? 'Card unfreezed by administrator' : 'Card temporarily frozen by administrator';

    CardService.changeStatus(card.id, nextStatus, reason);
    triggerCelebrationFireworks();
    showToast(
      nextStatus === 'active' ? 'success' : 'warning',
      nextStatus === 'active' ? 'Card Unfrozen & Active' : 'Card Temporarily Frozen',
      `Card ${card.cardNumber} is now ${nextStatus.toUpperCase()}.`
    );
    refreshList();
  };

  // Restore Archived Card with 30-day retention verification
  const handleRestoreCard = (cardId: string) => {
    const res = CardService.restoreCard(cardId, currentUser?.fullName || 'Administrator');
    if (res.success) {
      triggerCelebrationFireworks();
      showToast('success', 'Health Card Restored', `Card ${res.card?.cardNumber} has been reactivated. Cardholder portal access restored.`);
      refreshList();
    } else {
      showToast('error', 'Restoration Blocked', res.error || 'Could not restore card.');
    }
  };

  // Batch Select Handlers
  const toggleSelectCard = (id: string) => {
    setSelectedCardIds(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedCardIds.length === filteredActiveCards.length) {
      setSelectedCardIds([]);
    } else {
      setSelectedCardIds(filteredActiveCards.map(c => c.id));
    }
  };

  const handleBatchPrint = () => {
    if (selectedCardIds.length === 0) return;
    const firstSelected = cards.find(c => c.id === selectedCardIds[0]);
    navigate(`/cards/print-sheet?patientId=${firstSelected?.patientId || ''}`);
  };

  // Quick 1-Click Mint & Transition to Issued Card Deck
  const handleQuickMintApplication = async (app: CardApplicationRequest) => {
    const res = await PortalService.approveCardApplication(app.id, currentUser?.fullName || 'Super Administrator');
    if (res.success && res.card && res.patient) {
      triggerCelebrationFireworks();
      refreshList();
      setActiveMainView('deck_3d');
      setSearchQuery(res.card.cardNumber);
      showToast(
        'success',
        'Card Minted & Moved to Issued Deck! 🚀',
        `Successfully issued Health Card ${res.card.cardNumber} for ${res.patient.fullName}. Moved from Applications Queue to Live Issued Deck.`
      );
    } else {
      showToast('error', 'Mint Error', res.error || 'Failed to mint health card.');
    }
  };

  // Official Card Slip Print
  const handlePrintSlip = (card: HealthCard) => {
    const patient = patients.find(p => p.id === card.patientId);
    const mem = getMem(card.membershipId, memberships);
    const wallet = wallets.find(w => w.patientId === card.patientId);
    const regFee = mem.registrationFee || 500;
    const walletBal = wallet?.balance || 0;

    setActiveReceiptToPrint({
      id: `rcp_slip_${card.id}`,
      receiptNo: `CARD-${card.cardNumber}`,
      patientId: card.patientId,
      patientName: patient?.fullName || card.patientId,
      patientPhone: patient?.mobile,
      cardNo: card.cardNumber,
      cardTier: mem.name,
      serviceType: 'General',
      serviceDescription: `Official CR80 PVC Smart Health Card Issuance Certificate (${mem.name})`,
      items: [
        { name: `CR80 PVC Smart Health Card (${mem.name})`, price: regFee },
        { name: 'Initial Prepaid Health Wallet Float Allocation', price: walletBal },
        { name: '24x7 EMR QR Verification & Cloud Sync', price: 0 }
      ],
      grossAmount: regFee + walletBal,
      discountAmount: 0,
      discountPercentage: 0,
      netAmount: regFee + walletBal,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      walletClosingBalance: walletBal,
      date: card.issueDate || new Date().toISOString(),
      status: 'Completed',
      referenceNo: card.cardNumber
    });
  };

  // Table View Columns
  const columns: Column<HealthCard>[] = [
    {
      header: 'Select',
      className: 'w-12 text-center',
      accessor: (c) => (
        <button
          type="button"
          onClick={() => toggleSelectCard(c.id)}
          className="text-slate-400 hover:text-teal-600 focus:outline-none"
        >
          {selectedCardIds.includes(c.id) ? (
            <CheckSquare className="w-4 h-4 text-teal-600" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      )
    },
    {
      header: 'Card Number & Security Key',
      accessor: (c) => {
        const isExp = new Date(c.expiryDate) < new Date();
        return (
          <div>
            <strong
              className="font-mono text-sm font-black text-teal-600 dark:text-teal-400 block hover:underline cursor-pointer"
              onClick={() => navigate(`/card-studio?patientId=${c.patientId}`)}
            >
              {c.cardNumber}
            </strong>
            <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
              <span className="text-slate-500">{c.verificationCode}</span>
              {isSuperAdmin ? (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                  CVV: {c.cvv || c.verificationCode?.slice(-3) || '821'}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-bold text-[10px]">
                  CVV: •••
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Patient Holder',
      accessor: (c) => {
        const p = patients.find(pat => pat.id === c.patientId);
        if (!p) return <span className="text-xs text-slate-400 font-mono">{c.patientId}</span>;
        return (
          <div className="flex items-center gap-2.5">
            <img
              src={p.photoUrl || '/logo.jpg'}
              alt={p.fullName}
              className="w-8 h-8 rounded-xl object-cover border shadow-sm"
            />
            <div>
              <strong
                className="text-xs font-bold text-slate-900 dark:text-white block hover:text-teal-600 cursor-pointer"
                onClick={() => navigate(`/patients/${p.id}`)}
              >
                {p.fullName}
              </strong>
              <span className="text-[10px] text-slate-500 font-mono">{p.mobile} • <span className="text-rose-500 font-bold">{p.bloodGroup}</span></span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Tier & Float',
      accessor: (c) => {
        const mem = getMem(c.membershipId, memberships);
        const wallet = wallets.find(w => w.patientId === c.patientId);
        return (
          <div className="text-xs">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono inline-block"
              style={{ backgroundColor: (mem.color || '#0D9488') + '20', color: mem.color || '#0D9488' }}
            >
              {mem.name || 'Standard Gold'}
            </span>
            <div className="text-[11px] font-mono font-bold text-emerald-600 mt-0.5">
              Float: {formatCurrency(wallet?.balance || 0)}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Validity & Status',
      accessor: (c) => {
        const isExp = new Date(c.expiryDate) < new Date();
        return (
          <div>
            <CardStatusBadge status={isExp && c.status === 'active' ? 'expired' : c.status} />
            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Exp: {c.expiryDate}</span>
          </div>
        );
      }
    },
    {
      header: 'Recommended Actions',
      className: 'text-right',
      accessor: (c) => {
        const p = patients.find(pat => pat.id === c.patientId);
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              title="Top-Up Health Wallet"
              onClick={() => {
                if (p) setActivePatientForTopUp(p);
              }}
            >
              <WalletIcon className="w-3.5 h-3.5 text-emerald-600" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              title="Book Pathology Lab"
              onClick={() => {
                if (p) setActivePatientForLab(p);
              }}
            >
              <TestTube className="w-3.5 h-3.5 text-blue-600" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              title="Print Official PVC Card"
              onClick={() => navigate(`/cards/print-sheet?patientId=${c.patientId}`)}
            >
              <Printer className="w-3.5 h-3.5 text-purple-600" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              title={c.status === 'suspended' ? 'Unfreeze Card' : 'Freeze Card'}
              onClick={() => handleToggleFreeze(c)}
            >
              {c.status === 'suspended' ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              )}
            </Button>

            {can('card_renew') && (
              <Button
                size="sm"
                variant="ghost"
                title="Renew 1-Year Membership"
                onClick={() => setSelectedCardForRenew(c)}
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
              </Button>
            )}

            {can('card_replace') && (
              <Button
                size="sm"
                variant="ghost"
                title="Issue Duplicate / Replacement Card"
                onClick={() => setSelectedCardForReplace(c)}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
              </Button>
            )}

            {/* Super Admin Secured Delete Button */}
            <Button
              size="sm"
              variant="ghost"
              title={isSuperAdmin ? 'Super-Admin Revoke & Delete Card' : 'Only Super Administrator is authorized to delete issued cards'}
              className={!isSuperAdmin ? 'opacity-40 cursor-not-allowed' : ''}
              onClick={() => {
                if (isSuperAdmin) {
                  setSelectedCardForDelete(c);
                } else {
                  showToast('warning', 'Super-Admin Authority Required', 'Issued health cards can only be deleted or permanently expunged by Super Administrator.');
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP ULTRA 3D GLASSMORPHIC HEADER & COMMAND BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white border border-slate-700/80 shadow-2xl">
        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-72 h-72 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-0.5 shadow-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  CR80 PVC Smart Health Cards Directory
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    Ultra 3D Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-300">
                  Manage ISO CR80 PVC cardholders, Super-Admin revocation protocols, 30-day retention restoration, and real-time cashless limits.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-700 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveMainView('deck_3d')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeMainView === 'deck_3d'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>3D Card Deck ({activeCardsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainView('table_view')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeMainView === 'table_view'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Master Table</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainView('archived_hub')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeMainView === 'archived_hub'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-rose-400 hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archived / Revoked ({archivedCardsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/card-requests')}
                className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 hover:text-white border border-teal-500/30"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Card Requests Hub</span>
                {staffKpis.pendingRequests > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black">
                    {staffKpis.pendingRequests}
                  </span>
                )}
              </button>
            </div>

            {(can('card_request_create') || can('card_create') || isSuperAdmin) && (
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-teal-500 text-slate-950 font-black shadow-lg hover:brightness-110"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateRequestModalOpen(true)}
              >
                + Request Health Card
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={refreshList}
            >
              🔄 Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-bold"
              leftIcon={<Truck className="w-4 h-4" />}
              onClick={() => navigate('/cards/printing-dispatch')}
            >
              Print & Dispatch Hub
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-lg"
              leftIcon={<Palette className="w-4 h-4" />}
              onClick={() => navigate('/card-studio')}
            >
              3D Card Studio
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 3D GLASSMORPHIC OPERATIONAL KPI COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Total Active Issued */}
        <div
          onClick={() => {
            setActiveMainView('deck_3d');
            setStatusFilter('all');
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-500 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider font-mono">Issued Cards</span>
            <CreditCard className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition-transform">
              {stats.totalIssued}
            </strong>
            <span className="text-[10px] text-teal-400 font-bold">{stats.activeCount} Active Cashless</span>
          </div>
        </div>

        {/* KPI 2: Active Beneficiaries */}
        <div
          onClick={() => {
            setActiveMainView('deck_3d');
            setStatusFilter('active');
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">Verified Active</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-emerald-400 font-mono block group-hover:scale-105 transition-transform">
              {stats.activeCount}
            </strong>
            <span className="text-[10px] text-slate-400">100% Cashless Verified</span>
          </div>
        </div>

        {/* KPI 3: Expired Cards */}
        <div
          onClick={() => {
            setActiveMainView('deck_3d');
            setStatusFilter('expired');
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono">Expired Cards</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-amber-400 font-mono block group-hover:scale-105 transition-transform">
              {stats.expiredCount}
            </strong>
            <span className="text-[10px] text-amber-400">Needs 1-Year Renewal</span>
          </div>
        </div>

        {/* KPI 4: Frozen / Suspended Cards */}
        <div
          onClick={() => {
            setActiveMainView('deck_3d');
            setStatusFilter('suspended');
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider font-mono">Frozen / Locked</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-purple-400 font-mono block group-hover:scale-105 transition-transform">
              {stats.suspendedCount}
            </strong>
            <span className="text-[10px] text-purple-400">Temporary Access Block</span>
          </div>
        </div>

        {/* KPI 5: Archived / Revoked Cards (30-Day Retention Hub) */}
        <div
          onClick={() => setActiveMainView('archived_hub')}
          className="p-4 rounded-3xl bg-slate-900 border-2 border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider font-mono">Archived / Deleted</span>
            <Archive className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-rose-400 font-mono block group-hover:scale-105 transition-transform">
              {stats.archivedCount}
            </strong>
            <span className="text-[10px] text-rose-300 font-mono">30-Day Retention Rule</span>
          </div>
        </div>

        {/* KPI 6: Pending Online Applications */}
        <div
          onClick={() => setActiveMainView('applications_queue')}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-400 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono">Online Queue</span>
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition-transform">
              {stats.pendingApps}
            </strong>
            <span className="text-[10px] text-amber-400 font-bold">Awaiting Minting</span>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE VIEW 1: ULTRA 3D CARD DECK SHOWCASE */}
      {activeMainView === 'deck_3d' && (
        <div className="space-y-4">
          {/* Multi-Filtering Command Toolbar */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                <Filter className="w-3.5 h-3.5 text-teal-500" />
                Filters:
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Card Statuses</option>
                <option value="active">Active Cashless</option>
                <option value="expired">Expired (Needs Renewal)</option>
                <option value="suspended">Frozen / Suspended</option>
                <option value="replaced">Replaced</option>
              </select>

              {/* Tier Filter */}
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Membership Tiers</option>
                {memberships.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Card No, Holder Name, ID, QR Key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* 3D Cards Grid */}
          {filteredActiveCards.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-black text-white">No Health Cards Match Your Search</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try resetting your filters or register a new patient to auto-generate their CR80 PVC Smart Card.
              </p>
              <Button size="sm" variant="outline" onClick={() => { setStatusFilter('all'); setTierFilter('all'); setSearchQuery(''); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActiveCards.map((card) => {
                const patient = patients.find(p => p.id === card.patientId);
                const mem = getMem(card.membershipId, memberships);
                const wallet = wallets.find(w => w.patientId === card.patientId);
                const isExp = new Date(card.expiryDate) < new Date();
                const effectiveStatus = isExp && card.status === 'active' ? 'expired' : card.status;

                return (
                  <div
                    key={card.id}
                    className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-teal-500/60 transition-all shadow-xl hover:shadow-2xl flex flex-col justify-between space-y-4 group relative overflow-hidden"
                  >
                    {/* Holographic Sheen Layer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div>
                      {/* Top Header: Card No & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                          {card.cardNumber}
                        </span>

                        <CardStatusBadge status={effectiveStatus} />
                      </div>

                      {/* 3D Smart Card Simulated Front Badge */}
                      <div
                        className="my-3 p-4 rounded-2xl border text-white relative overflow-hidden shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${mem.color || '#0D9488'}EE, #0F172A)`,
                          borderColor: mem.color || '#14B8A6'
                        }}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono tracking-wider opacity-90 mb-3">
                          <span className="font-bold uppercase">{mem.name || 'Standard Gold'}</span>
                          <span className="flex items-center gap-1 font-sans font-bold">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            EMR SYNCED
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={patient?.photoUrl || '/logo.jpg'}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border-2 border-white/40 shadow-md"
                          />
                          <div className="overflow-hidden">
                            <strong className="text-sm font-black text-white uppercase block truncate">
                              {patient?.fullName || card.patientId}
                            </strong>
                            <span className="text-[11px] font-mono text-teal-200 block">{card.patientId}</span>
                            <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                              Blood: <strong className="text-white">{patient?.bloodGroup || 'O+'}</strong> • Age: {patient?.age || 35} Y
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono pt-3 mt-3 border-t border-white/20">
                          <span>Key: <strong>{card.verificationCode}</strong></span>
                          <span>Valid Thru: <strong>{card.expiryDate}</strong></span>
                        </div>
                      </div>

                      {/* Cashless Benefits & Balance Strip */}
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Wallet Balance:</span>
                          <strong className="text-emerald-400 font-black text-sm">
                            {formatCurrency(wallet?.balance || 0)}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[10.5px]">
                          <span>Perks:</span>
                          <span className="text-teal-400">OPD {mem.opdDiscount || 25}% | Lab {mem.labDiscount || 30}% | Med {mem.pharmacyDiscount || 15}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Recommended Actions Command Grid */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Recommended Actions:</span>
                        <span className="text-[10px] text-teal-500 font-mono">1-Click Live</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="p-1 h-7 text-[10px] font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40"
                          title="Instant Wallet Top-Up"
                          onClick={() => {
                            if (patient) setActivePatientForTopUp(patient);
                          }}
                        >
                          <WalletIcon className="w-3 h-3 mr-1" />
                          Top-Up
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="p-1 h-7 text-[10px] font-bold text-blue-400 border-blue-500/30 hover:bg-blue-950/40"
                          title="Book Pathology Lab Test"
                          onClick={() => {
                            if (patient) setActivePatientForLab(patient);
                          }}
                        >
                          <TestTube className="w-3 h-3 mr-1" />
                          Book Lab
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="p-1 h-7 text-[10px] font-bold text-purple-400 border-purple-500/30 hover:bg-purple-950/40"
                          title="Print CR80 PVC Card Sheet"
                          onClick={() => navigate(`/cards/print-sheet?patientId=${card.patientId}`)}
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          PVC Card
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="p-1 h-7 text-[10.5px] font-bold text-teal-400 border-teal-500/30 hover:bg-teal-950/40"
                          onClick={() => setSelectedCardForRenew(card)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Renew 1-Year
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="p-1 h-7 text-[10.5px] font-bold text-amber-400 border-amber-500/30 hover:bg-amber-950/40"
                          onClick={() => setSelectedCardForReplace(card)}
                        >
                          <Layers className="w-3 h-3 mr-1" />
                          Replace
                        </Button>
                      </div>

                      {/* Card Studio Link & Delete Controls */}
                      <div className="flex items-center justify-between pt-1">
                        {card.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleApproveCard(card)}
                            className="text-[10px] font-bold flex items-center gap-1 transition-colors text-teal-400 hover:underline"
                          >
                            <Check className="w-3 h-3" /> Approve Card
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleFreeze(card)}
                          className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${
                            card.status === 'suspended'
                              ? 'text-emerald-400 hover:underline'
                              : 'text-amber-400 hover:underline'
                          }`}
                        >
                          {card.status === 'suspended' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {card.status === 'suspended' ? 'Unfreeze Card' : 'Freeze Card'}
                          </button>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintSlip(card)}
                            className="text-[10px] font-bold text-slate-400 hover:text-white"
                          >
                            Slip 📄
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isSuperAdmin) {
                                setSelectedCardForDelete(card);
                              } else {
                                showToast('warning', 'Super-Admin Authorization Required', 'Issued cards can only be deleted or revoked by Super Administrator.');
                              }
                            }}
                            className={`text-[10px] font-bold flex items-center gap-1 ${
                              isSuperAdmin
                                ? 'text-rose-400 hover:text-rose-300'
                                : 'text-slate-600 cursor-not-allowed'
                            }`}
                            title={isSuperAdmin ? 'Super-Admin Revoke / Delete' : 'Only Super Administrator is authorized to delete issued cards'}
                          >
                            <Trash2 className="w-3 h-3" />
                            Revoke
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. WORKSPACE VIEW 2: OPERATIONS MASTER TABLE */}
      {activeMainView === 'table_view' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
              <List className="w-4 h-4 text-teal-600" />
              Master Health Cards Repository ({filteredActiveCards.length})
            </h3>

            {selectedCardIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-teal-600">
                  {selectedCardIds.length} Selected
                </span>
                <Button size="sm" variant="primary" onClick={handleBatchPrint} leftIcon={<Printer className="w-4 h-4" />}>
                  Batch Print Selected
                </Button>
              </div>
            )}
          </div>

          <DataTable
            data={filteredActiveCards}
            columns={columns}
            keyExtractor={(c) => c.id}
            searchPlaceholder="Search Card Number, Verification Key, or Patient..."
          />
        </div>
      )}

      {/* 5. WORKSPACE VIEW 3: ARCHIVED / REVOKED CARDS (30-DAY RETENTION HUB) */}
      {activeMainView === 'archived_hub' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Archive className="w-4 h-4 text-rose-400" />
                Archived & Revoked Cards Hub (30-Day Legal Retention Clock)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Revoked credentials cannot be used by cardholders for portal logins or hospital cashless services. Administrators can restore within 30 days.
              </p>
            </div>

            <Badge variant="danger" size="md">
              {archivedCardsList.length} Archived Cards
            </Badge>
          </div>

          {archivedCardsList.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-black text-white">Archive is Clean</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No health cards are currently revoked or soft-deleted. All issued cards are active or preserved.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedCardsList.map((card) => {
                const patient = patients.find(p => p.id === card.patientId);
                const mem = getMem(card.membershipId, memberships);

                // 30-day retention calculation
                const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
                const deletedTimestamp = card.deletedAt ? new Date(card.deletedAt).getTime() : 0;
                const elapsedMs = deletedTimestamp ? Date.now() - deletedTimestamp : 0;
                const isExpiredRetention = elapsedMs > ONE_MONTH_MS;
                const remainingDays = Math.max(0, Math.ceil((ONE_MONTH_MS - elapsedMs) / (24 * 60 * 60 * 1000)));

                return (
                  <div
                    key={card.id}
                    className="p-5 rounded-3xl bg-slate-900 border-2 border-rose-500/40 flex flex-col justify-between space-y-4 shadow-xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-rose-400 border border-slate-700">
                          {card.cardNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          REVOKED / CANCELLED
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={patient?.photoUrl || '/logo.jpg'}
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700 opacity-60"
                        />
                        <div>
                          <strong className="text-sm font-black text-white block">
                            {patient?.fullName || card.patientId}
                          </strong>
                          <span className="text-xs text-slate-400 font-mono">{card.patientId}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Archived On:</span>
                          <span className="text-white">{card.deletedAt ? formatDateTime(card.deletedAt) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Archived By:</span>
                          <span className="text-amber-300">{card.deletedBy || 'Super Administrator'}</span>
                        </div>
                        <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                          <span>Reason:</span>
                          <span className="text-rose-300 truncate max-w-[180px]">{card.deleteReason || 'Administrative Action'}</span>
                        </div>
                      </div>

                      {/* 30-Day Retention Indicator */}
                      <div className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-between ${
                        isExpiredRetention
                          ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                          : 'bg-amber-950/60 border-amber-500 text-amber-200'
                      }`}>
                        <span>Retention Clock:</span>
                        <strong>
                          {isExpiredRetention ? 'Expired (> 30 Days)' : `${remainingDays} Days Left to Restore`}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 font-black text-xs shadow-md"
                        disabled={isExpiredRetention}
                        title={isExpiredRetention ? 'Retention period has expired. This card cannot be restored.' : 'Restore card to Active status'}
                        onClick={() => handleRestoreCard(card.id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Restore Active Card
                      </Button>

                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="danger"
                          className="text-xs font-bold"
                          title="Permanently Purge All Records"
                          onClick={() => setSelectedCardForDelete(card)}
                        >
                          Purge
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. WORKSPACE VIEW 4: ONLINE CARD APPLICATIONS QUEUE */}
      {activeMainView === 'applications_queue' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Health Card Applications & Requests Queue ({applications.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff submissions and online self-service card requests queued for Super Admin review and card minting.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAppFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    appFilter === 'all' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({applications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAppFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    appFilter === 'pending' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending ({pendingAppsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAppFilter('approved')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    appFilter === 'approved' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Approved ({approvedAppsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAppFilter('rejected')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    appFilter === 'rejected' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rejected ({rejectedAppsCount})
                </button>
              </div>

              {(can('card_request_create') || can('card_create') || isSuperAdmin) && (
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-gradient-to-r from-amber-500 to-teal-500 text-slate-950 font-black shadow-md hover:brightness-110 text-xs"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsCreateRequestModalOpen(true)}
                >
                  + Request Card
                </Button>
              )}
            </div>
          </div>

          {displayedApplications.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <Clock className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No applications in this category</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No health card requests currently match the selected filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedApplications.map((app) => (
                <div
                  key={app.id}
                  className={`p-5 rounded-3xl bg-slate-900 border-2 transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                    app.status === 'pending_approval' || app.status === 'submitted'
                      ? 'border-amber-500/50 bg-gradient-to-b from-slate-900 to-amber-950/20'
                      : app.status === 'approved'
                      ? 'border-emerald-500/40 bg-gradient-to-b from-slate-900 to-emerald-950/20'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                        {app.trackingId || app.applicationNo}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {app.urgency && app.urgency !== 'normal' && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            app.urgency === 'emergency' ? 'bg-red-950 text-red-300 border border-red-500' : 'bg-amber-950 text-amber-300 border border-amber-500'
                          }`}>
                            {app.urgency}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                          app.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : app.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {app.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={app.photoUrl || '/logo.jpg'}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md"
                      />
                      <div>
                        <strong className="text-sm font-black text-white block truncate">
                          {app.fullName}
                        </strong>
                        <span className="text-xs text-slate-400 font-mono">{app.mobile}</span>
                        <div className="text-[10px] text-teal-400 font-mono mt-0.5 font-bold">
                          Tier: {app.membershipName}
                        </div>
                      </div>
                    </div>

                    {app.submittedByStaffName && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10.5px] font-mono text-slate-400 flex items-center justify-between">
                        <span>Staff: <strong className="text-slate-200">{app.submittedByStaffName}</strong></span>
                        <span className="capitalize text-slate-500">{app.submittedByStaffRole || 'Staff'}</span>
                      </div>
                    )}

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Total Paid:</span>
                        <strong className="text-emerald-400">{formatCurrency(app.totalPaidAmount)}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[10px]">
                        <span>Method:</span>
                        <span className="text-amber-300">{app.paymentMethod}</span>
                      </div>
                      {app.justificationNotes && (
                        <div className="text-[10px] text-slate-400 font-sans italic border-t border-slate-850 pt-1 mt-1 truncate">
                          "{app.justificationNotes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    {app.status === 'pending_approval' || app.status === 'submitted' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
                          onClick={() => setSelectedApplicationForReview(app)}
                        >
                          Review Details
                        </Button>
                        {(isSuperAdmin || can('card_request_approve')) && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs shadow-md"
                            leftIcon={<Zap className="w-3.5 h-3.5" />}
                            onClick={() => handleQuickMintApplication(app)}
                          >
                            Mint & Issue →
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black text-xs"
                        leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setActiveMainView('deck_3d');
                          if (app.approvedCardNumber) {
                            setSearchQuery(app.approvedCardNumber);
                          } else {
                            setSearchQuery(app.fullName);
                          }
                        }}
                      >
                        View Issued Card in Deck →
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. WORKSPACE VIEW 5: STAFF HEALTH CARD REQUESTS & TRANSACTIONS HUB */}
      {activeMainView === 'staff_requests_hub' && (
        <div className="space-y-6">
          {/* Header & Sub-tab switcher */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-teal-950 text-teal-300 border border-teal-500/40">
                    {isSuperAdmin ? 'SUPER ADMIN WORKFLOW & AUDIT' : 'STAFF SUBMISSION WORKFLOW'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    User: <strong className="text-white">{currentUser?.fullName}</strong> ({currentUser?.role?.replace(/_/g, ' ')})
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-teal-400" />
                  {isSuperAdmin ? 'Hospital Staff Health Card Requests & Transactions' : 'My Staff Health Card Submissions & Slips'}
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
                  Secure staff-to-Super-Admin card requests, live Firestore status tracking, automated family surcharge calculation, and instant printable bills and slips.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(can('card_request_create') || can('card_create') || isSuperAdmin) && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 text-slate-950 font-black shadow-lg hover:brightness-110 text-xs py-2 px-4"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsCreateRequestModalOpen(true)}
                  >
                    + Submit Health Card Request
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs py-2"
                  onClick={refreshList}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Sync Live
                </Button>
              </div>
            </div>

            {/* Sub-Tabs: Requests vs Financial Ledger */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setStaffSubTab('requests')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  staffSubTab === 'requests'
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Card Requests Queue ({staffRequests.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStaffSubTab('transactions')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  staffSubTab === 'transactions'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Financial Transactions & Bills ({staffTransactions.length})</span>
              </button>
            </div>
          </div>

          {/* Real-time KPI Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Total Requests */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Requests</span>
              <div className="mt-1">
                <strong className="text-xl font-black text-white font-mono block">{staffKpis.totalRequests}</strong>
                <span className="text-[10px] text-slate-400">All submissions</span>
              </div>
            </div>

            {/* 2. Pending Review */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider font-mono">Pending</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>
              <div className="mt-1">
                <strong className="text-xl font-black text-amber-300 font-mono block">{staffKpis.pendingRequests}</strong>
                <span className="text-[10px] text-amber-400">Under review</span>
              </div>
            </div>

            {/* 3. Approved */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-teal-500/40 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider font-mono">Approved</span>
              <div className="mt-1">
                <strong className="text-xl font-black text-teal-400 font-mono block">{staffKpis.approvedRequests}</strong>
                <span className="text-[10px] text-teal-400">Minting ready</span>
              </div>
            </div>

            {/* 4. Issued */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider font-mono">Card Issued</span>
              <div className="mt-1">
                <strong className="text-xl font-black text-emerald-400 font-mono block">{staffKpis.issuedRequests}</strong>
                <span className="text-[10px] text-emerald-400">Active cashless</span>
              </div>
            </div>

            {/* 5. Returned */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-orange-500/40 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider font-mono">Correction</span>
              <div className="mt-1">
                <strong className="text-xl font-black text-orange-400 font-mono block">{staffKpis.returnedRequests}</strong>
                <span className="text-[10px] text-orange-400">Action needed</span>
              </div>
            </div>

            {/* 6. Rejected */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-rose-500/40 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider font-mono">Rejected</span>
              <div className="mt-1">
                <strong className="text-xl font-black text-rose-400 font-mono block">{staffKpis.rejectedRequests}</strong>
                <span className="text-[10px] text-rose-400">Declined</span>
              </div>
            </div>

            {/* 7. Total Billed */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/40 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider font-mono">Total Billed</span>
              <div className="mt-1">
                <strong className="text-sm font-black text-blue-300 font-mono block truncate">{formatCurrency(staffKpis.totalBillingAmount)}</strong>
                <span className="text-[10px] text-slate-400">{staffKpis.totalTransactions} bills</span>
              </div>
            </div>

            {/* 8. Paid & Due */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-purple-500/40 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider font-mono">Paid / Due</span>
              <div className="mt-1">
                <strong className="text-sm font-black text-emerald-400 font-mono block truncate">{formatCurrency(staffKpis.totalPaidAmount)}</strong>
                <span className="text-[10px] font-mono text-rose-400 block truncate">Due: {formatCurrency(staffKpis.totalDueAmount)}</span>
              </div>
            </div>
          </div>

          {/* Sub-Tab 1: Requests Queue */}
          {staffSubTab === 'requests' && (
            <div className="space-y-4">
              {/* Filter Pills & Search */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      staffStatusFilter === 'all' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({staffRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('pending')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      staffStatusFilter === 'pending' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pending Review ({staffKpis.pendingRequests})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('approved')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      staffStatusFilter === 'approved' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Approved ({staffKpis.approvedRequests})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('issued')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      staffStatusFilter === 'issued' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Issued ({staffKpis.issuedRequests})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('returned')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      staffStatusFilter === 'returned' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Correction ({staffKpis.returnedRequests})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('rejected')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      staffStatusFilter === 'rejected' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rejected ({staffKpis.rejectedRequests})
                  </button>
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Request No, Patient, Staff, Bill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Staff Requests List */}
              {filteredStaffRequests.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-base font-bold text-white">No card requests found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {staffStatusFilter !== 'all'
                      ? `There are no requests matching the "${staffStatusFilter}" status filter.`
                      : 'No health card requests have been submitted yet. Click "+ Submit Health Card Request" to create one.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStaffRequests.map((req) => {
                    const familyCount = req.familyMembers ? req.familyMembers.length : 0;
                    const extraCount = req.extraFamilyMembersCount || 0;
                    const isPending = req.status === 'submitted' || req.status === 'pending_review' || req.status === 'under_review' || req.status === 'pending_approval';
                    const isApproved = req.status === 'approved' || req.status === 'processing' || req.status === 'card_processing';
                    const isIssued = req.status === 'issued' || req.status === 'card_issued' || req.status === 'ready';
                    const isReturned = req.status === 'returned_for_correction' || req.status === 'info_required';
                    const isRejected = req.status === 'rejected';

                    return (
                      <div
                        key={req.id}
                        className={`p-5 rounded-3xl bg-slate-900 border-2 transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                          isPending
                            ? 'border-amber-500/50 bg-gradient-to-b from-slate-900 to-amber-950/20'
                            : isReturned
                            ? 'border-orange-500/50 bg-gradient-to-b from-slate-900 to-orange-950/20'
                            : isApproved
                            ? 'border-teal-500/40 bg-gradient-to-b from-slate-900 to-teal-950/20'
                            : isIssued
                            ? 'border-emerald-500/40 bg-gradient-to-b from-slate-900 to-emerald-950/20'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Header: Tracking ID & Live Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                              {req.applicationNo || req.trackingId}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                              isIssued
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                                : isApproved
                                ? 'bg-teal-950 text-teal-300 border-teal-500'
                                : isReturned
                                ? 'bg-orange-950 text-orange-300 border-orange-500 animate-pulse'
                                : isRejected
                                ? 'bg-rose-950 text-rose-300 border-rose-500'
                                : 'bg-amber-950 text-amber-300 border-amber-500'
                            }`}>
                              {req.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Patient Profile Card */}
                          <div className="flex items-center gap-3">
                            <img
                              src={req.photoUrl || '/logo.jpg'}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md"
                            />
                            <div className="overflow-hidden">
                              <strong className="text-sm font-black text-white block truncate">
                                {req.fullName}
                              </strong>
                              <span className="text-xs text-slate-400 font-mono">{req.mobile}</span>
                              <div className="text-[10.5px] text-teal-400 font-mono mt-0.5 flex items-center gap-2">
                                <span>Plan: <strong>{req.membershipName}</strong></span>
                                <span>• Blood: <strong className="text-white">{req.bloodGroup || 'Not Tested'}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Family Members Badge */}
                          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
                            <span>Family Shield:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-amber-300">
                                {Math.min(familyCount, 5)} / 5 Included
                              </span>
                              {extraCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40 text-[9.5px] font-bold">
                                  +{extraCount} Extra
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Submitter Staff Attribution */}
                          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10.5px] font-mono text-slate-400 flex items-center justify-between">
                            <span>Staff: <strong className="text-slate-200">{req.submittedByStaffName || 'Authorized Staff'}</strong></span>
                            <span className="text-slate-500 text-[10px]">{formatDate(req.createdAt)}</span>
                          </div>

                          {/* Financials Strip */}
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                            <div className="flex justify-between text-slate-400">
                              <span>Bill / Transaction:</span>
                              <strong className="text-emerald-400">{formatCurrency(req.totalPaidAmount)}</strong>
                            </div>
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Bill No:</span>
                              <span className="text-teal-300 font-bold">{req.billNumber || 'Auto-Generated'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Payment:</span>
                              <span className="text-amber-300">{req.paymentMethod}</span>
                            </div>
                          </div>

                          {/* Remarks / Returned Correction Note */}
                          {req.infoRequiredNote && (
                            <div className="p-2.5 rounded-xl bg-orange-950/40 border border-orange-500/40 text-[10.5px] text-orange-200 space-y-1 font-mono">
                              <span className="font-bold uppercase block text-orange-300">Correction Required:</span>
                              <p className="italic">{req.infoRequiredNote}</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-teal-500/40 text-teal-300 hover:bg-teal-950/50 text-xs font-bold"
                            leftIcon={<Receipt className="w-3.5 h-3.5" />}
                            onClick={() => setSelectedAppForBillSlip(req)}
                          >
                            Bill & Slip
                          </Button>

                          {(isSuperAdmin || can('card_request_approve')) && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md"
                              onClick={() => setSelectedApplicationForReview(req)}
                            >
                              Review & Mint
                            </Button>
                          )}

                          {!isSuperAdmin && !can('card_request_approve') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                              onClick={() => setSelectedApplicationForReview(req)}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 2: Financial Transactions & Billing Ledger */}
          {staffSubTab === 'transactions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    Card Request Financial Audit Ledger ({staffTransactions.length})
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Itemized billing receipts, family plan enrollment fees, extra dependent surcharges, and payment references.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Tx No, Bill No, Patient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {filteredStaffTransactions.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <Receipt className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-base font-bold text-white">No transactions recorded</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Transactions are created automatically when staff submit a new health card request with billing.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 text-[10.5px] uppercase font-mono border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Transaction / Bill</th>
                          <th className="py-3 px-4">Request No</th>
                          <th className="py-3 px-4">Patient Details</th>
                          <th className="py-3 px-4">Staff Submitter</th>
                          <th className="py-3 px-4 text-right">Plan Fee</th>
                          <th className="py-3 px-4 text-right">Extra Members</th>
                          <th className="py-3 px-4 text-right">Total Bill</th>
                          <th className="py-3 px-4 text-right">Paid</th>
                          <th className="py-3 px-4">Channel & Ref</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-mono">
                        {filteredStaffTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <strong className="text-white block">{tx.transactionNumber}</strong>
                              <span className="text-[10px] text-teal-400">{tx.billNumber}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {tx.requestNumber || 'N/A'}
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <strong className="text-white block font-bold">{tx.patientName}</strong>
                              <span className="text-[10.5px] text-slate-400 font-mono">{tx.patientMobile}</span>
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <span className="text-slate-200 block font-medium">{tx.staffName}</span>
                              <span className="text-[10px] text-slate-500 capitalize">{tx.staffRole}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-300">
                              {formatCurrency(tx.planFee || tx.baseAmount || 0)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {(tx.extraMembersCount || 0) > 0 ? (
                                <span className="text-purple-300 font-bold">
                                  +{tx.extraMembersCount} ({formatCurrency(tx.extraMembersFee || tx.additionalMemberAmount || 0)})
                                </span>
                              ) : (
                                <span className="text-slate-500">None (0)</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <strong className="text-blue-300 font-bold">{formatCurrency(tx.amount)}</strong>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <strong className="text-emerald-400 font-bold">{formatCurrency(tx.paidAmount)}</strong>
                              {tx.dueAmount > 0 && (
                                <span className="text-[9.5px] text-rose-400 block">Due: {formatCurrency(tx.dueAmount)}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <span className="text-slate-200 block capitalize">{tx.paymentMethod}</span>
                              {tx.paymentReference && (
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px] block" title={tx.paymentReference}>
                                  Ref: {tx.paymentReference}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-sans">
                              <Button
                                size="sm"
                                variant="outline"
                                className="py-1 px-2.5 text-xs border-teal-500/40 text-teal-300 hover:bg-teal-950/50"
                                leftIcon={<Printer className="w-3 h-3" />}
                                onClick={() => {
                                  const app = applications.find(a => a.id === tx.requestId || a.applicationNo === tx.requestNumber);
                                  if (app) {
                                    setSelectedAppForBillSlip(app);
                                  } else {
                                    setSelectedAppForBillSlip({
                                      id: tx.requestId,
                                      applicationNo: tx.requestNumber,
                                      fullName: tx.patientName,
                                      mobile: tx.patientMobile,
                                      membershipName: tx.planName,
                                      membershipPrice: tx.planFee,
                                      totalPaidAmount: tx.paidAmount,
                                      extraFamilyMembersCount: tx.extraMembersCount,
                                      extraFamilyMembersFee: tx.extraMembersFee,
                                      billId: tx.billId,
                                      billNumber: tx.billNumber,
                                      paymentMethod: tx.paymentMethod,
                                      paymentReference: tx.paymentReference,
                                      status: tx.status as any,
                                      submittedByStaffName: tx.staffName,
                                      submittedByStaffRole: tx.staffRole,
                                      address: { fullAddress: '' },
                                      emergencyContact: { name: '', relationship: '', mobile: '' },
                                      medicalInfo: {},
                                      gender: 'male',
                                      age: 30,
                                      bloodGroup: 'Unknown / Not Known',
                                      companyId: tx.companyId,
                                      createdAt: tx.createdAt,
                                      updatedAt: tx.updatedAt
                                    } as any);
                                  }
                                }}
                              >
                                Print Slip
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. CARD RENEWAL MODAL */}
      {selectedCardForRenew && (
        <CardRenewalModal
          isOpen={!!selectedCardForRenew}
          onClose={() => setSelectedCardForRenew(null)}
          card={selectedCardForRenew}
          patient={patients.find(p => p.id === selectedCardForRenew.patientId) || { id: selectedCardForRenew.patientId, fullName: selectedCardForRenew.patientId } as any}
          onSuccess={() => {
            refreshList();
            setSelectedCardForRenew(null);
          }}
        />
      )}

      {/* 8. CARD REPLACEMENT MODAL */}
      {selectedCardForReplace && (
        <CardReplacementModal
          isOpen={!!selectedCardForReplace}
          onClose={() => setSelectedCardForReplace(null)}
          oldCard={selectedCardForReplace}
          patient={patients.find(p => p.id === selectedCardForReplace.patientId) || { id: selectedCardForReplace.patientId, fullName: selectedCardForReplace.patientId } as any}
          onSuccess={() => {
            refreshList();
            setSelectedCardForReplace(null);
          }}
        />
      )}

      {/* 9. SUPER-ADMIN CARD DELETE & REVOCATION MODAL */}
      {selectedCardForDelete && (
        <SuperAdminCardDeleteModal
          isOpen={!!selectedCardForDelete}
          onClose={() => setSelectedCardForDelete(null)}
          card={selectedCardForDelete}
          onDeleted={() => {
            refreshList();
          }}
        />
      )}

      {/* 10. ONLINE CARD APPLICATION REVIEW MODAL */}
      {selectedApplicationForReview && (
        <CardApplicationReviewModal
          isOpen={!!selectedApplicationForReview}
          onClose={() => setSelectedApplicationForReview(null)}
          application={selectedApplicationForReview}
          onApproved={(newCard) => {
            refreshList();
            setActiveMainView('deck_3d');
            if (newCard) {
              setSearchQuery(newCard.cardNumber);
            }
            showToast('success', 'Moved to Issued Health Cards Deck', 'Application approved and minted. Now displaying issued Health Card.');
          }}
          onRejected={() => {
            refreshList();
          }}
        />
      )}

      {/* 11. REAL MONEY WALLET TOP-UP MODAL */}
      {activePatientForTopUp && (
        <PatientRealMoneyTopUpModal
          isOpen={!!activePatientForTopUp}
          onClose={() => setActivePatientForTopUp(null)}
          patient={activePatientForTopUp}
          wallet={wallets.find(w => w.patientId === activePatientForTopUp.id)}
          card={cards.find(c => c.id === activePatientForTopUp.healthCardId || c.patientId === activePatientForTopUp.id)}
          membership={getMem(cards.find(c => c.id === activePatientForTopUp.healthCardId || c.patientId === activePatientForTopUp.id)?.membershipId, memberships)}
          onSuccess={(receipt) => {
            refreshList();
            setActiveReceiptToPrint(receipt);
          }}
        />
      )}

      {/* 12. DIRECT LAB TEST & PACKAGE BOOKING MODAL */}
      {activePatientForLab && (
        <DirectLabAndPackageBookingModal
          isOpen={!!activePatientForLab}
          onClose={() => setActivePatientForLab(null)}
          patient={activePatientForLab}
          membership={getMem(cards.find(c => c.id === activePatientForLab.healthCardId || c.patientId === activePatientForLab.id)?.membershipId, memberships)}
          walletBalance={wallets.find(w => w.patientId === activePatientForLab.id)?.balance || 0}
          onBookingSuccess={(booking, receipt) => {
            refreshList();
            if (receipt) {
              setActiveReceiptToPrint(receipt);
            }
          }}
        />
      )}

      {/* 13. OFFICIAL CARD CERTIFICATE & RECEIPT PRINT MODAL */}
      {activeReceiptToPrint && (
        <PatientReceiptModal
          isOpen={!!activeReceiptToPrint}
          onClose={() => setActiveReceiptToPrint(null)}
          receipt={activeReceiptToPrint}
        />
      )}

      {/* 14. CREATE CARD REQUEST MODAL */}
      <CreateCardRequestModal
        isOpen={isCreateRequestModalOpen}
        onClose={() => setIsCreateRequestModalOpen(false)}
        onRequestCreated={() => {
          refreshList();
          setActiveMainView('staff_requests_hub');
        }}
      />

      {/* 15. STAFF CARD REQUEST BILL & SLIP PRINTABLE MODAL */}
      <StaffCardRequestBillSlipModal
        isOpen={!!selectedAppForBillSlip}
        onClose={() => setSelectedAppForBillSlip(null)}
        application={selectedAppForBillSlip}
      />
    </div>
  );
};