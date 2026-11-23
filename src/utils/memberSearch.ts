import {
  User,
  UserPreferences,
  HairColorOption,
  EyeColorOption,
  RelationshipIntentOption,
  SmokingOption,
  DrinkingOption,
  ChildrenOption,
} from '../types';

export const HAIR_COLOR_OPTIONS: HairColorOption[] = [
  'Any',
  'Blonde',
  'Brown',
  'Black',
  'Red',
  'Gray/Silver',
  'Bald',
  'Other',
];

export const EYE_COLOR_OPTIONS: EyeColorOption[] = [
  'Any',
  'Blue',
  'Brown',
  'Green',
  'Hazel',
  'Gray',
  'Other',
];

export const RELATIONSHIP_INTENT_OPTIONS: RelationshipIntentOption[] = [
  'Any',
  'Serious Relationship',
  'Casual Dating',
  'Friendship First',
  'Not Sure Yet',
];

export const SMOKING_OPTIONS: SmokingOption[] = [
  'Any',
  'Non-smoker',
  'Social smoker',
  'Regular smoker',
];

export const DRINKING_OPTIONS: DrinkingOption[] = [
  'Any',
  'Non-drinker',
  'Social drinker',
  'Regular drinker',
];

export const CHILDREN_OPTIONS: ChildrenOption[] = [
  'Any',
  'Has children',
  'Wants children',
  "Doesn't want children",
  'Open to children',
];

// Every inch from 4'10" (58") to 6'8" (80") for flexible height filtering
export const HEIGHT_INCHES_OPTIONS: number[] = Array.from({ length: 23 }, (_, i) => 58 + i);

export const DEFAULT_SEARCH_PREFERENCES: UserPreferences = {
  ageMin: null,
  ageMax: null,
  distanceMiles: null,
  hairColor: 'Any',
  eyeColor: 'Any',
  heightMinInches: 0,
  heightMaxInches: 0,
  gender: 'Any',
  intent: 'Any',
  smoking: 'Any',
  drinking: 'Any',
  children: 'Any',
  interests: [],
};

export function formatHeightLabel(inches?: number | null): string {
  if (!inches || inches <= 0) return 'Any';
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${feet}'${rem}"`;
}

/**
 * Parses an optional numeric text field.
 * Blank string / null / undefined -> null (no filter applied).
 * Invalid or non-positive values -> NaN so callers can surface validation errors.
 */
export function parseOptionalFilterInt(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    if (raw <= 0) return null;
    return Math.floor(raw);
  }
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN;
  return parsed;
}

/**
 * Normalizes a stored UserPreferences object so unset/legacy-0 optional numeric bounds
 * become clean `null` values without introducing any preset age or distance restrictions.
 */
export function normalizeSearchPreferences(prefs?: Partial<UserPreferences> | null): UserPreferences {
  if (!prefs) return { ...DEFAULT_SEARCH_PREFERENCES, interests: [] };

  const normalizeOptionalPositive = (value: number | null | undefined): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
    return Math.floor(value);
  };

  return {
    ageMin: normalizeOptionalPositive(prefs.ageMin),
    ageMax: normalizeOptionalPositive(prefs.ageMax),
    distanceMiles: normalizeOptionalPositive(prefs.distanceMiles),
    hairColor: prefs.hairColor || 'Any',
    eyeColor: prefs.eyeColor || 'Any',
    heightMinInches: typeof prefs.heightMinInches === 'number' && prefs.heightMinInches > 0 ? prefs.heightMinInches : 0,
    heightMaxInches: typeof prefs.heightMaxInches === 'number' && prefs.heightMaxInches > 0 ? prefs.heightMaxInches : 0,
    gender: prefs.gender || 'Any',
    intent: prefs.intent || 'Any',
    smoking: prefs.smoking || 'Any',
    drinking: prefs.drinking || 'Any',
    children: prefs.children || 'Any',
    interests: Array.isArray(prefs.interests) ? [...prefs.interests] : [],
  };
}

export interface SearchFilterValidationResult {
  valid: boolean;
  error: string | null;
  ageMin: number | null;
  ageMax: number | null;
  distanceMiles: number | null;
}

