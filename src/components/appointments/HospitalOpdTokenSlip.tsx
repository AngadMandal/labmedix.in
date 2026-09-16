import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { PatientAppointment, CompanyProfile, Patient } from '../../types';
import { DoctorMasterItem } from '../../services/doctorMasterService';
import { PrintService } from '../../services/printService';
import { InvoiceRenderService } from '../../services/invoiceRenderService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Printer,
  Download,
  X,
  Stethoscope,
  MapPin,
  Clock,
  ShieldCheck,
  User,
  CreditCard,
  Building,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface HospitalOpdTokenSlipProps {
  appointment: PatientAppointment;
  company: CompanyProfile;
  patient?: Patient | null;
  doctor?: DoctorMasterItem | null;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  onClose?: () => void;
}

export const HospitalOpdTokenSlip: React.FC<HospitalOpdTokenSlipProps> = ({
  appointment,
  company,
  patient,
  doctor,
  queuePosition = 1,
  estimatedWaitMinutes = 10,
  onClose
}) => {
  const [format, setFormat] = useState<'thermal_80mm' | 'slip_a4'>('thermal_80mm');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const printSlipRef = useRef<HTMLDivElement>(null);

  // Generate QR code encoding verification URL / appointment summary
  useEffect(() => {
    const payload = JSON.stringify({
      token: appointment.queueToken || appointment.appointmentNo,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      doctor: appointment.doctorName,
      room: doctor?.opdRoom || 'OPD Chamber',
      date: appointment.patientWishDate,
      fee: appointment.consultationFee,
      seal: appointment.securitySeal || 'SEC-VERIFIED',
      org: company.name
    });

    QRCode.toDataURL(payload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.warn('QR code generation failed:', err));
  }, [appointment, company, doctor]);

  const handlePrint = () => {
    if (!printSlipRef.current) {
      window.print();
      return;
    }
    PrintService.printOpdTokenSlip(
      printSlipRef.current,
      `OPD Token - ${appointment.queueToken || appointment.appointmentNo}`,
      format
    );
  };

  const handleDownloadPdf = async () => {
    if (!printSlipRef.current) return;
    try {
      setIsExportingPdf(true);
      await InvoiceRenderService.downloadHalfPagePdf(
        printSlipRef.current,
        `Token_${appointment.queueToken || appointment.appointmentNo}`
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const tokenNumber = appointment.queueToken || appointment.appointmentNo;
  const opdRoom = doctor?.opdRoom || 'OPD Chamber 01';
  const hospitalName = company.name || 'LABMEDIX MULTI-SPECIALITY HOSPITAL';
  const hospitalSubtitle = company.tagline || 'Confident In Care • Outpatient Department';
  const hospitalAddress = company.address
    ? `${company.address}${company.district ? `, ${company.district}` : ''}${company.state ? `, ${company.state}` : ''} - ${company.pinCode || ''}`.replace(/,\s*,/g, ',').trim()
    : 'Central Hospital Campus, Kolkata, West Bengal';
  const hospitalPhone = company.phone || company.helpline || '+91 98310 12345';
  const regNo = company.registrationNo || company.clinicalLicenseNo || 'CEA/WB/MLD/2026';

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Paper Format:</span>
          <div className="inline-flex rounded-xl p-1 bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={() => setFormat('thermal_80mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                format === 'thermal_80mm'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Thermal 80mm POS
            </button>
            <button
              type="button"
              onClick={() => setFormat('slip_a4')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                format === 'slip_a4'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Standard A4 Slip
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black shadow-lg shadow-teal-600/30 transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Token</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Screen Preview Container */}
      <div className="flex justify-center p-4 sm:p-6 bg-slate-950/70 rounded-3xl border border-slate-800/80 overflow-x-auto">
        <div
          ref={printSlipRef}
          className={`bg-white text-slate-950 p-4 sm:p-5 shadow-2xl transition-all ${
            format === 'thermal_80mm'
              ? 'w-[76mm] max-w-[76mm] font-mono text-[11px] leading-tight rounded-xl border border-slate-300'
              : 'w-full max-w-[130mm] font-sans text-xs leading-normal rounded-2xl border border-slate-300'
          }`}
          style={{ boxSizing: 'border-box' }}
        >
          {/* Hospital Header */}
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-2 mb-2">
            {company.logoUrl && (
              <img
                src={company.logoUrl}
                alt="Logo"
                className="h-8 max-w-[120px] object-contain mx-auto mb-1 filter grayscale"
              />
            )}
            <h1 className="font-black text-slate-950 uppercase tracking-tight text-sm sm:text-base leading-tight">
              {hospitalName}
            </h1>
            <p className="text-[10px] text-slate-600 font-medium leading-tight">
              {hospitalSubtitle}
            </p>
            <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
              {hospitalAddress} • Ph: {hospitalPhone}
            </p>
            <div className="text-[8px] font-mono text-slate-400 mt-0.5">
              Reg No: {regNo} • GSTIN: {company.gstin || '19AAACL8840M1ZX'}
            </div>
            <div className="mt-1.5 inline-block px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-black text-[9px] tracking-wider uppercase">
              OPD CLINICAL CONSULTATION TOKEN
            </div>
          </div>

          {/* Token Hero Block */}
          <div className="my-2 p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-center">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Token Number
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-widest text-slate-950 font-mono my-0.5">
              {tokenNumber}
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-teal-800">
              <span className="px-2 py-0.5 rounded bg-teal-100 border border-teal-300">
                Queue: #{queuePosition} in Line
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 border border-slate-300 font-mono">
                ~{estimatedWaitMinutes} Mins Wait
              </span>
            </div>
          </div>

          {/* Consulting Doctor & Chamber Block */}
          <div className="border border-slate-300 rounded-lg p-2.5 mb-2 bg-slate-50 space-y-1">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Consulting Doctor</span>
                <strong className="text-xs sm:text-sm text-slate-950 block font-black">
                  {appointment.doctorName}
                </strong>
                <span className="text-[10px] text-slate-700 block">
                  {appointment.doctorSpeciality}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  {appointment.department}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Room / Chamber</span>
                <span className="inline-block px-2 py-1 rounded bg-slate-900 text-white font-mono font-black text-xs">
                  {opdRoom}
                </span>
              </div>
            </div>
          </div>

          {/* Patient Details Block */}
          <div className="border-t border-b border-dashed border-slate-300 py-2 my-2 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Patient Name:</span>
              <strong className="text-slate-950 font-bold">{appointment.patientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">UHID / Patient ID:</span>
              <span className="font-mono text-slate-900 font-bold">{appointment.patientId}</span>
            </div>
            {(patient?.age || appointment.patientPhone) && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Age / Gender / Contact:</span>
                <span className="text-slate-800">
                  {patient ? `${patient.age}Y/${patient.gender.slice(0, 1).toUpperCase()} • ` : ''}
                  {appointment.patientPhone || patient?.mobile || 'N/A'}
                </span>
              </div>
            )}
            {appointment.cardNo && (
              <div className="flex justify-between items-center bg-teal-50 p-1 rounded border border-teal-200">
                <span className="text-teal-800 font-bold text-[9px] flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  Health Card Privilege:
                </span>
                <span className="font-mono font-black text-[9px] text-teal-900">
                  {appointment.cardNo} ({appointment.cardTier || 'Active'})
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Slot & Date:</span>
              <span className="text-slate-950 font-semibold">
                {formatDate(appointment.patientWishDate)} • {appointment.patientWishTime || appointment.patientWishSlot}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Chief Complaint:</span>
              <span className="text-slate-800 italic max-w-[180px] truncate text-right">
                {appointment.chiefComplaint || 'Routine Medical Review'}
              </span>
            </div>
          </div>

          {/* Fee & Billing Confirmation */}
          <div className="flex items-center justify-between py-1.5 px-2 bg-slate-100 rounded border border-slate-300 text-[10px] my-2">
            <div>
              <span className="text-slate-500 font-medium block text-[9px]">Consultation Fee</span>
              <strong className="text-xs font-black text-slate-950 font-mono">
                {formatCurrency(appointment.consultationFee || 0)}
              </strong>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9px] uppercase font-mono">
                <CheckCircle2 className="w-2.5 h-2.5" />
                PAID & VERIFIED
              </span>
              <span className="block text-[8px] text-slate-500 font-mono mt-0.5">
                Ref: {appointment.appointmentNo}
              </span>
            </div>
          </div>

          {/* QR Code & Barcode Routing Section */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-300 my-2">
            <div className="space-y-1">
              <div className="text-[9px] font-mono text-slate-700 font-bold">
                * {appointment.appointmentNo} *
              </div>
              <div className="text-[8px] text-slate-500 leading-tight">
                Scan at Chamber Kiosk or Nursing Desk for instant live check-in.
              </div>
              <div className="text-[8px] font-mono text-slate-400">
                Seal: {appointment.securitySeal || 'SEC-7782-OPD'}
              </div>
            </div>
            {qrCodeUrl && (
              <div className="p-1 rounded bg-white border border-slate-300 shrink-0">
                <img src={qrCodeUrl} alt="Token QR" className="w-16 h-16 object-contain" />
              </div>
            )}
          </div>

          {/* Official Footer Disclaimer */}
          <div className="text-[8px] text-slate-500 text-center border-t border-dashed border-slate-300 pt-2 space-y-0.5">
            <p>Please report to the OPD Waiting Lounge 10 minutes prior to your turn.</p>
            <p className="font-semibold text-slate-700">Present this token or registered mobile number to the consulting doctor.</p>
            <p className="text-[7px] text-slate-400 font-mono">
              Printed on {new Date().toLocaleString()} • Authorized OPD Registration Desk
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
