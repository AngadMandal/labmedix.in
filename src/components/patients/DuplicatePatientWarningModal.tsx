import React from 'react';
import { Patient, HealthCard } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AlertTriangle, UserCheck, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DuplicatePatientWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedAnyway: () => void;
  matchedPatient: Patient;
  matchedCard?: HealthCard;
  duplicateField: 'mobile' | 'id';
}

export const DuplicatePatientWarningModal: React.FC<DuplicatePatientWarningModalProps> = ({
  isOpen,
  onClose,
  onProceedAnyway,
  matchedPatient,
  matchedCard,
  duplicateField
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-amber-500/40 dark:border-amber-500/30 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                Duplicate Protection Alert
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                Existing Patient Detected
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
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            The {duplicateField === 'mobile' ? 'mobile number' : 'patient identifier'}{' '}
            <strong className="text-amber-600 dark:text-amber-400 font-mono">
              {duplicateField === 'mobile' ? matchedPatient.mobile : matchedPatient.id}
            </strong>{' '}
            is already registered to an existing patient in the LABMEDIX central database.
          </p>

          {/* Matched Profile Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  {matchedPatient.fullName}
                </h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  ID: {matchedPatient.id} • {matchedPatient.gender.toUpperCase()} • Age {matchedPatient.age}
                </p>
              </div>
              <Badge variant={matchedCard ? 'blue' : 'neutral'}>
                {matchedCard ? 'Cardholder' : 'Patient'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <div>
                <span className="text-slate-400">Mobile:</span>{' '}
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{matchedPatient.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400">Blood Group:</span>{' '}
                <span className="font-bold text-slate-700 dark:text-slate-300">{matchedPatient.bloodGroup || 'Unknown'}</span>
              </div>
              {matchedCard && (
                <div className="col-span-2">
                  <span className="text-slate-400">Active Health Card:</span>{' '}
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{matchedCard.cardNumber}</span>
                  <span className="text-slate-400"> ({matchedCard.status.toUpperCase()})</span>
                </div>
              )}
              {matchedPatient.address?.fullAddress && (
                <div className="col-span-2 text-slate-500 truncate">
                  <span className="text-slate-400">Address:</span> {matchedPatient.address.fullAddress}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/40 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
            <p className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Policy Recommendation:
            </p>
            <p className="text-slate-600 dark:text-amber-200/80">
              If this is the same individual, please open and update their existing file instead of creating a duplicate profile. If this is a separate family member sharing the same phone, you may proceed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel & Edit Phone
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/patients/${matchedPatient.id}`)}
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto"
          >
            View Existing Profile
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onProceedAnyway}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 border-amber-600 text-white"
          >
            Confirm & Proceed as Family Member
          </Button>
        </div>
      </div>
    </div>
  );
};
