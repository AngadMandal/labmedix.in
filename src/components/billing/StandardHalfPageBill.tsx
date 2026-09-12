import React from 'react';
import { CompanyProfile } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { RealBarcode } from '../common/RealBarcode';

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
  // Items per page: Safe maximum to fit strictly inside A4 half-page (approx 138mm height)
  const ITEMS_PER_PAGE = 6;
  const itemChunks: BillItemRow[][] = [];
  
  if (!bill.items || bill.items.length === 0) {
    itemChunks.push([{
      description: bill.category ? `Hospital Service (${bill.category.toUpperCase()})` : 'General Patient Consultation / Service',
      quantity: 1,
      unitPrice: bill.netPayable,
      discount: bill.discountAmount || 0,
      total: bill.netPayable
    }]);
  } else {
    for (let i = 0; i < bill.items.length; i += ITEMS_PER_PAGE) {
      itemChunks.push(bill.items.slice(i, i + ITEMS_PER_PAGE));
    }
  }

  const handleNativePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-2xl print:hidden text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold font-mono text-slate-300">
            A4 HALF-PAGE INVOICE STANDARD ({itemChunks.length} Page{itemChunks.length > 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNativePrint}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
          >
            <span>🖨️ Print Invoice</span>
          </button>
          {onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
            >
              <span>📥 Download PDF</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Bill Container */}
      <div id="standard-half-page-invoice-root" className="print:m-0 print:p-0">
        {itemChunks.map((chunk, pageIndex) => {
          const isLastPage = pageIndex === itemChunks.length - 1;

          return (
            <div
              key={pageIndex}
              className="standard-half-page-bill bg-white text-slate-900 border border-slate-300 rounded-xl shadow-lg p-5 font-sans relative mx-auto my-3 print:m-0 print:p-4 print:border-none print:shadow-none"
              style={{
                width: '100%',
                maxWidth: '210mm',
                minHeight: '144mm',
                maxHeight: '146mm',
                boxSizing: 'border-box',
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                pageBreakInside: 'avoid'
              }}
            >
              {/* Header: Company Profile */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2">
                <div className="flex items-start gap-3">
                  {company.logoUrl ? (
                    <img 
                      src={company.logoUrl} 
                      alt={company.name || 'LabMedix'} 
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <div className="w-11 h-11 bg-blue-900 text-white font-black text-xl flex items-center justify-center rounded-lg border border-blue-950">
                      LM
                    </div>
                  )}
                  <div>
                    <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      {company.name || 'LABMEDIX HEALTHCARE NETWORK'}
                    </h1>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      {company.address || 'Central Multi-Speciality Diagnostic & Clinical Healthcare Network'}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                      {company.phone && <span>Helpline: {company.phone} • </span>}
                      {company.email && <span>Email: {company.email} • </span>}
                      <span>GSTIN: {company.gstin || '19AAACL8840M1ZX'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                    TAX INVOICE
                  </div>
                  <div className="mt-1">
                    <RealBarcode 
                      value={bill.billNumber || 'LMDX-BILL'} 
                      height={20} 
                      barWidth={1.1} 
                      showText={false} 
                    />
                  </div>
                </div>
              </div>

              {/* Sub-Header: Patient & Invoice Metadata */}
              <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200 text-[10px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 w-20">Patient Name:</span>
                    <strong className="text-slate-900 text-xs uppercase">{bill.patientName}</strong>
                    {bill.patientAgeGender && <span className="text-slate-500">({bill.patientAgeGender})</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 w-20">UHID / ID:</span>
                    <span className="font-mono font-bold text-slate-800">{bill.patientId || 'N/A'}</span>
                    {bill.patientMobile && (
                      <span className="text-slate-600 ml-2">Mob: {bill.patientMobile}</span>
                    )}
                  </div>
                  {bill.referringDoctor && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 w-20">Ref. Doctor:</span>
                      <span className="text-slate-800 font-medium">{bill.referringDoctor}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <span className="text-slate-500">Invoice No:</span>
                    <strong className="font-mono font-bold text-slate-900">{bill.billNumber}</strong>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="text-slate-800 font-mono">{formatDateTime(bill.date)}</span>
                  </div>
                  {bill.healthCardNumber ? (
                    <div className="flex justify-end gap-1.5 items-center">
                      <span className="text-slate-500">Health Card:</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono font-bold text-[9px] border border-amber-300">
                        {bill.healthCardNumber} ({bill.healthCardTier || 'BENEFICIARY'})
                      </span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-400">Regular Patient (Non-Card)</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-1 mb-2">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-1 px-1.5 w-8 text-center">#</th>
                      <th className="py-1 px-1.5">Particulars / Description</th>
                      <th className="py-1 px-1.5 w-12 text-center">Qty</th>
                      <th className="py-1 px-1.5 w-16 text-right">Rate</th>
                      <th className="py-1 px-1.5 w-16 text-right">Disc</th>
                      <th className="py-1 px-1.5 w-20 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chunk.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 text-center font-mono text-slate-500">
                          {pageIndex * ITEMS_PER_PAGE + idx + 1}
                        </td>
                        <td className="py-1 px-1.5 font-medium text-slate-900">
                          {item.description}
                        </td>
                        <td className="py-1 px-1.5 text-center font-mono text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono text-emerald-700">
                          {item.discount ? formatCurrency(item.discount) : '-'}
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Block (Only on Last Page) */}
              {isLastPage ? (
                <div className="border-t-2 border-slate-800 pt-2 grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                    <div className="space-y-0.5 text-slate-600">
                      <div>
                        <span>Payment Mode: </span>
                        <strong className="text-slate-900 uppercase font-bold">{bill.paymentMethod}</strong>
                        <span className="text-emerald-700 font-bold ml-1.5">● PAID IN FULL</span>
                      </div>
                      {bill.notes && (
                        <div className="italic text-[9px] text-slate-500 truncate max-w-xs">
                          Note: {bill.notes}
                        </div>
                      )}
                      <div className="text-[8px] text-slate-400 mt-2">
                        * Computer generated bill. A4 half-page standard compliant. No physical stamp needed.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 font-mono text-right">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Subtotal:</span>
                      <span>{formatCurrency(bill.subtotal || bill.netPayable)}</span>
                    </div>
                    {bill.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Card/Special Discount:</span>
                        <span>- {formatCurrency(bill.discountAmount)}</span>
                      </div>
                    )}
                    {bill.taxAmount && bill.taxAmount > 0 ? (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax / GST:</span>
                        <span>{formatCurrency(bill.taxAmount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-300 pt-1">
                      <span className="font-sans">GRAND TOTAL:</span>
                      <span>{formatCurrency(bill.netPayable)}</span>
                    </div>
                    {bill.dueAmount && bill.dueAmount > 0 ? (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Due Amount:</span>
                        <span>{formatCurrency(bill.dueAmount)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-200 pt-1 text-right text-[9px] font-mono text-slate-500">
                  Continued on Page {pageIndex + 2}...
                </div>
              )}

              {/* Signatures & Footer (Affixed at Bottom of Half-Page) */}
              <div className="absolute bottom-3 left-4 right-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
                <div>
                  Billed By: <strong className="text-slate-800">{bill.authorizedStaffName || 'Authorized Cashier'}</strong>
                </div>
                <div className="text-center text-[8px] text-slate-400 font-mono">
                  {pageIndex + 1} of {itemChunks.length}
                </div>
                <div className="text-right">
                  <span className="border-t border-slate-400 px-3 pt-0.5 inline-block text-slate-700 font-bold text-[8px] uppercase">
                    Authorized Signatory
                  </span>
                </div>
              </div>

              {/* Half-Page Cut Line Marker (Print visual guide) */}
              <div className="absolute -bottom-2 left-0 right-0 text-center text-[8px] text-slate-400 font-mono select-none print:block hidden">
                ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
