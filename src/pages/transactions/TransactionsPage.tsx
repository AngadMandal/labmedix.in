import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StaffCardRequestService } from '../../services/staffCardRequestService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { StaffCardTransaction, User } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  User as UserIcon,
  ShieldCheck,
  Building,
  Printer,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isManager = currentUser?.role === 'manager';
  const canViewAll = isSuperAdmin || isAdmin || isManager;

  // State
  const [allTransactions, setAllTransactions] = useState<StaffCardTransaction[]>(() => StorageService.getCardRequestTransactions());
  const [staffUsers, setStaffUsers] = useState<User[]>(() => StorageService.getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'today', 'week', 'month'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTxnForReceipt, setSelectedTxnForReceipt] = useState<StaffCardTransaction | null>(null);

  // Real-time Firestore sync & cross-tab events
  useEffect(() => {
    const unsub = ApiSyncService.subscribeToCollection<StaffCardTransaction>('card_transactions', (items) => {
      if (items) {
        setAllTransactions(StorageService.getCardRequestTransactions());
      }
    });

    const handleSync = (e: CustomEvent) => {
      if (!e.detail?.key || e.detail.key === 'labmedix_card_request_transactions_v1' || e.detail.key === 'labmedix_bills_v1') {
        setAllTransactions(StorageService.getCardRequestTransactions());
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    return () => {
      unsub();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      setAllTransactions(StorageService.getCardRequestTransactions());
      setStaffUsers(StorageService.getUsers());
      showToast('success', 'Central Sync Complete', 'Transactions reconciled with central Firestore.');
    } catch {
      setAllTransactions(StorageService.getCardRequestTransactions());
      showToast('info', 'Local Cache Updated', 'Transactions refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Base scope filtering (Role Isolation)
  const scopedTransactions = useMemo(() => {
    if (canViewAll) {
      if (staffFilter === 'all') return allTransactions;
      return allTransactions.filter(t => t.staffUserId === staffFilter || t.staffName === staffFilter);
    }
    // Staff sees only their own transactions
    return StaffCardRequestService.getStaffTransactions(currentUser);
  }, [allTransactions, canViewAll, staffFilter, currentUser]);

  // Applied Filters
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return scopedTransactions.filter((txn) => {
      // Payment Method Filter
      if (methodFilter !== 'all' && (txn.paymentMethod || '').toLowerCase() !== methodFilter.toLowerCase()) {
        return false;
      }

      // Status Filter
      const txnStatus = txn.paymentStatus || txn.status || 'paid';
      if (statusFilter !== 'all' && txnStatus !== statusFilter) {
        return false;
      }

      // Date Filter
      if (dateFilter === 'today') {
        const txnDate = (txn.createdAt || '').slice(0, 10);
        if (txnDate !== todayStr) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        if ((txn.createdAt || '') < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        if ((txn.createdAt || '') < monthAgo) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (txn.transactionId || txn.id || '').toLowerCase().includes(q);
        const matchesPatient = (txn.patientName || '').toLowerCase().includes(q);
        const matchesStaff = (txn.staffName || '').toLowerCase().includes(q);
        const matchesBill = (txn.billNumber || '').toLowerCase().includes(q);
        const matchesRef = (txn.paymentReference || '').toLowerCase().includes(q);
        if (!matchesId && !matchesPatient && !matchesStaff && !matchesBill && !matchesRef) {
          return false;
        }
      }

      return true;
    });
  }, [scopedTransactions, methodFilter, statusFilter, dateFilter, searchQuery]);

  // Financial Metrics
  const metrics = useMemo(() => {
    const totalCount = scopedTransactions.length;
    const totalBilled = scopedTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const totalPaid = scopedTransactions.reduce((acc, t) => acc + (Number(t.paidAmount) || 0), 0);
    const totalDue = scopedTransactions.reduce((acc, t) => acc + (Number(t.dueAmount) || 0), 0);

    // Channel Breakdown
    const cashTotal = scopedTransactions
      .filter(t => (t.paymentMethod || '').toLowerCase() === 'cash')
      .reduce((acc, t) => acc + (Number(t.paidAmount) || 0), 0);

    const upiTotal = scopedTransactions
      .filter(t => (t.paymentMethod || '').toLowerCase() === 'upi')
      .reduce((acc, t) => acc + (Number(t.paidAmount) || 0), 0);

    const cardTotal = scopedTransactions
      .filter(t => (t.paymentMethod || '').toLowerCase() === 'card')
      .reduce((acc, t) => acc + (Number(t.paidAmount) || 0), 0);

    return { totalCount, totalBilled, totalPaid, totalDue, cashTotal, upiTotal, cardTotal };
  }, [scopedTransactions]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      showToast('error', 'No Data', 'There are no transactions to export.');
      return;
    }

    const headers = ['Transaction ID', 'Date', 'Patient Name', 'Bill Number', 'Category', 'Total Amount', 'Paid Amount', 'Due Amount', 'Method', 'Reference', 'Staff Name', 'Status'];
    const rows = filteredTransactions.map(t => [
      t.transactionId || t.id,
      formatDateTime(t.createdAt),
      t.patientName,
      t.billNumber || 'N/A',
      t.membershipName || t.notes || 'Health Card',
      t.amount,
      t.paidAmount,
      t.dueAmount,
      t.paymentMethod,
      t.paymentReference || 'N/A',
      t.staffName,
      t.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LabMedix_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Export Complete', 'Financial transactions exported to CSV.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-purple-900/20 border border-cyan-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-500/30">
              <DollarSign className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Financial Ledger & Revenue Hub
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                {canViewAll ? 'Hospital Master View' : 'My Staff Ledger'}
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            {canViewAll
              ? 'Complete clinic financial audit, staff cash drawer settlements, UPI collections & real-time revenue ledger.'
              : 'Your personal financial collection ledger, settled deposits, and reconciled receipts.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Collected</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatCurrency(metrics.totalPaid)}</p>
          <span className="text-[10px] text-slate-500">Gross reconciled cash & digital</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Outstanding Due</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300">{formatCurrency(metrics.totalDue)}</p>
          <span className="text-[10px] text-slate-500">Pending patient balances</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Cash Desk Drawer</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300">{formatCurrency(metrics.cashTotal)}</p>
          <span className="text-[10px] text-cyan-500/80">Cash collected</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>UPI & Digital POS</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-300">{formatCurrency(metrics.upiTotal + metrics.cardTotal)}</p>
          <span className="text-[10px] text-purple-500/80">Online bank settlement</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Transaction ID (TXN-...), Bill #, Patient, Staff, or Reference..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Super Admin Staff Filter */}
          {canViewAll && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Hospital Staff ({staffUsers.length})</option>
              {staffUsers.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
              ))}
            </select>
          )}

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today's Shift</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>

          {/* Payment Method */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash Desk</option>
            <option value="upi">UPI Transfer</option>
            <option value="card">Debit / Credit Card</option>
            <option value="netbanking">Net Banking</option>
            <option value="wallet">Health Wallet</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid & Settled</option>
            <option value="pending">Pending Due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Financial Transactions Ledger</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-800 text-cyan-400 border border-slate-700">
              {filteredTransactions.length} records
            </span>
          </h2>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <DollarSign className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-bold text-white">No Transactions Recorded</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No financial entries match your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Txn ID & Date</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Bill / Invoice No</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Paid Amount</th>
                  <th className="px-4 py-3">Due Balance</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Collector / Staff</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.map((txn) => {
                  const statusColors: Record<string, string> = {
                    paid: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
                    pending: 'bg-amber-950 text-amber-300 border-amber-500/30',
                    partial: 'bg-blue-950 text-blue-300 border-blue-500/30',
                    cancelled: 'bg-rose-950 text-rose-300 border-rose-500/30'
                  };

                  return (
                    <tr key={txn.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-white">{txn.transactionId || txn.id}</div>
                        <div className="text-[10px] text-slate-400">{formatDateTime(txn.createdAt)}</div>
                      </td>

                      <td className="px-4 py-3 font-medium text-white">
                        <div>{txn.patientName}</div>
                        <div className="text-[10px] text-slate-400">{txn.membershipName || txn.notes || 'Hospital Service'}</div>
                      </td>

                      <td className="px-4 py-3 font-mono text-cyan-300">
                        {txn.billNumber || 'INVOICE-POS'}
                      </td>

                      <td className="px-4 py-3 font-black text-white">
                        {formatCurrency(Number(txn.amount || 0))}
                      </td>

                      <td className="px-4 py-3 font-mono text-emerald-300 font-bold">
                        {formatCurrency(Number(txn.paidAmount || 0))}
                      </td>

                      <td className="px-4 py-3 font-mono text-amber-300">
                        {formatCurrency(Number(txn.dueAmount || 0))}
                      </td>

                      <td className="px-4 py-3 font-mono uppercase text-[11px] text-slate-300">
                        {txn.paymentMethod || 'cash'}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <div className="font-medium">{txn.staffName || 'Front Desk Staff'}</div>
                        <div className="text-[10px] text-slate-500">{txn.staffRole}</div>
                      </td>

                      <td className="px-4 py-3">
                        {(() => {
                          const displayStatus = txn.paymentStatus || txn.status || 'paid';
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                              statusColors[displayStatus] || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedTxnForReceipt(txn)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white transition"
                          title="Print Receipt Slip"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedTxnForReceipt && (
        <Modal
          isOpen={!!selectedTxnForReceipt}
          onClose={() => setSelectedTxnForReceipt(null)}
          title="Payment Receipt Slip"
          maxWidth="md"
        >
          <div className="p-4 space-y-4 text-center bg-white text-slate-900 rounded-2xl shadow-inner font-sans text-xs">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black tracking-tight text-slate-900">LABMEDIX HEALTHCARE</h3>
              <p className="text-[11px] text-slate-500">Official Cash Desk Payment Receipt</p>
            </div>

            <div className="py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Amount Received</div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatCurrency(Number(selectedTxnForReceipt.paidAmount || 0))}
              </div>
              <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                Status: PAID via {selectedTxnForReceipt.paymentMethod?.toUpperCase()}
              </div>
            </div>

            <div className="text-left space-y-2 border border-slate-200 p-3 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-500">Txn ID:</span>
                <strong className="font-mono text-slate-900">{selectedTxnForReceipt.transactionId || selectedTxnForReceipt.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-700">{formatDateTime(selectedTxnForReceipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <strong className="text-slate-900">{selectedTxnForReceipt.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Collected By:</span>
                <span className="text-slate-700">{selectedTxnForReceipt.staffName} ({selectedTxnForReceipt.staffRole})</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md"
              >
                Print Slip
              </button>
              <button
                onClick={() => setSelectedTxnForReceipt(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
