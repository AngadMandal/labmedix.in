import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { CompanyProfile } from '../../types';
import { UniversalInvoiceData } from '../../types/invoice';
import { UniversalA4HalfPageInvoice } from './UniversalA4HalfPageInvoice';
import { PrintService } from '../../services/printService';
import { InvoiceRenderService } from '../../services/invoiceRenderService';
import { Printer, Download, RotateCcw, Eye, CheckCircle2 } from 'lucide-react';

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
  invoice,
  company,
  onReprint,
  isReprinting = false
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

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
      maxWidth="5xl"
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

          <div className="flex items-center gap-2">
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
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
