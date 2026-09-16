import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CentralPaymentQREngine, PaymentQRSessionData, CentralPaymentReceipt } from '../../services/centralPaymentQREngine';
import { CompanyProfile, PatientBill, PharmacySale, Patient } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { QrCode, ShieldCheck, CheckCircle2, RefreshCw, Smartphone, Layers, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PatientConsolidatedDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  unpaidBills: Array<{
    billNumber: string;
    category: string;
    date: string;
    netPayable: number;
    paidAmount: number;
    dueAmount: number;
  }>;
  company: CompanyProfile;
  onSettled: (receipt: CentralPaymentReceipt) => void;
}

export const PatientConsolidatedDueModal: React.FC<PatientConsolidatedDueModalProps> = ({
  isOpen,
  onClose,
  patient,
  unpaidBills,
  company,
  onSettled
}) => {
  const { showToast } = useToast();
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [session, setSession] = useState<PaymentQRSessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize all unpaid bills as selected
  useEffect(() => {
    if (unpaidBills && unpaidBills.length > 0) {
      setSelectedBills(unpaidBills.map(b => b.billNumber));
    }
  }, [unpaidBills]);

  // Compute selected total due
  const totalSelectedDue = unpaidBills
    .filter(b => selectedBills.includes(b.billNumber))
    .reduce((sum, b) => sum + (Number(b.dueAmount) || 0), 0);

  // Generate consolidated QR session whenever selected bills change
  useEffect(() => {
    let isMounted = true;
    if (totalSelectedDue > 0 && selectedBills.length > 0) {
      setIsLoading(true);
      const eligible = unpaidBills.filter(b => selectedBills.includes(b.billNumber));
      CentralPaymentQREngine.generateConsolidatedSession(patient.id, eligible, company)
        .then((sess) => {
          if (isMounted) {
            setSession(sess);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setSession(null);
    }

    return () => {
      isMounted = false;
    };
  }, [patient.id, totalSelectedDue, selectedBills, company]);

  if (!isOpen) return null;

  const toggleBillSelection = (bNum: string) => {
    if (selectedBills.includes(bNum)) {
      if (selectedBills.length === 1) {
        showToast('warning', 'Selection Required', 'At least one invoice must remain selected for consolidated settlement.');
        return;
      }
      setSelectedBills(selectedBills.filter(n => n !== bNum));
    } else {
      setSelectedBills([...selectedBills, bNum]);
    }
  };

  const handleOpenAppIntent = () => {
    if (session?.upiPayload) {
      window.location.href = session.upiPayload;
      showToast('info', 'Opening UPI App', `Redirecting to UPI for consolidated ₹${totalSelectedDue.toFixed(2)}.`);
    }
  };

  const handleVerifySettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      showToast('error', 'UTR Required', 'Please enter the 12-digit UPI Bank Reference Number / UTR.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Settle each selected bill item sequentially with exact attribution
      const eligible = unpaidBills.filter(b => selectedBills.includes(b.billNumber));
      let lastReceipt: CentralPaymentReceipt | null = null;

      for (const bill of eligible) {
        const result = await CentralPaymentQREngine.verifyPayment({
          billNumber: bill.billNumber,
          amount: bill.dueAmount,
          paymentMethod: 'upi',
          providerReference: `${cleanUtr}-${bill.billNumber}`,
          notes: `Consolidated payment of ₹${totalSelectedDue} settling ${eligible.length} bills.`
        });
        if (result.receipt) {
          lastReceipt = result.receipt;
        }
      }

      if (lastReceipt) {
        showToast('success', 'Consolidated Dues Settled!', `Settled ${eligible.length} invoices totaling ${formatCurrency(totalSelectedDue)}.`);
        onSettled({
          ...lastReceipt,
          billNumber: `CONSOL-${patient.id} (${eligible.length} Invoices)`,
          amountPaid: totalSelectedDue,
          remainingDue: 0,
          paymentStatus: 'paid'
        });
        onClose();
      }
    } catch (err: any) {
      showToast('error', 'Verification Failed', err?.message || 'Consolidated payment settlement failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Consolidated Outstanding Due Settlement — ${patient.fullName}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        {/* Notice Card */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                PATIENT CONSOLIDATED DUE PAYMENT QR
              </div>
              <div className="text-[10px] text-indigo-200">
                Pays all selected eligible outstanding invoices in one combined UPI transaction.
              </div>
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-[9px] text-indigo-300 uppercase">Total Selected Due</div>
            <div className="text-lg font-black text-amber-300">{formatCurrency(totalSelectedDue)}</div>
          </div>
        </div>

        {/* 2-Column Layout: Left = Bill Checklist, Right = Dynamic Consolidated QR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bill Checklist */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Select Invoices to Settle ({selectedBills.length}/{unpaidBills.length}):</span>
              <button
                type="button"
                onClick={() => setSelectedBills(unpaidBills.map(b => b.billNumber))}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
              >
                Select All
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {unpaidBills.map((b) => {
                const isSelected = selectedBills.includes(b.billNumber);
                return (
                  <div
                    key={b.billNumber}
                    onClick={() => toggleBillSelection(b.billNumber)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 text-slate-900 dark:text-white'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 opacity-60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <div>
                        <strong className="text-xs font-mono block">{b.billNumber}</strong>
                        <span className="text-[10px] text-slate-500 capitalize">{b.category} • {formatDateTime(b.date)}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-black text-rose-600 dark:text-rose-400">
                        {formatCurrency(b.dueAmount)}
                      </div>
                      <span className="text-[9px] text-slate-400">Total: {formatCurrency(b.netPayable)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consolidated QR Container */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
              CONSOLIDATED PAYMENT QR
            </span>

            <div className="w-40 h-40 bg-white border-2 border-indigo-400 rounded-xl p-2 flex items-center justify-center shadow-md">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-[8px]">Generating QR...</span>
                </div>
              ) : session?.qrDataUrl ? (
                <img
                  src={session.qrDataUrl}
                  alt="Consolidated Payment QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-slate-400">Select invoices to generate QR</div>
              )}
            </div>

            <div className="font-mono text-center">
              <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                {formatCurrency(totalSelectedDue)}
              </div>
              <div className="text-[9px] text-slate-500">
                Settles {selectedBills.length} Invoices for {patient.fullName}
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAppIntent}
              className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>1-Tap Launch UPI App</span>
            </button>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerifySettlement} className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Enter 12-Digit Bank UTR / Payment Reference Number:</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">Anti-Duplicate Protected</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. 425619882310"
              required
              className="flex-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            />
            <button
              type="submit"
              disabled={isSubmitting || totalSelectedDue <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Verify & Settle All</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
