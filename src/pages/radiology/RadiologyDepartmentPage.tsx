import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { StorageService } from '../../services/storage';
import { RadiologyInvestigation, RadiologyModality, RadiologyStatus, Patient } from '../../types';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Scan,
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  FileText,
  AlertCircle,
  FileCheck,
  Stethoscope,
  Activity,
  Printer
} from 'lucide-react';

export const RadiologyDepartmentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<RadiologyInvestigation[]>(() => HospitalService.getRadiologyOrders());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());

  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyInvestigation | null>(null);

  // New Order State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [modality, setModality] = useState<RadiologyModality>('x_ray');
  const [studyName, setStudyName] = useState('Chest X-Ray PA View');
  const [bodyPart, setBodyPart] = useState('Chest / Thorax');
  const [clinicalIndication, setClinicalIndication] = useState('Fever, cough with expectoration, rule out consolidation');
  const [referringDoctor, setReferringDoctor] = useState('Dr. Debabrata Roy');
  const [cost, setCost] = useState<number>(650);

  // Report State
  const [radiologistName, setRadiologistName] = useState('Dr. K. N. Ghosh (MD Radiodiagnosis)');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const refreshData = () => {
    setOrders(HospitalService.getRadiologyOrders());
  };

  useEffect(() => {
    const handleSync = () => refreshData();
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch =
        o.accessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.studyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.bodyPart.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesModality = modalityFilter === 'all' || o.modality === modalityFilter;
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesModality && matchesStatus;
    });
  }, [orders, searchQuery, modalityFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const ordered = orders.filter(o => o.status === 'ordered').length;
    const scanned = orders.filter(o => o.status === 'technician_completed').length;
    const verified = orders.filter(o => o.status === 'verified').length;
    return { total, ordered, scanned, verified };
  }, [orders]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !studyName.trim()) {
      showToast('error', 'Incomplete Form', 'Please select a patient and study name.');
      return;
    }

    try {
      const newOrder = HospitalService.createRadiologyOrder({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        uhid: selectedPatient.id,
        referringDoctor,
        modality,
        studyName,
        bodyPart,
        clinicalIndication,
        cost: Number(cost)
      });

      showToast('success', 'Imaging Order Created', `Accession ${newOrder.accessionNumber} scheduled`);
      setIsOrderModalOpen(false);
      setSelectedPatient(null);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Order Error', err.message);
    }
  };

  const handleCompleteScan = (orderId: string) => {
    try {
      HospitalService.completeRadiologyScan(orderId, currentUser?.fullName || 'Technician R. Sharma');
      showToast('success', 'Scan Completed', 'Images acquired, ready for radiologist reporting.');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Scan Error', err.message);
    }
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !findings.trim() || !impression.trim()) {
      showToast('error', 'Required Fields', 'Please complete findings and impression.');
      return;
    }

    try {
      HospitalService.submitRadiologyReport(selectedOrder.id, {
        radiologistName,
        findings,
        impression,
        recommendations
      });

      showToast('success', 'Diagnostic Report Verified', `Report verified for ${selectedOrder.accessionNumber}`);
      setIsReportModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Report Error', err.message);
    }
  };

  const handleBillOrder = (order: RadiologyInvestigation) => {
    try {
      const bill = HospitalService.billRadiologyOrder(order.id, currentUser);
      showToast('success', 'Radiology Bill Generated', `Bill ${bill.billNumber} created for ₹${bill.netPayable}`);
      refreshData();
      navigate('/print-center');
    } catch (err: any) {
      showToast('error', 'Billing Error', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-950 via-slate-900 to-blue-950 p-6 sm:p-8 border border-sky-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Scan className="w-3.5 h-3.5 text-sky-400" />
              Module 15 • Diagnostic Imaging & Modality Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Scan className="w-8 h-8 text-sky-400" />
              Radiology & Diagnostic Imaging
            </h1>
            <p className="text-sky-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              Multi-modality imaging hub: Digital X-Ray, Ultrasound, CT Scan, MRI, and DEXA. Technician acquisition queues, radiologist structured findings & impressions, and automated diagnostic billing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Worklist"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setIsOrderModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Order Imaging Study
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Imaging Orders</span>
            <Scan className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">All modalities cumulative</span>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Pending Acquisition</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.ordered}</p>
          <span className="text-[11px] text-amber-300/80">In modality waiting queue</span>
        </div>

        <div className="bg-blue-950/30 border border-blue-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Scanned / Awaiting Report</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-1">{stats.scanned}</p>
          <span className="text-[11px] text-blue-300/80">Awaiting radiologist review</span>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Verified & Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.verified}</p>
          <span className="text-[11px] text-emerald-300/80">Official signed reports</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search accession #, patient, study..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <select
            value={modalityFilter}
            onChange={e => setModalityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Modalities</option>
            <option value="x_ray">Digital X-Ray</option>
            <option value="ultrasound">Ultrasound (USG)</option>
            <option value="ct_scan">CT Scan</option>
            <option value="mri">MRI</option>
            <option value="mammography">Mammography</option>
            <option value="dexa">DEXA Scan</option>
            <option value="ecg">ECG</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="ordered">Pending Scan</option>
            <option value="technician_completed">Scan Completed</option>
            <option value="verified">Verified Report</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Accession & Date</th>
                <th className="px-4 py-3.5">Modality & Study</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Clinical Indication</th>
                <th className="px-4 py-3.5">Workflow Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Scan className="w-10 h-10 mx-auto mb-2 opacity-30 text-sky-400" />
                    No radiology investigations found. Click "Order Imaging Study" above.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-white text-xs">{order.accessionNumber}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(order.orderedAt)}</div>
                      <span className="text-[10px] text-sky-300 font-mono">Fee: ₹{order.cost}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-black uppercase text-[10px] border border-sky-500/30">
                        {order.modality.replace(/_/g, ' ')}
                      </span>
                      <div className="font-bold text-white text-sm mt-1">{order.studyName}</div>
                      <div className="text-[11px] text-slate-400">{order.bodyPart}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{order.patientName}</div>
                      {order.uhid && (
                        <div className="text-[10px] font-mono text-cyan-400">UHID: {order.uhid}</div>
                      )}
                      <div className="text-[10px] text-slate-400">Ref: {order.referringDoctor || 'Hospital OPD'}</div>
                    </td>

                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-slate-300 truncate" title={order.clinicalIndication}>
                        {order.clinicalIndication}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        order.status === 'ordered'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : order.status === 'technician_completed'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      {order.technicianName && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Tech: {order.technicianName}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === 'ordered' && (
                          <button
                            onClick={() => handleCompleteScan(order.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition"
                          >
                            Mark Scanned
                          </button>
                        )}

                        {order.status !== 'verified' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setFindings(order.radiologistFindings || '');
                              setImpression(order.impression || '');
                              setRecommendations(order.recommendations || '');
                              setIsReportModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] transition"
                          >
                            Report
                          </button>
                        )}

                        {!order.isBilled ? (
                          <button
                            onClick={() => handleBillOrder(order)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                            title="Generate Radiology Bill"
                          >
                            Bill ₹{order.cost}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Billed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Order Imaging Study */}
      {isOrderModalOpen && (
        <Modal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          title="Order Radiology / Imaging Investigation"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Search Patient *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type patient name, UHID or phone..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white"
                />
              </div>

              {patientSearch.trim().length > 1 && (
                <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-850">
                  {patients
                    .filter(p => p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) || p.id.toLowerCase().includes(patientSearch.toLowerCase()))
                    .slice(0, 4)
                    .map(p => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          handlePatientSelect(p);
                          setPatientSearch('');
                        }}
                        className="w-full text-left p-2 hover:bg-slate-850 flex items-center justify-between text-slate-300"
                      >
                        <span className="font-bold text-white">{p.fullName}</span>
                        <span className="text-[10px] text-cyan-400">{p.id}</span>
                      </button>
                    ))}
                </div>
              )}

              {selectedPatient && (
                <div className="p-2 rounded-xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-between text-white font-bold">
                  <span>Selected: {selectedPatient.fullName}</span>
                  <span className="text-cyan-400 text-[10px]">UHID: {selectedPatient.id}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Modality *</label>
                <select
                  value={modality}
                  onChange={e => {
                    const m = e.target.value as RadiologyModality;
                    setModality(m);
                    if (m === 'x_ray') { setStudyName('Chest X-Ray PA View'); setCost(650); }
                    if (m === 'ultrasound') { setStudyName('USG Whole Abdomen & Pelvis'); setCost(1400); }
                    if (m === 'ct_scan') { setStudyName('NCCT Brain 128-Slice'); setCost(4500); }
                    if (m === 'mri') { setStudyName('MRI Lumbar Spine 1.5T'); setCost(7500); }
                    if (m === 'mammography') { setStudyName('Bilateral Digital Mammography'); setCost(2200); }
                    if (m === 'dexa') { setStudyName('DEXA Bone Mineral Density'); setCost(1800); }
                    if (m === 'ecg') { setStudyName('12-Lead Electrocardiogram (ECG)'); setCost(350); }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="x_ray">Digital X-Ray</option>
                  <option value="ultrasound">Ultrasound (USG)</option>
                  <option value="ct_scan">CT Scan</option>
                  <option value="mri">MRI (Magnetic Resonance)</option>
                  <option value="mammography">Mammography</option>
                  <option value="dexa">DEXA Scan</option>
                  <option value="ecg">12-Lead ECG</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Study / Procedure Name *</label>
                <input
                  type="text"
                  required
                  value={studyName}
                  onChange={e => setStudyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Anatomical Region / Body Part</label>
                <input
                  type="text"
                  value={bodyPart}
                  onChange={e => setBodyPart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Diagnostic Charge (₹)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Clinical Indication & History</label>
              <textarea
                rows={2}
                value={clinicalIndication}
                onChange={e => setClinicalIndication(e.target.value)}
                placeholder="Symptoms, duration, relevant surgical history, suspected pathology"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedPatient}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-sky-600/30"
              >
                Schedule Imaging Study
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Radiologist Structured Findings & Report */}
      {isReportModalOpen && selectedOrder && (
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          title={`Radiologist Diagnostic Report: ${selectedOrder.accessionNumber}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveReport} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40">
              <div className="text-sky-300 font-bold text-sm">{selectedOrder.studyName}</div>
              <div className="text-slate-400 text-[11px] mt-1">
                Patient: <strong className="text-white">{selectedOrder.patientName}</strong> • {selectedOrder.bodyPart}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Reporting Consultant Radiologist *</label>
              <input
                type="text"
                required
                value={radiologistName}
                onChange={e => setRadiologistName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Imaging Findings & Observation *</label>
              <textarea
                required
                rows={5}
                value={findings}
                onChange={e => setFindings(e.target.value)}
                placeholder="Describe parenchyma, osseous structures, soft tissues, vascularity, absence or presence of lesions"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white leading-relaxed font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Final Radiologic Impression *</label>
              <textarea
                required
                rows={2}
                value={impression}
                onChange={e => setImpression(e.target.value)}
                placeholder="e.g. Normal chest radiograph with clear lung fields. No cardiomegaly or active parenchymal disease."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Recommendations & Correlative Advice</label>
              <input
                type="text"
                value={recommendations}
                onChange={e => setRecommendations(e.target.value)}
                placeholder="e.g. Clinical correlation advised; follow up ultrasound after 6 weeks if symptoms persist."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
              >
                Sign & Verify Diagnostic Report
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
