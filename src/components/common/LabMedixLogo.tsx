import React, { useState } from 'react';

interface LabMedixLogoProps {
  logoUrl?: string;
  companyName?: string;
  tagline?: string;
  estdYear?: string;
  variant?: 'monogram' | 'horizontal' | 'stacked' | 'badge' | 'seal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light' | 'teal' | 'gold' | 'white';
  showAccreditation?: boolean;
  className?: string;
}

export const LabMedixLogo: React.FC<LabMedixLogoProps> = ({
  logoUrl,
  companyName,
  tagline,
  estdYear,
  variant = 'horizontal',
  size = 'md',
  theme = 'teal',
  showAccreditation = false,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const displayName = companyName || 'LABMEDIX';
  const displayTagline = tagline || 'CONFIDENT IN CARE';
  const displayEstd = estdYear || '2025';

  // Size mapping
  const sizeMap = {
    xs: { icon: 22, textTitle: 'text-xs', textSub: 'text-[8px]', seal: 32 },
    sm: { icon: 30, textTitle: 'text-sm', textSub: 'text-[9px]', seal: 42 },
    md: { icon: 38, textTitle: 'text-base', textSub: 'text-[10px]', seal: 52 },
    lg: { icon: 48, textTitle: 'text-xl', textSub: 'text-xs', seal: 64 },
    xl: { icon: 64, textTitle: 'text-2xl', textSub: 'text-sm', seal: 84 }
  };

  const currentSize = sizeMap[size];

  // Theme color definitions
  const themeColors = {
    teal: {
      primary: '#0B2545',
      accent: '#0D9488',
      gradientStart: '#0B2545',
      gradientEnd: '#0D9488',
      title: 'text-slate-900 dark:text-white',
      sub: 'text-teal-600 dark:text-teal-400',
      ring: 'stroke-teal-500'
    },
    dark: {
      primary: '#081A36',
      accent: '#38BDF8',
      gradientStart: '#081A36',
      gradientEnd: '#1E3A8A',
      title: 'text-white',
      sub: 'text-cyan-300',
      ring: 'stroke-cyan-400'
    },
    light: {
      primary: '#FFFFFF',
      accent: '#0D9488',
      gradientStart: '#F0FDFA',
      gradientEnd: '#CCFBF1',
      title: 'text-slate-900',
      sub: 'text-teal-700',
      ring: 'stroke-teal-600'
    },
    gold: {
      primary: '#18092B',
      accent: '#F59E0B',
      gradientStart: '#2E1065',
      gradientEnd: '#78350F',
      title: 'text-amber-300',
      sub: 'text-amber-400',
      ring: 'stroke-amber-400'
    },
    white: {
      primary: '#FFFFFF',
      accent: '#FFFFFF',
      gradientStart: 'rgba(255,255,255,0.25)',
      gradientEnd: 'rgba(255,255,255,0.1)',
      title: 'text-white',
      sub: 'text-white/90',
      ring: 'stroke-white/80'
    }
  };

  const currentTheme = themeColors[theme];

  // Render Custom Uploaded Image or /logo.jpg if available & valid, else vector monogram
  const renderIconOrImage = (dimension: number) => {
    const activeLogoUrl = logoUrl || '/logo.jpg';
    if (activeLogoUrl && !imageError) {
      return (
        <div
          className="rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-white p-0.5 border border-white/40 shrink-0"
          style={{ width: dimension, height: dimension }}
        >
          <img
            src={activeLogoUrl}
            alt="LabMedix Logo"
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    return (
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm select-none"
      >
        <defs>
          <linearGradient id={`lmdx-grad-${theme}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={currentTheme.gradientStart} />
            <stop offset="50%" stopColor="#0B2545" />
            <stop offset="100%" stopColor={currentTheme.accent} />
          </linearGradient>
          <linearGradient id={`lmdx-cross-${theme}`} x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        {/* Hexagonal Shield Outer Ring */}
        <polygon
          points="50,4 92,26 92,74 50,96 8,74 8,26"
          fill={`url(#lmdx-grad-${theme})`}
          stroke={currentTheme.accent}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Soft Glow Frame */}
        <polygon
          points="50,11 85,29 85,71 50,89 15,71 15,29"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
        />

        {/* Healthcare Cross Core */}
        <path
          d="M44 26 H56 V44 H74 V56 H56 V74 H44 V56 H26 V44 H44 Z"
          fill={`url(#lmdx-cross-${theme})`}
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Dynamic ECG Heartbeat Pulse Line */}
        <path
          d="M18 50 L34 50 L40 38 L48 64 L54 36 L60 54 L66 50 L82 50"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center Caduceus / Trust Sparkle */}
        <circle cx="50" cy="50" r="3.5" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="1.8" fill="#0D9488" />
      </svg>
    );
  };

  // Variant: Monogram Icon Only
  if (variant === 'monogram') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderIconOrImage(currentSize.icon)}
      </div>
    );
  }

  // Variant: Circular Verification Seal with Outer Typography Ring
  if (variant === 'seal') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: currentSize.seal, height: currentSize.seal }}>
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full animate-[spin_40s_linear_infinite]"
        >
          <path
            id="sealTextPath"
            d="M 80, 80 m -62, 0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0"
            fill="none"
          />
          <circle cx="80" cy="80" r="76" fill="none" stroke={currentTheme.accent} strokeWidth="2.5" strokeDasharray="4 2" />
          <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <text className="text-[10.5px] font-black uppercase tracking-[3.8px] fill-current" style={{ fill: theme === 'white' ? '#FFFFFF' : '#0D9488' }}>
            <textPath href="#sealTextPath" startOffset="0%">
              • {displayName} • {displayTagline} •
            </textPath>
          </text>
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          {renderIconOrImage(currentSize.icon * 0.85)}
        </div>
      </div>
    );
  }

  // Variant: Stacked (For Centered Card Headers & Modals)
  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center gap-1.5 ${className}`}>
        {renderIconOrImage(currentSize.icon)}
        <div>
          <h2 className={`font-black tracking-wider uppercase leading-none font-sans ${currentSize.textTitle} ${currentTheme.title}`}>
            {displayName.includes(' ') ? (
              <>
                <span>{displayName.split(' ')[0]} </span>
                <span className="text-teal-400">{displayName.split(' ').slice(1).join(' ')}</span>
              </>
            ) : (
              displayName
            )}
          </h2>
          <p className={`font-semibold tracking-tight uppercase ${currentSize.textSub} ${currentTheme.sub}`}>
            {displayTagline}
          </p>
          {showAccreditation && (
            <span className="text-[8px] font-mono font-bold text-slate-400 block mt-0.5 tracking-wider">
              ISO 9001:2015 ACCREDITED
            </span>
          )}
        </div>
      </div>
    );
  }

  // Variant: Badge Pill
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-sm ${className}`}>
        {renderIconOrImage(currentSize.icon * 0.75)}
        <div className="text-left">
          <div className="flex items-center gap-1">
            <span className="font-black text-xs text-white tracking-wide truncate max-w-[120px]">{displayName}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          </div>
          <span className="text-[9px] font-bold text-teal-400 uppercase tracking-tighter block leading-none">
            HEALTH IDENTITY
          </span>
        </div>
      </div>
    );
  }

  // Variant: Horizontal (Default Navbar & Official Card Top Bar)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {renderIconOrImage(currentSize.icon)}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <h1 className={`font-black tracking-wider uppercase font-sans ${currentSize.textTitle} ${currentTheme.title}`}>
            {displayName.includes(' ') ? (
              <>
                <span>{displayName.split(' ')[0]} </span>
                <span className="text-teal-400">{displayName.split(' ').slice(1).join(' ')}</span>
              </>
            ) : (
              displayName
            )}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`font-bold tracking-tight uppercase ${currentSize.textSub} ${currentTheme.sub}`}>
            {displayTagline}
          </span>
          {showAccreditation && (
            <>
              <span className="text-slate-400 text-[9px]">•</span>
              <span className="text-[8px] font-mono font-bold text-teal-400 tracking-tight">
                ESTD. {displayEstd}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
