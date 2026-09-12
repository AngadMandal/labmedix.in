import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { StorageService } from '../../services/storage';
import {
  NursePatientTask,
  MedicationAdminRecord,
  IntakeOutputRecord,
  ShiftHandoverNote,
  IpdAdmission
} from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  HeartPulse,
  Pill,
  Droplets,
  ClipboardList,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  Activity,
  BedDouble,
  ShieldCheck,
  Send
} from 'lucide-react';

export const NursingStationPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'mar' | 'tasks' | 'io' | 'handovers'>('mar');
  const [admissions, setAdmissions] = useState<IpdAdmission[]>(() => HospitalService.getAdmissions());
  const [tasks, setTasks] = useState<NursePatientTask[]>(() => HospitalService.getNurseTasks());
  const [marRecords, setMarRecords] = useState<MedicationAdminRecord[]>(() => HospitalService.getMarRecords());
  const [ioRecords, setIoRecords] = useState<IntakeOutputRecord[]>(() => HospitalService.getIntakeOutputRecords());
  const [handovers, setHandovers] = useState<ShiftHandoverNote[]>(() => HospitalService.getHandovers());

  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('all');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMarModalOpen, setIsMarModalOpen] = useState(false);
  const [isIoModalOpen, setIsIoModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // New Task State
  const [taskAdmissionId, setTaskAdmissionId] = useState('');
  const [taskType, setTaskType] = useState<NursePatientTask['taskType']>('vitals');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('14:00');

  // New MAR State
  const [marAdmissionId, setMarAdmissionId] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState('IV Infusion');
  const [scheduledTime, setScheduledTime] = useState('14:00');

  // New I/O State
  const [ioAdmissionId, setIoAdmissionId] = useState('');
  const [ioShift, setIoShift] = useState<'morning' | 'evening' | 'night'>('morning');
  const [intakeOral, setIntakeOral] = useState<number>(400);
  const [intakeIv, setIntakeIv] = useState<number>(1000);
  const [outputUrine, setOutputUrine] = useState<number>(850);
  const [outputDrains, setOutputDrains] = useState<number>(50);
  const [outputVomitus, setOutputVomitus] = useState<number>(0);

  // Handover State
  const [handoverWard, setHandoverWard] = useState('ICU / Critical Care Wing');
  const [handoverShift, setHandoverShift] = useState('Day to Evening Handover');
  const [outgoingNurse, setOutgoingNurse] = useState(currentUser?.fullName || 'Staff Nurse S. Banerjee');
  const [incomingNurse, setIncomingNurse] = useState('Staff Nurse P. Sengupta');
  const [handoverSummary, setHandoverSummary] = useState('');
  const [criticalCount, setCriticalCount] = useState<number>(2);

  const refreshData = () => {
    setAdmissions(HospitalService.getAdmissions());
    setTasks(HospitalService.getNurseTasks());
    setMarRecords(HospitalService.getMarRecords());
    setIoRecords(HospitalService.getIntakeOutputRecords());
    setHandovers(HospitalService.getHandovers());
  };

  useEffect(() => {
    const handleSync = () => refreshData();
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const activeInpatients = useMemo(() => {
    return admissions.filter(a => a.status === 'admitted' || a.status === 'transferred');
  }, [admissions]);

  // Handle Medication Admin
  const handleAdministerMar = (marId: string) => {
    const nurse = currentUser?.fullName || 'Sister In-Charge';
    try {
      HospitalService.administerMedication(marId, nurse, 'Given as per protocol');
      showToast('success', 'Medication Given', `Administered by ${nurse}`);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const adm = activeInpatients.find(a => a.id === taskAdmissionId);
    if (!adm) {
      showToast('error', 'Select Inpatient', 'Please choose an active admitted patient.');
      return;
    }

    try {
      HospitalService.createNurseTask({
        admissionId: adm.id,
        patientName: adm.patientName,
        bedNumber: adm.bedNumber,
        nurseName: currentUser?.fullName || 'Staff Nurse',
        taskType,
        description: taskDesc,
        dueTime: taskDueTime
      });

      showToast('success', 'Care Task Scheduled', `Task created for Bed ${adm.bedNumber}`);
      setIsTaskModalOpen(false);
      setTaskDesc('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleCreateMar = (e: React.FormEvent) => {
    e.preventDefault();
    const adm = activeInpatients.find(a => a.id === marAdmissionId);
    if (!adm) return;

    try {
      HospitalService.addMarRecord({
        admissionId: adm.id,
        patientName: adm.patientName,
        bedNumber: adm.bedNumber,
        medicineName,
        dosage,
        route,
        scheduledTime
      });

      showToast('success', 'MAR Added', `Scheduled ${medicineName} for Bed ${adm.bedNumber}`);
      setIsMarModalOpen(false);
      setMedicineName('');
      setDosage('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleRecordIo = (e: React.FormEvent) => {
    e.preventDefault();
    const adm = activeInpatients.find(a => a.id === ioAdmissionId);
    if (!adm) return;

    try {
      HospitalService.recordIntakeOutput({
        admissionId: adm.id,
        patientName: adm.patientName,
        date: new Date().toISOString().slice(0, 10),
        shift: ioShift,
        intakeOralMl: Number(intakeOral),
        intakeIvMl: Number(intakeIv),
        outputUrineMl: Number(outputUrine),
        outputDrainsMl: Number(outputDrains),
        outputVomitusMl: Number(outputVomitus),
        recordedByNurse: currentUser?.fullName || 'Staff Nurse'
      });

      showToast('success', 'I/O Balance Recorded', `Fluid chart logged for ${adm.patientName}`);
      setIsIoModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleCreateHandover = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      HospitalService.createHandover({
        wardName: handoverWard,
        shift: handoverShift,
        date: new Date().toISOString().slice(0, 10),
        outgoingNurse,
        incomingNurse,
        summary: handoverSummary,
        criticalPatientsCount: Number(criticalCount),
        pendingTasksCount: tasks.filter(t => !t.isCompleted).length
      });

      showToast('success', 'Shift Handover Logged', 'Signed off and archived in central nursing ledger');
      setIsHandoverModalOpen(false);
      setHandoverSummary('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 p-6 sm:p-8 border border-teal-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <HeartPulse className="w-3.5 h-3.5 text-teal-400" />
              Module 10 • Clinical Nursing Station & MAR
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-teal-400" />
              Nursing Station & Care Management
            </h1>
            <p className="text-teal-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              Real-time patient vitals charting, electronic Medication Administration Record (MAR), intake/output fluid balance ledger, and automated shift handover documentation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Nursing Board"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setTaskAdmissionId(activeInpatients[0]?.id || '');
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Care Task
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-2 rounded-2xl">
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('mar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'mar' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Pill className="w-4 h-4" />
            Medication Record (MAR)
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'tasks' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Care Tasks ({tasks.filter(t => !t.isCompleted).length})
          </button>
          <button
            onClick={() => setActiveTab('io')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'io' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Droplets className="w-4 h-4" />
            Intake / Output (I/O)
          </button>
          <button
            onClick={() => setActiveTab('handovers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'handovers' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Shift Handovers
          </button>
        </div>

        {/* Action button corresponding to active tab */}
        {activeTab === 'mar' && (
          <button
            onClick={() => {
              setMarAdmissionId(activeInpatients[0]?.id || '');
              setIsMarModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-300 font-bold text-xs border border-teal-800/40"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Medication
          </button>
        )}

        {activeTab === 'io' && (
          <button
            onClick={() => {
              setIoAdmissionId(activeInpatients[0]?.id || '');
              setIsIoModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 font-bold text-xs border border-cyan-800/40"
          >
            <Plus className="w-3.5 h-3.5" /> Record Fluid Balance
          </button>
        )}

        {activeTab === 'handovers' && (
          <button
            onClick={() => setIsHandoverModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 font-bold text-xs border border-indigo-800/40"
          >
            <Plus className="w-3.5 h-3.5" /> Sign-Off Shift Handover
          </button>
        )}
      </div>

      {/* TAB 1: MAR (Medication Administration Record) */}
      {activeTab === 'mar' && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-white">Active Medication Administration Schedule</h2>
              <p className="text-slate-400 text-xs">Administer prescribed IV, IM and oral medications with digital nurse sign-off</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Bed & Inpatient</th>
                  <th className="px-4 py-3.5">Prescribed Medicine & Dosage</th>
                  <th className="px-4 py-3.5">Route</th>
                  <th className="px-4 py-3.5">Scheduled Time</th>
                  <th className="px-4 py-3.5">Administered Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {marRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <Pill className="w-10 h-10 mx-auto mb-2 opacity-30 text-teal-400" />
                      No scheduled medications on the MAR clock. Click "Schedule Medication" to add.
                    </td>
                  </tr>
                ) : (
                  marRecords.map(m => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 text-[10px]">
                          Bed {m.bedNumber}
                        </span>
                        <div className="font-bold text-white mt-1 text-sm">{m.patientName}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{m.medicineName}</div>
                        <div className="text-[11px] text-slate-400 font-medium">Dose: {m.dosage}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {m.route}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-cyan-300 text-sm flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {m.scheduledTime}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {m.status === 'given' ? (
                          <div className="text-emerald-400 text-[11px]">
                            <span className="font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> GIVEN
                            </span>
                            <span className="text-[10px] text-slate-400 block">by {m.administeredByNurse}</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                            {m.status}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {m.status === 'scheduled' && (
                          <button
                            onClick={() => handleAdministerMar(m.id)}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] shadow transition"
                          >
                            Sign-Off Dose
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Care Tasks */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.length === 0 ? (
            <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30 text-teal-400" />
              No pending nursing tasks. Click "New Care Task" to schedule vitals, dressing or IV fluid changes.
            </div>
          ) : (
            tasks.map(tsk => (
              <div
                key={tsk.id}
                className={`p-4 rounded-2xl border transition ${
                  tsk.isCompleted
                    ? 'bg-slate-950/60 border-slate-800 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-teal-500/40 shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                    Bed {tsk.bedNumber}
                  </span>
                  <span className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Due: {tsk.dueTime}
                  </span>
                </div>

                <div className="font-bold text-white text-sm mt-2">{tsk.patientName}</div>
                <div className="text-[11px] text-teal-300 font-bold uppercase mt-1">
                  Type: {tsk.taskType.replace(/_/g, ' ')}
                </div>
                <p className="text-slate-300 text-xs mt-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  {tsk.description}
                </p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400">Assigned: {tsk.nurseName}</span>
                  <button
                    onClick={() => {
                      HospitalService.toggleNurseTask(tsk.id);
                      refreshData();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      tsk.isCompleted
                        ? 'bg-emerald-600/30 text-emerald-300'
                        : 'bg-teal-600 hover:bg-teal-500 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {tsk.isCompleted ? 'Completed' : 'Mark Done'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Intake / Output (I/O) */}
      {activeTab === 'io' && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-black text-white">Inpatient 24-Hour Fluid Balance Chart</h2>
            <p className="text-slate-400 text-xs">Monitoring oral & IV intake against urine, drains and vomitus</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Date & Shift</th>
                  <th className="px-4 py-3.5">Inpatient</th>
                  <th className="px-4 py-3.5">Total Intake (mL)</th>
                  <th className="px-4 py-3.5">Total Output (mL)</th>
                  <th className="px-4 py-3.5">Net Fluid Balance</th>
                  <th className="px-4 py-3.5">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ioRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <Droplets className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
                      No fluid records charted today. Click "Record Fluid Balance" above.
                    </td>
                  </tr>
                ) : (
                  ioRecords.map(r => {
                    const isPositive = r.balanceNetMl >= 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-white">{formatDate(r.date)}</span>
                          <span className="block text-[10px] text-cyan-400 uppercase font-bold">{r.shift} shift</span>
                        </td>

                        <td className="px-4 py-3.5 font-bold text-white">
                          {r.patientName || 'Admitted Inpatient'}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-cyan-300">
                            {r.intakeOralMl + r.intakeIvMl} mL
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            (Oral: {r.intakeOralMl} • IV: {r.intakeIvMl})
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-amber-300">
                            {r.outputUrineMl + r.outputDrainsMl + r.outputVomitusMl} mL
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            (Urine: {r.outputUrineMl} • Drain: {r.outputDrainsMl})
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`font-mono font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? `+${r.balanceNetMl}` : r.balanceNetMl} mL
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-300">
                          {r.recordedByNurse}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Shift Handovers */}
      {activeTab === 'handovers' && (
        <div className="space-y-4">
          {handovers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
              No shift handovers logged yet. Click "Sign-Off Shift Handover" to record notes.
            </div>
          ) : (
            handovers.map(h => (
              <div key={h.id} className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-bold text-white text-base">{h.wardName}</span>
                    <span className="text-indigo-300 text-xs ml-2 font-semibold">• {h.shift} ({formatDate(h.date)})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                      🚨 {h.criticalPatientsCount} Critical Inpatients
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                      ⏳ {h.pendingTasksCount} Pending Tasks
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs mt-3 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  {h.summary}
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-850">
                  <span>Outgoing Nurse: <strong className="text-white">{h.outgoingNurse}</strong></span>
                  <span>Handed Over To: <strong className="text-cyan-400">{h.incomingNurse}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: Create Care Task */}
      {isTaskModalOpen && (
        <Modal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          title="Schedule Nursing Care Task"
          maxWidth="md"
        >
          <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Select Inpatient *</label>
              <select
                value={taskAdmissionId}
                onChange={e => setTaskAdmissionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {activeInpatients.map(a => (
                  <option key={a.id} value={a.id}>
                    Bed {a.bedNumber} - {a.patientName} ({a.wardName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Task Type</label>
                <select
                  value={taskType}
                  onChange={e => setTaskType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="vitals">Vitals Check</option>
                  <option value="medication">Medication Due</option>
                  <option value="iv_fluid">IV Fluid Change</option>
                  <option value="dressing">Wound Dressing</option>
                  <option value="catheter_care">Catheter Care</option>
                  <option value="diet">Special Diet Feed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Due Time</label>
                <input
                  type="time"
                  value={taskDueTime}
                  onChange={e => setTaskDueTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Task Instructions *</label>
              <textarea
                required
                rows={3}
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                placeholder="e.g. Check SpO2 and BP every 2 hours, notify doctor if systolic BP < 90"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30"
              >
                Schedule Task
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Schedule Medication (MAR) */}
      {isMarModalOpen && (
        <Modal
          isOpen={isMarModalOpen}
          onClose={() => setIsMarModalOpen(false)}
          title="Schedule Prescribed Medication on MAR"
          maxWidth="md"
        >
          <form onSubmit={handleCreateMar} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Inpatient *</label>
              <select
                value={marAdmissionId}
                onChange={e => setMarAdmissionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {activeInpatients.map(a => (
                  <option key={a.id} value={a.id}>
                    Bed {a.bedNumber} - {a.patientName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Medicine Name & Formulation *</label>
              <input
                type="text"
                required
                value={medicineName}
                onChange={e => setMedicineName(e.target.value)}
                placeholder="e.g. Inj. Meropenem 1g"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Dose</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={e => setDosage(e.target.value)}
                  placeholder="e.g. 1g in 100ml NS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Route</label>
                <select
                  value={route}
                  onChange={e => setRoute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="IV Infusion">IV Infusion</option>
                  <option value="IV Push">IV Push</option>
                  <option value="IM">Intramuscular (IM)</option>
                  <option value="SC">Subcutaneous (SC)</option>
                  <option value="Oral">Oral</option>
                  <option value="Nebulization">Nebulization</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Scheduled Administration Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMarModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30"
              >
                Save to MAR Schedule
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Fluid Balance (I/O) */}
      {isIoModalOpen && (
        <Modal
          isOpen={isIoModalOpen}
          onClose={() => setIsIoModalOpen(false)}
          title="Log Intake & Output (I/O) Chart"
          maxWidth="lg"
        >
          <form onSubmit={handleRecordIo} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Inpatient *</label>
                <select
                  value={ioAdmissionId}
                  onChange={e => setIoAdmissionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {activeInpatients.map(a => (
                    <option key={a.id} value={a.id}>
                      Bed {a.bedNumber} - {a.patientName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Nursing Shift</label>
                <select
                  value={ioShift}
                  onChange={e => setIoShift(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="morning">Morning (07:00 - 15:00)</option>
                  <option value="evening">Evening (15:00 - 23:00)</option>
                  <option value="night">Night (23:00 - 07:00)</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 space-y-2">
              <span className="text-cyan-300 font-bold block">Fluid Intake (mL)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px]">Oral Intake</span>
                  <input
                    type="number"
                    value={intakeOral}
                    onChange={e => setIntakeOral(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">IV Fluids</span>
                  <input
                    type="number"
                    value={intakeIv}
                    onChange={e => setIntakeIv(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
              <span className="text-amber-300 font-bold block">Fluid Output (mL)</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px]">Urine Output</span>
                  <input
                    type="number"
                    value={outputUrine}
                    onChange={e => setOutputUrine(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Drains / Tubes</span>
                  <input
                    type="number"
                    value={outputDrains}
                    onChange={e => setOutputDrains(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Vomitus / Other</span>
                  <input
                    type="number"
                    value={outputVomitus}
                    onChange={e => setOutputVomitus(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsIoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30"
              >
                Record Fluid Balance
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Shift Handover */}
      {isHandoverModalOpen && (
        <Modal
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          title="Sign-Off Shift Handover Document"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateHandover} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Hospital Ward</label>
                <input
                  type="text"
                  value={handoverWard}
                  onChange={e => setHandoverWard(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Shift Transition</label>
                <input
                  type="text"
                  value={handoverShift}
                  onChange={e => setHandoverShift(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Outgoing Nurse</label>
                <input
                  type="text"
                  value={outgoingNurse}
                  onChange={e => setOutgoingNurse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Incoming Nurse</label>
                <input
                  type="text"
                  value={incomingNurse}
                  onChange={e => setIncomingNurse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Ward Clinical Summary & Handover Notes *</label>
              <textarea
                required
                rows={4}
                value={handoverSummary}
                onChange={e => setHandoverSummary(e.target.value)}
                placeholder="Summary of all bed occupants, pending blood transfusions, patients on high-flow oxygen, critical alerts"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Number of Critical / High-Dependency Inpatients</label>
              <input
                type="number"
                value={criticalCount}
                onChange={e => setCriticalCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
              >
                Complete Shift Handover
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
