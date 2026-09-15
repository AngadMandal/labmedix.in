import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CardholderAuthService } from '../../services/cardholderAuthService';
import { PortalService } from '../../services/portalService';
import { CardApplicationRequest } from '../../types';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  CreditCard,
  UserCheck,
  UserPlus,
  Search,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Lock,
  RefreshCw,
  Fingerprint,
  AlertTriangle
} from 'lucide-react';

interface CardholderAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup' | 'track';
  onOpenSignUpModal?: (tier?: string) => void;
}

export const CardholderAuthModal: React.FC<CardholderAuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
  onOpenSignUpModal
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'track'>(defaultTab);

  // Strict Cardholder Login Credentials: Credentials + Captcha
  const [loginId, setLoginId] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Anti-Bot Math Captcha
  const [captchaNum1, setCaptchaNum1] = useState(12);
  const [captchaNum2, setCaptchaNum2] = useState(7);
  const [captchaError, setCaptchaError] = useState(false);

  // Rate Limiting Lockout
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Track Application State
  const [trackQuery, setTrackQuery] = useState('');
  const [trackedApplication, setTrackedApplication] = useState<CardApplicationRequest | null>(null);
  const [trackSearched, setTrackSearched] = useState(false);

  const refreshCaptcha = () => {
    const n1 = Math.floor(5 + Math.random() * 15);
    const n2 = Math.floor(2 + Math.random() * 9);
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setUserCaptcha('');
    setCaptchaError(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      refreshCaptcha();
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, defaultTab]);

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Card Number change check for locks
  const handleCardNumberChange = (val: string) => {
    setLoginId(val);
    setError('');
    const status = CardholderAuthService.isCardLocked(val);
    if (status.locked) {
      setLockoutSeconds(status.remainingSeconds);
      setError(`Security Lockout: Card locked for ${status.remainingSeconds}s due to consecutive failed attempts.`);
    } else {
      setLockoutSeconds(0);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError(false);

    if (lockoutSeconds > 0) return;

    setIsLoading(true);
    const expected = captchaNum1 + captchaNum2;

    try {
      const res = await CardholderAuthService.authenticateAsync(loginId, portalPassword, userCaptcha, String(expected));
      setIsLoading(false);

      if (!res.success) {
        if (res.isLocked && res.remainingSeconds) {
          setLockoutSeconds(res.remainingSeconds);
        }
        if (res.error?.includes('Captcha')) {
          setCaptchaError(true);
        }
        setError(res.error || 'Authentication failed. Please verify Credentials.');
        refreshCaptcha();
        return;
      }

      if (res.patient) {
        triggerCelebrationFireworks();
        showToast('success', `Welcome, ${res.patient.fullName}`, 'Cardholder authenticated successfully with verified password.');
        onClose();
        navigate('/portal');
      }
    } catch (err) {
      console.error('Cardholder auth error:', err);
      setIsLoading(false);
      setError('An error occurred during authentication. Please try again.');
    }
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackSearched(true);
    const clean = trackQuery.trim().toLowerCase();
    if (!clean) return;

    const apps: CardApplicationRequest[] = PortalService.getCardApplications();
    const found = apps.find(
      (a: CardApplicationRequest) =>
        a.applicationNo.toLowerCase() === clean ||
        a.mobile.includes(clean) ||
        (a.email && a.email.toLowerCase().includes(clean))
    );
    setTrackedApplication(found || null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💳 Cardholder Access Center (Official Smart Portal)"
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs font-sans">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Cardholder Login</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('signup')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up / Apply</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'track'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Application</span>
          </button>
        </div>

        {/* TAB 1: STRICT 3-FIELD CARDHOLDER LOGIN */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-teal-500/30 text-teal-200 text-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-[11px] leading-relaxed">
                Log in with your <strong>Health Card Number</strong> or <strong>Registered Mobile</strong>, and use your <strong>Card CVV Code</strong> (from card back) or password to access your cashless portal.
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Field 1: Health Card Number or Registered Mobile */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>1. Card Number or Mobile:</span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    ⭐ Recommended
                  </span>
                </label>
                <Input
                  value={loginId}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="e.g. LHC-2026-000001 or 9830012345"
                  leftIcon={<CreditCard className="w-4 h-4 text-teal-400" />}
                  disabled={lockoutSeconds > 0}
                  required
                />
              </div>

              {/* Field 2: 3-Digit Card CVV Security Code */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>2. Card CVV Code / Password:</span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    ⭐ 3-Digit CVV on Card Back
                  </span>
                </label>
                <Input
                  type="password"
                  value={portalPassword}
                  onChange={(e) => {
                    setPortalPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter 3-digit CVV (e.g. 888) or password"
                  leftIcon={<Lock className="w-4 h-4 text-amber-400" />}
                  className="font-mono tracking-widest"
                  disabled={lockoutSeconds > 0}
                  required
                />
                <p className="text-[10.5px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <span className="text-amber-400 font-bold">💡 Tip:</span>
                  <span>The 3-digit CVV printed on the back of your Health Card serves as your default portal password.</span>
                </p>
              </div>

              {/* Field 3: Anti-Bot Mathematical Security Captcha */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-purple-400" />
                    3. Anti-Bot Captcha Verification:
                  </span>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="text-teal-400 hover:text-teal-300 text-[11px] flex items-center gap-1 font-mono"
                    title="Generate new equation"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-teal-500/40 text-sm font-black font-mono tracking-widest text-teal-300 shadow-inner">
                    {captchaNum1} + {captchaNum2} = ?
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter sum"
                    value={userCaptcha}
                    onChange={(e) => {
                      setUserCaptcha(e.target.value);
                      setCaptchaError(false);
                      setError('');
                    }}
                    className={`text-center font-black ${captchaError ? 'border-rose-500 text-rose-300' : ''}`}
                    disabled={lockoutSeconds > 0}
                    required
                  />
                </div>
              </div>

              {/* Rate Limit Lockout Alert */}
              {lockoutSeconds > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 text-xs space-y-1.5 animate-pulse">
                  <div className="flex items-center gap-2 font-black text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Cardholder Rate-Limit Lockout Active</span>
                  </div>
                  <p className="text-[11px]">
                    Card access locked for security due to 5 consecutive failed attempts.
                  </p>
                  <div className="font-mono text-sm font-black text-amber-300 pt-1">
                    ⏳ Unlocks in: {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && lockoutSeconds === 0 && (
                <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-slate-950 font-black shadow-lg shadow-teal-500/20 hover:scale-102 transition-all"
                isLoading={isLoading}
                disabled={lockoutSeconds > 0}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Authenticate & Enter CARD LOGIN / SIGN UP
              </Button>
            </form>
          </div>
        )}

        {/* TAB 2: NEW CARDHOLDER SIGN UP & APPLY */}
        {activeTab === 'signup' && (
          <div className="space-y-4 text-center p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
              <Sparkles className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Apply for Your Smart Health Card</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Join 500,000+ cardholders enjoying 15% to 50% cashless discounts on all 350+ Lab Tests and free doctor visits.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
              {[
                { name: 'Silver Shield', price: '₹499/yr', off: '15% OFF', theme: 'from-slate-700 to-slate-900' },
                { name: 'Gold Shield', price: '₹999/yr', off: '25% OFF', theme: 'from-amber-600 to-yellow-800' },
                { name: 'Platinum Elite', price: '₹1,999/yr', off: '35% OFF', theme: 'from-slate-800 to-teal-950' },
                { name: 'VIP Diamond', price: '₹4,999/yr', off: '50% OFF', theme: 'from-purple-900 to-slate-950' }
              ].map((tier, idx) => (
                <div key={idx} className={`p-3 rounded-2xl bg-gradient-to-br ${tier.theme} border border-white/10 text-white space-y-1 shadow-md`}>
                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-black/40 font-mono text-emerald-300">
                    {tier.off}
                  </span>
                  <strong className="block text-xs font-black truncate">{tier.name}</strong>
                  <span className="text-[10.5px] font-mono text-slate-200 block">{tier.price}</span>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-400/20"
              leftIcon={<CreditCard className="w-4 h-4 text-slate-950" />}
              onClick={() => {
                onClose();
                onOpenSignUpModal?.('Gold');
              }}
            >
              Start Online Health Card Application (3 Steps)
            </Button>
          </div>
        )}

        {/* TAB 3: TRACK APPLICATION STATUS */}
        {activeTab === 'track' && (
          <div className="space-y-4">
            <form onSubmit={handleTrackSearch} className="flex gap-2">
              <Input
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Enter Application Ref No or Registered Mobile..."
                required
                className="flex-1 font-mono"
              />
              <Button type="submit" variant="primary" size="md" leftIcon={<Search className="w-4 h-4" />}>
                Track
              </Button>
            </form>

            {trackSearched && trackedApplication && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <strong className="text-white text-xs block">{trackedApplication.fullName}</strong>
                    <span className="text-[10px] text-teal-400 font-mono">{trackedApplication.applicationNo}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono uppercase ${
                    trackedApplication.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : trackedApplication.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {trackedApplication.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                  <div>Tier: <strong className="text-white">{trackedApplication.membershipName}</strong></div>
                  <div>Phone: <strong className="text-white">{trackedApplication.mobile}</strong></div>
                  <div>Date: <span>{new Date(trackedApplication.createdAt).toLocaleDateString()}</span></div>
                  <div>Payment: <span className="text-emerald-400 font-bold">{trackedApplication.paymentStatus.toUpperCase()}</span></div>
                </div>

                {trackedApplication.status === 'approved' && trackedApplication.approvedCardNumber && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
                    <p className="text-[11px]">
                      🎉 Your Card is Approved! Card Number: <strong>{trackedApplication.approvedCardNumber}</strong>
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full bg-emerald-500 text-slate-950 font-black text-xs"
                      onClick={() => {
                        setLoginId(trackedApplication.approvedCardNumber || '');
                        setActiveTab('login');
                      }}
                    >
                      Log in with this Card →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {trackSearched && !trackedApplication && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 space-y-1">
                <p className="text-xs font-bold text-slate-300">No application found for query.</p>
                <p className="text-[11px]">Please check your Application Reference Number or Registered Mobile Number.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
