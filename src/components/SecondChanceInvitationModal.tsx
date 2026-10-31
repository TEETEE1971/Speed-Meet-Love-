import React from 'react';
import { Heart, X, Video, ShieldCheck, Clock, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';
import confetti from 'canvas-confetti';

export const SecondChanceInvitationModal: React.FC = () => {
  const {
    incomingSecondDateInvitation,
    acceptSecondDateInvitation,
    declineSecondDateInvitation,
    dismissSecondDateInvitation,
    users,
    setCurrentView,
    setSelectedMatchId,
    currentUser,
  } = useApp();

  if (!incomingSecondDateInvitation) return null;

  const session = incomingSecondDateInvitation;
  const isRequester = session.requestedBy === currentUser.UserID;
  const partnerId = session.userA === currentUser.UserID ? session.userB : session.userA;
  const partner = users.find(u => u.UserID === partnerId);
  const partnerName = partner?.FirstName || (session.userA === currentUser.UserID ? session.userBName : session.userAName) || 'Your match';

  const isReadyToStart = session.status === 'ready_to_start';

  const handleAccept = async () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#FF2E93', '#FF147E', '#FFE600'],
      });
    } catch (e) {}

    await acceptSecondDateInvitation(session.sessionId);
    if (session.matchId) {
      setSelectedMatchId(session.matchId);
    }
    setCurrentView('matches');
  };

  const handleDecline = async () => {
    await declineSecondDateInvitation(session.sessionId);
  };

  const handleDismiss = () => {
    dismissSecondDateInvitation(session.sessionId);
  };

  const handleEnterRoom = () => {
    if (session.matchId) {
      setSelectedMatchId(session.matchId);
    }
    setCurrentView('second_date');
  };

  return (
    <aside aria-label="Second-Chance Date Invitation Notification" className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border-2 border-pink-300 ring-4 ring-pink-500/10 space-y-4">
        {/* Header with dismiss */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-pink-100 text-[#FF2E93]">
              <Heart className="w-5 h-5 fill-[#FF2E93] animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF2E93] block">
                {isReadyToStart ? 'Both Agreed! Date Ready' : 'Second-Chance Date Request'}
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight font-heading">
                {partnerName} {partner?.Age ? `(${partner.Age})` : ''}
              </h4>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss for now (invitation remains safely saved on server)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Partner preview card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-50/70 to-rose-50/40 border border-pink-200/80 flex items-center gap-3">
          {partner ? (
            <Avatar user={partner} size="md" className="shrink-0 ring-2 ring-pink-400" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">
              {partnerName[0]}
            </div>
          )}
          <div className="text-xs space-y-0.5 overflow-hidden">
            <p className="font-bold text-slate-800 truncate">{partner?.Occupation || 'Verified Dater'}</p>
            <p className="text-slate-500 text-[11px] truncate">{partner?.Location || 'Speed Dating Participant'}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-pink-600 font-semibold pt-0.5">
              <Clock className="w-3 h-3 shrink-0" />
              <span>10-Minute Private Video Date</span>
            </div>
          </div>
        </div>

        {/* Explanation & Privacy Notice */}
        <div className="text-[11px] text-slate-600 space-y-1">
          {isReadyToStart ? (
            <p className="font-medium text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Both of you accepted! You can enter whenever you are ready.</span>
            </p>
          ) : (
            <p>
              {isRequester
                ? `You invited ${partnerName}. Waiting for mutual confirmation.`
                : `${partnerName} invited you to reconnect for a private 10-minute video date!`
              }
            </p>
          )}

          <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Camera & microphone only activate after both participants explicitly click Start Date.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {isReadyToStart ? (
            <button
              onClick={handleEnterRoom}
              className="w-full py-3 px-4 rounded-xl btn-pink-gradient text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 cursor-pointer hover:scale-[1.01] active:scale-98 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>Enter 10-Min Date Screen</span>
            </button>
          ) : (
            <>
              {!isRequester ? (
                <>
                  <button
                    onClick={handleAccept}
                    className="flex-1 py-2.5 px-3 rounded-xl btn-pink-gradient text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer hover:scale-[1.01] active:scale-98 transition-all"
                  >
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    <span>Accept Date</span>
                  </button>
                  <button
                    onClick={handleDecline}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer transition-colors"
                    title="Politely decline without sharing private reasons"
                  >
                    <span>Decline</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (session.matchId) setSelectedMatchId(session.matchId);
                    setCurrentView('matches');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-pink-200 bg-pink-50 text-pink-700 font-bold text-xs cursor-pointer hover:bg-pink-100 transition-colors"
                >
                  <span>View in Matches</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
