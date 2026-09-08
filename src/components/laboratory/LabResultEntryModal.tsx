import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BloodTestBooking, LabTestResultParameter, PortalService } from '../../services/portalService';
import { LaboratoryService } from '../../services/laboratoryService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  TestTube,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

export interface LabResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: BloodTestBooking | null;
  booking?: BloodTestBooking | null;
  onResultsSaved: () => void;
}

export const LabResultEntryModal: React.FC<LabResultEntryModalProps> = ({
  isOpen,
  onClose,
  order: propOrder,
  booking,
  onResultsSaved
}) => {
  const order = propOrder || booking;
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [parameters, setParameters] = useState<LabTestResultParameter[]>([]);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [analyzerMethod, setAnalyzerMethod] = useState('Fully Automated 5-Part Cell Analyzer / Photometry');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!order) return;

    if (order.testResults && order.testResults.length > 0) {
      setParameters(order.testResults);
    } else {
      // Pull standard clinical template from LaboratoryService
      const templates = LaboratoryService.getParameterTemplates(order.testName);
      setParameters(
        templates.map(t => ({
          parameterName: t.name,
          observedValue: '',
          unit: t.unit,
          referenceRange: t.referenceRange,
          flag: 'normal'
        }))
      );
    }
    setTechnicianNotes(order.pathologistNotes || '');
  }, [order]);

  if (!order) return null;

  const handleValueChange = (index: number, val: string) => {
    setParameters(prev => {
      const next = [...prev];
      const param = { ...next[index], observedValue: val };
      param.flag = LaboratoryService.evaluateFlag(val, param.referenceRange);
      next[index] = param;
      return next;
    });
  };

  const handleFlagChange = (index: number, flag: LabTestResultParameter['flag']) => {
    setParameters(prev => {
      const next = [...prev];
      next[index] = { ...next[index], flag };
      return next;
    });
  };

  const handleAddCustomParam = () => {
    setParameters(prev => [
      ...prev,
      {
        parameterName: '',
        observedValue: '',
        unit: 'mg/dL',
        referenceRange: 'Normal',
        flag: 'normal'
      }
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parameters.length === 0) {
      showToast('error', 'Parameters Required', 'Please provide at least one test parameter.');
      return;
    }

    const unentered = parameters.filter(p => !p.observedValue.trim());
    if (unentered.length === parameters.length) {
      showToast('error', 'Values Required', 'Please enter observed values for the test parameters.');
      return;
    }

    setIsSaving(true);
    try {
      const staffName = currentUser?.fullName || 'Senior Lab Technologist';

      // 1. Update PortalService
      const fullNotes = technicianNotes.trim()
        ? `Method: ${analyzerMethod} | Notes: ${technicianNotes.trim()}`
        : `Method: ${analyzerMethod}`;

      PortalService.updateTestResults(order.id, parameters, fullNotes);

      // 2. Update LaboratoryService if order exists there
      try {
        LaboratoryService.saveResults(
          order.id,
          parameters.map((p, idx) => ({
            id: `prm_${idx}`,
            parameterName: p.parameterName,
            observedValue: p.observedValue,
            unit: p.unit,
            referenceRange: p.referenceRange,
            flag: p.flag
          })),
          staffName,
          technicianNotes
        );
      } catch {}

      showToast('success', 'Analytical Results Saved', `Entered ${parameters.length} parameters for ${order.patientName}.`);
      onResultsSaved();
      onClose();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save test results.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasCritical = parameters.some(p => p.flag === 'critical');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Technician Result Entry — ${order.testName}`}
      maxWidth="4xl"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Order Header Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-mono">Requisition #</span>
            <div className="font-bold text-white font-mono text-sm">{order.bookingNo}</div>
          </div>
          <div>
            <span className="text-slate-400">Patient</span>
            <div className="font-bold text-white text-sm">{order.patientName}</div>
          </div>
          <div>
            <span className="text-slate-400">Sample Barcode</span>
            <div className="font-mono text-purple-300 font-bold">{order.sampleBarcode || 'Unbarcoded'}</div>
          </div>
          <div>
            <span className="text-slate-400">Tube Specimen</span>
            <div className="text-slate-300">{order.sampleTubeType || 'EDTA Tube'}</div>
          </div>
        </div>

        {/* Critical Value Alert Banner */}
        {hasCritical && (
          <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-2xl flex items-center gap-3 text-red-200 text-xs animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="font-bold block">Critical / Panic Value Detected!</strong>
              <span>One or more observed values fall significantly outside critical safety boundaries. Doctor / Pathologist alert recommended.</span>
            </div>
          </div>
        )}

        {/* Parameters Entry Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Observation Parameters ({parameters.length})
            </h4>
            <button
              type="button"
              onClick={handleAddCustomParam}
              className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Analyte</span>
            </button>
          </div>

          <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-300 border-b border-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Analyte / Investigation</th>
                  <th className="py-2.5 px-3 w-28">Observed Value *</th>
                  <th className="py-2.5 px-3 w-20">Unit</th>
                  <th className="py-2.5 px-3 w-32">Ref. Range</th>
                  <th className="py-2.5 px-3 w-28 text-center">Flag</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parameters.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.parameterName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParameters(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], parameterName: val };
                            return next;
                          });
                        }}
                        className="w-full bg-transparent text-white font-medium focus:outline-none focus:border-b border-teal-500"
                        placeholder="Parameter name..."
                        required
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.observedValue}
                        onChange={(e) => handleValueChange(idx, e.target.value)}
                        className={`w-full px-2 py-1 rounded-lg bg-slate-800 border text-white font-bold text-xs focus:outline-none ${
                          p.flag === 'critical'
                            ? 'border-red-500 text-red-400 bg-red-950/40'
                            : p.flag === 'high'
                            ? 'border-rose-500 text-rose-400'
                            : p.flag === 'low'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-slate-700 focus:border-teal-500'
                        }`}
                        placeholder="Value..."
                        required
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParameters(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], unit: val };
                            return next;
                          });
                        }}
                        className="w-full bg-transparent text-slate-400 text-[11px] focus:outline-none focus:border-b border-teal-500"
                        placeholder="Unit..."
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.referenceRange}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParameters(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], referenceRange: val };
                            return next;
                          });
                        }}
                        className="w-full bg-transparent text-slate-400 font-mono text-[11px] focus:outline-none focus:border-b border-teal-500"
                        placeholder="e.g. 10 - 20"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <select
                        value={p.flag}
                        onChange={(e) => handleFlagChange(idx, e.target.value as any)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border bg-slate-800 focus:outline-none ${
                          p.flag === 'critical'
                            ? 'text-red-400 border-red-500 bg-red-950'
                            : p.flag === 'high'
                            ? 'text-rose-400 border-rose-500 bg-rose-950'
                            : p.flag === 'low'
                            ? 'text-blue-400 border-blue-500 bg-blue-950'
                            : 'text-emerald-400 border-emerald-500/40 bg-emerald-950'
                        }`}
                      >
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                        <option value="high">High</option>
                        <option value="critical">Critical ⚠</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveParam(idx)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                        title="Remove analyte"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analyzer Instrument & Method Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>Analyzer System & Method</span>
            </label>
            <input
              type="text"
              value={analyzerMethod}
              onChange={(e) => setAnalyzerMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
              placeholder="Instrument used..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Technician Remarks / Observations</span>
            </label>
            <input
              type="text"
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
              placeholder="Sample condition, hemolysis check, etc."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-lg"
            isLoading={isSaving}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Save Analytical Results
          </Button>
        </div>
      </form>
    </Modal>
  );
};
