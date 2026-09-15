import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Patient, HealthCard, Membership, CompanyProfile } from '../../types';
import { CardholderAuthService } from '../../services/cardholderAuthService';
import { StorageService } from '../../services/storage';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { useToast } from '../../context/ToastContext';
import {
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Fingerprint,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Crown,
  QrCode,
  Smartphone,
  Activity,
  HeartPulse,
  Flame,
  RotateCw,
  FileCheck,
  User,
  ExternalLink,
  Layers,
  Wand2,
  Phone
} from 'lucide-react';

interface Portal3DLoginScreenProps {
  company: CompanyProfile;
  onAuthenticated: (patient: Patient) => void;
  onOpenApplyModal: () => void;
  onOpenTrackModal: () => void;
}

export const Portal3DLoginScreen: React.FC<Portal3DLoginScreenProps> = ({
  company,
  onAuthenticated,
  onOpenApplyModal,
  onOpenTrackModal,
}) => {
  const { showToast } = useToast();

  // Auth Inputs
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  // Anti-Bot Captcha State
  const [captchaNum1, setCaptchaNum1] = useState(7);
  const [captchaNum2, setCaptchaNum2] = useState(5);
  const [userCaptcha, setUserCaptcha] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // Security Lockout State
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // 3D Card Interactive Tilt & Flip
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Active Auth Mode
  const [authMode, setAuthMode] = useState<'card' | 'mobile' | 'patientId'>('card');

  // Refresh Anti-Bot Captcha
  const refreshCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 2;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setUserCaptcha('');
    setCaptchaError(false);
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Handle 3D Mouse Parallax on Interactive Card (Optimized with requestAnimationFrame)
  const animFrameRef = useRef<number | null>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    
    const rect = cardContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    animFrameRef.current = requestAnimationFrame(() => {
      const rotateX = -(y / rect.height) * 18;
      const rotateY = (x / rect.width) * 18;
      setCardTilt({ x: rotateX, y: rotateY });
    });
  };

  const handleMouseLeave = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsHoveringCard(false);
    setCardTilt({ x: 0, y: 0 });
  };

  // Handle Login Authentication
  const handleCardholderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError(false);

    if (lockoutSeconds > 0) return;

    if (!loginId.trim()) {
      setError('Please enter your Card Number, Mobile, or Patient ID.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your Portal Password or PIN.');
      return;
    }

    const expected = captchaNum1 + captchaNum2;
    if (userCaptcha.trim() !== String(expected)) {
      setCaptchaError(true);
      setError('Incorrect Anti-Bot Captcha sum. Please calculate the equation.');
      return;
    }

    setIsLoggingIn(true);

    try {
      const res = await CardholderAuthService.authenticateAsync(
        loginId,
        password,
        userCaptcha,
        String(expected)
      );

      setIsLoggingIn(false);

      if (!res.success) {
        if (res.isLocked && res.remainingSeconds) {
          setLockoutSeconds(res.remainingSeconds);
        }
        if (res.error?.toLowerCase().includes('captcha')) {
          setCaptchaError(true);
        }
        setError(res.error || 'Authentication failed. Please verify your credentials.');
        refreshCaptcha();
        return;
      }

      if (res.patient) {
        showToast('success', `Welcome, ${res.patient.fullName}!`, 'Smart Health Cardholder Portal unlocked.');
        onAuthenticated(res.patient);
      }
    } catch (err) {
      console.error('Login error:', err);
      setIsLoggingIn(false);
      setError('A system error occurred during authentication.');
    }
  };

  // Display card number formatted for 3D card preview
  const previewCardNumber = loginId.trim()
    ? loginId.toUpperCase().slice(0, 18)
    : 'LHC-2026-889912';

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans text-slate-100 selection:bg-teal-500 selection:text-slate-950 bg-slate-950">
      {/* 1. ULTRA HIGH-TECH 3D BACKGROUND STAGE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Deep Cosmic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#051329] to-[#020b17]" />

        {/* 3D Floor Perspective Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(20, 184, 166, 0.15) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(56, 189, 248, 0.15) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            transform: 'perspective(600px) rotateX(45deg) translateY(-20%) scale(1.5)',
            transformOrigin: 'top center',
          }}
        />

        {/* Glowing Luminous Orbs */}
        <div className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[140px] animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-[550px] h-[550px] rounded-full bg-blue-600/15 blur-[150px]" />
        <div className="absolute top-1/2 right-10 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[120px]" />

        {/* Hexagonal Radial Glow Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.75)_100%)]" />
      </div>

      {/* 2. TOP BRANDED 3D GLASS NAVIGATION BAR */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 py-2 px-4 sm:px-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 p-0.5 shadow-[0_0_20px_rgba(20,184,166,0.4)] flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="sm" theme="teal" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
                {company.name || 'LABMEDIX'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm">
                PORTAL ID 3D
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-none hidden sm:block">
              Accredited Diagnostics • Cashless Health Shield System
            </p>
          </div>
        </div>

        {/* Top Status & Staff Access Badges */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-teal-500/30 text-teal-300 text-xs font-mono shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-[11px]">256-BIT ENCRYPTED</span>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Staff Login →</span>
          </Link>
        </div>
      </header>

      {/* 3. MAIN 3D TWO-COLUMN WORKSPACE */}
      <main className="relative z-10 w-full max-w-7xl mx-auto my-6 lg:my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT COLUMN: INTERACTIVE 3D HOLOGRAPHIC SMART CARD & BENEFITS (5 cols) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          
          {/* Cardholder Badge & Tagline */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-black uppercase tracking-wider shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span>Smart Health Shield ID Gateway</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Instant Access to Your <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-teal-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                Digital Health Card
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
              Login with your Health Card Number, Registered Mobile, or Patient ID to access cashless pathology discounts, live lab test reports, digital prescriptions, and instant wallet balance.
            </p>
          </div>

          {/* 3D INTERACTIVE TILT HEALTH CARD SHOWCASE */}
          <div
            ref={cardContainerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-md cursor-pointer select-none perspective-1000 py-2"
            onClick={() => setIsCardFlipped(prev => !prev)}
            title="Click to Flip Card 3D"
          >
            <motion.div
              animate={{
                rotateX: cardTilt.x,
                rotateY: cardTilt.y + (isCardFlipped ? 180 : 0),
                scale: isHoveringCard ? 1.04 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative w-full aspect-[1.586/1] rounded-3xl p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(20,184,166,0.25)] border-2 border-teal-400/40 text-white overflow-hidden bg-gradient-to-br from-[#0c233c] via-[#091b2e] to-[#04332c]"
            >
              {/* Dynamic Holographic Foil Shimmer Streak */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(115deg, transparent 20%, rgba(56, 189, 248, 0.4) 45%, rgba(244, 114, 182, 0.4) 55%, transparent 80%)',
                  transform: `translateX(${cardTilt.y * 5}px) translateY(${cardTilt.x * 5}px)`,
                }}
              />

              {/* CARD FRONT SIDE */}
              {!isCardFlipped ? (
                <div className="relative z-10 h-full flex flex-col justify-between">
                  {/* Card Header: Brand & Chip */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white p-1 border border-white/40 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
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
                      <div className="text-left">
                        <span className="text-xs font-black tracking-wider uppercase block text-white truncate max-w-[170px]">
                          {company.name || 'LABMEDIX'}
                        </span>
                        <span className="text-[9px] font-bold text-teal-300 uppercase tracking-widest block">
                          SMART HEALTH SHIELD
                        </span>
                      </div>
                    </div>

                    {/* Contactless Waves & VIP Seal */}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5" />
                        <span>VIP / GOLD</span>
                      </span>
                      <Activity className="w-4 h-4 text-teal-300 animate-pulse" />
                    </div>
                  </div>

                  {/* EMV Microchip & Contactless Waves */}
                  <div className="flex items-center gap-3 my-auto">
                    <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 p-1 shadow-inner border border-amber-100/50 flex flex-col justify-between">
                      <div className="w-full h-1 bg-amber-900/30 rounded-sm" />
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full border border-amber-900/40" />
                        <div className="w-2 h-2 rounded-full border border-amber-900/40" />
                      </div>
                      <div className="w-full h-1 bg-amber-900/30 rounded-sm" />
                    </div>
                    <Smartphone className="w-4 h-4 text-slate-300" />
                  </div>

                  {/* Card Number & Holder Info */}
                  <div className="space-y-2 text-left">
                    <div className="font-mono text-sm sm:text-base font-black tracking-[0.2em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {previewCardNumber}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono pt-1 border-t border-white/10">
                      <div>
                        <span className="text-[8px] text-teal-400 block uppercase font-sans font-bold">CARDHOLDER</span>
                        <strong className="text-white text-xs font-sans tracking-wide">
                          {loginId ? 'VERIFIED PATIENT' : 'MR. SOUMEN ROY'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[8px] text-teal-400 block uppercase font-sans font-bold">EXPIRES</span>
                        <strong className="text-white text-xs">12/2028</strong>
                      </div>
                      <div>
                        <span className="text-[8px] text-teal-400 block uppercase font-sans font-bold">CASHLESS</span>
                        <strong className="text-emerald-300 text-xs font-bold">FLAT 50% OFF</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* CARD BACK SIDE (ROTATED) */
                <div
                  className="relative z-10 h-full flex flex-col justify-between text-left"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  {/* Magnetic Stripe */}
                  <div className="-mx-6 -mt-2 h-10 bg-slate-950 border-y border-slate-800" />

                  {/* CVV Signature Bar */}
                  <div className="space-y-1 my-auto">
                    <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center justify-between">
                      <span>Authorized Signature & CVV Code</span>
                      <span className="text-amber-300 text-[8px] font-bold">⭐ CVV = PORTAL PASSWORD</span>
                    </div>
                    <div className="h-8 bg-white/95 rounded-md px-3 flex items-center justify-between text-slate-900 font-mono border border-slate-300">
                      <span className="italic text-xs font-serif font-bold text-slate-700">LabMedix Authorized</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-slate-500 uppercase font-sans font-bold">CVV:</span>
                        <strong className="bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded text-xs font-black tracking-widest border border-amber-400/50 shadow-sm">
                          888
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Helpline & Barcode */}
                  <div className="flex items-center justify-between text-[9px] text-slate-300 border-t border-white/10 pt-2 font-mono">
                    <div className="flex items-center gap-1 text-teal-300">
                      <Phone className="w-3 h-3 text-teal-400" />
                      <span>24x7 Emergency: 1800-889-9911</span>
                    </div>
                    <span className="text-[8px] text-slate-400">ISO 15189 / 9001 CERTIFIED</span>
                  </div>
                </div>
              )}

              {/* 3D Flip Helper Pill */}
              <div className="absolute bottom-2 right-3 z-20 pointer-events-none">
                <span className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold bg-slate-950/70 border border-white/10 text-slate-300 flex items-center gap-1 shadow-sm">
                  <RotateCw className="w-2.5 h-2.5 text-teal-400" />
                  <span>Click to Flip</span>
                </span>
              </div>
            </motion.div>
          </div>

          {/* BENEFIT HIGHLIGHTS BENTO GRID */}
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-md pt-2">
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Up to 50% Cashless</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Discounts on all 350+ Lab investigations.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <HeartPulse className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant Lab Reports</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Live QR verification & WhatsApp PDF dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D HIGH-TECH AUTHENTICATION CONSOLE (7 cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-slate-900/90 backdrop-blur-2xl border-2 border-teal-500/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(20,184,166,0.18)] space-y-5 relative">
            
            {/* Console Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Cardholder Verification Console
                  </h2>
                  <p className="text-xs text-slate-400">
                    Secure 3D Patient ID & PIN Gateway
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>ACTIVE</span>
              </div>
            </div>

            {/* SEGMENTED INPUT MODE SWITCHER */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMode('card')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'card'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card Number</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('mobile')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'mobile'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Number</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('patientId')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'patientId'
                    ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Patient ID</span>
              </button>
            </div>

            {/* MAIN LOGIN FORM */}
            <form onSubmit={handleCardholderLogin} className="space-y-4">
              
              {/* Field 1: Identifier (Card No / Mobile / ID) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {authMode === 'card' ? (
                      <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                    ) : authMode === 'mobile' ? (
                      <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-teal-400" />
                    )}
                    {authMode === 'card'
                      ? '1. Health Card Number:'
                      : authMode === 'mobile'
                      ? '1. Registered Mobile Number:'
                      : '1. Patient ID / Email:'}
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    ⭐ Recommended
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => {
                      setLoginId(e.target.value);
                      setError('');
                    }}
                    placeholder={
                      authMode === 'card'
                        ? 'Enter Card No (e.g. LHC-2026-000001)'
                        : authMode === 'mobile'
                        ? 'Enter 10-digit Mobile (e.g. 9830012345)'
                        : 'Enter Patient ID (e.g. PAT-2026-001)'
                    }
                    disabled={lockoutSeconds > 0}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border-2 border-slate-700/80 focus:border-teal-400 focus:ring-4 focus:ring-teal-500/20 text-white font-mono text-sm tracking-wider placeholder:text-slate-600 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Field 2: Portal Password or CVV */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    2. Card CVV Code / Password:
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    ⭐ Recommended: 3-Digit CVV
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter 3-Digit CVV from Card Back (e.g. 888) or PIN"
                    disabled={lockoutSeconds > 0}
                    className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-950 border-2 border-slate-700/80 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 text-white font-mono text-sm tracking-widest placeholder:text-slate-600 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <span className="text-amber-400 font-bold">💡 Tip:</span>
                  <span>Flip your card or check the back strip for the 3-digit CVV security code to log in.</span>
                </p>
              </div>

              {/* Field 3: 3D Anti-Bot Mathematical Verification Gate */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                    3. Anti-Bot Mathematical Verification:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="text-slate-400 hover:text-teal-300 text-[11px] flex items-center gap-1 font-mono transition-colors"
                      title="Generate new captcha equation"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-teal-500/50 text-base font-black font-mono tracking-widest text-teal-300 shadow-inner flex items-center gap-1">
                    <span>{captchaNum1}</span>
                    <span className="text-slate-400">+</span>
                    <span>{captchaNum2}</span>
                    <span className="text-slate-400">=</span>
                    <span className="text-amber-300">?</span>
                  </div>
                  <input
                    type="number"
                    placeholder="Enter Sum"
                    value={userCaptcha}
                    onChange={(e) => {
                      setUserCaptcha(e.target.value);
                      setCaptchaError(false);
                      setError('');
                    }}
                    disabled={lockoutSeconds > 0}
                    className={`flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border text-center font-mono font-black text-sm text-white outline-none transition-all ${
                      captchaError
                        ? 'border-rose-500 text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Brute-Force Rate Limit Lockout Active Warning */}
              {lockoutSeconds > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs space-y-1.5 animate-pulse">
                  <div className="flex items-center gap-2 font-black text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Security Rate-Limit Active</span>
                  </div>
                  <p className="text-[11px] leading-tight">
                    Card access locked for 5 consecutive failed attempts.
                  </p>
                  <div className="font-mono text-sm font-black text-amber-300">
                    ⏳ Unlocks in: {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
                  </div>
                </div>
              )}

              {/* Error Message Box */}
              {error && lockoutSeconds === 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 3D Glowing Authenticate Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn || lockoutSeconds > 0}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 hover:from-teal-300 hover:via-emerald-300 hover:to-cyan-200 shadow-[0_0_30px_rgba(20,184,166,0.4)] border border-teal-200/50 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>AUTHENTICATING 3D ID...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-slate-950 fill-slate-950 group-hover:scale-110 transition-transform" />
                    <span>ENTER CARDHOLDER SMART PORTAL</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* QUICK ACTIONS: APPLY ONLINE & TRACK STATUS */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={onOpenApplyModal}
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Apply for New Health Card</span>
              </button>

              <button
                type="button"
                onClick={onOpenTrackModal}
                className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-bold transition-colors"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Track Card Status</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM 3D SECURITY ASSURANCE FOOTER */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto py-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60 mt-4">
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>LabMedix 3D Health Card System • ISO 15189 Certified Data Protection</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <Link to="/login" className="text-teal-400 hover:text-teal-300 font-bold">
            Staff Portal →
          </Link>
        </div>
      </footer>
    </div>
  );
};
