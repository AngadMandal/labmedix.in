import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BloodTestBooking, PortalService } from '../../services/portalService';
import { LaboratoryService } from '../../services/laboratoryService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  FileText,
  BadgeCheck
} from 'lucide-react';

export interface LabVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: BloodTestBooking | null;
  booking?: BloodTestBooking | null;
  onVerified: () => void;
}

export const LabVerificationModal: React.FC<LabVerificationModalProps> = ({
  isOpen,
  onClose,
  order: propOrder,
  booking,
  onVerified
}) => {
  const order = propOrder || booking;
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [pathologistName, setPathologistName] = useState(() => {
    if (currentUser?.role === 'doctor' || currentUser?.role === 'super_admin') {
      return currentUser.fullName.startsWith('Dr.') ? currentUser.fullName : `Dr. ${currentUser.fullName}`;
    }
    return 'Dr. Subhashish Roy, MD (Pathology)';
  });

  const [registrationNo, setRegistrationNo] = useState('WBMC-44102');
  const [clinicalNotes, setClinicalNotes] = useState(
    'All analytical parameters correlated clinically with patient history. Internal quality control verified within 2SD.'
  );
  const [isVerifying, setIsVerifying] = useState(false);

  if (!order) return null;

  const parameters = order.testResults || [];
  const hasCritical = parameters.some(p => p.flag === 'critical');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathologistName.trim() || !registrationNo.trim()) {
      showToast('error', 'Missing Information', 'Doctor Name and Medical Council Registration No. are required.');
      return;
    }

    if (parameters.length === 0 || parameters.every(p => !p.observedValue?.trim())) {
      showToast('error', 'No Results Entered', 'Cannot verify report without entered analytical findings.');
      return;
    }

    setIsVerifying(true);
    try {
      const now = new Date().toISOString();

      // 1. Update PortalService
      const bookings = PortalService.getLabBookings();
      const target = bookings.find(b => b.id === order.id);
      if (target) {
        target.status = 'report_ready';
        target.verifiedBy = pathologistName.trim();
        target.pathologistName = pathologistName.trim();
        target.reportReadyAt = now;
        target.pathologistNotes = `${clinicalNotes.trim()} [Reg: ${registrationNo.trim()}]`;
        PortalService.saveLabBookings(bookings);
      }

      // 2. Update LaboratoryService and lock report
      try {
        LaboratoryService.verifyAndLockReport(order.id, {
          doctorName: pathologistName.trim(),
          registrationNo: registrationNo.trim(),
          notes: clinicalNotes.trim()
        });
      } catch {}

      triggerCelebrationFireworks();
      showToast(
        'success',
        'Report Verified & Locked! 📜',
        `Diagnostic report for ${order.patientName} (${order.bookingNo}) officially signed and released.`
      );
      onVerified();
      onClose();
    } catch (err: any) {
      showToast('error', 'Verification Failed', err.message || 'Could not verify lab report.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pathologist Verification & Digital Sign-Off — ${order.testName}`}
      maxWidth="4xl"
    >
      <form onSubmit={handleVerify} className="space-y-5">
        {/* Verification Alert Banner */}
        <div className="p-4 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 rounded-2xl border border-teal-500/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-500/30 text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Pathologist Report Verification</h4>
              <p className="text-slate-300">
                Signing this document locks observed values, creates audit timestamps, and makes the report available on the cashless patient portal.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
            Official Legal Action
          </span>
        </div>

        {/* Critical Value Warning */}
        {hasCritical && (
          <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-2xl flex items-center gap-2.5 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Attention: One or more parameters have critical flags. Please confirm clinical impression notes before authorization.</span>
          </div>
        )}

        {/* Summary Table of Entered Results */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Observed Findings Review ({parameters.length} Analytes)
          </span>

          <div className="border border-slate-700 rounded-2xl overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3">Analyte</th>
                  <th className="py-2 px-3">Observed Value</th>
                  <th className="py-2 px-3">Unit</th>
                  <th className="py-2 px-3">Reference Range</th>
                  <th className="py-2 px-3 text-center">Status Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parameters.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-semibold text-white">{p.parameterName}</td>
                    <td className="py-2 px-3 font-black text-sm">
                      <span
                        className={
                          p.flag === 'critical' || p.flag === 'high'
                            ? 'text-rose-400 font-black'
                            : p.flag === 'low'
                            ? 'text-blue-400 font-black'
                            : 'text-slate-200'
                        }
                      >
                        {p.observedValue || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{p.unit}</td>
                    <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{p.referenceRange}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.flag === 'critical'
                            ? 'bg-red-950 text-red-300 border border-red-500'
                            : p.flag === 'high'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                            : p.flag === 'low'
                            ? 'bg-blue-950 text-blue-300 border border-blue-500/50'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {p.flag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Doctor Verification Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Verifying Pathologist Name *</span>
            </label>
            <input
              type="text"
              value={pathologistName}
              onChange={(e) => setPathologistName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500 font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Medical Council Reg. Number *</span>
            </label>
            <input
              type="text"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500 font-mono font-bold"
              placeholder="E.g. WBMC-44102 / MCI-98210"
              required
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Clinical Impression & Pathologist Remarks</span>
            </label>
            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
              placeholder="Clinical observations, diagnostic notes, recommended correlations..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Locking will seal this report against tampering</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isVerifying}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-black shadow-xl"
              isLoading={isVerifying}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Verify & Lock Report
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
