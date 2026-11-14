import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  ShieldAlert,
  Ban,
  AlertTriangle,
  Flag,
  UserX,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export const AcceptableUsePage: React.FC = () => {
  const { setCurrentView } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNav = (e: React.MouseEvent, view: Parameters<typeof setCurrentView>[0]) => {
    e.preventDefault();
    setCurrentView(view);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-rose-50 text-slate-700 hover:text-red-600 font-bold text-xs border border-rose-200 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-red-600" />
          <span>Back to Speed Meet Love</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span>Speed Meet Love · Acceptable Use Policy</span>
          <span>·</span>
          <span>Zero-Tolerance Safety Rules</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-red-700 via-rose-600 to-pink-600 text-white p-6 sm:p-10 shadow-xl border-2 border-red-800 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase border border-white/30 text-white font-heading">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>Acceptable Use Policy (AUP)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">
            Acceptable Use &amp; Prohibited Conduct Policy
          </h1>

          <p className="text-sm sm:text-base text-rose-100 max-w-2xl font-medium leading-relaxed">
            Speed Meet Love (operated by <strong className="text-white">TeeTees Creations</strong>) enforces strict rules to protect consenting adult members and prohibit exploitation, abuse, fraud, and illegal conduct across profiles, messages, and live video rounds.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {/* Core Severe Prohibitions */}
        <section className="p-6 sm:p-8 rounded-3xl bg-red-50/50 border-2 border-red-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-red-900 font-heading">
            <Ban className="w-5 h-5 text-red-600 shrink-0" />
            <h2>1. Zero-Tolerance Exploitation, Trafficking &amp; Abuse Rules</h2>
          </div>
          <p className="font-semibold text-red-950">
            The following conduct is strictly prohibited on Speed Meet Love and results in immediate permanent banning upon verification and escalation to appropriate authorities where required:
          </p>
          <ul className="space-y-2.5 list-disc pl-5 text-slate-800">
            <li>
              <strong>Human Trafficking:</strong> Any attempt to recruit, transport, harbor, advertise, solicit, or profit from human trafficking, forced labor, or commercial sex trafficking.
            </li>
            <li>
              <strong>Sexual Exploitation:</strong> Commercial sexual exploitation, prostitution or escort services, non-consensual sexual acts or content, sextortion, sexual coercion, or sharing intimate imagery without explicit consent.
            </li>
            <li>
              <strong>Aiding, Encouraging, or Facilitating Abuse:</strong> Any action, message, profile content, or coordination that aids, encourages, instructs, promotes, or facilitates physical, sexual, psychological, or financial abuse or exploitation of any person.
            </li>
            <li>
              <strong>Strict Prohibition on Minors (18+ Only) &amp; CSAM/CSAE:</strong> Anyone under the age of 18 is strictly prohibited from using, creating an account on, or appearing on Speed Meet Love. Child sexual abuse material (CSAM), child sexual abuse and exploitation (CSAE), grooming, or any solicitation involving minors is banned and reported to NCMEC under 18 U.S.C. § 2258A.
            </li>
          </ul>
        </section>

        {/* Member Conduct Rules */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <h2>2. Harassment, Scams, Impersonation &amp; Illegal Content</h2>
          </div>
          <ul className="space-y-2.5 list-disc pl-5">
            <li>
              <strong>Harassment &amp; Threats:</strong> Harassment, unwanted repeated contact after being blocked or unmatched, stalking, bullying, threats of violence, hate speech, or publishing private personal information (doxxing).
            </li>
            <li>
              <strong>Scams &amp; Financial Solicitation:</strong> Romance scams, financial fraud, requests for money, gift cards, wire transfers, cryptocurrency, investment pitches, phishing links, or unauthorized commercial advertising and spam.
            </li>
            <li>
              <strong>Impersonation &amp; Fake Accounts:</strong> Impersonating another individual, misrepresenting your age (including posing as an adult when under 18), using someone else&rsquo;s photographs, or operating automated bots or scripts.
            </li>
            <li>
              <strong>Illegal Content &amp; Platform Abuse:</strong> Uploading, transmitting, or promoting illegal content, controlled substances, weapons trafficking, malware, or attempting to bypass age controls, access restrictions, or LiveKit video room security.
            </li>
          </ul>
        </section>

        {/* Reporting & Verified Enforcement */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
            <Flag className="w-5 h-5 text-red-600 shrink-0" />
            <h2>3. Reporting Violations &amp; Verified Enforcement</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-slate-900 text-xs">
                <UserX className="w-4 h-4 text-red-600 shrink-0" />
                <span>In-App Blocking &amp; Reporting</span>
              </div>
              <p className="text-xs text-slate-600">
                Use the <strong>Report Member</strong> button on browse profiles, mutual match chat threads, or inside live speed dating rounds to report any violation immediately, or block a user to hide them from browse, matches, and messaging.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-slate-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                <span>Owner Review &amp; Enforcement</span>
              </div>
              <p className="text-xs text-slate-600">
                Reports are persisted on the server and reviewed directly by the platform owner (TeeTees Creations). Confirmed violators receive a permanent account ban, immediate revocation of active sessions, and removal from event queues and active rounds.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Note: Speed Meet Love relies on server-side 18+ age validation at signup, member reports, and manual owner review; it does not use automated AI scanning or government ID verification.
          </p>
        </section>

        {/* Contact */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
            <Mail className="w-5 h-5 text-red-600 shrink-0" />
            <h2>4. Report Violations by Email</h2>
          </div>
          <p>
            To report urgent safety concerns, human trafficking, exploitation, underage users, or scams outside the app, email{' '}
            <a href="mailto:speedmeetlove@gmail.com" className="text-red-600 font-bold underline font-mono">
              speedmeetlove@gmail.com
            </a>{' '}
            with any relevant usernames, dates, and details.
          </p>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rose-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/terms" onClick={(e) => handleNav(e, 'terms')} className="text-red-600 font-bold hover:underline">
            Terms &amp; Conditions
          </a>
          <span className="text-slate-300">·</span>
          <a href="/child-safety" onClick={(e) => handleNav(e, 'child_safety')} className="text-slate-600 font-bold hover:underline">
            Child Safety Standards
          </a>
          <span className="text-slate-300">·</span>
          <a href="/law-enforcement" onClick={(e) => handleNav(e, 'law_enforcement')} className="text-slate-600 font-bold hover:underline">
            Law-Enforcement Protocols
          </a>
          <span className="text-slate-300">·</span>
          <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-slate-600 font-bold hover:underline">
            Privacy Policy
          </a>
        </div>
        <div className="text-slate-500 font-medium">© 2026 Speed Meet Love by TeeTees Creations</div>
      </div>
    </div>
  );
};
