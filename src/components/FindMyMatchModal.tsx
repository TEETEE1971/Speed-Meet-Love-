import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Sparkles,
  Heart,
  RotateCcw,
  Check,
  MapPin,
  Users,
  Ruler,
  Eye,
  Smile,
  Flame,
  Wine,
  Cigarette,
  Baby,
  Tag
} from 'lucide-react';
import {
  UserPreferences,
  DEFAULT_DEMO_PREFERENCES,
  HairColorOption,
  EyeColorOption,
  RelationshipIntentOption,
  SmokingOption,
  DrinkingOption,
  ChildrenOption,
  User
} from '../types';

interface FindMyMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: UserPreferences;
  onApply: (prefs: UserPreferences) => void;
  allCandidates: User[];
  onResetDefaults: () => void;
  onClearAll: () => void;
}

const HAIR_COLORS: HairColorOption[] = ['Any', 'Blonde', 'Brown', 'Black', 'Red', 'Gray/Silver', 'Bald', 'Other'];
const EYE_COLORS: EyeColorOption[] = ['Any', 'Blue', 'Brown', 'Green', 'Hazel', 'Gray', 'Other'];
const RELATIONSHIP_INTENTS: RelationshipIntentOption[] = [
  'Any',
  'Serious Relationship',
  'Casual Dating',
  'Friendship First',
  'Not Sure Yet',
];
const SMOKING_OPTIONS: SmokingOption[] = ['Any', 'Non-smoker', 'Social smoker', 'Regular smoker'];
const DRINKING_OPTIONS: DrinkingOption[] = ['Any', 'Non-drinker', 'Social drinker', 'Regular drinker'];
const CHILDREN_OPTIONS: ChildrenOption[] = [
  'Any',
  'Has children',
  'Wants children',
  "Doesn't want children",
  'Open to children',
];

const DISTANCE_OPTIONS = [
  { label: '10 miles', value: 10 },
  { label: '25 miles', value: 25 },
  { label: '50 miles (Demo)', value: 50 },
  { label: '100 miles', value: 100 },
  { label: '250 miles', value: 250 },
  { label: 'Anywhere', value: 0 },
];

const POPULAR_INTERESTS = [
  'Travel',
  'Hiking',
  'Cooking',
  'Coffee Roasting',
  'Photography',
  'Live Music',
  'Art',
  'Design',
  'Fitness',
  'Sailing',
  'Wine Tasting',
  'Architecture',
  'Cinematography',
  'Board Games',
  'Sci-Fi Books',
];

export const formatHeightLabel = (inches?: number): string => {
  if (!inches || inches <= 0) return 'Any height';
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${feet}'${rem}"`;
};

