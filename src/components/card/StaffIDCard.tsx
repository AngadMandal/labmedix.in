import React, { useEffect, useState } from 'react';
import { User, CompanyProfile } from '../../types';
import { ROLE_CONFIGS } from '../../constants/roles';
import { generateQrDataUrl, buildVerificationUrl } from '../../utils/qr';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { RoleBadge } from '../common/RoleBadge';
import { Barcode } from '../common/Barcode';
import {
  ShieldCheck,
  Wifi,
  Phone,
  Heart,
  Sparkles,
  Building2,
  Lock,
  Award,
  CheckCircle2,
  QrCode,
  Layers,
  Fingerprint,
  MapPin,
  Mail,
  Globe,
  Radio,
  FileBadge
} from 'lucide-react';

export type StaffCardTheme = 'premium_medical' | 'executive_secure' | 'modern_healthcare';

export interface StaffCardDesignConfig {
  theme?: StaffCardTheme;
  showLanyard?: boolean;
  materialFinish?: 'gloss' | 'matte' | 'gold_foil' | 'hologram';
}

interface StaffIDCardProps {
  user: User;
  company: CompanyProfile;
  side?: 'front' | 'back';
  showLanyard?: boolean;
  scale?: number;
  idPrefix?: string;
  theme?: StaffCardTheme;
  materialFinish?: 'gloss' | 'matte' | 'gold_foil' | 'hologram';
}

