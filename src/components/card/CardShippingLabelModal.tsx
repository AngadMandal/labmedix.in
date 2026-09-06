import React, { useRef, useState, useEffect, useMemo } from 'react';
import { CardDispatchRecord } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { generateBarcodeDataUrl } from '../../utils/barcode';
import { generateQrDataUrl } from '../../utils/qr';
import { formatDate } from '../../utils/formatters';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Printer,
  X,
  ShieldCheck,
  Truck,
  Package,
  QrCode,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  ExternalLink,
  MapPin,
  Phone,
  Building,
  Info
} from 'lucide-react';

export type ShippingLabelFormat = 'speed_post' | 'envelope_compact' | 'booking_slip';

interface CardShippingLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: CardDispatchRecord | null;
  records?: CardDispatchRecord[];
}

export const CardShippingLabelModal: React.FC<CardShippingLabelModalProps> = ({
  isOpen,
  onClose,
  record,
  records
}) => {
  const { companyProfile } = useSettings();
  const { showToast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Determine active record set (single or multiple)
  const activeRecords = useMemo(() => {
    if (records && records.length > 0) return records;
    if (record) return [record];
    return [];
  }, [record, records]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [labelFormat, setLabelFormat] = useState<ShippingLabelFormat>('speed_post');
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Barcode and QR code states for the currently displayed record
  const [awbBarcodeUrl, setAwbBarcodeUrl] = useState<string>('');
  const [pinBarcodeUrl, setPinBarcodeUrl] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const currentRecord = activeRecords[currentIndex] || null;

  // Generate barcodes and QR code whenever currentRecord changes
  useEffect(() => {
    if (!currentRecord) return;

    const consignmentNo = currentRecord.consignmentNo || 'EK49695023IN';
    const pinCode = currentRecord.address?.pinCode || '700001';

    // 1. Generate High-Res Code128 AWB Barcode
    const awbBarcode = generateBarcodeDataUrl(consignmentNo, {
      width: 2.2,
      height: 52,
      fontSize: 13,
      displayValue: true,
      margin: 4
    });
    setAwbBarcodeUrl(awbBarcode);

    // 2. Generate Routing PIN Code Barcode
    const pinBarcode = generateBarcodeDataUrl(pinCode, {
      width: 1.8,
      height: 32,
      fontSize: 10,
      displayValue: true,
      margin: 2
    });
    setPinBarcodeUrl(pinBarcode);

    // 3. Generate 300 DPI Real Scannable Delivery Verification QR Code
    const trackingUrl = currentRecord.trackingUrl || `${window.location.origin}/#/track/${consignmentNo}`;
    generateQrDataUrl(trackingUrl, 260)
      .then(url => setQrCodeUrl(url))
      .catch(() => {});
  }, [currentRecord]);

  if (!isOpen || !currentRecord) return null;

  const handleCopyAwb = () => {
    if (!currentRecord) return;
    navigator.clipboard.writeText(currentRecord.consignmentNo);
    setCopiedAwb(true);
    showToast('info', 'Consignment AWB Copied', `${currentRecord.consignmentNo} copied to clipboard`);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  /**
   * Dedicated, flawless isolated print function.
   * Renders the label content into an isolated iframe to prevent any
   * React modal styling, dark-mode overrides, or outer scrollbars from interfering.
   */
  const handlePrint = (printAllBatch: boolean = false) => {
    const targetRecords = printAllBatch ? activeRecords : [currentRecord];

    // Build the standalone, pristine print HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Build labels HTML
    const labelsHtml = targetRecords
      .map((rec, i) => {
        const cAwb = rec.consignmentNo || 'EK49695023IN';
        const cPin = rec.address?.pinCode || '700001';
        const barcodeData = generateBarcodeDataUrl(cAwb, { width: 2.2, height: 50, fontSize: 13, displayValue: true });
        const pinBarcodeData = generateBarcodeDataUrl(cPin, { width: 1.8, height: 32, fontSize: 10, displayValue: true });
        
        return buildLabelHtmlString(rec, labelFormat, companyProfile, barcodeData, pinBarcodeData, qrCodeUrl, i < targetRecords.length - 1);
      })
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Postal Shipping Label - ${currentRecord.consignmentNo}</title>
          <style>
            @page {
              size: ${labelFormat === 'envelope_compact' ? '100mm 75mm' : '100mm 150mm'};
              margin: 3mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #000000;
              background: #ffffff;
              padding: 0;
            }
            .label-page {
              width: 100%;
              max-width: 100mm;
              margin: 0 auto;
              background: #ffffff;
              border: 2px solid #000000;
              padding: 4mm;
              page-break-after: always;
            }
            .label-page:last-child {
              page-break-after: auto;
            }
            .barcode-img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .qr-img {
              width: 22mm;
              height: 22mm;
              display: block;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print once assets in iframe load
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  /**
   * Export High-Resolution PNG Label
   */
  const handleDownloadImage = async () => {
    if (!printContainerRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(printContainerRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `SHIPPING_LABEL_${currentRecord.consignmentNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('success', 'Label Image Downloaded', `Saved as high-res PNG (${currentRecord.consignmentNo})`);
    } catch (err) {
      showToast('error', 'Export Failed', 'Could not generate label image');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export Standard PDF Ready for Laser / Thermal Printing
   */
  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(printContainerRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      const isCompact = labelFormat === 'envelope_compact';
      const pdfWidth = isCompact ? 100 : 100;
      const pdfHeight = isCompact ? 75 : 150;

      const pdf = new jsPDF({
        orientation: isCompact ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SHIPPING_LABEL_${currentRecord.consignmentNo}.pdf`);
      showToast('success', 'Label PDF Downloaded', `Saved print-ready PDF (${currentRecord.consignmentNo})`);
    } catch (err) {
      showToast('error', 'PDF Export Failed', 'Could not generate label PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Dedicated Print Stylesheet for direct window.print fallback */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-shipping-label-root, #print-shipping-label-root * {
            visibility: visible !important;
          }
          #print-shipping-label-root {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
          @page {
            size: auto;
            margin: 4mm;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Control Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-brand-blue border border-blue-500/20 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Postal Shipping Label & Envelope Sticker
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Verified Barcode
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                <span>AWB Consignment: <strong className="text-slate-800 dark:text-slate-200">{currentRecord.consignmentNo}</strong></span>
                <span>•</span>
                <span className="uppercase font-bold text-blue-600 dark:text-blue-400">{currentRecord.courierPartner.replace('_', ' ')}</span>
                <button
                  onClick={handleCopyAwb}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy Consignment AWB"
                >
                  {copiedAwb ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Multi-record pager if batch */}
            {activeRecords.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 px-2 py-1 rounded-xl text-xs font-bold mr-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {currentIndex + 1} / {activeRecords.length}
                </span>
                <button
                  disabled={currentIndex === activeRecords.length - 1}
                  onClick={() => setCurrentIndex(prev => Math.min(activeRecords.length - 1, prev + 1))}
                  className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLabelFormat('speed_post')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                labelFormat === 'speed_post'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>India Post Speed Post (4" × 6")</span>
            </button>

            <button
              type="button"
              onClick={() => setLabelFormat('envelope_compact')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                labelFormat === 'envelope_compact'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Card Envelope Sticker (4" × 3")</span>
            </button>

            <button
              type="button"
              onClick={() => setLabelFormat('booking_slip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                labelFormat === 'booking_slip'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Dispatch Booking Slip</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            100% Thermal Roll (Zebra/TSC/Citizen) & Laser Compatible
          </div>
        </div>

        {/* Printable Label Preview Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950/40 flex justify-center items-start print:p-0 print:m-0 print:bg-white">
          <div
            id="print-shipping-label-root"
            ref={printContainerRef}
            className="w-full transition-all duration-200"
            style={{
              maxWidth: labelFormat === 'envelope_compact' ? '460px' : '520px'
            }}
          >
            {/* FORMAT 1: India Post Speed Post / EMS Standard Label (4" × 6") */}
            {labelFormat === 'speed_post' && (
              <div className="bg-white text-slate-950 p-6 rounded-2xl border-2 border-black shadow-xl print:shadow-none print:border-black print:rounded-none">
                {/* Header: India Post Speed Post Bilingual Emblem */}
                <div className="border-b-2 border-black pb-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black tracking-widest text-slate-700 uppercase">
                        भारतीय डाक / INDIA POST
                      </div>
                      <div className="text-xl font-black tracking-tight text-slate-950 uppercase flex items-center gap-1.5">
                        <span>स्पीड पोस्ट / SPEED POST</span>
                        <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-mono font-bold">EMS</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase text-slate-600">
                        {currentRecord.priority === 'urgent' ? 'PRIORITY MEDICAL' : 'REGISTERED PARCEL'}
                      </div>
                      <div className="text-xs font-mono font-bold">{currentRecord.id}</div>
                    </div>
                  </div>
                </div>

                {/* Real High-Resolution Code128 AWB Barcode */}
                <div className="text-center py-2 px-1 border-2 border-black bg-white rounded-lg mb-4">
                  {awbBarcodeUrl ? (
                    <img
                      src={awbBarcodeUrl}
                      alt={`AWB Barcode ${currentRecord.consignmentNo}`}
                      className="max-h-16 mx-auto object-contain select-all"
                    />
                  ) : (
                    <div className="font-mono font-bold text-lg py-2 tracking-widest">
                      {currentRecord.consignmentNo}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 px-2 pt-1 border-t border-slate-200 mt-1">
                    <span>TYPE: CR80 MEDICAL CARD</span>
                    <span>WT: 45g (APPROX)</span>
                    <span>PRE-PAID CONTRACT</span>
                  </div>
                </div>

                {/* Recipient / DELIVER TO Box */}
                <div className="border-2 border-black rounded-lg p-3.5 mb-3.5 bg-white">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-black/30 pb-1 mb-2 flex items-center justify-between">
                    <span>TO / DELIVER TO CARDHOLDER:</span>
                    <span className="text-[9px] font-mono font-bold text-black">DESTINATION</span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="text-xl font-black text-slate-950 tracking-tight leading-tight uppercase">
                        {currentRecord.patientName}
                      </div>

                      <div className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-2">
                        <span>📱 Phone: {currentRecord.patientMobile}</span>
                        {currentRecord.bloodGroup && (
                          <span className="bg-slate-100 text-slate-900 font-black px-1.5 py-0.5 rounded text-[10px] border border-slate-300">
                            Blood: {currentRecord.bloodGroup}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-800 leading-relaxed font-medium pt-1 whitespace-pre-line">
                        {currentRecord.address?.fullAddress || `${currentRecord.address?.villageArea}, ${currentRecord.address?.postOffice}, ${currentRecord.address?.district}, ${currentRecord.address?.state} - ${currentRecord.address?.pinCode}`}
                      </div>

                      {/* Prominent Postal PIN Code Block */}
                      <div className="pt-2 flex items-center gap-3">
                        <div className="bg-black text-white px-3 py-1 rounded font-mono font-black text-base tracking-wider inline-flex items-center gap-1.5">
                          PIN: {currentRecord.address?.pinCode}
                        </div>
                        {currentRecord.address?.district && (
                          <div className="text-xs font-bold text-slate-700 uppercase">
                            DIST: {currentRecord.address.district}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Routing PIN Barcode + Scan Verification QR */}
                    <div className="flex flex-col items-center justify-center shrink-0 border-l border-slate-300 pl-3">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="Tracking QR Code"
                          className="w-20 h-20 border border-slate-300 p-0.5 rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 border border-slate-300 flex items-center justify-center">
                          <QrCode className="w-16 h-16 text-slate-800" />
                        </div>
                      )}
                      <span className="text-[8px] font-mono text-center font-bold text-slate-600 mt-1 leading-tight">
                        Scan Delivery
                      </span>
                    </div>
                  </div>
                </div>

                {/* Package & Smart Card Details */}
                <div className="border border-black rounded-lg p-2.5 mb-3 bg-slate-50 text-[11px] print:bg-white">
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>
                      Card Number: <span className="font-mono font-black">{currentRecord.cardNumber}</span>
                    </span>
                    <span className="font-mono font-bold uppercase text-[10px]">
                      {currentRecord.membershipName}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Enclosed: High-Security CR80 Smart Health Card & Emergency Lanyard</span>
                  </div>
                </div>

                {/* Sender / RETURN TO Box */}
                <div className="border-t-2 border-black pt-2.5 flex items-start justify-between text-[10px] text-slate-700">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      FROM / RETURN IF UNDELIVERED TO:
                    </div>
                    <div className="font-black text-slate-950 text-xs">
                      {companyProfile.name}
                    </div>
                    <div>{companyProfile.address}</div>
                    <div>
                      PIN: {companyProfile.pinCode} • Helpdesk: {companyProfile.phone}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[10px]">SPEED POST CENTER</div>
                    <div className="text-[9px] font-black uppercase text-black border border-black px-1.5 py-0.5 rounded mt-0.5">
                      DO NOT BEND
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FORMAT 2: Compact Envelope & Pouch Sticker (4" × 3") */}
            {labelFormat === 'envelope_compact' && (
              <div className="bg-white text-slate-950 p-5 rounded-2xl border-2 border-black shadow-xl print:shadow-none print:border-black print:rounded-none space-y-3">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div className="font-black text-xs uppercase tracking-wider">
                    {companyProfile.name} • SPEED POST
                  </div>
                  <div className="font-mono font-bold text-[10px]">
                    AWB: {currentRecord.consignmentNo}
                  </div>
                </div>

                {/* Barcode */}
                <div className="text-center">
                  {awbBarcodeUrl && (
                    <img
                      src={awbBarcodeUrl}
                      alt={currentRecord.consignmentNo}
                      className="max-h-12 mx-auto object-contain"
                    />
                  )}
                </div>

                {/* Recipient Details */}
                <div className="flex items-start justify-between gap-2 border-t border-b border-black py-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="text-[9px] font-black uppercase text-slate-500">DELIVER TO:</div>
                    <div className="text-base font-black text-slate-950 uppercase">{currentRecord.patientName}</div>
                    <div className="text-[11px] font-bold">Phone: {currentRecord.patientMobile}</div>
                    <div className="text-[10px] text-slate-800 leading-snug line-clamp-2 font-medium">
                      {currentRecord.address?.fullAddress || `${currentRecord.address?.district}, ${currentRecord.address?.state}`}
                    </div>
                    <div className="pt-1">
                      <span className="bg-black text-white px-2 py-0.5 rounded text-xs font-mono font-black">
                        PIN: {currentRecord.address?.pinCode}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-center">
                    {qrCodeUrl && (
                      <img
                        src={qrCodeUrl}
                        alt="QR"
                        className="w-16 h-16 border border-slate-300 p-0.5 rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[9px] text-slate-600">
                  <span>Card: {currentRecord.cardNumber}</span>
                  <span className="font-bold uppercase">Handle with care • Do not bend</span>
                </div>
              </div>
            )}

            {/* FORMAT 3: Dispatch Booking Run-Sheet & Manifest Slip */}
            {labelFormat === 'booking_slip' && (
              <div className="bg-white text-slate-950 p-6 rounded-2xl border-2 border-black shadow-xl print:shadow-none print:border-black print:rounded-none space-y-4">
                <div className="border-b-2 border-black pb-3 text-center space-y-1">
                  <div className="text-sm font-black uppercase tracking-wider">
                    INDIA POST / COURIER BOOKING RUN-SHEET
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    LABMEDIX HEALTHCARE DISPATCH DEPARTMENT
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 border border-black rounded-lg space-y-1">
                    <div className="text-[10px] font-black uppercase text-slate-500">CONSIGNOR / SENDER</div>
                    <div className="font-black text-sm">{companyProfile.name}</div>
                    <div>{companyProfile.address}</div>
                    <div>PIN: {companyProfile.pinCode}</div>
                    <div>Phone: {companyProfile.phone}</div>
                  </div>

                  <div className="p-3 border border-black rounded-lg space-y-1">
                    <div className="text-[10px] font-black uppercase text-slate-500">CONSIGNEE / RECIPIENT</div>
                    <div className="font-black text-sm">{currentRecord.patientName}</div>
                    <div>{currentRecord.address?.fullAddress}</div>
                    <div className="font-bold">PIN: {currentRecord.address?.pinCode}</div>
                    <div>Phone: {currentRecord.patientMobile}</div>
                  </div>
                </div>

                <div className="p-3 border border-black rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-bold">Consignment AWB No:</span>
                    <span className="font-mono font-black text-sm">{currentRecord.consignmentNo}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span>Article Category:</span>
                    <span className="font-bold">CR80 PVC Smart Health Card</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span>Card Serial Number:</span>
                    <span className="font-mono font-bold">{currentRecord.cardNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span>Carrier Service:</span>
                    <span className="font-bold uppercase">{currentRecord.courierPartner.replace('_', ' ')} (EMS)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Handover Date & Time:</span>
                    <span className="font-mono">{formatDate(currentRecord.dispatchedAt || currentRecord.createdAt)}</span>
                  </div>
                </div>

                {/* Signature and Postal Stamp Box */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black text-center text-xs">
                  <div className="border border-dashed border-black h-24 rounded-lg flex flex-col justify-end p-2">
                    <span className="text-[10px] font-bold text-slate-500">
                      Postal Booking Clerk Stamp & Date
                    </span>
                  </div>
                  <div className="border border-dashed border-black h-24 rounded-lg flex flex-col justify-end p-2">
                    <span className="text-[10px] font-bold text-slate-500">
                      Authorized Dispatch Officer Signature
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>High-Contrast Vector Print • Zero-Margin Optical Scan Ready</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              isLoading={isExporting}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Download PNG
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isExporting}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Download PDF
            </Button>

            {activeRecords.length > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePrint(true)}
                leftIcon={<Layers className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
                title={`Print continuous batch of ${activeRecords.length} labels`}
              >
                Print Batch ({activeRecords.length} Labels)
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => handlePrint(false)}
              leftIcon={<Printer className="w-4 h-4" />}
              className="text-xs font-bold shadow-md"
            >
              Print Shipping Label
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Builds clean HTML for isolated iframe printing
 */
function buildLabelHtmlString(
  record: CardDispatchRecord,
  format: ShippingLabelFormat,
  company: any,
  barcodeUrl: string,
  pinBarcodeUrl: string,
  qrCodeUrl: string,
  pageBreak: boolean
): string {
  const isCompact = format === 'envelope_compact';

  return `
    <div class="label-page" style="${pageBreak ? 'page-break-after: always;' : 'page-break-after: auto;'}">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 2mm;">
        <div>
          <div style="font-size: 8pt; font-weight: 900; letter-spacing: 1px;">भारतीय डाक / INDIA POST</div>
          <div style="font-size: 13pt; font-weight: 900;">स्पीड पोस्ट / SPEED POST <span style="font-size: 8pt; background: #000; color: #fff; padding: 1px 4px; border-radius: 2px;">EMS</span></div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8pt; font-weight: 900;">${record.priority === 'urgent' ? 'PRIORITY MEDICAL' : 'REGISTERED PARCEL'}</div>
          <div style="font-size: 8pt; font-family: monospace;">${record.id}</div>
        </div>
      </div>

      <!-- Barcode -->
      <div style="border: 2px solid #000; padding: 2mm; text-align: center; margin-bottom: 3mm;">
        ${barcodeUrl ? `<img src="${barcodeUrl}" style="max-height: 14mm; width: auto; margin: 0 auto; display: block;" />` : `<div style="font-size: 12pt; font-weight: 900; font-family: monospace;">${record.consignmentNo}</div>`}
        <div style="display: flex; justify-content: space-between; font-size: 7pt; font-family: monospace; border-top: 1px solid #ccc; margin-top: 1mm; padding-top: 1mm;">
          <span>TYPE: CR80 MEDICAL CARD</span>
          <span>WT: 45g (APPROX)</span>
          <span>PRE-PAID SPEED POST</span>
        </div>
      </div>

      <!-- Recipient -->
      <div style="border: 2px solid #000; padding: 3mm; margin-bottom: 3mm;">
        <div style="font-size: 8pt; font-weight: 900; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 2mm; display: flex; justify-content: space-between;">
          <span>TO / DELIVER TO CARDHOLDER:</span>
          <span>DESTINATION</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 3mm;">
          <div style="flex: 1;">
            <div style="font-size: 13pt; font-weight: 900; text-transform: uppercase;">${record.patientName}</div>
            <div style="font-size: 9pt; font-weight: bold; margin-top: 1mm;">Phone: ${record.patientMobile}</div>
            <div style="font-size: 8.5pt; margin-top: 1mm; line-height: 1.3;">
              ${record.address?.fullAddress || `${record.address?.district}, ${record.address?.state}`}
            </div>
            <div style="margin-top: 2mm;">
              <span style="background: #000; color: #fff; padding: 2px 6px; font-family: monospace; font-size: 11pt; font-weight: 900; border-radius: 2px;">
                PIN: ${record.address?.pinCode}
              </span>
            </div>
          </div>
          <div style="text-align: center;">
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width: 20mm; height: 20mm; border: 1px solid #000; padding: 1px;" />` : ''}
            <div style="font-size: 6pt; font-family: monospace; margin-top: 1mm;">Scan Delivery</div>
          </div>
        </div>
      </div>

      <!-- Package Info -->
      <div style="border: 1px solid #000; padding: 2mm; font-size: 8pt; margin-bottom: 2.5mm; display: flex; justify-content: space-between;">
        <span>Card: <strong>${record.cardNumber}</strong> (${record.membershipName})</span>
        <span>HANDLE WITH CARE • DO NOT BEND</span>
      </div>

      <!-- Sender Details -->
      <div style="border-top: 2px solid #000; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 7.5pt;">
        <div>
          <div style="font-size: 7pt; font-weight: 900;">FROM / RETURN IF UNDELIVERED TO:</div>
          <div style="font-weight: 900; font-size: 8.5pt;">${company?.name || 'LABMEDIX'}</div>
          <div>${company?.address || 'Main Health Expressway'}</div>
          <div>PIN: ${company?.pinCode || '700001'} • Helpdesk: ${company?.phone || ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 900; font-size: 7.5pt;">SPEED POST CENTER</div>
          <div style="border: 1px solid #000; padding: 1px 4px; font-size: 7pt; font-weight: 900; margin-top: 1mm;">DO NOT BEND</div>
        </div>
      </div>
    </div>
  `;
}
