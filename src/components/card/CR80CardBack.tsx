import React, { useEffect, useState } from 'react';
import { Patient, HealthCard, Membership, CompanyProfile } from '../../types';
import { generateQrDataUrl, buildVerificationUrl } from '../../utils/qr';
import { formatDate } from '../../utils/formatters';
import {
  Phone,
  MessageSquare,
  Lock,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Pill,
  Home,
  Bed,
  Sparkles,
  Wifi,
  Crown,
  HeartPulse
} from 'lucide-react';

interface CR80CardBackProps {
  patient: Patient;
  card: HealthCard;
  membership: Membership;
  company: CompanyProfile;
  scale?: number;
  id?: string;
  previewOnly?: boolean;
  showBleedGuides?: boolean;
  mousePosition?: { x: number; y: number } | null;
  onOpenFamilyModal?: () => void;
  maskCvv?: boolean;
}

export const CR80CardBack: React.FC<CR80CardBackProps> = ({
  patient,
  card,
  membership,
  company,
  scale = 1,
  id = 'cr80-back',
  previewOnly = false,
  showBleedGuides = false,
  mousePosition = null,
  maskCvv = false
}) => {
  const [backQrUrl, setBackQrUrl] = useState<string>('');

  useEffect(() => {
    if (card?.verificationCode) {
      const url = buildVerificationUrl(card.verificationCode);
      generateQrDataUrl(url, 220).then(setBackQrUrl);
    }
  }, [card?.verificationCode]);

  const cfg = card?.designConfig || {};
  const preset = cfg.preset || 'royal_gold';
  const material = cfg.material || 'gloss';
  const tierTitle = cfg.cardTierTitle || membership?.name || 'GOLD PRIVILEGE';

  // Resolved dynamic discounts from active membership plan
  const opdDiscount = membership?.opdDiscount ?? 30;
  const labDiscount = membership?.labDiscount ?? 35;
  const pharmacyDiscount = membership?.pharmacyDiscount ?? 15;
  const homeCollectionDiscount = membership?.homeCollectionDiscount ?? 100;
  const ipdDiscount = membership?.ipdDiscount ?? 15;
  const emergencyDiscount = membership?.emergencyDiscount ?? 20;

  // Master Luxury Card Theme Styles
  const themeStyles: Record<
    string,
    {
      bg: string;
      text: string;
      accent: string;
      border: string;
      badge: string;
      tileBg: string;
      tileVal: string;
      tileBorder: string;
      glow: string;
    }
  > = {
    royal_gold: {
      bg: 'linear-gradient(135deg, #0d0702 0%, #201004 45%, #381b06 80%, #0d0702 100%)',
      text: '#FEF3C7',
      accent: '#FBBF24',
      border: 'border-amber-500/40',
      badge: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-200 border-amber-400/60 shadow-sm',
      tileBg: 'bg-gradient-to-b from-amber-500/10 via-black/50 to-amber-950/30',
      tileVal: 'text-amber-300',
      tileBorder: 'border-amber-500/30',
      glow: 'rgba(251, 191, 36, 0.25)'
    },
    executive_navy: {
      bg: 'linear-gradient(135deg, #020e1d 0%, #052142 45%, #0a3a6e 80%, #020a14 100%)',
      text: '#FFFFFF',
      accent: '#38BDF8',
      border: 'border-blue-400/40',
      badge: 'bg-sky-500/25 text-sky-100 border-sky-400/50 shadow-sm',
      tileBg: 'bg-gradient-to-b from-sky-500/10 via-black/50 to-blue-950/30',
      tileVal: 'text-sky-300',
      tileBorder: 'border-sky-400/30',
      glow: 'rgba(56, 189, 248, 0.25)'
    },
    emerald_health: {
      bg: 'linear-gradient(135deg, #01140e 0%, #032d21 45%, #084c39 80%, #010c08 100%)',
      text: '#FFFFFF',
      accent: '#34D399',
      border: 'border-emerald-400/40',
      badge: 'bg-emerald-500/25 text-emerald-100 border-emerald-400/50 shadow-sm',
      tileBg: 'bg-gradient-to-b from-emerald-500/10 via-black/50 to-emerald-950/30',
      tileVal: 'text-emerald-300',
      tileBorder: 'border-emerald-400/30',
      glow: 'rgba(52, 211, 153, 0.25)'
    },
    platinum_elite: {
      bg: 'linear-gradient(135deg, #06080d 0%, #151a26 45%, #252e42 80%, #06070a 100%)',
      text: '#F8FAFC',
      accent: '#E2E8F0',
      border: 'border-slate-400/40',
      badge: 'bg-slate-400/25 text-slate-100 border-slate-300/50 shadow-sm',
      tileBg: 'bg-gradient-to-b from-slate-500/10 via-black/50 to-slate-900/40',
      tileVal: 'text-slate-100',
      tileBorder: 'border-slate-500/35',
      glow: 'rgba(226, 232, 240, 0.25)'
    },
    clean_minimal: {
      bg: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 50%, #E2E8F0 100%)',
      text: '#0F172A',
      accent: '#0B4F9C',
      border: 'border-slate-300',
      badge: 'bg-blue-100 text-blue-900 border-blue-300 shadow-sm',
      tileBg: 'bg-white/95 shadow-xs',
      tileVal: 'text-blue-700',
      tileBorder: 'border-slate-300',
      glow: 'rgba(11, 79, 156, 0.15)'
    },
    crimson_care: {
      bg: 'linear-gradient(135deg, #180208 0%, #3e0819 45%, #63102c 80%, #120106 100%)',
      text: '#FFFFFF',
      accent: '#FDA4AF',
      border: 'border-rose-400/40',
      badge: 'bg-rose-500/25 text-rose-100 border-rose-400/50 shadow-sm',
      tileBg: 'bg-gradient-to-b from-rose-500/10 via-black/50 to-rose-950/30',
      tileVal: 'text-rose-300',
      tileBorder: 'border-rose-400/30',
      glow: 'rgba(253, 164, 175, 0.25)'
    }
  };

  const theme = themeStyles[preset] || themeStyles.royal_gold;

  return (
    <div
      id={id}
      style={{
        width: '500px',
        height: '315px', // Exact CR80 standard ratio: 85.60 mm x 53.98 mm = 1.586
        background: theme.bg,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        color: theme.text,
        boxShadow: `0 20px 45px rgba(0,0,0,0.38), 0 0 25px ${theme.glow}`
      }}
      className={`relative rounded-[18px] select-none border ${theme.border} overflow-hidden flex flex-col justify-between ${
        material === 'metallic'
          ? 'metallic-shine'
          : material === 'hologram'
          ? 'hologram-shimmer'
          : material === 'matte'
          ? 'matte-finish'
          : ''
      }`}
    >
      {/* 3D Specular Light Follower */}
      {mousePosition && material !== 'matte' && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.18) 0%, transparent 60%)`,
            mixBlendMode: 'overlay'
          }}
        />
      )}

      {/* Safe Bleed Margins (3mm standard for PVC printing) */}
      {showBleedGuides && (
        <div className="absolute inset-2 border-2 border-dashed border-red-400/70 rounded-[14px] pointer-events-none z-30 flex items-start justify-between p-1">
          <span className="text-[7px] font-mono bg-red-600 text-white px-1 rounded">SAFE 3mm ZONE</span>
          <span className="text-[7px] font-mono bg-red-600 text-white px-1 rounded">CR80 PVC BACK</span>
        </div>
      )}

      {/* 1. TOP SECTION: Sleek Magnetic Stripe & Security Signature / CVV Panel */}
      <div>
        {/* HiCo Magnetic Track with Microtext & NFC Chip Badge */}
        <div className="w-full h-8 bg-black/90 shadow-inner flex items-center px-4 justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 rotate-90 text-amber-400/90" />
            <span className="text-[7.5px] font-mono text-slate-400 tracking-wider uppercase font-semibold">
              ISO/IEC 7810 CR80 PVC • HiCo 2750 Oe SECURE PASS
            </span>
          </div>
          <span className="text-[8px] font-mono text-amber-300 font-bold tracking-widest">
            {card.verificationCode}
          </span>
        </div>

        {/* Authorized Signature Panel, Patient ID & CVV Security Block */}
        <div className="px-4 mt-1.5 flex items-center gap-2">
          {/* Tamper-evident Cursive Signature Bar */}
          <div className="flex-1 h-6 bg-white rounded-md flex items-center px-3 border border-slate-300 justify-between shadow-inner">
            <span className="font-serif italic text-slate-900 text-[10px] select-none font-bold">
              {patient.fullName}
            </span>
            <span className="text-[6.5px] font-mono text-slate-500 uppercase tracking-tight">
              Authorized Signature • Not Valid Unless Signed
            </span>
          </div>

          {/* Patient ID Badge */}
          <div className="h-6 px-2 bg-slate-900/90 text-slate-300 rounded-md flex items-center justify-center border border-slate-700 font-mono text-[8px] font-bold shadow-xs">
            <span>ID: {patient.id}</span>
          </div>

          {/* Security CVV Code */}
          <div className="h-6 px-2 bg-slate-950 text-white rounded-md flex items-center justify-center border border-slate-700 font-mono text-[10px] font-black shadow-xs gap-1">
            <span className="text-[6.5px] text-slate-400 font-bold uppercase">CVV:</span>
            {maskCvv ? (
              <span className="text-amber-400 font-mono tracking-widest flex items-center gap-0.5 text-xs">
                <Lock className="w-2.5 h-2.5 text-amber-400" /> •••
              </span>
            ) : (
              <span className="text-amber-300">{card.cvv || card.verificationCode.slice(-3)}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN BODY: Express Benefit & Discount Matrix (Left) & QR Verification (Right) */}
      <div className="px-4 py-1 grid grid-cols-12 gap-2.5 items-center flex-1">
        {/* Left Column (8.5 cols): EXCLUSIVE BENEFIT & DISCOUNT TILES */}
        <div className="col-span-8 space-y-1.5">
          {/* Header with Recommended Privilege Badge */}
          <div className="flex items-center justify-between border-b border-white/20 pb-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <h3 className="text-[9px] font-black uppercase tracking-wider text-amber-300 drop-shadow-xs">
                {tierTitle} — CASHLESS BENEFITS
              </h3>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-xs">
              <Crown className="w-2.5 h-2.5 text-amber-400" />
              <span>RECOMMENDED</span>
            </div>
          </div>

          {/* 6 High-Contrast Express Benefit & Discount Cards */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* 1. OPD Doctors */}
            <div className={`p-1 rounded-lg border ${theme.tileBorder} ${theme.tileBg} flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between">
                <Stethoscope className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                <span className={`text-[10px] font-black leading-none ${theme.tileVal}`}>
                  {opdDiscount}% OFF
                </span>
              </div>
              <span className="text-[6.5px] font-bold text-slate-200 uppercase tracking-tight mt-0.5 truncate">
                OPD Doctors
              </span>
            </div>

            {/* 2. Diagnostics & Lab */}
            <div className={`p-1 rounded-lg border ${theme.tileBorder} ${theme.tileBg} flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between">
                <FlaskConical className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span className={`text-[10px] font-black leading-none ${theme.tileVal}`}>
                  {labDiscount}% OFF
                </span>
              </div>
              <span className="text-[6.5px] font-bold text-slate-200 uppercase tracking-tight mt-0.5 truncate">
                Lab & Diagnostics
              </span>
            </div>

            {/* 3. Hospital Pharmacy */}
            <div className={`p-1 rounded-lg border ${theme.tileBorder} ${theme.tileBg} flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between">
                <Pill className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                <span className={`text-[10px] font-black leading-none ${theme.tileVal}`}>
                  {pharmacyDiscount}% OFF
                </span>
              </div>
              <span className="text-[6.5px] font-bold text-slate-200 uppercase tracking-tight mt-0.5 truncate">
                Pharmacy / Meds
              </span>
            </div>

            {/* 4. Home Blood Collection */}
            <div className={`p-1 rounded-lg border ${theme.tileBorder} ${theme.tileBg} flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between">
                <Home className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                <span className={`text-[9.5px] font-black leading-none ${theme.tileVal}`}>
                  {homeCollectionDiscount >= 100 ? '100% FREE' : `${homeCollectionDiscount}% OFF`}
                </span>
              </div>
              <span className="text-[6.5px] font-bold text-slate-200 uppercase tracking-tight mt-0.5 truncate">
                Home Blood Draw
              </span>
            </div>

            {/* 5. IPD Admission Beds */}
            <div className={`p-1 rounded-lg border ${theme.tileBorder} ${theme.tileBg} flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between">
                <Bed className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                <span className={`text-[10px] font-black leading-none ${theme.tileVal}`}>
                  {ipdDiscount}% OFF
                </span>
              </div>
              <span className="text-[6.5px] font-bold text-slate-200 uppercase tracking-tight mt-0.5 truncate">
                Hospital IPD Bed
              </span>
            </div>

            {/* 6. Preventive Health Checkup */}
            <div className={`p-1 rounded-lg border ${theme.tileBorder} ${theme.tileBg} flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between">
                <HeartPulse className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span className={`text-[9px] font-black leading-none ${theme.tileVal}`}>
                  COMPLIMENTARY
                </span>
              </div>
              <span className="text-[6.5px] font-bold text-slate-200 uppercase tracking-tight mt-0.5 truncate">
                Master Checkup
              </span>
            </div>
          </div>

          {/* Crisp Recommended Terms & Usage Guidelines */}
          <div className="rounded-lg p-1.5 bg-black/40 border border-white/10 space-y-0.5">
            <div className="flex items-center gap-1 text-[7px] font-bold text-amber-200">
              <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
              <span>CARD PRIVILEGE GUIDELINES</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 text-[6.5px] leading-[8.5px] text-slate-300">
              <p>• Present card at reception prior to billing.</p>
              <p>• Valid 365 days across all network centers.</p>
              <p>• Priority emergency & phlebotomy queue.</p>
              <p>• Non-transferable; registered family covered.</p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): VERIFICATION AREA & DYNAMIC QR CODE */}
        <div className="col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-black/50 border border-amber-400/35 text-center shadow-lg">
          <div className="flex items-center gap-1.5 text-[7.5px] font-black uppercase tracking-wider text-amber-300 mb-1">
            <div className="w-4 h-4 rounded bg-white p-0.5 shadow-xs shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={company?.logoUrl || '/logo.jpg'}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  if (e.currentTarget.src !== window.location.origin + '/logo.jpg') {
                    e.currentTarget.src = '/logo.jpg';
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
              <span>SCAN TO VERIFY</span>
            </div>
          </div>

          {/* High-Resolution QR Code */}
          <div className="w-[72px] h-[72px] bg-white p-1 rounded-xl shadow-md flex items-center justify-center overflow-hidden border border-slate-300">
            {backQrUrl ? (
              <img src={backQrUrl} alt="Scan QR" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-slate-100 animate-pulse" />
            )}
          </div>

          {/* Hospital Seal & Validity Note */}
          <div className="mt-1 leading-tight text-center">
            <span className="text-[8px] font-black text-white block tracking-wide truncate max-w-[130px] mx-auto">
              {company.name || 'LABMEDIX'}
            </span>
            <span className="text-[6.5px] text-amber-200/90 italic font-serif block truncate max-w-[130px] mx-auto">
              "{company.tagline || 'Confident in Care'}"
            </span>
            <span className="text-[6.5px] font-mono text-emerald-300 font-bold block mt-0.5">
              EXP: {formatDate(card.expiryDate)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM FOOTER: Support Helpline, WhatsApp & Reg Info */}
      <div className="px-4 pb-2 pt-1 border-t border-white/15 flex items-center justify-between text-[7.5px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-bold text-emerald-300">
            <Phone className="w-2.5 h-2.5 text-emerald-400" />
            <span>24/7 Helpline: {company.helpline || company.phone}</span>
          </div>

          {company.whatsapp && (
            <div className="flex items-center gap-1 font-bold text-teal-300">
              <MessageSquare className="w-2.5 h-2.5 text-teal-400" />
              <span>WhatsApp: {company.whatsapp}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[7px] opacity-90 font-mono">
          {company.registrationNo && (
            <>
              <span>Reg: {company.registrationNo}</span>
              <span>•</span>
            </>
          )}
          <span className="text-amber-200 font-semibold">{company.website || 'labmedix.in'}</span>
        </div>
      </div>
    </div>
  );
};