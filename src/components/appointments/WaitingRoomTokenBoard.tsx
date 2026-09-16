import React, { useState, useMemo } from 'react';
import { PatientAppointment } from '../../types';
import { DoctorMasterItem } from '../../services/doctorMasterService';
import { playHospitalChime, announceTokenSpeech } from '../../utils/audioChime';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Tv,
  Bell,
  Volume2,
  Stethoscope,
  User,
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Maximize2,
  Minimize2,
  Sparkles,
  CreditCard
} from 'lucide-react';

interface WaitingRoomTokenBoardProps {
  appointments: PatientAppointment[];
  doctors: DoctorMasterItem[];
  onPrintToken: (appointment: PatientAppointment) => void;
  onDirectHandoff: (appointment: PatientAppointment) => void;
  onUpdateStatus: (aptId: string, status: PatientAppointment['status']) => void;
}

export const WaitingRoomTokenBoard: React.FC<WaitingRoomTokenBoardProps> = ({
  appointments,
  doctors,
  onPrintToken,
  onDirectHandoff,
  onUpdateStatus
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [calledTokenId, setCalledTokenId] = useState<string | null>(null);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [enableVoiceAnnouncement, setEnableVoiceAnnouncement] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  // Filter today's active appointments
  const todayApts = useMemo(() => {
    return appointments.filter((a) => {
      const matchDate = (a.doctorConfirmedDate || a.patientWishDate) === today;
      if (!matchDate) return false;
      if (selectedDoctorFilter !== 'all' && a.doctorId !== selectedDoctorFilter && a.doctorName !== selectedDoctorFilter) {
        return false;
      }
      return a.status !== 'cancelled';
    });
  }, [appointments, today, selectedDoctorFilter]);

  // Patients currently in consultation (inside cabin)
  const inCabinApts = useMemo(() => {
    return todayApts.filter((a) => a.status === 'in_consultation');
  }, [todayApts]);

  // Patients waiting in queue
  const waitingApts = useMemo(() => {
    return todayApts
      .filter((a) => a.status === 'waiting' || a.status === 'doctor_confirmed')
      .sort((a, b) => (a.patientWishTime || '').localeCompare(b.patientWishTime || ''));
  }, [todayApts]);

  // Recently completed patients today
  const completedApts = useMemo(() => {
    return todayApts.filter((a) => a.status === 'completed');
  }, [todayApts]);

  // Handle calling a patient
  const handleCallPatient = (apt: PatientAppointment) => {
    setCalledTokenId(apt.id);
    const doc = doctors.find((d) => d.id === apt.doctorId || d.name === apt.doctorName);
    const room = doc?.opdRoom || 'OPD Chamber';

    if (enableVoiceAnnouncement) {
      announceTokenSpeech(apt.queueToken || apt.appointmentNo, apt.doctorName, room);
    } else {
      playHospitalChime();
    }

    // Reset pulse effect after 6 seconds
    setTimeout(() => {
      setCalledTokenId((curr) => (curr === apt.id ? null : curr));
    }, 6000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'p-6 bg-slate-950 min-h-screen text-white' : ''}`}>
      {/* Top Waiting Room Control Bar */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Tv className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              Waiting Room Live Token Display
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live TV Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live token calling, queue tracking, and real-time waiting room TV display.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Audio Chime Controls */}
          <button
            type="button"
            onClick={() => playHospitalChime()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 transition flex items-center gap-1.5"
            title="Test Hospital Chime Sound"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Test Chime</span>
          </button>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 font-bold">
            <input
              type="checkbox"
              checked={enableVoiceAnnouncement}
              onChange={(e) => setEnableVoiceAnnouncement(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-teal-600"
            />
            <Volume2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Voice Announcer</span>
          </label>

          {/* Doctor Filter */}
          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-teal-500"
          >
            <option value="all">All Doctors & Chambers</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.opdRoom || 'Chamber'})
              </option>
            ))}
          </select>

          {/* Fullscreen TV Mode */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Display Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SECTION 1: NOW SERVING / IN CABIN HERO DISPLAY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            <span>Now Inside Doctor's Chamber ({inCabinApts.length} Active Consultations)</span>
          </h3>
          <span className="text-[11px] text-slate-500">Real-time doctor room status</span>
        </div>

        {inCabinApts.length === 0 ? (
          <div className="p-6 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            No patients currently inside doctor chambers. Doctors are ready for the next patient.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inCabinApts.map((apt) => {
              const doc = doctors.find((d) => d.id === apt.doctorId || d.name === apt.doctorName);
              const room = doc?.opdRoom || 'OPD Chamber 01';

              return (
                <div
                  key={apt.id}
                  className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-indigo-900/30 border-2 border-indigo-500/50 shadow-2xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white animate-pulse">
                      NOW SERVING
                    </span>
                    <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-slate-900 text-teal-400 border border-slate-700">
                      Room: {room}
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Token Number</div>
                    <div className="text-4xl font-black font-mono tracking-widest text-white mt-0.5">
                      {apt.queueToken || apt.appointmentNo}
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2 space-y-0.5">
                    <div className="text-xs font-bold text-white truncate">{apt.patientName}</div>
                    <div className="text-[11px] text-slate-400">
                      With: <strong className="text-indigo-300">{apt.doctorName}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => onDirectHandoff(apt)}
                      className="text-xs font-bold text-teal-400 hover:text-teal-300 underline"
                    >
                      Open Doctor EMR
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(apt.id, 'completed')}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                    >
                      Finish & Bill
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: WAITING QUEUE BOARD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Next In Line — Waiting Room Queue ({waitingApts.length} Patients)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {today} • Real-time patient routing
          </span>
        </div>

        {waitingApts.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            Waiting room queue is clear. No patients currently waiting.
          </div>
        ) : (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Queue Pos</th>
                    <th className="px-4 py-3">Token No</th>
                    <th className="px-4 py-3">Patient Name</th>
                    <th className="px-4 py-3">Consulting Doctor & Room</th>
                    <th className="px-4 py-3">Slot Time</th>
                    <th className="px-4 py-3">Est. Wait</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Queue Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {waitingApts.map((apt, index) => {
                    const doc = doctors.find((d) => d.id === apt.doctorId || d.name === apt.doctorName);
                    const room = doc?.opdRoom || 'OPD Chamber';
                    const isCalled = calledTokenId === apt.id;
                    const estWait = (index + 1) * 12;

                    return (
                      <tr
                        key={apt.id}
                        className={`transition-colors ${
                          isCalled
                            ? 'bg-amber-950/50 border-amber-500 animate-pulse'
                            : index === 0
                            ? 'bg-teal-950/20 hover:bg-teal-950/40'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Queue Position */}
                        <td className="px-4 py-3">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                              index === 0
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            #{index + 1}
                          </span>
                        </td>

                        {/* Token Number */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-black text-sm text-white flex items-center gap-1.5">
                            <span>{apt.queueToken || apt.appointmentNo}</span>
                            {isCalled && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500 text-slate-950 font-bold uppercase">
                                CALLING NOW
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Patient */}
                        <td className="px-4 py-3 font-medium text-white">
                          <div>{apt.patientName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {apt.patientPhone || 'Walk-in'}
                          </div>
                        </td>

                        {/* Doctor & Room */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{apt.doctorName}</div>
                          <div className="text-[10px] font-mono font-bold text-teal-400">
                            Room: {room}
                          </div>
                        </td>

                        {/* Slot Time */}
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {apt.patientWishTime || apt.patientWishSlot || 'Scheduled'}
                        </td>

                        {/* Est Wait */}
                        <td className="px-4 py-3 font-mono text-amber-400 font-bold">
                          ~{estWait} mins
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              apt.status === 'waiting'
                                ? 'bg-teal-950 text-teal-300 border-teal-500/30'
                                : 'bg-blue-950 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {apt.status === 'waiting' ? 'Waiting in Clinic' : 'Confirmed'}
                          </span>
                        </td>

                        {/* Queue Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Call Patient (Chime) */}
                            <button
                              type="button"
                              onClick={() => handleCallPatient(apt)}
                              className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-sm"
                              title="Call patient with hospital audio chime"
                            >
                              <Bell className="w-3 h-3" />
                              <span>Call</span>
                            </button>

                            {/* Direct Consultation Handoff */}
                            <button
                              type="button"
                              onClick={() => onDirectHandoff(apt)}
                              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] transition flex items-center gap-1 shadow-md shadow-indigo-600/30"
                              title="Enter vitals and handoff to Doctor EMR"
                            >
                              <Stethoscope className="w-3 h-3" />
                              <span>Handoff</span>
                            </button>

                            {/* Print Token */}
                            <button
                              type="button"
                              onClick={() => onPrintToken(apt)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Print Official Token Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Mark Arrived if pending */}
                            {apt.status === 'doctor_confirmed' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(apt.id, 'waiting')}
                                className="px-2 py-1 rounded-xl bg-teal-900/60 hover:bg-teal-800 text-teal-200 text-[10px] font-bold"
                              >
                                Arrived
                              </button>
                            )}

                            {/* No Show */}
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(apt.id, 'no_show')}
                              className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
                              title="Mark No Show"
                            >
                              No Show
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
      </div>

      {/* SECTION 3: RECENTLY COMPLETED SUMMARY */}
      {completedApts.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300">
              {completedApts.length} Patients Consulted & Completed Today
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Average consultation duration: ~14 mins
          </span>
        </div>
      )}
    </div>
  );
};
