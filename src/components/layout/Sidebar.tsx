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
  BarChart2,
  Printer,
  Bell,
  Ambulance,
  BedDouble,
  Building,
  HeartPulse,
  Scissors,
  Activity,
  Scan,
  Droplet,
  Boxes,
  HardDrive
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

  const baseNavigation: NavigationItem[] = [
    // Top: Doctor Suite (if doctor) or Dashboard
    ...(isDoctorRole
      ? [
          { name: 'Doctor Consultation & Rx Suite', href: '/clinical', icon: Stethoscope, moduleKey: 'emr' as SystemModuleKey, permission: 'emr_read' as Permission, doctorOnly: true },
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' as SystemModuleKey, permission: 'all' as Permission },
        ]
      : [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' as SystemModuleKey, permission: 'all' as Permission },
        ]),

    // 01. FRONT DESK (Main patient entry point: search, register, UHID, health card verify, service dispatch)
    { name: '01. FRONT DESK', href: '/front-desk', icon: Users, moduleKey: 'patients', permission: 'patient_read' },

    // 02. OPD (OPD appointment, token, consultation and doctor prescription)
    { name: '02. OPD', href: '/appointments', icon: Calendar, moduleKey: 'appointments', permission: ['appointment_view', 'emr_read', 'patient_read'] },

    // 03. LABORATORY (Laboratory billing, sample collection, testing, reporting and diagnostic reports)
    { name: '03. LABORATORY', href: '/laboratory', icon: TestTube, moduleKey: 'laboratory', permission: ['test_view', 'catalog_manage', 'patient_read'] },

    // 04. IPD (Admission, bed, inpatient treatment and IPD billing)
    { name: '04. IPD', href: '/ipd', icon: BedDouble, moduleKey: 'ipd', permission: ['ipd_view', 'ipd_manage', 'all'] },

    // 05. PHARMACY (Prescription dispensing, medicine sales and pharmacy billing)
    { name: '05. PHARMACY', href: '/pharmacy', icon: Pill, moduleKey: 'pharmacy', permission: ['patient_read', 'catalog_manage'] },

    // 06. HEALTH CARD (Completely separate Health Card membership system)
    { name: '06. HEALTH CARD', href: '/cards', icon: CreditCard, moduleKey: 'cards', permission: ['card_read', 'card_request_view', 'card_request_create'] },

    // 07. REPORTS (Central authorized reports and analytics)
    { name: '07. REPORTS', href: '/reports', icon: BarChart3, moduleKey: 'reports', permission: 'reports_view' },

    // 08. STAFF & PERMISSIONS (Staff accounts, roles and permissions)
    { name: '08. STAFF & PERMISSIONS', href: '/users', icon: UserCheck, moduleKey: 'users', permission: 'users_manage' },

    // 09. SETTINGS & SYSTEM (One central company/system configuration)
    { name: '09. SETTINGS & SYSTEM', href: '/super-admin/company-settings', icon: Settings, moduleKey: 'settings', permission: 'all' },

    // 10. AUDIT LOGS (Central audit trail)
    { name: '10. AUDIT LOGS', href: '/activity', icon: History, moduleKey: 'activity', permission: 'audit_view' },

    // 11. BACKUP & RECOVERY (Separate Super Admin-only backup/recovery system)
    { name: '11. BACKUP & RECOVERY', href: '/super-admin/backup-recovery', icon: HardDrive, moduleKey: 'settings', permission: 'all' }
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
