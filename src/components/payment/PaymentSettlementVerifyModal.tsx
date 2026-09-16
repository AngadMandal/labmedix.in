import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CentralPaymentQREngine, CentralPaymentReceipt } from '../../services/centralPaymentQREngine';
import { formatCurrency } from '../../utils/formatters';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Smartphone, DollarSign } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PaymentSettlementVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  billNumber: string;
  billId?: string;
  amountDue: number;
  patientName?: string;
  patientId?: string;
  onSettled: (receipt: CentralPaymentReceipt) => void;
}

export const PaymentSettlementVerifyModal: React.FC<PaymentSettlementVerifyModalProps> = ({
  isOpen,
  onClose,
  billNumber,
  billId,
  amountDue,
  patientName,
  patientId,
  onSettled
}) => {
  const { showToast } = useToast();
  const [payAmount, setPayAmount] = useState<number>(amountDue);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cash' | 'netbanking'>('upi');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      showToast('error', 'Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    if (amt > amountDue) {
      showToast('error', 'Excess Amount', `Payment amount cannot exceed current amount due of ${formatCurrency(amountDue)}.`);
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr && paymentMethod === 'upi') {
      showToast('error', 'UTR Required', 'Please enter the 12-digit UPI Bank Reference Number / UTR.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await CentralPaymentQREngine.verifyPayment({
        billNumber,
        billId,
        amount: amt,
        paymentMethod,
        providerReference: cleanUtr || `CASH-REF-${Date.now().toString(36).toUpperCase()}`,
        cashierName: 'Billing Desk Staff',
        notes: notes || `Direct verification for ${billNumber}`
      });

      if (result.success) {
        showToast('success', 'Payment Verified!', `₹${amt} successfully recorded. Remaining due: ₹${result.remainingDue}.`);
        onSettled(result.receipt);
        onClose();
      } else {
        showToast('error', 'Verification Failed', result.message || 'Payment settlement failed.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to complete payment verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Verify Payment Settlement — ${billNumber}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-slate-800 dark:text-slate-200">
        {/* Bill summary card */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">{billNumber}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Amount Due: {formatCurrency(amountDue)}
            </span>
          </div>
          {patientName && (
            <div className="text-xs font-bold truncate">
              Patient: <span className="text-amber-300 uppercase">{patientName}</span>
            </div>
          )}
        </div>

        {/* Payment Amount */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Payment Amount (₹):</span>
            <button
              type="button"
              onClick={() => setPayAmount(amountDue)}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
            >
              Pay Full Due ({formatCurrency(amountDue)})
            </button>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
            <input
              type="number"
              step="0.01"
              min="1"
              max={amountDue}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              required
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Mode:</label>
          <div className="grid grid-cols-4 gap-2">
            {(['upi', 'card', 'cash', 'netbanking'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMethod(mode)}
                className={`py-2 rounded-xl text-xs font-bold uppercase transition border ${
                  paymentMethod === mode
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* UTR / Provider Reference Number */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>{paymentMethod === 'upi' ? '12-Digit UPI UTR / Bank Reference:' : 'Transaction Reference / Auth Code:'}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">Anti-Duplicate Guard</span>
          </label>
          <input
            type="text"
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value)}
            placeholder={paymentMethod === 'upi' ? 'e.g. 425619882310' : 'e.g. CARD-AUTH-9831'}
            required={paymentMethod === 'upi'}
            className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Staff Remarks / Settlement Notes (Optional):</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Scanned via Reception QR Stand"
            className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>Confirm & Record Settlement</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