export function validateSearchInputs(params: {
  ageMinInput: string;
  ageMaxInput: string;
  distanceInput: string;
  heightMinInches?: number;
  heightMaxInches?: number;
}): SearchFilterValidationResult {
  const ageMin = parseOptionalFilterInt(params.ageMinInput);
  const ageMax = parseOptionalFilterInt(params.ageMaxInput);
  const distanceMiles = parseOptionalFilterInt(params.distanceInput);

  if (Number.isNaN(ageMin)) {
    return {
      valid: false,
      error: 'Minimum age must be a valid whole number (or leave blank for any age).',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }
  if (Number.isNaN(ageMax)) {
    return {
      valid: false,
      error: 'Maximum age must be a valid whole number (or leave blank for any age).',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }
  if (ageMin !== null && (ageMin < 18 || ageMin > 120)) {
    return {
      valid: false,
      error: 'Minimum age must be between 18 and 120 (or leave blank).',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }
  if (ageMax !== null && (ageMax < 18 || ageMax > 120)) {
    return {
      valid: false,
      error: 'Maximum age must be between 18 and 120 (or leave blank).',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    return {
      valid: false,
      error: 'Minimum age cannot be greater than maximum age.',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }
  if (Number.isNaN(distanceMiles)) {
    return {
      valid: false,
      error: 'Preferred distance must be a positive number of miles (or leave blank for any distance).',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }
  if (distanceMiles !== null && distanceMiles > 25000) {
    return {
      valid: false,
      error: 'Preferred distance must be 25,000 miles or less (or leave blank for any distance).',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }

  const hMin = params.heightMinInches || 0;
  const hMax = params.heightMaxInches || 0;
  if (hMin > 0 && hMax > 0 && hMin > hMax) {
    return {
      valid: false,
      error: 'Minimum height cannot be taller than maximum height.',
      ageMin: null,
      ageMax: null,
      distanceMiles: null,
    };
  }

  return {
    valid: true,
    error: null,
    ageMin,
    ageMax,
    distanceMiles,
  };
}

function normalizedEquals(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Evaluates whether a single member satisfies every active search filter independently.
 * - Blank min age & blank max age -> ALL ages pass.
 * - Min age only -> age >= minAge.
 * - Max age only -> age <= maxAge.
 * - Blank distance -> ANY distance passes.
 * - Hair color, eye color, height, relationship intent, gender, lifestyle default to 'Any' (pass all).
 * - When a specific filter IS set, members must actually match it (missing traits do not silently pass).
 */
export function matchesMemberFilters(candidate: User, rawFilters?: Partial<UserPreferences> | null): boolean {
  const filters = normalizeSearchPreferences(rawFilters);

  // 1. Minimum Age (independent, optional)
  if (filters.ageMin !== null && filters.ageMin !== undefined) {
    if (typeof candidate.Age !== 'number' || !Number.isFinite(candidate.Age) || candidate.Age <= 0) {
      return false;
    }
    if (candidate.Age < filters.ageMin) return false;
  }

  // 2. Maximum Age (independent, optional)
  if (filters.ageMax !== null && filters.ageMax !== undefined) {
    if (typeof candidate.Age !== 'number' || !Number.isFinite(candidate.Age) || candidate.Age <= 0) {
      return false;
    }
    if (candidate.Age > filters.ageMax) return false;
  }

  // 3. Preferred Distance in miles (independent, optional; blank = any distance)
  if (filters.distanceMiles !== null && filters.distanceMiles !== undefined && filters.distanceMiles > 0) {
    if (
      typeof candidate.DistanceMiles !== 'number' ||
      !Number.isFinite(candidate.DistanceMiles) ||
      candidate.DistanceMiles < 0
    ) {
      return false;
    }
    if (candidate.DistanceMiles > filters.distanceMiles) return false;
  }

  // 4. Gender (independent, default Any)
  if (filters.gender && filters.gender !== 'Any') {
    if (filters.gender === 'Women' && candidate.Gender !== 'Woman') return false;
    if (filters.gender === 'Men' && candidate.Gender !== 'Man') return false;
    if (filters.gender === 'Non-Binary' && candidate.Gender !== 'Non-Binary') return false;
  }

  // 5. Hair Color (independent, default Any)
  if (filters.hairColor && filters.hairColor !== 'Any') {
    if (!normalizedEquals(candidate.HairColor, filters.hairColor)) return false;
  }

  // 6. Eye Color (independent, default Any)
  if (filters.eyeColor && filters.eyeColor !== 'Any') {
    if (!normalizedEquals(candidate.EyeColor, filters.eyeColor)) return false;
  }

  // 7. Minimum Height (independent, default 0 / Any)
  if (filters.heightMinInches && filters.heightMinInches > 0) {
    if (
      typeof candidate.HeightInches !== 'number' ||
      !Number.isFinite(candidate.HeightInches) ||
      candidate.HeightInches <= 0
    ) {
      return false;
    }
    if (candidate.HeightInches < filters.heightMinInches) return false;
  }

  // 8. Maximum Height (independent, default 0 / Any)
  if (filters.heightMaxInches && filters.heightMaxInches > 0) {
    if (
      typeof candidate.HeightInches !== 'number' ||
      !Number.isFinite(candidate.HeightInches) ||
      candidate.HeightInches <= 0
    ) {
      return false;
    }
    if (candidate.HeightInches > filters.heightMaxInches) return false;
  }

  // 9. Relationship Intentions (independent, default Any)
  if (filters.intent && filters.intent !== 'Any') {
    const candidateIntent =
      candidate.RelationshipIntent ||
      (candidate.Preferences?.intent && candidate.Preferences.intent !== 'Any'
        ? candidate.Preferences.intent
        : undefined);
    if (!normalizedEquals(candidateIntent, filters.intent)) return false;
  }

  // 10. Smoking (independent, default Any)
  if (filters.smoking && filters.smoking !== 'Any') {
    if (!normalizedEquals(candidate.Smoking, filters.smoking)) return false;
  }

  // 11. Drinking (independent, default Any)
  if (filters.drinking && filters.drinking !== 'Any') {
    if (!normalizedEquals(candidate.Drinking, filters.drinking)) return false;
  }

  // 12. Children & Family (independent, default Any)
  if (filters.children && filters.children !== 'Any') {
    if (!normalizedEquals(candidate.Children, filters.children)) return false;
  }

  // 13. Interests (independent, default empty)
  if (filters.interests && filters.interests.length > 0) {
    const candidateInterests = Array.isArray(candidate.Interests) ? candidate.Interests : [];
    const sharesInterest = filters.interests.some(prefInterest =>
      candidateInterests.some(candInterest =>
        candInterest.toLowerCase().includes(prefInterest.toLowerCase())
      )
    );
    if (!sharesInterest) return false;
  }

  return true;
}

export function filterMembers(candidates: User[], rawFilters?: Partial<UserPreferences> | null): User[] {
  const filters = normalizeSearchPreferences(rawFilters);
  return candidates.filter(candidate => matchesMemberFilters(candidate, filters));
}

export function isLegacyDemoDefaultPreferences(prefs?: Partial<UserPreferences> | null): boolean {
  if (!prefs) return false;
  return (
    prefs.ageMin === 30 &&
    prefs.ageMax === 55 &&
    prefs.distanceMiles === 50 &&
    (!prefs.hairColor || prefs.hairColor === 'Any') &&
    (!prefs.eyeColor || prefs.eyeColor === 'Any') &&
    (!prefs.heightMinInches || prefs.heightMinInches === 0) &&
    (!prefs.heightMaxInches || prefs.heightMaxInches === 0) &&
    (!prefs.gender || prefs.gender === 'Any') &&
    (!prefs.intent || prefs.intent === 'Any') &&
    (!prefs.smoking || prefs.smoking === 'Any') &&
    (!prefs.drinking || prefs.drinking === 'Any') &&
    (!prefs.children || prefs.children === 'Any') &&
    (!prefs.interests || prefs.interests.length === 0)
  );
}
