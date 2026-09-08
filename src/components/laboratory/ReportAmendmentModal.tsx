import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DiagnosticReportRecord, LabParameterResult } from '../../types';
import { DiagnosticReportService } from '../../services/diagnosticReportService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AlertCircle, FileEdit, ShieldAlert, History } from 'lucide-react';

export interface ReportAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DiagnosticReportRecord | null;
  onAmended: () => void;
}

export const ReportAmendmentModal: React.FC<ReportAmendmentModalProps> = ({
  isOpen,
  onClose,
  report,
  onAmended
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [amendmentReason, setAmendmentReason] = useState('');
  const [updatedImpression, setUpdatedImpression] = useState(() => report?.clinicalImpression || '');
  const [parameters, setParameters] = useState<LabParameterResult[]>(() => 
    report?.parameters ? JSON.parse(JSON.stringify(report.parameters)) : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!report) return null;

  const handleValueChange = (idx: number, val: string) => {
    setParameters(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], observedValue: val };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendmentReason.trim()) {
      showToast('error', 'Amendment Reason Required', 'Legal audit guidelines strictly require a clinical justification for report amendment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const doctorName = currentUser?.fullName || report.reportingDoctorName || 'Authorized Consultant';
      const res = DiagnosticReportService.amendReport(report.id, {
        amendedBy: doctorName,
        reason: amendmentReason.trim(),
        updatedParameters: parameters,
        updatedImpression: updatedImpression.trim()
      });

      if (!res.success) {
        showToast('error', 'Amendment Failed', res.error || 'Could not amend report.');
        return;
      }

      showToast('success', 'Report Amended Successfully', `Official Report ${report.reportNumber} updated with preserved historical audit.`);
      onAmended();
      onClose();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Could not amend report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Controlled Clinical Report Amendment — ${report.reportNumber}`}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px]">
            <History className="w-4 h-4 text-amber-400" />
            <span>Legal Audit Trail Active</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            This report was previously finalized. Modifying analytical findings preserves the prior values in the historical amendment archive and stamps the amended report.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-slate-300 font-bold">Clinical Amendment Justification *</label>
          <input
            type="text"
            value={amendmentReason}
            onChange={(e) => setAmendmentReason(e.target.value)}
            placeholder="E.g. Repeat testing performed on calibrated analyzer / typographical correction..."
            className="w-full p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-white placeholder-slate-500 focus:outline-none"
            required
          />
        </div>

        {/* Parameters Edit Table */}
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] border-b border-slate-800 uppercase">
              <tr>
                <th className="p-2.5">Parameter</th>
                <th className="p-2.5">Reference Range</th>
                <th className="p-2.5">Unit</th>
                <th className="p-2.5">Amended Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {parameters.map((p, idx) => (
                <tr key={idx}>
                  <td className="p-2.5 font-bold text-white">{p.parameterName}</td>
                  <td className="p-2.5 text-slate-400 font-mono">{p.referenceRange}</td>
                  <td className="p-2.5 text-slate-400 font-mono">{p.unit}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={p.observedValue}
                      onChange={(e) => handleValueChange(idx, e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-teal-300 font-mono font-bold focus:border-teal-500 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1">
          <label className="block text-slate-300 font-bold">Updated Pathologist Impression</label>
          <textarea
            rows={2}
            value={updatedImpression}
            onChange={(e) => setUpdatedImpression(e.target.value)}
            className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            <FileEdit className="w-4 h-4 mr-1.5" />
            <span>Apply Legal Amendment</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
