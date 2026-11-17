import { AppView } from '../types';

export const GA_MEASUREMENT_ID = 'G-1GQNQ69X6C';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __smlGaConfigured?: boolean;
    doNotTrack?: string;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

interface ViewAnalyticsMeta {
  path: string;
  title: string;
}

const VIEW_ANALYTICS_META: Record<AppView, ViewAnalyticsMeta> = {
  home: { path: '/', title: 'Speed Meet Love - Home' },
  browse: { path: '/browse', title: 'Speed Meet Love - Browse Singles' },
  matches: { path: '/matches', title: 'Speed Meet Love - Matches' },
  results: { path: '/results', title: 'Speed Meet Love - Match Results' },
  second_date: { path: '/second-date', title: 'Speed Meet Love - Second-Chance Date' },
  messages: { path: '/messages', title: 'Speed Meet Love - Messages' },
  friday: { path: '/events', title: 'Speed Meet Love - Events' },
  lobby: { path: '/events/lobby', title: 'Speed Meet Love - Event Lobby' },
  live: { path: '/events/live', title: 'Speed Meet Love - Live Round' },
  pricing: { path: '/pricing', title: 'Speed Meet Love - Membership' },
  profile: { path: '/profile', title: 'Speed Meet Love - Profile' },
  tables: { path: '/admin/platform', title: 'Speed Meet Love - Platform Settings' },
  privacy: { path: '/privacy', title: 'Speed Meet Love - Privacy Policy' },
  delete_account: { path: '/delete-account', title: 'Speed Meet Love - Delete Account' },
  child_safety: { path: '/child-safety', title: 'Speed Meet Love - Child Safety' },
  terms: { path: '/terms', title: 'Speed Meet Love - Terms & Conditions' },
  acceptable_use: { path: '/acceptable-use', title: 'Speed Meet Love - Acceptable Use Policy' },
  refund_policy: { path: '/refund-policy', title: 'Speed Meet Love - Refund Policy' },
  law_enforcement: { path: '/law-enforcement', title: 'Speed Meet Love - Law Enforcement Protocols' },
  contact: { path: '/contact', title: 'Speed Meet Love - Contact' },
  owner_reports: { path: '/admin/reports', title: 'Speed Meet Love - Moderation Reports' },
  owner_users: { path: '/admin/users', title: 'Speed Meet Love - Member Directory' },
  owner_waitlist: { path: '/admin/waitlist', title: 'Speed Meet Love - Event Waitlist' },
};

const CONSENT_STORAGE_KEYS = [
  'sml_analytics_consent',
  'sml_cookie_consent',
  'cookie_consent',
  'analytics_consent',
];

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;

  if (window[`ga-disable-${GA_MEASUREMENT_ID}`] === true) {
    return false;
  }

  try {
    const nav = navigator as Navigator & {
      globalPrivacyControl?: boolean;
      msDoNotTrack?: string;
    };

    if (nav.globalPrivacyControl === true) {
      return false;
    }

    const dnt = nav.doNotTrack || window.doNotTrack || nav.msDoNotTrack;
    if (dnt === '1' || dnt === 'yes') {
      return false;
    }

    for (const key of CONSENT_STORAGE_KEYS) {
      const raw = window.localStorage?.getItem(key);
      if (!raw) continue;
      const normalized = raw.trim().toLowerCase();
      if (
        normalized === 'denied' ||
        normalized === 'false' ||
        normalized === '0' ||
        normalized === 'opt-out' ||
        normalized === 'essential'
      ) {
        return false;
      }
      if (normalized.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw) as { analytics?: boolean; analytics_storage?: string };
          if (parsed.analytics === false || parsed.analytics_storage === 'denied') {
            return false;
          }
        } catch {
          // Ignore malformed JSON in unrelated storage entries
        }
      }
    }
  } catch {
    return false;
  }

  return true;
}

let lastTrackedPath: string | null = null;

/**
 * Tracks a single sanitized screen page_view for GA4 without PII,
 * sensitive query/hash URL parameters, or duplicate consecutive events.
 */
export function trackScreenPageView(view: AppView): void {
  if (typeof window === 'undefined') return;

  const allowed = hasAnalyticsConsent();
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = !allowed;
  if (!allowed) return;

  const meta = VIEW_ANALYTICS_META[view] || { path: '/', title: 'Speed Meet Love' };

  if (lastTrackedPath === meta.path) {
    return;
  }
  lastTrackedPath = meta.path;

  if (typeof window.gtag !== 'function') return;

  const sanitizedLocation = `${window.location.origin}${meta.path}`;
  window.gtag('event', 'page_view', {
    page_title: meta.title,
    page_path: meta.path,
    page_location: sanitizedLocation,
    send_to: GA_MEASUREMENT_ID,
  });
}
