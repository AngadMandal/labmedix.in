import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storage';
import { ROLE_CONFIGS } from '../../constants/roles';
import { Role } from '../../types';
import { QRScannerModal } from '../qr/QRScannerModal';
import { CommandPaletteModal } from '../common/CommandPaletteModal';
import { NotificationDrawer } from '../common/NotificationDrawer';
import { SecurityShieldModal } from '../common/SecurityShieldModal';
import { SyncHealthIndicator } from '../common/SyncHealthIndicator';
import { FirestoreConnectionStatus } from '../common/FirestoreConnectionStatus';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import {
  Menu,
  Sun,
  Moon,
  Lock,
  QrCode,
  LogOut,
  UserCheck,
  ChevronDown,
  Search,
  Bell,
  Command,
  Globe,
  ShieldCheck,
  Clock,
  Laptop,
  FileText,
  CreditCard
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentUser, lockScreen, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isSecurityShieldOpen, setIsSecurityShieldOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const cards = StorageService.getCards();
  const expiredCount = cards.filter(c => c.status === 'expired' || new Date(c.expiryDate) < new Date()).length;

  // Real-time Cardholder Service Requests
  const labBookings = StorageService.getItem<any[]>('labmedix_portal_lab_bookings', []);
  const pendingLabCount = labBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'phlebotomist_assigned').length;

  const appointments = StorageService.getItem<any[]>('labmedix_emr_appointments', []);
  const pendingAptCount = appointments.filter((a: any) => a.status === 'doctor_confirmed' || a.status === 'pending_doctor_approval' || a.status === 'in_consultation').length;

  const totalNotificationCount = expiredCount + pendingLabCount + pendingAptCount;
  const roleDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsRoleDropdownOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Left items: Menu button & Spotlight Search Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Spotlight Search Trigger (Ctrl+K) */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all w-48 sm:w-64"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="truncate">Search system...</span>
          <kbd className="hidden sm:inline-block ml-auto px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-500 rounded border shadow-xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Action Icons & Role Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Link to Cardholder Portal */}
        <Link
          to="/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors shadow-sm"
          title="Open Cardholder Portal Login"
        >
          <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="hidden md:inline">Card Portal</span>
        </Link>

        {/* Offline Form & Field Camp Button */}
        <Link
          to="/offline-form"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors shadow-sm"
          title="Offline Intake Form & Field Camp Queue"
        >
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden lg:inline">Offline Form</span>
        </Link>

        {/* Firestore Live Connection Status */}
        <FirestoreConnectionStatus />

        {/* Persistent Sync Health Traffic-Light Indicator */}
        <SyncHealthIndicator />

        {/* Security Integrity Shield Button */}
        <button
          onClick={() => setIsSecurityShieldOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold hover:bg-cyan-100 transition-colors shadow-sm cursor-pointer"
          title="Security & Data Integrity Vault"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="hidden md:inline">Security Vault</span>
        </button>

        {/* Quick QR Scanner Button */}
        <button
          onClick={() => setIsQRScannerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
        >
          <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Scan QR</span>
        </button>

        {/* Notification Bell with Badge */}
        <button
          onClick={() => setIsNotificationDrawerOpen(true)}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="System Alerts & Notifications"
        >
          <Bell className="w-4 h-4" />
          {totalNotificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-md">
              {totalNotificationCount}
            </span>
          )}
        </button>

        {/* Logged-In User Profile Identity Badge */}
        <div ref={roleDropdownRef} className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
          >
            {currentUser?.photoUrl ? (
              <img
                src={currentUser.photoUrl}
                alt={currentUser.fullName}
                className="w-7 h-7 rounded-xl object-cover ring-2 ring-blue-500/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">
                  {currentUser?.fullName || 'Logged In Staff'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block font-mono">
                {ROLE_CONFIGS[currentUser?.role || 'super_admin']?.name}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Profile Flyout Card */}
          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 z-50 space-y-3.5 text-xs text-slate-700 dark:text-slate-200">
              {/* Profile Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                {currentUser?.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.fullName}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500/50 shadow-md"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md">
                    {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <strong className="text-sm font-black text-slate-900 dark:text-white block truncate">
                    {currentUser?.fullName}
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                    {currentUser?.email || `@${currentUser?.username}`}
                  </span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    {ROLE_CONFIGS[currentUser?.role || 'super_admin']?.name}
                  </span>
                </div>
              </div>

              {/* Account Meta Info */}
              <div className="space-y-2 font-mono text-[11px] bg-slate-50 dark:bg-slate-950/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Staff ID:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{currentUser?.staffId || 'LMDX-STF-001'}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Department:</span>
                  <strong className="text-slate-900 dark:text-white truncate max-w-[130px] font-sans">{currentUser?.department || 'Operations'}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Access Zone:</span>
                  <strong className="text-emerald-500 font-bold truncate max-w-[130px] font-sans">{currentUser?.accessZone || 'Zone A: All Modules'}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRoleDropdownOpen(false);
                    lockScreen();
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Lock PIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRoleDropdownOpen(false);
                    void logout();
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-800/50"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Preference Button */}
        <button
          onClick={() => setIsThemeModalOpen(true)}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title={`Theme: ${
            theme.mode === 'auto_schedule'
              ? 'Auto Schedule (Time-based)'
              : theme.mode === 'system'
              ? `System OS (${isDark ? 'Dark' : 'Light'})`
              : theme.mode === 'dark'
              ? 'Dark'
              : 'Light'
          } - Click to customize`}
        >
          {theme.mode === 'auto_schedule' ? (
            <Clock className="w-4 h-4 text-amber-500" />
          ) : theme.mode === 'system' ? (
            <Laptop className="w-4 h-4 text-blue-500" />
          ) : isDark ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}

          {theme.mode === 'auto_schedule' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1 right-1 animate-pulse" />
          )}
        </button>

        {/* Screen Lock Button */}
        <button
          onClick={lockScreen}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Lock Screen"
        >
          <Lock className="w-4 h-4" />
        </button>

        {/* Logout */}
        <button
          onClick={() => void logout()}
          className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Global Modals */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      <SecurityShieldModal
        isOpen={isSecurityShieldOpen}
        onClose={() => setIsSecurityShieldOpen(false)}
      />

      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </header>
  );
};