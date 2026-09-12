import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../../services/storage';
import { HospitalService } from '../../services/hospitalService';
import { InventoryService } from '../../services/inventoryService';
import {
  Search,
  User,
  CreditCard,
  FileText,
  ArrowRight,
  X,
  Zap,
  Calendar,
  Ambulance,
  BedDouble,
  Receipt,
  TestTube,
  Boxes,
  Truck,
  Building
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load operational datasets
  const patients = useMemo(() => StorageService.getPatients().filter(p => !p.isDeleted), [isOpen]);
  const cards = useMemo(() => StorageService.getCards(), [isOpen]);
  const bills = useMemo(() => StorageService.getBills(), [isOpen]);
  const appointments = useMemo(() => StorageService.getItem<any[]>('labmedix_patient_appointments_v1', []), [isOpen]);
  const emergencies = useMemo(() => HospitalService.getEmergencyEncounters(), [isOpen]);
  const ipdAdmissions = useMemo(() => HospitalService.getAdmissions(), [isOpen]);
  const inventoryItems = useMemo(() => InventoryService.getInventoryItems(), [isOpen]);
  const purchaseOrders = useMemo(() => InventoryService.getPurchaseOrders(), [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Matched Entities across the 12 specified hospital records
  const matchedPatients = q
    ? patients
        .filter(
          p =>
            p.fullName.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            (p.mobile && p.mobile.includes(q))
        )
        .slice(0, 3)
    : [];

  const matchedCards = q
    ? cards
        .filter(
          c =>
            c.cardNumber.toLowerCase().includes(q) ||
            (c.tier && c.tier.toLowerCase().includes(q)) ||
            (c.verificationCode && c.verificationCode.toLowerCase().includes(q))
        )
        .slice(0, 3)
    : [];

  const matchedBills = q
    ? bills
        .filter(
          b =>
            b.billNumber.toLowerCase().includes(q) ||
            b.patientName.toLowerCase().includes(q) ||
            (b.id && b.id.toLowerCase().includes(q))
        )
        .slice(0, 3)
    : [];

  const matchedAppointments = q
    ? appointments
        .filter(
          (a: any) =>
            (a.appointmentNumber && a.appointmentNumber.toLowerCase().includes(q)) ||
            (a.patientName && a.patientName.toLowerCase().includes(q)) ||
            (a.doctorName && a.doctorName.toLowerCase().includes(q))
        )
        .slice(0, 3)
    : [];

  const matchedEmergencies = q
    ? emergencies
        .filter(
          e =>
            e.encounterNumber.toLowerCase().includes(q) ||
            e.patientName.toLowerCase().includes(q) ||
            (e.uhid && e.uhid.toLowerCase().includes(q))
        )
        .slice(0, 2)
    : [];

  const matchedIpd = q
    ? ipdAdmissions
        .filter(
          adm =>
            adm.admissionNumber.toLowerCase().includes(q) ||
            adm.patientName.toLowerCase().includes(q) ||
            adm.bedNumber.toLowerCase().includes(q)
        )
        .slice(0, 2)
    : [];

  const matchedInventory = q
    ? inventoryItems
        .filter(
          i =>
            i.itemCode.toLowerCase().includes(q) ||
            i.itemName.toLowerCase().includes(q) ||
            (i.batchNumber && i.batchNumber.toLowerCase().includes(q))
        )
        .slice(0, 2)
    : [];

  const quickActions = [
    { title: 'Register New Patient', path: '/patients/register', icon: User },
    { title: 'Central OPD & Lab Billing', path: '/billing', icon: Receipt },
    { title: 'Emergency Casualty Triage', path: '/emergency', icon: Ambulance },
    { title: 'Inpatient Admissions (IPD)', path: '/ipd', icon: BedDouble },
    { title: 'Live Ward & Bed Matrix', path: '/wards', icon: Building },
    { title: 'Hospital Inventory & Consumables', path: '/inventory', icon: Boxes },
    { title: 'Procurement & Purchase Orders', path: '/procurement', icon: Truck },
    { title: 'Standard Bill & Print Center', path: '/print-center', icon: FileText }
  ].filter(a => !q || a.title.toLowerCase().includes(q));

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  const hasAnyResults =
    matchedPatients.length > 0 ||
    matchedCards.length > 0 ||
    matchedBills.length > 0 ||
    matchedAppointments.length > 0 ||
    matchedEmergencies.length > 0 ||
    matchedIpd.length > 0 ||
    matchedInventory.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -20 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Patient ID, Phone, Card #, Bill #, PO #, Appointment, or Action..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-medium"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4">
          {/* Quick Actions (when no search or matches action title) */}
          {quickActions.length > 0 && (!q || !hasAnyResults) && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Hospital Quick Launch
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {quickActions.slice(0, 6).map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(action.path)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate">{action.title}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Patients */}
          {matchedPatients.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Registered Patients ({matchedPatients.length})
              </span>
              <div className="space-y-1">
                {matchedPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(`/patients/${p.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.photoUrl || '/logo.jpg'}
                        alt=""
                        className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <strong className="text-slate-900 dark:text-white block font-bold">{p.fullName}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {p.id} • {p.mobile || 'No Phone'} • {p.bloodGroup || 'Blood Group N/A'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                      View Profile →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Cards */}
          {matchedCards.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Health Cards ({matchedCards.length})
              </span>
              <div className="space-y-1">
                {matchedCards.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(`/cards`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block font-mono">{c.cardNumber}</strong>
                        <span className="text-[11px] text-slate-400 capitalize">{c.tier || 'Health Card'} • Exp: {formatDate(c.expiryDate)}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Bills & Invoices */}
          {matchedBills.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Bills & Invoices ({matchedBills.length})
              </span>
              <div className="space-y-1">
                {matchedBills.map(b => (
                  <div
                    key={b.id}
                    onClick={() => handleSelect(`/billing`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block">{b.patientName}</strong>
                        <span className="text-[11px] text-slate-400 font-mono font-bold">{b.billNumber} • {formatCurrency(b.netPayable)}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {b.paymentStatus || 'Paid'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Appointments */}
          {matchedAppointments.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Appointments ({matchedAppointments.length})
              </span>
              <div className="space-y-1">
                {matchedAppointments.map((a: any) => (
                  <div
                    key={a.id}
                    onClick={() => handleSelect(`/appointments`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block">{a.patientName}</strong>
                        <span className="text-[11px] text-slate-400">Dr. {a.doctorName || 'Assigned'} • {a.appointmentNumber || 'Token'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      View Queue →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Emergency Encounters */}
          {matchedEmergencies.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Emergency & Casualty ({matchedEmergencies.length})
              </span>
              <div className="space-y-1">
                {matchedEmergencies.map(e => (
                  <div
                    key={e.id}
                    onClick={() => handleSelect(`/emergency`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
                        <Ambulance className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block">{e.patientName}</strong>
                        <span className="text-[11px] font-mono text-slate-400">{e.encounterNumber} • Triage: {e.priority.toUpperCase()}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-600">
                      Emergency →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched IPD Admissions */}
          {matchedIpd.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Inpatient Admissions (IPD) ({matchedIpd.length})
              </span>
              <div className="space-y-1">
                {matchedIpd.map(adm => (
                  <div
                    key={adm.id}
                    onClick={() => handleSelect(`/ipd`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
                        <BedDouble className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block">{adm.patientName}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">Bed {adm.bedNumber} ({adm.wardName}) • {adm.admissionNumber}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-600 font-bold">
                      View IPD →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Inventory Items */}
          {matchedInventory.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Hospital Store Inventory ({matchedInventory.length})
              </span>
              <div className="space-y-1">
                {matchedInventory.map(itm => (
                  <div
                    key={itm.id}
                    onClick={() => handleSelect(`/inventory`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                        <Boxes className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block">{itm.itemName}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">[{itm.itemCode}] • Stock: {itm.currentStock} {itm.unitOfMeasure}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-bold">
                      Store →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty search state */}
          {q && !hasAnyResults && (
            <div className="text-center py-10 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">No records found matching "{query}"</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try searching by Patient ID, mobile number, Card number, or Bill number</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};