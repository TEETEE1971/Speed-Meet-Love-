import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  SlidersHorizontal,
  Sparkles,
  Heart,
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
  Tag,
  Search,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  UserPreferences,
  HairColorOption,
  EyeColorOption,
  RelationshipIntentOption,
  SmokingOption,
  DrinkingOption,
  ChildrenOption,
  User,
} from '../types';
import {
  HAIR_COLOR_OPTIONS,
  EYE_COLOR_OPTIONS,
  RELATIONSHIP_INTENT_OPTIONS,
  SMOKING_OPTIONS,
  DRINKING_OPTIONS,
  CHILDREN_OPTIONS,
  HEIGHT_INCHES_OPTIONS,
  DEFAULT_SEARCH_PREFERENCES,
  formatHeightLabel,
  normalizeSearchPreferences,
  validateSearchInputs,
  filterMembers,
} from '../utils/memberSearch';

export { formatHeightLabel };

interface FindMyMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: UserPreferences;
  onApply: (prefs: UserPreferences) => void;
  allCandidates: User[];
  onClearAll: () => void;
}

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

export const FindMyMatchModal: React.FC<FindMyMatchModalProps> = ({
  isOpen,
  onClose,
  currentPreferences,
  onApply,
  allCandidates,
  onClearAll,
}) => {
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(() =>
    normalizeSearchPreferences(currentPreferences)
  );
  const [ageMinInput, setAgeMinInput] = useState<string>('');
  const [ageMaxInput, setAgeMaxInput] = useState<string>('');
  const [distanceInput, setDistanceInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync draft state whenever modal opens or saved preferences update
  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeSearchPreferences(currentPreferences);
      setLocalPrefs(normalized);
      setAgeMinInput(normalized.ageMin != null ? String(normalized.ageMin) : '');
      setAgeMaxInput(normalized.ageMax != null ? String(normalized.ageMax) : '');
      setDistanceInput(normalized.distanceMiles != null ? String(normalized.distanceMiles) : '');
      setFormError(null);
    }
  }, [isOpen, currentPreferences]);

  const validation = useMemo(
    () =>
      validateSearchInputs({
        ageMinInput,
        ageMaxInput,
        distanceInput,
        heightMinInches: localPrefs.heightMinInches,
        heightMaxInches: localPrefs.heightMaxInches,
      }),
    [ageMinInput, ageMaxInput, distanceInput, localPrefs.heightMinInches, localPrefs.heightMaxInches]
  );

  const effectiveDraftPrefs = useMemo<UserPreferences>(
    () => ({
      ...localPrefs,
      ageMin: validation.valid ? validation.ageMin : localPrefs.ageMin ?? null,
      ageMax: validation.valid ? validation.ageMax : localPrefs.ageMax ?? null,
      distanceMiles: validation.valid ? validation.distanceMiles : localPrefs.distanceMiles ?? null,
    }),
    [localPrefs, validation]
  );

  const previewMatchesCount = useMemo(() => {
    if (!validation.valid) return 0;
    return filterMembers(allCandidates, effectiveDraftPrefs).length;
  }, [allCandidates, effectiveDraftPrefs, validation.valid]);

  if (!isOpen) return null;

  const ageBadgeText = (() => {
    const minVal = validation.valid ? validation.ageMin : null;
    const maxVal = validation.valid ? validation.ageMax : null;
    if (minVal != null && maxVal != null) return `Ages ${minVal} – ${maxVal}`;
    if (minVal != null) return `Ages ${minVal}+`;
    if (maxVal != null) return `Ages up to ${maxVal}`;
    return 'All ages';
  })();

  const distanceBadgeText =
    validation.valid && validation.distanceMiles != null
      ? `Within ${validation.distanceMiles} ${validation.distanceMiles === 1 ? 'mile' : 'miles'}`
      : 'Any distance';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid) {
      setFormError(validation.error || 'Please check your search filters.');
      return;
    }
    setFormError(null);
    const nextPrefs = normalizeSearchPreferences({
      ...localPrefs,
      ageMin: validation.ageMin,
      ageMax: validation.ageMax,
      distanceMiles: validation.distanceMiles,
    });
    onApply(nextPrefs);
    onClose();
  };

  const handleClear = () => {
    const cleared = { ...DEFAULT_SEARCH_PREFERENCES, interests: [] };
    setLocalPrefs(cleared);
    setAgeMinInput('');
    setAgeMaxInput('');
    setDistanceInput('');
    setFormError(null);
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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-[#16042E] rounded-3xl shadow-[0_0_40px_rgba(0,245,212,0.35)] border-3 border-[#00F5D4] flex flex-col max-h-[92vh] overflow-hidden text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-match-title"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#240B48] via-[#2F0D5C] to-[#1E0938] px-6 py-4 border-b-2 border-[#00F5D4] text-white flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF1493] flex items-center justify-center text-white border-2 border-white shadow-[0_0_15px_rgba(255,20,147,0.6)]">
              <SlidersHorizontal className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h2
                id="find-match-title"
                className="text-xl sm:text-2xl font-black font-heading tracking-tight text-white flex items-center gap-2"
              >
                Search & Matching Filters
                <Sparkles className="w-5 h-5 text-[#00F5D4] fill-[#00F5D4]" />
              </h2>
              <p className="text-xs text-[#00F5D4] font-extrabold tracking-wide">
                Every filter is optional and independent — customize &amp; search anytime
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#240B48] hover:bg-[#FF1493] text-[#00F5D4] hover:text-white flex items-center justify-center transition-all cursor-pointer border-2 border-[#00F5D4] shadow-md"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-white bg-[#16042E]">
          {/* Live Matches Preview Banner */}
          <div className="p-4 rounded-2xl bg-[#240D48] border-2 border-[#00F5D4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,245,212,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF007F] to-[#FF1493] text-white flex items-center justify-center font-black text-lg shrink-0 border-2 border-white shadow-[0_0_12px_rgba(255,20,147,0.7)]">
                {validation.valid ? previewMatchesCount : '!'}
              </div>
              <div>
                <p className="text-sm font-black text-white font-heading tracking-wide">
                  {validation.valid
                    ? `${previewMatchesCount} ${previewMatchesCount === 1 ? 'member matches' : 'members match'} your filters`
                    : 'Check filter values below'}
                </p>
                <p className="text-xs text-purple-200 font-bold">
                  {ageBadgeText} · {distanceBadgeText}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-black text-[#00F5D4] hover:text-white hover:underline px-3 py-1.5 rounded-lg bg-[#18062E] border border-[#00F5D4] cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All Filters
              </button>
            </div>
          </div>

          {(formError || (!validation.valid && validation.error)) && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-950/80 border-2 border-rose-400 text-rose-100 text-xs font-bold flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{formError || validation.error}</span>
            </div>
          )}

          {/* 1. Custom Optional Age Filter */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
                <Users className="w-5 h-5 text-[#00F5D4]" />
                Age (Optional)
              </label>
              <span className="text-xs font-black text-[#00F5D4] bg-[#240D48] px-3 py-1 rounded-full border border-[#00F5D4]">
                {ageBadgeText}
              </span>
            </div>
            <p className="text-xs text-purple-200 font-semibold">
              Enter your own minimum age, maximum age, both, or leave both blank to see members of all ages.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="modal-age-min"
                    className="block text-xs font-black text-purple-200 uppercase tracking-wider"
                  >
                    Minimum Age (Optional)
                  </label>
                  {ageMinInput !== '' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAgeMinInput('');
                        setFormError(null);
                      }}
                      className="text-[11px] font-bold text-[#00F5D4] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  id="modal-age-min"
                  type="number"
                  inputMode="numeric"
                  min={18}
                  max={120}
                  value={ageMinInput}
                  onChange={e => {
                    setAgeMinInput(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Any (leave blank)"
                  className="w-full px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-[#00F5D4] text-white placeholder:text-purple-300/70 font-black text-base focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="modal-age-max"
                    className="block text-xs font-black text-purple-200 uppercase tracking-wider"
                  >
                    Maximum Age (Optional)
                  </label>
                  {ageMaxInput !== '' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAgeMaxInput('');
                        setFormError(null);
                      }}
                      className="text-[11px] font-bold text-[#00F5D4] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  id="modal-age-max"
                  type="number"
                  inputMode="numeric"
                  min={18}
                  max={120}
                  value={ageMaxInput}
                  onChange={e => {
                    setAgeMaxInput(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Any (leave blank)"
                  className="w-full px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-[#00F5D4] text-white placeholder:text-purple-300/70 font-black text-base focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 2. Custom Optional Distance Filter (Miles) */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label
                htmlFor="modal-distance-miles"
                className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide"
              >
                <MapPin className="w-5 h-5 text-[#00F5D4]" />
                Preferred Distance in Miles (Optional)
              </label>
              <span className="text-xs font-black text-[#FF1493] bg-[#240D48] px-3 py-1 rounded-full border border-[#FF1493]">
                {distanceBadgeText}
              </span>
            </div>
            <p className="text-xs text-purple-200 font-semibold">
              Enter any distance in miles, or leave blank to show members at any distance. Works independently of age.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="modal-distance-miles"
                type="number"
                inputMode="numeric"
                min={1}
                max={25000}
                value={distanceInput}
                onChange={e => {
                  setDistanceInput(e.target.value);
                  setFormError(null);
                }}
                placeholder="Any distance (leave blank)"
                className="flex-1 px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-[#00F5D4] text-white placeholder:text-purple-300/70 font-black text-base focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden"
              />
              {distanceInput !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setDistanceInput('');
                    setFormError(null);
                  }}
                  className="px-3.5 py-3 rounded-2xl bg-[#240D48] hover:bg-[#341366] border-2 border-[#00F5D4]/70 text-[#00F5D4] font-black text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. Physical Characteristics: Hair Color & Eye Color (Default: Any) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b-2 border-purple-900/60">
            <div>
              <label
                htmlFor="modal-hair-color"
                className="text-sm font-black text-white flex items-center gap-2 font-heading mb-2"
              >
                <Smile className="w-4 h-4 text-[#00F5D4]" />
                Hair Color
              </label>
              <select
                id="modal-hair-color"
                value={localPrefs.hairColor || 'Any'}
                onChange={e =>
                  setLocalPrefs(prev => ({ ...prev, hairColor: e.target.value as HairColorOption }))
                }
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {HAIR_COLOR_OPTIONS.map(color => (
                  <option key={color} value={color} className="bg-[#1E0938] text-white font-bold">
                    {color === 'Any' ? 'Any' : color}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="modal-eye-color"
                className="text-sm font-black text-white flex items-center gap-2 font-heading mb-2"
              >
                <Eye className="w-4 h-4 text-[#00F5D4]" />
                Eye Color
              </label>
              <select
                id="modal-eye-color"
                value={localPrefs.eyeColor || 'Any'}
                onChange={e =>
                  setLocalPrefs(prev => ({ ...prev, eyeColor: e.target.value as EyeColorOption }))
                }
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {EYE_COLOR_OPTIONS.map(color => (
                  <option key={color} value={color} className="bg-[#1E0938] text-white font-bold">
                    {color === 'Any' ? 'Any' : color}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Height Filter (Default: Any, independent Min & Max) */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
                <Ruler className="w-5 h-5 text-[#00F5D4]" />
                Height (Optional)
              </label>
              <span className="text-xs font-black text-[#FF1493] bg-[#240D48] px-3 py-1 rounded-full border border-[#FF1493]">
                {!localPrefs.heightMinInches && !localPrefs.heightMaxInches
                  ? 'Any'
                  : localPrefs.heightMinInches && localPrefs.heightMaxInches
                    ? `${formatHeightLabel(localPrefs.heightMinInches)} – ${formatHeightLabel(localPrefs.heightMaxInches)}`
                    : localPrefs.heightMinInches
                      ? `${formatHeightLabel(localPrefs.heightMinInches)}+`
                      : `Up to ${formatHeightLabel(localPrefs.heightMaxInches)}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="modal-height-min"
                  className="block text-xs font-black text-purple-200 mb-1.5 uppercase tracking-wider"
                >
                  Minimum Height
                </label>
                <select
                  id="modal-height-min"
                  value={localPrefs.heightMinInches || 0}
                  onChange={e => {
                    setLocalPrefs(prev => ({ ...prev, heightMinInches: Number(e.target.value) }));
                    setFormError(null);
                  }}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
                >
                  <option value={0} className="bg-[#1E0938] text-white">
                    Any
                  </option>
                  {HEIGHT_INCHES_OPTIONS.map(inches => (
                    <option key={inches} value={inches} className="bg-[#1E0938] text-white">
                      {formatHeightLabel(inches)} ({Math.floor(inches / 12)} ft {inches % 12} in)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="modal-height-max"
                  className="block text-xs font-black text-purple-200 mb-1.5 uppercase tracking-wider"
                >
                  Maximum Height
                </label>
                <select
                  id="modal-height-max"
                  value={localPrefs.heightMaxInches || 0}
                  onChange={e => {
                    setLocalPrefs(prev => ({ ...prev, heightMaxInches: Number(e.target.value) }));
                    setFormError(null);
                  }}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
                >
                  <option value={0} className="bg-[#1E0938] text-white">
                    Any
                  </option>
                  {HEIGHT_INCHES_OPTIONS.map(inches => (
                    <option key={inches} value={inches} className="bg-[#1E0938] text-white">
                      {formatHeightLabel(inches)} ({Math.floor(inches / 12)} ft {inches % 12} in)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 5. Relationship Intentions (Default: Any) */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
              <Flame className="w-5 h-5 text-[#FF1493]" />
              Relationship Intentions
            </label>
            <div className="flex flex-wrap gap-2.5">
              {RELATIONSHIP_INTENT_OPTIONS.map(intent => {
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
                    {intent}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Gender Preference (Default: Any) */}
          <div className="space-y-3 pb-5 border-b-2 border-purple-900/60">
            <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
              <Heart className="w-5 h-5 text-[#FF1493] fill-[#FF1493]" />
              Gender Preference
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['Any', 'Women', 'Men', 'Non-Binary'] as const).map(opt => {
                const isSelected = (localPrefs.gender || 'Any') === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLocalPrefs(prev => ({ ...prev, gender: opt }))}
                    className={`px-4 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#FF007F] via-[#FF1493] to-[#FF2E93] text-white border-white shadow-[0_0_15px_rgba(255,20,147,0.8)] scale-102'
                        : 'bg-[#240D48] text-white border-[#00F5D4]/60 hover:border-[#00F5D4] hover:bg-[#2D0F55]'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Optional Lifestyle Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b-2 border-purple-900/60">
            <div>
              <label className="text-xs font-black text-white flex items-center gap-1.5 font-heading mb-2">
                <Cigarette className="w-4 h-4 text-[#00F5D4]" />
                Smoking
              </label>
              <select
                value={localPrefs.smoking || 'Any'}
                onChange={e =>
                  setLocalPrefs(prev => ({ ...prev, smoking: e.target.value as SmokingOption }))
                }
                className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-xs sm:text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {SMOKING_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#1E0938] text-white font-bold">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-white flex items-center gap-1.5 font-heading mb-2">
                <Wine className="w-4 h-4 text-[#FF1493]" />
                Drinking
              </label>
              <select
                value={localPrefs.drinking || 'Any'}
                onChange={e =>
                  setLocalPrefs(prev => ({ ...prev, drinking: e.target.value as DrinkingOption }))
                }
                className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-xs sm:text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {DRINKING_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#1E0938] text-white font-bold">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-white flex items-center gap-1.5 font-heading mb-2">
                <Baby className="w-4 h-4 text-[#00F5D4]" />
                Children &amp; Family
              </label>
              <select
                value={localPrefs.children || 'Any'}
                onChange={e =>
                  setLocalPrefs(prev => ({ ...prev, children: e.target.value as ChildrenOption }))
                }
                className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#00F5D4] text-white font-black text-xs sm:text-sm focus:border-[#FF1493] focus:shadow-[0_0_15px_rgba(255,20,147,0.5)] focus:outline-hidden bg-[#280E4D] cursor-pointer"
              >
                {CHILDREN_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#1E0938] text-white font-bold">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 8. Optional Interests & Hobbies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-wide">
                <Tag className="w-5 h-5 text-[#00F5D4]" />
                Interests &amp; Hobbies (Optional)
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

        {/* Modal Footer */}
        <div className="bg-[#1E0938] px-6 py-4 border-t-2 border-[#00F5D4] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-2xl">
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-[#280E4D] border-2 border-purple-500/60 text-purple-200 hover:text-white hover:bg-[#341366] font-black text-xs transition-all cursor-pointer"
          >
            Clear All Filters
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl border-2 border-purple-400 text-purple-100 hover:bg-purple-900/50 font-black text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.valid}
              className="flex-1 sm:flex-initial px-7 py-3 rounded-2xl bg-gradient-to-r from-[#FF007F] via-[#FF1493] to-[#FF2E93] text-white font-black text-xs sm:text-sm border-2 border-white shadow-[0_0_20px_rgba(255,20,147,0.7)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-white" />
              Search Members ({previewMatchesCount})
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
