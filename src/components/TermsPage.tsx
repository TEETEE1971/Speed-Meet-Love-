import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Scale,
  Ban,
  Mail,
} from 'lucide-react';

export const TermsPage: React.FC = () => {
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
          <span>Speed Meet Love · Terms &amp; Conditions</span>
          <span>·</span>
          <span>Effective 2026</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white p-6 sm:p-10 shadow-xl border-2 border-rose-700 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase border border-white/30 text-white font-heading">
            <FileText className="w-4 h-4 text-white" />
            <span>Terms &amp; Conditions</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">
            Terms and Conditions of Service
          </h1>

          <p className="text-sm sm:text-base text-rose-100 max-w-2xl font-medium leading-relaxed">
            These Terms govern your access to and use of Speed Meet Love at{' '}
            <span className="font-bold text-white">https://speedmeetlove.com</span>, operated by{' '}
            <strong className="text-white">TeeTees Creations</strong>.
          </p>

          <div className="pt-2 text-xs text-white/90 font-semibold flex flex-wrap items-center gap-2">
            <span>Operator: <strong>TeeTees Creations</strong></span>
            <span>·</span>
            <span>
              Support:{' '}
              <a href="mailto:speedmeetlove@gmail.com" className="underline hover:text-amber-200 font-bold">
                speedmeetlove@gmail.com
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="space-y-6 text-xs sm:text-sm text-[#111827] font-medium leading-relaxed">
        {/* Section 1 */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <UserCheck className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>1. Acceptance &amp; Adults-Only Eligibility (18+)</h2>
          </div>
          <p>
            By creating an account or using Speed Meet Love, you agree to these Terms and Conditions, our{' '}
            <a href="/acceptable-use" onClick={(e) => handleNav(e, 'acceptable_use')} className="text-[#B91C1C] font-bold underline">
              Acceptable Use Policy
            </a>
            , our{' '}
            <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-[#B91C1C] font-bold underline">
              Privacy Policy
            </a>
            , our{' '}
            <a href="/refund-policy" onClick={(e) => handleNav(e, 'refund_policy')} className="text-[#B91C1C] font-bold underline">
              Refund Policy
            </a>
            , and our{' '}
            <a href="/child-safety" onClick={(e) => handleNav(e, 'child_safety')} className="text-[#B91C1C] font-bold underline">
              Child Safety Standards
            </a>
            .
          </p>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              <strong>Minimum Age 18+:</strong> Speed Meet Love is strictly for adults aged <strong>18 years and older</strong>. You must provide an accurate age/date of birth confirming you are at least 18 at registration. Minors are strictly prohibited from registering, browsing, messaging, or joining speed dating events.
            </li>
            <li>
              <strong>Verification Disclosure:</strong> Account eligibility relies on authenticated account credentials, self-attested age/date-of-birth validation on the server (blocking ages under 18), and owner review of user-submitted safety reports. Speed Meet Love does <strong>not</strong> perform government ID checks or criminal background checks.
            </li>
            <li>
              <strong>One Authentic Account:</strong> You must register with truthful profile details and may not create deceptive, impersonated, or unauthorized accounts.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <ShieldCheck className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>2. Service Description</h2>
          </div>
          <p>
            Speed Meet Love provides an online adult dating and virtual speed-dating platform featuring member profiles, browsing, Like/Pass voting, confidential mutual matching, text messaging for eligible paid mutual matches, and live weekend speed dating video events (Friday, Saturday, and Sunday at 7:00 PM EST featuring 5-minute video rounds with up to 2-minute comfort breaks and consent-based round progression).
          </p>
        </section>

        {/* Section 3: Zero-Tolerance Prohibitions */}
        <section className="p-6 sm:p-8 rounded-3xl bg-red-50/60 border-2 border-red-300 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#7F1D1D] font-heading">
            <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>3. Zero-Tolerance Prohibited Conduct &amp; Content</h2>
          </div>
          <p className="font-bold text-[#7F1D1D]">
            Users must comply with our Acceptable Use Policy at all times. The following are strictly prohibited on Speed Meet Love:
          </p>
          <ul className="space-y-2 list-disc pl-5 text-[#111827]">
            <li>
              <strong>Human Trafficking &amp; Forced Labor:</strong> Any involvement in, recruitment for, promotion of, or facilitation of human trafficking, forced labor, or commercial sex trafficking.
            </li>
            <li>
              <strong>Sexual Violence &amp; Sexual Assault:</strong> Sexual violence, including sexual assault, is strictly prohibited.
            </li>
            <li>
              <strong>Sexual Exploitation &amp; Non-Consensual Sexual Content:</strong> Any sexual exploitation, coercion, sextortion, prostitution or escort solicitation, or non-consensual intimate imagery across profiles, messages, or live video.
            </li>
            <li>
              <strong>No Sexually Explicit Content or Sexual Solicitation:</strong> Speed Meet Love is for dating and connection, not sexual entertainment. Sexually explicit content and sexual solicitation are prohibited across Speed Meet Love, including in profiles, private messages, and live video dates, even when everyone involved consents.
            </li>
            <li>
              <strong>Aiding, Encouraging, or Facilitating Abuse:</strong> Assisting, encouraging, coordinating, instructing, or enabling physical, sexual, emotional, or financial abuse or exploitation of any person.
            </li>
            <li>
              <strong>Minors &amp; Child Sexual Abuse Material / Exploitation (CSAM / CSAE):</strong> Anyone under age 18 using the dating service, as well as any CSAM, CSAE, grooming, or endangerment of minors.
            </li>
            <li>
              <strong>Harassment, Threats &amp; Hateful Conduct:</strong> Harassment, stalking, intimidation, threats of violence, hate speech, or doxxing.
            </li>
            <li>
              <strong>Scams &amp; Financial Solicitation:</strong> Romance scams, advance-fee fraud, cryptocurrency or investment schemes, begging or financial solicitation, phishing links, or commercial spam.
            </li>
            <li>
              <strong>Impersonation &amp; Misrepresentation:</strong> Impersonating another person, misrepresenting your identity or age, using stolen photos, or operating automated bots.
            </li>
            <li>
              <strong>Illegal Content &amp; Unlawful Activity:</strong> Any content or conduct that violates applicable local, state, federal, or international law.
            </li>
          </ul>
          <p className="text-xs text-[#7F1D1D] font-bold pt-1">
            Violations may lead to content removal, suspension, or account termination. Review the complete rules on our{' '}
            <a href="/acceptable-use" onClick={(e) => handleNav(e, 'acceptable_use')} className="underline font-bold">
              Acceptable Use Policy (/acceptable-use)
            </a>
            .
          </p>
        </section>

        {/* Section 4 */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <CreditCard className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>4. Membership Plans, Billing &amp; Cancellation</h2>
          </div>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              <strong>Free ($0/month):</strong> Create and edit a dating profile, browse profiles, Like or Pass members, and view mutual matches. Does not include private messaging or live speed dating.
            </li>
            <li>
              <strong>Premium ($9.99 USD/month recurring):</strong> Includes Free features plus private messaging after a mutual match when both members hold an eligible paid membership (or authorized free tester access). Does not include live video speed dating.
            </li>
            <li>
              <strong>Premium Plus ($14.99 USD/month recurring):</strong> Includes Premium features plus access to live weekend speed dating events (Friday, Saturday &amp; Sunday at 7:00 PM EST, 5-minute video rounds, skips, and replays).
            </li>
            <li>
              <strong>Recurring Billing &amp; Portal Management:</strong> Web subscriptions are billed monthly through Stripe. Paid members may update payment methods, view invoices, or cancel recurring renewal through the Stripe Customer Billing Portal accessible on the{' '}
              <a href="/pricing" onClick={(e) => handleNav(e, 'pricing')} className="text-[#B91C1C] font-bold underline">
                Pricing page (/pricing)
              </a>
              .
            </li>
            <li>
              <strong>Tester Access &amp; Android Containers:</strong> Free tester access granted by the owner is separate from paid Stripe billing. Inside Android app containers, web Stripe checkout is disabled; Android release billing is handled separately via Google Play.
            </li>
          </ul>
          <p className="text-xs text-[#111827] font-medium">
            See our{' '}
            <a href="/refund-policy" onClick={(e) => handleNav(e, 'refund_policy')} className="text-[#B91C1C] font-bold underline">
              Refund Policy (/refund-policy)
            </a>{' '}
            for cancellation and billing review details.
          </p>
        </section>

        {/* Section 5 */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Ban className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>5. Safety Reporting, Enforcement &amp; Account Termination</h2>
          </div>
          <p>
            Members can block other users and submit in-app safety reports via the <strong>Report Member</strong> controls on profiles, chat threads, and live video rounds, or by emailing{' '}
            <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] font-bold underline">
              speedmeetlove@gmail.com
            </a>
            .
          </p>
          <p>
            In-app reports are saved on the server, flagged for urgent review when submitted from live video dates or high-severity categories, and reviewed by the platform owner (TeeTees Creations). Speed Meet Love does not continuously monitor live video or automatically scan it, and does not perform automated scanning or 24/7 real-time monitoring of private messages. Violations may lead to content removal, suspension, or account termination—including removal from active video rounds, permanent banning, revocation of active session tokens, and removal from matchmaking queues and active matches—as well as mandatory legal reporting (including NCMEC CyberTipline reports under 18 U.S.C. § 2258A) or responses to valid law-enforcement requests where applicable.
          </p>
          <p>
            You may permanently delete your account at any time from your Profile Settings or view deletion instructions on{' '}
            <a href="/delete-account" onClick={(e) => handleNav(e, 'delete_account')} className="text-[#B91C1C] font-bold underline">
              /delete-account
            </a>
            .
          </p>
        </section>

        {/* Section 6 */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Scale className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>6. User Content, Disclaimers &amp; Limitation of Liability</h2>
          </div>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              <strong>Your Content:</strong> You retain ownership of the profile details, photos, and messages you submit, and grant TeeTees Creations a limited license to host and display that content as needed to operate Speed Meet Love for you and eligible members.
            </li>
            <li>
              <strong>Platform Ownership:</strong> The Speed Meet Love name, logo, software, and site design remain the property of TeeTees Creations.
            </li>
            <li>
              <strong>Service Provided &ldquo;As Is&rdquo;:</strong> Speed Meet Love is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of specific dating outcomes, uninterrupted availability, or third-party member conduct. Always exercise personal judgment when communicating with or meeting other adults.
            </li>
            <li>
              <strong>Limitation of Liability:</strong> To the maximum extent permitted by applicable law, TeeTees Creations shall not be liable for indirect, incidental, special, consequential, or punitive damages, or for the conduct of other users on or off the service.
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-300 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Mail className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>7. Updates &amp; Contact Information</h2>
          </div>
          <p>
            TeeTees Creations may update these Terms from time to time by posting a revised version on this page. For questions about these Terms, contact:
          </p>
          <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-1">
            <p className="font-bold text-[#111827]">Speed Meet Love · TeeTees Creations</p>
            <p className="text-xs text-[#111827]">
              <strong>Email:</strong>{' '}
              <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] font-bold underline font-mono">
                speedmeetlove@gmail.com
              </a>
            </p>
            <p className="text-xs text-[#111827]">
              <strong>Website:</strong> https://speedmeetlove.com
            </p>
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rose-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/acceptable-use" onClick={(e) => handleNav(e, 'acceptable_use')} className="text-[#B91C1C] font-bold hover:underline">
            Acceptable Use Policy
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-[#111827] font-bold hover:underline">
            Privacy Policy
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/refund-policy" onClick={(e) => handleNav(e, 'refund_policy')} className="text-[#111827] font-bold hover:underline">
            Refund Policy
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/law-enforcement" onClick={(e) => handleNav(e, 'law_enforcement')} className="text-[#111827] font-bold hover:underline">
            Law Enforcement
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
