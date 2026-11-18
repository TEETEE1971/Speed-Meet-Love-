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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-rose-50 text-[#111827] hover:text-[#B91C1C] font-bold text-xs border border-rose-300 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#B91C1C]" />
          <span>Back to Speed Meet Love</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#111827] font-semibold">
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

      <div className="space-y-6 text-xs sm:text-sm text-[#111827] font-medium leading-relaxed">
        {/* Core Severe Prohibitions */}
        <section className="p-6 sm:p-8 rounded-3xl bg-red-50/60 border-2 border-red-300 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#7F1D1D] font-heading">
            <Ban className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>1. Zero-Tolerance Exploitation, Trafficking &amp; Abuse Rules</h2>
          </div>
          <p className="font-bold text-[#7F1D1D]">
            The following conduct is strictly prohibited on Speed Meet Love. Violations may lead to content removal, suspension, or account termination, and will be escalated to appropriate authorities where required:
          </p>
          <ul className="space-y-2.5 list-disc pl-5 text-[#111827]">
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
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>2. Private Messages, Live Video &amp; Member Conduct</h2>
          </div>
          <ul className="space-y-2.5 list-disc pl-5">
            <li>
              <strong>Private Messages &amp; Live Video Conduct:</strong> Speed Meet Love is for dating and connection, not sexual entertainment. Sexually explicit content and sexual solicitations are prohibited in private messages and live video, even when both participants consent.
            </li>
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
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Flag className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>3. Reporting Violations &amp; Verified Enforcement</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#111827] text-xs">
                <UserX className="w-4 h-4 text-[#B91C1C] shrink-0" />
                <span>In-App Blocking &amp; Reporting</span>
              </div>
              <p className="text-xs text-[#111827] font-medium">
                Use the <strong>Report Member</strong> button on browse profiles, mutual match chat threads, or inside live speed dating rounds to report any violation immediately, or block a user to hide them from browse, matches, and messaging.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#111827] text-xs">
                <ShieldCheck className="w-4 h-4 text-[#B91C1C] shrink-0" />
                <span>Owner Review &amp; Enforcement</span>
              </div>
              <p className="text-xs text-[#111827] font-medium">
                In-app reports are saved on the server and reviewed by the platform owner (TeeTees Creations). Violations may lead to content removal, suspension, or account termination, including revoking active sessions and removing accounts from event queues and active matches.
              </p>
            </div>
          </div>
          <p className="text-xs text-[#111827] font-medium">
            Note: Speed Meet Love relies on server-side 18+ age validation at signup, member reports, and manual owner review; it does not claim automated content scanning, 24/7 real-time monitoring of private messages or live video, or government ID verification.
          </p>
        </section>

        {/* Contact */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-300 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Mail className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>4. Report Violations by Email</h2>
          </div>
          <p>
            To report urgent safety concerns, human trafficking, exploitation, underage users, or scams outside the app, email{' '}
            <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] font-bold underline font-mono">
              speedmeetlove@gmail.com
            </a>{' '}
            with any relevant usernames, dates, and details.
          </p>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rose-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/terms" onClick={(e) => handleNav(e, 'terms')} className="text-[#B91C1C] font-bold hover:underline">
            Terms &amp; Conditions
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/child-safety" onClick={(e) => handleNav(e, 'child_safety')} className="text-[#111827] font-bold hover:underline">
            Child Safety Standards
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/law-enforcement" onClick={(e) => handleNav(e, 'law_enforcement')} className="text-[#111827] font-bold hover:underline">
            Law-Enforcement Protocols
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-[#111827] font-bold hover:underline">
            Privacy Policy
          </a>
        </div>
        <div className="text-[#111827] font-medium">© 2026 Speed Meet Love by TeeTees Creations</div>
      </div>
    </div>
  );
};
