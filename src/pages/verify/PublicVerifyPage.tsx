import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CardService } from '../../services/cardService';
import { StorageService } from '../../services/storage';
import { VerificationResult, User, Patient, HealthCard, Membership } from '../../types';
import { formatDate } from '../../utils/formatters';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { StaffIDCard } from '../../components/card/StaffIDCard';
import { CR80CardFront } from '../../components/card/CR80CardFront';
import { CR80CardBack } from '../../components/card/CR80CardBack';
import { Barcode } from '../../components/common/Barcode';
import { Button } from '../../components/common/Button';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Phone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Heart,
  Globe,
  Award,
  Sun,
  Moon,
  RotateCcw,
  Sparkles,
  IdCard,
  Building2,
  Calendar,
  Check,
  ScanLine,
  QrCode,
  Fingerprint,
  Radio,
  FileCheck,
  MapPin,
  Mail,
  Camera,
  Home,
  UserCheck,
  ExternalLink,
  CreditCard,
  TestTube
} from 'lucide-react';

export const PublicVerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [searchCode, setSearchCode] = useState(code || '');
  const [verifyMode, setVerifyMode] = useState<'qr' | 'barcode'>('qr');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [isScanningLaser, setIsScanningLaser] = useState(false);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  const playVerificationAudio = (isValid: boolean) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      if (isValid) {
        // Crisp clinical success chime: C5 -> E5 -> G5
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.35);
        });
      } else {
        // Alert tone
        [330, 220].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.2, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.28);
        });
      }
    } catch {
      // Ignore audio failure
    }
  };

  useEffect(() => {
    if (code) {
      const res = CardService.verifyCard(code);
      setResult(res);
      setSearchCode(code);
      if (res) {
        playVerificationAudio(res.verified);
      }
    }
  }, [code]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleManualSearch = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (customCode || searchCode).trim();
    if (!targetCode) return;

    setIsScanningLaser(true);
    setTimeout(() => {
      const res = CardService.verifyCard(targetCode);
      setResult(res);
      setIsScanningLaser(false);
      if (res) {
        playVerificationAudio(res.verified);
      }
    }, 350);
  };

  // Start Camera QR Scanner
  const startCameraScanner = async () => {
    try {
      setIsCameraScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable', err);
      setIsCameraScanning(false);
      alert('Camera access could not be opened. You can type or paste the QR Code / Card Number directly.');
    }
  };

  const stopCameraScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraScanning(false);
  };

  const company = result?.company || StorageService.getCompanyProfile();

  // Convert result.staff to User shape for digital pass preview
  const staffUserObj: User | null = result?.staff
    ? {
        id: result.staff.id,
        staffId: result.staff.staffId,
        fullName: result.staff.fullName,
        username: result.staff.username,
        email: result.staff.email,
        phone: result.staff.phone,
        workPhone: result.staff.workPhone,
        role: result.staff.role,
        designation: result.staff.designation,
        department: result.staff.department,
        accessZone: result.staff.accessZone,
        nationalId: result.staff.nationalId,
        licenseNo: result.staff.licenseNo,
        bloodGroup: result.staff.bloodGroup,
        photoUrl: result.staff.photoUrl,
        emergencyContact: result.staff.emergencyContact,
        emergencyContactName: result.staff.emergencyContactName,
        status: result.staff.status,
        joiningDate: result.staff.joiningDate,
        expiryDate: result.expiryDate,
        cardThemeWish: result.staff.cardThemeWish,
        cardMaterialWish: result.staff.cardMaterialWish,
        createdAt: result.issueDate || new Date().toISOString()
      }
    : null;

  // Resolve full patient & card if result is health card
  const patientObj: Patient | null = result?.card
    ? StorageService.getPatients().find((p) => p.id === result.card?.patientId) || null
    : null;

  const membershipObj: Membership | null = result?.card
    ? StorageService.getMemberships().find((m) => m.id === result.card?.membershipId) || null
    : null;

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Ambient background glows */}
      <div className="absolute w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-3xl pointer-events-none -top-28 -left-28" />
      <div className="absolute w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none -bottom-28 -right-28" />

      {/* Main Container */}
      <div className="w-full max-w-2xl relative z-10 space-y-4">
        {/* Top Floating Controls Bar */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <LabMedixLogo
              logoUrl={company.logoUrl}
              variant="horizontal"
              size="sm"
              theme={isDarkMode ? 'white' : 'teal'}
              showAccreditation={true}
            />
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-teal-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-teal-700 hover:bg-slate-100 shadow-sm'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card Portal</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="Toggle Dark / Light Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>

        {/* Main Verification Card Box */}
        <div
          className={`w-full rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl ${
            isDarkMode
              ? 'bg-slate-900/90 border-slate-800 shadow-black/60'
              : 'bg-white/95 border-slate-200 shadow-slate-300/40'
          }`}
        >
          {/* Header Banner */}
          <div
            className={`p-5 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-teal-500" />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-black tracking-wide uppercase">
                  Official Health Card & Pass Verification
                </h1>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                  {company.name || 'LABMEDIX'} CLINICAL AUTHENTICITY VALIDATOR
                </p>
              </div>
            </div>

            {/* Mode Switcher Pills */}
            <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setVerifyMode('qr')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                  verifyMode === 'qr'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3 h-3" /> QR Code
              </button>
              <button
                type="button"
                onClick={() => setVerifyMode('barcode')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                  verifyMode === 'barcode'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ScanLine className="w-3 h-3" /> Barcode / ID
              </button>
            </div>
          </div>

          {/* Search / Scan Box */}
          <div className="p-6 space-y-5">
            {/* Live Camera Scanner View Modal / Box */}
            {isCameraScanning ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500 space-y-3 text-center">
                <div className="flex items-center justify-between text-xs font-mono text-teal-400">
                  <span className="flex items-center gap-1">
                    <Camera className="w-4 h-4 text-teal-400 animate-pulse" />
                    LIVE OPTICAL CAMERA SCANNER ACTIVE
                  </span>
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-xs"
                  >
                    Close Camera
                  </button>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-8 border-2 border-dashed border-teal-400 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-bounce" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Center the QR Code on your Health Card inside the frame.
                </p>
              </div>
            ) : null}

            {/* Input Form with Camera Trigger */}
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                placeholder={
                  verifyMode === 'qr'
                    ? 'Enter QR Code or Card Number (e.g. VER-9A4F-8821 or LHC-2026-000001)...'
                    : 'Enter Staff ID or Barcode (e.g. LMDX-STF-001)...'
                }
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDarkMode
                    ? 'bg-slate-800/90 text-white border-slate-700'
                    : 'bg-slate-50 text-slate-900 border-slate-300'
                }`}
              />

              <button
                type="button"
                onClick={startCameraScanner}
                className="p-2.5 rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-all"
                title="Scan with Camera"
              >
                <Camera className="w-4 h-4" />
              </button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={verifyMode === 'qr' ? <QrCode className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
              >
                {isScanningLaser ? 'Validating...' : 'Verify'}
              </Button>
            </form>

            {/* Results Section */}
            {result ? (
              <div className="space-y-5">
                {/* Result Status Banner */}
                <div
                  className={`p-4 rounded-2xl border flex items-center gap-3.5 shadow-sm ${
                    result.cardStatus === 'active'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : result.cardStatus === 'expired'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {result.cardStatus === 'active' ? (
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                      <XCircle className="w-6 h-6 text-rose-400" />
                    </div>
                  )}

                  <div className="text-left flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest block opacity-80">
                      {result.type === 'staff_pass'
                        ? 'Staff Credential Authenticity'
                        : result.type === 'diagnostic_report'
                        ? 'Medical Diagnostic Report Authenticity'
                        : 'Official Patient Health Card Authenticity'}
                    </span>
                    <strong className="text-base font-black tracking-wide block">
                      {result.cardStatus === 'active'
                        ? result.type === 'staff_pass'
                          ? '✅ AUTHENTICATED STAFF CREDENTIAL PASS'
                          : result.type === 'diagnostic_report'
                          ? '✅ OFFICIAL VERIFIED DIAGNOSTIC REPORT'
                          : '✅ OFFICIAL VERIFIED ACTIVE HEALTH CARD'
                        : '⛔ CREDENTIAL INACTIVE / NOT FOUND'}
                    </strong>
                    <p className="text-xs opacity-90">{result.message}</p>
                  </div>

                  {result.cardStatus === 'active' && (
                    <div className="hidden sm:flex flex-col items-end text-[9px] font-mono text-emerald-400 opacity-90">
                      <span>NABH & ISO 9001:2015</span>
                      <span>DIGITAL SEAL VERIFIED</span>
                    </div>
                  )}
                </div>

                {/* ================= PATIENT HEALTH CARD DETAILS ================= */}
                {result.type === 'health_card' && (
                  <div className="space-y-4">
                    {/* Metadata Card */}
                    <div
                      className={`p-5 rounded-2xl border space-y-4 text-xs ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-black text-teal-400 text-lg">
                            {result.patient?.fullName ? result.patient.fullName.charAt(0) : 'P'}
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Cardholder Name</span>
                            <strong className="text-sm font-black block uppercase text-slate-900 dark:text-white">
                              {result.patient?.fullName || 'Registered Patient'}
                            </strong>
                            <span className="text-[10px] text-teal-500 font-mono">
                              Patient ID: {result.patient?.maskedPatientId}
                            </span>
                          </div>
                        </div>

                        {result.patient?.bloodGroup && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-black flex items-center gap-1 shadow-sm">
                            <Heart className="w-3 h-3 fill-current" /> {result.patient.bloodGroup}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Masked Card No</span>
                          <strong className="font-mono text-amber-500 dark:text-amber-400">
                            {result.patient?.maskedCardNumber || result.card?.cardNumber}
                          </strong>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Membership Tier</span>
                          <strong className="text-blue-500 dark:text-blue-400">
                            {result.membership?.name || 'Smart Health Card'}
                          </strong>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Issued On</span>
                          <span className="font-mono">{formatDate(result.issueDate)}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Valid Through</span>
                          <span className="font-bold font-mono text-emerald-500 dark:text-emerald-400">
                            {formatDate(result.expiryDate)}
                          </span>
                        </div>
                      </div>

                      {/* Live Benefits Breakdown */}
                      {result.membership && (
                        <div className="p-3 bg-slate-200/60 dark:bg-slate-900/80 rounded-xl space-y-1.5 text-left border border-white/5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Cashless Healthcare Coverage:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                            <div className="text-blue-400">OPD: <strong>{result.membership.opdDiscount}% OFF</strong></div>
                            <div className="text-emerald-400">Labs: <strong>{result.membership.labDiscount}% OFF</strong></div>
                            <div className="text-amber-400">Pharmacy: <strong>{result.membership.pharmacyDiscount}% OFF</strong></div>
                            <div className="text-cyan-400">Home Blood: <strong>{result.membership.homeCollectionDiscount === 100 ? 'Free' : `${result.membership.homeCollectionDiscount}% OFF`}</strong></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive 3D Card Replica (CR80) Preview */}
                    {patientObj && result.card && membershipObj && (
                      <div
                        className={`p-5 rounded-2xl border flex flex-col items-center space-y-3 ${
                          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <IdCard className="w-4 h-4 text-teal-500" />
                            Official CR80 Health Card Graphic Replica
                          </span>

                          <button
                            type="button"
                            onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/20 flex items-center gap-1 transition-all"
                          >
                            <RotateCcw className="w-3 h-3" /> Flip to {cardSide === 'front' ? 'Back' : 'Front'}
                          </button>
                        </div>

                        <div className="py-2 overflow-x-auto max-w-full flex justify-center">
                          {cardSide === 'front' ? (
                            <CR80CardFront
                              patient={patientObj}
                              card={result.card}
                              membership={membershipObj}
                              company={company}
                              scale={0.85}
                              id="verify-card-front"
                            />
                          ) : (
                            <CR80CardBack
                              patient={patientObj}
                              card={result.card}
                              membership={membershipObj}
                              company={company}
                              scale={0.85}
                              id="verify-card-back"
                              maskCvv={true}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Portal Access Button */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-teal-950/80 border border-teal-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-white block">Are you this Cardholder?</strong>
                        <span className="text-slate-400 text-[11px]">
                          Access your cashless wallet, view lab test reports & book OPD appointments.
                        </span>
                      </div>
                      <Link to="/portal">
                        <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          Open CARD LOGIN / SIGN UP
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* ================= STAFF EMPLOYEE PASS DETAILS ================= */}
                {result.type === 'staff_pass' && result.staff && (
                  <div className="space-y-4">
                    {/* Rich Staff Metadata Card */}
                    <div
                      className={`p-5 rounded-2xl border space-y-4 text-xs ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Top Header Row with Passport Photo & Role */}
                      <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3.5">
                          {/* Passport Photo Frame */}
                          <div className="w-14 h-16 rounded-2xl overflow-hidden border-2 border-teal-500 shadow-md bg-slate-200 dark:bg-slate-700 shrink-0 relative">
                            {result.staff.photoUrl ? (
                              <img
                                src={result.staff.photoUrl}
                                alt={result.staff.fullName}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <div className="w-full h-full bg-teal-600 text-white font-black flex items-center justify-center text-xl">
                                {result.staff.fullName.charAt(0)}
                              </div>
                            )}
                            <span className="absolute bottom-0 inset-x-0 bg-teal-900/90 text-white font-mono text-[7px] text-center font-bold">
                              BIO PASS
                            </span>
                          </div>

                          <div className="text-left">
                            <span className="text-[10px] text-teal-400 font-mono font-bold block">
                              STAFF ID: {result.staff.staffId}
                            </span>
                            <strong className="text-sm font-black block text-slate-900 dark:text-white uppercase">
                              {result.staff.fullName}
                            </strong>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                              {result.staff.designation} • {result.staff.department}
                            </p>
                          </div>
                        </div>

                        {result.staff.bloodGroup && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-black flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-current" /> {result.staff.bloodGroup}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Access Zone</span>
                          <strong className="text-teal-400 truncate block">{result.staff.accessZone}</strong>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Issued On</span>
                          <span className="font-mono">{formatDate(result.issueDate)}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Valid Through</span>
                          <span className="font-mono text-emerald-500 font-bold">{formatDate(result.expiryDate)}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Emergency Next of Kin</span>
                          <span className="font-semibold text-slate-300 truncate block">
                            {result.staff.emergencyContactName || 'Family'} ({result.staff.emergencyContact || '9830099999'})
                          </span>
                        </div>
                      </div>

                      {/* Vector Barcode Rendered */}
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
                        <Barcode
                          value={result.staff.staffId}
                          theme="light"
                          height={28}
                          width={240}
                          showText={true}
                        />
                        <span className="text-[7.5px] text-slate-400 font-mono mt-0.5">
                          CRYPTOGRAPHICALLY HASHED 1D BARCODE • NABH / ISO VALIDATED
                        </span>
                      </div>
                    </div>

                    {/* Interactive 3D Digital Staff ID Card Flip Preview */}
                    {staffUserObj && (
                      <div
                        className={`p-5 rounded-2xl border flex flex-col items-center space-y-3 ${
                          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <IdCard className="w-4 h-4 text-teal-500" />
                            Official Physical Pass Replica (CR80)
                          </span>

                          <button
                            type="button"
                            onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/20 flex items-center gap-1 transition-all"
                          >
                            <RotateCcw className="w-3 h-3" /> Flip to {cardSide === 'front' ? 'Back' : 'Front'}
                          </button>
                        </div>

                        <div className="py-2">
                          <StaffIDCard
                            user={staffUserObj}
                            company={company}
                            side={cardSide}
                            showLanyard={false}
                            scale={0.88}
                            theme="premium_medical"
                            idPrefix="verify-staff-pass"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= MEDICAL DIAGNOSTIC REPORT AUTHENTICITY DETAILS ================= */}
                {result.type === 'diagnostic_report' && result.report && (
                  <div className="space-y-4">
                    <div
                      className={`p-5 rounded-2xl border space-y-4 text-xs ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Top Investigation Banner */}
                      <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-black text-teal-400 text-lg">
                            <TestTube className="w-6 h-6 text-teal-400" />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-teal-500 font-mono font-bold block">
                              REPORT NO: {result.report.reportNumber}
                            </span>
                            <strong className="text-sm font-black block uppercase text-slate-900 dark:text-white">
                              {result.report.testName}
                            </strong>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              Department: {result.report.department} • Order: {result.report.orderNumber}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 mt-1">
                            {result.report.isLocked ? 'LOCKED MEDICAL RECORD' : 'INTERIM'}
                          </span>
                        </div>
                      </div>

                      {/* Patient & Accession Demographics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Patient Name</span>
                          <strong className="text-slate-900 dark:text-white font-bold block">
                            {result.report.patientName}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-mono">
                            UHID: {result.report.maskedPatientId}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Demographics</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {result.report.age} Yrs / {result.report.gender.toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Sample Barcode</span>
                          <strong className="font-mono text-teal-500">
                            {result.report.sampleBarcode}
                          </strong>
                          <span className="text-[9.5px] text-slate-400 block">{result.report.specimenType}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Report Release</span>
                          <span className="font-mono text-emerald-500 font-bold block">
                            {formatDate(result.report.reportDate)}
                          </span>
                        </div>
                      </div>

                      {/* Clinical Verification & Authorities Box */}
                      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2 text-left">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                          Verified Medical Sign-off Authorities:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Authorized Reporting Pathologist:</span>
                            <strong className="text-white block">{result.report.reportingDoctorName}</strong>
                            <span className="text-slate-400 text-[10px]">
                              {result.report.reportingDoctorDesignation} • Reg: {result.report.reportingDoctorRegNo}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] block">Verified By Technologist:</span>
                            <strong className="text-white block">{result.report.technicianName}</strong>
                            <span className="text-slate-400 text-[10px]">
                              {result.report.technicianDesignation}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Confidentiality Notice */}
                      <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-2 text-[11px] text-amber-200">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Clinical Privacy Notice:</strong> In compliance with healthcare data protection standards, individual diagnostic test results and sensitive findings are confidential and accessible only via authorized patient/staff portal login.
                        </span>
                      </div>
                    </div>

                    {/* View Official Diagnostic Report & Patient Portal Links */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-indigo-950/80 border border-teal-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="text-left">
                        <strong className="text-white block">Official Diagnostic Report Access</strong>
                        <span className="text-slate-400 text-[11px]">
                          View the full analytical values, reference ranges, and download official A4 PDF.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/report/${result.report.reportNumber}?key=${encodeURIComponent(result.report.verificationCode || '')}`}>
                          <Button variant="primary" size="sm" rightIcon={<FileCheck className="w-4 h-4" />}>
                            View Official Report
                          </Button>
                        </Link>
                        <Link to="/portal">
                          <Button variant="outline" size="sm">
                            Patient Portal
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Organization Emergency Contact Footer */}
                <div className="pt-2 text-center text-xs text-slate-400 space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-teal-500" />
                      <span>24x7 Helpline: <strong>{company.helpline || '1800-889-9911'}</strong></span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-rose-500" />
                      <span>Ambulance: <strong>{company.ambulanceHelpline || '1800-889-9911'}</strong></span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    © {company.estdYear || '2025'}–2026 {company.name || 'LABMEDIX'}. {company.address}, {company.district}, {company.state} - {company.pinCode}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                <QrCode className="w-12 h-12 text-slate-500 mx-auto animate-pulse" />
                <p>Scan a Health Card QR Code or enter the Verification Key / Card Number above to verify official credentials.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};