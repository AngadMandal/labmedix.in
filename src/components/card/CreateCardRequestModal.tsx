import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../context/ToastContext';
import { StorageService } from '../../services/storage';
import { PortalService } from '../../services/portalService';
import { MembershipTierService } from '../../services/membershipTierService';
import { Patient, Membership, CardApplicationRequest, Role } from '../../types';
import { formatCurrency } from '../../utils/formatters';
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
  BadgeCheck
} from 'lucide-react';
import { CardRequestSlipModal } from '../portal/CardRequestSlipModal';

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

  // Mode: 'existing' | 'new'
  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  // Existing Patient Search
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  // New Applicant Fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1995-01-01');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [fullAddress, setFullAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Family');

  // Card & Plan Configuration
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getActiveMemberships());
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [initialDeposit, setInitialDeposit] = useState<number>(500);

  // Workflow & Routing
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [dispatchPreference, setDispatchPreference] = useState<'collect_at_clinic' | 'courier' | 'digital_only'>('collect_at_clinic');
  const [justificationNotes, setJustificationNotes] = useState('');

  // Payment Configuration
  const [paymentMethod, setPaymentMethod] = useState('Front Desk Cash POS');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending_verification' | 'pending'>('paid');

  // Processing state & Post-creation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdApplication, setCreatedApplication] = useState<CardApplicationRequest | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      const patients = StorageService.getPatients();
      setAllPatients(patients);

      const activeTiers = StorageService.getActiveMemberships();
      setMemberships(activeTiers);
      if (activeTiers.length > 0 && !selectedMembershipId) {
        const defaultTier = activeTiers.find(m => m.id === 'silver') || activeTiers[0];
        setSelectedMembershipId(defaultTier.id);
      }

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
    }
  }, [isOpen, preselectedPatientId]);

  // Subscribe to live membership changes
  useEffect(() => {
    const unsub = MembershipTierService.subscribeToTiers((allTiers) => {
      const active = allTiers.filter(t => t.status === 'active');
      setMemberships(active);
    });
    return unsub;
  }, []);

  // Filtered patients for search
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return allPatients.slice(0, 5);
    const query = patientSearch.toLowerCase().trim();
    return allPatients.filter(p =>
      p.fullName.toLowerCase().includes(query) ||
      p.mobile.includes(query) ||
      p.id.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [allPatients, patientSearch]);

  // Selected membership details
  const selectedMembership = useMemo(() => {
    return memberships.find(m => m.id === selectedMembershipId) || memberships[0] || {
      id: 'silver',
      name: 'Silver Health Shield',
      registrationFee: 499
    };
  }, [memberships, selectedMembershipId]);

  const totalCalculated = useMemo(() => {
    return (selectedMembership?.registrationFee || 0) + (Number(initialDeposit) || 0);
  }, [selectedMembership, initialDeposit]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetName = fullName.trim();
    let targetMobile = mobile.trim();
    let targetAge = Number(age) || 30;
    let targetGender = gender;
    let targetBlood = bloodGroup;
    let targetAddress = fullAddress.trim();
    let targetEmail = email.trim();
    let targetDob = dob;

    if (mode === 'existing') {
      if (!selectedPatient) {
        showToast('error', 'Select Patient', 'Please search and select an existing patient from the list.');
        return;
      }
      targetName = selectedPatient.fullName;
      targetMobile = selectedPatient.mobile;
      targetAge = selectedPatient.age;
      targetGender = (selectedPatient.gender as any) || 'male';
      targetBlood = selectedPatient.bloodGroup || 'O+';
      targetAddress = selectedPatient.address?.fullAddress || '';
      targetEmail = selectedPatient.email || '';
      targetDob = selectedPatient.dob || '1995-01-01';
    } else {
      if (!targetName) {
        showToast('error', 'Name Required', 'Please enter applicant full name.');
        return;
      }
      if (!targetMobile || targetMobile.length < 10) {
        showToast('error', 'Valid Mobile Required', 'Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const sourceMap: Record<string, 'doctor_referral' | 'reception_desk' | 'staff_portal'> = {
        doctor: 'doctor_referral',
        reception: 'reception_desk',
        manager: 'staff_portal',
        admin: 'staff_portal',
        super_admin: 'staff_portal'
      };
      const requestSource = sourceMap[currentUser?.role || ''] || 'staff_portal';

      const payload: Omit<CardApplicationRequest, 'id' | 'applicationNo' | 'trackingId' | 'status' | 'createdAt' | 'updatedAt'> = {
        fullName: targetName,
        dob: targetDob,
        age: targetAge,
        gender: targetGender,
        mobile: targetMobile,
        email: targetEmail,
        bloodGroup: targetBlood,
        photoUrl: selectedPatient?.photoUrl || '/logo.jpg',
        address: {
          villageArea: '',
          postOffice: '',
          policeStation: '',
          district: '',
          state: '',
          pinCode: '',
          fullAddress: targetAddress || 'Walk-In Registration'
        },
        emergencyContact: {
          name: emergencyName || (selectedPatient?.emergencyContact?.name) || 'Self',
          relationship: emergencyRelation || (selectedPatient?.emergencyContact?.relationship) || 'Self',
          mobile: emergencyPhone || (selectedPatient?.emergencyContact?.mobile) || targetMobile
        },
        medicalInfo: selectedPatient?.medicalInfo || {
          bloodGroup: targetBlood,
          chronicConditions: '',
          allergies: ''
        },
        membershipId: selectedMembership.id,
        membershipName: selectedMembership.name,
        membershipPrice: selectedMembership.registrationFee || 499,
        initialDeposit: Number(initialDeposit) || 0,
        totalPaidAmount: totalCalculated,
        paymentMethod,
        paymentReference: paymentReference.trim() || `STAFF-DESK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        paymentStatus,
        requestSource,
        submittedByStaffId: currentUser?.id,
        submittedByStaffName: currentUser?.fullName || 'Staff Member',
        submittedByStaffRole: currentUser?.role || 'staff',
        patientId: selectedPatient?.id,
        urgency,
        justificationNotes: justificationNotes.trim() || undefined,
        dispatchPreference
      };

      const newApp = PortalService.saveCardApplication(payload);

      showToast(
        'success',
        'Health Card Request Created! 📋',
        `Tracking ID: ${newApp.trackingId}. Request routed to Super Admin approval queue.`
      );

      setCreatedApplication(newApp);
      if (onRequestCreated) {
        onRequestCreated(newApp);
      }
    } catch (err: any) {
      showToast('error', 'Request Failed', err?.message || 'Failed to submit card creation request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setCreatedApplication(null);
    setSelectedPatient(null);
    setPatientSearch('');
    setFullName('');
    setMobile('');
    setJustificationNotes('');
    setPaymentReference('');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={createdApplication ? "Card Creation Request Submitted" : "Request New Health Card (Staff Submission)"}
        maxWidth="4xl"
      >
        {createdApplication ? (
          /* Confirmation Success State */
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Health Card Request Registered</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Request for <strong className="text-white">{createdApplication.fullName}</strong> has been transmitted to Firestore and queued for Super Admin review & card minting.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md mx-auto text-left space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Tracking ID:</span>
                <strong className="text-teal-400 font-bold">{createdApplication.trackingId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Plan:</span>
                <strong className="text-amber-300 font-bold">{createdApplication.membershipName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Collected:</span>
                <strong className="text-emerald-400 font-bold">{formatCurrency(createdApplication.totalPaidAmount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Urgency Level:</span>
                <span className="capitalize text-white font-bold">{createdApplication.urgency || 'Normal'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40">
                  PENDING SUPER ADMIN APPROVAL
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                leftIcon={<Printer className="w-4 h-4 text-teal-400" />}
                onClick={() => setIsSlipModalOpen(true)}
              >
                Print Request Acknowledgement Slip
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForAnother}
              >
                Submit Another Request
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Form Entry State */
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Staff Submitter Banner */}
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300 font-sans">
                  Submitting as: <strong className="text-white">{currentUser?.fullName}</strong> ({currentUser?.role?.replace('_', ' ').toUpperCase()})
                </span>
              </div>
              <span className="text-[10px] text-indigo-300 font-mono bg-indigo-900/60 px-2 py-0.5 rounded-full border border-indigo-700">
                Firestore Real-Time Sync
              </span>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  mode === 'existing'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                1. Existing Registered Patient
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  mode === 'new'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                2. New Applicant Walk-In
              </button>
            </div>

            {/* Existing Patient Selection Mode */}
            {mode === 'existing' && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                {!selectedPatient ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                      Search Patient (Name, Mobile, or Patient ID):
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Type to search existing registered patients..."
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto pr-1">
                      {filteredPatients.length === 0 ? (
                        <p className="text-slate-500 italic py-2 text-center">No patients found matching query.</p>
                      ) : (
                        filteredPatients.map(patient => (
                          <div
                            key={patient.id}
                            onClick={() => handleSelectPatient(patient)}
                            className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-teal-950/50 border border-slate-800 hover:border-teal-500/50 cursor-pointer flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-teal-900/50 text-teal-300 font-bold flex items-center justify-center text-xs">
                                {patient.fullName.charAt(0)}
                              </div>
                              <div>
                                <strong className="text-white font-bold block">{patient.fullName}</strong>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {patient.id} • {patient.mobile} • {patient.gender} ({patient.age}y)
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              {patient.healthCardId ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                  Has Card ({patient.healthCardId})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
                                  No Card (Eligible)
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-800/40 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-sm">
                        {selectedPatient.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-white">{selectedPatient.fullName}</strong>
                          <span className="text-[10px] font-mono bg-slate-900 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                            {selectedPatient.id}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Mobile: {selectedPatient.mobile} • Blood: {selectedPatient.bloodGroup || 'O+'} • {selectedPatient.gender} ({selectedPatient.age}y)
                        </span>
                        {selectedPatient.healthCardId && (
                          <span className="text-[10px] text-amber-300 font-mono block mt-0.5">
                            ⚠️ Note: Patient already holds card {selectedPatient.healthCardId}. Submitting will request a card upgrade or renewal.
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
                      title="Change selected patient"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* New Applicant Registration Mode */}
            {mode === 'new' && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                  New Applicant Personal & Medical Details:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar Sharma"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 capitalize"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="patient@example.com (optional)"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Residential Address</label>
                    <input
                      type="text"
                      placeholder="Village / Town / Street, City, PIN"
                      value={fullAddress}
                      onChange={e => setFullAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Membership Tier Picker */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                Select Health Card Membership Tier:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {memberships.map(tier => (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedMembershipId(tier.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedMembershipId === tier.id
                        ? 'bg-teal-950/80 border-teal-500 ring-2 ring-teal-500/40'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Shield className={`w-4 h-4 ${selectedMembershipId === tier.id ? 'text-teal-400' : 'text-slate-500'}`} />
                      <strong className="text-white font-mono text-xs">{formatCurrency(tier.registrationFee)}</strong>
                    </div>
                    <strong className="text-xs font-bold text-white block truncate">{tier.name}</strong>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                      {tier.labDiscount || tier.opdDiscount || 15}% Discount
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgency & Dispatch Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Request Urgency</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                >
                  <option value="normal">Normal (Standard 24-48h)</option>
                  <option value="urgent">Urgent (Same-Day Minting)</option>
                  <option value="emergency">Emergency (Immediate Critical)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Dispatch / Delivery</label>
                <select
                  value={dispatchPreference}
                  onChange={e => setDispatchPreference(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                >
                  <option value="collect_at_clinic">Collect at Clinic Desk</option>
                  <option value="courier">Courier Doorstep Delivery</option>
                  <option value="digital_only">Digital Virtual Card Only</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Initial Wallet Float (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={initialDeposit}
                  onChange={e => setInitialDeposit(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Payment Verification & Collection Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Payment Collection & Reconciliation:
                </span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  Total Payable: {formatCurrency(totalCalculated)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="Front Desk Cash POS">Front Desk Cash / POS</option>
                    <option value="UPI Direct / QR Code">UPI Direct / QR Code</option>
                    <option value="Hospital Voucher POS">Cash Desk Voucher</option>
                    <option value="Net Banking / NEFT">Net Banking / NEFT</option>
                    <option value="Complimentary / Waived">Complimentary / Waived</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Ref / UTR / Voucher No</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-982142 or Receipt #"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="paid">Paid & Verified</option>
                    <option value="pending_verification">Pending Bank Verification</option>
                    <option value="pending">Unpaid / Pay on Collection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-sans block mb-1">
                  Staff Justification / Clinical Recommendation Notes:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient referred by Dr. Mukherjee for annual comprehensive diagnostic coverage..."
                  value={justificationNotes}
                  onChange={e => setJustificationNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<CreditCard className="w-4 h-4" />}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-lg"
              >
                Submit Request to Super Admin
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <CardRequestSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        application={createdApplication}
      />
    </>
  );
};
