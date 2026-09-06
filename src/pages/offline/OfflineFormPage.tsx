import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfflineFormService, OfflinePatientData, OfflineSubmission } from '../../services/offlineFormService';
import { StorageService } from '../../services/storage';
import { AddressLookupService } from '../../services/addressLookupService';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { PhotoUploaderWebcam } from '../../components/common/PhotoUploaderWebcam';
import { SignaturePad } from '../../components/common/SignaturePad';
import { PrintableBlankPhysicalForm } from '../../components/offline/PrintableBlankPhysicalForm';
import { OfflineCampPassModal } from '../../components/offline/OfflineCampPassModal';
import { OfflineDuplicateScannerModal } from '../../components/offline/OfflineDuplicateScannerModal';
import { OfflineCampAnalyticsModal } from '../../components/offline/OfflineCampAnalyticsModal';
import { OfflineVoiceRecorder } from '../../components/offline/OfflineVoiceRecorder';
import { CreateFamilyMemberInput } from '../../services/patientService';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { formatCurrency } from '../../utils/formatters';
import { Membership } from '../../types';
import { MembershipTierService } from '../../services/membershipTierService';
import {
  Wifi,
  WifiOff,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileSpreadsheet,
  Download,
  Upload,
  Users,
  CreditCard,
  Heart,
  Activity,
  MapPin,
  Phone,
  Shield,
  Stethoscope,
  PenTool,
  UploadCloud,
  RefreshCw,
  Search,
  Check,
  X,
  FileText,
  Building,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Edit3,
  QrCode,
  BarChart3,
  Pill,
  Languages,
  Mic,
  ArrowRight,
  Star
} from 'lucide-react';

