import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HospitalService } from '../../services/hospitalService';
import { StorageService } from '../../services/storage';
import {
  BloodUnitRecord,
  BloodGroup,
  BloodComponentType,
  BloodIssueRequest,
  BloodDonor,
  Patient
} from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Droplet,
  Heart,
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  FileText,
  AlertTriangle,
  QrCode,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

export const BloodBankPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'inventory' | 'requests' | 'donors'>('inventory');
  const [bloodUnits, setBloodUnits] = useState<BloodUnitRecord[]>(() => HospitalService.getBloodUnits());
  const [requests, setRequests] = useState<BloodIssueRequest[]>(() => HospitalService.getBloodRequests());
  const [donors, setDonors] = useState<BloodDonor[]>(() => HospitalService.getBloodDonors());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());

  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAccessionModalOpen, setIsAccessionModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BloodIssueRequest | null>(null);

  // New Blood Unit State
  const [newGroup, setNewGroup] = useState<BloodGroup>('O+');
  const [newComponent, setNewComponent] = useState<BloodComponentType>('prbc');
  const [volumeMl, setVolumeMl] = useState<number>(350);
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [storageLocation, setStorageLocation] = useState('Chamber 1 - Rack A1');

  // New Requisition State
  const [reqPatientSearch, setReqPatientSearch] = useState('');
  const [reqPatient, setReqPatient] = useState<Patient | null>(null);
  const [wardOrOt, setWardOrOt] = useState('Emergency Trauma Bay');
  const [reqBloodGroup, setReqBloodGroup] = useState<BloodGroup>('O+');
  const [reqComponent, setReqComponent] = useState<BloodComponentType>('prbc');
  const [unitsRequested, setUnitsRequested] = useState<number>(1);
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency_crash'>('emergency_crash');
  const [reqDoctor, setReqDoctor] = useState('Dr. Debabrata Roy');

  // Issue cross-matching selection
  const [selectedUnitBarcodes, setSelectedUnitBarcodes] = useState<string[]>([]);

  // Donor State
  const [donorName, setDonorName] = useState('');
  const [donorAge, setDonorAge] = useState<number>(28);
  const [donorGender, setDonorGender] = useState('Male');
  const [donorContact, setDonorContact] = useState('');
  const [donorGroup, setDonorGroup] = useState<BloodGroup>('O+');
  const [donorWeight, setDonorWeight] = useState<number>(68);
  const [donorHb, setDonorHb] = useState<number>(14.2);

  const refreshData = () => {
    setBloodUnits(HospitalService.getBloodUnits());
    setRequests(HospitalService.getBloodRequests());
    setDonors(HospitalService.getBloodDonors());
  };

  useEffect(() => {
    const handleSync = () => refreshData();
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  // Stock Matrix Calculation
  const stockByGroup = useMemo(() => {
    const groups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const summary: Record<BloodGroup, number> = {
      'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0, 'Bombay_Oh': 0
    };
    bloodUnits.filter(u => u.status === 'in_stock').forEach(u => {
      if (summary[u.bloodGroup] !== undefined) {
        summary[u.bloodGroup] += 1;
      }
    });
    return { groups, summary };
  }, [bloodUnits]);

  // Filtered inventory
  const filteredUnits = useMemo(() => {
    return bloodUnits.filter(u => {
      const matchesSearch =
        u.unitBarcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.storageLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGroup = selectedGroup === 'all' || u.bloodGroup === selectedGroup;
      const matchesComp = selectedComponent === 'all' || u.componentType === selectedComponent;

      return matchesSearch && matchesGroup && matchesComp;
    });
  }, [bloodUnits, searchQuery, selectedGroup, selectedComponent]);

  const handleAccessionUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const expiry = new Date(collectionDate);
    if (newComponent === 'prbc') expiry.setDate(expiry.getDate() + 42);
    else if (newComponent === 'platelet_concentrate') expiry.setDate(expiry.getDate() + 5);
    else if (newComponent === 'ffp') expiry.setDate(expiry.getDate() + 365);
    else expiry.setDate(expiry.getDate() + 35);

    try {
      const unit = HospitalService.registerBloodUnit({
        bloodGroup: newGroup,
        componentType: newComponent,
        volumeMl: Number(volumeMl),
        collectionDate,
        expiryDate: expiry.toISOString().slice(0, 10),
        storageLocation,
        hivTest: 'negative',
        hcvTest: 'negative',
        hbsAgTest: 'negative',
        vdrlTest: 'negative',
        malariaTest: 'negative'
      });

      showToast('success', 'Blood Unit Accessioned', `Unit ${unit.unitBarcode} (${unit.bloodGroup} ${unit.componentType}) is in stock.`);
      setIsAccessionModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Accession Error', err.message);
    }
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqPatient) {
      showToast('error', 'Patient Required', 'Please select an active patient for requisition.');
      return;
    }

    try {
      const req = HospitalService.createBloodRequest({
        patientId: reqPatient.id,
        patientName: reqPatient.fullName,
        wardOrOt,
        bloodGroup: reqBloodGroup,
        componentRequired: reqComponent,
        unitsRequested: Number(unitsRequested),
        urgency,
        requisitionDoctor: reqDoctor
      });

      showToast('success', 'Blood Requisition Created', `${req.requestNumber} logged with ${req.urgency.toUpperCase()} urgency`);
      setIsRequestModalOpen(false);
      setReqPatient(null);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Request Error', err.message);
    }
  };

  const handleIssueUnits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || selectedUnitBarcodes.length === 0) {
      showToast('error', 'Select Units', 'Please select compatible units for issuance.');
      return;
    }

    try {
      HospitalService.crossMatchAndIssue(selectedRequest.id, selectedUnitBarcodes);
      showToast('success', 'Units Cross-Matched & Issued', `${selectedUnitBarcodes.length} units issued for ${selectedRequest.patientName}`);
      setIsIssueModalOpen(false);
      setSelectedUnitBarcodes([]);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Issue Error', err.message);
    }
  };

  const handleRegisterDonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !donorContact.trim()) return;

    try {
      const donor = HospitalService.registerDonor({
        fullName: donorName,
        age: Number(donorAge),
        gender: donorGender,
        contactNumber: donorContact,
        bloodGroup: donorGroup,
        weightKg: Number(donorWeight),
        hemoglobinGmDl: Number(donorHb),
        isEligible: donorHb >= 12.5 && donorWeight >= 50,
        screeningNotes: 'Vital signs within normal limits. Fit for voluntary blood donation.'
      });

      showToast('success', 'Donor Registered', `${donor.donorRegNumber} registered (${donor.bloodGroup})`);
      setIsDonorModalOpen(false);
      setDonorName('');
      setDonorContact('');
      refreshData();
    } catch (err: any) {
      showToast('error', 'Donor Error', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-rose-950 p-6 sm:p-8 border border-red-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-wider">
              <Droplet className="w-3.5 h-3.5 text-red-400" />
              Module 16 • Blood Bank & Transfusion Medicine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Droplet className="w-8 h-8 text-red-500 fill-red-500" />
              Blood Bank & Component Inventory
            </h1>
            <p className="text-red-200/80 text-sm max-w-2xl font-medium leading-relaxed">
              Real-time blood stock matrix (PRBC, FFP, Platelets, Cryo), barcode accessioning with 5-parameter viral safety screening (HIV, HCV, HBsAg, VDRL, MP), compatibility cross-matching, and emergency crash blood issuance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Blood Bank"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setReqPatient(null);
                setIsRequestModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Blood Requisition
            </button>
          </div>
        </div>
      </div>

      {/* Stock Matrix Cards (8 ABO / Rh Groups) */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
        {stockByGroup.groups.map(grp => {
          const count = stockByGroup.summary[grp];
          const isCritical = count === 0;
          return (
            <div
              key={grp}
              onClick={() => setSelectedGroup(selectedGroup === grp ? 'all' : grp)}
              className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                selectedGroup === grp
                  ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/30 scale-105 ring-2 ring-red-500/50'
                  : isCritical
                  ? 'bg-slate-900/80 border-red-900/60 hover:border-red-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-red-500/40'
              }`}
            >
              <span className={`text-sm font-black block ${selectedGroup === grp ? 'text-white' : isCritical ? 'text-red-400' : 'text-slate-200'}`}>
                {grp}
              </span>
              <span className={`text-xl font-mono font-black mt-1 block ${selectedGroup === grp ? 'text-white' : isCritical ? 'text-red-500' : 'text-emerald-400'}`}>
                {count}
              </span>
              <span className={`text-[9px] uppercase font-bold block mt-0.5 ${selectedGroup === grp ? 'text-red-200' : isCritical ? 'text-red-400' : 'text-slate-400'}`}>
                {isCritical ? 'ALERT: ZERO' : 'Units'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-2 rounded-2xl">
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'inventory' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Droplet className="w-4 h-4" />
            Unit Inventory ({bloodUnits.filter(u => u.status === 'in_stock').length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'requests' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Issue Requests ({requests.filter(r => r.requestStatus === 'requested').length})
          </button>
          <button
            onClick={() => setActiveTab('donors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'donors' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            Donor Registry ({donors.length})
          </button>
        </div>

        {activeTab === 'inventory' && (
          <button
            onClick={() => setIsAccessionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-red-300 font-bold text-xs border border-red-800/40"
          >
            <Plus className="w-3.5 h-3.5" /> Accession Blood Unit
          </button>
        )}

        {activeTab === 'donors' && (
          <button
            onClick={() => setIsDonorModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-red-300 font-bold text-xs border border-red-800/40"
          >
            <Plus className="w-3.5 h-3.5" /> Register Voluntary Donor
          </button>
        )}
      </div>

      {/* TAB 1: Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Unit Barcode</th>
                  <th className="px-4 py-3.5">Group & Component</th>
                  <th className="px-4 py-3.5">Volume & Storage</th>
                  <th className="px-4 py-3.5">Viral Safety (TTI)</th>
                  <th className="px-4 py-3.5">Expiry Date</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <Droplet className="w-10 h-10 mx-auto mb-2 opacity-30 text-red-400" />
                      No blood units found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map(unit => (
                    <tr key={unit.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-red-400" />
                          {unit.unitBarcode}
                        </div>
                        <span className="text-[10px] text-slate-500">Coll: {formatDate(unit.collectionDate)}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-black text-xs border border-red-500/40">
                          {unit.bloodGroup}
                        </span>
                        <span className="ml-2 font-bold text-white uppercase text-[11px]">
                          {unit.componentType.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white">{unit.volumeMl} mL</div>
                        <div className="text-[11px] text-slate-400">📍 {unit.storageLocation}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" /> 5-TEST NEGATIVE
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        {formatDate(unit.expiryDate)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          unit.status === 'in_stock'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : unit.status === 'issued'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {unit.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Requisition Requests */}
      {activeTab === 'requests' && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Requisition # & Date</th>
                  <th className="px-4 py-3.5">Patient & Destination</th>
                  <th className="px-4 py-3.5">Blood Required</th>
                  <th className="px-4 py-3.5">Urgency</th>
                  <th className="px-4 py-3.5">Cross-Match Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <Clock className="w-10 h-10 mx-auto mb-2 opacity-30 text-red-400" />
                      No pending blood requisitions. Click "Blood Requisition" above to raise request.
                    </td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-white text-xs">{req.requestNumber}</div>
                        <div className="text-[10px] text-slate-400">{formatDateTime(req.requestedAt)}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{req.patientName}</div>
                        <div className="text-[11px] text-red-300 font-semibold">{req.wardOrOt}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-black text-xs border border-red-500/40">
                          {req.bloodGroup}
                        </span>
                        <div className="font-bold text-white text-xs mt-1">
                          {req.unitsRequested} Unit(s) {req.componentRequired.toUpperCase()}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          req.urgency === 'emergency_crash'
                            ? 'bg-rose-500 text-white animate-pulse'
                            : req.urgency === 'urgent'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {req.urgency.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          req.requestStatus === 'issued'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {req.requestStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {req.requestStatus !== 'issued' ? (
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              const matching = bloodUnits
                                .filter(u => u.status === 'in_stock' && u.bloodGroup === req.bloodGroup && u.componentType === req.componentRequired)
                                .slice(0, req.unitsRequested)
                                .map(u => u.unitBarcode);
                              setSelectedUnitBarcodes(matching);
                              setIsIssueModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shadow transition"
                          >
                            Cross-Match & Issue
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Issued
                          </span>
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

      {/* TAB 3: Donor Registry */}
      {activeTab === 'donors' && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Donor Reg #</th>
                  <th className="px-4 py-3.5">Full Name & Contact</th>
                  <th className="px-4 py-3.5">Blood Group</th>
                  <th className="px-4 py-3.5">Weight & Hemoglobin</th>
                  <th className="px-4 py-3.5">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {donors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      <Heart className="w-10 h-10 mx-auto mb-2 opacity-30 text-red-400" />
                      No voluntary donors registered yet. Click "Register Voluntary Donor" above.
                    </td>
                  </tr>
                ) : (
                  donors.map(d => (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-white">{d.donorRegNumber}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{d.fullName}</div>
                        <div className="text-[11px] text-slate-400">{d.gender}, {d.age} yrs • {d.contactNumber}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-black text-xs border border-red-500/40">
                          {d.bloodGroup}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-white font-medium">{d.weightKg} kg</div>
                        <div className="text-[11px] text-slate-400">Hb: <strong className="text-cyan-400">{d.hemoglobinGmDl} g/dL</strong></div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          d.isEligible
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {d.isEligible ? 'FIT TO DONATE' : 'DEFERRED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Accession Blood Unit */}
      {isAccessionModalOpen && (
        <Modal
          isOpen={isAccessionModalOpen}
          onClose={() => setIsAccessionModalOpen(false)}
          title="Accession Tested Blood Unit"
          maxWidth="md"
        >
          <form onSubmit={handleAccessionUnit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">ABO / Rh Blood Group *</label>
                <select
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Bombay_Oh">Bombay (Oh)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Blood Component *</label>
                <select
                  value={newComponent}
                  onChange={e => setNewComponent(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="prbc">Packed Red Blood Cells (PRBC)</option>
                  <option value="whole_blood">Whole Blood (WB)</option>
                  <option value="ffp">Fresh Frozen Plasma (FFP)</option>
                  <option value="platelet_concentrate">Platelet Concentrate (RDP)</option>
                  <option value="cryoprecipitate">Cryoprecipitate</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Volume (mL)</label>
                <input
                  type="number"
                  value={volumeMl}
                  onChange={e => setVolumeMl(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Collection Date</label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={e => setCollectionDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Storage Refrigerator / Rack Location</label>
              <input
                type="text"
                value={storageLocation}
                onChange={e => setStorageLocation(e.target.value)}
                placeholder="e.g. Chamber 1 - Rack B2"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>5 Mandatory TTI viral screenings (HIV, HCV, HBsAg, VDRL, MP) certified negative prior to stock entry.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAccessionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
              >
                Accession & Generate Barcode
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Create Blood Requisition */}
      {isRequestModalOpen && (
        <Modal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          title="Emergency Blood / Component Requisition"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
            {/* Search Patient */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Select Recipient Inpatient *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient by name, UHID or mobile..."
                  value={reqPatientSearch}
                  onChange={e => setReqPatientSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white"
                />
              </div>

              {reqPatientSearch.trim().length > 1 && (
                <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-850">
                  {patients
                    .filter(p => p.fullName.toLowerCase().includes(reqPatientSearch.toLowerCase()) || p.id.toLowerCase().includes(reqPatientSearch.toLowerCase()))
                    .slice(0, 4)
                    .map(p => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setReqPatient(p);
                          if (p.bloodGroup) setReqBloodGroup(p.bloodGroup as any);
                          setReqPatientSearch('');
                        }}
                        className="w-full text-left p-2 hover:bg-slate-850 flex items-center justify-between text-slate-300"
                      >
                        <span className="font-bold text-white">{p.fullName}</span>
                        <span className="text-[10px] text-red-400 font-bold">{p.bloodGroup || 'Blood Group Unlisted'}</span>
                      </button>
                    ))}
                </div>
              )}

              {reqPatient && (
                <div className="p-2 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-between text-white font-bold">
                  <span>Selected: {reqPatient.fullName}</span>
                  <span className="text-cyan-400 text-[10px]">UHID: {reqPatient.id}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Recipient Blood Group *</label>
                <select
                  value={reqBloodGroup}
                  onChange={e => setReqBloodGroup(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Component Required</label>
                <select
                  value={reqComponent}
                  onChange={e => setReqComponent(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="prbc">PRBC (Packed Cells)</option>
                  <option value="whole_blood">Whole Blood</option>
                  <option value="ffp">Fresh Frozen Plasma</option>
                  <option value="platelet_concentrate">Platelet Concentrate</option>
                  <option value="cryoprecipitate">Cryoprecipitate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Units Required</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={unitsRequested}
                  onChange={e => setUnitsRequested(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Ward / Location</label>
                <input
                  type="text"
                  value={wardOrOt}
                  onChange={e => setWardOrOt(e.target.value)}
                  placeholder="e.g. OT Suite 1 / ICU Bed 2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Clinical Urgency *</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-black"
                >
                  <option value="emergency_crash">🚨 EMERGENCY CRASH (Immediate)</option>
                  <option value="urgent">⚡ URGENT (&lt; 2 Hours)</option>
                  <option value="routine">📅 ROUTINE (Planned Surgery)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Requisitioning Physician</label>
              <input
                type="text"
                value={reqDoctor}
                onChange={e => setReqDoctor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reqPatient}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/30"
              >
                Submit Blood Requisition
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Cross-Match and Issue Units */}
      {isIssueModalOpen && selectedRequest && (
        <Modal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          title={`Cross-Match & Issue: ${selectedRequest.patientName}`}
          maxWidth="lg"
        >
          <form onSubmit={handleIssueUnits} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40">
              <div className="text-red-300 font-bold text-sm">
                Recipient: {selectedRequest.patientName} ({selectedRequest.bloodGroup})
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Requisition: {selectedRequest.requestNumber} • {selectedRequest.unitsRequested} Unit(s) of {selectedRequest.componentRequired.toUpperCase()}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-300 font-bold">
                Select Tested & Compatible Units from Inventory:
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                {bloodUnits
                  .filter(u => u.status === 'in_stock' && (u.bloodGroup === selectedRequest.bloodGroup || u.bloodGroup === 'O-'))
                  .map(unit => {
                    const isSelected = selectedUnitBarcodes.includes(unit.unitBarcode);
                    return (
                      <label
                        key={unit.id}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                          isSelected ? 'bg-red-950/50 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedUnitBarcodes(selectedUnitBarcodes.filter(c => c !== unit.unitBarcode));
                              } else {
                                setSelectedUnitBarcodes([...selectedUnitBarcodes, unit.unitBarcode]);
                              }
                            }}
                            className="rounded accent-red-600"
                          />
                          <span className="font-mono font-bold text-xs">{unit.unitBarcode}</span>
                          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold text-[10px]">
                            {unit.bloodGroup}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">📍 {unit.storageLocation}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedUnitBarcodes.length === 0}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/30"
              >
                Confirm Cross-Match & Issue {selectedUnitBarcodes.length} Unit(s)
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Register Voluntary Donor */}
      {isDonorModalOpen && (
        <Modal
          isOpen={isDonorModalOpen}
          onClose={() => setIsDonorModalOpen(false)}
          title="Register Voluntary Blood Donor"
          maxWidth="md"
        >
          <form onSubmit={handleRegisterDonor} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Donor Full Name *</label>
              <input
                type="text"
                required
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                placeholder="Donor full name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Age</label>
                <input
                  type="number"
                  value={donorAge}
                  onChange={e => setDonorAge(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Gender</label>
                <select
                  value={donorGender}
                  onChange={e => setDonorGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Blood Group</label>
                <select
                  value={donorGroup}
                  onChange={e => setDonorGroup(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Contact Mobile *</label>
              <input
                type="text"
                required
                value={donorContact}
                onChange={e => setDonorContact(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Weight (kg)</label>
                <input
                  type="number"
                  value={donorWeight}
                  onChange={e => setDonorWeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Hemoglobin (g/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={donorHb}
                  onChange={e => setDonorHb(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDonorModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
              >
                Register Voluntary Donor
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
