import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, SubscriptionTier } from '../types';
import {
  User as UserIcon,
  Heart,
  MapPin,
  Sparkles,
  Save,
  RotateCcw,
  ShieldCheck,
  Briefcase,
  Crown,
  Palette,
  Ban,
  Check,
  Smile,
  Eye,
  Ruler,
  Cigarette,
  Wine,
  Baby,
  Lock,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Users,
  X,
  Camera,
  Upload,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { AuthGate } from './AuthGate';

const AVATAR_COLORS = [
  '#FF2E93',
  '#E11D48',
  '#F43F5E',
  '#A855F7',
  '#3B82F6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
];

export const ProfileSetup: React.FC = () => {
  const {
    currentUser,
    users,
    blockedUserIds,
    unblockUser,
    updateUserProfile,
    resetDemoData,
    setCurrentView,
    deleteAccount,
    isOwner,
    appMode,
  } = useApp();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionSuccessResult, setDeletionSuccessResult] = useState<{
    purged: any;
    retentionExceptions: string[];
  } | null>(null);

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (!currentUser?.Email || confirmEmailInput.trim().toLowerCase() !== currentUser.Email.trim().toLowerCase()) {
      setDeleteError(`Confirmation email mismatch. Please enter your exact registered email address (${currentUser?.Email || 'your email'}) to confirm permanent deletion.`);
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAccount(confirmEmailInput.trim());
      if (result.success) {
        setDeletionSuccessResult({
          purged: result.purged,
          retentionExceptions: result.retentionExceptions || [],
        });
      } else {
        setDeleteError(result.error || 'Server rejected account deletion request.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'An unexpected error occurred while deleting your account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const [formData, setFormData] = useState({
    FirstName: currentUser?.FirstName || '',
    LastName: currentUser?.LastName || '',
    Email: currentUser?.Email || '',
    Gender: currentUser?.Gender || 'Woman',
    InterestedIn: currentUser?.InterestedIn || 'Men',
    Age: currentUser?.Age || 0,
    Location: currentUser?.Location || '',
    Occupation: currentUser?.Occupation || '',
    Bio: currentUser?.Bio || '',
    ProfilePhoto: currentUser?.ProfilePhoto || '',
    Interests: currentUser?.Interests ? currentUser.Interests.join(', ') : '',
    IcebreakerAnswer: currentUser?.IcebreakerAnswer || '',
    AvatarColor: currentUser?.AvatarColor || '#FF2E93',
    // Physical & lifestyle traits
    HairColor: currentUser?.HairColor || 'Brown',
    HeightFeet: Math.floor((currentUser?.HeightInches || 68) / 12),
    HeightInchesRem: (currentUser?.HeightInches || 68) % 12,
    EyeColor: currentUser?.EyeColor || 'Brown',
    RelationshipIntent: currentUser?.RelationshipIntent || 'Serious Relationship',
    Smoking: currentUser?.Smoking || 'Non-smoker',
    Drinking: currentUser?.Drinking || 'Social drinker',
    Children: currentUser?.Children || 'Open to children',
    // Privacy
    showHeight: currentUser?.PrivacySettings?.showHeight ?? true,
    showSmoking: currentUser?.PrivacySettings?.showSmoking ?? true,
    showDrinking: currentUser?.PrivacySettings?.showDrinking ?? true,
    showChildren: currentUser?.PrivacySettings?.showChildren ?? true,
    shareLocation: currentUser?.PrivacySettings?.shareLocation ?? true,
    // Preferences
    ageMin: currentUser?.Preferences?.ageMin || 30,
    ageMax: currentUser?.Preferences?.ageMax || 55,
    distanceMiles: currentUser?.Preferences?.distanceMiles ?? 50,
    intent: currentUser?.Preferences?.intent || 'Any',
  });

  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      FirstName: currentUser.FirstName || '',
      LastName: currentUser.LastName || '',
      Email: currentUser.Email || '',
      Gender: currentUser.Gender,
      InterestedIn: currentUser.InterestedIn,
      Age: currentUser.Age || 0,
      Location: currentUser.Location || '',
      Occupation: currentUser.Occupation || '',
      Bio: currentUser.Bio || '',
      ProfilePhoto: currentUser.ProfilePhoto || '',
      Interests: currentUser.Interests ? currentUser.Interests.join(', ') : '',
      IcebreakerAnswer: currentUser.IcebreakerAnswer || '',
      AvatarColor: currentUser.AvatarColor || '#FF2E93',
      HairColor: currentUser.HairColor || 'Brown',
      HeightFeet: Math.floor((currentUser.HeightInches || 68) / 12),
      HeightInchesRem: (currentUser.HeightInches || 68) % 12,
      EyeColor: currentUser.EyeColor || 'Brown',
      RelationshipIntent: currentUser.RelationshipIntent || 'Serious Relationship',
      Smoking: currentUser.Smoking || 'Non-smoker',
      Drinking: currentUser.Drinking || 'Social drinker',
      Children: currentUser.Children || 'Open to children',
      showHeight: currentUser.PrivacySettings?.showHeight ?? true,
      showSmoking: currentUser.PrivacySettings?.showSmoking ?? true,
      showDrinking: currentUser.PrivacySettings?.showDrinking ?? true,
      showChildren: currentUser.PrivacySettings?.showChildren ?? true,
      shareLocation: currentUser.PrivacySettings?.shareLocation ?? true,
      ageMin: currentUser.Preferences?.ageMin || 30,
      ageMax: currentUser.Preferences?.ageMax || 55,
      distanceMiles: currentUser.Preferences?.distanceMiles ?? 50,
      intent: currentUser.Preferences?.intent || 'Any',
    });
  }, [currentUser]);

  if (!currentUser) {
    return (
      <AuthGate
        featureName="Profile Settings"
        description="Please sign in or create an account to view and customize your Speed Meet Love profile."
      />
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const interestsList = formData.Interests.split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const totalHeightInches = Number(formData.HeightFeet) * 12 + Number(formData.HeightInchesRem);

    updateUserProfile({
      FirstName: formData.FirstName,
      LastName: formData.LastName,
      Email: formData.Email,
      Gender: formData.Gender,
      InterestedIn: formData.InterestedIn,
      Age: Number(formData.Age) || 0,
      Location: formData.Location,
      Occupation: formData.Occupation,
      Bio: formData.Bio,
      ProfilePhoto: formData.ProfilePhoto || '',
      Interests: interestsList,
      IcebreakerAnswer: formData.IcebreakerAnswer,
      AvatarColor: formData.AvatarColor,
      HairColor: formData.HairColor as any,
      HeightInches: totalHeightInches,
      EyeColor: formData.EyeColor as any,
      RelationshipIntent: formData.RelationshipIntent as any,
      Smoking: formData.Smoking as any,
      Drinking: formData.Drinking as any,
      Children: formData.Children as any,
      PrivacySettings: {
        showHeight: formData.showHeight,
        showSmoking: formData.showSmoking,
        showDrinking: formData.showDrinking,
        showChildren: formData.showChildren,
        shareLocation: formData.shareLocation,
      },
      Preferences: {
        ...currentUser.Preferences,
        ageMin: Number(formData.ageMin),
        ageMax: Number(formData.ageMax),
        distanceMiles: Number(formData.distanceMiles),
        intent: formData.intent as any,
      },
    });
  };

  const blockedUsersList = users.filter(u => blockedUserIds.includes(u.UserID));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Summary */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-pink-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Avatar
          user={{
            ...currentUser,
            AvatarColor: formData.AvatarColor,
            ProfilePhoto: formData.ProfilePhoto,
            FirstName: formData.FirstName || currentUser.FirstName,
            LastName: formData.LastName || currentUser.LastName,
          }}
          size="2xl"
          showBadge
        />
        <div className="text-center sm:text-left space-y-1 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#111827] font-heading">
              {currentUser.LastName ? `${currentUser.FirstName} ${currentUser.LastName}` : currentUser.FirstName}
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-pink-50 text-[#BE185D] border border-pink-200 font-bold">
              {currentUser.SubscriptionTier} Tier
            </span>
            {currentUser.IsTester ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-[#92400E] border border-amber-200 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#B45309]" />
                Free Tester Privilege
              </span>
            ) : isOwner ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-50 text-[#581C87] border border-purple-200 font-bold flex items-center gap-1">
                <Crown className="w-3 h-3 text-[#6B21A8]" />
                Founder & Owner
              </span>
            ) : appMode === 'demonstration' && (currentUser.UserID.includes('_demo') || currentUser.Email.endsWith('@speedmeetlove.internal')) ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-[#111827] border border-slate-300 font-bold">
                Sample Demo Profile
              </span>
            ) : (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#065F46] border border-emerald-200 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#047857]" />
                Verified Member Account
              </span>
            )}
          </div>
          <p className="text-xs text-[#111827] font-medium">
            {currentUser.Occupation ? currentUser.Occupation : 'Occupation not set'} · {currentUser.Location ? currentUser.Location : 'Location not set'}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
            <button
              onClick={() => setCurrentView('pricing')}
              className="text-[#BE185D] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              Manage Membership
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-pink-100 pb-4">
          <h2 className="text-lg font-bold text-[#111827] font-heading flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#BE185D]" />
            Personal Profile & Photo Avatar
          </h2>
          <p className="text-xs text-[#111827] font-medium">Visible to other singles when browsing and during speed rounds</p>
        </div>

        {/* Profile Photo Management */}
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-pink-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#BE185D]" />
              Profile Photo
            </label>
            {formData.ProfilePhoto && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, ProfilePhoto: '' }))}
                className="text-xs text-[#BE123C] hover:text-[#881337] font-bold cursor-pointer"
              >
                Remove Photo (Use Initials)
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Avatar
              user={{
                ...currentUser,
                ProfilePhoto: formData.ProfilePhoto,
                AvatarColor: formData.AvatarColor,
                FirstName: formData.FirstName || currentUser.FirstName,
                LastName: formData.LastName || currentUser.LastName,
              }}
              size="xl"
            />
            <div className="space-y-1.5 flex-1 text-xs">
              {formData.ProfilePhoto ? (
                <p className="text-[#111827] font-medium">Custom profile photo active.</p>
              ) : (
                <p className="text-[#111827] font-medium">
                  No photo uploaded. Your profile displays your initials on your selected color gradient.
                </p>
              )}
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-xs font-bold text-[#111827] hover:bg-rose-50 cursor-pointer shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-[#BE185D]" />
                <span>Upload New Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      alert('Photo must be less than 2 MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const result = ev.target?.result as string;
                      if (result) {
                        setFormData(prev => ({ ...prev, ProfilePhoto: result }));
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Avatar Color Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#BE185D]" />
            Avatar Gradient Color Theme
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {AVATAR_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, AvatarColor: color }))}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform ${
                  formData.AvatarColor === color ? 'scale-110 ring-2 ring-slate-900 shadow-md' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              >
                {formData.AvatarColor === color && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#111827] font-bold mb-1">First Name</label>
            <input
              type="text"
              required
              value={formData.FirstName}
              onChange={e => setFormData(prev => ({ ...prev, FirstName: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1">Last Name</label>
            <input
              type="text"
              required
              value={formData.LastName}
              onChange={e => setFormData(prev => ({ ...prev, LastName: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1">Gender</label>
            <select
              value={formData.Gender}
              onChange={e => setFormData(prev => ({ ...prev, Gender: e.target.value as any }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            >
              <option value="Man">Man</option>
              <option value="Woman">Woman</option>
              <option value="Non-Binary">Non-Binary</option>
            </select>
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1">Interested In</label>
            <select
              value={formData.InterestedIn}
              onChange={e => setFormData(prev => ({ ...prev, InterestedIn: e.target.value as any }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            >
              <option value="Women">Women</option>
              <option value="Men">Men</option>
              <option value="Everyone">Everyone</option>
            </select>
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1">Age</label>
            <input
              type="number"
              min={18}
              max={99}
              required
              value={formData.Age}
              onChange={e => setFormData(prev => ({ ...prev, Age: Number(e.target.value) }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1">Occupation</label>
            <input
              type="text"
              value={formData.Occupation}
              onChange={e => setFormData(prev => ({ ...prev, Occupation: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[#111827] font-bold mb-1">Location</label>
            <input
              type="text"
              value={formData.Location}
              onChange={e => setFormData(prev => ({ ...prev, Location: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[#111827] font-bold mb-1">Bio</label>
            <textarea
              rows={2}
              value={formData.Bio}
              onChange={e => setFormData(prev => ({ ...prev, Bio: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[#111827] font-bold mb-1">
              Interests (comma separated)
            </label>
            <input
              type="text"
              value={formData.Interests}
              onChange={e => setFormData(prev => ({ ...prev, Interests: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[#111827] font-bold mb-1">
              Signature Icebreaker Answer
            </label>
            <input
              type="text"
              placeholder="e.g. If I won the lottery tomorrow..."
              value={formData.IcebreakerAnswer}
              onChange={e => setFormData(prev => ({ ...prev, IcebreakerAnswer: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
            />
          </div>
        </div>

        {/* Physical Characteristics & Lifestyle Section */}
        <div className="border-t border-pink-100 pt-6 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-[#111827] font-heading flex items-center gap-2">
              <Smile className="w-4 h-4 text-[#BE185D]" />
              Physical Characteristics & Lifestyle
            </h3>
            <p className="text-[#111827] font-medium">
              Provide your details so matches searching by traits can discover your profile.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#111827] font-bold mb-1">Hair Color</label>
              <select
                value={formData.HairColor}
                onChange={e => setFormData(prev => ({ ...prev, HairColor: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium"
              >
                {['Blonde', 'Brown', 'Black', 'Red', 'Gray/Silver', 'Bald', 'Other'].map(hc => (
                  <option key={hc} value={hc}>{hc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Eye Color</label>
              <select
                value={formData.EyeColor}
                onChange={e => setFormData(prev => ({ ...prev, EyeColor: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium"
              >
                {['Blue', 'Brown', 'Green', 'Hazel', 'Gray', 'Other'].map(ec => (
                  <option key={ec} value={ec}>{ec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Height (Feet & Inches)</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.HeightFeet}
                  onChange={e => setFormData(prev => ({ ...prev, HeightFeet: Number(e.target.value) }))}
                  className="w-full px-2 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium text-xs"
                >
                  {[4, 5, 6, 7].map(ft => (
                    <option key={ft} value={ft}>{ft} ft</option>
                  ))}
                </select>
                <select
                  value={formData.HeightInchesRem}
                  onChange={e => setFormData(prev => ({ ...prev, HeightInchesRem: Number(e.target.value) }))}
                  className="w-full px-2 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium text-xs"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inc => (
                    <option key={inc} value={inc}>{inc} in</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Smoking</label>
              <select
                value={formData.Smoking}
                onChange={e => setFormData(prev => ({ ...prev, Smoking: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium"
              >
                {['Non-smoker', 'Social smoker', 'Regular smoker'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Drinking</label>
              <select
                value={formData.Drinking}
                onChange={e => setFormData(prev => ({ ...prev, Drinking: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium"
              >
                {['Non-drinker', 'Social drinker', 'Regular drinker'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Children & Family</label>
              <select
                value={formData.Children}
                onChange={e => setFormData(prev => ({ ...prev, Children: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-medium"
              >
                {['Has children', 'Wants children', "Doesn't want children", 'Open to children'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Controls Section */}
        <div className="border-t border-pink-100 pt-6 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-[#111827] font-heading flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#BE185D]" />
              Profile Privacy Settings
            </h3>
            <p className="text-[#111827] font-medium">
              Control what personal information is visible to other members while browsing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'showHeight', label: 'Show my height publicly on profile', checked: formData.showHeight },
              { id: 'showSmoking', label: 'Show smoking preference publicly', checked: formData.showSmoking },
              { id: 'showDrinking', label: 'Show drinking preference publicly', checked: formData.showDrinking },
              { id: 'showChildren', label: 'Show children & family preference publicly', checked: formData.showChildren },
              { id: 'shareLocation', label: 'Share approximate distance / location', checked: formData.shareLocation },
            ].map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#FFF8FA] border border-pink-100 hover:border-pink-200 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={e => setFormData(prev => ({ ...prev, [item.id]: e.target.checked }))}
                  className="w-4 h-4 text-red-600 rounded-sm focus:ring-red-500"
                />
                <span className="font-semibold text-[#111827] text-xs">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dating Preferences Section */}
        <div className="border-t border-pink-100 pt-6 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-[#111827] font-heading flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#BE185D]" />
              Matching Criteria & Preferences
            </h3>
            <p className="text-[#111827] font-medium">Used for match filtering and Friday-night speed dating pairings</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[#111827] font-bold mb-1">Min Age</label>
              <input
                type="number"
                min={18}
                value={formData.ageMin}
                onChange={e => setFormData(prev => ({ ...prev, ageMin: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-bold"
              />
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Max Age</label>
              <input
                type="number"
                max={99}
                value={formData.ageMax}
                onChange={e => setFormData(prev => ({ ...prev, ageMax: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-bold"
              />
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Max Distance</label>
              <select
                value={formData.distanceMiles}
                onChange={e => setFormData(prev => ({ ...prev, distanceMiles: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-bold"
              >
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
                <option value={50}>50 miles (Demo Default)</option>
                <option value={100}>100 miles</option>
                <option value={250}>250 miles</option>
                <option value={0}>Anywhere</option>
              </select>
            </div>

            <div>
              <label className="block text-[#111827] font-bold mb-1">Relationship Intent</label>
              <select
                value={formData.intent}
                onChange={e => setFormData(prev => ({ ...prev, intent: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-300 text-[#111827] font-bold"
              >
                <option value="Any">Any Intention</option>
                <option value="Serious Relationship">Serious Relationship</option>
                <option value="Casual Dating">Casual Dating</option>
                <option value="Friendship First">Friendship First</option>
                <option value="Not Sure Yet">Not Sure Yet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Safety & Blocked Members Management */}
        <div className="border-t border-pink-100 pt-6 space-y-3 text-xs">
          <div>
            <h3 className="text-base font-bold text-[#111827] font-heading flex items-center gap-2">
              <Ban className="w-4 h-4 text-[#BE123C]" />
              Safety & Blocked Members
            </h3>
            <p className="text-[#111827] font-medium">Members you have blocked are hidden from your feed and cannot message you</p>
          </div>

          {blockedUsersList.length === 0 ? (
            <p className="text-[#111827] font-medium italic">No members currently blocked.</p>
          ) : (
            <div className="space-y-2">
              {blockedUsersList.map(u => (
                <div
                  key={u.UserID}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar user={u} size="sm" />
                    <span className="font-bold text-[#111827]">{u.FirstName} {u.LastName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => unblockUser(u.UserID)}
                    className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-[#111827] text-xs font-bold"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Owner Administration: Community Safety & In-App Reports */}
        {isOwner && (
          <div className="border-t-2 border-amber-200 pt-6 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/80 border-2 border-amber-300 space-y-4 shadow-xs">
              <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#78350F] font-heading flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#B45309] shrink-0" />
                    Owner Safety Administration: In-App Reports
                  </h3>
                  <p className="text-xs text-[#78350F] font-medium leading-relaxed max-w-xl">
                    Review member reports submitted via live video dates, singles browsing, and chats. Permanently ban offending accounts, terminate session tokens, and coordinate mandatory NCMEC filings.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('owner_reports')}
                    className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Safety Reports →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('owner_users')}
                    className="px-4 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Registered Users →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone: Permanent Account Deletion */}
        <div className="border-t-2 border-red-200 pt-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-red-50/70 border-2 border-red-200 space-y-4 shadow-xs">
            <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
              <div className="space-y-1">
                <h3 className="text-base font-black text-red-950 font-heading flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
                  Danger Zone: Permanent Account Deletion
                </h3>
                <p className="text-xs text-[#7F1D1D] font-medium leading-relaxed max-w-xl">
                  Permanently delete your Speed Meet Love account, profile information, photos, mutual matches, chat messages, confidential votes, private notes, and event registrations. This action is irreversible.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmEmailInput('');
                  setDeleteError(null);
                  setDeletionSuccessResult(null);
                  setIsDeleteModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </button>
            </div>

            <div className="text-[11px] text-[#7F1D1D] font-medium bg-white/80 p-3 rounded-2xl border border-red-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-[#7F1D1D]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                Permanent Data Removal & Retention Disclosures:
              </span>
              <p>
                Deleting your account purges your profile, avatar, photos, conversation history, and confidential speed dating ballots across all active systems. Ephemeral cloud edge web access logs (IP, user-agent, route, timestamp) are retained for up to 30 days by hosting infrastructure for DDoS and security monitoring. Any prior safety reports filed by other members may be retained to enforce platform bans. If you hold a paid web subscription, cancel it in the Stripe Customer Billing Portal (/pricing) prior to deletion; Stripe may retain transaction/invoice records as required for billing and legal compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-pink-100">
          <button
            type="button"
            onClick={resetDemoData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo Database
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs"
          >
            <Save className="w-4 h-4" />
            Save Profile Changes
          </button>
        </div>
      </form>

      {/* Interactive Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-red-300 space-y-5 animate-in fade-in zoom-in-95 my-8">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center text-[#B91C1C] shrink-0">
                  <Trash2 className="w-6 h-6 stroke-[2.25]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#111827] font-heading">
                    {deletionSuccessResult ? 'Account Deleted' : 'Permanently Delete Account?'}
                  </h3>
                  <p className="text-xs text-[#111827] font-medium">
                    {deletionSuccessResult ? 'Confirmation & Data Purge Report' : 'This action is irreversible and permanent.'}
                  </p>
                </div>
              </div>
              {!isDeleting && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="p-1.5 text-[#111827] hover:text-[#B91C1C] rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {deletionSuccessResult ? (
              /* Success View */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#064E3B] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#064E3B]">
                    <Check className="w-4 h-4 text-[#047857]" />
                    <span>Account Successfully Purged</span>
                  </div>
                  <p className="text-xs text-[#064E3B] font-medium leading-relaxed">
                    Your Speed Meet Love account, profile information, photos, mutual matches, chat messages, confidential votes, private notes, and event registrations have been permanently deleted from our active server systems.
                  </p>
                </div>

                {deletionSuccessResult.purged && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-[#111827] font-mono">
                    <p className="font-bold text-[#111827] font-sans text-xs">Purged Records Summary:</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-medium">
                      <div>Matches Purged: <span className="font-bold">{deletionSuccessResult.purged.matches ?? 0}</span></div>
                      <div>Votes &amp; Notes: <span className="font-bold">{deletionSuccessResult.purged.votes ?? 0}</span></div>
                      <div>Shared Rounds: <span className="font-bold">{deletionSuccessResult.purged.sharedRounds ?? 0}</span></div>
                      <div>Active Sessions: <span className="font-bold">{deletionSuccessResult.purged.sessions ?? 0}</span></div>
                    </div>
                  </div>
                )}

                {deletionSuccessResult.retentionExceptions && deletionSuccessResult.retentionExceptions.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1 text-[#78350F]">
                    <p className="font-bold text-[#78350F] text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                      Retention Exceptions Disclosures:
                    </p>
                    <ul className="list-disc pl-4 text-[11px] space-y-1 text-[#78350F] font-medium">
                      {deletionSuccessResult.retentionExceptions.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setCurrentView('home');
                    }}
                    className="w-full py-3 rounded-2xl btn-glossy-red-pink text-white font-extrabold text-sm shadow-md"
                  >
                    Return to Speed Meet Love Home
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation Form */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-xs text-[#7F1D1D]">
                  <p className="font-bold flex items-center gap-1.5 text-[#7F1D1D] text-sm">
                    <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                    What will be permanently deleted:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[#7F1D1D] font-medium text-xs">
                    <li>Your profile details, biography, and photos</li>
                    <li>All mutual match records and chat history</li>
                    <li>Confidential speed dating round votes (Like/Pass) and private notes</li>
                    <li>All event registrations and active video room access</li>
                    <li>Your server session tokens and credentials</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmEmail" className="block text-xs font-bold text-[#111827]">
                    To confirm deletion, type your registered email address ({currentUser.Email}):
                  </label>
                  <input
                    id="confirmEmail"
                    type="email"
                    value={confirmEmailInput}
                    onChange={e => {
                      setConfirmEmailInput(e.target.value);
                      if (deleteError) setDeleteError(null);
                    }}
                    placeholder={currentUser.Email || 'Enter your registered email'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-xs text-[#111827] font-medium"
                    disabled={isDeleting}
                    autoComplete="off"
                  />
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-[#9F1239] text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#BE123C] shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteError(null);
                    }}
                    disabled={isDeleting}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={
                      isDeleting ||
                      !confirmEmailInput.trim() ||
                      confirmEmailInput.trim().toLowerCase() !== (currentUser.Email || '').trim().toLowerCase()
                    }
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs shadow-md shadow-red-600/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Purging Records on Server...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Permanently Delete My Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
