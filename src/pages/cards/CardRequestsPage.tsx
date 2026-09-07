import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PortalService } from '../../services/portalService';
import { StaffCardRequestService } from '../../services/staffCardRequestService';
import { ApiSyncService } from '../../services/apiSyncService';
import { StorageService } from '../../services/storage';
import { CardService } from '../../services/cardService';
import { CardApplicationRequest, HealthCard, Patient, StaffCardTransaction } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { CreateCardRequestModal } from '../../components/card/CreateCardRequestModal';
import { CardApplicationReviewModal } from '../../components/card/CardApplicationReviewModal';
import { StaffCardRequestBillSlipModal } from '../../components/card/StaffCardRequestBillSlipModal';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  Eye,
  FileText,
  DollarSign,
  Users,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
  Sparkles
} from 'lucide-react';

export const CardRequestsPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isManager = currentUser?.role === 'manager';

  // State
  const [applications, setApplications] = useState<CardApplicationRequest[]>(() => PortalService.getCardApplications());
  const [staffTransactions, setStaffTransactions] = useState<StaffCardTransaction[]>(() => StaffCardRequestService.getStaffTransactions(currentUser));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>(isSuperAdmin || isAdmin ? 'all' : 'mine');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewApp, setReviewApp] = useState<CardApplicationRequest | null>(null);
  const [billSlipApp, setBillSlipApp] = useState<CardApplicationRequest | null>(null);

  // Real-time Firestore sync & cross-tab events
  useEffect(() => {
    const unsubApps = ApiSyncService.subscribeToCollection<CardApplicationRequest>('cardApplications', (items) => {
      if (items) {
        setApplications(PortalService.getCardApplications());
        setStaffTransactions(StaffCardRequestService.getStaffTransactions(currentUser));
      }
    });

    const handleSync = (e: CustomEvent) => {
      if (!e.detail?.key || e.detail.key === 'labmedix_portal_card_applications_v1' || e.detail.key === 'labmedix_card_request_transactions_v1') {
        setApplications(PortalService.getCardApplications());
        setStaffTransactions(StaffCardRequestService.getStaffTransactions(currentUser));
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    return () => {
      unsubApps();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, [currentUser]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      setApplications(PortalService.getCardApplications());
      setStaffTransactions(StaffCardRequestService.getStaffTransactions(currentUser));
      showToast('success', 'Central Sync Complete', 'Card applications updated directly from Firestore.');
    } catch {
      showToast('info', 'Local Cache Updated', 'Card applications refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return applications.filter((app) => {
      // Scope Filter (Mine vs All)
      if (scopeFilter === 'mine') {
        const staffIdentifier = currentUser?.id || currentUser?.uid;
        const isOwner = app.submittedByStaffId === staffIdentifier ||
          app.submittedByStaffName?.toLowerCase() === currentUser?.fullName?.toLowerCase();
        if (!isOwner) return false;
      }

      // Status Filter
      if (statusFilter !== 'all') {
        const s = (app.status || '').toLowerCase();
        if (statusFilter === 'pending' && !['pending', 'submitted', 'pending_approval', 'pending_review', 'under_review'].includes(s)) return false;
        if (statusFilter === 'approved' && !['approved', 'ready', 'card_issued'].includes(s)) return false;
        if (statusFilter === 'rejected' && s !== 'rejected') return false;
        if (statusFilter === 'card_issued' && !['card_issued', 'issued'].includes(s)) return false;
        if (statusFilter === 'needs_info' && !['needs_info', 'info_required', 'returned_for_correction'].includes(s)) return false;
      }

      // Tier Filter
      if (tierFilter !== 'all' && (app.membershipName || app.membershipId || '').toLowerCase() !== tierFilter.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (app.applicationNo || app.trackingId || app.id || '').toLowerCase().includes(q);
        const matchesName = (app.fullName || '').toLowerCase().includes(q);
        const matchesPhone = (app.mobile || '').toLowerCase().includes(q);
        const matchesStaff = (app.submittedByStaffName || '').toLowerCase().includes(q);
        const matchesCardNo = (app.approvedCardNumber || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesStaff && !matchesCardNo) {
          return false;
        }
      }

      return true;
    });
  }, [applications, scopeFilter, statusFilter, tierFilter, searchQuery, currentUser]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const list = scopeFilter === 'mine' 
      ? applications.filter(a => a.submittedByStaffId === currentUser?.id || a.submittedByStaffName === currentUser?.fullName)
      : applications;
    
    const total = list.length;
    const pending = list.filter(a => ['pending', 'submitted', 'pending_approval', 'pending_review', 'under_review'].includes(a.status as string)).length;
    const approved = list.filter(a => a.status === 'approved').length;
    const issued = list.filter(a => a.status === 'card_issued' || a.status === 'issued').length;
    const revenue = list
      .filter(a => a.paymentStatus === 'paid')
      .reduce((sum, a) => sum + (Number(a.totalPaidAmount || a.membershipPrice || 0)), 0);

    return { total, pending, approved, issued, revenue };
  }, [applications, scopeFilter, currentUser]);

  // Direct Quick Approval (Admin only)
  const handleQuickApproveAndIssue = async (app: CardApplicationRequest) => {
    if (!isAdmin && !isManager) return;
    try {
      const res = await PortalService.approveCardApplication(app.id, currentUser?.fullName || 'Super Administrator');
      if (res.success) {
        showToast('success', 'Health Card Minted & Issued', `Card #${res.card?.cardNumber} has been activated.`);
        setApplications(PortalService.getCardApplications());
      } else {
        showToast('error', 'Issuance Failed', res.error || 'Could not issue card.');
      }
    } catch (err: any) {
      showToast('error', 'Issuance Error', err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <CreditCard className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Card Requests & Issuance Hub
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Hospital Workflow
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            Dedicated staff card intake, sequential <code className="text-blue-300 font-mono font-bold">LMX-REQ-YYYY-XXXXXX</code> registration, instant printable slips & Super Admin approval queue.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
            title="Force sync with central Firestore database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Sync Firestore</span>
          </button>

          {can('card_request_create') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black transition shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Card Request</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Requests</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics.total}</p>
          <span className="text-[10px] text-slate-500">All recorded applications</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-300">{metrics.pending}</p>
          <span className="text-[10px] text-amber-500/80">Awaiting Super Admin</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{metrics.approved}</p>
          <span className="text-[10px] text-emerald-500/80">Approved by Admin</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-xs font-bold">
            <span>Cards Minted</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-300">{metrics.issued}</p>
          <span className="text-[10px] text-purple-500/80">Active CR80 Cards</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
            <span>Fees Collected</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300">{formatCurrency(metrics.revenue)}</p>
          <span className="text-[10px] text-cyan-500/80">Verified card enrollment receipts</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Request ID (LMX-REQ-...), Patient Name, Mobile, Card No, or Staff..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Scope Selector (Admins/Managers) */}
          {(isAdmin || isManager) && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700">
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  scopeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Clinic Requests
              </button>
              <button
                onClick={() => setScopeFilter('mine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  scopeFilter === 'mine'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Submissions Only
              </button>
            </div>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="card_issued">Card Issued & Active</option>
            <option value="rejected">Rejected</option>
            <option value="needs_info">Needs Info / Returned</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Card Tiers</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="Platinum">Platinum</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
      </div>

      {/* Requests Table / List */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Requests Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-800 text-blue-400 border border-slate-700">
              {filteredRequests.length} records
            </span>
          </h2>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <CreditCard className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Card Requests Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No card requests match your current search or filter criteria.'
                  : 'No card requests have been submitted yet. Staff can click "Submit Card Request" to initiate.'}
              </p>
            </div>
            {can('card_request_create') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition"
              >
                <Plus className="w-4 h-4" />
                <span>Submit First Request</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Request ID & Date</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Mobile & Aadhaar</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Fee & Payment</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRequests.map((app) => {
                  const reqId = app.applicationNo || app.trackingId || `LMX-REQ-${app.id.slice(0, 8)}`;
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
                    under_review: 'bg-blue-950/60 text-blue-300 border-blue-500/40',
                    approved: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
                    card_issued: 'bg-purple-950/60 text-purple-300 border-purple-500/40',
                    rejected: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
                    needs_info: 'bg-orange-950/60 text-orange-300 border-orange-500/40'
                  };

                  return (
                    <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Request ID */}
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{reqId}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDateTime(app.createdAt)}
                        </div>
                      </td>

                      {/* Patient Name */}
                      <td className="px-4 py-3 font-medium text-white">
                        <div>{app.fullName}</div>
                        <div className="text-[10px] text-slate-400">
                          {app.gender || 'N/A'} • {app.age ? `${app.age} yrs` : 'Age N/A'}
                        </div>
                      </td>

                      {/* Mobile & Gov ID */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-200">{app.mobile || 'N/A'}</div>
                        {app.governmentIdNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {app.governmentIdType || 'ID'}: •••• {app.governmentIdNumber.slice(-4)}
                          </div>
                        )}
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-800 text-blue-300 border border-slate-700">
                          {app.membershipName || app.membershipId || 'Standard'}
                        </span>
                      </td>

                      {/* Fee & Payment */}
                      <td className="px-4 py-3">
                        <div className="font-black text-white">
                          {formatCurrency(Number(app.totalPaidAmount || app.membershipPrice || 0))}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          app.paymentStatus === 'paid'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}>
                          {app.paymentStatus || 'pending'} ({app.paymentMethod || 'cash'})
                        </span>
                      </td>

                      {/* Submitted By */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">
                          {app.submittedByStaffName || 'Staff Intake'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {app.submittedByStaffRole || 'Front Desk'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          statusColors[app.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {app.status?.replace('_', ' ')}
                        </span>
                        {app.approvedCardNumber && (
                          <div className="text-[10px] font-mono text-purple-300 mt-1">
                            Card: {app.approvedCardNumber}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Bill Slip Button */}
                          <button
                            onClick={() => setBillSlipApp(app)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Print Patient Bill / Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Inspect / Review Modal Button */}
                          <button
                            onClick={() => setReviewApp(app)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition"
                            title="Review Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Direct Quick Approve & Issue (Super Admin only for pending/approved) */}
                          {(isAdmin || isManager) && app.status !== 'card_issued' && app.status !== 'rejected' && (
                            <button
                              onClick={() => handleQuickApproveAndIssue(app)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition shadow-sm"
                              title="Single-click Mint & Issue Health Card"
                            >
                              Issue Card
                            </button>
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

      {/* Staff Submission Intake Modal */}
      {isCreateModalOpen && (
        <CreateCardRequestModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onRequestCreated={() => {
            setApplications(PortalService.getCardApplications());
            setStaffTransactions(StaffCardRequestService.getStaffTransactions(currentUser));
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Super Admin Review Modal */}
      {reviewApp && (
        <CardApplicationReviewModal
          isOpen={!!reviewApp}
          onClose={() => setReviewApp(null)}
          application={reviewApp}
          onApproved={(card) => {
            setApplications(PortalService.getCardApplications());
            setReviewApp(null);
            if (card) {
              showToast('success', 'Health Card Minted', `Card ${card.cardNumber} is now live.`);
            }
          }}
          onRejected={() => {
            setApplications(PortalService.getCardApplications());
            setReviewApp(null);
          }}
        />
      )}

      {/* Printable Bill Slip Modal */}
      {billSlipApp && (
        <StaffCardRequestBillSlipModal
          isOpen={!!billSlipApp}
          onClose={() => setBillSlipApp(null)}
          application={billSlipApp}
        />
      )}
    </div>
  );
};
