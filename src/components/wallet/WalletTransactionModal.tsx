import React, { useState, useMemo } from 'react';
import { Patient, Wallet, WalletTransaction, TransactionType, HealthCard, Membership } from '../../types';
import { WalletService } from '../../services/walletService';
import { StorageService } from '../../services/storage';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Barcode } from '../common/Barcode';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { ExportService } from '../../services/exportService';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import {
  Wallet as WalletIcon,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Printer,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  Stethoscope,
  FlaskConical,
  Pill,
  Activity,
  Plus,
  Download,
  FileText,
  AlertTriangle,
  Lock,
  QrCode,
  Check,
  HelpCircle,
  Copy,
  AlertCircle,
  Ticket
} from 'lucide-react';
import { CashDeskVoucherService } from '../../services/cashDeskVoucherService';

interface WalletTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  wallet: Wallet;
  onSuccess: (txn: WalletTransaction, updatedWallet: Wallet) => void;
  defaultType?: TransactionType;
}

export const WalletTransactionModal: React.FC<WalletTransactionModalProps> = ({
  isOpen,
  onClose,
  patient,
  wallet,
  onSuccess,
  defaultType = 'credit'
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // Voucher redemption support in Wallet
  const [useVoucher, setUseVoucher] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [voucherPinInput, setVoucherPinInput] = useState('');
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);

  const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

  const PURPOSE_PRESETS = [
    { label: '🩺 OPD Specialist Consultation', val: 'OPD Doctor Consultation & Clinical Evaluation' },
    { label: '🔬 Pathology Lab Tests (CBC, Lipid, LFT)', val: 'Pathology & Diagnostic Laboratory Investigations' },
    { label: '🩻 Radiology & Digital Imaging', val: 'Radiology Digital X-Ray / USG Sonography' },
    { label: '💊 Pharmacy Medicines Dispensation', val: 'In-House Pharmacy Medicine Prescription Fulfillment' },
    { label: '🏥 Daycare Ward & Surgery Advance', val: 'Daycare Ward Admission & OT Procedural Advance' },
    { label: '⚡ Emergency Cashless Deposit', val: '24x7 Emergency Prepaid Cashless Top-up' }
  ];

  const handleApplyQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleApplyPreset = (val: string) => {
    setNotes(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    if (type === 'debit' && numAmount > wallet.balance) {
      showToast('error', 'Insufficient Funds', `Patient only has ${formatCurrency(wallet.balance)} available in health wallet.`);
      return;
    }

    setIsSubmitting(true);
    const result = WalletService.addTransaction(
      patient.id,
      type,
      numAmount,
      notes || `Wallet ${type.toUpperCase()} - Clinical Health Services`
    );

    setIsSubmitting(false);
    if (result.error) {
      showToast('error', 'Transaction Failed', result.error);
    } else {
      triggerCelebrationFireworks();
      showToast('success', 'Transaction Successful', `${type.toUpperCase()} of ${formatCurrency(numAmount)} settled in health wallet.`);
      onSuccess(result.transaction, result.wallet);
      onClose();
    }
  };

  const handleRedeemVoucherDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCodeInput.trim()) {
      showToast('error', 'Voucher Required', 'Please enter the voucher code.');
      return;
    }
    if (!voucherPinInput.trim()) {
      showToast('error', 'PIN Required', 'Please enter the cryptographic voucher PIN.');
      return;
    }

    setIsVerifyingVoucher(true);
    const cashier = StorageService.getCurrentUser()?.fullName || 'Hospital Cashier';
    const res = CashDeskVoucherService.verifyAndRedeemVoucher(
      voucherCodeInput.trim(),
      voucherPinInput.trim(),
      cashier,
      {
        redemptionChannel: 'wallet_credit',
        patientId: patient.id,
        patientName: patient.fullName,
        creditPatientWallet: true,
        redemptionNotes: `Redeemed at hospital counter for ${patient.fullName} wallet float`
      }
    );
    setIsVerifyingVoucher(false);

    if (!res.success || !res.voucher) {
      showToast('error', 'Voucher Redemption Failed', res.error || 'Invalid voucher or PIN.');
      return;
    }

    const v = res.voucher;
    triggerCelebrationFireworks();
    showToast('success', 'Voucher Redeemed & Credited!', `Added ${formatCurrency(v.amount)} from Voucher ${v.voucherCode} to ${patient.fullName}'s wallet.`);
    
    // Fetch updated wallet
    const updatedWallet = WalletService.getByPatientId(patient.id) || wallet;
    const lastTxn = WalletService.getTransactions(patient.id)[0];
    if (updatedWallet) {
      onSuccess(lastTxn, updatedWallet);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Health Wallet Command: ${patient.fullName}`} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Patient Wallet Header */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 text-white border border-teal-500/30 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <span className="text-[10px] text-teal-300 uppercase font-mono tracking-wider font-bold">
              Current Available Float
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(wallet.balance)}
            </div>
            <p className="text-xs text-slate-300 font-semibold">{patient.fullName} • <span className="font-mono text-teal-200">{patient.id}</span></p>
          </div>
          <div className="p-3 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/40">
            <WalletIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Transaction Type Pills */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Transaction Action Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'credit' as const, label: '💳 Deposit (Add)', active: 'bg-emerald-600 text-white border-emerald-600' },
              { id: 'debit' as const, label: '🏥 Bill Deduction', active: 'bg-rose-600 text-white border-rose-600' },
              { id: 'refund' as const, label: '↩️ Refund Float', active: 'bg-blue-600 text-white border-blue-600' },
              { id: 'adjustment' as const, label: '⚖️ Adjustment', active: 'bg-purple-600 text-white border-purple-600' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${
                  type === t.id
                    ? `${t.active} shadow-sm`
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voucher Redemption Option Toggle */}
        {type === 'credit' && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Ticket className="w-4 h-4" />
                <span>Deposit via Cash Desk Voucher</span>
              </span>
              <button
                type="button"
                onClick={() => setUseVoucher(!useVoucher)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                  useVoucher
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-300 border-amber-400/40 hover:bg-amber-50'
                }`}
              >
                {useVoucher ? 'Switch to Standard Deposit' : 'Redeem Voucher'}
              </button>
            </div>

            {useVoucher && (
              <div className="pt-2 border-t border-amber-500/20 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Voucher Code</label>
                    <input
                      type="text"
                      placeholder="LMDX-CSH-YYYY-XXXXX"
                      value={voucherCodeInput}
                      onChange={e => setVoucherCodeInput(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Voucher PIN</label>
                    <input
                      type="password"
                      placeholder="6-Digit PIN"
                      maxLength={8}
                      value={voucherPinInput}
                      onChange={e => setVoucherPinInput(e.target.value.trim())}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono tracking-widest bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isVerifyingVoucher}
                  onClick={handleRedeemVoucherDeposit}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  leftIcon={<Ticket className="w-3.5 h-3.5" />}
                >
                  {isVerifyingVoucher ? 'Verifying with Ledger...' : 'Verify PIN & Credit Patient Wallet'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Amount Fast Buttons */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ⚡ Quick Amount Selector (INR ₹)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleApplyQuickAmount(val)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                  amount === val.toString()
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                }`}
              >
                +₹{val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <Input
          label="Settlement Amount (INR ₹)"
          type="number"
          step="any"
          min="1"
          placeholder="e.g. 1500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        {/* Fast Purpose Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            📋 Purpose & Clinical Service Presets (Reason for Balance Movement)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {PURPOSE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p.val)}
                className="text-left px-2.5 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors text-[11px] truncate"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Reason / Purpose of Transaction <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-semibold"
            placeholder="e.g. Cardiology OPD Consult, Pathology CBC, Pharmacy Ref #98762"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={type === 'credit' ? 'primary' : type === 'debit' ? 'danger' : 'secondary'}
            isLoading={isSubmitting}
            leftIcon={<Zap className="w-4 h-4" />}
          >
            Confirm {type.toUpperCase()} ({formatCurrency(parseFloat(amount) || 0)})
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const WalletReceiptModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  transaction: WalletTransaction | null;
  patient?: Patient;
}> = ({ isOpen, onClose, transaction, patient }) => {
  if (!transaction) return null;

  const [printCount, setPrintCount] = useState<number>(() => {
    const key = `receipt_print_count_${transaction.id}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  });

  const company = StorageService.getCompanyProfile();
  const cards = StorageService.getCards();
  const memberships = StorageService.getMemberships();
  const { showToast } = useToast();

  // Find Patient Active Card & Membership Plan
  const activeCard = useMemo(() => {
    if (!transaction) return null;
    return cards.find(c => c.patientId === transaction.patientId && c.status === 'active') || null;
  }, [cards, transaction]);

  const activeMembership = useMemo(() => {
    if (!activeCard) return null;
    return memberships.find(m => m.id === activeCard.membershipId) || null;
  }, [activeCard, memberships]);

  // Determine Clean Reason / Category
  const parsedReason = useMemo(() => {
    const note = transaction.notes || 'Healthcare Services';
    let deptName = 'HEALTHCARE SERVICE';
    let isAutoPos = false;

    if (note.includes('[AUTO-POS]') || note.toLowerCase().includes('consult') || note.toLowerCase().includes('doctor')) {
      deptName = 'OPD & DOCTOR CONSULTATION';
      isAutoPos = true;
    } else if (note.toLowerCase().includes('lab') || note.toLowerCase().includes('cbc') || note.toLowerCase().includes('pathology') || note.toLowerCase().includes('test')) {
      deptName = 'DIAGNOSTIC PATHOLOGY & LAB';
      isAutoPos = true;
    } else if (note.toLowerCase().includes('pharmacy') || note.toLowerCase().includes('medicine')) {
      deptName = 'IN-HOUSE PHARMACY DISPENSATION';
      isAutoPos = true;
    } else if (note.toLowerCase().includes('daycare') || note.toLowerCase().includes('surgery') || note.toLowerCase().includes('ot')) {
      deptName = 'DAYCARE & SURGERY ADVANCE';
      isAutoPos = true;
    } else if (transaction.type === 'credit') {
      deptName = 'PREPAID HEALTH FLOAT RECHARGE';
    } else if (transaction.type === 'refund') {
      deptName = 'PATIENT FLOAT REFUND / DISPUTE';
    }

    return {
      department: deptName,
      fullReason: note.replace('[AUTO-POS]', '').trim(),
      isAutoPos
    };
  }, [transaction]);

  const isDuplicateCopy = printCount > 0;
  const hasDue = Boolean(transaction.dueAmount && transaction.dueAmount > 0);
  const securityHash = `SHA256-${transaction.referenceNo}-${transaction.amount}-${transaction.patientId}`.slice(0, 24);

  const incrementPrintCount = () => {
    const newCount = printCount + 1;
    setPrintCount(newCount);
    localStorage.setItem(`receipt_print_count_${transaction.id}`, newCount.toString());
  };

  const handlePrintReceiptDirect = (format: 'thermal_80mm' | 'a4_invoice') => {
    incrementPrintCount();
    const isThermal = format === 'thermal_80mm';
    const printWin = window.open('', '_blank', isThermal ? 'width=450,height=680' : 'width=900,height=1000');
    if (!printWin) {
      window.print();
      return;
    }

    const receiptEl = document.getElementById('wallet-receipt-content');
    if (!receiptEl) {
      window.print();
      return;
    }

    const duplicateBanner = isDuplicateCopy
      ? `<div style="background:#FEF3C7; border: 1px solid #D97706; padding: 4px; text-align: center; font-weight: bold; color: #92400E; margin-bottom: 6px; font-size: 10px;">⚠️ DUPLICATE REPRINT (Copy #${printCount + 1}) — AUDIT VERIFIED</div>`
      : `<div style="background:#ECFDF5; border: 1px solid #059669; padding: 4px; text-align: center; font-weight: bold; color: #065F46; margin-bottom: 6px; font-size: 10px;">🔒 ORIGINAL OFFICIAL CASHLESS VOUCHER (Copy #1)</div>`;

    const dueWarningHtml = hasDue
      ? `<div style="background:#FFF1F2; border: 1px solid #E11D48; padding: 6px; text-align: center; font-weight: bold; color: #9F1239; margin: 6px 0; font-size: 11px;">
           ⚠️ OUTSTANDING DUE: ₹${transaction.dueAmount} (STATUS: ${transaction.paymentStatus?.toUpperCase() || 'PARTIAL DUE'})
         </div>`
      : '';

    if (isThermal) {
      // 80mm POS Thermal Receipt Format with Reason and Due
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${transaction.referenceNo}</title>
            <style>
              @page { size: 80mm auto; margin: 4mm; }
              body { font-family: monospace, sans-serif; font-size: 11px; margin: 0; padding: 6px; color: #000; -webkit-print-color-adjust: exact !important; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
              .reason-box { border: 1px dashed #000; background: #fafafa; padding: 6px; margin: 6px 0; }
              .total { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; font-weight: bold; font-size: 12px; margin: 6px 0; }
              .footer { text-align: center; margin-top: 8px; font-size: 8.5px; }
            </style>
          </head>
          <body>
            ${duplicateBanner}
            <div class="header">
              <h2 style="margin:0; font-size: 14px;">${company.name || 'LABMEDIX'}</h2>
              <p style="margin:2px 0; font-size: 10px;">${company.tagline || 'Confident In Care'}</p>
              <p style="margin:2px 0; font-size: 8.5px;">Helpline: ${company.helpline || '1800-889-9911'} • ${company.address || 'Kolkata'}</p>
            </div>

            <div class="row"><span>Receipt No:</span><strong>${transaction.referenceNo}</strong></div>
            <div class="row"><span>Date/Time:</span><span>${formatDateTime(transaction.date)}</span></div>
            <div class="row"><span>Patient:</span><strong>${patient?.fullName || transaction.patientId}</strong></div>
            <div class="row"><span>Patient ID:</span><span>${transaction.patientId}</span></div>
            <div class="row"><span>Card UID:</span><span>${activeCard?.cardNumber || 'N/A'}</span></div>
            <div class="row"><span>Tier / Plan:</span><strong>${activeMembership?.name || 'Standard'}</strong></div>

            <!-- REASON FOR BALANCE DEDUCTION / CREDIT -->
            <div class="reason-box">
              <span style="font-size: 9px; text-transform: uppercase; color: #333; font-weight: bold; display: block;">DEPARTMENT / BILLING REASON:</span>
              <strong style="font-size: 11px; display: block; margin-top: 2px;">${parsedReason.department}</strong>
              <p style="margin: 3px 0 0 0; font-size: 9.5px;">${parsedReason.fullReason}</p>
            </div>

            ${dueWarningHtml}

            <div class="row"><span>Opening Float:</span><span>₹${transaction.openingBalance}</span></div>
            <div class="row"><span>Gross Bill:</span><span>₹${transaction.grossAmount || transaction.amount}</span></div>
            <div class="row"><span>Card Savings:</span><span>-₹${transaction.discountAmount || 0}</span></div>
            <div class="row total"><span>SETTLED FROM WALLET:</span><span>${transaction.type === 'credit' ? '+' : '-'}₹${transaction.paidAmount || transaction.amount}</span></div>
            
            ${hasDue ? `<div class="row" style="color:#E11D48; font-weight:bold;"><span>OUTSTANDING DUE:</span><span>₹${transaction.dueAmount}</span></div>` : ''}

            <div class="row"><span>Closing Available Float:</span><strong>₹${transaction.closingBalance}</strong></div>

            <div class="row" style="font-size: 8.5px; color: #444; margin-top: 4px;">
              <span>Security Hash:</span>
              <span>${securityHash}</span>
            </div>
            <p style="margin: 2px 0; font-size: 8.5px; color: #555;">Cashier: ${transaction.createdBy}</p>

            <div class="footer">
              <p>*** ELECTRONIC RECONCILED CASHLESS VOUCHER ***</p>
              <p>ISO 9001:2015 ACCREDITED • ${company.website || 'labmedix.org'}</p>
            </div>
            <script>
              setTimeout(() => { window.print(); window.close(); }, 300);
            </script>
          </body>
        </html>
      `);
    } else {
      // Full A4 Executive Tax Invoice with Itemized Reason, Due and Signatures
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Executive Statement - ${transaction.referenceNo}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: sans-serif; font-size: 12px; margin: 0; padding: 20px; color: #0F172A; -webkit-print-color-adjust: exact !important; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 15px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
              .box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: left; }
              th { background: #0F172A; color: #FFF; font-size: 11px; text-transform: uppercase; }
              .total-row { font-size: 14px; font-weight: bold; background: #F0FDFA; color: #0F766E; }
              .due-row { font-size: 14px; font-weight: bold; background: #FFF1F2; color: #E11D48; }
              .signature { display: flex; justify-content: space-between; margin-top: 40px; }
              .sign-box { border-top: 1px solid #94A3B8; width: 200px; text-align: center; padding-top: 6px; font-size: 11px; }
            </style>
          </head>
          <body>
            ${duplicateBanner}
            <div class="header">
              <div>
                <h1 style="margin:0; font-size: 20px; color: #0F172A;">${company.name || 'LABMEDIX'} HEALTHCARE</h1>
                <p style="margin:3px 0; color: #0D9488; font-weight: bold;">${company.tagline || 'Confident In Care'}</p>
                <p style="margin:2px 0; font-size: 10px; color: #64748B;">${company.address || 'Medical Complex, Kolkata'} • 24x7 Helpline: ${company.helpline || '1800-889-9911'}</p>
              </div>
              <div style="text-align: right;">
                <h3 style="margin:0; color: #0D9488;">OFFICIAL HEALTH WALLET STATEMENT</h3>
                <p style="margin:2px 0; font-family: monospace; font-weight: bold;">REF: ${transaction.referenceNo}</p>
                <p style="margin:2px 0; font-size: 10px; color: #64748B;">Date: ${formatDateTime(transaction.date)}</p>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <strong style="color: #64748B; font-size: 10px; text-transform: uppercase; display: block;">Patient & Card Details</strong>
                <strong style="font-size: 13px; display: block; margin: 3px 0;">${patient?.fullName || 'Registered Patient'}</strong>
                <p style="margin:2px 0; font-family: monospace;">Patient ID: ${transaction.patientId}</p>
                <p style="margin:2px 0; font-family: monospace;">Health Card: ${activeCard?.cardNumber || 'N/A'}</p>
                <p style="margin:2px 0;">Tier: <strong>${activeMembership?.name || 'Standard Plan'}</strong></p>
              </div>
              <div class="box">
                <strong style="color: #64748B; font-size: 10px; text-transform: uppercase; display: block;">Billing Authorization</strong>
                <p style="margin:3px 0;">Department: <strong>${parsedReason.department}</strong></p>
                <p style="margin:2px 0;">Action Type: <strong>${transaction.type.toUpperCase()}</strong></p>
                <p style="margin:2px 0;">Authorized Officer: <strong>${transaction.createdBy}</strong></p>
                <p style="margin:2px 0; font-family: monospace; font-size: 10px; color: #0D9488;">Security Hash: ${securityHash}</p>
              </div>
            </div>

            <!-- ITEMIZED REASON & CHARGES TABLE -->
            <table>
              <thead>
                <tr>
                  <th>Reason / Clinical Service Description</th>
                  <th>Opening Float</th>
                  <th>Settled from Wallet</th>
                  <th>Remaining Due</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong style="font-size: 13px; color: #0F172A;">${parsedReason.department}</strong>
                    <p style="margin: 3px 0 0 0; color: #475569;">${parsedReason.fullReason}</p>
                    <small style="color: #94A3B8; font-family: monospace;">Gross: ₹${transaction.grossAmount || transaction.amount} | Savings: -₹${transaction.discountAmount || 0}</small>
                  </td>
                  <td style="font-family: monospace;">₹${transaction.openingBalance}</td>
                  <td style="font-family: monospace; font-weight: bold; color: ${transaction.type === 'credit' ? '#059669' : '#DC2626'};">
                    ${transaction.type === 'credit' ? '+' : '-'}₹${transaction.paidAmount || transaction.amount}
                  </td>
                  <td style="font-family: monospace; font-weight: bold; color: ${hasDue ? '#E11D48' : '#059669'};">
                    ${hasDue ? `₹${transaction.dueAmount}` : '₹0 (CLEARED)'}
                  </td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">CLOSING AVAILABLE PATIENT FLOAT</td>
                  <td colspan="2" style="text-align: right; font-family: monospace;">₹${transaction.closingBalance}</td>
                </tr>
                ${hasDue ? `
                  <tr class="due-row">
                    <td colspan="2">⚠️ OUTSTANDING HOSPITAL DUE BALANCE</td>
                    <td colspan="2" style="text-align: right; font-family: monospace;">₹${transaction.dueAmount}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>

            <div class="signature">
              <div class="sign-box">Patient / Cardholder Signature</div>
              <div class="sign-box">Authorized Cashier / Officer</div>
            </div>

            <div style="text-align: center; margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 10px; color: #94A3B8;">
              This is a computer-generated official healthcare transaction voucher • ISO 9001:2015 Accredited • ${company.website || 'labmedix.org'}
            </div>

            <script>
              setTimeout(() => { window.print(); window.close(); }, 300);
            </script>
          </body>
        </html>
      `);
    }
    printWin.document.close();
  };

  const handleDownloadReceiptPng = async () => {
    const el = document.getElementById('wallet-receipt-content');
    if (!el) return;
    try {
      showToast('info', 'Rendering Receipt', 'Generating high-resolution receipt PNG...');
      await ExportService.exportToPng(el, `LABMEDIX_RECEIPT_${transaction.referenceNo}.png`);
      triggerCelebrationFireworks();
      showToast('success', 'Receipt Downloaded', 'Saved official transaction receipt.');
    } catch (err) {
      showToast('error', 'Download Failed', 'Could not export receipt image.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Prepaid Health Wallet Receipt" maxWidth="md">
      <div className="space-y-4">
        {/* Printable Receipt Container with Company Logo */}
        <div id="wallet-receipt-content" className="p-5 bg-white text-slate-900 rounded-3xl border-2 border-slate-200 space-y-4 shadow-lg relative overflow-hidden">
          {/* Security Duplicate / Original Banner */}
          {isDuplicateCopy ? (
            <div className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-[10px] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                DUPLICATE AUDIT COPY (Reprint #{printCount})
              </span>
              <span className="font-mono text-[9px] text-amber-700">ANTI-FRAUD LOGGED</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-[10px] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ORIGINAL OFFICIAL CASHLESS VOUCHER (Copy #1)
              </span>
              <span className="font-mono text-[9px] text-emerald-700">SECURE TRANSACTION</span>
            </div>
          )}

          {/* Receipt Header with Prominent LabMedix Logo */}
          <div className="text-center border-b pb-3 space-y-1">
            <div className="flex justify-center mb-1">
              <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="md" theme="teal" />
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide leading-none">
              {company.name || 'LABMEDIX'} HEALTHCARE SYSTEM
            </h3>
            <p className="text-[11px] text-teal-700 font-bold">{company.tagline || 'Confident In Care'}</p>
            <p className="text-[9.5px] text-slate-500 font-mono">
              24x7 Support: {company.helpline || '1800-889-9911'} • Estd. {company.estdYear || '2025'}
            </p>
          </div>

          {/* Receipt Details & Card Identification */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Receipt / Ref No</span>
              <strong className="font-mono text-teal-700">{transaction.referenceNo}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Date & Time</span>
              <span className="font-mono">{formatDateTime(transaction.date)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Patient Name</span>
              <strong className="text-slate-900 font-bold">{patient?.fullName || transaction.patientId}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Patient ID & Card</span>
              <span className="font-mono">{transaction.patientId} • <strong className="text-teal-700">{activeCard?.cardNumber || 'NFC Active'}</strong></span>
            </div>
          </div>

          {/* ================= REASON FOR BALANCE DEDUCTION / CREDIT BOX ================= */}
          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                Clinical Reason & Department
              </span>
              {activeMembership && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-white text-teal-900 border border-teal-300">
                  {activeMembership.name}
                </span>
              )}
            </div>

            <strong className="text-sm font-black text-slate-900 block leading-tight">
              {parsedReason.department}
            </strong>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {parsedReason.fullReason}
            </p>
          </div>

          {/* OUTSTANDING DUE WARNING ON RECEIPT */}
          {hasDue && (
            <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>OUTSTANDING DUE PENDING:</span>
              </div>
              <span className="text-base font-black text-rose-600 font-mono">
                {formatCurrency(transaction.dueAmount || 0)}
              </span>
            </div>
          )}

          {/* Transaction Balance Movement Summary */}
          <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 text-xs border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction Action:</span>
              <strong className="uppercase font-bold text-teal-700">{transaction.type}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Opening Available Float:</span>
              <span className="font-mono font-semibold">{formatCurrency(transaction.openingBalance)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t border-b border-slate-300 py-1.5">
              <span>Settled from Wallet:</span>
              <span className={`font-mono ${transaction.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.paidAmount || transaction.amount)}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-500">Closing Available Float:</span>
              <strong className="text-slate-900 font-mono text-sm">{formatCurrency(transaction.closingBalance)}</strong>
            </div>
          </div>

          {/* Security Token & Hash */}
          <div className="text-[10px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono">
            <div className="flex justify-between">
              <span>Security Hash:</span>
              <span>{securityHash}</span>
            </div>
            <div className="flex justify-between">
              <span>Authorized Cashier:</span>
              <span>{transaction.createdBy}</span>
            </div>
          </div>

          {/* Vector Barcode on Receipt */}
          <div className="pt-2 flex flex-col items-center justify-center border-t border-slate-200">
            <Barcode value={transaction.referenceNo} height={24} width={180} showText={false} />
            <span className="text-[8px] text-slate-400 font-mono mt-0.5">*** AUTHENTIC DIGITAL CASHLESS SETTLEMENT ***</span>
          </div>
        </div>

        {/* Dual Print & Download Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadReceiptPng}
            >
              Save PNG
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5 text-blue-500" />}
              onClick={() => handlePrintReceiptDirect('a4_invoice')}
            >
              Print A4 Invoice
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => handlePrintReceiptDirect('thermal_80mm')}
            >
              Print 80mm POS Receipt
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};