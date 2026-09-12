import React, { useState } from 'react';
import { CompanyProfile, HealthCard, Patient, Membership, DiagnosticReportRecord, PharmacySale } from '../../types';
import { CR80CardFront } from '../card/CR80CardFront';
import { CR80CardBack } from '../card/CR80CardBack';
import { StandardHalfPageBill, StandardBillData } from '../billing/StandardHalfPageBill';
import { PharmacyA4HalfPageInvoice } from '../pharmacy/PharmacyA4HalfPageInvoice';
import { OfficialDiagnosticReportDocument } from '../laboratory/OfficialDiagnosticReportDocument';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { 
  CreditCard, 
  Receipt, 
  Pill, 
  FileText, 
  Stethoscope, 
  Building2, 
  RotateCw,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface DocumentBrandPreviewProps {
  company: CompanyProfile;
}

export const DocumentBrandPreview: React.FC<DocumentBrandPreviewProps> = ({ company }) => {
  const [activePreview, setActivePreview] = useState<'card' | 'bill' | 'pharmacy' | 'lab' | 'rx' | 'letterhead'>('card');
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Mock patient for preview
  const samplePatient: Patient = {
    id: 'LMDX-PAT-0001',
    fullName: 'Rahul Sharma',
    dob: '1992-06-15',
    age: 34,
    gender: 'male',
    mobile: '+91 98300 12345',
    bloodGroup: 'B+',
    photoUrl: '',
    emergencyContact: {
      name: 'Priya Sharma',
      relationship: 'Spouse',
      mobile: '+91 98300 54321'
    },
    medicalInfo: {
      allergies: 'None known',
      chronicConditions: 'None',
      bloodGroup: 'B+'
    },
    walletId: 'WAL-001',
    isDeleted: false,
    address: {
      villageArea: company.address || 'Sultanganj Main Road',
      postOffice: company.postOffice || 'Sultanganj',
      policeStation: company.policeStation || 'Sultanganj PS',
      district: company.district || 'Malda',
      state: company.state || 'West Bengal',
      pinCode: company.pinCode || '732142',
      fullAddress: `${company.address || 'Sultanganj Main Road'}, ${company.district || 'Malda'}, ${company.state || 'West Bengal'} - ${company.pinCode || '732142'}`
    },
    isFamilyHead: true,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sampleCard: HealthCard = {
    id: 'card_sample_01',
    cardNumber: 'LHC-2026-000842',
    patientId: samplePatient.id,
    membershipId: 'mem_gold',
    tier: 'gold',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'active',
    cvv: '842',
    verificationCode: 'VRF-8842',
    renewedCount: 0,
    designConfig: {
      preset: 'executive_navy',
      material: 'gloss',
      primaryColor: '#0B4F9C',
      accentColor: '#109B48',
      backgroundColor: '#062B57',
      textColor: '#FFFFFF',
      showChip: true,
      showContactless: true,
      showEmergencyBadge: true,
      showBarcode: true,
      showSignatureStrip: true,
      customTagline: company.tagline || 'Confident In Care'
    },
    statusHistory: [],
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sampleMembership: Membership = {
    id: 'mem_gold',
    name: 'Gold Privilege Shield',
    slug: 'gold-shield',
    description: 'Complete Family Healthcare Coverage',
    color: '#D97706',
    badgeIcon: 'ShieldCheck',
    isFamilyPlan: true,
    registrationFee: 999,
    annualRenewalFee: 499,
    validityMonths: 12,
    opdDiscount: 25,
    labDiscount: 20,
    pharmacyDiscount: 15,
    homeCollectionDiscount: 100,
    specialBenefits: ['Priority OPD Access', 'Complimentary Annual Health Checkup', 'Emergency Ambulance Concierge'],
    maxFamilyMembers: 5,
    isPopular: true,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  const sampleBillData: StandardBillData = {
    billNumber: 'BILL-2026-001089',
    date: new Date().toISOString(),
    patientName: samplePatient.fullName,
    patientId: samplePatient.id,
    patientMobile: samplePatient.mobile,
    patientAgeGender: '34 Yrs / Male',
    referringDoctor: 'Dr. Angad Mandal, MBBS, MD (Path)',
    healthCardNumber: sampleCard.cardNumber,
    healthCardTier: 'Gold Privilege (20% Off)',
    category: 'Consultation & Diagnostics',
    items: [
      { description: 'Specialist General Physician Consultation', quantity: 1, unitPrice: 500, discount: 100, total: 400 },
      { description: 'Complete Blood Count (CBC) with ESR', quantity: 1, unitPrice: 450, discount: 90, total: 360 },
      { description: 'Fasting Blood Glucose (Hexokinase)', quantity: 1, unitPrice: 120, discount: 24, total: 96 },
      { description: 'HbA1c Glycated Haemoglobin (HPLC)', quantity: 1, unitPrice: 600, discount: 120, total: 480 }
    ],
    subtotal: 1670,
    discountAmount: 334,
    taxAmount: 0,
    netPayable: 1336,
    paidAmount: 1336,
    dueAmount: 0,
    paymentMethod: 'upi',
    authorizedStaffName: 'Accounts Cash Desk (Counter 01)',
    notes: 'Payment received successfully via UPI QR. Health Card discount applied.'
  };

  const samplePharmacySale: PharmacySale = {
    id: 'SALE-2026-000492',
    invoiceNumber: 'PHARM-2026-000492',
    saleDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    saleType: 'RETAIL',
    sourceType: 'RETAIL',
    customerType: 'card_holder',
    patientId: samplePatient.id,
    patientName: samplePatient.fullName,
    patientPhone: samplePatient.mobile,
    prescribingDoctor: 'Dr. P. K. Banerjee',
    items: [
      {
        batchId: 'batch_1',
        medicineId: 'med_1',
        medicineName: 'Augmentin 625 Duo Tablet',
        batchNumber: 'BT-98214',
        expiryDate: '2027-08-31',
        quantity: 10,
        unitPrice: 22.50,
        mrp: 24.00,
        discountPercent: 15,
        discountAmount: 33.75,
        taxGstPercent: 12,
        taxAmount: 23.30,
        totalAmount: 217.50
      },
      {
        batchId: 'batch_2',
        medicineId: 'med_2',
        medicineName: 'Pan 40 Tablet',
        batchNumber: 'BT-77412',
        expiryDate: '2028-02-28',
        quantity: 15,
        unitPrice: 11.20,
        mrp: 12.00,
        discountPercent: 15,
        discountAmount: 25.20,
        taxGstPercent: 12,
        taxAmount: 17.44,
        totalAmount: 162.80
      }
    ],
    subtotal: 393.00,
    discountAmount: 58.95,
    healthCardDiscount: 58.95,
    taxAmount: 37.75,
    roundOff: 0.20,
    netTotal: 372.00,
    paidAmount: 372.00,
    dueAmount: 0,
    paymentMethod: 'Cash',
    dispensedBy: 'Pharmacy Counter 02',
    status: 'dispensed'
  };

  const sampleDiagnosticReport: DiagnosticReportRecord = {
    id: 'REP-2026-004491',
    reportNumber: 'LMDX-RPT-2026-004491',
    orderId: 'ORD-9812',
    orderNumber: 'ORD-2026-009812',
    bookingNo: 'BK-2026-0089',
    patientId: samplePatient.id,
    patientName: samplePatient.fullName,
    patientAge: 34,
    patientGender: 'male',
    referringDoctorName: 'Dr. Angad Mandal, MBBS, MD',
    sampleBarcode: 'SMP-2026-8819',
    sampleTubeType: 'EDTA Vacutainer (Lavender)',
    department: 'Haematology & Clinical Pathology',
    testName: 'Complete Blood Count (CBC) with 5-Part Differential',
    testCategory: 'Haematology',
    verificationCode: 'VRF-LAB-9921',
    sampleCollectedAt: new Date(Date.now() - 3600000).toISOString(),
    sampleReceivedAt: new Date().toISOString(),
    status: 'finalized',
    isLocked: true,
    technicianName: company.documentBranding?.diagnosticReport?.technicianName || 'P. Sengupta, DMLT (Senior Lab Tech)',
    reportingDoctorName: company.documentBranding?.diagnosticReport?.pathologistName || 'Dr. S. K. Roy, MD (Biochemistry)',
    parameters: [
      {
        id: 'p1',
        parameterName: 'Haemoglobin (Hb)',
        observedValue: '14.8',
        unit: 'g/dL',
        referenceRange: '13.0 - 17.0',
        flag: 'normal',
        method: 'Photometric Cyanide-Free'
      },
      {
        id: 'p2',
        parameterName: 'Total Leukocyte Count (WBC)',
        observedValue: '7,400',
        unit: '/cumm',
        referenceRange: '4,000 - 11,000',
        flag: 'normal',
        method: 'Flow Cytometry Laser Impedance'
      },
      {
        id: 'p3',
        parameterName: 'Platelet Count',
        observedValue: '2.45',
        unit: 'Lakh/cumm',
        referenceRange: '1.50 - 4.50',
        flag: 'normal',
        method: 'Automated Impedance'
      },
      {
        id: 'p4',
        parameterName: 'Neutrophils',
        observedValue: '62',
        unit: '%',
        referenceRange: '40 - 75',
        flag: 'normal',
        method: 'Differential'
      }
    ],
    clinicalImpression: 'Specimen processed on fully automated 5-part hematology analyzer with internal QC check passed.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      {/* Brand Header Notification */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">Universal Document Brand Preview</h4>
            <p className="text-xs text-slate-400">
              Live simulation of how your company identity, uploaded logo, and legal headers render across all hospital documents.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active Central Brand
          </span>
        </div>
      </div>

      {/* Document Selector Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          type="button"
          onClick={() => setActivePreview('card')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activePreview === 'card'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Health Card (CR80)</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePreview('bill')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activePreview === 'bill'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>A4 Half-Page Hospital Bill</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePreview('pharmacy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activePreview === 'pharmacy'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Pharmacy Tax Invoice</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePreview('lab')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activePreview === 'lab'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Diagnostic Lab Report</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePreview('rx')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activePreview === 'rx'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctor OPD Prescription</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePreview('letterhead')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activePreview === 'letterhead'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Official Letterhead (A4)</span>
        </button>
      </div>

      {/* Render Active Document Preview */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[480px]">
        {/* 1. HEALTH CARD PREVIEW */}
        {activePreview === 'card' && (
          <div className="flex flex-col items-center space-y-6 w-full">
            <div className="flex items-center justify-between w-full max-w-md">
              <span className="text-xs font-bold text-slate-400">
                CR80 High-Precision PVC Smart Card ({isCardFlipped ? 'Back Side' : 'Front Side'})
              </span>
              <button
                type="button"
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Flip Card</span>
              </button>
            </div>

            <div className="w-full max-w-[420px] transition-all duration-300">
              {isCardFlipped ? (
                <CR80CardBack
                  card={sampleCard}
                  patient={samplePatient}
                  membership={sampleMembership}
                  company={company}
                />
              ) : (
                <CR80CardFront
                  card={sampleCard}
                  patient={samplePatient}
                  membership={sampleMembership}
                  company={company}
                />
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center max-w-md">
              The health card automatically features your official logo, hospital name, helpline, and security watermark configured in Company Settings.
            </p>
          </div>
        )}

        {/* 2. A4 HALF-PAGE HOSPITAL BILL */}
        {activePreview === 'bill' && (
          <div className="w-full max-w-2xl bg-white text-slate-900 p-2 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <StandardHalfPageBill
              bill={sampleBillData}
              company={company}
              onPrint={() => window.print()}
              onDownloadPdf={() => {}}
            />
          </div>
        )}

        {/* 3. PHARMACY TAX INVOICE */}
        {activePreview === 'pharmacy' && (
          <div className="w-full max-w-2xl bg-white text-slate-900 p-4 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <PharmacyA4HalfPageInvoice
              sale={samplePharmacySale}
              companyProfile={company}
              patient={samplePatient}
              card={sampleCard}
            />
          </div>
        )}

        {/* 4. DIAGNOSTIC LAB REPORT */}
        {activePreview === 'lab' && (
          <div className="w-full max-w-2xl bg-white text-slate-900 p-4 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <OfficialDiagnosticReportDocument
              report={sampleDiagnosticReport}
              company={company}
            />
          </div>
        )}

        {/* 5. DOCTOR OPD PRESCRIPTION */}
        {activePreview === 'rx' && (
          <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-200 space-y-6">
            {/* Header with Company Logo & Name */}
            <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-4">
              <div className="flex items-center gap-3">
                <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" />
                <div>
                  <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">{company.name}</h2>
                  <p className="text-xs text-indigo-700 font-bold">{company.subtitle || company.tagline}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{company.address}, {company.district} - {company.pinCode}</p>
                  <p className="text-[10px] text-slate-500">Phone: {company.phone} • Helpline: {company.helpline}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                  OUTPATIENT PRESCRIPTION
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1">Rx No: RX-2026-00821</p>
                <p className="text-[10px] text-slate-400 font-mono">Date: {new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Doctor & Patient Metadata */}
            <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Consulting Doctor</span>
                <span className="font-bold text-slate-900">Dr. Angad Mandal, MBBS, MD (Medicine)</span>
                <span className="text-[11px] text-slate-500 block">Reg No: WBMC-98421 • General Medicine</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Details</span>
                <span className="font-bold text-slate-900">{samplePatient.fullName} (34Y / M)</span>
                <span className="text-[11px] text-slate-500 block">UHID: {samplePatient.id} • Mobile: {samplePatient.mobile}</span>
              </div>
            </div>

            {/* Clinical Notes & Rx */}
            <div className="space-y-4 min-h-[140px]">
              <div className="text-lg font-serif font-black text-indigo-900">℞</div>
              <div className="space-y-2 text-xs text-slate-800 pl-4 border-l-2 border-indigo-200">
                <div className="flex justify-between font-bold">
                  <span>1. Tab. Amoxicillin + Clavulanic Acid 625mg</span>
                  <span className="text-slate-600 font-mono">1 - 0 - 1 × 5 Days (After Food)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>2. Tab. Pantoprazole 40mg</span>
                  <span className="text-slate-600 font-mono">1 - 0 - 0 × 7 Days (Before Food)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>3. Tab. Paracetamol 650mg</span>
                  <span className="text-slate-600 font-mono">SOS (If fever &gt; 100°F)</span>
                </div>
              </div>
            </div>

            {/* Footer with Signature & Disclaimers */}
            <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-[10px] text-slate-500">
              <div>
                <p>{company.documentBranding?.prescription?.rxFooterNotice || 'Please review dosage instructions carefully. Return for follow-up as advised.'}</p>
                <p className="mt-0.5">Emergency 24x7 Support: {company.helpline} • {company.website}</p>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 mb-1" />
                <span className="font-bold text-slate-700">Doctor Signature & Stamp</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. OFFICIAL LETTERHEAD (A4) */}
        {activePreview === 'letterhead' && (
          <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-200 space-y-8 min-h-[520px] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" />
                  <div>
                    <h1 className="text-lg font-black uppercase text-slate-900 tracking-tight">{company.name}</h1>
                    <p className="text-xs font-bold text-indigo-700">{company.legalName || company.subtitle}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {company.address}, {company.postOffice}, {company.district}, {company.state} - {company.pinCode}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Phone: {company.phone} | Helpline: {company.helpline} | Email: {company.email}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-800">Registration: {company.registrationNo}</p>
                  <p>Clinical Lic: {company.clinicalLicenseNo}</p>
                  <p>GSTIN: {company.gstin}</p>
                  <p className="text-indigo-600 font-bold">{company.website}</p>
                </div>
              </div>

              {/* Sample Letter Body */}
              <div className="py-8 space-y-4 text-xs text-slate-700 leading-relaxed">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-4">
                  <span>Ref: LMDX/ADMIN/2026/0142</span>
                  <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                </div>
                <p className="font-bold text-slate-900">TO WHOMSOEVER IT MAY CONCERN</p>
                <p>
                  This official institutional document confirms that all medical diagnostics, laboratory procedures, outpatient consultations, and pharmacy dispensings conducted under <strong>{company.name}</strong> strictly adhere to healthcare standards, state clinical establishment guidelines, and patient safety protocols.
                </p>
                <p>
                  All patient records, health card memberships, and payment slips generated through this platform are cryptographically signed and stored in the central PostgreSQL database for real-time verification.
                </p>
              </div>
            </div>

            {/* Official Footer */}
            <div className="border-t border-slate-300 pt-4 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{company.isoCertification || 'ISO 9001:2015 ACCREDITED HEALTHCARE INSTITUTION'}</span>
              </div>
              <div className="text-right font-bold text-slate-700">
                For {company.legalName || company.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