export const StaffIDCard: React.FC<StaffIDCardProps> = ({
  user,
  company,
  side = 'front',
  showLanyard = false,
  scale = 1,
  idPrefix = 'staff-card',
  theme = 'premium_medical',
  materialFinish = 'gloss'
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.reception;
  const staffId = user.staffId || `LMDX-STF-${user.id.slice(-3).toUpperCase()}`;
  const employeeNo = user.employeeNo || `LMDX-EMP-${staffId.replace(/\D/g, '').padStart(3, '0')}`;
  const serialNumber = `SN: ${company.estdYear || '2025'}-${company.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'LMDX'}-${staffId.replace(/[^0-9]/g, '').padStart(4, '0') || '0101'}`;

  const issueDateStr = user.joiningDate || (user.createdAt ? user.createdAt.slice(0, 10) : `${company.estdYear || '2025'}-01-01`);
  const expiryDateStr = user.expiryDate || '2028-12-31';

  // Full dynamic address string
  const fullAddress = [company.address, company.district, company.state, company.pinCode].filter(Boolean).join(', ');

  useEffect(() => {
    if (user.qrCodeDataUrl) {
      setQrUrl(user.qrCodeDataUrl);
    } else {
      const verifyUrl = buildVerificationUrl(staffId);
      generateQrDataUrl(verifyUrl, 260).then(setQrUrl);
    }
  }, [staffId, user.qrCodeDataUrl]);

  // 3 Distinct Visual Themes
  const themeStyles = {
    // 1. Premium Medical (Default LabMedix Template)
    premium_medical: {
      cardBg: 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 50%, #ECFEFF 100%)',
      headerBg: 'linear-gradient(135deg, #051937 0%, #004D7A 40%, #008793 75%, #00BF72 100%)',
      headerAccent: '#0D9488',
      headerTextColor: '#FFFFFF',
      titleColor: 'text-slate-900',
      designationColor: 'text-teal-700 font-bold',
      departmentBg: 'bg-teal-50 text-teal-900 border-teal-200',
      chipGradient: 'from-amber-200 via-amber-400 to-amber-600 border-amber-600/70',
      patternColor: 'rgba(13, 148, 136, 0.08)',
      footerBg: 'bg-slate-900 text-white',
      badgeBorder: 'border-teal-400/40',
      cardBorder: 'border-teal-600/30',
      barcodeTheme: 'teal' as const
    },
    // 2. Executive Secure
    executive_secure: {
      cardBg: 'linear-gradient(180deg, #0F172A 0%, #1E293B 60%, #090D16 100%)',
      headerBg: 'linear-gradient(135deg, #090D16 0%, #1E1B4B 50%, #312E81 100%)',
      headerAccent: '#F59E0B',
      headerTextColor: '#FAF5FF',
      titleColor: 'text-white',
      designationColor: 'text-amber-300 font-bold',
      departmentBg: 'bg-purple-950/80 text-purple-200 border-purple-800',
      chipGradient: 'from-yellow-100 via-amber-300 to-yellow-600 border-amber-500',
      patternColor: 'rgba(245, 158, 11, 0.07)',
      footerBg: 'bg-black text-amber-200',
      badgeBorder: 'border-amber-400/40',
      cardBorder: 'border-amber-500/30',
      barcodeTheme: 'gold' as const
    },
    // 3. Modern Healthcare
    modern_healthcare: {
      cardBg: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 65%, #F1F5F9 100%)',
      headerBg: 'linear-gradient(135deg, #0B2545 0%, #134E4A 50%, #0D9488 100%)',
      headerAccent: '#38BDF8',
      headerTextColor: '#FFFFFF',
      titleColor: 'text-slate-900',
      designationColor: 'text-blue-600 font-bold',
      departmentBg: 'bg-slate-100 text-slate-800 border-slate-200',
      chipGradient: 'from-slate-200 via-slate-400 to-slate-500 border-slate-600',
      patternColor: 'rgba(56, 189, 248, 0.08)',
      footerBg: 'bg-slate-800 text-slate-100',
      badgeBorder: 'border-blue-400/40',
      cardBorder: 'border-slate-300',
      barcodeTheme: 'dark' as const
    }
  };

  const activeTheme = themeStyles[theme] || themeStyles.premium_medical;

  // Material Finish Overlays
  const getMaterialOverlay = () => {
    switch (materialFinish) {
      case 'gold_foil':
        return (
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/15 via-yellow-200/25 to-transparent pointer-events-none z-20 mix-blend-overlay" />
        );
      case 'hologram':
        return (
          <div
            className="absolute inset-0 pointer-events-none z-20 opacity-35 mix-blend-color-dodge"
            style={{
              background:
                'linear-gradient(115deg, transparent 20%, rgba(255,0,128,0.4) 35%, rgba(0,255,255,0.5) 50%, rgba(255,255,0,0.4) 65%, transparent 80%)'
            }}
          />
        );
      case 'matte':
        return (
          <div className="absolute inset-0 bg-black/5 pointer-events-none z-20 backdrop-blur-[0.2px]" />
        );
      default:
        // Gloss
        return (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-white/20 pointer-events-none z-20" />
        );
    }
  };

  return (
    <div
      className="inline-block relative select-none"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center'
      }}
    >
      {/* Lanyard Simulator Strap & Metallic Clip */}
      {showLanyard && (
        <div className="flex flex-col items-center -mb-3 z-30 relative">
          <div
            className="w-10 h-12 rounded-t-md shadow-lg flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #0B2545 0%, #0D9488 100%)' }}
          >
            <div className="w-2.5 h-full bg-white/25" />
            <span className="text-[7.5px] font-black text-white uppercase tracking-tighter absolute -rotate-90">
              {company.name || 'LABMEDIX'}
            </span>
          </div>
          <div className="w-16 h-4 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 rounded-full border-2 border-slate-600 shadow-md flex items-center justify-center">
            <div className="w-6 h-1.5 bg-slate-800 rounded-full" />
          </div>
        </div>
      )}

      {/* ISO CR80 Physical Proportion PVC Pass (340px x 535px ~ 54mm x 85.6mm) */}
      <div
        id={`${idPrefix}-${side}`}
        className={`w-[340px] h-[535px] rounded-[24px] overflow-hidden border-2 shadow-2xl relative flex flex-col justify-between ${activeTheme.cardBorder}`}
        style={{
          background: activeTheme.cardBg,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.38), 0 0 0 1px rgba(0,0,0,0.06)'
        }}
      >
        {/* Material finish sheen */}
        {getMaterialOverlay()}

        {/* Lanyard Hole Punch Slot */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-11 h-2 bg-slate-300/80 dark:bg-slate-700/80 rounded-full border border-slate-500/40 z-30 flex items-center justify-center shadow-inner">
          <div className="w-7 h-1 bg-slate-500 dark:bg-slate-900 rounded-full" />
        </div>

        {/* Sophisticated Vector Micro-Pattern Security Grid */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-90"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={`micropattern-${theme}-${idPrefix}`} width="36" height="36" patternUnits="userSpaceOnUse">
              <path
                d="M 0 18 L 18 0 L 36 18 L 18 36 Z"
                fill="none"
                stroke={activeTheme.patternColor}
                strokeWidth="0.8"
              />
              <circle cx="18" cy="18" r="4" fill="none" stroke={activeTheme.patternColor} strokeWidth="0.6" />
              <path d="M 9 18 L 27 18 M 18 9 L 18 27" stroke={activeTheme.patternColor} strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#micropattern-${theme}-${idPrefix})`} />
        </svg>

        {side === 'front' ? (
          /* =========================================================================
             FRONT SIDE: OFFICIAL HEALTHCARE EMPLOYEE IDENTITY PASS
             ========================================================================= */
          <>
            {/* Top Curved Executive Header Bar */}
            <div
              className="p-5 pt-8 pb-3.5 text-white relative overflow-hidden z-10 shadow-sm"
              style={{ background: activeTheme.headerBg }}
            >
              {/* Background ambient lighting */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full bg-white/10 blur-lg pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                {/* Official LabMedix Custom Vector Monogram & Wordmark */}
                <div className="flex items-center gap-2">
                  <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="sm" theme="white" />
                  <div className="text-left">
                    <h3 className="font-black text-xs tracking-wider uppercase leading-tight drop-shadow-xs text-white">
                      {company.name || 'LABMEDIX'}
                    </h3>
                    <p className="text-[8px] text-white/90 font-bold tracking-tight">
                      {company.tagline || 'HEALTHCARE IDENTITY PASS'}
                    </p>
                  </div>
                </div>

                {/* RFID / Contactless Wave Indicator */}
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-white/90 animate-pulse" />
                  <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black bg-white/20 border border-white/30 uppercase tracking-widest backdrop-blur-xs text-white">
                    RFID PASS
                  </span>
                </div>
              </div>
            </div>

            {/* Role Banner Ribbon */}
            <RoleBadge role={user.role} variant="ribbon" className="relative z-10" />

            {/* Main Center Body: Passport Photo, Name & Clinical Metadata */}
            <div className="px-5 pt-2 pb-1 flex flex-col items-center text-center space-y-2 flex-1 justify-center relative z-10">
              {/* Passport Photo Frame (35mm x 45mm ISO standard with silver-teal bevel) */}
              <div className="relative">
                <div className="w-24 h-28 rounded-2xl overflow-hidden border-2 border-teal-500/70 shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative ring-2 ring-white/90">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.fullName}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div
                      className="w-full h-full font-black text-3xl flex items-center justify-center text-white"
                      style={{ background: activeTheme.headerBg }}
                    >
                      {user.fullName.charAt(0)}
                    </div>
                  )}
                  {/* Subtle Holographic Shimmer Line */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
                </div>

                {/* Blood Group Capsule Badge */}
                {user.bloodGroup && (
                  <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white border-2 border-white dark:border-slate-900 shadow-md flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5 fill-current" /> {user.bloodGroup}
                  </span>
                )}
              </div>

              {/* Staff Details & Typography */}
              <div className="space-y-0.5 pt-1">
                <h2 className={`text-base font-black tracking-tight leading-tight ${activeTheme.titleColor}`}>
                  {user.fullName}
                </h2>
                <p className={`text-xs ${activeTheme.designationColor}`}>
                  {user.designation || roleConfig.name}
                </p>
                <div className="pt-0.5 flex flex-wrap items-center justify-center gap-1">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-semibold border ${activeTheme.departmentBg}`}>
                    {user.department || 'Clinical Operations'}
                  </span>
                  {user.workPhone && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {user.workPhone}
                    </span>
                  )}
                </div>
              </div>

              {/* EMV Smart Chip & Staff ID Code */}
              <div className="flex items-center justify-center gap-2.5 pt-1 w-full">
                {/* Gold EMV Smart Chip */}
                <div
                  className={`w-9 h-6 rounded-md bg-gradient-to-br ${activeTheme.chipGradient} shadow-xs relative flex items-center justify-center`}
                >
                  <div className="w-7 h-4 border border-amber-950/40 rounded-xs flex items-center justify-center">
                    <div className="w-3 h-2 border-r border-l border-amber-950/40" />
                  </div>
                </div>

                {/* Staff ID Pill */}
                <div className="px-2.5 py-1 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-xs text-left">
                  <span className="text-[7.5px] text-slate-400 uppercase font-bold block leading-none">STAFF ID</span>
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-white tracking-wider">
                    {staffId}
                  </span>
                </div>

                {/* Access Zone Pill */}
                <div className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-left">
                  <span className="text-[7px] text-slate-400 uppercase font-bold block leading-none">CLEARANCE</span>
                  <span className="font-mono font-bold text-[9.5px] text-teal-700 dark:text-teal-300 truncate max-w-[85px] block">
                    {user.accessZone ? user.accessZone.split(':')[0] : 'ZONE A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom High-Tech Footer with Dynamic QR Code */}
            <div className="p-3 px-5 bg-white/90 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between relative z-10 backdrop-blur-xs">
              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-1 text-[8.5px] font-bold text-slate-700 dark:text-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{company.isoCertification || 'ISO 9001:2015 ACCREDITED'}</span>
                </div>
                <p className="text-[8px] text-slate-500 dark:text-slate-400 font-mono">
                  ISSUED: {issueDateStr} • EXP: {expiryDateStr}
                </p>
                <p className="text-[7.5px] text-slate-400 font-mono">
                  {serialNumber}
                </p>
              </div>

              {/* Dynamic QR Verification Code with Scan Crosshairs */}
              {qrUrl && (
                <div className="p-1 bg-white rounded-xl border border-slate-300 shadow-xs relative">
                  <img src={qrUrl} alt="Staff QR" className="w-10 h-10 object-contain" />
                  {/* Scan target crosshairs */}
                  <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-teal-600" />
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-teal-600" />
                  <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-teal-600" />
                  <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-teal-600" />
                </div>
              )}
            </div>
          </>
        ) : (
          /* =========================================================================
             BACK SIDE: SECURITY CLEARANCE, HELPLINE & CODE128 BARCODE
             ========================================================================= */
          <>
            {/* Top Security Header with Dynamic Company Name */}
            <div className="p-4 pt-8 text-center border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 relative z-10">
              <span className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase block">
                {company.name || 'LABMEDIX'} HEALTHCARE SYSTEM
              </span>
              <p className="text-[8px] text-slate-400 font-mono">
                Official Clinical & Operational Access Pass • Estd. {company.estdYear || '2025'}
              </p>
            </div>

            {/* HiCo 4000 Oe Magnetic Stripe Simulation */}
            <div className="w-full h-7 bg-slate-950 my-0.5 relative z-10 flex items-center justify-end px-3">
              <span className="text-[7px] font-mono text-slate-500">HiCo 4000 Oe ENCODED • SECURE NFC</span>
            </div>

            {/* Security Clearance Details & Emergency Helplines */}
            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between text-[10px] relative z-10">
              {/* Role Clearance Badge & Station info */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <RoleBadge role={user.role} variant="clearance" />
                  <span className="text-[8px] font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-300 dark:border-teal-800">
                    {employeeNo}
                  </span>
                </div>
                {user.accessZone && (
                  <p className="text-[8px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate">
                    🔒 {user.accessZone}
                  </p>
                )}
                {user.email && (
                  <p className="text-[8px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate flex items-center gap-1">
                    <Mail className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>
                )}
              </div>

              {/* Dynamic Company Emergency Helplines */}
              <div className="space-y-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[8.5px] shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">24x7 Helpline:</span>
                  <strong className="text-slate-900 dark:text-white">{company.helpline || '1800-889-9911'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ambulance Emergency:</span>
                  <strong className="text-rose-600 dark:text-rose-400">{company.ambulanceHelpline || '1800-889-9911'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Blood Bank Hotline:</span>
                  <strong className="text-slate-900 dark:text-white">{company.bloodBankHelpline || '1800-889-9922'}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-0.5 mt-0.5">
                  <span className="text-slate-500">Staff Next of Kin:</span>
                  <strong className="text-teal-600 dark:text-teal-400">{user.emergencyContact || '9830099999'} ({user.emergencyContactName || 'Family'})</strong>
                </div>
              </div>

              {/* Dynamic Company Address & Return Notice */}
              <div className="text-[7.5px] text-slate-500 dark:text-slate-400 leading-tight space-y-0.5">
                <p className="truncate">
                  📍 {fullAddress || 'HQ Medical Complex, Kolkata - 700001'}
                </p>
                <p>
                  {company.cardFooterNotice || 'This credential is the official property of LABMEDIX. If found, please return to any LABMEDIX branch.'}
                </p>
              </div>

              {/* Signature Strip & Issuing Authority */}
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[7px] text-slate-400 uppercase font-mono block">CARDHOLDER SIGNATURE</span>
                  <div className="w-28 h-5 bg-slate-100 dark:bg-slate-800 border-b border-slate-400 flex items-center justify-center italic text-slate-700 dark:text-slate-200 font-serif text-xs">
                    {user.fullName.split(' ')[0]}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[7px] text-slate-400 uppercase font-mono block">ISSUING AUTHORITY</span>
                  <div className="w-20 h-5 border-b border-teal-500 flex items-center justify-end font-mono text-[7.5px] font-bold text-teal-600">
                    MEDICAL DIRECTOR
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom High-Precision SVG Barcode Section */}
            <div className="p-2 px-3 bg-slate-950 text-white text-center font-mono relative z-10 flex flex-col items-center justify-center">
              <Barcode
                value={staffId}
                theme="light"
                height={28}
                width={220}
                showText={true}
              />
              <span className="text-[6.5px] text-slate-400 tracking-widest block mt-0.5">
                {serialNumber} • {company.website || 'labmedix.org'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
