import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FamilyService } from '../../services/familyService';
import { PatientService } from '../../services/patientService';
import { StorageService } from '../../services/storage';
import { BillService } from '../../services/billService';
import { generateUuid } from '../../utils/idGenerator';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FamilyGroup, Patient, FamilyMemberLink, PatientBill } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PhotoUploaderWebcam } from '../../components/common/PhotoUploaderWebcam';
import { formatDate } from '../../utils/formatters';
import {
  Users2,
  Plus,
  UserCheck,
  ChevronRight,
  UserPlus,
  Heart,
  Crown,
  Edit2,
  Trash2,
  ShieldCheck,
  UserMinus,
  Settings,
  CreditCard,
  Sparkles,
  MapPin,
  Phone,
  Zap,
  UserCheck2,
  CheckCircle2,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { BLOOD_GROUP_OPTIONS } from '../../constants/defaults';

export const FamilyListPage: React.FC = () => {
  const { can, currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [families, setFamilies] = useState<FamilyGroup[]>(() => FamilyService.getAll());
  const patients = StorageService.getPatients().filter(p => !p.isDeleted);
  const cards = StorageService.getCards();
  const memberships = StorageService.getMemberships();

  useEffect(() => {
    const handleSync = (e: CustomEvent) => {
      if (!e.detail?.key || e.detail.key === 'labmedix_families_v1' || e.detail.key === 'labmedix_patients_v1') {
        setFamilies(FamilyService.getAll());
      }
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
  }, []);

  // Admin / Super Admin Permission Check
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || can('family_manage');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditFamilyModalOpen, setIsEditFamilyModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);

  const [activeFamily, setActiveFamily] = useState<FamilyGroup | null>(null);
  const [editingMember, setEditingMember] = useState<{ familyId: string; patient: Patient; memberLink: FamilyMemberLink } | null>(null);

  // Form states for Create / Edit Family Group
  const [familyName, setFamilyName] = useState('');
  const [primaryPatientId, setPrimaryPatientId] = useState('');

  // Add Member Mode: 'auto_register' (Fast Track) | 'existing' (Pick from list)
  const [addMemberMode, setAddMemberMode] = useState<'auto_register' | 'existing'>('auto_register');

  // Auto Register Dependent Form State
  const [depFullName, setDepFullName] = useState('');
  const [depRelation, setDepRelation] = useState('Spouse');
  const [depGender, setDepGender] = useState<'male' | 'female' | 'other'>('female');
  const [depAge, setDepAge] = useState<number>(28);
  const [depBloodGroup, setDepBloodGroup] = useState('Unknown / Not Known');
  const [depMobile, setDepMobile] = useState('');
  const [depPhotoUrl, setDepPhotoUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');

  // Existing Patient Link State
  const [existingPatientId, setExistingPatientId] = useState('');
  const [existingRelation, setExistingRelation] = useState('Spouse');

  // Edit Member State
  const [editMemberRelation, setEditMemberRelation] = useState('Spouse');

  const refreshList = () => {
    setFamilies(FamilyService.getAll());
  };

  // Helper to generate recommended title presets from patient name
  const getRecommendedTitles = (patientId: string) => {
    const p = patients.find(pat => pat.id === patientId);
    if (!p) return [];

    const names = p.fullName.trim().split(/\s+/);
    const lastName = names.length > 1 ? names[names.length - 1] : p.fullName;
    const fullName = p.fullName;

    return [
      `${lastName} Family Health Shield`,
      `${fullName} Household Group`,
      `${lastName} Family Care Group`,
      `${fullName} & Family Shield Plan`
    ];
  };

  // When primary patient is selected in Create Modal, auto-recommend title
  const handlePrimaryPatientChange = (patientId: string) => {
    setPrimaryPatientId(patientId);
    const presets = getRecommendedTitles(patientId);
    if (presets.length > 0 && (!familyName || presets.some(pr => pr.includes(familyName)))) {
      setFamilyName(presets[0]); // Auto-suggest recommended title
    }
  };

  // Smart gender & photo avatar auto-selector when relation changes
  const handleRelationChange = (relation: string) => {
    setDepRelation(relation);
    if (['Spouse', 'Sister'].includes(relation)) {
      setDepGender('female');
      setDepPhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
    } else if (relation === 'Daughter') {
      setDepGender('female');
      setDepPhotoUrl('https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80');
    } else if (['Mother', 'Grandmother'].includes(relation)) {
      setDepGender('female');
      setDepPhotoUrl('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80');
    } else if (relation === 'Son') {
      setDepGender('male');
      setDepPhotoUrl('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80');
    } else if (['Father', 'Grandfather'].includes(relation)) {
      setDepGender('male');
      setDepPhotoUrl('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80');
    } else if (['Brother'].includes(relation)) {
      setDepGender('male');
      setDepPhotoUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80');
    }
  };

  // 1. Create Family
  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || !primaryPatientId) return;

    FamilyService.createFamily(familyName.trim(), primaryPatientId);
    showToast('success', 'Family Group Created', `${familyName} initialized.`);
    setIsCreateModalOpen(false);
    setFamilyName('');
    setPrimaryPatientId('');
    refreshList();
  };

  // 2. Edit Family Group Title / Primary Head
  const handleEditFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFamily || !familyName.trim()) return;

    FamilyService.updateFamily(activeFamily.id, {
      familyName: familyName.trim(),
      primaryPatientId
    });

    showToast('success', 'Family Updated', 'Family group title and primary head updated.');
    setIsEditFamilyModalOpen(false);
    setActiveFamily(null);
    refreshList();
  };

  // 3. Add Member Handler (Fast-Track Auto Register OR Existing Pick)
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFamily) return;

    if (activeFamily.members.length >= 5) {
      showToast('error', 'Family Limit Reached', 'Family limit reached (5/5). Upgrade plan or remove an existing member to add another.');
      return;
    }

    if (addMemberMode === 'auto_register') {
      if (!depFullName.trim()) {
        showToast('error', 'Name Required', 'Please enter the dependent full name.');
        return;
      }

      try {
        const res = FamilyService.registerAndLinkDependent(activeFamily.id, {
          fullName: depFullName.trim(),
          relationship: depRelation,
          gender: depGender,
          age: Number(depAge) || 25,
          bloodGroup: depBloodGroup,
          mobile: depMobile.trim(),
          photoUrl: depPhotoUrl
        });

        if (res) {
          triggerCelebrationFireworks();
          showToast(
            'success',
            'Dependent Registered & Linked!',
            `${res.patient.fullName} (${res.patient.id}) enrolled under ${res.family.familyName} (Family Members: ${res.family.members.length}/5).`
          );
          setIsAddMemberModalOpen(false);
          setDepFullName('');
          setDepAge(28);
          setDepMobile('');
          refreshList();
        }
      } catch (err: any) {
        showToast('error', 'Enrollment Blocked', err.message || 'Could not enroll dependent.');
      }
    } else {
      if (!existingPatientId) return;
      try {
        const res = FamilyService.addMember(activeFamily.id, existingPatientId, existingRelation);
        const linkedPatient = patients.find(p => p.id === existingPatientId);
        showToast('success', 'Member Linked', `${linkedPatient?.fullName || 'Patient'} linked to family shield (${res?.members.length || 0}/5).`);
        setIsAddMemberModalOpen(false);
        setExistingPatientId('');
        refreshList();
      } catch (err: any) {
        showToast('error', 'Enrollment Blocked', err.message || 'Could not link member.');
      }
    }
  };

  // 4. Update Enrolled Member Relationship
  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    FamilyService.updateMember(editingMember.familyId, editingMember.patient.id, editMemberRelation);
    showToast('success', 'Member Updated', `Updated relationship to ${editMemberRelation}.`);
    setIsEditMemberModalOpen(false);
    setEditingMember(null);
    refreshList();
  };

  // 5. Remove Member
  const handleRemoveMember = (familyId: string, memPatient: Patient, isPrimary: boolean) => {
    if (!isAdmin) {
      showToast('error', 'Access Denied', 'Only Administrator can remove family members.');
      return;
    }
    if (isPrimary) {
      showToast('error', 'Cannot Remove Head', 'Please assign another family head before removing the primary cardholder.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${memPatient.fullName} from this Family Group?`)) {
      FamilyService.removeMember(familyId, memPatient.id);
      showToast('warning', 'Member Removed', `${memPatient.fullName} unlinked from family group.`);
      refreshList();
    }
  };

  // 6. Delete Entire Family Group
  const handleDeleteFamily = (fam: FamilyGroup) => {
    if (!isAdmin) {
      showToast('error', 'Access Denied', 'Only Administrator can delete family groups.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the entire Family Group "${fam.familyName}"? All ${fam.members.length} members will become individual cardholders.`)) {
      FamilyService.deleteFamily(fam.id);
      showToast('warning', 'Family Group Deleted', `${fam.familyName} deleted.`);
      refreshList();
    }
  };

  const selectedPrimaryPatient = patients.find(p => p.id === primaryPatientId);
  const recommendedTitlePresets = primaryPatientId ? getRecommendedTitles(primaryPatientId) : [];
  const activePrimaryHead = activeFamily ? patients.find(p => p.id === activeFamily.primaryPatientId) : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users2 className="w-7 h-7 text-brand-blue" />
            Family Health Card Groups
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage linked household members under unified family health shield plans (Admin authorized).
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setFamilyName('');
              setPrimaryPatientId('');
              setIsCreateModalOpen(true);
            }}
          >
            Create Family Group
          </Button>
        )}
      </div>

      {/* Main Grid of Family Groups */}
      {families.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No Family Groups Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Group primary patients with spouses, children, and parents to share medical discount benefits.
          </p>
          {isAdmin && (
            <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>Create First Family Group</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {families.map((fam) => {
            const primaryPatient = patients.find(p => p.id === fam.primaryPatientId);
            const primaryCard = cards.find(c => c.patientId === primaryPatient?.id);
            const memTier = memberships.find(m => m.id === primaryCard?.membershipId) || memberships[0];

            return (
              <div
                key={fam.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between"
              >
                <div>
                  {/* Family Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-xs">
                        <Users2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{fam.familyName}</span>
                        </h3>
                        <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span>{fam.id}</span>
                          <span>•</span>
                          <span>Family Members:</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            fam.members.length >= 5
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          }`}>
                            {fam.members.length}/5
                          </span>
                          {fam.members.length >= 5 && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                              (Limit Reached)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Admin Action Buttons on Group */}
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {memTier.name}
                      </span>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFamily(fam);
                              setFamilyName(fam.familyName);
                              setPrimaryPatientId(fam.primaryPatientId);
                              setIsEditFamilyModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Family Title / Head"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFamily(fam)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Delete Family Group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Primary Head Box */}
                  {primaryPatient && (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl my-3 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={primaryPatient.photoUrl || '/logo.jpg'} alt="" className="w-10 h-10 rounded-xl object-cover border" />
                          <span className="absolute -top-1 -right-1 p-0.5 bg-amber-500 rounded-full text-white">
                            <Crown className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-sm font-bold text-slate-900 dark:text-white">{primaryPatient.fullName}</strong>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              👑 Primary Head
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{primaryPatient.id} • {primaryPatient.mobile}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/card-studio?patientId=${primaryPatient.id}`)}
                      >
                        Studio →
                      </Button>
                    </div>
                  )}

                  {/* Enrolled Household Dependents List with Edit / Remove Controls */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Enrolled Dependents ({fam.members.filter(m => !m.isPrimary).length}):
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFamily(fam);
                            setIsAddMemberModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-brand-blue hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Dependent
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                      {fam.members.filter(m => !m.isPrimary).map((m, idx) => {
                        const memPat = patients.find(p => p.id === m.patientId);
                        const memCard = cards.find(c => c.patientId === m.patientId);
                        if (!memPat) return null;

                        return (
                          <div
                            key={idx}
                            className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={memPat.photoUrl || '/logo.jpg'} alt="" className="w-8 h-8 rounded-lg object-cover border" />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <strong className="text-slate-900 dark:text-white font-bold">{memPat.fullName}</strong>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    {m.relationship}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span>{memPat.id}</span>
                                  <span>•</span>
                                  {memCard ? (
                                    <span className="text-brand-blue dark:text-blue-400 font-bold">Card: {memCard.cardNumber}</span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                      🛡️ Active under Primary ({primaryCard?.cardNumber || 'Family Shield'})
                                    </span>
                                  )}
                                  {m.additionalFeePaid && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                      +₹{m.additionalFeeAmount || 299} Paid
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span className="text-red-500 font-semibold">{memPat.bloodGroup}</span>
                                </div>
                              </div>
                            </div>

                            {/* Member Action Controls for Admin */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/card-studio?patientId=${memPat.id}`)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600"
                                title="Open Card Studio"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>

                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMember({ familyId: fam.id, patient: memPat, memberLink: m });
                                      setEditMemberRelation(m.relationship);
                                      setIsEditMemberModalOpen(true);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-blue-600"
                                    title="Edit Dependent Relationship"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(fam.id, memPat, m.isPrimary)}
                                    className="p-1 rounded text-slate-400 hover:text-red-500"
                                    title="Remove from Family Shield"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {fam.members.filter(m => !m.isPrimary).length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No dependents added yet. Click "Add Dependent" above.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {fam.members.length >= 5 ? (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Shield Full (5/5 Members)
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setActiveFamily(fam);
                        setIsAddMemberModalOpen(true);
                      }}
                    >
                      Add Dependent
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/patients/${fam.primaryPatientId}`)}
                  >
                    View Primary Head Profile →
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Create Family Modal with Standard Recommendations */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Family Health Group" maxWidth="lg">
        <form onSubmit={handleCreateFamily} className="space-y-4">
          {/* Primary Patient Picker */}
          <div>
            <Select
              label="Select Primary Cardholder (Head of Family)"
              value={primaryPatientId}
              onChange={(e) => handlePrimaryPatientChange(e.target.value)}
              options={[
                { value: '', label: '-- Select Registered Patient --' },
                ...patients.map(p => ({ value: p.id, label: `${p.fullName} (${p.id} • ${p.mobile})` }))
              ]}
              required
            />
          </div>

          {/* Primary Patient Summary Banner */}
          {selectedPrimaryPatient && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 flex items-start gap-3 text-xs">
              <img src={selectedPrimaryPatient.photoUrl || '/logo.jpg'} alt="" className="w-12 h-12 rounded-xl object-cover border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedPrimaryPatient.fullName}
                  </strong>
                  <span className="text-red-500 font-bold">{selectedPrimaryPatient.bloodGroup}</span>
                </div>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  ID: {selectedPrimaryPatient.id} • Mobile: {selectedPrimaryPatient.mobile} • {selectedPrimaryPatient.age} Y / {selectedPrimaryPatient.gender.toUpperCase()}
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{selectedPrimaryPatient.address.fullAddress}</span>
                </p>
              </div>
            </div>
          )}

          {/* Family Name Input */}
          <div>
            <Input
              label="Family Name / Household Title"
              placeholder="e.g. Roy Family Health Shield"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />

            {/* Quick Recommended Presets Chips */}
            {recommendedTitlePresets.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Recommended Household Titles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedTitlePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFamilyName(preset)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all text-left font-medium ${
                        familyName === preset
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🏷️ {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Family Shield</Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Family Group Title & Primary Head Modal */}
      {activeFamily && (
        <Modal isOpen={isEditFamilyModalOpen} onClose={() => setIsEditFamilyModalOpen(false)} title={`Edit Family Group: ${activeFamily.familyName}`} maxWidth="md">
          <form onSubmit={handleEditFamily} className="space-y-4">
            <Input
              label="Family Name / Household Title"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />

            <Select
              label="Primary Cardholder (Head of Family)"
              value={primaryPatientId}
              onChange={(e) => setPrimaryPatientId(e.target.value)}
              options={patients
                .filter(p => activeFamily.members.some(m => m.patientId === p.id) || p.id === activeFamily.primaryPatientId)
                .map(p => ({ value: p.id, label: `${p.fullName} (${p.id})` }))
              }
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsEditFamilyModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Comprehensive Fast-Track Add / Auto Register Dependent Modal */}
      {activeFamily && (
        <Modal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} title={`Add Dependent to ${activeFamily.familyName}`} maxWidth="lg">
          <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAddMemberMode('auto_register')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  addMemberMode === 'auto_register'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Fast Auto Register & Link</span>
              </button>

              <button
                type="button"
                onClick={() => setAddMemberMode('existing')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  addMemberMode === 'existing'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <UserCheck2 className="w-3.5 h-3.5" />
                <span>Link Existing Registered Patient</span>
              </button>
            </div>

            {/* Primary Head Summary Context */}
            {activePrimaryHead && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Primary Head</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{activePrimaryHead.fullName} ({activePrimaryHead.id})</strong>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Mobile: {activePrimaryHead.mobile}</span>
              </div>
            )}

            {/* Standard 5-Member Allowance Indicator & Extra Charge Notice */}
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              activeFamily.members.length >= 5
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div>
                <span className="font-bold block">
                  Family Shield Allowance: {activeFamily.members.length} / 5 Dependents
                </span>
                <span className="text-[11px] opacity-90">
                  {activeFamily.members.length >= 5
                    ? '⚠️ Standard 5-member allowance reached. Adding this dependent requires an additional fee of ₹299.'
                    : 'Included under the standard family plan (up to 5 dependents at zero additional fee).'}
                </span>
              </div>
              <span className="text-sm font-black font-mono">
                {activeFamily.members.length >= 5 ? '+₹299' : 'FREE'}
              </span>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              {addMemberMode === 'auto_register' ? (
                /* Auto Register Form with Passport Photo */
                <div className="space-y-4">
                  {/* Passport Photo Uploader & Live Camera Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="shrink-0 flex flex-col items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        35×45mm Passport Photo
                      </span>
                      <PhotoUploaderWebcam photoUrl={depPhotoUrl} onPhotoChange={setDepPhotoUrl} />
                    </div>

                    <div className="flex-1 space-y-2 text-xs">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        ⚡ 1-Click Passport Photo Avatar Presets:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDepPhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80')}
                          className="p-1.5 rounded-lg border text-[10px] font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          👩 Spouse / Female
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepPhotoUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80')}
                          className="p-1.5 rounded-lg border text-[10px] font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          👨 Adult Male
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepPhotoUrl('https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80')}
                          className="p-1.5 rounded-lg border text-[10px] font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          👧 Daughter
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepPhotoUrl('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80')}
                          className="p-1.5 rounded-lg border text-[10px] font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          👦 Son / Boy
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepPhotoUrl('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80')}
                          className="p-1.5 rounded-lg border text-[10px] font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          👵 Mother
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepPhotoUrl('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80')}
                          className="p-1.5 rounded-lg border text-[10px] font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          👴 Father
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Upload custom image file, take instant live webcam photo, or choose a medical sample avatar.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Dependent Full Name"
                      placeholder="e.g. Piyali Roy"
                      value={depFullName}
                      onChange={(e) => setDepFullName(e.target.value)}
                      required
                    />

                    <Select
                      label="Relationship to Head"
                      value={depRelation}
                      onChange={(e) => handleRelationChange(e.target.value)}
                      options={[
                        { value: 'Spouse', label: 'Spouse (Wife / Husband)' },
                        { value: 'Son', label: 'Son' },
                        { value: 'Daughter', label: 'Daughter' },
                        { value: 'Father', label: 'Father' },
                        { value: 'Mother', label: 'Mother' },
                        { value: 'Brother', label: 'Brother' },
                        { value: 'Sister', label: 'Sister' },
                        { value: 'Grandfather', label: 'Grandfather' },
                        { value: 'Grandmother', label: 'Grandmother' },
                        { value: 'Dependent', label: 'Other Dependent' }
                      ]}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Age (Years)"
                        type="number"
                        min={0}
                        max={120}
                        value={depAge}
                        onChange={(e) => setDepAge(Number(e.target.value))}
                        required
                      />

                      <Select
                        label="Gender"
                        value={depGender}
                        onChange={(e) => setDepGender(e.target.value as any)}
                        options={[
                          { value: 'female', label: 'Female' },
                          { value: 'male', label: 'Male' },
                          { value: 'other', label: 'Other' }
                        ]}
                      />
                    </div>

                    <Select
                      label="Blood Group"
                      value={depBloodGroup}
                      onChange={(e) => setDepBloodGroup(e.target.value)}
                      options={BLOOD_GROUP_OPTIONS.map(b => ({ value: b.value, label: b.label }))}
                    />

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Contact Mobile Number
                        </label>
                        {activePrimaryHead?.mobile && (
                          <button
                            type="button"
                            onClick={() => setDepMobile(activePrimaryHead.mobile)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            ⚡ Same as Head ({activePrimaryHead.mobile})
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="+91 98300..."
                        value={depMobile}
                        onChange={(e) => setDepMobile(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Family Shield Coverage Policy */}
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Family Shield Coverage Policy:</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      • Dependents are covered under primary card benefits (Status: Active under Primary)<br />
                      • Individual physical cards are NOT auto-minted (Available via explicit card request)<br />
                      • Standard tier includes up to 5 family members (₹299/extra dependent thereafter)
                    </p>
                  </div>
                </div>
              ) : (
                /* Link Existing Patient Mode */
                <div className="space-y-4">
                  <Select
                    label="Select Existing Patient to Link"
                    value={existingPatientId}
                    onChange={(e) => setExistingPatientId(e.target.value)}
                    options={[
                      { value: '', label: '-- Select Patient --' },
                      ...patients
                        .filter(p => !activeFamily.members.some(m => m.patientId === p.id))
                        .map(p => ({ value: p.id, label: `${p.fullName} (${p.id} • ${p.mobile})` }))
                    ]}
                    required
                  />

                  <Select
                    label="Relationship to Primary Head"
                    value={existingRelation}
                    onChange={(e) => setExistingRelation(e.target.value)}
                    options={[
                      { value: 'Spouse', label: 'Spouse (Wife / Husband)' },
                      { value: 'Son', label: 'Son' },
                      { value: 'Daughter', label: 'Daughter' },
                      { value: 'Father', label: 'Father' },
                      { value: 'Mother', label: 'Mother' },
                      { value: 'Brother', label: 'Brother' },
                      { value: 'Sister', label: 'Sister' },
                      { value: 'Grandfather', label: 'Grandfather' },
                      { value: 'Grandmother', label: 'Grandmother' },
                      { value: 'Dependent', label: 'Other Dependent' }
                    ]}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsAddMemberModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">
                  {addMemberMode === 'auto_register' ? 'Register & Link Dependent' : 'Link Existing Member'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* 4. Edit Enrolled Member Modal */}
      {editingMember && (
        <Modal isOpen={isEditMemberModalOpen} onClose={() => setIsEditMemberModalOpen(false)} title={`Edit Enrolled Member: ${editingMember.patient.fullName}`} maxWidth="md">
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <img src={editingMember.patient.photoUrl || '/logo.jpg'} alt="" className="w-12 h-12 rounded-xl object-cover border" />
              <div>
                <strong className="text-sm font-bold text-slate-900 dark:text-white block">{editingMember.patient.fullName}</strong>
                <span className="text-xs text-slate-500 font-mono">{editingMember.patient.id} • Blood Group: {editingMember.patient.bloodGroup}</span>
              </div>
            </div>

            <Select
              label="Updated Relationship to Head"
              value={editMemberRelation}
              onChange={(e) => setEditMemberRelation(e.target.value)}
              options={[
                { value: 'Spouse', label: 'Spouse (Husband / Wife)' },
                { value: 'Son', label: 'Son' },
                { value: 'Daughter', label: 'Daughter' },
                { value: 'Father', label: 'Father' },
                { value: 'Mother', label: 'Mother' },
                { value: 'Brother', label: 'Brother' },
                { value: 'Sister', label: 'Sister' },
                { value: 'Grandfather', label: 'Grandfather' },
                { value: 'Grandmother', label: 'Grandmother' },
                { value: 'Dependent', label: 'Other Dependent' }
              ]}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsEditMemberModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Relationship</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};