import React, { useRef } from 'react';
import { Modal } from '../common/Modal';
import { CentralPaymentReceipt } from '../../services/centralPaymentQREngine';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Printer, Download, CheckCircle2, ShieldCheck, Building, User } from 'lucide-react';
import { RealBarcode } from '../common/RealBarcode';

interface CentralPaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: CentralPaymentReceipt | null;
}

export const CentralPaymentReceiptModal: React.FC<CentralPaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt
}) => {
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    if (!receiptPrintRef.current) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=800,height=800');
    if (!printWin) {
      window.print();
      return;
    }

    const receiptHtml = receiptPrintRef.current.outerHTML;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official Payment Receipt - ${receipt.receiptNumber}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 8mm 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .receipt-content {
              width: 100%;
              max-width: 148mm;
              margin: 0 auto;
              border: none;
            }
          </style>
        </head>
        <body>
          <div class="receipt-content">
            ${receiptHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Official Payment Receipt: ${receipt.receiptNumber}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Action Header */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold">Payment Verified & Settled</div>
              <div className="text-[10px] text-slate-400 font-mono">Central Financial Ledger Commit</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>

        {/* Official Printable Receipt Canvas (A5 Half-Standard) */}
        <div
          ref={receiptPrintRef}
          className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 shadow-sm font-sans space-y-4"
        >
          {/* Institution Header */}
          <div className="border-b border-slate-200 pb-3 text-center space-y-1">
            <h2 className="text-base font-black text-slate-950 uppercase tracking-tight">
              {receipt.companyName || 'LABMEDIX MULTI-SPECIALITY CENTRE'}
            </h2>
            <p className="text-[9px] text-slate-600">
              {receipt.companyAddress || 'Central Hospital Campus, Kolkata, West Bengal'}
            </p>
            <div className="text-[8.5px] text-slate-500 font-mono flex items-center justify-center gap-3">
              <span>Phone: {receipt.companyPhone || '+91 98310 12345'}</span>
              <span>Email: {receipt.companyEmail || 'care@labmedix.in'}</span>
              {receipt.companyGstin && <span>GSTIN: {receipt.companyGstin}</span>}
            </div>
            <div className="pt-1">
              <span className="px-3 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[9px] font-mono font-bold uppercase tracking-wider border border-slate-300">
                OFFICIAL PAYMENT RECEIPT
              </span>
            </div>
          </div>

          {/* Receipt Numbers Bar */}
          <div className="grid grid-cols-2 gap-3 py-2 bg-slate-50 rounded-xl p-3 border border-slate-200 text-[9.5px] font-mono">
            <div>
              <div className="text-slate-500">Receipt No:</div>
              <strong className="text-slate-950 text-[10.5px]">{receipt.receiptNumber}</strong>
              <div className="text-slate-500 mt-1">Transaction ID:</div>
              <div className="text-slate-800 font-semibold">{receipt.transactionId}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500">Bill / Invoice No:</div>
              <strong className="text-blue-700 text-[10.5px]">{receipt.billNumber}</strong>
              <div className="text-slate-500 mt-1">Date & Time:</div>
              <div className="text-slate-800">{formatDateTime(receipt.date)}</div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="border border-slate-200 rounded-xl p-3 text-[9.5px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Patient Name:</span>
              <strong className="text-slate-950 uppercase">{receipt.patientName}</strong>
            </div>
            {receipt.patientId && (
              <div className="flex justify-between">
                <span className="text-slate-500">UHID / Patient ID:</span>
                <span className="font-mono text-slate-800">{receipt.patientId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-bold text-slate-900 uppercase">{receipt.paymentMethod}</span>
            </div>
            {receipt.providerReference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Settlement (UTR / Ref):</span>
                <span className="font-mono font-bold text-emerald-700">{receipt.providerReference}</span>
              </div>
            )}
          </div>

          {/* Financial Settlement Table */}
          <div className="border-t-2 border-slate-900 pt-2 font-mono text-[10px] space-y-1">
            <div className="flex justify-between text-slate-600">
              <span className="font-sans">Previous Amount Due:</span>
              <span>{formatCurrency(receipt.previousDue)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold text-[11px] border-t border-slate-200 pt-1">
              <span className="font-sans">AMOUNT PAID NOW:</span>
              <span>{formatCurrency(receipt.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-black text-[11px] border-t border-slate-300 pt-1">
              <span className="font-sans">REMAINING BALANCE DUE:</span>
              <span className={receipt.remainingDue === 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {formatCurrency(receipt.remainingDue)}
              </span>
            </div>
          </div>

          {/* Status Badge & Verification Seal */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-[8.5px]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-bold text-emerald-800">
                  STATUS: {receipt.paymentStatus === 'paid' ? 'FULLY PAID (NIL DUE)' : 'PARTIALLY PAID'}
                </div>
                <div className="text-slate-500">Verified By: {receipt.verifiedBy}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="border-t border-slate-400 px-3 pt-1 inline-block text-slate-800 font-bold text-[8px] uppercase">
                Authorized Cashier Seal
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[7.5px] text-slate-400 text-center italic border-t border-slate-100 pt-1">
            * This is an official digital payment receipt generated by LABMEDIX Central Payment Engine. Valid without physical rubber stamp.
          </div>
        </div>
      </div>
    </Modal>
  );
};
