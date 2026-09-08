import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { BloodTestBooking, PortalService } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  TestTube,
  Truck,
  UserCheck,
  Tag,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  Phone,
  ThermometerSnowflake,
  Box,
  Share2,
  Navigation,
  Check,
  Copy,
  Gauge,
  Calendar,
  Radio,
  ExternalLink
} from 'lucide-react';

export interface PhlebotomySampleDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BloodTestBooking | null;
  onStatusUpdated: () => void;
  onOpenLabelPrinter: (booking: BloodTestBooking) => void;
}

export const PHLEBOTOMIST_PRESETS = [
  {
    id: 'phleb_1',
    name: 'Ramesh Kumar',
    phone: '+91 98301 88221',
    badge: 'Sr. Field Phlebotomist',
    bagId: 'BAG-COL-14',
    vehicle: 'WB-02-AK-4821 (Hero Splendor)',
    status: 'Active on Road',
    completedToday: 7
  },
  {
    id: 'phleb_2',
    name: 'Sunil Das',
    phone: '+91 98302 44332',
    badge: 'Express Home Collector',
    bagId: 'BAG-COL-09',
    vehicle: 'WB-06-B-9912 (Honda Activa)',
    status: 'Available at Central Hub',
    completedToday: 5
  },
  {
    id: 'phleb_3',
    name: 'Amit Roy',
    phone: '+91 98303 99110',
    badge: 'Central Lab Phlebotomy Lead',
    bagId: 'BAG-COL-03',
    vehicle: 'WB-01-EF-2319 (TVS Apache)',
    status: 'In Transit to Lab',
    completedToday: 9
  },
  {
    id: 'phleb_4',
    name: 'Priya Sen',
    phone: '+91 98304 66778',
    badge: 'Pediatric & Geriatric Specialist',
    bagId: 'BAG-COL-18',
    vehicle: 'WB-08-C-7741 (Suzuki Access)',
    status: 'Available at North Hub',
    completedToday: 4
  }
];

