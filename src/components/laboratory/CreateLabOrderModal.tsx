import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StorageService } from '../../services/storage';
import { CatalogService, LabTestItem } from '../../services/catalogService';
import { LaboratoryService } from '../../services/laboratoryService';
import { PortalService, BloodTestBooking } from '../../services/portalService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  TestTube,
  Search,
  User,
  CreditCard,
  CheckCircle2,
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';

export interface CreateLabOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: BloodTestBooking) => void;
}

export const CreateLabOrderModal: React.FC<CreateLabOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const patients = useMemo(() => StorageService.getPatients().filter(p => !p.isDeleted), []);
  const cards = useMemo(() => StorageService.getCards(), []);
  const tests = useMemo(() => CatalogService.getTests(), []);
  const panels = useMemo(() => CatalogService.getPanels(), []);

  // Mode: Individual Tests vs Panels / Packages (Requirement 3 & 17)
  const [catalogMode, setCatalogMode] = useState<'individual' | 'panels'>('individual');

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [prescribedByDoctor, setPrescribedByDoctor] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'wallet'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Patient
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientCard = selectedPatient
    ? (selectedPatient.healthCardId ? cards.find(c => c.id === selectedPatient.healthCardId) : cards.find(c => c.patientId === selectedPatient.id))
    : null;

  // Selected Tests from Catalog
  const selectedTests = useMemo(() => {
    return tests.filter(t => selectedTestIds.includes(t.id));
  }, [tests, selectedTestIds]);

  // Selected Panels from Catalog
  const selectedPanels = useMemo(() => {
    return panels.filter(p => selectedPanelIds.includes(p.id));
  }, [panels, selectedPanelIds]);

  // Quick Preset Helper
  const applyPreset = (testNames: string[]) => {
    const matchedIds: string[] = [];
    for (const name of testNames) {
      const found = tests.find(t => t.name.toLowerCase().includes(name.toLowerCase()) || t.code.toLowerCase().includes(name.toLowerCase()));
      if (found && !selectedTestIds.includes(found.id)) {
        matchedIds.push(found.id);
      }
    }
    if (matchedIds.length > 0) {
      setSelectedTestIds(prev => Array.from(new Set([...prev, ...matchedIds])));
    }
  };

  const handleToggleTest = (id: string) => {
    setSelectedTestIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(tId => tId !== id);
      }
      return [...prev, id];
    });
  };

  const handleTogglePanel = (id: string) => {
    setSelectedPanelIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      }
      return [...prev, id];
    });
  };

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 10);
    const q = patientSearch.toLowerCase().trim();
    return patients
      .filter(p => p.fullName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.mobile.includes(q))
      .slice(0, 10);
  }, [patients, patientSearch]);

  // Filtered Tests
  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return tests.slice(0, 15);
    const q = testSearch.toLowerCase().trim();
    return tests
      .filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .slice(0, 15);
  }, [tests, testSearch]);

  // Filtered Panels
  const filteredPanels = useMemo(() => {
    if (!testSearch.trim()) return panels;
    const q = testSearch.toLowerCase().trim();
    return panels.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q)
    );
  }, [panels, testSearch]);

  // Pricing calculation across all selected individual investigations and panels
  const totalIndividualMrp = selectedTests.reduce((acc, t) => acc + (t.mrp || 0), 0);
  const totalPanelMrp = selectedPanels.reduce((acc, p) => acc + (p.offerPrice || p.mrp || 0), 0);
  const totalMrp = totalIndividualMrp + totalPanelMrp;

  const discountPct = patientCard ? 25 : 0;
  const discountAmount = Math.round((totalMrp * discountPct) / 100);
  const netPayable = Math.max(0, totalMrp - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      showToast('error', 'Patient Required', 'Please select a registered patient.');
      return;
    }
    if (selectedTests.length === 0 && selectedPanels.length === 0) {
      showToast('error', 'Investigation Required', 'Please select at least one individual test or panel/package.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build test name composite
      const allNames: string[] = [
        ...selectedPanels.map(p => `[Panel] ${p.name}`),
        ...selectedTests.map(t => t.name)
      ];

      // Create unified multi-test lab order with Test Master snapshot & panel expansion
      const labOrder = LaboratoryService.createOrder({
        patientId: selectedPatient.id,
        testIds: [
          ...selectedPanelIds,
          ...selectedTestIds
        ],
        testNames: allNames,
        testName: allNames.join(' + '),
        department: selectedPanels[0]?.department || selectedTests[0]?.department || 'Clinical Pathology',
        category: selectedPanels[0]?.category || selectedTests[0]?.category || 'Biochemistry',
        priority,
        clinicalNotes: clinicalNotes.trim(),
        prescribedByDoctorName: prescribedByDoctor.trim() || 'Walk-in Consultation',
        mrp: totalMrp,
        isPaid: true,
        paymentMethod,
        currentUser: currentUser as any
      });

      showToast(
        'success',
        'Lab Order Booked! 🧪',
        `Requisition ${labOrder.orderNumber} booked with ${allNames.length} investigations from Test Master.`
      );
      onOrderCreated(labOrder as any);
      onClose();
    } catch (err: any) {
      showToast('error', 'Order Error', err.message || 'Could not create lab order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Laboratory Requisition & Billing"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Select Patient */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Select Patient
          </label>

          {!selectedPatient ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by Patient Name, ID (LMDX-...), or Mobile..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="max-h-44 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900">
                {filteredPatients.map((p) => {
                  const hasCard = p.healthCardId || cards.some(c => c.patientId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearch('');
                      }}
                      className="w-full p-2.5 text-left hover:bg-slate-800/60 transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-white font-bold">{p.fullName}</strong>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.id} • {p.mobile} • {p.age} Y/{p.gender.toUpperCase()}
                        </div>
                      </div>
                      {hasCard && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-500/40">
                          Smart Cardholder
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-sm font-bold text-white block">{selectedPatient.fullName}</strong>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedPatient.id} • {selectedPatient.mobile} • Blood: {selectedPatient.bloodGroup}
                  </span>
                  {patientCard && (
                    <span className="ml-2 text-[10px] font-bold text-teal-300 font-mono">
                      [Card: {patientCard.cardNumber}]
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId('')}>
                Change
              </Button>
            </div>
          )}
        </div>

        {/* Step 2: Select Tests / Panels from Test Master */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Select Diagnostic Investigations ({selectedTests.length + selectedPanels.length} Selected)
            </label>
            <span className="text-[11px] text-teal-400 font-medium">Test Master Single Source of Truth</span>
          </div>

          {/* Separation Tabs (Requirement 3 & 17) */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setCatalogMode('individual')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                catalogMode === 'individual'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TestTube className="w-3.5 h-3.5" />
              <span>INDIVIDUAL TESTS ({tests.length})</span>
              {selectedTests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white text-teal-900 font-black">
                  {selectedTests.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCatalogMode('panels')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                catalogMode === 'panels'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>PANELS / PACKAGES ({panels.length})</span>
              {selectedPanels.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white text-teal-900 font-black">
                  {selectedPanels.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Clinical Order Presets */}
          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 self-center font-bold mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => {
                const lipid = panels.find(p => p.id === 'pnl_lipid_profile' || p.name.toLowerCase().includes('lipid'));
                const lft = panels.find(p => p.id === 'pnl_lft' || p.name.toLowerCase().includes('liver'));
                const kft = panels.find(p => p.id === 'pnl_kft' || p.name.toLowerCase().includes('kidney'));
                const cbc = panels.find(p => p.id === 'pnl_cbc' || p.name.toLowerCase().includes('complete blood'));
                const matched = [lipid?.id, lft?.id, kft?.id, cbc?.id].filter(Boolean) as string[];
                setSelectedPanelIds(prev => Array.from(new Set([...prev, ...matched])));
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-500/40 hover:bg-teal-900 transition"
            >
              ⚡ Comprehensive Executive (CBC + LFT + KFT + Lipid)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(['Complete Haemogram', 'CBC'])}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
            >
              + CBC Test
            </button>
            <button
              type="button"
              onClick={() => applyPreset(['Liver Function', 'LFT'])}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
            >
              + LFT Test
            </button>
            <button
              type="button"
              onClick={() => applyPreset(['Kidney Function', 'KFT'])}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
            >
              + KFT Test
            </button>
            <button
              type="button"
              onClick={() => applyPreset(['Lipid Profile'])}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
            >
              + Lipid Test
            </button>
            <button
              type="button"
              onClick={() => applyPreset(['Thyroid Profile', 'TSH'])}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
            >
              + Thyroid
            </button>
          </div>

          {/* Selected Investigations Basket */}
          {(selectedTests.length > 0 || selectedPanels.length > 0) && (
            <div className="space-y-1.5 p-2.5 rounded-2xl bg-teal-950/40 border border-teal-500/30">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-teal-300">
                  Booked Basket ({selectedPanels.length} Panels, {selectedTests.length} Individual Tests):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTestIds([]);
                    setSelectedPanelIds([]);
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-400"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {/* Selected Panels */}
                {selectedPanels.map(p => (
                  <div key={p.id} className="p-2 rounded-xl bg-slate-900 border border-teal-500/40 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-teal-900 text-teal-200 border border-teal-500/50 uppercase">
                          PANEL
                        </span>
                        <strong className="text-white font-bold text-xs truncate block">{p.name}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {p.code} • {p.department}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-teal-400">{formatCurrency(p.offerPrice || p.mrp)}</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePanel(p.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/50"
                        title="Remove panel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {/* Selected Individual Tests */}
                {selectedTests.map(t => (
                  <div key={t.id} className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-slate-800 text-slate-300 border border-slate-600 uppercase">
                          TEST
                        </span>
                        <strong className="text-white font-bold text-xs truncate block">{t.name}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {t.code} • {t.department}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-teal-400">{formatCurrency(t.mrp)}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleTest(t.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/50"
                        title="Remove test"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              placeholder={
                catalogMode === 'individual'
                  ? 'Search individual tests by name, code, or department...'
                  : 'Search panels & packages (Lipid Profile, LFT, KFT, CBC, Thyroid)...'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Catalog Picker: Individual Tests vs Panels */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900">
            {catalogMode === 'individual' ? (
              filteredTests.map((t) => {
                const isSelected = selectedTestIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleTest(t.id)}
                    className={`w-full p-2.5 text-left transition flex items-center justify-between text-xs ${
                      isSelected ? 'bg-teal-950/60 border-l-4 border-teal-400' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-slate-800 text-slate-300 border border-slate-600 uppercase">
                          TEST
                        </span>
                        <strong className={isSelected ? 'text-teal-300 font-bold' : 'text-white font-bold'}>
                          {t.name}
                        </strong>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-600 text-white font-bold">
                            ADDED ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {t.code} • {t.department} • Specimen: {t.specimen}
                      </div>
                    </div>
                    <span className="font-bold text-teal-400 font-mono text-sm">
                      {formatCurrency(t.mrp)}
                    </span>
                  </button>
                );
              })
            ) : (
              filteredPanels.map((p) => {
                const isSelected = selectedPanelIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleTogglePanel(p.id)}
                    className={`w-full p-2.5 text-left transition flex items-center justify-between text-xs ${
                      isSelected ? 'bg-teal-950/60 border-l-4 border-teal-400' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-teal-900 text-teal-200 border border-teal-500/50 uppercase">
                          PANEL
                        </span>
                        <strong className={isSelected ? 'text-teal-300 font-bold' : 'text-white font-bold'}>
                          {p.name}
                        </strong>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-600 text-white font-bold">
                            ADDED ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {p.code} • {p.department} • {p.description || 'Predefined Multi-Test Profile'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-teal-400 font-mono text-sm block">
                        {formatCurrency(p.offerPrice || p.mrp)}
                      </span>
                      {p.offerPrice && p.offerPrice < p.mrp && (
                        <span className="text-[10px] text-slate-500 line-through font-mono">
                          {formatCurrency(p.mrp)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Step 3: Priority & Prescribing Doctor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Clinical Order Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            >
              <option value="routine">Routine (Standard Turnaround)</option>
              <option value="urgent">Urgent (Priority Processing)</option>
              <option value="stat">STAT / Emergency (Immediate)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Prescribing Doctor / Referral
            </label>
            <input
              type="text"
              value={prescribedByDoctor}
              onChange={(e) => setPrescribedByDoctor(e.target.value)}
              placeholder="e.g. Dr. Kaushik Chatterjee, MD or Walk-in"
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Clinical Notes / Indications
            </label>
            <input
              type="text"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Persistent fever, pre-operative screening, routine checkup..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            />
          </div>
        </div>

        {/* Step 4: Pricing & Payment Summary */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Investigation Standard MRP:</span>
            <span className="font-mono text-white font-bold">{formatCurrency(totalMrp)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>Cardholder Discount ({discountPct}%):</span>
              <span className="font-mono font-bold">- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Net Bill Payable:</span>
            <span className="text-lg font-black text-teal-400 font-mono">{formatCurrency(netPayable)}</span>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Payment Collection Method:</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            >
              <option value="cash">Cash Counter</option>
              <option value="upi">Instant UPI / QR</option>
              <option value="wallet">Cashless Patient Wallet</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold shadow-lg"
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Create Order & Print Bill ({formatCurrency(netPayable)})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
