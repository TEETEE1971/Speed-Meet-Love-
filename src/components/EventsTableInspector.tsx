import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SpeedEvent, EventType, EventStatus } from '../types';
import {
  Calendar,
  Clock,
  Users,
  Play,
  RotateCw,
  Plus,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Database,
  Crown
} from 'lucide-react';
import { Avatar } from './Avatar';

interface Props {
  onOpenCreateModal?: () => void;
}

export const EventsTableInspector: React.FC<Props> = ({ onOpenCreateModal }) => {
  const {
    events,
    users,
    currentUser,
    registerForEvent,
    leaveEvent,
    startEventLive,
    generateRoundsForEvent,
    setCurrentView,
    setSelectedEventId,
    canAccessLiveSpeedDating,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<SpeedEvent | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'schema'>('table');

  const filteredEvents = events.filter(evt => {
    const matchesSearch =
      evt.EventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.EventID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.LocationName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'All' || evt.EventType === filterType;
    const matchesStatus = filterStatus === 'All' || evt.EventStatus === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const exportEventsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `speed_meet_love_events_table_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isEligible = canAccessLiveSpeedDating(currentUser);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-pink-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF2E93] uppercase tracking-wider mb-1 font-heading">
            <Database className="w-3.5 h-3.5" />
            <span>Relational Events Table · Fri, Sat & Sun at 7:00 PM EST</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-heading tracking-tight">
            Events Table
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Core Fields: EventID, EventName, DayOfWeek, EventDate, EventStartTime, TimeZone, BreakDurationSeconds, ParticipantsList, EventStatus, RoundsGenerated.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 font-semibold rounded-xl transition-all ${
                viewMode === 'table' ? 'btn-pink-gradient font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Grid
            </button>
            <button
              onClick={() => setViewMode('schema')}
              className={`px-3 py-1.5 font-semibold rounded-xl transition-all ${
                viewMode === 'schema' ? 'btn-pink-gradient font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Schema DDL
            </button>
          </div>

          <button
            onClick={exportEventsJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl btn-pink-gradient text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Schedule Friday Row
          </button>
        </div>
      </div>

      {viewMode === 'schema' ? (
        <div className="p-6 rounded-3xl bg-white border border-pink-100 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF2E93]" />
              Events Table Architectural Definition
            </h3>
            <span className="text-xs text-slate-500 font-mono">TABLE: speed_events</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FFF8FA] p-4 rounded-2xl border border-pink-100 font-mono text-xs text-slate-800 overflow-x-auto">
              <p className="text-[#FF2E93] font-bold mb-2">// SQL / Relational DDL (Friday 5-Min Rounds)</p>
              <pre>{`CREATE TABLE speed_events (
  event_id VARCHAR(64) PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,              -- Every Friday night
  event_start_time TIME NOT NULL,        -- 20:00 EST
  event_end_time TIME NOT NULL,
  max_participants INT NOT NULL DEFAULT 16,
  participants_list TEXT[] DEFAULT '{}',
  event_status VARCHAR(20) CHECK (
    event_status IN ('Upcoming', 'Live', 'Completed')
  ),
  rounds_generated BOOLEAN DEFAULT FALSE,
  host_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(30) CHECK (
    event_type IN ('Straight', 'LGBTQ+', 'Age-specific', 'Premium-only')
  ),
  round_duration_seconds INT DEFAULT 300, -- 5-minute 1-on-1 rounds
  total_rounds INT DEFAULT 5,
  membership_tier_required VARCHAR(30) DEFAULT 'Premium Plus'
);`}</pre>
            </div>

            <div className="bg-[#FFF8FA] p-4 rounded-2xl border border-pink-100 font-mono text-xs text-slate-800 overflow-x-auto">
              <p className="text-emerald-700 font-bold mb-2">// TypeScript Data Model & Constraints</p>
              <pre>{`export interface SpeedEvent {
  EventID: string;            // Primary Key: e.g. "evt_live_now"
  EventName: string;          // Formatted event title
  EventDate: string;          // Friday ISO Date: YYYY-MM-DD
  EventStartTime: string;     // 24hr format: HH:mm
  EventEndTime: string;       // 24hr format: HH:mm
  MaxParticipants: number;    // Capacity cap
  ParticipantsList: string[]; // Foreign Keys: UserID[]
  EventStatus: 'Upcoming' | 'Live' | 'Completed';
  RoundsGenerated: boolean;   // True once rounds paired
  HostID: string;             // Host ID
  EventType: 'Straight' | 'LGBTQ+' | '30 & Older' | 'Age-specific' | 'Premium-only';
  RoundDurationSeconds: 300;  // 5 minutes
}`}</pre>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events by name, ID or venue..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF2E93]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                <Filter className="w-3.5 h-3.5 text-[#FF2E93]" />
                <span>Type:</span>
              </div>
              {['All', 'Straight', 'LGBTQ+', '30 & Older', 'Age-specific'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === type
                      ? 'btn-pink-gradient font-bold'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              {['All', 'Upcoming', 'Live', 'Completed'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterStatus === st
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-3xl border border-pink-100 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-pink-100 bg-[#FFF8FA] text-slate-600 font-bold uppercase tracking-wider font-heading">
                    <th className="py-3 px-4 whitespace-nowrap">EventID</th>
                    <th className="py-3 px-4 min-w-[200px]">EventName & Venue</th>
                    <th className="py-3 px-3 whitespace-nowrap">Friday Date & Time</th>
                    <th className="py-3 px-3 whitespace-nowrap">Capacity</th>
                    <th className="py-3 px-3 whitespace-nowrap">Participants</th>
                    <th className="py-3 px-3 whitespace-nowrap">EventStatus</th>
                    <th className="py-3 px-3 whitespace-nowrap">Rounds Gen</th>
                    <th className="py-3 px-3 whitespace-nowrap">HostID</th>
                    <th className="py-3 px-3 whitespace-nowrap">EventType</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No events match current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map(evt => {
                      const isRegistered = evt.ParticipantsList.includes(currentUser.UserID);
                      const isFull = evt.ParticipantsList.length >= evt.MaxParticipants;

                      return (
                        <tr
                          key={evt.EventID}
                          className="hover:bg-pink-50/50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedEventForDetail(evt)}
                        >
                          <td className="py-3 px-4 font-mono font-medium text-[#FF2E93] whitespace-nowrap">
                            {evt.EventID}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm group-hover:text-[#FF2E93] transition-colors">
                              {evt.EventName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {evt.LocationName} · 5m Rounds · Ages {evt.MinAge}-{evt.MaxAge}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap tabular-nums text-slate-700">
                            <div className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-[#FF2E93]" />
                              <span>{evt.EventDate}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{evt.EventStartTime} - {evt.EventEndTime}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-900">
                                {evt.ParticipantsList.length}
                              </span>
                              <span className="text-slate-400">/ {evt.MaxParticipants}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex -space-x-2">
                              {evt.ParticipantsList.slice(0, 4).map(uid => {
                                const pUser = users.find(u => u.UserID === uid);
                                if (!pUser) return null;
                                return <Avatar key={uid} user={pUser} size="sm" />;
                              })}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                evt.EventStatus === 'Live'
                                  ? 'bg-pink-100 text-[#FF2E93] animate-pulse font-bold'
                                  : evt.EventStatus === 'Upcoming'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {evt.EventStatus}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {evt.RoundsGenerated ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Yes</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>No</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {evt.HostID}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium font-mono bg-pink-50 text-pink-700 border border-pink-100">
                              {evt.EventType}
                            </span>
                          </td>

                          <td
                            className="py-3 px-4 text-right whitespace-nowrap"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {!isEligible ? (
                                <button
                                  onClick={() => setCurrentView('pricing')}
                                  className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold"
                                >
                                  Plus Needed
                                </button>
                              ) : evt.EventStatus === 'Live' ? (
                                <button
                                  onClick={() => {
                                    setSelectedEventId(evt.EventID);
                                    setCurrentView('live');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 rounded-xl btn-pink-gradient font-bold text-xs"
                                >
                                  <Play className="w-3 h-3 fill-white" />
                                  Enter Live
                                </button>
                              ) : (
                                <>
                                  {isRegistered ? (
                                    <button
                                      onClick={() => leaveEvent(evt.EventID)}
                                      className="px-2.5 py-1 rounded-xl bg-slate-100 text-rose-600 border border-slate-200 text-[11px]"
                                    >
                                      Withdraw
                                    </button>
                                  ) : (
                                    <button
                                      disabled={isFull}
                                      onClick={() => registerForEvent(evt.EventID)}
                                      className="px-2.5 py-1 rounded-xl btn-pink-gradient text-[11px] font-semibold disabled:opacity-50"
                                    >
                                      {isFull ? 'Full' : 'Join'}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Event Details Drawer */}
      {selectedEventForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-[#FF2E93]">{selectedEventForDetail.EventID}</span>
                <h3 className="text-xl font-bold text-slate-900 font-heading mt-0.5">{selectedEventForDetail.EventName}</h3>
                <p className="text-xs text-slate-500">{selectedEventForDetail.LocationName}</p>
              </div>
              <button
                onClick={() => setSelectedEventForDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 bg-[#FFF8FA] p-3.5 rounded-2xl border border-pink-100">
              {selectedEventForDetail.Description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#FFF8FA] p-3 rounded-2xl border border-pink-100">
                <span className="text-slate-400 block mb-1">Status</span>
                <span className="font-bold text-slate-900">{selectedEventForDetail.EventStatus}</span>
              </div>
              <div className="bg-[#FFF8FA] p-3 rounded-2xl border border-pink-100">
                <span className="text-slate-400 block mb-1">Tier Required</span>
                <span className="font-bold text-amber-700">Premium Plus</span>
              </div>
              <div className="bg-[#FFF8FA] p-3 rounded-2xl border border-pink-100">
                <span className="text-slate-400 block mb-1">Round Length</span>
                <span className="font-bold text-[#FF2E93]">5 Minutes (300s)</span>
              </div>
              <div className="bg-[#FFF8FA] p-3 rounded-2xl border border-pink-100">
                <span className="text-slate-400 block mb-1">Date & Time</span>
                <span className="font-bold text-slate-900">{selectedEventForDetail.EventDate} ({selectedEventForDetail.EventStartTime})</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedEventForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              {isEligible && (
                <button
                  onClick={() => {
                    setSelectedEventId(selectedEventForDetail.EventID);
                    setCurrentView('live');
                    setSelectedEventForDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl btn-pink-gradient font-bold text-xs flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Enter Live Rounds
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
