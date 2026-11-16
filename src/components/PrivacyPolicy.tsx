import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';
import {
  ShieldCheck,
  Lock,
  Camera,
  Mic,
  Video,
  Eye,
  EyeOff,
  UserCheck,
  Server,
  Trash2,
  Mail,
  Heart,
  Calendar,
  MessageCircle,
  FileText,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
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
          <span>Effective Date: November 2, 2026</span>
          <span>·</span>
          <span>Version 1.0</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white p-6 sm:p-10 shadow-xl border-2 border-red-700 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase border border-white/30 text-white font-heading">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Official Privacy Policy</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-rose-100 max-w-2xl font-medium leading-relaxed">
            Speed Meet Love is committed to protecting your personal information, safeguarding your confidential voting choices, and respecting your privacy during live speed dating.
          </p>

          <div className="pt-2 text-xs text-white/90 font-semibold flex flex-wrap items-center gap-2">
            <span>Operated by <strong>TeeTees Creations</strong></span>
            <span>·</span>
            <span>Contact: <a href="mailto:speedmeetlove@gmail.com" className="underline hover:text-amber-200 font-bold">speedmeetlove@gmail.com</a></span>
          </div>
        </div>
      </div>

      {/* Quick Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-300 flex items-center justify-center text-[#BE185D]">
            <Lock className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-[#111827] font-heading">Confidential Voting</h2>
          <p className="text-xs text-[#111827] font-medium leading-relaxed">
            Your post-round votes (Like or Pass) and private notes are strictly secret. Other members only learn you liked them if feelings are mutual.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-300 flex items-center justify-center text-[#BE185D]">
            <Video className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-[#111827] font-heading">No Video Recording</h2>
          <p className="text-xs text-[#111827] font-medium leading-relaxed">
            Five-minute speed dating and ten-minute second-chance video streams are live and ephemeral. Speed Meet Love does not record or store your dates.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-300 flex items-center justify-center text-[#BE185D]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-[#111827] font-heading">No Data Selling</h2>
          <p className="text-xs text-[#111827] font-medium leading-relaxed">
            TeeTees Creations does not sell, rent, or trade your personal data, profile photos, or contact information to advertisers or data brokers.
          </p>
        </div>
      </div>

      {/* Detailed Policy Sections */}
      <div className="space-y-6 text-[#111827] font-medium text-xs sm:text-sm leading-relaxed">

        {/* Section 1: Introduction */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <FileText className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>1. Introduction & About Speed Meet Love</h2>
          </div>
          <p>
            Welcome to <strong>Speed Meet Love</strong> (“the Application,” “we,” “us,” or “our”), designed and operated by <strong>TeeTees Creations</strong>. Speed Meet Love is a structured speed dating platform offering weekend events (Friday, Saturday, and Sunday at 7:00 PM EST) featuring five-minute one-on-one live video rounds, confidential voting, mutual spark reveals, and direct messaging between mutually matched daters.
          </p>
          <p>
            This Privacy Policy explains how TeeTees Creations collects, uses, shares, stores, and protects personal information when you use Speed Meet Love, as well as how you may exercise your privacy rights and request data deletion. By accessing or using Speed Meet Love, you acknowledge the practices described in this policy.
          </p>
          <p className="font-bold text-[#111827]">
            Privacy and Support Contact: <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] underline font-mono">speedmeetlove@gmail.com</a>
          </p>
        </section>

        {/* Section 2: Information We Collect */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <UserCheck className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>2. Information We Collect</h2>
          </div>
          <p>
            To provide live video speed dating, pair compatible members, and maintain platform safety, we collect the following categories of data:
          </p>
          <ul className="space-y-2.5 list-disc pl-5 text-[#111827]">
            <li>
              <strong>Profile & Account Details:</strong> First name, optional last name (stored securely and not displayed on public cards), email address, age and date of birth (used to verify that all participants are adults aged 18 and older), gender identity ('Woman', 'Man', 'Non-Binary'), dating preferences ('Men', 'Women', 'Everyone'), location (city, state, or approximate distance), occupation, bio, hobbies and interests tags, and icebreaker prompt responses.
            </li>
            <li>
              <strong>Voluntary Lifestyle Attributes:</strong> Height (in inches), hair color, eye color, relationship intent ('Serious Relationship', 'Casual Dating', 'Friendship First', 'Not Sure Yet'), smoking habit, drinking habit, and children/family plans. You may voluntarily provide or omit these attributes at any time.
            </li>
            <li>
              <strong>Privacy Visibility Controls:</strong> Settings you choose in your profile to show or hide sensitive attributes (such as height, smoking, drinking, children, or approximate distance) from public browse cards.
            </li>
            <li>
              <strong>Event & Speed Dating Participation Records:</strong> Event registrations for Friday, Saturday, or Sunday sessions, waiting room queue status, mutual readiness confirmations (tapping &ldquo;Next Date / I&rsquo;m Ready&rdquo;), round participation timestamps, and session presence.
            </li>
            <li>
              <strong>Confidential Ballots & Notes:</strong> Your post-round decision (voting &ldquo;Like&rdquo; or &ldquo;Pass&rdquo;) for each dater and any private text notes you write during or immediately after the date.
            </li>
            <li>
              <strong>Mutual Matches & In-App Messages:</strong> Records of mutual sparks created when both daters vote &ldquo;Like,&rdquo; direct chat messages exchanged between confirmed mutual matches (message text, sender, recipient, timestamps, and read indicators), and second-chance date invitation requests/statuses.
            </li>
            <li>
              <strong>Safety & Community Reports:</strong> Information submitted via the &ldquo;Report Member&rdquo; feature, including the reported member ID, violation category, your optional description notes, report timestamp, and your personal blocked users list.
            </li>
            <li>
              <strong>Membership, Billing &amp; Subscription Tier:</strong> Your active plan tier (Free at $0/month, Premium at $9.99/month, or Premium Plus at $14.99/month) and web subscription identifiers (Stripe customer ID, subscription ID, price ID, subscription status, and billing period end timestamp). Payment card details are submitted directly to Stripe and are not stored on Speed Meet Love servers. Separate free tester privileges granted by the operator are stored independently of paid Stripe status.
            </li>
            <li>
              <strong>Technical & Device Data:</strong> Client clock synchronization offsets (`/api/time`), browser user-agent details, and media hardware availability (presence of camera and microphone devices).
            </li>
          </ul>
        </section>

        {/* Section 3: How We Use Your Information */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Calendar className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>3. Purposes of Data Processing</h2>
          </div>
          <p>We process your personal information strictly for legitimate operational purposes:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-200 space-y-1">
              <span className="font-bold text-[#111827] text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                Event Pairing & Matchmaking
              </span>
              <p className="text-[11px] text-[#111827] font-medium">
                Organizing round schedules and pairing consenting daters during weekend events based on age, orientation, and mutual readiness.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-200 space-y-1">
              <span className="font-bold text-[#111827] text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                Live Video Connection
              </span>
              <p className="text-[11px] text-[#111827] font-medium">
                Generating secure, short-lived room tokens to connect two matched daters in real-time WebRTC video calls.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-200 space-y-1">
              <span className="font-bold text-[#111827] text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                Confidential Match Calculation
              </span>
              <p className="text-[11px] text-[#111827] font-medium">
                Evaluating post-round secret ballots and revealing mutual matches only when both participants submit a Like.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFF8FA] border border-pink-200 space-y-1">
              <span className="font-bold text-[#111827] text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                Safety & Abuse Prevention
              </span>
              <p className="text-[11px] text-[#111827] font-medium">
                Enforcing 18+ adult restrictions, honoring member blocks, and reviewing community violation reports.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: What Other Members Can and Cannot See */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Eye className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>4. What Other Members Can and Cannot See</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-2">
              <div className="flex items-center gap-2 text-[#064E3B] font-bold text-xs uppercase tracking-wider font-heading">
                <Eye className="w-4 h-4 text-[#047857]" />
                <span>Visible to Other Members</span>
              </div>
              <ul className="space-y-1 text-xs text-[#111827] font-medium list-disc pl-4">
                <li>Your First Name and Age</li>
                <li>Your Profile Photo and Avatar</li>
                <li>Your Occupation and Bio</li>
                <li>Your Interests and Icebreaker answers</li>
                <li>Your live camera feed during video dates</li>
                <li>Lifestyle attributes you choose to share (height, smoking, drinking, children, approximate location)</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-300 space-y-2">
              <div className="flex items-center gap-2 text-[#881337] font-bold text-xs uppercase tracking-wider font-heading">
                <EyeOff className="w-4 h-4 text-[#BE123C]" />
                <span>Never Visible to Other Members</span>
              </div>
              <ul className="space-y-1 text-xs text-[#111827] font-medium list-disc pl-4">
                <li>Your Last Name and Email Address</li>
                <li>Your confidential post-round votes (Like or Pass)</li>
                <li>Your confidential private dater notes</li>
                <li>Your safety reports and blocked lists</li>
                <li>Exact street addresses or precise GPS coordinates</li>
                <li>Attributes you have toggled off in Privacy Settings</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 5: Camera & Microphone Use and Video Processing */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Camera className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>5. Camera, Microphone Use & Video Processing</h2>
          </div>
          <p>
            Speed Meet Love relies on real-time WebRTC audio and video capabilities to deliver one-on-one speed dating:
          </p>
          <ul className="space-y-2 list-disc pl-5 text-[#111827]">
            <li>
              <strong>Hardware Access Permissions:</strong> The application requests access to your camera and microphone via standard browser permissions (`navigator.mediaDevices.getUserMedia`). This access is used only while testing equipment in the event lobby, during active five-minute speed dating calls, and during ten-minute second-chance video dates.
            </li>
            <li>
              <strong>Live & Ephemeral Media Transmission:</strong> Video and audio streams are transmitted in real time between participants using WebRTC routed through a Selective Forwarding Unit (SFU) provided by LiveKit.
            </li>
            <li>
              <strong>No Video or Audio Recording:</strong> Speed Meet Love does <strong>not</strong> record, transcribe, archive, or save video or audio streams from your dates. Video streams are temporary real-time transmissions that terminate immediately upon call completion.
            </li>
            <li>
              <strong>Participant Controls:</strong> You retain full control over your media during every call. You may toggle off your video camera or mute your microphone at any time using the on-screen controls.
            </li>
            <li>
              <strong>Enforced Round Expiration:</strong> The server-authoritative timer automatically disconnects video tracks and closes the video room when the round duration expires (exactly 300 seconds for speed dates; 600 seconds for second-chance dates).
            </li>
          </ul>
        </section>

        {/* Section 6: Third-Party Service Providers */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Server className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>6. Third-Party Service Providers</h2>
          </div>
          <p>We work with trusted infrastructure providers to deliver our service:</p>
          <ul className="space-y-2 list-disc pl-5 text-[#111827]">
            <li>
              <strong>Stripe (Payment Processing):</strong> Processes web subscription checkouts ($9.99/month Premium and $14.99/month Premium Plus), recurring billing, webhooks, and self-serve subscription management via the Stripe Customer Billing Portal. Speed Meet Love stores only Stripe customer/subscription identifiers and status—never full card numbers.
            </li>
            <li>
              <strong>Google Firebase (Authentication &amp; Cloud Firestore):</strong> Provides account authentication (including password resets) and durable cloud storage for member profiles and account metadata.
            </li>
            <li>
              <strong>LiveKit (LiveKit Cloud):</strong> Provides cloud WebRTC signaling and media routing for live video and audio streams. LiveKit receives short-lived, cryptographically signed room access tokens generated by our server with a 15-minute time-to-live (TTL). LiveKit processes transient media streams to connect participants.
            </li>
            <li>
              <strong>Cloud Hosting Infrastructure:</strong> Application servers and container environments host the web application, API routes, and backend logic.
            </li>
            <li>
              <strong>No Sale or Rental of Personal Information:</strong> TeeTees Creations does not sell, rent, monetize, or disclose your personal data, profile photos, or contact information to commercial data brokers, advertising networks, or third-party marketers.
            </li>
          </ul>
        </section>

        {/* Section 7: Data Storage, Retention & Security */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Lock className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>7. Data Storage, Retention & Security</h2>
          </div>
          <div className="space-y-3 text-[#111827]">
            <p>
              <strong>Storage Mechanisms:</strong> Client-side preferences and session states are stored in your browser&rsquo;s local web storage (`localStorage`). Server-authoritative user profiles, event sessions, persistent matches, round votes, and safety reports are persisted in Google Cloud Firestore and application server data files (`matches.json`, `round_votes.json`, `safety_reports.json`, `banned_users.json`, `granted_testers.json`).
            </p>
            <p>
              <strong>Security Controls in Code:</strong>
            </p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li>LiveKit room tokens are generated exclusively on the backend using server-side API keys and secrets; credentials are never exposed to the client.</li>
              <li>Tokens are minted with strict short-lived TTLs (15 minutes) and are bound to specific event and dater pair room names.</li>
              <li>Multi-gate server checks: Video tokens are granted only after verifying adult age (18+), event registration, and mutual readiness confirmation.</li>
              <li>Authoritative round timers enforce call termination at the deadline, disconnecting media feeds automatically.</li>
              <li>Developer testing endpoints (such as timer-shifting tools) have been removed from the public API.</li>
            </ul>
            <p>
              <strong>Data Retention:</strong> Saved profiles, mutual matches, and messages remain in storage until the user deletes their account. Ephemeral live round session states and matchmaking queue presence expire within 30 minutes of event inactivity.
            </p>
            <p>
              <strong>Actual Retention Exceptions:</strong>
            </p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li>
                <strong>Cloud Edge Infrastructure Logs:</strong> Temporary web server network access logs (incoming IP address, browser user-agent, requested URL, and timestamp) are collected by cloud hosting edge infrastructure (Google Cloud Run / Node reverse proxies) for security and DDoS defense, and are retained for up to 30 days before automated rotation. These logs cannot be pruned by application code.
              </li>
              <li>
                <strong>Prior Community Safety Reports:</strong> Violation reports previously filed by other members regarding abuse or harassment may be retained in administrative records to enforce permanent platform bans.
              </li>
              <li>
                <strong>Stripe Billing &amp; Transaction Records:</strong> When you subscribe via Stripe on the web, Stripe maintains payment method, invoice, and transaction records in accordance with Stripe&rsquo;s privacy policy and applicable financial/tax obligations. Canceling your recurring subscription can be done anytime via the Stripe Customer Billing Portal on the Pricing page.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 8: Account & Data Deletion Requests */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Trash2 className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>8. Account &amp; Data Deletion Requests</h2>
          </div>
          <p>
            You have the absolute right to permanently delete your Speed Meet Love account, profile information, photos, mutual matches, chat messages, confidential votes, private notes, and event registrations at any time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300 text-[#064E3B] space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-[#064E3B]">
                <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Option 1: In-App Self-Serve Deletion</span>
              </div>
              <p className="text-xs text-[#111827] font-medium leading-relaxed">
                You can delete your account directly inside the app. Sign in, go to <strong>My Profile</strong> (Profile Settings), scroll to <strong>Danger Zone: Permanent Account Deletion</strong>, tap <strong>Delete My Account</strong>, enter your registered email address to verify ownership, and confirm. Your records will be permanently purged on the server immediately.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentView('delete_account')}
                  className="text-xs font-bold text-[#065F46] underline hover:text-[#064E3B] cursor-pointer"
                >
                  View Public Deletion Page (/delete-account) →
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-300 text-[#881337] space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-[#881337]">
                <Mail className="w-4 h-4 text-[#B91C1C] shrink-0" />
                <span>Option 2: Support Email Request</span>
              </div>
              <p className="text-xs text-[#111827] font-medium leading-relaxed">
                If you cannot sign in or prefer email assistance, email{' '}
                <a href="mailto:speedmeetlove@gmail.com" className="font-bold underline text-[#B91C1C]">
                  speedmeetlove@gmail.com
                </a>{' '}
                with subject line <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold text-[#111827]">Account &amp; Data Deletion Request</code> from your registered email. Our team will verify and permanently delete your account within 48 business hours.
              </p>
            </div>
          </div>
        </section>

        {/* Section 9: Safety, Blocking & Reporting */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <ShieldCheck className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>9. Community Safety, Blocking & Reporting</h2>
          </div>
          <p>
            We prioritize member safety and respectful behavior. You may at any time:
          </p>
          <ul className="space-y-1.5 list-disc pl-5 text-[#111827]">
            <li>
              <strong>Block a Member:</strong> Instantly hides the member from your browse feed, removes existing matches, and filters out mutual messages.
            </li>
            <li>
              <strong>Report Inappropriate Conduct:</strong> Submit a confidential report detailing violations (such as harassment, inappropriate video behavior, or fraudulent profiles) for review by the TeeTees Creations safety team.
            </li>
          </ul>
        </section>

        {/* Section 10: Age Restrictions & Children's Privacy */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <UserCheck className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>10. Adults Only (18+) Policy &amp; Child Safety Standards</h2>
          </div>
          <p>
            Speed Meet Love is strictly restricted to consenting adults aged 18 and older. We enforce zero tolerance for underage registration, child sexual abuse material (CSAM), child sexual abuse and exploitation (CSAE), grooming, and any form of minor endangerment. If we learn that a user is under 18 years old, we promptly terminate the account and purge all associated records.
          </p>
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-[#78350F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-[#B45309] shrink-0" />
              <div>
                <p className="font-bold text-xs text-[#78350F]">Child Sexual Abuse &amp; Exploitation (CSAE) Policy</p>
                <p className="text-[11px] text-[#78350F] font-medium">
                  Read our full Google Play Child Safety Standards declaration, reporting procedures, and law enforcement escalation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('child_safety')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-xs"
            >
              View Child Safety (/child-safety) →
            </button>
          </div>
        </section>

        {/* Section 11: Changes to this Policy */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <FileText className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>11. Updates to this Privacy Policy</h2>
          </div>
          <p>
            TeeTees Creations may update this Privacy Policy from time to time to reflect operational, legal, or technical changes. When updates are published, the revised date at the top of this page will be updated. We encourage you to review this policy periodically.
          </p>
        </section>

        {/* Section 12: Contact Us */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-300 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Mail className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>12. Contacting TeeTees Creations</h2>
          </div>
          <p className="text-[#111827]">
            If you have questions, feedback, or requests regarding this Privacy Policy or your personal information, please reach out to:
          </p>
          <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-1">
            <p className="font-bold text-[#111827]">Speed Meet Love</p>
            <p className="text-[#111827] font-medium text-xs">A TeeTees Creations Application</p>
            <p className="text-xs pt-1 text-[#111827]">
              <strong>Privacy &amp; Support Inquiries:</strong>{' '}
              <a href="mailto:speedmeetlove@gmail.com" className="text-[#B91C1C] font-bold underline font-mono">
                speedmeetlove@gmail.com
              </a>
            </p>
          </div>
        </section>

      </div>

      {/* Footer Back to Home button */}
      <div className="pt-4 text-center">
        <button
          onClick={() => setCurrentView('home')}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-black text-xs sm:text-sm shadow-md shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
        >
          Return to Speed Meet Love Home
        </button>
      </div>
    </div>
  );
};
