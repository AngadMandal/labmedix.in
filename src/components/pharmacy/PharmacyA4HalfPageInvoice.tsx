import React from 'react';
import { PharmacySale, Patient, HealthCard, CompanyProfile } from '../../types';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { Pill, ShieldCheck } from 'lucide-react';

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
  card,
  isReprint = false,
  showDuplicateBottomCopy = false,
  copyLabel = 'ORIGINAL CUSTOMER COPY'
}) => {
  // Company Defaults
  const orgName = companyProfile?.name || 'LABMEDIX MULTI-SPECIALITY HOSPITAL';
  const orgTagline = companyProfile?.tagline || 'Hospital & Day Care Dispensing Division • 24x7 Retail Pharmacy';
  const orgAddress = companyProfile?.address 
    ? `${companyProfile.address}, ${companyProfile.postOffice || ''} ${companyProfile.district || ''} ${companyProfile.state || ''} - ${companyProfile.pinCode || ''}`.replace(/,\s*,/g, ',').trim()
    : 'Kolkata Main Hospital Campus, Sector V, Bidhannagar, Kolkata, WB 700091';
  const orgPhone = companyProfile?.phone || '+91 98310 12345';
  const orgEmail = companyProfile?.email || 'pharmacy@labmedix.in';
  const orgGstin = companyProfile?.gstin || '19AAECM4421P1Z4';
  const orgDrugLic = companyProfile?.clinicalLicenseNo || 'WB-KOL-20B-184920 & WB-KOL-21B-443912';

  const isDue = (sale.dueAmount || 0) > 0;
  const isCash = sale.paymentMethod === 'Cash';
  const displayReprint = isReprint || sale.isReprint;

  // Single Half-Page Bill Template Block
  const renderHalfPageBill = (typeLabel: string, isDuplicate = false) => {
    // Pagination split: max 8 items per half-page
    const maxItems = 8;
    const itemsToShow = sale.items.slice(0, maxItems);
    const hasMore = sale.items.length > maxItems;

    return (
      <div className="relative border border-slate-300 bg-white text-slate-900 p-4 rounded-xl shadow-none font-sans text-xs w-full max-w-[194mm] box-border print:border-slate-400 print:p-3 overflow-hidden">
        {/* REPRINT WATERMARK / BADGE */}
        {displayReprint && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] select-none">
            <span className="text-7xl font-black text-slate-950 uppercase -rotate-12 border-8 border-slate-950 p-4 rounded-3xl tracking-widest">
              REPRINT
            </span>
          </div>
        )}

        {/* 1. HEADER SECTION */}
        <div className="border-b-2 border-emerald-600 pb-2.5 flex justify-between items-start gap-3">
          <div className="flex items-start gap-2.5">
            {companyProfile?.logoUrl ? (
              <img
                src={companyProfile.logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg border border-slate-200"
              />
            ) : (
              <div className="p-2 rounded-xl bg-emerald-700 text-white flex-shrink-0">
                <Pill className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase leading-none">
                {orgName}
              </h1>
              <p className="text-[9px] text-slate-600 font-medium mt-0.5 leading-tight">
                {orgTagline}
              </p>
              <div className="text-[8.5px] text-slate-500 space-y-0.2 mt-1 leading-snug">
                <p>{orgAddress}</p>
                <p className="font-mono">
                  <strong>Drug Lic No:</strong> {orgDrugLic} • <strong>GSTIN:</strong> {orgGstin}
                </p>
                <p>Phone: {orgPhone} • Email: {orgEmail}</p>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 min-w-[150px]">
            <div className="flex flex-col items-end">
              <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mb-0.5 border ${
                sale.sourceType === 'PRESCRIPTION'
                  ? 'bg-purple-50 text-purple-900 border-purple-300'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300'
              }`}>
                {sale.sourceType === 'PRESCRIPTION'
                  ? 'PRESCRIPTION DISPENSING INVOICE'
                  : 'RETAIL PHARMACY TAX INVOICE (OTC)'}
              </span>
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                [{typeLabel}]
              </span>
            </div>

            <div className="font-mono text-xs font-black text-slate-900 mt-0.5">
              {sale.invoiceNumber}
            </div>

            {displayReprint && (
              <div className="text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-mono inline-block mt-0.5">
                REPRINT #{sale.reprintCount || 1} • {formatDate(sale.saleDate)}
              </div>
            )}

            <div className="text-[8.5px] text-slate-500 font-mono mt-0.5">
              Date: {formatDateTime(sale.saleDate)}
            </div>
            <div className="text-[8.5px] text-slate-600">
              Payment: <strong className="uppercase font-bold">{sale.paymentMethod}</strong>
            </div>
          </div>
        </div>

        {/* 2. CUSTOMER & METADATA BAR */}
        <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 my-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[9px] leading-tight">
          <div>
            <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider">
              {sale.sourceType === 'PRESCRIPTION' ? 'Prescription Patient' : 'Customer / Patient'}
            </span>
            <strong className="text-[10px] text-slate-900 block font-bold">
              {sale.patientName}
            </strong>
            {sale.patientPhone && (
              <span className="text-slate-500 font-mono block">Ph: {sale.patientPhone}</span>
            )}
            {sale.patientId && (
              <span className="text-slate-500 font-mono block">UHID: {sale.patientId}</span>
            )}
          </div>

          <div>
            <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider">
              Health Card & Tier
            </span>
            {sale.patientCardNo ? (
              <div className="mt-0.5">
                <span className="inline-flex items-center gap-0.5 font-mono font-bold text-[9.5px] text-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                  {sale.patientCardNo}
                </span>
                <span className="text-[8px] text-slate-500 block capitalize">
                  Tier: {sale.cardTier || card?.tier || (card as any)?.membershipTier || 'Active Member'}
                </span>
                {sale.healthCardDiscount > 0 && (
                  <span className="text-[8px] text-emerald-700 font-semibold block">
                    Saved: {formatCurrency(sale.healthCardDiscount)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-500 mt-0.5 block">Standard Retail Customer</span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider">
              Counter & Cashier
            </span>
            <span className="text-[9.5px] text-slate-900 font-bold block">
              {sale.sourceType === 'PRESCRIPTION'
                ? (sale.prescribingDoctor || 'Hospital Out-Patient Dept')
                : 'Retail Pharmacy POS'}
            </span>
            <span className="text-slate-500 font-mono text-[8px] block">
              Cashier: {sale.dispensedBy}
            </span>
            {sale.manualDiscountReason && (
              <span className="text-[7.5px] text-amber-700 block font-medium">
                Disc Reason: {sale.manualDiscountReason}
              </span>
            )}
          </div>
        </div>

        {/* 3. MEDICINE ITEMS TABLE (COMPACT HALF-PAGE) */}
        <div className="rounded-lg border border-slate-200 overflow-hidden mb-1.5">
          <table className="w-full text-left text-[8.5px] border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-[7.5px] font-mono uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-2 py-1 text-center w-5">#</th>
                <th className="px-2 py-1">Medicine Description</th>
                <th className="px-1.5 py-1">Batch</th>
                <th className="px-1.5 py-1">Exp</th>
                <th className="px-1.5 py-1 text-center w-8">Qty</th>
                <th className="px-1.5 py-1 text-right">MRP</th>
                <th className="px-1.5 py-1 text-right">Rate</th>
                <th className="px-1 py-1 text-right">Disc%</th>
                <th className="px-1 py-1 text-right">GST%</th>
                <th className="px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {itemsToShow.map((item, idx) => (
                <tr key={idx} className="even:bg-slate-50/50">
                  <td className="px-2 py-1 font-mono text-center text-slate-400 text-[8px]">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-1 font-semibold text-slate-900 truncate max-w-[130px]">
                    {item.medicineName}
                  </td>
                  <td className="px-1.5 py-1 font-mono text-slate-700">
                    {item.batchNumber}
                  </td>
                  <td className="px-1.5 py-1 font-mono text-slate-600">
                    {item.expiryDate}
                  </td>
                  <td className="px-1.5 py-1 text-center font-mono font-black text-slate-950">
                    {item.quantity}
                  </td>
                  <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                    {formatCurrency(item.mrp)}
                  </td>
                  <td className="px-1.5 py-1 text-right font-mono text-slate-800">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-1 py-1 text-right font-mono text-emerald-700 font-medium">
                    {item.discountPercent > 0 ? `${item.discountPercent}%` : '0%'}
                  </td>
                  <td className="px-1 py-1 text-right font-mono text-slate-600">
                    {item.taxGstPercent}%
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-bold text-slate-950">
                    {formatCurrency(item.totalAmount)}
                  </td>
                </tr>
              ))}
              {hasMore && (
                <tr>
                  <td colSpan={10} className="px-2 py-1 text-center text-[7.5px] text-slate-500 italic bg-amber-50">
                    ... and {sale.items.length - maxItems} more items on continuation sheet ...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. FINANCIAL SUMMARY & TOTALS */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          {/* Statutory Tax Breakdown */}
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[8px] space-y-0.5 leading-snug">
            <span className="font-bold uppercase tracking-wider text-[7px] text-slate-500 block">
              Statutory GST Breakdown
            </span>
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-mono">{formatCurrency(Math.max(0, sale.netTotal - sale.taxAmount))}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST (Central 6%):</span>
              <span className="font-mono">{formatCurrency(Math.round((sale.taxAmount / 2) * 100) / 100)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (State 6%):</span>
              <span className="font-mono">{formatCurrency(Math.round((sale.taxAmount / 2) * 100) / 100)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-0.5">
              <span>Total Tax Included:</span>
              <span className="font-mono">{formatCurrency(sale.taxAmount)}</span>
            </div>
          </div>

          {/* Grand Totals */}
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[8.5px] space-y-0.5 font-mono leading-snug">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount Savings:</span>
                <span>-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}
            {sale.roundOff !== undefined && sale.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500 text-[8px]">
                <span>Round Off:</span>
                <span>{sale.roundOff > 0 ? `+${sale.roundOff.toFixed(2)}` : sale.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black text-slate-950 pt-1 border-t border-slate-300">
              <span>GRAND TOTAL:</span>
              <span className="text-emerald-800">{formatCurrency(sale.netTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-0.5 border-t border-dashed border-slate-200">
              <span>Paid ({sale.paymentMethod}):</span>
              <span className="font-bold">{formatCurrency(sale.paidAmount)}</span>
            </div>
            {isDue && (
              <div className="flex justify-between text-rose-700 font-black">
                <span>Due Balance:</span>
                <span>{formatCurrency(sale.dueAmount)}</span>
              </div>
            )}
            {isCash && sale.cashReceived !== undefined && sale.cashReceived > 0 && (
              <div className="flex justify-between text-slate-500 text-[8px]">
                <span>Cash Rcvd: {formatCurrency(sale.cashReceived)}</span>
                <span className="font-bold text-slate-800">Change: {formatCurrency(sale.changeGiven || 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. FOOTER & VERIFICATION STAMP */}
        <div className="pt-2 mt-1.5 border-t border-slate-200 flex justify-between items-end gap-3 text-[7.5px] text-slate-500">
          <div className="space-y-0.2 max-w-[320px] leading-tight">
            <p className="font-bold text-slate-700">Terms & Conditions:</p>
            <p>1. Medicines returnable within 48h with original invoice in unsealed, intact condition.</p>
            <p>2. Refrigerated & Schedule H/X medications cannot be returned under drug control laws.</p>
            <p className="font-mono text-slate-400 mt-0.5">
              Computer-Generated Official Tax Receipt • Seal: LMDX-PH-{sale.id.slice(-6).toUpperCase()}
            </p>
          </div>

          <div className="text-center min-w-[120px] space-y-1">
            <div className="h-6 border-b border-dashed border-slate-300"></div>
            <div>
              <p className="font-bold text-slate-800 text-[8.5px]">Authorized Pharmacist</p>
              <p className="font-mono text-[7px]">Reg No: WB-PRX-49102</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pharmacy-a4-portrait-sheet mx-auto space-y-4">
      {/* TOP HALF: ORIGINAL COPY */}
      {renderHalfPageBill(copyLabel, false)}

      {/* OPTIONAL BOTTOM HALF: DUPLICATE STORE / CUSTOMER COPY */}
      {showDuplicateBottomCopy && (
        <div className="pt-2">
          {/* Tear-off divider */}
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 py-1 border-t-2 border-dashed border-slate-300">
            <span>✂ TEAR OFF ALONG DOTTED LINE</span>
            <span className="uppercase font-bold tracking-wider">STORE DUPLICATE / AUDIT COPY</span>
            <span>✂</span>
          </div>
          {renderHalfPageBill('STORE DUPLICATE COPY', true)}
        </div>
      )}
    </div>
  );
};
