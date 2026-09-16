import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient } from '../../types';
import { CentralUhidService } from '../../services/centralUhidService';
import { StorageService } from '../../services/storage';
import { Badge } from './Badge';
import { Button } from './Button';
import {
  Search,
  User,
  Phone,
  CreditCard,
  Stethoscope,
  FlaskConical,
  Pill,
  Building,
  ExternalLink,
  X,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface GlobalPatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient?: (patient: Patient) => void;
  actionType?: 'view' | 'opd' | 'lab' | 'pharmacy' | 'ipd';
}

export const GlobalPatientSearchModal: React.FC<GlobalPatientSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
  actionType = 'view'
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 1) {
      const allPatients = StorageService.getPatients();
      const matches = CentralUhidService.searchPatients(q, allPatients);
      setResults(matches.slice(0, 8));
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  if (!isOpen) return null;

  const handlePatientAction = (patient: Patient, action: string) => {
    if (onSelectPatient) {
      onSelectPatient(patient);
      onClose();
      return;
    }

    const uhid = patient.uhid || patient.id;
    switch (action) {
      case 'opd':
        navigate('/appointments', { state: { selectedPatientId: uhid, patientName: patient.fullName } });
        break;
      case 'lab':
        navigate('/laboratory', { state: { prefilledPatientId: uhid } });
        break;
      case 'pharmacy':
        navigate('/pharmacy', { state: { patientUhid: uhid } });
        break;
      case 'ipd':
        navigate('/ipd', { state: { admitPatientId: uhid } });
        break;
      case 'view':
      default:
        navigate(`/patients/${uhid}`);
        break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
        {/* Search Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Universal Search by UHID (LMX-...), Full Name, Phone, or Card No..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {searchQuery.trim().length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-blue-500/40" />
              <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Central Patient Identity Master Search
              </div>
              <p className="text-xs max-w-md mx-auto">
                Type any patient's permanent <strong>UHID</strong> (e.g. <code>LMX-00000001</code>), phone number, or full name to instantly view records or route across departments.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <User className="w-8 h-8 mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No Patient Found</div>
              <p className="text-xs">No records matched "{searchQuery}". You can register this as a new patient.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate('/patients/new', { state: { initialSearch: searchQuery } });
                }}
                className="mt-2"
              >
                + Register New Patient
              </Button>
            </div>
          ) : (
            results.map((patient) => {
              const uhid = patient.uhid || patient.id;
              return (
                <div
                  key={patient.id}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {patient.fullName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                        UHID: {uhid}
                      </span>
                      {patient.healthCardId && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                          Active Health Card
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{patient.mobile}</span>
                      </span>
                      <span>•</span>
                      <span>{patient.gender.toUpperCase()}</span>
                      <span>•</span>
                      <span>{patient.age} Yrs</span>
                      <span>•</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">{patient.bloodGroup}</span>
                    </div>

                    {patient.address?.villageArea && (
                      <div className="text-[10px] text-slate-400 truncate max-w-sm">
                        {patient.address.villageArea}, {patient.address.district}
                      </div>
                    )}
                  </div>

                  {/* Fast Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePatientAction(patient, 'opd')}
                      title="Book OPD Appointment"
                      className="p-1.5 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[10px] font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition"
                    >
                      <Stethoscope className="w-3 h-3" />
                      <span>OPD</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePatientAction(patient, 'lab')}
                      title="Order Lab Test"
                      className="p-1.5 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-[10px] font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition"
                    >
                      <FlaskConical className="w-3 h-3" />
                      <span>Lab</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePatientAction(patient, 'pharmacy')}
                      title="Pharmacy Dispense"
                      className="p-1.5 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 transition"
                    >
                      <Pill className="w-3 h-3" />
                      <span>Pharmacy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePatientAction(patient, 'view')}
                      title="View Master Profile"
                      className="p-1.5 px-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <span>Master</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Standard: 1 Patient = 1 Permanent UHID (LMX-XXXXXXXX)</span>
          <span className="font-mono text-[10px]">LABMEDIX Master Index</span>
        </div>
      </div>
    </div>
  );
};
