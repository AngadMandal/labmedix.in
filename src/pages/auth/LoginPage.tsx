import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storage';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { PasswordResetModal } from '../../components/auth/PasswordResetModal';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  Fingerprint,
  Sparkles,
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { companyProfile } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Primary Credentials State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Lockout Countdown State
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Emergency Super Admin Override Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTokenInput, setOverrideTokenInput] = useState('');
  const [overridePinInput, setOverridePinInput] = useState('');
  const [overrideMessage, setOverrideMessage] = useState('');

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  useEffect(() => {
    const currentUser = StorageService.getCurrentUser();
    const lockedUser = localStorage.getItem('labmedix_auth_locked_user');
    if (currentUser || lockedUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Real-time Lockout Countdown Timer
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

  // Check initial lock status on username change
  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setError('');
    const status = AuthService.isAccountLocked(val);
    if (status.locked) {
      setLockoutSeconds(status.remainingSeconds);
      setError(`Security Lockout Active: Account locked for ${status.remainingSeconds}s due to consecutive failed attempts.`);
    } else {
      setLockoutSeconds(0);
    }
  };

  // Primary Login Handler
  const handlePrimaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const inputUser = username.trim() || 'angadmandal3@gmail.com';

      console.log('Attempting login for:', inputUser);
      const validation = await AuthService.validateCredentialsAsync(inputUser, password || '');
      console.log('Validation result:', validation);

      if (!validation.success || !validation.user) {
        setIsLoading(false);
        setError(validation.error || 'Invalid Admin / Staff Username or Password.');
        return;
      }

      const res = login(validation.user);
      console.log('Login result:', res);
      setIsLoading(false);

      if (res.success) {
        triggerCelebrationFireworks();
        showToast('success', `Welcome, ${validation.user.fullName}`, `Signed in with ${validation.user.role.toUpperCase()} clearance.`);
        navigate(validation.user.role === 'doctor' ? '/doctor-dashboard' : '/dashboard');
      } else {
        setError(res.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      setError('An unexpected error occurred during login. Please try again.');
    }
  };

  // Handle Emergency Master Override Execution
  const handleExecuteEmergencyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideMessage('');

    const res = AuthService.emergencySuperAdminUnlock(overrideTokenInput, overridePinInput);
    if (res.success) {
      setLockoutSeconds(0);
      setError('');
      setOverrideMessage('✅ Master Override Executed: HSM Verified. All account lockouts cleared & Super Admin session active.');
      showToast('success', 'Master Root Override Success', 'All brute-force lockouts have been reset and root session established.');
      triggerCelebrationFireworks();
      setTimeout(() => {
        setIsOverrideModalOpen(false);
        setOverrideTokenInput('');
        setOverridePinInput('');
        setOverrideMessage('');
        login('angadmandal3@gmail.com');
        navigate('/dashboard');
      }, 1500);
    } else {
      setOverrideMessage(`❌ ${res.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* High-Tech Background Mesh & Ambient Glow Orbs */}
      <div className="absolute w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none -top-24 -left-24" />
      <div className="absolute w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none -bottom-24 -right-24" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d948810_1px,transparent_1px),linear-gradient(to_bottom,#0d948810_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none opacity-40" />

      {/* Main 3D Security Console Container */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-8 relative z-10 space-y-6">
        {/* Top Security Status Badge */}
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>256-BIT SSL ENCRYPTED</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOverrideModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold transition-colors"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Root Override</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-xl mx-auto flex items-center justify-center border border-teal-500/30">
            <LabMedixLogo logoUrl={companyProfile.logoUrl} variant="monogram" size="md" theme="teal" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>{companyProfile.name}</span>
            </h2>
            <p className="text-xs font-bold text-teal-400 uppercase tracking-wider mt-0.5">
              Live Staff Access & Command Portal
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Central Firebase Authentication • Live Multi-Device Sync
            </p>
          </div>
        </div>

        {/* PRIMARY CREDENTIALS FORM */}
        <form onSubmit={handlePrimaryLogin} className="space-y-4">
          {/* Registered Email / Staff ID */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block flex items-center justify-between">
              <span>Registered Staff Email / Staff ID:</span>
              <span className="text-[10px] text-teal-400 font-mono font-normal">Unique Email Required</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. angadmandal3@gmail.com or LMDX-STF-001"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              leftIcon={<User className="w-4 h-4 text-teal-400" />}
              disabled={lockoutSeconds > 0}
              required
            />
          </div>

          {/* Password / PIN */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 block">
                Account Password / Security PIN:
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] font-bold text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Forgot Password / PIN?</span>
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter registered account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-teal-400" />}
                disabled={lockoutSeconds > 0}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Active Lockout Timer Countdown Display */}
          {lockoutSeconds > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 text-xs space-y-1.5 animate-pulse">
              <div className="flex items-center gap-2 font-black text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Brute-Force Rate Limit Active</span>
              </div>
              <p className="text-[11px] leading-tight">
                Account temporarily locked due to consecutive failed attempts.
              </p>
              <div className="font-mono text-sm font-black text-amber-300 pt-1">
                ⏳ Unlocks in: {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
              </div>
            </div>
          )}

          {/* General Error Message */}
          {error && lockoutSeconds === 0 && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-slate-950 font-black shadow-lg shadow-teal-500/20 hover:scale-[1.01] transition-all"
            isLoading={isLoading}
            disabled={lockoutSeconds > 0}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Admin Portal
          </Button>
        </form>

        {/* Footer Redirect to Patient & Cardholder Portal */}
        <div className="flex items-center justify-center text-xs pt-3 border-t border-slate-800">
          <Link to="/" className="text-teal-400 hover:text-teal-300 font-bold hover:underline inline-flex items-center gap-1.5">
            <span>← Go to Cardholder Portal Login / Apply</span>
          </Link>
        </div>
      </div>

      {/* EMERGENCY SUPER ADMIN MASTER OVERRIDE MODAL */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title="🚨 Emergency Super Admin Master Recovery Override"
        maxWidth="md"
      >
        <form onSubmit={handleExecuteEmergencyOverride} className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 space-y-1.5">
            <strong className="text-rose-300 block text-xs font-bold">
              Root Level Master Security Clearance
            </strong>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Use this emergency protocol to unlock brute-force blocked staff accounts, restore corrupted login sessions, and clear security rate limits.
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300 block">Enter Master Root Recovery Token:</label>
            <Input
              type="password"
              placeholder="e.g. LABMEDIX-ROOT-MASTER-9091"
              value={overrideTokenInput}
              onChange={(e) => setOverrideTokenInput(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300 block">Super Admin Security PIN (MFA):</label>
            <Input
              type="password"
              placeholder="Enter PIN (e.g. Angad@1999)"
              value={overridePinInput}
              onChange={(e) => setOverridePinInput(e.target.value)}
              required
            />
          </div>

          {overrideMessage && (
            <div className={`p-3 rounded-xl text-xs font-bold ${overrideMessage.startsWith('✅') ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'}`}>
              {overrideMessage}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-400"
              onClick={() => setIsOverrideModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black shadow-lg"
            >
              Execute Master Unlock & Reset
            </Button>
          </div>
        </form>
      </Modal>

      {/* FORGOT PASSWORD / RECOVERY PIN MODAL */}
      <PasswordResetModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={(uname, newPass) => {
          setUsername(uname);
          setPassword(newPass);
          triggerCelebrationFireworks();
        }}
      />
    </div>
  );
};
