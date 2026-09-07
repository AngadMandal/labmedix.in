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
  Radio
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
    { name: 'Offline Intake Form', href: '/offline-form', icon: FileText, moduleKey: 'patients', permission: 'patient_read' },
    { name: 'Doctor Master & Commission', href: '/doctor-master', icon: Crown, moduleKey: 'doctor_master', permission: ['doctor_view', 'doctor_manage'] },
    { name: 'Test Master & Packages', href: '/test-master', icon: TestTube, moduleKey: 'test_master', permission: ['test_view', 'catalog_manage'] },
    { name: 'NGO & CSR Welfare Hub', href: '/ngo-welfare', icon: HeartHandshake, moduleKey: 'ngo_welfare', permission: ['ngo_view', 'ngo_manage'] },
    { name: 'Health Cards', href: '/cards', icon: CreditCard, moduleKey: 'cards', permission: ['card_read', 'card_request_view', 'card_request_create'] },
    { name: 'CR80 PVC Studio', href: '/card-studio', icon: Palette, moduleKey: 'card_studio', permission: 'card_print' },
    { name: 'A4 Print Sheet', href: '/cards/print-sheet', icon: Layers, moduleKey: 'print_sheet', permission: 'card_print' },
    { name: 'Card Print & Dispatch', href: '/cards/printing-dispatch', icon: Truck, moduleKey: 'card_dispatch', permission: ['card_print', 'card_read'] },
    { name: 'Memberships', href: '/memberships', icon: Award, moduleKey: 'memberships', permission: 'membership_manage' },
    { name: 'Family Groups', href: '/families', icon: Users2, moduleKey: 'families', permission: 'family_manage' },
    { name: 'Health Wallet', href: '/wallet', icon: Wallet, moduleKey: 'wallet', permission: 'wallet_read' },
    { name: 'Cash Desk Vouchers', href: '/cash-desk-vouchers', icon: Receipt, moduleKey: 'cash_desk_vouchers', permission: ['voucher_redeem', 'voucher_manage'] },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3, moduleKey: 'reports', permission: 'reports_view' },
    { name: 'Staff Management', href: '/users', icon: UserCheck, moduleKey: 'users', permission: 'users_manage' },
    { name: '3D Website & CMS Studio', href: '/website-cms', icon: Sparkles, moduleKey: 'website_cms', permission: 'settings_manage' },
    { name: 'Integrations Hub', href: '/integrations', icon: Globe, moduleKey: 'integrations', permission: 'settings_manage' },
    { name: 'Gmail Workspace Hub', href: '/gmail-integration', icon: Mail, moduleKey: 'integrations', permission: 'settings_manage' },
    { name: 'Audit & Activity', href: '/activity', icon: History, moduleKey: 'activity', permission: 'audit_view' },
    { name: 'System Monitoring', href: '/system-monitoring', icon: Cpu, moduleKey: 'system_monitoring', permission: 'audit_view' },
    { name: 'Multi-Device Hub', href: '/multi-device', icon: Radio, moduleKey: 'system_monitoring', permission: 'audit_view' },
    { name: 'Backup & Restore', href: '/backup', icon: Database, moduleKey: 'backup', permission: 'backup_manage' },
    { name: 'Company Settings', href: '/settings', icon: Settings, moduleKey: 'settings', permission: 'settings_manage' }
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
