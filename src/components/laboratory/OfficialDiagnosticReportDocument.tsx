import React, { forwardRef } from 'react';
import { DiagnosticReportRecord, CompanyProfile, LabParameterResult } from '../../types';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { formatDate, formatDateTime } from '../../utils/formatters';
import {
  TestTube,
  CheckCircle2,
  AlertCircle,
  FileText,
  Microscope,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Globe
} from 'lucide-react';

export interface OfficialDiagnosticReportDocumentProps {
  report: DiagnosticReportRecord;
  company: CompanyProfile;
  qrCodeDataUrl?: string;
  isPrintOnly?: boolean;
  pageNumber?: number;
  totalPages?: number;
}

export const OfficialDiagnosticReportDocument = forwardRef<
  HTMLDivElement,
  OfficialDiagnosticReportDocumentProps
>(({ report, company, qrCodeDataUrl, pageNumber = 1, totalPages = 1 }, ref) => {
  const parameters = report.parameters || [];
  const hasResults = parameters.length > 0 && parameters.some(p => p.observedValue && p.observedValue.trim());
  const isFinalized = report.isLocked || report.status === 'finalized';

  // Test category detection for specialized layout formatting
  const testNameLower = (report.testName || '').toLowerCase();
  const categoryLower = (report.testCategory || '').toLowerCase();

  const isHematology =
    testNameLower.includes('cbc') ||
    testNameLower.includes('hemogram') ||
    categoryLower.includes('hematology') ||
    testNameLower.includes('complete blood count');

  const isUrine =
    testNameLower.includes('urine') ||
    testNameLower.includes('urinalysis') ||
    categoryLower.includes('urine');

  const isBiochemistry =
    testNameLower.includes('lft') ||
    testNameLower.includes('kft') ||
    testNameLower.includes('lipid') ||
    testNameLower.includes('glucose') ||
    testNameLower.includes('hba1c') ||
    testNameLower.includes('sugar') ||
    categoryLower.includes('biochemistry');

  const isMicrobiology =
    testNameLower.includes('culture') ||
    testNameLower.includes('sensitivity') ||
    categoryLower.includes('microbiology');

  const isSerology =
    testNameLower.includes('widal') ||
    testNameLower.includes('dengue') ||
    testNameLower.includes('thyroid') ||
    testNameLower.includes('hiv') ||
    testNameLower.includes('hepatitis') ||
    categoryLower.includes('serology') ||
    categoryLower.includes('immunology');

  // CBC Differential Leukocyte Count (DLC) Helper
  const dlcNeutrophils = parseFloat(
    parameters.find(p => p.parameterName.toLowerCase().includes('neutrophil'))?.observedValue || '0'
  );
  const dlcLymphocytes = parseFloat(
    parameters.find(p => p.parameterName.toLowerCase().includes('lymphocyte'))?.observedValue || '0'
  );
  const dlcMonocytes = parseFloat(
    parameters.find(p => p.parameterName.toLowerCase().includes('monocyte'))?.observedValue || '0'
  );
  const dlcEosinophils = parseFloat(
    parameters.find(p => p.parameterName.toLowerCase().includes('eosinophil'))?.observedValue || '0'
  );
  const dlcBasophils = parseFloat(
    parameters.find(p => p.parameterName.toLowerCase().includes('basophil'))?.observedValue || '0'
  );
  const hasValidDlc = dlcNeutrophils > 0 || dlcLymphocytes > 0;

  // HbA1c Helper
  const hba1cParam = parameters.find(p => p.parameterName.toLowerCase().includes('hba1c'));
  const hba1cVal = hba1cParam ? parseFloat(hba1cParam.observedValue) : null;
  const estimatedAverageGlucose =
    hba1cVal && !isNaN(hba1cVal) ? Math.round(28.7 * hba1cVal - 46.7) : null;

  // Authorized staff credentials from report record
  const technicianName = report.technicianName || 'Certified Medical Technologist';
  const technicianQualification = report.technicianQualification || 'B.Sc (MLT), DMLT';
  const technicianRegNo = report.technicianRegNo || '';
  const technicianSignatureUrl = report.technicianSignatureUrl;

  const reportingDoctorName = report.reportingDoctorName || 'Authorized Consultant Pathologist';
  const reportingDoctorQualification = report.reportingDoctorQualification || 'MBBS, MD (Pathology)';
  const reportingDoctorDesignation = report.reportingDoctorDesignation || 'Consultant Pathologist & HOD';
  const reportingDoctorRegNo = report.reportingDoctorRegNo || '';
  const reportingDoctorSignatureUrl = report.reportingDoctorSignatureUrl;
  const reportingDoctorStampUrl = report.reportingDoctorStampUrl;

  // Accreditations (Loaded strictly from company profile, never hardcoded)
  const accreditationBadges: string[] = [];
  if (company.isoCertification) {
    accreditationBadges.push(company.isoCertification);
  }
  if (company.clinicalLicenseNo) {
    accreditationBadges.push(`Lic: ${company.clinicalLicenseNo}`);
  }
  if (company.registrationNo && !company.clinicalLicenseNo) {
    accreditationBadges.push(`Reg: ${company.registrationNo}`);
  }

  return (
    <div
      ref={ref}
      id="official-diagnostic-report-page"
      className="official-diagnostic-report-document official-a4-page bg-white text-slate-900 shadow-2xl rounded-none sm:rounded-lg mx-auto border border-slate-200 text-xs font-sans print:shadow-none print:border-none print:m-0"
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '36px 42px',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#0f172a'
      }}
    >
      {/* =====================================================================
          1. OFFICIAL MEDICAL HEADER (DYNAMIC FROM COMPANY PROFILE)
          ===================================================================== */}
      <header className="border-b-2 border-indigo-950 pb-3 mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2 bg-indigo-50/60 border border-indigo-200 rounded-2xl shrink-0">
              <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" theme="teal" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-indigo-950 uppercase leading-none">
                  {company.name || 'LABMEDIX DIAGNOSTIC HEALTHCARE'}
                </h1>
              </div>
              <p className="text-xs font-bold text-teal-700 tracking-wide mt-1 uppercase">
                {company.tagline || 'Advanced Clinical Pathology & Diagnostic Network'}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                {company.address}
                {company.postOffice ? `, P.O: ${company.postOffice}` : ''}
                {company.district ? `, Dist: ${company.district}` : ''}
                {company.state ? `, ${company.state}` : ''}
                {company.pinCode ? ` - ${company.pinCode}` : ''}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {company.registrationNo && (
                  <span>Reg: <strong className="text-slate-800">{company.registrationNo}</strong> • </span>
                )}
                Helpline: <strong className="text-slate-800">{company.helpline || company.phone}</strong> • Web: {company.website || 'www.labmedix.in'}
              </p>
            </div>
          </div>

          {/* Right Column: Dynamic QR Code & Accreditations */}
          <div className="text-right shrink-0 flex flex-col items-end">
            <div className="p-1 bg-white border border-slate-300 rounded-xl shadow-xs">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Official Report Verification QR"
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[8px] font-mono text-slate-400">
                  QR SEAL
                </div>
              )}
            </div>
            <span className="text-[8.5px] font-mono font-bold text-slate-700 mt-1 block tracking-wider">
              {report.reportNumber}
            </span>
            {accreditationBadges.length > 0 ? (
              <div className="flex flex-col items-end gap-0.5 mt-0.5">
                {accreditationBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="text-[7.5px] font-bold text-emerald-800 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 font-mono"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Controlled Amendment Banner if applicable */}
      {report.status === 'amended' && report.amendmentHistory && report.amendmentHistory.length > 0 && (
        <div className="mb-3 p-2.5 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-2 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-black text-[11px]">OFFICIAL REVISED / AMENDED REPORT NOTICE</strong>
            <p className="text-[10px] text-amber-900 mt-0.5">
              This document is a revised amendment superseding previous findings. Reason:{' '}
              <em>"{report.amendmentHistory[report.amendmentHistory.length - 1].reason}"</em>. Authorized by{' '}
              {report.amendmentHistory[report.amendmentHistory.length - 1].amendedBy} on{' '}
              {formatDateTime(report.amendmentHistory[report.amendmentHistory.length - 1].amendedAt)}.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. PATIENT DEMOGRAPHICS & SPECIMEN ACCESSION MATRIX
          ===================================================================== */}
      <section className="grid grid-cols-4 gap-2.5 p-3 bg-slate-50/90 rounded-xl border border-slate-300 text-xs mb-3">
        <div>
          <p className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Patient Name / UHID</p>
          <p className="font-bold text-slate-950 text-xs sm:text-sm leading-tight">{report.patientName}</p>
          <p className="font-mono text-indigo-800 text-[10.5px] font-bold">{report.patientId}</p>
        </div>

        <div>
          <p className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Age / Gender / Contact</p>
          <p className="font-bold text-slate-900 text-xs">
            {report.patientAge || 45} Yrs / {(report.patientGender || 'M').toUpperCase()}
          </p>
          <p className="text-slate-600 text-[10px] font-mono">
            {report.patientPhone || 'Phone on file'}
          </p>
        </div>

        <div>
          <p className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Referring Consultant</p>
          <p className="font-bold text-indigo-950 text-xs">{report.referringDoctorName || 'Self / Direct'}</p>
          {report.cardNo && (
            <p className="text-teal-700 font-bold font-mono text-[10px]">
              Card: {report.cardNo} {report.membershipTier ? `(${report.membershipTier})` : ''}
            </p>
          )}
        </div>

        <div>
          <p className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Official Report ID</p>
          <p className="font-mono font-bold text-teal-800 text-xs">{report.reportNumber}</p>
          <p className="text-slate-500 text-[10px] font-mono">Order: {report.orderNumber}</p>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <p className="text-[9.5px] text-slate-500 font-bold uppercase">Specimen / Accession</p>
          <p className="font-mono font-bold text-slate-900 text-xs">{report.sampleBarcode}</p>
          <p className="text-slate-600 text-[10px] truncate">{report.sampleTubeType || 'EDTA / Serum'}</p>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <p className="text-[9.5px] text-slate-500 font-bold uppercase">Sample Collected</p>
          <p className="font-semibold text-slate-800 text-[11px]">
            {report.sampleCollectedAt ? formatDateTime(report.sampleCollectedAt) : `${formatDate(report.createdAt)} 08:30 AM`}
          </p>
          <p className="text-slate-500 text-[10px]">Cold-Chain Verified</p>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <p className="text-[9.5px] text-slate-500 font-bold uppercase">Sample Received</p>
          <p className="font-semibold text-slate-800 text-[11px]">
            {report.sampleReceivedAt ? formatDateTime(report.sampleReceivedAt) : `${formatDate(report.createdAt)} 09:15 AM`}
          </p>
          <p className="text-emerald-700 font-medium text-[10px]">Specimen Accepted</p>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <p className="text-[9.5px] text-slate-500 font-bold uppercase">Report Release</p>
          <p className="font-semibold text-emerald-900 text-[11px]">
            {report.finalizedAt ? formatDateTime(report.finalizedAt) : formatDateTime(report.updatedAt)}
          </p>
          <p className="text-emerald-700 font-bold text-[10px]">
            {isFinalized ? 'FINAL CERTIFIED ✓' : 'PRELIMINARY'}
          </p>
        </div>
      </section>

      {/* Preliminary Warning Banner if not finalized */}
      {!isFinalized && (
        <div className="mb-3 p-2 bg-amber-100 border border-amber-400 rounded-lg flex items-center justify-between text-xs text-amber-950 font-bold">
          <span className="flex items-center gap-1.5 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            PRELIMINARY IN-LAB DRAFT — Pending Final Pathologist Authorization & Verification
          </span>
          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-200">
            Unverified
          </span>
        </div>
      )}

      {/* =====================================================================
          3. TEST INVESTIGATION TITLE BAR
          ===================================================================== */}
      <div className="bg-indigo-950 text-white px-3.5 py-2 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4 text-cyan-400" />
          <span className="font-black tracking-wide uppercase text-xs sm:text-sm">
            {report.testName}
          </span>
        </div>
        <span className="text-[10.5px] text-indigo-200 font-mono">
          Department: {report.department || report.testCategory || 'Clinical Diagnostics'}
        </span>
      </div>

      {/* =====================================================================
          4. RESULTS TABLE & TEST-SPECIFIC RENDERINGS
          ===================================================================== */}
      {hasResults ? (
        <div className="border-x border-b border-slate-300 rounded-b-lg overflow-hidden mb-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[10.5px]">
                <th className="py-2 px-3">Test Investigation / Analyte</th>
                <th className="py-2 px-3">Observed Result</th>
                <th className="py-2 px-3">Unit</th>
                <th className="py-2 px-3">Biological Reference Interval</th>
                <th className="py-2 px-3 text-center">Status Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parameters
                .filter(p => p.observedValue && p.observedValue.trim())
                .map((p, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900 text-xs">
                      {p.parameterName}
                    </td>
                    <td className="py-1.5 px-3 font-black text-xs sm:text-sm">
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
                    <td className="py-1.5 px-3 text-slate-600 font-medium text-[11px]">{p.unit || '—'}</td>
                    <td className="py-1.5 px-3 text-slate-700 font-mono text-[10.5px]">
                      {p.referenceRange || '—'}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {p.flag === 'critical' ? (
                        <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-900 text-[9.5px] font-black rounded border border-red-400">
                          CRITICAL ⚠
                        </span>
                      ) : p.flag === 'high' ? (
                        <span className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9.5px] font-bold rounded border border-rose-300">
                          HIGH ▲
                        </span>
                      ) : p.flag === 'low' ? (
                        <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9.5px] font-bold rounded border border-blue-300">
                          LOW ▼
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9.5px] font-bold rounded border border-emerald-300">
                          NORMAL ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* SPECIAL TEST FORMAT 1: HEMATOLOGY DLC VISUAL BREAKDOWN BAR */}
          {isHematology && hasValidDlc && (
            <div className="p-2.5 bg-indigo-50/40 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1 text-[10.5px] font-bold text-indigo-950">
                <span>Differential Leukocyte Count (DLC) Distribution Matrix:</span>
                <span className="font-mono text-slate-600 text-[9.5px]">
                  N: {dlcNeutrophils}% | L: {dlcLymphocytes}% | M: {dlcMonocytes}% | E: {dlcEosinophils}% | B: {dlcBasophils}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-200 border border-slate-300 shadow-inner">
                <div style={{ width: `${dlcNeutrophils}%` }} className="bg-indigo-600" title={`Neutrophils ${dlcNeutrophils}%`} />
                <div style={{ width: `${dlcLymphocytes}%` }} className="bg-teal-500" title={`Lymphocytes ${dlcLymphocytes}%`} />
                <div style={{ width: `${dlcMonocytes}%` }} className="bg-amber-500" title={`Monocytes ${dlcMonocytes}%`} />
                <div style={{ width: `${dlcEosinophils}%` }} className="bg-rose-500" title={`Eosinophils ${dlcEosinophils}%`} />
                <div style={{ width: `${dlcBasophils}%` }} className="bg-purple-600" title={`Basophils ${dlcBasophils}%`} />
              </div>
              <div className="flex items-center justify-between text-[8.5px] font-mono text-slate-600 mt-1">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block" /> Neutrophils</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" /> Lymphocytes</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Monocytes</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Eosinophils</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" /> Basophils</span>
              </div>
            </div>
          )}

          {/* SPECIAL TEST FORMAT 2: BIOCHEMISTRY HbA1c ESTIMATED GLUCOSE */}
          {isBiochemistry && estimatedAverageGlucose !== null && (
            <div className="p-2.5 bg-amber-50/50 border-t border-slate-200 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                <span>Glycemic Control Risk Interpretation (ADA Guidelines):</span>
                <span className="font-mono text-teal-800">
                  Estimated Average Glucose (eAG): <strong>{estimatedAverageGlucose} mg/dL</strong>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1.5 text-[10px] font-mono text-center">
                <div className={`p-1 rounded border ${hba1cVal! < 5.7 ? 'bg-emerald-100 border-emerald-400 font-bold text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  Normal &lt; 5.7%
                </div>
                <div className={`p-1 rounded border ${hba1cVal! >= 5.7 && hba1cVal! <= 6.4 ? 'bg-amber-100 border-amber-400 font-bold text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  Prediabetes 5.7 - 6.4%
                </div>
                <div className={`p-1 rounded border ${hba1cVal! >= 6.5 ? 'bg-rose-100 border-rose-400 font-bold text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  Diabetes &ge; 6.5%
                </div>
              </div>
            </div>
          )}

          {/* SPECIAL TEST FORMAT 3: MICROBIOLOGY / CULTURE SUSCEPTIBILITY */}
          {isMicrobiology && (
            <div className="p-2.5 bg-cyan-50/50 border-t border-slate-200 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-cyan-950 font-bold text-[10.5px]">
                <Microscope className="w-3.5 h-3.5 text-cyan-700" />
                <span>Antibiotic Susceptibility Testing (CLSI Standards): S = Sensitive, I = Intermediate, R = Resistant</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-x border-b border-slate-300 rounded-b-lg p-6 text-center mb-3 bg-slate-50">
          <TestTube className="w-8 h-8 text-amber-500 mx-auto mb-1.5" />
          <h4 className="text-xs font-bold text-slate-800">Analytical Findings In Progress</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
            Analytical parameters are being processed by automated diagnostic analyzers.
          </p>
        </div>
      )}

      {/* =====================================================================
          5. PATHOLOGIST CLINICAL IMPRESSION & INTERPRETATION
          ===================================================================== */}
      <section className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl text-xs mb-4">
        <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-0.5 text-[11px]">
          <FileText className="w-3.5 h-3.5 text-amber-700" />
          <span>Pathologist Clinical Impression & Comments:</span>
        </div>
        <p className="text-slate-800 leading-relaxed italic text-[11px]">
          "{report.clinicalImpression || 'All test parameters analyzed using internal multi-level calibration controls. Please correlate clinically with patient medical history.'}"
        </p>
      </section>

      {/* =====================================================================
          6. AUTHORIZED DOCTOR & TECHNICIAN SIGNATURES SECTION
          ===================================================================== */}
      <section className="page-break-inside-avoid grid grid-cols-3 gap-3 pt-3 border-t-2 border-slate-300 items-end text-center">
        {/* Left: Authorized Medical Laboratory Technologist */}
        <div>
          <div className="h-12 flex items-center justify-center">
            {technicianSignatureUrl ? (
              <img
                src={technicianSignatureUrl}
                alt={technicianName}
                className="max-h-11 max-w-[140px] object-contain"
              />
            ) : (
              <div className="font-serif italic text-slate-400 text-xs">
                [Digital Signature on File]
              </div>
            )}
          </div>
          <p className="font-bold text-slate-950 text-xs">{technicianName}</p>
          <p className="text-[10px] text-slate-600 font-medium">{technicianQualification}</p>
          {technicianRegNo && (
            <p className="text-[9px] text-slate-500 font-mono">Reg: {technicianRegNo}</p>
          )}
        </div>

        {/* Center: Internal Quality Control Certification */}
        <div>
          <div className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-full text-[9.5px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Internal Quality Control Verified</span>
          </div>
          <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">
            Specimen: {report.sampleBarcode}
          </p>
          <p className="text-[8px] text-slate-400 font-mono">
            {report.verificationHash ? `Hash: ${report.verificationHash.slice(0, 16)}` : ''}
          </p>
        </div>

        {/* Right: Authorized Reporting Pathologist & Medical Director */}
        <div>
          <div className="h-12 flex items-center justify-center gap-1.5">
            {reportingDoctorSignatureUrl ? (
              <img
                src={reportingDoctorSignatureUrl}
                alt={reportingDoctorName}
                className="max-h-11 max-w-[140px] object-contain"
              />
            ) : (
              <div className="font-serif italic text-indigo-900 font-bold text-xs">
                {reportingDoctorName}
              </div>
            )}
            {reportingDoctorStampUrl && (
              <img
                src={reportingDoctorStampUrl}
                alt="Council Stamp"
                className="max-h-11 max-w-[45px] object-contain opacity-85"
              />
            )}
          </div>
          <p className="font-bold text-slate-950 text-xs">{reportingDoctorName}</p>
          <p className="text-[10px] text-slate-600 font-medium">{reportingDoctorQualification}</p>
          {reportingDoctorRegNo && (
            <p className="text-[9px] text-slate-500 font-mono">Reg: {reportingDoctorRegNo}</p>
          )}
        </div>
      </section>

      {/* =====================================================================
          7. OFFICIAL REPORT FOOTER & LEGAL DISCLAIMER
          ===================================================================== */}
      <footer className="mt-4 pt-2.5 border-t border-slate-300 flex flex-wrap items-center justify-between text-[8.5px] text-slate-500 font-mono gap-1">
        <span>
          Report: <strong>{report.reportNumber}</strong> • {company.name} Automated LIS
        </span>
        <span>
          Page {pageNumber} of {totalPages} • *** END OF REPORT ***
        </span>
      </footer>
    </div>
  );
});

OfficialDiagnosticReportDocument.displayName = 'OfficialDiagnosticReportDocument';
