import React, { useEffect, useState } from 'react';
import { Patient, HealthCard, Membership, CompanyProfile } from '../../types';
import { generateQrDataUrl, buildVerificationUrl } from '../../utils/qr';
import { Phone, MessageSquare, Globe, Lock, ShieldCheck } from 'lucide-react';
import { APPROVED_GOLD_PRIVILEGE_TERMS } from '../../constants/cardTerms';

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
      generateQrDataUrl(url, 200).then(setBackQrUrl);
    }
  }, [card?.verificationCode]);

  const cfg = card?.designConfig || {};
  const preset = cfg.preset || 'royal_gold';
  const material = cfg.material || 'gloss';
  const tierTitle = cfg.cardTierTitle || membership?.name || 'GOLD PRIVILEGE';

  // Card theme styling
  const themeStyles: Record<string, { bg: string; text: string; accent: string; border: string }> = {
    royal_gold: {
      bg: 'linear-gradient(135deg, #0F0701 0%, #2A1404 60%, #150F08 100%)',
      text: '#FEF3C7',
      accent: '#FBBF24',
      border: 'border-amber-500/40'
    },
    executive_navy: {
      bg: 'linear-gradient(135deg, #021226 0%, #062E5F 60%, #03132B 100%)',
      text: '#FFFFFF',
      accent: '#38BDF8',
      border: 'border-blue-500/40'
    },
    emerald_health: {
      bg: 'linear-gradient(135deg, #011712 0%, #054C38 60%, #02241C 100%)',
      text: '#FFFFFF',
      accent: '#6EE7B7',
      border: 'border-emerald-500/40'
    },
    platinum_elite: {
      bg: 'linear-gradient(135deg, #080C14 0%, #1A2436 60%, #020617 100%)',
      text: '#F8FAFC',
      accent: '#E2E8F0',
      border: 'border-slate-500/40'
    },
    clean_minimal: {
      bg: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 60%, #CBD5E1 100%)',
      text: '#0F172A',
      accent: '#0B4F9C',
      border: 'border-slate-300'
    },
    crimson_care: {
      bg: 'linear-gradient(135deg, #1A0107 0%, #700F2D 60%, #330310 100%)',
      text: '#FFFFFF',
      accent: '#FDA4AF',
      border: 'border-rose-500/40'
    }
  };

  const theme = themeStyles[preset] || themeStyles.royal_gold;

  // Concise approved 15-point English terms for crisp physical printing
  const compactTerms = [
    '1. Non-transferable; valid exclusively for cardholder & registered dependents.',
    '2. Validity: Exactly 365 days (1 year) from issuance; annual renewal required.',
    '3. Verification: Must be presented at reception prior to service billing.',
    '4. OPD Doctor consultation discounts apply to hospital scheduled roster.',
    '5. Complimentary routine BP, Pulse, and body weight screening on visits.',
    '6. Privileged savings on genuine hospital counter prescribed pharmacy.',
    '7. Concessional rates across all in-house diagnostic laboratory tests.',
    '8. Subsidized comprehensive preventive master health screening packages.',
    '9. Home phlebotomy collection available within standard operating zones.',
    '10. Excludes outsourced esoteric diagnostics and blood bank processing.',
    '11. Cannot be combined with third-party insurance TPA or special offers.',
    '12. Replacement card available for lost/damaged cards with nominal PVC fee.',
    '13. Card tampering or fraudulent presentation results in cancellation.',
    '14. Family Shield covers up to 5 family members under single registration.',
    '15. LABMEDIX Hospital reserves policy, doctor roster & tariff revision rights.'
  ];

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
        boxShadow: '0 20px 45px rgba(0,0,0,0.35)'
      }}
      className={`relative rounded-[18px] select-none border ${theme.border} overflow-hidden flex flex-col justify-between ${
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

      {/* 1. TOP: Magnetic Stripe & Signature/CVV Security Panel */}
      <div>
        <div className="w-full h-10 bg-black shadow-inner flex items-center px-4 justify-between">
          <span className="text-[7.5px] font-mono text-slate-400 tracking-widest uppercase">HiCo 2750 Oe Magnetic Track 1/2/3</span>
          <span className="text-[8px] font-mono text-amber-300 font-bold">{card.verificationCode}</span>
        </div>

        {/* Authorized Signature Panel & Security CVV Code */}
        <div className="px-5 mt-1.5 flex items-center gap-3">
          <div className="flex-1 h-6 bg-white rounded flex items-center px-3 border border-slate-300 justify-between shadow-inner">
            <span className="font-serif italic text-slate-800 text-[10px] select-none font-bold">
              {patient.fullName}
            </span>
            <span className="text-[7px] font-mono text-slate-400 uppercase">Authorized Signature</span>
          </div>

          <div className="h-6 px-2.5 bg-slate-900 text-white rounded flex items-center justify-center border border-slate-700 font-mono text-xs font-black shadow-sm gap-1">
            <span className="text-[7px] text-slate-400 font-bold uppercase">CVV:</span>
            {maskCvv ? (
              <span className="text-amber-400 font-mono tracking-widest flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5 text-amber-400" /> •••
              </span>
            ) : (
              <span className="text-amber-300">{card.cvv || card.verificationCode.slice(-3)}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN BODY: 2-Column Layout (Terms on Left, Verification & Support on Right) */}
      <div className="px-5 py-1 grid grid-cols-12 gap-3 items-center flex-1">
        {/* Left Column (8 cols): GOLD PRIVILEGE — TERMS & CONDITIONS */}
        <div className="col-span-8 space-y-1">
          <div className="flex items-center gap-1.5 border-b border-white/20 pb-0.5">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <h3 className="text-[9px] font-black uppercase tracking-wider text-amber-300 drop-shadow-xs">
              {tierTitle} — TERMS & CONDITIONS
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-y-[1.5px] text-[6.8px] leading-[8.8px] text-slate-200 opacity-95">
            {compactTerms.map((term, idx) => (
              <p key={idx} className="truncate">
                {term}
              </p>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): VERIFICATION AREA & QR CODE */}
        <div className="col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-amber-400/30 text-center shadow-inner">
          <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-300 mb-1">
            SCAN QR TO VERIFY CARD
          </span>

          <div className="w-16 h-16 bg-white p-1 rounded-lg shadow-md flex items-center justify-center overflow-hidden border border-slate-300">
            {backQrUrl ? (
              <img src={backQrUrl} alt="Scan QR" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-slate-100 animate-pulse" />
            )}
          </div>

          <span className="text-[7.5px] font-bold text-white mt-1 leading-tight">
            LABMEDIX
          </span>
          <span className="text-[6.5px] text-amber-200 italic font-serif">
            Confident in Care
          </span>
        </div>
      </div>

      {/* 3. BOTTOM FOOTER: Support Helpline, WhatsApp & Web from Company Settings */}
      <div className="px-5 pb-2.5 pt-1 border-t border-white/15 flex items-center justify-between text-[8px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-bold text-emerald-300">
            <Phone className="w-2.5 h-2.5 text-emerald-400" />
            <span>Support: {company.helpline || company.phone}</span>
          </div>

          {company.whatsapp && (
            <div className="flex items-center gap-1 font-bold text-teal-300">
              <MessageSquare className="w-2.5 h-2.5 text-teal-400" />
              <span>WhatsApp: {company.whatsapp}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[7.5px] opacity-85 font-mono">
          <span>Reg: {company.registrationNo}</span>
          <span>•</span>
          <span>{company.website}</span>
        </div>
      </div>
    </div>
  );
};