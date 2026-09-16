import React, { useRef, useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CompanyProfile } from '../../types';
import { UniversalInvoiceData } from '../../types/invoice';
import { UniversalA4HalfPageInvoice } from './UniversalA4HalfPageInvoice';
import { PrintService } from '../../services/printService';
import { InvoiceRenderService } from '../../services/invoiceRenderService';
import { CentralPaymentQREngine, CentralPaymentReceipt } from '../../services/centralPaymentQREngine';
import { PaymentSettlementVerifyModal } from '../payment/PaymentSettlementVerifyModal';
import { CentralPaymentReceiptModal } from '../payment/CentralPaymentReceiptModal';
import { Printer, Download, RotateCcw, Eye, CheckCircle2, ShieldCheck, Receipt } from 'lucide-react';

interface UniversalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: UniversalInvoiceData | null;
  company: CompanyProfile;
  onReprint?: () => void;
  isReprinting?: boolean;
}

export const UniversalInvoiceModal: React.FC<UniversalInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice: initialInvoice,
  company,
  onReprint,
  isReprinting = false
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<UniversalInvoiceData | null>(initialInvoice);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<CentralPaymentReceipt | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentInvoice(initialInvoice);
  }, [initialInvoice]);

  // Real-time payment update listener
  useEffect(() => {
    if (!currentInvoice) return;

    const unsub = CentralPaymentQREngine.subscribe((event) => {
      if (event.type === 'PAYMENT_VERIFIED' && event.billNumber === currentInvoice.invoiceNumber) {
        setCurrentInvoice((prev) => {
          if (!prev) return prev;
          const newPaid = Number(prev.paidAmount || 0) + Number(event.paidAmount || 0);
          const newDue = Math.max(0, event.remainingDue ?? (prev.netPayable - newPaid));
          return {
            ...prev,
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newDue === 0 ? 'paid' : 'partially_paid',
            transactionId: event.transactionId || prev.transactionId
          };
        });
      }
    });

    const handleWindowPayment = (e: CustomEvent) => {
      const detail = e.detail;
      if (detail && detail.billNumber === currentInvoice.invoiceNumber) {
        setCurrentInvoice((prev) => {
          if (!prev) return prev;
          const newPaid = Number(prev.paidAmount || 0) + Number(detail.paidAmount || 0);
          const newDue = Math.max(0, detail.remainingDue ?? (prev.netPayable - newPaid));
          return {
            ...prev,
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newDue === 0 ? 'paid' : 'partially_paid',
            transactionId: detail.transactionId || prev.transactionId
          };
        });
      }
    };
    window.addEventListener('labmedix_payment_updated', handleWindowPayment as EventListener);

    return () => {
      unsub();
      window.removeEventListener('labmedix_payment_updated', handleWindowPayment as EventListener);
    };
  }, [currentInvoice?.invoiceNumber]);

  if (!isOpen || !currentInvoice) return null;
  const invoice = currentInvoice;

  const handlePrint = () => {
    if (printAreaRef.current) {
      PrintService.printUniversalA4HalfPage(
        printAreaRef.current,
        `LABMEDIX Invoice - ${invoice.invoiceNumber}`
      );
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExportingPdf(true);
      await InvoiceRenderService.downloadHalfPagePdf(printAreaRef.current, invoice.invoiceNumber);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Official A4 Half-Page Tax Invoice: ${invoice.invoiceNumber}`}
      maxWidth="6xl"
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        {/* Top Control Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">Standard A4 Half-Page Invoice</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Exact Print Parity
                </span>
                {invoice.isReprint && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    REPRINT #{invoice.reprintCount || 1}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">
                {invoice.invoiceNumber} • Synchronized with Central Company Settings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {invoice.dueAmount > 0 && (
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify & Settle UTR</span>
              </button>
            )}

            {invoice.paidAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveReceipt({
                    receiptNumber: `RCP-${(invoice.transactionId || invoice.invoiceNumber).replace(/[^a-zA-Z0-9]/g, '')}`,
                    transactionId: invoice.transactionId || `TXN-${invoice.invoiceNumber}`,
                    billNumber: invoice.invoiceNumber,
                    patientName: invoice.patientName,
                    patientId: invoice.patientId,
                    amountPaid: invoice.paidAmount,
                    previousDue: invoice.netPayable,
                    remainingDue: invoice.dueAmount,
                    paymentStatus: invoice.paymentStatus === 'paid' ? 'paid' : 'partially_paid',
                    paymentMethod: invoice.paymentMethod,
                    date: invoice.date,
                    verifiedBy: invoice.authorizedStaffName || 'Billing Desk',
                    providerReference: invoice.providerReference || 'VERIFIED-SETTLEMENT',
                    companyName: company.name,
                    companyAddress: company.address,
                    companyPhone: company.phone,
                    companyEmail: company.email,
                    companyGstin: company.gstin
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-900/60 hover:bg-blue-800 border border-blue-500/40 text-blue-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                <span>Payment Receipt</span>
              </button>
            )}

            {onReprint && (
              <button
                type="button"
                onClick={onReprint}
                disabled={isReprinting}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isReprinting ? 'animate-spin' : ''}`} />
                <span>{isReprinting ? 'Reprinting...' : 'Reprint'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Screen Preview Simulator Container */}
        <div className="p-4 md:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center overflow-x-auto">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 print:hidden">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Screen Preview = Physical Print Output (Standard A4 Half-Page)</span>
          </div>

          <div
            ref={printAreaRef}
            className="w-full max-w-[200mm] bg-white text-slate-950 p-2 rounded-xl shadow-2xl border border-slate-300 print:border-none print:shadow-none print:p-0"
          >
            <UniversalA4HalfPageInvoice
              invoice={invoice}
              company={company}
              onPrint={handlePrint}
              onDownloadPdf={handleDownloadPdf}
              onClose={onClose}
              isReprint={invoice.isReprint}
              onPaymentSuccess={(receiptData) => {
                setActiveReceipt(receiptData);
              }}
              onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
            />
          </div>
        </div>

        {/* Quick Settlement Verification Modal */}
        {isVerifyModalOpen && (
          <PaymentSettlementVerifyModal
            isOpen={isVerifyModalOpen}
            onClose={() => setIsVerifyModalOpen(false)}
            billNumber={invoice.invoiceNumber}
            amountDue={invoice.dueAmount}
            patientName={invoice.patientName}
            patientId={invoice.patientId}
            onSettled={(receipt) => {
              setActiveReceipt(receipt);
            }}
          />
        )}

        {/* Payment Receipt Modal */}
        {activeReceipt && (
          <CentralPaymentReceiptModal
            isOpen={!!activeReceipt}
            onClose={() => setActiveReceipt(null)}
            receipt={activeReceipt}
          />
        )}
      </div>
    </Modal>
  );
};
