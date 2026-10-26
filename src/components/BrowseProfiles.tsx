import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import {
  Heart,
  X,
  ShieldAlert,
  Ban,
  MapPin,
  Briefcase,
  Sparkles,
  Edit3,
  Flame,
  CheckCircle,
  ShieldCheck,
  Crown,
  Lock,
  Plus
} from 'lucide-react';
import { Avatar } from './Avatar';
import confetti from 'canvas-confetti';

export const BrowseProfiles: React.FC = () => {
  const {
    users,
    currentUser,
    blockedUserIds,
    likeProfile,
    passProfile,
    blockUser,
    setReportModalTarget,
    updateAnyUser,
    showNotification,
  } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterGender, setFilterGender] = useState<string>('All');
  const [viewStyle, setViewStyle] = useState<'card' | 'grid'>('card');
  const [editingTargetUser, setEditingTargetUser] = useState<User | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    Age: '',
    Location: '',
    Occupation: '',
    Bio: '',
    Interests: '',
    intent: 'Dating & chemistry' as User['Preferences']['intent'],
  });

  // Filter candidates: exclude myself, and exclude blocked users
  const candidates = users.filter(u => {
    if (u.UserID === currentUser.UserID) return false;
    if (blockedUserIds.includes(u.UserID)) return false;
    if (filterGender !== 'All' && u.Gender !== filterGender) return false;
    return true;
  });

  const activeProfile: User | undefined = candidates[currentIndex % Math.max(1, candidates.length)];

  const handleLike = (targetUser: User) => {
    const res = likeProfile(targetUser.UserID);
    if (res.isMatch) {
      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FF2E93', '#FF147E', '#E11D48', '#FFE600'],
        });
      } catch (e) {}
    }
    setCurrentIndex(prev => prev + 1);
  };

  const handlePass = (targetUser: User) => {
    passProfile(targetUser.UserID);
    setCurrentIndex(prev => prev + 1);
  };

  const handleBlock = (targetUser: User) => {
    blockUser(targetUser.UserID);
  };

  const handleReport = (targetUser: User) => {
    setReportModalTarget(targetUser);
  };

  const openEditModal = (user: User) => {
    setEditingTargetUser(user);
    setEditForm({
      Age: user.Age && user.Age > 0 ? String(user.Age) : '',
      Location: user.Location || '',
      Occupation: user.Occupation || '',
      Bio: user.Bio || '',
      Interests: user.Interests.join(', '),
      intent: user.Preferences.intent || 'Dating & chemistry',
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTargetUser) return;

    const parsedAge = editForm.Age.trim() ? Number(editForm.Age) : 0;
    const interestsList = editForm.Interests.split(',')
      .map(s => s.trim())
      .filter(Boolean);

    updateAnyUser(editingTargetUser.UserID, {
      Age: parsedAge,
      Location: editForm.Location.trim(),
      Occupation: editForm.Occupation.trim(),
      Bio: editForm.Bio.trim(),
      Interests: interestsList,
      Preferences: {
        ...editingTargetUser.Preferences,
        intent: editForm.intent,
      },
    });

    showNotification(`${editingTargetUser.FirstName}'s profile updated successfully!`, 'success');
    setEditingTargetUser(null);
  };

  const formatDisplayName = (user: User) => {
    const namePart = user.LastName && user.LastName.trim() ? `${user.FirstName} ${user.LastName}` : user.FirstName;
    if (user.Age && user.Age > 0) {
      return `${namePart}, ${user.Age}`;
    }
    return namePart;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-pink-100 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF2E93] flex items-center gap-1.5 font-heading">
            <Sparkles className="w-3.5 h-3.5" />
            Discover & Connect
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading mt-0.5">
            Browse Dating Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore single members. Like to find mutual sparks and unlock confidential mutual matches!
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Gender Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#FFF0F3] rounded-2xl border border-pink-100 text-xs">
            {['All', 'Women', 'Men'].map(g => (
              <button
                key={g}
                onClick={() => {
                  setFilterGender(g);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  filterGender === g
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-[#FFF0F3] rounded-2xl border border-pink-100 text-xs">
            <button
              onClick={() => setViewStyle('card')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                viewStyle === 'card'
                  ? 'btn-pink-gradient text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Swipe Card
            </button>
            <button
              onClick={() => setViewStyle('grid')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                viewStyle === 'grid'
                  ? 'btn-pink-gradient text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Profiles ({candidates.length})
            </button>
          </div>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-pink-100 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-pink-50 mx-auto flex items-center justify-center text-rose-500">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-heading">
            No profiles match your filter
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Reset your filters to see all active demonstration singles.
          </p>
          <button
            onClick={() => {
              setFilterGender('All');
              setCurrentIndex(0);
            }}
            className="px-5 py-2.5 rounded-2xl btn-pink-gradient font-bold text-xs cursor-pointer"
          >
            Show All Singles
          </button>
        </div>
      ) : viewStyle === 'card' && activeProfile ? (
        /* SINGLE PROFILE CARD MODE */
        <div className="rounded-3xl bg-white border border-pink-100 shadow-lg overflow-hidden transition-all duration-200">
          <div className="grid grid-cols-1 md:grid-cols-12">
            
            {/* Visual Portrait Column */}
            <div className="md:col-span-5 bg-gradient-to-br from-[#FFF0F3] via-[#FFE4E8] to-[#FFF5F7] p-6 sm:p-8 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-pink-100 min-h-[380px]">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/90 text-slate-700 shadow-xs border border-pink-100 font-bold">
                    {activeProfile.SubscriptionTier}
                  </span>
                  {activeProfile.UserID === 'usr_kristy' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Demo Sandbox
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleBlock(activeProfile)}
                    className="p-1.5 rounded-lg bg-white/80 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Block member"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReport(activeProfile)}
                    className="p-1.5 rounded-lg bg-white/80 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Report member"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Large Portrait Picture or Initial Avatar */}
              <div className="relative my-4">
                {activeProfile.ProfilePhoto ? (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-100 flex items-center justify-center">
                    <img
                      src={activeProfile.ProfilePhoto}
                      alt={activeProfile.FirstName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center text-5xl font-black text-white shadow-xl border-4 border-white"
                    style={{
                      background: `linear-gradient(135deg, ${activeProfile.AvatarColor || '#FF2E93'}, #E11D48)`,
                    }}
                  >
                    {activeProfile.FirstName[0]}
                  </div>
                )}

                {activeProfile.SubscriptionTier === 'Premium Plus' && (
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-fit bg-gradient-to-r from-amber-400 to-[#FF2E93] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                    VIP PLUS
                  </span>
                )}
              </div>

              <div className="text-center space-y-1">
                <div className="text-xl font-bold text-slate-900 font-heading">
                  {formatDisplayName(activeProfile)}
                </div>
                <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FF2E93]" />
                  <span>{activeProfile.Location || 'Location not specified'}</span>
                </div>
                <button
                  onClick={() => openEditModal(activeProfile)}
                  className="mt-1 text-[11px] font-bold text-[#FF2E93] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Profile Information</span>
                </button>
              </div>
            </div>

            {/* Profile Bio & Details Column */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF2E93]">
                      About Me
                    </span>
                    <button
                      onClick={() => openEditModal(activeProfile)}
                      className="text-[11px] font-bold text-slate-400 hover:text-[#FF2E93] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mt-1">
                    {activeProfile.Bio || (
                      <span className="text-slate-400 italic">
                        Biography not provided yet. Tap "Edit Profile Information" to add details.
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100">
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Occupation</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#FF2E93]" />
                      {activeProfile.Occupation || (
                        <span className="text-slate-400 font-normal">Not specified</span>
                      )}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100">
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Dating Intent</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      {activeProfile.Preferences.intent}
                    </span>
                  </div>
                </div>

                {activeProfile.IcebreakerAnswer && (
                  <div className="p-4 rounded-2xl bg-[#FFF0F3] border border-pink-100 text-xs space-y-1">
                    <span className="font-bold text-[#FF2E93] block">Signature Prompt:</span>
                    <p className="text-slate-700 italic">
                      "{activeProfile.IcebreakerAnswer}"
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Interests & Passions
                    </span>
                    {activeProfile.Interests.length === 0 && (
                      <button
                        onClick={() => openEditModal(activeProfile)}
                        className="text-[11px] text-[#FF2E93] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Interests
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfile.Interests.length > 0 ? (
                      activeProfile.Interests.map(item => (
                        <span
                          key={item}
                          className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No interests added yet. (Editable)
                      </span>
                    )}
                  </div>
                </div>

                {/* Privacy & Sandbox Notice */}
                {activeProfile.UserID === 'usr_kristy' && (
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Demonstration Profile Protected:</strong> Photo and profile are kept strictly within your private preview session and never published publicly without explicit approval.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Pass and Like */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => handlePass(activeProfile)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>Pass</span>
                </button>

                <button
                  onClick={() => handleLike(activeProfile)}
                  className="flex-1 py-3 px-4 rounded-2xl btn-pink-gradient font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Like {activeProfile.FirstName} ❤️</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* MULTI-PROFILE GRID MODE */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {candidates.map(candidate => (
            <div
              key={candidate.UserID}
              className="rounded-3xl bg-white border border-pink-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  {candidate.ProfilePhoto ? (
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white shrink-0 bg-slate-100">
                      <img
                        src={candidate.ProfilePhoto}
                        alt={candidate.FirstName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <Avatar user={candidate} size="lg" showBadge />
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(candidate)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF2E93] hover:bg-pink-50 transition-colors cursor-pointer"
                      title="Edit Profile Info"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleBlock(candidate)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Block"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReport(candidate)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Report"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 font-heading text-base">
                      {formatDisplayName(candidate)}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-[#FF2E93] border border-pink-100 font-mono">
                      {candidate.SubscriptionTier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {candidate.Occupation || 'Occupation not set'} · {candidate.Location || 'Location not set'}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                    {candidate.Bio || (
                      <span className="text-slate-400 italic">
                        Bio not set yet. Tap edit to provide.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {candidate.Interests.length > 0 ? (
                    candidate.Interests.slice(0, 3).map(i => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-pink-50 border border-pink-100 text-[10px] text-pink-700 font-medium"
                      >
                        {i}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">
                      No interests set
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePass(candidate)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pass</span>
                </button>
                <button
                  onClick={() => handleLike(candidate)}
                  className="flex-1 py-2 rounded-xl btn-pink-gradient font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>Like</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QUICK EDIT PROFILE MODAL (Allows providing Age, Location, Occupation, Bio, Interests) */}
      {editingTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-[#FF2E93]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Edit {editingTargetUser.FirstName}'s Profile
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fields remain uninvented and editable until you choose to provide them.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTargetUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Age (Optional)
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={editForm.Age}
                    onChange={e => setEditForm({ ...editForm, Age: e.target.value })}
                    placeholder="Leave blank or enter age"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.Location}
                    onChange={e => setEditForm({ ...editForm, Location: e.target.value })}
                    placeholder="City, State"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={editForm.Occupation}
                    onChange={e => setEditForm({ ...editForm, Occupation: e.target.value })}
                    placeholder="Occupation / Profession"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Dating Intent
                  </label>
                  <select
                    value={editForm.intent}
                    onChange={e => setEditForm({ ...editForm, intent: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  >
                    <option value="Long-term relationship">Long-term relationship</option>
                    <option value="Dating & chemistry">Dating & chemistry</option>
                    <option value="Marriage minded">Marriage minded</option>
                    <option value="Casual & fun">Casual & fun</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Biography / About Me
                </label>
                <textarea
                  rows={3}
                  value={editForm.Bio}
                  onChange={e => setEditForm({ ...editForm, Bio: e.target.value })}
                  placeholder="Share a short bio..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Interests & Passions (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.Interests}
                  onChange={e => setEditForm({ ...editForm, Interests: e.target.value })}
                  placeholder="e.g. Travel, Coffee, Music, Hiking, Photography"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTargetUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-white shadow-md cursor-pointer"
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
