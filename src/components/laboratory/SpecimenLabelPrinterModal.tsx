import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { LabOrderRecord, SpecimenRecord, PrinterLabelFormat } from '../../types';
import { LaboratoryService } from '../../services/laboratoryService';
import { StorageService } from '../../services/storage';
import { RealBarcode } from '../common/RealBarcode';
import { generateQrDataUrl } from '../../utils/qr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateTime } from '../../utils/formatters';
import {
  Printer,
  Tag,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Settings2
} from 'lucide-react';

export interface SpecimenLabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: LabOrderRecord | null;
  specimen?: SpecimenRecord | null;
}

export const SpecimenLabelPrinterModal: React.FC<SpecimenLabelPrinterModalProps> = ({
  isOpen,
  onClose,
  order: propOrder,
  specimen: propSpecimen
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [labelFormat, setLabelFormat] = useState<PrinterLabelFormat>('tube_50x25');
  const [reprintReason, setReprintReason] = useState('Damaged label on tube');
  const [customReprintReason, setCustomReprintReason] = useState('');
  const [isReprinting, setIsReprinting] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const company = StorageService.getCompanyProfile();

  // Resolve order and specimen
  const order = propOrder || (propSpecimen ? LaboratoryService.getById(propSpecimen.labOrderId) : null);
  const specimen = propSpecimen || (order ? LaboratoryService.getAllSpecimens().find(s => s.labOrderId === order.id || s.barcode === order.sampleBarcode) : null);

  const barcodeValue = specimen?.barcode || order?.sampleBarcode || 'SMP-000000';
  const accessionNo = specimen?.accessionNumber || order?.accessionNumber || 'ACC-2026-PENDING';
  const printCount = specimen?.labelPrintCount || 0;
  const isReprint = printCount > 0;

  useEffect(() => {
    if (barcodeValue && order) {
      const qrPayload = JSON.stringify({
        acc: accessionNo,
        bar: barcodeValue,
        patId: order.patientId,
        patName: order.patientName,
        test: order.testName,
        dt: order.createdAt,
        lab: 'Labmedix Diagnostics'
      });
      generateQrDataUrl(qrPayload, 150).then(url => setQrCodeDataUrl(url)).catch(() => {});
    }
  }, [barcodeValue, order, accessionNo]);

  if (!order && !specimen) return null;

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
    showToast('info', 'Barcode Copied', barcodeValue);
  };

  const handleExecutePrint = () => {
    const staffName = currentUser?.fullName || 'Phlebotomy Technician';

    if (isReprint) {
      const reason = reprintReason === 'Other' ? customReprintReason.trim() || 'Unspecified reason' : reprintReason;
      if (specimen) {
        LaboratoryService.recordLabelReprint(specimen.id, reason, staffName);
      }
    } else if (specimen) {
      specimen.labelPrintCount = 1;
      specimen.lastLabelPrintedAt = new Date().toISOString();
      LaboratoryService.saveSpecimens(LaboratoryService.getAllSpecimens());
    }

    // Trigger browser print
    window.print();
    showToast('success', 'Label Dispatched to Printer', `Printing ${labelFormat.replace('_', ' ')} label.`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Specimen Barcode Tube Label"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Printer Dimension Controls */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <Settings2 className="w-4 h-4 text-teal-400" />
            <span>Label Printer Dimension:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setLabelFormat('tube_50x25')}
              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition border ${
                labelFormat === 'tube_50x25'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              50 × 25 mm (Vacutainer)
            </button>
            <button
              onClick={() => setLabelFormat('tube_50x30')}
              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition border ${
                labelFormat === 'tube_50x30'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              50 × 30 mm (Standard)
            </button>
            <button
              onClick={() => setLabelFormat('bag_75x50')}
              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition border ${
                labelFormat === 'bag_75x50'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              75 × 50 mm (Transport Bag)
            </button>
            <button
              onClick={() => setLabelFormat('pediatric_38x19')}
              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition border ${
                labelFormat === 'pediatric_38x19'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              38 × 19 mm (Pediatric)
            </button>
          </div>
        </div>

        {/* Reprint Protection Alert Banner */}
        {isReprint && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Authorized Barcode Reprint Protection (Print #{printCount + 1})</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              This specimen barcode has already been printed. In compliance with hospital safety guidelines, reprinting retains the existing accession identity and records an audit log entry.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="text-slate-300 font-bold">Reprint Reason *</label>
              <select
                value={reprintReason}
                onChange={(e) => setReprintReason(e.target.value)}
                className="p-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white text-xs font-medium focus:outline-none"
              >
                <option value="Damaged label on tube">Damaged label on tube</option>
                <option value="Smudged / unreadable barcode">Smudged / unreadable barcode</option>
                <option value="Printer paper jam / misprint">Printer paper jam / misprint</option>
                <option value="Label detached in transport">Label detached in transport</option>
                <option value="Secondary aliquot tube requirement">Secondary aliquot tube requirement</option>
                <option value="Other">Other clinical justification</option>
              </select>

              {reprintReason === 'Other' && (
                <input
                  type="text"
                  value={customReprintReason}
                  onChange={(e) => setCustomReprintReason(e.target.value)}
                  placeholder="Specify reason..."
                  className="p-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white text-xs"
                />
              )}
            </div>
          </div>
        )}

        {/* Real-time Label Preview Card (Rendered for Screen & Thermal Print) */}
        <div className="flex justify-center p-6 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div
            ref={printAreaRef}
            className={`bg-white text-black p-3 rounded-lg shadow-2xl border border-slate-300 flex flex-col justify-between select-none ${
              labelFormat === 'tube_50x25'
                ? 'w-[320px] min-h-[160px]'
                : labelFormat === 'tube_50x30'
                ? 'w-[320px] min-h-[190px]'
                : labelFormat === 'bag_75x50'
                ? 'w-[400px] min-h-[250px]'
                : 'w-[260px] min-h-[130px]'
            }`}
            style={{ fontFamily: 'monospace' }}
          >
            {/* Header: Facility & Accession */}
            <div className="flex items-center justify-between border-b border-black pb-1">
              <span className="font-black text-xs tracking-wider uppercase">LABMEDIX</span>
              <span className="font-bold text-[10px] bg-black text-white px-1 rounded">
                {order?.priority === 'stat' ? 'STAT' : order?.priority === 'urgent' ? 'URGENT' : 'ROUTINE'}
              </span>
              <span className="font-bold text-[10px]">{accessionNo}</span>
            </div>

            {/* Patient Demographics */}
            <div className="pt-1 leading-tight">
              <div className="font-black text-xs truncate">{order?.patientName || 'PATIENT NAME'}</div>
              <div className="text-[10px] text-gray-700">
                <span>ID: {order?.patientId.slice(0, 10)}</span> •{' '}
                <span>{order?.patientAge || 0}Y/{order?.patientGender?.[0]?.toUpperCase() || 'M'}</span> •{' '}
                <span className="truncate">{order?.testName}</span>
              </div>
              <div className="text-[9px] text-gray-600 truncate">
                {order?.department} • {order?.sampleTubeType || 'EDTA'}
              </div>
            </div>

            {/* High-Definition Barcode + QR */}
            <div className="py-1 flex items-center justify-between gap-1">
              <div className="flex-1 flex flex-col items-center">
                <RealBarcode
                  value={barcodeValue}
                  barWidth={1.2}
                  height={labelFormat === 'pediatric_38x19' ? 26 : 34}
                  showText={true}
                />
              </div>
              {qrCodeDataUrl && labelFormat !== 'pediatric_38x19' && (
                <img src={qrCodeDataUrl} alt="QR" className="w-10 h-10 object-contain ml-1" />
              )}
            </div>

            {/* Footer: Date, Collector & Print Timestamp */}
            <div className="flex items-center justify-between border-t border-black pt-0.5 text-[8px] text-gray-600">
              <span>{formatDateTime(new Date().toISOString()).split(',')[0]}</span>
              <span>Col: {order?.phlebotomistName ? order.phlebotomistName.split(' ')[0] : 'Phleb'}</span>
              {isReprint && <span className="font-bold text-red-600">REPRINT #{printCount + 1}</span>}
            </div>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCopyBarcode}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition flex items-center gap-1.5"
          >
            {copiedBarcode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Barcode: {barcodeValue}</span>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={handleExecutePrint}>
              <Printer className="w-4 h-4 mr-1.5" />
              <span>{isReprint ? 'Authorize & Print Label' : 'Print Specimen Label'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
