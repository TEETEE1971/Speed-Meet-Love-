import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  Download,
  RotateCcw,
  Users,
  Calendar,
  RotateCw,
  Heart,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export const DatabaseViewer: React.FC = () => {
  const {
    users,
    events,
    rounds,
    matches,
    messages,
    resetDemoData,
    isOwner,
  } = useApp();

  const [activeTable, setActiveTable] = useState<'events' | 'users' | 'rounds' | 'matches' | 'messages'>('events');

  if (!isOwner) {
    return null;
  }

  const exportAllTables = () => {
    const fullDb = {
      users,
      events,
      rounds,
      matches,
      messages,
      tiers: {
        FREE: '$0/month: Profile, browse, like, see mutual matches. No messaging, no speed dating.',
        PREMIUM: '$9.99/month: Private messaging when both users mutually like each other and both hold paid membership. No Friday speed dating.',
        PREMIUM_PLUS: '$14.99/month: Exclusive live online speed dating every Fri, Sat & Sun (5-minute video rounds) — launching once enough members join.',
      },
      exportedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullDb, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `speed_meet_love_3tier_db_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-pink-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#BE185D] mb-1">
            <Database className="w-3.5 h-3.5" />
            <span>Relational Schema & In-Memory Store</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] font-heading">
            Live Relational Tables Inspector
          </h1>
          <p className="text-xs text-[#111827] font-medium mt-1 max-w-2xl">
            Inspect real-time records for Users (3-tier statuses), Friday Speed Dating (5-minute rounds), Mutual Matches, and Unlocked Messages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportAllTables}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-xs font-bold text-[#BE185D] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={resetDemoData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-[#111827] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Seed Data
          </button>
        </div>
      </div>

      {/* Table Navigation Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTable('events')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTable === 'events'
              ? 'btn-pink-gradient text-white shadow-md shadow-pink-500/20'
              : 'bg-white text-[#111827] hover:text-[#BE185D] border border-pink-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Events ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTable('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTable === 'users'
              ? 'btn-pink-gradient text-white shadow-md shadow-pink-500/20'
              : 'bg-white text-[#111827] hover:text-[#BE185D] border border-pink-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTable('rounds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTable === 'rounds'
              ? 'btn-pink-gradient text-white shadow-md shadow-pink-500/20'
              : 'bg-white text-[#111827] hover:text-[#BE185D] border border-pink-100'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Rounds ({rounds.length})</span>
        </button>

        <button
          onClick={() => setActiveTable('matches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTable === 'matches'
              ? 'btn-pink-gradient text-white shadow-md shadow-pink-500/20'
              : 'bg-white text-[#111827] hover:text-[#BE185D] border border-pink-100'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Matches ({matches.length})</span>
        </button>

        <button
          onClick={() => setActiveTable('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTable === 'messages'
              ? 'btn-pink-gradient text-white shadow-md shadow-pink-500/20'
              : 'bg-white text-[#111827] hover:text-[#BE185D] border border-pink-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Messages ({messages.length})</span>
        </button>
      </div>

      {/* Active Table Viewer */}
      <div className="rounded-3xl border border-pink-100 bg-white overflow-hidden shadow-xs">
        <div className="p-3.5 bg-pink-50/60 border-b border-pink-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#BE185D] uppercase font-bold text-[11px]">
              Table: speed_{activeTable}
            </span>
          </div>
          <div className="text-[#111827] font-medium font-mono text-[11px]">
            {activeTable === 'events' && `${events.length} rows (Friday 5-Min Rounds)`}
            {activeTable === 'users' && `${users.length} rows (Free, Premium, Premium Plus)`}
            {activeTable === 'rounds' && `${rounds.length} rows`}
            {activeTable === 'matches' && `${matches.length} rows`}
            {activeTable === 'messages' && `${messages.length} rows`}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px]">
          {activeTable === 'events' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-pink-100 bg-slate-50 text-[#111827] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">EventID</th>
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3">EventName</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Time Zone</th>
                  <th className="py-2.5 px-3">Duration & Break</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">RoundsGen</th>
                  <th className="py-2.5 px-3">EventType</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100 font-mono text-[11px] font-medium text-[#111827]">
                {events.map(e => (
                  <tr key={e.EventID} className="hover:bg-pink-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#BE185D] font-bold">{e.EventID}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-[#111827]">{e.DayOfWeek}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-[#111827]">{e.EventName}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-[#111827]">{e.EventDate}</td>
                    <td className="py-2.5 px-3 text-[#111827] font-medium font-sans">{e.TimeZone}</td>
                    <td className="py-2.5 px-3 text-[#047857] font-semibold font-sans">5m round / 2m break</td>
                    <td className="py-2.5 px-3">{e.ParticipantsList.length} / {e.MaxParticipants}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.EventStatus === 'Live'
                          ? 'bg-emerald-50 text-[#047857] border border-emerald-200'
                          : 'bg-slate-100 text-[#111827]'
                      }`}>
                        {e.EventStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{e.RoundsGenerated ? 'true' : 'false'}</td>
                    <td className="py-2.5 px-3 text-[#B45309] font-sans font-semibold">{e.EventType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'users' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-pink-100 bg-slate-50 text-[#111827] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">UserID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Gender</th>
                  <th className="py-2.5 px-3">InterestedIn</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Subscription Tier</th>
                  <th className="py-2.5 px-3">Occupation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100 font-mono text-[11px] font-medium text-[#111827]">
                {users.map(u => (
                  <tr key={u.UserID} className="hover:bg-pink-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#BE185D] font-bold">{u.UserID}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-[#111827]">{u.LastName ? `${u.FirstName} ${u.LastName}` : u.FirstName}</td>
                    <td className="py-2.5 px-3 text-[#111827] font-medium">{u.Email}</td>
                    <td className="py-2.5 px-3 font-sans">{u.Gender}</td>
                    <td className="py-2.5 px-3 font-sans">{u.InterestedIn}</td>
                    <td className="py-2.5 px-3 font-sans">{u.Age && u.Age > 0 ? u.Age : '-'}</td>
                    <td className="py-2.5 px-3 font-sans text-[#111827]">{u.Location || '-'}</td>
                    <td className="py-2.5 px-3 font-bold font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        u.SubscriptionTier === 'Premium Plus'
                          ? 'bg-amber-100 text-[#78350F] border border-amber-300'
                          : u.SubscriptionTier === 'Premium'
                          ? 'bg-pink-100 text-[#9D174D] border border-pink-300'
                          : 'bg-slate-100 text-[#111827] border border-slate-300'
                      }`}>
                        {u.SubscriptionTier}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-[#111827]">{u.Occupation || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'rounds' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-pink-100 bg-slate-50 text-[#111827] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">RoundID</th>
                  <th className="py-2.5 px-3">EventID</th>
                  <th className="py-2.5 px-3">R#</th>
                  <th className="py-2.5 px-3">UserA</th>
                  <th className="py-2.5 px-3">UserB</th>
                  <th className="py-2.5 px-3">UserA_Like</th>
                  <th className="py-2.5 px-3">UserB_Like</th>
                  <th className="py-2.5 px-3">Mutual Match?</th>
                  <th className="py-2.5 px-3">UserA_Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100 font-mono text-[11px] font-medium text-[#111827]">
                {rounds.map(r => {
                  const isMutual = r.UserA_Like === true && r.UserB_Like === true;
                  return (
                    <tr key={r.RoundID} className="hover:bg-pink-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-[#BE185D] font-bold">{r.RoundID}</td>
                      <td className="py-2.5 px-3 text-[#111827] font-medium">{r.EventID}</td>
                      <td className="py-2.5 px-3 font-bold text-[#111827]">{r.RoundNumber}</td>
                      <td className="py-2.5 px-3">{r.UserA}</td>
                      <td className="py-2.5 px-3">{r.UserB}</td>
                      <td className="py-2.5 px-3">{String(r.UserA_Like)}</td>
                      <td className="py-2.5 px-3">{String(r.UserB_Like)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isMutual ? 'bg-pink-100 text-[#9D174D] border border-pink-300' : 'text-[#111827]'
                        }`}>
                          {isMutual ? 'YES ❤️' : 'NO'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-[#111827] truncate max-w-xs">{r.UserA_Notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTable === 'matches' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-pink-100 bg-slate-50 text-[#111827] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">MatchID</th>
                  <th className="py-2.5 px-3">UserA</th>
                  <th className="py-2.5 px-3">UserB</th>
                  <th className="py-2.5 px-3">EventID</th>
                  <th className="py-2.5 px-3">Chemistry%</th>
                  <th className="py-2.5 px-3">ChatUnlocked</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100 font-mono text-[11px] font-medium text-[#111827]">
                {matches.map(m => (
                  <tr key={m.MatchID} className="hover:bg-pink-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#BE185D] font-bold">{m.MatchID}</td>
                    <td className="py-2.5 px-3">{m.UserA}</td>
                    <td className="py-2.5 px-3">{m.UserB}</td>
                    <td className="py-2.5 px-3 text-[#111827] font-medium">{m.EventID}</td>
                    <td className="py-2.5 px-3 text-[#BE123C] font-bold">{m.ChemistryScore}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.ChatUnlocked ? 'bg-emerald-50 text-[#047857] border border-emerald-200' : 'bg-slate-100 text-[#111827]'
                      }`}>
                        {m.ChatUnlocked ? 'Yes (Both Paid)' : 'No (Both Paid Required)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#111827] font-medium">{m.Timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'messages' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-pink-100 bg-slate-50 text-[#111827] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">MessageID</th>
                  <th className="py-2.5 px-3">MatchID</th>
                  <th className="py-2.5 px-3">SenderID</th>
                  <th className="py-2.5 px-3">MessageText</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100 font-mono text-[11px] font-medium text-[#111827]">
                {messages.map(msg => (
                  <tr key={msg.MessageID} className="hover:bg-pink-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#BE185D] font-bold">{msg.MessageID}</td>
                    <td className="py-2.5 px-3 text-[#111827] font-medium">{msg.MatchID}</td>
                    <td className="py-2.5 px-3 text-[#B45309] font-semibold">{msg.SenderID}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-[#111827] truncate max-w-sm">{msg.MessageText}</td>
                    <td className="py-2.5 px-3 text-[#111827] font-medium">{msg.Timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
