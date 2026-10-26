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
  Check
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
    ageMin: currentUser.Preferences.ageMin,
    ageMax: currentUser.Preferences.ageMax,
    maxDistanceKm: currentUser.Preferences.maxDistanceKm,
    intent: currentUser.Preferences.intent,
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
      ageMin: currentUser.Preferences.ageMin,
      ageMax: currentUser.Preferences.ageMax,
      maxDistanceKm: currentUser.Preferences.maxDistanceKm,
      intent: currentUser.Preferences.intent,
    });
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const interestsList = formData.Interests.split(',')
      .map(s => s.trim())
      .filter(Boolean);

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
      Preferences: {
        ageMin: Number(formData.ageMin),
        ageMax: Number(formData.ageMax),
        maxDistanceKm: Number(formData.maxDistanceKm),
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

        {/* Dating Preferences Section */}
        <div className="border-t border-pink-100 pt-6 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#FF2E93]" />
              Matching Criteria & Preferences
            </h3>
            <p className="text-slate-500">Used for match filtering and Friday-night speed dating pairings</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Min Age</label>
              <input
                type="number"
                min={18}
                value={formData.ageMin}
                onChange={e => setFormData(prev => ({ ...prev, ageMin: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Max Age</label>
              <input
                type="number"
                max={99}
                value={formData.ageMax}
                onChange={e => setFormData(prev => ({ ...prev, ageMax: Number(e.target.value) }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Relationship Intent</label>
              <select
                value={formData.intent}
                onChange={e => setFormData(prev => ({ ...prev, intent: e.target.value as any }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FFF8FA] border border-slate-200 text-slate-900"
              >
                <option value="Long-term relationship">Long-term relationship</option>
                <option value="Dating & chemistry">Dating & chemistry</option>
                <option value="Marriage minded">Marriage minded</option>
                <option value="Casual & fun">Casual & fun</option>
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
