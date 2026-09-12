import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { AuditService } from '../../services/auditService';
import { StandardHalfPageBill, StandardBillData } from '../../components/billing/StandardHalfPageBill';
import {
  PatientBill,
  CompanyProfile,
  BillPrintRecord,
  PrintDocumentType
} from '../../types';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Printer,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Download,
  Building,
  CreditCard,
  User,
  Sparkles,
  ShieldCheck,
  Receipt,
  Layers,
  History
} from 'lucide-react';

const PRINT_HISTORY_KEY = 'labmedix_print_center_history_v1';

export const PrintCenterPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();
  const company: CompanyProfile = StorageService.getCompanyProfile();

  // State
  const [bills, setBills] = useState<PatientBill[]>(() => StorageService.getBills());
  const [printHistory, setPrintHistory] = useState<BillPrintRecord[]>(() =>
    StorageService.getItem<BillPrintRecord[]>(PRINT_HISTORY_KEY, [])
  );
  const [activeTab, setActiveTab] = useState<'documents' | 'history'>('documents');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [previewBill, setPreviewBill] = useState<StandardBillData | null>(null);
  const [reprintModalBill, setReprintModalBill] = useState<PatientBill | null>(null);
  const [reprintReason, setReprintReason] = useState('Patient Requested Duplicate Copy');

  useEffect(() => {
    const handleSync = () => {
      setBills(StorageService.getBills());
      setPrintHistory(StorageService.getItem<BillPrintRecord[]>(PRINT_HISTORY_KEY, []));
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setBills(StorageService.getBills());
      setPrintHistory(StorageService.getItem<BillPrintRecord[]>(PRINT_HISTORY_KEY, []));
      setIsRefreshing(false);
      showToast('info', 'Print Center Refreshed', 'Latest invoices and print counter logs synchronized.');
    }, 400);
  };

  // Convert PatientBill to StandardBillData for A4 Half-Page rendering
  const mapToStandardBill = (bill: PatientBill): StandardBillData => {
    const historyItem = printHistory.find(h => h.referenceNumber === bill.billNumber);
    const printCount = historyItem ? historyItem.printCount : 0;

    const subtotal = bill.netPayable + (bill.discountAmount || 0);
    const dueAmount = Math.max(0, bill.netPayable - bill.paidAmount);
    const category = bill.billCategory || 'general';

    return {
      billNumber: bill.billNumber,
      date: bill.createdAt || bill.date || new Date().toISOString(),
      patientName: bill.patientName,
      patientId: bill.patientId,
      patientMobile: bill.patientMobile,
      category,
      items: bill.items && bill.items.length > 0
        ? bill.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            total: item.total
          }))
        : [{
            description: `Hospital Service (${category.toUpperCase()})`,
            quantity: 1,
            unitPrice: bill.netPayable,
            discount: bill.discountAmount || 0,
            total: bill.netPayable
          }],
      subtotal,
      discountAmount: bill.discountAmount || 0,
      taxAmount: 0,
      netPayable: bill.netPayable,
      paidAmount: bill.paidAmount,
      dueAmount,
      paymentMethod: bill.paymentMethod,
      authorizedStaffName: bill.authorizedStaff?.name || currentUser?.fullName || 'Authorized Staff',
      notes: printCount > 0 ? `OFFICIAL REPRINT / DUPLICATE COPY #${printCount + 1}` : undefined
    };
  };

  // Register Print / Reprint Execution
  const registerPrintAction = (bill: PatientBill, reason?: string) => {
    const existing = StorageService.getItem<BillPrintRecord[]>(PRINT_HISTORY_KEY, []);
    const index = existing.findIndex(h => h.referenceNumber === bill.billNumber);

    let updatedHistory: BillPrintRecord[];
    let newCount = 1;

    if (index >= 0) {
      newCount = existing[index].printCount + 1;
      const updatedRecord: BillPrintRecord = {
        ...existing[index],
        printCount: newCount,
        lastPrintedAt: new Date().toISOString(),
        reprintReason: reason || 'Reprint copy requested',
        printedBy: currentUser?.fullName || 'Active Staff'
      };
      updatedHistory = [...existing];
      updatedHistory[index] = updatedRecord;
    } else {
      const newRecord: BillPrintRecord = {
        id: `PRINT-${Date.now()}`,
        documentType: 'patient_bill',
        referenceNumber: bill.billNumber,
        patientName: bill.patientName,
        patientId: bill.patientId,
        printedBy: currentUser?.fullName || 'Active Staff',
        printCount: 1,
        lastPrintedAt: new Date().toISOString(),
        paperFormat: 'A4_half_page'
      };
      updatedHistory = [newRecord, ...existing];
    }

    StorageService.setItem(PRINT_HISTORY_KEY, updatedHistory);
    setPrintHistory(updatedHistory);

    AuditService.log(
      'BILL_PRINTED',
      'billing',
      `Printed ${newCount > 1 ? `DUPLICATE REPRINT #${newCount}` : 'ORIGINAL'} bill ${bill.billNumber} for ${bill.patientName}. Reason: ${reason || 'Initial printing'}.`,
      bill.id
    );

    // Sync to PostgreSQL
    try {
      ApiSyncService.saveDocument('print_history', bill.billNumber, {
        referenceNumber: bill.billNumber,
        printCount: newCount,
        lastPrintedAt: new Date().toISOString(),
        printedBy: currentUser?.fullName || 'Staff'
      });
    } catch {}
  };

  // Trigger Print Directly or through Reprint Prompt
  const handlePrintRequest = (bill: PatientBill) => {
    const historyItem = printHistory.find(h => h.referenceNumber === bill.billNumber);
    if (historyItem && historyItem.printCount >= 1) {
      // Document already printed: prompt for official reprint reason
      setReprintModalBill(bill);
    } else {
      // First-time print
      registerPrintAction(bill);
      setPreviewBill(mapToStandardBill(bill));
      setTimeout(() => window.print(), 300);
    }
  };

  // Confirm Official Reprint
  const handleConfirmReprint = () => {
    if (!reprintModalBill) return;
    registerPrintAction(reprintModalBill, reprintReason);
    const stdBill = mapToStandardBill(reprintModalBill);
    setReprintModalBill(null);
    setPreviewBill(stdBill);
    showToast('info', 'Official Duplicate Generated', 'Reprint counter incremented and logged in audit trail.');
    setTimeout(() => window.print(), 300);
  };

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        b.billNumber.toLowerCase().includes(q) ||
        b.patientName.toLowerCase().includes(q) ||
        (b.patientMobile && b.patientMobile.includes(q)) ||
        (b.patientId && b.patientId.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || (b.billCategory || 'general') === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [bills, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-800/50 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                MODULE 19 • STANDARD BILL & PRINT CENTER
              </span>
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                A4 Paper → Half-Page Bill Standard
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Printer className="w-8 h-8 text-emerald-400" />
              Standard Bill & Print Center
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              Strict hospital standard A4 half-page invoices. Identical high-fidelity rendering across Preview, PDF Generation, Physical Printing, and Official Reprint Counter tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-sm"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'documents'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Active Invoices & Bills ({bills.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Reprint Counter & Audit Logs ({printHistory.length})</span>
        </button>
      </div>

      {activeTab === 'documents' ? (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Bill No, Patient Name, Mobile..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Service Categories</option>
                <option value="opd_consultation">OPD Consultation</option>
                <option value="lab_diagnostics">Laboratory Diagnostics</option>
                <option value="pharmacy_dispensing">Pharmacy Retail / Dispensing</option>
                <option value="general">General / Registration</option>
              </select>
            </div>
          </div>

          {/* Bills Grid / Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="font-black text-sm text-slate-900 dark:text-white">
                Invoices Ready for Standard Half-Page Printing
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {filteredBills.length} Invoices Found
              </span>
            </div>

            {filteredBills.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold">No hospital invoices found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Invoice / Bill No</th>
                      <th className="px-4 py-3">Patient Details</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Net Payable</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Print Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBills.map(b => {
                      const historyItem = printHistory.find(h => h.referenceNumber === b.billNumber);
                      const printCount = historyItem ? historyItem.printCount : 0;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">{b.billNumber}</span>
                            <span className="text-[10px] text-slate-400">{formatDateTime(b.createdAt)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white">{b.patientName}</div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {b.patientMobile || 'No Mobile'} • UHID: {b.patientId || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {(b.billCategory || 'general').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                              {formatCurrency(b.netPayable)}
                            </div>
                            {b.discountAmount > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                                Saved {formatCurrency(b.discountAmount)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {b.paymentStatus} ({b.paymentMethod})
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {printCount === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Not Yet Printed
                              </span>
                            ) : printCount === 1 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Original Printed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Reprint #{printCount}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPreviewBill(mapToStandardBill(b))}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                                title="Preview A4 Half-Page Bill"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePrintRequest(b)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                                title="Print Standard Half-Page Bill"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>{printCount > 0 ? 'Reprint' : 'Print'}</span>
                              </button>
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
        </>
      ) : (
        /* Print History Log */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="font-black text-sm text-slate-900 dark:text-white">
              Official Reprint Counter & Audit Trail
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {printHistory.length} Logged Prints
            </span>
          </div>

          {printHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">No print actions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Reference No</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Print Counter</th>
                    <th className="px-4 py-3">Paper Format</th>
                    <th className="px-4 py-3">Authorized Staff</th>
                    <th className="px-4 py-3">Reprint Reason</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {printHistory.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {h.referenceNumber}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                        {h.patientName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          h.printCount === 1
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {h.printCount === 1 ? 'ORIGINAL (#1)' : `REPRINT #${h.printCount}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {h.paperFormat}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {h.printedBy}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {h.reprintReason || 'Initial original print'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                        {formatDateTime(h.lastPrintedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Official Reprint Reason Prompt Modal */}
      {reprintModalBill && (
        <Modal
          isOpen={!!reprintModalBill}
          onClose={() => setReprintModalBill(null)}
          title="Official Duplicate Bill Reprint Authorization"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-1 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Reprint Warning: Document Already Printed</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Bill <strong className="font-mono">{reprintModalBill.billNumber}</strong> for {reprintModalBill.patientName} has previously been issued. Any subsequent printing is marked with an official <strong>OFFICIAL DUPLICATE / REPRINT</strong> watermark and logged in the immutable audit trail.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mandatory Reason for Official Reprint:
              </label>
              <select
                value={reprintReason}
                onChange={e => setReprintReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="Patient Requested Duplicate Copy">Patient Requested Duplicate Copy</option>
                <option value="Patient Lost Original Slip">Patient Lost Original Slip</option>
                <option value="Medical Insurance / Mediclaim Submission">Medical Insurance / Mediclaim Submission</option>
                <option value="Employer / Corporate Reimbursement">Employer / Corporate Reimbursement</option>
                <option value="Internal Financial & Statutory Audit">Internal Financial & Statutory Audit</option>
                <option value="Billing Dispute Verification">Billing Dispute Verification</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-500 space-y-1">
              <div>Authorized Cashier: <strong className="text-slate-800 dark:text-slate-200">{currentUser?.fullName}</strong></div>
              <div>Standard Paper Format: <strong>A4 Half-Page (Strict Height: 148.5mm)</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReprintModalBill(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReprint}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Confirm & Print Official Duplicate</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bill Preview Modal using StandardHalfPageBill */}
      {previewBill && (
        <Modal
          isOpen={!!previewBill}
          onClose={() => setPreviewBill(null)}
          title={`Bill Preview • ${previewBill.billNumber}`}
          maxWidth="2xl"
        >
          <StandardHalfPageBill
            bill={previewBill}
            company={company}
            onPrint={() => window.print()}
            onClose={() => setPreviewBill(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default PrintCenterPage;
