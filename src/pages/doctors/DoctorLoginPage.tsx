import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storage';
import { AuditService } from '../../services/auditService';
import { DoctorMasterService, DoctorMasterItem } from '../../services/doctorMasterService';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { PersonalizedWelcomeOverlay } from '../../components/auth/PersonalizedWelcomeOverlay';
import { User as UserType } from '../../types';
import {
  Stethoscope,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle,
  Building2,
  Calendar,
  Phone,
  FileText
} from 'lucide-react';

export const DoctorLoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [authenticatedDoctorForWelcome, setAuthenticatedDoctorForWelcome] = useState<UserType | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const currentUser = StorageService.getCurrentUser();
    if (currentUser && currentUser.role === 'doctor') {
      navigate('/doctor-dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanInput = username.trim();
    if (!cleanInput) {
      setError('Please enter your Doctor Username or Staff ID.');
      return;
    }

    setIsLoading(true);

    try {
      const validation = await AuthService.validateCredentialsAsync(cleanInput, password);
      setIsLoading(false);

      if (!validation.success || !validation.user) {
        setError(validation.error || 'Doctor account not found or invalid credentials. You must be created by the Super Admin before logging in.');
        return;
      }

      const user = validation.user;
      if (user.role !== 'doctor' && user.role !== 'super_admin' && user.role !== 'admin') {
        setError('Access denied: This portal is strictly for authorized clinical doctors and administrators.');
        return;
      }

      if (user.status === 'inactive') {
        setError('This account has been deactivated by the Super Admin.');
        return;
      }

      const res = login(user);
      if (res.success) {
        AuditService.log(
          'DOCTOR_LOGIN_SUCCESS',
          'auth',
          `Doctor ${user.fullName} (${user.username}) successfully authenticated into Doctor Portal`,
          user.id,
          { username: user.username, role: user.role, timestamp: new Date().toISOString() },
          'security'
        );
        
        triggerCelebrationFireworks();
        showToast('success', `Welcome, ${user.fullName}`, 'Signed into Doctor Clinical Portal successfully.');
        setAuthenticatedDoctorForWelcome(user);
      } else {
        setError(res.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Doctor login error:', err);
      setIsLoading(false);
      setError('An unexpected error occurred during login.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-xl shadow-teal-500/10">
            <Stethoscope className="w-10 h-10" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black tracking-tight text-white">
          Doctor Clinical Portal
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          LABMEDIX Health Card & EMR Central Workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-3xl border border-slate-800 sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Doctor Username or ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. dr.subhashish"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password / Secure PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-sm font-black shadow-lg shadow-teal-600/20 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Doctor Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-teal-400 transition-colors font-medium"
            >
              ← Return to Admin Panel Login
            </Link>
          </div>
        </div>
      </div>

      {/* PERSONALIZED 3D VOICE WELCOME OVERLAY */}
      {authenticatedDoctorForWelcome && (
        <PersonalizedWelcomeOverlay
          user={authenticatedDoctorForWelcome}
          onComplete={() => navigate('/doctor-dashboard')}
        />
      )}
    </div>
  );
};
export default DoctorLoginPage;
