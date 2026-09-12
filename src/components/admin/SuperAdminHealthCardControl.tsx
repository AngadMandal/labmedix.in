import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { CardDesignService } from '../../services/cardDesignService';
import { PrintService } from '../../services/printService';
import { CardDesignConfig, CardDesignVersion, CardThemePreset, CardMaterial, Patient, HealthCard, Membership } from '../../types';
import { CR80CardFront } from '../card/CR80CardFront';
import { CR80CardBack } from '../card/CR80CardBack';
import { APPROVED_GOLD_PRIVILEGE_TERMS } from '../../constants/cardTerms';
import { Modal } from '../common/Modal';
import {
  CreditCard,
  Crown,
  ShieldCheck,
  Palette,
  Sliders,
  FileText,
  RotateCw,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Building,
  Phone,
  MessageSquare,
  Globe,
  Upload,
  Layers,
  Save,
  Eye,
  Lock,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

export const SuperAdminHealthCardControl: React.FC = () => {
  const { companyProfile, updateCompanyProfile } = useSettings();
  const { showToast } = useToast();

  const [config, setConfig] = useState<CardDesignConfig>(() => CardDesignService.getActiveDesignConfig());
  const [versions, setVersions] = useState<CardDesignVersion[]>(() => CardDesignService.getDesignVersions());
  const [terms, setTerms] = useState<string[]>(() => CardDesignService.getApprovedTerms());

  const [activeTab, setActiveTab] = useState<'identity' | 'branding' | 'design' | 'terms' | 'versions'>('identity');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBleedGuides, setShowBleedGuides] = useState(false);

  // Version drafting modal
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftVersionName, setDraftVersionName] = useState('v1.1');
  const [draftChangesSummary, setDraftChangesSummary] = useState('');

  // Synchronize state with events
  useEffect(() => {
    const handleSync = () => {
      setConfig(CardDesignService.getActiveDesignConfig());
      setVersions(CardDesignService.getDesignVersions());
      setTerms(CardDesignService.getApprovedTerms());
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  // Demo patient & card objects for live CR80 preview
  const demoPatient: Patient = useMemo(() => ({
    id: 'LMDX-2026-000001',
    fullName: 'SOUVIK CHATTERJEE',
    age: 42,
    gender: 'male',
    dob: '1984-05-18',
    bloodGroup: 'B+',
    mobile: '+91 98301 44550',
    address: {
      villageArea: '42 Medical Enclave',
      postOffice: 'Bidhan Nagar PO',
      policeStation: 'Sector V PS',
      district: 'North 24 Parganas',
      state: 'West Bengal',
      pinCode: '700091',
      fullAddress: '42 Medical Enclave, Salt Lake Sector V, Kolkata 700091'
    },
    emergencyContact: { name: 'Ananya Chatterjee', relationship: 'Spouse', mobile: '+91 98301 44551' },
    medicalInfo: { allergies: 'Penicillin', chronicConditions: 'Hypertension', bloodGroup: 'B+' },
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    walletId: 'WAL-000001',
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system'
  }), []);

  const demoCard: HealthCard = useMemo(() => ({
    id: 'card_demo_01',
    cardNumber: `${config.cardPrefix || 'LHC-2026-'}000842`,
    patientId: demoPatient.id,
    membershipId: 'mem_gold',
    tier: config.cardTierTitle || 'GOLD PRIVILEGE',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + (config.validityDays || 365) * 86400000).toISOString().slice(0, 10),
    status: 'active',
    cvv: '842',
    verificationCode: 'VER-8840-001',
    nfcUid: '04:E2:89:1A:B5:4C:80',
    designConfig: config,
    statusHistory: [],
    renewedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }), [config, demoPatient.id]);

  const demoMembership: Membership = useMemo(() => ({
    id: 'mem_gold',
    name: config.cardTierTitle || 'Gold Privilege',
    slug: 'gold-privilege',
    validityMonths: Math.round((config.validityDays || 365) / 30),
    registrationFee: 999,
    annualRenewalFee: 499,
    opdDiscount: 25,
    labDiscount: 20,
    pharmacyDiscount: 12,
    homeCollectionDiscount: 100,
    description: 'Premier hospital healthcare privilege membership',
    specialBenefits: ['Unlimited OPD consultations at 25% off', 'Complimentary routine vitals', 'Priority laboratory queue'],
    color: '#d97706',
    badgeIcon: 'Crown',
    isFamilyPlan: true,
    maxFamilyMembers: 5,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z'
  }), [config]);

  const handleConfigChange = (updates: Partial<CardDesignConfig>) => {
    const updated = CardDesignService.updateActiveDesignConfig(updates, 'Super Administrator');
    setConfig(updated);
    showToast('success', 'Design Saved', 'Central Health Card configuration updated live.');
  };

  const handleSaveTerms = () => {
    CardDesignService.saveApprovedTerms(terms, 'Super Administrator');
    showToast('success', 'Terms Updated', '15-point Gold Privilege terms saved centrally.');
  };

  const handleResetTerms = () => {
    setTerms(APPROVED_GOLD_PRIVILEGE_TERMS);
    CardDesignService.saveApprovedTerms(APPROVED_GOLD_PRIVILEGE_TERMS, 'Super Administrator');
    showToast('info', 'Terms Reset', 'Reverted terms to approved Gold Privilege standards.');
  };

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftVersionName.trim()) return;

    try {
      CardDesignService.createDraftVersion(
        draftVersionName.trim(),
        draftChangesSummary || 'Draft design modifications',
        config,
        terms,
        'Super Administrator'
      );
      setVersions(CardDesignService.getDesignVersions());
      setIsDraftModalOpen(false);
      setDraftChangesSummary('');
      showToast('success', 'Version Drafted', `Design version ${draftVersionName} saved in version registry.`);
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handlePublishVersion = (versionId: string) => {
    try {
      const pub = CardDesignService.publishVersion(versionId, 'Super Administrator');
      setConfig(pub.config);
      setTerms(pub.termsAndConditions);
      setVersions(CardDesignService.getDesignVersions());
      showToast('success', 'Version Published', `Version ${pub.version} is now the active hospital-wide standard!`);
    } catch (err: any) {
      showToast('error', 'Publishing Error', err.message);
    }
  };

  const handleTestPrint = () => {
    const frontEl = document.getElementById('superadmin-card-front');
    const backEl = document.getElementById('superadmin-card-back');
    if (!frontEl) {
      showToast('error', 'Render Error', 'Card element not found for printing.');
      return;
    }
    PrintService.printCR80Card(frontEl, backEl, 'LABMEDIX Gold Privilege CR80 PVC Card Sample');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Super Admin Sovereign Control
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Health Card Configuration & Design Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Centralized design engine governing CR80 PVC card layouts, Gold Privilege tier branding, company logo synchronization, and version-controlled 15-point Terms & Conditions.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5">
          <button
            onClick={handleTestPrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all shadow-sm"
            title="300 DPI CR80 PVC Print Verification"
          >
            <Printer className="w-4 h-4" />
            300 DPI Test Print
          </button>
          <button
            onClick={() => setIsDraftModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Version Draft
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panels on Left, Live 3D CR80 Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Configuration Tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Sub Navigation */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('identity')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'identity'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-500" />
              Card Identity & Rules
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'branding'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Building className="w-4 h-4 text-blue-500" />
              Company Branding Sync
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'design'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Palette className="w-4 h-4 text-purple-500" />
              Aesthetics & Elements
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'terms'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              Terms & Conditions
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'versions'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <History className="w-4 h-4 text-cyan-500" />
              Version Registry
            </button>
          </div>

          {/* TAB 1: CARD IDENTITY & RULES */}
          {activeTab === 'identity' && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Card Identity & Operational Parameters</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Controls title embossing, serial prefix, and validity schedules</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Card Header Title</label>
                  <input
                    type="text"
                    value={config.cardTitle || 'LABMEDIX HEALTH CARD'}
                    onChange={e => handleConfigChange({ cardTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Card Tier Badge</label>
                  <input
                    type="text"
                    value={config.cardTierTitle || 'GOLD PRIVILEGE'}
                    onChange={e => handleConfigChange({ cardTierTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black uppercase text-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Card Number Prefix</label>
                  <input
                    type="text"
                    value={config.cardPrefix || 'LHC-'}
                    onChange={e => handleConfigChange({ cardPrefix: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Validity Period (Days)</label>
                  <input
                    type="number"
                    min="30"
                    max="3650"
                    value={config.validityDays || 365}
                    onChange={e => handleConfigChange({ validityDays: Number(e.target.value) || 365 })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Card Issuance Default Rule: OFF
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Per hospital security protocol, registering a patient or adding family dependents does not auto-issue physical CR80 cards. Card issuance must follow the explicit staff request and Super Admin approval workflow.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY BRANDING SYNC */}
          {activeTab === 'branding' && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Central Company Settings Integration</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Health Card automatically draws official branding from Company Settings</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={companyProfile.logoUrl || '/logo.jpg'}
                    alt="Company Logo"
                    className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-200 dark:border-slate-600"
                  />
                  <div>
                    <strong className="text-slate-900 dark:text-white block">{companyProfile.name}</strong>
                    <span className="text-[11px] text-slate-400 italic">Tagline: "{companyProfile.tagline}"</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>Support: <strong>{companyProfile.helpline || companyProfile.phone}</strong></div>
                  <div>WhatsApp: <strong>{companyProfile.whatsapp}</strong></div>
                  <div>Website: <strong>{companyProfile.website}</strong></div>
                  <div>Reg No: <strong>{companyProfile.registrationNo}</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Logo Placement</label>
                  <select
                    value={config.logoPosition || 'left'}
                    onChange={e => handleConfigChange({ logoPosition: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="left">Top Left (Hospital Standard)</option>
                    <option value="center">Top Center</option>
                    <option value="right">Top Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Card Tagline (Optional)</label>
                  <input
                    type="text"
                    placeholder="Defaults to company tagline"
                    value={config.customTagline || ''}
                    onChange={e => handleConfigChange({ customTagline: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AESTHETICS & ELEMENTS */}
          {activeTab === 'design' && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Card Themes, Material & Visual Elements</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Select luxury theme preset and toggle holographic/security features</p>
              </div>

              {/* Theme presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Master Theme Preset</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'royal_gold', label: 'Royal Gold Privilege', desc: 'Luxury Gold & Obsidian' },
                    { id: 'executive_navy', label: 'Executive Navy', desc: 'Deep Ocean & Cyan' },
                    { id: 'emerald_health', label: 'Emerald Health', desc: 'Clinical Green & Mint' },
                    { id: 'platinum_elite', label: 'Platinum Elite', desc: 'Dark Slate & Silver' },
                    { id: 'clean_minimal', label: 'Clean Minimal', desc: 'Pure White Hospital' },
                    { id: 'crimson_care', label: 'Crimson Care', desc: 'Emergency Ruby & Rose' }
                  ].map(thm => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => handleConfigChange({ preset: thm.id as CardThemePreset })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        config.preset === thm.id
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{thm.label}</div>
                      <div className="text-[10px] text-slate-400">{thm.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Physical Material */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">PVC Card Material</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['gloss', 'metallic', 'matte', 'hologram'] as CardMaterial[]).map(mat => (
                    <button
                      key={mat}
                      type="button"
                      onClick={() => handleConfigChange({ material: mat })}
                      className={`p-2 rounded-xl border text-center uppercase text-xs font-bold transition-all ${
                        config.material === mat
                          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Element Toggles */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Security & Element Toggles</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { key: 'showChip', label: 'EMV Golden Chip' },
                    { key: 'showContactless', label: 'NFC Contactless Icon' },
                    { key: 'showEmergencyBadge', label: 'Blood Group Badge' },
                    { key: 'showSignatureStrip', label: 'Back Signature Strip' },
                    { key: 'showFamilyBadge', label: 'Family Shield Badge' }
                  ].map(el => (
                    <label key={el.key} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as any)[el.key] !== false}
                        onChange={e => handleConfigChange({ [el.key]: e.target.checked } as any)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-[11px]">{el.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gold Privilege — Approved 15 Terms</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Officially approved English operational terms rendered on card back</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetTerms}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={handleSaveTerms}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Terms
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {terms.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-mono font-bold text-amber-500 mt-1">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={t}
                      onChange={e => {
                        const val = e.target.value;
                        setTerms(prev => prev.map((item, i) => i === idx ? val : item));
                      }}
                      className="flex-1 px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: VERSION REGISTRY */}
          {activeTab === 'versions' && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Design Version Control Registry</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Track iterations, approvals, and published hospital card standards</p>
                </div>
                <button
                  onClick={() => setIsDraftModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-sm hover:bg-amber-400"
                >
                  + Draft Version
                </button>
              </div>

              <div className="space-y-2">
                {versions.map(ver => {
                  const isLive = ver.status === 'published';
                  return (
                    <div
                      key={ver.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isLive
                          ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{ver.version}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isLive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {ver.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{ver.changesSummary}</p>
                        <div className="text-[10px] text-slate-400">
                          Created by {ver.createdBy} on {new Date(ver.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>

                      <div>
                        {ver.status === 'draft' && (
                          <button
                            onClick={() => handlePublishVersion(ver.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                          >
                            Publish
                          </button>
                        )}
                        {isLive && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Live Standard
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live 3D CR80 PVC Stage (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-white relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Live CR80 Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBleedGuides(!showBleedGuides)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                    showBleedGuides ? 'bg-red-600/30 text-red-300 border-red-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Toggle 3mm safe print margin"
                >
                  3mm Bleed: {showBleedGuides ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Flip Card
                </button>
              </div>
            </div>

            {/* 3D Perspective Card Stage */}
            <div className="perspective-1000 my-2" style={{ width: '380px', height: '240px' }}>
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative preserve-3d cursor-pointer w-full h-full"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className={`backface-hidden absolute inset-0 ${isFlipped ? 'pointer-events-none' : ''}`}>
                  <CR80CardFront
                    id="superadmin-card-front"
                    patient={demoPatient}
                    card={demoCard}
                    membership={demoMembership}
                    company={companyProfile}
                    scale={0.76}
                    showBleedGuides={showBleedGuides}
                  />
                </div>
                <div className={`backface-hidden rotate-y-180 absolute inset-0 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                  <CR80CardBack
                    id="superadmin-card-back"
                    patient={demoPatient}
                    card={demoCard}
                    membership={demoMembership}
                    company={companyProfile}
                    scale={0.76}
                    showBleedGuides={showBleedGuides}
                  />
                </div>
              </motion.div>
            </div>

            <p className="text-[11px] text-slate-400 font-mono mt-3">
              Click anywhere on card to flip between Front and Back.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: New Version Draft */}
      <Modal isOpen={isDraftModalOpen} onClose={() => setIsDraftModalOpen(false)} title="Create New Health Card Design Version" maxWidth="sm">
        <form onSubmit={handleCreateDraft} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Version Identifier *</label>
            <input
              type="text"
              required
              placeholder="e.g. v1.1 or v2.0"
              value={draftVersionName}
              onChange={e => setDraftVersionName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Summary of Modifications *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe styling changes, terms revision, or branding adjustments..."
              value={draftChangesSummary}
              onChange={e => setDraftChangesSummary(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDraftModalOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-sm"
            >
              Save Version Draft
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
