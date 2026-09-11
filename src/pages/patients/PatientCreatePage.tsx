import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientService, CreateFamilyMemberInput, CreatePatientResult } from '../../services/patientService';
import { StorageService } from '../../services/storage';
import { MembershipTierService } from '../../services/membershipTierService';
import { DoctorMasterService, DoctorMasterItem } from '../../services/doctorMasterService';
import { BillService } from '../../services/billService';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { PhotoUploaderWebcam } from '../../components/common/PhotoUploaderWebcam';
import { AddressAutoPopupModal } from '../../components/common/AddressAutoPopupModal';
import { AddressLookupService } from '../../services/addressLookupService';
import { CR80CardFront } from '../../components/card/CR80CardFront';
import { DuplicatePatientWarningModal } from '../../components/patients/DuplicatePatientWarningModal';
import { PatientRegistrationBillSlipModal } from '../../components/patients/PatientRegistrationBillSlipModal';
import { useKeyboardFormNavigation } from '../../hooks/useKeyboardFormNavigation';
import { calculateAge, formatCurrency, formatDate } from '../../utils/formatters';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { generatePatientId, generateCardNumber } from '../../utils/idGenerator';
import { DEFAULT_CARD_DESIGN, BLOOD_GROUP_OPTIONS } from '../../constants/defaults';
import { HealthCard, Patient, CardThemePreset, Membership, CompanyProfile, BloodGroupStatus } from '../../types';
import {
  UserPlus,
  ArrowLeft,
  Heart,
  MapPin,
  PhoneCall,
  Shield,
  Wallet,
  Sparkles,
  Users,
  Plus,
  Trash2,
  CreditCard,
  Printer,
  CheckCircle2,
  Stethoscope,
  Building,
  UserCheck,
  Award,
  Activity,
  ChevronRight,
  AlertTriangle,
  FileText,
  HelpCircle,
  Clock,
  Zap,
  Info,
  Check,
  ShieldCheck
} from 'lucide-react';

interface FamilyMemberFormState extends CreateFamilyMemberInput {
  id: string;
}

