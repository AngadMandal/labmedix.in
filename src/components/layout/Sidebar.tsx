import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { LabMedixLogo } from '../common/LabMedixLogo';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Palette,
  Layers,
  Award,
  Users2,
  Wallet,
  History,
  Database,
  Settings,
  UserCircle,
  UserCheck,
  BarChart3,
  Stethoscope,
  TestTube,
  Globe,
  Sparkles,
  Crown,
  Mail,
  Receipt,
  HeartHandshake,
  FileText,
  Cpu,
  Truck,
  Radio,
  Calendar,
  Pill,
  DollarSign,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  BarChart2
} from 'lucide-react';

import { SystemModuleKey } from '../../constants/roles';
import { Permission } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { can, hasModuleAccess, currentUser } = useAuth();
  const { companyProfile } = useSettings();

  const isDoctorRole = currentUser?.role === 'doctor';

  interface NavigationItem {
    name: string;
    href: string;
    icon: any;
    moduleKey: SystemModuleKey;
    permission: Permission | Permission[];
    doctorOnly?: boolean;
    adminOnly?: boolean;
  }

  const doctorNav: NavigationItem[] = isDoctorRole
    ? [
        { name: 'Doctor EMR & Rx Suite', href: '/emr', icon: Stethoscope, moduleKey: 'emr', permission: 'emr_read', doctorOnly: true },
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard', permission: 'all' },
      ]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard', permission: 'all' },
      ];

  const baseNavigation: NavigationItem[] = [
    ...doctorNav,
    { name: 'Patients', href: '/patients', icon: Users, moduleKey: 'patients', permission: 'patient_read' },
    { name: 'Health Cards', href: '/cards', icon: CreditCard, moduleKey: 'cards', permission: ['card_read', 'card_request_view', 'card_request_create'] },
    { name: 'Card Requests', href: '/card-requests', icon: ShieldCheck, moduleKey: 'card_requests', permission: ['card_request_view', 'card_request_view_own', 'card_request_create'] },
    { name: 'Family Health Shield', href: '/families', icon: Users2, moduleKey: 'families', permission: 'family_manage' },
    { name: 'Appointments', href: '/appointments', icon: Calendar, moduleKey: 'appointments', permission: ['appointment_view', 'emr_read', 'patient_read'] },
    { name: 'Doctors', href: '/doctors', icon: Crown, moduleKey: 'doctors', permission: ['doctor_view', 'doctor_manage', 'emr_read'] },
    { name: 'Laboratory', href: '/laboratory', icon: TestTube, moduleKey: 'laboratory', permission: ['test_view', 'catalog_manage', 'patient_read'] },
    { name: 'Pharmacy', href: '/pharmacy', icon: Pill, moduleKey: 'pharmacy', permission: ['patient_read', 'catalog_manage'] },
    { name: 'Billing', href: '/billing', icon: Receipt, moduleKey: 'billing', permission: ['bill_view', 'bill_view_own', 'bill_create'] },
    { name: 'Transactions', href: '/transactions', icon: DollarSign, moduleKey: 'transactions', permission: ['card_transactions_view', 'card_transactions_view_own', 'wallet_read'] },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3, moduleKey: 'reports', permission: 'reports_view' },
    { name: 'Staff & Users', href: '/users', icon: UserCheck, moduleKey: 'users', permission: 'users_manage' },
    { name: 'Permissions', href: '/permissions', icon: KeyRound, moduleKey: 'permissions', permission: ['users_manage', 'all'] },
    { name: 'Audit Logs', href: '/activity', icon: History, moduleKey: 'activity', permission: 'audit_view' },
    { name: 'Settings & System', href: '/settings', icon: Settings, moduleKey: 'settings', permission: 'settings_manage' },
    ...(currentUser?.role === 'super_admin'
      ? [
          { name: 'Super Admin Center', href: '/super-admin', icon: ShieldAlert, moduleKey: 'settings' as SystemModuleKey, permission: 'all' as Permission },
          { name: 'NGO Impact Report', href: '/super-admin/ngo-impact-report', icon: BarChart2, moduleKey: 'settings' as SystemModuleKey, permission: 'all' as Permission },
        ]
      : [])
  ];

  const navigation = baseNavigation.filter(item => {
    if (item.doctorOnly && !isDoctorRole) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 text-white flex flex-col bg-slate-900 dark:bg-[#070d1e] border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-xl`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <LabMedixLogo
            logoUrl={companyProfile.logoUrl}
            companyName={companyProfile.name}
            tagline={companyProfile.tagline}
            estdYear={companyProfile.estdYear}
            variant="horizontal"
            size="sm"
            theme="white"
            showAccreditation={true}
          />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            System Modules
          </div>
          {navigation.map((item) => {
            const hasModule = hasModuleAccess(item.moduleKey);
            const hasPerm = item.permission === 'all'
              ? (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.customPermissions?.includes('all'))
              : Array.isArray(item.permission)
                ? item.permission.some(p => can(p))
                : can(item.permission);
            if (!hasModule || !hasPerm) return null;

            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}

          {/* Quick External Portals Links */}
          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-blue-400/80">
            External Portals
          </div>
          <a
            href="#/home"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-purple-200 hover:bg-purple-950/30 transition-colors"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>3D Public Website</span>
          </a>
          <a
            href="#/portal"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/30 transition-colors"
          >
            <UserCircle className="w-4 h-4 shrink-0" />
            <span>CARD LOGIN / SIGN UP</span>
          </a>
        </nav>

        {/* User Role Card at bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="p-2.5 rounded-xl flex items-center justify-between bg-slate-900/90 border border-slate-800">
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {currentUser?.fullName || 'Active Staff'}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 block truncate">
                {currentUser?.role.replace('_', ' ')}
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse shrink-0 ml-2" />
          </div>
        </div>
      </aside>
    </>
  );
};
