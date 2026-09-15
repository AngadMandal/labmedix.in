export type UniversalInvoiceCategory =
  | 'opd'
  | 'laboratory'
  | 'pharmacy'
  | 'health_card'
  | 'card_request'
  | 'ipd'
  | 'emergency'
  | 'diagnostic'
  | 'receipt'
  | 'payment_slip'
  | 'refund_slip'
  | 'general';

export type UniversalPaymentStatus =
  | 'paid'
  | 'partially_paid'
  | 'due'
  | 'refunded'
  | 'cancelled';

export interface UniversalInvoiceItem {
  id?: string;
  sl?: number;
  description: string;
  category?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  discountPercent?: number;
  taxPercent?: number;
  taxAmount?: number;
  total: number;
}

export interface UniversalInvoiceData {
  // Identification & Classification
  invoiceNumber: string;
  originalInvoiceNumber?: string; // in case of refund/reprint
  category: UniversalInvoiceCategory;
  categoryLabel?: string;
  titleBadge?: string; // e.g. "TAX INVOICE", "RECEIPT / BILL SLIP"
  templateVersion?: string; // "v1.0"
  date: string; // ISO string or formatted
  isReprint?: boolean;
  reprintCount?: number;

  // Patient / Customer Information
  patientName: string;
  patientId?: string; // UHID
  patientMobile?: string;
  patientAgeGender?: string;
  patientAddress?: string;
  referringDoctor?: string;
  department?: string;
  roomBedNo?: string;

  // Health Card Information
  healthCardNumber?: string;
  healthCardTier?: string;
  hasHealthCard?: boolean;

  // Items
  items: UniversalInvoiceItem[];

  // Financial Breakdown (Discount & Tax Engine)
  grossAmount: number;
  healthCardDiscount: number;
  otherDiscount: number;
  totalDiscount: number;
  taxableAmount?: number;
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  roundOff?: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;

  // Payment Details
  paymentMethod: string;
  paymentStatus: UniversalPaymentStatus;
  transactionId?: string;
  upiId?: string;
  bankRef?: string;
  cashReceived?: number;
  changeGiven?: number;

  // Staff & Verification
  authorizedStaffName?: string;
  authorizedStaffRole?: string;
  notes?: string;
  terms?: string[];
  verificationCode?: string;
  verificationQrUrl?: string;
  barcodeValue?: string;
}
