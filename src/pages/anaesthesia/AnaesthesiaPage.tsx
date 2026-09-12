import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { AnaesthesiaRecord, AsaPacGrade, AnaesthesiaType, SurgeryBooking } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Activity,
  HeartPulse,
  Clock,
  User,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Stethoscope,
  Scissors
} from 'lucide-react';

export const AnaesthesiaPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [records, setRecords] = useState<AnaesthesiaRecord[]>(() => HospitalService.getAnaesthesiaRecords());
  const [surgeries, setSurgeries] = useState<SurgeryBooking[]>(() => HospitalService.getSurgeries());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isPacModalOpen, setIsPacModalOpen] = useState(false);
  const [isAldreteModalOpen, setIsAldreteModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AnaesthesiaRecord | null>(null);

  // PAC Form State
  const [selectedSurgeryId, setSelectedSurgeryId] = useState('');
  const [anaesthetistName, setAnaesthetistName] = useState(currentUser?.fullName || 'Dr. Ananya Sen (MD Anaesthesia)');
  const [asaGrade, setAsaGrade] = useState<AsaPacGrade>('ASA_I');
  const [mallampatiScore, setMallampatiScore] = useState<1 | 2 | 3 | 4>(1);
  const [airwayAssessment, setAirwayAssessment] = useState('Adequate mouth opening, normal neck extension, thyromental distance > 6cm');
  const [cardiacHistory, setCardiacHistory] = useState('No prior ischemic heart disease, normal ECG');
  const [respiratoryHistory, setRespiratoryHistory] = useState('No history of asthma or wheezing, chest bilateral clear');
  const [allergies, setAllergies] = useState('No known drug allergies (NKDA)');
  const [proposedAnaesthesiaType, setProposedAnaesthesiaType] = useState<AnaesthesiaType>('general');
  const [npoHours, setNpoHours] = useState<number>(8);
  const [pacStatus, setPacStatus] = useState<'cleared' | 'cleared_high_risk' | 'deferred'>('cleared');

  // Aldrete Score State
  const [aldreteActivity, setAldreteActivity] = useState<number>(2); // 0-2
  const [aldreteRespiration, setAldreteRespiration] = useState<number>(2); // 0-2
  const [aldreteCirculation, setAldreteCirculation] = useState<number>(2); // 0-2
  const [aldreteConsciousness, setAldreteConsciousness] = useState<number>(2); // 0-2
  const [aldreteO2Sat, setAldreteO2Sat] = useState<number>(2); // 0-2
  const [recoveryNotes, setRecoveryNotes] = useState('Patient awake, responding to commands, breathing comfortably on room air');

  const refreshData = () => {
    setRecords(HospitalService.getAnaesthesiaRecords());
    setSurgeries(HospitalService.getSurgeries());
  };

  useEffect(() => {
    const handleSync = () => refreshData();
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const totalAldrete = aldreteActivity + aldreteRespiration + aldreteCirculation + aldreteConsciousness + aldreteO2Sat;

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch =
        r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.anaesthetistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.asaGrade.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || r.pacStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const handleSavePac = (e: React.FormEvent) => {
    e.preventDefault();
    const surgery = surgeries.find(s => s.id === selectedSurgeryId);
    if (!surgery) {
      showToast('error', 'Select Surgery', 'Please select a scheduled surgery booking.');
      return;
    }

    try {
      const record = HospitalService.saveAnaesthesiaRecord({
        surgeryId: surgery.id,
        patientId: surgery.patientId,
        patientName: surgery.patientName,
        anaesthetistName,
        pacEvaluationDate: new Date().toISOString(),
        asaGrade,
        mallampatiScore,
        airwayAssessment,
        cardiacHistory,
        respiratoryHistory,
        allergies,
        proposedAnaesthesiaType,
        npoStatusHours: Number(npoHours),
        pacStatus
      });

      showToast('success', 'PAC Evaluation Saved', `${record.patientName} classified as ${record.asaGrade} (${record.pacStatus.toUpperCase()})`);
      setIsPacModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'PAC Error', err.message);
    }
  };

  const handleSaveAldrete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      HospitalService.updateAldreteScore(selectedRecord.id, totalAldrete, recoveryNotes);
      showToast('success', 'Aldrete Score Updated', `Score: ${totalAldrete}/10 (Discharge Ready: ${totalAldrete >= 9 ? 'YES' : 'NO'})`);
      setIsAldreteModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Scoring Error', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 p-6 sm:p-8 border border-teal-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
              Module 12 • Pre-Anaesthetic Checkup (PAC) & PACU Recovery
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-teal-400" />
              Anaesthesia & PAC Evaluation
            </h1>
            <p className="text-teal-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              Comprehensive Pre-Anaesthetic Checkup (PAC), ASA physical status grading (I - VI), Mallampati airway classification, intra-operative vital logs, and Aldrete post-anaesthesia recovery scoring.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh PAC List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedSurgeryId(surgeries[0]?.id || '');
                setIsPacModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Conduct PAC Evaluation
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, anaesthetist, ASA..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Clearance Statuses</option>
          <option value="cleared">🟢 Cleared (Fit for Surgery)</option>
          <option value="cleared_high_risk">🟡 Cleared with High Risk</option>
          <option value="deferred">🔴 Deferred (Optimization Needed)</option>
        </select>
      </div>

      {/* PAC Records Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Patient & Evaluation Date</th>
                <th className="px-4 py-3.5">ASA Grade & Airway</th>
                <th className="px-4 py-3.5">Proposed Anaesthesia</th>
                <th className="px-4 py-3.5">PAC Clearance</th>
                <th className="px-4 py-3.5">Aldrete Score</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-30 text-teal-400" />
                    No pre-anaesthetic checkup (PAC) records found. Click "Conduct PAC Evaluation" above.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-sm">{rec.patientName}</div>
                      <div className="text-[10px] text-slate-400">
                        PAC Date: {formatDate(rec.pacEvaluationDate)}
                      </div>
                      <div className="text-[10px] text-teal-300 font-semibold mt-0.5">
                        By {rec.anaesthetistName}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 text-[10px]">
                        {rec.asaGrade.replace(/_/g, ' ')}
                      </span>
                      <div className="text-[11px] text-slate-300 mt-1">
                        Mallampati Class: <strong>{rec.mallampatiScore}</strong>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-white capitalize">
                        {rec.proposedAnaesthesiaType.replace(/_/g, ' ')}
                      </span>
                      <div className="text-[10px] text-slate-400">NPO: {rec.npoStatusHours} hrs</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        rec.pacStatus === 'cleared'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : rec.pacStatus === 'cleared_high_risk'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {rec.pacStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {rec.aldreteRecoveryScore !== undefined ? (
                        <div className="font-bold">
                          <span className={`text-sm ${rec.aldreteRecoveryScore >= 9 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {rec.aldreteRecoveryScore}/10
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {rec.aldreteRecoveryScore >= 9 ? 'PACU Cleared' : 'In Observation'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Pending Surgery</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedRecord(rec);
                          setIsAldreteModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] transition"
                      >
                        Aldrete Score
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Conduct PAC Form */}
      {isPacModalOpen && (
        <Modal
          isOpen={isPacModalOpen}
          onClose={() => setIsPacModalOpen(false)}
          title="Pre-Anaesthetic Checkup (PAC) Form"
          maxWidth="2xl"
        >
          <form onSubmit={handleSavePac} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Select Scheduled Surgery *</label>
              <select
                value={selectedSurgeryId}
                onChange={e => setSelectedSurgeryId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
              >
                {surgeries.length === 0 ? (
                  <option value="">No scheduled surgeries available</option>
                ) : (
                  surgeries.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.patientName} - {s.procedureName} ({s.otNumber} on {formatDate(s.scheduledDate)})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">ASA Physical Status Classification *</label>
                <select
                  value={asaGrade}
                  onChange={e => setAsaGrade(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="ASA_I">ASA I - Normal healthy patient</option>
                  <option value="ASA_II">ASA II - Patient with mild systemic disease</option>
                  <option value="ASA_III">ASA III - Patient with severe systemic disease</option>
                  <option value="ASA_IV">ASA IV - Patient with severe systemic disease (threat to life)</option>
                  <option value="ASA_V">ASA V - Moribund patient not expected to survive</option>
                  <option value="ASA_VI">ASA VI - Brain-dead organ donor</option>
                  <option value="ASA_E">ASA E - Emergency operation modifier</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Mallampati Airway Score</label>
                <select
                  value={mallampatiScore}
                  onChange={e => setMallampatiScore(Number(e.target.value) as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="1">Class 1: Soft palate, uvula, fauces, pillars visible</option>
                  <option value="2">Class 2: Soft palate, major part of uvula visible</option>
                  <option value="3">Class 3: Soft palate, base of uvula visible</option>
                  <option value="4">Class 4: Only hard palate visible (Difficult Airway)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Proposed Anaesthesia Technique</label>
                <select
                  value={proposedAnaesthesiaType}
                  onChange={e => setProposedAnaesthesiaType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="general">General Anaesthesia (ET Tube / LMA)</option>
                  <option value="spinal">Subarachnoid / Spinal Block</option>
                  <option value="epidural">Epidural Anaesthesia</option>
                  <option value="regional_block">Peripheral Nerve Block</option>
                  <option value="sedation_mac">Monitored Anaesthesia Care (MAC)</option>
                  <option value="local">Local Anaesthesia</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Minimum NPO Status (Hours)</label>
                <input
                  type="number"
                  value={npoHours}
                  onChange={e => setNpoHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Airway & Dentition Assessment</label>
              <input
                type="text"
                value={airwayAssessment}
                onChange={e => setAirwayAssessment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Cardiovascular History</label>
                <input
                  type="text"
                  value={cardiacHistory}
                  onChange={e => setCardiacHistory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Drug Allergies</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">PAC Clearance Decision *</label>
              <select
                value={pacStatus}
                onChange={e => setPacStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-black"
              >
                <option value="cleared">🟢 Cleared - Fit for Anaesthesia & Surgery</option>
                <option value="cleared_high_risk">🟡 Cleared with High Risk (Informed Consent Required)</option>
                <option value="deferred">🔴 Deferred - Further Cardiac/Pulmonary Optimization Needed</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPacModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedSurgeryId}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-teal-600/30"
              >
                Save PAC Clearance Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Aldrete Recovery Score */}
      {isAldreteModalOpen && selectedRecord && (
        <Modal
          isOpen={isAldreteModalOpen}
          onClose={() => setIsAldreteModalOpen(false)}
          title={`PACU Aldrete Recovery Score: ${selectedRecord.patientName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveAldrete} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="font-bold text-slate-300">Total Aldrete Score:</span>
              <span className={`text-xl font-black ${totalAldrete >= 9 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalAldrete} / 10
              </span>
            </div>

            <div className="space-y-3 text-slate-300">
              <div>
                <label className="block font-bold">1. Physical Activity</label>
                <select
                  value={aldreteActivity}
                  onChange={e => setAldreteActivity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white mt-0.5"
                >
                  <option value="2">2 - Moves 4 extremities voluntarily or on command</option>
                  <option value="1">1 - Moves 2 extremities</option>
                  <option value="0">0 - Unable to move extremities</option>
                </select>
              </div>

              <div>
                <label className="block font-bold">2. Respiration</label>
                <select
                  value={aldreteRespiration}
                  onChange={e => setAldreteRespiration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white mt-0.5"
                >
                  <option value="2">2 - Breathes deeply and coughs freely</option>
                  <option value="1">1 - Dyspneic, shallow or limited breathing</option>
                  <option value="0">0 - Apneic</option>
                </select>
              </div>

              <div>
                <label className="block font-bold">3. Circulation (Blood Pressure)</label>
                <select
                  value={aldreteCirculation}
                  onChange={e => setAldreteCirculation(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white mt-0.5"
                >
                  <option value="2">2 - BP within ± 20 mmHg of pre-op level</option>
                  <option value="1">1 - BP within ± 20-50 mmHg of pre-op level</option>
                  <option value="0">0 - BP differs by ± 50 mmHg</option>
                </select>
              </div>

              <div>
                <label className="block font-bold">4. Consciousness</label>
                <select
                  value={aldreteConsciousness}
                  onChange={e => setAldreteConsciousness(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white mt-0.5"
                >
                  <option value="2">2 - Fully awake</option>
                  <option value="1">1 - Arousable on calling</option>
                  <option value="0">0 - Not responding</option>
                </select>
              </div>

              <div>
                <label className="block font-bold">5. Oxygen Saturation (SpO₂)</label>
                <select
                  value={aldreteO2Sat}
                  onChange={e => setAldreteO2Sat(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white mt-0.5"
                >
                  <option value="2">2 - SpO₂ &gt; 92% on room air</option>
                  <option value="1">1 - Needs supplemental oxygen to maintain SpO₂ &gt; 90%</option>
                  <option value="0">0 - SpO₂ &lt; 90% even with oxygen</option>
                </select>
              </div>

              <div>
                <label className="block font-bold">Recovery Notes</label>
                <input
                  type="text"
                  value={recoveryNotes}
                  onChange={e => setRecoveryNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white mt-0.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAldreteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30"
              >
                Save Score & Update PACU Status
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
