import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Patient, HealthCard, Membership, CompanyProfile } from '../../types';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { useToast } from '../../context/ToastContext';
import {
  RotateCw,
  Activity,
  Heart,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Pill,
  Phone,
  AlertTriangle,
  Copy,
  Wifi,
  Sparkles,
  QrCode,
  Lock,
  UserCheck,
  CheckCircle2,
  FileText,
  Flame,
  Zap
} from 'lucide-react';

interface FramerInteractiveHealthCardProps {
  patient: Patient;
  card?: HealthCard;
  membership?: Membership;
  company?: CompanyProfile;
  className?: string;
  showClinicalCopyBtn?: boolean;
  compact?: boolean;
}

export const FramerInteractiveHealthCard: React.FC<FramerInteractiveHealthCardProps> = ({
  patient,
  card,
  membership,
  company,
  className = '',
  showClinicalCopyBtn = true,
  compact = false
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { showToast } = useToast();

  const companyName = company?.name || 'LABMEDIX DIAGNOSTICS';
  const helpline = company?.helpline || '1800-889-9911';
  const logoUrl = company?.logoUrl;

  const cardNumberFormatted = card?.cardNumber
    ? card.cardNumber.replace(/(.{4})/g, '$1 ').trim()
    : '4488 •••• •••• 9912';

  const bloodGroup = patient.bloodGroup || patient.medicalInfo?.bloodGroup || 'O+';
  const bp = patient.vitalsAtReg?.bp || '120/80';
  const pulse = patient.vitalsAtReg?.pulse || 72;
  const spo2 = patient.vitalsAtReg?.spo2 || 98;
  const rbs = patient.vitalsAtReg?.rbs || '105 mg/dL';
  const allergies = patient.medicalInfo?.allergies || 'NKDA (No Known Drug Allergies)';
  const conditions = patient.medicalInfo?.chronicConditions || 'Hypertension / Diabetes Monitored';

  const opdDiscount = membership?.opdDiscount ?? 30;
  const labDiscount = membership?.labDiscount ?? 50;
  const pharmacyDiscount = membership?.pharmacyDiscount ?? 20;
  const homeCollectionDiscount = membership?.homeCollectionDiscount ?? 100;
  const ipdDiscount = membership?.ipdDiscount ?? 15;

  const triggerHaptic = (pattern: number | number[] = [35, 25, 45]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe fallback for browsers/environments without vibration permission
      }
    }
  };

  const handleCardFlip = () => {
    triggerHaptic(isFlipped ? 30 : [40, 20, 50]);
    setIsFlipped(prev => !prev);
  };

  const copyClinicalSummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic([30, 30]);
    const summary = `
🏥 LABMEDIX CLINICAL HEALTH SUMMARY
====================================
Patient Name: ${patient.fullName}
Patient ID: ${patient.id} | Age/Sex: ${patient.age}Y / ${patient.gender.toUpperCase()}
Blood Group: ${bloodGroup}
Card Number: ${card?.cardNumber || 'N/A'}

🩸 BASELINE CLINICAL VITALS:
- BP: ${bp} mmHg
- Pulse: ${pulse} bpm
- SpO2: ${spo2}%
- RBS/Glucose: ${rbs}

⚠️ MEDICAL ALERTS & ALLERGIES:
- Allergies: ${allergies}
- Conditions: ${conditions}

🚨 EMERGENCY CONTACT:
- Name: ${patient.emergencyContact?.name || 'Primary Guardian'}
- Relationship: ${patient.emergencyContact?.relationship || 'Family'}
- Mobile: ${patient.emergencyContact?.mobile || patient.mobile}

🛡️ COVERAGE & DISCOUNTS:
- OPD: ${opdDiscount}% OFF | Diagnostics: ${labDiscount}% OFF | Pharmacy: ${pharmacyDiscount}% OFF
24x7 Emergency Line: ${helpline}
====================================
`.trim();

    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    showToast('success', 'Clinical Data Copied!', 'Full medical profile copied to clipboard for doctor review.');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className={`relative w-full flex flex-col items-center select-none ${className}`}>
      {/* Interactive Framer Motion 3D Flippable Stage */}
      <div className="w-full max-w-[480px] aspect-[1.586/1] perspective-1200 cursor-pointer group" onClick={handleCardFlip}>
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          initial={false}
          transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
          className="relative w-full h-full preserve-3d rounded-3xl shadow-2xl"
        >
          {/* ========================================== */}
          {/* FRONT FACE: Premium Health Card View      */}
          {/* ========================================== */}
          <div className="absolute inset-0 backface-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white border-2 border-teal-500/40 overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Holographic Refraction Sweep Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/10 to-transparent pointer-events-none -rotate-45 scale-150 group-hover:translate-x-full transition-transform duration-1000" />
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Brand Logo & NFC Indicator */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white p-1 border border-white/80 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={logoUrl || '/logo.jpg'}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      if (e.currentTarget.src !== window.location.origin + '/logo.jpg') {
                        e.currentTarget.src = '/logo.jpg';
                      }
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white leading-tight truncate max-w-[200px]">
                    {companyName}
                  </h4>
                  <span className="text-[8px] sm:text-[9px] text-teal-300 font-bold tracking-widest uppercase block">
                    {membership?.name || 'CR80 HEALTH PASS'} • OFFICIAL
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[9px] font-mono font-bold">
                <Wifi className="w-3 h-3 rotate-90 animate-pulse text-teal-300" />
                <span>NFC ACTIVE</span>
              </div>
            </div>

            {/* Middle: EMV Chip & Patient Avatar / Blood Group */}
            <div className="relative z-10 flex items-center justify-between my-auto">
              <div className="flex items-center gap-3">
                {/* Gold EMV Chip */}
                <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 border border-amber-500 shadow-md flex items-center justify-center p-1">
                  <div className="w-full h-full border border-amber-950/40 rounded-xs flex items-center justify-center">
                    <div className="w-2.5 h-2.5 border-r border-l border-amber-950/40" />
                  </div>
                </div>

                {/* Patient Photo Badge */}
                <div className="flex items-center gap-2">
                  <img
                    src={patient.photoUrl || '/logo.jpg'}
                    alt={patient.fullName}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-teal-400/60 shadow-md"
                  />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Patient Name</span>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[160px]">
                      {patient.fullName}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Blood Group Capsule */}
              <div className="text-right">
                <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-widest">Blood Group</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-xs shadow-md border border-rose-400/50">
                  <Heart className="w-3 h-3 fill-current" />
                  {bloodGroup}
                </span>
              </div>
            </div>

            {/* Footer: Card Number & Flip Prompt Indicator */}
            <div className="relative z-10 space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs sm:text-sm font-black tracking-widest text-slate-200">{cardNumberFormatted}</span>
                <span className="text-[9px] text-teal-300 font-bold">{patient.id}</span>
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span className="text-slate-300 font-semibold">{patient.age} Y / {patient.gender.toUpperCase()}</span>
                <span className="text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                  <RotateCw className="w-2.5 h-2.5" />
                  Tap Card to Reveal Clinical Details ➔
                </span>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BACK FACE: Detailed Clinical & Medical Specs */}
          {/* ========================================== */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border-2 border-emerald-500/50 overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Magnetic Stripe */}
            <div className="w-full h-7 bg-black -mx-5 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="text-[8px] font-mono text-teal-400 font-bold uppercase flex items-center gap-1">
                <Activity className="w-3 h-3 text-teal-400" />
                CLINICAL MEDICAL PROFILE & EMERGENCY SPECS
              </span>
              <span className="text-[8px] font-mono text-amber-300 font-bold">
                RH: {bloodGroup} POSITIVE
              </span>
            </div>

            {/* Clinical Details Body */}
            <div className="space-y-2 my-auto">
              {/* 1. Baseline Vitals Grid */}
              <div className="grid grid-cols-4 gap-1.5 text-center p-2 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                <div className="p-1 rounded-xl bg-slate-900/60">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">BP</span>
                  <strong className="text-xs font-black text-emerald-400 font-mono">{bp}</strong>
                </div>
                <div className="p-1 rounded-xl bg-slate-900/60">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">PULSE</span>
                  <strong className="text-xs font-black text-rose-400 font-mono">{pulse} bpm</strong>
                </div>
                <div className="p-1 rounded-xl bg-slate-900/60">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">SpO2</span>
                  <strong className="text-xs font-black text-cyan-400 font-mono">{spo2}%</strong>
                </div>
                <div className="p-1 rounded-xl bg-slate-900/60">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">RBS</span>
                  <strong className="text-xs font-black text-amber-400 font-mono">{rbs}</strong>
                </div>
              </div>

              {/* 2. Medical Alerts & Allergies */}
              <div className="p-2 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-rose-400 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    Allergies & Medical Alerts
                  </span>
                  <span className="text-[8px] text-rose-300 font-mono">EMERGENCY CLEARANCE</span>
                </div>
                <p className="text-[10px] text-slate-200 font-medium line-clamp-1">
                  <strong>Allergies:</strong> {allergies}
                </p>
                <p className="text-[10px] text-slate-300 font-medium line-clamp-1">
                  <strong>Conditions:</strong> {conditions}
                </p>
              </div>

              {/* 3. Emergency Contact & Discounts */}
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 font-bold uppercase block text-[8px]">Emergency Guardian</span>
                  <p className="text-white font-bold truncate">{patient.emergencyContact?.name || 'Family Contact'}</p>
                  <p className="text-teal-300 font-mono font-bold">{patient.emergencyContact?.mobile || patient.mobile}</p>
                </div>

                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 font-bold uppercase block text-[8px]">Cashless Privileges</span>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-emerald-300 font-black font-mono text-[8.5px] mt-0.5">
                    <span>OPD {opdDiscount}%</span>
                    <span>•</span>
                    <span>Lab {labDiscount}%</span>
                    <span>•</span>
                    <span>Rx {pharmacyDiscount}%</span>
                    <span>•</span>
                    <span>Home {homeCollectionDiscount >= 100 ? 'FREE' : `${homeCollectionDiscount}%`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Footer Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[9px]">
              <button
                type="button"
                onClick={copyClinicalSummary}
                className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-300 font-bold flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3 h-3" />
                <span>{isCopied ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              <span className="text-slate-400 font-bold flex items-center gap-1 text-[9px]">
                <RotateCw className="w-2.5 h-2.5 text-emerald-400" />
                Tap to Flip Back
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
