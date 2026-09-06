import React, { useState, useEffect } from 'react';
import { CashDeskVoucher, Patient } from '../../types';
import { CashDeskVoucherService } from '../../services/cashDeskVoucherService';
import { PatientService } from '../../services/patientService';
import { StorageService } from '../../services/storage';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { useToast } from '../../context/ToastContext';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  QrCode,
  CreditCard,
  Building2,
  CheckCircle2,
  ScanLine,
  Receipt,
  User,
  Eye,
  EyeOff,
  Coins,
  RefreshCw
} from 'lucide-react';

interface VoucherRedeemModalProps {
  initialVoucherCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (voucher: CashDeskVoucher) => void;
}

export const VoucherRedeemModal: React.FC<VoucherRedeemModalProps> = ({
  initialVoucherCode = '',
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [voucherCode, setVoucherCode] = useState(initialVoucherCode);
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [cashierName, setCashierName] = useState(() => StorageService.getCurrentUser()?.fullName || 'Hospital Cash Desk Officer');
  const [redemptionChannel, setRedemptionChannel] = useState<'cash_desk_pos' | 'wallet_credit' | 'opd_bill' | 'lab_bill' | 'pharmacy_bill'>('wallet_credit');
  const [billReference, setBillReference] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [creditWallet, setCreditWallet] = useState(true);
  const [redemptionNotes, setRedemptionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const patients = PatientService.getAll();

  useEffect(() => {
    if (initialVoucherCode) {
      setVoucherCode(initialVoucherCode);
    }
  }, [initialVoucherCode]);

  // Live lookup of matching voucher
  const matchedVoucher = voucherCode.trim() ? CashDeskVoucherService.getVoucherByCode(voucherCode) : undefined;

  useEffect(() => {
    if (matchedVoucher?.patientId) {
      setSelectedPatientId(matchedVoucher.patientId);
    }
    setErrorMessage(null);
  }, [matchedVoucher]);

  const handleKeypadPress = (digit: string) => {
    if (enteredPin.length < 8) {
      setEnteredPin(prev => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setEnteredPin('');
  };

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!voucherCode.trim()) {
      setErrorMessage('Please enter or scan a valid Voucher Code.');
      return;
    }

    if (!enteredPin.trim()) {
      setErrorMessage('Please enter the Cryptographic Voucher PIN.');
      return;
    }

    setIsProcessing(true);

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    const result = CashDeskVoucherService.verifyAndRedeemVoucher(
      voucherCode,
      enteredPin,
      cashierName,
      {
        redemptionChannel,
        billReference: billReference.trim() || `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        patientId: selectedPatientId || matchedVoucher?.patientId,
        patientName: selectedPatient?.fullName || matchedVoucher?.patientName,
        creditPatientWallet: creditWallet,
        redemptionNotes: redemptionNotes.trim() || 'Verified and redeemed at Hospital Cash Desk POS'
      }
    );

    setIsProcessing(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Redemption failed. Check PIN and voucher validity.');
      if (result.remainingAttempts !== undefined) {
        setRemainingAttempts(result.remainingAttempts);
      }
      showToast('error', 'Redemption Failed', result.error || 'Voucher PIN Verification Failed');
      return;
    }

    // Success
    triggerCelebrationFireworks();
    showToast(
      'success',
      'Voucher Redeemed',
      `Voucher ${result.voucher?.voucherCode || ''} (₹${result.voucher?.amount || 0}) successfully redeemed!`
    );
    if (result.voucher) {
      onSuccess(result.voucher);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hospital Cash Desk POS — Voucher Redemption Terminal"
      maxWidth="xl"
    >
      <form onSubmit={handleRedeem} className="space-y-5">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">1-Scan POS Terminal</h4>
              <p className="text-[11px] text-slate-300">Cryptographic PIN & Anti-Brute-Force Verification</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            ● POS ONLINE
          </span>
        </div>

        {/* Voucher Serial Code Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Voucher Serial Code / Scan QR</span>
            <span className="text-[10px] font-mono text-slate-400">e.g. LMDX-CSH-2026-00001</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={voucherCode}
              onChange={e => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="LMDX-CSH-YYYY-XXXXX"
              className="w-full px-4 py-2.5 pl-10 rounded-xl font-mono text-sm font-bold uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              required
            />
            <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Live Matched Voucher Preview Card */}
        {matchedVoucher && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
            matchedVoucher.status === 'active'
              ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-950 dark:text-teal-200'
              : matchedVoucher.status === 'redeemed'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{matchedVoucher.categoryName}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border font-bold">
                  Seal: {matchedVoucher.authSealCode}
                </span>
              </div>
              <span className="text-base font-black font-mono">
                {formatCurrency(matchedVoucher.amount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-teal-200 dark:border-teal-800/60">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Bearer:</span>
                <span className="font-bold">{matchedVoucher.patientName || 'General Cash Desk Bearer'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Valid Until:</span>
                <span className="font-bold">{formatDate(matchedVoucher.validUntil)}</span>
              </div>
            </div>

            {matchedVoucher.status !== 'active' && (
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold flex items-center gap-1.5 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Notice: Voucher status is currently {matchedVoucher.status.toUpperCase()}.</span>
              </div>
            )}
          </div>
        )}

        {/* Cryptographic PIN Input with Virtual Touch Keypad */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Enter Cryptographic Voucher PIN</span>
            </span>
            {matchedVoucher?.pin ? (
              <button
                type="button"
                onClick={() => {
                  setEnteredPin(matchedVoucher.pin);
                  showToast('info', 'PIN Auto-Filled', `Auto-filled verification PIN (${matchedVoucher.pin}).`);
                }}
                className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Auto-Fill PIN ({matchedVoucher.pin})</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">6 to 8 Digits</span>
            )}
          </label>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showPin ? 'text' : 'password'}
                value={enteredPin}
                onChange={e => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••••"
                maxLength={8}
                className="w-full px-4 py-3 rounded-xl font-mono text-xl font-black tracking-widest text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-rose-500 focus:outline-none dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleKeypadClear}
              className="py-3 px-3"
            >
              Clear
            </Button>
          </div>

          {/* Quick Onscreen Number Pad (Optional for fast POS touch interaction) */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(digit => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="col-span-2 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
            >
              ⌫ Back
            </button>
          </div>
        </div>

        {/* Error / Attempt Warning Box */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p>{errorMessage}</p>
              {remainingAttempts !== null && (
                <p className="text-[11px] font-normal pt-0.5">
                  Remaining Attempts: <span className="font-bold">{remainingAttempts} / 3</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Redemption Mode & Wallet Credit Options */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Redemption Channel
              </label>
              <select
                value={redemptionChannel}
                onChange={e => setRedemptionChannel(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
              >
                <option value="wallet_credit">Smart Health Card Wallet Credit</option>
                <option value="cash_desk_pos">Hospital Cash Desk POS Offset</option>
                <option value="opd_bill">OPD Doctor Consultation Bill</option>
                <option value="lab_bill">Diagnostic & Pathology Bill</option>
                <option value="pharmacy_bill">Pharmacy & Surgical Bill</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bill / POS Reference No.
              </label>
              <input
                type="text"
                value={billReference}
                onChange={e => setBillReference(e.target.value)}
                placeholder="POS-Auto-Generated"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
              />
            </div>
          </div>

          {/* Patient Selection for Wallet Credit if not locked to patient */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Patient / Health Card Account
            </label>
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
            >
              <option value="">General Cash Desk Walk-in (No Wallet Link)</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id}) — {p.mobile}
                </option>
              ))}
            </select>
          </div>

          {/* Auto Credit Toggle */}
          {selectedPatientId && (
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 cursor-pointer">
              <input
                type="checkbox"
                checked={creditWallet}
                onChange={e => setCreditWallet(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-bold">
                Automatically add voucher value as verified prepaid credit to {patients.find(p => p.id === selectedPatientId)?.fullName}'s Health Wallet
              </span>
            </label>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isProcessing}
            leftIcon={isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          >
            {isProcessing ? 'Verifying Cryptographic PIN...' : 'Verify PIN & Redeem Voucher'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
