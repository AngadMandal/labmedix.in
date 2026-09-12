import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { StorageService, STORAGE_KEYS } from '../../services/storage';
import { IpdAdmission, IpdDoctorRound, HospitalWard, HospitalBed, Patient } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  BedDouble,
  Building,
  User,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  FileText,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
  Stethoscope,
  Activity,
  AlertCircle,
  FileCheck,
  CreditCard,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const InpatientDepartmentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [admissions, setAdmissions] = useState<IpdAdmission[]>(() => HospitalService.getAdmissions());
  const [wards, setWards] = useState<HospitalWard[]>(() => HospitalService.getWards());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());

  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'discharged' | 'all'>('active');

  // Modals
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<IpdAdmission | null>(null);

  // New Admission Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [admissionType, setAdmissionType] = useState<'emergency' | 'planned_opd' | 'transfer'>('planned_opd');
  const [selectedWardId, setSelectedWardId] = useState(wards[0]?.id || '');
  const [availableBeds, setAvailableBeds] = useState<HospitalBed[]>([]);
  const [selectedBedNumber, setSelectedBedNumber] = useState('');
  const [attendingDoctorName, setAttendingDoctorName] = useState('Dr. Debabrata Roy (Lead Physician)');
  const [department, setDepartment] = useState('General Medicine');
  const [admittingDiagnosis, setAdmittingDiagnosis] = useState('');
  const [advancePaid, setAdvancePaid] = useState<number>(5000);

  // Doctor Round Form State
  const [roundNotes, setRoundNotes] = useState('');
  const [roundAdvice, setRoundAdvice] = useState('');
  const [doctorName, setDoctorName] = useState(currentUser?.fullName || 'Dr. Debabrata Roy');

  // Discharge Summary Form State
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [hospitalCourse, setHospitalCourse] = useState('');
  const [conditionAtDischarge, setConditionAtDischarge] = useState('Hemodynamically stable, afebrile, vitals normal');
  const [dischargeMeds, setDischargeMeds] = useState('Tab. Amoxicillin-Clav 625mg BD x 5 days, Tab. Paracetamol 650mg SOS');
  const [followUpAdvice, setFollowUpAdvice] = useState('Follow up in OPD after 7 days or SOS in Emergency if warning signs occur.');

  const refreshData = () => {
    setAdmissions(HospitalService.getAdmissions());
    setWards(HospitalService.getWards());
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.key === STORAGE_KEYS.IPD_ADMISSIONS) {
        setAdmissions(HospitalService.getAdmissions());
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  // Update available beds when selected ward changes
  useEffect(() => {
    if (selectedWardId) {
      const beds = HospitalService.getBeds(selectedWardId).filter(b => b.status === 'available');
      setAvailableBeds(beds);
      if (beds.length > 0) setSelectedBedNumber(beds[0].bedNumber);
      else setSelectedBedNumber('');
    }
  }, [selectedWardId]);

  // Filtered Admissions
  const filteredAdmissions = useMemo(() => {
    return admissions.filter(adm => {
      const matchesSearch =
        adm.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.contactNumber.includes(searchQuery);

      const matchesWard = wardFilter === 'all' || adm.wardId === wardFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = adm.status === 'admitted' || adm.status === 'transferred' || adm.status === 'discharge_planned';
      } else if (statusFilter === 'discharged') {
        matchesStatus = adm.status === 'discharged';
      }

      return matchesSearch && matchesWard && matchesStatus;
    });
  }, [admissions, searchQuery, wardFilter, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const active = admissions.filter(a => a.status === 'admitted' || a.status === 'transferred' || a.status === 'discharge_planned').length;
    const discharged = admissions.filter(a => a.status === 'discharged').length;
    const totalRounds = admissions.reduce((sum, a) => sum + (a.rounds?.length || 0), 0);
    return { active, discharged, total: admissions.length, totalRounds };
  }, [admissions]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
  };

  const handleCreateAdmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      showToast('error', 'Select Patient', 'Please select a registered patient for IPD admission.');
      return;
    }
    if (!selectedWardId || !selectedBedNumber) {
      showToast('error', 'Select Bed', 'Please choose a ward and available bed.');
      return;
    }

    const ward = wards.find(w => w.id === selectedWardId);
    if (!ward) return;

    try {
      const adm = HospitalService.createAdmission({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        uhid: selectedPatient.id,
        age: selectedPatient.age || 40,
        gender: selectedPatient.gender || 'Male',
        bloodGroup: selectedPatient.bloodGroup,
        contactNumber: selectedPatient.mobile || '',
        admissionType,
        wardId: ward.id,
        wardName: ward.name,
        bedNumber: selectedBedNumber,
        attendingDoctorId: 'doc_lead',
        attendingDoctorName,
        department,
        admittingDiagnosis: admittingDiagnosis || 'Acute Inpatient Evaluation',
        dailyRoomRate: ward.dailyRate,
        advancePaid: Number(advancePaid),
        currentUser
      });

      showToast('success', 'Patient Admitted', `IPD Admission ${adm.admissionNumber} created for ${adm.patientName}`);
      setIsAdmitModalOpen(false);
      setSelectedPatient(null);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Admission Error', err.message);
    }
  };

  const handleSaveRound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !roundNotes.trim()) return;

    try {
      HospitalService.addDoctorRound(selectedAdmission.id, {
        doctorId: currentUser?.id || 'doc_lead',
        doctorName,
        clinicalNotes: roundNotes,
        treatmentAdvice: roundAdvice
      });

      showToast('success', 'Doctor Round Logged', `Clinical notes added for ${selectedAdmission.patientName}`);
      setIsRoundModalOpen(false);
      setRoundNotes('');
      setRoundAdvice('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Round Note Error', err.message);
    }
  };

  const handleSaveDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !finalDiagnosis.trim()) return;

    try {
      HospitalService.dischargePatient(selectedAdmission.id, {
        diagnosis: finalDiagnosis,
        hospitalCourse,
        conditionAtDischarge,
        medicationsOnDischarge: dischargeMeds,
        followUpAdvice,
        signedByDoctor: doctorName
      });

      showToast('success', 'Discharge Completed', `Discharge summary logged for ${selectedAdmission.patientName}`);
      setIsDischargeModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Discharge Error', err.message);
    }
  };

  const handleFinalBill = (adm: IpdAdmission) => {
    try {
      const bill = HospitalService.generateFinalIpdBill(adm.id, currentUser);
      showToast('success', 'Final IPD Bill Generated', `Bill ${bill.billNumber} created for ₹${bill.netPayable}`);
      refreshData();
      navigate('/print-center');
    } catch (err: any) {
      showToast('error', 'Billing Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 sm:p-8 border border-blue-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              Module 8 • Inpatient Care & Bed Allocations
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <BedDouble className="w-8 h-8 text-blue-400" />
              Inpatient Department (IPD)
            </h1>
            <p className="text-blue-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              Complete inpatient management: Admission desk, automated bed reservation, daily physician rounds, clinical documentation, discharge summaries, and final hospital billing settlement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Inpatients"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setAdmittingDiagnosis('');
                setIsAdmitModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Admit New Patient
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Inpatients</span>
            <BedDouble className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{metrics.active}</p>
          <span className="text-[11px] text-slate-400">Currently admitted in beds</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Discharged Patients</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.discharged}</p>
          <span className="text-[11px] text-slate-400">With discharge summary</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Doctor Rounds Logged</span>
            <Stethoscope className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{metrics.totalRounds}</p>
          <span className="text-[11px] text-slate-400">Total clinical round notes</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hospital Wards</span>
            <Building className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{wards.length}</p>
          <span className="text-[11px] text-slate-400">ICU, CCU, General, Private</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search IPD #, patient name, bed..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Active Inpatients
            </button>
            <button
              onClick={() => setStatusFilter('discharged')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'discharged' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Discharged
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
          </div>

          {/* Ward filter */}
          <select
            value={wardFilter}
            onChange={e => setWardFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Hospital Wards</option>
            {wards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inpatient Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Admission # & Date</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Ward & Bed Number</th>
                <th className="px-4 py-3.5">Attending Doctor & Diagnosis</th>
                <th className="px-4 py-3.5">Rounds</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <BedDouble className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-400" />
                    No inpatient records found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredAdmissions.map(adm => {
                  return (
                    <tr key={adm.id} className="hover:bg-slate-800/40 transition">
                      {/* IPD Number */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-white text-xs">
                          {adm.admissionNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatDateTime(adm.admissionDate)}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 mt-1 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300">
                          {adm.admissionType}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{adm.patientName}</div>
                        <div className="text-[11px] text-slate-400">
                          {adm.gender}, {adm.age}y {adm.bloodGroup && `• ${adm.bloodGroup}`} • {adm.contactNumber}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400">UHID: {adm.uhid}</div>
                      </td>

                      {/* Ward & Bed */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-blue-300">{adm.wardName}</div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs font-black">
                          🛏️ Bed {adm.bedNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ₹{adm.dailyRoomRate}/day
                        </div>
                      </td>

                      {/* Doctor & Diagnosis */}
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="font-semibold text-white">{adm.attendingDoctorName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{adm.admittingDiagnosis}</div>
                        <div className="text-[10px] text-indigo-400 font-medium">{adm.department}</div>
                      </td>

                      {/* Rounds */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          🩺 {adm.rounds?.length || 0} Rounds
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          adm.status === 'admitted'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : adm.status === 'discharge_planned'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {adm.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {adm.status !== 'discharged' ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedAdmission(adm);
                                  setIsRoundModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition"
                                title="Record Daily Clinical Round"
                              >
                                + Round
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedAdmission(adm);
                                  setFinalDiagnosis(adm.admittingDiagnosis);
                                  setIsDischargeModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                                title="Prepare Discharge Summary"
                              >
                                Discharge
                              </button>
                            </>
                          ) : !adm.isFinalBilled ? (
                            <button
                              onClick={() => handleFinalBill(adm)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition"
                              title="Generate Final Hospital Settlement Bill"
                            >
                              Final Bill
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Billed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Inpatient Admission Form */}
      {isAdmitModalOpen && (
        <Modal
          isOpen={isAdmitModalOpen}
          onClose={() => setIsAdmitModalOpen(false)}
          title="Admit Patient to Inpatient (IPD)"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateAdmission} className="space-y-4 text-xs">
            {/* Patient Search */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Search & Select Patient *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type name, UHID or mobile..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {patientSearch.trim().length > 1 && (
                <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-850">
                  {patients
                    .filter(p =>
                      p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
                      p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
                      (p.mobile && p.mobile.includes(patientSearch))
                    )
                    .slice(0, 5)
                    .map(p => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          handlePatientSelect(p);
                          setPatientSearch('');
                        }}
                        className="w-full text-left p-2 hover:bg-slate-850 flex items-center justify-between text-slate-300"
                      >
                        <span className="font-bold text-white">{p.fullName}</span>
                        <span className="text-[10px] text-cyan-400">{p.id} • {p.mobile}</span>
                      </button>
                    ))}
                </div>
              )}

              {selectedPatient && (
                <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{selectedPatient.fullName}</span>
                    <span className="text-slate-400 ml-2">({selectedPatient.gender}, {selectedPatient.age}y)</span>
                  </div>
                  <span className="text-cyan-400 font-mono text-[10px]">UHID: {selectedPatient.id}</span>
                </div>
              )}
            </div>

            {/* Admission Type & Ward Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Admission Type</label>
                <select
                  value={admissionType}
                  onChange={e => setAdmissionType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="planned_opd">Planned OPD Admission</option>
                  <option value="emergency">Emergency / Casualty</option>
                  <option value="transfer">Hospital Transfer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Ward *</label>
                <select
                  value={selectedWardId}
                  onChange={e => setSelectedWardId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} (₹{w.dailyRate}/day)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Available Bed *</label>
                <select
                  value={selectedBedNumber}
                  onChange={e => setSelectedBedNumber(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {availableBeds.length === 0 ? (
                    <option value="">No beds available</option>
                  ) : (
                    availableBeds.map(b => (
                      <option key={b.id} value={b.bedNumber}>
                        Bed {b.bedNumber} ({b.type})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Doctor & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Attending Specialist</label>
                <input
                  type="text"
                  value={attendingDoctorName}
                  onChange={e => setAttendingDoctorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Clinical Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {/* Admitting Diagnosis */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Admitting Provisional Diagnosis *</label>
              <textarea
                required
                rows={2}
                value={admittingDiagnosis}
                onChange={e => setAdmittingDiagnosis(e.target.value)}
                placeholder="e.g. Acute exacerbation of COPD, severe respiratory distress"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Initial Admission Deposit / Advance (₹)</label>
              <input
                type="number"
                value={advancePaid}
                onChange={e => setAdvancePaid(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdmitModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedPatient || !selectedBedNumber}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
              >
                Admit Patient & Allocate Bed
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Doctor Clinical Round Log */}
      {isRoundModalOpen && selectedAdmission && (
        <Modal
          isOpen={isRoundModalOpen}
          onClose={() => setIsRoundModalOpen(false)}
          title={`Clinical Round: ${selectedAdmission.patientName} (Bed ${selectedAdmission.bedNumber})`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveRound} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Diagnosis: </span>
                <span className="text-white font-bold">{selectedAdmission.admittingDiagnosis}</span>
              </div>
              <span className="text-blue-400 font-mono text-[11px]">{selectedAdmission.wardName}</span>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Attending Doctor / Physician</label>
              <input
                type="text"
                value={doctorName}
                onChange={e => setDoctorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Doctor's Progress / Clinical Notes *</label>
              <textarea
                required
                rows={4}
                value={roundNotes}
                onChange={e => setRoundNotes(e.target.value)}
                placeholder="General condition, chest clear, vitals stable, bowel sounds present, response to IV antibiotics"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Treatment Advice & Medication Adjustments</label>
              <textarea
                rows={3}
                value={roundAdvice}
                onChange={e => setRoundAdvice(e.target.value)}
                placeholder="Continue IV Ceftriaxone, taper IV fluids to 50ml/hr, mobilize out of bed, repeat CBC tomorrow morning"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRoundModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
              >
                Save Doctor Round
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Discharge Summary Generator */}
      {isDischargeModalOpen && selectedAdmission && (
        <Modal
          isOpen={isDischargeModalOpen}
          onClose={() => setIsDischargeModalOpen(false)}
          title={`Hospital Discharge Summary: ${selectedAdmission.patientName}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveDischarge} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
              <div className="font-bold text-emerald-300 text-sm">Official Discharge Summary & Clearance</div>
              <div className="text-slate-400 text-[11px] mt-1">
                Admitted on: {formatDate(selectedAdmission.admissionDate)} • Ward: {selectedAdmission.wardName} (Bed {selectedAdmission.bedNumber})
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Final Confirmed Diagnosis *</label>
              <input
                type="text"
                required
                value={finalDiagnosis}
                onChange={e => setFinalDiagnosis(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Hospital Course & Treatment Summary</label>
              <textarea
                rows={3}
                value={hospitalCourse}
                onChange={e => setHospitalCourse(e.target.value)}
                placeholder="Patient was admitted with acute symptoms. Started on broad-spectrum IV antibiotics and supportive therapy. Symptomatic improvement noted by Day 2. Afebrile for 48 hours."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Condition at Discharge</label>
              <input
                type="text"
                value={conditionAtDischarge}
                onChange={e => setConditionAtDischarge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Discharge Medications & Dosages</label>
              <textarea
                rows={3}
                value={dischargeMeds}
                onChange={e => setDischargeMeds(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Follow-Up Advice & Warning Signs</label>
              <input
                type="text"
                value={followUpAdvice}
                onChange={e => setFollowUpAdvice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDischargeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
              >
                Finalize Discharge & Release Bed
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
