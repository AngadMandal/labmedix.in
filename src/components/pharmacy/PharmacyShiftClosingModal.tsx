import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PharmacyShiftClosing } from '../../types';
import { PharmacyService } from '../../services/pharmacyService';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Calculator, DollarSign, AlertCircle, CheckCircle, Printer, Lock } from 'lucide-react';

interface PharmacyShiftClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftClosed?: (closing: PharmacyShiftClosing) => void;
}

export const PharmacyShiftClosingModal: React.FC<PharmacyShiftClosingModalProps> = ({
  isOpen,
  onClose,
  onShiftClosed
}) => {
  const { currentUser } = useAuth();
  const { companyProfile } = useSettings();

  const [summary, setSummary] = useState(() => PharmacyService.getShiftSummary(currentUser?.fullName));
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [closedRecord, setClosedRecord] = useState<PharmacyShiftClosing | null>(null);

  useEffect(() => {
    if (isOpen) {
      const live = PharmacyService.getShiftSummary(currentUser?.fullName);
      setSummary(live);
      setActualCashInput(live.expectedCash.toString());
      setClosedRecord(null);
    }
  }, [isOpen, currentUser?.fullName]);

  const actualCash = parseFloat(actualCashInput) || 0;
  const difference = Math.round((actualCash - summary.expectedCash) * 100) / 100;
  const isShortage = difference < 0;
  const isExcess = difference > 0;

  const handleCloseShift = async () => {
    try {
      setIsSubmitting(true);
      const startOfDay = new Date();
      startOfDay.setHours(8, 0, 0, 0);

      const record = await PharmacyService.closeShift({
        cashierId: currentUser?.id || 'cashier_01',
        cashierName: currentUser?.fullName || 'Counter Cashier',
        startTime: startOfDay.toISOString(),
        endTime: new Date().toISOString(),
        openingCash: summary.openingCash,
        cashSales: summary.cashSales,
        upiSales: summary.upiSales,
        cardSales: summary.cardSales,
        otherSales: summary.otherSales,
        totalReturnsAmount: summary.returnsAmount,
        refundsAmount: summary.refundsAmount,
        totalDiscountsAmount: summary.totalDiscountsAmount,
        expectedCash: summary.expectedCash,
        actualCash,
        difference,
        totalSales: summary.totalSales,
        totalTransactions: summary.totalTransactions,
        notes
      });

      setClosedRecord(record);
      if (onShiftClosed) onShiftClosed(record);
    } catch (err: any) {
      console.error('Failed to close shift:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintClosingSlip = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={closedRecord ? `Shift Closing Report: ${closedRecord.shiftNumber}` : "Pharmacy Shift / Day Closing"}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-200 printable-shift-closing">
        {!closedRecord ? (
          <>
            {/* Top Info Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Calculator className="w-4 h-4" />
                </span>
                <div>
                  <strong className="text-white text-xs block">End of Shift Cash Reconciliation</strong>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Cashier: {currentUser?.fullName || 'Authorized Cashier'} • Drawer Shift Ledger
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-slate-800 text-purple-300 font-bold border border-purple-500/30 text-xs">
                {summary.totalTransactions} Sales Today
              </span>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Opening Float</span>
                <span className="text-sm font-mono font-black text-white block">
                  {formatCurrency(summary.openingCash)}
                </span>
                <span className="text-[9px] text-slate-500">Configured Drawer Base</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">Cash Collections</span>
                <span className="text-sm font-mono font-black text-emerald-300 block">
                  {formatCurrency(summary.cashSales)}
                </span>
                <span className="text-[9px] text-slate-500">Physical Cash Inflow</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-rose-400 font-bold uppercase block">Returns / Refunds</span>
                <span className="text-sm font-mono font-black text-rose-300 block">
                  -{formatCurrency(summary.returnsAmount)}
                </span>
                <span className="text-[9px] text-slate-500">Deducted from Cash</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-purple-400 font-bold uppercase block">Total Net Sales</span>
                <span className="text-sm font-mono font-black text-purple-300 block">
                  {formatCurrency(summary.totalSales)}
                </span>
                <span className="text-[9px] text-slate-500">All Payment Modes</span>
              </div>
            </div>

            {/* Payment Modes Split */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                Non-Cash Digital Settlements (Direct Bank Ledger)
              </span>
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">UPI Payments</span>
                  <strong className="text-white text-xs">{formatCurrency(summary.upiSales)}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Credit / Debit Cards</span>
                  <strong className="text-white text-xs">{formatCurrency(summary.cardSales)}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Other / Wallet</span>
                  <strong className="text-white text-xs">{formatCurrency(summary.otherSales)}</strong>
                </div>
              </div>
            </div>

            {/* Drawer Cash Audit Calculation */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Drawer Cash Balance Verification
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Formula: Float + Cash Sales - Returns
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Expected Physical Cash</span>
                  <strong className="text-base font-mono text-white block mt-0.5">
                    {formatCurrency(summary.expectedCash)}
                  </strong>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">
                    Actual Counted Cash (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCashInput}
                    onChange={e => setActualCashInput(e.target.value)}
                    placeholder="Enter physical cash in drawer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className={`p-3 rounded-xl border text-xs ${
                  difference === 0
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : isShortage
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}>
                  <span className="text-[10px] uppercase font-bold block">
                    {difference === 0 ? 'Exact Match' : isShortage ? 'Cash Shortage' : 'Cash Excess'}
                  </span>
                  <strong className="text-base font-mono block mt-0.5">
                    {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Shift Handover & Reconciliation Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Handover to Evening Shift Cashier Rajesh S."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCloseShift}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Closing Shift...' : 'Close Shift & Finalize Day'}</span>
              </button>
            </div>
          </>
        ) : (
          /* Shift Closed Confirmation & Printable Report */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <strong className="text-sm block">Shift Successfully Closed</strong>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Record ID: {closedRecord.shiftNumber} • Timestamps Recorded
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrintClosingSlip}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Shift Slip</span>
              </button>
            </div>

            {/* Printable Shift Slip Document */}
            <div className="p-6 rounded-2xl bg-white text-slate-950 border border-slate-300 font-mono text-xs space-y-3">
              <div className="text-center border-b pb-2">
                <h2 className="text-sm font-black uppercase">{companyProfile?.name || 'LABMEDIX HOSPITAL PHARMACY'}</h2>
                <p className="text-[10px] text-slate-600">DAILY PHARMACY SHIFT CLOSING SLIP</p>
                <p className="text-[9px] text-slate-500 font-bold mt-1">Shift #: {closedRecord.shiftNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] border-b pb-2">
                <div>Cashier: <strong>{closedRecord.cashierName}</strong></div>
                <div className="text-right">Closed At: <strong>{formatDateTime(closedRecord.closedAt)}</strong></div>
                <div>Total Transactions: <strong>{closedRecord.totalTransactions}</strong></div>
                <div className="text-right">Total Net Sales: <strong>{formatCurrency(closedRecord.totalSales)}</strong></div>
              </div>

              <div className="space-y-1 text-[11px] border-b pb-2">
                <div className="flex justify-between"><span>Opening Cash Float:</span><span>{formatCurrency(closedRecord.openingCash)}</span></div>
                <div className="flex justify-between font-bold"><span>Cash Sales:</span><span>{formatCurrency(closedRecord.cashSales)}</span></div>
                <div className="flex justify-between"><span>UPI Sales:</span><span>{formatCurrency(closedRecord.upiSales)}</span></div>
                <div className="flex justify-between"><span>Card Sales:</span><span>{formatCurrency(closedRecord.cardSales)}</span></div>
                <div className="flex justify-between text-rose-700"><span>Sales Returns / Refunds:</span><span>-{formatCurrency(closedRecord.refundsAmount)}</span></div>
                <div className="flex justify-between border-t pt-1 font-bold"><span>Expected Cash in Drawer:</span><span>{formatCurrency(closedRecord.expectedCash)}</span></div>
                <div className="flex justify-between font-black"><span>Actual Counted Cash:</span><span>{formatCurrency(closedRecord.actualCash)}</span></div>
                <div className={`flex justify-between font-black ${closedRecord.difference < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                  <span>Cash Difference:</span>
                  <span>{closedRecord.difference > 0 ? `+${formatCurrency(closedRecord.difference)}` : formatCurrency(closedRecord.difference)}</span>
                </div>
              </div>

              {closedRecord.notes && (
                <div className="text-[10px] text-slate-600">
                  Notes: <em>{closedRecord.notes}</em>
                </div>
              )}

              <div className="pt-6 flex justify-between text-center text-[9px]">
                <div>
                  <div className="border-t border-slate-400 w-28 pt-1">Cashier Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-28 pt-1">Supervisor Signature</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold transition hover:bg-slate-700"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
