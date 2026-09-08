import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { LabOrderRecord } from '../../types';
import { LaboratoryService } from '../../services/laboratoryService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, PhoneCall, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface CriticalResultActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LabOrderRecord | null;
  onActionRecorded: () => void;
}

export const CriticalResultActionModal: React.FC<CriticalResultActionModalProps> = ({
  isOpen,
  onClose,
  order,
  onActionRecorded
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [physicianContacted, setPhysicianContacted] = useState(() => order?.prescribedByDoctorName || 'Dr. Attending Physician');
  const [actionNotes, setActionNotes] = useState('Critical panic values telephoned to ordering physician. Patient recalled for urgent medical consultation.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const criticalParams = (order.parameters || []).filter(p => p.flag === 'critical' || p.critical);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicianContacted.trim() || !actionNotes.trim()) {
      showToast('error', 'Missing Information', 'Doctor contacted and clinical action notes are mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const notifiedBy = currentUser?.fullName || 'Senior Laboratory Technologist';
      LaboratoryService.recordCriticalResultAction(order.id, {
        physicianContacted: physicianContacted.trim(),
        notifiedBy,
        actionNotes: actionNotes.trim()
      });

      showToast('success', 'Critical Action Recorded', `Documented urgent clinical notification for ${order.patientName}.`);
      onActionRecorded();
      onClose();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Could not record action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Critical Diagnostic Alert — Document Clinical Action"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Panic Alert Banner */}
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-black uppercase tracking-wider text-xs">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            <span>High-Priority Panic / Critical Values Detected</span>
          </div>
          <p className="text-xs text-slate-300">
            Laboratory values exceed life-critical safety thresholds. Hospital policy requires immediate documented verbal/telephonic notification to the prescribing doctor.
          </p>

          {/* List of critical parameters */}
          <div className="pt-2 space-y-1.5 font-mono text-xs">
            {criticalParams.map((p, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/30 flex justify-between items-center text-white">
                <span className="font-bold">{p.parameterName}:</span>
                <span className="text-rose-300 font-black text-sm bg-rose-900/60 px-2 py-0.5 rounded">
                  {p.observedValue} {p.unit} (Ref: {p.referenceRange})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Summary */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between items-center">
          <div>
            <span className="text-slate-400">Patient:</span>
            <strong className="text-white ml-1.5">{order.patientName}</strong>
          </div>
          <div>
            <span className="text-slate-400">Phone:</span>
            <span className="text-teal-400 ml-1.5 font-mono">{order.patientPhone || 'N/A'}</span>
          </div>
        </div>

        {/* Action Recording Form */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-300 font-bold">Doctor / Physician Contacted *</label>
            <input
              type="text"
              value={physicianContacted}
              onChange={(e) => setPhysicianContacted(e.target.value)}
              placeholder="Dr. Full Name..."
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300 font-bold">Documented Clinical Action & Remarks *</label>
            <textarea
              rows={3}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Record time of verbal communication, physician response, and next clinical steps..."
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-rose-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" disabled={isSubmitting}>
            <PhoneCall className="w-4 h-4 mr-1.5" />
            <span>Record Clinical Notification</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
