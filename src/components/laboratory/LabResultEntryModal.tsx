import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BloodTestBooking, LabTestResultParameter, PortalService } from '../../services/portalService';
import { LaboratoryService } from '../../services/laboratoryService';
import { TechnicianMasterService } from '../../services/technicianMasterService';
import { TestMasterService } from '../../services/testMasterService';
import { BookedTestConfig, TestResultType, LabParameterFlag } from '../../types';
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
  Sparkles,
  UserCheck,
  Zap,
  Check,
  Layers,
  Info
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

  const technicians = TechnicianMasterService.getAllTechnicians();
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(() => technicians[0]?.id || '');
  const [parameters, setParameters] = useState<LabTestResultParameter[]>([]);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [analyzerMethod, setAnalyzerMethod] = useState('Fully Automated 5-Part Cell Counter / Photometry');
  const [activeTestTab, setActiveTestTab] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize parameters from authoritative Test Master configuration or existing results
  useEffect(() => {
    if (!order) return;

    // Check if order already has entered parameters
    if (order.testResults && order.testResults.length > 0 && order.testResults.some(r => r.observedValue?.trim())) {
      setParameters(order.testResults);
    } else {
      // Load automatically from Test Master single source of truth
      let initialParams: LabTestResultParameter[] = [];

      if (order.bookedTests && order.bookedTests.length > 0) {
        initialParams = TestMasterService.buildInitialResultsFromBookedTests(order.bookedTests).map(p => ({
          id: p.id,
          testId: p.testId,
          testName: p.testName,
          parameterId: p.parameterId,
          parameterCode: p.parameterCode,
          parameterName: p.parameterName,
          observedValue: p.observedValue || '',
          unit: p.unit,
          referenceRange: p.referenceRange,
          flag: p.flag as 'normal' | 'low' | 'high' | 'critical',
          critical: p.critical,
          resultType: p.resultType,
          displayOrder: p.displayOrder,
          reportOrder: p.reportOrder,
          required: p.required,
          qualitativeOptions: p.qualitativeOptions,
          method: p.method,
          notes: p.notes
        }));
      } else {
        // Resolve from testName or testNames
        const testNames = order.testName ? order.testName.split('+').map(s => s.trim()) : ['Diagnostic Investigation'];
        const resolvedBookedTests: BookedTestConfig[] = [];

        for (const tname of testNames) {
          const t = TestMasterService.getTestByNameOrCode(tname);
          if (t) {
            resolvedBookedTests.push(TestMasterService.createBookedTestConfig(t, order.patientAge, order.patientGender));
          } else {
            resolvedBookedTests.push({
              testId: `t_${Date.now()}`,
              testCode: 'LAB-AUTO',
              testName: tname,
              department: order.department || 'Clinical Pathology',
              specimen: 'Standard Specimen',
              parameters: [
                {
                  id: `p_${Date.now()}`,
                  parameterName: tname,
                  resultType: 'numeric',
                  unit: 'mg/dL',
                  defaultReferenceRange: 'Normal',
                  displayOrder: 1,
                  reportOrder: 1,
                  required: true
                }
              ]
            });
          }
        }

        initialParams = TestMasterService.buildInitialResultsFromBookedTests(resolvedBookedTests).map(p => ({
          id: p.id,
          testId: p.testId,
          testName: p.testName,
          parameterId: p.parameterId,
          parameterCode: p.parameterCode,
          parameterName: p.parameterName,
          observedValue: p.observedValue || '',
          unit: p.unit,
          referenceRange: p.referenceRange,
          flag: p.flag as 'normal' | 'low' | 'high' | 'critical',
          critical: p.critical,
          resultType: p.resultType,
          displayOrder: p.displayOrder,
          reportOrder: p.reportOrder,
          required: p.required,
          qualitativeOptions: p.qualitativeOptions,
          method: p.method,
          notes: p.notes
        }));
      }

      setParameters(initialParams);
    }

    setTechnicianNotes(order.pathologistNotes || order.clinicalNotes || '');
  }, [order]);

  // Distinct tests in the current order
  const distinctTests = useMemo(() => {
    if (!order) return [];
    if (order.bookedTests && order.bookedTests.length > 0) {
      return order.bookedTests.map(b => ({
        id: b.testId,
        name: b.testName,
        department: b.department,
        specimen: b.specimen,
        method: b.method
      }));
    }
    const names = Array.from(new Set(parameters.map(p => p.testName).filter(Boolean))) as string[];
    if (names.length > 0) {
      return names.map(n => ({ id: n, name: n, department: 'Clinical Pathology', specimen: 'Standard Specimen', method: undefined }));
    }
    return [{ id: 'all', name: order.testName || 'Diagnostic Investigation', department: order.department || 'Pathology', specimen: 'Blood', method: undefined }];
  }, [order, parameters]);

  // Parameters filtered by active tab
  const displayedParameters = useMemo(() => {
    if (activeTestTab === 'all') return parameters;
    return parameters.filter(p => p.testId === activeTestTab || p.testName === activeTestTab);
  }, [parameters, activeTestTab]);

  if (!order) return null;

  // Real-time value change with automated flag evaluation & live calculations
  const handleValueChange = (paramId: string | undefined, indexInFullList: number, val: string) => {
    setParameters(prev => {
      const next = [...prev];
      const targetIdx = paramId ? next.findIndex(p => p.id === paramId) : indexInFullList;
      if (targetIdx === -1) return prev;

      const p = next[targetIdx];
      const evalRes = TestMasterService.evaluateAbnormalFlag(
        {
          resultType: p.resultType,
          referenceRange: p.referenceRange,
          parameterName: p.parameterName
        },
        val
      );

      next[targetIdx] = {
        ...p,
        observedValue: val,
        flag: evalRes.flag,
        critical: evalRes.critical
      };

      // Run live automated calculations for dependent parameters (VLDL, LDL, Non-HDL, Indirect Bili, Globulin, A:G, BUN, eAG, MCV, MCH, MCHC)
      const { updatedParameters } = TestMasterService.runAutomatedCalculations(
        next,
        order.patientAge || 45,
        order.patientGender || 'male'
      );

      return updatedParameters;
    });
  };

  const handleFlagChange = (paramId: string | undefined, indexInFullList: number, flag: LabParameterFlag) => {
    setParameters(prev => {
      const next = [...prev];
      const targetIdx = paramId ? next.findIndex(p => p.id === paramId) : indexInFullList;
      if (targetIdx === -1) return prev;

      next[targetIdx] = {
        ...next[targetIdx],
        flag,
        critical: flag === 'critical'
      };
      return next;
    });
  };

  // Rapid Auto-Fill Normal Helper
  const handleAutoFillNormals = () => {
    setParameters(prev => {
      return prev.map(p => {
        if (p.observedValue && p.observedValue.trim()) {
          return p; // keep existing entered values
        }

        let normalVal = '';
        if (p.resultType === 'positive_negative') {
          normalVal = 'Negative';
        } else if (p.resultType === 'reactive_non_reactive') {
          normalVal = 'Non-Reactive';
        } else if (p.resultType === 'qualitative' && p.qualitativeOptions && p.qualitativeOptions.length > 0) {
          normalVal = p.qualitativeOptions[0];
        } else if (p.referenceRange) {
          // Numeric midpoint
          const match = p.referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
          if (match) {
            const min = parseFloat(match[1]);
            const max = parseFloat(match[2]);
            const mid = (min + max) / 2;
            normalVal = mid % 1 === 0 ? mid.toString() : mid.toFixed(1);
          } else if (p.referenceRange.toLowerCase().includes('nil')) {
            normalVal = 'Nil';
          } else if (p.referenceRange.toLowerCase().includes('normal')) {
            normalVal = 'Normal';
          } else if (p.referenceRange.toLowerCase().includes('negative')) {
            normalVal = 'Negative';
          }
        }

        return {
          ...p,
          observedValue: normalVal,
          flag: 'normal',
          critical: false
        };
      });
    });

    showToast('info', 'Auto-Filled Reference Normals', 'Empty analytes populated with baseline normal values.');
  };

  const handleAddCustomParam = () => {
    const activeTest = distinctTests.find(t => t.id === activeTestTab) || distinctTests[0];
    setParameters(prev => [
      ...prev,
      {
        id: `p_custom_${Date.now()}`,
        testId: activeTest?.id,
        testName: activeTest?.name || order.testName,
        parameterName: '',
        observedValue: '',
        unit: 'mg/dL',
        referenceRange: 'Normal',
        flag: 'normal',
        resultType: 'numeric',
        displayOrder: prev.length + 1,
        reportOrder: prev.length + 1,
        required: false
      }
    ]);
  };

  const handleRemoveParam = (paramId: string | undefined, fallbackIdx: number) => {
    setParameters(prev => {
      if (paramId) return prev.filter(p => p.id !== paramId);
      return prev.filter((_, i) => i !== fallbackIdx);
    });
  };

  const handleSave = async (e?: React.FormEvent, isDraft: boolean = false) => {
    if (e) e.preventDefault();
    if (!order) return;

    if (!parameters.length) {
      showToast('error', 'Missing Parameters', 'Please configure at least one test parameter.');
      return;
    }

    const unentered = parameters.filter(p => !p.observedValue?.trim());
    if (!isDraft && unentered.length === parameters.length) {
      showToast('error', 'Values Required', 'Please enter analytical results before submitting for pathologist verification.');
      return;
    }

    setIsSaving(true);
    try {
      const staffName = currentUser?.fullName || 'Senior Diagnostic Technologist';

      const fullNotes = technicianNotes.trim()
        ? `Method: ${analyzerMethod} | Notes: ${technicianNotes.trim()}`
        : `Method: ${analyzerMethod}`;

      // Save into LaboratoryService
      LaboratoryService.saveResults(
        order.id,
        parameters.map((p, idx) => ({
          id: p.id || `prm_${idx}`,
          testId: p.testId,
          testName: p.testName,
          parameterId: p.parameterId,
          parameterCode: p.parameterCode,
          parameterName: p.parameterName,
          observedValue: p.observedValue,
          unit: p.unit,
          referenceRange: p.referenceRange,
          flag: p.flag || (LaboratoryService.evaluateFlag(p.observedValue, p.referenceRange, p) as any),
          critical: p.critical || p.flag === 'critical',
          resultType: p.resultType,
          method: p.method || analyzerMethod,
          displayOrder: p.displayOrder || idx + 1,
          reportOrder: p.reportOrder || idx + 1
        })),
        staffName,
        fullNotes,
        isDraft
      );

      // Keep PortalService synced
      PortalService.updateTestResults(order.id, parameters, fullNotes);

      const hasCrit = parameters.some(p => p.flag === 'critical' || p.critical);
      if (hasCrit) {
        showToast(
          'warning',
          'Critical Panic Alert! 🚨',
          'One or more parameters exceed life-critical panic thresholds. Document clinical doctor notification.'
        );
      } else {
        showToast(
          'success',
          isDraft ? 'Draft Saved' : 'Results Submitted for Verification',
          `${parameters.length} analytical parameters recorded from Test Master for ${order.patientName}.`
        );
      }

      onResultsSaved();
      onClose();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save test results.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasCritical = parameters.some(p => p.flag === 'critical' || p.critical);
  const totalEntered = parameters.filter(p => p.observedValue?.trim()).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Technician Result Entry — ${order.testName}`}
      maxWidth="6xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Order Header Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-mono text-[10px] uppercase">Requisition #</span>
            <div className="font-bold text-white font-mono text-sm">{order.bookingNo}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Patient</span>
            <div className="font-bold text-white text-sm">
              {order.patientName} {order.patientAge ? `(${order.patientAge}y/${order.patientGender || 'Gen'})` : ''}
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Specimen & Barcode</span>
            <div className="font-mono text-purple-300 font-bold">
              {order.sampleBarcode || 'Unbarcoded'} • {order.sampleTubeType || 'Specimen Tube'}
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Completion</span>
            <div className="font-mono font-bold text-teal-400">
              {totalEntered} / {parameters.length} Analyzed
            </div>
          </div>
        </div>

        {/* Critical Panic Alert Banner */}
        {hasCritical && (
          <div className="p-3 bg-red-950/90 border border-red-500/70 rounded-2xl flex items-center gap-3 text-red-200 text-xs animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="font-bold block text-red-300">Critical / Panic Diagnostic Result Detected!</strong>
              <span>One or more values fall significantly outside biological safety boundaries. Pathologist and treating physician alert mandatory.</span>
            </div>
          </div>
        )}

        {/* Multi-Test Partition Tabs (e.g. CBC | LFT | KFT | Urine Routine) */}
        {distinctTests.length > 1 && (
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTestTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                activeTestTab === 'all'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Investigations ({parameters.length})</span>
            </button>

            {distinctTests.map(t => {
              const testParamCount = parameters.filter(p => p.testId === t.id || p.testName === t.name).length;
              const testEnteredCount = parameters.filter(p => (p.testId === t.id || p.testName === t.name) && p.observedValue?.trim()).length;
              const isSelected = activeTestTab === t.id || activeTestTab === t.name;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTestTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <TestTube className="w-3.5 h-3.5 text-teal-300" />
                  <span>{t.name}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/40 text-teal-200">
                    {testEnteredCount}/{testParamCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Parameters Table Header & Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Investigation Analytes ({displayedParameters.length})</span>
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              Age/Gender Reference Ranges Loaded
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillNormals}
              className="text-xs text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 transition"
              title="Automatically fills empty analytes with baseline normal values"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill Normals</span>
            </button>

            <button
              type="button"
              onClick={handleAddCustomParam}
              className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-950/60 border border-teal-500/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Analyte</span>
            </button>
          </div>
        </div>

        {/* Parameters Entry Grid */}
        <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-900 max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800 text-slate-300 border-b border-slate-700 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Analyte / Biomarker</th>
                {distinctTests.length > 1 && activeTestTab === 'all' && (
                  <th className="py-2.5 px-2 w-32">Test Panel</th>
                )}
                <th className="py-2.5 px-3 w-56">Observed Analytical Value *</th>
                <th className="py-2.5 px-2 w-20">Unit</th>
                <th className="py-2.5 px-3 w-36">Reference Range</th>
                <th className="py-2.5 px-3 w-28 text-center">Status Flag</th>
                <th className="py-2.5 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayedParameters.map((p, displayIdx) => {
                const fullIdx = parameters.findIndex(orig => orig.id === p.id);

                return (
                  <tr key={p.id || displayIdx} className="hover:bg-slate-800/40 transition">
                    {/* Analyte Name */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 text-xs">{p.parameterName}</span>
                        {p.isCalculated && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 shrink-0"
                            title={p.calculationFormula ? `Formula: ${p.calculationFormula}` : 'Auto-computed from primary observations'}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            Auto-Calc
                          </span>
                        )}
                        {p.required && <span className="text-red-400">*</span>}
                      </div>
                      {p.notes && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Info className="w-3 h-3 text-slate-500" />
                          <span>{p.notes}</span>
                        </div>
                      )}
                    </td>

                    {/* Test Panel Badge (when viewing all) */}
                    {distinctTests.length > 1 && activeTestTab === 'all' && (
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-teal-300 border border-slate-700 truncate block">
                          {p.testName || 'Test'}
                        </span>
                      </td>
                    )}

                    {/* Adaptive Input Field based on resultType */}
                    <td className="py-2 px-3">
                      {p.resultType === 'positive_negative' ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleValueChange(p.id, fullIdx, 'Negative')}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition ${
                              p.observedValue === 'Negative'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            Negative
                          </button>
                          <button
                            type="button"
                            onClick={() => handleValueChange(p.id, fullIdx, 'Positive')}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition ${
                              p.observedValue === 'Positive'
                                ? 'bg-red-600 text-white border-red-500 shadow-md'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            Positive
                          </button>
                        </div>
                      ) : p.resultType === 'reactive_non_reactive' ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleValueChange(p.id, fullIdx, 'Non-Reactive')}
                            className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold border transition ${
                              p.observedValue === 'Non-Reactive'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            Non-Reactive
                          </button>
                          <button
                            type="button"
                            onClick={() => handleValueChange(p.id, fullIdx, 'Reactive')}
                            className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold border transition ${
                              p.observedValue === 'Reactive'
                                ? 'bg-red-600 text-white border-red-500 shadow-md'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            Reactive
                          </button>
                        </div>
                      ) : p.resultType === 'qualitative' && p.qualitativeOptions && p.qualitativeOptions.length > 0 ? (
                        <select
                          value={p.observedValue}
                          onChange={(e) => handleValueChange(p.id, fullIdx, e.target.value)}
                          className={`w-full px-2 py-1.5 rounded-lg bg-slate-800 border text-xs font-medium text-white focus:outline-none ${
                            p.flag === 'critical'
                              ? 'border-red-500 bg-red-950/40 text-red-300'
                              : p.flag === 'high'
                              ? 'border-rose-500 text-rose-300'
                              : 'border-slate-700 focus:border-teal-500'
                          }`}
                        >
                          <option value="">Select finding...</option>
                          {p.qualitativeOptions.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={p.resultType === 'numeric' ? 'text' : 'text'}
                          value={p.observedValue}
                          onChange={(e) => handleValueChange(p.id, fullIdx, e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border text-white font-bold text-xs focus:outline-none transition ${
                            p.flag === 'critical'
                              ? 'border-red-500 text-red-400 bg-red-950/40 ring-1 ring-red-500'
                              : p.flag === 'high'
                              ? 'border-rose-500 text-rose-400 bg-rose-950/20'
                              : p.flag === 'low'
                              ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                              : 'border-slate-700 focus:border-teal-500'
                          }`}
                          placeholder="Enter observed value..."
                        />
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">
                      {p.unit || '—'}
                    </td>

                    {/* Reference Range */}
                    <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                        {p.referenceRange || 'Standard Range'}
                      </span>
                    </td>

                    {/* Status Flag Dropdown & Badge */}
                    <td className="py-2 px-3 text-center">
                      <select
                        value={p.flag}
                        onChange={(e) => handleFlagChange(p.id, fullIdx, e.target.value as any)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border bg-slate-800 focus:outline-none transition ${
                          p.flag === 'critical'
                            ? 'text-red-400 border-red-500 bg-red-950 font-black animate-pulse'
                            : p.flag === 'high'
                            ? 'text-rose-400 border-rose-500 bg-rose-950/60'
                            : p.flag === 'low'
                            ? 'text-blue-400 border-blue-500 bg-blue-950/60'
                            : 'text-emerald-400 border-emerald-600/40'
                        }`}
                      >
                        <option value="normal">Normal</option>
                        <option value="low">Low (L)</option>
                        <option value="high">High (H)</option>
                        <option value="critical">CRITICAL (Panic)</option>
                      </select>
                    </td>

                    {/* Remove Custom Param */}
                    <td className="py-2 px-2 text-center">
                      {!p.required && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParam(p.id, fullIdx)}
                          className="text-slate-500 hover:text-red-400 transition"
                          title="Remove analyte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Verification Meta: Technologist, Instrument, Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Performing Laboratory Technologist *</span>
            </label>
            <select
              value={selectedTechnicianId}
              onChange={(e) => setSelectedTechnicianId(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500 font-medium"
            >
              {technicians.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.technicianCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>Analyzer System & Analytical Method</span>
            </label>
            <input
              type="text"
              value={analyzerMethod}
              onChange={(e) => setAnalyzerMethod(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
              placeholder="e.g. Sysmex XN-550 / Roche Cobas c311..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Technologist Observations & Notes</span>
            </label>
            <input
              type="text"
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
              placeholder="Specimen integrity, lipemia/icterus index, correlation..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(undefined, true)}
              disabled={isSaving}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <Clock className="w-4 h-4 mr-1.5 text-amber-400" />
              Save as Draft
            </Button>

            <Button
              type="submit"
              variant="primary"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-lg"
              isLoading={isSaving}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Submit for Verification ({totalEntered}/{parameters.length})
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
