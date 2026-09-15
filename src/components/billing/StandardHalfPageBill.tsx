import React from 'react';
import { CompanyProfile } from '../../types';
import { UniversalInvoiceData } from '../../types/invoice';
import { UniversalA4HalfPageInvoice } from './UniversalA4HalfPageInvoice';

export interface BillItemRow {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface StandardBillData {
  billNumber: string;
  date: string;
  patientName: string;
  patientId?: string;
  patientMobile?: string;
  patientAgeGender?: string;
  referringDoctor?: string;
  healthCardNumber?: string;
  healthCardTier?: string;
  category?: string;
  items: BillItemRow[];
  subtotal: number;
  discountAmount: number;
  taxAmount?: number;
  netPayable: number;
  paidAmount: number;
  dueAmount?: number;
  paymentMethod: string;
  authorizedStaffName?: string;
  notes?: string;
}

interface StandardHalfPageBillProps {
  bill: StandardBillData;
  company: CompanyProfile;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onClose?: () => void;
}

export const StandardHalfPageBill: React.FC<StandardHalfPageBillProps> = ({
  bill,
  company,
  onPrint,
  onDownloadPdf,
  onClose
}) => {
  // Convert StandardBillData to UniversalInvoiceData
  const universalInvoice: UniversalInvoiceData = {
    invoiceNumber: bill.billNumber,
    category: (bill.category as any) || 'general',
    categoryLabel: bill.category ? `Hospital Service (${bill.category.toUpperCase()})` : 'Hospital Service Bill',
    titleBadge: 'TAX INVOICE',
    templateVersion: 'v1.0',
    date: bill.date,

    patientName: bill.patientName,
    patientId: bill.patientId,
    patientMobile: bill.patientMobile,
    patientAgeGender: bill.patientAgeGender,
    referringDoctor: bill.referringDoctor,

    healthCardNumber: bill.healthCardNumber,
    healthCardTier: bill.healthCardTier,
    hasHealthCard: Boolean(bill.healthCardNumber),

    items: (bill.items || []).map((it, idx) => ({
      sl: idx + 1,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountAmount: it.discount || 0,
      total: it.total
    })),

    grossAmount: bill.subtotal || bill.netPayable,
    healthCardDiscount: bill.healthCardNumber ? (bill.discountAmount || 0) : 0,
    otherDiscount: !bill.healthCardNumber ? (bill.discountAmount || 0) : 0,
    totalDiscount: bill.discountAmount || 0,
    taxAmount: bill.taxAmount || 0,
    netPayable: bill.netPayable,
    paidAmount: bill.paidAmount,
    dueAmount: bill.dueAmount !== undefined ? bill.dueAmount : Math.max(0, bill.netPayable - bill.paidAmount),

    paymentMethod: bill.paymentMethod || 'Cash',
    paymentStatus: (bill.dueAmount && bill.dueAmount > 0) ? 'partially_paid' : 'paid',

    authorizedStaffName: bill.authorizedStaffName,
    notes: bill.notes,
    barcodeValue: bill.billNumber
  };

  return (
    <UniversalA4HalfPageInvoice
      invoice={universalInvoice}
      company={company}
      onPrint={onPrint}
      onDownloadPdf={onDownloadPdf}
      onClose={onClose}
    />
  );
};

