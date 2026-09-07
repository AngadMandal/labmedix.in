import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EMRService } from '../../services/emrService';
import { DoctorMasterService, DoctorMasterItem } from '../../services/doctorMasterService';
import { StorageService } from '../../services/storage';
import { ApiSyncService } from '../../services/apiSyncService';
import { PatientAppointment, Patient, HealthCard } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Video,
  MapPin,
  Printer,
  ChevronRight,
  Sparkles,
  Phone,
  FileText,
  CreditCard,
  Building,
  AlertCircle
} from 'lucide-react';

export const AppointmentsPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isDoctor = currentUser?.role === 'doctor';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // State
  const [appointments, setAppointments] = useState<PatientAppointment[]>(() => EMRService.getAllAppointments());
  const [doctors, setDoctors] = useState<DoctorMasterItem[]>(() => DoctorMasterService.getAll());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'today', 'upcoming'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeTokenAppointment, setActiveTokenAppointment] = useState<PatientAppointment | null>(null);

  // New Appointment Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [wishDate, setWishDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [wishSlot, setWishSlot] = useState('Morning OPD (09:00 AM - 01:00 PM)');
  const [wishTime, setWishTime] = useState('10:30 AM');
  const [consultationMode, setConsultationMode] = useState<'physical_opd' | 'telemedicine'>('physical_opd');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(500);

  // Real-time Firestore sync
  useEffect(() => {
    const unsubApts = ApiSyncService.subscribeToCollection<PatientAppointment>('appointments', (items) => {
      if (items) {
        setAppointments(EMRService.getAllAppointments());
      }
    });

    return () => {
      unsubApts();
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ApiSyncService.pullAll();
      setAppointments(EMRService.getAllAppointments());
      setDoctors(DoctorMasterService.getAll());
      setPatients(StorageService.getPatients());
      showToast('success', 'Central Sync Complete', 'Appointments synchronized with central Firestore.');
    } catch {
      setAppointments(EMRService.getAllAppointments());
      showToast('info', 'Local Cache Updated', 'Appointments refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // When selected doctor changes, auto-update consultation fee
  useEffect(() => {
    if (selectedDoctorId) {
      const doc = doctors.find(d => d.id === selectedDoctorId);
      if (doc) {
        setConsultationFee(consultationMode === 'telemedicine' ? doc.telemedicineFee : doc.standardFee);
      }
    }
  }, [selectedDoctorId, consultationMode, doctors]);

  // Selected Patient Details
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [selectedPatientId, patients]);

  const patientCard = useMemo(() => {
    if (!selectedPatientId) return null;
    return cards.find(c => c.patientId === selectedPatientId && c.status === 'active');
  }, [selectedPatientId, cards]);

  // Search filtered patients for modal picker
  const filteredPatientsForPicker = useMemo(() => {
    if (!patientSearchTerm.trim()) return patients.slice(0, 5);
    const q = patientSearchTerm.toLowerCase();
    return patients.filter(p => 
      p.fullName.toLowerCase().includes(q) || 
      p.mobileNumber.includes(q) || 
      (p.uhid && p.uhid.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [patientSearchTerm, patients]);

  // Handle Create Appointment
  const handleSaveNewAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedPatient) {
      showToast('error', 'Patient Required', 'Please select a patient.');
      return;
    }

    const doc = doctors.find(d => d.id === selectedDoctorId) || doctors[0];

    try {
      const saved = EMRService.saveAppointment({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        patientPhone: selectedPatient.mobileNumber,
        cardNo: patientCard?.cardNumber,
        cardTier: patientCard ? 'Gold Cardholder' : 'Standard Patient',
        doctorId: doc?.id || 'doc_1',
        doctorName: doc?.name || 'Dr. Subhashish Roy',
        doctorSpeciality: doc?.speciality || 'Sr. Consultant Physician',
        department: doc?.department || 'General Medicine',
        consultationMode,
        patientWishDate: wishDate,
        patientWishSlot: wishSlot,
        patientWishTime: wishTime,
        chiefComplaint: chiefComplaint.trim() || 'General Consultation',
        consultationFee: consultationFee,
        status: isDoctor || isAdmin ? 'doctor_confirmed' : 'pending_doctor_approval'
      });

      setAppointments(EMRService.getAllAppointments());
      setIsNewModalOpen(false);
      showToast('success', 'Appointment Scheduled', `Token #${saved.appointmentNo} created successfully.`);
    } catch (err: any) {
      showToast('error', 'Booking Failed', err.message || 'Could not schedule appointment.');
    }
  };

  // Status progression action
  const handleUpdateStatus = (aptId: string, newStatus: PatientAppointment['status']) => {
    const updated = EMRService.updateAppointmentStatus(aptId, newStatus);
    if (updated) {
      setAppointments(EMRService.getAllAppointments());
      showToast('success', 'Status Updated', `Appointment ${updated.appointmentNo} is now ${newStatus.replace('_', ' ')}.`);
    }
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return appointments.filter((apt) => {
      // Doctor filter
      if (doctorFilter !== 'all' && apt.doctorId !== doctorFilter && apt.doctorName !== doctorFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && apt.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === 'today' && apt.patientWishDate !== today && apt.doctorConfirmedDate !== today) {
        return false;
      }
      if (dateFilter === 'upcoming' && (apt.patientWishDate || '') < today) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNo = (apt.appointmentNo || '').toLowerCase().includes(q);
        const matchesPatient = (apt.patientName || '').toLowerCase().includes(q);
        const matchesPhone = (apt.patientPhone || '').toLowerCase().includes(q);
        const matchesDoc = (apt.doctorName || '').toLowerCase().includes(q);
        const matchesCard = (apt.cardNo || '').toLowerCase().includes(q);
        if (!matchesNo && !matchesPatient && !matchesPhone && !matchesDoc && !matchesCard) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, doctorFilter, statusFilter, dateFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const total = appointments.length;
    const todayCount = appointments.filter(a => a.patientWishDate === today || a.doctorConfirmedDate === today).length;
    const waiting = appointments.filter(a => a.status === 'pending_doctor_approval' || a.status === 'doctor_confirmed').length;
    const inConsult = appointments.filter(a => a.status === 'in_consultation').length;
    const completed = appointments.filter(a => a.status === 'completed').length;

    return { total, todayCount, waiting, inConsult, completed };
  }, [appointments]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-900/40 via-emerald-900/30 to-blue-900/20 border border-teal-500/30 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/30">
              <Calendar className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Appointments & OPD Queue
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Hospital Workflow
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            Live doctor consultation calendar, waiting room token tracking, and direct consultation handoff.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black transition shadow-lg shadow-teal-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Bookings</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics.total}</p>
          <span className="text-[10px] text-slate-500">Historical & Scheduled</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-teal-400 text-xs font-bold">
            <span>Today's OPD</span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-teal-300">{metrics.todayCount}</p>
          <span className="text-[10px] text-teal-500/80">Scheduled for today</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>Waiting in Clinic</span>
            <User className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-300">{metrics.waiting}</p>
          <span className="text-[10px] text-amber-500/80">Waiting room queue</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-bold">
            <span>In Consultation</span>
            <Stethoscope className="w-4 h-4 text-indigo-400 animate-bounce" />
          </div>
          <p className="text-2xl font-black text-indigo-300">{metrics.inConsult}</p>
          <span className="text-[10px] text-indigo-500/80">Inside doctor's cabin</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{metrics.completed}</p>
          <span className="text-[10px] text-emerald-500/80">Discharged with Rx</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Token No, Patient Name, Phone, Doctor, or Card Number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today Only</option>
            <option value="upcoming">Upcoming</option>
          </select>

          {/* Doctor Filter */}
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Doctors</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.speciality})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending_doctor_approval">Pending Approval</option>
            <option value="doctor_confirmed">Confirmed / Waiting</option>
            <option value="in_consultation">In Consultation</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments List / Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>OPD Appointment Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-800 text-teal-400 border border-slate-700">
              {filteredAppointments.length} bookings
            </span>
          </h2>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Appointments Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || doctorFilter !== 'all'
                  ? 'No appointments match the selected filters.'
                  : 'There are no appointments scheduled. Click "Book Appointment" to add one.'}
              </p>
            </div>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule First Appointment</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Token & Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Assigned Doctor</th>
                  <th className="px-4 py-3">Mode & Department</th>
                  <th className="px-4 py-3">Chief Complaint</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAppointments.map((apt) => {
                  const statusBadges: Record<string, { label: string; color: string }> = {
                    pending_doctor_approval: { label: 'Pending Approval', color: 'bg-amber-950 text-amber-300 border-amber-500/30' },
                    doctor_confirmed: { label: 'Waiting Room', color: 'bg-teal-950 text-teal-300 border-teal-500/30' },
                    in_consultation: { label: 'In Consultation', color: 'bg-indigo-950 text-indigo-300 border-indigo-500/30 animate-pulse' },
                    completed: { label: 'Completed', color: 'bg-emerald-950 text-emerald-300 border-emerald-500/30' },
                    cancelled: { label: 'Cancelled', color: 'bg-rose-950 text-rose-300 border-rose-500/30' }
                  };

                  const badge = statusBadges[apt.status] || { label: apt.status, color: 'bg-slate-800 text-slate-300 border-slate-700' };

                  return (
                    <tr key={apt.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Token & Date */}
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-white">{apt.appointmentNo}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(apt.patientWishDate || apt.createdAt)} • {apt.patientWishTime || 'OPD'}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3 font-medium text-white">
                        <div>{apt.patientName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{apt.patientPhone}</span>
                          {apt.cardNo && (
                            <span className="text-teal-400 font-mono">Card: {apt.cardNo}</span>
                          )}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{apt.doctorName}</div>
                        <div className="text-[10px] text-slate-400">{apt.doctorSpeciality}</div>
                      </td>

                      {/* Mode & Department */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {apt.consultationMode === 'telemedicine' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                              <Video className="w-3 h-3" /> Telemed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              <Building className="w-3 h-3" /> Physical OPD
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{apt.department}</div>
                      </td>

                      {/* Complaint */}
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-300">
                        {apt.chiefComplaint || 'Routine Checkup'}
                      </td>

                      {/* Fee */}
                      <td className="px-4 py-3 font-black text-white">
                        {formatCurrency(Number(apt.consultationFee || 0))}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Token Button */}
                          <button
                            onClick={() => setActiveTokenAppointment(apt)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Print Token Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Progression actions */}
                          {apt.status === 'pending_doctor_approval' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'doctor_confirmed')}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] transition"
                            >
                              Confirm
                            </button>
                          )}

                          {apt.status === 'doctor_confirmed' && (
                            <button
                              onClick={() => {
                                handleUpdateStatus(apt.id, 'in_consultation');
                                navigate(`/emr?patientId=${apt.patientId}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition"
                              title="Begin doctor consultation in EMR"
                            >
                              Call In (EMR)
                            </button>
                          )}

                          {apt.status === 'in_consultation' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {isNewModalOpen && (
        <Modal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Schedule New OPD Consultation"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveNewAppointment} className="space-y-4 text-xs">
            {/* Patient Search / Selection */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Select Patient *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  placeholder="Search patient by name, phone or UHID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:border-teal-500"
                />
              </div>

              {/* Patient suggestions */}
              <div className="max-h-36 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/80">
                {filteredPatientsForPicker.map(p => {
                  const isSelected = selectedPatientId === p.id;
                  const hasCard = cards.some(c => c.patientId === p.id && c.status === 'active');
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearchTerm(p.fullName);
                      }}
                      className={`p-2 flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-teal-900/40 text-teal-200' : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-white">{p.fullName}</span>
                        <span className="text-[10px] text-slate-400 ml-2 font-mono">{p.mobileNumber}</span>
                      </div>
                      {hasCard && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          Active Health Card
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Doctor Picker */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Select Physician / Specialist *</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-teal-500"
                required
              >
                <option value="">-- Choose Consulting Doctor --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.speciality} ({d.department}) [Room: {d.opdRoom || 'OPD 1'}]
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Slot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Consultation Date *</label>
                <input
                  type="date"
                  value={wishDate}
                  onChange={(e) => setWishDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">OPD Shift / Slot *</label>
                <select
                  value={wishSlot}
                  onChange={(e) => setWishSlot(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="Morning OPD (09:00 AM - 01:00 PM)">Morning OPD (09:00 AM - 01:00 PM)</option>
                  <option value="Afternoon OPD (02:00 PM - 05:00 PM)">Afternoon OPD (02:00 PM - 05:00 PM)</option>
                  <option value="Evening Special OPD (06:00 PM - 09:00 PM)">Evening Special OPD (06:00 PM - 09:00 PM)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Consultation Mode</label>
                <select
                  value={consultationMode}
                  onChange={(e) => setConsultationMode(e.target.value as any)}
                  className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="physical_opd">Physical In-Clinic OPD</option>
                  <option value="telemedicine">Telemedicine Video Call</option>
                </select>
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Chief Complaints / Reason for Visit</label>
              <textarea
                rows={2}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="E.g. Fever with chills for 3 days, chest discomfort, routine diabetes follow-up..."
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500"
              />
            </div>

            {/* Fee Breakdown */}
            <div className="p-3 rounded-2xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-teal-200">Consultation Fee</span>
                {patientCard && (
                  <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Cardholder Discount Applied
                  </span>
                )}
              </div>
              <div className="text-base font-black text-white font-mono">
                {formatCurrency(consultationFee)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-lg shadow-teal-600/30"
              >
                Confirm & Issue Token
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Printable Appointment Token Modal */}
      {activeTokenAppointment && (
        <Modal
          isOpen={!!activeTokenAppointment}
          onClose={() => setActiveTokenAppointment(null)}
          title="Hospital OPD Appointment Token"
          maxWidth="max-w-md"
        >
          <div className="p-4 space-y-4 text-center bg-white text-slate-900 rounded-2xl shadow-inner font-sans">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black tracking-tight text-slate-900">LABMEDIX HEALTHCARE</h3>
              <p className="text-[11px] text-slate-500">OPD Consultation & Clinical Routing Token</p>
            </div>

            <div className="py-2 bg-slate-100 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase">Token Number</div>
              <div className="text-3xl font-black font-mono tracking-wider text-teal-700">
                {activeTokenAppointment.appointmentNo}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Security Seal: {activeTokenAppointment.securitySeal || 'SEC-VERIFIED'}
              </div>
            </div>

            <div className="text-left text-xs space-y-2 border border-slate-200 p-3 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <strong className="text-slate-900">{activeTokenAppointment.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <strong className="text-slate-900">{activeTokenAppointment.doctorName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="text-slate-700">{activeTokenAppointment.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Slot:</span>
                <span className="text-slate-900 font-medium">
                  {formatDate(activeTokenAppointment.patientWishDate)} • {activeTokenAppointment.patientWishSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fee Paid:</span>
                <strong className="text-emerald-700">{formatCurrency(activeTokenAppointment.consultationFee || 0)}</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md"
              >
                Print Slip
              </button>
              <button
                onClick={() => setActiveTokenAppointment(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
