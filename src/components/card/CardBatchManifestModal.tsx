import React, { useState, useRef } from 'react';
import { CardDispatchRecord, CardCourierPartner, CardDispatchBatch } from '../../types';
import { CardDispatchService } from '../../services/cardDispatchService';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import {
  Printer,
  X,
  Truck,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  Layers,
  MapPin
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface CardBatchManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRecords: CardDispatchRecord[];
  onBatchCreated: (batch: CardDispatchBatch) => void;
}

export const CardBatchManifestModal: React.FC<CardBatchManifestModalProps> = ({
  isOpen,
  onClose,
  selectedRecords,
  onBatchCreated
}) => {
  const { currentUser } = useAuth();
  const { companyProfile } = useSettings();
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [batchName, setBatchName] = useState(`Morning Handover Run #${new Date().toLocaleDateString()}`);
  const [courierPartner, setCourierPartner] = useState<CardCourierPartner>('speed_post');
  const [pickupPerson, setPickupPerson] = useState('Anirban Chatterjee (Pickup Associate)');
  const [pickupPhone, setPickupPhone] = useState('+91 98300 22334');
  const [createdBatch, setCreatedBatch] = useState<CardDispatchBatch | null>(null);

  if (!isOpen || selectedRecords.length === 0) return null;

  const handleGenerateBatch = () => {
    const batch = CardDispatchService.createBatchManifest(
      batchName.trim(),
      courierPartner,
      selectedRecords.map(r => r.id),
      currentUser?.fullName || 'Dispatch Manager',
      pickupPerson.trim(),
      pickupPhone.trim()
    );
    setCreatedBatch(batch);
    onBatchCreated(batch);
    showToast('success', `Batch manifest ${batch.manifestNumber} generated successfully!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      {/* Scoped print styles to ensure only manifest prints */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-manifest-root, #print-manifest-root * {
            visibility: visible !important;
          }
          #print-manifest-root {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-brand-blue border border-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Courier Handover Manifest Run-Sheet Generator
              </h3>
              <p className="text-xs text-slate-500">
                Consolidated batch dispatch of {selectedRecords.length} packaged card parcels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration or Printable Manifest View */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 print:p-0 print:m-0 print:bg-white">
          {!createdBatch ? (
            <div className="space-y-6">
              {/* Batch Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Batch Run Name</label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={e => setBatchName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Courier Logistics Partner</label>
                  <select
                    value={courierPartner}
                    onChange={e => setCourierPartner(e.target.value as CardCourierPartner)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    <option value="speed_post">India Post Speed Post</option>
                    <option value="bluedart">Blue Dart Express</option>
                    <option value="delhivery">Delhivery Healthcare Logistics</option>
                    <option value="dtdc">DTDC Air Express</option>
                    <option value="executive_hand">Hospital Field Executive Team</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Courier Pickup Agent Name</label>
                  <input
                    type="text"
                    value={pickupPerson}
                    onChange={e => setPickupPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Courier Pickup Phone</label>
                  <input
                    type="text"
                    value={pickupPhone}
                    onChange={e => setPickupPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Selected Parcels Summary List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Included Parcels ({selectedRecords.length})
                  </span>
                  <span className="text-xs font-bold text-brand-blue">
                    Total Estimated Weight: {(selectedRecords.length * 0.085).toFixed(2)} kg
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {selectedRecords.map((r, idx) => (
                    <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-mono font-bold text-slate-400">{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{r.patientName}</span>
                            <span className="font-mono text-brand-blue text-[11px] font-semibold">{r.cardNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>📱 {r.patientMobile}</span>
                            <span>•</span>
                            <span className="truncate max-w-xs">{r.address?.district || 'Kolkata'} - {r.address?.pinCode}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        AWB: {r.consignmentNo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" onClick={handleGenerateBatch} className="gap-1.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                  Generate Official Pickup Manifest
                </Button>
              </div>
            </div>
          ) : (
            <div id="print-manifest-root" ref={printRef} className="bg-white text-slate-950 p-6 rounded-2xl border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0">
              {/* Printable Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-950 pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">{companyProfile.name}</h2>
                  <p className="text-xs text-slate-600 font-medium">{companyProfile.address} • Phone: {companyProfile.phone}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">LOGISTICS & DISPATCH DIVISION • CARD FULFILLMENT RUN-SHEET</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase text-slate-500">MANIFEST NO.</div>
                  <div className="text-base font-mono font-black text-slate-950">{createdBatch.manifestNumber}</div>
                  <div className="text-xs font-bold text-slate-600 mt-1">Date: {formatDate(createdBatch.createdAt)}</div>
                </div>
              </div>

              {/* Logistics Metadata */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 text-xs">
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500">COURIER SERVICE</div>
                  <div className="font-black text-slate-900 text-sm">{createdBatch.courierPartner.toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500">PICKUP ASSOCIATE</div>
                  <div className="font-bold text-slate-900">{createdBatch.courierPickupPerson} ({createdBatch.courierPickupPhone})</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500">PARCEL COUNT & TOTAL WT</div>
                  <div className="font-bold text-slate-900">{createdBatch.totalCards} Parcels • {(createdBatch.totalCards * 0.085).toFixed(2)} kg</div>
                </div>
              </div>

              {/* Table of Consignments */}
              <table className="w-full text-left text-xs border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-950 bg-slate-100">
                    <th className="py-2 px-2 font-black w-8">#</th>
                    <th className="py-2 px-2 font-black">Consignment AWB</th>
                    <th className="py-2 px-2 font-black">Card Number</th>
                    <th className="py-2 px-2 font-black">Recipient Name & Contact</th>
                    <th className="py-2 px-2 font-black">Destination & PIN</th>
                    <th className="py-2 px-2 font-black text-center w-20">Courier Initial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedRecords.map((r, idx) => (
                    <tr key={r.id} className="py-2">
                      <td className="py-2 px-2 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-mono font-bold text-slate-900">{r.consignmentNo}</td>
                      <td className="py-2 px-2 font-mono text-slate-700">{r.cardNumber}</td>
                      <td className="py-2 px-2">
                        <div className="font-bold text-slate-900">{r.patientName}</div>
                        <div className="text-[10px] text-slate-500">{r.patientMobile}</div>
                      </td>
                      <td className="py-2 px-2">
                        <div>{r.address?.district || 'Kolkata'}</div>
                        <div className="font-mono font-bold text-[10px]">{r.address?.pinCode}</div>
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-mono"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-950 text-xs">
                <div className="border-t border-dashed border-slate-400 pt-2 text-center">
                  <div className="font-bold text-slate-900">Hospital Logistics Officer Signature</div>
                  <div className="text-[10px] text-slate-500">Name: {currentUser?.fullName || 'Super Admin'} • Date: {formatDate(new Date().toISOString())}</div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-2 text-center">
                  <div className="font-bold text-slate-900">Courier Pickup Associate Signature & Seal</div>
                  <div className="text-[10px] text-slate-500">Name: {createdBatch.courierPickupPerson}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 print:hidden">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {createdBatch && (
            <Button variant="primary" onClick={handlePrint} className="gap-1.5 shadow-md">
              <Printer className="w-4 h-4" />
              Print Manifest Run-Sheet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
