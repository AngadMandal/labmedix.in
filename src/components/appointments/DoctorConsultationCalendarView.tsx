import React, { useState, useMemo } from 'react';
import { PatientAppointment } from '../../types';
import { DoctorMasterItem } from '../../services/doctorMasterService';
import { formatDate, formatCurrency } from '../../utils/formatters';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Building,
  CheckCircle2,
  AlertCircle,
  Plus,
  Video,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';

interface DoctorConsultationCalendarViewProps {
  appointments: PatientAppointment[];
  doctors: DoctorMasterItem[];
  onBookAppointment: (doctorId?: string, slot?: string, date?: string) => void;
  onSelectAppointment: (appointment: PatientAppointment) => void;
  onCallPatient: (appointment: PatientAppointment) => void;
  onDirectHandoff: (appointment: PatientAppointment) => void;
}

const DEFAULT_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'
];

export const DoctorConsultationCalendarView: React.FC<DoctorConsultationCalendarViewProps> = ({
  appointments,
  doctors,
  onBookAppointment,
  onSelectAppointment,
  onCallPatient,
  onDirectHandoff
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedShift, setSelectedShift] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [doctorDepartmentFilter, setDoctorDepartmentFilter] = useState<string>('all');
  const [doctorStatuses, setDoctorStatuses] = useState<Record<string, 'available' | 'in_consultation' | 'on_rounds' | 'break' | 'offline'>>({});

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach(d => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set);
  }, [doctors]);

  // Appointments on selected date
  const dayAppointments = useMemo(() => {
    return appointments.filter(
      (a) => (a.doctorConfirmedDate || a.patientWishDate) === selectedDate && a.status !== 'cancelled'
    );
  }, [appointments, selectedDate]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      if (doctorDepartmentFilter !== 'all' && d.department !== doctorDepartmentFilter) {
        return false;
      }
      return true;
    });
  }, [doctors, doctorDepartmentFilter]);

  // Shift slots filtering
  const visibleSlots = useMemo(() => {
    if (selectedShift === 'morning') {
      return DEFAULT_SLOTS.filter(s => s.includes('AM') || s.startsWith('12:'));
    }
    if (selectedShift === 'afternoon') {
      return DEFAULT_SLOTS.filter(s => s.includes('PM') && (s.startsWith('02:') || s.startsWith('03:') || s.startsWith('04:') || s.startsWith('05:')));
    }
    if (selectedShift === 'evening') {
      return DEFAULT_SLOTS.filter(s => s.includes('PM') && (s.startsWith('06:') || s.startsWith('07:') || s.startsWith('08:')));
    }
    return DEFAULT_SLOTS;
  }, [selectedShift]);

  // Handle date stepping
  const handleDateChange = (offsetDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offsetDays);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  const getDoctorStatus = (docId: string, docApts: PatientAppointment[]): {
    status: 'available' | 'in_consultation' | 'on_rounds' | 'break' | 'offline';
    label: string;
    color: string;
  } => {
    if (doctorStatuses[docId]) {
      const s = doctorStatuses[docId];
      if (s === 'in_consultation') return { status: 'in_consultation', label: 'In Consultation', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      if (s === 'on_rounds') return { status: 'on_rounds', label: 'On Ward Rounds', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      if (s === 'break') return { status: 'break', label: 'On Clinical Break', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      if (s === 'offline') return { status: 'offline', label: 'Duty Completed', color: 'bg-slate-700 text-slate-400 border-slate-600' };
      return { status: 'available', label: 'Available in Cabin', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }

    // Auto-detect from appointments
    const hasActiveConsult = docApts.some(a => a.status === 'in_consultation');
    if (hasActiveConsult) {
      return { status: 'in_consultation', label: 'In Consultation', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    }
    return { status: 'available', label: 'Available in Cabin', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Control Bar */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDateChange(-1)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700">
            <CalendarIcon className="w-4 h-4 text-teal-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => handleDateChange(1)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs border border-slate-700 transition"
          >
            Today
          </button>
        </div>

        {/* Shift Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedShift('all')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedShift === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Shifts
          </button>
          <button
            type="button"
            onClick={() => setSelectedShift('morning')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedShift === 'morning'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Morning (9am-1pm)
          </button>
          <button
            type="button"
            onClick={() => setSelectedShift('afternoon')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedShift === 'afternoon'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Afternoon (2pm-5pm)
          </button>
          <button
            type="button"
            onClick={() => setSelectedShift('evening')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedShift === 'evening'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Evening (6pm-9pm)
          </button>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={doctorDepartmentFilter}
            onChange={(e) => setDoctorDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-teal-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctor Timeline Schedule Grid */}
      <div className="space-y-4">
        {filteredDoctors.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800 text-xs">
            No doctors found matching the selected department filter.
          </div>
        ) : (
          filteredDoctors.map((doctor) => {
            const docApts = dayAppointments.filter(
              (a) => a.doctorId === doctor.id || a.doctorName === doctor.name
            );
            const statusInfo = getDoctorStatus(doctor.id, docApts);
            const currentPatient = docApts.find((a) => a.status === 'in_consultation');

            return (
              <div
                key={doctor.id}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg hover:border-slate-700 transition"
              >
                {/* Doctor Profile Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-black text-sm">
                      {doctor.avatarUrl ? (
                        <img
                          src={doctor.avatarUrl}
                          alt={doctor.name}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                      ) : (
                        <Stethoscope className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{doctor.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {doctor.speciality}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{doctor.department}</span>
                        <span>•</span>
                        <span className="font-bold text-teal-400 font-mono">
                          Room: {doctor.opdRoom || 'OPD Chamber 01'}
                        </span>
                        <span>•</span>
                        <span>Fee: {formatCurrency(doctor.standardFee || 500)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Live Status & Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <select
                        value={statusInfo.status}
                        onChange={(e) =>
                          setDoctorStatuses((prev) => ({
                            ...prev,
                            [doctor.id]: e.target.value as any
                          }))
                        }
                        className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 focus:outline-none"
                      >
                        <option value="available">Available in Cabin</option>
                        <option value="in_consultation">In Consultation</option>
                        <option value="on_rounds">On Ward Rounds</option>
                        <option value="break">Clinical Break</option>
                        <option value="offline">Duty Completed</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => onBookAppointment(doctor.id, undefined, selectedDate)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/30 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Book Slot</span>
                    </button>
                  </div>
                </div>

                {/* Currently In Cabin Banner (if active) */}
                {currentPatient && (
                  <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-indigo-600 text-white animate-pulse">
                        <Stethoscope className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-indigo-300">
                          Now Inside Chamber
                        </div>
                        <strong className="text-white text-xs block">
                          Token #{currentPatient.queueToken || currentPatient.appointmentNo} — {currentPatient.patientName}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectAppointment(currentPatient)}
                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition"
                    >
                      View Patient Record
                    </button>
                  </div>
                )}

                {/* Schedule Timeline Slot Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold uppercase tracking-wider text-slate-300">
                      Consultation Slot Grid ({visibleSlots.length} Slots • {docApts.length} Booked)
                    </span>
                    <span>Click any free slot to instantly schedule</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
                    {visibleSlots.map((slot) => {
                      const matchedApt = docApts.find(
                        (a) => a.patientWishTime === slot || (a.doctorConfirmedTime === slot)
                      );

                      if (matchedApt) {
                        const isInCabin = matchedApt.status === 'in_consultation';
                        const isCompleted = matchedApt.status === 'completed';
                        const isWaiting = matchedApt.status === 'waiting';

                        return (
                          <div
                            key={slot}
                            onClick={() => onSelectAppointment(matchedApt)}
                            className={`p-2 rounded-xl border cursor-pointer transition text-left relative overflow-hidden ${
                              isInCabin
                                ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500'
                                : isCompleted
                                ? 'bg-emerald-950/30 border-emerald-500/30 opacity-70'
                                : isWaiting
                                ? 'bg-teal-950/50 border-teal-500/50'
                                : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono font-bold text-slate-400">{slot}</span>
                              <span className="font-mono font-black text-white">
                                {matchedApt.queueToken || matchedApt.appointmentNo}
                              </span>
                            </div>
                            <div className="font-bold text-white text-[11px] truncate mt-0.5">
                              {matchedApt.patientName}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[9px]">
                              <span className="uppercase text-slate-400 font-bold">
                                {isInCabin ? 'In Cabin' : isCompleted ? 'Completed' : isWaiting ? 'In Queue' : 'Booked'}
                              </span>
                              {isWaiting && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDirectHandoff(matchedApt);
                                  }}
                                  className="text-teal-400 hover:text-white font-bold underline"
                                >
                                  Call In
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Empty free slot
                      return (
                        <div
                          key={slot}
                          onClick={() => onBookAppointment(doctor.id, slot, selectedDate)}
                          className="p-2 rounded-xl border border-dashed border-slate-800 hover:border-teal-500/60 hover:bg-slate-800/40 cursor-pointer transition text-left group"
                        >
                          <div className="text-[10px] font-mono text-slate-500 group-hover:text-teal-400 font-bold">
                            {slot}
                          </div>
                          <div className="text-[10px] text-slate-600 group-hover:text-slate-300 mt-1 flex items-center gap-1 font-bold">
                            <Plus className="w-3 h-3 text-slate-600 group-hover:text-teal-400" />
                            <span>Free Slot</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
