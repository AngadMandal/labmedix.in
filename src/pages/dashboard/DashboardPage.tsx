import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { EMRService } from '../../services/emrService';
import { DoctorMasterService } from '../../services/doctorMasterService';
import { PharmacyService } from '../../services/pharmacyService';
import { PortalService } from '../../services/portalService';
import { FamilyService } from '../../services/familyService';
import { TransactionService } from '../../services/transactionService';
import { BillService } from '../../services/billService';
import { Patient, HealthCard, Membership, Wallet, WalletTransaction, AuditLog, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { StatsCard } from '../../components/common/StatsCard';
import { TodayClinicalSummaryWidget } from '../../components/dashboard/TodayClinicalSummaryWidget';
import { MonthlyActivityHeatmap } from '../../components/dashboard/MonthlyActivityHeatmap';
import { PatientVitalsDashboardWidget } from '../../components/dashboard/PatientVitalsDashboardWidget';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { WalletTransactionModal } from '../../components/wallet/WalletTransactionModal';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  Users,
  CreditCard,
  Wallet as WalletIcon,
  AlertTriangle,
  Award,
  PlusCircle,
  QrCode,
  Printer,
  ArrowUpRight,
  TrendingUp,
  Activity,
  UserCheck,
  Zap,
  Sparkles,
  Shield,
  Layers,
  Search,
  Database,
  BarChart3,
  Clock,
  PhoneCall,
  Stethoscope,
  FlaskConical,
  Pill,
  Receipt,
  CheckCircle2,
  DollarSign,
  HeartHandshake
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { companyProfile } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mobileLookup, setMobileLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  const [patientsList, setPatientsList] = useState<Patient[]>(() => StorageService.getPatients());
  const [cardsList, setCardsList] = useState<HealthCard[]>(() => StorageService.getCards());
  const [membershipsList, setMembershipsList] = useState<Membership[]>(() => StorageService.getMemberships());
  const [walletsList, setWalletsList] = useState<Wallet[]>(() => StorageService.getWallets());
  const [transactionsList, setTransactionsList] = useState<WalletTransaction[]>(() => StorageService.getTransactions());
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [usersList, setUsersList] = useState<User[]>(() => StorageService.getUsers());

  useEffect(() => {
    const unsubPatients = ApiSyncService.subscribeToCollection<Patient>('patients', (items) => {
      if (Array.isArray(items)) setPatientsList(items);
    });
    const unsubCards = ApiSyncService.subscribeToCollection<HealthCard>('cards', (items) => {
      if (Array.isArray(items)) setCardsList(items);
    });
    const unsubMemberships = ApiSyncService.subscribeToCollection<Membership>('memberships', (items) => {
      if (Array.isArray(items)) setMembershipsList(items);
    });
    const unsubWallets = ApiSyncService.subscribeToCollection<Wallet>('wallets', (items) => {
      if (Array.isArray(items)) setWalletsList(items);
    });
    const unsubTransactions = ApiSyncService.subscribeToCollection<WalletTransaction>('transactions', (items) => {
      if (Array.isArray(items)) setTransactionsList(items);
    });
    const unsubAudit = ApiSyncService.subscribeToCollection<AuditLog>('auditLogs', (items) => {
      if (Array.isArray(items)) setAuditLogsList(items);
    });
    const unsubUsers = ApiSyncService.subscribeToCollection<User>('users', (items) => {
      if (Array.isArray(items)) setUsersList(items);
    });

    const handleSync = () => {
      setPatientsList(StorageService.getPatients());
      setCardsList(StorageService.getCards());
      setMembershipsList(StorageService.getMemberships());
      setWalletsList(StorageService.getWallets());
      setTransactionsList(StorageService.getTransactions());
      setAuditLogsList(StorageService.getAuditLogs());
      setUsersList(StorageService.getUsers());
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    return () => {
      unsubPatients();
      unsubCards();
      unsubMemberships();
      unsubWallets();
      unsubTransactions();
      unsubAudit();
      unsubUsers();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const patients = patientsList.filter(p => !p.isDeleted);
  const cards = cardsList;
  const memberships = membershipsList;
  const wallets = walletsList;
  const transactions = transactionsList;
  const auditLogs = auditLogsList.slice(0, 6);
  const users = usersList;

  const totalPatients = patients.length;
  const activeCards = cards.filter(c => c.status === 'active').length;
  const expiredCards = cards.filter(c => c.status === 'expired' || new Date(c.expiryDate) < new Date()).length;
  const totalWalletBalance = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);

  // 16 Live Command Center Metrics (Strictly Real Live Data, Zero Mock Multipliers)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPatients = patients.filter(p => (p.createdAt || '').slice(0, 10) === todayStr).length;
  const cardRequests = PortalService.getCardApplications();
  const pendingCardRequests = cardRequests.filter(r => 
    r.status === 'submitted' || 
    r.status === 'pending_review' || 
    r.status === 'under_review' || 
    r.status === 'pending_approval' || 
    r.status === 'pending_verification'
  ).length;
  const families = FamilyService.getAll();
  const totalFamilyMembers = families.reduce((sum: number, f) => sum + (f.members?.length || 0), 0);
  const allAppointments = EMRService.getAllAppointments();
  const todayAppointments = allAppointments.filter(a => a.patientWishDate === todayStr || (a.createdAt || '').slice(0, 10) === todayStr).length;
  const allDoctors = DoctorMasterService.getAllDoctors();
  const activeDoctors = allDoctors.filter(d => d.status === 'active').length;
  const allLabOrders = PortalService.getLabBookings();
  const totalLabOrders = allLabOrders.length;
  const pendingLabReports = allLabOrders.filter(o => o.status !== 'report_ready').length;
  const pharmacyMovements = PharmacyService.getStockMovements();
  const pharmacyDispensedToday = pharmacyMovements.filter(m => m.type === 'STOCK_OUT_DISPENSED' && (m.timestamp || '').slice(0, 10) === todayStr).length;
  const allBills = StorageService.getBills();
  const todayBillingGross = allBills
    .filter(b => (b.date || b.createdAt || '').slice(0, 10) === todayStr)
    .reduce((sum: number, b) => sum + (b.netPayable || 0), 0);
  const allTxns = TransactionService.getAll();
  const totalTransactionsCount = allTxns.length;
  const totalPaidRevenue = allTxns.reduce((sum: number, t) => sum + (t.paid || 0), 0);
  const totalOutstandingDue = allTxns.reduce((sum: number, t) => sum + (t.due || 0), 0);
  const pendingApprovalsCount = pendingCardRequests + allAppointments.filter(a => a.status === 'pending_doctor_approval').length;
  const activeStaffSessions = users.filter(u => u.status === 'active').length;

  const membershipDistribution = memberships.map(mem => {
    const count = cards.filter(c => c.membershipId === mem.id).length;
    return {
      name: mem.name,
      value: count,
      color: mem.color
    };
  }).filter(m => m.value > 0);

  // Dynamically compute real monthly card issuances & renewals from production timestamps
  const monthlyData = React.useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthLabel = monthNames[monthIdx];

      const issuedInMonth = cards.filter(c => {
        if (!c.issueDate) return false;
        const cDate = new Date(c.issueDate);
        return cDate.getFullYear() === year && cDate.getMonth() === monthIdx;
      }).length;

      const renewalsInMonth = cards.filter(c => {
        if (!c.lastRenewedAt) return false;
        const rDate = new Date(c.lastRenewedAt);
        return rDate.getFullYear() === year && rDate.getMonth() === monthIdx;
      }).length;

      result.push({
        month: monthLabel,
        cards: issuedInMonth,
        renewals: renewalsInMonth
      });
    }
    return result;
  }, [cards]);

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileLookup.trim()) return;
    const found = patients.find(p => p.mobile.includes(mobileLookup.trim()) || p.id.toLowerCase().includes(mobileLookup.toLowerCase()));
    if (found) {
      setLookupResult(found);
    } else {
      showToast('error', 'Not Found', 'No patient found with that mobile number or ID.');
      setLookupResult(null);
    }
  };

  const handleQuickSnapshot = () => {
    navigate('/super-admin/backup-recovery');
  };

  const activeRole = currentUser?.role || 'super_admin';

  return (
    <div className="space-y-8">
      {/* Dynamic Role-Aware Executive Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Active Operational Mode: {activeRole.toUpperCase().replace('_', ' ')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white">
            Welcome, {currentUser?.fullName}!
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mt-1">
            {companyProfile.name} • {companyProfile.subtitle} • Confident In Care
          </p>
        </div>

        {/* Dynamic Superpower Actions Toolbar based on Role */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {/* Reception Superpower */}
          {activeRole === 'reception' && (
            <>
              <Button
                variant="success"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                onClick={() => navigate('/patients/new')}
              >
                Fast Walk-in Registration
              </Button>
            </>
          )}

          {/* Card Operator Superpower */}
          {activeRole === 'card_operator' && (
            <>
              <Button
                variant="success"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => navigate('/card-studio')}
              >
                Launch Card Studio
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Layers className="w-4 h-4" />}
                onClick={() => navigate('/cards/print-sheet')}
              >
                Batch A4 Sheet Print
              </Button>
            </>
          )}

          {/* Manager Superpower */}
          {activeRole === 'manager' && (
            <>
              <Button
                variant="secondary"
                leftIcon={<BarChart3 className="w-4 h-4" />}
                onClick={() => navigate('/reports')}
              >
                Branch Operations Report
              </Button>
            </>
          )}

          {/* Super Admin & Admin Superpower */}
          {(activeRole === 'super_admin' || activeRole === 'admin') && (
            <>
              <Button
                variant="success"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={() => navigate('/users')}
              >
                Manage Staff ({users.length})
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Database className="w-4 h-4" />}
                onClick={handleQuickSnapshot}
              >
                Backup & Recovery Center
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Reception Desk Quick Walk-In Lookup Widget (Embedded Fast Top-Up) */}
      {activeRole === 'reception' && (
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:to-slate-900 p-6 rounded-3xl border border-emerald-300/40 dark:border-emerald-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Front Desk Fast-Track Lookup & Wallet Top-Up
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Reception Accelerator</span>
          </div>

          <form onSubmit={handleMobileSearch} className="flex gap-2 max-w-xl">
            <Input
              placeholder="Enter Patient Mobile Number or Patient ID..."
              value={mobileLookup}
              onChange={(e) => setMobileLookup(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
            <Button type="submit" variant="primary">
              Find Patient
            </Button>
          </form>

          {lookupResult && (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={lookupResult.photoUrl || '/logo.jpg'} alt="" className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white block">{lookupResult.fullName}</strong>
                  <span className="text-xs text-slate-500 font-mono">{lookupResult.id} • Mobile: {lookupResult.mobile}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="success" onClick={() => setIsDepositModalOpen(true)}>
                  Deposit Wallet Float
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${lookupResult.id}`)}>
                  Open Profile
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Live Clinical & Registration Summary Widget */}
      <TodayClinicalSummaryWidget />

      {/* Monthly Activity & Prescription Spike Heatmap */}
      <MonthlyActivityHeatmap />

      {/* Central Command Center: 16 Live Real-Time Firestore Metrics */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                Command Center Live Telemetry
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  16 / 16 Sensors Online
                </span>
              </h3>
              <p className="text-xs text-slate-400">Strictly synchronized live with central Firestore database.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Ledger Float:</span>
            <span className="text-xs font-black text-emerald-400 font-mono px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30">
              {formatCurrency(totalWalletBalance)}
            </span>
          </div>
        </div>

        {/* 16 Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3.5">
          {/* 1. Total Patients */}
          <div
            onClick={() => navigate('/patients')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-blue-500/20 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-blue-400 text-xs font-bold">
              <span>Total Patients</span>
              <Users className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-white font-mono">{totalPatients}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>All registered</span>
              <span className="text-blue-400 font-bold">View &rarr;</span>
            </div>
          </div>

          {/* 2. Today's Patients */}
          <div
            onClick={() => navigate('/patients')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/20 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-teal-400 text-xs font-bold">
              <span>Today's Patients</span>
              <PlusCircle className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-teal-300 font-mono">{todayPatients}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>New registrations</span>
              <span className="text-teal-400 font-bold">View &rarr;</span>
            </div>
          </div>

          {/* 3. Active Cards */}
          <div
            onClick={() => navigate('/cards')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
              <span>Active Health Cards</span>
              <CreditCard className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-emerald-300 font-mono">{activeCards}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Verified CR80 chips</span>
              <span className="text-emerald-400 font-bold">View &rarr;</span>
            </div>
          </div>

          {/* 4. Pending Card Requests */}
          <div
            onClick={() => navigate('/cards/requests')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
              <span>Pending Card Requests</span>
              <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-amber-300 font-mono">{pendingCardRequests}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Review lifecycle</span>
              <span className="text-amber-400 font-bold">Review &rarr;</span>
            </div>
          </div>

          {/* 5. Family Members */}
          <div
            onClick={() => navigate('/families')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-indigo-400 text-xs font-bold">
              <span>Family Members</span>
              <HeartHandshake className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-indigo-300 font-mono">{totalFamilyMembers}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Shield (max 5/family)</span>
              <span className="text-indigo-400 font-bold">View &rarr;</span>
            </div>
          </div>

          {/* 6. Today's Appointments */}
          <div
            onClick={() => navigate('/appointments')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
              <span>Today's Appointments</span>
              <Clock className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-cyan-300 font-mono">{todayAppointments}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>OPD consultations</span>
              <span className="text-cyan-400 font-bold">Queue &rarr;</span>
            </div>
          </div>

          {/* 7. Active Doctors */}
          <div
            onClick={() => navigate('/doctors')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/20 hover:border-rose-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
              <span>Active Doctors</span>
              <Stethoscope className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-rose-300 font-mono">{activeDoctors}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Consultants on roster</span>
              <span className="text-rose-400 font-bold">Doctors &rarr;</span>
            </div>
          </div>

          {/* 8. Total Lab Orders */}
          <div
            onClick={() => navigate('/laboratory')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-violet-500/20 hover:border-violet-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-violet-400 text-xs font-bold">
              <span>Total Lab Orders</span>
              <FlaskConical className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-violet-300 font-mono">{totalLabOrders}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Pathology requisitions</span>
              <span className="text-violet-400 font-bold">Lab &rarr;</span>
            </div>
          </div>

          {/* 9. Pending Lab Reports */}
          <div
            onClick={() => navigate('/laboratory')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-yellow-500/20 hover:border-yellow-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-yellow-400 text-xs font-bold">
              <span>Pending Lab Reports</span>
              <Activity className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-yellow-300 font-mono">{pendingLabReports}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Awaiting sign-off</span>
              <span className="text-yellow-400 font-bold">Process &rarr;</span>
            </div>
          </div>

          {/* 10. Pharmacy Dispensed Today */}
          <div
            onClick={() => navigate('/pharmacy')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-lime-500/20 hover:border-lime-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-lime-400 text-xs font-bold">
              <span>Pharmacy Dispensed</span>
              <Pill className="w-4 h-4 text-lime-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-lime-300 font-mono">{pharmacyDispensedToday}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Dispensed today</span>
              <span className="text-lime-400 font-bold">Counter &rarr;</span>
            </div>
          </div>

          {/* 11. Today's Billing Gross */}
          <div
            onClick={() => navigate('/transactions')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
              <span>Today's Gross Billing</span>
              <Receipt className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-emerald-300 font-mono">{formatCurrency(todayBillingGross)}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Invoices today</span>
              <span className="text-emerald-400 font-bold">Ledger &rarr;</span>
            </div>
          </div>

          {/* 12. Total Transactions */}
          <div
            onClick={() => navigate('/transactions')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/20 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-purple-400 text-xs font-bold">
              <span>Total Transactions</span>
              <BarChart3 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-purple-300 font-mono">{totalTransactionsCount}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Hospital journal</span>
              <span className="text-purple-400 font-bold">Audit &rarr;</span>
            </div>
          </div>

          {/* 13. Paid Ledger Total */}
          <div
            onClick={() => navigate('/transactions')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/20 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-teal-400 text-xs font-bold">
              <span>Paid Collections</span>
              <DollarSign className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-teal-300 font-mono">{formatCurrency(totalPaidRevenue)}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Realized cash & UPI</span>
              <span className="text-teal-400 font-bold">View &rarr;</span>
            </div>
          </div>

          {/* 14. Outstanding Dues */}
          <div
            onClick={() => navigate('/transactions')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-orange-400 text-xs font-bold">
              <span>Outstanding Dues</span>
              <AlertTriangle className="w-4 h-4 text-orange-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-orange-300 font-mono">{formatCurrency(totalOutstandingDue)}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Uncollected dues</span>
              <span className="text-orange-400 font-bold">Collect &rarr;</span>
            </div>
          </div>

          {/* 15. Pending Approvals */}
          <div
            onClick={() => navigate('/cards/requests')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-red-500/20 hover:border-red-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-red-400 text-xs font-bold">
              <span>Pending Approvals</span>
              <Shield className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-red-300 font-mono">{pendingApprovalsCount}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Cards & OPD reviews</span>
              <span className="text-red-400 font-bold">Review &rarr;</span>
            </div>
          </div>

          {/* 16. Active Staff & Doctors */}
          <div
            onClick={() => navigate('/users')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/20 hover:border-sky-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg space-y-2 group"
          >
            <div className="flex items-center justify-between text-sky-400 text-xs font-bold">
              <span>Active Staff & Doctors</span>
              <UserCheck className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-2xl font-black text-sky-300 font-mono">{activeStaffSessions}</p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Active accounts</span>
              <span className="text-sky-400 font-bold">Staff &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Vitals & Bio-Telemetry Trends Module */}
      <PatientVitalsDashboardWidget />

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Issuances Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Health Card Issuances & Renewals
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time volume distribution for {new Date().getFullYear()}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-brand-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg">
              Total: {cards.length} Cards
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" fontSize={12} stroke="#94A3B8" />
                <YAxis fontSize={12} stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none' }}
                />
                <Bar dataKey="cards" name="New Cards" fill="#0B4F9C" radius={[6, 6, 0, 0]} />
                <Bar dataKey="renewals" name="Renewals" fill="#109B48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Membership Tier Distribution Donut */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Membership Tiers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active patient tier breakdown
            </p>
          </div>

          <div className="h-48 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={membershipDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {membershipDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {membershipDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                </div>
                <strong className="text-slate-900 dark:text-white">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Patients & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-blue" />
              Recent Patient Registrations
            </h3>
            <button
              onClick={() => navigate('/patients')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {patients.slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p.photoUrl || '/logo.jpg'}
                    alt={p.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                  <div>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                      {p.fullName}
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      {p.id} • {p.mobile}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-emerald-600 block">
                    {p.bloodGroup} Blood Group
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(p.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Access Audit Log - Last 5 Entries Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                System Access Audit Log (Last 5 Entries)
              </h3>
              <button
                onClick={() => navigate('/activity')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Full Log <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 mb-4">
              Real-time monitoring of security access, logins, and administrative actions.
            </p>
          </div>

          <div className="space-y-3">
            {auditLogsList.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate uppercase font-mono">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                    {log.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      User: {log.userId}
                    </span>
                    <span className="bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      Module: {log.module}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {auditLogsList.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No system access logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {lookupResult && (
        <WalletTransactionModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          patient={lookupResult}
          wallet={StorageService.getWallets().find(w => w.patientId === lookupResult.id) || {
            id: 'wal_temp',
            patientId: lookupResult.id,
            balance: 0,
            totalCredits: 0,
            totalDebits: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }}
          onSuccess={() => {
            showToast('success', 'Wallet Credited', `Deposit credited to ${lookupResult.fullName}.`);
            setIsDepositModalOpen(false);
          }}
        />
      )}
    </div>
  );
};