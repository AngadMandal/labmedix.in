import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { PharmacySale, Patient, HealthCard } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { PharmacyService } from '../../services/pharmacyService';
import { PrintService } from '../../services/printService';
import { PharmacyA4HalfPageInvoice } from './PharmacyA4HalfPageInvoice';
import { Printer, Download, Copy, RotateCcw, CheckCircle, Eye } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PharmacyBillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: PharmacySale | null;
  patient?: Patient | null;
  card?: HealthCard | null;
  onSaleUpdated?: (updatedSale: PharmacySale) => void;
}

export const PharmacyBillPrintModal: React.FC<PharmacyBillPrintModalProps> = ({
  isOpen,
  onClose,
  sale: initialSale,
  patient,
  card,
  onSaleUpdated
}) => {
  const { companyProfile } = useSettings();
  const { currentUser } = useAuth();

  const [currentSale, setCurrentSale] = useState<PharmacySale | null>(initialSale);
  const [showDuplicateCopy, setShowDuplicateCopy] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isReprinting, setIsReprinting] = useState<boolean>(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync initial sale
  React.useEffect(() => {
    setCurrentSale(initialSale);
  }, [initialSale]);

  if (!currentSale) return null;

  const handlePrint = () => {
    if (printAreaRef.current) {
      PrintService.printPharmacyA4HalfPageBill(
        printAreaRef.current,
        `Pharmacy Invoice - ${currentSale.invoiceNumber}`
      );
    } else {
      window.print();
    }
  };

  const handleReprint = async () => {
    try {
      setIsReprinting(true);
      const updated = await PharmacyService.reprintSale(
        currentSale.id,
        currentUser?.fullName || 'Authorized Cashier'
      );
      setCurrentSale(updated);
      if (onSaleUpdated) onSaleUpdated(updated);
      // Immediately open print window for the reprint
      setTimeout(() => {
        if (printAreaRef.current) {
          PrintService.printPharmacyA4HalfPageBill(
            printAreaRef.current,
            `REPRINT - Pharmacy Invoice - ${updated.invoiceNumber}`
          );
        }
      }, 100);
    } catch (err: any) {
      console.error('Failed to record reprint:', err);
    } finally {
      setIsReprinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExportingPdf(true);
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Exact A4 dimensions: 210 x 297 mm
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Position top-aligned so it occupies the exact half-page
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(297, pdfHeight));
      pdf.save(`${currentSale.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Official A4 Half-Page Bill: ${currentSale.invoiceNumber}`}
      maxWidth="6xl"
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        {/* TOP ACTION BAR (Hidden on print) */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">Standard A4 Half-Page Invoice</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Fixed 140mm Boundary
                </span>
                {currentSale.isReprint && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    REPRINT (Copy #{currentSale.reprintCount || 1})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">
                {currentSale.invoiceNumber} • Synchronized with Centralized Settings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle duplicate copy on same A4 sheet */}
            <button
              type="button"
              onClick={() => setShowDuplicateCopy(!showDuplicateCopy)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                showDuplicateCopy
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Print 2 copies (Original + Store Duplicate) on 1 single A4 sheet"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{showDuplicateCopy ? '2 Copies on Sheet (Active)' : 'Print 2 Copies / Sheet'}</span>
            </button>

            {/* Reprint Button */}
            <button
              type="button"
              onClick={handleReprint}
              disabled={isReprinting}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReprinting ? 'animate-spin' : ''}`} />
              <span>{isReprinting ? 'Logging Reprint...' : 'Reprint Bill'}</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {/* Print Official Bill */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Bill</span>
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

        {/* VISUAL A4 SHEET PREVIEW SIMULATOR */}
        <div className="p-4 md:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center overflow-x-auto">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 print:hidden">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exact Print-Ready A4 Sheet Preview (Standardized Half-Page Layout)</span>
          </div>

          {/* Printable Container matching A4 boundaries */}
          <div
            ref={printAreaRef}
            className="w-full max-w-[210mm] bg-white text-slate-950 p-6 rounded-2xl shadow-2xl border border-slate-300 print:border-none print:shadow-none print:p-0"
            style={{ minHeight: showDuplicateCopy ? '297mm' : '148.5mm' }}
          >
            <PharmacyA4HalfPageInvoice
              sale={currentSale}
              companyProfile={companyProfile}
              patient={patient}
              card={card}
              isReprint={currentSale.isReprint}
              showDuplicateBottomCopy={showDuplicateCopy}
              copyLabel="ORIGINAL CUSTOMER INVOICE"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
