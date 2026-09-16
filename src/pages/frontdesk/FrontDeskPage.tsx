import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StorageService } from '../../services/storage';
import { PatientService } from '../../services/patientService';
import { CentralUhidService } from '../../services/centralUhidService';
import { EMRService } from '../../services/emrService';
import { DoctorMasterService } from '../../services/doctorMasterService';
import { Patient, HealthCard, Membership, PatientAppointment } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { DuplicatePatientWarningModal } from '../../components/patients/DuplicatePatientWarningModal';
import { PatientMergeModal } from '../../components/patients/PatientMergeModal';
import {
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  Stethoscope,
  TestTube,
  BedDouble,
  Pill,
  CreditCard,
  Printer,
  ArrowRight,
  RefreshCw,
  Sparkles,
  UserCheck,
  ChevronRight,
  AlertCircle,
  BadgePercent,
  X
} from 'lucide-react';

export const FrontDeskPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Navigation tab within Front Desk
  const [activeTab, setActiveTab] = useState<'journey' | 'directory'>('journey');

  // Master Data
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getActiveMemberships());
  const [doctors] = useState(() => DoctorMasterService.getAll());

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Health Card Selection State
  const [healthCardAvailable, setHealthCardAvailable] = useState<boolean | null>(null);
  const [selectedCard, setSelectedCard] = useState<HealthCard | null>(null);

  // New Patient Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regAge, setRegAge] = useState<number>(30);
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>('male');
  const [regBloodGroup, setRegBloodGroup] = useState('Unknown / Not Known');
  const [regAddress, setRegAddress] = useState('');
  const [regGovtId, setRegGovtId] = useState('');
  const [regEmergencyMobile, setRegEmergencyMobile] = useState('');
  const [previewUhid, setPreviewUhid] = useState('');
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [matchedDuplicatePatient, setMatchedDuplicatePatient] = useState<Patient | null>(null);
  const [duplicateReasons, setDuplicateReasons] = useState<string[]>([]);
  const [duplicateConfidence, setDuplicateConfidence] = useState<'HIGH_CONFIDENCE' | 'SUSPECTED_MATCH' | 'PARTIAL_MATCH'>('HIGH_CONFIDENCE');
  const [duplicateBypass, setDuplicateBypass] = useState(false);

  // Patient Merge Modal State
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTargetPatient, setMergeTargetPatient] = useState<Patient | null>(null);

  // Quick OPD Service Modal State (Front Desk Direct Token Issuance)
  const [isOpdModalOpen, setIsOpdModalOpen] = useState(false);
  const [opdDoctorId, setOpdDoctorId] = useState('');
  const [opdWishSlot, setOpdWishSlot] = useState('Morning OPD (09:00 AM - 01:00 PM)');
  const [opdChiefComplaint, setOpdChiefComplaint] = useState('General Clinical Consultation');
  const [createdOpdToken, setCreatedOpdToken] = useState<PatientAppointment | null>(null);
  const [isSubmittingOpd, setIsSubmittingOpd] = useState(false);

  // Refresh data on mount and listen to real-time events
  const refreshData = () => {
    setPatients(StorageService.getPatients());
    setCards(StorageService.getCards());
    setMemberships(StorageService.getActiveMemberships());
  };

  useEffect(() => {
    refreshData();
    const unsub = CentralUhidService.subscribe(() => {
      refreshData();
    });

    const handleSync = () => refreshData();
    window.addEventListener('labmedix_data_synced', handleSync);

    // Generate preview UHID
    CentralUhidService.generateNextUhid().then(uhidStr => {
      setPreviewUhid(uhidStr);
    });

    return () => {
      unsub();
      window.removeEventListener('labmedix_data_synced', handleSync);
    };
  }, []);

  // Search Results calculation
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return patients.filter(p => {
      if (p.isMerged) return false;
      const uhidMatch = (p.uhid || p.id).toLowerCase().includes(q);
      const nameMatch = (p.fullName || '').toLowerCase().includes(q);
      const mobileMatch = (p.mobile || '').includes(q);
      const histMatch = p.historicalUhids?.some(h => h.toLowerCase().includes(q));
      return uhidMatch || nameMatch || mobileMatch || histMatch;
    }).slice(0, 10);
  }, [searchQuery, patients]);

  // Helper for address string
  const formatPatientAddress = (addr: any) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    return addr.fullAddress || `${addr.villageArea || ''}, ${addr.district || ''}`;
  };

  // Handle selecting an existing patient
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');

    // Check if patient has an active health card
    const patientCards = cards.filter(c => c.patientId === patient.id || c.patientId === patient.uhid);
    const activeCard = patientCards.find(c => c.status === 'active') || patientCards[0] || null;

    if (activeCard) {
      setHealthCardAvailable(true);
      setSelectedCard(activeCard);
    } else {
      setHealthCardAvailable(null);
      setSelectedCard(null);
    }
  };

  // Card Membership Details
  const cardMembership = useMemo(() => {
    if (!selectedCard) return null;
    return memberships.find(m => m.id === selectedCard.membershipId) || memberships[0] || null;
  }, [selectedCard, memberships]);

  // Handle Registering a New Patient
  const handleOpenRegister = async () => {
    const nextUhid = await CentralUhidService.generateNextUhid();
    setPreviewUhid(nextUhid);
    setRegFullName('');
    setRegMobile('');
    setRegDob('');
    setRegAge(30);
    setRegGender('male');
    setRegBloodGroup('Unknown / Not Known');
    setRegAddress('');
    setRegGovtId('');
    setRegEmergencyMobile('');
    setDuplicateBypass(false);
    setIsRegisterModalOpen(true);
  };

  const handleSubmitNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regMobile.trim()) {
      showToast('error', 'Missing Information', 'Patient Full Name and Mobile are mandatory.');
      return;
    }

    // Server-side / Demographic duplicate validation
    if (!duplicateBypass) {
      const dupCheck = CentralUhidService.checkPossibleDuplicates(
        {
          fullName: regFullName,
          mobile: regMobile,
          dob: regDob,
          age: regAge,
          gender: regGender,
          governmentIdNumber: regGovtId,
          emergencyMobile: regEmergencyMobile
        },
        patients
      );

      if (dupCheck.hasDuplicates && dupCheck.matches.length > 0) {
        setMatchedDuplicatePatient(dupCheck.matches[0].patient);
        setDuplicateReasons(dupCheck.matches[0].reasons);
        setDuplicateConfidence(dupCheck.matches[0].confidence);
        setDuplicateWarningOpen(true);
        return;
      }
    }

    try {
      // Concurrency-safe registration via PatientService (which integrates CentralUhidService)
      const res = PatientService.createPatient({
        fullName: regFullName.trim(),
        dob: regDob || '1996-01-01',
        age: regAge,
        gender: regGender,
        mobile: regMobile.trim(),
        bloodGroup: regBloodGroup,
        photoUrl: '',
        address: {
          villageArea: regAddress || 'Central Hospital Zone',
          postOffice: 'Central P.O.',
          policeStation: 'South P.S.',
          district: 'Malda',
          state: 'West Bengal',
          pinCode: '732142',
          fullAddress: regAddress || 'Central Hospital Zone, Malda'
        },
        emergencyContact: {
          name: 'Family Guardian',
          relationship: 'Guardian',
          mobile: regEmergencyMobile || regMobile.trim()
        },
        medicalInfo: {
          bloodGroup: regBloodGroup,
          allergies: 'None',
          chronicConditions: 'None'
        },
        governmentIdNumber: regGovtId || undefined,
        governmentIdType: regGovtId ? 'Aadhaar Card' : undefined
      });

      const newPat = res.patient;
      refreshData();
      setIsRegisterModalOpen(false);
      handleSelectPatient(newPat);
      showToast('success', 'Patient Registered Successfully', `Assigned Permanent UHID: ${newPat.uhid || newPat.id}`);
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message || 'Could not register patient.');
    }
  };

  // Direct OPD Booking & Token Generation from Front Desk
  const handleLaunchOpdBooking = () => {
    if (!selectedPatient) return;
    setOpdDoctorId(doctors[0]?.id || 'doc_1');
    setCreatedOpdToken(null);
    setIsOpdModalOpen(true);
  };

  const handleCreateOpdToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const doc = doctors.find(d => d.id === opdDoctorId) || doctors[0];
    const baseFee = doc?.standardFee || 500;
    const discountPct = (healthCardAvailable && cardMembership) ? cardMembership.opdDiscount : 0;
    const netFee = Math.round(baseFee * (1 - discountPct / 100));

    setIsSubmittingOpd(true);
    try {
      const newApt = EMRService.saveAppointment({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        patientPhone: selectedPatient.mobile,
        cardNo: selectedCard?.cardNumber,
        cardTier: cardMembership?.name || 'Standard Patient',
        doctorId: doc?.id || 'doc_1',
        doctorName: doc?.name || 'Dr. Subhashish Roy',
        doctorSpeciality: doc?.speciality || 'General Medicine',
        department: doc?.department || 'OPD Medicine',
        consultationMode: 'physical_opd',
        patientWishDate: new Date().toISOString().slice(0, 10),
        patientWishSlot: opdWishSlot,
        patientWishTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chiefComplaint: opdChiefComplaint,
        consultationFee: netFee,
        status: 'doctor_confirmed'
      });

      setCreatedOpdToken(newApt);
      refreshData();
      showToast('success', 'OPD Token Generated', `Token ${newApt.queueToken || newApt.appointmentNo} issued for ${doc?.name}`);
    } catch (err: any) {
      showToast('error', 'Token Generation Failed', err.message);
    } finally {
      setIsSubmittingOpd(false);
    }
  };

  // Reset current patient journey
  const handleResetJourney = () => {
    setSelectedPatient(null);
    setSelectedCard(null);
    setHealthCardAvailable(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 01. FRONT DESK HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/40 border border-blue-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-500/30">
              01
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                FRONT DESK
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Single Patient Entry Point
                </span>
              </h1>
              <p className="text-xs text-slate-300">
                Patient Arrival &rarr; UHID &rarr; Health Card Check &rarr; Service Dispatch (OPD / Lab / IPD / Pharmacy)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={refreshData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live</span>
          </button>

          <button
            onClick={handleOpenRegister}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Patient Registration</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab('journey')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'journey'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Patient Journey & Service Dispatch</span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'directory'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Central Patient Master Directory ({patients.filter(p => !p.isMerged).length})</span>
        </button>
      </div>

      {activeTab === 'journey' && (
        <div className="space-y-6">
          {/* STEP 1: PATIENT SEARCH OR ACTIVE SELECTION */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Patient Arrival & Identification
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Always search existing patients first by UHID, Mobile, Health Card, or Name.
                  </p>
                </div>
              </div>

              {selectedPatient && (
                <button
                  onClick={handleResetJourney}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Change Patient</span>
                </button>
              )}
            </div>

            {!selectedPatient ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by UHID (e.g. LMX-00000001), Mobile (10 digits), Health Card No, or Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                {/* Live Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-lg">
                    {searchResults.map((patient) => {
                      const displayUhid = patient.uhid || patient.id;
                      const patientCards = cards.filter(c => c.patientId === patient.id || c.patientId === patient.uhid);
                      const activeCard = patientCards.find(c => c.status === 'active');

                      return (
                        <div
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer flex items-center justify-between gap-4 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center shrink-0">
                              {patient.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm text-slate-900 dark:text-white">{patient.fullName}</span>
                                <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  {displayUhid}
                                </span>
                                {activeCard && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Card: {activeCard.cardNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-1">
                                <span>{patient.gender.toUpperCase()} • {patient.age} Yrs</span>
                                <span>Mobile: {patient.mobile}</span>
                                {patient.address && <span className="truncate max-w-xs">{formatPatientAddress(patient.address)}</span>}
                              </div>
                            </div>
                          </div>

                          <button className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 flex items-center gap-1">
                            <span>Select</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Existing Patient Found</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        No record matched "{searchQuery}". You can register this patient now with an automatic UHID.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenRegister}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register New Patient</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Selected Patient Master Overview Card */
              <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                    {selectedPatient.fullName.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {selectedPatient.fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-mono text-xs font-black shadow-xs">
                        <span>UHID:</span>
                        <span>{selectedPatient.uhid || selectedPatient.id}</span>
                      </div>
                      <Badge variant="success">Permanent Patient Master</Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                      <span><strong>Age/Gender:</strong> {selectedPatient.age} Yrs / {selectedPatient.gender.toUpperCase()}</span>
                      <span><strong>Mobile:</strong> {selectedPatient.mobile}</span>
                      <span><strong>Blood:</strong> {selectedPatient.bloodGroup || 'Unknown'}</span>
                      {selectedPatient.address && <span><strong>Address:</strong> {formatPatientAddress(selectedPatient.address)}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMergeTargetPatient(selectedPatient);
                      setMergeModalOpen(true);
                    }}
                  >
                    Merge Records
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: HEALTH CARD VERIFICATION */}
          {selectedPatient && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Health Card Verification
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Does the patient have an active Health Card membership for OPD & Lab discounts?
                    </p>
                  </div>
                </div>

                {healthCardAvailable !== null && (
                  <Badge variant={healthCardAvailable ? 'success' : 'neutral'}>
                    {healthCardAvailable ? 'Card Active' : 'No Card (Standard Rate)'}
                  </Badge>
                )}
              </div>

              {selectedCard ? (
                /* Card Verified Display */
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          CARD #{selectedCard.cardNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                          {cardMembership?.name || 'Gold Card'}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-bold">
                          Status: Active (Valid till {selectedCard.expiryDate ? formatDate(selectedCard.expiryDate) : '2028'})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                          <BadgePercent className="w-3.5 h-3.5" />
                          OPD: {cardMembership?.opdDiscount || 25}% OFF
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                          <BadgePercent className="w-3.5 h-3.5" />
                          Lab: {cardMembership?.labDiscount || 30}% OFF
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                          <BadgePercent className="w-3.5 h-3.5" />
                          Pharmacy: {cardMembership?.pharmacyDiscount || 15}% OFF
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCard(null);
                        setHealthCardAvailable(false);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      Bypass Card
                    </button>
                  </div>
                </div>
              ) : (
                /* Card Availability Choice */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      const matched = cards.find(c => c.patientId === selectedPatient.id || c.patientId === selectedPatient.uhid);
                      if (matched) {
                        setSelectedCard(matched);
                        setHealthCardAvailable(true);
                      } else {
                        showToast('info', 'No Card on Record', 'No Health Card is registered under this patient UHID.');
                        setHealthCardAvailable(false);
                      }
                    }}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                      healthCardAvailable === true
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        YES — Patient Has Health Card
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Apply eligible tier discounts on doctor consultations and lab investigations.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedCard(null);
                      setHealthCardAvailable(false);
                    }}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                      healthCardAvailable === false
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        NO — Continue Without Health Card
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Patient proceeds to hospital services at standard rack rates.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SELECT SERVICE DISPATCH */}
          {selectedPatient && healthCardAvailable !== null && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Select Department Service
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Start the service-specific workflow for UHID: <strong className="text-blue-600 font-mono">{selectedPatient.uhid || selectedPatient.id}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. OPD SERVICE */}
                <div
                  onClick={handleLaunchOpdBooking}
                  className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer transition flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        OPD Consultation
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Book doctor appointment, calculate OPD fee, issue token slip, and send patient to doctor cabin.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span>Issue Token & Bill</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 2. LABORATORY SERVICE */}
                <div
                  onClick={() => navigate(`/laboratory?uhid=${selectedPatient.uhid || selectedPatient.id}&patientId=${selectedPatient.id}`)}
                  className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer transition flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                      <TestTube className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Laboratory
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Diagnostic test orders, sample collection barcode, testing, verification, and A4 half-page lab bill.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Start Lab Order</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 3. IPD SERVICE */}
                <div
                  onClick={() => navigate(`/ipd?uhid=${selectedPatient.uhid || selectedPatient.id}&patientId=${selectedPatient.id}`)}
                  className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 cursor-pointer transition flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                      <BedDouble className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        IPD Admission
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Inpatient admission, ward & bed allocation, nursing notes, inpatient services, and running bill.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                    <span>Admit Patient</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 4. PHARMACY SERVICE */}
                <div
                  onClick={() => navigate(`/pharmacy?uhid=${selectedPatient.uhid || selectedPatient.id}&patientId=${selectedPatient.id}`)}
                  className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 cursor-pointer transition flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Pharmacy
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Dispense doctor prescriptions, verify medicine stock & batches, retail sales, and pharmacy billing.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span>Open Pharmacy</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CENTRAL PATIENT MASTER DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Central Patient Master Directory
              </h2>
              <p className="text-xs text-slate-500">
                Single source of truth. Every record holds a permanent, collision-proof UHID.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search directory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">UHID</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Age / Gender</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Health Card</th>
                  <th className="py-2.5 px-3">Registered On</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {patients
                  .filter(p => !p.isMerged)
                  .filter(p => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (p.uhid || p.id).toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q) || p.mobile.includes(q);
                  })
                  .slice(0, 50)
                  .map((patient) => {
                    const displayUhid = patient.uhid || patient.id;
                    const pCards = cards.filter(c => c.patientId === patient.id || c.patientId === patient.uhid);
                    const hasActiveCard = pCards.some(c => c.status === 'active');

                    return (
                      <tr key={patient.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-mono font-black text-blue-600 dark:text-blue-400">
                          {displayUhid}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {patient.fullName}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {patient.age} Yrs / {patient.gender.toUpperCase()}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {patient.mobile}
                        </td>
                        <td className="py-3 px-3">
                          {hasActiveCard ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Active
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">None</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {patient.createdAt ? formatDate(patient.createdAt) : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                handleSelectPatient(patient);
                                setActiveTab('journey');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold"
                            >
                              Start Visit
                            </button>
                            <button
                              onClick={() => {
                                setMergeTargetPatient(patient);
                                setMergeModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold"
                            >
                              Merge
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW PATIENT REGISTRATION MODAL */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Patient — Front Desk"
      >
        <form onSubmit={handleSubmitNewPatient} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
            <span className="text-blue-700 dark:text-blue-300 font-medium">Automatic Concurrency-Safe UHID:</span>
            <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">{previewUhid}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Chandra Ghosh"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number (10 Digits) *</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="e.g. 9831012345"
                value={regMobile}
                onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Age (Yrs) *</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={regAge}
                  onChange={(e) => setRegAge(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
              <select
                value={regBloodGroup}
                onChange={(e) => setRegBloodGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="Unknown / Not Known">Unknown / Not Known</option>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Govt ID (Aadhaar / Voter)</label>
              <input
                type="text"
                placeholder="Optional 12-digit Aadhaar"
                value={regGovtId}
                onChange={(e) => setRegGovtId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Mobile</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="Guardian mobile number"
                value={regEmergencyMobile}
                onChange={(e) => setRegEmergencyMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
            <input
              type="text"
              placeholder="e.g. Hospital Road, Ward 4, Malda"
              value={regAddress}
              onChange={(e) => setRegAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register & Assign UHID
            </Button>
          </div>
        </form>
      </Modal>

      {/* QUICK OPD TOKEN & BILLING MODAL */}
      <Modal
        isOpen={isOpdModalOpen}
        onClose={() => setIsOpdModalOpen(false)}
        title="Issue OPD Token & Bill — Front Desk"
      >
        {createdOpdToken ? (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Token #{createdOpdToken.queueToken || createdOpdToken.appointmentNo} Issued
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Patient {createdOpdToken.patientName} assigned to {createdOpdToken.doctorName}.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient UHID:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPatient?.uhid || selectedPatient?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{createdOpdToken.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">OPD Payable Fee:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(createdOpdToken.consultationFee || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Status:</span>
                <span className="font-bold text-emerald-600">PAID</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                <span>Print A4 Half-Page Slip</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpdModalOpen(false);
                  handleResetJourney();
                }}
              >
                Done (Next Patient)
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateOpdToken} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPatient?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UHID:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedPatient?.uhid || selectedPatient?.id}</span>
              </div>
              {selectedCard && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Health Card Discount:</span>
                  <span>{cardMembership?.opdDiscount || 25}% OFF</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Doctor *</label>
              <select
                value={opdDoctorId}
                onChange={(e) => setOpdDoctorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.speciality} (Fee: {formatCurrency(d.standardFee || 500)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
              <select
                value={opdWishSlot}
                onChange={(e) => setOpdWishSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="Morning OPD (09:00 AM - 01:00 PM)">Morning OPD (09:00 AM - 01:00 PM)</option>
                <option value="Afternoon OPD (01:00 PM - 05:00 PM)">Afternoon OPD (01:00 PM - 05:00 PM)</option>
                <option value="Evening OPD (05:00 PM - 09:00 PM)">Evening OPD (05:00 PM - 09:00 PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Chief Complaint</label>
              <input
                type="text"
                value={opdChiefComplaint}
                onChange={(e) => setOpdChiefComplaint(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsOpdModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmittingOpd}>
                {isSubmittingOpd ? 'Generating...' : 'Confirm & Generate Token'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* DUPLICATE PATIENT WARNING MODAL */}
      {matchedDuplicatePatient && (
        <DuplicatePatientWarningModal
          isOpen={duplicateWarningOpen}
          onClose={() => setDuplicateWarningOpen(false)}
          onProceedAnyway={() => {
            setDuplicateBypass(true);
            setDuplicateWarningOpen(false);
            showToast('info', 'Duplicate Bypass Acknowledged', 'Proceeding with new patient enrollment.');
          }}
          matchedPatient={matchedDuplicatePatient}
          duplicateField="demographics"
          reasons={duplicateReasons}
          confidence={duplicateConfidence}
        />
      )}

      {/* PATIENT MERGE MODAL */}
      {mergeTargetPatient && (
        <PatientMergeModal
          isOpen={mergeModalOpen}
          onClose={() => {
            setMergeModalOpen(false);
            setMergeTargetPatient(null);
          }}
          defaultSurvivingPatient={mergeTargetPatient}
          onMergeSuccess={() => {
            refreshData();
            handleResetJourney();
          }}
        />
      )}
    </div>
  );
};
export default FrontDeskPage;
