import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  UserX,
  Mail,
  Flag,
  PhoneCall,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Video,
  Eye,
  FileText,
  LifeBuoy
} from 'lucide-react';

export const ChildSafetyPage: React.FC = () => {
  const { setCurrentView } = useApp();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-rose-50 text-[#111827] hover:text-[#B91C1C] font-bold text-xs border border-rose-300 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#B91C1C]" />
          <span>Back to Speed Meet Love</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#111827] font-semibold">
          <span>Google Play Child Safety Standards Declaration</span>
          <span>·</span>
          <span>Verified Owner Policies</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-red-700 via-rose-700 to-pink-700 text-white p-6 sm:p-10 shadow-xl border-2 border-red-800 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase border border-white/30 text-white font-heading">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>Zero-Tolerance Child Safety Declaration</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">
            Child Sexual Abuse Material (CSAM) & Exploitation Prevention Standards
          </h1>

          <p className="text-sm sm:text-base text-rose-100 max-w-2xl font-medium leading-relaxed">
            Speed Meet Love maintains an absolute, zero-tolerance policy against child sexual abuse and exploitation (CSAE), child sexual abuse material (CSAM), grooming, and predatory behavior of any kind.
          </p>

          <div className="pt-2 text-xs text-white/90 font-semibold flex flex-wrap items-center gap-2">
            <span>Operated by <strong>TeeTees Creations</strong></span>
            <span>·</span>
            <span>Child Safety Contact: <a href="mailto:speedmeetlove@gmail.com" className="underline hover:text-amber-200 font-bold">speedmeetlove@gmail.com</a></span>
          </div>
        </div>
      </div>

      {/* Quick Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-300 flex items-center justify-center text-[#B91C1C]">
            <UserX className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-[#111827] font-heading">Strictly Adults Only (18+)</h2>
          <p className="text-xs text-[#111827] font-medium leading-relaxed">
            Speed Meet Love is an adult speed dating platform strictly for consenting individuals aged 18 and older. Minors are barred from registration and platform participation.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-300 flex items-center justify-center text-[#BE185D]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-[#111827] font-heading">Zero CSAM / CSAE Tolerance</h2>
          <p className="text-xs text-[#111827] font-medium leading-relaxed">
            Child sexual abuse material, grooming, child exploitation, and underage solicitation are strictly prohibited. Violators face permanent account termination and NCMEC reporting.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-[#B45309]">
            <Flag className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-[#111827] font-heading">Mandatory NCMEC Reporting</h2>
          <p className="text-xs text-[#111827] font-medium leading-relaxed">
            All identified or suspected child sexual abuse material or exploitation is reported directly to the National Center for Missing & Exploited Children (NCMEC) CyberTipline.
          </p>
        </div>
      </div>

      {/* Main Policy Content Sections */}
      <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-6 sm:p-8 space-y-8 text-[#111827] font-medium text-sm leading-relaxed">
        
        {/* Section 1: Explicit Prohibitions */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-lg font-heading">
            <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>1. Explicit Prohibitions: CSAM, CSAE, and Minor Exploitation</h2>
          </div>
          <p>
            Speed Meet Love by TeeTees Creations explicitly and unequivocally prohibits:
          </p>
          <ul className="space-y-2 pl-4 list-disc marker:text-[#B91C1C] text-xs sm:text-sm">
            <li>
              <strong>Child Sexual Abuse Material (CSAM):</strong> The production, upload, transmission, display, sharing, or solicitation of any visual, textual, or digital representation of child sexual abuse, sexualization, or exploitation.
            </li>
            <li>
              <strong>Child Sexual Exploitation and Abuse (CSAE):</strong> Any form of exploitation, commercial sexual exploitation, coercion, or sexual abuse targeting or involving minors.
            </li>
            <li>
              <strong>Grooming and Predatory Contact:</strong> Building rapport, communicating, or attempting to meet, solicit, coerce, or groom any person under 18 years of age for sexual or romantic purposes.
            </li>
            <li>
              <strong>Underage Solicitation & sextortion:</strong> Requesting, distributing, or demanding intimate photographs, videos, or messages from minors, or engaging in sexual extortion.
            </li>
            <li>
              <strong>Facilitation or Promotion of Harm to Minors:</strong> Sharing links, discussions, handles, or third-party platforms for the purpose of facilitating contact with or exploitation of children.
            </li>
          </ul>
        </section>

        {/* Section 2: Adults-Only Policy and Age Verification */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-lg font-heading">
            <UserX className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>2. Adults-Only Service Policy (18+)</h2>
          </div>
          <p>
            Speed Meet Love is designed exclusively for consenting adults to participate in live, structured speed dating rounds and mutual matchmaking.
          </p>
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-300 text-xs sm:text-sm space-y-2">
            <p className="font-bold text-[#111827]">
              Age Requirements & Registration Safeguards:
            </p>
            <ul className="space-y-1.5 pl-4 list-disc marker:text-[#B91C1C]">
              <li>All users must certify that they are at least 18 years of age at the time of account creation.</li>
              <li>Server-side validation enforces adult age checks on sign-up (<code className="text-[#991B1B] font-bold bg-white px-1.5 py-0.5 rounded border border-rose-300">age &gt;= 18</code>). Registrations under 18 are rejected programmatically with an HTTP 400 error.</li>
              <li>Any account discovered to have been created by or on behalf of an individual under the age of 18 is permanently terminated by the platform owner upon discovery.</li>
              <li>If you suspect that a user on Speed Meet Love is under the age of 18, report them immediately using the in-app reporting button or via email to <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] font-bold underline">speedmeetlove@gmail.com</a>.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: In-App User Reporting Mechanisms */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-lg font-heading">
            <Flag className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>3. Verified In-App Reporting Tools & Flagging Mechanisms</h2>
          </div>
          <p>
            Speed Meet Love provides built-in reporting and member blocking mechanisms throughout the application. Every report is transmitted directly to the server and logged for owner review:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="p-3.5 rounded-2xl bg-white border border-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#111827]">
                <Video className="w-4 h-4 text-[#B91C1C]" />
                <span>Live Video Date Rounds</span>
              </div>
              <p className="text-[#111827] font-medium text-xs">
                During speed dating rounds, an in-call <strong>Report Member</strong> action allows users to report the dater, end the date early, and block future pairing.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#111827]">
                <FileText className="w-4 h-4 text-[#B91C1C]" />
                <span>Profile Cards & Singles Browser</span>
              </div>
              <p className="text-[#111827] font-medium text-xs">
                Every member profile card displays a red flag action allowing users to submit a categorized safety report (including explicit Child Safety concerns) directly to the server.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#111827]">
                <Lock className="w-4 h-4 text-[#B91C1C]" />
                <span>Direct Messaging Threads</span>
              </div>
              <p className="text-[#111827] font-medium text-xs">
                Inside active mutual match chats, members can report suspicious conduct, abusive behavior, or underage concerns directly from the chat menu.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#111827]">
                <Mail className="w-4 h-4 text-[#B91C1C]" />
                <span>Direct Owner Support Email</span>
              </div>
              <p className="text-[#111827] font-medium text-xs">
                Urgent reports can be sent anytime to <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] font-bold underline">speedmeetlove@gmail.com</a> with subject line <em>Child Safety Concern</em> for prioritized owner review.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Owner Responsibilities & Enforcement Protocol */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-lg font-heading">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>4. Owner Responsibilities &amp; Enforcement Actions</h2>
          </div>
          <p>
            Speed Meet Love is actively operated by TeeTees Creations. When an in-app report is filed, the following verified enforcement protocol is executed:
          </p>
          <ol className="space-y-2 pl-4 list-decimal marker:text-[#B91C1C] text-xs sm:text-sm">
            <li>
              <strong>Server Persistence:</strong> Reports submitted in-app are stored in persistent server storage (`reports.json`) with reporter details, reported user ID, timestamp, violation category, and optional notes.
            </li>
            <li>
              <strong>Owner Review:</strong> The platform owner accesses an authenticated administrative review dashboard to inspect incoming reports and review the reported account.
            </li>
            <li>
              <strong>Permanent Account Ban:</strong> If a violation of child safety policies or community rules is confirmed, the owner bans the account. The user's profile is disabled, and their user ID and email are recorded on the server's permanent ban list.
            </li>
            <li>
              <strong>Session Invalidation:</strong> Banning immediately purges all active session tokens associated with that user, terminating any active video room access and preventing future sign-in.
            </li>
            <li>
              <strong>Record Retention:</strong> Reported account details and server access logs are retained in server storage to prevent account recreation and to fulfill legal reporting duties.
            </li>
          </ol>
        </section>

        {/* Section 5: Mandatory NCMEC CyberTipline Reporting */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-lg font-heading">
            <LifeBuoy className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>5. Mandatory NCMEC CyberTipline Reporting &amp; Legal Compliance</h2>
          </div>
          <p>
            In compliance with United States federal law (18 U.S.C. § 2258A) and child protection standards, TeeTees Creations adheres to strict mandatory reporting:
          </p>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs sm:text-sm space-y-2">
            <p className="font-bold text-[#78350F] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B45309] shrink-0" />
              <span>NCMEC CyberTipline Reporting:</span>
            </p>
            <p className="text-[#78350F] font-medium">
              TeeTees Creations files mandatory reports with the <strong>National Center for Missing & Exploited Children (NCMEC)</strong> via the CyberTipline whenever any instance of child sexual abuse material (CSAM), attempted grooming, or sexual exploitation of minors is identified.
            </p>
            <p className="text-[#78350F] font-medium">
              The platform owner is committed to cooperating fully with all lawful subpoenas, court orders, and law enforcement requests relating to child safety investigations.
            </p>
          </div>
        </section>

        {/* Section 6: Emergency Resources & Hotlines */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-lg font-heading">
            <PhoneCall className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>6. Child Safety Helplines &amp; External Resources</h2>
          </div>
          <p>
            If you are aware of an immediate danger to a child, call <strong>911</strong> or your local emergency services immediately. You can also report child exploitation directly to recognized advocacy organizations:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 space-y-1">
              <div className="font-bold text-[#111827]">National Center for Missing & Exploited Children (NCMEC)</div>
              <p className="text-[#111827] font-medium">CyberTipline reporting portal & 24/7 hotline</p>
              <div className="pt-1 flex flex-col gap-1 font-bold text-[#B91C1C]">
                <a href="https://report.cybertip.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                  <span>report.cybertip.org</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>Toll-Free Hotline: 1-800-843-5678 (1-800-THE-LOST)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 space-y-1">
              <div className="font-bold text-[#111827]">INHOPE (International Association of Hotlines)</div>
              <p className="text-[#111827] font-medium">Global network combating child sexual abuse material online</p>
              <div className="pt-1 font-bold text-[#B91C1C]">
                <a href="https://www.inhope.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                  <span>www.inhope.org</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 space-y-1">
              <div className="font-bold text-[#111827]">Childhelp National Child Abuse Hotline</div>
              <p className="text-[#111827] font-medium">Crisis counselors available 24/7 in 170+ languages</p>
              <div className="pt-1 font-bold text-[#B91C1C]">
                <span>Call or Text: 1-800-422-4453 (1-800-4-A-CHILD)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 space-y-1">
              <div className="font-bold text-[#111827]">Internet Watch Foundation (IWF)</div>
              <p className="text-[#111827] font-medium">Confidential international reporting of online child sexual abuse</p>
              <div className="pt-1 font-bold text-[#B91C1C]">
                <a href="https://report.iwf.org.uk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                  <span>report.iwf.org.uk</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Developer Contact & Governance */}
        <section className="space-y-3 pt-2 border-t border-rose-200">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-lg font-heading">
            <Mail className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>7. Contact Information &amp; Declaration Governance</h2>
          </div>
          <p>
            For questions, legal inquiries, law enforcement subpoena handling, or child safety notifications regarding Speed Meet Love, contact:
          </p>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 text-xs sm:text-sm space-y-1 font-medium">
            <p><strong>Application:</strong> Speed Meet Love</p>
            <p><strong>Operating Entity:</strong> TeeTees Creations</p>
            <p><strong>Designated Contact:</strong> <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] underline font-bold">speedmeetlove@gmail.com</a></p>
            <p><strong>Review Protocol:</strong> Incoming reports are promptly reviewed directly by the platform owner</p>
          </div>
        </section>

      </div>

      {/* Footer Navigation Back Links */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rose-200 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('home')}
            className="text-[#B91C1C] hover:text-[#991B1B] font-bold hover:underline cursor-pointer"
          >
            ← Back to Home
          </button>
          <span className="text-[#111827] font-bold">·</span>
          <button
            onClick={() => setCurrentView('privacy')}
            className="text-[#111827] hover:text-[#B91C1C] font-bold hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="text-[#111827] font-bold">·</span>
          <button
            onClick={() => setCurrentView('delete_account')}
            className="text-[#111827] hover:text-[#B91C1C] font-bold hover:underline cursor-pointer"
          >
            Delete Account
          </button>
        </div>

        <div className="text-[#111827] font-medium">
          © 2026 Speed Meet Love by TeeTees Creations
        </div>
      </div>
    </div>
  );
};
