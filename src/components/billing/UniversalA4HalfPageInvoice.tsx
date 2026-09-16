import React, { useState } from 'react';
import { CompanyProfile } from '../../types';
import { UniversalInvoiceData, UniversalInvoiceItem } from '../../types/invoice';
import { formatCurrency, formatDateTime, formatDate, numberToWordsINR } from '../../utils/formatters';
import { RealBarcode } from '../common/RealBarcode';
import { CentralBillPaymentQR } from '../payment/CentralBillPaymentQR';
import { ShieldCheck, Stethoscope, Pill, FlaskConical, Scissors, Copy, Layers } from 'lucide-react';

interface UniversalA4HalfPageInvoiceProps {
  invoice: UniversalInvoiceData;
  company: CompanyProfile;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onClose?: () => void;
  isReprint?: boolean;
  copyMode?: 'single' | 'duplicate';
  onPaymentSuccess?: (receiptData: any) => void;
  onOpenVerifyModal?: () => void;
}

export const UniversalA4HalfPageInvoice: React.FC<UniversalA4HalfPageInvoiceProps> = ({
  invoice,
  company,
  onPrint,
  onDownloadPdf,
  onClose,
  isReprint = false,
  copyMode: initialCopyMode,
  onPaymentSuccess,
  onOpenVerifyModal
}) => {
  const configuredDefault = company.documentBranding?.bill?.copyFormat || 'single';
  const [activeCopyMode, setActiveCopyMode] = useState<'single' | 'duplicate'>(
    initialCopyMode || configuredDefault
  );

  // Max items per half-page: 6 items ensures clean 142mm height boundary
  const ITEMS_PER_HALF_PAGE = 6;
  const itemsList = invoice.items && invoice.items.length > 0 ? invoice.items : [
    {
      sl: 1,
      description: invoice.categoryLabel || 'Hospital Care Service',
      quantity: 1,
      unitPrice: invoice.netPayable,
      total: invoice.netPayable
    }
  ];

  const chunks: UniversalInvoiceItem[][] = [];
  for (let i = 0; i < itemsList.length; i += ITEMS_PER_HALF_PAGE) {
    chunks.push(itemsList.slice(i, i + ITEMS_PER_HALF_PAGE));
  }

  const displayReprint = isReprint || invoice.isReprint;
  const orgName = company.name || 'LABMEDIX MULTI-SPECIALITY HOSPITAL';
  const orgSubtitle = company.tagline || company.subtitle || 'Confident in Care • 24x7 Multi-Speciality Diagnostic & Clinical Network';
  const orgAddress = company.address
    ? `${company.address}${company.postOffice ? `, ${company.postOffice}` : ''}${company.district ? `, ${company.district}` : ''}${company.state ? `, ${company.state}` : ''} - ${company.pinCode || ''}`.replace(/,\s*,/g, ',').trim()
    : 'Central Hospital Campus, Kolkata, West Bengal - 700091';
  const orgPhone = company.phone || company.helpline || '+91 98310 12345';
  const orgEmail = company.email || 'care@labmedix.in';
  const topCopyTitle = company.documentBranding?.bill?.topCopyTitle || 'ORIGINAL FOR RECIPIENT';
  const bottomCopyTitle = company.documentBranding?.bill?.bottomCopyTitle || 'PATIENT COPY / DUPLICATE';

  const renderHalfPageCanvas = (
    chunk: UniversalInvoiceItem[],
    pageIndex: number,
    copyLabelText?: string,
    copySerialBadge?: string
  ) => {
    const isLastPage = pageIndex === chunks.length - 1;

    return (
      <div
        className="universal-half-page-bill bg-white text-slate-900 border border-slate-300 rounded-xl shadow-sm p-3.5 font-sans relative mx-auto my-2 print:m-0 print:p-2.5 print:border-none print:shadow-none"
        style={{
          width: '100%',
          maxWidth: '200mm',
          minHeight: '136mm',
          maxHeight: activeCopyMode === 'duplicate' ? '138mm' : '145mm',
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          overflow: 'hidden'
        }}
      >
        {/* WATERMARKS (CANCELLED / REFUNDED / REPRINT) */}
        {invoice.paymentStatus === 'cancelled' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none z-0">
            <span className="text-7xl font-black text-rose-950 uppercase -rotate-12 border-8 border-rose-950 p-3 rounded-3xl tracking-widest">
              CANCELLED
            </span>
          </div>
        )}

        {invoice.paymentStatus === 'refunded' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none z-0">
            <span className="text-7xl font-black text-amber-950 uppercase -rotate-12 border-8 border-amber-950 p-3 rounded-3xl tracking-widest">
              REFUNDED
            </span>
          </div>
        )}

        {displayReprint && invoice.paymentStatus !== 'cancelled' && invoice.paymentStatus !== 'refunded' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] select-none z-0">
            <span className="text-7xl font-black text-slate-950 uppercase -rotate-12 border-8 border-slate-950 p-3 rounded-3xl tracking-widest">
              REPRINT
            </span>
          </div>
        )}

        {/* 1. CENTRAL INSTITUTIONAL COMPANY HEADER (GSTIN & Lic Removed per standard specification) */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-1.5 relative z-10">
          <div className="flex items-start gap-2.5">
            {company.logoUrl ? (
              <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 p-0.5 flex items-center justify-center flex-shrink-0">
                <img
                  src={company.logoUrl}
                  alt={orgName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-11 h-11 bg-blue-900 text-white font-black text-lg flex items-center justify-center rounded-lg border border-blue-950 flex-shrink-0 shadow-sm">
                LM
              </div>
            )}

            <div className="max-w-[115mm]">
              <h1 className="text-sm sm:text-[15px] font-black tracking-tight text-slate-950 uppercase leading-none">
                {orgName}
              </h1>
              <p className="text-[9.5px] text-blue-900 font-bold uppercase tracking-wider mt-0.5 leading-tight">
                {orgSubtitle}
              </p>
              <p className="text-[9px] text-slate-600 leading-tight mt-0.5 truncate">
                {orgAddress}
              </p>
              <div className="flex items-center gap-2 text-[8.5px] text-slate-600 font-medium mt-0.5 leading-tight">
                <span>Helpline: <strong className="text-slate-900 font-mono">{orgPhone}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Email: <span className="text-slate-700 font-mono">{orgEmail}</span></span>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 min-w-[50mm]">
            <div className="inline-block px-2.5 py-0.5 rounded bg-slate-950 text-white text-[9.5px] font-black uppercase tracking-wider">
              {invoice.titleBadge || 'TAX INVOICE'}
            </div>
            {copySerialBadge && (
              <div className="text-[8px] font-mono font-black text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                {copySerialBadge}
              </div>
            )}
            <div className="mt-0.5 flex justify-end">
              <RealBarcode
                value={invoice.barcodeValue || invoice.invoiceNumber}
                height={16}
                barWidth={1.05}
                showText={false}
              />
            </div>
            <div className="text-[8.5px] font-mono text-slate-600 mt-0.5">
              Bill Serial: <strong className="text-slate-950 font-bold">{invoice.invoiceNumber}</strong>
            </div>
          </div>
        </div>

        {/* 2. PATIENT & SERVICE METADATA BLOCK */}
        <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-slate-200 text-[9.5px] leading-tight relative z-10 bg-slate-50/80 -mx-3.5 px-3.5 my-1">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 w-16">Patient:</span>
              <strong className="text-slate-950 uppercase text-[10.5px] font-black">{invoice.patientName}</strong>
              {invoice.patientAgeGender && <span className="text-slate-600 text-[8.5px] font-semibold">({invoice.patientAgeGender})</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 w-16">UHID / ID:</span>
              <span className="font-mono font-bold text-slate-900">{invoice.patientId || 'N/A'}</span>
              {invoice.patientMobile && (
                <span className="text-slate-700 ml-2 font-mono">Mob: {invoice.patientMobile}</span>
              )}
            </div>
            {invoice.referringDoctor && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 w-16">Doctor:</span>
                <span className="text-slate-800 font-medium truncate max-w-[85mm]">{invoice.referringDoctor}</span>
              </div>
            )}
            {/* Smart Module-Aware Metadata */}
            <div className="flex items-center gap-3 text-[8.5px] text-slate-600">
              {invoice.department && (
                <span>Dept: <strong className="text-slate-800">{invoice.department}</strong></span>
              )}
              {invoice.modality && (
                <span>Modality: <strong className="text-slate-800">{invoice.modality}</strong></span>
              )}
              {invoice.roomBedNo && (
                <span>Bed: <strong className="text-slate-800 font-mono">{invoice.roomBedNo}</strong></span>
              )}
              {invoice.triageCategory && (
                <span>Triage: <strong className="text-rose-700">{invoice.triageCategory}</strong></span>
              )}
              {invoice.specimenType && (
                <span>Sample: <strong className="text-slate-800">{invoice.specimenType}</strong></span>
              )}
            </div>
          </div>

          <div className="space-y-0.5 text-right font-mono">
            <div className="flex justify-end gap-1.5">
              <span className="text-slate-500 font-sans">Date & Time:</span>
              <span className="text-slate-900 font-semibold">{formatDateTime(invoice.date)}</span>
            </div>
            <div className="flex justify-end gap-1.5 items-center">
              <span className="text-slate-500 font-sans">Health Card:</span>
              {invoice.hasHealthCard && invoice.healthCardNumber ? (
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono font-bold text-[8.5px] border border-emerald-300">
                  {invoice.healthCardNumber} ({invoice.healthCardTier || 'ACTIVE MEMBER'})
                </span>
              ) : (
                <span className="text-slate-400 text-[8.5px] font-sans">Regular Non-Cardholder</span>
              )}
            </div>
            {displayReprint && (
              <div className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded inline-block">
                REPRINT #{invoice.reprintCount || 1} • {formatDate(new Date().toISOString())}
              </div>
            )}
            <div className="text-[8.5px] text-slate-700">
              Payment Mode: <strong className="uppercase font-bold text-slate-900">{invoice.paymentMethod}</strong>
            </div>
          </div>
        </div>

        {/* 3. ITEM TABLE (SMART MODULE-AWARE & SEQUENTIAL SERIAL BY SERIAL) */}
        <div className="mt-0.5 mb-1 relative z-10">
          <table className="w-full text-left border-collapse text-[9.5px]">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 text-slate-800 font-black uppercase tracking-wider text-[8px]">
                <th className="py-1 px-1.5 w-8 text-center"># SL</th>
                <th className="py-1 px-1.5">Particulars / Service Description</th>
                {invoice.category === 'pharmacy' && <th className="py-1 px-1 w-14">Batch/Exp</th>}
                <th className="py-1 px-1.5 w-10 text-center">Qty</th>
                <th className="py-1 px-1.5 w-16 text-right">Rate</th>
                <th className="py-1 px-1.5 w-14 text-right">Disc</th>
                {invoice.category === 'pharmacy' && <th className="py-1 px-1 w-10 text-right">GST</th>}
                <th className="py-1 px-1.5 w-20 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chunk.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-600 text-[8.5px]">
                    {String(pageIndex * ITEMS_PER_HALF_PAGE + idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-0.5 px-1.5 font-medium text-slate-900 truncate max-w-[95mm]">
                    {item.description}
                  </td>
                  {invoice.category === 'pharmacy' && (
                    <td className="py-0.5 px-1 font-mono text-[7.5px] text-slate-500">
                      {item.batchNumber || '-'} {item.expiryDate ? `(${item.expiryDate})` : ''}
                    </td>
                  )}
                  <td className="py-0.5 px-1.5 text-center font-mono text-slate-800">
                    {item.quantity}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-mono text-slate-700">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-mono text-emerald-700 font-semibold">
                    {item.discountAmount ? formatCurrency(item.discountAmount) : '-'}
                  </td>
                  {invoice.category === 'pharmacy' && (
                    <td className="py-0.5 px-1 text-right font-mono text-[7.5px] text-slate-500">
                      {item.taxPercent ? `${item.taxPercent}%` : '-'}
                    </td>
                  )}
                  <td className="py-0.5 px-1.5 text-right font-mono font-black text-slate-950">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. FINANCIAL BREAKDOWN, RECOMMENDED PAYMENT QR & SUMMARY (On Last Page) */}
        {isLastPage ? (
          <div className="border-t-2 border-slate-900 pt-1.5 grid grid-cols-12 gap-2 text-[9px] relative z-10 items-start">
            {/* 4A. RECOMMENDED LEFT SIDE: CENTRAL BILL DYNAMIC PAYMENT QR / PAID SEAL */}
            <div className="col-span-4 flex flex-col items-center">
              <div className="w-full bg-white border border-slate-300 rounded-xl p-1.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-1 px-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <strong className="text-[8px] font-black uppercase tracking-wider text-slate-900 font-mono">
                      PAYMENT QR
                    </strong>
                  </div>
                  <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tight">
                    Scan & Pay
                  </span>
                </div>
                <CentralBillPaymentQR
                  billNumber={invoice.invoiceNumber}
                  billId={invoice.transactionId}
                  amountDue={invoice.dueAmount !== undefined ? invoice.dueAmount : Math.max(0, invoice.netPayable - invoice.paidAmount)}
                  netPayable={invoice.netPayable}
                  paidAmount={invoice.paidAmount}
                  paymentStatus={invoice.paymentStatus}
                  patientName={invoice.patientName}
                  patientId={invoice.patientId}
                  company={company}
                  onPaymentSuccess={onPaymentSuccess}
                  onOpenVerifyModal={onOpenVerifyModal}
                  showInteractiveActions={false}
                  className="w-full border-none p-0 bg-transparent shadow-none"
                />
              </div>
            </div>

            {/* 4B. CENTER: STATUS, AMOUNT IN WORDS, OFFICIAL TERMS */}
            <div className="col-span-4 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-600 font-medium text-[8.5px]">Status:</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono ${
                  invoice.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : invoice.paymentStatus === 'partially_paid'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : invoice.paymentStatus === 'cancelled'
                    ? 'bg-rose-200 text-rose-900 border border-rose-400 font-black'
                    : invoice.paymentStatus === 'refunded'
                    ? 'bg-amber-200 text-amber-900 border border-amber-400 font-black'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  ● {invoice.paymentStatus.replace('_', ' ').toUpperCase()}
                </span>
                {invoice.transactionId && (
                  <span className="text-[7.5px] font-mono text-slate-500 truncate max-w-[45mm]">
                    Txn: {invoice.transactionId}
                  </span>
                )}
              </div>

              {/* Amount in Words box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                <div className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">
                  Amount in Words:
                </div>
                <div className="text-[9px] font-bold text-slate-900 font-serif italic leading-snug">
                  {invoice.amountInWords || numberToWordsINR(invoice.netPayable)}
                </div>
              </div>

              {invoice.terms && invoice.terms.length > 0 ? (
                <div className="text-[7px] text-slate-500 leading-tight space-y-0.5">
                  {invoice.terms.slice(0, 2).map((term, tIdx) => (
                    <p key={tIdx}>• {term}</p>
                  ))}
                </div>
              ) : (
                <div className="text-[7px] text-slate-500 leading-tight space-y-0.5">
                  <p>• Computer-generated official tax invoice; signature not mandatory.</p>
                  <p>• Valid for medical insurance & hospital audit records.</p>
                </div>
              )}

              {invoice.cancellationReason && (
                <div className="text-[7.5px] text-rose-800 bg-rose-50 p-1 rounded border border-rose-200 font-medium">
                  <strong>Cancellation:</strong> {invoice.cancellationReason}
                </div>
              )}

              {invoice.notes && !invoice.cancellationReason && (
                <div className="text-[7.5px] text-slate-600 bg-slate-50 p-1 rounded border border-slate-200 truncate max-w-[70mm]">
                  <strong>Note:</strong> {invoice.notes}
                </div>
              )}
            </div>

            {/* 4C. RIGHT SIDE: FINANCIAL SUMMARY & NET PAYABLE */}
            <div className="col-span-4 space-y-0.5 font-mono text-right text-[8.5px]">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Gross Total:</span>
                <span>{formatCurrency(invoice.grossAmount)}</span>
              </div>

              {invoice.healthCardDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span className="font-sans">Card Discount:</span>
                  <span>- {formatCurrency(invoice.healthCardDiscount)}</span>
                </div>
              )}

              {invoice.otherDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="font-sans">Other Disc:</span>
                  <span>- {formatCurrency(invoice.otherDiscount)}</span>
                </div>
              )}

              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Tax (GST):</span>
                  <span>+ {formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}

              {invoice.roundOff !== undefined && invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[8px]">
                  <span className="font-sans">Round Off:</span>
                  <span>{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs sm:text-[12px] font-black text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                <span className="font-sans">NET PAYABLE:</span>
                <span>{formatCurrency(invoice.netPayable)}</span>
              </div>

              <div className="flex justify-between text-slate-700 font-bold">
                <span className="font-sans">Paid Amount:</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>

              {invoice.dueAmount > 0 ? (
                <div className="flex justify-between text-rose-700 font-black text-[9.5px]">
                  <span className="font-sans">Balance Due:</span>
                  <span>{formatCurrency(invoice.dueAmount)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-700 font-semibold text-[8px]">
                  <span className="font-sans">Balance Due:</span>
                  <span>₹0.00 (NIL)</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 pt-1 text-right text-[8px] font-mono text-slate-500">
            Continued on Next Half-Page ({pageIndex + 2} of {chunks.length})...
          </div>
        )}

        {/* 5. FOOTER & AUTHORIZED SIGNATORY (Fixed at base of 142mm) */}
        <div className="absolute bottom-2 left-3.5 right-3.5 pt-1 border-t border-slate-200 flex items-end justify-between text-[8px] text-slate-600 z-10">
          <div className="leading-tight">
            <div>Billed By: <strong className="text-slate-900">{invoice.authorizedStaffName || 'Cashier Desk'}</strong></div>
            <div className="text-[7.5px] text-slate-500 font-mono">Printed: {formatDate(new Date().toISOString())}</div>
          </div>

          <div className="text-center font-mono text-[7.5px] text-slate-500">
            {copySerialBadge ? <span>{copySerialBadge} • </span> : null}
            Page {pageIndex + 1} of {chunks.length} • LABMEDIX
          </div>

          <div className="text-right">
            <div className="border-t border-slate-400 px-2.5 pt-0.5 inline-block text-slate-900 font-bold text-[7.5px] uppercase tracking-wider">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Top Action Bar (Hidden on print) */}
      {(onPrint || onDownloadPdf || onClose) && (
        <div className="flex flex-wrap items-center justify-between p-3.5 mb-4 bg-slate-900 border border-slate-800 rounded-2xl print:hidden text-white shadow-xl gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wide text-white uppercase">
                  CENTRAL A4 HALF-PAGE TAX INVOICE
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {invoice.templateVersion || 'v1.0'}
                </span>
                {chunks.length > 1 && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Multi-Page ({chunks.length} Sheets)
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                {invoice.invoiceNumber} • {invoice.categoryLabel || invoice.category.toUpperCase()} • 140–145mm Zone
              </span>
            </div>
          </div>

          {/* Copy Mode Selector & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveCopyMode('single')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  activeCopyMode === 'single'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Print 1 Half-Page Copy"
              >
                1 Half-Page
              </button>
              <button
                type="button"
                onClick={() => setActiveCopyMode('duplicate')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  activeCopyMode === 'duplicate'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Print 2 Half-Page Copies on One A4 Sheet (Original + Patient Duplicate)"
              >
                2 Copies (A4)
              </button>
            </div>

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
              >
                <span>🖨️ Print Invoice</span>
              </button>
            )}
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span>📥 Download PDF</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invoice Root (Exact Half-Page Canvas or Dual A4 Sheet) */}
      <div id="universal-a4-half-page-invoice-root" className="print:m-0 print:p-0">
        {chunks.map((chunk, pageIndex) => {
          const isLastChunkPage = pageIndex === chunks.length - 1;

          if (activeCopyMode === 'duplicate') {
            return (
              <div
                key={pageIndex}
                className="a4-sheet-container"
                style={{
                  pageBreakAfter: isLastChunkPage ? 'auto' : 'always',
                  pageBreakInside: 'avoid',
                  minHeight: '280mm',
                  maxHeight: '290mm',
                  overflow: 'hidden'
                }}
              >
                {/* TOP HALF: ORIGINAL (COPY SERIAL 01/02) */}
                {renderHalfPageCanvas(
                  chunk,
                  pageIndex,
                  topCopyTitle,
                  'COPY 01/02 • ORIGINAL FOR RECIPIENT'
                )}

                {/* PERFORATED CUT / TEAR DIVIDER LINE */}
                <div className="my-1 py-0.5 border-t border-dashed border-slate-400 flex items-center justify-between text-[7.5px] text-slate-500 font-mono select-none px-4">
                  <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</span>
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-bold uppercase tracking-wider text-[7.5px]">
                    CUT OR TEAR ALONG PERFORATION
                  </span>
                  <span>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
                </div>

                {/* BOTTOM HALF: PATIENT / DUPLICATE COPY (COPY SERIAL 02/02) */}
                {renderHalfPageCanvas(
                  chunk,
                  pageIndex,
                  bottomCopyTitle,
                  'COPY 02/02 • DUPLICATE FOR PATIENT'
                )}
              </div>
            );
          }

          // Single Half-Page mode
          return (
            <div
              key={pageIndex}
              style={{
                pageBreakAfter: isLastChunkPage ? 'auto' : 'always',
                pageBreakInside: 'avoid'
              }}
            >
              {renderHalfPageCanvas(
                chunk,
                pageIndex,
                topCopyTitle,
                'COPY 01/01 • ORIGINAL RECIPIENT'
              )}
              {/* Optional bottom tear guide in single mode */}
              <div className="text-center text-[7.5px] text-slate-400 font-mono select-none print:block hidden my-1">
                ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
