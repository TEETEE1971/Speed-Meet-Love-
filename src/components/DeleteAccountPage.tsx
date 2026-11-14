import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Trash2,
  ShieldAlert,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  User,
  HeartHandshake,
  Lock,
  MessageCircle,
  Video,
  FileText
} from 'lucide-react';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';

export const DeleteAccountPage: React.FC = () => {
  const { setCurrentView, currentUser } = useApp();

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb & Return Button */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-rose-700 hover:text-rose-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Speed Meet Love Home</span>
        </button>

        <span className="text-xs font-bold text-slate-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
          Public Deletion Instructions
        </span>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-xl space-y-3">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-extrabold border border-white/30">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Speed Meet Love · TeeTees Creations</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-tight">
              Delete Account &amp; Data Removal
            </h1>
            <p className="text-sm sm:text-base text-rose-100 leading-relaxed">
              Transparent instructions on how to permanently delete your Speed Meet Love account, erase all personal data, and submit alternative removal requests.
            </p>
          </div>

          <div className="shrink-0 bg-white/10 p-4 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-center">
            <SpeedMeetLoveLogo variant="on-red" size="md" />
            <span className="text-[11px] font-bold text-rose-100 mt-2">Self-Serve or Email Support</span>
          </div>
        </div>
      </div>

      {/* Two Methods for Deletion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Method 1: In-App Self-Serve */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-red-200 shadow-md space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <h2>Option 1: In-App Self-Serve Deletion</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you have access to your account, you can permanently delete your profile and personal data instantly from within the application:
            </p>
            <ol className="list-decimal pl-5 text-xs text-slate-700 space-y-2 pt-1 font-medium">
              <li>
                Sign in to your Speed Meet Love account.
              </li>
              <li>
                Open the menu and navigate to <strong className="text-slate-900">My Profile</strong> (Profile Settings).
              </li>
              <li>
                Scroll down to the <strong className="text-red-600">Danger Zone: Permanent Account Deletion</strong> section.
              </li>
              <li>
                Tap <strong className="text-red-600">Delete My Account</strong>.
              </li>
              <li>
                Type your registered email address to verify account ownership.
              </li>
              <li>
                Confirm deletion. Your account, profile photos, matches, chat messages, confidential votes, and notes will be permanently purged on the server immediately.
              </li>
            </ol>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setCurrentView('profile')}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Go to Profile Settings Now</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Requires active session sign-in
            </p>
          </div>
        </div>

        {/* Method 2: Alternative Support Email */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-100 shadow-md space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <h2>Option 2: Email Deletion Request</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you are unable to access your account, lost device access, or prefer manual assistance, our privacy team processes requests directly:
            </p>
            <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200 text-xs space-y-2 text-slate-800">
              <p className="font-bold text-slate-900">Send an email with the following details:</p>
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-700">
                <li>
                  <strong>To:</strong>{' '}
                  <a
                    href="mailto:speedmeetlove@gmail.com?subject=Account%20%26%20Data%20Deletion%20Request"
                    className="text-red-600 font-bold underline font-mono"
                  >
                    speedmeetlove@gmail.com
                  </a>
                </li>
                <li>
                  <strong>Subject:</strong>{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200 font-mono font-bold text-slate-900">
                    Account &amp; Data Deletion Request
                  </code>
                </li>
                <li>
                  <strong>Sender:</strong> Send from your registered Speed Meet Love email address so we can authenticate ownership.
                </li>
                <li>
                  <strong>Message body:</strong> Your full name and explicit confirmation requesting permanent account deletion.
                </li>
              </ul>
            </div>
            <p className="text-[11px] text-slate-500">
              Email deletion requests are reviewed and verified within 48 business hours by TeeTees Creations.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <a
              href="mailto:speedmeetlove@gmail.com?subject=Account%20%26%20Data%20Deletion%20Request"
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Email speedmeetlove@gmail.com</span>
            </a>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Privacy contact: TeeTees Creations
            </p>
          </div>
        </div>

      </div>

      {/* Scope: What Data is Deleted */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <h2>Data Erased Upon Account Deletion</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          When account deletion is executed, Speed Meet Love immediately and permanently purges the following records from active application databases and server storage:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-rose-600" />
              Profile &amp; Biography
            </span>
            <p className="text-[11px] text-slate-600">
              First name, age, gender, interested in, occupation, location, bio, interests, icebreaker answers, and avatar preferences.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
              Mutual Matches
            </span>
            <p className="text-[11px] text-slate-600">
              All mutual sparks, match pairings, chemistry scores, and second-chance date invitation records.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-rose-600" />
              In-App Chat Messages
            </span>
            <p className="text-[11px] text-slate-600">
              All direct chat text, message timestamps, sender/recipient metadata, and read receipts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              Votes &amp; Private Notes
            </span>
            <p className="text-[11px] text-slate-600">
              Confidential speed dating ballots (Like or Pass) and your private dater notes written during rounds.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-rose-600" />
              Video Rooms &amp; Events
            </span>
            <p className="text-[11px] text-slate-600">
              Event registrations, matchmaking queue presence, live room credentials, and active round presence.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1">
            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              Session Tokens
            </span>
            <p className="text-[11px] text-slate-600">
              All active authentication tokens and device session cache are instantly revoked and invalidated.
            </p>
          </div>
        </div>
      </div>

      {/* Disclosures: Retention Exceptions */}
      <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/70 border border-amber-200 shadow-xs space-y-3 text-amber-950">
        <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-amber-900 font-heading">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <h2>Retention Exceptions Disclosed Transparently</h2>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          In compliance with privacy standards and engineering reality, we explain any records that cannot be instantaneously or completely deleted, and the specific reasons why:
        </p>

        <ul className="space-y-2 text-xs list-disc pl-5 text-amber-950">
          <li>
            <strong>Ephemeral Cloud Edge Infrastructure Logs:</strong> Raw web server access logs (including incoming IP address, browser user-agent, requested URL, and timestamp) are collected automatically by edge hosting infrastructure (Google Cloud Run / Node reverse proxies) for DDoS defense, system performance, and rate limiting. These temporary server access logs are automatically rotated and deleted after 30 days and cannot be selectively modified or purged by application code.
          </li>
          <li>
            <strong>Prior Community Safety &amp; Abuse Reports:</strong> If another member previously filed an abuse, harassment, or conduct violation report against the account prior to deletion, the safety report details and reported user ID may be retained in administrative trust &amp; safety archives to enforce permanent bans against bad actors.
          </li>
          <li>
            <strong>Offline Device Cache on Other Members&rsquo; Phones:</strong> If you exchanged messages with a mutual match whose device is currently offline or cached, your conversation on their physical device will update and disappear once their device re-establishes a live network connection with the server.
          </li>
          <li>
            <strong>Subscription &amp; Stripe Billing Records:</strong> Web subscriptions ($9.99/month Premium and $14.99/month Premium Plus) are processed via Stripe. Deleting your Speed Meet Love account removes your profile, photos, matches, messages, and application records, and we recommend canceling any active recurring subscription in the Stripe Customer Billing Portal (/pricing) first so future renewals do not occur. Stripe may retain payment, invoice, and tax/accounting records as required for financial compliance and chargeback protection.
          </li>
        </ul>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-rose-200">
        <button
          onClick={() => setCurrentView('privacy')}
          className="text-xs font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
        >
          View Full Privacy Policy
        </button>

        <button
          onClick={() => setCurrentView('home')}
          className="px-6 py-2.5 rounded-2xl btn-glossy-red-pink text-white font-extrabold text-xs shadow-md cursor-pointer"
        >
          Return to Speed Meet Love Home
        </button>
      </div>

    </div>
  );
};
