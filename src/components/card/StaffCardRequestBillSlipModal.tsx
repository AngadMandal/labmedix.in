import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { CardApplicationRequest, PatientBill, CompanyProfile } from '../../types';
import { StorageService } from '../../services/storage';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  Printer,
  FileText,
  CreditCard,
  CheckCircle2,
  Download,
  Users,
  Building,
  Phone,
  Calendar,
  Shield,
  QrCode,
  Sparkles,
  ArrowRight,
  Clock,
  X,
  AlertCircle,
  Receipt
} from 'lucide-react';

export interface StaffCardRequestBillSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: CardApplicationRequest | null;
  bill?: PatientBill | null;
}

export const StaffCardRequestBillSlipModal: React.FC<StaffCardRequestBillSlipModalProps> = ({
  isOpen,
  onClose,
  application,
  bill: initialBill
}) => {
  const company: CompanyProfile = StorageService.getCompanyProfile();

  const [activeTab, setActiveTab] = useState<'bill' | 'slip'>('bill');
  const [printTarget, setPrintTarget] = useState<'bill' | 'slip' | 'both'>('bill');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Resolve bill if not directly passed
  const bill: PatientBill | null = initialBill || (application?.billId ? StorageService.getBillById(application.billId) || null : null) || (application?.billNumber ? StorageService.getBillById(application.billNumber) || null : null);

  useEffect(() => {
    if (!application) return;

    const verifyPayload = JSON.stringify({
      app: 'LABMEDIX_CARD_REQUEST',
      reqId: application.applicationNo || application.trackingId,
      name: application.fullName,
      mobile: application.mobile,
      tier: application.membershipName,
      status: application.status,
      date: application.createdAt,
      verifyUrl: `${window.location.origin}/#/verify/${application.trackingId || application.applicationNo}`
    });

    QRCode.toDataURL(verifyPayload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(() => {});
  }, [application]);

  if (!isOpen || !application) return null;

  const handlePrint = (target: 'bill' | 'slip' | 'both') => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      // Utilize standard browser print to PDF for perfect vector crispness
      setPrintTarget('both');
      setTimeout(() => {
        window.print();
        setIsGeneratingPdf(false);
      }, 200);
    } catch {
      setIsGeneratingPdf(false);
    }
  };

  const familyList = application.familyMembers || [];
  const maxIncluded = 5;
  const includedCount = Math.min(familyList.length, maxIncluded);
  const extraCount = Math.max(0, familyList.length - maxIncluded);
  const extraFee = application.extraFamilyMembersFee ?? (extraCount * (company.registrationSettings?.additionalMemberFee || 299));
  const baseCardFee = application.membershipPrice || 499;
  const totalAmount = application.totalPaidAmount || (baseCardFee + extraFee);
  const paidAmount = bill ? bill.paidAmount : totalAmount;
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Dynamic Print Stylesheet for thermal/A4 target printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-document-container, #print-document-container * {
            visibility: visible !important;
          }
          #print-document-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Health Card Request Documents
                </h3>
                <Badge variant="info" size="sm">
                  {application.applicationNo || application.trackingId}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700 dark:text-slate-300">{application.fullName}</span> • Plan: {application.membershipName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Toggles */}
            <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('bill')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'bill'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Official Bill (Invoice)
              </button>
              <button
                onClick={() => setActiveTab('slip')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'slip'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Patient Request Slip
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="px-6 py-3 bg-teal-50/50 dark:bg-teal-950/20 border-b border-teal-100 dark:border-teal-900/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-teal-800 dark:text-teal-300">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Ready for printing & patient acknowledgment</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => handlePrint('bill')}
              className="text-xs font-bold"
            >
              PRINT BILL
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => handlePrint('slip')}
              className="text-xs font-bold"
            >
              PRINT PATIENT SLIP
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => handlePrint('both')}
              className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
            >
              PRINT BOTH
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              isLoading={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="text-xs font-bold"
            >
              DOWNLOAD PDF
            </Button>
          </div>
        </div>

        {/* Document Display Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div id="print-document-container">
            {/* ═════════════════════════════════════════════════════════ */}
            {/* 1. PROFESSIONAL PATIENT BILL (TAX INVOICE)              */}
            {/* ═════════════════════════════════════════════════════════ */}
            {(activeTab === 'bill' || printTarget === 'bill' || printTarget === 'both') && (
              <div
                className={`bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 ${
                  printTarget === 'slip' ? 'no-print' : ''
                }`}
              >
                {/* Clinic Letterhead Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-slate-900 gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={company.logoUrl || '/logo.jpg'}
                      alt={company.name}
                      className="w-16 h-16 rounded-xl object-contain border border-slate-200"
                    />
                    <div>
                      <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                        {company.name}
                      </h1>
                      <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">
                        {company.tagline || 'Angad Mandal • Confident In Care'}
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-md mt-0.5">
                        {company.address} • P.O.: {company.postOffice} • Dist: {company.district}, {company.state} - {company.pinCode}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        GSTIN: {company.gstin} • Reg No: {company.registrationNo} • Phone: {company.phone}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono shrink-0">
                    <span className="px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold uppercase rounded-md tracking-wider inline-block">
                      TAX INVOICE / ENROLLMENT BILL
                    </span>
                    <div className="mt-2 space-y-0.5 text-xs">
                      <div><strong className="text-slate-500">Bill No:</strong> <span className="font-bold text-slate-900">{bill ? bill.billNumber : `BILL-${new Date().getFullYear()}-${application.applicationNo.slice(-6)}`}</span></div>
                      <div><strong className="text-slate-500">Request ID:</strong> <span className="font-bold text-teal-700">{application.applicationNo || application.trackingId}</span></div>
                      <div><strong className="text-slate-500">Date & Time:</strong> {formatDateTime(application.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {/* Patient & Staff Submitter Meta Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Details</span>
                    <strong className="text-sm font-black text-slate-900 block">{application.fullName}</strong>
                    <p className="text-slate-600"><strong>Mobile:</strong> {application.mobile} {application.email ? `• ${application.email}` : ''}</p>
                    <p className="text-slate-600"><strong>Demographics:</strong> {application.gender.toUpperCase()} • {application.age} Yrs • Blood: <span className="font-bold text-rose-600">{application.bloodGroup}</span></p>
                    <p className="text-slate-600"><strong>Address:</strong> {application.address.fullAddress}</p>
                  </div>

                  <div className="space-y-1 sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Staff & Submission</span>
                    <strong className="text-sm font-bold text-slate-900 block">
                      Submitted By: {application.submittedByStaffName || 'Staff Member'}
                    </strong>
                    <p className="text-slate-600">
                      <strong>Staff ID:</strong> {application.submittedByStaffId || 'N/A'} • <strong>Role:</strong> {application.submittedByStaffRole?.toUpperCase() || 'RECEPTION'}
                    </p>
                    <p className="text-slate-600">
                      <strong>Urgency:</strong> <span className="uppercase font-bold text-teal-700">{application.urgency || 'Normal'}</span> • <strong>Dispatch:</strong> {application.dispatchPreference?.replace(/_/g, ' ').toUpperCase() || 'COLLECT AT CLINIC'}
                    </p>
                    <p className="text-slate-600 font-mono">
                      <strong>Transaction Ref:</strong> {application.paymentReference || 'CASH-POS'}
                    </p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Description & Service Items</th>
                        <th className="py-2.5 px-3 text-center">Family Count</th>
                        <th className="py-2.5 px-3 text-right">Standard Rate</th>
                        <th className="py-2.5 px-3 text-right">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-3 px-3 font-mono">01</td>
                        <td className="py-3 px-3">
                          <strong className="font-bold text-slate-900 block text-xs">{application.membershipName} Enrollment</strong>
                          <span className="text-[10px] text-slate-500">Includes Primary Cardholder + up to {maxIncluded} dependents coverage</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">1 + {includedCount}</td>
                        <td className="py-3 px-3 text-right font-mono">{formatCurrency(baseCardFee)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(baseCardFee)}</td>
                      </tr>

                      {extraCount > 0 && (
                        <tr>
                          <td className="py-3 px-3 font-mono">02</td>
                          <td className="py-3 px-3">
                            <strong className="font-bold text-amber-900 block text-xs">
                              Additional Family Dependents ({extraCount} Extra Members)
                            </strong>
                            <span className="text-[10px] text-slate-500">
                              Exceeded {maxIncluded}-member shield allowance • ₹{company.registrationSettings?.additionalMemberFee || 299} per additional member
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-amber-700">+{extraCount}</td>
                          <td className="py-3 px-3 text-right font-mono">{formatCurrency(company.registrationSettings?.additionalMemberFee || 299)} / mem</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(extraFee)}</td>
                        </tr>
                      )}

                      {application.initialDeposit && application.initialDeposit > 0 ? (
                        <tr>
                          <td className="py-3 px-3 font-mono">03</td>
                          <td className="py-3 px-3">
                            <strong className="font-bold text-teal-900 block text-xs">Initial Health Wallet Recharge Float</strong>
                            <span className="text-[10px] text-slate-500">Credit added to patient digital health wallet upon card approval</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">-</td>
                          <td className="py-3 px-3 text-right font-mono">{formatCurrency(application.initialDeposit)}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(application.initialDeposit)}</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary & Balance Due */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200">
                  <div className="space-y-2 text-xs max-w-sm">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Payment Method & Reference</span>
                      <strong className="text-slate-900 font-bold block">{application.paymentMethod}</strong>
                      <span className="font-mono text-[11px] text-slate-600 block">Ref / UTR: {application.paymentReference}</span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      * This bill is generated upon authorized staff submission. The physical/digital Health Card is minted upon Super Administrator verification.
                    </p>
                  </div>

                  <div className="w-full sm:w-64 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(baseCardFee + extraFee)}</span>
                    </div>
                    {application.initialDeposit && application.initialDeposit > 0 ? (
                      <div className="flex justify-between text-slate-600">
                        <span>Wallet Float:</span>
                        <span>+{formatCurrency(application.initialDeposit)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-slate-900 font-bold pt-2 border-t-2 border-slate-900 text-sm">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className={`flex justify-between font-bold pt-1 border-t border-slate-200 ${dueAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      <span>Balance Due:</span>
                      <span>{formatCurrency(dueAmount)}</span>
                    </div>
                    <div className="pt-2">
                      <span className={`w-full py-1 text-center font-bold text-[10px] uppercase rounded-md tracking-wider block ${
                        dueAmount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        STATUS: {dueAmount === 0 ? 'FULL PAYMENT RECEIVED' : 'PARTIAL / BALANCE DUE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sign-off & Footer */}
                <div className="pt-8 flex justify-between items-end text-xs border-t border-slate-200">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Computer Generated Tax Invoice • No Physical Signature Required<br />
                    Labmedix Digital Healthcare System • www.labmedix.in
                  </div>
                  <div className="text-right">
                    <div className="w-40 border-b border-slate-900 mb-1"></div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase block">Authorized Signatory</span>
                    <span className="text-[10px] text-slate-500 font-mono">{company.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Page Break for sequential printing of both */}
            {printTarget === 'both' && <div className="page-break my-8"></div>}

            {/* ═════════════════════════════════════════════════════════ */}
            {/* 2. PATIENT REGISTRATION & REQUEST SLIP                    */}
            {/* ═════════════════════════════════════════════════════════ */}
            {(activeTab === 'slip' || printTarget === 'slip' || printTarget === 'both') && (
              <div
                className={`bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 ${
                  printTarget === 'bill' ? 'no-print' : ''
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={company.logoUrl || '/logo.jpg'}
                      alt={company.name}
                      className="w-12 h-12 rounded-xl object-contain border border-slate-200"
                    />
                    <div>
                      <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        {company.name}
                      </h2>
                      <p className="text-[11px] font-bold text-teal-700">
                        OFFICIAL PATIENT CARD REQUEST ACKNOWLEDGMENT SLIP
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Request Tracking ID</span>
                    <strong className="text-base font-black text-teal-700 block">
                      {application.applicationNo || application.trackingId}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">{formatDateTime(application.createdAt)}</span>
                  </div>
                </div>

                {/* Status Banner */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase block">Current Workflow State</span>
                      <strong className="text-xs font-bold text-amber-900">
                        {application.status === 'approved' || application.status === 'issued'
                          ? 'HEALTH CARD APPROVED & ISSUED'
                          : 'SUBMITTED — PENDING SUPER ADMIN APPROVAL'}
                      </strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Payable</span>
                    <strong className="text-sm font-black text-slate-900 font-mono">{formatCurrency(totalAmount)}</strong>
                  </div>
                </div>

                {/* Patient, Dependents & QR Code Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                  {/* Column 1: Patient Profile */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Cardholder</span>
                    <h3 className="text-base font-black text-slate-900">{application.fullName}</h3>
                    <p className="text-slate-600"><strong>Mobile:</strong> {application.mobile}</p>
                    <p className="text-slate-600"><strong>Gender & Age:</strong> {application.gender.toUpperCase()} • {application.age} Yrs</p>
                    <p className="text-slate-600"><strong>Blood Group:</strong> <span className="font-bold text-rose-600">{application.bloodGroup}</span></p>
                    <p className="text-slate-600"><strong>Selected Tier:</strong> {application.membershipName}</p>
                    <p className="text-slate-600"><strong>Emergency Contact:</strong> {application.emergencyContact.name} ({application.emergencyContact.relationship}) - {application.emergencyContact.mobile}</p>

                    {/* Enrolled Family Dependents List */}
                    {familyList.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Enrolled Family Shield Members ({familyList.length} Dependents):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                          {familyList.map((m, idx) => (
                            <div key={idx} className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center">
                              <span className="font-semibold text-slate-800">{m.fullName}</span>
                              <span className="text-[10px] text-slate-500">{m.relationship}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 2: High-Contrast QR Code */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="Verification QR Code" className="w-36 h-36 rounded-lg border border-slate-200 shadow-xs" />
                    ) : (
                      <QrCode className="w-28 h-28 text-slate-300" />
                    )}
                    <span className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-wide">
                      Scan to Verify Request
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                      {application.applicationNo || application.trackingId}
                    </span>
                  </div>
                </div>

                {/* Important Instructions Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <strong className="text-slate-800 font-bold block text-xs">Important Instructions for Patient:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                    <li>Please retain this acknowledgment slip until your physical or digital Health Card is issued.</li>
                    <li>You can quote your Request ID <strong>{application.applicationNo || application.trackingId}</strong> at our front desk to track card printing.</li>
                    <li>For 24/7 Helpline assistance or Home Sample Collection, call <strong>{company.helpline || company.phone}</strong>.</li>
                  </ul>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>Issued By: {application.submittedByStaffName || 'Reception Staff'} ({application.submittedByStaffId || 'N/A'})</span>
                  <span>{company.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
