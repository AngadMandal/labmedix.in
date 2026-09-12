import React, { useEffect, useState } from 'react';
import { Patient, HealthCard, Membership, CompanyProfile } from '../../types';
import { generateQrDataUrl, buildVerificationUrl } from '../../utils/qr';
import { formatDate } from '../../utils/formatters';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { Wifi, Heart, ShieldCheck, Sparkles } from 'lucide-react';

interface CR80CardFrontProps {
  patient: Patient;
  card: HealthCard;
  membership: Membership;
  company: CompanyProfile;
  scale?: number;
  id?: string;
  previewOnly?: boolean;
  showBleedGuides?: boolean;
  mousePosition?: { x: number; y: number } | null;
}

export const CR80CardFront: React.FC<CR80CardFrontProps> = ({
  patient,
  card,
  membership,
  company,
  scale = 1,
  id = 'cr80-front',
  previewOnly = false,
  showBleedGuides = false,
  mousePosition = null
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (card?.verificationCode) {
      const url = buildVerificationUrl(card.verificationCode);
      generateQrDataUrl(url, 300).then(setQrUrl);
    }
  }, [card?.verificationCode]);

  const cfg = card?.designConfig || {};
  const preset = cfg.preset || 'royal_gold';
  const material = cfg.material || 'gloss';
  const tierTitle = cfg.cardTierTitle || membership?.name || 'GOLD PRIVILEGE';

  // 6 Luxury Master Aesthetic Themes
  const themeStyles: Record<string, { bg: string; text: string; accent: string; badge: string; border: string; glow: string }> = {
    royal_gold: {
      bg: 'linear-gradient(135deg, #150F08 0%, #2A1404 35%, #592809 70%, #0F0701 100%)',
      text: '#FEF3C7',
      accent: '#FBBF24',
      badge: 'bg-gradient-to-r from-amber-500/40 via-yellow-400/30 to-amber-600/40 text-amber-200 border-amber-400/60 shadow-md ring-1 ring-amber-400/30',
      border: 'border-amber-500/50',
      glow: 'rgba(251, 191, 36, 0.35)'
    },
    executive_navy: {
      bg: 'linear-gradient(135deg, #03132B 0%, #062E5F 35%, #0B4F9C 70%, #020F22 100%)',
      text: '#FFFFFF',
      accent: '#38BDF8',
      badge: 'bg-blue-500/30 text-blue-100 border-blue-400/50 shadow-sm',
      border: 'border-blue-400/40',
      glow: 'rgba(56, 189, 248, 0.25)'
    },
    emerald_health: {
      bg: 'linear-gradient(135deg, #02241C 0%, #054C38 35%, #109B48 70%, #011712 100%)',
      text: '#FFFFFF',
      accent: '#6EE7B7',
      badge: 'bg-emerald-500/30 text-emerald-100 border-emerald-400/50 shadow-sm',
      border: 'border-emerald-400/40',
      glow: 'rgba(110, 231, 183, 0.25)'
    },
    platinum_elite: {
      bg: 'linear-gradient(135deg, #020617 0%, #1A2436 35%, #2E3B4E 70%, #080C14 100%)',
      text: '#F8FAFC',
      accent: '#E2E8F0',
      badge: 'bg-slate-500/30 text-slate-100 border-slate-400/50 shadow-sm',
      border: 'border-slate-400/40',
      glow: 'rgba(226, 232, 240, 0.25)'
    },
    clean_minimal: {
      bg: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 50%, #E2E8F0 100%)',
      text: '#0F172A',
      accent: '#0B4F9C',
      badge: 'bg-blue-100 text-blue-900 border-blue-300 shadow-sm',
      border: 'border-slate-300',
      glow: 'rgba(11, 79, 156, 0.15)'
    },
    crimson_care: {
      bg: 'linear-gradient(135deg, #330310 0%, #700F2D 35%, #9F1239 70%, #1A0107 100%)',
      text: '#FFFFFF',
      accent: '#FDA4AF',
      badge: 'bg-rose-500/30 text-rose-100 border-rose-400/50 shadow-sm',
      border: 'border-rose-400/40',
      glow: 'rgba(253, 164, 175, 0.25)'
    }
  };

  const theme = themeStyles[preset] || themeStyles.royal_gold;
  const isLight = preset === 'clean_minimal';

  // Card Status Badge styling
  const statusLabel = (card?.status || 'active').toUpperCase();
  const isExpired = card?.status === 'expired' || (card?.expiryDate && new Date(card.expiryDate) < new Date());
  const isSuspended = card?.status === 'suspended' || card?.status === 'cancelled';

  return (
    <div
      id={id}
      style={{
        width: '500px',
        height: '315px', // Exact CR80 PVC standard ratio: 85.60 mm x 53.98 mm = 1.586
        background: theme.bg,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        color: theme.text,
        boxShadow: `0 20px 45px rgba(0,0,0,0.35), 0 0 25px ${theme.glow}`
      }}
      className={`relative rounded-[18px] p-5 select-none border ${theme.border} overflow-hidden flex flex-col justify-between ${
        material === 'metallic' ? 'metallic-shine' :
        material === 'hologram' ? 'hologram-shimmer' :
        material === 'matte' ? 'matte-finish' : ''
      }`}
    >
      {/* 3D Specular Light Follower */}
      {mousePosition && material !== 'matte' && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.22) 0%, transparent 60%)`,
            mixBlendMode: 'overlay'
          }}
        />
      )}

      {/* Safe Bleed Margins Overlay (3mm standard for PVC printing) */}
      {showBleedGuides && (
        <div className="absolute inset-2 border-2 border-dashed border-red-400/70 rounded-[14px] pointer-events-none z-30 flex items-start justify-between p-1">
          <span className="text-[7px] font-mono bg-red-600 text-white px-1 rounded">SAFE 3mm ZONE</span>
          <span className="text-[7px] font-mono bg-red-600 text-white px-1 rounded">CR80 PVC FRONT</span>
        </div>
      )}

      {/* Guilloche Anti-Counterfeit Background Mesh */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px]" />
      <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border border-white/15 pointer-events-none opacity-20" />
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full border border-white/15 pointer-events-none opacity-20" />

      {/* 1. TOP HEADER: Official Logo, Organization Brand & Tier Badge */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="sm" theme="white" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider text-white drop-shadow leading-none">
                {company.name}
              </h1>
            </div>
            <p className="text-[9.5px] font-bold tracking-wider uppercase text-amber-200 drop-shadow-xs mt-0.5">
              LABMEDIX HEALTH CARD
            </p>
          </div>
        </div>

        {/* Right Header: Contactless Icon & Tier Badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 rotate-90 opacity-90 drop-shadow text-amber-200" />
            <span className={`text-[10px] uppercase font-black tracking-wider px-3 py-0.5 rounded-full border ${theme.badge}`}>
              {tierTitle}
            </span>
          </div>
          <span className="text-[8.5px] italic opacity-90 font-serif text-amber-100 drop-shadow-xs">
            "{company.tagline || 'Confident in Care'}"
          </span>
        </div>
      </div>

      {/* 2. CHIP, BLOOD GROUP & LIVE CARD STATUS */}
      <div className="relative z-10 flex items-center justify-between my-1">
        <div className="flex items-center gap-2.5">
          {/* Smart EMV Golden Chip */}
          <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 border border-amber-500 shadow-md flex flex-col justify-between p-1">
            <div className="w-full h-[1px] bg-amber-700/60" />
            <div className="flex justify-between">
              <div className="w-3 h-[1px] bg-amber-700/60" />
              <div className="w-3 h-[1px] bg-amber-700/60" />
            </div>
            <div className="w-full h-[1px] bg-amber-700/60" />
          </div>
          <span className="text-[8px] font-mono tracking-widest uppercase opacity-75">CR80 PVC SECURE</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Blood Group Badge (Handling Known / Unknown) */}
          {patient.bloodGroup && !patient.bloodGroup.toLowerCase().includes('unknown') && !patient.bloodGroup.toLowerCase().includes('not') ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black shadow-md border border-red-400/60">
              <Heart className="w-3 h-3 fill-current animate-pulse" />
              <span>{patient.bloodGroup}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[9px] font-bold border border-slate-600">
              <span>Blood: N/A</span>
            </div>
          )}

          {/* Official Card Status Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${
              isExpired
                ? 'bg-rose-500/30 text-rose-200 border-rose-400/50'
                : isSuspended
                ? 'bg-amber-500/30 text-amber-200 border-amber-400/50'
                : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
            }`}
          >
            {isExpired ? 'EXPIRED' : isSuspended ? 'SUSPENDED' : statusLabel}
          </span>
        </div>
      </div>

      {/* 3. MAIN BODY: Cardholder Photo, Credentials & Dynamic QR Code */}
      <div className="relative z-10 flex items-end justify-between gap-3">
        {/* Left: Photograph & Details */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Photograph */}
          <div className="relative w-20 h-24 rounded-xl overflow-hidden border-2 border-white/90 shadow-lg bg-slate-200 shrink-0">
            <img
              src={patient.photoUrl || '/logo.jpg'}
              alt={patient.fullName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Patient Details */}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black tracking-wide truncate uppercase drop-shadow-sm leading-tight text-white">
              {patient.fullName}
            </h2>

            {/* Embossed Health Card Number */}
            <div className="text-xs font-mono font-black tracking-widest mt-1 text-amber-300 drop-shadow flex items-center gap-1.5">
              <span>{card.cardNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[10px] opacity-90">
              <div>
                <span className="opacity-60 block text-[8px] uppercase font-bold">Patient ID</span>
                <span className="font-mono font-bold">{patient.id}</span>
              </div>
              <div>
                <span className="opacity-60 block text-[8px] uppercase font-bold">Age / Gender</span>
                <span className="font-semibold">{patient.age} Y / {patient.gender.toUpperCase()}</span>
              </div>
              <div>
                <span className="opacity-60 block text-[8px] uppercase font-bold">Issue Date</span>
                <span className="font-semibold">{formatDate(card.issueDate)}</span>
              </div>
              <div>
                <span className="opacity-60 block text-[8px] uppercase font-bold">Valid Thru</span>
                <span className="font-black text-emerald-300 drop-shadow-sm">{formatDate(card.expiryDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: High-Res Dynamic QR Code with Verification Code Stamp */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="w-20 h-20 bg-white p-1 rounded-xl shadow-lg flex items-center justify-center overflow-hidden border border-slate-300">
            {qrUrl ? (
              <img src={qrUrl} alt="Verification QR Code" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-slate-100 animate-pulse" />
            )}
          </div>
          <span className="text-[8.5px] font-mono tracking-wider mt-1 font-black text-amber-300 drop-shadow-xs">
            {card.verificationCode}
          </span>
        </div>
      </div>

      {/* Bottom Holographic Luxury Accent Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-95" />
    </div>
  );
};