export const PhlebotomySampleDispatchModal: React.FC<PhlebotomySampleDispatchModalProps> = ({
  isOpen,
  onClose,
  booking,
  onStatusUpdated,
  onOpenLabelPrinter
}) => {
  const { showToast } = useToast();
  const company = StorageService.getCompanyProfile();

  // Selected Collector state
  const [selectedPhlebId, setSelectedPhlebId] = useState(booking?.phlebotomistId || PHLEBOTOMIST_PRESETS[0].id);
  const [customPhlebName, setCustomPhlebName] = useState(booking?.assignedPhlebotomist || '');
  const [customPhlebPhone, setCustomPhlebPhone] = useState(booking?.phlebotomistPhone || '');
  const [customVehicle, setCustomVehicle] = useState(booking?.phlebotomistVehicle || '');
  const [customBagId, setCustomBagId] = useState(booking?.phlebotomistBagId || '');

  // Specimen & Barcode state
  const [tubeType, setTubeType] = useState(booking?.sampleTubeType || 'edta_purple');
  const [sampleBarcode, setSampleBarcode] = useState(booking?.sampleBarcode || '');
  const [boxSealBarcode, setBoxSealBarcode] = useState(
    () => booking?.boxSealBarcode || `BOX-CC-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Cold Chain state
  const [coldChainTemp, setColdChainTemp] = useState<number>(() => {
    if (booking?.coldChainTemperature) {
      const parsed = parseFloat(booking.coldChainTemperature);
      if (!isNaN(parsed)) return parsed;
    }
    return 3.8;
  });
  const [icePackVerified, setIcePackVerified] = useState<boolean>(booking?.icePackVerified ?? true);

  // ETA & Distance Engine
  const [distanceKm, setDistanceKm] = useState<number>(() => booking?.distanceKm || 3.8);
  const [trafficMode, setTrafficMode] = useState<'normal' | 'heavy' | 'express'>('normal');
  const [scheduledSlot, setScheduledSlot] = useState(booking?.scheduledTime || '07:30 AM - 08:30 AM (Fasting)');
  const [dispatchNotes, setDispatchNotes] = useState(booking?.dispatchNotes || '');

  // Logistics Stage
  const [logisticsStage, setLogisticsStage] = useState<NonNullable<BloodTestBooking['logisticsStage']>>(() => {
    if (booking?.logisticsStage) return booking.logisticsStage;
    if (booking?.status === 'sample_collected') return 'sample_secured';
    if (booking?.status === 'processing') return 'delivered_accession';
    return 'collector_dispatched';
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!booking) return null;

  // Selected Collector details
  const selectedPreset = PHLEBOTOMIST_PRESETS.find(p => p.id === selectedPhlebId);
  const finalPhlebName = customPhlebName.trim() || selectedPreset?.name || 'Ramesh Kumar';
  const finalPhlebPhone = customPhlebPhone.trim() || selectedPreset?.phone || '+91 98301 88221';
  const finalVehicle = customVehicle.trim() || selectedPreset?.vehicle || 'WB-02-AK-4821 (Hero Splendor)';
  const finalBagId = customBagId.trim() || selectedPreset?.bagId || 'BAG-COL-14';

  // Dynamic ETA Calculation
  const trafficMultiplier = trafficMode === 'heavy' ? 7.5 : trafficMode === 'express' ? 3.5 : 4.8;
  const collectionEtaMinutes = Math.max(8, Math.round(distanceKm * trafficMultiplier + 5));
  const labTransitEtaMinutes = Math.max(15, Math.round(distanceKm * trafficMultiplier * 1.1 + 12));

  const formatFutureTime = (addMinutes: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + addMinutes);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const collectionEtaTime = useMemo(() => formatFutureTime(collectionEtaMinutes), [collectionEtaMinutes]);
  const labTransitEtaTime = useMemo(() => formatFutureTime(collectionEtaMinutes + labTransitEtaMinutes), [collectionEtaMinutes, labTransitEtaMinutes]);
  const expectedReportEta = booking?.expectedReportEta || 'Today by 06:30 PM (Within 8 Hours)';

  const tubeOptions = [
    { value: 'edta_purple', label: 'EDTA K2/K3 (Lavender Cap) - CBC, HbA1c, ESR, Blood Group', color: '#8B5CF6' },
    { value: 'sst_gold', label: 'SST Gel / Clot Activator (Gold/Yellow Cap) - Lipid, LFT, KFT, Thyroid', color: '#FBBF24' },
    { value: 'fluoride_gray', label: 'Sodium Fluoride (Grey Cap) - Fasting Glucose, PPBS, Blood Sugar', color: '#94A3B8' },
    { value: 'citrate_blue', label: 'Sodium Citrate 3.2% (Light Blue Cap) - PT/INR, Coagulation Profile', color: '#38BDF8' },
    { value: 'heparin_green', label: 'Sodium Heparin (Green Cap) - Electrolytes, Arterial Blood Gases', color: '#10B981' }
  ];

  // Cold Chain Verification
  const isColdChainOptimal = coldChainTemp >= 2.0 && coldChainTemp <= 8.0;
  const isColdChainFreezingRisk = coldChainTemp < 2.0;
  const isColdChainExcursion = coldChainTemp > 8.0;

  // WhatsApp Alert Generator
  const generateWhatsAppMessage = () => {
    return (
`*${(company.name || 'LABMEDIX DIAGNOSTICS').toUpperCase()} — PHLEBOTOMY FLEET DISPATCH ALERT* 🧪🛵

Dear *${booking.patientName}*,
Your diagnostic sample collection is dispatched and on route to your location!

📋 *Order Details:*
• Order No: *${booking.bookingNo}*
• Investigation: *${booking.testName}*
• Scheduled Slot: *${scheduledSlot}*

👤 *Assigned Field Phlebotomist:*
• Collector: *${finalPhlebName}*
• Contact No: *${finalPhlebPhone}*
• Vehicle No: *${finalVehicle}*
• Kit / Bag ID: *${finalBagId}*

⏱️ *Real-Time ETA & Transit:*
• Estimated Doorstep Arrival: *~${collectionEtaMinutes} mins* (Approx. *${collectionEtaTime}*)
• Distance: *${distanceKm.toFixed(1)} km*
• Expected Central Lab Handover: *${labTransitEtaTime}*
• Estimated Report Release: *${expectedReportEta}*

❄️ *Cold-Chain & Biosafety Security:*
• Carrier Box Seal: *${boxSealBarcode}*
• Temperature Maintained: *${coldChainTemp.toFixed(1)}°C* (WHO/NABL 2°C - 8°C Certified)
• Ice Pack Integrity: *${icePackVerified ? 'Verified Frozen PCM' : 'Standard Gel'}*

${booking.fastingRequired ? '⚠️ *Fasting Reminder:* Please maintain 10-12 hours fasting before blood draw.' : '✅ *Note:* Routine specimen, no fasting required.'}

Need help? Call Central Laboratory Helpline: ${company.phone || '+91 98301 88221'}`
    );
  };

  const handleSendWhatsAppAlert = () => {
    const rawPhone = booking.patientPhone || '9830012345';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    showToast(
      'success',
      'WhatsApp Dispatch Alert Generated',
      `Dispatch & ETA message prepared for ${booking.patientName} (${rawPhone}).`
    );
  };

  const handleCopyAlertText = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    showToast('info', 'Copied to Clipboard', 'Phlebotomist dispatch details copied.');
  };

  const handleDispatchAndSave = () => {
    setIsProcessing(true);

    setTimeout(() => {
      // Determine mapped status
      let targetStatus: BloodTestBooking['status'] = 'phlebotomist_assigned';
      if (logisticsStage === 'sample_secured' || logisticsStage === 'in_transit_lab') {
        targetStatus = 'sample_collected';
      } else if (logisticsStage === 'delivered_accession') {
        targetStatus = 'processing';
      }

      const updated = PortalService.updateBookingLogistics(booking.id, {
        status: targetStatus,
        phlebotomistId: selectedPhlebId,
        assignedPhlebotomist: finalPhlebName,
        phlebotomistPhone: finalPhlebPhone,
        phlebotomistVehicle: finalVehicle,
        phlebotomistBagId: finalBagId,
        boxSealBarcode,
        sampleTubeType: tubeType,
        coldChainTemperature: `${coldChainTemp.toFixed(1)}°C`,
        coldChainVerified: isColdChainOptimal,
        icePackVerified,
        distanceKm,
        collectionEtaMinutes,
        collectionEtaTime,
        labTransitEtaMinutes,
        labTransitEtaTime,
        expectedReportEta,
        logisticsStage,
        dispatchTimestamp: new Date().toISOString(),
        dispatchNotes: dispatchNotes.trim() || undefined
      });

      setIsProcessing(false);
      triggerCelebrationFireworks();

      const stageLabels: Record<string, string> = {
        collector_dispatched: `Phlebotomist ${finalPhlebName} dispatched with Vehicle ${finalVehicle}`,
        at_location: `Collector arrived at patient location`,
        sample_secured: `Specimen secured in cold-chain box ${boxSealBarcode} (${coldChainTemp.toFixed(1)}°C)`,
        in_transit_lab: `Specimen in transit to Central Processing Lab`,
        delivered_accession: `Specimen delivered to Central Laboratory accessioning station`
      };

      showToast(
        'success',
        'Phlebotomy Logistics Updated',
        `${booking.bookingNo}: ${stageLabels[logisticsStage] || 'Logistics confirmed'}.`
      );

      onStatusUpdated();
      onClose();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Phlebotomy Sample Dispatch & Logistics: ${booking.bookingNo}`}
      maxWidth="4xl"
    >
      <div className="space-y-5 text-xs text-slate-200">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 border border-teal-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 shadow-md">
              <Truck className="w-6 h-6 text-teal-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  {booking.bookingNo}
                </span>
                <span className="text-[10px] font-bold uppercase text-amber-400 font-mono flex items-center gap-1">
                  {booking.collectionType === 'home_collection' ? '🏠 Doorstep Collection' : '🏥 Lab Visit'}
                </span>
                {booking.fastingRequired && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
                    10-12h Fasting
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-white mt-1">
                {booking.testName}
              </h3>
              <p className="text-[11px] text-slate-300">
                Patient: <strong className="text-white">{booking.patientName}</strong> ({booking.patientPhone || 'N/A'}) • Scheduled: <strong className="text-amber-300">{formatDate(booking.scheduledDate)} ({scheduledSlot})</strong>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 font-mono">
            <span className="text-[10px] text-slate-400 block font-sans">Current Pipeline:</span>
            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-slate-950 text-teal-400 border border-teal-500/40 inline-block mt-0.5 shadow-sm">
              {logisticsStage.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* 2-Column Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Phlebotomist Fleet Assignment */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-[11px]">
                <UserCheck className="w-4 h-4 text-teal-400" />
                <span>Field Collector Fleet Assignment</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live Roster
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Select Available Collector:
              </label>
              <select
                value={selectedPhlebId}
                onChange={(e) => {
                  setSelectedPhlebId(e.target.value);
                  const p = PHLEBOTOMIST_PRESETS.find(item => item.id === e.target.value);
                  if (p) {
                    setCustomPhlebName(p.name);
                    setCustomPhlebPhone(p.phone);
                    setCustomVehicle(p.vehicle);
                    setCustomBagId(p.bagId);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
              >
                {PHLEBOTOMIST_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.badge} ({p.status})
                  </option>
                ))}
                <option value="custom">-- Enter Custom Collector / Courier Runner --</option>
              </select>

              {/* Collector Details Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] space-y-2">
                <div className="flex justify-between items-center text-teal-300 font-bold">
                  <span>Assigned Collector:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black">{finalPhlebName}</span>
                    <a
                      href={`tel:${finalPhlebPhone}`}
                      className="p-1 rounded bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-white transition"
                      title="Call Collector"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Mobile Phone:</span>
                  <span className="font-mono text-white">{finalPhlebPhone}</span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Vehicle Registration:</span>
                  <span className="font-mono text-amber-300 font-bold">{finalVehicle}</span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Bio-Carrier Kit ID:</span>
                  <span className="font-mono text-teal-400 font-bold">{finalBagId}</span>
                </div>

                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Duty Status:</span>
                  <span className="text-emerald-400 font-medium">
                    {selectedPreset?.status || 'Active Dispatch'} ({selectedPreset?.completedToday || 6} collections today)
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Collector Override fields if "custom" selected */}
            {selectedPhlebId === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Collector Name:</label>
                  <Input
                    value={customPhlebName}
                    onChange={(e) => setCustomPhlebName(e.target.value)}
                    placeholder="Collector Name"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Mobile No:</label>
                  <Input
                    value={customPhlebPhone}
                    onChange={(e) => setCustomPhlebPhone(e.target.value)}
                    placeholder="+91..."
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Vehicle No:</label>
                  <Input
                    value={customVehicle}
                    onChange={(e) => setCustomVehicle(e.target.value)}
                    placeholder="e.g. WB-02-X-1234"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Bag / Kit ID:</label>
                  <Input
                    value={customBagId}
                    onChange={(e) => setCustomBagId(e.target.value)}
                    placeholder="e.g. BAG-COL-99"
                  />
                </div>
              </div>
            )}

            {/* Scheduled Slot Input */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Collection Slot / Time Window:
              </label>
              <Input
                value={scheduledSlot}
                onChange={(e) => setScheduledSlot(e.target.value)}
                placeholder="e.g. 07:30 AM - 08:30 AM (Fasting Slot)"
              />
            </div>
          </div>

          {/* Right Column: Multi-Stage ETA Calculator */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-[11px]">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Multi-Stage Logistics ETA Engine</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Deterministic
              </span>
            </div>

            {/* Distance and Traffic Controls */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="font-bold text-slate-300">Distance from Hub / Current Location:</span>
                  <span className="font-mono text-cyan-300 font-black text-xs">{distanceKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="25"
                  step="0.5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9.5px] text-slate-500 font-mono mt-0.5">
                  <span>0.5 km</span>
                  <span>5 km</span>
                  <span>10 km</span>
                  <span>15 km</span>
                  <span>25 km</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Traffic & Transit Conditions:
                </label>
                <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
                  <button
                    type="button"
                    onClick={() => setTrafficMode('express')}
                    className={`py-1.5 px-2 rounded-xl border font-bold transition ${
                      trafficMode === 'express'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ Fast Track
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficMode('normal')}
                    className={`py-1.5 px-2 rounded-xl border font-bold transition ${
                      trafficMode === 'normal'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🚗 Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficMode('heavy')}
                    className={`py-1.5 px-2 rounded-xl border font-bold transition ${
                      trafficMode === 'heavy'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚠️ Congested
                  </button>
                </div>
              </div>

              {/* Dynamic ETA Projection Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-sans text-cyan-400 font-bold uppercase">
                    <Clock className="w-3 h-3" />
                    <span>Doorstep Arrival</span>
                  </div>
                  <div className="text-base font-black text-white">
                    {collectionEtaTime}
                  </div>
                  <div className="text-[10px] text-cyan-300">
                    in ~{collectionEtaMinutes} minutes
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-sans text-purple-400 font-bold uppercase">
                    <Box className="w-3 h-3" />
                    <span>Central Lab Delivery</span>
                  </div>
                  <div className="text-base font-black text-white">
                    {labTransitEtaTime}
                  </div>
                  <div className="text-[10px] text-purple-300">
                    +{labTransitEtaMinutes} mins transit
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Diagnostic Report:</span>
                <span className="font-bold text-emerald-400 font-mono">{expectedReportEta}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cold-Chain & Biosafety Security Station */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-purple-500/30 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-[11px]">
              <ThermometerSnowflake className="w-4 h-4 text-purple-400" />
              <span>Cold-Chain Monitoring & Biosafety Security (WHO / NABL Standard)</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              isColdChainOptimal
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse'
            }`}>
              {isColdChainOptimal ? 'Optimal 2°C - 8°C ✅' : 'Excursion Warning ⚠️'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Live Temperature Logger */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-300">Live Cold-Chain Temp:</span>
                <span className={`font-mono text-sm font-black ${
                  isColdChainOptimal ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {coldChainTemp.toFixed(1)}°C
                </span>
              </div>

              <input
                type="range"
                min="-2"
                max="18"
                step="0.2"
                value={coldChainTemp}
                onChange={(e) => setColdChainTemp(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />

              <div className="flex justify-between items-center pt-1 text-[10px]">
                <span className="text-slate-500 font-mono">-2°C</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-mono text-[9px] border border-emerald-500/20">
                  Target Zone: 2°C - 8°C
                </span>
                <span className="text-slate-500 font-mono">18°C</span>
              </div>

              {/* Status banner */}
              {isColdChainFreezingRisk && (
                <p className="text-[10px] text-blue-400 bg-blue-950/40 p-1.5 rounded-lg border border-blue-800">
                  ⚠️ Freezing Danger! Potential specimen hemolysis.
                </p>
              )}
              {isColdChainExcursion && (
                <p className="text-[10px] text-rose-400 bg-rose-950/40 p-1.5 rounded-lg border border-rose-800">
                  ⚠️ Cold Excursion! Temperature &gt;8°C, replace gel packs.
                </p>
              )}
            </div>

            {/* Ice Pack & Carrier Seal Barcode */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 flex flex-col justify-between">
              <div>
                <label className="text-[10.5px] font-bold text-slate-300 block mb-1">
                  Biohazard Carrier Box Seal Barcode:
                </label>
                <div className="flex gap-1.5">
                  <Input
                    value={boxSealBarcode}
                    onChange={(e) => setBoxSealBarcode(e.target.value)}
                    placeholder="e.g. BOX-CC-4921"
                    className="font-mono text-purple-300 font-bold"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBoxSealBarcode(`BOX-CC-${Math.floor(1000 + Math.random() * 9000)}`)}
                    title="Generate New Seal"
                  >
                    🎲
                  </Button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-800">
                <input
                  type="checkbox"
                  checked={icePackVerified}
                  onChange={(e) => setIcePackVerified(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-[10.5px] text-slate-300 font-medium">
                  Frozen PCM / Gel Packs Verified & Intact
                </span>
              </label>
            </div>

            {/* Primary Vacutainer Cap Selector */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-[10.5px] font-bold text-slate-300 block">
                Primary Vacutainer Specimen Tube:
              </label>
              <select
                value={tubeType}
                onChange={(e) => setTubeType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {tubeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10.5px]">
                <span className="text-slate-400">Cap Color Code:</span>
                <span className="flex items-center gap-1.5 font-bold font-mono">
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block shadow-sm ring-1 ring-white/20"
                    style={{ backgroundColor: tubeOptions.find(o => o.value === tubeType)?.color }}
                  />
                  {tubeType.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Stage Interactive Logistics Lifecycle Pipeline */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
            Sample Logistics Lifecycle Pipeline (Click to Advance Stage):
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {[
              { id: 'collector_dispatched', label: '1. Dispatched', icon: Truck, color: 'amber' },
              { id: 'at_location', label: '2. At Residence', icon: MapPin, color: 'blue' },
              { id: 'sample_secured', label: '3. Secured in Box', icon: Box, color: 'teal' },
              { id: 'in_transit_lab', label: '4. Transit to Lab', icon: Navigation, color: 'purple' },
              { id: 'delivered_accession', label: '5. Lab Received', icon: CheckCircle2, color: 'emerald' }
            ].map((step) => {
              const Icon = step.icon;
              const isSelected = logisticsStage === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setLogisticsStage(step.id as any)}
                  className={`p-2.5 rounded-2xl border transition-all text-xs font-bold flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-md ring-1 ring-teal-400 scale-[1.02]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-300' : 'text-slate-500'}`} />
                  <span className="text-[10px]">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Patient Notification Bar */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Doorstep Patient WhatsApp Alert</span>
            </h4>
            <p className="text-[11px] text-slate-300">
              Notify {booking.patientName} with assigned collector profile, vehicle number, arrival ETA, and cold-chain seal.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyAlertText}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsAppAlert}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send WhatsApp Alert</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Tag className="w-3.5 h-3.5 text-purple-400" />}
              onClick={() => {
                onClose();
                onOpenLabelPrinter(booking);
              }}
            >
              Print Tube Barcode Label
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 font-black shadow-lg hover:from-teal-500 hover:to-emerald-500"
              leftIcon={<Truck className="w-4 h-4" />}
              isLoading={isProcessing}
              onClick={handleDispatchAndSave}
            >
              Confirm Dispatch & Update Pipeline
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
