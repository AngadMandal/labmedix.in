import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { StorageService } from '../../services/storage';
import { HospitalWard, HospitalBed, BedStatus, IpdAdmission } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Building,
  BedDouble,
  Activity,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
  ArrowRightLeft,
  User,
  Plus,
  RefreshCw,
  Wind,
  Layers,
  Filter
} from 'lucide-react';

export const WardManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [wards, setWards] = useState<HospitalWard[]>(() => HospitalService.getWards());
  const [beds, setBeds] = useState<HospitalBed[]>(() => HospitalService.getBeds());
  const [admissions, setAdmissions] = useState<IpdAdmission[]>(() => HospitalService.getAdmissions());

  const [selectedWardId, setSelectedWardId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | BedStatus>('all');

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedBedForTransfer, setSelectedBedForTransfer] = useState<HospitalBed | null>(null);
  const [targetWardId, setTargetWardId] = useState('');
  const [targetBedNumber, setTargetBedNumber] = useState('');
  const [transferTargetBeds, setTransferTargetBeds] = useState<HospitalBed[]>([]);

  const refreshData = () => {
    setWards(HospitalService.getWards());
    setBeds(HospitalService.getBeds());
    setAdmissions(HospitalService.getAdmissions());
  };

  useEffect(() => {
    const handleSync = () => refreshData();
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  // Update target beds when target ward changes in transfer modal
  useEffect(() => {
    if (targetWardId) {
      const avail = HospitalService.getBeds(targetWardId).filter(b => b.status === 'available');
      setTransferTargetBeds(avail);
      if (avail.length > 0) setTargetBedNumber(avail[0].bedNumber);
      else setTargetBedNumber('');
    }
  }, [targetWardId]);

  // Overall Bed Counts
  const counts = useMemo(() => {
    const total = beds.length;
    const available = beds.filter(b => b.status === 'available').length;
    const occupied = beds.filter(b => b.status === 'occupied').length;
    const cleaning = beds.filter(b => b.status === 'cleaning').length;
    const maintenance = beds.filter(b => b.status === 'maintenance').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, available, occupied, cleaning, maintenance, occupancyRate };
  }, [beds]);

  // Filtered Beds
  const filteredBeds = useMemo(() => {
    return beds.filter(b => {
      const matchesWard = selectedWardId === 'all' || b.wardId === selectedWardId;
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesWard && matchesStatus;
    });
  }, [beds, selectedWardId, statusFilter]);

  const handleStatusChange = (bed: HospitalBed, newStatus: BedStatus) => {
    try {
      HospitalService.updateBedStatus(bed.id, newStatus);
      showToast('success', 'Bed Status Updated', `Bed ${bed.bedNumber} is now marked ${newStatus.toUpperCase()}`);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Status Change Error', err.message);
    }
  };

  const handleOpenTransfer = (bed: HospitalBed) => {
    if (!bed.currentAdmissionId) {
      showToast('error', 'No Inpatient', 'This bed does not have an active admitted patient.');
      return;
    }
    setSelectedBedForTransfer(bed);
    const otherWards = wards.filter(w => w.id !== bed.wardId);
    setTargetWardId(otherWards[0]?.id || wards[0]?.id || '');
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedForTransfer?.currentAdmissionId || !targetWardId || !targetBedNumber) {
      showToast('error', 'Incomplete Details', 'Please select destination ward and available bed.');
      return;
    }

    try {
      HospitalService.transferBed(
        selectedBedForTransfer.currentAdmissionId,
        targetWardId,
        targetBedNumber
      );

      showToast('success', 'Bed Transfer Complete', `Patient transferred to Bed ${targetBedNumber}`);
      setIsTransferModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Transfer Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 sm:p-8 border border-teal-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              Module 9 • Real-Time Floor & Bed Matrix
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Building className="w-8 h-8 text-teal-400" />
              Ward & Bed Management
            </h1>
            <p className="text-teal-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              Interactive graphical bed occupancy matrix, ward masters (ICU, CCU, General, Private), oxygen and ventilator capability tracking, turnaround cleaning workflows, and patient bed transfers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Bed Grid"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Hospital Beds</span>
            <BedDouble className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{counts.total}</p>
          <span className="text-[11px] text-slate-400">Across {wards.length} hospital wards</span>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Available Beds</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{counts.available}</p>
          <span className="text-[11px] text-emerald-300/80">Ready for instant admission</span>
        </div>

        <div className="bg-rose-950/30 border border-rose-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Occupied Beds</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{counts.occupied}</p>
          <span className="text-[11px] text-rose-300/80">Occupancy: {counts.occupancyRate}%</span>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Cleaning / Turnaround</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{counts.cleaning}</p>
          <span className="text-[11px] text-amber-300/80">Sanitization in progress</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Under Maintenance</span>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{counts.maintenance}</p>
          <span className="text-[11px] text-slate-400">Engineering repair</span>
        </div>
      </div>

      {/* Ward Switcher Tabs & Status Filters */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Ward Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedWardId('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
              selectedWardId === 'all'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Wards ({beds.length})
          </button>
          {wards.map(w => {
            const wardBedCount = beds.filter(b => b.wardId === w.id).length;
            const wardAvailCount = beds.filter(b => b.wardId === w.id && b.status === 'available').length;
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWardId(w.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedWardId === w.id
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{w.name}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-900 text-teal-300 font-mono">
                  {wardAvailCount}/{wardBedCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-teal-500 w-full md:w-auto"
          >
            <option value="all">All Bed Statuses</option>
            <option value="available">🟢 Available Only</option>
            <option value="occupied">🔴 Occupied Only</option>
            <option value="cleaning">🟡 Cleaning / Sanitization</option>
            <option value="maintenance">⚙️ Maintenance</option>
          </select>
        </div>
      </div>

      {/* Visual Bed Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBeds.map(bed => {
          const isOccupied = bed.status === 'occupied';
          const isAvailable = bed.status === 'available';
          const isCleaning = bed.status === 'cleaning';
          const isMaintenance = bed.status === 'maintenance';

          return (
            <div
              key={bed.id}
              className={`rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden ${
                isAvailable
                  ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/20'
                  : isOccupied
                  ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400/60 shadow-lg shadow-rose-950/20'
                  : isCleaning
                  ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/60'
                  : 'bg-slate-900 border-slate-800 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-black text-sm">
                    🛏️ {bed.bedNumber}
                  </span>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">{bed.type}</span>
                    <span className="text-[11px] font-bold text-teal-300 truncate max-w-[130px] block">{bed.wardName}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  isAvailable
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isOccupied
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : isCleaning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {bed.status}
                </span>
              </div>

              {/* Patient Info If Occupied */}
              {isOccupied && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950/90 border border-rose-900/30 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Current Inpatient</span>
                    <User className="w-3 h-3 text-rose-400" />
                  </div>
                  <div className="font-bold text-white truncate text-sm">
                    {bed.currentPatientName || 'Admitted Patient'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ID: {bed.currentAdmissionId || 'IPD-ACTIVE'}
                  </div>
                </div>
              )}

              {/* Equipment Badges & Rate */}
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  {bed.oxygenSupported && (
                    <span className="text-cyan-300 font-bold flex items-center gap-0.5" title="Central Oxygen Pipeline">
                      🫁 O₂
                    </span>
                  )}
                  {bed.ventilatorSupported && (
                    <span className="text-purple-300 font-bold flex items-center gap-0.5" title="Ventilator Ready">
                      <Wind className="w-3 h-3" /> Vent
                    </span>
                  )}
                </div>
                <span className="font-bold text-white font-mono">₹{bed.dailyRate}/day</span>
              </div>

              {/* Action Controls */}
              <div className="mt-3 flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/60">
                {isOccupied && (
                  <button
                    onClick={() => handleOpenTransfer(bed)}
                    className="w-full py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 font-bold text-[10px] transition flex items-center justify-center gap-1"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    Transfer Bed
                  </button>
                )}

                {isCleaning && (
                  <button
                    onClick={() => handleStatusChange(bed, 'available')}
                    className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Mark Clean & Available
                  </button>
                )}

                {isAvailable && (
                  <button
                    onClick={() => handleStatusChange(bed, 'cleaning')}
                    className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition"
                  >
                    Send to Cleaning
                  </button>
                )}

                {isMaintenance && (
                  <button
                    onClick={() => handleStatusChange(bed, 'available')}
                    className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                  >
                    Clear Maintenance
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed Transfer Modal */}
      {isTransferModalOpen && selectedBedForTransfer && (
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title={`Transfer Inpatient: ${selectedBedForTransfer.currentPatientName}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40">
              <span className="text-purple-300 font-bold block">Current Bed:</span>
              <span className="text-white font-bold text-sm">
                {selectedBedForTransfer.wardName} • Bed {selectedBedForTransfer.bedNumber}
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Destination Ward *</label>
              <select
                value={targetWardId}
                onChange={e => setTargetWardId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {wards.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} (₹{w.dailyRate}/day)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Select Available Destination Bed *</label>
              <select
                value={targetBedNumber}
                onChange={e => setTargetBedNumber(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
              >
                {transferTargetBeds.length === 0 ? (
                  <option value="">No available beds in this ward</option>
                ) : (
                  transferTargetBeds.map(b => (
                    <option key={b.id} value={b.bedNumber}>
                      Bed {b.bedNumber} ({b.type})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!targetBedNumber}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
              >
                Execute Bed Transfer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
