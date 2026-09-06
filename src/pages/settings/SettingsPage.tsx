import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { ThemeSelectorModal } from '../../components/layout/ThemeSelectorModal';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { StorageService, STORAGE_KEYS } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { BackupService } from '../../services/backupService';
import { Patient, HealthCard, Membership, CompanyProfile, CardThemePreset, CardMaterial } from '../../types';
import { CR80CardFront } from '../../components/card/CR80CardFront';
import { CR80CardBack } from '../../components/card/CR80CardBack';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  Settings,
  Save,
  Building,
  Phone,
  Globe,
  Shield,
  Wifi,
  Heart,
  Sparkles,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  FileText,
  Ambulance,
  HeartHandshake,
  Database,
  Layers,
  Award,
  Zap,
  MapPin,
  Lock,
  Download,
  Share2,
  ExternalLink,
  MessageSquare,
  Eye,
  EyeOff,
  Sliders,
  RotateCw,
  KeyRound,
  Check,
  Copy,
  Activity,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Radio,
  Smartphone,
  Unlock,
  Compass,
  Building2,
  ShieldAlert,
  Users,
  Stethoscope,
  UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { NFCSettings, UpiMerchantSettings } from '../../types';
import { GooglePayMerchantQR } from '../../components/payment/GooglePayMerchantQR';
import { AddressAutoPopupModal } from '../../components/common/AddressAutoPopupModal';
import { TierConfigManager } from '../../components/settings/TierConfigManager';
import { Crown } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { companyProfile, updateCompanyProfile, refreshCompanyProfile, isCentralSynced } = useSettings();
  const { theme, isDark, currentTimeString, isDaytime } = useTheme();
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


  const [activeTab, setActiveTab] = useState<'branding' | 'helplines' | 'legal' | 'card_defaults' | 'presets' | 'nfc_config' | 'gpay_merchant' | 'registration_policy' | 'system' | 'tier_config'>('branding');

  // 1. Branding & Identity
  const [name, setName] = useState(companyProfile.name);
  const [tagline, setTagline] = useState(companyProfile.tagline);
  const [estdYear, setEstdYear] = useState(companyProfile.estdYear);
  const [subtitle, setSubtitle] = useState(companyProfile.subtitle);
  const [logoUrl, setLogoUrl] = useState(companyProfile.logoUrl || '/logo.jpg');
  const [address, setAddress] = useState(companyProfile.address);
  const [postOffice, setPostOffice] = useState(companyProfile.postOffice || 'Civil Lines P.O.');
  const [policeStation, setPoliceStation] = useState(companyProfile.policeStation || 'Central Station');
  const [district, setDistrict] = useState(companyProfile.district);
  const [stateVal, setStateVal] = useState(companyProfile.state);
  const [pinCode, setPinCode] = useState(companyProfile.pinCode);

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
  // 7. Google Pay & UPI Merchant Configuration State
  const defaultUpi: UpiMerchantSettings = companyProfile.upiSettings || {
    enabled: true,
    merchantVpa: 'labmedix.health@icici',
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

  // 8. Registration & Family Shield Policies
  const defaultRegSettings = companyProfile.registrationSettings || {
    enableClinicalTriageDefault: false,
    maxIncludedFamilyMembers: 5,
    additionalMemberFee: 299,
    cardIssuanceDefault: false,
  };

  const [regTriageDefault, setRegTriageDefault] = useState<boolean>(defaultRegSettings.enableClinicalTriageDefault ?? false);
  const [regMaxFamily, setRegMaxFamily] = useState<number>(defaultRegSettings.maxIncludedFamilyMembers ?? 5);
  const [regExtraMemberFee, setRegExtraMemberFee] = useState<number>(defaultRegSettings.additionalMemberFee ?? 299);
  const [regCardIssuanceDefault, setRegCardIssuanceDefault] = useState<boolean>(defaultRegSettings.cardIssuanceDefault ?? false);

  // 2. Helplines & Contacts
  const [phone, setPhone] = useState(companyProfile.phone);
  const [helpline, setHelpline] = useState(companyProfile.helpline);
  const [ambulanceHelpline, setAmbulanceHelpline] = useState(companyProfile.ambulanceHelpline || '1800 123 4567');
  const [bloodBankHelpline, setBloodBankHelpline] = useState(companyProfile.bloodBankHelpline || '+91 98765 43211');
  const [whatsapp, setWhatsapp] = useState(companyProfile.whatsapp);
  const [email, setEmail] = useState(companyProfile.email);
  const [website, setWebsite] = useState(companyProfile.website);

  // 3. Legal & Accreditations
  const [registrationNo, setRegistrationNo] = useState(companyProfile.registrationNo);
  const [isoCertification, setIsoCertification] = useState(companyProfile.isoCertification || 'ISO 9001:2015 MED-QC-8841');
  const [clinicalLicenseNo, setClinicalLicenseNo] = useState(companyProfile.clinicalLicenseNo || 'CEA/WB/KOL/2025/1102');
  const [gstin, setGstin] = useState(companyProfile.gstin || '19AAACL1234F1Z5');

  // 4. Card & Printing Defaults
  const [selectedPreset, setSelectedPreset] = useState<CardThemePreset>('executive_navy');
  const [selectedMaterial, setSelectedMaterial] = useState<CardMaterial>('gloss');
  const [cardValidityMonths, setCardValidityMonths] = useState<number>(companyProfile.cardValidityMonths || 12);
  const [cardFooterNotice, setCardFooterNotice] = useState(companyProfile.cardFooterNotice || 'Present this card or digital QR at LABMEDIX front desk to redeem medical discounts.');
  const [cardSecurityWatermark, setCardSecurityWatermark] = useState(companyProfile.cardSecurityWatermark || 'LABMEDIX SECURE HEALTHCARE');
  const [currencySymbol, setCurrencySymbol] = useState(companyProfile.currencySymbol || '₹');
  const [showBleedGuides, setShowBleedGuides] = useState(false);

  // Live 3D Preview State
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Reactive Sync with Central Firestore updates across devices
  useEffect(() => {
    if (companyProfile && !isSaving) {
      setName(companyProfile.name || '');
      setTagline(companyProfile.tagline || '');
      setEstdYear(companyProfile.estdYear || '2025');
      setSubtitle(companyProfile.subtitle || '');
      setLogoUrl(companyProfile.logoUrl || '/logo.jpg');
      setAddress(companyProfile.address || '');
      setPostOffice(companyProfile.postOffice || 'Civil Lines P.O.');
      setPoliceStation(companyProfile.policeStation || 'Central Station');
      setDistrict(companyProfile.district || '');
      setStateVal(companyProfile.state || '');
      setPinCode(companyProfile.pinCode || '');
      setPhone(companyProfile.phone || '');
      setHelpline(companyProfile.helpline || '');
      setAmbulanceHelpline(companyProfile.ambulanceHelpline || '1800 123 4567');
      setBloodBankHelpline(companyProfile.bloodBankHelpline || '+91 98765 43211');
      setWhatsapp(companyProfile.whatsapp || '');
      setEmail(companyProfile.email || '');
      setWebsite(companyProfile.website || '');
      setRegistrationNo(companyProfile.registrationNo || '');
      setIsoCertification(companyProfile.isoCertification || 'ISO 9001:2015 MED-QC-8841');
      setClinicalLicenseNo(companyProfile.clinicalLicenseNo || 'CEA/WB/KOL/2025/1102');
      setGstin(companyProfile.gstin || '19AAACL1234F1Z5');
      setCardValidityMonths(companyProfile.cardValidityMonths || 12);
      setCardFooterNotice(companyProfile.cardFooterNotice || 'Present this card or digital QR at LABMEDIX front desk to redeem medical discounts.');
      setCardSecurityWatermark(companyProfile.cardSecurityWatermark || 'LABMEDIX SECURE HEALTHCARE');
      setCurrencySymbol(companyProfile.currencySymbol || '₹');
      setIsLocked(companyProfile.isLocked ?? true);
      setLockedBy(companyProfile.lockedBy || 'Super Administrator');
      setLockedAt(companyProfile.lockedAt || '');

      if (companyProfile.nfcSettings) {
        setNfcEnabled(companyProfile.nfcSettings.enabled ?? true);
        setNfcStandard(companyProfile.nfcSettings.defaultStandard || 'ISO/IEC 14443 Type A');
        setNfcFrequency(companyProfile.nfcSettings.frequency || '13.56 MHz');
        setNfcPayloadType(companyProfile.nfcSettings.payloadType || 'verification_url');
        setNfcAutoWrite(companyProfile.nfcSettings.autoWriteOnIssue ?? true);
        setNfcKey(companyProfile.nfcSettings.securityKey || 'A0B1C2D3E4F5');
        setNfcWebApi(companyProfile.nfcSettings.enableWebNfcApi ?? true);
      }

      if (companyProfile.upiSettings) {
        setUpiEnabled(companyProfile.upiSettings.enabled ?? true);
        setUpiVpa(companyProfile.upiSettings.merchantVpa || 'labmedix.health@icici');
        setUpiMerchantName(companyProfile.upiSettings.merchantName || companyProfile.name || 'LABMEDIX MULTI-SPECIALITY CENTRE');
        setUpiMcc(companyProfile.upiSettings.merchantMcc || '8099');
        setGpayMerchantId(companyProfile.upiSettings.googlePayMerchantId || 'GPAY-LMDX-8829-LIVE');
        setGpayBusinessName(companyProfile.upiSettings.googlePayBusinessName || 'LABMEDIX HEALTHCARE');
        setUpiDeepLinks(companyProfile.upiSettings.enableDeepLinks ?? true);
      }

      if (companyProfile.registrationSettings) {
        setRegTriageDefault(companyProfile.registrationSettings.enableClinicalTriageDefault ?? false);
        setRegMaxFamily(companyProfile.registrationSettings.maxIncludedFamilyMembers ?? 5);
        setRegExtraMemberFee(companyProfile.registrationSettings.additionalMemberFee ?? 299);
        setRegCardIssuanceDefault(companyProfile.registrationSettings.cardIssuanceDefault ?? false);
      }
    }
  }, [companyProfile, isSaving]);

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
        showToast('success', 'Logo Uploaded', 'Updated custom organization emblem preview.');
      }
    };
    reader.readAsDataURL(file);
  };

  // 1-Click Preset Template Loaders
  const loadPresetTemplate = (type: 'labmedix_official' | 'metro_diagnostic' | 'royal_vip') => {
    if (type === 'labmedix_official') {
      setName('LABMEDIX');
      setTagline('Confident In Care');
      setEstdYear('2025');
      setSubtitle('Multi-speciality Outdoor & Diagnostic Centre');
      setLogoUrl('/logo.jpg');
      setAddress('Main Health Expressway, Medical Square');
      setPostOffice('Civil Lines P.O.');
      setPoliceStation('Central Station');
      setDistrict('Kolkata');
      setStateVal('West Bengal');
      setPinCode('700001');
      setHelpline('+91 98765 43210');
      setAmbulanceHelpline('1800 123 4567');
      setBloodBankHelpline('+91 98765 43211');
      setWhatsapp('+91 98765 43210');
      setEmail('care@labmedix.org');
      setWebsite('https://labmedix.org');
      setRegistrationNo('WB-MED-REG-2025/08942');
      setIsoCertification('ISO 9001:2015 MED-QC-8841');
      setClinicalLicenseNo('CEA/WB/KOL/2025/1102');
      setGstin('19AAACL1234F1Z5');
      setSelectedPreset('executive_navy');
      setSelectedMaterial('gloss');
      showToast('success', 'LABMEDIX Official Defaults Loaded', 'Loaded verified organization profile.');
    } else if (type === 'metro_diagnostic') {
      setName('LABMEDIX METRO ADVANCED DIAGNOSTICS');
      setTagline('Precision Diagnostics & Total Care');
      setEstdYear('2025');
      setSubtitle('Super-speciality Pathology, Radiology & Imaging Institute');
      setSelectedPreset('emerald_health');
      setSelectedMaterial('metallic');
      showToast('info', 'Metro Diagnostic Template Loaded', 'Applied diagnostic center theme.');
    } else if (type === 'royal_vip') {
      setName('LABMEDIX ROYAL HEALTH CLUB');
      setTagline('Excellence In Family Healthcare');
      setEstdYear('2025');
      setSubtitle('Exclusive Concierge Medical Care & Privilege Hospital Network');
      setSelectedPreset('royal_gold');
      setSelectedMaterial('hologram');
      showToast('info', 'Royal VIP Template Loaded', 'Applied Gold VIP luxury theme.');
    }
  };

  // Export Profile JSON
  const handleExportProfile = () => {
    const data = {
      name,
      tagline,
      estdYear,
      subtitle,
      logoUrl,
      address,
      postOffice,
      policeStation,
      district,
      state: stateVal,
      pinCode,
      phone,
      helpline,
      ambulanceHelpline,
      bloodBankHelpline,
      whatsapp,
      email,
      website,
      registrationNo,
      isoCertification,
      clinicalLicenseNo,
      gstin,
      cardValidityMonths,
      cardFooterNotice,
      cardSecurityWatermark,
      currencySymbol,
      selectedPreset,
      selectedMaterial,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LABMEDIX_Profile_Config_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Profile Exported', 'Configuration JSON downloaded.');
  };

  // Import Profile / Backup JSON
  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const json = JSON.parse(jsonContent);

        // Check if it's a backup or contains any data
        const validation = BackupService.validateBackupJson(jsonContent);
        if (validation.valid && validation.backup) {
          const res = await BackupService.restoreBackup(validation.backup, true);
          if (res.success) {
            triggerCelebrationFireworks();
            showToast('success', 'Universal JSON Imported & Live! ⚡', `Successfully imported records (Patients: ${validation.backup.recordCounts?.patients || 0}, Cards: ${validation.backup.recordCounts?.healthCards || 0}, Transactions: ${validation.backup.recordCounts?.walletTransactions || 0}) live across all devices and Central.`);
            setTimeout(() => window.location.reload(), 1200);
            return;
          }
        }

        // Otherwise handle as company profile / settings JSON
        const importedProfile = json.companyProfile || json;

        if (importedProfile.name) setName(importedProfile.name);
        if (importedProfile.tagline) setTagline(importedProfile.tagline);
        if (importedProfile.estdYear) setEstdYear(importedProfile.estdYear);
        if (importedProfile.subtitle) setSubtitle(importedProfile.subtitle);
        if (importedProfile.logoUrl) setLogoUrl(importedProfile.logoUrl);
        if (importedProfile.address) setAddress(importedProfile.address);
        if (importedProfile.helpline) setHelpline(importedProfile.helpline);
        if (importedProfile.registrationNo) setRegistrationNo(importedProfile.registrationNo);
        if (importedProfile.selectedPreset) setSelectedPreset(importedProfile.selectedPreset);
        if (importedProfile.selectedMaterial) setSelectedMaterial(importedProfile.selectedMaterial);

        // Save & Sync live immediately
        updateCompanyProfile(importedProfile);
        ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.COMPANY_PROFILE, StorageService.getCompanyProfile()).catch(() => {});
        window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { action: 'IMPORT_PROFILE', timestamp: Date.now() } }));

        triggerCelebrationFireworks();
        showToast('success', 'Company Profile Imported & Live! ⚡', 'Configuration successfully updated and synchronized across all portals.');
      } catch (err: any) {
        showToast('error', 'Import Failed', `Invalid JSON file format: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Copy Key / URL to Clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast('info', 'Copied to Clipboard', `${label} copied.`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Live NFC Tag Read & Frequency Wave Simulation Tester
  const handleTestNfcTap = () => {
    setIsSimulatingNfcTap(true);
    setNfcTestResult(null);

    setTimeout(() => {
      setIsSimulatingNfcTap(false);
      setNfcTestResult(`NFC-UID: 04:E2:89:1A:B5:4C:80 (13.56 MHz ${nfcStandard}) • Encrypted Payload Verified: LHC-2026-000001 (Valid Cardholder)`);
      triggerCelebrationFireworks();
      showToast('success', 'NFC Smart Card Decoded! 📡', 'Contactless chip read verified with zero latency errors.');
    }, 850);
  };

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const updatedNfcConfig: NFCSettings = {
      enabled: nfcEnabled,
      defaultStandard: nfcStandard,
      frequency: nfcFrequency,
      payloadType: nfcPayloadType,
      autoWriteOnIssue: nfcAutoWrite,
      securityKey: nfcKey.trim(),
      enableWebNfcApi: nfcWebApi
    };

    const updatedUpiConfig: UpiMerchantSettings = {
      enabled: upiEnabled,
      merchantVpa: upiVpa.trim(),
      merchantName: upiMerchantName.trim(),
      merchantMcc: upiMcc.trim(),
      googlePayMerchantId: gpayMerchantId.trim(),
      googlePayBusinessName: gpayBusinessName.trim(),
      enableDeepLinks: upiDeepLinks,
      autoVerifySimulation: true
    };

    const updatedProfile: CompanyProfile = {
      name: name.trim(),
      tagline: tagline.trim(),
      estdYear: estdYear.trim(),
      subtitle: subtitle.trim(),
      logoUrl,
      address: address.trim(),
      postOffice: postOffice.trim(),
      policeStation: policeStation.trim(),
      district: district.trim(),
      state: stateVal.trim(),
      pinCode: pinCode.trim(),
      phone: phone.trim(),
      helpline: helpline.trim(),
      ambulanceHelpline: ambulanceHelpline.trim(),
      bloodBankHelpline: bloodBankHelpline.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      website: website.trim(),
      registrationNo: registrationNo.trim(),
      isoCertification: isoCertification.trim(),
      clinicalLicenseNo: clinicalLicenseNo.trim(),
      gstin: gstin.trim(),
      cardValidityMonths: Number(cardValidityMonths) || 12,
      cardFooterNotice: cardFooterNotice.trim(),
      cardSecurityWatermark: cardSecurityWatermark.trim(),
      currencySymbol,
      isLocked: true, // Auto-lock on save!
      lockedAt: now,
      lockedBy: operator,
      nfcSettings: updatedNfcConfig,
      upiSettings: updatedUpiConfig,
      registrationSettings: {
        enableClinicalTriageDefault: regTriageDefault,
        maxIncludedFamilyMembers: Number(regMaxFamily) || 5,
        additionalMemberFee: Number(regExtraMemberFee) >= 0 ? Number(regExtraMemberFee) : 299,
        cardIssuanceDefault: regCardIssuanceDefault,
      },
      services: companyProfile.services || [],
      termsAndConditions: companyProfile.termsAndConditions || []
    };

    updateCompanyProfile(updatedProfile);
    await ApiSyncService.saveCompanyProfile(updatedProfile);

    setIsLocked(true);
    setLockedAt(now);
    setLockedBy(operator);
    setIsSaving(false);
    triggerCelebrationFireworks();
    showToast('success', 'Central Firestore Synchronized & Saved! ⚡🔒', 'Executive branding, helpline numbers & organization settings are live across all devices and Central Database.');
  };

  // Manual Force-Refresh from Central Firestore
  const handleSyncWithCentral = async () => {
    setIsSyncingCentral(true);
    try {
      const cloudData = await ApiSyncService.fetchCompanyProfile();
      if (cloudData && cloudData.name) {
        StorageService.updateCacheAndNotify('labmedix_company_profile_v1', cloudData);
        refreshCompanyProfile();
        showToast('success', 'Central Firestore Data Fetched! ⚡', `Synchronized profile (${cloudData.name}) from Central Cloud Database.`);
      } else {
        showToast('info', 'Central Cloud Up-To-Date', 'Local device is already in complete sync with Central Firestore.');
      }
    } catch (err: any) {
      showToast('error', 'Sync Check Failed', err?.message || 'Could not contact Central Firestore.');
    } finally {
      setIsSyncingCentral(false);
    }
  };

  // Dynamic Patient & Live Card Setup for true-to-life 300 DPI Preview
  const actualPatients = StorageService.getPatients();
  const previewPatient: Patient = actualPatients.length > 0 ? actualPatients[0] : {
    id: 'LMDX-SAMPLE-001',
    fullName: 'Cardholder Name Preview',
    dob: '1995-01-01',
    age: 30,
    gender: 'male',
    mobile: '+91 98000 00000',
    bloodGroup: 'O+',
    photoUrl: logoUrl || '/logo.jpg',
    address: {
      villageArea: 'Main Healthcare Avenue',
      postOffice: postOffice || 'Central P.O.',
      policeStation: policeStation || 'Central P.S.',
      district: district || 'Central District',
      state: stateVal || 'West Bengal',
      pinCode: pinCode || '700001',
      fullAddress: address || 'Main Healthcare Avenue, Medical Square'
    },
    emergencyContact: {
      name: 'Emergency Contact',
      relationship: 'Family',
      mobile: '+91 98000 00000'
    },
    medicalInfo: {
      bloodGroup: 'O+',
      allergies: 'None'
    },
    walletId: 'w_preview_01',
    isDeleted: false,
    createdBy: 'usr_admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const previewMembership: Membership = {
    id: 'mem_gold',
    name: 'Gold Privilege Plan',
    slug: 'gold-privilege',
    validityMonths: cardValidityMonths,
    registrationFee: 1500,
    annualRenewalFee: 1200,
    opdDiscount: 20,
    labDiscount: 25,
    pharmacyDiscount: 15,
    homeCollectionDiscount: 100,
    specialBenefits: ['Free Ambulance 24x7', 'Priority Consultation Desk'],
    color: '#F59E0B',
    badgeIcon: 'Crown',
    isFamilyPlan: true,
    maxFamilyMembers: 6,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  const previewCard: HealthCard = {
    id: 'card_preview_01',
    cardNumber: 'LHC-2026-000001',
    patientId: 'LMDX-2026-000001',
    membershipId: 'mem_gold',
    issueDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + cardValidityMonths * 30 * 86400000).toISOString(),
    verificationCode: 'VER-9A4F-8821',
    cvv: '821',
    status: 'active',
    designConfig: {
      preset: selectedPreset,
      material: selectedMaterial,
      primaryColor: '#0B4F9C',
      accentColor: '#38BDF8',
      backgroundColor: '#0F172A',
      textColor: '#FFFFFF',
      showChip: true,
      showContactless: true,
      showEmergencyBadge: true,
      showBarcode: true,
      showSignatureStrip: true,
      showFamilyBadge: true
    },
    statusHistory: [],
    renewedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const liveCompany: CompanyProfile = {
    name: name || 'LABMEDIX',
    tagline: tagline || 'Confident In Care',
    estdYear: estdYear || '2025',
    subtitle: subtitle || 'Multi-speciality Outdoor & Diagnostic Centre',
    logoUrl: logoUrl || '/logo.jpg',
    address: address || 'Main Health Expressway, Medical Square',
    postOffice: postOffice || 'Civil Lines P.O.',
    policeStation: policeStation || 'Central Station',
    district: district || 'Central District',
    state: stateVal || 'West Bengal',
    pinCode: pinCode || '700001',
    phone: phone || '+91 33 2456 7890',
    helpline: helpline || '+91 98765 43210',
    ambulanceHelpline: ambulanceHelpline || '1800 123 4567',
    bloodBankHelpline: bloodBankHelpline || '+91 98765 43211',
    whatsapp: whatsapp || '+91 98765 43210',
    email: email || 'care@labmedix.org',
    website: website || 'https://labmedix.org',
    registrationNo: registrationNo || 'WB-MED-REG-2025/08942',
    isoCertification: isoCertification || 'ISO 9001:2015 MED-QC-8841',
    clinicalLicenseNo: clinicalLicenseNo || 'CEA/WB/KOL/2025/1102',
    gstin: gstin || '19AAACL1234F1Z5',
    cardValidityMonths,
    cardFooterNotice,
    cardSecurityWatermark,
    currencySymbol,
    services: companyProfile.services || [],
    termsAndConditions: companyProfile.termsAndConditions || []
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-brand-blue" />
            Organization & System Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure LABMEDIX executive branding, 24x7 emergency helplines, official logo, and CR80 card templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Central Cloud Realtime Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Central Firestore Live</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncingCentral ? 'animate-spin' : ''}`} />}
            onClick={handleSyncWithCentral}
            isLoading={isSyncingCentral}
            className="border-slate-700 hover:border-blue-500 text-xs"
            title="Fetch and verify latest organization details directly from Central Cloud Database"
          >
            Fetch Central
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportProfile}
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
            >
              Unlock Settings
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              isLoading={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
            >
              Save & Auto-Lock Settings
            </Button>
          )}
        </div>
      </div>

      {/* Super Admin Lock Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        isLocked
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 shadow-lg'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isLocked ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-black uppercase tracking-wider">
                {isLocked ? '🔒 System Settings Auto-Locked & Secured' : '🔓 Edit Mode Active (Super Admin)'}
              </strong>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isLocked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isLocked ? 'Read-Only Protected' : 'Ready to Edit'}
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {isLocked
                ? `All branding, helplines, logo, and CR80 card templates are currently protected. Only Super Administrator can unlock and edit these values.`
                : `You are editing active configuration parameters. Click "Save & Auto-Lock Settings" when finished to lock into read-only mode.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Unlock className="w-4 h-4 text-amber-400" />}
              onClick={handleToggleLock}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-950/50 text-xs font-bold"
            >
              Unlock Settings
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              onClick={handleToggleLock}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
            >
              Cancel & Lock
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Settings Tabs (Left 7 Cols) & Live 3D Card Studio Preview (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Tabs & Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Tab Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'branding'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>1. Branding & Logo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('helplines')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'helplines'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>2. Helplines</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('legal')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'legal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>3. Legal & Licenses</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('card_defaults')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'card_defaults'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>4. Card Printing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'presets'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>5. Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('nfc_config')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'nfc_config'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>6. NFC & Smart Chip</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gpay_merchant')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'gpay_merchant'
                  ? 'bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>7. Google Pay & UPI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('registration_policy')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'registration_policy'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-purple-300" />
              <span>8. Registration & Family Shield</span>
            </button>


            <button
              type="button"
              onClick={() => setActiveTab('tier_config')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'tier_config'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Tier Configuration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'system'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4 text-purple-400" />
              <span>9. Engine</span>
            </button>
          </div>

          <form onSubmit={handleSave} className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 ${activeTab === 'tier_config' ? 'hidden' : 'block'}`}>
            {/* TAB 1: Organization Branding & Official Logo */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Building className="w-4 h-4 text-brand-blue" />
                    Official Organization Branding & Logo
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Primary medical identity rendered across all health cards, doctor reports, and patient portals.
                  </p>
                </div>

                {/* Logo Uploader Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-md border flex items-center justify-center overflow-hidden shrink-0">
                    <LabMedixLogo logoUrl={logoUrl} variant="monogram" size="lg" theme="teal" />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                      Official Organization Emblem / Logo
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Upload PNG, JPG, or SVG. Automatically rendered in high resolution across all PVC Health Cards, Staff Badges, and Verification systems.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className={`py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors ${
                        isLocked || !isSuperAdmin ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                      }`}>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload New Logo</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isLocked || !isSuperAdmin} className="hidden" />
                      </label>
                      <button
                        type="button"
                        disabled={isLocked || !isSuperAdmin}
                        onClick={() => {
                          setLogoUrl('');
                          showToast('info', 'Default Monogram Restored', 'Switched to official LabMedix vector healthcare emblem.');
                        }}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 ${
                          isLocked || !isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Use Official Vector Monogram</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Organization Name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLocked || !isSuperAdmin} required />
                  <Input label="Official Slogan / Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={isLocked || !isSuperAdmin} required />
                  <Input label="Established Year" value={estdYear} onChange={(e) => setEstdYear(e.target.value)} disabled={isLocked || !isSuperAdmin} required />
                  <Input label="Clinical Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} disabled={isLocked || !isSuperAdmin} required />
                </div>

                {/* Headquarters & Branch Location */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> Headquarters Address
                    </h4>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLocked || !isSuperAdmin}
                      leftIcon={<Compass className="w-3.5 h-3.5 text-teal-400" />}
                      onClick={() => setIsAddressModalOpen(true)}
                      className="border-teal-500/40 text-teal-300 hover:bg-teal-950/50 text-xs font-bold"
                    >
                      📍 Select / Search Address via Address Popup
                    </Button>
                  </div>

                  {/* LABMEDIX Regional Branch Presets */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      🏥 Quick Select LABMEDIX Regional Hub Address Presets:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'Malda HQ Sultanganj', addr: 'Main Medical Expressway, Sultanganj', po: 'Sultanganj P.O.', ps: 'Sultanganj PS', dist: 'Malda', state: 'West Bengal', pin: '732142' },
                        { name: 'Kolkata Park Street Hub', addr: '12B Park Street, Medical Enclave', po: 'Park Street P.O.', ps: 'Park Street PS', dist: 'Kolkata', state: 'West Bengal', pin: '700016' },
                        { name: 'Salt Lake Sec-V Hub', addr: 'Plot 5, Sector V Tech & Health Zone', po: 'Bidhan Nagar P.O.', ps: 'Electronics Complex PS', dist: 'North 24 Parganas', state: 'West Bengal', pin: '700091' },
                        { name: 'Siliguri Regional Hub', addr: 'Hill Cart Road, Near Court Square', po: 'Siliguri Head P.O.', ps: 'Siliguri PS', dist: 'Darjeeling', state: 'West Bengal', pin: '734001' },
                        { name: 'Durgapur Health City', addr: 'City Centre Medical Complex', po: 'Durgapur P.O.', ps: 'Durgapur PS', dist: 'Paschim Bardhaman', state: 'West Bengal', pin: '713216' }
                      ].map((b, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isLocked || !isSuperAdmin}
                          onClick={() => {
                            setAddress(b.addr);
                            setPostOffice(b.po);
                            setPoliceStation(b.ps);
                            setDistrict(b.dist);
                            setStateVal(b.state);
                            setPinCode(b.pin);
                            showToast('info', 'Branch Preset Loaded 📍', `Set address to ${b.name}`);
                          }}
                          className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                            district === b.dist && pinCode === b.pin
                              ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          } ${isLocked || !isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Building2 className="w-3 h-3 text-teal-400" />
                          <span>{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <Input label="Main Campus Address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={isLocked || !isSuperAdmin} required />
                    </div>
                    <Input label="Post Office (P.O.)" value={postOffice} onChange={(e) => setPostOffice(e.target.value)} disabled={isLocked || !isSuperAdmin} />
                    <Input label="Police Station (P.S.)" value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} disabled={isLocked || !isSuperAdmin} />
                    <Input label="PIN Code" value={pinCode} onChange={(e) => setPinCode(e.target.value)} disabled={isLocked || !isSuperAdmin} />
                    <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} disabled={isLocked || !isSuperAdmin} />
                    <Input label="State" value={stateVal} onChange={(e) => setStateVal(e.target.value)} disabled={isLocked || !isSuperAdmin} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Emergency Helplines & Hotlines with Test Callers */}
            {activeTab === 'helplines' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    24x7 Emergency Helplines & Support Lines
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Emergency response numbers embossed on the back of all PVC health cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        24x7 Emergency Helpline
                      </label>
                      <a href={`tel:${helpline}`} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                        <Phone className="w-3 h-3" /> Call Test
                      </a>
                    </div>
                    <Input value={helpline} onChange={(e) => setHelpline(e.target.value)} required />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        24x7 Ambulance Dispatch Toll-Free
                      </label>
                      <a href={`tel:${ambulanceHelpline}`} className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-0.5">
                        <Ambulance className="w-3 h-3" /> Ambulance Test
                      </a>
                    </div>
                    <Input value={ambulanceHelpline} onChange={(e) => setAmbulanceHelpline(e.target.value)} required />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        24x7 Emergency Blood Bank
                      </label>
                      <a href={`tel:${bloodBankHelpline}`} className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-0.5">
                        <Heart className="w-3 h-3" /> Blood Hotline
                      </a>
                    </div>
                    <Input value={bloodBankHelpline} onChange={(e) => setBloodBankHelpline(e.target.value)} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        WhatsApp Medical Care Line
                      </label>
                      <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3" /> WhatsApp Test
                      </a>
                    </div>
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
                  </div>

                  <Input label="General Front Desk Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Input label="Official Helpdesk Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

                  <div className="sm:col-span-2">
                    <Input
                      label="Official Portal Website URL"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Legal & Regulatory Accreditations */}
            {activeTab === 'legal' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Legal, Clinical & Quality Accreditations
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Official state clinical establishment licenses printed on card footers and diagnostic invoices.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Clinical Establishment Registration No"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    required
                  />
                  <Input
                    label="ISO 9001:2015 Quality Certification No"
                    value={isoCertification}
                    onChange={(e) => setIsoCertification(e.target.value)}
                  />
                  <Input
                    label="Clinical Establishment Act License"
                    value={clinicalLicenseNo}
                    onChange={(e) => setClinicalLicenseNo(e.target.value)}
                  />
                  <Input
                    label="GSTIN / Corporate Tax Identification"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Health Card & Printing Defaults */}
            {activeTab === 'card_defaults' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <CreditCard className="w-4 h-4 text-cyan-500" />
                    CR80 PVC Card Production & Theme Controls
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Default parameters applied during automatic card issuance and batch printing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Master Theme Preset
                    </label>
                    <select
                      value={selectedPreset}
                      onChange={(e) => setSelectedPreset(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="executive_navy">Executive Navy (Official LABMEDIX)</option>
                      <option value="emerald_health">Emerald Health (Diagnostic Green)</option>
                      <option value="royal_gold">Royal Gold VIP (Amber Bronze)</option>
                      <option value="platinum_elite">Platinum Obsidian (Frosted Onyx)</option>
                      <option value="clean_minimal">Clean Clinical White (High-Contrast)</option>
                      <option value="crimson_care">Crimson Critical Care (Ruby Red)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Physical Material Finish
                    </label>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="gloss">UV Clear Gloss Finish ✨</option>
                      <option value="matte">Matte Frosted Satin 🌫️</option>
                      <option value="metallic">Metallic Pearl Flake 🪙</option>
                      <option value="hologram">Security Holographic Foil 🌈</option>
                    </select>
                  </div>

                  <Select
                    label="Default Card Validity Duration"
                    value={String(cardValidityMonths)}
                    onChange={(e) => setCardValidityMonths(Number(e.target.value))}
                    options={[
                      { value: '12', label: '12 Months (1 Year)' },
                      { value: '24', label: '24 Months (2 Years)' },
                      { value: '36', label: '36 Months (3 Years)' },
                      { value: '60', label: '60 Months (5 Years)' },
                      { value: '120', label: '120 Months (10 Years / Lifetime)' }
                    ]}
                  />

                  <Select
                    label="Currency Symbol"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    options={[
                      { value: '₹', label: '₹ (INR - Indian Rupee)' },
                      { value: '$', label: '$ (USD - US Dollar)' },
                      { value: '€', label: '€ (EUR - Euro)' },
                      { value: '£', label: '£ (GBP - British Pound)' }
                    ]}
                  />
                </div>

                <div className="space-y-4">
                  <Input
                    label="Back Surface Terms & Conditions Footer Notice"
                    value={cardFooterNotice}
                    onChange={(e) => setCardFooterNotice(e.target.value)}
                  />
                  <Input
                    label="Anti-Counterfeit Security Microtext Watermark"
                    value={cardSecurityWatermark}
                    onChange={(e) => setCardSecurityWatermark(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TAB 5: Presets & Themes */}
            {activeTab === 'presets' && (
              <div className="space-y-6">
                {/* System Theme & Auto-Schedule Section */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-900/90 via-slate-900 to-indigo-950 text-white shadow-xl border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px] uppercase font-extrabold border border-teal-400/30">
                        UI Appearance
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        {currentTimeString} ({isDaytime ? 'Daytime' : 'Nighttime'})
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-white mt-1 uppercase tracking-wide">
                      Time-Based Automatic Theme Scheduler
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                      Currently running in <strong>{theme.mode.toUpperCase()}</strong> mode ({isDark ? '🌙 Dark Interface' : '☀️ Light Interface'}). Auto-schedules seamless transitions between daylight and dark mode.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsThemeModalOpen(true)}
                    className="shrink-0 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black shadow-lg"
                  >
                    Configure Theme & Schedule
                  </Button>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Pre-Engineered Card Aesthetic Presets
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a curated theme preset to quickly populate brand palettes and typography.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 block">Executive Standard</span>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white block">Navy Blue Corporate</strong>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Classic hospital dark navy gradient with silver medical cross accents.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => loadPresetTemplate('labmedix_official')}>
                      Load Executive Navy
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">Modern Diagnostic</span>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white block">Metro Green Bio</strong>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Emerald green theme with diagnostic pathology and radiology specialization.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => loadPresetTemplate('metro_diagnostic')}>
                      Load Metro Diagnostic
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: NFC & SMART CHIP HARDWARE CONFIGURATION */}
            {activeTab === 'nfc_config' && (
              <div className="space-y-6">
                {/* NFC Master Header Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border-2 border-teal-500/50 text-white shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center font-black text-slate-950 shadow-lg border border-teal-300 text-xl font-mono">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                            13.56 MHz NFC & Smart Chip Hardware Engine
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/40">
                            ISO/IEC 14443-A
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Configure contactless RFID chip standards, auto-encode payloads on card issuance, and Web NFC POS hardware integration.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                        nfcEnabled
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {nfcEnabled ? '● NFC HARDWARE ACTIVE' : '○ DISABLED'}
                      </span>
                    </div>
                  </div>

                  {/* Switcher Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-teal-900/60 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-teal-900/40">
                      <div>
                        <strong className="block text-slate-200 font-bold">NFC Hardware Subsystem</strong>
                        <span className="text-[11px] text-slate-400">Enable Contactless Tap on POS & Reception</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNfcEnabled(!nfcEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          nfcEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          nfcEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-teal-900/40">
                      <div>
                        <strong className="block text-slate-200 font-bold">Web NFC API Browser Reader</strong>
                        <span className="text-[11px] text-slate-400">Direct USB-NFC reader & Android Chrome support</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNfcWebApi(!nfcWebApi)}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          nfcWebApi ? 'bg-teal-500' : 'bg-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          nfcWebApi ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* NFC Chip Specifications & Standard Selection */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Cpu className="w-4 h-4 text-teal-500" />
                    RFID / NFC Chip Hardware Specifications
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Chip Hardware Standard:
                      </label>
                      <select
                        value={nfcStandard}
                        onChange={(e) => setNfcStandard(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="ISO/IEC 14443 Type A">ISO/IEC 14443 Type A (Recommended)</option>
                        <option value="MIFARE Classic 1K/4K">MIFARE Classic 1K/4K (Smart Card)</option>
                        <option value="NTAG213/215/216">NTAG213/215/216 (High Capacity NDEF)</option>
                        <option value="FeliCa">FeliCa (Sony Standard)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Operating Frequency:
                      </label>
                      <input
                        type="text"
                        value={nfcFrequency}
                        onChange={(e) => setNfcFrequency(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Contactless Tap Payload Type:
                      </label>
                      <select
                        value={nfcPayloadType}
                        onChange={(e) => setNfcPayloadType(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="verification_url">Public Verification URL (Direct Browser Link)</option>
                        <option value="deep_link">Patient Portal Deep-Link URL</option>
                        <option value="ndef_json">Encrypted NDEF JSON Medical Dossier</option>
                        <option value="vcard">vCard Virtual Contact & Emergency Badge</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Hardware Security / AES Key (Hex Key for Write Authentication):
                      </label>
                      <input
                        type="text"
                        value={nfcKey}
                        onChange={(e) => setNfcKey(e.target.value)}
                        placeholder="A0B1C2D3E4F5"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div>
                        <strong className="block text-slate-900 dark:text-white font-bold text-xs">
                          Auto-Write NFC Chip on Issuance
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          Automatically generates 7-byte UID & encodes verification payload
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={nfcAutoWrite}
                        onChange={(e) => setNfcAutoWrite(e.target.checked)}
                        className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* NFC Tap Diagnostic Simulation & Card Reading Suite */}
                <div className="p-5 rounded-3xl bg-slate-900 text-white border border-teal-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/40">
                        <Wifi className="w-5 h-5 rotate-90" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-white tracking-wider">
                          NFC Smart Card Reader & Tap Diagnostic Simulator
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          Simulate contactless card tap (13.56 MHz ISO 14443-A) and decode cardholder UID.
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black whitespace-nowrap shadow-lg hover:scale-105 transition-all"
                      leftIcon={isSimulatingNfcTap ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                      onClick={handleTestNfcTap}
                      isLoading={isSimulatingNfcTap}
                    >
                      {isSimulatingNfcTap ? 'Reading NFC Chip...' : '📡 Tap NFC Card (Simulate 13.56 MHz)'}
                    </Button>
                  </div>

                  {nfcTestResult && (
                    <div className="p-4 rounded-2xl border bg-emerald-950/60 border-emerald-500/50 text-emerald-200 text-xs space-y-2 font-mono animate-in fade-in duration-200">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          NFC HARDWARE STATUS: 200 OK - CHIP READ SUCCESSFUL
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] text-emerald-300">
                          Carrier: 13.56 MHz
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300 pt-2 border-t border-slate-800">
                        <p>📡 Chip UID: <strong className="text-white">04:E2:89:1A:B5:4C:80</strong></p>
                        <p>🏷️ Protocol: <strong className="text-white">{nfcStandard}</strong></p>
                        <p>🔐 Encryption Key: <strong className="text-white">{nfcKey} (AES Validated)</strong></p>
                        <p>⚡ Latency: <strong className="text-emerald-400">12ms (Instant Contactless)</strong></p>
                      </div>

                      <p className="text-[10px] text-slate-400 font-sans pt-1">
                        {nfcTestResult}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: Google Pay & UPI Merchant Dynamic QR Configuration */}
            {activeTab === 'gpay_merchant' && (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-2 border-blue-500/50 text-white shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white p-2 flex items-center justify-center font-black shadow-lg border border-slate-200">
                        <div className="w-full h-full rounded-xl bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center text-white font-black text-xs font-mono">
                          GPay
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                            Google Pay Merchant & UPI Gateway Setup
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/40">
                            NPCI UPI 2.0
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Directly connects to Google Pay for Business, PhonePe, Paytm & BHIM UPI for zero-friction scannable payment QR and instant wallet recharges.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                        upiEnabled
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {upiEnabled ? '● UPI QR ACTIVE' : '○ DISABLED'}
                      </span>
                    </div>
                  </div>

                  {/* Status Toggle Switcher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-900/60 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-blue-900/40">
                      <div>
                        <strong className="block text-slate-200 font-bold">UPI QR Engine Status</strong>
                        <span className="text-[11px] text-slate-400">Enable live scannable QR codes across website & application</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUpiEnabled(!upiEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          upiEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          upiEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-blue-900/40">
                      <div>
                        <strong className="block text-slate-200 font-bold">1-Tap App Deep Links</strong>
                        <span className="text-[11px] text-slate-400">Allow instant launch of GPay/PhonePe on mobile</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUpiDeepLinks(!upiDeepLinks)}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                          upiDeepLinks ? 'bg-blue-500' : 'bg-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          upiDeepLinks ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Configuration Inputs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-500" />
                      Merchant Account VPA & Business Identification
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">Live In Production</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        1. Merchant VPA (UPI ID): <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={upiVpa}
                        onChange={(e) => setUpiVpa(e.target.value)}
                        placeholder="e.g. labmedix.health@icici or hospital@okhdfcbank"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">This VPA will be encoded into all dynamic QR codes generated for card payments.</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        2. Merchant Business Name: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={upiMerchantName}
                        onChange={(e) => setUpiMerchantName(e.target.value)}
                        placeholder="e.g. LABMEDIX MULTI-SPECIALITY CENTRE"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">Appears on the patient's Google Pay / PhonePe / Paytm payment screen.</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        3. Google Pay Merchant ID (Optional):
                      </label>
                      <input
                        type="text"
                        value={gpayMerchantId}
                        onChange={(e) => setGpayMerchantId(e.target.value)}
                        placeholder="e.g. GPAY-LMDX-8829-LIVE"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        4. Merchant Category Code (MCC):
                      </label>
                      <input
                        type="text"
                        value={upiMcc}
                        onChange={(e) => setUpiMcc(e.target.value)}
                        placeholder="8099 (Medical Services & Hospitals)"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Diagnostic Simulator of Generated Scannable QR Code */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-500" />
                      Live Scannable QR Code Simulator (Test with Phone)
                    </h4>
                    <span className="text-[10px] text-emerald-500 font-bold font-mono">Real Level-H QR Ready</span>
                  </div>

                  <GooglePayMerchantQR
                    amount={1499}
                    referenceNo="LMDX-LIVE-TEST-01"
                    note="Test Health Card Payment"
                    merchantVpa={upiVpa}
                    merchantName={upiMerchantName}
                    merchantMcc={upiMcc}
                  />
                </div>
              </div>
            )}

            {/* TAB 8: Registration & Family Health Shield Policies */}
            {activeTab === 'registration_policy' && (
              <div className="space-y-6">
                <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/50 text-white shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 p-2 flex items-center justify-center text-indigo-300">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                        Patient Registration & Family Shield Global Policies
                      </h3>
                      <p className="text-xs text-slate-300">
                        Configure clinic defaults for initial triage vitals, family membership allowance limits, extra dependent surcharge fees, and health card issuance switches.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Card Issuance Default Policy */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">
                          Smart Health Card Issuance by Default
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Safety Safeguard
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        When enabled, newly opened registration forms will have "Issue Smart Health Card" toggled ON. Recommended: Keep OFF to avoid accidental physical card issuance.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setRegCardIssuanceDefault(!regCardIssuanceDefault)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        regCardIssuanceDefault ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          regCardIssuanceDefault ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Clinical Triage Default Policy */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-emerald-500" />
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">
                          Clinical Triage & Physical Measurements Default
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Speed Optimized
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        When enabled, initial registration opens the vitals panel (BP, Pulse, SpO2, Temp, Weight, Height, BMI) expanded. Recommended: Keep OFF for rapid front-desk check-in.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setRegTriageDefault(!regTriageDefault)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        regTriageDefault ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          regTriageDefault ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Family Shield Included Count & Extra Fee */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Included Family Shield Dependents"
                        type="number"
                        min={1}
                        max={20}
                        value={regMaxFamily}
                        onChange={(e) => setRegMaxFamily(parseInt(e.target.value) || 5)}
                        disabled={isLocked}
                        helperText="Base quota included at no extra charge (Default: 5 members)"
                      />
                    </div>

                    <div>
                      <Input
                        label="Extra Dependent Surcharge (₹)"
                        type="number"
                        min={0}
                        step={1}
                        value={regExtraMemberFee}
                        onChange={(e) => setRegExtraMemberFee(parseFloat(e.target.value) || 0)}
                        disabled={isLocked}
                        helperText="Fee charged per dependent registered beyond the quota (Default: ₹299)"
                      />
                    </div>
                  </div>

                  {/* Policy Summary Notice */}
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Family Shield Multi-Member Rule Active</strong>
                      <span>
                        The primary patient and first <strong>{regMaxFamily}</strong> dependents are covered under the standard registration plan. Any additional family members enrolled will automatically incur a surcharge of <strong>₹{regExtraMemberFee} each</strong> on the itemized patient bill.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: System Diagnostics & Health */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    System Engine & Storage Statistics
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Live Indexed database health and system memory status.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Patients</span>
                    <strong className="text-lg font-black text-slate-900 dark:text-white">
                      {StorageService.getPatients().length}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Health Cards</span>
                    <strong className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {StorageService.getCards().length}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Families</span>
                    <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {StorageService.getFamilies().length}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Audit Logs</span>
                    <strong className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {StorageService.getAuditLogs().length}
                    </strong>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200 font-bold block">
                        Offline-First Database Engine Healthy
                      </strong>
                      <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                        All records safely synchronized in local encrypted storage.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    OPERATIONAL
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Save All Settings
              </Button>
            </div>
          </form>

          {activeTab === 'tier_config' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
               <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-brand-blue to-blue-800 p-6 sm:p-8 text-white shadow-lg shadow-blue-900/20 border border-blue-400/20">
                  {/* Background Accents */}
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute bottom-0 right-16 -mb-6 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
                    <div className="flex-shrink-0 w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                      <Crown className="w-7 h-7 text-amber-300 drop-shadow-md" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        Membership Tier Configurations
                      </h3>
                      <p className="text-sm text-blue-100/90 leading-relaxed max-w-2xl mt-1.5 font-medium">
                        The centralized source of truth for Health Card tier pricing, family plan policies, dynamic discounts, and exclusive benefit packages. Changes made here apply instantly system-wide.
                      </p>
                    </div>
                  </div>
                </div>
                <TierConfigManager />
              </div>
            </div>
          )}

        </div>

        {/* Right 5 Cols: Live 3D CR80 PVC Card Studio Preview */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Live 3D CR80 Card Preview
                </h4>
                <span className="text-[10px] font-mono text-slate-400">85.60 × 53.98 mm</span>
              </div>

              {/* 3D Flip Face Switcher */}
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-blue-700 transition-colors"
              >
                <RotateCw className="w-3 h-3" />
                <span>Flip to {isFlipped ? 'Front' : 'Back'}</span>
              </button>
            </div>

            {/* Interactive 3D Card Stage */}
            <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-2xl border border-slate-800 shadow-inner overflow-hidden">
              <div
                className="perspective-1000 my-2"
                style={{
                  width: '360px',
                  height: '227px'
                }}
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="relative preserve-3d cursor-pointer w-full h-full"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front Face */}
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

                  {/* Back Face */}
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

            {/* Card Calibration & Bleed Controls */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 font-medium">3mm Safe Bleed Guides</span>
              <button
                type="button"
                onClick={() => setShowBleedGuides(!showBleedGuides)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  showBleedGuides
                    ? 'bg-red-50 text-red-600 border-red-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {showBleedGuides ? 'Active' : 'Show Guides'}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-brand-blue dark:text-blue-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Instant Multi-Module Synchronization</span>
              </div>
              <p className="text-[10px]">
                Modifications to branding, emergency hotlines, and registration numbers instantly update on all issued CR80 PVC Cards, A4 Print Sheets, and Patient Portals.
              </p>
            </div>
          </div>
        </div>

      <AddressAutoPopupModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        initialQuery={pinCode || district || address}
        onSelectAddress={(sel) => {
          setAddress(sel.cityArea);
          setPostOffice(sel.postOffice);
          setPoliceStation(sel.policeStation);
          setDistrict(sel.district);
          setStateVal(sel.state);
          setPinCode(sel.pinCode);
          showToast('success', 'Address Applied via Popup 📍', `${sel.cityArea}, ${sel.district}, ${sel.state} (PIN: ${sel.pinCode})`);
        }}
      />

      {/* Application Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
</div>
</div>
  );
};