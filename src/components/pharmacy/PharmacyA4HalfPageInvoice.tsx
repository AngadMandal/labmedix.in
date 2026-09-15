import React from 'react';
import { PharmacySale, Patient, HealthCard, CompanyProfile } from '../../types';
import { UniversalInvoiceService } from '../../services/universalInvoiceService';
import { UniversalA4HalfPageInvoice } from '../billing/UniversalA4HalfPageInvoice';

interface PharmacyA4HalfPageInvoiceProps {
  sale: PharmacySale;
  companyProfile?: CompanyProfile | null;
  patient?: Patient | null;
  card?: HealthCard | null;
  isReprint?: boolean;
  showDuplicateBottomCopy?: boolean;
  copyLabel?: string;
  isContinuation?: boolean;
}

export const PharmacyA4HalfPageInvoice: React.FC<PharmacyA4HalfPageInvoiceProps> = ({
  sale,
  companyProfile,
  patient,
  card,
  isReprint = false,
  showDuplicateBottomCopy = false,
  copyLabel = 'ORIGINAL CUSTOMER COPY'
}) => {
  const company = companyProfile || {
    name: 'LABMEDIX MULTI-SPECIALITY HOSPITAL',
    address: 'Central Campus, Kolkata',
    phone: '+91 98310 12345',
    email: 'care@labmedix.in',
    gstin: '19AAACL8840M1ZX'
  } as CompanyProfile;

  const invoiceData = UniversalInvoiceService.fromPharmacySale(sale, company, {
    patient,
    card,
    isReprint: isReprint || sale.isReprint,
    reprintCount: sale.reprintCount
  });

  return (
    <div className="w-full space-y-4">
      <UniversalA4HalfPageInvoice
        invoice={invoiceData}
        company={company}
        isReprint={isReprint || sale.isReprint}
      />

      {showDuplicateBottomCopy && (
        <div className="pt-2">
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 py-1 border-t-2 border-dashed border-slate-300">
            <span>✂ TEAR OFF ALONG DOTTED LINE</span>
            <span className="uppercase font-bold tracking-wider">STORE DUPLICATE / AUDIT COPY</span>
            <span>✂</span>
          </div>
          <UniversalA4HalfPageInvoice
            invoice={{
              ...invoiceData,
              titleBadge: 'STORE AUDIT DUPLICATE'
            }}
            company={company}
            isReprint={isReprint || sale.isReprint}
          />
        </div>
      )}
    </div>
  );
};

