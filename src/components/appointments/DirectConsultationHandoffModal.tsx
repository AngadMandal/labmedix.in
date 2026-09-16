import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { PatientAppointment } from '../../types';
import { DoctorMasterItem } from '../../services/doctorMasterService';
import { EMRService } from '../../services/emrService';
import { VitalsService } from '../../services/vitalsService';
import { ApiSyncService } from '../../services/apiSyncService';
import { useToast } from '../../context/ToastContext';
import { playHospitalChime } from '../../utils/audioChime';
import {
  Stethoscope,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Weight,
  UserCheck,
  Building,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface DirectConsultationHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: PatientAppointment;
  doctor?: DoctorMasterItem | null;
  onHandoffComplete?: (updatedApt: PatientAppointment) => void;
}

export const DirectConsultationHandoffModal: React.FC<DirectConsultationHandoffModalProps> = ({
  isOpen,
  onClose,
  appointment,
  doctor,
  onHandoffComplete
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bpSystolic, setBpSystolic] = useState<number>(120);
  const [bpDiastolic, setBpDiastolic] = useState<number>(80);
  const [pulseRate, setPulseRate] = useState<number>(76);
  const [temperature, setTemperature] = useState<number>(98.4);
  const [spo2, setSpo2] = useState<number>(99);
  const [weightKg, setWeightKg] = useState<number>(68);
  const [nursingNotes, setNursingNotes] = useState<string>('Patient checked in at OPD triage station. Vitals stable.');

  if (!isOpen) return null;

  const handleLaunchConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Play announcement chime
      playHospitalChime();

      // 2. Save triage vitals record for patient
      const currentVitals = VitalsService.getPatientVitals(appointment.patientId);
      const newVitalsRecord = {
        id: `vit_triage_${Date.now()}`,
        patientId: appointment.patientId,
        recordedAt: new Date().toISOString(),
        bpSystolic,
        bpDiastolic,
        pulseRate,
        bloodSugar: 100,
        sugarType: 'random' as const,
        temperature,
        spo2,
        weightKg,
        notes: nursingNotes,
        recordedBy: 'OPD Nursing Triage Station'
      };
      VitalsService.savePatientVitals(appointment.patientId, [...currentVitals, newVitalsRecord]);

      // 3. Update appointment status to 'in_consultation'
      const updated = EMRService.updateAppointmentStatus(appointment.id, 'in_consultation');
      if (updated) {
        await ApiSyncService.saveDocument('appointments', updated.id, updated).catch(() => {});
        if (onHandoffComplete) {
          onHandoffComplete(updated);
        }
      }

      showToast('success', 'Consultation Launched', `Patient ${appointment.patientName} transferred to ${doctor?.name || appointment.doctorName}.`);
      onClose();

      // 4. Directly route into Doctor EMR with preloaded patient & appointment
      navigate(`/emr?patientId=${appointment.patientId}&aptId=${appointment.id}`);
    } catch (err: any) {
      showToast('error', 'Handoff Failed', err.message || 'Could not complete consultation handoff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Direct Consultation Handoff & OPD Triage"
      maxWidth="xl"
    >
      <form onSubmit={handleLaunchConsultation} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
        {/* Patient & Doctor Context Banner */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-indigo-300">
                Token #{appointment.queueToken || appointment.appointmentNo}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Ready for Cabin
              </span>
            </div>
            <strong className="text-white text-sm block mt-0.5">{appointment.patientName}</strong>
            <span className="text-[11px] text-slate-400 block font-mono">
              UHID: {appointment.patientId} • Ph: {appointment.patientPhone || 'N/A'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Doctor</span>
            <strong className="text-white text-xs block">{appointment.doctorName}</strong>
            <span className="inline-block px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-bold text-[10px] mt-1">
              Room: {doctor?.opdRoom || 'OPD Chamber'}
            </span>
          </div>
        </div>

        {/* Quick Triage Vitals Entry */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Quick Triage Vitals (Pre-Consultation Check)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Blood Pressure */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>BP Systolic / Diastolic</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:border-teal-500"
                  placeholder="120"
                />
                <span className="text-slate-500 font-bold">/</span>
                <input
                  type="number"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:border-teal-500"
                  placeholder="80"
                />
              </div>
            </div>

            {/* Pulse Rate */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pulse Rate (BPM)</span>
              </label>
              <input
                type="number"
                value={pulseRate}
                onChange={(e) => setPulseRate(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:border-teal-500"
                placeholder="76"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Temp (°F)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:border-teal-500"
                placeholder="98.4"
              />
            </div>

            {/* SpO2 */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>Oxygen SpO2 (%)</span>
              </label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:border-teal-500"
                placeholder="99"
              />
            </div>

            {/* Weight */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Weight className="w-3.5 h-3.5 text-purple-400" />
                <span>Weight (Kg)</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:border-teal-500"
                placeholder="68"
              />
            </div>

            {/* Chief Complaint */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block">Reported Reason</label>
              <span className="block px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 truncate text-[11px]">
                {appointment.chiefComplaint || 'Routine Medical Check'}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] text-slate-400 block">Triage Nurse Note for Consulting Doctor</label>
            <textarea
              rows={2}
              value={nursingNotes}
              onChange={(e) => setNursingNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:border-teal-500"
              placeholder="E.g. Patient feels mild dizziness, no known allergy reported."
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-black shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 text-xs disabled:opacity-50"
          >
            <Stethoscope className="w-4 h-4" />
            <span>{isSubmitting ? 'Transferring...' : 'Launch Doctor EMR & Notify Cabin'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
