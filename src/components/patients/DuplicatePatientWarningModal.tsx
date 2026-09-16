import React from 'react';
import { Patient, HealthCard } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AlertTriangle, UserCheck, ExternalLink, ShieldCheck, X, Stethoscope, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DuplicatePatientWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedAnyway: () => void;
  matchedPatient: Patient;
  matchedCard?: HealthCard;
  duplicateField?: 'mobile' | 'id' | 'demographics' | 'govt_id';
  reasons?: string[];
  confidence?: 'HIGH_CONFIDENCE' | 'SUSPECTED_MATCH' | 'PARTIAL_MATCH';
}

export const DuplicatePatientWarningModal: React.FC<DuplicatePatientWarningModalProps> = ({
  isOpen,
  onClose,
  onProceedAnyway,
  matchedPatient,
  matchedCard,
  duplicateField = 'mobile',
  reasons = [],
  confidence = 'HIGH_CONFIDENCE'
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const displayUhid = matchedPatient.uhid || matchedPatient.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/50 dark:border-amber-500/40 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/20 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-md flex-shrink-0">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                  DUPLICATE PATIENT PREVENTION
                </span>
                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                  confidence === 'HIGH_CONFIDENCE'
                    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300'
                }`}>
                  {confidence === 'HIGH_CONFIDENCE' ? 'High Confidence Match' : 'Possible Match'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                Possible Existing Patient Found
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Detailed Match Reason Pills */}
          {reasons.length > 0 ? (
            <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-700/50 space-y-1">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                Detection Reasons:
              </span>
              <ul className="space-y-0.5">
                {reasons.map((r, idx) => (
                  <li key={idx} className="text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              The {duplicateField === 'mobile' ? 'mobile number' : 'demographic identifiers'}{' '}
              <strong className="text-amber-600 dark:text-amber-400 font-mono">
                {duplicateField === 'mobile' ? matchedPatient.mobile : displayUhid}
              </strong>{' '}
              already match an active Patient Master record in the LABMEDIX centralized database.
            </p>
          )}

          {/* Matched Profile Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  {matchedPatient.fullName}
                </h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Permanent UHID: <strong className="text-blue-600 dark:text-blue-400 font-bold">{displayUhid}</strong> • {matchedPatient.gender.toUpperCase()} • {matchedPatient.age} Yrs
                </p>
              </div>
              <Badge variant={matchedCard ? 'blue' : 'neutral'}>
                {matchedCard ? 'Active Cardholder' : 'Registered Patient'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
              <div>
                <span className="text-slate-400">Mobile:</span>{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{matchedPatient.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400">Blood Group:</span>{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{matchedPatient.bloodGroup || 'Unknown'}</span>
              </div>
              {matchedCard && (
                <div className="col-span-2">
                  <span className="text-slate-400">Health Card No:</span>{' '}
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{matchedCard.cardNumber}</span>
                  <span className="text-slate-400"> ({matchedCard.status.toUpperCase()})</span>
                </div>
              )}
              {matchedPatient.address?.fullAddress && (
                <div className="col-span-2 text-slate-500 dark:text-slate-400 truncate">
                  <span className="text-slate-400">Address:</span> {matchedPatient.address.fullAddress}
                </div>
              )}
            </div>
          </div>

          {/* Policy Recommendation */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-[11px] space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Central Standard: One Patient = One Permanent UHID
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-[10.5px] leading-relaxed">
              If this is the same patient returning for OPD, Laboratory, Pharmacy, or IPD services, do <strong>NOT</strong> create a duplicate record. Use their existing permanent UHID.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel & Edit
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/patients/${displayUhid}`)}
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
            >
              View Master
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onProceedAnyway}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 border-amber-600 text-white"
            >
              Confirm Distinct Person
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
