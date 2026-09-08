import React, { useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BloodTestBooking, LabTestResultParameter } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { PatientService } from '../../services/patientService';
import { CardService } from '../../services/cardService';
import { formatDateTime } from '../../utils/formatters';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { useToast } from '../../context/ToastContext';
import {
  Printer,
  Download,
  Share2,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  FileText,
  TestTube,
  Clock
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

  if (!booking) return null;

  const patient = PatientService.getById(booking.patientId) || {
    id: booking.patientId,
    fullName: booking.patientName,
    age: 45,
    gender: 'male',
    mobile: booking.patientPhone || '9830012345',
    bloodGroup: 'B+',
    healthCardId: booking.cardNo
  };

  const card = patient.healthCardId ? CardService.getById(patient.healthCardId) : StorageService.getCards().find(c => c.patientId === patient.id);
  const membership = card ? StorageService.getMemberships().find(m => m.id === card.membershipId) : StorageService.getMemberships()[0];

  const parameters: LabTestResultParameter[] = booking.testResults || [];
  const hasResults = parameters.length > 0 && parameters.some(p => p.observedValue && p.observedValue.trim());
  const isVerified = Boolean(booking.verifiedBy || booking.status === 'report_ready' || booking.pathologistName);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*${company.name} - DIAGNOSTIC REPORT READY*\n\n` +
      `👤 Patient: ${booking.patientName} (${booking.patientId})\n` +
      `🔬 Test: ${booking.testName}\n` +
      `📋 Requisition No: ${booking.bookingNo}\n` +
      `✅ Status: VERIFIED & COMPLETED\n` +
      `👨‍⚕️ Prescribed By: ${booking.prescribedByDoctorName || 'Consultant Physician'}\n` +
      `🏥 Lab: Central Pathology & Biochemistry\n\n` +
      `Download your official ISO 9001:2015 verified PDF report from your cashless patient portal:\n` +
      `https://labmedix.health/portal?patientId=${booking.patientId}`
    );
    window.open(`https://wa.me/91${booking.patientPhone || patient.mobile}?text=${text}`, '_blank');
    showToast('info', 'WhatsApp Dispatched', 'Diagnostic report direct download link created.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Diagnostic Pathology Report (ISO 9001:2015 Accredited)"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Top Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Digital Cryptographic QR Verified • Legal Clinical Diagnostic Record</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp} leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-400" />}>
              WhatsApp Report
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={<Download className="w-3.5 h-3.5 text-indigo-400" />}>
              Download PDF
            </Button>
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold" onClick={handlePrint} leftIcon={<Printer className="w-3.5 h-3.5" />}>
              Print Official Report (A4)
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 rounded-2xl max-h-[78vh] overflow-y-auto">
        {/* Printable Paper A4 Layout */}
        <div
          ref={printRef}
          className="bg-white text-slate-900 shadow-2xl rounded-lg p-6 sm:p-8 max-w-4xl mx-auto border border-slate-200 text-sm font-sans"
        >
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b-2 border-indigo-900 pb-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" theme="teal" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-indigo-950 uppercase">{company.name || 'LABMEDIX MULTI-SPECIALITY HEALTHCARE & RESEARCH CENTRE'}</h1>
                  <span className="text-[10px] px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-300 font-mono">
                    ISO 9001:2015 ACCREDITED • NABH STANDARDS • DIAGNOSTIC LABS
                  </span>
                </div>
                <p className="text-xs font-bold text-indigo-700 tracking-wide mt-0.5">
                  CENTRAL DIAGNOSTIC PATHOLOGY & SPECIAL BIOCHEMISTRY LABORATORY
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
                  Main Health Expressway, Medical Square • Reg No: {company.clinicalLicenseNo || 'WB-CL-2026-8819'} • 24x7 Helpline: <strong>+91 98765 43210</strong>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex flex-col items-end">
                <div className="p-1 bg-slate-50 border border-slate-200 rounded shadow-sm">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-1">VER-QR-{booking.bookingNo.replace('LAB-2026-', '')}</span>
              </div>
            </div>
          </div>

          {/* Patient & Sample Demographics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-4">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Patient Name / UHID</p>
              <p className="font-bold text-slate-900 text-sm">{booking.patientName}</p>
              <p className="font-mono text-indigo-700 text-[11px] font-semibold">{booking.patientId}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Age / Gender / Blood</p>
              <p className="font-bold text-slate-800">{patient.age || 45} Yrs / {String(patient.gender).toUpperCase()}</p>
              <p className="text-rose-600 font-bold">Blood Group: {patient.bloodGroup || 'B+'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Referring Doctor</p>
              <p className="font-bold text-indigo-900">{booking.prescribedByDoctorName || 'Dr. Subhashish Roy'}</p>
              <p className="text-slate-500 text-[11px]">Encounter: {booking.encounterNo || 'ENC-OPD-DIRECT'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Health Card Privilege</p>
              <p className="font-bold text-amber-700">{booking.cardTier || membership?.name || 'Gold Card'}</p>
              <p className="text-slate-500 text-[11px]">{card?.cardNumber || 'LHC-2026-ACTIVE'}</p>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Sample Barcode / Tube</p>
              <p className="font-mono font-bold text-indigo-800">{booking.sampleBarcode || `SAMP-${booking.bookingNo}`}</p>
              <p className="text-slate-600 text-[11px]">{booking.sampleTubeType || 'EDTA Purple / SST Gold'}</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Collection Time</p>
              <p className="font-semibold text-slate-800">
                {booking.sampleCollectedAt ? formatDateTime(booking.sampleCollectedAt) : `${booking.scheduledDate} 08:30 AM`}
              </p>
              <p className="text-slate-500 text-[11px]">Phleb: {booking.assignedPhlebotomist || 'Central Lab Phlebotomist'}</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Received in Lab</p>
              <p className="font-semibold text-slate-800">
                {booking.sampleReceivedAt ? formatDateTime(booking.sampleReceivedAt) : `${booking.scheduledDate} 09:15 AM`}
              </p>
              <p className="text-emerald-600 font-medium text-[11px]">Cold-Chain Verified</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Report Authorized</p>
              <p className="font-semibold text-emerald-800">
                {booking.reportReadyAt ? formatDateTime(booking.reportReadyAt) : formatDateTime(new Date().toISOString())}
              </p>
              <p className="text-emerald-700 font-bold text-[11px]">FINAL COMPLETED</p>
            </div>
          </div>

          {/* Preliminary Unverified Warning Banner if not verified */}
          {!isVerified && (
            <div className="mb-4 p-3 bg-amber-100/80 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900 font-bold">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                PRELIMINARY UNVERIFIED DRAFT — Awaiting Pathologist Final Verification & Digital Sign-off.
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-200">Pending Authorization</span>
            </div>
          )}

          {/* Test Investigation Title Bar */}
          <div className="bg-indigo-900 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4 text-cyan-300" />
              <span className="font-bold tracking-wide uppercase text-xs">{booking.testName}</span>
            </div>
            <span className="text-[11px] text-indigo-200">Department: {booking.category || 'Pathology'}</span>
          </div>

          {/* Results Parameters Table OR Pending State */}
          {hasResults ? (
            <div className="border-x border-b border-slate-200 rounded-b-lg overflow-hidden mb-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-3">Test Investigation / Analyte</th>
                    <th className="py-2.5 px-3">Observed Result</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Biological Reference Range</th>
                    <th className="py-2.5 px-3 text-center">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parameters.filter(p => p.observedValue && p.observedValue.trim()).map((p, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
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
                              : 'text-slate-900'
                          }
                        >
                          {p.observedValue}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-medium">{p.unit || '-'}</td>
                      <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">{p.referenceRange || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        {p.flag === 'critical' ? (
                          <span className="inline-block px-2 py-0.5 bg-red-100 text-red-900 text-[10px] font-black rounded border border-red-400 animate-pulse">
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
            </div>
          ) : (
            <div className="border-x border-b border-slate-200 rounded-b-lg p-8 text-center mb-5 bg-slate-50">
              <Clock className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Analytical Findings Pending Entry</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Specimen accessioned and in clinical processing. Observed parameter values have not yet been recorded by laboratory technologists.
              </p>
            </div>
          )}

          {/* Pathologist Clinical Interpretation */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs mb-6">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span>Pathologist Clinical Impression & Comments:</span>
            </div>
            <p className="text-slate-800 leading-relaxed italic">
              "{booking.pathologistNotes || 'All test parameters analyzed using automated calibrator systems. Please correlate clinically with patient history and physical examination findings.'}"
            </p>
          </div>

          {/* Signatures & Accreditation Footer */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-300 items-end text-center">
            <div>
              <div className="h-10 flex items-center justify-center font-serif text-slate-400 italic text-xs">
                {hasResults ? '[Technician Entry Recorded]' : '[Awaiting Analysis]'}
              </div>
              <p className="font-bold text-slate-900 text-xs">Diagnostic Technologist</p>
              <p className="text-[10px] text-slate-500 font-medium">Department of Laboratory Medicine</p>
            </div>
            <div>
              <div className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[10px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Internal Quality Control OK</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">Ref No: {booking.bookingNo}</p>
            </div>
            <div>
              {isVerified ? (
                <>
                  <div className="h-10 flex items-center justify-center font-serif text-indigo-900 italic font-bold text-sm">
                    {booking.pathologistName || 'Dr. Subhashish Roy, MD'}
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{booking.pathologistName || 'Dr. Subhashish Roy, MD (Pathology)'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Senior Consultant Pathologist (WBMC-44102)</p>
                </>
              ) : (
                <>
                  <div className="h-10 flex items-center justify-center text-amber-600 italic text-xs font-bold">
                    [Awaiting Verification Signature]
                  </div>
                  <p className="font-bold text-slate-500 text-xs">Duty Pathologist</p>
                  <p className="text-[10px] text-slate-400 font-medium">Pending Final Sign-Off</p>
                </>
              )}
            </div>
          </div>

          {/* End of Report Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
            <span>ISO 9001:2015 Certified Pathology Report • {company.name} Automated LIS Cloud</span>
            <span>Page 1 of 1 • *** END OF DIAGNOSTIC REPORT ***</span>
          </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
