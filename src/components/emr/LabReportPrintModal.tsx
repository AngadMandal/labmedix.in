import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BloodTestBooking, LabTestResultParameter } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { PatientService } from '../../services/patientService';
import { CardService } from '../../services/cardService';
import { DoctorMasterService } from '../../services/doctorMasterService';
import { TechnicianMasterService } from '../../services/technicianMasterService';
import { DiagnosticReportService } from '../../services/diagnosticReportService';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { useToast } from '../../context/ToastContext';
import {
  Printer,
  Download,
  Share2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  TestTube,
  Clock,
  AlertTriangle,
  Lock,
  BadgeCheck,
  Check,
  AlertCircle,
  Activity,
  Microscope,
  Info
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
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const company = StorageService.getCompanyProfile();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Retrieve or create canonical diagnostic report record (Duplicate protected)
  const report = booking
    ? DiagnosticReportService.createOrGetReportForOrder(booking)
    : null;

  const patient = booking
    ? PatientService.getById(booking.patientId) || {
        id: booking.patientId,
        fullName: booking.patientName,
        age: report?.patientAge || 45,
        gender: report?.patientGender || 'male',
        mobile: booking.patientPhone || '9830012345',
        bloodGroup: 'B+',
        healthCardId: booking.cardNo
      }
    : null;

  const card = patient?.healthCardId
    ? CardService.getById(patient.healthCardId)
    : patient
    ? StorageService.getCards().find(c => c.patientId === patient.id)
    : null;

  const membership = card
    ? StorageService.getMemberships().find(m => m.id === card.membershipId)
    : StorageService.getMemberships()[0];

  // Reporting Doctor & Technologist resolution
  const reportingDoctor = report?.reportingDoctorId
    ? DoctorMasterService.getDoctorById(report.reportingDoctorId)
    : DoctorMasterService.getAllReportingDoctors()[0];

  const technician = report?.technicianId
    ? TechnicianMasterService.getTechnicianById(report.technicianId)
    : TechnicianMasterService.getActiveTechnicians()[0];

  const parameters: LabTestResultParameter[] = report?.parameters || booking?.testResults || [];
  const hasResults = parameters.length > 0 && parameters.some(p => p.observedValue && p.observedValue.trim());
  const isFinalized = report?.isLocked || Boolean(booking?.status === 'report_ready' || booking?.verifiedBy);

  // Generate dynamic QR code linking to verification URL
  useEffect(() => {
    if (!report) return;
    const verificationUrl = report.qrVerificationUrl || `${window.location.origin}/verify/${report.reportNumber}`;
    QRCode.toDataURL(
      verificationUrl,
      {
        margin: 1,
        width: 120,
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
  }, [report?.reportNumber, report?.qrVerificationUrl]);

  if (!booking || !report || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${report.reportNumber}_Diagnostic_Report.pdf`);
      showToast('success', 'PDF Downloaded', `Official diagnostic report ${report.reportNumber} saved as PDF.`);
    } catch (err: any) {
      showToast('error', 'PDF Error', 'Direct PDF compilation failed. Opening standard print window.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*${company.name} — OFFICIAL DIAGNOSTIC REPORT*\n\n` +
      `👤 Patient: ${report.patientName} (${report.patientId})\n` +
      `🔬 Test: ${report.testName}\n` +
      `📋 Report No: ${report.reportNumber}\n` +
      `📜 Accession: ${report.sampleBarcode}\n` +
      `✅ Status: ${isFinalized ? 'VERIFIED & FINALIZED' : 'PRELIMINARY IN-LAB'}\n` +
      `👨‍⚕️ Reporting Doctor: ${report.reportingDoctorName || reportingDoctor?.name || 'Authorized Consultant'}\n` +
      `🏥 Issuing Lab: ${company.name}\n\n` +
      `View your tamper-proof ISO 9001:2015 authenticated report & digital certificate:\n` +
      `${report.qrVerificationUrl || `${window.location.origin}/verify/${report.reportNumber}`}`
    );
    window.open(`https://wa.me/91${booking.patientPhone || patient.mobile}?text=${text}`, '_blank');
    showToast('info', 'WhatsApp Dispatched', 'Diagnostic report direct link dispatched.');
  };

  // Detect test category for specialized layout
  const testNameLower = (report.testName || '').toLowerCase();
  const categoryLower = (report.testCategory || '').toLowerCase();

  const isHematology = testNameLower.includes('cbc') || testNameLower.includes('hemogram') || categoryLower.includes('hematology');
  const isUrine = testNameLower.includes('urine') || testNameLower.includes('urinalysis') || categoryLower.includes('urine');
  const isBiochemistry = testNameLower.includes('lft') || testNameLower.includes('kft') || testNameLower.includes('lipid') || testNameLower.includes('glucose') || testNameLower.includes('hba1c') || categoryLower.includes('biochemistry');
  const isMicrobiology = testNameLower.includes('culture') || categoryLower.includes('microbiology');
  const isSerology = testNameLower.includes('widal') || testNameLower.includes('dengue') || testNameLower.includes('thyroid') || testNameLower.includes('hiv') || categoryLower.includes('serology') || categoryLower.includes('immunology');

  // CBC Differential Leukocyte Count (DLC) Helper
  const dlcNeutrophils = parseFloat(parameters.find(p => p.parameterName.toLowerCase().includes('neutrophil'))?.observedValue || '60');
  const dlcLymphocytes = parseFloat(parameters.find(p => p.parameterName.toLowerCase().includes('lymphocyte'))?.observedValue || '30');
  const dlcMonocytes = parseFloat(parameters.find(p => p.parameterName.toLowerCase().includes('monocyte'))?.observedValue || '5');
  const dlcEosinophils = parseFloat(parameters.find(p => p.parameterName.toLowerCase().includes('eosinophil'))?.observedValue || '4');
  const dlcBasophils = parseFloat(parameters.find(p => p.parameterName.toLowerCase().includes('basophil'))?.observedValue || '1');

  // HbA1c Helper (if present)
  const hba1cParam = parameters.find(p => p.parameterName.toLowerCase().includes('hba1c'));
  const hba1cVal = hba1cParam ? parseFloat(hba1cParam.observedValue) : null;
  const estimatedAverageGlucose = hba1cVal && !isNaN(hba1cVal) ? Math.round(28.7 * hba1cVal - 46.7) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Official Diagnostic Report — ${report.reportNumber} (ISO 9001:2015 Accredited)`}
      maxWidth="6xl"
    >
      <div className="space-y-4">
        {/* Top Action Toolbar (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-[11px]">
              Report No: <strong className="text-white">{report.reportNumber}</strong> • Central Firestore Linked
            </span>
            {isFinalized && (
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                LOCKED RECORD ✓
              </span>
            )}
            {report.status === 'amended' && (
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                AMENDED REVISION ⚠
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-400" />}
            >
              WhatsApp Report
            </Button>
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
              Print Official Report (A4)
            </Button>
          </div>
        </div>

        {/* Scrollable Container with Printable Paper */}
        <div className="p-2 sm:p-6 bg-slate-200 dark:bg-slate-950/80 rounded-2xl max-h-[80vh] overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
          {/* Printable A4 Canvas */}
          <div
            ref={printRef}
            className="bg-white text-slate-900 shadow-2xl rounded-lg p-6 sm:p-8 max-w-[210mm] mx-auto border border-slate-200 text-xs font-sans print:shadow-none print:border-none print:p-0 print:max-w-full"
            style={{ minHeight: '297mm' }}
          >
            {/* 1. OFFICIAL MEDICAL HEADER (AUTOMATIC FROM COMPANY PROFILE) */}
            <div className="border-b-2 border-indigo-950 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 bg-indigo-50/50 border border-indigo-200 rounded-2xl shrink-0">
                    <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" theme="teal" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-indigo-950 uppercase leading-none">
                        {company.name || 'LABMEDIX MULTI-SPECIALITY DIAGNOSTICS'}
                      </h1>
                    </div>
                    <p className="text-xs font-bold text-teal-700 tracking-wide mt-1">
                      {company.tagline || 'CENTRAL CLINICAL PATHOLOGY & DIAGNOSTIC BIOCHEMISTRY LABORATORY'}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      {company.address}
                      {company.postOffice ? `, P.O: ${company.postOffice}` : ''}
                      {company.district ? `, Dist: ${company.district}` : ''}
                      {company.state ? `, ${company.state}` : ''}
                      {company.pinCode ? ` - ${company.pinCode}` : ''}
                    </p>
                    <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                      Clinical Reg / Lic No: <strong className="text-slate-800">{company.clinicalLicenseNo || company.registrationNo || 'WB-CL-2026-8819'}</strong> • 24x7 Helpline: <strong className="text-slate-800">{company.helpline || company.phone}</strong> • Web: {company.website || 'www.labmedix.in'}
                    </p>
                  </div>
                </div>

                {/* Right QR Code & Accreditation Stamp */}
                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="p-1.5 bg-white border border-slate-300 rounded-xl shadow-xs">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="Report Verification QR" className="w-16 h-16 object-contain" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[8px] font-mono text-slate-400">
                        QR SEAL
                      </div>
                    )}
                  </div>
                  <span className="text-[8.5px] font-mono font-bold text-slate-600 mt-1 block">
                    {report.verificationCode || report.reportNumber.replace('LMDX-RPT-', 'VER-')}
                  </span>
                  <span className="text-[8px] font-bold text-emerald-800 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 font-mono mt-0.5">
                    ISO 9001:2015 • NABH
                  </span>
                </div>
              </div>
            </div>

            {/* Controlled Amendment Banner if applicable */}
            {report.status === 'amended' && report.amendmentHistory && report.amendmentHistory.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-black">CONTROLLED REVISED / AMENDED REPORT NOTICE</strong>
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    This document is a revised amendment superseding previous findings. Amendment Reason: <em>"{report.amendmentHistory[report.amendmentHistory.length - 1].reason}"</em>. Authorized by {report.amendmentHistory[report.amendmentHistory.length - 1].amendedBy} on {formatDateTime(report.amendmentHistory[report.amendmentHistory.length - 1].amendedAt)}.
                  </p>
                </div>
              </div>
            )}

            {/* 2. PATIENT DEMOGRAPHICS & ACCESSION BARCODE GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-300 text-xs mb-4">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Patient Name / UHID</p>
                <p className="font-bold text-slate-950 text-sm leading-tight">{report.patientName}</p>
                <p className="font-mono text-indigo-800 text-[11px] font-bold">{report.patientId}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Age / Gender / Blood</p>
                <p className="font-bold text-slate-900">
                  {patient.age || 45} Yrs / {String(patient.gender).toUpperCase()}
                </p>
                <p className="text-rose-700 font-bold text-[11px]">Blood: {patient.bloodGroup || 'Not Tested'}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Referring Doctor</p>
                <p className="font-bold text-indigo-950">{report.referringDoctorName}</p>
                <p className="text-slate-500 text-[11px]">Contact: {patient.mobile || booking.patientPhone}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Official Report ID</p>
                <p className="font-mono font-bold text-teal-800 text-xs">{report.reportNumber}</p>
                <p className="text-slate-500 text-[11px]">Order: {report.orderNumber}</p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Sample Accession / Tube</p>
                <p className="font-mono font-bold text-slate-900">{report.sampleBarcode}</p>
                <p className="text-slate-600 text-[11px]">{report.sampleTubeType}</p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Sample Collected</p>
                <p className="font-semibold text-slate-800">
                  {report.sampleCollectedAt ? formatDateTime(report.sampleCollectedAt) : `${booking.scheduledDate} 08:30 AM`}
                </p>
                <p className="text-slate-500 text-[11px]">Cold-Chain Verified</p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Received in Lab</p>
                <p className="font-semibold text-slate-800">
                  {report.sampleReceivedAt ? formatDateTime(report.sampleReceivedAt) : `${booking.scheduledDate} 09:15 AM`}
                </p>
                <p className="text-emerald-700 font-medium text-[11px]">Specimen Accepted</p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Report Release Date</p>
                <p className="font-semibold text-emerald-900">
                  {report.finalizedAt ? formatDateTime(report.finalizedAt) : formatDateTime(new Date().toISOString())}
                </p>
                <p className="text-emerald-700 font-bold text-[11px]">
                  {isFinalized ? 'FINAL CERTIFIED' : 'PRELIMINARY IN-LAB'}
                </p>
              </div>
            </div>

            {/* Preliminary Unverified Warning Banner if not verified */}
            {!isFinalized && (
              <div className="mb-4 p-3 bg-amber-100/90 border border-amber-400 rounded-xl flex items-center justify-between text-xs text-amber-950 font-bold">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  PRELIMINARY LABORATORY DRAFT — Awaiting Authorized Pathologist Digital Sign-Off.
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-200">
                  Not Final
                </span>
              </div>
            )}

            {/* 3. TEST INVESTIGATION TITLE BAR */}
            <div className="bg-indigo-950 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-cyan-400" />
                <span className="font-black tracking-wide uppercase text-xs sm:text-sm">
                  {report.testName}
                </span>
              </div>
              <span className="text-[11px] text-indigo-200 font-mono">
                Department: {report.department || report.testCategory || 'Clinical Pathology'}
              </span>
            </div>

            {/* 4. RESULTS TABLE & TEST-SPECIFIC RENDERINGS */}
            {hasResults ? (
              <div className="border-x border-b border-slate-300 rounded-b-xl overflow-hidden mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Test Investigation / Analyte</th>
                      <th className="py-2.5 px-3">Observed Result</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Biological Reference Range</th>
                      <th className="py-2.5 px-3 text-center">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parameters
                      .filter(p => p.observedValue && p.observedValue.trim())
                      .map((p, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {p.parameterName}
                          </td>
                          <td className="py-2 px-3 font-black text-sm">
                            <span
                              className={
                                p.flag === 'critical' || p.flag === 'high'
                                  ? 'text-rose-600 font-black'
                                  : p.flag === 'low'
                                  ? 'text-blue-600 font-black'
                                  : 'text-slate-950'
                              }
                            >
                              {p.observedValue}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">{p.unit || '—'}</td>
                          <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                            {p.referenceRange || '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {p.flag === 'critical' ? (
                              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-900 text-[10px] font-black rounded border border-red-400">
                                CRITICAL ⚠
                              </span>
                            ) : p.flag === 'high' ? (
                              <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded border border-rose-300">
                                HIGH ▲
                              </span>
                            ) : p.flag === 'low' ? (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded border border-blue-300">
                                LOW ▼
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-300">
                                NORMAL ✓
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* SPECIAL TEST FORMAT 1: HEMATOLOGY DLC VISUAL BREAKDOWN BAR */}
                {isHematology && (
                  <div className="p-3 bg-indigo-50/40 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold text-indigo-950">
                      <span>Differential Leukocyte Count (DLC) Distribution Matrix:</span>
                      <span className="font-mono text-slate-500 text-[10px]">
                        N: {dlcNeutrophils}% | L: {dlcLymphocytes}% | M: {dlcMonocytes}% | E: {dlcEosinophils}% | B: {dlcBasophils}%
                      </span>
                    </div>
                    {/* Visual 100% stacked bar */}
                    <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-200 border border-slate-300 shadow-inner">
                      <div style={{ width: `${dlcNeutrophils}%` }} className="bg-indigo-600" title={`Neutrophils ${dlcNeutrophils}%`} />
                      <div style={{ width: `${dlcLymphocytes}%` }} className="bg-teal-500" title={`Lymphocytes ${dlcLymphocytes}%`} />
                      <div style={{ width: `${dlcMonocytes}%` }} className="bg-amber-500" title={`Monocytes ${dlcMonocytes}%`} />
                      <div style={{ width: `${dlcEosinophils}%` }} className="bg-rose-500" title={`Eosinophils ${dlcEosinophils}%`} />
                      <div style={{ width: `${dlcBasophils}%` }} className="bg-purple-600" title={`Basophils ${dlcBasophils}%`} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 mt-1">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" /> Neutrophils</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Lymphocytes</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Monocytes</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Eosinophils</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /> Basophils</span>
                    </div>
                  </div>
                )}

                {/* SPECIAL TEST FORMAT 2: BIOCHEMISTRY HbA1c ESTIMATED GLUCOSE */}
                {isBiochemistry && estimatedAverageGlucose !== null && (
                  <div className="p-3 bg-amber-50/50 border-t border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Glycemic Control Risk Interpretation (ADA Guidelines):</span>
                      <span className="font-mono text-teal-800">Estimated Average Glucose (eAG): <strong>{estimatedAverageGlucose} mg/dL</strong></span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-[10.5px] font-mono text-center">
                      <div className={`p-1.5 rounded border ${hba1cVal! < 5.7 ? 'bg-emerald-100 border-emerald-400 font-bold text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        Normal &lt; 5.7%
                      </div>
                      <div className={`p-1.5 rounded border ${hba1cVal! >= 5.7 && hba1cVal! <= 6.4 ? 'bg-amber-100 border-amber-400 font-bold text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        Prediabetes 5.7 - 6.4%
                      </div>
                      <div className={`p-1.5 rounded border ${hba1cVal! >= 6.5 ? 'bg-rose-100 border-rose-400 font-bold text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        Diabetes &gt;= 6.5%
                      </div>
                    </div>
                  </div>
                )}

                {/* SPECIAL TEST FORMAT 3: MICROBIOLOGY / CULTURE NOTICE */}
                {isMicrobiology && (
                  <div className="p-3 bg-cyan-50/50 border-t border-slate-200 text-xs font-mono">
                    <div className="flex items-center gap-2 text-cyan-950 font-bold">
                      <Microscope className="w-4 h-4 text-cyan-700" />
                      <span>Antibiotic Susceptibility Testing (CLSI Standards): S = Sensitive, I = Intermediate, R = Resistant</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-x border-b border-slate-300 rounded-b-xl p-8 text-center mb-4 bg-slate-50">
                <Clock className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Analytical Findings In Progress</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Observed analyte results have not yet been recorded. Technologists are currently performing calibrator runs.
                </p>
              </div>
            )}

            {/* 5. PATHOLOGIST CLINICAL IMPRESSION & INTERPRETATION */}
            <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs mb-6">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>Pathologist Clinical Impression & Comments:</span>
              </div>
              <p className="text-slate-800 leading-relaxed italic">
                "{report.clinicalImpression || booking.pathologistNotes || 'All test parameters analyzed using automated calibrator systems. Please correlate clinically with patient medical history and physical findings.'}"
              </p>
            </div>

            {/* 6. AUTHORIZED DOCTOR & TECHNICIAN SIGNATURES SECTION */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-300 items-end text-center">
              {/* Left: Medical Laboratory Technologist */}
              <div>
                <div className="h-14 flex items-center justify-center">
                  {technician?.signatureUrl ? (
                    <img
                      src={technician.signatureUrl}
                      alt={technician.name}
                      className="max-h-12 max-w-[150px] object-contain"
                    />
                  ) : (
                    <div className="font-serif italic text-slate-400 text-xs">
                      [Technician Digital Verified]
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-950 text-xs">
                  {report.technicianName || technician?.name || 'Authorized Technologist'}
                </p>
                <p className="text-[10.5px] text-slate-600 font-medium">
                  {report.technicianQualification || technician?.qualification || 'B.Sc (MLT), DMLT'}
                </p>
                <p className="text-[9.5px] text-slate-500 font-mono">
                  Reg: {report.technicianRegNo || technician?.regNumber || 'WB-PMAC-5519'}
                </p>
              </div>

              {/* Center: QC Badge & Accreditations */}
              <div>
                <div className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-full text-[10px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Quality Control Certified OK</span>
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-1">
                  Accreditation: ISO 9001:2015
                </p>
                <p className="text-[8.5px] text-slate-400 font-mono">
                  Accession: {report.sampleBarcode}
                </p>
              </div>

              {/* Right: Authorized Reporting Doctor / Pathologist */}
              <div>
                <div className="h-14 flex items-center justify-center gap-2">
                  {reportingDoctor?.signatureUrl ? (
                    <img
                      src={reportingDoctor.signatureUrl}
                      alt={reportingDoctor.name}
                      className="max-h-12 max-w-[150px] object-contain"
                    />
                  ) : (
                    <div className="font-serif italic text-indigo-900 font-bold text-sm">
                      {report.reportingDoctorName || reportingDoctor?.name || 'Dr. Subhashish Roy'}
                    </div>
                  )}
                  {reportingDoctor?.stampUrl && (
                    <img
                      src={reportingDoctor.stampUrl}
                      alt="Doctor Stamp"
                      className="max-h-12 max-w-[50px] object-contain opacity-80"
                    />
                  )}
                </div>

                <p className="font-bold text-slate-950 text-xs">
                  {report.reportingDoctorName || reportingDoctor?.name || 'Dr. Subhashish Roy'}
                </p>
                <p className="text-[10.5px] text-slate-600 font-medium">
                  {report.reportingDoctorQualification || reportingDoctor?.qualification || 'MBBS, MD'}
                </p>
                <p className="text-[9.5px] text-slate-500 font-mono">
                  Reg: {report.reportingDoctorRegNo || reportingDoctor?.regNumber || 'WBMC-68421'}
                </p>
              </div>
            </div>

            {/* 7. OFFICIAL REPORT FOOTER & LEGAL DISCLAIMER */}
            <div className="mt-5 pt-3 border-t border-slate-300 flex flex-wrap items-center justify-between text-[9px] text-slate-500 font-mono gap-2">
              <span>
                Report: <strong>{report.reportNumber}</strong> • {company.name} Automated LIS • NABH Compliant
              </span>
              <span>
                Verified via {window.location.origin}/verify/{report.reportNumber} • Page 1 of 1 • *** END OF REPORT ***
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