export const PatientCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const company: CompanyProfile = StorageService.getCompanyProfile();
  const regSettings = company.registrationSettings || {
    enableClinicalTriageDefault: false,
    maxIncludedFamilyMembers: 5,
    additionalMemberFee: 299,
    cardIssuanceDefault: false
  };

  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getActiveMemberships());
  const existingPatients = StorageService.getPatients();
  const existingCards = StorageService.getCards();
  const doctors = DoctorMasterService.getAllDoctors().filter((d: DoctorMasterItem) => d.status === 'active');

  useEffect(() => {
    const unsub = MembershipTierService.subscribeToTiers((allTiers) => {
      setMemberships(allTiers.filter(m => m.status === 'active'));
    });
    return () => unsub();
  }, []);

  const previewNextPatientId = useMemo(() => generatePatientId(existingPatients.map(p => p.id)), [existingPatients]);
  const previewNextCardNumber = useMemo(() => generateCardNumber(existingCards.map(c => c.cardNumber)), [existingCards]);

  // Keyboard navigation hook
  const { formContainerRef, handleKeyDown } = useKeyboardFormNavigation();

  // SECTION 1: Personal Identity
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number>(32);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Unknown / Not Known');
  const [photoUrl, setPhotoUrl] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Married');
  const [occupation, setOccupation] = useState('Professional / Business');
  const [governmentIdType, setGovernmentIdType] = useState('Aadhaar Card');
  const [governmentIdNumber, setGovernmentIdNumber] = useState('');

  // SECTION 2: Address
  const [villageArea, setVillageArea] = useState('Medical Square Area');
  const [postOffice, setPostOffice] = useState('Central P.O.');
  const [policeStation, setPoliceStation] = useState('South P.S.');
  const [district, setDistrict] = useState('Malda');
  const [stateVal, setStateVal] = useState('West Bengal');
  const [pinCode, setPinCode] = useState('732142');
  const [fullAddress, setFullAddress] = useState('');
  const [isAddressPopupOpen, setIsAddressPopupOpen] = useState(false);

  // Address PIN Code Auto-Resolve
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
        showToast('info', 'Address Auto-Resolved', `Matched ${best.cityArea}, ${best.district}`);
      } else {
        AddressLookupService.resolvePinCodeAsync(clean).then(res => {
          if (res.length > 0) {
            const best = res[0];
            setVillageArea(best.cityArea);
            setPostOffice(best.postOffice);
            setPoliceStation(best.policeStation);
            setDistrict(best.district);
            setStateVal(best.state);
            showToast('info', 'Postal PIN Matched', `${best.cityArea}, ${best.district}`);
          }
        });
      }
    }
  };

  // SECTION 3: Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');
  const [emergencyMobile, setEmergencyMobile] = useState('');

  // SECTION 4: Clinical Triage & Measurements (Configurable ON/OFF)
  const [enableClinicalTriage, setEnableClinicalTriage] = useState<boolean>(() => {
    return regSettings.enableClinicalTriageDefault;
  });
  const [bpSystolic, setBpSystolic] = useState('120');
  const [bpDiastolic, setBpDiastolic] = useState('80');
  const [pulse, setPulse] = useState('74');
  const [spo2, setSpo2] = useState('99');
  const [temperature, setTemperature] = useState('98.4');
  const [respiratoryRate, setRespiratoryRate] = useState('16');
  const [weightKg, setWeightKg] = useState('68');
  const [heightCm, setHeightCm] = useState('172');
  const [rbs, setRbs] = useState('105');
  const [allergies, setAllergies] = useState('None');
  const [chronicConditions, setChronicConditions] = useState('None');
  const [importantNotes, setImportantNotes] = useState('');

  // BMI Calculation
  const bmiData = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (w > 0 && h > 0) {
      const val = parseFloat((w / (h * h)).toFixed(1));
      let category = 'Normal';
      let color = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300';
      if (val < 18.5) {
        category = 'Underweight';
        color = 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300';
      } else if (val >= 25 && val < 30) {
        category = 'Overweight';
        color = 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-300';
      } else if (val >= 30) {
        category = 'Obese';
        color = 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-300';
      }
      return { val, category, color };
    }
    return null;
  }, [weightKg, heightCm]);

  // SECTION 5: Referral Details
  const [referralSource, setReferralSource] = useState<'none' | 'doctor' | 'existing_cardholder' | 'staff' | 'camp' | 'agent' | 'other'>('none');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [customDoctorName, setCustomDoctorName] = useState('');
  const [doctorClinic, setDoctorClinic] = useState('');
  const [referralCardNumber, setReferralCardNumber] = useState('');
  const [referralPersonName, setReferralPersonName] = useState('');
  const [referralContact, setReferralContact] = useState('');
  const [referralCampName, setReferralCampName] = useState('');
  const [referralAgentId, setReferralAgentId] = useState('');
  const [referralNotes, setReferralNotes] = useState('');

  // SECTION 6: Family Health Shield & Dependents
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberFormState[]>([]);
  const [familyName, setFamilyName] = useState('');

  const maxIncludedMembers = regSettings.maxIncludedFamilyMembers || 5;
  const additionalMemberFee = regSettings.additionalMemberFee || 299;

  // SECTION 7: Smart Health Card Issuance (OFF by default)
  const [issueHealthCard, setIssueHealthCard] = useState<boolean>(() => {
    return regSettings.cardIssuanceDefault;
  });
  const [membershipId, setMembershipId] = useState(() => StorageService.getRecommendedMembership()?.id || StorageService.getActiveMemberships()[0]?.id || 'mem_gold_03');
  const [cardPreset, setCardPreset] = useState<CardThemePreset>('royal_gold');
  const [cardMaterial, setCardMaterial] = useState<'gloss' | 'matte' | 'metallic' | 'hologram'>('metallic');
  const [initialDeposit, setInitialDeposit] = useState('0');

  // Billing & Payment Configuration
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'netbanking' | 'wallet'>('cash');
  const [portalPassword, setPortalPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal & Result State
  const [createdResult, setCreatedResult] = useState<CreatePatientResult | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Duplicate Protection State
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [matchedDuplicatePatient, setMatchedDuplicatePatient] = useState<Patient | null>(null);
  const [matchedDuplicateCard, setMatchedDuplicateCard] = useState<HealthCard | undefined>(undefined);
  const [duplicateBypassConfirmed, setDuplicateBypassConfirmed] = useState(false);

  // Auto-sync fallback if membershipId was deactivated
  useEffect(() => {
    if (memberships.length > 0 && !memberships.some(m => m.id === membershipId)) {
      const best = memberships.find(m => m.isRecommended) || memberships[0];
      if (best) setMembershipId(best.id);
    }
  }, [memberships, membershipId]);

  const selectedMembership = useMemo(() => {
    return memberships.find(m => m.id === membershipId) || memberships[0];
  }, [memberships, membershipId]);

  // Real-time calculation of billing breakdown
  const billCalculation = useMemo(() => {
    return BillService.calculateCharges({
      isCardIssued: issueHealthCard,
      membershipPrice: selectedMembership?.registrationFee || 0,
      familyMembersCount: familyMembers.length,
      maxIncludedMembers,
      additionalMemberFee,
      discountAmount
    });
  }, [issueHealthCard, selectedMembership, familyMembers.length, maxIncludedMembers, additionalMemberFee, discountAmount]);

  // Check for duplicate mobile number in real time
  const detectedDuplicate = useMemo(() => {
    const cleanMobile = mobile.trim();
    if (cleanMobile.length >= 10 && !duplicateBypassConfirmed) {
      const match = existingPatients.find(p => p.mobile === cleanMobile && !p.isDeleted);
      if (match) {
        const cardMatch = existingCards.find(c => c.patientId === match.id && c.status === 'active');
        return { patient: match, card: cardMatch };
      }
    }
    return null;
  }, [mobile, existingPatients, existingCards, duplicateBypassConfirmed]);

  const handleMembershipChange = (newMemId: string) => {
    setMembershipId(newMemId);
    const m = memberships.find(mem => mem.id === newMemId);
    if (m) {
      if (m.slug === 'platinum') setCardPreset('platinum_elite');
      else if (m.slug === 'gold') setCardPreset('royal_gold');
      else if (m.slug === 'silver') setCardPreset('emerald_health');
      else setCardPreset('executive_navy');
    }
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      setAge(calculateAge(val));
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = parseInt(e.target.value, 10) || 0;
    setAge(a);
    if (a > 0) {
      const year = new Date().getFullYear() - a;
      setDob(`${year}-01-01`);
    }
  };

  // Add Family Member
  const addFamilyMemberRow = () => {
    const newId = `fam_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setFamilyMembers(prev => [
      ...prev,
      {
        id: newId,
        fullName: '',
        relationship: 'Spouse',
        dob: '1995-01-01',
        age: 28,
        gender: 'female',
        bloodGroup: 'Unknown / Not Known',
        mobile: '',
        photoUrl: '',
        allergies: 'None',
        chronicConditions: 'None',
        issueCard: issueHealthCard
      }
    ]);
  };

  const updateFamilyMember = (id: string, field: keyof FamilyMemberFormState, value: any) => {
    setFamilyMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers(prev => prev.filter(m => m.id !== id));
  };

  // Reset form for "Register Next Patient"
  const handleRegisterAnother = () => {
    setFullName('');
    setDob('');
    setAge(30);
    setGender('male');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setBloodGroup('Unknown / Not Known');
    setPhotoUrl('');
    setFamilyMembers([]);
    setDiscountAmount(0);
    setDuplicateBypassConfirmed(false);
    setCreatedResult(null);
    setIsSuccessModalOpen(false);
  };

  // Primary live preview card
  const livePreviewCard: HealthCard = useMemo(() => {
    const now = new Date();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (selectedMembership?.validityMonths || 12));

    return {
      id: 'preview_card',
      cardNumber: previewNextCardNumber,
      patientId: previewNextPatientId,
      membershipId: selectedMembership?.id || 'mem_gold',
      issueDate: now.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      status: 'active',
      cvv: '849',
      verificationCode: 'VER-8942-1049',
      designConfig: {
        ...DEFAULT_CARD_DESIGN,
        preset: cardPreset,
        material: cardMaterial,
        showFamilyBadge: familyMembers.length > 0
      },
      statusHistory: [],
      renewedCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  }, [previewNextCardNumber, previewNextPatientId, selectedMembership, cardPreset, cardMaterial, familyMembers.length]);

  const livePreviewPatient: Patient = useMemo(() => {
    return {
      id: previewNextPatientId,
      fullName: fullName || 'Patient Full Name',
      dob: dob || '1992-05-15',
      age: age || 34,
      gender,
      mobile: mobile || '9830012345',
      whatsapp: whatsapp || mobile,
      bloodGroup: bloodGroup || 'Unknown / Not Known',
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      address: {
        villageArea,
        postOffice,
        policeStation,
        district,
        state: stateVal,
        pinCode,
        fullAddress: fullAddress || `${villageArea}, ${district}, ${stateVal} - ${pinCode}`
      },
      emergencyContact: {
        name: emergencyName || 'Primary Contact',
        relationship: emergencyRelation,
        mobile: emergencyMobile || mobile
      },
      medicalInfo: {
        allergies,
        chronicConditions,
        importantNotes,
        bloodGroup
      },
      portalPassword,
      walletId: 'wal_preview',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Front Desk'
    };
  }, [
    previewNextPatientId, fullName, dob, age, gender, mobile, whatsapp, bloodGroup, photoUrl,
    villageArea, postOffice, policeStation, district, stateVal, pinCode, fullAddress,
    emergencyName, emergencyRelation, emergencyMobile, allergies, chronicConditions, importantNotes, portalPassword
  ]);

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !mobile.trim()) {
      showToast('error', 'Required Fields Missing', 'Please enter primary patient full name and mobile number.');
      return;
    }

    // Duplicate Check Warning
    if (detectedDuplicate && !duplicateBypassConfirmed) {
      setMatchedDuplicatePatient(detectedDuplicate.patient);
      setMatchedDuplicateCard(detectedDuplicate.card);
      setDuplicateWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Build Referral Payload
      let refPayload: any = { source: referralSource };
      if (referralSource === 'doctor') {
        const doc = doctors.find((d: DoctorMasterItem) => d.id === selectedDoctorId);
        refPayload.name = doc ? `Dr. ${doc.name} (${doc.speciality})` : customDoctorName;
        refPayload.doctorId = selectedDoctorId;
        refPayload.details = doctorClinic || (doc ? `${doc.department} - Reg: ${doc.regNumber}` : '');
      } else if (referralSource === 'existing_cardholder') {
        refPayload.name = referralPersonName;
        refPayload.cardNo = referralCardNumber;
        refPayload.contact = referralContact;
      } else if (referralSource === 'camp') {
        refPayload.name = referralCampName;
        refPayload.details = 'Community Outreach Health Camp';
      } else if (referralSource === 'agent') {
        refPayload.name = referralPersonName || `Agent ID: ${referralAgentId}`;
        refPayload.details = referralAgentId;
      } else if (referralSource === 'other' || referralSource === 'staff') {
        refPayload.name = referralPersonName;
        refPayload.contact = referralContact;
        refPayload.notes = referralNotes;
      }

      // Build Clinical Vitals (only if triage enabled)
      const vitalsPayload = enableClinicalTriage
        ? {
            bp: bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic} mmHg` : undefined,
            pulse: parseInt(pulse, 10) || undefined,
            spo2: parseInt(spo2, 10) || undefined,
            temperature: temperature ? `${temperature} °F` : undefined,
            respiratoryRate: parseInt(respiratoryRate, 10) || undefined,
            weight: parseFloat(weightKg) || undefined,
            height: parseFloat(heightCm) || undefined,
            bmi: bmiData?.val,
            rbs: rbs ? `${rbs} mg/dL` : undefined
          }
        : undefined;

      // Filter valid family members
      const validFamilyMembers = familyMembers.filter(m => m.fullName.trim().length > 0);

      const bloodStatus: BloodGroupStatus = bloodGroup.toLowerCase().includes('unknown')
        ? 'unknown'
        : bloodGroup.toLowerCase().includes('not tested')
        ? 'not_tested'
        : 'unverified';

      const result = PatientService.createPatient({
        fullName: fullName.trim(),
        dob: dob || '1990-01-01',
        age: age || 35,
        gender,
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim() || mobile.trim(),
        email: email.trim(),
        bloodGroup,
        bloodGroupStatus: bloodStatus,
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        address: {
          villageArea,
          postOffice,
          policeStation,
          district,
          state: stateVal,
          pinCode,
          fullAddress: fullAddress || `${villageArea}, ${postOffice}, ${district}, ${stateVal} - ${pinCode}`
        },
        emergencyContact: {
          name: emergencyName.trim() || 'Family Member',
          relationship: emergencyRelation,
          mobile: emergencyMobile.trim() || mobile.trim()
        },
        medicalInfo: {
          allergies: enableClinicalTriage ? allergies : 'None',
          chronicConditions: enableClinicalTriage ? chronicConditions : 'None',
          importantNotes,
          emergencyNotes: '',
          bloodGroup
        },
        maritalStatus,
        occupation,
        governmentIdType,
        governmentIdNumber,
        referral: referralSource !== 'none' ? refPayload : undefined,
        vitalsAtReg: vitalsPayload,
        issueHealthCard,
        membershipId: issueHealthCard ? membershipId : undefined,
        initialDeposit: parseFloat(initialDeposit) || 0,
        discountAmount: billCalculation.discountAmount,
        paidAmount: billCalculation.netPayable,
        paymentMethod,
        cardDesignPreset: cardPreset,
        cardMaterial,
        familyName: familyName.trim() || `${fullName.trim()}'s Family Shield`,
        familyMembers: validFamilyMembers
      });

      triggerCelebrationFireworks();
      setCreatedResult(result);
      setIsSuccessModalOpen(true);

      const cardMsg = result.card ? `Health Card ${result.card.cardNumber} issued.` : 'Registered without Health Card.';
      showToast(
        'success',
        'Registration & Enrollment Successful!',
        `Patient ${result.patient.fullName} (${result.patient.id}) registered. ${cardMsg} Bill ${result.bill.billNumber} created.`
      );
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message || 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Patients Directory
            </button>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 font-bold">New Registration & Health Card</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>New Patient Registration & Smart Health Card Enrollment</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Fast, keyboard-first registration with smart blood group tracking, Family Health Shield, and instant printable bill/slip.
          </p>
        </div>

        {/* Keyboard Navigation Tip Badge */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>Keyboard-First: Press <strong>Enter ↵</strong> to jump fields</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/offline-form')}
            className="text-xs"
          >
            Offline / Camp Form
          </Button>
        </div>
      </div>

      {/* Real-time Inline Duplicate Warning Banner */}
      {detectedDuplicate && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-500/60 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Possible Duplicate Patient Match Found
              </h4>
              <p className="text-xs text-slate-700 dark:text-amber-200/90">
                Mobile number <strong className="font-mono">{mobile}</strong> is already registered to{' '}
                <strong className="text-slate-900 dark:text-white">{detectedDuplicate.patient.fullName}</strong> (ID:{' '}
                <span className="font-mono">{detectedDuplicate.patient.id}</span>
                {detectedDuplicate.card ? ` • Card: ${detectedDuplicate.card.cardNumber}` : ''}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setMatchedDuplicatePatient(detectedDuplicate.patient);
                setMatchedDuplicateCard(detectedDuplicate.card);
                setDuplicateWarningOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all border border-amber-300 dark:border-amber-700"
            >
              Review Existing Record
            </button>
            <button
              type="button"
              onClick={() => setDuplicateBypassConfirmed(true)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-300 dark:border-slate-700"
            >
              Same Family (Dismiss)
            </button>
          </div>
        </div>
      )}

      {/* Main Registration Layout: Left Form + Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Form */}
        <form
          ref={formContainerRef as any}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
          className="lg:col-span-8 space-y-6"
        >
          {/* TWO CLEAR REGISTRATION PATHWAYS (OPTION A vs OPTION B) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                  Hospital Patient Intake • Two Clear Options
                </span>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Choose Registration Pathway</span>
                </h2>
              </div>
              <Badge variant={issueHealthCard ? 'blue' : 'neutral'}>
                {issueHealthCard ? 'Option B • Health Card: ON' : 'Option A • Health Card: OFF (Non-Card Patient)'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A Card: Direct Patient Registration */}
              <div
                onClick={() => setIssueHealthCard(false)}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                  !issueHealthCard
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      !issueHealthCard ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      A
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>OPTION A: Direct Hospital Registration</span>
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        Health Card: OFF • Standard Pricing
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    !issueHealthCard ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {!issueHealthCard && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                  Register patient directly with a permanent Patient ID. Eligible immediately for normal Doctor Appointments, OPD, Diagnostics, Pharmacy, and Billing at standard hospital charges without purchasing a Health Card.
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Card Purchase:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">₹0 (Zero Card Fees)</span>
                </div>
              </div>

              {/* Option B Card: Patient + Health Card Registration */}
              <div
                onClick={() => setIssueHealthCard(true)}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                  issueHealthCard
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-600/20'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      issueHealthCard ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      B
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>OPTION B: Patient + Health Card</span>
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                        Health Card: ON • Tier Benefits & Discounts
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    issueHealthCard ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {issueHealthCard && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                  Enroll in an active Health Card plan. Unlocks OPD & Lab discounts, Pharmacy benefits, and Family Health Shield covering up to 5 family members under one primary membership.
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Card Plan:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {selectedMembership?.name} ({formatCurrency(selectedMembership?.registrationFee || 0)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. PRIMARY PATIENT IDENTITY */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center justify-center">1</span>
                <span>Primary Patient Registration</span>
              </h3>
              <Badge variant="blue">Primary Holder</Badge>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <PhotoUploaderWebcam photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />
                <span className="text-[10px] text-slate-400 text-center font-medium">Card Photo / Live Webcam</span>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <Input
                  label="Patient Name *"
                  placeholder="e.g. Rajesh Mukherjee"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Date of Birth *"
                    type="date"
                    value={dob}
                    onChange={handleDobChange}
                    required
                  />
                  <Input
                    label="Age (Yrs) *"
                    type="number"
                    value={age || ''}
                    onChange={handleAgeChange}
                    required
                  />
                </div>

                <Select
                  label="Gender *"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]}
                />

                {/* Smart Blood Group Selector (Non-mandatory, Unknown allowed) */}
                <div>
                  <Select
                    label="Blood Group (Optional)"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    options={BLOOD_GROUP_OPTIONS.map(opt => ({
                      value: opt.value,
                      label: opt.label
                    }))}
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    {bloodGroup.includes('Unknown') || bloodGroup.includes('Not Tested')
                      ? '✓ Not forced. Can be verified & updated after laboratory testing.'
                      : '✓ Selected blood group will be stored with verification audit trail.'}
                  </span>
                </div>

                <Input
                  label="Primary Mobile Number *"
                  placeholder="e.g. 9830012345"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />

                <Input
                  label="WhatsApp Number (Optional)"
                  placeholder="e.g. 9830012345"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  helperText="For digital card & report delivery"
                />

                <Input
                  label="Email Address (Optional)"
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Select
                  label="Marital Status"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  options={[
                    { value: 'Married', label: 'Married' },
                    { value: 'Single', label: 'Single' },
                    { value: 'Divorced', label: 'Divorced' },
                    { value: 'Widowed', label: 'Widowed' }
                  ]}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Govt ID Type"
                    value={governmentIdType}
                    onChange={(e) => setGovernmentIdType(e.target.value)}
                    options={[
                      { value: 'Aadhaar Card', label: 'Aadhaar Card' },
                      { value: 'Voter ID', label: 'Voter ID' },
                      { value: 'PAN Card', label: 'PAN Card' },
                      { value: 'Driving License', label: 'Driving License' },
                      { value: 'Passport', label: 'Passport' },
                      { value: 'Ration Card', label: 'Ration Card' },
                      { value: 'None', label: 'None' }
                    ]}
                  />
                  <Input
                    label="Govt ID Number"
                    placeholder="XXXX-XXXX-XXXX"
                    value={governmentIdNumber}
                    onChange={(e) => setGovernmentIdNumber(e.target.value)}
                  />
                </div>

                <Input
                  label="Occupation"
                  placeholder="e.g. Business / Service"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. POSTAL ADDRESS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center justify-center">2</span>
                <span>Permanent Address Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressPopupOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5" /> PIN Auto-Lookup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="PIN Code *"
                placeholder="e.g. 732142"
                value={pinCode}
                onChange={(e) => handlePinCodeChange(e.target.value)}
                helperText="Auto-populates district and state"
                required
              />
              <Input
                label="Village / City / Area"
                value={villageArea}
                onChange={(e) => setVillageArea(e.target.value)}
              />
              <Input
                label="Post Office"
                value={postOffice}
                onChange={(e) => setPostOffice(e.target.value)}
              />
              <Input
                label="Police Station"
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
              />
              <Input
                label="District *"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
              />
              <Input
                label="State *"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                required
              />
              <div className="sm:col-span-3">
                <Input
                  label="Street / House No / Full Address Line"
                  placeholder="e.g. Holding No. 42, Medical Expressway, Ward No. 7"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. EMERGENCY CONTACT */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center justify-center">3</span>
                <span>Emergency Contact Person</span>
              </h3>
              <Badge variant="neutral">SOS Contact</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Contact Name"
                placeholder="e.g. Sunita Mukherjee"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
              <Select
                label="Relationship"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                options={[
                  { value: 'Spouse', label: 'Spouse' },
                  { value: 'Parent', label: 'Parent' },
                  { value: 'Son', label: 'Son' },
                  { value: 'Daughter', label: 'Daughter' },
                  { value: 'Brother', label: 'Brother' },
                  { value: 'Sister', label: 'Sister' },
                  { value: 'Relative', label: 'Relative' },
                  { value: 'Friend', label: 'Friend' }
                ]}
              />
              <Input
                label="Emergency Mobile"
                placeholder="e.g. 9830012345"
                value={emergencyMobile}
                onChange={(e) => setEmergencyMobile(e.target.value)}
              />
            </div>
          </div>

          {/* 4. CLINICAL TRIAGE & PHYSICAL MEASUREMENTS (Configurable ON/OFF) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 text-xs font-black flex items-center justify-center">4</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                  <span>Clinical Triage & Physical Measurements</span>
                </h3>
              </div>

              {/* Central / In-Form ON/OFF Switch */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">
                  {enableClinicalTriage ? 'Section: ON' : 'Section: OFF (Default)'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableClinicalTriage}
                    onChange={(e) => setEnableClinicalTriage(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>

            {enableClinicalTriage ? (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Blood Pressure (mmHg)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Sys"
                        value={bpSystolic}
                        onChange={(e) => setBpSystolic(e.target.value)}
                      />
                      <span className="text-slate-400 font-bold">/</span>
                      <Input
                        placeholder="Dia"
                        value={bpDiastolic}
                        onChange={(e) => setBpDiastolic(e.target.value)}
                      />
                    </div>
                  </div>

                  <Input
                    label="Pulse (bpm)"
                    type="number"
                    placeholder="72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                  />

                  <Input
                    label="SpO₂ (%)"
                    type="number"
                    placeholder="99"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                  />

                  <Input
                    label="Temperature (°F)"
                    placeholder="98.4"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />

                  <Input
                    label="Respiratory Rate (/min)"
                    type="number"
                    placeholder="16"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                  />

                  <Input
                    label="Height (cm)"
                    type="number"
                    placeholder="172"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />

                  <Input
                    label="Weight (kg)"
                    type="number"
                    placeholder="68"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />

                  <Input
                    label="RBS (mg/dL)"
                    placeholder="105"
                    value={rbs}
                    onChange={(e) => setRbs(e.target.value)}
                  />
                </div>

                {bmiData && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Calculated Body Mass Index (BMI):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {bmiData.val} kg/m²
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bmiData.color}`}>
                        {bmiData.category}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Known Drug / Environmental Allergies"
                    placeholder="None or list allergies"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                  />
                  <Input
                    label="Known Chronic Medical Conditions"
                    placeholder="None or e.g. Diabetes, Hypertension"
                    value={chronicConditions}
                    onChange={(e) => setChronicConditions(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60 text-center text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Clinical Measurements Section is currently <strong>OFF</strong>.
                </p>
                <p className="text-[11px] text-slate-400">
                  Staff is not required to take clinical vitals. Patient registration and Health Card enrollment will proceed normally.
                </p>
              </div>
            )}
          </div>

          {/* 5. REFERRAL DETAILS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center justify-center">5</span>
                <span>Referral Channel & Recommending Entity</span>
              </h3>
              <Badge variant="neutral">Outreach Attribution</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Referral Source"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value as any)}
                options={[
                  { value: 'none', label: 'Direct / Walk-in Patient' },
                  { value: 'doctor', label: 'Registered Doctor / Medical Practitioner' },
                  { value: 'existing_cardholder', label: 'Existing Health Cardholder Referral' },
                  { value: 'camp', label: 'Community Health Camp Outreach' },
                  { value: 'agent', label: 'Healthcare Field Agent / Partner' },
                  { value: 'staff', label: 'LABMEDIX Staff Referral' },
                  { value: 'other', label: 'Other Social / Digital Channel' }
                ]}
              />

              {referralSource === 'doctor' && (
                <Select
                  label="Select Registered Doctor"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  options={[
                    { value: '', label: '-- Choose from Doctor Master --' },
                    ...doctors.map(d => ({
                      value: d.id,
                      label: `Dr. ${d.name} (${d.speciality || 'General'})`
                    }))
                  ]}
                />
              )}

              {referralSource === 'existing_cardholder' && (
                <>
                  <Input
                    label="Referrer Card Number"
                    placeholder="LHC-2026-XXXXXX"
                    value={referralCardNumber}
                    onChange={(e) => setReferralCardNumber(e.target.value)}
                  />
                  <Input
                    label="Referrer Full Name"
                    placeholder="e.g. Amitava Sen"
                    value={referralPersonName}
                    onChange={(e) => setReferralPersonName(e.target.value)}
                  />
                </>
              )}

              {referralSource === 'camp' && (
                <Input
                  label="Health Camp Name / Location"
                  placeholder="e.g. Malda Mega Health Camp 2026"
                  value={referralCampName}
                  onChange={(e) => setReferralCampName(e.target.value)}
                />
              )}

              {referralSource === 'agent' && (
                <>
                  <Input
                    label="Agent ID / Code"
                    placeholder="e.g. AGT-WB-09"
                    value={referralAgentId}
                    onChange={(e) => setReferralAgentId(e.target.value)}
                  />
                  <Input
                    label="Agent Name"
                    placeholder="e.g. Swapan Roy"
                    value={referralPersonName}
                    onChange={(e) => setReferralPersonName(e.target.value)}
                  />
                </>
              )}
            </div>
          </div>

          {/* 6. FAMILY HEALTH SHIELD & DEPENDENTS (Allowance: 5 Included) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center">6</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                  <span>Family Health Shield & Dependent Enrollment</span>
                </h3>
              </div>

              {issueHealthCard ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black font-mono border transition-all ${
                      familyMembers.length <= maxIncludedMembers
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                        : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                    }`}
                  >
                    Family Members: {familyMembers.length} / {maxIncludedMembers}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFamilyMemberRow}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Add Dependent
                  </Button>
                </div>
              ) : (
                <Badge variant="neutral">Health Card: OFF</Badge>
              )}
            </div>

            {!issueHealthCard ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                <Users className="w-7 h-7 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Family Health Shield Inactive (Health Card: OFF)
                </h4>
                <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                  Family Health Shield is an optional benefit of Health Card membership. The patient is registering directly as a <strong>Non-Card Patient</strong>. Family members can be registered independently as direct patients, or linked to a Family Health Shield if the patient purchases a Health Card later.
                </p>
              </div>
            ) : (
              <>
                {/* Notice at exact limit (5/5) */}
                {familyMembers.length === maxIncludedMembers && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Maximum included family-member limit reached ({maxIncludedMembers}/{maxIncludedMembers} Covered).</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                      Standard Allowance: 100% Free
                    </span>
                  </div>
                )}

                {/* Surcharge Notification when > 5 members */}
                {familyMembers.length > maxIncludedMembers && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Maximum {maxIncludedMembers} family members are included in this Health Card plan.</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-amber-200/90 leading-relaxed">
                      You have added <strong>{familyMembers.length} family members</strong>. The first{' '}
                      <strong>{maxIncludedMembers} dependents</strong> are included at ₹0. Additional dependents incur the configured charge of{' '}
                      <strong>₹{additionalMemberFee} each</strong>.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/60 font-mono text-xs">
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80">
                        <span className="text-[10px] text-slate-500 block uppercase font-sans">Included Members</span>
                        <span className="font-bold text-emerald-600">{maxIncludedMembers}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80">
                        <span className="text-[10px] text-slate-500 block uppercase font-sans">Additional Members</span>
                        <span className="font-bold text-amber-600">{familyMembers.length - maxIncludedMembers}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80">
                        <span className="text-[10px] text-slate-500 block uppercase font-sans">Additional Member Fee</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{(familyMembers.length - maxIncludedMembers) * additionalMemberFee}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80">
                        <span className="text-[10px] text-slate-500 block uppercase font-sans">Total Net Payable</span>
                        <span className="font-bold text-blue-600">{formatCurrency(billCalculation.netPayable)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {familyMembers.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Family Members: 0 / {maxIncludedMembers} Added
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Primary cardholder can include spouse, children, and parents under the same Family Health Shield.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFamilyMemberRow}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      className="mt-2 text-xs"
                    >
                      Add Dependent
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {familyMembers.map((member, index) => (
                      <div
                        key={member.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold text-xs flex items-center justify-center font-mono">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              Family Member {index + 1}{' '}
                              {index < maxIncludedMembers ? (
                                <span className="text-emerald-600 font-normal text-[11px]">(Included in standard allowance)</span>
                              ) : (
                                <span className="text-amber-600 font-bold text-[11px]">(+₹{additionalMemberFee} Configured Charge)</span>
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFamilyMember(member.id)}
                            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors"
                            title="Remove Dependent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <Input
                            label="Full Name *"
                            placeholder="e.g. Priya Mukherjee"
                            value={member.fullName}
                            onChange={(e) => updateFamilyMember(member.id, 'fullName', e.target.value)}
                            required
                          />

                          <Select
                            label="Relationship *"
                            value={member.relationship}
                            onChange={(e) => updateFamilyMember(member.id, 'relationship', e.target.value)}
                            options={[
                              { value: 'Spouse', label: 'Spouse' },
                              { value: 'Son', label: 'Son' },
                              { value: 'Daughter', label: 'Daughter' },
                              { value: 'Father', label: 'Father' },
                              { value: 'Mother', label: 'Mother' },
                              { value: 'Brother', label: 'Brother' },
                              { value: 'Sister', label: 'Sister' },
                              { value: 'Other Dependent', label: 'Other' }
                            ]}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              label="Age"
                              type="number"
                              placeholder="28"
                              value={member.age || ''}
                              onChange={(e) => updateFamilyMember(member.id, 'age', parseInt(e.target.value, 10) || 0)}
                            />
                            <Select
                              label="Gender"
                              value={member.gender}
                              onChange={(e) => updateFamilyMember(member.id, 'gender', e.target.value)}
                              options={[
                                { value: 'female', label: 'Female' },
                                { value: 'male', label: 'Male' },
                                { value: 'other', label: 'Other' }
                              ]}
                            />
                          </div>

                          <Select
                            label="Blood Group"
                            value={member.bloodGroup || 'Unknown / Not Known'}
                            onChange={(e) => updateFamilyMember(member.id, 'bloodGroup', e.target.value)}
                            options={BLOOD_GROUP_OPTIONS.map(opt => ({
                              value: opt.value,
                              label: opt.badge
                            }))}
                          />
                        </div>

                        {/* Covered Under Family Health Shield Notice (No Auto-Issued Card) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Covered Under Family Health Shield (No separate physical card auto-issued)</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Receives dedicated Patient ID in Firestore Master
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 7. SMART HEALTH CARD ISSUANCE (OFF BY DEFAULT) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center justify-center">7</span>
                <span>Smart Health Card Enrollment (OFF by Default)</span>
              </h3>
              <Badge variant={issueHealthCard ? 'success' : 'neutral'}>
                {issueHealthCard ? 'Card Issuance: ON' : 'Card Issuance: OFF'}
              </Badge>
            </div>

            {/* Prominent Toggle Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    issueHealthCard
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Issue Smart Health Card</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({issueHealthCard ? 'Enabled' : 'Disabled by Default'})
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                    Card issuance is <strong>OFF by default</strong> to prevent accidental card creation. Enable this only when patient explicitly requests an active Health Card.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={issueHealthCard}
                  onChange={(e) => setIssueHealthCard(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* When Card Issuance is ON: Show Tier, Preset & Material Options */}
            {issueHealthCard ? (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="Membership Tier *"
                    value={membershipId}
                    onChange={(e) => handleMembershipChange(e.target.value)}
                    options={memberships.map(m => ({
                      value: m.id,
                      label: `${m.name} (${formatCurrency(m.registrationFee || 0)})`
                    }))}
                  />

                  <Select
                    label="CR80 Card Visual Theme"
                    value={cardPreset}
                    onChange={(e) => setCardPreset(e.target.value as any)}
                    options={[
                      { value: 'royal_gold', label: 'Royal Gold & Navy' },
                      { value: 'platinum_elite', label: 'Platinum Elite' },
                      { value: 'emerald_health', label: 'Emerald Health' },
                      { value: 'executive_navy', label: 'Executive Navy' },
                      { value: 'clean_minimal', label: 'Clean Minimalist' },
                      { value: 'crimson_care', label: 'Crimson Care' }
                    ]}
                  />

                  <Select
                    label="Card Material Finish"
                    value={cardMaterial}
                    onChange={(e) => setCardMaterial(e.target.value as any)}
                    options={[
                      { value: 'metallic', label: 'Metallic Foil Embossed' },
                      { value: 'gloss', label: 'Standard High Gloss' },
                      { value: 'matte', label: 'Matte Silk Velvet' },
                      { value: 'hologram', label: 'Holographic Anti-Counterfeit' }
                    ]}
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>
                      Tier Benefits: <strong>OPD {selectedMembership?.opdDiscount || 20}% OFF</strong> •{' '}
                      <strong>Lab {selectedMembership?.labDiscount || 25}% OFF</strong> • Pharmacy{' '}
                      {selectedMembership?.pharmacyDiscount || 15}% OFF
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    Validity: {selectedMembership?.validityMonths || 12} Months
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                Card options disabled. Patient will be registered directly without health card charges.
              </div>
            )}
          </div>

          {/* 8. STEP-BY-STEP REVIEW, BILLING & CONFIRMATION */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center">8</span>
                <span>Enrollment Summary, Billing & Final Confirmation</span>
              </h3>
              <Badge variant="success">Final Step</Badge>
            </div>

            {/* Complete Review & Charges Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Cardholder</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{fullName || 'Patient Name'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Patient Type / Card Status</span>
                  <strong className={issueHealthCard ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}>
                    {issueHealthCard ? `Issue Card (${selectedMembership?.name})` : 'Non-Card Patient (Standard Pricing)'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Family Allowance</span>
                  <strong className="text-indigo-600">
                    {familyMembers.length} Dependents ({Math.min(familyMembers.length, maxIncludedMembers)} Free)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Blood Group</span>
                  <strong className="text-slate-700 dark:text-slate-300">{bloodGroup}</strong>
                </div>
              </div>

              {/* Itemized Pricing Row */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span>Base Card / Registration Fee:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(billCalculation.baseCardCharge)}
                  </span>
                </div>

                {familyMembers.length > 0 && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>Family Allowance (Up to {maxIncludedMembers} Included):</span>
                    <span className="font-mono font-bold text-emerald-600">₹0.00</span>
                  </div>
                )}

                {billCalculation.additionalMembers > 0 && (
                  <div className="flex justify-between py-1 text-amber-700 dark:text-amber-400 bg-amber-100/40 dark:bg-amber-950/40 px-2 rounded-lg">
                    <span>Additional Family Members ({billCalculation.additionalMembers} × ₹{additionalMemberFee}):</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(billCalculation.additionalMemberCharge)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Select
                    label="Payment Method *"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    options={[
                      { value: 'cash', label: 'Cash Desk Payment' },
                      { value: 'upi', label: 'UPI / QR Payment' },
                      { value: 'card', label: 'Credit / Debit Card (POS)' },
                      { value: 'netbanking', label: 'Net Banking' },
                      { value: 'wallet', label: 'Patient Wallet' }
                    ]}
                  />

                  <Input
                    label="Promotional Discount (₹)"
                    type="number"
                    placeholder="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
                  <span className="font-black text-slate-900 dark:text-white uppercase">Total Net Amount Payable:</span>
                  <span className="font-black text-xl font-mono text-blue-600 dark:text-blue-400">
                    {formatCurrency(billCalculation.netPayable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Explicit Confirm Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                leftIcon={issueHealthCard ? <CreditCard className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                className={`w-full py-4 text-base font-black shadow-xl tracking-wide uppercase transition-all ${
                  issueHealthCard
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                }`}
              >
                {issueHealthCard
                  ? `CONFIRM & ISSUE HEALTH CARD (${formatCurrency(billCalculation.netPayable)})`
                  : `CONFIRM & REGISTER PATIENT (NO CARD - ${formatCurrency(billCalculation.netPayable)})`}
              </Button>
            </div>
          </div>
        </form>

        {/* RIGHT COLUMN: Live Card Preview & Quick Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-6 space-y-6">
            {/* Live CR80 Card Front Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>{issueHealthCard ? 'Live Health Card Preview' : 'Digital ID Preview'}</span>
                <Badge variant={issueHealthCard ? 'blue' : 'neutral'}>
                  {issueHealthCard ? 'Physical CR80' : 'Digital Only'}
                </Badge>
              </div>

              <div className="overflow-hidden rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                <CR80CardFront
                  card={livePreviewCard}
                  patient={livePreviewPatient}
                  membership={selectedMembership}
                  company={company}
                />
              </div>
            </div>

            {/* Live Registration Summary Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Registration Overview
              </h4>

              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Patient ID Preview:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{previewNextPatientId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Health Card Issuance:</span>
                  <span className={`font-bold ${issueHealthCard ? 'text-blue-600' : 'text-slate-500'}`}>
                    {issueHealthCard ? `ON (${selectedMembership?.name})` : 'OFF by Default'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Blood Group:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{bloodGroup}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Clinical Triage:</span>
                  <span className="font-bold text-teal-600">
                    {enableClinicalTriage ? 'Active' : 'OFF (Skipped)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Family Members:</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {familyMembers.length} / {maxIncludedMembers}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Total Net Payable:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(billCalculation.netPayable)}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Synchronized with Central Firestore in real-time.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Patient Warning Modal */}
      {matchedDuplicatePatient && (
        <DuplicatePatientWarningModal
          isOpen={duplicateWarningOpen}
          onClose={() => setDuplicateWarningOpen(false)}
          onProceedAnyway={() => {
            setDuplicateBypassConfirmed(true);
            setDuplicateWarningOpen(false);
            showToast('info', 'Duplicate Bypass Acknowledged', 'Proceeding with new patient enrollment.');
          }}
          matchedPatient={matchedDuplicatePatient}
          matchedCard={matchedDuplicateCard}
          duplicateField="mobile"
        />
      )}

      {/* Address Auto-Popup Modal */}
      {isAddressPopupOpen && (
        <AddressAutoPopupModal
          isOpen={isAddressPopupOpen}
          onClose={() => setIsAddressPopupOpen(false)}
          initialQuery={pinCode || villageArea}
          onSelectAddress={(addr) => {
            setVillageArea(addr.cityArea);
            setPostOffice(addr.postOffice);
            setPoliceStation(addr.policeStation);
            setDistrict(addr.district);
            setStateVal(addr.state);
            setPinCode(addr.pinCode);
            showToast('success', 'Address Auto-Filled', `${addr.cityArea}, PIN ${addr.pinCode}`);
          }}
        />
      )}

      {/* Automatic Patient Bill & Slip Printing Modal */}
      {createdResult && (
        <PatientRegistrationBillSlipModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          patient={createdResult.patient}
          card={createdResult.card}
          bill={createdResult.bill}
          familyMembers={createdResult.issuedFamilyCards}
          onRegisterAnother={handleRegisterAnother}
        />
      )}
    </div>
  );
};
