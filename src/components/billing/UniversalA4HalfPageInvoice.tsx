import React from 'react';
import { CompanyProfile } from '../../types';
import { UniversalInvoiceData, UniversalInvoiceItem } from '../../types/invoice';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { RealBarcode } from '../common/RealBarcode';
import { ShieldCheck, Stethoscope, Pill, FlaskConical, Scissors } from 'lucide-react';

interface UniversalA4HalfPageInvoiceProps {
  invoice: UniversalInvoiceData;
  company: CompanyProfile;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onClose?: () => void;
  isReprint?: boolean;
}

export const UniversalA4HalfPageInvoice: React.FC<UniversalA4HalfPageInvoiceProps> = ({
  invoice,
  company,
  onPrint,
  onDownloadPdf,
  onClose,
  isReprint = false
}) => {
  // Max items per half-page: 6 items for normal height bills, pagination fallback for long bills
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
  const orgGstin = company.gstin || '19AAACL8840M1ZX';
  const orgLic = company.clinicalLicenseNo || company.registrationNo || 'CEA/WB/MLD/2026/1102';

  return (
    <div className="w-full">
      {/* Top Action Bar (Hidden on print) */}
      {(onPrint || onDownloadPdf || onClose) && (
        <div className="flex flex-wrap items-center justify-between p-3.5 mb-4 bg-slate-900 border border-slate-800 rounded-2xl print:hidden text-white shadow-xl gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wide text-white uppercase">
                  CENTRAL A4 HALF-PAGE TAX INVOICE ENGINE
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
                {invoice.invoiceNumber} • {invoice.categoryLabel || invoice.category.toUpperCase()} • 142mm Boundary
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
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

      {/* Invoice Root (Exact Half-Page Canvas) */}
      <div id="universal-a4-half-page-invoice-root" className="print:m-0 print:p-0">
        {chunks.map((chunk, pageIndex) => {
          const isLastPage = pageIndex === chunks.length - 1;

          return (
            <div
              key={pageIndex}
              className="universal-half-page-bill bg-white text-slate-900 border border-slate-300 rounded-xl shadow-md p-4 font-sans relative mx-auto my-3 print:m-0 print:p-3.5 print:border-none print:shadow-none"
              style={{
                width: '100%',
                maxWidth: '200mm',
                minHeight: '138mm',
                maxHeight: '146mm',
                boxSizing: 'border-box',
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                pageBreakInside: 'avoid',
                overflow: 'hidden'
              }}
            >
              {/* REPRINT WATERMARK */}
              {displayReprint && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] select-none z-0">
                  <span className="text-7xl font-black text-slate-950 uppercase -rotate-12 border-8 border-slate-950 p-4 rounded-3xl tracking-widest">
                    REPRINT
                  </span>
                </div>
              )}

              {/* 1. CENTRAL COMPANY HEADER */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 relative z-10">
                <div className="flex items-start gap-2.5">
                  {company.logoUrl ? (
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center flex-shrink-0">
                      <img
                        src={company.logoUrl}
                        alt={orgName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 bg-blue-900 text-white font-black text-lg flex items-center justify-center rounded-lg border border-blue-950 flex-shrink-0">
                      LM
                    </div>
                  )}

                  <div className="max-w-[110mm]">
                    <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase leading-none">
                      {orgName}
                    </h1>
                    <p className="text-[9px] text-blue-900 font-bold uppercase tracking-wider mt-0.5 leading-tight">
                      {orgSubtitle}
                    </p>
                    <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5 truncate">
                      {orgAddress}
                    </p>
                    <p className="text-[8px] text-slate-500 font-mono mt-0.5">
                      <span>Helpline: <strong>{orgPhone}</strong> • </span>
                      <span>Email: {orgEmail} • </span>
                      <span>GSTIN: <strong>{orgGstin}</strong></span>
                      {orgLic && <span> • Lic: {orgLic}</span>}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 min-w-[50mm]">
                  <div className="inline-block px-2 py-0.5 rounded bg-slate-950 text-white text-[9px] font-black uppercase tracking-wider">
                    {invoice.titleBadge || 'TAX INVOICE'}
                  </div>
                  {invoice.categoryLabel && (
                    <div className="text-[8px] font-mono font-bold text-slate-500 uppercase mt-0.5">
                      [{invoice.categoryLabel}]
                    </div>
                  )}
                  <div className="mt-1 flex justify-end">
                    <RealBarcode
                      value={invoice.barcodeValue || invoice.invoiceNumber}
                      height={18}
                      barWidth={1.05}
                      showText={false}
                    />
                  </div>
                  <div className="text-[8px] font-mono text-slate-500 mt-0.5">
                    Inv No: <strong className="text-slate-900">{invoice.invoiceNumber}</strong>
                  </div>
                </div>
              </div>

              {/* 2. PATIENT & INVOICE METADATA BAR */}
              <div className="grid grid-cols-2 gap-3 py-1.5 border-b border-slate-200 text-[9.5px] leading-tight relative z-10 bg-slate-50/70 -mx-4 px-4 my-1">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 w-16">Patient:</span>
                    <strong className="text-slate-950 uppercase text-[10px]">{invoice.patientName}</strong>
                    {invoice.patientAgeGender && <span className="text-slate-500 text-[8.5px]">({invoice.patientAgeGender})</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 w-16">UHID / ID:</span>
                    <span className="font-mono font-bold text-slate-900">{invoice.patientId || 'N/A'}</span>
                    {invoice.patientMobile && (
                      <span className="text-slate-600 ml-2 font-mono">Mob: {invoice.patientMobile}</span>
                    )}
                  </div>
                  {invoice.referringDoctor && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 w-16">Doctor:</span>
                      <span className="text-slate-800 font-medium truncate max-w-[85mm]">{invoice.referringDoctor}</span>
                    </div>
                  )}
                  {invoice.department && (
                    <div className="flex items-center gap-1.5 text-[8.5px] text-slate-500">
                      <span className="w-16">Dept:</span>
                      <span className="text-slate-700">{invoice.department}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 text-right font-mono">
                  <div className="flex justify-end gap-1.5">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="text-slate-800 font-semibold">{formatDateTime(invoice.date)}</span>
                  </div>
                  <div className="flex justify-end gap-1.5 items-center">
                    <span className="text-slate-500">Health Card:</span>
                    {invoice.hasHealthCard && invoice.healthCardNumber ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono font-bold text-[8.5px] border border-emerald-300">
                        {invoice.healthCardNumber} ({invoice.healthCardTier || 'ACTIVE MEMBER'})
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[8.5px] font-sans">Regular Non-Cardholder</span>
                    )}
                  </div>
                  {displayReprint && (
                    <div className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded inline-block">
                      REPRINT #{invoice.reprintCount || 1} • {formatDate(new Date().toISOString())}
                    </div>
                  )}
                  <div className="text-[8px] text-slate-600">
                    Payment Mode: <strong className="uppercase font-bold text-slate-900">{invoice.paymentMethod}</strong>
                  </div>
                </div>
              </div>

              {/* 3. ITEM TABLE (COMPACT & EXPANDABLE) */}
              <div className="mt-1 mb-1.5 relative z-10">
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[8px]">
                      <th className="py-1 px-1.5 w-6 text-center">#</th>
                      <th className="py-1 px-1.5">Particulars / Service Description</th>
                      {invoice.category === 'pharmacy' && <th className="py-1 px-1 w-14">Batch/Exp</th>}
                      <th className="py-1 px-1.5 w-10 text-center">Qty</th>
                      <th className="py-1 px-1.5 w-14 text-right">Rate</th>
                      <th className="py-1 px-1.5 w-14 text-right">Disc</th>
                      {invoice.category === 'pharmacy' && <th className="py-1 px-1 w-10 text-right">GST</th>}
                      <th className="py-1 px-1.5 w-18 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chunk.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-0.5 px-1.5 text-center font-mono text-slate-400 text-[8.5px]">
                          {pageIndex * ITEMS_PER_HALF_PAGE + idx + 1}
                        </td>
                        <td className="py-0.5 px-1.5 font-medium text-slate-900 truncate max-w-[100mm]">
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
                        <td className="py-0.5 px-1.5 text-right font-mono text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono text-emerald-700">
                          {item.discountAmount ? formatCurrency(item.discountAmount) : '-'}
                        </td>
                        {invoice.category === 'pharmacy' && (
                          <td className="py-0.5 px-1 text-right font-mono text-[7.5px] text-slate-500">
                            {item.taxPercent ? `${item.taxPercent}%` : '-'}
                          </td>
                        )}
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-950">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. FINANCIAL BREAKDOWN & SUMMARY (On Last Page) */}
              {isLastPage ? (
                <div className="border-t-2 border-slate-900 pt-1.5 grid grid-cols-2 gap-4 text-[9px] relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">Status:</span>
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase font-mono ${
                        invoice.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : invoice.paymentStatus === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        ● {invoice.paymentStatus.replace('_', ' ').toUpperCase()}
                      </span>
                      {invoice.transactionId && (
                        <span className="text-[7.5px] font-mono text-slate-400 truncate max-w-[45mm]">
                          Txn: {invoice.transactionId}
                        </span>
                      )}
                    </div>

                    {invoice.terms && invoice.terms.length > 0 ? (
                      <div className="text-[7.5px] text-slate-500 leading-tight">
                        {invoice.terms.map((term, tIdx) => (
                          <p key={tIdx}>• {term}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[7.5px] text-slate-400 italic">
                        * Computer generated tax invoice. Valid without physical rubber stamp.
                      </div>
                    )}

                    {invoice.notes && (
                      <div className="text-[8px] text-slate-600 bg-slate-50 p-1 rounded border border-slate-200">
                        <strong>Note:</strong> {invoice.notes}
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown / Discount Engine */}
                  <div className="space-y-0.5 font-mono text-right text-[8.5px]">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-sans">Gross Amount:</span>
                      <span>{formatCurrency(invoice.grossAmount)}</span>
                    </div>

                    {invoice.healthCardDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span className="font-sans">Health Card Discount:</span>
                        <span>- {formatCurrency(invoice.healthCardDiscount)}</span>
                      </div>
                    )}

                    {invoice.otherDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span className="font-sans">Other Approved Discount:</span>
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

                    <div className="flex justify-between text-[11px] font-black text-slate-950 border-t border-slate-400 pt-0.5">
                      <span className="font-sans">NET PAYABLE:</span>
                      <span>{formatCurrency(invoice.netPayable)}</span>
                    </div>

                    <div className="flex justify-between text-slate-700 font-bold">
                      <span className="font-sans">Paid Amount:</span>
                      <span>{formatCurrency(invoice.paidAmount)}</span>
                    </div>

                    {invoice.dueAmount > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span className="font-sans">Balance Due:</span>
                        <span>{formatCurrency(invoice.dueAmount)}</span>
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
              <div className="absolute bottom-2.5 left-4 right-4 pt-1.5 border-t border-slate-200 flex items-end justify-between text-[8px] text-slate-500 z-10">
                <div className="leading-tight">
                  <div>Billed By: <strong className="text-slate-800">{invoice.authorizedStaffName || 'Cashier Desk'}</strong></div>
                  <div className="text-[7.5px] text-slate-400 font-mono">Printed: {formatDate(new Date().toISOString())}</div>
                </div>

                <div className="text-center font-mono text-[7.5px] text-slate-400">
                  Page {pageIndex + 1} of {chunks.length} • LABMEDIX Invoice {invoice.templateVersion || 'v1.0'}
                </div>

                <div className="text-right">
                  <div className="border-t border-slate-400 px-3 pt-0.5 inline-block text-slate-800 font-bold text-[7.5px] uppercase">
                    Authorized Signatory
                  </div>
                </div>
              </div>

              {/* Dotted Tear-Off Line for Half-Page standard */}
              <div className="absolute -bottom-2 left-0 right-0 text-center text-[7.5px] text-slate-400 font-mono select-none print:block hidden">
                ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
