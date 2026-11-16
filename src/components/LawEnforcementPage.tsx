import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Shield,
  Scale,
  Database,
  Mail,
  ShieldAlert,
} from 'lucide-react';

export const LawEnforcementPage: React.FC = () => {
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
          <span>Speed Meet Love · Law-Enforcement Protocols</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-red-700 via-rose-700 to-pink-700 text-white p-6 sm:p-10 shadow-xl border-2 border-red-800 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase border border-white/30 text-white font-heading">
            <Shield className="w-4 h-4 text-white" />
            <span>Law-Enforcement Guidelines</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">
            Law-Enforcement &amp; Legal Request Protocols
          </h1>

          <p className="text-sm sm:text-base text-rose-100 max-w-2xl font-medium leading-relaxed">
            Information for law-enforcement agencies and government authorities submitting lawful inquiries or mandatory safety reports regarding Speed Meet Love, operated by{' '}
            <strong className="text-white">TeeTees Creations</strong>.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-[#111827] font-medium leading-relaxed">
        {/* Section 1: Legal Process */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Scale className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>1. Cooperation with Lawful Process</h2>
          </div>
          <p>
            TeeTees Creations cooperates with lawful subpoenas, court orders, search warrants, and valid law-enforcement requests in accordance with applicable United States law and our{' '}
            <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-[#B91C1C] font-bold underline">
              Privacy Policy
            </a>
            .
          </p>
          <p>
            All law-enforcement inquiries and legal process documents must be submitted by an authorized law-enforcement or government official with official agency credentials and a clear description of the specific account identifier (such as email address or user ID) and legal authority.
          </p>
        </section>

        {/* Section 2: Mandatory NCMEC Reporting */}
        <section className="p-6 sm:p-8 rounded-3xl bg-red-50/60 border border-red-300 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#7F1D1D] font-heading">
            <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>2. Mandatory Child Safety &amp; Exploitation Reporting (18 U.S.C. § 2258A)</h2>
          </div>
          <p className="text-[#111827]">
            In compliance with United States federal law (18 U.S.C. § 2258A), TeeTees Creations files mandatory reports with the{' '}
            <strong>National Center for Missing &amp; Exploited Children (NCMEC)</strong> via the CyberTipline whenever any instance of child sexual abuse material (CSAM), child sexual abuse and exploitation (CSAE), or attempted grooming of minors is identified.
          </p>
          <p className="text-[#111827]">
            When the platform owner bans an account through the safety report system, Speed Meet Love immediately revokes active session tokens, removes the account from live matchmaking queues and active rounds, and retains safety report records and ban identifiers in administrative archives to enforce permanent bans.
          </p>
        </section>

        {/* Section 3: Data Available vs Not Retained */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Database className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>3. System Architecture &amp; Data Availability</h2>
          </div>
          <p>
            To assist authorized agencies in framing accurate requests, Speed Meet Love discloses what data exists in its systems:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <strong>Account &amp; Profile Records:</strong> Active member account IDs, email addresses, profile details, and membership status stored in Cloud Firestore and server records until the user deletes their account.
            </li>
            <li>
              <strong>Matches, Ballots &amp; Messages:</strong> Mutual match records, Like/Pass ballots, and text messages exchanged between matched paid members, retained until account deletion.
            </li>
            <li>
              <strong>Safety Reports &amp; Ban Records:</strong> Member-submitted safety reports and banned user/email identifiers retained to enforce platform bans.
            </li>
            <li>
              <strong>Live Video Calls Are Not Recorded:</strong> Speed Meet Love uses LiveKit for real-time 5-minute WebRTC video speed dating rounds and does not record or archive video or audio streams.
            </li>
            <li>
              <strong>Ephemeral Infrastructure Logs:</strong> Edge web access logs (IP address, user-agent, URL, timestamp) are maintained by hosting infrastructure for security and DDoS defense and rotate automatically within up to 30 days.
            </li>
            <li>
              <strong>Billing Identifiers:</strong> Speed Meet Love does not store full credit card numbers; web subscription checkout and billing records are handled via Stripe.
            </li>
          </ul>
        </section>

        {/* Section 4: Contact Point */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-300 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Mail className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>4. Law-Enforcement Point of Contact</h2>
          </div>
          <p>
            Authorized law-enforcement and government requests may be directed to TeeTees Creations at:
          </p>
          <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-1 text-xs sm:text-sm text-[#111827]">
            <p><strong>Service:</strong> Speed Meet Love (https://speedmeetlove.com)</p>
            <p><strong>Operator:</strong> TeeTees Creations</p>
            <p>
              <strong>Designated Email Contact:</strong>{' '}
              <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] font-bold underline font-mono">
                speedmeetlove@gmail.com
              </a>
            </p>
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rose-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/child-safety" onClick={(e) => handleNav(e, 'child_safety')} className="text-[#B91C1C] font-bold hover:underline">
            Child Safety Standards
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/acceptable-use" onClick={(e) => handleNav(e, 'acceptable_use')} className="text-[#111827] font-bold hover:underline">
            Acceptable Use Policy
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-[#111827] font-bold hover:underline">
            Privacy Policy
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/contact" onClick={(e) => handleNav(e, 'contact')} className="text-[#111827] font-bold hover:underline">
            Contact
          </a>
        </div>
        <div className="text-[#111827] font-medium">© 2026 Speed Meet Love by TeeTees Creations</div>
      </div>
    </div>
  );
};
