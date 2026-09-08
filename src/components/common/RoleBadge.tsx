import React from 'react';
import { Role } from '../../types';
import { ROLE_CONFIGS } from '../../constants/roles';
import {
  Crown,
  Shield,
  Briefcase,
  UserCheck,
  Stethoscope,
  Megaphone,
  CreditCard,
  Eye,
  Lock,
  Receipt,
  Droplets
} from 'lucide-react';

interface RoleBadgeProps {
  role: Role;
  showClearance?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'ribbon' | 'clearance' | 'compact';
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showClearance = false,
  showIcon = true,
  size = 'md',
  variant = 'pill',
  className = ''
}) => {
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.reception;

  // Icon mapping
  const getRoleIcon = (r: Role, iconClass: string) => {
    switch (r) {
      case 'super_admin':
        return <Crown className={iconClass} />;
      case 'admin':
        return <Shield className={iconClass} />;
      case 'manager':
        return <Briefcase className={iconClass} />;
      case 'reception':
        return <UserCheck className={iconClass} />;
      case 'cashier':
        return <Receipt className={iconClass} />;
      case 'lab_staff':
        return <Stethoscope className={iconClass} />;
      case 'phlebotomist':
        return <Droplets className={iconClass} />;
      case 'marketing':
        return <Megaphone className={iconClass} />;
      case 'card_operator':
        return <CreditCard className={iconClass} />;
      case 'read_only':
        return <Eye className={iconClass} />;
      default:
        return <Shield className={iconClass} />;
    }
  };

  // Clearance level text
  const getClearanceLevel = (r: Role) => {
    switch (r) {
      case 'super_admin':
        return 'LEVEL 5 ROOT ACCESS';
      case 'admin':
        return 'LEVEL 4 CLINICAL ADMIN';
      case 'manager':
        return 'LEVEL 4 BRANCH OPS';
      case 'reception':
        return 'LEVEL 3 FRONT DESK';
      case 'cashier':
        return 'LEVEL 3 CASH DESK & BILLING';
      case 'lab_staff':
        return 'LEVEL 3 DIAGNOSTIC LAB';
      case 'phlebotomist':
        return 'LEVEL 3 PHLEBOTOMY & SAMPLING';
      case 'pharmacist':
        return 'LEVEL 3 PHARMACY & DISPENSING';
      case 'card_operator':
        return 'LEVEL 3 CR80 STUDIO';
      case 'marketing':
        return 'LEVEL 2 OUTREACH';
      case 'read_only':
        return 'LEVEL 1 COMPLIANCE AUDIT';
      default:
        return 'LEVEL 1 ACCESS';
    }
  };

  // Role Palette Metadata
  const roleThemes: Record<
    Role,
    {
      bg: string;
      text: string;
      border: string;
      glow: string;
      ribbonGradient: string;
      clearanceBg: string;
    }
  > = {
    super_admin: {
      bg: 'bg-purple-50 dark:bg-purple-950/60',
      text: 'text-purple-800 dark:text-purple-200',
      border: 'border-purple-300 dark:border-purple-700',
      glow: 'shadow-purple-500/20',
      ribbonGradient: 'linear-gradient(90deg, #4C1D95 0%, #7E22CE 50%, #4C1D95 100%)',
      clearanceBg: 'bg-purple-900/90 text-amber-300 border-amber-400/50'
    },
    admin: {
      bg: 'bg-blue-50 dark:bg-blue-950/60',
      text: 'text-blue-800 dark:text-blue-200',
      border: 'border-blue-300 dark:border-blue-700',
      glow: 'shadow-blue-500/20',
      ribbonGradient: 'linear-gradient(90deg, #1E3A8A 0%, #2563EB 50%, #1E3A8A 100%)',
      clearanceBg: 'bg-blue-900/90 text-blue-200 border-blue-400/50'
    },
    doctor: {
      bg: 'bg-teal-50 dark:bg-teal-950/60',
      text: 'text-teal-800 dark:text-teal-200',
      border: 'border-teal-300 dark:border-teal-700',
      glow: 'shadow-teal-500/20',
      ribbonGradient: 'linear-gradient(90deg, #0F766E 0%, #0D9488 50%, #0F766E 100%)',
      clearanceBg: 'bg-teal-950 text-teal-300 border-teal-400/50'
    },
    manager: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/60',
      text: 'text-indigo-800 dark:text-indigo-200',
      border: 'border-indigo-300 dark:border-indigo-700',
      glow: 'shadow-indigo-500/20',
      ribbonGradient: 'linear-gradient(90deg, #312E81 0%, #4F46E5 50%, #312E81 100%)',
      clearanceBg: 'bg-indigo-900/90 text-indigo-200 border-indigo-400/50'
    },
    reception: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      text: 'text-emerald-800 dark:text-emerald-200',
      border: 'border-emerald-300 dark:border-emerald-700',
      glow: 'shadow-emerald-500/20',
      ribbonGradient: 'linear-gradient(90deg, #064E3B 0%, #059669 50%, #064E3B 100%)',
      clearanceBg: 'bg-emerald-900/90 text-emerald-200 border-emerald-400/50'
    },
    cashier: {
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      text: 'text-amber-800 dark:text-amber-200',
      border: 'border-amber-300 dark:border-amber-700',
      glow: 'shadow-amber-500/20',
      ribbonGradient: 'linear-gradient(90deg, #78350F 0%, #B45309 50%, #78350F 100%)',
      clearanceBg: 'bg-amber-900/90 text-amber-200 border-amber-400/50'
    },
    lab_staff: {
      bg: 'bg-teal-50 dark:bg-teal-950/60',
      text: 'text-teal-800 dark:text-teal-200',
      border: 'border-teal-300 dark:border-teal-700',
      glow: 'shadow-teal-500/20',
      ribbonGradient: 'linear-gradient(90deg, #134E4A 0%, #0D9488 50%, #134E4A 100%)',
      clearanceBg: 'bg-teal-900/90 text-teal-200 border-teal-400/50'
    },
    phlebotomist: {
      bg: 'bg-rose-50 dark:bg-rose-950/60',
      text: 'text-rose-800 dark:text-rose-200',
      border: 'border-rose-300 dark:border-rose-700',
      glow: 'shadow-rose-500/20',
      ribbonGradient: 'linear-gradient(90deg, #881337 0%, #BE123C 50%, #881337 100%)',
      clearanceBg: 'bg-rose-900/90 text-rose-200 border-rose-400/50'
    },
    pharmacist: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      text: 'text-emerald-800 dark:text-emerald-200',
      border: 'border-emerald-300 dark:border-emerald-700',
      glow: 'shadow-emerald-500/20',
      ribbonGradient: 'linear-gradient(90deg, #065F46 0%, #059669 50%, #065F46 100%)',
      clearanceBg: 'bg-emerald-950 text-emerald-300 border-emerald-400/50'
    },
    marketing: {
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      text: 'text-amber-800 dark:text-amber-200',
      border: 'border-amber-300 dark:border-amber-700',
      glow: 'shadow-amber-500/20',
      ribbonGradient: 'linear-gradient(90deg, #78350F 0%, #D97706 50%, #78350F 100%)',
      clearanceBg: 'bg-amber-900/90 text-amber-200 border-amber-400/50'
    },
    card_operator: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/60',
      text: 'text-cyan-800 dark:text-cyan-200',
      border: 'border-cyan-300 dark:border-cyan-700',
      glow: 'shadow-cyan-500/20',
      ribbonGradient: 'linear-gradient(90deg, #164E63 0%, #0891B2 50%, #164E63 100%)',
      clearanceBg: 'bg-cyan-900/90 text-cyan-200 border-cyan-400/50'
    },
    read_only: {
      bg: 'bg-slate-100 dark:bg-slate-800/80',
      text: 'text-slate-800 dark:text-slate-200',
      border: 'border-slate-300 dark:border-slate-700',
      glow: 'shadow-slate-500/20',
      ribbonGradient: 'linear-gradient(90deg, #1E293B 0%, #475569 50%, #1E293B 100%)',
      clearanceBg: 'bg-slate-900/90 text-slate-200 border-slate-400/50'
    }
  };

  const currentTheme = roleThemes[role] || roleThemes.reception;

  // Size styling
  const sizeClasses = {
    sm: { text: 'text-[10px]', icon: 'w-3 h-3', pad: 'px-2 py-0.5' },
    md: { text: 'text-xs', icon: 'w-3.5 h-3.5', pad: 'px-2.5 py-1' },
    lg: { text: 'text-sm', icon: 'w-4 h-4', pad: 'px-3.5 py-1.5' }
  }[size];

  // Variant: Card Banner Ribbon (Full-Width Card Banner)
  if (variant === 'ribbon') {
    return (
      <div
        className={`w-full py-1 px-3 text-center text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-1.5 shadow-sm select-none ${className}`}
        style={{ background: currentTheme.ribbonGradient }}
      >
        {showIcon && getRoleIcon(role, 'w-3.5 h-3.5')}
        <span>{config.name}</span>
      </div>
    );
  }

  // Variant: Clearance Level Security Pill
  if (variant === 'clearance') {
    return (
      <div
        className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border font-mono text-[9px] shadow-xs ${currentTheme.clearanceBg} ${className}`}
      >
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span className="font-black uppercase tracking-wider">{getClearanceLevel(role)}</span>
        </div>
        <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-white/20 uppercase">
          SECURE
        </span>
      </div>
    );
  }

  // Variant: Compact Pill
  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border} ${className}`}
      >
        {showIcon && getRoleIcon(role, 'w-2.5 h-2.5')}
        <span>{config.name}</span>
      </span>
    );
  }

  // Variant: Standard Pill (Default)
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border font-bold ${sizeClasses.text} ${sizeClasses.pad} ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border} shadow-2xs ${className}`}
    >
      {showIcon && getRoleIcon(role, sizeClasses.icon)}
      <span>{config.name}</span>
      {showClearance && (
        <span className="text-[9px] font-mono opacity-80 pl-1 border-l border-current">
          {getClearanceLevel(role).split(' ')[0]} {getClearanceLevel(role).split(' ')[1]}
        </span>
      )}
    </div>
  );
};
