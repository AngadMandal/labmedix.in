import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useToast } from '../../context/ToastContext';
import { StorageService } from '../../services/storage';
import { MembershipTierService } from '../../services/membershipTierService';
import { DoctorMasterService, DoctorMasterItem } from '../../services/doctorMasterService';
import { AddressLookupService } from '../../services/addressLookupService';
import { StaffCardRequestService } from '../../services/staffCardRequestService';
import { checkUserPermission } from '../../constants/roles';
import { BLOOD_GROUP_OPTIONS } from '../../constants/defaults';
import { calculateAge, formatCurrency } from '../../utils/formatters';
import {
  Patient,
  Membership,
  CardApplicationRequest,
  PatientBill,
  ApplicationFamilyMember,
  CompanyProfile,
  ClinicalVitals
} from '../../types';
import {
  CreditCard,
  User,
  Search,
  CheckCircle2,
  Shield,
  Zap,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Clock,
  Sparkles,
  Printer,
  X,
  FileText,
  BadgeCheck,
  Users,
  Plus,
  Trash2,
  Activity,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Receipt,
  Heart
} from 'lucide-react';
import { StaffCardRequestBillSlipModal } from './StaffCardRequestBillSlipModal';

export interface CreateCardRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPatientId?: string;
  onRequestCreated?: (application: CardApplicationRequest) => void;
}

