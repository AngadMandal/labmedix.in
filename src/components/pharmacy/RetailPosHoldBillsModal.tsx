import React from 'react';
import { Modal } from '../common/Modal';
import { PharmacyHeldBill } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ShoppingCart, Play, Trash2, Clock, User, Phone, ShieldCheck } from 'lucide-react';

interface RetailPosHoldBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldBills: PharmacyHeldBill[];
  onResumeBill: (bill: PharmacyHeldBill) => void;
  onDeleteBill: (id: string) => void;
}

export const RetailPosHoldBillsModal: React.FC<RetailPosHoldBillsModalProps> = ({
  isOpen,
  onClose,
  heldBills,
  onResumeBill,
  onDeleteBill
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Held Pharmacy Bills Queue (${heldBills.length})`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <strong className="text-white">Unfinished POS Carts on Hold</strong>
              <p className="text-[10px] text-slate-400">
                Held bills do not deduct inventory or create finalized financial transactions until completed.
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-amber-400 text-xs px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
            {heldBills.length} Held
          </span>
        </div>

        {heldBills.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
            <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No held bills currently in queue.</p>
            <p className="text-[10px] text-slate-500">
              Cashiers can click "Hold Bill" in the POS cart to pause an in-progress customer sale.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {heldBills.map(bill => (
              <div
                key={bill.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-400">
                        {bill.holdNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {bill.customerType === 'card_holder'
                          ? 'Health Card Member'
                          : bill.customerType === 'registered'
                          ? 'Hospital Patient'
                          : 'Walk-in Customer'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-white font-bold mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {bill.patientName}
                      </span>
                      {bill.patientPhone && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400 font-normal">
                          <Phone className="w-3 h-3" />
                          {bill.patientPhone}
                        </span>
                      )}
                      {bill.patientCardNo && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                          <ShieldCheck className="w-3 h-3" />
                          {bill.patientCardNo}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black font-mono text-white block">
                      {formatCurrency(bill.netTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  {bill.items.map((it, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300"
                    >
                      {it.medicineName} × {it.quantity}
                    </span>
                  ))}
                </div>

                {/* Footer details & action buttons */}
                <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500">
                  <span>
                    Held at {formatDateTime(bill.heldAt)} by <strong className="text-slate-400">{bill.heldBy}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDeleteBill(bill.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs font-medium transition flex items-center gap-1 border border-slate-700 hover:border-rose-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onResumeBill(bill);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume to POS Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
