import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BloodTestBooking } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { PatientService } from '../../services/patientService';
import { DiagnosticReportService } from '../../services/diagnosticReportService';
import { OfficialDiagnosticReportDocument } from '../laboratory/OfficialDiagnosticReportDocument';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Printer,
  Download,
  Share2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Check
} from 'lucide-react';

export interface LabReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BloodTestBooking | null;
}

export const LabReportPrintModal: React.FC<LabReportPrintModalProps> = ({
  isOpen,
  onClose,
  booking
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const company = StorageService.getCompanyProfile();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [activePage, setActivePage] = useState<number>(1);
  const totalPages = 1;

  // Retrieve or create canonical diagnostic report record (Duplicate protected)
  const report = booking
    ? DiagnosticReportService.createOrGetReportForOrder(booking)
    : null;

  const isFinalized = report?.isLocked || report?.status === 'finalized';

  // Generate dynamic QR code linking to verification URL
  useEffect(() => {
    if (!report) return;
    const verificationUrl =
      report.qrVerificationUrl ||
      DiagnosticReportService.buildSecureReportUrl(report.reportNumber, report.verificationCode);

    QRCode.toDataURL(
      verificationUrl,
      {
        margin: 1,
        width: 160,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      },
      (err, url) => {
        if (!err && url) {
          setQrCodeDataUrl(url);
        }
      }
    );
  }, [report?.reportNumber, report?.verificationCode, report?.qrVerificationUrl]);

  // Adjust default zoom to fit container width on mount
  useEffect(() => {
    if (isOpen && previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.clientWidth - 48;
      if (containerWidth > 0 && containerWidth < 794) {
        setZoomLevel(Math.max(0.5, Math.min(1, containerWidth / 794)));
      } else {
        setZoomLevel(0.9);
      }
    }
  }, [isOpen]);

  if (!booking || !report) return null;

  // Zoom control handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(+(prev + 0.1).toFixed(2), 1.6));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(+(prev - 0.1).toFixed(2), 0.5));
  const handleResetZoom = () => setZoomLevel(1);
  const handleFitToPage = () => {
    if (previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.clientWidth - 48;
      setZoomLevel(Math.max(0.5, Math.min(1, +(containerWidth / 794).toFixed(2))));
    } else {
      setZoomLevel(0.85);
    }
  };

  // 1. OFFICIAL A4 PRINT
  const handlePrint = () => {
    window.print();
  };

  // 2. PDF DOWNLOAD (A4 Portrait, 0 distortion, 0 horizontal clipping)
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Temporarily store style and reset scale to avoid capture distortion
      const targetElement = printRef.current;
      const originalTransform = targetElement.style.transform;
      targetElement.style.transform = 'none';

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794
      });

      // Restore transform
      targetElement.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

      if (imgHeight <= pdfHeight + 2) {
        // Fits cleanly on 1 single A4 page
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      } else {
        // Multi-page slicing
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      pdf.save(`${report.reportNumber}_Diagnostic_Report.pdf`);
      showToast('success', 'PDF Generated', `Official diagnostic report ${report.reportNumber} downloaded successfully.`);
    } catch (err: any) {
      console.error('PDF generation error', err);
      showToast('error', 'PDF Generation Issue', 'Opening browser print dialog as fallback.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 3. WHATSAPP REPORT LINK DISPATCH (With Strict Validation)
  const handleShareWhatsApp = () => {
    const result = DiagnosticReportService.validateAndPrepareWhatsAppShare(report.reportNumber, currentUser);
    if (!result.success) {
      showToast('error', 'WhatsApp Dispatch Blocked', result.error || 'Report is not authorized for sharing.');
      return;
    }

    if (result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
      showToast('success', 'WhatsApp Link Generated', `Dispatched report link for ${report.patientName}.`);
    }
  };

  // 4. OPEN PUBLIC VERIFICATION PAGE
  const handleVerifyReport = () => {
    const verificationUrl =
      report.qrVerificationUrl ||
      DiagnosticReportService.buildSecureReportUrl(report.reportNumber, report.verificationCode);
    window.open(verificationUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Official Diagnostic Report — ${report.reportNumber}`}
      maxWidth="6xl"
    >
      <div className="space-y-4">
        {/* Top Master Action & Preview Controls Toolbar (Hidden during print) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800 gap-3 shadow-lg print:hidden">
          {/* Left: Metadata & Status Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="font-mono text-[11px]">
              Report ID: <strong className="text-white">{report.reportNumber}</strong>
            </span>
            {isFinalized ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>FINAL RECORD</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span>PRELIMINARY IN-LAB</span>
              </span>
            )}
            {report.status === 'amended' && (
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                AMENDED REVISION ⚠
              </span>
            )}
          </div>

          {/* Center: 1-Page Preview Zoom & Pagination Controls */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 self-start lg:self-auto">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono font-bold text-slate-200 px-2 min-w-[48px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            <button
              onClick={handleFitToPage}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-slate-700 text-teal-300 transition flex items-center gap-1"
              title="Fit to Container"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>

            <button
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="100% Real Size"
            >
              100%
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono px-1">
              <span>Page {activePage} of {totalPages}</span>
            </div>
          </div>

          {/* Right: Master Output Actions (Preview, PDF, Print, WhatsApp, Verify) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyReport}
              leftIcon={<ExternalLink className="w-3.5 h-3.5 text-blue-400" />}
              title="Verify Report Authenticity"
            >
              Verify
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-400" />}
              title="Send Secure WhatsApp Link"
            >
              WhatsApp Link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isGeneratingPdf}
              leftIcon={<Download className="w-3.5 h-3.5 text-indigo-400" />}
              title="Download Official A4 PDF"
            >
              Download PDF
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-700/20"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              title="Print Official Report (A4 Portrait)"
            >
              Print Official A4
            </Button>
          </div>
        </div>

        {/* Scrollable Center Viewport with Scaled A4 Document */}
        <div
          ref={previewContainerRef}
          className="p-3 sm:p-8 bg-slate-950/90 rounded-2xl max-h-[75vh] overflow-auto flex justify-center items-start border border-slate-800 shadow-inner print:p-0 print:m-0 print:bg-white print:overflow-visible print:max-h-none print:border-none"
        >
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
              marginBottom: `${Math.max(0, (1123 * zoomLevel) - 1123)}px`
            }}
            className="print:transform-none print:m-0 print:shadow-none"
          >
            {/* The Master Canonical Official Document */}
            <OfficialDiagnosticReportDocument
              ref={printRef}
              report={report}
              company={company}
              qrCodeDataUrl={qrCodeDataUrl}
              pageNumber={activePage}
              totalPages={totalPages}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
