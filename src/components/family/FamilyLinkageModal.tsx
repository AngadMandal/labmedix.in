import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, HealthCard, FamilyGroup, Membership } from '../../types';
import { StorageService } from '../../services/storage';
import { FamilyService } from '../../services/familyService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { Users2, Crown, User, CreditCard, ArrowRight, Plus, Heart, ShieldCheck, Edit2, Trash2 } from 'lucide-react';

interface FamilyLinkageModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSwitchCard?: (patientId: string) => void;
}

export const FamilyLinkageModal: React.FC<FamilyLinkageModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSwitchCard
}) => {
  const navigate = useNavigate();
  const { can, currentUser } = useAuth();
  const { showToast } = useToast();

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || can('family_manage');

  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editRelation, setEditRelation] = useState('Spouse');

  const families = StorageService.getFamilies();
  const allPatients = StorageService.getPatients().filter(p => !p.isDeleted);
  const allCards = StorageService.getCards();
  const memberships = StorageService.getMemberships();

  // Find family group for this patient
  const family = families.find(f =>
    f.primaryPatientId === patient.id ||
    f.members.some(m => m.patientId === patient.id) ||
    patient.familyId === f.id
  );

  if (!family) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Family Linkage Management" maxWidth="md">
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950 text-brand-blue flex items-center justify-center mx-auto">
            <Users2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">No Family Group Linked</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              <strong>{patient.fullName}</strong> is currently registered as an individual cardholder. You can create a new Family Shield group to link household dependents.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {isAdmin && (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  onClose();
                  navigate('/families');
                }}
              >
                Create Family Group
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  const primaryPatient = allPatients.find(p => p.id === family.primaryPatientId);
  const primaryCard = allCards.find(c => c.patientId === primaryPatient?.id);
  const primaryMembership = memberships.find(m => m.id === primaryCard?.membershipId) || memberships[0];

  const handleUpdateRelation = (patientId: string) => {
    FamilyService.updateMember(family.id, patientId, editRelation);
    showToast('success', 'Member Updated', `Relationship updated to ${editRelation}.`);
    setEditingPatientId(null);
  };

  const handleRemoveMember = (patientId: string, name: string) => {
    if (!isAdmin) {
      showToast('error', 'Access Denied', 'Only Administrator can remove family members.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${name} from ${family.familyName}?`)) {
      FamilyService.removeMember(family.id, patientId);
      showToast('warning', 'Member Removed', `${name} unlinked from family group.`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Family Health Shield: ${family.familyName}`} maxWidth="lg">
      <div className="space-y-6">
        {/* Family Header Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-brand-blue to-indigo-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Users2 className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 block">Shared Family Group</span>
              <h3 className="text-base font-black tracking-wide">{family.familyName}</h3>
              <p className="text-xs text-blue-100 font-medium">
                Family Members: {family.members.filter(m => !m.isPrimary).length} / 5 included ({family.members.length} Total Registered)
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
            {primaryMembership.name}
          </span>
        </div>

        {/* Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Linked Household Members
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              family.members.filter(m => !m.isPrimary).length > 5
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
            }`}>
              Family Members: {family.members.filter(m => !m.isPrimary).length} / 5
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* 1. Primary Cardholder (Head) */}
            {primaryPatient && (
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={primaryPatient.photoUrl || '/logo.jpg'} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                    <span className="absolute -top-1 -right-1 p-1 bg-amber-500 rounded-full text-white shadow-xs">
                      <Crown className="w-3 h-3" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">{primaryPatient.fullName}</strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                        👑 Family Head (Primary)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      <span>{primaryPatient.id}</span>
                      <span>•</span>
                      <span className="text-brand-blue dark:text-blue-400 font-bold">{primaryCard?.cardNumber || 'No Card'}</span>
                      <span>•</span>
                      <span className="text-red-500 font-bold">{primaryPatient.bloodGroup}</span>
                      <span>•</span>
                      <span>{primaryPatient.age} Y / {primaryPatient.gender.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {onSwitchCard && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                      onClick={() => {
                        onClose();
                        onSwitchCard(primaryPatient.id);
                      }}
                    >
                      Studio Card
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onClose();
                      navigate(`/patients/${primaryPatient.id}`);
                    }}
                  >
                    Profile →
                  </Button>
                </div>
              </div>
            )}

            {/* 2. Dependents List */}
            {family.members.filter(m => !m.isPrimary).map((mem, idx) => {
              const depPatient = allPatients.find(p => p.id === mem.patientId);
              if (!depPatient) return null;
              const depCard = allCards.find(c => c.patientId === depPatient.id);
              const isEditing = editingPatientId === depPatient.id;

              return (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={depPatient.photoUrl || '/logo.jpg'} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{depPatient.fullName}</strong>
                        {!isEditing ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {mem.relationship || 'Dependent'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <select
                              value={editRelation}
                              onChange={(e) => setEditRelation(e.target.value)}
                              className="text-xs px-2 py-0.5 rounded border border-blue-400 bg-white dark:bg-slate-800"
                            >
                              <option value="Spouse">Spouse</option>
                              <option value="Son">Son</option>
                              <option value="Daughter">Daughter</option>
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                              <option value="Dependent">Dependent</option>
                            </select>
                            <Button size="sm" variant="success" onClick={() => handleUpdateRelation(depPatient.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingPatientId(null)}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5 flex-wrap">
                        <span>{depPatient.id}</span>
                        <span>•</span>
                        {depCard ? (
                          <span className="text-brand-blue dark:text-blue-400 font-bold">Card: {depCard.cardNumber}</span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            🛡️ Active under Primary ({primaryCard?.cardNumber || 'Head Card'})
                          </span>
                        )}
                        {mem.additionalFeePaid && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            +₹{mem.additionalFeeAmount || 299} Paid
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-red-500 font-bold">{depPatient.bloodGroup}</span>
                        <span>•</span>
                        <span>{depPatient.age} Y / {depPatient.gender.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {onSwitchCard && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                        onClick={() => {
                          onClose();
                          onSwitchCard(depPatient.id);
                        }}
                      >
                        Studio Card
                      </Button>
                    )}

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPatientId(depPatient.id);
                            setEditRelation(mem.relationship);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Edit Relationship"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(depPatient.id, depPatient.fullName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Remove Dependent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onClose();
                        navigate(`/patients/${depPatient.id}`);
                      }}
                    >
                      Profile →
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                onClose();
                navigate('/families');
              }}
            >
              Add / Manage Dependents
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};