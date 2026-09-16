import React, { useState } from 'react';
import { Patient } from '../../types';
import { CentralUhidService } from '../../services/centralUhidService';
import { StorageService } from '../../services/storage';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { GitMerge, ShieldAlert, ArrowRight, UserCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface PatientMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSurvivingPatient?: Patient;
  onMergeSuccess?: (survivingPatient: Patient) => void;
}

export const PatientMergeModal: React.FC<PatientMergeModalProps> = ({
  isOpen,
  onClose,
  defaultSurvivingPatient,
  onMergeSuccess
}) => {
  const { showToast } = useToast();
  const currentUser = StorageService.getCurrentUser();
  const allPatients = StorageService.getPatients().filter(p => !p.isDeleted && !p.isMerged);

  const [survivingUhid, setSurvivingUhid] = useState<string>(
    defaultSurvivingPatient?.uhid || defaultSurvivingPatient?.id || ''
  );
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [selectedTargetPatient, setSelectedTargetPatient] = useState<Patient | null>(null);
  const [mergeReason, setMergeReason] = useState('Duplicate registration consolidation (Identical person verified by clinical desk)');
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const survivingPatient = allPatients.find(p => p.uhid === survivingUhid || p.id === survivingUhid);

  // Filter candidates for target duplicate
  const targetCandidates = targetSearchQuery.trim().length >= 2
    ? CentralUhidService.searchPatients(targetSearchQuery, allPatients)
        .filter(p => (p.uhid !== survivingUhid && p.id !== survivingUhid))
        .slice(0, 5)
    : [];

  const handleExecuteMerge = async () => {
    if (!survivingUhid) {
      showToast('error', 'Surviving UHID Missing', 'Please specify the primary surviving UHID.');
      return;
    }
    if (!selectedTargetPatient) {
      showToast('error', 'Target Record Missing', 'Please search and select the duplicate record to merge.');
      return;
    }
    if (!confirmedSafe) {
      showToast('warning', 'Confirmation Required', 'Please confirm you understand that target record will be consolidated.');
      return;
    }

    setIsProcessing(true);
    try {
      const targetUhid = selectedTargetPatient.uhid || selectedTargetPatient.id;
      const res = await CentralUhidService.mergePatients({
        survivingUhid,
        targetUhid,
        reason: mergeReason,
        staffName: currentUser?.fullName || 'Super Administrator'
      });

      showToast('success', 'Patients Consolidated', res.message);
      if (onMergeSuccess) {
        onMergeSuccess(res.survivingPatient);
      }
      onClose();
    } catch (err: any) {
      showToast('error', 'Merge Failed', err?.message || 'Failed to merge patient records.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Administrative Patient Master
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Duplicate Patient Consolidation & Merge
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Policy Notice */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="leading-snug space-y-0.5">
              <strong className="block font-bold">Standard Patient Identity Safeguard:</strong>
              <span>
                Merging will consolidate appointments, lab orders, and billing records into the <strong>Surviving UHID</strong>. The duplicate record is preserved in audit history with its original UHID traced.
              </span>
            </div>
          </div>

          {/* Merge Visualizer: Target -> Surviving */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            {/* Box 1: Surviving Record (Master) */}
            <div className="p-3.5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                  SURVIVING MASTER UHID
                </span>
                <Badge variant="success">Keeps Identity</Badge>
              </div>

              {survivingPatient ? (
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {survivingPatient.fullName}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                    UHID: {survivingPatient.uhid || survivingPatient.id}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Phone: {survivingPatient.mobile} • {survivingPatient.gender} • Age {survivingPatient.age}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 italic">No surviving patient selected.</div>
              )}
            </div>

            {/* Box 2: Target Duplicate Record */}
            <div className="p-3.5 rounded-2xl border-2 border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md">
                  TARGET DUPLICATE RECORD
                </span>
                <Badge variant="neutral">Will Be Merged</Badge>
              </div>

              {selectedTargetPatient ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedTargetPatient.fullName}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTargetPatient(null)}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-rose-700 dark:text-rose-400 font-bold mt-0.5">
                    UHID: {selectedTargetPatient.uhid || selectedTargetPatient.id}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Phone: {selectedTargetPatient.mobile} • {selectedTargetPatient.gender} • Age {selectedTargetPatient.age}
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={targetSearchQuery}
                    onChange={(e) => setTargetSearchQuery(e.target.value)}
                    placeholder="Search duplicate by UHID, Name, or Phone..."
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />

                  {targetCandidates.length > 0 && (
                    <div className="mt-1.5 border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-32 overflow-y-auto bg-white dark:bg-slate-800 shadow-lg">
                      {targetCandidates.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                            setSelectedTargetPatient(c);
                            setTargetSearchQuery('');
                          }}
                          className="w-full text-left p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] flex justify-between items-center transition"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{c.fullName}</span>
                            <span className="text-[10px] font-mono text-slate-400 ml-2">UHID: {c.uhid || c.id}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{c.mobile}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Merge Justification */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Merge Justification / Administrative Note *
            </label>
            <textarea
              rows={2}
              value={mergeReason}
              onChange={(e) => setMergeReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide reason for patient consolidation (e.g. registered twice by different desks)"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 cursor-pointer bg-slate-50 dark:bg-slate-800/40">
            <input
              type="checkbox"
              checked={confirmedSafe}
              onChange={(e) => setConfirmedSafe(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300">
              I certify that both records belong to the same patient and authorize consolidation into UHID <strong>{survivingUhid}</strong>.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExecuteMerge}
            disabled={!survivingUhid || !selectedTargetPatient || !confirmedSafe || isProcessing}
            isLoading={isProcessing}
            leftIcon={<GitMerge className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
          >
            Execute Controlled Merge
          </Button>
        </div>
      </div>
    </div>
  );
};
