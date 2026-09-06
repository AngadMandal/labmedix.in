import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Patient, HealthCard, PatientBill, CompanyProfile } from '../../types';
import { StorageService } from '../../services/storage';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
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
  ChevronRight,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PatientRegistrationBillSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  card?: HealthCard;
  bill: PatientBill;
  familyMembers: Array<{
    patient: Patient;
    card?: HealthCard;
    relationship: string;
  }>;
  onRegisterAnother?: () => void;
}

export const PatientRegistrationBillSlipModal: React.FC<PatientRegistrationBillSlipModalProps> = ({
  isOpen,
  onClose,
  patient,
  card,
  bill,
  familyMembers,
  onRegisterAnother
}) => {
  const navigate = useNavigate();
  const company: CompanyProfile = StorageService.getCompanyProfile();

  const [activeTab, setActiveTab] = useState<'bill' | 'slip' | 'cards'>('bill');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [printTarget, setPrintTarget] = useState<'bill' | 'slip' | 'both'>('bill');

  useEffect(() => {
    // Generate QR verification data
    const verifyPayload = JSON.stringify({
      app: 'LABMEDIX',
      pid: patient.id,
      name: patient.fullName,
      card: card ? card.cardNumber : 'NONE',
      bill: bill.billNumber,
      date: bill.date,
      verifyUrl: `${window.location.origin}/#/verify/${card ? card.verificationCode : patient.id}`
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
  }, [patient, card, bill]);

  if (!isOpen) return null;

  const handlePrint = (target: 'bill' | 'slip' | 'both') => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const isCardIssued = Boolean(card && bill.isCardIssued);

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
            padding: 10mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Registration & Enrollment Complete
                </h3>
                <Badge variant={isCardIssued ? 'success' : 'neutral'}>
                  {isCardIssued ? 'Health Card Issued' : 'Registration Only'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Patient: <strong className="text-slate-200">{patient.fullName}</strong> ({patient.id}) • Bill:{' '}
                <span className="font-mono text-emerald-400 font-bold">{bill.billNumber}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & View Switcher Bar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 no-print">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-900/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('bill')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'bill'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Patient Bill (Tax Invoice)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('slip')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'slip'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Registration / Card Slip
            </button>
            {familyMembers.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Enrolled Family ({familyMembers.length})
              </button>
            )}
          </div>

          {/* Print Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint('slip')}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Print Slip
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handlePrint('bill')}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              className="text-xs bg-blue-600 hover:bg-blue-500"
            >
              Print Bill
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePrint('both')}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Print Both
            </Button>
          </div>
        </div>

        {/* Main Document Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            id="print-document-container"
            className="w-full max-w-2xl bg-white text-slate-900 shadow-xl border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
          >
            {/* 1. Printable Bill / Tax Invoice View */}
            {(activeTab === 'bill' || printTarget === 'bill' || printTarget === 'both') && (
              <div id="labmedix-printable-bill" className="space-y-6">
                {/* Clinical Header */}
                <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      {company.name}
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-600">
                      {company.subtitle || 'ISO 9001:2015 Accredited Healthcare & Multi-Speciality Diagnostic Centre'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {company.address}, {company.postOffice}, {company.district} - {company.pinCode}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Helpline: <strong className="text-slate-800">{company.helpline}</strong> • Email: {company.email}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-[10px] tracking-wider uppercase">
                      PATIENT ENROLLMENT BILL
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">
                      GSTIN: {company.gstin || '19AAACL1234F1Z5'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Lic: {company.clinicalLicenseNo || 'CEA/WB/MLD/2026/1102'}
                    </p>
                  </div>
                </div>

                {/* Bill & Patient Meta Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-500 font-medium">Bill Number:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{bill.billNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Date & Time:</span>{' '}
                      <span className="font-semibold text-slate-800">{formatDate(bill.date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Cashier / Staff:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {bill.authorizedStaff?.name} ({bill.authorizedStaff?.role})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-right sm:text-left">
                    <div>
                      <span className="text-slate-500 font-medium">Patient Name:</span>{' '}
                      <span className="font-bold text-slate-900">{patient.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Patient ID:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{patient.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Mobile:</span>{' '}
                      <span className="font-mono text-slate-800">{patient.mobile}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Blood Group:</span>{' '}
                      <span className="font-bold text-slate-800">{patient.bloodGroup || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Health Card Enrollment Specifics Banner */}
                {isCardIssued && card && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <div>
                        <span className="font-bold text-blue-900 block">
                          Smart Health Card Provisioned ({bill.membershipName || 'Health Shield'})
                        </span>
                        <span className="font-mono text-[11px] text-blue-700">
                          Card No: {card.cardNumber} • Valid to: {card.expiryDate}
                        </span>
                      </div>
                    </div>
                    <Badge variant="blue">ACTIVE CARD</Badge>
                  </div>
                )}

                {/* Itemized Billing Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Description of Services / Card Enrollment</th>
                        <th className="p-3 text-center">Qty / Members</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 text-slate-400 font-mono">01</td>
                        <td className="p-3 font-medium text-slate-900">
                          {isCardIssued
                            ? `Smart Health Card Enrollment Fee (${bill.membershipName || 'Annual Plan'})`
                            : 'Primary Patient Clinical Registration & Digital Health Record'}
                          <span className="block text-[10px] text-slate-500">
                            {isCardIssued
                              ? 'Includes OPD & Lab diagnostic rate benefits, up to 5 family members.'
                              : 'Lifetime patient digital portal and clinic profile registration.'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">1</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(bill.baseCardCharge)}
                        </td>
                      </tr>

                      {bill.familyMemberCount > 0 && (
                        <tr>
                          <td className="p-3 text-slate-400 font-mono">02</td>
                          <td className="p-3 font-medium text-slate-900">
                            Family Health Shield Allowance (Up to 5 Family Members)
                            <span className="block text-[10px] text-slate-500">
                              {Math.min(bill.familyMemberCount, bill.includedMembers)} dependent(s) included in standard card allowance.
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono">{bill.includedMembers}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">₹0.00</td>
                        </tr>
                      )}

                      {bill.additionalMembers > 0 && (
                        <tr className="bg-amber-50/50">
                          <td className="p-3 text-slate-400 font-mono">03</td>
                          <td className="p-3 font-medium text-amber-900">
                            Additional Family Member Card Charges
                            <span className="block text-[10px] text-amber-700">
                              {bill.additionalMembers} extra dependent(s) beyond the 5 included members allowance.
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-amber-900 font-bold">
                            {bill.additionalMembers}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-900">
                            {formatCurrency(bill.additionalMemberCharge)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-xs">
                      {bill.discountAmount > 0 && (
                        <tr>
                          <td colSpan={3} className="p-2.5 text-right text-slate-600">
                            Discount / Promotional Subsidy:
                          </td>
                          <td className="p-2.5 text-right font-mono text-rose-600">
                            - {formatCurrency(bill.discountAmount)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-slate-900 font-black text-sm uppercase">
                          Net Amount Payable:
                        </td>
                        <td className="p-3 text-right font-mono font-black text-base text-blue-600">
                          {formatCurrency(bill.netPayable)}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200/60 bg-emerald-50/60 text-emerald-900 font-bold">
                        <td colSpan={3} className="p-2.5 text-right">
                          Amount Received via {bill.paymentMethod.toUpperCase()}:
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-700 font-black">
                          {formatCurrency(bill.paidAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment & Signatures Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {qrCodeDataUrl && (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Verification"
                        className="w-16 h-16 rounded border border-slate-300 p-0.5"
                      />
                    )}
                    <div className="space-y-0.5 text-[10px] text-slate-500">
                      <p className="font-bold text-slate-700">Digital Bill Verification</p>
                      <p>Scan with any camera to verify authenticity.</p>
                      <p className="font-mono text-[9px] text-slate-400">Txn Ref: {bill.transactionId}</p>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400 w-40 ml-auto"></div>
                    <p className="text-[10px] font-bold text-slate-800 uppercase">Authorized Signature</p>
                    <p className="text-[9px] text-slate-500">{company.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Page Break for combined print */}
            {printTarget === 'both' && <div className="page-break my-8 border-b-2 border-dashed border-slate-300"></div>}

            {/* 2. Printable Registration / Compact Card Slip View */}
            {(activeTab === 'slip' || printTarget === 'slip' || printTarget === 'both') && (
              <div id="labmedix-printable-slip" className="space-y-4 pt-2">
                <div className="border-2 border-dashed border-slate-300 p-5 rounded-2xl space-y-4 bg-slate-50/50">
                  <div className="text-center space-y-1 pb-3 border-b border-slate-200">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 font-mono">
                      LABMEDIX HEALTHCARE • PATIENT REGISTRATION SLIP
                    </span>
                    <h2 className="text-base font-black text-slate-900">{company.name}</h2>
                    <p className="text-[10px] text-slate-500">
                      Emergency Helpline: <strong className="text-slate-800">{company.helpline}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div>
                        <span className="text-slate-400 font-medium">Patient Name:</span>{' '}
                        <strong className="text-slate-900 text-sm">{patient.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Patient ID:</span>{' '}
                        <span className="font-mono font-bold text-slate-900">{patient.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Age / Gender:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {patient.age} Yrs / {patient.gender.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Blood Group:</span>{' '}
                        <span className="font-bold text-slate-800">{patient.bloodGroup || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Patient QR Slip"
                          className="w-20 h-20 rounded border border-slate-300 p-1 bg-white shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded bg-slate-200 animate-pulse"></div>
                      )}
                      <span className="text-[9px] font-mono text-slate-500 mt-1">Scan for OPD/Lab</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Health Card Status:</span>
                      <strong className={isCardIssued ? 'text-blue-600 font-mono' : 'text-slate-600'}>
                        {isCardIssued && card ? `${card.cardNumber} (Active)` : 'Not Issued (Patient Profile Only)'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Family Members Covered:</span>
                      <strong className="text-indigo-600">
                        {familyMembers.length > 0 ? `${familyMembers.length} Dependent(s)` : 'Individual Account'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Enrollment Bill No:</span>
                      <span className="font-mono font-bold text-slate-800">{bill.billNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registration Date:</span>
                      <span className="font-mono text-slate-700">{formatDate(patient.createdAt)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[10px] text-blue-900 leading-relaxed">
                    <strong>Important Instructions:</strong> Please present this slip or digital QR code at LABMEDIX reception, billing desk, and diagnostic lab counters. Fast-track OPD registration and health card benefits will be auto-applied.
                  </div>
                </div>
              </div>
            )}

            {/* 3. Enrolled Family Members Breakdown View */}
            {activeTab === 'cards' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Family Health Shield Members</h3>
                    <p className="text-xs text-slate-500">
                      Dependents registered under {patient.fullName}'s Family Health Card.
                    </p>
                  </div>
                  <Badge variant="blue">
                    {familyMembers.length} Dependents ({familyMembers.filter(f => f.card).length} Cards)
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {familyMembers.map((fam, i) => (
                    <div
                      key={fam.patient.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center font-mono">
                          #{i + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{fam.patient.fullName}</h4>
                          <p className="text-[11px] text-slate-500">
                            {fam.relationship} • Age {fam.patient.age} • Blood Group: {fam.patient.bloodGroup || 'Unknown'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">ID: {fam.patient.id}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {fam.card ? (
                          <div className="space-y-0.5">
                            <Badge variant="success">Issued Card</Badge>
                            <span className="block text-[10px] font-mono text-slate-500">{fam.card.cardNumber}</span>
                          </div>
                        ) : (
                          <Badge variant="neutral">Family Dependent</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Synced atomically to Central Firestore & multi-device ledger.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {isCardIssued && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/cards/print-sheet')}
                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Print PVC Card Sheet
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/patients/${patient.id}`);
              }}
              leftIcon={<ChevronRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Go to Patient Profile
            </Button>

            {onRegisterAnother && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onRegisterAnother();
                }}
                leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Register Next Patient
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
