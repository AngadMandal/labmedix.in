import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { ThemeSelectorModal } from '../../components/layout/ThemeSelectorModal';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { StorageService, STORAGE_KEYS } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { BackupService } from '../../services/backupService';
import { CompanySettingsService, CompanyValidationReport } from '../../services/companySettingsService';
import { DocumentBrandPreview } from '../../components/settings/DocumentBrandPreview';
import { DEFAULT_DOCUMENT_BRANDING, DEFAULT_SYSTEM_CONFIG } from '../../constants/defaults';
import {
  Patient,
  HealthCard,
  Membership,
  CompanyProfile,
  CardThemePreset,
  CardMaterial,
  CompanyLogoMetadata,
  DocumentBrandingConfig,
  SystemSettingsConfig,
  NFCSettings,
  UpiMerchantSettings
} from '../../types';
import { CR80CardFront } from '../../components/card/CR80CardFront';
import { CR80CardBack } from '../../components/card/CR80CardBack';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Settings,
  Save,
  Building,
  Phone,
  Globe,
  Shield,
  Sparkles,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  FileText,
  Ambulance,
  Award,
  Zap,
  MapPin,
  Lock,
  Download,
  RotateCw,
  RefreshCw,
  Radio,
  Smartphone,
  Unlock,
  Compass,
  Building2,
  Users,
  Eye,
  Sliders,
  Check,
  Receipt,
  FileCheck,
  Crown,
  Printer,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GooglePayMerchantQR } from '../../components/payment/GooglePayMerchantQR';
import { AddressAutoPopupModal } from '../../components/common/AddressAutoPopupModal';
import { TierConfigManager } from '../../components/settings/TierConfigManager';

export type SettingsTab =
  | 'identity'
  | 'logo'
  | 'branding'
  | 'billing_standards'
  | 'system_config'
  | 'tier_config'
  | 'nfc_upi'
  | 'validation'
  | 'preview';

