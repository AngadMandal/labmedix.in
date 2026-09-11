import React from 'react';
import { Modal } from '../common/Modal';
import { PharmacySale, Patient, HealthCard } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Printer, CheckCircle, ShieldCheck, Pill } from 'lucide-react';

interface PharmacyBillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: PharmacySale | null;
  patient?: Patient | null;
  card?: HealthCard | null;
}

export const PharmacyBillPrintModal: React.FC<PharmacyBillPrintModalProps> = ({
  isOpen,
  onClose,
  sale,
  patient,
  card
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDue = (sale.dueAmount || 0) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pharmacy Tax Invoice: ${sale.invoiceNumber}`}
      maxWidth="4xl"
    >
      <div className="space-y-6 text-slate-800 dark:text-slate-200 printable-pharmacy-invoice">
        {/* ACTION BAR (Hidden in print) */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-xs">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-white">Official Tax Invoice Generated</span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {sale.invoiceNumber} • Live Firestore Ledger Synced
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice (A4 / Thermal)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* INVOICE PAPER CONTAINER */}
        <div className="p-6 md:p-8 rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-xl dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 space-y-6">
          {/* 1. HEADER */}
          <div className="border-b-2 border-emerald-600 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-600 text-white">
                  <Pill className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    LabMedix Healthcare Pharmacy
                  </h1>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Hospital & Day Care Dispensing Division • 24x7 In-House Pharmacy
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-2">
                <p>Kolkata Main Hospital Campus, Sector V, Bidhannagar, Kolkata, WB 700091</p>
                <p className="font-mono">
                  <strong>Drug Lic No:</strong> WB-KOL-20B-184920 & WB-KOL-21B-443912 • <strong>GSTIN:</strong> 19AAECM4421P1Z4
                </p>
                <p>Phone: +91 98310 12345 • Email: pharmacy@labmedix.in</p>
              </div>
            </div>

            <div className="text-right md:min-w-[200px]">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 mb-1">
                RETAIL TAX INVOICE (CASH/CREDIT)
              </span>
              <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                {sale.invoiceNumber}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Date: {formatDateTime(sale.saleDate)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Payment: <strong className="uppercase">{sale.paymentMethod}</strong>
              </div>
            </div>
          </div>

          {/* 2. PATIENT & PRESCRIBER METADATA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Patient / Customer</span>
              <strong className="text-sm text-slate-900 dark:text-white block mt-0.5">
                {sale.patientName}
              </strong>
              {sale.patientPhone && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Phone: {sale.patientPhone}
                </div>
              )}
              {sale.patientId && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  UHID: {sale.patientId}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Health Card & Tier</span>
              {sale.patientCardNo ? (
                <div className="mt-0.5 space-y-0.5">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {sale.patientCardNo}
                  </span>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400">
                    Tier: <strong className="capitalize">{sale.cardTier || card?.tier || (card as any)?.membershipTier || 'Family Shield'}</strong>
                  </div>
                  {sale.healthCardDiscount > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Savings Applied: {formatCurrency(sale.healthCardDiscount)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">Standard Retail Pricing</div>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Prescribing Doctor</span>
              <strong className="text-xs text-slate-900 dark:text-white block mt-0.5">
                {sale.prescribingDoctor || 'Hospital Out-Patient Department (OPD)'}
              </strong>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Dispensed by: {sale.dispensedBy}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Category: <span className="capitalize">{sale.saleType.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* 3. ITEMS TABLE */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Medicine Description</th>
                  <th className="px-3 py-2.5">Batch</th>
                  <th className="px-3 py-2.5">Expiry</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">MRP</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="px-3 py-2.5 text-right">Disc %</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-900 dark:text-white">{item.medicineName}</div>
                      <div className="text-[9px] text-slate-500 font-mono">GST: {item.taxGstPercent}%</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {item.batchNumber}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {item.expiryDate}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500">
                      {formatCurrency(item.mrp)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {item.discountPercent > 0 ? `${item.discountPercent}%` : '0%'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. FINANCIAL TOTALS & TAX BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">
                Statutory GST Breakdown
              </span>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Taxable Value:</span>
                <span className="font-mono">{formatCurrency(Math.max(0, sale.netTotal - sale.taxAmount))}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>CGST (Central Tax 6%):</span>
                <span className="font-mono">{formatCurrency(Math.round((sale.taxAmount / 2) * 100) / 100)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>SGST (State Tax 6%):</span>
                <span className="font-mono">{formatCurrency(Math.round((sale.taxAmount / 2) * 100) / 100)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span>Total Tax Included:</span>
                <span className="font-mono">{formatCurrency(sale.taxAmount)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Gross Amount:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Total Discount Savings:</span>
                  <span>-{formatCurrency(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t-2 border-slate-200 dark:border-slate-800">
                <span>Net Payable:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(sale.netTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Amount Paid ({sale.paymentMethod}):</span>
                <span className="font-bold">{formatCurrency(sale.paidAmount)}</span>
              </div>
              {isDue && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-black">
                  <span>Due Balance:</span>
                  <span>{formatCurrency(sale.dueAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. FOOTER & VERIFICATION STAMP */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-end gap-6 text-[10px] text-slate-500 dark:text-slate-400">
            <div className="space-y-1 max-w-md">
              <p className="font-bold text-slate-700 dark:text-slate-300">Terms & Conditions:</p>
              <p>1. Medicines once dispensed cannot be returned without the original tax invoice within 48 hours.</p>
              <p>2. Refrigerated & Schedule H/X medications cannot be returned under drug control regulations.</p>
              <p>3. Store all drugs in a cool, dry place away from direct sunlight and out of children's reach.</p>
              <p className="text-[9px] font-mono text-slate-400 mt-2">
                Digital Computer-Generated Invoice • Authentication Seal: LABMEDIX-RX-{sale.id.slice(-6).toUpperCase()}
              </p>
            </div>

            <div className="text-center min-w-[180px] space-y-3">
              <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Authorized Pharmacist</p>
                <p className="text-[9px] font-mono">Reg No: WB-PRX-49102</p>
                <p className="text-[9px]">LabMedix Healthcare Pharmacy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