export const OfflineFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Active Tab: 'form' | 'queue' | 'print'
  const [activeTab, setActiveTab] = useState<'form' | 'queue' | 'print'>('form');

  // Bilingual Language Toggle
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  // Network Status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Submissions State
  const [submissions, setSubmissions] = useState<OfflineSubmission[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'synced' | 'failed' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [selectedSubmission, setSelectedSubmission] = useState<OfflineSubmission | null>(null);
  const [showCampPassModal, setShowCampPassModal] = useState<OfflineSubmission | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Hidden File input ref for batch import
  const batchImportInputRef = useRef<HTMLInputElement>(null);

  // Load Submissions
  const reloadSubmissions = () => {
    setSubmissions(OfflineFormService.getAllSubmissions());
  };

  useEffect(() => {
    reloadSubmissions();

    const handleOnline = () => {
      setIsOnline(true);
      showToast('success', 'Back Online', 'Internet connection restored. You can now sync pending offline forms to the cloud.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('warning', 'Offline Mode Activated', 'Working in offline mode. All patient registrations will be safely queued locally.');
    };

    const handleQueueChange = () => reloadSubmissions();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('labmedix_offline_queue_changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('labmedix_offline_queue_changed', handleQueueChange);
    };
  }, [showToast]);

  // Available Active Memberships (Single Source of Truth — live subscription)
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getActiveMemberships());
  const camps = StorageService.getHealthCamps();

  useEffect(() => {
    // Subscribe to live membership tier changes from Firestore + local storage
    const unsubscribe = MembershipTierService.subscribeToTiers((allTiers) => {
      const active = allTiers.filter(t => t && t.name && t.status === 'active');
      setMemberships(active);
      // Auto-fix selected tier if it was deactivated
      setMembershipId(prev => {
        const stillActive = active.some(m => m.id === prev);
        if (!stillActive) {
          const best = active.find(m => m.isRecommended) || active[0];
          if (best) {
            setFeeCollected(best.registrationFee);
            return best.id;
          }
        }
        return prev;
      });
    });
    return () => unsubscribe();
  }, []);

  // Default Recommended Tier
  const recommendedTier = useMemo(() => {
    return memberships.find(m => m.isRecommended) || memberships[0];
  }, [memberships]);

  // ----------------------------------------------------
  // Form State
  // ----------------------------------------------------
  const [fullName, setFullName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [relationshipWithGuardian, setRelationshipWithGuardian] = useState('Father');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [maritalStatus, setMaritalStatus] = useState('Married');
  const [occupation, setOccupation] = useState('Self-Employed / Business');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [governmentIdType, setGovernmentIdType] = useState('Aadhaar Card');
  const [governmentIdNumber, setGovernmentIdNumber] = useState('');

  // Address
  const [villageArea, setVillageArea] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [district, setDistrict] = useState(() => StorageService.getCompanyProfile()?.district || 'Kolkata');
  const [stateVal, setStateVal] = useState(() => StorageService.getCompanyProfile()?.state || 'West Bengal');
  const [pinCode, setPinCode] = useState(() => StorageService.getCompanyProfile()?.pinCode || '700001');
  const [fullAddress, setFullAddress] = useState('');

  // Medical History
  const [isDiabetic, setIsDiabetic] = useState(false);
  const [isHypertensive, setIsHypertensive] = useState(false);
  const [hasHeartDisease, setHasHeartDisease] = useState(false);
  const [hasAsthma, setHasAsthma] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');

  // Baseline Vitals
  const [bpSystolic, setBpSystolic] = useState<string>('120');
  const [bpDiastolic, setBpDiastolic] = useState<string>('80');
  const [pulseRate, setPulseRate] = useState<string>('72');
  const [bloodSugar, setBloodSugar] = useState<string>('');
  const [sugarType, setSugarType] = useState<'fasting' | 'post_prandial' | 'random'>('random');
  const [spo2, setSpo2] = useState<string>('99');
  const [temperature, setTemperature] = useState<string>('98.4');
  const [weightKg, setWeightKg] = useState<string>('65');
  const [heightCm, setHeightCm] = useState<string>('165');

  // Emergency Contact
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('Spouse');
  const [emergencyContactMobile, setEmergencyContactMobile] = useState('');

  // Membership & Payment
  const [membershipId, setMembershipId] = useState(() => StorageService.getRecommendedMembership()?.id || StorageService.getActiveMemberships()[0]?.id || '');
  const [initialDeposit, setInitialDeposit] = useState<number>(0);
  const [campName, setCampName] = useState(() => {
    const co = StorageService.getCompanyProfile();
    return co?.name ? `${co.name} Health Camp` : 'Health Outreach Camp';
  });
  const [campLocation, setCampLocation] = useState(() => {
    const co = StorageService.getCompanyProfile();
    if (co?.address) return co.address;
    if (co?.district && co?.state) return `${co.district}, ${co.state}`;
    return '';
  });
  const [volunteerName, setVolunteerName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'ngo_free_grant' | 'card'>('cash');
  const [feeCollected, setFeeCollected] = useState<number>(() => {
    const currentTier = StorageService.getRecommendedMembership() || StorageService.getActiveMemberships()[0];
    return currentTier?.registrationFee ?? 100;
  });
  const [generalNotes, setGeneralNotes] = useState('');

  // Ensure selected tier is valid and active
  useEffect(() => {
    if (memberships.length > 0 && !memberships.some(m => m.id === membershipId)) {
      const best = memberships.find(m => m.isRecommended) || memberships[0];
      if (best) {
        setMembershipId(best.id);
        if (paymentMode !== 'ngo_free_grant') {
          setFeeCollected(best.registrationFee);
        }
      }
    }
  }, [memberships, membershipId, paymentMode]);

  // Media
  const [photoBase64, setPhotoBase64] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');
  const [audioVoiceMemoBase64, setAudioVoiceMemoBase64] = useState<string | undefined>(undefined);

  // Field Dispensed Medicines
  const [dispensedMedicines, setDispensedMedicines] = useState<
    Array<{ id: string; name: string; dosage: string; quantity: number; instructions: string }>
  >([]);

  // Family Members
  const [familyMembers, setFamilyMembers] = useState<Array<CreateFamilyMemberInput & { id: string }>>([]);

  // Calculate BMI
  const calculatedBmi = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return '';
  }, [weightKg, heightCm]);

  // Real-time Clinical Triage Evaluation
  const triageAssessment = useMemo(() => {
    return OfflineFormService.calculateTriage(
      {
        bpSystolic: bpSystolic ? parseInt(bpSystolic) : undefined,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic) : undefined,
        pulseRate: pulseRate ? parseInt(pulseRate) : undefined,
        bloodSugar: bloodSugar ? parseInt(bloodSugar) : undefined,
        sugarType,
        spo2: spo2 ? parseInt(spo2) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        bmi: calculatedBmi || undefined
      },
      { isDiabetic, isHypertensive, hasHeartDisease, hasAsthma }
    );
  }, [bpSystolic, bpDiastolic, pulseRate, bloodSugar, sugarType, spo2, temperature, weightKg, heightCm, calculatedBmi, isDiabetic, isHypertensive, hasHeartDisease, hasAsthma]);

  // Real-time Duplicate Check
  const duplicateAlert = useMemo(() => {
    return OfflineFormService.findDuplicates(mobile, governmentIdNumber);
  }, [mobile, governmentIdNumber]);

  // Auto-Resolve PIN Code offline
  const handlePinCodeChange = (newPin: string) => {
    setPinCode(newPin);
    const clean = newPin.trim();
    if (clean.length === 6 && /^\d{6}$/.test(clean)) {
      const results = AddressLookupService.lookupLocal(clean);
      if (results.length > 0) {
        const best = results[0];
        setVillageArea(best.cityArea);
        setPostOffice(best.postOffice);
        setPoliceStation(best.policeStation);
        setDistrict(best.district);
        setStateVal(best.state);
        showToast('info', 'Offline Address Resolved', `Matched ${best.cityArea}, ${best.district}`);
      }
    }
  };

  // Camp Preset Selector Handler
  const handleCampPreset = (preset: 'sundarbans' | 'slum' | 'cardiac' | 'school') => {
    if (preset === 'sundarbans') {
      setCampName('Sundarbans Rural Medical Outreach #1');
      setCampLocation('Canning Block II, South 24 Parganas');
      setDistrict('South 24 Parganas');
      setPinCode('743329');
      setPaymentMode('ngo_free_grant');
      setFeeCollected(0);
      showToast('info', 'Camp Preset Applied', 'Loaded Sundarbans 100% Free Grant Outreach settings.');
    } else if (preset === 'slum') {
      setCampName('Medix Urban Slum Health Mission');
      setCampLocation('Dhapa / Tiljala Ward 58');
      setDistrict('Kolkata');
      setPinCode('700105');
      setPaymentMode('cash');
      setFeeCollected(50);
      showToast('info', 'Camp Preset Applied', 'Loaded Urban Slum Subsidized Drive settings.');
    } else if (preset === 'cardiac') {
      setCampName('Senior Citizens Cardiac & Diabetes Screening');
      setCampLocation('Salt Lake Community Hall, Sector 1');
      setDistrict('North 24 Parganas');
      setPinCode('700064');
      setPaymentMode('upi');
      setFeeCollected(100);
      showToast('info', 'Camp Preset Applied', 'Loaded Geriatric Cardiac screening camp.');
    } else if (preset === 'school') {
      setCampName('School Children Health & Dental Camp');
      setCampLocation('Adarsh Vidyamandir Primary School');
      setDistrict('Howrah');
      setPinCode('711101');
      setPaymentMode('ngo_free_grant');
      setFeeCollected(0);
      showToast('info', 'Camp Preset Applied', 'Loaded School Pediatric drive settings.');
    }
  };

  // Auto-Save Draft to LocalStorage every 1.5 seconds
  useEffect(() => {
    if (!fullName && !mobile) return;
    const timeout = setTimeout(() => {
      OfflineFormService.saveDraft({
        fullName,
        guardianName,
        dob,
        age,
        gender,
        maritalStatus,
        occupation,
        bloodGroup,
        mobile,
        whatsapp,
        email,
        governmentIdType,
        governmentIdNumber,
        villageArea,
        postOffice,
        policeStation,
        district,
        state: stateVal,
        pinCode,
        fullAddress,
        isDiabetic,
        isHypertensive,
        hasHeartDisease,
        hasAsthma,
        allergies,
        chronicConditions,
        currentMedications,
        emergencyContactName,
        emergencyContactRelationship,
        emergencyContactMobile,
        membershipId,
        campName,
        campLocation,
        paymentMode,
        feeCollected,
        generalNotes
      });
    }, 1500);

    return () => clearTimeout(timeout);
  }, [
    fullName, guardianName, dob, age, gender, maritalStatus, occupation, bloodGroup, mobile, whatsapp, email,
    governmentIdType, governmentIdNumber, villageArea, postOffice, policeStation, district, stateVal, pinCode, fullAddress,
    isDiabetic, isHypertensive, hasHeartDisease, hasAsthma, allergies, chronicConditions, currentMedications,
    emergencyContactName, emergencyContactRelationship, emergencyContactMobile, membershipId, campName, campLocation, paymentMode, feeCollected, generalNotes
  ]);

  // Check for saved draft on mount
  useEffect(() => {
    const draft = OfflineFormService.getDraft();
    if (draft && draft.data && draft.data.fullName) {
      const d = draft.data;
      if (d.fullName) setFullName(d.fullName);
      if (d.guardianName) setGuardianName(d.guardianName);
      if (d.mobile) setMobile(d.mobile);
      if (d.age) setAge(d.age);
      if (d.gender) setGender(d.gender);
      if (d.bloodGroup) setBloodGroup(d.bloodGroup);
      if (d.pinCode) setPinCode(d.pinCode);
      if (d.district) setDistrict(d.district);
      if (d.campName) setCampName(d.campName);
    }
  }, []);

  // Add Dispensed Medicine
  const addQuickMedicine = (name: string, dosage: string, defaultQty: number, instructions: string) => {
    setDispensedMedicines(prev => [
      ...prev,
      {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        name,
        dosage,
        quantity: defaultQty,
        instructions
      }
    ]);
  };

  const removeDispensedMedicine = (id: string) => {
    setDispensedMedicines(prev => prev.filter(m => m.id !== id));
  };

  // Add Family Member
  const addFamilyMember = () => {
    setFamilyMembers(prev => [
      ...prev,
      {
        id: `fam_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        fullName: '',
        relationship: 'Spouse',
        age: 28,
        gender: 'female',
        bloodGroup: 'B+',
        issueCard: true
      }
    ]);
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers(prev => prev.filter(f => f.id !== id));
  };

  const updateFamilyMember = (id: string, updates: Partial<CreateFamilyMemberInput>) => {
    setFamilyMembers(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  // Reset Form
  const resetForm = () => {
    setFullName('');
    setGuardianName('');
    setDob('');
    setAge(30);
    setGender('male');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setGovernmentIdNumber('');
    setVillageArea('');
    setFullAddress('');
    setIsDiabetic(false);
    setIsHypertensive(false);
    setHasHeartDisease(false);
    setHasAsthma(false);
    setAllergies('');
    setChronicConditions('');
    setCurrentMedications('');
    setBloodSugar('');
    setEmergencyContactName('');
    setEmergencyContactMobile('');
    setPhotoBase64('');
    setSignatureBase64('');
    setAudioVoiceMemoBase64(undefined);
    setDispensedMedicines([]);
    setFamilyMembers([]);
    setGeneralNotes('');
    OfflineFormService.clearDraft();
  };

  // Handle Form Submission (Works 100% Offline)
  const handleSubmitOfflineForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('error', 'Validation Error', 'Please enter Patient Full Name.');
      return;
    }
    if (!mobile.trim()) {
      showToast('error', 'Validation Error', 'Please enter Patient Primary Mobile Number.');
      return;
    }

    const patientData: OfflinePatientData = {
      fullName: fullName.trim(),
      guardianName: guardianName.trim() || undefined,
      relationshipWithGuardian,
      dob: dob || `${new Date().getFullYear() - age}-01-01`,
      age: Number(age) || 30,
      gender,
      maritalStatus,
      occupation,
      bloodGroup,
      mobile: mobile.trim(),
      whatsapp: whatsapp.trim() || mobile.trim(),
      email: email.trim() || undefined,
      governmentIdType,
      governmentIdNumber: governmentIdNumber.trim(),
      villageArea,
      postOffice,
      policeStation,
      district,
      state: stateVal,
      pinCode,
      fullAddress,
      isDiabetic,
      isHypertensive,
      hasHeartDisease,
      hasAsthma,
      allergies,
      chronicConditions,
      currentMedications,
      vitals: {
        bpSystolic: bpSystolic ? parseInt(bpSystolic) : undefined,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic) : undefined,
        pulseRate: pulseRate ? parseInt(pulseRate) : undefined,
        bloodSugar: bloodSugar ? parseInt(bloodSugar) : undefined,
        sugarType,
        spo2: spo2 ? parseInt(spo2) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        bmi: calculatedBmi || undefined
      },
      triageLevel: triageAssessment.level,
      triageReasons: triageAssessment.reasons,
      dispensedMedicines: dispensedMedicines.length > 0 ? dispensedMedicines : undefined,
      emergencyContactName: emergencyContactName.trim() || guardianName.trim() || 'Family Member',
      emergencyContactRelationship,
      emergencyContactMobile: emergencyContactMobile.trim() || mobile.trim(),
      membershipId,
      initialDeposit,
      familyName: familyMembers.length > 0 ? `${fullName.trim()} Family` : undefined,
      familyMembers: familyMembers.length > 0 ? familyMembers.map(({ id, ...rest }) => rest) : undefined,
      campName: campName.trim() || undefined,
      campLocation: campLocation.trim() || undefined,
      volunteerOrAgentName: volunteerName.trim() || undefined,
      paymentMode,
      feeCollected: Number(feeCollected) || 0,
      generalNotes: generalNotes.trim() || undefined,
      photoBase64,
      signatureBase64,
      audioVoiceMemoBase64
    };

    const saved = OfflineFormService.saveOfflineSubmission(patientData);
    reloadSubmissions();
    triggerCelebrationFireworks();
    showToast('success', 'Form Queued Locally', `Offline Token: ${saved.offlineToken}. Stored securely on this device.`);
    
    // Open Camp Pass & Thermal Print Modal directly
    setShowCampPassModal(saved);
  };

  // Sync All Pending Submissions
  const handleSyncAll = async () => {
    const pending = OfflineFormService.getPendingSubmissions();
    if (pending.length === 0) {
      showToast('info', 'Queue Clean', 'No pending offline submissions to sync.');
      return;
    }

    setIsSyncingAll(true);
    showToast('info', 'Syncing Records', `Processing ${pending.length} offline registrations to live system...`);

    try {
      const res = await OfflineFormService.syncAllPending();
      reloadSubmissions();
      if (res.failed === 0) {
        triggerCelebrationFireworks();
        showToast('success', 'Sync Completed', `Successfully uploaded ${res.succeeded} patient registrations into live system!`);
      } else {
        showToast('warning', 'Partial Sync', `Uploaded ${res.succeeded} records. ${res.failed} records had issues.`);
      }
    } catch (e: any) {
      showToast('error', 'Sync Failed', e?.message || 'Error occurred while uploading offline queue.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Sync Single Submission
  const handleSyncSingle = async (sub: OfflineSubmission) => {
    showToast('info', 'Syncing Submission', `Uploading ${sub.data.fullName} to system...`);
    const res = await OfflineFormService.syncSubmissionToLive(sub.id);
    reloadSubmissions();
    if (res.success) {
      showToast('success', 'Patient Synced!', `Registered ${sub.data.fullName} (ID: ${res.patientId}, Card: ${res.cardNumber})`);
    } else {
      showToast('error', 'Sync Error', res.error || 'Failed to sync submission');
    }
  };

  // Handle Batch Import JSON File
  const handleBatchFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = OfflineFormService.batchImportSubmissions(content);
        reloadSubmissions();
        if (res.importedCount > 0) {
          triggerCelebrationFireworks();
          showToast('success', 'Batch Imported', `Successfully imported ${res.importedCount} records. (${res.skippedCount} skipped/duplicates).`);
        } else {
          showToast('warning', 'Import Notice', `No new records added. (${res.skippedCount} duplicates skipped).`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter Submissions for Queue
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (queueFilter === 'pending' && (s.syncStatus !== 'pending' && s.syncStatus !== 'failed')) return false;
      if (queueFilter === 'synced' && s.syncStatus !== 'synced') return false;
      if (queueFilter === 'failed' && s.syncStatus !== 'failed') return false;
      if (queueFilter === 'critical' && s.data.triageLevel !== 'emergency' && s.data.triageLevel !== 'high_risk') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.data.fullName.toLowerCase().includes(q);
        const matchesMobile = s.data.mobile.includes(q);
        const matchesToken = s.offlineToken.toLowerCase().includes(q);
        const matchesCamp = (s.data.campName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesToken && !matchesCamp) return false;
      }
      return true;
    });
  }, [submissions, queueFilter, searchQuery]);

  const pendingCount = submissions.filter(s => s.syncStatus === 'pending' || s.syncStatus === 'failed').length;
  const syncedCount = submissions.filter(s => s.syncStatus === 'synced').length;
  const criticalCount = submissions.filter(s => s.data.triageLevel === 'emergency' || s.data.triageLevel === 'high_risk').length;

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0 print:space-y-0 print:pb-0">
      {/* Top Banner & Connectivity Status */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 p-5 sm:p-6 text-white shadow-xl print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    {lang === 'bn' ? 'অফলাইন ইনটেক ও ফিল্ড হেলথ ক্যাম্প স্যুট' : 'Offline Intake & Field Camp Suite'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                    Offline First Engine
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {lang === 'bn'
                    ? 'কোনো ইন্টারনেট ছাড়াই তাত্ক্ষণিক রোগী নিবন্ধন, ট্রায়াজ মূল্যায়ন, ডিজিটাল হেলথ কার্ড ও থার্মাল স্লিপ প্রিন্ট করুন।'
                    : 'Zero-internet rural patient registration, clinical triage, medicine dispensing, and instant 2-inch POS slip & health card issuance.'}
                </p>
              </div>
            </div>
          </div>

          {/* Controls & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all shadow-xs"
              title="Toggle English / Bengali"
            >
              <Languages className="w-4 h-4 text-amber-400" />
              <span>{lang === 'en' ? 'বাংলা রূপান্তর' : 'English'}</span>
            </button>

            {/* Duplicate Check & QR Scanner */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDuplicateModal(true)}
              leftIcon={<QrCode className="w-4 h-4 text-indigo-300" />}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold"
            >
              {lang === 'bn' ? 'QR / ডুপ্লিকেট স্ক্যান' : 'QR / Duplicate Check'}
            </Button>

            {/* Camp Live Analytics */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalyticsModal(true)}
              leftIcon={<BarChart3 className="w-4 h-4 text-emerald-300" />}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold"
            >
              {lang === 'bn' ? 'ক্যাম্প রিপোর্ট' : 'Camp Analytics'}
            </Button>

            {/* Online/Offline Status Indicator */}
            {isOnline ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-xs">
                <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-xs">
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span>Camp Offline</span>
              </div>
            )}

            {/* Sync All Button */}
            {pendingCount > 0 && (
              <Button
                variant="primary"
                onClick={handleSyncAll}
                disabled={isSyncingAll || !isOnline}
                leftIcon={<UploadCloud className={`w-4 h-4 ${isSyncingAll ? 'animate-bounce' : ''}`} />}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md border border-emerald-400/30"
              >
                {isSyncingAll ? 'Syncing...' : `⚡ Sync ${pendingCount}`}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'form'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>{lang === 'bn' ? 'ডিজিটাল অফলাইন ফর্ম' : 'Digital Intake Form'}</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative shrink-0 ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{lang === 'bn' ? 'অফলাইন কিউ ও সিঙ্ক হাব' : 'Offline Queue & Sync Hub'}</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'print'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? 'ফিজিক্যাল ব্ল্যাঙ্ক ফর্ম (A4)' : 'Print Blank Form (A4)'}</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: DIGITAL OFFLINE INTAKE FORM */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'form' && (
        <form onSubmit={handleSubmitOfflineForm} className="space-y-6">
          
          {/* Quick Camp Preset & Duplicate Alert Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Building className="w-4 h-4 text-indigo-500" />
                <span>{lang === 'bn' ? 'ক্যাম্প প্রিসেট ও দ্রুত অটো-ফিল:' : 'Fast Field Camp Presets:'}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCampPreset('sundarbans')}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                >
                  🌿 Sundarbans NGO Free Drive
                </button>
                <button
                  type="button"
                  onClick={() => handleCampPreset('slum')}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                >
                  🏙️ Urban Slum Health Mission
                </button>
                <button
                  type="button"
                  onClick={() => handleCampPreset('cardiac')}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                >
                  ❤️ Senior Cardiac & Sugar Camp
                </button>
                <button
                  type="button"
                  onClick={() => handleCampPreset('school')}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                >
                  🎒 School Health Screening
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label={lang === 'bn' ? 'ক্যাম্পের নাম' : 'Camp Name'}
                placeholder="e.g. Sundarbans Outreach Camp"
                value={campName}
                onChange={e => setCampName(e.target.value)}
              />
              <Input
                label={lang === 'bn' ? 'ক্যাম্পের স্থান / গ্রাম' : 'Camp Location / Village'}
                placeholder="e.g. Canning Block II"
                value={campLocation}
                onChange={e => setCampLocation(e.target.value)}
              />
              <Input
                label={lang === 'bn' ? 'ফিল্ড কর্মী / ভলান্টিয়ার' : 'Volunteer / Operator Name'}
                placeholder="e.g. Supriya Das (ANM)"
                value={volunteerName}
                onChange={e => setVolunteerName(e.target.value)}
              />
            </div>
          </div>

          {/* DUPLICATE WARNING BANNER (IF DETECTED) */}
          {duplicateAlert.found && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase">
                    {lang === 'bn' ? 'সতর্কতা: ডুপ্লিকেট রোগী ম্যাচ পাওয়া গেছে!' : 'Duplicate Patient Match Detected!'}
                  </h4>
                  <p className="text-xs mt-0.5">
                    {duplicateAlert.matchDetails.join(' | ')}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDuplicateModal(true)}
                className="bg-white dark:bg-slate-900 border-amber-400 text-xs font-bold shrink-0"
              >
                {lang === 'bn' ? 'যাচাই করুন' : 'Verify Match'}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (Demographics & Vitals) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Section 1: Demographics */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>{lang === 'bn' ? '১. রোগীর ব্যক্তিগত ও পরিচিতি বিবরণ' : '1. Patient Demographics & Identity'}</span>
                  </div>
                  <Badge variant="blue">{lang === 'bn' ? 'আবশ্যক' : 'Required'}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label={lang === 'bn' ? 'রোগীর পূর্ণ নাম *' : 'Patient Full Name *'}
                      placeholder="e.g. Rajesh Kumar Sen"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'পিতা / মাতা / স্বামীর নাম' : 'Father / Mother / Spouse Name'}
                      placeholder="e.g. Ramesh Chandra Sen"
                      value={guardianName}
                      onChange={e => setGuardianName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Select
                      label={lang === 'bn' ? 'অভিভাবকের সাথে সম্পর্ক' : 'Relationship with Guardian'}
                      value={relationshipWithGuardian}
                      onChange={e => setRelationshipWithGuardian(e.target.value)}
                      options={[
                        { value: 'Father', label: 'Father (পিতা)' },
                        { value: 'Mother', label: 'Mother (মাতা)' },
                        { value: 'Spouse', label: 'Spouse / Husband / Wife (স্বামী / স্ত্রী)' },
                        { value: 'Son', label: 'Son (পুত্র)' },
                        { value: 'Daughter', label: 'Daughter (কন্যা)' },
                        { value: 'Guardian', label: 'Other Guardian (অন্যান্য অভিভাবক)' }
                      ]}
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'বয়স (বছর) *' : 'Age (Years) *'}
                      type="number"
                      min={0}
                      max={120}
                      value={age}
                      onChange={e => setAge(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div>
                    <Select
                      label={lang === 'bn' ? 'লিঙ্গ *' : 'Gender *'}
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      options={[
                        { value: 'male', label: 'Male (পুরুষ)' },
                        { value: 'female', label: 'Female (মহিলা)' },
                        { value: 'other', label: 'Other (অন্যান্য)' }
                      ]}
                    />
                  </div>

                  <div>
                    <Select
                      label={lang === 'bn' ? 'রক্তের গ্রুপ' : 'Blood Group'}
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                      options={[
                        { value: 'A+', label: 'A+ (A Positive)' },
                        { value: 'A-', label: 'A- (A Negative)' },
                        { value: 'B+', label: 'B+ (B Positive)' },
                        { value: 'B-', label: 'B- (B Negative)' },
                        { value: 'O+', label: 'O+ (O Positive)' },
                        { value: 'O-', label: 'O- (O Negative)' },
                        { value: 'AB+', label: 'AB+ (AB Positive)' },
                        { value: 'AB-', label: 'AB- (AB Negative)' },
                        { value: 'Unknown', label: 'Unknown / Not Tested' }
                      ]}
                    />
                  </div>

                  <div>
                    <Select
                      label={lang === 'bn' ? 'বৈবাহিক অবস্থা' : 'Marital Status'}
                      value={maritalStatus}
                      onChange={e => setMaritalStatus(e.target.value)}
                      options={[
                        { value: 'Married', label: 'Married' },
                        { value: 'Single', label: 'Single / Unmarried' },
                        { value: 'Widowed', label: 'Widowed' },
                        { value: 'Divorced', label: 'Divorced' }
                      ]}
                    />
                  </div>

                  <div>
                    <Select
                      label={lang === 'bn' ? 'সরকারি পরিচয়পত্রের ধরন' : 'Government ID Type'}
                      value={governmentIdType}
                      onChange={e => setGovernmentIdType(e.target.value)}
                      options={[
                        { value: 'Aadhaar Card', label: 'Aadhaar Card (UIDAI)' },
                        { value: 'Voter ID', label: 'Voter ID Card (EPIC)' },
                        { value: 'Ration Card', label: 'Digital Ration Card' },
                        { value: 'PAN Card', label: 'PAN Card' },
                        { value: 'Driving License', label: 'Driving License' },
                        { value: 'Passport', label: 'Passport' },
                        { value: 'None', label: 'No Official ID Available' }
                      ]}
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'সরকারি আইডি নম্বর' : 'Government ID Number'}
                      placeholder="e.g. 1234 5678 9012"
                      value={governmentIdNumber}
                      onChange={e => setGovernmentIdNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Address */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>{lang === 'bn' ? '২. যোগাযোগ ও অফলাইন ঠিকানা' : '2. Contact & Address Resolution'}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ⚡ 100% Offline PIN Resolver
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label={lang === 'bn' ? 'মোবাইল নম্বর *' : 'Primary Mobile Number *'}
                      type="tel"
                      placeholder="10-digit mobile"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'পিন কোড (অফলাইন রেজোলিউশন) *' : 'PIN Code (Offline Lookup) *'}
                      placeholder="e.g. 700001"
                      maxLength={6}
                      value={pinCode}
                      onChange={e => handlePinCodeChange(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'গ্রাম / এলাকা / পাড়া' : 'Village / Area / Para'}
                      placeholder="e.g. Canning Ward 4"
                      value={villageArea}
                      onChange={e => setVillageArea(e.target.value)}
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'ডাকঘর (Post Office)' : 'Post Office'}
                      placeholder="e.g. Canning PO"
                      value={postOffice}
                      onChange={e => setPostOffice(e.target.value)}
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'থানা (Police Station)' : 'Police Station'}
                      placeholder="e.g. Canning PS"
                      value={policeStation}
                      onChange={e => setPoliceStation(e.target.value)}
                    />
                  </div>

                  <div>
                    <Input
                      label={lang === 'bn' ? 'জেলা (District)' : 'District'}
                      placeholder="e.g. South 24 Parganas"
                      value={district}
                      onChange={e => setDistrict(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Baseline Vitals & Real-Time Triage Alert */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <span>{lang === 'bn' ? '৩. প্রাথমিক ভাইটালস ও ট্রায়াজ ঝুঁকি মূল্যায়ন' : '3. Baseline Vitals & Clinical Triage'}</span>
                  </div>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    WHO Guidelines
                  </span>
                </div>

                {/* DYNAMIC TRIAGE ASSESSMENT CARD */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    triageAssessment.level === 'emergency'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      : triageAssessment.level === 'high_risk'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      : triageAssessment.level === 'moderate'
                      ? 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        {triageAssessment.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium">
                      {triageAssessment.action}
                    </p>
                    {triageAssessment.reasons.length > 0 && (
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Triggers: {triageAssessment.reasons.join(' • ')}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-white/60 dark:bg-black/40 border border-current">
                      BMI: {calculatedBmi || '--'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Input
                      label="BP Systolic (mmHg)"
                      type="number"
                      placeholder="120"
                      value={bpSystolic}
                      onChange={e => setBpSystolic(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="BP Diastolic (mmHg)"
                      type="number"
                      placeholder="80"
                      value={bpDiastolic}
                      onChange={e => setBpDiastolic(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Blood Glucose (mg/dL)"
                      type="number"
                      placeholder="e.g. 110"
                      value={bloodSugar}
                      onChange={e => setBloodSugar(e.target.value)}
                    />
                  </div>
                  <div>
                    <Select
                      label="Glucose Test Type"
                      value={sugarType}
                      onChange={e => setSugarType(e.target.value as any)}
                      options={[
                        { value: 'random', label: 'RBS (Random)' },
                        { value: 'fasting', label: 'FBS (Fasting)' },
                        { value: 'post_prandial', label: 'PPBS (Post Prandial)' }
                      ]}
                    />
                  </div>
                  <div>
                    <Input
                      label="SpO2 Oxygen (%)"
                      type="number"
                      placeholder="99"
                      value={spo2}
                      onChange={e => setSpo2(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Pulse Rate (BPM)"
                      type="number"
                      placeholder="72"
                      value={pulseRate}
                      onChange={e => setPulseRate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Temperature (°F)"
                      placeholder="98.4"
                      value={temperature}
                      onChange={e => setTemperature(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Weight (kg)"
                      placeholder="65"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                    />
                  </div>
                </div>

                {/* Chronic Condition Checkboxes */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    {lang === 'bn' ? 'রোগীর বিদ্যমান ক্রনিক রোগসমূহ:' : 'Known Chronic Health Conditions:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDiabetic}
                        onChange={e => setIsDiabetic(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Diabetes</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHypertensive}
                        onChange={e => setIsHypertensive(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Hypertension</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasHeartDisease}
                        onChange={e => setHasHeartDisease(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Cardiac</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAsthma}
                        onChange={e => setHasAsthma(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Asthma / COPD</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 4: Camp Medicine Dispensary Log (বিনামূল্যে ওষুধ বিতরণ) */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white">
                    <Pill className="w-4 h-4 text-emerald-500" />
                    <span>{lang === 'bn' ? '৪. বিনামূল্যে ওষুধ বিতরণ কাউন্টার (Dispensary)' : '4. Camp Medicine Dispensary Log'}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    1-Click Presets
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Quick Add:</span>
                    <button
                      type="button"
                      onClick={() => addQuickMedicine('Paracetamol 500mg', '1 Tab BD after food', 10, 'For Fever & Pain x 5 days')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      + Paracetamol 500mg
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuickMedicine('Pantoprazole 40mg', '1 Tab OD empty stomach', 10, 'For Gastritis x 10 days')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      + Pantoprazole 40mg
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuickMedicine('Amlodipine 5mg', '1 Tab OD morning', 15, 'For BP control x 15 days')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      + Amlodipine 5mg
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuickMedicine('ORS Electrolyte Sachet', 'Dissolve in 1L water', 4, 'Rehydration as needed')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      + ORS Packets
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuickMedicine('Multivitamin & Zinc', '1 Tab OD after lunch', 15, 'Nutritional support')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      + Multivitamin
                    </button>
                  </div>

                  {dispensedMedicines.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {dispensedMedicines.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                            <span className="text-slate-500 block text-[11px]">{m.dosage} • {m.instructions}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              Qty: {m.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeDispensedMedicine(m.id)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: Voice Memo & Audio Note */}
              <OfflineVoiceRecorder
                audioBase64={audioVoiceMemoBase64}
                onAudioChange={url => setAudioVoiceMemoBase64(url)}
                lang={lang}
              />
            </div>

            {/* Right Column (Photo, Signature, Membership, Submit) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Photo & Signature Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>{lang === 'bn' ? 'ছবি ও ডিজিটাল স্বাক্ষর' : 'Photo & Digital Signature'}</span>
                </div>

                <PhotoUploaderWebcam
                  photoUrl={photoBase64}
                  onPhotoChange={url => setPhotoBase64(url)}
                />

                <div className="pt-2">
                  <SignaturePad
                    initialSignature={signatureBase64}
                    onSignatureChange={url => setSignatureBase64(url)}
                  />
                </div>
              </div>

              {/* Membership & Payment */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span>{lang === 'bn' ? 'কার্ড ও ফি কালেকশন' : 'Card Tier & Fee Collection'}</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <Select
                      label={lang === 'bn' ? 'মেম্বারশিপ প্ল্যান' : 'Membership Plan'}
                      value={membershipId}
                      onChange={e => {
                        const newId = e.target.value;
                        setMembershipId(newId);
                        const sel = memberships.find(m => m.id === newId);
                        if (sel && paymentMode !== 'ngo_free_grant') {
                          setFeeCollected(sel.registrationFee);
                        }
                      }}
                      options={memberships.map(m => ({
                        value: m.id,
                        label: `${m.isRecommended ? '★ ' : ''}${m.name} (${formatCurrency(m.registrationFee)})${m.isRecommended ? ' — [RECOMMENDED]' : ''}`
                      }))}
                    />

                    {/* Quick Tier Selection Cards with Strong Black RECOMMENDED Highlight */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                      {memberships.map(m => {
                        const isSelected = m.id === membershipId;
                        const isRec = Boolean(m.isRecommended);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setMembershipId(m.id);
                              if (paymentMode !== 'ngo_free_grant') {
                                setFeeCollected(m.registrationFee);
                              }
                            }}
                            className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white border-black dark:bg-black dark:border-white shadow-xl scale-[1.02]'
                                : isRec
                                ? 'bg-black/5 dark:bg-black/40 border-black/80 dark:border-slate-600 text-slate-900 dark:text-white hover:border-black'
                                : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {isRec && (
                              <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-black text-[9px] uppercase tracking-wider border-2 border-white dark:border-black shadow-md flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                                RECOMMENDED
                              </span>
                            )}
                            <div className="text-xs font-black truncate">{m.name}</div>
                            <div className={`text-xs font-black font-mono mt-0.5 ${isSelected ? 'text-amber-400' : 'text-slate-900 dark:text-teal-400 font-extrabold'}`}>
                              {formatCurrency(m.registrationFee)}
                            </div>
                            <div className={`text-[10px] font-bold truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                              OPD {m.opdDiscount}% • Lab {m.labDiscount}%
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {memberships.find(m => m.id === membershipId)?.isRecommended && (
                      <div className="mt-3 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-black text-white border-2 border-black dark:border-slate-700 shadow-md">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white text-black font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-xs shrink-0">
                            <Star className="w-3 h-3 fill-black text-black shrink-0" />
                            RECOMMENDED
                          </span>
                          <span className="text-xs font-black text-white tracking-tight">
                            {lang === 'bn' ? 'সিস্টেম রিকমেন্ডেড প্ল্যান: সর্বোচ্চ স্বাস্থ্য ও ডায়াগনস্টিক সাশ্রয়' : 'System Recommended Tier: Highest OPD & Diagnostic Savings'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest hidden sm:inline">
                          BEST VALUE
                        </span>
                      </div>
                    )}
                  </div>

                  <Select
                    label={lang === 'bn' ? 'পেমেন্ট মোড' : 'Payment Mode'}
                    value={paymentMode}
                    onChange={e => {
                      const mode = e.target.value as any;
                      setPaymentMode(mode);
                      if (mode === 'ngo_free_grant') setFeeCollected(0);
                    }}
                    options={[
                      { value: 'cash', label: '💵 Cash (নগদ)' },
                      { value: 'upi', label: '📱 UPI / QR Transfer' },
                      { value: 'ngo_free_grant', label: '🤝 100% Free Sponsored (NGO Grant)' },
                      { value: 'card', label: '💳 POS Card' }
                    ]}
                  />

                  <Input
                    label={lang === 'bn' ? 'গৃহীত ফি (টাকা)' : 'Fee Collected (INR)'}
                    type="number"
                    value={feeCollected}
                    onChange={e => setFeeCollected(parseFloat(e.target.value) || 0)}
                    disabled={paymentMode === 'ngo_free_grant'}
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Phone className="w-4 h-4 text-rose-500" />
                  <span>{lang === 'bn' ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}</span>
                </div>

                <div className="space-y-3">
                  <Input
                    label={lang === 'bn' ? 'যোগাযোগকারীর নাম' : 'Contact Person Name'}
                    placeholder="e.g. Sumitra Sen"
                    value={emergencyContactName}
                    onChange={e => setEmergencyContactName(e.target.value)}
                  />

                  <Input
                    label={lang === 'bn' ? 'জরুরি ফোন নম্বর' : 'Emergency Mobile'}
                    placeholder="e.g. 9876543210"
                    value={emergencyContactMobile}
                    onChange={e => setEmergencyContactMobile(e.target.value)}
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-blue-500/20"
                >
                  {lang === 'bn' ? '💾 অফলাইন ফর্ম সংরক্ষণ ও স্লিপ তৈরি' : '💾 Save Patient Form (Offline Safe)'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  className="w-full text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  {lang === 'bn' ? 'ফর্ম রিসেট করুন' : 'Reset Form Fields'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: OFFLINE QUEUE & SYNC HUB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          
          {/* Queue Top Stats & Action Bar */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Offline Registrations Queue</span>
                <Badge variant={pendingCount > 0 ? 'warning' : 'success'}>
                  {pendingCount} Pending Sync
                </Badge>
                {criticalCount > 0 && (
                  <Badge variant="danger">
                    {criticalCount} Critical Triage
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submissions are stored locally in browser storage and can be exported as batch files or synced directly to the cloud database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Batch Import File Input */}
              <input
                ref={batchImportInputRef}
                type="file"
                accept=".json"
                onChange={handleBatchFileSelected}
                className="hidden"
              />

              <Button
                variant="secondary"
                onClick={() => batchImportInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4 text-purple-600" />}
                className="text-xs font-bold"
              >
                Import Batch JSON
              </Button>

              <Button
                variant="secondary"
                onClick={() => OfflineFormService.exportCSV()}
                leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                className="text-xs font-bold"
              >
                Export CSV
              </Button>

              <Button
                variant="secondary"
                onClick={() => OfflineFormService.exportJSON()}
                leftIcon={<Download className="w-4 h-4 text-blue-600" />}
                className="text-xs font-bold"
              >
                Backup JSON
              </Button>

              <Button
                variant="primary"
                onClick={handleSyncAll}
                disabled={isSyncingAll || pendingCount === 0 || !isOnline}
                leftIcon={<UploadCloud className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                {isSyncingAll ? 'Syncing Queue...' : `Sync All (${pendingCount})`}
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  queueFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                onClick={() => setQueueFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  queueFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setQueueFilter('critical')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  queueFilter === 'critical'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                🚨 Critical Triage ({criticalCount})
              </button>
              <button
                onClick={() => setQueueFilter('synced')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  queueFilter === 'synced'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Synced ({syncedCount})
              </button>
            </div>

            <div className="w-full sm:w-72">
              <Input
                placeholder="Search patient name, token, camp..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No submissions found in this filter
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Use the Digital Offline Form to register patients. All submissions will be queued here safely.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubmissions.map(sub => (
                <div
                  key={sub.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {sub.offlineToken}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {sub.data.triageLevel && sub.data.triageLevel !== 'normal' && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            sub.data.triageLevel === 'emergency'
                              ? 'bg-rose-500 text-white'
                              : sub.data.triageLevel === 'high_risk'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-yellow-400 text-slate-900'
                          }`}>
                            {sub.data.triageLevel.toUpperCase()}
                          </span>
                        )}

                        <Badge
                          variant={
                            sub.syncStatus === 'synced'
                              ? 'success'
                              : sub.syncStatus === 'syncing'
                              ? 'blue'
                              : sub.syncStatus === 'failed'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {sub.syncStatus.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {sub.data.photoBase64 ? (
                        <img
                          src={sub.data.photoBase64}
                          alt={sub.data.fullName}
                          className="w-12 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                          {sub.data.gender === 'female' ? '👩' : '👨'}
                        </div>
                      )}

                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {sub.data.fullName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {sub.data.age} Yrs • {sub.data.gender.toUpperCase()} • Blood: <span className="font-bold text-slate-700 dark:text-slate-300">{sub.data.bloodGroup || 'N/A'}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          📱 {sub.data.mobile}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Camp:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {sub.data.campName || 'General Outreach'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {sub.data.paymentMode === 'ngo_free_grant'
                            ? '100% Free Grant'
                            : formatCurrency(sub.data.feeCollected)}
                        </span>
                      </div>
                      {sub.data.vitals && (
                        <div className="flex justify-between">
                          <span>Vitals:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            BP {sub.data.vitals.bpSystolic || '--'}/{sub.data.vitals.bpDiastolic || '--'} • Sugar {sub.data.vitals.bloodSugar || '--'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCampPassModal(sub)}
                        leftIcon={<Printer className="w-3.5 h-3.5" />}
                        className="text-xs font-bold"
                        title="Print Camp Pass or 2-Inch Thermal Slip"
                      >
                        Pass
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSubmission(sub)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        className="text-xs font-bold"
                      >
                        View
                      </Button>
                    </div>

                    {sub.syncStatus !== 'synced' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSyncSingle(sub)}
                        disabled={!isOnline}
                        leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        Sync
                      </Button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Synced</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: PHYSICAL BLANK PAPER FORM (A4 PRINTABLE) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'print' && (
        <PrintableBlankPhysicalForm
          campNamePreset={campName}
          campLocationPreset={campLocation}
          onBack={() => setActiveTab('form')}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: CAMP PASS & THERMAL SLIP PRINT MODAL */}
      {/* ---------------------------------------------------- */}
      {showCampPassModal && (
        <OfflineCampPassModal
          submission={showCampPassModal}
          onClose={() => setShowCampPassModal(null)}
          lang={lang}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: DUPLICATE CHECKER & QR SCANNER */}
      {/* ---------------------------------------------------- */}
      {showDuplicateModal && (
        <OfflineDuplicateScannerModal
          onClose={() => setShowDuplicateModal(false)}
          onSelectExisting={(data) => {
            setFullName(data.fullName || '');
            if (data.guardianName) setGuardianName(data.guardianName);
            if (data.mobile) setMobile(data.mobile);
            if (data.age) setAge(data.age);
            if (data.gender) setGender(data.gender);
            if (data.bloodGroup) setBloodGroup(data.bloodGroup);
            if (data.pinCode) setPinCode(data.pinCode);
            if (data.villageArea) setVillageArea(data.villageArea);
            if (data.district) setDistrict(data.district);
            showToast('success', 'Patient Details Loaded', `Auto-filled form for ${data.fullName}`);
          }}
          lang={lang}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: LIVE CAMP ANALYTICS & TRIAGE AUDIT */}
      {/* ---------------------------------------------------- */}
      {showAnalyticsModal && (
        <OfflineCampAnalyticsModal
          submissions={submissions}
          onClose={() => setShowAnalyticsModal(false)}
          lang={lang}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: SUBMISSION DETAIL & EDIT MODAL */}
      {/* ---------------------------------------------------- */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedSubmission.offlineToken}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedSubmission.data.fullName}
                </h3>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Age / Gender:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedSubmission.data.age} Y / {selectedSubmission.data.gender}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Mobile:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedSubmission.data.mobile}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Address:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedSubmission.data.villageArea || selectedSubmission.data.district}, {selectedSubmission.data.pinCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Camp Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedSubmission.data.campName || 'Field Camp'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Triage Level:</span>
                <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                  {selectedSubmission.data.triageLevel || 'NORMAL'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Fee:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(selectedSubmission.data.feeCollected)} ({selectedSubmission.data.paymentMode})
                </span>
              </div>
            </div>

            {selectedSubmission.data.dispensedMedicines && selectedSubmission.data.dispensedMedicines.length > 0 && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-200">Dispensed Medicines:</span>
                <div className="space-y-1">
                  {selectedSubmission.data.dispensedMedicines.map((m, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{m.name} ({m.dosage})</span>
                      <span className="font-mono font-bold">Qty: {m.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCampPassModal(selectedSubmission);
                  setSelectedSubmission(null);
                }}
                leftIcon={<Printer className="w-4 h-4" />}
                className="text-xs font-bold"
              >
                Print Slip / Pass
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSubmission(null)}
                  className="text-xs font-bold"
                >
                  Close
                </Button>

                {selectedSubmission.syncStatus !== 'synced' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleSyncSingle(selectedSubmission);
                      setSelectedSubmission(null);
                    }}
                    disabled={!isOnline}
                    leftIcon={<UploadCloud className="w-4 h-4" />}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Sync to Live System
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
