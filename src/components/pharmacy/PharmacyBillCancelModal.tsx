import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PharmacySale } from '../../types';
import { PharmacyService } from '../../services/pharmacyService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { AlertTriangle, RotateCcw, X, ShieldAlert } from 'lucide-react';

interface PharmacyBillCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: PharmacySale | null;
  onSaleCancelled: (cancelledSale: PharmacySale) => void;
}

export const PharmacyBillCancelModal: React.FC<PharmacyBillCancelModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSaleCancelled
}) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [restock, setRestock] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!sale) return null;

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Mandatory clinical or administrative cancellation reason required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const updated = await PharmacyService.cancelSale(
        sale.id,
        reason.trim(),
        currentUser?.fullName || 'Authorized Supervisor',
        restock
      );
      onSaleCancelled(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel / Reverse Pharmacy Bill: ${sale.invoiceNumber}`}
      maxWidth="xl"
    >
      <form onSubmit={handleCancelSubmit} className="space-y-4 text-slate-800 dark:text-slate-200">
        {/* Warning Banner */}
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-white text-xs block">Non-Destructive Financial Reversal</strong>
            <p className="text-[11px] text-rose-300/90 leading-relaxed">
              In accordance with hospital audit compliance, this bill will NOT be deleted from the database. It will be permanently marked as <strong>CANCELLED</strong> with full timestamp, authorized user ID, and a refund reversal transaction.
            </p>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Invoice Number:</span>
            <span className="font-mono font-bold text-white">{sale.invoiceNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Customer / Patient:</span>
            <strong className="text-white">{sale.patientName}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Sale Date:</span>
            <span className="font-mono text-slate-300">{formatDateTime(sale.saleDate)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 font-bold">
            <span className="text-slate-300">Paid Amount to Refund:</span>
            <span className="font-mono text-rose-400">{formatCurrency(sale.paidAmount)}</span>
          </div>
        </div>

        {/* Reason for Cancellation */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Cancellation Reason <span className="text-rose-400">*</span>
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-rose-500 focus:outline-none mb-2"
          >
            <option value="">-- Select Standard Reason --</option>
            <option value="Customer changed mind before leaving counter">Customer changed mind before leaving counter</option>
            <option value="Duplicate bill generated accidentally">Duplicate bill generated accidentally</option>
            <option value="Doctor cancelled/modified prescribed medication">Doctor cancelled/modified prescribed medication</option>
            <option value="Incorrect patient selected">Incorrect patient selected</option>
            <option value="Wrong payment mode or pricing error">Wrong payment mode or pricing error</option>
            <option value="Customer unable to make payment">Customer unable to make payment</option>
          </select>
          <textarea
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Or type specific reason for clinical & financial audit..."
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
          />
        </div>

        {/* Restock Checkbox */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <strong className="text-white block">Restore Medicines to Active Inventory</strong>
            <span className="text-[10px] text-slate-400">
              Increment batch available quantity for all {sale.items.length} line items.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={restock}
              onChange={e => setRestock(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            Abort
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-rose-600/30"
          >
            <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Processing Reversal...' : 'Confirm Bill Cancellation'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
