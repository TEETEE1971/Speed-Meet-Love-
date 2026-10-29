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
  Lock
} from 'lucide-react';
import { Avatar } from './Avatar';

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
  } = useApp();

  const [formData, setFormData] = useState({
    FirstName: currentUser.FirstName,
    LastName: currentUser.LastName,
    Email: currentUser.Email,
    Gender: currentUser.Gender,
    InterestedIn: currentUser.InterestedIn,
    Age: currentUser.Age || 0,
    Location: currentUser.Location || '',
    Occupation: currentUser.Occupation || '',
    Bio: currentUser.Bio || '',
    Interests: currentUser.Interests.join(', '),
    IcebreakerAnswer: currentUser.IcebreakerAnswer || '',
    AvatarColor: currentUser.AvatarColor || '#FF2E93',
    // Physical & lifestyle traits
    HairColor: currentUser.HairColor || 'Brown',
    HeightFeet: Math.floor((currentUser.HeightInches || 68) / 12),
    HeightInchesRem: (currentUser.HeightInches || 68) % 12,
    EyeColor: currentUser.EyeColor || 'Brown',
    RelationshipIntent: currentUser.RelationshipIntent || 'Serious Relationship',
    Smoking: currentUser.Smoking || 'Non-smoker',
    Drinking: currentUser.Drinking || 'Social drinker',
    Children: currentUser.Children || 'Open to children',
    // Privacy
    showHeight: currentUser.PrivacySettings?.showHeight ?? true,
    showSmoking: currentUser.PrivacySettings?.showSmoking ?? true,
    showDrinking: currentUser.PrivacySettings?.showDrinking ?? true,
    showChildren: currentUser.PrivacySettings?.showChildren ?? true,
    shareLocation: currentUser.PrivacySettings?.shareLocation ?? true,
    // Preferences
    ageMin: currentUser.Preferences.ageMin || 30,
    ageMax: currentUser.Preferences.ageMax || 55,
    distanceMiles: currentUser.Preferences.distanceMiles ?? 50,
    intent: currentUser.Preferences.intent || 'Any',
  });

  useEffect(() => {
    setFormData({
      FirstName: currentUser.FirstName,
      LastName: currentUser.LastName,
      Email: currentUser.Email,
      Gender: currentUser.Gender,
      InterestedIn: currentUser.InterestedIn,
      Age: currentUser.Age || 0,
      Location: currentUser.Location || '',
      Occupation: currentUser.Occupation || '',
      Bio: currentUser.Bio || '',
      Interests: currentUser.Interests.join(', '),
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
      ageMin: currentUser.Preferences.ageMin || 30,
      ageMax: currentUser.Preferences.ageMax || 55,
      distanceMiles: currentUser.Preferences.distanceMiles ?? 50,
      intent: currentUser.Preferences.intent || 'Any',
    });
  }, [currentUser]);

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
        <Avatar user={{ ...currentUser, AvatarColor: formData.AvatarColor }} size="2xl" showBadge />
        <div className="text-center sm:text-left space-y-1 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 font-heading">
              {currentUser.LastName ? `${currentUser.FirstName} ${currentUser.LastName}` : currentUser.FirstName}
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-pink-50 text-[#FF2E93] border border-pink-200 font-bold">
              {currentUser.SubscriptionTier} Tier
            </span>
            {currentUser.ProfilePhoto && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                Private Demonstration Profile
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            {currentUser.Occupation ? currentUser.Occupation : 'Occupation not set'} · {currentUser.Location ? currentUser.Location : 'Location not set'}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
            <button
              onClick={() => setCurrentView('pricing')}
              className="text-[#FF2E93] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              Manage Membership
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-pink-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#FF2E93]" />
            Personal Profile & Photo Avatar
          </h2>
          <p className="text-xs text-slate-500">Visible to other singles when browsing and during speed rounds</p>
        </div>

        {/* Avatar Color Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#FF2E93]" />
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
            <label className="block text-slate-700 font-semibold mb-1">First Name</label>
            <input
              type="text"
              required
              value={formData.FirstName}
              onChange={e => setFormData(prev => ({ ...prev, FirstName: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
            <input
              type="text"
              required
              value={formData.LastName}
              onChange={e => setFormData(prev => ({ ...prev, LastName: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Gender</label>
            <select
              value={formData.Gender}
              onChange={e => setFormData(prev => ({ ...prev, Gender: e.target.value as any }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            >
              <option value="Man">Man</option>
              <option value="Woman">Woman</option>
              <option value="Non-Binary">Non-Binary</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Interested In</label>
            <select
              value={formData.InterestedIn}
              onChange={e => setFormData(prev => ({ ...prev, InterestedIn: e.target.value as any }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            >
              <option value="Women">Women</option>
              <option value="Men">Men</option>
              <option value="Everyone">Everyone</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Age</label>
            <input
              type="number"
              min={18}
              max={99}
              required
              value={formData.Age}
              onChange={e => setFormData(prev => ({ ...prev, Age: Number(e.target.value) }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Occupation</label>
            <input
              type="text"
              value={formData.Occupation}
              onChange={e => setFormData(prev => ({ ...prev, Occupation: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">Location</label>
            <input
              type="text"
              value={formData.Location}
              onChange={e => setFormData(prev => ({ ...prev, Location: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">Bio</label>
            <textarea
              rows={2}
              value={formData.Bio}
              onChange={e => setFormData(prev => ({ ...prev, Bio: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">
              Interests (comma separated)
            </label>
            <input
              type="text"
              value={formData.Interests}
              onChange={e => setFormData(prev => ({ ...prev, Interests: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">
              Signature Icebreaker Answer
            </label>
            <input
              type="text"
              placeholder="e.g. If I won the lottery tomorrow..."
              value={formData.IcebreakerAnswer}
              onChange={e => setFormData(prev => ({ ...prev, IcebreakerAnswer: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF2E93]"
            />
          </div>
        </div>

        {/* Physical Characteristics & Lifestyle Section */}
        <div className="border-t border-pink-100 pt-6 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Smile className="w-4 h-4 text-[#FF2E93]" />
              Physical Characteristics & Lifestyle
            </h3>
            <p className="text-slate-500">
              Provide your details so matches searching by traits can discover your profile.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Hair Color</label>
              <select
                value={formData.HairColor}
                onChange={e => setFormData(prev => ({ ...prev, HairColor: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
              >
                {['Blonde', 'Brown', 'Black', 'Red', 'Gray/Silver', 'Bald', 'Other'].map(hc => (
                  <option key={hc} value={hc}>{hc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Eye Color</label>
              <select
                value={formData.EyeColor}
                onChange={e => setFormData(prev => ({ ...prev, EyeColor: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
              >
                {['Blue', 'Brown', 'Green', 'Hazel', 'Gray', 'Other'].map(ec => (
                  <option key={ec} value={ec}>{ec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Height (Feet & Inches)</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.HeightFeet}
                  onChange={e => setFormData(prev => ({ ...prev, HeightFeet: Number(e.target.value) }))}
                  className="w-full px-2 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 text-xs"
                >
                  {[4, 5, 6, 7].map(ft => (
                    <option key={ft} value={ft}>{ft} ft</option>
                  ))}
                </select>
                <select
                  value={formData.HeightInchesRem}
                  onChange={e => setFormData(prev => ({ ...prev, HeightInchesRem: Number(e.target.value) }))}
                  className="w-full px-2 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 text-xs"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inc => (
                    <option key={inc} value={inc}>{inc} in</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Smoking</label>
              <select
                value={formData.Smoking}
                onChange={e => setFormData(prev => ({ ...prev, Smoking: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
              >
                {['Non-smoker', 'Social smoker', 'Regular smoker'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Drinking</label>
              <select
                value={formData.Drinking}
                onChange={e => setFormData(prev => ({ ...prev, Drinking: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
              >
                {['Non-drinker', 'Social drinker', 'Regular drinker'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Children & Family</label>
              <select
                value={formData.Children}
                onChange={e => setFormData(prev => ({ ...prev, Children: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
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
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF2E93]" />
              Profile Privacy Settings
            </h3>
            <p className="text-slate-500">
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
                <span className="font-semibold text-slate-800 text-xs">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dating Preferences Section */}
        <div className="border-t border-pink-100 pt-6 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#FF2E93]" />
              Matching Criteria & Preferences
            </h3>
            <p className="text-slate-500">Used for match filtering and Friday-night speed dating pairings</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Min Age</label>
              <input
                type="number"
                min={18}
                value={formData.ageMin}
                onChange={e => setFormData(prev => ({ ...prev, ageMin: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Max Age</label>
              <input
                type="number"
                max={99}
                value={formData.ageMax}
                onChange={e => setFormData(prev => ({ ...prev, ageMax: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Max Distance</label>
              <select
                value={formData.distanceMiles}
                onChange={e => setFormData(prev => ({ ...prev, distanceMiles: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 font-bold"
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
              <label className="block text-slate-700 font-semibold mb-1">Relationship Intent</label>
              <select
                value={formData.intent}
                onChange={e => setFormData(prev => ({ ...prev, intent: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900 font-bold"
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
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-500" />
              Safety & Blocked Members
            </h3>
            <p className="text-slate-500">Members you have blocked are hidden from your feed and cannot message you</p>
          </div>

          {blockedUsersList.length === 0 ? (
            <p className="text-slate-400 italic">No members currently blocked.</p>
          ) : (
            <div className="space-y-2">
              {blockedUsersList.map(u => (
                <div
                  key={u.UserID}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar user={u} size="sm" />
                    <span className="font-bold text-slate-800">{u.FirstName} {u.LastName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => unblockUser(u.UserID)}
                    className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-pink-100">
          <button
            type="button"
            onClick={resetDemoData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors"
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
    </div>
  );
};
