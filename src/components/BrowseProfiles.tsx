import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserPreferences, DEFAULT_DEMO_PREFERENCES } from '../types';
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
  Plus,
  SlidersHorizontal,
  RotateCcw,
  Smile,
  Eye,
  Ruler,
  Cigarette,
  Wine,
  Baby,
  Tag
} from 'lucide-react';
import { Avatar } from './Avatar';
import { HomeScreen } from './HomeScreen';
import { FindMyMatchModal, formatHeightLabel } from './FindMyMatchModal';
import { AuthGate } from './AuthGate';
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
    updateUserProfile,
    updateUserPreferences,
    showNotification,
    setCurrentView,
  } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterGender, setFilterGender] = useState<string>('All');

  if (!currentUser) {
    return <AuthGate featureName="Browse Singles" />;
  }
  const [viewStyle, setViewStyle] = useState<'card' | 'grid'>('card');
  const [editingTargetUser, setEditingTargetUser] = useState<User | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    Age: '',
    Location: '',
    Occupation: '',
    Bio: '',
    Interests: '',
    intent: 'Dating & chemistry' as User['Preferences']['intent'],
  });

  const userPrefs: UserPreferences = currentUser.Preferences || DEFAULT_DEMO_PREFERENCES;

  // Base eligible candidates: all users except currentUser and blocked users
  const allEligibleCandidates = users.filter(u => {
    if (u.UserID === currentUser.UserID) return false;
    if (blockedUserIds.includes(u.UserID)) return false;
    return true;
  });

  // Filter candidates combining all active preferences
  const candidates = allEligibleCandidates.filter(u => {
    // 1. Gender tab filter (All / Women / Men) or userPrefs.gender
    if (filterGender !== 'All') {
      if (filterGender === 'Women' && u.Gender !== 'Woman') return false;
      if (filterGender === 'Men' && u.Gender !== 'Man') return false;
    } else if (userPrefs.gender && userPrefs.gender !== 'Any') {
      if (userPrefs.gender === 'Women' && u.Gender !== 'Woman') return false;
      if (userPrefs.gender === 'Men' && u.Gender !== 'Man') return false;
      if (userPrefs.gender === 'Non-Binary' && u.Gender !== 'Non-Binary') return false;
    }

    // 2. Age Range
    const age = u.Age || 0;
    if (userPrefs.ageMin && age < userPrefs.ageMin) return false;
    if (userPrefs.ageMax && age > userPrefs.ageMax) return false;

    // 3. Distance
    if (userPrefs.distanceMiles && userPrefs.distanceMiles > 0) {
      const dist = u.DistanceMiles ?? 15;
      if (dist > userPrefs.distanceMiles) return false;
    }

    // 4. Hair Color
    if (userPrefs.hairColor && userPrefs.hairColor !== 'Any') {
      if (u.HairColor && u.HairColor !== userPrefs.hairColor) return false;
    }

    // 5. Height
    if (userPrefs.heightMinInches && userPrefs.heightMinInches > 0) {
      const h = u.HeightInches ?? 68;
      if (h < userPrefs.heightMinInches) return false;
    }
    if (userPrefs.heightMaxInches && userPrefs.heightMaxInches > 0) {
      const h = u.HeightInches ?? 68;
      if (h > userPrefs.heightMaxInches) return false;
    }

    // 6. Eye Color
    if (userPrefs.eyeColor && userPrefs.eyeColor !== 'Any') {
      if (u.EyeColor && u.EyeColor !== userPrefs.eyeColor) return false;
    }

    // 7. Relationship Intentions
    if (userPrefs.intent && userPrefs.intent !== 'Any') {
      const candidateIntent = u.RelationshipIntent || u.Preferences?.intent;
      if (candidateIntent && candidateIntent !== userPrefs.intent) return false;
    }

    // 8. Smoking
    if (userPrefs.smoking && userPrefs.smoking !== 'Any') {
      if (u.Smoking && u.Smoking !== userPrefs.smoking) return false;
    }

    // 9. Drinking
    if (userPrefs.drinking && userPrefs.drinking !== 'Any') {
      if (u.Drinking && u.Drinking !== userPrefs.drinking) return false;
    }

    // 10. Children & Family
    if (userPrefs.children && userPrefs.children !== 'Any') {
      if (u.Children && u.Children !== userPrefs.children) return false;
    }

    // 11. Interests & Hobbies
    if (userPrefs.interests && userPrefs.interests.length > 0) {
      const sharesInterest = userPrefs.interests.some(prefInterest =>
        u.Interests.some(candInterest =>
          candInterest.toLowerCase().includes(prefInterest.toLowerCase())
        )
      );
      if (!sharesInterest) return false;
    }

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
    setReportModalTarget(targetUser, { source: 'browse' });
  };

  const handleApplyPreferences = (newPrefs: UserPreferences) => {
    updateUserPreferences(currentUser.UserID, newPrefs);
    showNotification('Search filters applied and saved to your account!', 'pink');
    setCurrentIndex(0);
  };

  const handleResetDefaults = () => {
    updateUserPreferences(currentUser.UserID, { ...DEFAULT_DEMO_PREFERENCES });
    showNotification('Reset to demonstration defaults (Age 30–55, 50 miles).', 'info');
    setCurrentIndex(0);
  };

  const handleClearAll = () => {
    updateUserPreferences(currentUser.UserID, {
      ageMin: 18,
      ageMax: 80,
      hairColor: 'Any',
      heightMinInches: 0,
      heightMaxInches: 0,
      eyeColor: 'Any',
      distanceMiles: 0,
      gender: 'Any',
      intent: 'Any',
      smoking: 'Any',
      drinking: 'Any',
      children: 'Any',
      interests: [],
    });
    setFilterGender('All');
    showNotification('All search filters cleared.', 'info');
    setCurrentIndex(0);
  };

  const removeSingleFilter = (key: keyof UserPreferences) => {
    const updated = { ...userPrefs };
    if (key === 'ageMin' || key === 'ageMax') {
      updated.ageMin = 18;
      updated.ageMax = 80;
    } else if (key === 'distanceMiles') {
      updated.distanceMiles = 0;
    } else if (key === 'interests') {
      updated.interests = [];
    } else if (key === 'heightMinInches' || key === 'heightMaxInches') {
      updated.heightMinInches = 0;
      updated.heightMaxInches = 0;
    } else {
      (updated as any)[key] = 'Any';
    }
    updateUserPreferences(currentUser.UserID, updated);
  };

  const canEditProfile = (user: User | null | undefined): boolean =>
    Boolean(currentUser && user && user.UserID === currentUser.UserID);

  const openEditModal = (user: User) => {
    if (!canEditProfile(user)) {
      setEditingTargetUser(null);
      showNotification('Permission denied: You can only edit your own profile.', 'info');
      return;
    }
    setEditingTargetUser(user);
    setEditForm({
      Age: user.Age && user.Age > 0 ? String(user.Age) : '',
      Location: user.Location || '',
      Occupation: user.Occupation || '',
      Bio: user.Bio || '',
      Interests: user.Interests.join(', '),
      intent: user.Preferences?.intent || 'Dating & chemistry',
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTargetUser || !canEditProfile(editingTargetUser)) {
      setEditingTargetUser(null);
      showNotification('Permission denied: You can only edit your own profile.', 'info');
      return;
    }

    const parsedAge = editForm.Age.trim() ? Number(editForm.Age) : 0;
    const interestsList = editForm.Interests.split(',')
      .map(s => s.trim())
      .filter(Boolean);

    updateUserProfile({
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

    setEditingTargetUser(null);
  };

  const formatDisplayName = (user: User) => {
    const namePart = user.LastName && user.LastName.trim() ? `${user.FirstName} ${user.LastName}` : user.FirstName;
    if (user.Age && user.Age > 0) {
      return `${namePart}, ${user.Age}`;
    }
    return namePart;
  };

  // Determine active filter chips to render in the quick-clear pill bar
  const activeChips: { key: keyof UserPreferences; label: string }[] = [];
  if (userPrefs.ageMin !== 18 || userPrefs.ageMax !== 80) {
    activeChips.push({
      key: 'ageMin',
      label: `Age: ${userPrefs.ageMin || 18}–${(userPrefs.ageMax || 80) >= 80 ? '80+' : userPrefs.ageMax}`,
    });
  }
  if (userPrefs.distanceMiles && userPrefs.distanceMiles > 0) {
    activeChips.push({
      key: 'distanceMiles',
      label: `Within ${userPrefs.distanceMiles} mi`,
    });
  }
  if (userPrefs.hairColor && userPrefs.hairColor !== 'Any') {
    activeChips.push({ key: 'hairColor', label: `Hair: ${userPrefs.hairColor}` });
  }
  if (userPrefs.eyeColor && userPrefs.eyeColor !== 'Any') {
    activeChips.push({ key: 'eyeColor', label: `Eyes: ${userPrefs.eyeColor}` });
  }
  if (userPrefs.heightMinInches || userPrefs.heightMaxInches) {
    activeChips.push({
      key: 'heightMinInches',
      label: `Height: ${formatHeightLabel(userPrefs.heightMinInches)} – ${formatHeightLabel(userPrefs.heightMaxInches)}`,
    });
  }
  if (userPrefs.gender && userPrefs.gender !== 'Any') {
    activeChips.push({ key: 'gender', label: `Gender: ${userPrefs.gender}` });
  }
  if (userPrefs.intent && userPrefs.intent !== 'Any') {
    activeChips.push({ key: 'intent', label: `Intent: ${userPrefs.intent}` });
  }
  if (userPrefs.smoking && userPrefs.smoking !== 'Any') {
    activeChips.push({ key: 'smoking', label: `Smoking: ${userPrefs.smoking}` });
  }
  if (userPrefs.drinking && userPrefs.drinking !== 'Any') {
    activeChips.push({ key: 'drinking', label: `Drinking: ${userPrefs.drinking}` });
  }
  if (userPrefs.children && userPrefs.children !== 'Any') {
    activeChips.push({ key: 'children', label: `Family: ${userPrefs.children}` });
  }
  if (userPrefs.interests && userPrefs.interests.length > 0) {
    activeChips.push({ key: 'interests', label: `Interests (${userPrefs.interests.length})` });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar with Find My Match CTA */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-rose-100 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#B91C1C] flex items-center gap-1.5 font-heading">
              <Sparkles className="w-3.5 h-3.5 text-[#B45309] fill-amber-400" />
              Discover & Connect
            </span>
            <h1 className="text-2xl font-bold text-[#111827] font-heading mt-0.5">
              Browse Dating Profiles
            </h1>
            <p className="text-xs font-medium text-[#111827] mt-0.5">
              Explore single members. Like to find mutual sparks and unlock confidential mutual matches!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* FIND MY MATCH BUTTON (Prominent Red-to-Hot-Pink Gradient Button) */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="btn-glossy-red-pink py-2.5 px-5 rounded-2xl font-bold text-xs text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 ring-2 ring-rose-200"
              title="Open search and matching filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-white" />
              <span>Find My Match</span>
              {activeChips.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-white text-[#B91C1C] text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {activeChips.length}
                </span>
              )}
            </button>

            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-rose-50 rounded-2xl border border-rose-200 text-xs font-bold">
              <button
                onClick={() => setCurrentView('home')}
                className="px-3 py-1.5 rounded-xl font-bold transition-all text-[#111827] hover:text-[#B91C1C] cursor-pointer"
              >
                🌟 Home
              </button>
              <button
                onClick={() => setViewStyle('card')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  viewStyle === 'card'
                    ? 'btn-glossy-red-pink text-white shadow-xs'
                    : 'text-[#111827] hover:text-[#B91C1C]'
                }`}
              >
                Swipe Card
              </button>
              <button
                onClick={() => setViewStyle('grid')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  viewStyle === 'grid'
                    ? 'btn-glossy-red-pink text-white shadow-xs'
                    : 'text-[#111827] hover:text-[#B91C1C]'
                }`}
              >
                All Profiles ({candidates.length})
              </button>
            </div>
          </div>
        </div>

        {/* Quick Gender Row & Active Filters Bar */}
        <div className="pt-3 border-t border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Gender Filter Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#111827] mr-1">Showing:</span>
            {['All', 'Women', 'Men'].map(g => (
              <button
                key={g}
                onClick={() => {
                  setFilterGender(g);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  filterGender === g
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-rose-50/80 text-[#111827] hover:bg-rose-100 border border-rose-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Matches count & clear filter shortcut */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#111827]">
              <span className="text-[#B91C1C] font-bold">{candidates.length}</span> singles match filters
            </span>
            {activeChips.length > 0 && (
              <button
                onClick={handleResetDefaults}
                className="text-[#B91C1C] hover:underline font-bold ml-2 cursor-pointer flex items-center gap-1"
                title="Reset to 30-55 and 50 miles"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips with Quick Dismiss (X) */}
        {activeChips.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#111827] uppercase tracking-wider mr-1">
              Active Filters:
            </span>
            {activeChips.map(chip => (
              <span
                key={chip.key + chip.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-300 text-[#9F1239] text-xs font-bold shadow-2xs"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => removeSingleFilter(chip.key)}
                  className="w-4 h-4 rounded-full hover:bg-rose-200/80 text-[#BE123C] flex items-center justify-center transition-colors cursor-pointer"
                  title={`Remove ${chip.label}`}
                >
                  <X className="w-2.5 h-2.5 stroke-[3]" />
                </button>
              </span>
            ))}
            <button
              onClick={handleClearAll}
              className="text-xs font-bold text-[#111827] hover:underline ml-1 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Candidates Display: Empty State OR Swipe Card OR Grid */}
      {candidates.length === 0 ? (
        <div className="p-10 sm:p-14 rounded-3xl bg-white border-2 border-rose-200 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 mx-auto flex items-center justify-center text-[#BE123C] border border-rose-200 shadow-xs">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-[#111827] font-heading">
              No profiles match your filters
            </h3>
            <p className="text-xs text-[#111827] font-medium max-w-md mx-auto leading-relaxed">
              We couldn't find registered singles matching every one of your chosen criteria.
              Try widening your age range, increasing distance, or resetting to demonstration defaults.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl btn-glossy-red-pink text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
              Adjust Filters
            </button>
            <button
              onClick={handleResetDefaults}
              className="px-5 py-2.5 rounded-2xl bg-white border-2 border-rose-300 hover:bg-rose-50 text-[#111827] font-bold text-xs transition-colors cursor-pointer"
            >
              Reset to Demo Defaults (30–55)
            </button>
            <button
              onClick={handleClearAll}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#111827] border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Show All Singles
            </button>
          </div>
        </div>
      ) : viewStyle === 'card' && activeProfile ? (
        /* SINGLE PROFILE SWIPE CARD MODE WITH COMPLETE TRAITS */
        <div className="rounded-3xl bg-white border-2 border-rose-100 shadow-xl overflow-hidden transition-all duration-200">
          <div className="grid grid-cols-1 md:grid-cols-12">
            
            {/* Visual Portrait Column */}
            <div className="md:col-span-5 bg-gradient-to-br from-[#FFF0F3] via-[#FFE4E8] to-[#FFF5F7] p-6 sm:p-8 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-rose-100 min-h-[380px]">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white text-slate-800 shadow-xs border border-rose-200 font-bold">
                    {activeProfile.SubscriptionTier}
                  </span>
                  {activeProfile.UserID === 'usr_kristy' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Founder Profile
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleBlock(activeProfile)}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-rose-50 text-[#111827] hover:text-[#BE123C] transition-colors cursor-pointer"
                    title="Block member"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReport(activeProfile)}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-rose-50 text-[#111827] hover:text-[#BE123C] transition-colors cursor-pointer"
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
                      className="w-full h-full object-cover object-[center_30%]"
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
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-fit bg-gradient-to-r from-[#B45309] to-[#BE185D] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                    VIP PLUS
                  </span>
                )}
              </div>

              <div className="text-center space-y-1 w-full">
                <div className="text-xl font-bold text-[#111827] font-heading">
                  {formatDisplayName(activeProfile)}
                </div>
                <div className="text-xs text-[#111827] flex items-center justify-center gap-1 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#B91C1C]" />
                  <span>{activeProfile.Location || 'Location not specified'}</span>
                  {activeProfile.PrivacySettings?.shareLocation !== false && activeProfile.DistanceMiles && (
                    <span className="text-[#B91C1C] font-bold ml-1">
                      · {activeProfile.DistanceMiles} mi away
                    </span>
                  )}
                </div>

                {/* Candidate physical summary badge */}
                <div className="pt-1 flex flex-wrap items-center justify-center gap-1">
                  {activeProfile.PrivacySettings?.showHeight !== false && activeProfile.HeightInches && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#111827] border border-rose-200">
                      📏 {formatHeightLabel(activeProfile.HeightInches)}
                    </span>
                  )}
                  {activeProfile.HairColor && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#111827] border border-rose-200">
                      {activeProfile.HairColor} hair
                    </span>
                  )}
                  {activeProfile.EyeColor && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#111827] border border-rose-200">
                      {activeProfile.EyeColor} eyes
                    </span>
                  )}
                </div>

                {canEditProfile(activeProfile) && (
                  <button
                    onClick={() => openEditModal(activeProfile)}
                    className="mt-2 text-[11px] font-bold text-[#B91C1C] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Profile Information</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Bio & Details Column */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#B91C1C]">
                      About Me
                    </span>
                    {canEditProfile(activeProfile) && (
                      <button
                        onClick={() => openEditModal(activeProfile)}
                        className="text-[11px] font-bold text-[#111827] hover:text-[#B91C1C] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[#111827] leading-relaxed mt-1 font-medium">
                    {activeProfile.Bio || (
                      <span className="text-[#111827] font-medium italic">
                        {canEditProfile(activeProfile)
                          ? 'Biography not provided yet. Tap "Edit Profile Information" to add details.'
                          : 'Biography not provided yet.'}
                      </span>
                    )}
                  </p>
                </div>

                {/* Characteristics & Lifestyle Traits Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-2xl bg-[#FFF8FA] border border-rose-200">
                    <span className="text-[#111827] font-bold block mb-0.5 text-[10px] uppercase">Occupation</span>
                    <span className="font-bold text-[#111827] flex items-center gap-1 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                      <span className="truncate">{activeProfile.Occupation || 'Not specified'}</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-[#FFF8FA] border border-rose-200">
                    <span className="text-[#111827] font-bold block mb-0.5 text-[10px] uppercase">Intent</span>
                    <span className="font-bold text-[#111827] flex items-center gap-1 truncate">
                      <Flame className="w-3.5 h-3.5 text-[#BE123C] shrink-0" />
                      <span className="truncate">{activeProfile.RelationshipIntent || activeProfile.Preferences?.intent || 'Dating'}</span>
                    </span>
                  </div>

                  {activeProfile.PrivacySettings?.showSmoking !== false && activeProfile.Smoking && (
                    <div className="p-2.5 rounded-2xl bg-[#FFF8FA] border border-rose-200">
                      <span className="text-[#111827] font-bold block mb-0.5 text-[10px] uppercase">Smoking</span>
                      <span className="font-bold text-[#111827] flex items-center gap-1 truncate">
                        <Cigarette className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                        <span className="truncate">{activeProfile.Smoking}</span>
                      </span>
                    </div>
                  )}

                  {activeProfile.PrivacySettings?.showDrinking !== false && activeProfile.Drinking && (
                    <div className="p-2.5 rounded-2xl bg-[#FFF8FA] border border-rose-200">
                      <span className="text-[#111827] font-bold block mb-0.5 text-[10px] uppercase">Drinking</span>
                      <span className="font-bold text-[#111827] flex items-center gap-1 truncate">
                        <Wine className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        <span className="truncate">{activeProfile.Drinking}</span>
                      </span>
                    </div>
                  )}

                  {activeProfile.PrivacySettings?.showChildren !== false && activeProfile.Children && (
                    <div className="p-2.5 rounded-2xl bg-[#FFF8FA] border border-rose-200">
                      <span className="text-[#111827] font-bold block mb-0.5 text-[10px] uppercase">Family</span>
                      <span className="font-bold text-[#111827] flex items-center gap-1 truncate">
                        <Baby className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span className="truncate">{activeProfile.Children}</span>
                      </span>
                    </div>
                  )}
                </div>

                {activeProfile.IcebreakerAnswer && (
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                    <span className="font-bold text-[#B91C1C] block">Signature Prompt:</span>
                    <p className="text-[#111827] italic font-medium">
                      "{activeProfile.IcebreakerAnswer}"
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#111827]">
                      Interests & Passions
                    </span>
                    {canEditProfile(activeProfile) && activeProfile.Interests.length === 0 && (
                      <button
                        onClick={() => openEditModal(activeProfile)}
                        className="text-[11px] text-[#B91C1C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
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
                          className="px-2.5 py-1 rounded-xl bg-rose-50/80 border border-rose-200 text-[#111827] text-xs font-semibold"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#111827] font-medium italic">
                        No interests added yet.
                      </span>
                    )}
                  </div>
                </div>

                {/* Privacy & Sandbox Notice for Kristy */}
                {activeProfile.UserID === 'usr_kristy' && (
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-300 text-[#111827] font-medium text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#B45309] shrink-0" />
                    <span>
                      <strong>Demonstration Profile Protected:</strong> Photo and profile are kept strictly within your private preview session and never published publicly without explicit approval.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Pass and Like */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                <button
                  onClick={() => handlePass(activeProfile)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#111827] border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4 text-[#111827]" />
                  <span>Pass</span>
                </button>

                <button
                  onClick={() => handleLike(activeProfile)}
                  className="flex-1 py-3 px-4 rounded-2xl btn-glossy-red-pink font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <Heart className="w-4 h-4 fill-white text-white" />
                  <span>Like {activeProfile.FirstName} ❤️</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* MULTI-PROFILE GRID MODE WITH TRAIT TAGS */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {candidates.map(candidate => (
            <div
              key={candidate.UserID}
              className="rounded-3xl bg-white border-2 border-rose-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  {candidate.ProfilePhoto ? (
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-white shrink-0 bg-slate-100">
                      <img
                        src={candidate.ProfilePhoto}
                        alt={candidate.FirstName}
                        className="w-full h-full object-cover object-[center_30%]"
                      />
                    </div>
                  ) : (
                    <Avatar user={candidate} size="lg" showBadge />
                  )}

                  <div className="flex items-center gap-1">
                    {canEditProfile(candidate) && (
                      <button
                        onClick={() => openEditModal(candidate)}
                        className="p-1.5 rounded-lg text-[#111827] hover:text-[#B91C1C] hover:bg-pink-50 transition-colors cursor-pointer"
                        title="Edit Profile Info"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleBlock(candidate)}
                      className="p-1.5 rounded-lg text-[#111827] hover:text-[#BE123C] hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Block"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReport(candidate)}
                      className="p-1.5 rounded-lg text-[#111827] hover:text-[#BE123C] hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Report"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#111827] font-heading text-base">
                      {formatDisplayName(candidate)}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#B91C1C] border border-rose-200 font-mono">
                      {candidate.SubscriptionTier}
                    </span>
                  </div>
                  <p className="text-xs text-[#111827] mt-0.5 font-medium">
                    {candidate.Occupation || 'Occupation not set'} · {candidate.Location || 'Location not set'}
                  </p>

                  {/* Physical & Lifestyle summary pills */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {candidate.PrivacySettings?.showHeight !== false && candidate.HeightInches && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[#111827] text-[10px] font-bold">
                        {formatHeightLabel(candidate.HeightInches)}
                      </span>
                    )}
                    {candidate.HairColor && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[#111827] text-[10px] font-bold">
                        {candidate.HairColor}
                      </span>
                    )}
                    {candidate.RelationshipIntent && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#991B1B] text-[10px] font-bold border border-rose-200">
                        {candidate.RelationshipIntent}
                      </span>
                    )}
                    {candidate.PrivacySettings?.shareLocation !== false && candidate.DistanceMiles && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-[#78350F] text-[10px] font-bold border border-amber-200">
                        {candidate.DistanceMiles} mi
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#111827] line-clamp-2 mt-2 leading-relaxed font-medium">
                    {candidate.Bio || (
                      <span className="text-[#111827] font-medium italic">
                        Bio not set yet.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {candidate.Interests.length > 0 ? (
                    candidate.Interests.slice(0, 3).map(i => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-rose-50/80 border border-rose-200 text-[10px] text-[#9F1239] font-semibold"
                      >
                        {i}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-[#111827] font-medium italic">
                      No interests set
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePass(candidate)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] border border-slate-300 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-[#111827]" />
                  <span>Pass</span>
                </button>
                <button
                  onClick={() => handleLike(candidate)}
                  className="flex-1 py-2 rounded-xl btn-glossy-red-pink font-extrabold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer text-white"
                >
                  <Heart className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Like</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QUICK EDIT PROFILE MODAL (Strictly restricted to own profile) */}
      {editingTargetUser && canEditProfile(editingTargetUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-rose-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-rose-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[#B91C1C]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] font-heading">
                    Edit {editingTargetUser.FirstName}'s Profile
                  </h3>
                  <p className="text-[11px] text-[#111827] font-medium">
                    Fields remain uninvented and editable until you choose to provide them.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTargetUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Age (Optional)
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={editForm.Age}
                    onChange={e => setEditForm({ ...editForm, Age: e.target.value })}
                    placeholder="Leave blank or enter age"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  />
                </div>

                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.Location}
                    onChange={e => setEditForm({ ...editForm, Location: e.target.value })}
                    placeholder="City, State"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={editForm.Occupation}
                    onChange={e => setEditForm({ ...editForm, Occupation: e.target.value })}
                    placeholder="Occupation / Profession"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  />
                </div>

                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Dating Intent
                  </label>
                  <select
                    value={editForm.intent}
                    onChange={e => setEditForm({ ...editForm, intent: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  >
                    <option value="Serious Relationship">Serious Relationship</option>
                    <option value="Casual Dating">Casual Dating</option>
                    <option value="Friendship First">Friendship First</option>
                    <option value="Not Sure Yet">Not Sure Yet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#111827] font-semibold mb-1">
                  Biography / About Me
                </label>
                <textarea
                  rows={3}
                  value={editForm.Bio}
                  onChange={e => setEditForm({ ...editForm, Bio: e.target.value })}
                  placeholder="Share a short bio..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                />
              </div>

              <div>
                <label className="block text-[#111827] font-semibold mb-1">
                  Interests & Passions (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.Interests}
                  onChange={e => setEditForm({ ...editForm, Interests: e.target.value })}
                  placeholder="e.g. Travel, Coffee, Music, Hiking, Photography"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTargetUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-semibold cursor-pointer"
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

      {/* FIND MY MATCH MODAL */}
      <FindMyMatchModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentPreferences={userPrefs}
        onApply={handleApplyPreferences}
        allCandidates={allEligibleCandidates}
        onResetDefaults={handleResetDefaults}
        onClearAll={handleClearAll}
      />
    </div>
  );
};
