import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BillService } from '../../services/billService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { WorkflowPermissionService } from '../../services/workflowPermissionService';
import { AuditService } from '../../services/auditService';
import { PatientBill, Patient, HealthCard, CompanyProfile } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { RealBarcode } from '../../components/common/RealBarcode';
import { StandardHalfPageBill } from '../../components/billing/StandardHalfPageBill';
import { InvoiceRenderService } from '../../services/invoiceRenderService';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  DollarSign,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  Eye,
  Trash2,
  Building,
  QrCode,
  ShieldCheck,
  Sparkles,
  Lock,
  ShieldAlert
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();
  const company: CompanyProfile = StorageService.getCompanyProfile();

  // State
  const [bills, setBills] = useState<PatientBill[]>(() => StorageService.getBills());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [printBill, setPrintBill] = useState<PatientBill | null>(null);
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);

  // New Bill Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [billCategory, setBillCategory] = useState<'general' | 'opd_consultation' | 'lab_diagnostics' | 'pharmacy_dispensing'>('general');
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: 'OPD Clinical Consultation', quantity: 1, unitPrice: 500 }
  ]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'netbanking' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time Firestore sync & cross-tab events
  useEffect(() => {
    const unsub = ApiSyncService.subscribeToCollection<PatientBill>('bills', (items) => {
      if (items) {
        setBills(StorageService.getBills());
      }
    });

    const handleSync = (e: CustomEvent) => {
      if (!e.detail?.key || e.detail.key === 'labmedix_bills_v1' || e.detail.key === 'labmedix_patients_v1') {
        setBills(StorageService.getBills());
        setPatients(StorageService.getPatients());
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
      setBills(StorageService.getBills());
      setPatients(StorageService.getPatients());
      showToast('success', 'Central Sync Complete', 'Billing invoices updated from central Firestore.');
    } catch {
      setBills(StorageService.getBills());
      showToast('info', 'Local Cache Updated', 'Invoices refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add line item
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 100 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: 'description' | 'quantity' | 'unitPrice', value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Calculations for modal
  const modalSubtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (Number(item.quantity || 1) * Number(item.unitPrice || 0)), 0);
  }, [lineItems]);

  const modalNetPayable = useMemo(() => {
    return Math.max(0, modalSubtotal - Number(discountAmount || 0));
  }, [modalSubtotal, discountAmount]);

  // Selected Patient Details
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [selectedPatientId, patients]);

  const patientCard = useMemo(() => {
    if (!selectedPatientId) return null;
    return cards.find(c => c.patientId === selectedPatientId && c.status === 'active');
  }, [selectedPatientId, cards]);

  // Discount Override Permission Check
  const canOverrideDiscount = useMemo(() => {
    return WorkflowPermissionService.canOverrideDiscount(currentUser);
  }, [currentUser]);

  // Automatic Card Benefit Discount (Patient -> Active Health Card -> Plan -> Benefit)
  const cardDiscountPercent = useMemo(() => {
    if (!patientCard || patientCard.status !== 'active') return 0;
    const tier = (patientCard.tier || '').toLowerCase();
    if (tier.includes('platinum')) return 25;
    if (tier.includes('gold') || tier.includes('vip')) return 20;
    if (tier.includes('shield') || tier.includes('family')) return 15;
    return 10; // default active cardholder discount
  }, [patientCard]);

  const autoCardDiscount = useMemo(() => {
    if (cardDiscountPercent <= 0) return 0;
    return Math.round((modalSubtotal * cardDiscountPercent) / 100);
  }, [modalSubtotal, cardDiscountPercent]);

  // Automatically apply verified card benefit discount when patient or subtotal changes
  useEffect(() => {
    if (autoCardDiscount > 0) {
      setDiscountAmount(autoCardDiscount);
    } else if (!patientCard) {
      setDiscountAmount(0);
    }
  }, [autoCardDiscount, patientCard]);

  // Search filtered patients for modal picker
  const filteredPatientsForPicker = useMemo(() => {
    if (!patientSearchTerm.trim()) return patients.slice(0, 15);
    const q = patientSearchTerm.toLowerCase().trim();
    return patients.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      (p.mobile || '').includes(q) ||
      p.id.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [patients, patientSearchTerm]);

  // Handle Create Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedPatient) {
      showToast('error', 'Patient Required', 'Please select a patient for this invoice.');
      return;
    }
    if (lineItems.some(i => !i.description.trim() || i.unitPrice <= 0)) {
      showToast('error', 'Invalid Items', 'Please specify descriptions and valid prices for all line items.');
      return;
    }

    setIsSubmitting(true);
    try {
      const billNumber = BillService.generateBillNumber();
      const transactionId = `TXN-BILL-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date().toISOString();
      const items = lineItems.map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.quantity) * Number(i.unitPrice)
      }));

      const newBill: PatientBill = {
        id: `bill_${Date.now()}`,
        billNumber,
        date: now,
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        patientMobile: selectedPatient.mobile,
        patientAddress: selectedPatient.address?.fullAddress || 'In-Clinic Walkin',
        healthCardId: patientCard?.id,
        healthCardNumber: patientCard?.cardNumber,
        isCardIssued: false,
        familyMemberCount: 0,
        includedMembers: 0,
        additionalMembers: 0,
        baseCardCharge: 0,
        additionalMemberCharge: 0,
        discountAmount: Number(discountAmount || 0),
        netPayable: modalNetPayable,
        paidAmount: modalNetPayable,
        paymentStatus: 'paid',
        paymentMethod,
        transactionId,
        billCategory,
        items,
        notes: notes.trim() || `${billCategory.replace('_', ' ').toUpperCase()} Hospital Invoice`,
        authorizedStaff: {
          id: currentUser?.id || 'staff_desk',
          name: currentUser?.fullName || 'Cashier Desk',
          role: currentUser?.role || 'cashier'
        },
        createdAt: now
      };

      StorageService.saveBill(newBill);
      BillService.recordBillTransaction(newBill, currentUser);

      // Audit Logging
      if (discountAmount > 0 && discountAmount !== autoCardDiscount && canOverrideDiscount) {
        AuditService.logWorkflowAction(currentUser, 'discount_override', 'billing', billNumber, {
          patientId: selectedPatient.id,
          patientName: selectedPatient.fullName,
          autoCardDiscount,
          appliedDiscount: Number(discountAmount),
          reason: notes || 'Authorized manual discount override'
        });
      }
      AuditService.logWorkflowAction(currentUser, 'create', 'billing', billNumber, {
        patientName: selectedPatient.fullName,
        netPayable: modalNetPayable,
        paymentMethod,
        discountAmount: Number(discountAmount || 0),
        hasCard: !!patientCard
      });

      setBills(StorageService.getBills());
      setIsNewBillModalOpen(false);
      setPrintBill(newBill);
      showToast('success', 'Invoice Generated', `Bill #${newBill.billNumber} created successfully.`);

      // Reset form
      setLineItems([{ description: 'OPD Clinical Consultation', quantity: 1, unitPrice: 500 }]);
      setDiscountAmount(0);
      setNotes('');
    } catch (err: any) {
      showToast('error', 'Billing Error', err.message || 'Could not generate bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bill visibility based on permission (View all clinic bills vs own cash desk receipts)
  const canViewAllBills = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || can('bill_view_all') || can('finance_view');

  const permittedBills = useMemo(() => {
    if (canViewAllBills) return bills;
    return bills.filter(b =>
      b.authorizedStaff?.id === currentUser?.id ||
      b.authorizedStaff?.name?.toLowerCase() === currentUser?.fullName?.toLowerCase()
    );
  }, [bills, canViewAllBills, currentUser]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return permittedBills.filter((b) => {
      if (statusFilter !== 'all' && b.paymentStatus !== statusFilter) return false;
      if (categoryFilter !== 'all' && b.billCategory !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNo = (b.billNumber || '').toLowerCase().includes(q);
        const matchesPatient = (b.patientName || '').toLowerCase().includes(q);
        const matchesPhone = (b.patientMobile || '').toLowerCase().includes(q);
        const matchesCard = (b.healthCardNumber || '').toLowerCase().includes(q);
        const matchesStaff = (b.authorizedStaff?.name || '').toLowerCase().includes(q);
        if (!matchesNo && !matchesPatient && !matchesPhone && !matchesCard && !matchesStaff) {
          return false;
        }
      }
      return true;
    });
  }, [permittedBills, statusFilter, categoryFilter, searchQuery]);

  // Metrics (grounded in permitted transactions)
  const metrics = useMemo(() => {
    const total = permittedBills.length;
    const paid = permittedBills.filter(b => b.paymentStatus === 'paid').length;
    const pending = permittedBills.filter(b => b.paymentStatus === 'pending').length;
    const totalRevenue = permittedBills
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + Number(b.paidAmount || b.netPayable || 0), 0);
    const totalDue = permittedBills
      .filter(b => b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + Math.max(0, Number(b.netPayable || 0) - Number(b.paidAmount || 0)), 0);

    return { total, paid, pending, totalRevenue, totalDue };
  }, [permittedBills]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-blue-900/20 border border-amber-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-500/30">
              <Receipt className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Hospital Invoices & Billing Hub
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Hospital Workflow
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            Unified billing for Health Cards, OPD consultations, Pathology labs & Pharmacy with verified printable receipts.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={() => setIsNewBillModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black transition shadow-lg shadow-amber-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Invoices</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics.total}</p>
          <span className="text-[10px] text-slate-500">All hospital bills</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Paid Invoices</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{metrics.paid}</p>
          <span className="text-[10px] text-emerald-500/80">Reconciled receipts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>Outstanding Due</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300">{metrics.pending}</p>
          <span className="text-[10px] text-amber-500/80">Pending settlements</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
            <span>Revenue Collected</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300">{formatCurrency(metrics.totalRevenue)}</p>
          <span className="text-[10px] text-cyan-500/80">Total gross receipts</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-rose-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
            <span>Pending Balance</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-300">{formatCurrency(metrics.totalDue)}</p>
          <span className="text-[10px] text-rose-500/80">Due from patients</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill # (BILL-2026-...), Patient Name, Mobile, Card No, or Staff..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Payment Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending Due</option>
          <option value="waived">Waived / Free</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Bill Categories</option>
          <option value="registration">Patient Registration</option>
          <option value="card_enrollment">Health Card Enrollment</option>
          <option value="opd_consultation">OPD Consultation</option>
          <option value="lab_diagnostics">Pathology Laboratory</option>
          <option value="pharmacy_dispensing">Pharmacy Medicines</option>
          <option value="general">General Invoices</option>
        </select>
      </div>

      {/* Bills Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Invoices Ledger</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-800 text-amber-400 border border-slate-700">
              {filteredBills.length} records
            </span>
          </h2>
        </div>

        {filteredBills.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-bold text-white">No Invoices Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No hospital bills match your current search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Bill # & Date</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Net Payable</th>
                  <th className="px-4 py-3">Paid Amount</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Billed By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBills.map((bill) => {
                  const statusColors: Record<string, string> = {
                    paid: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
                    pending: 'bg-amber-950 text-amber-300 border-amber-500/30',
                    waived: 'bg-slate-800 text-slate-300 border-slate-700'
                  };

                  return (
                    <tr key={bill.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-white">{bill.billNumber}</div>
                        <div className="text-[10px] text-slate-400">{formatDateTime(bill.createdAt || bill.date)}</div>
                      </td>

                      <td className="px-4 py-3 font-medium text-white">
                        <div>{bill.patientName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{bill.patientMobile}</span>
                          {bill.healthCardNumber && (
                            <span className="text-amber-400 font-mono">Card: {bill.healthCardNumber}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-300 border border-slate-700">
                          {bill.billCategory?.replace('_', ' ') || (bill.isCardIssued ? 'Card Enrollment' : 'Hospital Registration')}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-black text-white">
                        {formatCurrency(Number(bill.netPayable || 0))}
                      </td>

                      <td className="px-4 py-3 font-mono text-emerald-300 font-bold">
                        {formatCurrency(Number(bill.paidAmount || 0))}
                      </td>

                      <td className="px-4 py-3 font-mono uppercase text-[11px] text-slate-300">
                        {bill.paymentMethod || 'cash'}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <div>{bill.authorizedStaff?.name || 'Staff Desk'}</div>
                        <div className="text-[10px] text-slate-500">{bill.authorizedStaff?.role}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          statusColors[bill.paymentStatus] || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {bill.paymentStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPrintBill(bill)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition flex items-center gap-1 text-xs font-bold"
                            title="Print Tax Invoice"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
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

      {/* New Hospital Invoice Modal */}
      {isNewBillModalOpen && (
        <Modal
          isOpen={isNewBillModalOpen}
          onClose={() => setIsNewBillModalOpen(false)}
          title="Create Hospital Invoice & Receipt"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
            {/* Patient Picker */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Select Patient *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  placeholder="Search patient by name, mobile, or UHID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:border-amber-500"
                />
              </div>

              <div className="max-h-32 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800">
                {filteredPatientsForPicker.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setPatientSearchTerm(p.fullName);
                    }}
                    className={`p-2 flex items-center justify-between cursor-pointer transition ${
                      selectedPatientId === p.id ? 'bg-amber-900/40 text-amber-200' : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-white">{p.fullName}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{p.mobile}</span>
                    </div>
                    {cards.some(c => c.patientId === p.id && c.status === 'active') && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300">
                        Cardholder
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Billing Category</label>
                <select
                  value={billCategory}
                  onChange={(e) => setBillCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-amber-500"
                >
                  <option value="general">General Clinical Invoice</option>
                  <option value="opd_consultation">OPD Consultation Visit</option>
                  <option value="lab_diagnostics">Laboratory Investigations</option>
                  <option value="pharmacy_dispensing">Pharmacy Medicines</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Payment Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-amber-500"
                >
                  <option value="cash">Cash Desk POS</option>
                  <option value="upi">UPI / QR Code Transfer</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="netbanking">Net Banking / NEFT</option>
                  <option value="wallet">Patient Health Wallet</option>
                </select>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold">Service Line Items</label>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                      placeholder="Service / Procedure / Medicine Description"
                      className="flex-1 p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                      required
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateLineItem(idx, 'quantity', Number(e.target.value))}
                      placeholder="Qty"
                      className="w-16 p-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-center"
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateLineItem(idx, 'unitPrice', Number(e.target.value))}
                      placeholder="Price"
                      className="w-24 p-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-right"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      disabled={lineItems.length === 1}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount & Totals */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-bold">Discount (₹)</label>
                  {patientCard && (
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                      🛡️ Card {cardDiscountPercent}% (₹{autoCardDiscount})
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    disabled={!canOverrideDiscount && autoCardDiscount > 0}
                    onChange={(e) => {
                      if (!canOverrideDiscount) {
                        showToast('error', 'Override Prohibited', 'Manual discount adjustments require discount_override permission or Super Admin.');
                        return;
                      }
                      setDiscountAmount(Number(e.target.value));
                    }}
                    className={`w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white ${
                      !canOverrideDiscount && autoCardDiscount > 0 ? 'opacity-70 cursor-not-allowed' : 'focus:border-amber-500'
                    }`}
                  />
                  {!canOverrideDiscount && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Policy locked. Manual override requires supervisor role.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col justify-center text-right">
                <span className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">Net Total Payable</span>
                <span className="text-xl font-black text-white font-mono">{formatCurrency(modalNetPayable)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewBillModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-lg shadow-amber-600/30 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Save & Print Invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Official A4 Half-Page Standard Bill Modal */}
      {printBill && (
        <Modal
          isOpen={!!printBill}
          onClose={() => setPrintBill(null)}
          title="Official A4 Half-Page Tax Invoice Slip"
          maxWidth="2xl"
        >
          <StandardHalfPageBill
            bill={{
              billNumber: printBill.billNumber,
              date: printBill.createdAt || printBill.date,
              patientName: printBill.patientName,
              patientId: printBill.patientId,
              patientMobile: printBill.patientMobile,
              healthCardNumber: printBill.healthCardNumber,
              category: printBill.billCategory || 'Hospital Invoice',
              items: printBill.items && printBill.items.length > 0 ? printBill.items.map(it => ({
                description: it.description,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                discount: 0,
                total: it.total
              })) : [{
                description: printBill.isCardIssued ? 'Health Card Registration & Membership' : 'Hospital Service Fee',
                quantity: 1,
                unitPrice: printBill.baseCardCharge || printBill.netPayable,
                discount: printBill.discountAmount || 0,
                total: printBill.netPayable
              }],
              subtotal: (printBill as any).subtotal || (printBill.baseCardCharge ? printBill.baseCardCharge + (printBill.additionalMemberCharge || 0) : printBill.netPayable),
              discountAmount: printBill.discountAmount || 0,
              taxAmount: (printBill as any).taxAmount || 0,
              netPayable: printBill.netPayable,
              paidAmount: printBill.paidAmount || printBill.netPayable,
              dueAmount: Math.max(0, printBill.netPayable - (printBill.paidAmount || printBill.netPayable)),
              paymentMethod: printBill.paymentMethod,
              authorizedStaffName: printBill.authorizedStaff?.name || currentUser?.fullName || 'Cashier Desk',
              notes: printBill.notes
            }}
            company={company}
            onPrint={() => window.print()}
            onDownloadPdf={() => InvoiceRenderService.downloadHalfPagePdf('standard-half-page-invoice-root', printBill.billNumber)}
            onClose={() => setPrintBill(null)}
          />
        </Modal>
      )}
    </div>
  );
};
