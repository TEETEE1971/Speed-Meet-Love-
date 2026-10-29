/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
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
import { ErrorBoundary } from './components/ErrorBoundary';
import { SpeedMeetLoveLogo } from './components/SpeedMeetLoveLogo';
import { Heart, Zap, Sparkles } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentView, setCurrentView, notification, clearNotification } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8FA] text-[#1E293B]">
      <Navbar />

      {/* Global floating toast notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold flex items-center gap-3 backdrop-blur-md bg-white ${
              notification.type === 'pink'
                ? 'border-[#FF2E93] text-slate-900 shadow-pink-500/15'
                : notification.type === 'success'
                ? 'border-emerald-500 text-slate-900 shadow-emerald-500/15'
                : 'border-rose-400 text-slate-900 shadow-rose-500/15'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'pink' && (
                <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-[#FF2E93] fill-[#FF2E93] shrink-0" />
                </div>
              )}
              {notification.type === 'success' && (
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
              )}
              {notification.type === 'info' && (
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                </div>
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={clearNotification}
              className="text-slate-400 hover:text-slate-700 ml-2 text-xs font-bold p-1"
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
          {currentView === 'browse' && <BrowseProfiles />}
          {currentView === 'matches' && <MatchResults />}
          {currentView === 'results' && <MatchRevealScreen />}
          {currentView === 'second_date' && <SecondChanceDateRoom />}
          {currentView === 'messages' && <MessagingPortal />}
          {currentView === 'friday' && <EventList />}
          {currentView === 'lobby' && <EventLobby />}
          {currentView === 'live' && <LiveRoundScreen />}
          {currentView === 'pricing' && <SubscriptionScreen />}
          {currentView === 'profile' && <ProfileSetup />}
          {currentView === 'tables' && <DatabaseViewer />}
        </ErrorBoundary>
      </main>

      {/* Global Safety Modal */}
      <ReportModal />

      {/* Speed Meet Love Brand Footer */}
      <footer className="border-t-2 border-rose-200 py-8 bg-white text-xs text-slate-700 mt-auto shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <SpeedMeetLoveLogo variant="on-light" size="sm" />
            <span className="text-rose-300 font-bold">·</span>
            <span className="italic font-bold text-slate-800">“Real People. Real Connections. In Minutes.”</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-700 font-semibold">
            <span>Friday, Saturday & Sunday at 7 PM EST</span>
            <span className="text-slate-300 font-bold">·</span>
            <span>5-Min Video Rounds</span>
            <span className="text-slate-300 font-bold">·</span>
            <button
              onClick={() => setCurrentView('tables')}
              className="font-black text-red-600 hover:underline cursor-pointer"
            >
              Inspect Relational Tables
            </button>
            <span className="text-slate-300 font-bold">·</span>
            <span>© 2026 Speed Meet Love</span>
          </div>
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