export const SettingsPage: React.FC = () => {
  const { companyProfile, updateCompanyProfile, refreshCompanyProfile } = useSettings();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSyncingCentral, setIsSyncingCentral] = useState(false);

  const currentUser = StorageService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Super Admin Auto-Lock System State
  const [isLocked, setIsLocked] = useState<boolean>(companyProfile.isLocked ?? true);
  const [lockedBy, setLockedBy] = useState<string>(companyProfile.lockedBy || 'Super Administrator');
  const [lockedAt, setLockedAt] = useState<string>(companyProfile.lockedAt || '');

  // Address Selection Popup Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');

  // 1. Branding & Identity State
  const [name, setName] = useState(companyProfile.name || 'LABMEDIX');
  const [legalName, setLegalName] = useState(companyProfile.legalName || 'LABMEDIX MULTI-SPECIALITY HEALTHCARE PRIVATE LIMITED');
  const [tagline, setTagline] = useState(companyProfile.tagline || 'Confident In Care');
  const [estdYear, setEstdYear] = useState(companyProfile.estdYear || '2025');
  const [subtitle, setSubtitle] = useState(companyProfile.subtitle || 'Multi-speciality Outdoor & Diagnostic Centre');
  const [logoUrl, setLogoUrl] = useState(companyProfile.logoUrl || '/logo.jpg');
  const [logoMetadata, setLogoMetadata] = useState<CompanyLogoMetadata | undefined>(companyProfile.logoMetadata);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  // Address fields
  const [address, setAddress] = useState(companyProfile.address || 'Main Medical Expressway, Sultanganj');
  const [postOffice, setPostOffice] = useState(companyProfile.postOffice || 'Sultanganj P.O.');
  const [policeStation, setPoliceStation] = useState(companyProfile.policeStation || 'Sultanganj PS');
  const [district, setDistrict] = useState(companyProfile.district || 'Malda');
  const [stateVal, setStateVal] = useState(companyProfile.state || 'West Bengal');
  const [pinCode, setPinCode] = useState(companyProfile.pinCode || '732142');

  // Contacts & Helplines
  const [phone, setPhone] = useState(companyProfile.phone || '+91 98765 43210');
  const [helpline, setHelpline] = useState(companyProfile.helpline || '+91 98765 43210');
  const [ambulanceHelpline, setAmbulanceHelpline] = useState(companyProfile.ambulanceHelpline || '1800 123 4567');
  const [bloodBankHelpline, setBloodBankHelpline] = useState(companyProfile.bloodBankHelpline || '+91 98765 43211');
  const [whatsapp, setWhatsapp] = useState(companyProfile.whatsapp || '+91 98765 43210');
  const [email, setEmail] = useState(companyProfile.email || 'care@labmedix.in');
  const [website, setWebsite] = useState(companyProfile.website || 'https://labmedix.in');

  // Legal, Licenses & GST
  const [registrationNo, setRegistrationNo] = useState(companyProfile.registrationNo || 'WB-MED-MALDA-2026/08942');
  const [isoCertification, setIsoCertification] = useState(companyProfile.isoCertification || 'ISO 9001:2015 ACCREDITED • ADVANCED DIAGNOSTIC LABS • NABH STANDARDS');
  const [clinicalLicenseNo, setClinicalLicenseNo] = useState(companyProfile.clinicalLicenseNo || 'CEA/WB/MLD/2026/1102');
  const [gstin, setGstin] = useState(companyProfile.gstin || '19AAACL1234F1Z5');

  // Document Branding Configuration
  const [docBranding, setDocBranding] = useState<DocumentBrandingConfig>(companyProfile.documentBranding || DEFAULT_DOCUMENT_BRANDING);

  // System Configuration (Numbering, Date/Time, Printing, Security)
  const [sysConfig, setSysConfig] = useState<SystemSettingsConfig>(companyProfile.systemConfig || DEFAULT_SYSTEM_CONFIG);

  // Card Design Defaults
  const [selectedPreset, setSelectedPreset] = useState<CardThemePreset>('executive_navy');
  const [selectedMaterial, setSelectedMaterial] = useState<CardMaterial>('gloss');
  const [cardValidityMonths, setCardValidityMonths] = useState<number>(companyProfile.cardValidityMonths || 12);
  const [cardFooterNotice, setCardFooterNotice] = useState(companyProfile.cardFooterNotice || 'Present this card or digital QR at LABMEDIX front desk to redeem medical discounts.');
  const [cardSecurityWatermark, setCardSecurityWatermark] = useState(companyProfile.cardSecurityWatermark || 'LABMEDIX SECURE HEALTHCARE • AngadMandal/Labmedix.in');
  const [currencySymbol, setCurrencySymbol] = useState(companyProfile.currencySymbol || '₹');
  const [showBleedGuides, setShowBleedGuides] = useState(false);

  // NFC Settings
  const defaultNfc: NFCSettings = companyProfile.nfcSettings || {
    enabled: true,
    defaultStandard: 'ISO/IEC 14443 Type A',
    frequency: '13.56 MHz',
    payloadType: 'verification_url',
    autoWriteOnIssue: true,
    securityKey: 'A0B1C2D3E4F5',
    enableWebNfcApi: true
  };
  const [nfcEnabled, setNfcEnabled] = useState<boolean>(defaultNfc.enabled);
  const [nfcStandard, setNfcStandard] = useState<'ISO/IEC 14443 Type A' | 'MIFARE Classic 1K/4K' | 'NTAG213/215/216' | 'FeliCa'>(defaultNfc.defaultStandard);
  const [nfcFrequency, setNfcFrequency] = useState<string>(defaultNfc.frequency);
  const [nfcPayloadType, setNfcPayloadType] = useState<'verification_url' | 'deep_link' | 'ndef_json' | 'vcard'>(defaultNfc.payloadType);
  const [nfcAutoWrite, setNfcAutoWrite] = useState<boolean>(defaultNfc.autoWriteOnIssue);
  const [nfcKey, setNfcKey] = useState<string>(defaultNfc.securityKey);
  const [nfcWebApi, setNfcWebApi] = useState<boolean>(defaultNfc.enableWebNfcApi);
  const [nfcTestResult, setNfcTestResult] = useState<string | null>(null);
  const [isSimulatingNfcTap, setIsSimulatingNfcTap] = useState(false);

  // UPI & Google Pay Settings
  const defaultUpi: UpiMerchantSettings = companyProfile.upiSettings || {
    enabled: true,
    merchantVpa: '7047108226@okbizaxis',
    merchantName: companyProfile.name || 'LABMEDIX MULTI-SPECIALITY CENTRE',
    merchantMcc: '8099',
    googlePayMerchantId: 'GPAY-LMDX-8829-LIVE',
    googlePayBusinessName: 'LABMEDIX HEALTHCARE',
    enableDeepLinks: true,
    autoVerifySimulation: true
  };
  const [upiEnabled, setUpiEnabled] = useState<boolean>(defaultUpi.enabled);
  const [upiVpa, setUpiVpa] = useState<string>(defaultUpi.merchantVpa);
  const [upiMerchantName, setUpiMerchantName] = useState<string>(defaultUpi.merchantName);
  const [upiMcc, setUpiMcc] = useState<string>(defaultUpi.merchantMcc || '8099');
  const [gpayMerchantId, setGpayMerchantId] = useState<string>(defaultUpi.googlePayMerchantId || 'GPAY-LMDX-8829-LIVE');
  const [gpayBusinessName, setGpayBusinessName] = useState<string>(defaultUpi.googlePayBusinessName || 'LABMEDIX HEALTHCARE');
  const [upiDeepLinks, setUpiDeepLinks] = useState<boolean>(defaultUpi.enableDeepLinks ?? true);

  // Registration Policies
  const defaultRegSettings = companyProfile.registrationSettings || {
    enableClinicalTriageDefault: false,
    maxIncludedFamilyMembers: 5,
    additionalMemberFee: 299,
    cardIssuanceDefault: false
  };
  const [regTriageDefault, setRegTriageDefault] = useState<boolean>(defaultRegSettings.enableClinicalTriageDefault ?? false);
  const [regMaxFamily, setRegMaxFamily] = useState<number>(defaultRegSettings.maxIncludedFamilyMembers ?? 5);
  const [regExtraMemberFee, setRegExtraMemberFee] = useState<number>(defaultRegSettings.additionalMemberFee ?? 299);
  const [regCardIssuanceDefault, setRegCardIssuanceDefault] = useState<boolean>(defaultRegSettings.cardIssuanceDefault ?? false);

  // 3D Card Studio Preview State
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state from context when updated
  useEffect(() => {
    if (companyProfile && !isSaving) {
      setName(companyProfile.name || '');
      setLegalName(companyProfile.legalName || '');
      setTagline(companyProfile.tagline || '');
      setEstdYear(companyProfile.estdYear || '2025');
      setSubtitle(companyProfile.subtitle || '');
      setLogoUrl(companyProfile.logoUrl || '/logo.jpg');
      setLogoMetadata(companyProfile.logoMetadata);
      setAddress(companyProfile.address || '');
      setPostOffice(companyProfile.postOffice || 'Sultanganj P.O.');
      setPoliceStation(companyProfile.policeStation || 'Sultanganj PS');
      setDistrict(companyProfile.district || 'Malda');
      setStateVal(companyProfile.state || 'West Bengal');
      setPinCode(companyProfile.pinCode || '732142');
      setPhone(companyProfile.phone || '');
      setHelpline(companyProfile.helpline || '');
      setAmbulanceHelpline(companyProfile.ambulanceHelpline || '1800 123 4567');
      setBloodBankHelpline(companyProfile.bloodBankHelpline || '+91 98765 43211');
      setWhatsapp(companyProfile.whatsapp || '');
      setEmail(companyProfile.email || '');
      setWebsite(companyProfile.website || '');
      setRegistrationNo(companyProfile.registrationNo || '');
      setIsoCertification(companyProfile.isoCertification || '');
      setClinicalLicenseNo(companyProfile.clinicalLicenseNo || '');
      setGstin(companyProfile.gstin || '');
      setCardValidityMonths(companyProfile.cardValidityMonths || 12);
      setCardFooterNotice(companyProfile.cardFooterNotice || '');
      setCardSecurityWatermark(companyProfile.cardSecurityWatermark || '');
      setCurrencySymbol(companyProfile.currencySymbol || '₹');
      setIsLocked(companyProfile.isLocked ?? true);
      setLockedBy(companyProfile.lockedBy || 'Super Administrator');
      setLockedAt(companyProfile.lockedAt || '');

      if (companyProfile.documentBranding) {
        setDocBranding(companyProfile.documentBranding);
      }
      if (companyProfile.systemConfig) {
        setSysConfig(companyProfile.systemConfig);
      }
    }
  }, [companyProfile, isSaving]);

  // Live Company Profile for Preview & Validation
  const liveCompany: CompanyProfile = useMemo(() => ({
    ...companyProfile,
    name: name || 'LABMEDIX',
    legalName: legalName || 'LABMEDIX MULTI-SPECIALITY HEALTHCARE PRIVATE LIMITED',
    tagline: tagline || 'Confident In Care',
    estdYear: estdYear || '2025',
    subtitle: subtitle || 'Multi-speciality Outdoor & Diagnostic Centre',
    logoUrl: logoUrl || '/logo.jpg',
    logoMetadata: logoMetadata || {
      url: logoUrl || '/logo.jpg',
      fileType: 'image/jpeg',
      isActive: true,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Super Administrator'
    },
    address: address || 'Main Medical Expressway, Sultanganj',
    postOffice: postOffice || 'Sultanganj P.O.',
    policeStation: policeStation || 'Sultanganj PS',
    district: district || 'Malda',
    state: stateVal || 'West Bengal',
    pinCode: pinCode || '732142',
    phone: phone || '+91 98765 43210',
    helpline: helpline || '+91 98765 43210',
    ambulanceHelpline: ambulanceHelpline || '1800 123 4567',
    bloodBankHelpline: bloodBankHelpline || '+91 98765 43211',
    whatsapp: whatsapp || '+91 98765 43210',
    email: email || 'care@labmedix.in',
    website: website || 'https://labmedix.in',
    registrationNo: registrationNo || 'WB-MED-MALDA-2026/08942',
    isoCertification: isoCertification || 'ISO 9001:2015 ACCREDITED • NABH STANDARDS',
    clinicalLicenseNo: clinicalLicenseNo || 'CEA/WB/MLD/2026/1102',
    gstin: gstin || '19AAACL1234F1Z5',
    cardValidityMonths,
    cardFooterNotice,
    cardSecurityWatermark,
    currencySymbol,
    documentBranding: docBranding,
    systemConfig: sysConfig
  }), [
    companyProfile, name, legalName, tagline, estdYear, subtitle, logoUrl, logoMetadata,
    address, postOffice, policeStation, district, stateVal, pinCode, phone, helpline,
    ambulanceHelpline, bloodBankHelpline, whatsapp, email, website, registrationNo,
    isoCertification, clinicalLicenseNo, gstin, cardValidityMonths, cardFooterNotice,
    cardSecurityWatermark, currencySymbol, docBranding, sysConfig
  ]);

  // Validation Report
  const validationReport: CompanyValidationReport = useMemo(() => {
    return CompanySettingsService.validateCompanyProfile(liveCompany);
  }, [liveCompany]);

  // Logo file upload handler using CompanySettingsService
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingLogo(true);
    try {
      const result = await CompanySettingsService.processLogoFile(file);
      if (result.success && result.dataUrl) {
        setLogoUrl(result.dataUrl);
        setLogoMetadata(result.metadata);
        showToast('success', 'Logo Processed Successfully', 'Preview active emblem on dark and light backgrounds, then click Save to activate.');
      } else {
        showToast('error', 'Upload Rejected', result.error || 'Failed to process logo image.');
      }
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleResetLogo = () => {
    setLogoUrl('/logo.jpg');
    setLogoMetadata({
      url: '/logo.jpg',
      fileType: 'image/jpeg',
      isActive: true,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.fullName || 'Super Administrator'
    });
    showToast('info', 'Default Monogram Restored', 'Restored official LABMEDIX emblem.');
  };

  // Toggle Super Admin Lock
  const handleToggleLock = () => {
    if (!isSuperAdmin) {
      showToast('error', 'Security Access Denied', 'Only Super Administrator is authorized to unlock or modify system settings.');
      return;
    }
    if (isLocked) {
      setIsLocked(false);
      showToast('info', 'Settings Unlocked 🔓', 'Configuration fields are now editable. Click "Save All & Auto-Lock Settings" when done.');
    } else {
      setIsLocked(true);
      showToast('info', 'Settings Locked 🔒', 'System settings are locked in read-only mode.');
    }
  };

  // Save Company Configuration
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isSuperAdmin) {
      showToast('error', 'Security Access Denied', 'Only Super Administrator can modify system settings.');
      return;
    }

    if (isLocked) {
      showToast('error', 'Settings Auto-Locked', 'System settings are currently locked. Click "Unlock & Edit Settings" to make modifications.');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const operator = currentUser?.fullName || 'Super Administrator';

    const updatedProfile: CompanyProfile = {
      ...liveCompany,
      isLocked: true,
      lockedAt: now,
      lockedBy: operator
    };

    const res = await CompanySettingsService.saveCompanyConfiguration(updatedProfile, companyProfile);
    updateCompanyProfile(updatedProfile);

    setIsLocked(true);
    setLockedAt(now);
    setLockedBy(operator);
    setIsSaving(false);

    if (res.success) {
      triggerCelebrationFireworks();
      showToast('success', 'Central PostgreSQL Synchronized & Saved! ⚡🔒', 'Executive branding, logo & organization settings are live across all devices and Central Database.');
    } else {
      showToast('error', 'Save Warning', res.error || 'Saved locally but remote sync encountered an error.');
    }
  };

  // Manual Force-Refresh from Central PostgreSQL
  const handleSyncWithCentral = async () => {
    setIsSyncingCentral(true);
    try {
      const cloudData = await ApiSyncService.fetchCompanyProfile();
      if (cloudData && cloudData.name) {
        StorageService.updateCacheAndNotify('labmedix_company_profile_v1', cloudData);
        refreshCompanyProfile();
        showToast('success', 'Central PostgreSQL Data Fetched! ⚡', `Synchronized profile (${cloudData.name}) from Central Database.`);
      } else {
        showToast('info', 'Central Database Up-To-Date', 'Local device is already in complete sync with Central PostgreSQL.');
      }
    } catch (err: any) {
      showToast('error', 'Sync Check Failed', err?.message || 'Could not contact Central PostgreSQL.');
    } finally {
      setIsSyncingCentral(false);
    }
  };

  // Export Profile JSON
  const handleExportProfile = () => {
    const blob = new Blob([JSON.stringify(liveCompany, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LABMEDIX_Company_Settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Profile Exported', 'Configuration JSON downloaded.');
  };

  // Sample card data for 3D stage
  const previewPatient: Patient = {
    id: 'LMDX-PAT-0001',
    fullName: 'Cardholder Name Preview',
    dob: '1995-01-01',
    age: 30,
    gender: 'male',
    mobile: '+91 98000 00000',
    bloodGroup: 'O+',
    photoUrl: '',
    emergencyContact: {
      name: 'Emergency Contact Preview',
      relationship: 'Family',
      mobile: '+91 98000 00001'
    },
    medicalInfo: {
      allergies: 'None',
      chronicConditions: 'None',
      bloodGroup: 'O+'
    },
    walletId: 'WAL-001',
    isDeleted: false,
    address: {
      villageArea: address,
      postOffice,
      policeStation,
      district,
      state: stateVal,
      pinCode,
      fullAddress: `${address}, ${district}, ${stateVal} - ${pinCode}`
    },
    isFamilyHead: true,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const previewMembership: Membership = {
    id: 'mem_gold',
    name: 'Gold Privilege Plan',
    slug: 'gold-plan',
    color: '#D97706',
    badgeIcon: 'ShieldCheck',
    isFamilyPlan: true,
    registrationFee: 999,
    annualRenewalFee: 499,
    validityMonths: cardValidityMonths,
    opdDiscount: 20,
    labDiscount: 25,
    pharmacyDiscount: 15,
    homeCollectionDiscount: 100,
    specialBenefits: ['Free Ambulance 24x7', 'Priority Consultation Desk'],
    maxFamilyMembers: 5,
    isPopular: true,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  const previewCard: HealthCard = {
    id: 'card_preview_01',
    cardNumber: 'LHC-2026-000001',
    patientId: previewPatient.id,
    membershipId: 'mem_gold',
    tier: 'gold',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + cardValidityMonths * 30 * 86400000).toISOString().slice(0, 10),
    status: 'active',
    cvv: '821',
    verificationCode: 'VRF-9A4F',
    renewedCount: 0,
    designConfig: {
      preset: selectedPreset,
      material: selectedMaterial,
      primaryColor: '#0B4F9C',
      accentColor: '#109B48',
      backgroundColor: '#062B57',
      textColor: '#FFFFFF',
      showChip: true,
      showContactless: true,
      showEmergencyBadge: true,
      showBarcode: true,
      showSignatureStrip: true,
      customTagline: tagline
    },
    statusHistory: [],
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building className="w-7 h-7 text-blue-600" />
            Company Settings & Central Brand System
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Single source of truth for all organization identity, uploaded logo, document headers, numbering, and security policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xs">
            <span className={`w-2 h-2 rounded-full ${
              validationReport.status === 'complete' ? 'bg-emerald-400 animate-pulse' : validationReport.status === 'warning' ? 'bg-amber-400' : 'bg-rose-500'
            }`} />
            <span className={
              validationReport.status === 'complete' ? 'text-emerald-400' : validationReport.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
            }>
              Brand Status: {validationReport.status.toUpperCase()} ({validationReport.score}%)
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncingCentral ? 'animate-spin' : ''}`} />}
            onClick={handleSyncWithCentral}
            isLoading={isSyncingCentral}
            className="border-slate-700 hover:border-blue-500 text-xs"
            title="Fetch directly from central PostgreSQL"
          >
            Fetch Central
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportProfile}
            className="border-slate-700 text-xs"
          >
            Export JSON
          </Button>

          {isLocked ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Unlock className="w-4 h-4" />}
              onClick={handleToggleLock}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md text-xs"
            >
              Unlock Settings
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={() => handleSave()}
              isLoading={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-xs"
            >
              Save All & Lock
            </Button>
          )}
        </div>
      </div>

      {/* Lock Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        isLocked
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 shadow-lg'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isLocked ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-xs font-black uppercase tracking-wider">
                {isLocked ? '🔒 Protected Master Configuration (Read-Only)' : '🔓 Super Admin Edit Mode Active'}
              </strong>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isLocked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isLocked ? 'PostgreSQL Protected' : 'Ready to Modify'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isLocked
                ? `Protected by Super Administrator (${lockedBy}). Only authorized Super Admin can unlock to modify hospital identity and document branding.`
                : `Editing live central settings. Changes persist directly into PostgreSQL and propagate to all terminals.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Unlock className="w-3.5 h-3.5 text-amber-400" />}
              onClick={handleToggleLock}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-950/50 text-xs font-bold"
            >
              Unlock Configuration
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Lock className="w-3.5 h-3.5 text-slate-400" />}
              onClick={handleToggleLock}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
            >
              Cancel & Lock
            </Button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('identity')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'identity' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4 text-blue-400" />
          <span>1. Company Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'logo' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-teal-400" />
          <span>2. Logo Management</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'branding' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>3. Document Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billing_standards')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'billing_standards' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-400" />
          <span>4. A4 Half-Page Billing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system_config')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'system_config' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>5. System Configuration</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tier_config')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'tier_config' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>6. Membership Tiers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nfc_upi')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'nfc_upi' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-cyan-400" />
          <span>7. Contactless & UPI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('validation')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'validation' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>8. Brand Health Check</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'preview' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-indigo-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4 text-indigo-300" />
          <span>9. Document Brand Preview</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* FULL-WIDTH TAB: DOCUMENT BRAND PREVIEW */}
      {activeTab === 'preview' && (
        <DocumentBrandPreview company={liveCompany} />
      )}

      {/* FULL-WIDTH TAB: MEMBERSHIP TIERS */}
      {activeTab === 'tier_config' && (
        <TierConfigManager />
      )}

      {/* SPLIT-GRID FOR OTHER TABS (Settings Form on Left 7, 3D Card on Right 5) */}
      {activeTab !== 'preview' && activeTab !== 'tier_config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSave} className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
              {/* TAB 1: COMPANY PROFILE & IDENTITY */}
              {activeTab === 'identity' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Building className="w-4 h-4 text-blue-400" />
                      1. Master Company Identity & Legal Details
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Authoritative legal identity used across all receipts, letterheads, and portals.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Brand / Display Name *" value={name} onChange={e => setName(e.target.value)} disabled={isLocked} required />
                    <Input label="Legal Registered Entity Name *" value={legalName} onChange={e => setLegalName(e.target.value)} disabled={isLocked} required />
                    <Input label="Official Slogan / Tagline" value={tagline} onChange={e => setTagline(e.target.value)} disabled={isLocked} />
                    <Input label="Established Year" value={estdYear} onChange={e => setEstdYear(e.target.value)} disabled={isLocked} />
                    <div className="sm:col-span-2">
                      <Input label="Clinical Subtitle / Header Line" value={subtitle} onChange={e => setSubtitle(e.target.value)} disabled={isLocked} />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> Physical Headquarters Address
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLocked}
                        leftIcon={<Compass className="w-3.5 h-3.5 text-teal-400" />}
                        onClick={() => setIsAddressModalOpen(true)}
                        className="border-teal-500/40 text-teal-300 text-xs"
                      >
                        Search via Address Popup
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-3">
                        <Input label="Campus Street Address *" value={address} onChange={e => setAddress(e.target.value)} disabled={isLocked} required />
                      </div>
                      <Input label="Post Office" value={postOffice} onChange={e => setPostOffice(e.target.value)} disabled={isLocked} />
                      <Input label="Police Station" value={policeStation} onChange={e => setPoliceStation(e.target.value)} disabled={isLocked} />
                      <Input label="PIN Code *" value={pinCode} onChange={e => setPinCode(e.target.value)} disabled={isLocked} required />
                      <Input label="District *" value={district} onChange={e => setDistrict(e.target.value)} disabled={isLocked} required />
                      <Input label="State *" value={stateVal} onChange={e => setStateVal(e.target.value)} disabled={isLocked} required />
                    </div>
                  </div>

                  {/* Helplines & Contacts */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> Contacts & Helplines
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Primary Telephone / Desk *" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLocked} required />
                      <Input label="24x7 Emergency Helpline *" value={helpline} onChange={e => setHelpline(e.target.value)} disabled={isLocked} required />
                      <Input label="Ambulance Dispatch Helpline" value={ambulanceHelpline} onChange={e => setAmbulanceHelpline(e.target.value)} disabled={isLocked} />
                      <Input label="Blood Bank Hotline" value={bloodBankHelpline} onChange={e => setBloodBankHelpline(e.target.value)} disabled={isLocked} />
                      <Input label="Official WhatsApp Number" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} disabled={isLocked} />
                      <Input label="Support Email *" value={email} onChange={e => setEmail(e.target.value)} disabled={isLocked} required />
                      <div className="sm:col-span-2">
                        <Input label="Official Website URL" value={website} onChange={e => setWebsite(e.target.value)} disabled={isLocked} />
                      </div>
                    </div>
                  </div>

                  {/* Legal & Registrations */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> Legal Registrations & Tax Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Clinical Establishment Reg No *" value={registrationNo} onChange={e => setRegistrationNo(e.target.value)} disabled={isLocked} required />
                      <Input label="Clinical License / CEA No" value={clinicalLicenseNo} onChange={e => setClinicalLicenseNo(e.target.value)} disabled={isLocked} />
                      <Input label="GSTIN (15-Digit)" value={gstin} onChange={e => setGstin(e.target.value)} disabled={isLocked} />
                      <Input label="ISO Certification & Accreditations" value={isoCertification} onChange={e => setIsoCertification(e.target.value)} disabled={isLocked} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DEDICATED LOGO MANAGEMENT */}
              {activeTab === 'logo' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <ImageIcon className="w-4 h-4 text-teal-400" />
                      2. Authoritative Company Logo Management
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload Logo → Preview (Dark & Light) → Save → Activate across all hospital documents.
                    </p>
                  </div>

                  {/* Logo Upload Box */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-white block">Upload New High-Resolution Logo</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Supports PNG, JPG, SVG, and WEBP. Transparent background recommended for cards and slips.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className={`py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition ${
                          isLocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                        }`}>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isProcessingLogo ? 'Processing...' : 'Upload Image File'}</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isLocked} className="hidden" />
                        </label>

                        <button
                          type="button"
                          onClick={handleResetLogo}
                          disabled={isLocked}
                          className="py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                          title="Reset to official LABMEDIX emblem"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dual Transparency Preview Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dark Slate Background Preview */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preview on Dark Header</span>
                      <div className="w-28 h-28 rounded-2xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-center overflow-hidden shadow-inner">
                        <img src={logoUrl} alt="Logo Dark Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Used in Dashboard & Mobile Header</span>
                    </div>

                    {/* Pure White Background Preview (Invoices/Letterheads) */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preview on White Paper</span>
                      <div className="w-28 h-28 rounded-2xl bg-white border border-slate-300 p-3 flex items-center justify-center overflow-hidden shadow-md">
                        <img src={logoUrl} alt="Logo White Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Used in Bills, Prescriptions & Reports</span>
                    </div>
                  </div>

                  {/* Logo Metadata Table */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-white block mb-2">Authoritative Logo Metadata</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">File Type</span>
                        <span className="font-mono text-slate-200">{logoMetadata?.fileType || 'Image File'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Status</span>
                        <span className="text-emerald-400 font-bold">Active & Primary</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Updated By</span>
                        <span className="text-slate-200">{logoMetadata?.uploadedBy || lockedBy}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Last Saved</span>
                        <span className="text-slate-200">{logoMetadata?.uploadedAt ? new Date(logoMetadata.uploadedAt).toLocaleDateString() : 'Active'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300">
                    ℹ️ <strong>Unified Logo Guarantee:</strong> This single logo automatically renders in the dashboard header, Health Card front/back, A4 Half-Page bill, pharmacy slip, diagnostic report, and doctor prescription without separate uploads.
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENT BRANDING */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      3. Document Branding & Header Configuration
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure custom titles, disclaimers, and signature labels across all 4 document families.
                    </p>
                  </div>

                  {/* 1. Hospital Bill Branding */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">🧾 Hospital Bill & Tax Invoice Slip</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Bill Header Title"
                        value={docBranding.bill.headerTitle || ''}
                        onChange={e => setDocBranding({ ...docBranding, bill: { ...docBranding.bill, headerTitle: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Bill Footer Disclaimer"
                        value={docBranding.bill.footerNotice || ''}
                        onChange={e => setDocBranding({ ...docBranding, bill: { ...docBranding.bill, footerNotice: e.target.value } })}
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  {/* 2. Diagnostic Report Branding */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-black text-teal-400 uppercase tracking-wider block">🔬 Diagnostic Laboratory Report</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Chief Medical Director / Pathologist"
                        value={docBranding.diagnosticReport.labDirectorName || ''}
                        onChange={e => setDocBranding({ ...docBranding, diagnosticReport: { ...docBranding.diagnosticReport, labDirectorName: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Director Qualification"
                        value={docBranding.diagnosticReport.labDirectorDegree || ''}
                        onChange={e => setDocBranding({ ...docBranding, diagnosticReport: { ...docBranding.diagnosticReport, labDirectorDegree: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Verifying Pathologist Name"
                        value={docBranding.diagnosticReport.pathologistName || ''}
                        onChange={e => setDocBranding({ ...docBranding, diagnosticReport: { ...docBranding.diagnosticReport, pathologistName: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Senior Technician Name"
                        value={docBranding.diagnosticReport.technicianName || ''}
                        onChange={e => setDocBranding({ ...docBranding, diagnosticReport: { ...docBranding.diagnosticReport, technicianName: e.target.value } })}
                        disabled={isLocked}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Lab Report Footer Disclaimer"
                          value={docBranding.diagnosticReport.footerDisclaimer || ''}
                          onChange={e => setDocBranding({ ...docBranding, diagnosticReport: { ...docBranding.diagnosticReport, footerDisclaimer: e.target.value } })}
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Health Card Branding */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider block">💳 Health Card Branding</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Card Title"
                        value={docBranding.healthCard.cardTitle || ''}
                        onChange={e => setDocBranding({ ...docBranding, healthCard: { ...docBranding.healthCard, cardTitle: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Security Watermark Text"
                        value={docBranding.healthCard.watermarkText || cardSecurityWatermark}
                        onChange={e => {
                          setCardSecurityWatermark(e.target.value);
                          setDocBranding({ ...docBranding, healthCard: { ...docBranding.healthCard, watermarkText: e.target.value } });
                        }}
                        disabled={isLocked}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Card Back Footer Notice"
                          value={cardFooterNotice}
                          onChange={e => setCardFooterNotice(e.target.value)}
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Prescription Branding */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-black text-purple-400 uppercase tracking-wider block">🩺 Doctor OPD Prescription</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Prescription Header Title"
                        value={docBranding.prescription.headerTitle || ''}
                        onChange={e => setDocBranding({ ...docBranding, prescription: { ...docBranding.prescription, headerTitle: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Rx Footer Follow-up Advice"
                        value={docBranding.prescription.rxFooterNotice || ''}
                        onChange={e => setDocBranding({ ...docBranding, prescription: { ...docBranding.prescription, rxFooterNotice: e.target.value } })}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: A4 HALF-PAGE BILL SETTINGS */}
              {activeTab === 'billing_standards' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      4. A4 Half-Page Billing Standard Configuration
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Institutional standard: Exactly 210mm × 145mm portrait format for preview, PDF, print, and reprint.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-white block">Paper & Slip Parameters</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Paper Dimension</span>
                        <strong className="text-white font-mono">A4 (210 × 297 mm)</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Bill Slip Height</span>
                        <strong className="text-emerald-400 font-mono">145 mm (Half-Page)</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Max Items / Slip</span>
                        <strong className="text-white font-mono">6 Items (Overflow Protected)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Cut Line Marker Indicator</span>
                        <span className="text-[11px] text-slate-400">Shows dashed scissor divider line at 145mm</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={sysConfig.printing.cutLineMarker}
                        onChange={e => setSysConfig({
                          ...sysConfig,
                          printing: { ...sysConfig.printing, cutLineMarker: e.target.checked }
                        })}
                        disabled={isLocked}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Auto-Print on Bill Creation</span>
                        <span className="text-[11px] text-slate-400">Triggers standard printer dialog automatically</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={sysConfig.printing.autoPrintOnSave}
                        onChange={e => setSysConfig({
                          ...sysConfig,
                          printing: { ...sysConfig.printing, autoPrintOnSave: e.target.checked }
                        })}
                        disabled={isLocked}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-white block">Margins Calibration (mm)</span>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Top</label>
                        <input
                          type="number"
                          value={sysConfig.printing.margins.top}
                          onChange={e => setSysConfig({
                            ...sysConfig,
                            printing: { ...sysConfig.printing, margins: { ...sysConfig.printing.margins, top: Number(e.target.value) } }
                          })}
                          disabled={isLocked}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Bottom</label>
                        <input
                          type="number"
                          value={sysConfig.printing.margins.bottom}
                          onChange={e => setSysConfig({
                            ...sysConfig,
                            printing: { ...sysConfig.printing, margins: { ...sysConfig.printing.margins, bottom: Number(e.target.value) } }
                          })}
                          disabled={isLocked}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Left</label>
                        <input
                          type="number"
                          value={sysConfig.printing.margins.left}
                          onChange={e => setSysConfig({
                            ...sysConfig,
                            printing: { ...sysConfig.printing, margins: { ...sysConfig.printing.margins, left: Number(e.target.value) } }
                          })}
                          disabled={isLocked}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Right</label>
                        <input
                          type="number"
                          value={sysConfig.printing.margins.right}
                          onChange={e => setSysConfig({
                            ...sysConfig,
                            printing: { ...sysConfig.printing, margins: { ...sysConfig.printing.margins, right: Number(e.target.value) } }
                          })}
                          disabled={isLocked}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM CONFIGURATION */}
              {activeTab === 'system_config' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      5. System-Level Numbering & Security Configuration
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Authoritative sequence prefixes, date formats, and session security rules.
                    </p>
                  </div>

                  {/* Numbering Prefixes */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-white block">Sequential Numbering Prefixes</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Input
                        label="Patient ID Prefix"
                        value={sysConfig.numbering.patientPrefix}
                        onChange={e => setSysConfig({ ...sysConfig, numbering: { ...sysConfig.numbering, patientPrefix: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Health Card Prefix"
                        value={sysConfig.numbering.healthCardPrefix}
                        onChange={e => setSysConfig({ ...sysConfig, numbering: { ...sysConfig.numbering, healthCardPrefix: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Card Request Prefix"
                        value={sysConfig.numbering.cardRequestPrefix}
                        onChange={e => setSysConfig({ ...sysConfig, numbering: { ...sysConfig.numbering, cardRequestPrefix: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Hospital Bill Prefix"
                        value={sysConfig.numbering.billPrefix}
                        onChange={e => setSysConfig({ ...sysConfig, numbering: { ...sysConfig.numbering, billPrefix: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Transaction Prefix"
                        value={sysConfig.numbering.transactionPrefix}
                        onChange={e => setSysConfig({ ...sysConfig, numbering: { ...sysConfig.numbering, transactionPrefix: e.target.value } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Lab Report Prefix"
                        value={sysConfig.numbering.labReportPrefix}
                        onChange={e => setSysConfig({ ...sysConfig, numbering: { ...sysConfig.numbering, labReportPrefix: e.target.value } })}
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-white block">Date, Time & Localization</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Time Zone"
                        value={sysConfig.dateTime.timeZone}
                        onChange={e => setSysConfig({ ...sysConfig, dateTime: { ...sysConfig.dateTime, timeZone: e.target.value } })}
                        disabled={isLocked}
                      />
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Date Format</label>
                        <select
                          value={sysConfig.dateTime.dateFormat}
                          onChange={e => setSysConfig({ ...sysConfig, dateTime: { ...sysConfig.dateTime, dateFormat: e.target.value as any } })}
                          disabled={isLocked}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                          <option value="DD MMM YYYY">DD MMM YYYY (e.g. 15 Jan 2026)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Time Format</label>
                        <select
                          value={sysConfig.dateTime.timeFormat}
                          onChange={e => setSysConfig({ ...sysConfig, dateTime: { ...sysConfig.dateTime, timeFormat: e.target.value as any } })}
                          disabled={isLocked}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                        >
                          <option value="12h">12-Hour (AM / PM)</option>
                          <option value="24h">24-Hour (Military Standard)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Security & Login Policies */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-white block">Session & Security Policies</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Session Timeout (Minutes)"
                        type="number"
                        value={sysConfig.security.sessionTimeoutMinutes}
                        onChange={e => setSysConfig({ ...sysConfig, security: { ...sysConfig.security, sessionTimeoutMinutes: Number(e.target.value) } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Max Failed Login Attempts"
                        type="number"
                        value={sysConfig.security.maxFailedAttempts}
                        onChange={e => setSysConfig({ ...sysConfig, security: { ...sysConfig.security, maxFailedAttempts: Number(e.target.value) } })}
                        disabled={isLocked}
                      />
                      <Input
                        label="Lockout Duration (Minutes)"
                        type="number"
                        value={sysConfig.security.lockoutDurationMinutes}
                        onChange={e => setSysConfig({ ...sysConfig, security: { ...sysConfig.security, lockoutDurationMinutes: Number(e.target.value) } })}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: CONTACTLESS SMART CHIP & UPI */}
              {activeTab === 'nfc_upi' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      7. Contactless Smart Card (NFC) & Payment Gateway
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure 13.56 MHz RFID/NFC smart cards and Google Pay / UPI merchant integration.
                    </p>
                  </div>

                  {/* Google Pay & UPI Merchant */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-white block">Google Pay & UPI Merchant QR</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Merchant VPA (UPI ID)" value={upiVpa} onChange={e => setUpiVpa(e.target.value)} disabled={isLocked} />
                      <Input label="Merchant Business Name" value={upiMerchantName} onChange={e => setUpiMerchantName(e.target.value)} disabled={isLocked} />
                      <Input label="Google Pay Merchant ID" value={gpayMerchantId} onChange={e => setGpayMerchantId(e.target.value)} disabled={isLocked} />
                      <Input label="Merchant Category Code (MCC)" value={upiMcc} onChange={e => setUpiMcc(e.target.value)} disabled={isLocked} />
                    </div>
                    <div className="mt-4 flex justify-center">
                      <GooglePayMerchantQR amount={500} referenceNo="LMDX-SAMPLE-001" merchantVpa={upiVpa} merchantName={upiMerchantName} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: BRAND HEALTH CHECK */}
              {activeTab === 'validation' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      8. Company Configuration Status & Brand Health
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Automated audit ensuring official documents never display missing company name, broken logo, or empty headers.
                    </p>
                  </div>

                  {/* Overall Status Banner */}
                  <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                    validationReport.status === 'complete'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : validationReport.status === 'warning'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}>
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold">Overall Configuration Readiness</span>
                      <h4 className="text-xl font-black mt-0.5">
                        STATUS: {validationReport.status.toUpperCase()} ({validationReport.score}% Complete)
                      </h4>
                      <p className="text-xs opacity-80 mt-1">
                        {validationReport.passedChecks} of {validationReport.totalChecks} essential brand criteria verified.
                      </p>
                    </div>
                    <div className="text-4xl font-black font-mono">
                      {validationReport.score}%
                    </div>
                  </div>

                  {/* Checklist Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-white block">Integrity Verification Checklist</span>
                    <div className="divide-y divide-slate-800 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                      {validationReport.items.map(item => (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            {item.isConfigured ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : item.isCritical ? (
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            <div>
                              <span className="font-bold text-white block">{item.label}</span>
                              <span className="text-[11px] text-slate-400">{item.recommendation}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            item.isConfigured ? 'bg-emerald-500/10 text-emerald-400' : item.isCritical ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {item.isConfigured ? 'VERIFIED' : item.isCritical ? 'REQUIRED' : 'RECOMMENDED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right 5 Cols: Live 3D CR80 PVC Card Studio Preview */}
          <div className="lg:col-span-5 space-y-4 sticky top-6">
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Live Card Brand Preview
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">CR80 PVC (85.60 × 53.98 mm)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-blue-500 transition"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Flip to {isFlipped ? 'Front' : 'Back'}</span>
                </button>
              </div>

              {/* 3D Card Stage */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner overflow-hidden">
                <div className="perspective-1000 my-2" style={{ width: '360px', height: '227px' }}>
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative preserve-3d cursor-pointer w-full h-full"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div className={`backface-hidden absolute inset-0 ${isFlipped ? 'pointer-events-none' : ''}`}>
                      <CR80CardFront
                        patient={previewPatient}
                        card={previewCard}
                        membership={previewMembership}
                        company={liveCompany}
                        scale={0.72}
                        showBleedGuides={showBleedGuides}
                      />
                    </div>
                    <div className={`backface-hidden rotate-y-180 absolute inset-0 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                      <CR80CardBack
                        patient={previewPatient}
                        card={previewCard}
                        membership={previewMembership}
                        company={liveCompany}
                        scale={0.72}
                        showBleedGuides={showBleedGuides}
                      />
                    </div>
                  </motion.div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-2">
                  Click card or Flip button to inspect both sides.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800">
                <span className="text-slate-400 font-medium">3mm Safe Bleed Guides</span>
                <button
                  type="button"
                  onClick={() => setShowBleedGuides(!showBleedGuides)}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                    showBleedGuides ? 'bg-rose-950 text-rose-300 border-rose-600' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {showBleedGuides ? 'Active' : 'Show Guides'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Central PostgreSQL Synchronized</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  All branding, official logo, and helpline numbers update instantly across all issued Health Cards, Bills, and Patient Portals.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Popup Modal */}
      <AddressAutoPopupModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        initialQuery={pinCode || district || address}
        onSelectAddress={sel => {
          setAddress(sel.cityArea);
          setPostOffice(sel.postOffice);
          setPoliceStation(sel.policeStation);
          setDistrict(sel.district);
          setStateVal(sel.state);
          setPinCode(sel.pinCode);
          showToast('success', 'Address Applied via Popup 📍', `${sel.cityArea}, ${sel.district}, ${sel.state} (PIN: ${sel.pinCode})`);
        }}
      />

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </div>
  );
};