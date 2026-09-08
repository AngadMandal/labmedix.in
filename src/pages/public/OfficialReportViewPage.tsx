import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { DiagnosticReportService } from '../../services/diagnosticReportService';
import { StorageService } from '../../services/storage';
import { DiagnosticReportRecord } from '../../types';
import { OfficialDiagnosticReportDocument } from '../../components/laboratory/OfficialDiagnosticReportDocument';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { Button } from '../../components/common/Button';
import {
  ShieldCheck,
  Download,
  Printer,
  ExternalLink,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Phone,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck
} from 'lucide-react';

export const OfficialReportViewPage: React.FC = () => {
  const { reportNumber } = useParams<{ reportNumber: string }>();
  const [searchParams] = useSearchParams();
  const accessKeyParam = searchParams.get('key') || '';

  const [report, setReport] = useState<DiagnosticReportRecord | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [securityInput, setSecurityInput] = useState<string>('');
  const [securityError, setSecurityError] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const company = StorageService.getCompanyProfile();

  useEffect(() => {
    if (!reportNumber) {
      setIsLoading(false);
      return;
    }

    const foundReport = DiagnosticReportService.getReportByReportNumber(reportNumber);
    if (foundReport) {
      setReport(foundReport);

      // Check if accessKey from URL matches
      if (
        accessKeyParam &&
        foundReport.verificationCode &&
        accessKeyParam.trim().toUpperCase() === foundReport.verificationCode.trim().toUpperCase()
      ) {
        setIsAuthorized(true);
      }
    }
    setIsLoading(false);
  }, [reportNumber, accessKeyParam]);

  // Generate QR Code
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

  // Adjust default mobile scaling
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      if (width < 820) {
        // Mobile screen fit
        setZoomLevel(Math.max(0.42, +((width - 24) / 794).toFixed(2)));
      } else {
        setZoomLevel(1);
      }
    }
  }, [isAuthorized]);

  // Verify Phone / Security PIN Challenge
  const handleVerifyAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    const inputClean = securityInput.trim().replace(/\D/g, '');
    const phoneClean = (report.patientPhone || '').replace(/\D/g, '');
    const pinClean = report.verificationCode.replace(/\D/g, '');

    // Allow match on full phone, last 4 digits of phone, or verification PIN
    if (
      (phoneClean && (inputClean === phoneClean || (inputClean.length >= 4 && phoneClean.endsWith(inputClean)))) ||
      (pinClean && inputClean === pinClean) ||
      securityInput.trim().toUpperCase() === report.verificationCode.trim().toUpperCase()
    ) {
      setIsAuthorized(true);
      setSecurityError('');
    } else {
      setSecurityError('Verification failed. Please enter the registered 10-digit mobile number or Security PIN.');
    }
  };

  // Print Official A4
  const handlePrint = () => {
    window.print();
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!printRef.current || !report) return;
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

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

      targetElement.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight + 2) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      } else {
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
    } catch (err) {
      console.error('PDF error', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Retrieving Official Diagnostic Record...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black">Diagnostic Report Not Found</h2>
          <p className="text-xs text-slate-400">
            The requested Report Number <strong>{reportNumber}</strong> is not available or has not yet been registered in the central pathology database.
          </p>
          <Link to="/verify" className="inline-block">
            <Button variant="primary" size="sm">
              Go to Certificate Verification
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Floating Official Navigation Bar (Hidden during print) */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md print:hidden">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="md" theme="teal" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase text-white tracking-wide">
                  {company.name || 'Labmedix Healthcare'}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Official Patient Report
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Report No: <strong className="text-teal-400">{report.reportNumber}</strong> • Patient: {report.patientName}
              </p>
            </div>
          </div>

          {/* Action Buttons if authorized */}
          {isAuthorized && (
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/verify/${report.reportNumber}`}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                >
                  Verify Certificate
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                isLoading={isGeneratingPdf}
                leftIcon={<Download className="w-3.5 h-3.5 text-indigo-400" />}
              >
                Download PDF
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
                onClick={handlePrint}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Official A4
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 overflow-x-hidden">
        {!isAuthorized ? (
          /* Security Access Challenge */
          <div className="max-w-md w-full my-auto p-6 sm:p-8 bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center mx-auto text-teal-400">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">Protected Diagnostic Record</h2>
              <p className="text-xs text-slate-400">
                To protect confidential clinical data, please verify your identity to access this report.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Report Reference</span>
              <p className="font-mono text-teal-400 font-bold">{report.reportNumber}</p>
              <p className="text-white font-bold">{report.testName}</p>
              <p className="text-[11px] text-slate-400">Patient: {report.patientName}</p>
            </div>

            <form onSubmit={handleVerifyAccess} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Registered Mobile Number or Security PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={securityInput}
                    onChange={(e) => setSecurityInput(e.target.value)}
                    placeholder="Enter 10-digit mobile or PIN from slip"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    autoFocus
                  />
                </div>
                {securityError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{securityError}</span>
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Unlock Diagnostic Report
              </Button>
            </form>

            <div className="pt-2 border-t border-slate-800 text-[10.5px] text-slate-500">
              Emergency Assistance? Call Helpline: <strong>{company.helpline || company.phone}</strong>
            </div>
          </div>
        ) : (
          /* Authorized Report View Container */
          <div ref={containerRef} className="w-full flex flex-col items-center">
            {/* Mobile Zoom Notice */}
            <div className="sm:hidden mb-2 text-[10px] text-slate-400 flex items-center gap-1">
              <span>Pinch or double-tap to zoom report • Tap Print/Download for A4 PDF</span>
            </div>

            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                marginBottom: `${Math.max(0, 1123 * zoomLevel - 1123)}px`
              }}
              className="print:transform-none print:m-0 print:shadow-none"
            >
              <OfficialDiagnosticReportDocument
                ref={printRef}
                report={report}
                company={company}
                qrCodeDataUrl={qrCodeDataUrl}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
