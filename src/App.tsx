/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { trackScreenPageView } from './utils/analytics';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { BrowseProfiles } from './components/BrowseProfiles';
import { EventList } from './components/EventList';
import { EventLobby } from './components/EventLobby';
import { LiveRoundScreen } from './components/LiveRoundScreen';
import { MatchResults } from './components/MatchResults';
import { MatchRevealScreen } from './components/MatchRevealScreen';
import { SecondChanceDateRoom } from './components/SecondChanceDateRoom';
import { MessagingPortal } from './components/MessagingPortal';
import { SubscriptionScreen } from './components/SubscriptionScreen';
import { ProfileSetup } from './components/ProfileSetup';
import { DatabaseViewer } from './components/DatabaseViewer';
import { ReportModal } from './components/ReportModal';
import { SecondChanceInvitationModal } from './components/SecondChanceInvitationModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SpeedMeetLoveLogo } from './components/SpeedMeetLoveLogo';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { DeleteAccountPage } from './components/DeleteAccountPage';
import { ChildSafetyPage } from './components/ChildSafetyPage';
import { TermsPage } from './components/TermsPage';
import { AcceptableUsePage } from './components/AcceptableUsePage';
import { RefundPolicyPage } from './components/RefundPolicyPage';
import { LawEnforcementPage } from './components/LawEnforcementPage';
import { ContactPage } from './components/ContactPage';
import { OwnerReportsView } from './components/OwnerReportsView';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { LaunchOfferCelebrationModal } from './components/LaunchOfferCelebrationModal';
import { Heart, Zap, Sparkles, Mail } from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    currentUser,
    currentView,
    setCurrentView,
    notification,
    clearNotification,
    isAuthenticated,
    isOwner,
    confirmedLaunchEvents,
    setIsEmailVerificationModalOpen,
  } = useApp();

  useEffect(() => {
    trackScreenPageView(currentView);
  }, [currentView]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8FA] text-[#111827] font-medium">
      <Navbar />

      {isAuthenticated && currentUser && !currentUser.EmailVerified && !isOwner && !currentUser.IsTester && (
        <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-teal-50 border-b border-pink-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#111827] font-medium">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Mail className="w-4 h-4 text-[#BE185D] shrink-0" />
              <span>
                Please verify your email address (<strong>{currentUser.Email}</strong>) to complete your account verification.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEmailVerificationModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#BE185D] hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors shrink-0"
            >
              Verify Email
            </button>
          </div>
        </div>
      )}

      {/* Global floating toast notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold flex items-center gap-3 backdrop-blur-md bg-white ${
              notification.type === 'pink'
                ? 'border-[#BE185D] text-[#111827] shadow-pink-500/15'
                : notification.type === 'success'
                ? 'border-emerald-600 text-[#111827] shadow-emerald-500/15'
                : 'border-rose-500 text-[#111827] shadow-rose-500/15'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'pink' && (
                <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-[#BE185D] fill-[#BE185D] shrink-0" />
                </div>
              )}
              {notification.type === 'success' && (
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                </div>
              )}
              {notification.type === 'info' && (
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-[#BE123C] shrink-0" />
                </div>
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={clearNotification}
              className="text-[#111827] hover:text-[#BE123C] ml-2 text-xs font-bold p-1"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ErrorBoundary fallbackTitle="Speed Meet Love Lounge">
          {currentView === 'home' && <HomeScreen />}
          {currentView === 'browse' && (isAuthenticated ? <BrowseProfiles /> : <AuthGate featureName="Browse Singles" />)}
          {currentView === 'matches' && (isAuthenticated ? <MatchResults /> : <AuthGate featureName="My Matches" />)}
          {currentView === 'results' && (isAuthenticated ? <MatchRevealScreen /> : <AuthGate featureName="Date Spark Reveal" />)}
          {currentView === 'second_date' && (isAuthenticated ? <SecondChanceDateRoom /> : <AuthGate featureName="Second-Chance Date Lounge" />)}
          {currentView === 'messages' && (isAuthenticated ? <MessagingPortal /> : <AuthGate featureName="Messages" />)}
          {currentView === 'friday' && (isAuthenticated ? <EventList /> : <AuthGate featureName="Weekend Speed Dating Events" />)}
          {currentView === 'lobby' && (isAuthenticated ? <EventLobby /> : <AuthGate featureName="Waiting Room & Event Lobby" />)}
          {currentView === 'live' && (isAuthenticated ? <LiveRoundScreen /> : <AuthGate featureName="Live Speed Dating Video" />)}
          {currentView === 'pricing' && <SubscriptionScreen />}
          {currentView === 'profile' && (isAuthenticated ? <ProfileSetup /> : <AuthGate featureName="Profile Settings" />)}
          {currentView === 'tables' && (isOwner ? <DatabaseViewer /> : <AuthGate featureName="Platform Settings" />)}
          {currentView === 'privacy' && <PrivacyPolicy />}
          {currentView === 'delete_account' && <DeleteAccountPage />}
          {currentView === 'child_safety' && <ChildSafetyPage />}
          {currentView === 'terms' && <TermsPage />}
          {currentView === 'acceptable_use' && <AcceptableUsePage />}
          {currentView === 'refund_policy' && <RefundPolicyPage />}
          {currentView === 'law_enforcement' && <LawEnforcementPage />}
          {currentView === 'contact' && <ContactPage />}
          {currentView === 'owner_reports' && <OwnerReportsView defaultTab="reports" />}
          {currentView === 'owner_users' && <OwnerReportsView defaultTab="users" />}
          {currentView === 'owner_waitlist' && <OwnerReportsView defaultTab="waitlist" />}
        </ErrorBoundary>
      </main>

      {/* Global Safety Modal */}
      <ReportModal />

      {/* Global In-App Second-Chance Date Notification Modal */}
      <SecondChanceInvitationModal />

      {/* Real Email/Password Authentication Modal */}
      <AuthModal />

      {/* Email Verification & First-50 Launch Celebration Modals */}
      <EmailVerificationModal />
      <LaunchOfferCelebrationModal />

      {/* Speed Meet Love Brand Footer */}
      <footer className="border-t-2 border-rose-200 py-8 bg-white text-xs text-[#111827] font-medium mt-auto shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SpeedMeetLoveLogo variant="on-light" size="sm" />
              <span className="text-[#BE185D] font-bold">·</span>
              <span className="italic font-bold text-[#111827]">“Real People. Real Connections. In Minutes.”</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-[#111827] font-semibold">
              <span>
                {confirmedLaunchEvents.length > 0
                  ? `${confirmedLaunchEvents[0].EventDate} · 7:00 PM EST`
                  : 'First event date coming soon'}
              </span>
              <span className="text-slate-400 font-bold">·</span>
              <span>5-Min Video Rounds</span>
              <span className="text-slate-400 font-bold">·</span>
              <span>© 2026 Speed Meet Love by TeeTees Creations</span>
            </div>
          </div>

          <nav
            aria-label="Legal, pricing, safety, and contact links"
            className="flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-2 pt-3 border-t border-rose-200 text-[#111827] font-semibold"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
              <a
                href="/pricing"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('pricing');
                }}
                className="font-bold text-[#BE123C] hover:text-rose-900 underline cursor-pointer"
              >
                Pricing
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('terms');
                }}
                className="font-bold text-[#BE123C] hover:text-rose-900 underline cursor-pointer"
              >
                Terms &amp; Conditions
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/acceptable-use"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('acceptable_use');
                }}
                className="font-bold text-[#BE123C] hover:text-rose-900 underline cursor-pointer"
              >
                Acceptable Use Policy
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('privacy');
                }}
                className="font-bold text-[#BE123C] hover:text-rose-900 underline cursor-pointer"
              >
                Privacy Policy
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/refund-policy"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('refund_policy');
                }}
                className="font-bold text-[#BE123C] hover:text-rose-900 underline cursor-pointer"
              >
                Refund Policy
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/law-enforcement"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('law_enforcement');
                }}
                className="font-bold text-[#B91C1C] hover:text-red-900 underline cursor-pointer"
              >
                Law-Enforcement Protocols
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/child-safety"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('child_safety');
                }}
                className="font-bold text-[#B91C1C] hover:text-red-900 underline cursor-pointer"
              >
                Child Safety
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/delete-account"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('delete_account');
                }}
                className="font-bold text-[#B91C1C] hover:text-red-900 underline cursor-pointer"
              >
                Delete Account
              </a>
              <span className="text-slate-400 font-bold">·</span>
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView('contact');
                }}
                className="font-bold text-[#B91C1C] hover:text-red-900 underline cursor-pointer"
              >
                Contact
              </a>
            </div>
            <div className="text-[11px] text-[#111827] font-semibold">
              <a href="mailto:speedmeetlove@gmail.com" className="hover:underline font-semibold">
                speedmeetlove@gmail.com
              </a>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
