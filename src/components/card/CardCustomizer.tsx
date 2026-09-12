import React from 'react';
import { HealthCard, Membership, CardThemePreset, CardMaterial } from '../../types';
import { Palette, Sparkles, Shield, Eye, Layers, Wifi, Heart, Tag, Sliders, Users2 } from 'lucide-react';

interface CardCustomizerProps {
  card: HealthCard;
  membership: Membership;
  onDesignChange: (preset: CardThemePreset, material: CardMaterial, customTagline?: string, showFamilyBadge?: boolean) => void;
  showBleedGuides?: boolean;
  onToggleBleedGuides?: () => void;
  onOpenFamilyModal?: () => void;
  hasFamilyGroup?: boolean;
}

export const CardCustomizer: React.FC<CardCustomizerProps> = ({
  card,
  membership,
  onDesignChange,
  showBleedGuides = false,
  onToggleBleedGuides,
  onOpenFamilyModal,
  hasFamilyGroup = true
}) => {
  const currentConfig = card?.designConfig || {
    preset: 'executive_navy',
    material: 'gloss',
    showFamilyBadge: true
  };

  const showFamilyBadge = currentConfig.showFamilyBadge !== false;

  const presets: { id: CardThemePreset; name: string; desc: string; previewClass: string }[] = [
    {
      id: 'executive_navy',
      name: 'Executive Navy',
      desc: 'Official Labmedix midnight blue & cyan luster',
      previewClass: 'from-slate-900 via-blue-900 to-blue-700'
    },
    {
      id: 'emerald_health',
      name: 'Emerald Health',
      desc: 'Deep forest medical green & mint gold',
      previewClass: 'from-slate-950 via-emerald-900 to-emerald-600'
    },
    {
      id: 'royal_gold',
      name: 'Royal Gold VIP',
      desc: 'Obsidian luxury bronze & warm amber glow',
      previewClass: 'from-amber-950 via-amber-800 to-yellow-600'
    },
    {
      id: 'platinum_elite',
      name: 'Platinum Obsidian',
      desc: 'Onyx black & platinum frosted texture',
      previewClass: 'from-slate-950 via-slate-800 to-slate-600'
    },
    {
      id: 'clean_minimal',
      name: 'Clean Clinical White',
      desc: 'High-contrast medical white & sapphire blue',
      previewClass: 'from-white via-slate-100 to-slate-200 text-slate-800 border'
    },
    {
      id: 'crimson_care',
      name: 'Crimson Critical',
      desc: 'Emergency ruby red & scarlet finish',
      previewClass: 'from-rose-950 via-rose-900 to-rose-700'
    }
  ];

  const materials: { id: CardMaterial; name: string; desc: string; icon: string }[] = [
    {
      id: 'gloss',
      name: 'UV Clear Gloss',
      desc: 'High-shine reflective surface with light reflections',
      icon: '✨'
    },
    {
      id: 'matte',
      name: 'Matte Frosted',
      desc: 'Smooth non-reflective satin texture with anti-glare',
      icon: '🌫️'
    },
    {
      id: 'metallic',
      name: 'Metallic Pearl',
      desc: 'Dual-layer metallic flake luster with gold sheen',
      icon: '🪙'
    },
    {
      id: 'hologram',
      name: 'Security Hologram',
      desc: 'Prismatic optical diffraction rainbow security foil',
      icon: '🌈'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
          <Sliders className="w-4 h-4 text-brand-blue" />
          CR80 Design Studio
        </h3>
        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
          LIVE ENGINE
        </span>
      </div>

      {/* Central Super Admin Design Authority Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-900 dark:text-amber-200">
          <span className="font-bold block">Centrally Governed CR80 Card Standards</span>
          Company branding, terms, validity rules, and versioning are managed centrally under{' '}
          <a href="/super-admin?tab=health_card_control" className="font-bold underline text-amber-600 dark:text-amber-400 hover:opacity-80">
            Super Admin → Health Card Control Center
          </a>.
        </div>
      </div>

      {/* 1. Theme Presets */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
          Master Color Themes (6 Presets)
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onDesignChange(p.id, currentConfig.material, currentConfig.customTagline, showFamilyBadge)}
              className={`p-3 rounded-2xl text-left transition-all border ${
                currentConfig.preset === p.id
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className={`h-4 w-full rounded-lg bg-gradient-to-r ${p.previewClass} mb-2 shadow-xs`} />
              <strong className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                {p.name}
              </strong>
              <p className="text-[10px] text-slate-500 line-clamp-1">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Physical Material Finish */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
          Physical Material Finish (4 Finishes)
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onDesignChange(currentConfig.preset, m.id, currentConfig.customTagline, showFamilyBadge)}
              className={`p-3 rounded-2xl text-left transition-all border ${
                currentConfig.material === m.id
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{m.icon}</span>
                <strong className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {m.name}
                </strong>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-2">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Family Linkage Badge ON/OFF Switch */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <strong className="text-xs font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5 text-blue-600" />
              Family Linkage on Card
            </strong>
            <p className="text-[10px] text-slate-500">Show/Hide household badge</p>
          </div>

          <button
            type="button"
            onClick={() => onDesignChange(currentConfig.preset, currentConfig.material, currentConfig.customTagline, !showFamilyBadge)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              showFamilyBadge
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
            }`}
          >
            {showFamilyBadge ? '● Badge ON' : '○ Badge OFF'}
          </button>
        </div>

        {onOpenFamilyModal && (
          <button
            type="button"
            onClick={onOpenFamilyModal}
            className="w-full py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-brand-blue dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2 transition-colors"
          >
            <Users2 className="w-4 h-4" />
            <span>Open Family Linkage Popup</span>
          </button>
        )}
      </div>

      {/* 4. Safe Bleed Margin Toggle for Production Printing */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <strong className="text-xs font-bold text-slate-900 dark:text-white block">
              3mm Safe Bleed Guides
            </strong>
            <p className="text-[10px] text-slate-500">Overlay cutter alignment guides</p>
          </div>
          {onToggleBleedGuides && (
            <button
              type="button"
              onClick={onToggleBleedGuides}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                showBleedGuides
                  ? 'bg-red-50 text-red-600 border-red-300 dark:bg-red-950 dark:border-red-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showBleedGuides ? 'Guides Active' : 'Show Guides'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};