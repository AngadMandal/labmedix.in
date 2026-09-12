import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { StorageService, STORAGE_KEYS } from '../../services/storage';
import { EmergencyEncounter, EmergencyTriagePriority, HospitalWard, HospitalBed, Patient } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Activity,
  AlertTriangle,
  HeartPulse,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Ambulance,
  BedDouble,
  FileText,
  Printer,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Stethoscope,
  Pill
} from 'lucide-react';

export const EmergencyDepartmentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [encounters, setEncounters] = useState<EmergencyEncounter[]>(() => HospitalService.getEmergencyEncounters());
  const [wards, setWards] = useState<HospitalWard[]>(() => HospitalService.getWards());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | EmergencyTriagePriority>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  // Modals
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [isIpdModalOpen, setIsIpdModalOpen] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<EmergencyEncounter | null>(null);

  // New Triage Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState<number>(35);
  const [gender, setGender] = useState('Male');
  const [contactNumber, setContactNumber] = useState('');
  const [arrivalMode, setArrivalMode] = useState<'ambulance' | 'walk_in' | 'wheelchair' | 'stretcher'>('ambulance');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [priority, setPriority] = useState<EmergencyTriagePriority>('red');
  const [triageNotes, setTriageNotes] = useState('');

  // Vitals State
  const [bpSystolic, setBpSystolic] = useState<number>(120);
  const [bpDiastolic, setBpDiastolic] = useState<number>(80);
  const [pulse, setPulse] = useState<number>(88);
  const [temperature, setTemperature] = useState<number>(98.6);
  const [spo2, setSpo2] = useState<number>(98);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(18);
  const [gcsScore, setGcsScore] = useState<number>(15);
  const [painScore, setPainScore] = useState<number>(5);

  // IPD Conversion Form State
  const [selectedWardId, setSelectedWardId] = useState('');
  const [availableBeds, setAvailableBeds] = useState<HospitalBed[]>([]);
  const [selectedBedNumber, setSelectedBedNumber] = useState('');
  const [admittingDoctor, setAdmittingDoctor] = useState('Dr. Ananya Sen');
  const [department, setDepartment] = useState('Critical Care & Trauma');
  const [admittingDiagnosis, setAdmittingDiagnosis] = useState('');

  // Medication Admin Form State
  const [medName, setMedName] = useState('Inj. Pantoprazole 40mg');
  const [medDose, setMedDose] = useState('40 mg IV Stat');
  const [medRoute, setMedRoute] = useState('IV Push');

  const refreshData = () => {
    setEncounters(HospitalService.getEmergencyEncounters());
    setWards(HospitalService.getWards());
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.key === STORAGE_KEYS.EMERGENCY_ENCOUNTERS) {
        setEncounters(HospitalService.getEmergencyEncounters());
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  // Update available beds when ward changes in IPD modal
  useEffect(() => {
    if (selectedWardId) {
      const beds = HospitalService.getBeds(selectedWardId).filter(b => b.status === 'available');
      setAvailableBeds(beds);
      if (beds.length > 0) setSelectedBedNumber(beds[0].bedNumber);
      else setSelectedBedNumber('');
    }
  }, [selectedWardId]);

  // Priority badge styling
  const getPriorityBadge = (p: EmergencyTriagePriority) => {
    switch (p) {
      case 'red':
        return { label: '🔴 RED - RESUSCITATION', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/50' };
      case 'yellow':
        return { label: '🟡 YELLOW - URGENT', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'green':
        return { label: '🟢 GREEN - STABLE', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'black':
        return { label: '⚫ BLACK - EXPECTANT', bg: 'bg-slate-700/50 text-slate-300 border-slate-600' };
    }
  };

  // Filtered encounters
  const filteredEncounters = useMemo(() => {
    return encounters.filter(e => {
      const matchesSearch =
        e.encounterNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.contactNumber.includes(searchQuery) ||
        (e.uhid && e.uhid.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = priorityFilter === 'all' || e.priority === priorityFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = e.status === 'triaged' || e.status === 'under_treatment';
      } else if (statusFilter === 'admitted') {
        matchesStatus = e.status === 'admitted_ipd';
      } else if (statusFilter === 'discharged') {
        matchesStatus = e.status === 'discharged';
      }

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [encounters, searchQuery, priorityFilter, statusFilter]);

  // Counts
  const stats = useMemo(() => {
    const total = encounters.length;
    const red = encounters.filter(e => e.priority === 'red' && (e.status === 'triaged' || e.status === 'under_treatment')).length;
    const yellow = encounters.filter(e => e.priority === 'yellow' && (e.status === 'triaged' || e.status === 'under_treatment')).length;
    const active = encounters.filter(e => e.status === 'triaged' || e.status === 'under_treatment').length;
    const admitted = encounters.filter(e => e.status === 'admitted_ipd').length;
    return { total, red, yellow, active, admitted };
  }, [encounters]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatientId(p.id);
    setPatientName(p.fullName);
    setAge(p.age || 35);
    setGender(p.gender || 'Male');
    setContactNumber(p.mobile || '');
  };

  const handleSaveTriage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      showToast('error', 'Patient Required', 'Please enter patient name or select an existing registered patient.');
      return;
    }

    try {
      const encounter = HospitalService.createEmergencyEncounter({
        patientId: selectedPatientId || `pt_er_${Date.now()}`,
        uhid: selectedPatientId,
        patientName,
        age: Number(age),
        gender,
        contactNumber,
        arrivalMode,
        chiefComplaint,
        priority,
        vitals: {
          bpSystolic: Number(bpSystolic),
          bpDiastolic: Number(bpDiastolic),
          pulse: Number(pulse),
          temperature: Number(temperature),
          spo2: Number(spo2),
          respiratoryRate: Number(respiratoryRate),
          gcsScore: Number(gcsScore),
          painScore: Number(painScore)
        },
        attendingDoctorName: 'Dr. Debabrata Roy (ER Registrar)',
        triageNotes,
        currentUser
      });

      showToast('success', 'Emergency Triage Logged', `${encounter.encounterNumber} assigned Priority ${encounter.priority.toUpperCase()}`);
      setIsTriageModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Triage Failed', err.message);
    }
  };

  const handleConvertIpd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter || !selectedWardId || !selectedBedNumber) {
      showToast('error', 'Missing Allocation', 'Please select destination ward and bed.');
      return;
    }

    try {
      const res = HospitalService.convertEmergencyToIpd(selectedEncounter.id, {
        wardId: selectedWardId,
        bedNumber: selectedBedNumber,
        attendingDoctorId: 'doc_ipd_lead',
        attendingDoctorName: admittingDoctor,
        department,
        admittingDiagnosis: admittingDiagnosis || selectedEncounter.chiefComplaint,
        currentUser
      });

      showToast('success', 'Converted to IPD', `Patient admitted to ${res.admission.wardName} Bed ${res.admission.bedNumber}`);
      setIsIpdModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'IPD Conversion Error', err.message);
    }
  };

  const handleAdministerMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter || !medName.trim()) return;

    try {
      HospitalService.addEmergencyMedication(selectedEncounter.id, {
        medicineName: medName,
        dose: medDose,
        route: medRoute
      });

      showToast('success', 'Medication Logged', `${medName} recorded under ER treatment`);
      setIsMedModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Medication Log Error', err.message);
    }
  };

  const handleBillEncounter = (enc: EmergencyEncounter) => {
    try {
      const bill = HospitalService.billEmergencyEncounter(enc.id, currentUser);
      showToast('success', 'Emergency Bill Generated', `Bill ${bill.billNumber} created for ₹${bill.netPayable}`);
      refreshData();
      navigate('/print-center');
    } catch (err: any) {
      showToast('error', 'Billing Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-red-950 p-6 sm:p-8 border border-rose-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              Module 7 • Casualty & Resuscitation Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Ambulance className="w-8 h-8 text-rose-400" />
              Emergency Department (ED)
            </h1>
            <p className="text-rose-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              Rapid intake, standardized Manchester 4-level triage color coding, resuscitation vitals monitoring, STAT medication administration, and direct IPD admission conversion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedPatientId('');
                setPatientName('');
                setChiefComplaint('');
                setPriority('red');
                setIsTriageModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Quick Triage Intake
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Encounters</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">Today's emergency visits</span>
        </div>

        <div className="bg-rose-950/40 border border-rose-800/50 p-4 rounded-2xl ring-1 ring-rose-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Priority RED</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.red}</p>
          <span className="text-[11px] text-rose-300/80">Crash resuscitation required</span>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Priority YELLOW</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.yellow}</p>
          <span className="text-[11px] text-amber-300/80">Urgent care under 15 mins</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Under Treatment</span>
            <HeartPulse className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{stats.active}</p>
          <span className="text-[11px] text-slate-400">In ER Observation bays</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">IPD Converted</span>
            <BedDouble className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1">{stats.admitted}</p>
          <span className="text-[11px] text-slate-400">Moved to ICU / Wards</span>
        </div>
      </div>

      {/* Control Bar: Search & Triage Filters */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, ER #, mobile..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'active' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Active Bays
            </button>
            <button
              onClick={() => setStatusFilter('admitted')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'admitted' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Moved to IPD
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All Records
            </button>
          </div>

          {/* Priority dropdown */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Priorities</option>
            <option value="red">🔴 Priority RED</option>
            <option value="yellow">🟡 Priority YELLOW</option>
            <option value="green">🟢 Priority GREEN</option>
            <option value="black">⚫ Priority BLACK</option>
          </select>
        </div>
      </div>

      {/* Emergency Encounters Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Priority & Code</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Arrival Mode & Complaint</th>
                <th className="px-4 py-3.5">Vitals Recorded</th>
                <th className="px-4 py-3.5">ER Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEncounters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Ambulance className="w-10 h-10 mx-auto mb-2 opacity-30 text-rose-400" />
                    No emergency encounters matching your filters.
                  </td>
                </tr>
              ) : (
                filteredEncounters.map(enc => {
                  const badge = getPriorityBadge(enc.priority);
                  return (
                    <tr key={enc.id} className="hover:bg-slate-800/40 transition">
                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <div className="text-[11px] font-mono font-bold text-white mt-1">
                          {enc.encounterNumber}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatDateTime(enc.arrivedAt)}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{enc.patientName}</div>
                        <div className="text-[11px] text-slate-400">
                          {enc.gender}, {enc.age} yrs • {enc.contactNumber}
                        </div>
                        {enc.uhid && (
                          <div className="text-[10px] font-mono text-cyan-400">UHID: {enc.uhid}</div>
                        )}
                      </td>

                      {/* Mode & Complaint */}
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <span className="capitalize font-semibold text-slate-300">
                          🚑 {enc.arrivalMode.replace(/_/g, ' ')}
                        </span>
                        <p className="text-slate-400 text-[11px] truncate mt-0.5" title={enc.chiefComplaint}>
                          {enc.chiefComplaint}
                        </p>
                      </td>

                      {/* Vitals */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {enc.vitals.bpSystolic && (
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                              BP: <strong className="text-white">{enc.vitals.bpSystolic}/{enc.vitals.bpDiastolic}</strong>
                            </span>
                          )}
                          {enc.vitals.pulse && (
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                              Pulse: <strong className="text-rose-400">{enc.vitals.pulse}</strong>
                            </span>
                          )}
                          {enc.vitals.spo2 && (
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                              SpO₂: <strong className="text-cyan-400">{enc.vitals.spo2}%</strong>
                            </span>
                          )}
                          {enc.vitals.temperature && (
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                              Temp: <strong className="text-amber-400">{enc.vitals.temperature}°F</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          enc.status === 'triaged'
                            ? 'bg-amber-500/20 text-amber-300'
                            : enc.status === 'under_treatment'
                            ? 'bg-rose-500/20 text-rose-300'
                            : enc.status === 'admitted_ipd'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {enc.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {enc.status !== 'admitted_ipd' && enc.status !== 'discharged' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedEncounter(enc);
                                  setIsMedModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[10px] transition"
                                title="Administer Medication"
                              >
                                <Pill className="w-3.5 h-3.5 inline mr-1" />
                                Rx Med
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedEncounter(enc);
                                  setSelectedWardId(wards[0]?.id || '');
                                  setIsIpdModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition"
                                title="Admit directly to IPD Bed"
                              >
                                <BedDouble className="w-3.5 h-3.5 inline mr-1" />
                                Admit IPD
                              </button>
                            </>
                          )}

                          {!enc.isBilled ? (
                            <button
                              onClick={() => handleBillEncounter(enc)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                              title="Generate Official Emergency Bill"
                            >
                              Bill ₹{enc.totalEstimatedCharges}
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

      {/* MODAL 1: Quick Triage Intake Modal */}
      {isTriageModalOpen && (
        <Modal
          isOpen={isTriageModalOpen}
          onClose={() => setIsTriageModalOpen(false)}
          title="Emergency Casualty Triage Intake"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveTriage} className="space-y-4 text-xs">
            {/* Registered Patient Lookup */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Existing Patient Search (Optional)</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type name, phone or UHID..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-rose-500"
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
            </div>

            {/* Patient Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-slate-300 font-bold">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="Crash victim / Patient name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Contact / Attendant Mobile</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  placeholder="Emergency phone number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Arrival Mode</label>
                <select
                  value={arrivalMode}
                  onChange={e => setArrivalMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="ambulance">🚑 Ambulance (108 / Private)</option>
                  <option value="walk_in">🚶 Walk-in Ambulatory</option>
                  <option value="stretcher">🛏️ Trauma Stretcher</option>
                  <option value="wheelchair">🧑‍🦽 Wheelchair</option>
                </select>
              </div>
            </div>

            {/* Triage Priority Selector */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <label className="block text-rose-300 font-black uppercase tracking-wider text-[11px]">
                Triage Priority Classification *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('red')}
                  className={`p-2.5 rounded-xl border text-center font-black transition ${
                    priority === 'red'
                      ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/50'
                      : 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-850'
                  }`}
                >
                  🔴 RED
                  <div className="text-[9px] font-medium opacity-80">Immediate Life Threat</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('yellow')}
                  className={`p-2.5 rounded-xl border text-center font-black transition ${
                    priority === 'yellow'
                      ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-500/50'
                      : 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-850'
                  }`}
                >
                  🟡 YELLOW
                  <div className="text-[9px] font-medium opacity-80">Urgent &lt; 15 mins</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('green')}
                  className={`p-2.5 rounded-xl border text-center font-black transition ${
                    priority === 'green'
                      ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/50'
                      : 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-850'
                  }`}
                >
                  🟢 GREEN
                  <div className="text-[9px] font-medium opacity-80">Stable Ambulatory</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('black')}
                  className={`p-2.5 rounded-xl border text-center font-black transition ${
                    priority === 'black'
                      ? 'bg-slate-700 text-white border-slate-500 ring-2 ring-slate-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  ⚫ BLACK
                  <div className="text-[9px] font-medium opacity-80">Expectant</div>
                </button>
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-cyan-400 font-bold text-[11px]">Primary Survey Vitals</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
                <div>
                  <span className="text-slate-400 text-[10px]">Systolic BP</span>
                  <input
                    type="number"
                    value={bpSystolic}
                    onChange={e => setBpSystolic(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Diastolic BP</span>
                  <input
                    type="number"
                    value={bpDiastolic}
                    onChange={e => setBpDiastolic(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Pulse Rate (bpm)</span>
                  <input
                    type="number"
                    value={pulse}
                    onChange={e => setPulse(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">SpO₂ (%)</span>
                  <input
                    type="number"
                    value={spo2}
                    onChange={e => setSpo2(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Temp (°F)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Resp. Rate (/min)</span>
                  <input
                    type="number"
                    value={respiratoryRate}
                    onChange={e => setRespiratoryRate(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">GCS Score (3-15)</span>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    value={gcsScore}
                    onChange={e => setGcsScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Pain Score (0-10)</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={painScore}
                    onChange={e => setPainScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Complaints and Notes */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Chief Complaint *</label>
              <textarea
                required
                rows={2}
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="e.g. Acute severe chest pain radiating to left arm, sweating since 30 mins"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Triage Nursing Notes</label>
              <input
                type="text"
                value={triageNotes}
                onChange={e => setTriageNotes(e.target.value)}
                placeholder="Initial impression, airway status, IV access established"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTriageModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                Register & Triage Patient
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Convert Emergency to IPD Admission */}
      {isIpdModalOpen && selectedEncounter && (
        <Modal
          isOpen={isIpdModalOpen}
          onClose={() => setIsIpdModalOpen(false)}
          title={`Direct IPD Admission: ${selectedEncounter.patientName}`}
          maxWidth="lg"
        >
          <form onSubmit={handleConvertIpd} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40">
              <div className="text-purple-300 font-bold text-sm">Admitting from Emergency Bay</div>
              <div className="text-slate-400 text-[11px] mt-1">
                Patient: <strong className="text-white">{selectedEncounter.patientName}</strong> • {selectedEncounter.age}y/{selectedEncounter.gender}
              </div>
              <div className="text-slate-400 text-[11px]">
                Complaint: <span className="text-rose-300 font-medium">{selectedEncounter.chiefComplaint}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Destination Ward *</label>
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
                <label className="block text-slate-300 font-bold">Select Available Bed *</label>
                <select
                  value={selectedBedNumber}
                  onChange={e => setSelectedBedNumber(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {availableBeds.length === 0 ? (
                    <option value="">No available beds in this ward</option>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Attending Specialist</label>
                <input
                  type="text"
                  value={admittingDoctor}
                  onChange={e => setAdmittingDoctor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Admitting Diagnosis</label>
              <input
                type="text"
                value={admittingDiagnosis}
                onChange={e => setAdmittingDiagnosis(e.target.value)}
                placeholder="e.g. Acute STEMI / Polytrauma"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsIpdModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedBedNumber}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
              >
                Confirm Admission & Bed Allocation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Administer Emergency Medication */}
      {isMedModalOpen && selectedEncounter && (
        <Modal
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          title={`STAT Medication: ${selectedEncounter.patientName}`}
          maxWidth="md"
        >
          <form onSubmit={handleAdministerMed} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Medication Name *</label>
              <input
                type="text"
                required
                value={medName}
                onChange={e => setMedName(e.target.value)}
                placeholder="e.g. Inj. Tramadol 50mg"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Dosage</label>
                <input
                  type="text"
                  value={medDose}
                  onChange={e => setMedDose(e.target.value)}
                  placeholder="e.g. 1 Ampoule IV Stat"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Route</label>
                <select
                  value={medRoute}
                  onChange={e => setMedRoute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="IV Push">IV Push</option>
                  <option value="IV Infusion">IV Infusion</option>
                  <option value="IM">Intramuscular (IM)</option>
                  <option value="Subcutaneous">Subcutaneous (SC)</option>
                  <option value="Oral">Oral (PO)</option>
                  <option value="Nebulization">Nebulization</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                Log Medication Administration
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
