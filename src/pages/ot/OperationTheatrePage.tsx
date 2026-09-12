import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { StorageService } from '../../services/storage';
import { SurgeryBooking, SurgeryStatus, SurgeryCategory, Patient } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Scissors,
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  FileText,
  AlertCircle,
  Activity,
  Layers,
  ChevronRight,
  Flame
} from 'lucide-react';

export const OperationTheatrePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [surgeries, setSurgeries] = useState<SurgeryBooking[]>(() => HospitalService.getSurgeries());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isWhoModalOpen, setIsWhoModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<SurgeryBooking | null>(null);

  // Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [otNumber, setOtNumber] = useState('OT Suite 1 (Laparoscopy)');
  const [procedureName, setProcedureName] = useState('');
  const [category, setCategory] = useState<SurgeryCategory>('general_surgery');
  const [leadSurgeonName, setLeadSurgeonName] = useState('Dr. Sanjoy Mukherjee (MS Gen Surg)');
  const [anaesthetistName, setAnaesthetistName] = useState('Dr. Ananya Sen (MD Anaesthesia)');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledStartTime, setScheduledStartTime] = useState('09:30');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [theatreCharges, setTheatreCharges] = useState<number>(8500);
  const [surgeonCharges, setSurgeonCharges] = useState<number>(15000);
  const [anaesthesiaCharges, setAnaesthesiaCharges] = useState<number>(5000);

  // Notes state
  const [intraOpNotes, setIntraOpNotes] = useState('');
  const [postOpInstructions, setPostOpInstructions] = useState('');

  const refreshData = () => {
    setSurgeries(HospitalService.getSurgeries());
  };

  useEffect(() => {
    const handleSync = () => refreshData();
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const filteredSurgeries = useMemo(() => {
    return surgeries.filter(s => {
      const matchesSearch =
        s.procedureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.leadSurgeonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.otNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [surgeries, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = surgeries.length;
    const scheduled = surgeries.filter(s => s.status === 'scheduled').length;
    const inSurgery = surgeries.filter(s => s.status === 'in_surgery' || s.status === 'in_preparation').length;
    const completed = surgeries.filter(s => s.status === 'completed').length;
    return { total, scheduled, inSurgery, completed };
  }, [surgeries]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
  };

  const handleScheduleSurgery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !procedureName.trim()) {
      showToast('error', 'Incomplete Form', 'Please select a patient and procedure name.');
      return;
    }

    try {
      const booking = HospitalService.scheduleSurgery({
        otNumber,
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        uhid: selectedPatient.id,
        procedureName,
        category,
        leadSurgeonId: 'doc_surg_lead',
        leadSurgeonName,
        anaesthetistName,
        scheduledDate,
        scheduledStartTime,
        scheduledDurationMinutes: Number(durationMinutes),
        theatreCharges: Number(theatreCharges),
        surgeonCharges: Number(surgeonCharges),
        anaesthesiaCharges: Number(anaesthesiaCharges)
      });

      showToast('success', 'Surgery Scheduled', `${booking.procedureName} booked in ${booking.otNumber}`);
      setIsScheduleModalOpen(false);
      setSelectedPatient(null);
      setProcedureName('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Scheduling Failed', err.message);
    }
  };

  const handleSignWhoChecklist = (surgeryId: string) => {
    try {
      HospitalService.completeWhoChecklist(surgeryId);
      showToast('success', 'WHO Checklist Verified', 'Sign In, Time Out, and Sign Out protocols verified.');
      setIsWhoModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Checklist Error', err.message);
    }
  };

  const handleUpdateStatus = (s: SurgeryBooking, newStatus: SurgeryStatus) => {
    try {
      HospitalService.updateSurgeryStatus(s.id, newStatus);
      showToast('success', 'Status Updated', `Procedure is now ${newStatus.toUpperCase()}`);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Status Update Error', err.message);
    }
  };

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurgery) return;

    try {
      HospitalService.updateSurgeryStatus(selectedSurgery.id, selectedSurgery.status, {
        intraOp: intraOpNotes,
        postOp: postOpInstructions
      });

      showToast('success', 'Surgical Notes Saved', 'Intra-op and post-op documentation updated.');
      setIsNotesModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Notes Error', err.message);
    }
  };

  const handleBillSurgery = (s: SurgeryBooking) => {
    try {
      const bill = HospitalService.billSurgery(s.id, currentUser);
      showToast('success', 'Surgical Bill Generated', `Bill ${bill.billNumber} created for ₹${bill.netPayable}`);
      refreshData();
      navigate('/print-center');
    } catch (err: any) {
      showToast('error', 'Billing Error', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 p-6 sm:p-8 border border-violet-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-bold uppercase tracking-wider">
              <Scissors className="w-3.5 h-3.5 text-violet-400" />
              Module 11 • Surgical Suites & Operation Theatre (OT)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-violet-400" />
              Operation Theatre (OT) Suite
            </h1>
            <p className="text-violet-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              OT schedule, WHO Safe Surgery Checklist verification, lead surgeon & anaesthetist mapping, intra-op surgical notes, PAC coordination, and automated theatre billing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh OT Schedule"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setProcedureName('');
                setIsScheduleModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Book Surgical Procedure
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Bookings</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">Scheduled surgical calendar</span>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Upcoming Scheduled</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.scheduled}</p>
          <span className="text-[11px] text-amber-300/80">Pending OT slot start</span>
        </div>

        <div className="bg-rose-950/30 border border-rose-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">In Surgery Now</span>
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.inSurgery}</p>
          <span className="text-[11px] text-rose-300/80">Active sterile field</span>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Completed & Recovering</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.completed}</p>
          <span className="text-[11px] text-emerald-300/80">PACU / Post-op wards</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search procedure, patient, surgeon..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Specialties</option>
            <option value="general_surgery">General Surgery</option>
            <option value="orthopedic">Orthopedics</option>
            <option value="gynaecology">Gynaecology & OBS</option>
            <option value="cardiac">Cardiac & CTVS</option>
            <option value="neuro">Neurosurgery</option>
            <option value="emergency">Emergency Trauma</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_surgery">In Surgery</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Surgeries Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Date & OT Suite</th>
                <th className="px-4 py-3.5">Procedure & Specialty</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Surgical Team</th>
                <th className="px-4 py-3.5">WHO Safety</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSurgeries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Scissors className="w-10 h-10 mx-auto mb-2 opacity-30 text-violet-400" />
                    No surgical bookings found. Click "Book Surgical Procedure" above.
                  </td>
                </tr>
              ) : (
                filteredSurgeries.map(surg => (
                  <tr key={surg.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-sm">{formatDate(surg.scheduledDate)}</div>
                      <div className="text-cyan-300 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {surg.scheduledStartTime} ({surg.scheduledDurationMinutes} mins)
                      </div>
                      <span className="inline-block px-2 py-0.5 mt-1 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                        {surg.otNumber}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-sm">{surg.procedureName}</div>
                      <span className="inline-block mt-0.5 text-[10px] uppercase font-bold text-indigo-400">
                        {surg.category.replace(/_/g, ' ')}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Total Charge: <strong className="text-white">₹{surg.totalCharges}</strong>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{surg.patientName}</div>
                      {surg.uhid && (
                        <div className="text-[10px] font-mono text-cyan-400">UHID: {surg.uhid}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white">👨‍⚕️ {surg.leadSurgeonName}</div>
                      {surg.anaesthetistName && (
                        <div className="text-[11px] text-slate-400">💉 {surg.anaesthetistName}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {surg.whoChecklistCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedSurgery(surg);
                            setIsWhoModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px] hover:bg-amber-500/30 transition"
                        >
                          Checklist Due
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <select
                        value={surg.status}
                        onChange={e => handleUpdateStatus(surg, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="in_preparation">In Prep</option>
                        <option value="in_surgery">In Surgery</option>
                        <option value="recovery">PACU Recovery</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSurgery(surg);
                            setIntraOpNotes(surg.intraOpNotes || '');
                            setPostOpInstructions(surg.postOpInstructions || '');
                            setIsNotesModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition"
                          title="Surgical Notes"
                        >
                          Notes
                        </button>

                        {!surg.isBilled ? (
                          <button
                            onClick={() => handleBillSurgery(surg)}
                            className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] transition"
                            title="Generate OT Bill"
                          >
                            Bill ₹{surg.totalCharges}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Billed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Schedule Surgery */}
      {isScheduleModalOpen && (
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title="Book Operation Theatre Procedure"
          maxWidth="2xl"
        >
          <form onSubmit={handleScheduleSurgery} className="space-y-4 text-xs">
            {/* Patient Select */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Search Patient *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient name or UHID..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white"
                />
              </div>

              {patientSearch.trim().length > 1 && (
                <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-850">
                  {patients
                    .filter(p => p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) || p.id.toLowerCase().includes(patientSearch.toLowerCase()))
                    .slice(0, 4)
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
                        <span className="text-[10px] text-cyan-400">{p.id}</span>
                      </button>
                    ))}
                </div>
              )}

              {selectedPatient && (
                <div className="p-2 rounded-xl bg-violet-950/40 border border-violet-800/40 flex items-center justify-between text-white font-bold">
                  <span>Selected: {selectedPatient.fullName}</span>
                  <span className="text-cyan-400 text-[10px]">UHID: {selectedPatient.id}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Procedure Name *</label>
                <input
                  type="text"
                  required
                  value={procedureName}
                  onChange={e => setProcedureName(e.target.value)}
                  placeholder="e.g. Laparoscopic Cholecystectomy"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Surgical Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="general_surgery">General Surgery</option>
                  <option value="orthopedic">Orthopedics</option>
                  <option value="gynaecology">Gynaecology & OBS</option>
                  <option value="cardiac">Cardiac & CTVS</option>
                  <option value="neuro">Neurosurgery</option>
                  <option value="ent">ENT Surgery</option>
                  <option value="ophthalmology">Ophthalmology</option>
                  <option value="urology">Urology</option>
                  <option value="emergency">Emergency Trauma</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">OT Suite</label>
                <select
                  value={otNumber}
                  onChange={e => setOtNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="OT Suite 1 (Laparoscopy)">OT 1 (Laparoscopy)</option>
                  <option value="OT Suite 2 (Orthopedics)">OT 2 (Orthopedics)</option>
                  <option value="OT Suite 3 (Cardiothoracic)">OT 3 (Cardiothoracic)</option>
                  <option value="OT Suite 4 (Emergency Crash)">OT 4 (Emergency Crash)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Start Time</label>
                <input
                  type="time"
                  value={scheduledStartTime}
                  onChange={e => setScheduledStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Lead Surgeon</label>
                <input
                  type="text"
                  value={leadSurgeonName}
                  onChange={e => setLeadSurgeonName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Anaesthetist</label>
                <input
                  type="text"
                  value={anaesthetistName}
                  onChange={e => setAnaesthetistName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {/* Charges Breakdown */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-violet-300 font-bold block">Fee Schedule (₹)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px]">Theatre & Consumables</span>
                  <input
                    type="number"
                    value={theatreCharges}
                    onChange={e => setTheatreCharges(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Surgeon Fee</span>
                  <input
                    type="number"
                    value={surgeonCharges}
                    onChange={e => setSurgeonCharges(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Anaesthesia Fee</span>
                  <input
                    type="number"
                    value={anaesthesiaCharges}
                    onChange={e => setAnaesthesiaCharges(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedPatient || !procedureName.trim()}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-violet-600/30"
              >
                Confirm OT Booking
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: WHO Safe Surgery Checklist Verification */}
      {isWhoModalOpen && selectedSurgery && (
        <Modal
          isOpen={isWhoModalOpen}
          onClose={() => setIsWhoModalOpen(false)}
          title="WHO Safe Surgery Checklist Sign-Off"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40">
              <span className="font-bold text-amber-300 block text-sm">Patient & Procedure Confirmation</span>
              <p className="text-slate-300 mt-1">
                Patient: <strong className="text-white">{selectedSurgery.patientName}</strong> • Procedure: <strong className="text-white">{selectedSurgery.procedureName}</strong>
              </p>
            </div>

            <div className="space-y-2 text-slate-300">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-violet-600" />
                <span><strong>Sign In (Before Anaesthesia):</strong> Patient identity, site marked, consent confirmed, pulse oximeter functioning.</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-violet-600" />
                <span><strong>Time Out (Before Incision):</strong> Entire team introduced, verbal confirmation of procedure, antibiotics given &lt;60 mins.</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-violet-600" />
                <span><strong>Sign Out (Before Leaving OT):</strong> Sponge, needle, and instrument counts verified, specimen correctly labeled.</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsWhoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => handleSignWhoChecklist(selectedSurgery.id)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
              >
                Sign-Off & Complete Checklist
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Surgical Notes */}
      {isNotesModalOpen && selectedSurgery && (
        <Modal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          title={`Surgical Documentation: ${selectedSurgery.procedureName}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveNotes} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Intra-Operative Findings & Procedure Steps *</label>
              <textarea
                rows={4}
                value={intraOpNotes}
                onChange={e => setIntraOpNotes(e.target.value)}
                placeholder="Incision details, anatomical findings, pathology identified, hemostasis secured, drain placed"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Post-Operative Recovery Instructions</label>
              <textarea
                rows={3}
                value={postOpInstructions}
                onChange={e => setPostOpInstructions(e.target.value)}
                placeholder="PACU monitoring parameters, NPO status duration, IV analgesia, chest physiotherapy"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsNotesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30"
              >
                Save Surgical Notes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