export const FindMyMatchModal: React.FC<FindMyMatchModalProps> = ({
  isOpen,
  onClose,
  currentPreferences,
  onApply,
  allCandidates,
  onResetDefaults,
  onClearAll,
}) => {
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(() => ({
    ...DEFAULT_DEMO_PREFERENCES,
    ...currentPreferences,
  }));

  // Keep in sync when modal opens or currentPreferences changes
  useEffect(() => {
    if (isOpen) {
      setLocalPrefs({
        ...DEFAULT_DEMO_PREFERENCES,
        ...currentPreferences,
      });
    }
  }, [isOpen, currentPreferences]);

  if (!isOpen) return null;

  // Calculate live matching count based on localPrefs
  const previewMatchesCount = allCandidates.filter(u => {
    // Age
    if (localPrefs.ageMin && u.Age < localPrefs.ageMin) return false;
    if (localPrefs.ageMax && u.Age > localPrefs.ageMax) return false;

    // Gender
    if (localPrefs.gender && localPrefs.gender !== 'Any') {
      if (localPrefs.gender === 'Women' && u.Gender !== 'Woman') return false;
      if (localPrefs.gender === 'Men' && u.Gender !== 'Man') return false;
      if (localPrefs.gender === 'Non-Binary' && u.Gender !== 'Non-Binary') return false;
    }

    // Distance
    if (localPrefs.distanceMiles && localPrefs.distanceMiles > 0) {
      const dist = u.DistanceMiles ?? 15;
      if (dist > localPrefs.distanceMiles) return false;
    }

    // Hair Color
    if (localPrefs.hairColor && localPrefs.hairColor !== 'Any') {
      if (u.HairColor && u.HairColor !== localPrefs.hairColor) return false;
    }

    // Height
    if (localPrefs.heightMinInches && localPrefs.heightMinInches > 0) {
      const h = u.HeightInches ?? 68;
      if (h < localPrefs.heightMinInches) return false;
    }
    if (localPrefs.heightMaxInches && localPrefs.heightMaxInches > 0) {
      const h = u.HeightInches ?? 68;
      if (h > localPrefs.heightMaxInches) return false;
    }

    // Eye Color
    if (localPrefs.eyeColor && localPrefs.eyeColor !== 'Any') {
      if (u.EyeColor && u.EyeColor !== localPrefs.eyeColor) return false;
    }

    // Relationship Intent
    if (localPrefs.intent && localPrefs.intent !== 'Any') {
      const userIntent = u.RelationshipIntent || u.Preferences?.intent;
      if (userIntent && userIntent !== localPrefs.intent) return false;
    }

    // Smoking
    if (localPrefs.smoking && localPrefs.smoking !== 'Any') {
      if (u.Smoking && u.Smoking !== localPrefs.smoking) return false;
    }

    // Drinking
    if (localPrefs.drinking && localPrefs.drinking !== 'Any') {
      if (u.Drinking && u.Drinking !== localPrefs.drinking) return false;
    }

    // Children
    if (localPrefs.children && localPrefs.children !== 'Any') {
      if (u.Children && u.Children !== localPrefs.children) return false;
    }

    // Interests
    if (localPrefs.interests && localPrefs.interests.length > 0) {
      const hasShared = localPrefs.interests.some(fav =>
        u.Interests.some(i => i.toLowerCase().includes(fav.toLowerCase()))
      );
      if (!hasShared) return false;
    }

    return true;
  }).length;

  const handleApply = () => {
    onApply(localPrefs);
    onClose();
  };

  const handleReset = () => {
    setLocalPrefs({ ...DEFAULT_DEMO_PREFERENCES });
    onResetDefaults();
  };

  const handleClear = () => {
    const cleared: UserPreferences = {
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
    };
    setLocalPrefs(cleared);
    onClearAll();
  };

  const toggleInterest = (interest: string) => {
    const current = localPrefs.interests || [];
    if (current.includes(interest)) {
      setLocalPrefs(prev => ({
        ...prev,
        interests: (prev.interests || []).filter(i => i !== interest),
      }));
    } else {
      setLocalPrefs(prev => ({
        ...prev,
        interests: [...(prev.interests || []), interest],
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#16042E] rounded-3xl shadow-[0_0_40px_rgba(0,245,212,0.35)] border-3 border-[#00F5D4] flex flex-col max-h-[92vh] overflow-hidden text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-match-title"
      >
        {/* Modal Header: Deep Electric Purple with Glowing Turquoise Border */}
        <div className="bg-gradient-to-r from-[#240B48] via-[#2F0D5C] to-[#1E0938] px-6 py-4 border-b-2 border-[#00F5D4] text-white flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF1493] flex items-center justify-center text-white border-2 border-white shadow-[0_0_15px_rgba(255,20,147,0.6)]">
              <SlidersHorizontal className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 id="find-match-title" className="text-xl sm:text-2xl font-black font-heading tracking-tight text-white flex items-center gap-2">
                Find My Match
                <Sparkles className="w-5 h-5 text-[#00F5D4] fill-[#00F5D4] animate-pulse" />
              </h2>
              <p className="text-xs text-[#00F5D4] font-extrabold tracking-wide">
                Glowing Neon Search & Dating Filters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#240B48] hover:bg-[#FF1493] text-[#00F5D4] hover:text-white flex items-center justify-center transition-all cursor-pointer border-2 border-[#00F5D4] shadow-md"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Scrollable Body: Deep Electric Purple */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-white bg-[#16042E]">
          
          {/* Neon Matches Banner */}
          <div className="p-4 rounded-2xl bg-[#240D48] border-2 border-[#00F5D4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,245,212,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF007F] to-[#FF1493] text-white flex items-center justify-center font-black text-lg shrink-0 border-2 border-white shadow-[0_0_12px_rgba(255,20,147,0.7)]">
                {previewMatchesCount}
              </div>
              <div>
                <p className="text-sm font-black text-white font-heading tracking-wide">
                  {previewMatchesCount} {previewMatchesCount === 1 ? 'Single matches' : 'Singles match'} your criteria
                </p>
                <p className="text-xs text-purple-200 font-bold">
                  {localPrefs.ageMin === 30 && localPrefs.ageMax === 55 && localPrefs.distanceMiles === 50
                    ? 'Default Demo Settings (Age 30–55 within 50 miles)'
                    : 'Custom neon filter combination active'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-black text-[#00F5D4] hover:text-white hover:underline px-2.5 py-1.5 rounded-lg bg-[#18062E] border border-[#00F5D4] cursor-pointer flex items-center gap-1 transition-all shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-black text-pink-300 hover:text-white hover:underline px-2.5 py-1.5 rounded-lg bg-[#18062E] border border-pink-500/50 cursor-pointer transition-all"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* 1. Age Range Filter */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
                <Users className="w-5 h-5 text-[#00F5D4]" />
                Age Range: <span className="text-[#FF1493] font-black">{localPrefs.ageMin} – {localPrefs.ageMax >= 80 ? '80+' : localPrefs.ageMax}</span>
              </label>
              <span className="text-xs font-black text-[#00F5D4] bg-[#240D48] px-2.5 py-1 rounded-full border border-[#00F5D4]">
                18 to 80+
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-purple-200 mb-1.5 uppercase tracking-wider">
                  Minimum Age
                </label>
                <input
                  type="number"
                  min={18}
                  max={localPrefs.ageMax || 80}
                  value={localPrefs.ageMin}
                  onChange={e => {
                    const val = Math.max(18, Math.min(Number(e.target.value) || 18, localPrefs.ageMax || 80));
                    setLocalPrefs(prev => ({ ...prev, ageMin: val }));
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-[#00F5D4] text-white font-black text-base focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-200 mb-1.5 uppercase tracking-wider">
                  Maximum Age
                </label>
                <input
                  type="number"
                  min={localPrefs.ageMin || 18}
                  max={85}
                  value={localPrefs.ageMax}
                  onChange={e => {
                    const val = Math.max(localPrefs.ageMin || 18, Math.min(Number(e.target.value) || 85, 85));
                    setLocalPrefs(prev => ({ ...prev, ageMax: val }));
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-[#00F5D4] text-white font-black text-base focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick age preset buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { label: '30–55 (Demo Default)', min: 30, max: 55 },
                { label: '18–35', min: 18, max: 35 },
                { label: '35–50', min: 35, max: 50 },
                { label: '45–65', min: 45, max: 65 },
                { label: 'All Ages (18–80+)', min: 18, max: 80 },
              ].map(preset => {
                const isSelected = localPrefs.ageMin === preset.min && localPrefs.ageMax === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setLocalPrefs(prev => ({ ...prev, ageMin: preset.min, ageMax: preset.max }))}
                    className={`px-3 py-1.5 text-xs rounded-xl font-black transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-[#FF1493] text-white border-white shadow-[0_0_12px_rgba(255,20,147,0.7)]'
                        : 'bg-[#240D48] text-white hover:bg-[#2D0F55] border-[#00F5D4]/60 hover:border-[#00F5D4]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Gender and Interested In */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
              <Heart className="w-5 h-5 text-[#FF1493] fill-[#FF1493]" />
              Gender Preference
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Any', value: 'Any' },
                { label: 'Women', value: 'Women' },
                { label: 'Men', value: 'Men' },
                { label: 'Non-Binary', value: 'Non-Binary' },
              ].map(opt => {
                const isSelected = (localPrefs.gender || 'Any') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocalPrefs(prev => ({ ...prev, gender: opt.value as any }))}
                    className={`px-4 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#FF007F] via-[#FF1493] to-[#FF2E93] text-white border-white shadow-[0_0_15px_rgba(255,20,147,0.8)] scale-102'
                        : 'bg-[#240D48] text-white border-[#00F5D4]/60 hover:border-[#00F5D4] hover:bg-[#2D0F55]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Distance Filter */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
                <MapPin className="w-5 h-5 text-[#00F5D4]" />
                Maximum Distance
              </label>
              <span className="text-xs font-black text-[#FF1493] bg-[#240D48] px-3 py-1 rounded-full border border-[#FF1493]">
                {localPrefs.distanceMiles === 0 || !localPrefs.distanceMiles ? 'Anywhere' : `Within ${localPrefs.distanceMiles} miles`}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DISTANCE_OPTIONS.map(d => {
                const isSelected = (localPrefs.distanceMiles ?? 50) === d.value;
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setLocalPrefs(prev => ({ ...prev, distanceMiles: d.value }))}
                    className={`px-2 py-2.5 rounded-2xl font-black text-xs text-center transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-[#FF1493] text-white border-white shadow-[0_0_12px_rgba(255,20,147,0.7)]'
                        : 'bg-[#240D48] text-white border-[#00F5D4]/60 hover:border-[#00F5D4] hover:bg-[#2D0F55]'
                    }`}
                  >
                    {d.value === 0 ? 'Anywhere' : `${d.value} mi`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Physical Characteristics: Hair Color & Eye Color Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b-2 border-purple-900/60">
            <div>
              <label className="text-sm font-black text-white flex items-center gap-2 font-heading mb-2">
                <Smile className="w-4 h-4 text-[#00F5D4]" />
                Hair Color
              </label>
              <select
                value={localPrefs.hairColor || 'Any'}
                onChange={e => setLocalPrefs(prev => ({ ...prev, hairColor: e.target.value as HairColorOption }))}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {HAIR_COLORS.map(color => (
                  <option key={color} value={color} className="bg-[#1E0938] text-white font-bold">
                    {color === 'Any' ? 'Any Hair Color' : color}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-white flex items-center gap-2 font-heading mb-2">
                <Eye className="w-4 h-4 text-[#00F5D4]" />
                Eye Color
              </label>
              <select
                value={localPrefs.eyeColor || 'Any'}
                onChange={e => setLocalPrefs(prev => ({ ...prev, eyeColor: e.target.value as EyeColorOption }))}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {EYE_COLORS.map(color => (
                  <option key={color} value={color} className="bg-[#1E0938] text-white font-bold">
                    {color === 'Any' ? 'Any Eye Color' : color}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Height Filter Dropdowns */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
                <Ruler className="w-5 h-5 text-[#00F5D4]" />
                Height Preference
              </label>
              <span className="text-xs font-black text-[#FF1493] bg-[#240D48] px-3 py-1 rounded-full border border-[#FF1493]">
                {(!localPrefs.heightMinInches && !localPrefs.heightMaxInches)
                  ? 'Any height'
                  : `${formatHeightLabel(localPrefs.heightMinInches)} to ${formatHeightLabel(localPrefs.heightMaxInches)}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-purple-200 mb-1.5 uppercase tracking-wider">
                  Minimum Height
                </label>
                <select
                  value={localPrefs.heightMinInches || 0}
                  onChange={e => setLocalPrefs(prev => ({ ...prev, heightMinInches: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
                >
                  <option value={0} className="bg-[#1E0938] text-white">Any Height (No minimum)</option>
                  {[58, 60, 62, 64, 66, 68, 70, 72, 74, 76].map(inches => (
                    <option key={inches} value={inches} className="bg-[#1E0938] text-white">
                      {formatHeightLabel(inches)} ({Math.floor(inches / 12)} ft {inches % 12} in)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-purple-200 mb-1.5 uppercase tracking-wider">
                  Maximum Height
                </label>
                <select
                  value={localPrefs.heightMaxInches || 0}
                  onChange={e => setLocalPrefs(prev => ({ ...prev, heightMaxInches: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
                >
                  <option value={0} className="bg-[#1E0938] text-white">Any Height (No maximum)</option>
                  {[62, 64, 66, 68, 70, 72, 74, 76, 78, 80].map(inches => (
                    <option key={inches} value={inches} className="bg-[#1E0938] text-white">
                      {formatHeightLabel(inches)} ({Math.floor(inches / 12)} ft {inches % 12} in)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 6. Relationship Intentions */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
              <Flame className="w-5 h-5 text-[#FF1493]" />
              Relationship Intentions
            </label>
            <div className="flex flex-wrap gap-2.5">
              {RELATIONSHIP_INTENTS.map(intent => {
                const isSelected = (localPrefs.intent || 'Any') === intent;
                return (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => setLocalPrefs(prev => ({ ...prev, intent }))}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#FF007F] to-[#FF1493] text-white border-white shadow-[0_0_15px_rgba(255,20,147,0.7)] scale-102'
                        : 'bg-[#240D48] text-white border-[#00F5D4]/60 hover:border-[#00F5D4] hover:bg-[#2D0F55]'
                    }`}
                  >
                    {intent === 'Any' ? 'Any Intention' : intent}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Lifestyle: Smoking, Drinking, Children Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b-2 border-purple-900/60">
            <div>
              <label className="text-xs font-black text-white flex items-center gap-1.5 font-heading mb-2">
                <Cigarette className="w-4 h-4 text-[#00F5D4]" />
                Smoking Preference
              </label>
              <select
                value={localPrefs.smoking || 'Any'}
                onChange={e => setLocalPrefs(prev => ({ ...prev, smoking: e.target.value as SmokingOption }))}
                className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-xs sm:text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {SMOKING_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#1E0938] text-white font-bold">
                    {opt === 'Any' ? 'Any Smoking' : opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-white flex items-center gap-1.5 font-heading mb-2">
                <Wine className="w-4 h-4 text-[#FF1493]" />
                Drinking Preference
              </label>
              <select
                value={localPrefs.drinking || 'Any'}
                onChange={e => setLocalPrefs(prev => ({ ...prev, drinking: e.target.value as DrinkingOption }))}
                className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-xs sm:text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {DRINKING_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#1E0938] text-white font-bold">
                    {opt === 'Any' ? 'Any Drinking' : opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-white flex items-center gap-1.5 font-heading mb-2">
                <Baby className="w-4 h-4 text-[#00F5D4]" />
                Children & Family
              </label>
              <select
                value={localPrefs.children || 'Any'}
                onChange={e => setLocalPrefs(prev => ({ ...prev, children: e.target.value as ChildrenOption }))}
                className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-xs sm:text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {CHILDREN_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#1E0938] text-white font-bold">
                    {opt === 'Any' ? 'Any Preference' : opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 8. Interests & Hobbies Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
                <Tag className="w-5 h-5 text-[#00F5D4]" />
                Interests & Hobbies
              </label>
              {(localPrefs.interests || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setLocalPrefs(prev => ({ ...prev, interests: [] }))}
                  className="text-xs text-[#00F5D4] hover:underline font-black cursor-pointer"
                >
                  Clear ({localPrefs.interests?.length})
                </button>
              )}
            </div>
            <p className="text-xs text-purple-200 font-bold">
              Select interests to prioritize singles who share your passions.
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_INTERESTS.map(interest => {
                const isSelected = (localPrefs.interests || []).includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
                      isSelected
                        ? 'bg-[#FF1493] text-white border-white shadow-[0_0_12px_rgba(255,20,147,0.7)]'
                        : 'bg-[#240D48] text-white border-[#00F5D4]/50 hover:border-[#00F5D4] hover:bg-[#2D0F55]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer with Actions: Deep Electric Purple & Glowing Turquoise */}
        <div className="bg-[#1E0938] px-6 py-4 border-t-2 border-[#00F5D4] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-2xl">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-[#00F5D4] text-[#00F5D4] hover:bg-[#00F5D4] hover:text-[#120326] font-black text-xs transition-all cursor-pointer shadow-sm"
            >
              Reset to Demo (30–55)
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-purple-500/60 text-purple-200 hover:text-white hover:bg-[#341366] font-black text-xs transition-all cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl border-2 border-purple-400 text-purple-100 hover:bg-purple-900/50 font-black text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-initial px-7 py-3 rounded-2xl bg-gradient-to-r from-[#FF007F] via-[#FF1493] to-[#FF2E93] text-white font-black text-xs sm:text-sm border-2 border-white shadow-[0_0_20px_rgba(255,20,147,0.7)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4 fill-white text-white" />
              Apply Filters ({previewMatchesCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