export const CreateCardRequestModal: React.FC<CreateCardRequestModalProps> = ({
  isOpen,
  onClose,
  preselectedPatientId,
  onRequestCreated
}) => {
  const { showToast } = useToast();
  const currentUser = StorageService.getCurrentUser();
  const company: CompanyProfile = StorageService.getCompanyProfile();
  const regSettings = company.registrationSettings || {
    enableClinicalTriageDefault: false,
    maxIncludedFamilyMembers: 5,
    additionalMemberFee: 299,
    cardIssuanceDefault: false
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canCreateRequest = isSuperAdmin || checkUserPermission(currentUser, 'card_request_create');
  const canIssueDirectly = isSuperAdmin || checkUserPermission(currentUser, 'card_issue');

  // Mode: 'existing' | 'new'
  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  // Existing Patient Search
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  // Primary Patient Registration Fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1990-01-01');
  const [age, setAge] = useState('35');
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

  // Address Fields
  const [villageArea, setVillageArea] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [district, setDistrict] = useState('Malda');
  const [stateVal, setStateVal] = useState('West Bengal');
  const [pinCode, setPinCode] = useState('732142');
  const [fullAddress, setFullAddress] = useState('');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');

  // Referral Channel
  const [referralSource, setReferralSource] = useState<'doctor' | 'camp' | 'agent' | 'staff' | 'walk_in'>('walk_in');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [doctors, setDoctors] = useState<DoctorMasterItem[]>([]);

  // Optional Clinical Triage
  const [showClinicalTriage, setShowClinicalTriage] = useState(false);
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [rbs, setRbs] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');

  // Family Health Shield (Max 5 included by standard)
  const [familyMembers, setFamilyMembers] = useState<ApplicationFamilyMember[]>([]);
  const [extraMembersConfirmed, setExtraMembersConfirmed] = useState(false);

  // Card & Plan Configuration
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getActiveMemberships());
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [initialDeposit, setInitialDeposit] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Card Issuance: OFF by default
  const [issueCardDirectly, setIssueCardDirectly] = useState<boolean>(false);

  // Workflow & Routing
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [dispatchPreference, setDispatchPreference] = useState<'collect_at_clinic' | 'courier' | 'digital_only'>('collect_at_clinic');
  const [justificationNotes, setJustificationNotes] = useState('');

  // Payment Configuration
  const [paymentMethod, setPaymentMethod] = useState('Cash Desk POS');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'pending_verification'>('paid');
  const [paidAmount, setPaidAmount] = useState<string>('');

  // Processing state & Success modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdApplication, setCreatedApplication] = useState<CardApplicationRequest | null>(null);
  const [createdBill, setCreatedBill] = useState<PatientBill | null>(null);
  const [isBillSlipModalOpen, setIsBillSlipModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      const patients = StorageService.getPatients();
      setAllPatients(patients);

      const activeTiers = StorageService.getActiveMemberships();
      setMemberships(activeTiers);
      if (activeTiers.length > 0 && !selectedMembershipId) {
        const defaultTier = activeTiers.find(m => m.isRecommended) || activeTiers[0];
        setSelectedMembershipId(defaultTier.id);
      }

      setDoctors(DoctorMasterService.getAllDoctors().filter(d => d.status === 'active'));

      if (preselectedPatientId) {
        const found = patients.find(p => p.id === preselectedPatientId);
        if (found) {
          setSelectedPatient(found);
          setMode('existing');
        }
      } else {
        setSelectedPatient(null);
      }

      setCreatedApplication(null);
      setCreatedBill(null);
      setIssueCardDirectly(false); // Issuance strictly OFF by default
    }
  }, [isOpen, preselectedPatientId]);

  // Subscribe to live membership changes
  useEffect(() => {
    const unsub = MembershipTierService.subscribeToTiers((allTiers) => {
      const active = allTiers.filter(t => t.status === 'active');
      setMemberships(active);
    });
    return () => unsub();
  }, []);

  // Handle PIN code auto-resolve
  const handlePinCodeChange = (newPin: string) => {
    setPinCode(newPin);
    const clean = newPin.trim();
    if (clean.length === 6 && /^\d{6}$/.test(clean)) {
      const results = AddressLookupService.lookupLocal(clean);
      if (results.length > 0) {
        const best = results[0];
        if (best.district) setDistrict(best.district);
        if (best.state) setStateVal(best.state);
        if (best.postOffice) setPostOffice(best.postOffice);
        if (!villageArea) setVillageArea(best.cityArea || best.postOffice);
        if (!fullAddress) {
          setFullAddress(`${best.cityArea || best.postOffice}, ${best.district}, ${best.state} - ${clean}`);
        }
        showToast('info', 'PIN Code Resolved', `${best.cityArea || best.postOffice}, ${best.district}, ${best.state}`);
      }
    }
  };

  // DOB & Age Synchronizer
  const handleDobChange = (newDob: string) => {
    setDob(newDob);
    const calculated = calculateAge(newDob);
    if (calculated > 0) {
      setAge(calculated.toString());
    }
  };

  // Selected Membership object
  const selectedMembership = useMemo(() => {
    return memberships.find(m => m.id === selectedMembershipId) || memberships[0] || {
      id: 'standard',
      name: 'Standard Care Membership',
      registrationFee: 499,
      validityMonths: 12,
      labDiscount: 20,
      opdDiscount: 20
    };
  }, [memberships, selectedMembershipId]);

  // Family members calculations
  const maxIncluded = regSettings.maxIncludedFamilyMembers || 5;
  const additionalFeePerMember = regSettings.additionalMemberFee || 299;
  const totalFamilyCount = familyMembers.length;
  const includedFamilyCount = Math.min(totalFamilyCount, maxIncluded);
  const extraFamilyCount = Math.max(0, totalFamilyCount - maxIncluded);
  const extraFamilyFee = extraFamilyCount * additionalFeePerMember;

  // Financial Breakdown calculations
  const baseCardFee = selectedMembership.registrationFee || 499;
  const floatAmount = Math.max(0, Number(initialDeposit) || 0);
  const discount = Math.max(0, Number(discountAmount) || 0);
  const subtotal = baseCardFee + extraFamilyFee;
  const netTotalCalculated = Math.max(0, subtotal - discount + floatAmount);
  const effectivePaidAmount = paidAmount !== '' ? Number(paidAmount) : netTotalCalculated;
  const balanceDue = Math.max(0, netTotalCalculated - effectivePaidAmount);

  // Search filtered patients
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return allPatients.slice(0, 5);
    const q = patientSearch.toLowerCase().trim();
    return allPatients.filter(
      p =>
        p.fullName.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [allPatients, patientSearch]);

  // Family Member Management
  const handleAddFamilyMember = () => {
    setFamilyMembers(prev => [
      ...prev,
      {
        id: `fm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fullName: '',
        relationship: 'Child',
        gender: 'male',
        age: 12,
        bloodGroup: 'Unknown / Not Known'
      }
    ]);
  };

  const handleUpdateFamilyMember = (index: number, field: keyof ApplicationFamilyMember, val: any) => {
    setFamilyMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveFamilyMember = (index: number) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('error', 'Authentication Required', 'You must be logged in as staff to submit a card request.');
      return;
    }

    // Permission check
    const hasPermission =
      currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      checkUserPermission(currentUser, 'card_request_create') ||
      checkUserPermission(currentUser, 'card_request_submit');

    if (!hasPermission) {
      showToast('error', 'Access Denied', 'You do not have permission to submit Health Card requests. Please contact Super Admin.');
      return;
    }

    const targetName = mode === 'existing' && selectedPatient ? selectedPatient.fullName : fullName.trim();
    const targetMobile = mode === 'existing' && selectedPatient ? selectedPatient.mobile : mobile.trim();
    const targetEmail = mode === 'existing' && selectedPatient ? selectedPatient.email : email.trim();
    const targetDob = mode === 'existing' && selectedPatient ? selectedPatient.dob : dob;
    const targetAge = mode === 'existing' && selectedPatient ? selectedPatient.age : Number(age);
    const targetGender = mode === 'existing' && selectedPatient ? selectedPatient.gender : gender;
    const targetBlood = mode === 'existing' && selectedPatient ? selectedPatient.bloodGroup : bloodGroup;
    const targetAddress = mode === 'existing' && selectedPatient ? selectedPatient.address?.fullAddress : fullAddress;

    if (!targetName) {
      showToast('error', 'Missing Name', 'Please provide applicant full name.');
      return;
    }

    if (!targetMobile || targetMobile.length < 10) {
      showToast('error', 'Invalid Phone', 'Please provide a valid 10-digit mobile number.');
      return;
    }

    if (extraFamilyCount > 0 && !extraMembersConfirmed) {
      showToast(
        'warning',
        'Extra Family Members Confirmation Required',
        `You have added ${totalFamilyCount} family members (${extraFamilyCount} above the included 5). Please check the surcharge agreement box before submitting.`
      );
      return;
    }

    if (paymentMethod === 'Voucher' && !paymentReference.trim()) {
      showToast('error', 'Voucher Code Required', 'Please enter the 16-character Cash Desk Voucher code.');
      return;
    }

    if (paymentMethod === 'UPI / QR' || paymentMethod === 'Online Gateway') {
      if (!paymentReference.trim()) {
        showToast('error', 'Transaction Reference Required', 'Please provide the 12-digit UTR or payment reference.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const clinicalVitalsPayload: ClinicalVitals | undefined = showClinicalTriage
        ? {
            bpSystolic: parseInt(bpSystolic, 10) || undefined,
            bpDiastolic: parseInt(bpDiastolic, 10) || undefined,
            pulseRate: parseInt(pulse, 10) || undefined,
            spo2: parseInt(spo2, 10) || undefined,
            temperature: parseFloat(temperature) || undefined,
            weightKg: parseFloat(weightKg) || undefined,
            heightCm: parseFloat(heightCm) || undefined,
            bloodSugar: parseFloat(rbs) || undefined
          }
        : undefined;

      const result = await StaffCardRequestService.submitStaffCardRequest({
        patientMode: mode,
        patientId: selectedPatient?.id,
        fullName: targetName,
        dob: targetDob,
        age: targetAge,
        gender: targetGender,
        mobile: targetMobile,
        whatsapp,
        email: targetEmail,
        bloodGroup: targetBlood,
        photoUrl: photoUrl || selectedPatient?.photoUrl,
        address: {
          villageArea,
          postOffice,
          policeStation,
          district,
          state: stateVal,
          pinCode,
          fullAddress: targetAddress || `${villageArea}, ${postOffice}, ${district} - ${pinCode}`
        },
        emergencyContact: {
          name: emergencyName || selectedPatient?.emergencyContact?.name || 'Spouse',
          relationship: emergencyRelation || selectedPatient?.emergencyContact?.relationship || 'Family',
          mobile: emergencyPhone || selectedPatient?.emergencyContact?.mobile || targetMobile
        },
        maritalStatus,
        occupation,
        governmentIdType,
        governmentIdNumber,
        referralChannel: referralSource,
        referralDetails: {
          doctorId: selectedDoctorId,
          doctorName: doctors.find(d => d.id === selectedDoctorId)?.name,
          notes: referralNotes
        },
        clinicalTriage: clinicalVitalsPayload,
        allergies,
        chronicConditions,
        familyMembers: familyMembers.filter(m => m.fullName.trim().length > 0),
        membership: selectedMembership,
        initialDeposit: floatAmount,
        discountAmount: discount,
        paymentMethod,
        paymentReference,
        paymentStatus,
        paidAmount: effectivePaidAmount,
        urgency,
        justificationNotes,
        dispatchPreference,
        issueCardDirectly: canIssueDirectly && issueCardDirectly,
        currentUser: currentUser!
      });

      showToast(
        'success',
        'Card Request Submitted! 📋',
        `Request #${result.application.applicationNo} created and bill ${result.bill.billNumber} generated.`
      );

      setCreatedApplication(result.application);
      setCreatedBill(result.bill);
      setIsBillSlipModalOpen(true);

      if (onRequestCreated) {
        onRequestCreated(result.application);
      }
    } catch (err: any) {
      showToast('error', 'Submission Failed', err?.message || 'Failed to submit card creation request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user does not have permission, show blocked banner
  if (!canCreateRequest) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Staff Health Card Request" maxWidth="md">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Permission Required</h3>
          <p className="text-xs text-slate-500">
            You do not have the required <strong>card_request_create</strong> permission to submit Health Card requests. Please contact your Super Administrator.
          </p>
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Request New Health Card (Staff Submission)"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 text-slate-800 dark:text-slate-100">
          {/* Submitter Info & Routing Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider block">
                  Staff Submitter Attribution
                </span>
                <strong className="text-sm text-slate-900 dark:text-white">
                  {currentUser?.fullName} ({currentUser?.staffId || currentUser?.id})
                </strong>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Role: <strong className="text-slate-700 dark:text-slate-300 uppercase">{currentUser?.role}</strong> • Request routed to Super Admin Approval Queue
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Workflow Mode</span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800 inline-block">
                  APPROVAL REQUIRED
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: Applicant Mode Selector (Existing vs New) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'existing'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              Existing Patient from Directory
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'new'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              New Patient Registration & Enrollment
            </button>
          </div>

          {/* SECTION 2A: Existing Patient Picker */}
          {mode === 'existing' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Search Registered Patient (By Name, Mobile, or Patient ID)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Type patient name, phone number, or ID..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {selectedPatient ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-sm text-emerald-950 dark:text-emerald-200 block">
                        {selectedPatient.fullName}
                      </strong>
                      <span className="text-xs text-emerald-800 dark:text-emerald-400">
                        PID: {selectedPatient.id} • Mobile: {selectedPatient.mobile} • Blood: {selectedPatient.bloodGroup || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs text-rose-600 hover:underline font-bold"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientSearch('');
                      }}
                      className="p-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/60 cursor-pointer flex justify-between items-center text-xs transition-colors"
                    >
                      <div>
                        <strong className="text-slate-900 dark:text-white block">{p.fullName}</strong>
                        <span className="text-[11px] text-slate-500 font-mono">ID: {p.id} • {p.mobile}</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-[10px] py-1 px-2.5">
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2B: New Patient Full Form (Matching New Patient Registration Standard) */}
          {mode === 'new' && (
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Primary Patient Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => handleDobChange(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Age (Years) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="35"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Blood Group (Optional)
                  </label>
                  <Select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    options={BLOOD_GROUP_OPTIONS.map(b => ({ value: b.value, label: b.label }))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    WhatsApp Number
                  </label>
                  <Input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Optional WhatsApp"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Email Address (Optional)
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Address with PIN Code Auto-Resolve */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Residential Address
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block">PIN Code (Auto-Resolves)</label>
                    <Input
                      value={pinCode}
                      onChange={(e) => handlePinCodeChange(e.target.value)}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      className="text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">District</label>
                    <Input
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">State</label>
                    <Input
                      value={stateVal}
                      onChange={(e) => setStateVal(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Post Office</label>
                    <Input
                      value={postOffice}
                      onChange={(e) => setPostOffice(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block">Full Complete Address</label>
                  <Input
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="House/Street, Area, Landmark, City..."
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Emergency Contact
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Contact Name</label>
                    <Input
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Emergency contact person"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Relationship</label>
                    <Select
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      options={[
                        { value: 'Spouse', label: 'Spouse' },
                        { value: 'Father', label: 'Father' },
                        { value: 'Mother', label: 'Mother' },
                        { value: 'Son', label: 'Son' },
                        { value: 'Daughter', label: 'Daughter' },
                        { value: 'Sibling', label: 'Sibling' },
                        { value: 'Guardian', label: 'Guardian' }
                      ]}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Contact Phone</label>
                    <Input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="10-digit phone"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Referral Source Dropdown */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Referral Channel
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Referral Type</label>
                    <Select
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value as any)}
                      options={[
                        { value: 'walk_in', label: 'Direct Walk-In / Front Desk' },
                        { value: 'doctor', label: 'Consultant / Referring Doctor' },
                        { value: 'camp', label: 'Community Outreach Camp' },
                        { value: 'agent', label: 'Health Representative / Field Agent' },
                        { value: 'staff', label: 'Hospital Staff Referral' }
                      ]}
                      className="text-xs"
                    />
                  </div>

                  {referralSource === 'doctor' && (
                    <div>
                      <label className="text-[10px] text-slate-500 block">Select Doctor</label>
                      <Select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        options={[
                          { value: '', label: 'Select Consultant...' },
                          ...doctors.map(d => ({ value: d.id, label: `${d.name} (${d.speciality})` }))
                        ]}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Collapsible Clinical Triage */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowClinicalTriage(!showClinicalTriage)}
                  className="flex items-center justify-between w-full py-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
                >
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Clinical Triage & Physical Measurements (Optional)
                  </span>
                  {showClinicalTriage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showClinicalTriage && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">BP (Systolic)</label>
                      <Input value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} placeholder="120" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">BP (Diastolic)</label>
                      <Input value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} placeholder="80" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Pulse (bpm)</label>
                      <Input value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="72" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">SpO2 (%)</label>
                      <Input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Weight (kg)</label>
                      <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="68" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Height (cm)</label>
                      <Input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="172" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Blood Sugar (RBS)</label>
                      <Input value={rbs} onChange={(e) => setRbs(e.target.value)} placeholder="110 mg/dL" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Allergies</label>
                      <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin" className="text-xs" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: Family Health Shield & Dependents (Max 5 Included) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Family Health Shield & Dependents
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                  totalFamilyCount > maxIncluded
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  Family Members: {totalFamilyCount} / {maxIncluded} Included
                </span>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddFamilyMember}
                className="text-xs font-bold"
              >
                Add Dependent
              </Button>
            </div>

            {/* Extra member charge warning banner */}
            {extraFamilyCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <strong className="text-amber-900 dark:text-amber-200">
                      Additional Member Surcharge ({extraFamilyCount} Extra Members)
                    </strong>
                  </div>
                  <span className="font-mono font-black text-amber-900 dark:text-amber-200">
                    +{formatCurrency(extraFamilyFee)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Standard Family Health Shield includes up to {maxIncluded} dependents. Each additional dependent is charged at ₹{additionalFeePerMember}/year.
                </p>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={extraMembersConfirmed}
                    onChange={(e) => setExtraMembersConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    I confirm the additional charge of ₹{extraFamilyFee} will be billed to the patient.
                  </span>
                </label>
              </div>
            )}

            {familyMembers.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No family dependents added yet. Click &quot;Add Dependent&quot; to include spouse, children, or parents under this Health Card.
              </p>
            ) : (
              <div className="space-y-2">
                {familyMembers.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center text-xs"
                  >
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Dependent Full Name"
                        value={member.fullName}
                        onChange={(e) => handleUpdateFamilyMember(idx, 'fullName', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Select
                        value={member.relationship}
                        onChange={(e) => handleUpdateFamilyMember(idx, 'relationship', e.target.value)}
                        options={[
                          { value: 'Spouse', label: 'Spouse' },
                          { value: 'Son', label: 'Son' },
                          { value: 'Daughter', label: 'Daughter' },
                          { value: 'Father', label: 'Father' },
                          { value: 'Mother', label: 'Mother' },
                          { value: 'Brother', label: 'Brother' },
                          { value: 'Sister', label: 'Sister' },
                          { value: 'Other', label: 'Other' }
                        ]}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Age"
                        value={member.age}
                        onChange={(e) => handleUpdateFamilyMember(idx, 'age', parseInt(e.target.value, 10) || 0)}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <span className={`text-[10px] font-bold uppercase ${idx >= maxIncluded ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {idx >= maxIncluded ? 'Extra' : 'Included'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFamilyMember(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: Membership Tier Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Choose Health Card Membership Tier
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {memberships.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMembershipId(m.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    selectedMembershipId === m.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {selectedMembershipId === m.id && (
                    <div className="absolute top-3 right-3 text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">{m.name}</h4>
                  <div className="mt-1">
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {formatCurrency(m.registrationFee)}
                    </span>
                    <span className="text-[10px] text-slate-500"> / {m.validityMonths || 12} Mos</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <div>🩺 OPD: <strong>{m.opdDiscount}% Off</strong></div>
                    <div>🔬 Lab Tests: <strong>{m.labDiscount}% Off</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: Card Issuance Toggle (OFF By Default) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <strong className="text-xs font-bold text-slate-900 dark:text-white">
                  Direct Card Issuance (OFF by default)
                </strong>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {issueCardDirectly ? 'DIRECT ISSUANCE' : 'REQUEST ONLY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Staff submissions are sent to the Super Admin for review. Cards are minted upon Super Admin approval.
              </p>
            </div>

            {canIssueDirectly ? (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={issueCardDirectly}
                  onChange={(e) => setIssueCardDirectly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Locked to Request Mode</span>
            )}
          </div>

          {/* SECTION 6: Routing & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Urgency Level
              </label>
              <Select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                options={[
                  { value: 'normal', label: 'Standard Turnaround (24-48h)' },
                  { value: 'urgent', label: 'Urgent Processing (Same Day)' },
                  { value: 'emergency', label: 'Emergency Expedited (Immediate)' }
                ]}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Card Dispatch Preference
              </label>
              <Select
                value={dispatchPreference}
                onChange={(e) => setDispatchPreference(e.target.value as any)}
                options={[
                  { value: 'collect_at_clinic', label: 'Pick Up at Front Desk Reception' },
                  { value: 'courier', label: 'Doorstep Courier Delivery' },
                  { value: 'digital_only', label: 'Digital QR Card Only (Immediate)' }
                ]}
                className="text-xs"
              />
            </div>
          </div>

          {/* SECTION 7: Financial Breakdown & Payment */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Enrollment Bill & Payment Breakdown
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase">Base Plan Fee</span>
                <strong className="text-base text-white">{formatCurrency(baseCardFee)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase">Extra Members</span>
                <strong className={`text-base ${extraFamilyFee > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  +{formatCurrency(extraFamilyFee)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase">Wallet Float</span>
                <strong className="text-base text-teal-400">+{formatCurrency(floatAmount)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 block uppercase font-bold">Net Payable</span>
                <strong className="text-base text-emerald-300 font-black">{formatCurrency(netTotalCalculated)}</strong>
              </div>
            </div>

            {/* Payment Mode & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Payment Method</label>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={[
                    { value: 'Cash Desk POS', label: 'Cash Desk POS' },
                    { value: 'UPI / Dynamic QR', label: 'UPI / Dynamic QR' },
                    { value: 'Debit / Credit Card POS', label: 'Card Swipe POS' },
                    { value: 'Direct Bank Transfer', label: 'Direct Bank Transfer' }
                  ]}
                  className="text-xs bg-slate-800 text-white border-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Transaction Ref / UTR</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UTR-12345678 or Cash Receipt"
                  className="w-full text-xs rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Amount Collected (Paid)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={netTotalCalculated.toString()}
                  className="w-full text-xs rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono font-bold"
                />
              </div>
            </div>

            {balanceDue > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex justify-between items-center font-mono">
                <span>Balance Due to Clinic:</span>
                <strong className="text-sm font-black">{formatCurrency(balanceDue)}</strong>
              </div>
            )}
          </div>

          {/* Justification Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Staff Clinical / Operational Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={justificationNotes}
              onChange={(e) => setJustificationNotes(e.target.value)}
              placeholder="Add any internal remarks or special instructions for Super Admin..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
            />
          </div>

          {/* Submit Action Bar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-mono">
              <span className="text-slate-500">Total Bill Amount: </span>
              <strong className="text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(netTotalCalculated)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<Receipt className="w-4 h-4" />}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold shadow-md"
              >
                Submit Request & Generate Bill
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Interactive Bill & Registration Slip Print Modal */}
      {isBillSlipModalOpen && createdApplication && (
        <StaffCardRequestBillSlipModal
          isOpen={isBillSlipModalOpen}
          onClose={() => {
            setIsBillSlipModalOpen(false);
            onClose();
          }}
          application={createdApplication}
          bill={createdBill}
        />
      )}
    </>
  );
};
