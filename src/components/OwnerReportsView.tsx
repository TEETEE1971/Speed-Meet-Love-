import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  OwnerReportItem,
  RegisteredUserSummary,
  SubscriptionTier,
  TesterGrantRecord,
  OwnerWaitlistMember,
  OwnerWaitlistSummary,
  ActiveRoundSummary,
  ActiveRoundRemovalRecord,
} from '../types';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  Clock,
  User as UserIcon,
  Filter,
  Users,
  Search,
  Download,
  Calendar,
  Sparkles,
  Info,
  Activity,
  Database,
  Radio,
  UserPlus,
  UserMinus,
  Crown,
  Award,
  Heart,
  Bell,
  PhoneOff,
  Video,
} from 'lucide-react';

interface OwnerReportsViewProps {
  defaultTab?: 'reports' | 'users' | 'waitlist';
}

export const OwnerReportsView: React.FC<OwnerReportsViewProps> = ({ defaultTab = 'reports' }) => {
  const { isOwner, currentUser, setCurrentView, authToken, showNotification } = useApp();
  const push = usePushNotifications(currentUser?.UserID || 'usr_kristy');

  const [activeDashboardTab, setActiveDashboardTab] = useState<'reports' | 'users' | 'waitlist'>(defaultTab);

  // Safety Reports state
  const [reports, setReports] = useState<OwnerReportItem[]>([]);
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);
  const [reportsFilter, setReportsFilter] = useState<'all' | 'pending' | 'banned' | 'dismissed'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    report: OwnerReportItem;
    action: 'ban_user' | 'dismiss';
  } | null>(null);
  const [ownerNote, setOwnerNote] = useState<string>('');
  const [urgentPendingCount, setUrgentPendingCount] = useState<number>(0);
  const [notificationCapabilities, setNotificationCapabilities] = useState<{
    inAppUrgentFlagging: boolean;
    emailConfigured: boolean;
    emailProvider?: string;
    pushConfigured: boolean;
    ownerPushSubscriptionsCount: number;
    liveKitConfigured: boolean;
  } | null>(null);

  // Moderator Active Rounds state
  const [activeRounds, setActiveRounds] = useState<ActiveRoundSummary[]>([]);
  const [recentRemovals, setRecentRemovals] = useState<ActiveRoundRemovalRecord[]>([]);
  const [loadingActiveRounds, setLoadingActiveRounds] = useState<boolean>(false);
  const [removingUserKey, setRemovingUserKey] = useState<string | null>(null);

  // Registered Users state
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserSummary[]>([]);
  const [totalRegistrations, setTotalRegistrations] = useState<number | null>(null);
  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(0);
  const [storageDiagnostic, setStorageDiagnostic] = useState<{
    storageType?: string;
    provider?: string;
    projectId?: string;
    databaseId?: string;
    isDurableDatabaseActive?: boolean;
    survivesRedeployments?: boolean;
    filePath?: string;
    totalServerRecords?: number;
    demoRecordsExcluded?: number;
    persistenceNotice?: string;
  } | null>(null);
  const [launchOfferSummary, setLaunchOfferSummary] = useState<{
    maxGrants: number;
    grantedCount: number;
    liveAt: number;
  } | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersSearch, setUsersSearch] = useState<string>('');
  const [usersTierFilter, setUsersTierFilter] = useState<'all' | SubscriptionTier>('all');
  const [usersStatusFilter, setUsersStatusFilter] = useState<'all' | 'active_session' | 'banned'>('all');
  const hasLoadedUsersOnceRef = useRef<boolean>(false);

  // Tester privileges management state
  const [grantedTesters, setGrantedTesters] = useState<TesterGrantRecord[]>([]);
  const [testerEmailInput, setTesterEmailInput] = useState<string>('');
  const [testerNotesInput, setTesterNotesInput] = useState<string>('');
  const [processingTesterEmail, setProcessingTesterEmail] = useState<string | null>(null);
  const [loadingTesters, setLoadingTesters] = useState<boolean>(false);

  // Private Event Waitlist state (Founder/Admin only)
  const [waitlistMembers, setWaitlistMembers] = useState<OwnerWaitlistMember[]>([]);
  const [waitlistSummary, setWaitlistSummary] = useState<OwnerWaitlistSummary | null>(null);
  const [loadingWaitlist, setLoadingWaitlist] = useState<boolean>(false);
  const [waitlistSearch, setWaitlistSearch] = useState<string>('');
  const [waitlistGenderFilter, setWaitlistGenderFilter] = useState<'all' | 'Woman' | 'Man' | 'Non-Binary'>('all');
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  // Sync tab if defaultTab changes
  useEffect(() => {
    if (defaultTab) {
      setActiveDashboardTab(defaultTab);
    }
  }, [defaultTab]);

  // Fetch Safety Reports
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/owner/reports', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reports)) {
          setReports(data.reports);
          if (Array.isArray(data.bannedUsers)) {
            setBannedUsers(data.bannedUsers);
          }
          if (data.notificationCapabilities) {
            setNotificationCapabilities(data.notificationCapabilities);
          }
          if (typeof data.summary?.urgentPending === 'number') {
            setUrgentPendingCount(data.summary.urgentPending);
          } else {
            setUrgentPendingCount(
              data.reports.filter((r: OwnerReportItem) => r.status === 'pending' && Boolean(r.urgent)).length
            );
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || 'Failed to load safety reports from server.', 'pink');
      }
    } catch (e) {
      console.warn('Error fetching reports:', e);
      showNotification('Could not reach server to load reports.', 'pink');
    } finally {
      setLoadingReports(false);
    }
  }, [authToken, showNotification]);

  // Fetch Moderator Active Video Rounds
  const fetchActiveRounds = useCallback(async () => {
    setLoadingActiveRounds(true);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/owner/active-rounds', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveRounds(Array.isArray(data.activeRounds) ? data.activeRounds : []);
          setRecentRemovals(Array.isArray(data.removals) ? data.removals : []);
        }
      }
    } catch (e) {
      console.warn('Error fetching active rounds:', e);
    } finally {
      setLoadingActiveRounds(false);
    }
  }, [authToken]);

  const handleRemoveFromActiveRound = async (params: {
    userId: string;
    userName?: string;
    eventId: string;
    roundIndex: number;
    roundId?: string;
    reportId?: string;
    reason?: string;
  }) => {
    const opKey = `${params.eventId}_${params.roundIndex}_${params.userId}`;
    setRemovingUserKey(opKey);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/owner/active-rounds/remove-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: params.userId,
          eventId: params.eventId,
          roundIndex: params.roundIndex,
          roundId: params.roundId,
          reportId: params.reportId,
          reason: params.reason || 'Removed from active round by moderator for safety review',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message || `${params.userName || params.userId} removed from active round.`, 'success');
        await Promise.all([fetchActiveRounds(), fetchReports()]);
      } else {
        showNotification(data.error || 'Failed to remove member from active round.', 'pink');
      }
    } catch (e) {
      showNotification('Network error while removing member from active round.', 'pink');
    } finally {
      setRemovingUserKey(null);
    }
  };

  // Fetch Registered Users - retains current list during background refreshes to eliminate page jump
  const fetchRegisteredUsers = useCallback(async (isBackgroundRefresh: boolean = false) => {
    if (!hasLoadedUsersOnceRef.current && !isBackgroundRefresh) {
      setLoadingUsers(true);
    } else {
      setIsRefreshingUsers(true);
    }
    setUsersError(null);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/owner/registered-users', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setRegisteredUsers(data.users);
          setTotalRegistrations(typeof data.totalRegistrations === 'number' ? data.totalRegistrations : data.users.length);
          setActiveSessionsCount(typeof data.activeSessionsCount === 'number' ? data.activeSessionsCount : 0);
          if (data.storageDiagnostic) {
            setStorageDiagnostic(data.storageDiagnostic);
          }
          if (data.launchOfferSummary) {
            setLaunchOfferSummary(data.launchOfferSummary);
          }
          hasLoadedUsersOnceRef.current = true;
        } else {
          setUsersError(data.error || 'Failed to parse user registrations.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Server responded with status ${res.status}.`;
        setUsersError(msg);
        showNotification(msg, 'pink');
      }
    } catch (e: any) {
      console.warn('Error fetching registered users:', e);
      setUsersError(e.message || 'Network error while contacting server.');
      showNotification('Could not connect to server for registered users.', 'pink');
    } finally {
      setLoadingUsers(false);
      setIsRefreshingUsers(false);
    }
  }, [authToken, showNotification]);

  // Fetch Granted Tester Accounts
  const fetchGrantedTesters = useCallback(async () => {
    setLoadingTesters(true);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/owner/testers', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.testers)) {
          setGrantedTesters(data.testers);
        }
      }
    } catch (e) {
      console.warn('Error fetching granted testers:', e);
    } finally {
      setLoadingTesters(false);
    }
  }, [authToken]);

  // Fetch Private Event Waitlist (Owner-Only)
  const fetchWaitlistMembers = useCallback(async () => {
    setLoadingWaitlist(true);
    setWaitlistError(null);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/owner/waitlist', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data.entries) ? data.entries : Array.isArray(data.members) ? data.members : null;
        if (data.success && rows) {
          setWaitlistMembers(rows);
          setWaitlistSummary(data.summary || null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setWaitlistError(errData.error || 'Failed to load waiting list.');
      }
    } catch (e: any) {
      setWaitlistError(e?.message || 'Network error while loading waiting list.');
    } finally {
      setLoadingWaitlist(false);
    }
  }, [authToken]);

  // Initial load
  useEffect(() => {
    if (isOwner) {
      fetchReports();
      fetchActiveRounds();
      fetchRegisteredUsers();
      fetchGrantedTesters();
      fetchWaitlistMembers();
    }
  }, [isOwner, fetchReports, fetchActiveRounds, fetchRegisteredUsers, fetchGrantedTesters, fetchWaitlistMembers]);

  // Grant or Revoke Free Premium Plus Tester Access
  const handleToggleTesterAccess = async (email: string, action: 'grant' | 'remove', notes?: string) => {
    if (!email || !email.includes('@')) {
      showNotification('Please enter a valid email address.', 'pink');
      return;
    }
    const cleanEmail = email.toLowerCase().trim();
    setProcessingTesterEmail(cleanEmail);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/owner/testers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: cleanEmail, action, notes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message, 'success');
        if (action === 'grant') {
          setTesterEmailInput('');
          setTesterNotesInput('');
        }
        await Promise.all([fetchRegisteredUsers(true), fetchGrantedTesters()]);
      } else {
        showNotification(data.error || 'Failed to update tester privileges.', 'pink');
      }
    } catch (e: any) {
      console.warn('Error updating tester access:', e);
      showNotification('Network error while updating tester privileges.', 'pink');
    } finally {
      setProcessingTesterEmail(null);
    }
  };

  const handleTakeAction = async (reportId: string, action: 'ban_user' | 'dismiss', notes: string) => {
    setProcessingId(reportId);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch(`/api/owner/reports/${reportId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, ownerNotes: notes }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(
          action === 'ban_user'
            ? 'Account banned permanently and all active sessions revoked.'
            : 'Report reviewed and dismissed.',
          'success'
        );
        setActionModal(null);
        setOwnerNote('');
        fetchReports();
        fetchRegisteredUsers(true);
      } else {
        showNotification(data.error || 'Action failed.', 'pink');
      }
    } catch (e) {
      showNotification('Network error while executing action.', 'pink');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setProcessingId(userId);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch(`/api/owner/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`User ${userId} unbanned.`, 'success');
        fetchReports();
        fetchRegisteredUsers(true);
      } else {
        showNotification(data.error || 'Unban failed.', 'pink');
      }
    } catch (e) {
      showNotification('Network error while unbanning.', 'pink');
    } finally {
      setProcessingId(null);
    }
  };

  const formatEasternDate = (timestamp: number | null | undefined): string => {
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
      return '';
    }
    try {
      const d = new Date(timestamp);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${formatter.format(d)} ET`;
    } catch (e) {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  const exportRegisteredUsers = () => {
    if (!registeredUsers.length) return;
    const exportData = {
      title: 'Speed Meet Love - Real Registered Users (Sanitized)',
      exportedAt: new Date().toISOString(),
      ownerEmail: 'kristylten@gmail.com',
      totalRegistrations: registeredUsers.length,
      demoProfilesExcluded: storageDiagnostic?.demoRecordsExcluded || 0,
      storageFile: storageDiagnostic?.filePath || '.data/users.json',
      users: registeredUsers,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `speed_meet_love_registered_users_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return registeredUsers.filter(u => {
      // Search text
      if (usersSearch.trim()) {
        const q = usersSearch.trim().toLowerCase();
        const matchesName = (u.fullName || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesId = (u.userId || '').toLowerCase().includes(q);
        const matchesLoc = (u.location || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId && !matchesLoc) {
          return false;
        }
      }

      // Tier filter
      if (usersTierFilter !== 'all' && u.subscriptionTier !== usersTierFilter) {
        return false;
      }

      // Status filter
      if (usersStatusFilter === 'active_session' && !u.hasActiveSession) {
        return false;
      }
      if (usersStatusFilter === 'banned' && !u.isBanned) {
        return false;
      }

      return true;
    });
  }, [registeredUsers, usersSearch, usersTierFilter, usersStatusFilter]);

  const filteredWaitlist = useMemo(() => {
    return waitlistMembers.filter(m => {
      if (waitlistSearch.trim()) {
        const q = waitlistSearch.trim().toLowerCase();
        const hit =
          (m.fullName || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.location || '').toLowerCase().includes(q) ||
          (m.relationshipIntent || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (waitlistGenderFilter !== 'all' && m.gender !== waitlistGenderFilter) {
        return false;
      }
      return true;
    });
  }, [waitlistMembers, waitlistSearch, waitlistGenderFilter]);

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-white border border-rose-200 shadow-xl text-center space-y-4 my-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-300 flex items-center justify-center text-[#B91C1C]">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-[#111827] font-heading">Owner Authorization Required</h2>
        <p className="text-sm text-[#111827] font-medium leading-relaxed max-w-md mx-auto">
          This administration dashboard is strictly restricted to the verified platform owner.
        </p>
        <div className="pt-2">
          <button
            onClick={() => setCurrentView('home')}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const filteredReports = reports.filter(r => {
    if (reportsFilter === 'pending') return r.status === 'pending';
    if (reportsFilter === 'banned') return r.status === 'banned';
    if (reportsFilter === 'dismissed') return r.status === 'dismissed';
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const bannedCount = reports.filter(r => r.status === 'banned').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <button
          onClick={() => setCurrentView('profile')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-rose-50 text-[#111827] hover:text-[#B91C1C] font-bold text-xs border border-rose-300 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#B91C1C]" />
          <span>Back to Profile</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-[#065F46] text-xs font-bold font-mono">
            <Lock className="w-3.5 h-3.5 text-[#047857]" />
            <span>Owner Authenticated: kristylten@gmail.com</span>
          </span>
          <button
            onClick={() => {
              if (activeDashboardTab === 'reports') {
                fetchReports();
                fetchActiveRounds();
              } else if (activeDashboardTab === 'users') {
                fetchRegisteredUsers(true);
              } else {
                fetchWaitlistMembers();
              }
            }}
            disabled={
              activeDashboardTab === 'reports'
                ? loadingReports
                : activeDashboardTab === 'users'
                ? loadingUsers || isRefreshingUsers
                : loadingWaitlist
            }
            className="p-2 rounded-xl bg-white border border-rose-300 text-[#111827] hover:text-[#B91C1C] hover:bg-rose-50 shadow-xs transition-colors cursor-pointer"
            title="Refresh current dashboard data"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                (activeDashboardTab === 'reports'
                  ? loadingReports
                  : activeDashboardTab === 'users'
                  ? loadingUsers || isRefreshingUsers
                  : loadingWaitlist)
                  ? 'animate-spin text-[#B91C1C]'
                  : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-white border border-rose-300 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveDashboardTab('reports')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeDashboardTab === 'reports'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-[#111827] hover:text-[#B91C1C] hover:bg-rose-50/60'
          }`}
        >
          <ShieldAlert className={`w-4 h-4 ${activeDashboardTab === 'reports' ? 'text-amber-400' : 'text-[#B91C1C]'}`} />
          <span>Safety Reports</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeDashboardTab === 'reports'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 text-[#991B1B]'
            }`}
          >
            {reports.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDashboardTab('users')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeDashboardTab === 'users'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-[#111827] hover:text-[#BE185D] hover:bg-rose-50/60'
          }`}
        >
          <Users className={`w-4 h-4 ${activeDashboardTab === 'users' ? 'text-pink-300' : 'text-[#111827]'}`} />
          <span>Registered Users</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeDashboardTab === 'users'
                ? 'bg-white/20 text-white'
                : 'bg-pink-100 text-[#BE185D]'
            }`}
          >
            {totalRegistrations !== null ? totalRegistrations : registeredUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDashboardTab('waitlist')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeDashboardTab === 'waitlist'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-[#111827] hover:text-[#BE185D] hover:bg-rose-50/60'
          }`}
        >
          <Heart className={`w-4 h-4 ${activeDashboardTab === 'waitlist' ? 'text-pink-300 fill-pink-300' : 'text-[#BE185D] fill-[#BE185D]'}`} />
          <span>Private Waiting List</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeDashboardTab === 'waitlist'
                ? 'bg-white/20 text-white'
                : 'bg-pink-100 text-[#BE185D]'
            }`}
          >
            {waitlistSummary?.totalWaitlisted ?? waitlistMembers.length}
          </span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SAFETY REPORTS & CSAM ESCALATION                             */}
      {/* ==================================================================== */}
      {activeDashboardTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-rose-900/40 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-wider border border-red-500/30">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                <span>Sole Operator Administration · TeeTees Creations</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight">
                Owner Community Safety &amp; In-App Reports
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
                All reports submitted via live video calls, singles browsing, and mutual chats are securely persisted to server storage for your direct review. As the sole owner/operator, you can inspect reported details, terminate violator sessions, permanently ban accounts, and escalate CSAM concerns to NCMEC.
              </p>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
                  <span className="text-[11px] font-bold text-slate-300 uppercase block">Total Reports</span>
                  <span className="text-2xl font-black text-white font-heading">{reports.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/20 backdrop-blur-xs border border-amber-400/30">
                  <span className="text-[11px] font-bold text-amber-200 uppercase block">Pending / Urgent</span>
                  <span className="text-2xl font-black text-amber-300 font-heading">
                    {pendingCount}{' '}
                    {urgentPendingCount > 0 && (
                      <span className="text-xs font-bold text-red-300">({urgentPendingCount} urgent)</span>
                    )}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/20 backdrop-blur-xs border border-red-400/30">
                  <span className="text-[11px] font-bold text-red-200 uppercase block">Banned Accounts</span>
                  <span className="text-2xl font-black text-red-300 font-heading">{bannedUsers.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase block">Owner Contact</span>
                  <span className="text-xs font-extrabold text-white truncate block">kristylten@gmail.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Urgent Review Flag Banner */}
          {urgentPendingCount > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-red-50 border-2 border-red-500 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-700 text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-[#991B1B]">
                    Urgent Safety Review Flagged ({urgentPendingCount} Pending)
                  </div>
                  <p className="text-xs text-[#7F1D1D] font-medium mt-0.5 leading-relaxed">
                    Live-video or high-severity reports have been persisted to the server and prioritized below for your immediate founder review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportsFilter('pending')}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                Filter Urgent Pending
              </button>
            </div>
          )}

          {/* Urgent Notification Channels Status (Honest Server Readiness) */}
          <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#111827] font-bold font-heading text-sm">
                <Bell className="w-4 h-4 text-[#B91C1C]" />
                <span>Urgent Report Notification Channels</span>
              </div>
              <span className="text-[11px] text-[#4B5563] font-medium">
                No automated scanning or continuous video monitoring is active; alerts trigger only when a user submits a report.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1">
                <div className="font-bold text-[#065F46] flex items-center justify-between">
                  <span>In-App Urgent Flagging</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#047857] border border-emerald-300 text-[10px]">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-[#064E3B] font-medium">
                  Urgent reports sort to the top of this Owner queue immediately upon submission.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  notificationCapabilities?.pushConfigured &&
                  (push.isSubscribed || (notificationCapabilities?.ownerPushSubscriptionsCount || 0) > 0)
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div className="font-bold text-[#111827] flex items-center justify-between">
                  <span>Browser Push Alerts</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-300 text-[10px]">
                    {notificationCapabilities?.ownerPushSubscriptionsCount || 0} device(s)
                  </span>
                </div>
                <p className="text-[11px] text-[#111827] font-medium">
                  {push.isSubscribed
                    ? 'Subscribed on this browser for urgent safety push notifications.'
                    : 'Click below on your browser/phone to register this device for urgent safety push alerts.'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={!push.isSupported || push.isSubscribing}
                    onClick={async () => {
                      const res = await push.subscribe();
                      if (res.success) {
                        showNotification('Owner browser push alerts enabled for urgent safety reports.', 'success');
                        fetchReports();
                      } else {
                        showNotification(res.error || 'Could not enable browser push alerts.', 'pink');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {push.isSubscribing ? 'Enabling...' : push.isSubscribed ? 'Re-Sync Push' : 'Enable Browser Push Alerts'}
                  </button>
                  {push.isSubscribed && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await push.testPush();
                        showNotification(
                          res.success ? `Test push sent (${res.delivered || 0}/${res.total || 0}).` : res.error || 'Push test failed.',
                          res.success ? 'success' : 'pink'
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[#111827] text-[11px] font-bold cursor-pointer"
                    >
                      Test Push
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  notificationCapabilities?.emailConfigured
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div className="font-bold text-[#111827] flex items-center justify-between">
                  <span>Owner Urgent Email</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-300 text-[10px]">
                    {notificationCapabilities?.emailConfigured
                      ? `READY (${notificationCapabilities.emailProvider || 'Email'})`
                      : 'NEEDS RESEND_API_KEY'}
                  </span>
                </div>
                <p className="text-[11px] text-[#111827] font-medium">
                  {notificationCapabilities?.emailConfigured
                    ? 'Urgent reports trigger immediate email notifications to kristylten@gmail.com.'
                    : 'Outbound urgent email requires RESEND_API_KEY in server environment variables; reports still save and flag in-app.'}
                </p>
              </div>
            </div>
          </div>

          {/* Moderator Control: Active Video Rounds */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-rose-300 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
              <div>
                <div className="flex items-center gap-2 text-[#111827] font-bold font-heading text-base">
                  <Video className="w-4 h-4 text-[#B91C1C]" />
                  <span>Moderator Control: Active Video Rounds</span>
                </div>
                <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                  Moderator-only live intervention. Removing a member ends their active round on the server, disconnects LiveKit SFU video when configured, and blocks their tokens for that round.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    notificationCapabilities?.liveKitConfigured
                      ? 'bg-emerald-50 text-[#065F46] border-emerald-300'
                      : 'bg-amber-50 text-[#78350F] border-amber-300'
                  }`}
                >
                  {notificationCapabilities?.liveKitConfigured
                    ? 'LiveKit SFU Server Kick: Connected'
                    : 'LiveKit SFU: Server Session Kick Active (Needs LIVEKIT keys for SFU)'}
                </span>
                <button
                  type="button"
                  onClick={fetchActiveRounds}
                  disabled={loadingActiveRounds}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#111827] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingActiveRounds ? 'animate-spin' : ''}`} />
                  <span>Refresh Rounds</span>
                </button>
              </div>
            </div>

            {activeRounds.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-[#4B5563] font-medium">
                No active video rounds running right now. Active event rounds appear here as soon as members enter a round.
              </div>
            ) : (
              <div className="space-y-3">
                {activeRounds.map(round => (
                  <div
                    key={round.roundId}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#111827] text-sm">
                          {round.eventName} · Round {round.roundNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            round.status === 'call'
                              ? 'bg-emerald-100 text-[#065F46]'
                              : 'bg-slate-200 text-[#111827]'
                          }`}
                        >
                          {round.status}
                        </span>
                        <span className="font-mono text-[11px] text-[#4B5563]">{round.roomName}</span>
                      </div>
                      <span className="font-mono font-bold text-[#B91C1C]">
                        {round.status === 'call' ? `${round.remainingSeconds}s remaining` : round.terminatedReason || 'Ended'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {round.participants.map(p => {
                        const opKey = `${round.eventId}_${round.roundIndex}_${p.userId}`;
                        const isRemoving = removingUserKey === opKey;
                        return (
                          <div
                            key={p.userId}
                            className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-[#111827] truncate">{p.name}</div>
                              <div className="font-mono text-[11px] text-[#4B5563] truncate">
                                {p.userId}
                                {p.email ? ` · ${p.email}` : ''}
                              </div>
                            </div>
                            {p.removed ? (
                              <span className="px-2.5 py-1 rounded-lg bg-red-100 text-[#991B1B] font-bold text-[11px] shrink-0">
                                Removed from Round
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isRemoving}
                                onClick={() =>
                                  handleRemoveFromActiveRound({
                                    userId: p.userId,
                                    userName: p.name,
                                    eventId: round.eventId,
                                    roundIndex: round.roundIndex,
                                    roundId: round.roundId,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                <PhoneOff className="w-3 h-3" />
                                <span>{isRemoving ? 'Removing...' : 'Remove from Active Round'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recentRemovals.length > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Recent Moderator Active-Round Removals ({recentRemovals.length})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {recentRemovals.slice(0, 6).map(rem => (
                    <div
                      key={rem.removalId}
                      className="px-3 py-2 rounded-xl bg-red-50/70 border border-red-200 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <span>
                        <strong>{rem.userName || rem.userId}</strong> removed from <strong>{rem.eventId}</strong> (Round{' '}
                        {rem.roundNumber}) — {rem.reason}
                      </span>
                      <span className="font-mono text-[#7F1D1D]">{formatEasternDate(rem.removedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Child Safety (CSAE/CSAM) Escalation Protocol Guide */}
          <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-[#78350F] font-bold font-heading text-sm sm:text-base">
              <ShieldAlert className="w-5 h-5 text-[#B45309] shrink-0" />
              <span>Owner Responsibilities: Handling CSAE / CSAM Allegations</span>
            </div>
            <p className="text-xs text-[#78350F] font-medium leading-relaxed">
              If any report involves alleged <strong>Child Sexual Abuse Material (CSAM)</strong>, grooming, or child exploitation:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs text-[#111827]">
              <div className="p-3 rounded-2xl bg-white border border-amber-300 space-y-1">
                <span className="font-bold text-[#991B1B] block">Step 1: Ban &amp; Terminate</span>
                <p className="text-[#111827] font-medium text-[11px]">
                  Tap <strong>Ban User &amp; Revoke Access</strong> below. This immediately revokes their session tokens, evicts them from matchmaking queues, and prevents account recreation.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-amber-300 space-y-1">
                <span className="font-bold text-[#991B1B] block">Step 2: Do Not Share Material</span>
                <p className="text-[#111827] font-medium text-[11px]">
                  Never download, screenshot, forward, or distribute abusive photos or videos. Retain only account identifiers and technical logs on the server.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-amber-300 space-y-1">
                <span className="font-bold text-[#991B1B] block">Step 3: File CyberTipline Report</span>
                <p className="text-[#111827] font-medium text-[11px]">
                  Promptly report the incident to the <strong>National Center for Missing &amp; Exploited Children (NCMEC)</strong> at{' '}
                  <a href="https://report.cybertip.org" target="_blank" rel="noopener noreferrer" className="font-bold underline text-[#B91C1C]">
                    report.cybertip.org
                  </a>{' '}
                  or call 1-800-843-5678.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-rose-200 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setReportsFilter('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  reportsFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-[#111827] hover:bg-rose-50 border border-slate-300'
                }`}
              >
                All Reports ({reports.length})
              </button>
              <button
                onClick={() => setReportsFilter('pending')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  reportsFilter === 'pending'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white text-[#111827] hover:bg-rose-50 border border-slate-300'
                }`}
              >
                Pending Review ({pendingCount})
              </button>
              <button
                onClick={() => setReportsFilter('banned')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  reportsFilter === 'banned'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white text-[#111827] hover:bg-rose-50 border border-slate-300'
                }`}
              >
                Banned Members ({bannedCount})
              </button>
              <button
                onClick={() => setReportsFilter('dismissed')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  reportsFilter === 'dismissed'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-[#111827] hover:bg-rose-50 border border-slate-300'
                }`}
              >
                Dismissed ({reports.filter(r => r.status === 'dismissed').length})
              </button>
            </div>

            <span className="text-xs text-[#111827] font-semibold hidden sm:inline">
              Showing {filteredReports.length} of {reports.length}
            </span>
          </div>

          {/* Reports List */}
          {loadingReports ? (
            <div className="p-12 text-center text-[#111827] space-y-2 bg-white rounded-3xl border border-rose-200">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#B91C1C]" />
              <p className="text-xs font-bold">Loading persistent reports from server storage...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-[#111827] space-y-2 bg-white rounded-3xl border border-rose-200">
              <ShieldCheck className="w-8 h-8 mx-auto text-[#047857]" />
              <p className="text-sm font-bold text-[#111827]">No reports found under this filter</p>
              <p className="text-xs text-[#111827] font-medium">All member reports submitted in-app will show here for your action.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map(report => {
                const isUserBanned = bannedUsers.includes(report.reportedUserId) || report.status === 'banned';

                return (
                  <div
                    key={report.id}
                    className={`p-5 sm:p-6 rounded-3xl bg-white border transition-all shadow-xs space-y-4 ${
                      report.status === 'pending'
                        ? 'border-amber-400 ring-2 ring-amber-100'
                        : report.status === 'banned'
                        ? 'border-red-300 bg-red-50/20'
                        : 'border-slate-300'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#111827]">{report.id}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            report.status === 'pending'
                              ? 'bg-amber-100 text-[#78350F] border border-amber-300'
                              : report.status === 'banned'
                              ? 'bg-red-100 text-[#991B1B] border border-red-300'
                              : 'bg-slate-100 text-[#111827] border border-slate-300'
                          }`}
                        >
                          {report.status}
                        </span>
                        {report.urgent && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-700 text-white text-[10px] font-extrabold uppercase tracking-wider">
                            URGENT REVIEW
                          </span>
                        )}
                        {report.reason === 'Child safety / Underage / CSAE' && (
                          <span className="px-2 py-0.5 rounded-full bg-red-900 text-white text-[10px] font-bold">
                            CSAE / CHILD SAFETY PRIORITY
                          </span>
                        )}
                        {report.callEndedOnReport && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                            Call Disconnected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#111827] font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#111827]" />
                        <span>{report.timestamp}</span>
                      </div>
                    </div>

                    {/* Event, Round & All Session Participants */}
                    {(report.eventName || report.eventId || report.roundNumber || (report.participants && report.participants.length > 0) || report.source) && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#111827]">
                          <span>
                            <strong>Source:</strong> {report.source || 'in_app'}
                          </span>
                          {(report.eventName || report.eventId) && (
                            <span>
                              <strong>Event:</strong> {report.eventName || report.eventId}
                            </span>
                          )}
                          {(report.roundNumber !== undefined || report.roundIndex !== undefined) && (
                            <span>
                              <strong>Round:</strong> Round {report.roundNumber ?? (report.roundIndex ?? 0) + 1}
                            </span>
                          )}
                          {report.urgencyReasons && report.urgencyReasons.length > 0 && (
                            <span className="text-[#991B1B] font-bold">
                              Flagged: {report.urgencyReasons.join(', ')}
                            </span>
                          )}
                        </div>
                        {report.participants && report.participants.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-[#111827]">Session Participants:</span>
                            {report.participants.map((p, idx) => (
                              <span
                                key={`${p.userId}_${idx}`}
                                className="px-2 py-0.5 rounded-full bg-white border border-amber-300 text-[11px] font-semibold text-[#111827]"
                              >
                                {p.name || p.userId} ({p.role || 'participant'})
                              </span>
                            ))}
                          </div>
                        )}
                        {report.notificationDispatch && (
                          <div className="text-[11px] text-[#4B5563] font-medium">
                            <strong>Urgent Notification Log:</strong> In-App Flagged · Push Delivered:{' '}
                            {report.notificationDispatch.pushDelivered}/{report.notificationDispatch.pushSubscriptionsCount} ·{' '}
                            {report.notificationDispatch.emailSent
                              ? `Email Sent (${report.notificationDispatch.emailProvider})`
                              : report.notificationDispatch.note || 'Email not configured'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reported & Reporter info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-[#B91C1C] tracking-wider block">
                          Reported Offender
                        </span>
                        <div className="font-bold text-[#111827] text-sm flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-[#B91C1C]" />
                          <span>{report.reportedUserName || 'Unknown Member'}</span>
                        </div>
                        <div className="text-[#111827] font-mono text-[11px]">
                          User ID: <span className="font-bold text-[#111827]">{report.reportedUserId}</span>
                        </div>
                        {report.reportedUserEmail && (
                          <div className="text-[#111827] font-medium text-[11px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#111827]" />
                            <span>{report.reportedUserEmail}</span>
                          </div>
                        )}
                        {isUserBanned && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-red-700 text-white font-bold text-[10px]">
                            Account Banned
                          </span>
                        )}
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-[#111827] tracking-wider block">
                          Reporting Member
                        </span>
                        <div className="font-bold text-[#111827] text-sm flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-[#111827]" />
                          <span>{report.reporterName || 'Anonymous Member'}</span>
                        </div>
                        <div className="text-[#111827] font-mono text-[11px]">
                          User ID: <span className="font-bold text-[#111827]">{report.reporterId}</span>
                        </div>
                        {report.reporterEmail && (
                          <div className="text-[#111827] font-medium text-[11px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#111827]" />
                            <span>{report.reporterEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Report Reason & Notes */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111827] uppercase text-[10px]">Reason:</span>
                        <span className="font-bold text-[#111827] px-2 py-0.5 rounded-md bg-white border border-slate-300">
                          {report.reason}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-[#111827] uppercase text-[10px] block mb-1">
                          Reporter Description:
                        </span>
                        <p className="text-[#111827] font-medium bg-white p-3 rounded-xl border border-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.notes || 'No additional details provided by reporter.'}
                        </p>
                      </div>
                    </div>

                    {/* Action resolution summary if already acted on */}
                    {report.actionTaken && (
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-[#064E3B] font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                          <span>
                            <strong>Action:</strong> {report.actionTaken}
                          </span>
                        </div>
                        {report.actionAt && (
                          <span className="text-[11px] text-[#065F46] font-mono font-bold">
                            {new Date(report.actionAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                      {report.eventId && report.roundIndex !== undefined && report.status === 'pending' && (
                        <button
                          type="button"
                          disabled={removingUserKey === `${report.eventId}_${report.roundIndex}_${report.reportedUserId}`}
                          onClick={() =>
                            handleRemoveFromActiveRound({
                              userId: report.reportedUserId,
                              userName: report.reportedUserName,
                              eventId: report.eventId!,
                              roundIndex: report.roundIndex!,
                              roundId: report.roundId,
                              reportId: report.id,
                              reason: `Removed during review of report ${report.id}: ${report.reason}`,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <PhoneOff className="w-3.5 h-3.5" />
                          <span>
                            {removingUserKey === `${report.eventId}_${report.roundIndex}_${report.reportedUserId}`
                              ? 'Removing...'
                              : `Remove from Round ${report.roundNumber ?? report.roundIndex + 1}`}
                          </span>
                        </button>
                      )}

                      {isUserBanned ? (
                        <button
                          type="button"
                          disabled={processingId === report.reportedUserId}
                          onClick={() => handleUnbanUser(report.reportedUserId)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs transition-colors cursor-pointer"
                        >
                          {processingId === report.reportedUserId ? 'Unbanning...' : 'Unban Account'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActionModal({ report, action: 'ban_user' })}
                          className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Ban User &amp; Revoke Access</span>
                        </button>
                      )}

                      {report.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => setActionModal({ report, action: 'dismiss' })}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Dismiss Report
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: REGISTERED USERS (PRODUCTION SERVER ACCOUNTS)                 */}
      {/* ==================================================================== */}
      {activeDashboardTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-rose-900/40 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-black uppercase tracking-wider border border-pink-500/30">
                <Users className="w-4 h-4 text-[#FF2E93]" />
                <span>Production Server Database · Real Accounts Inspector</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight">
                Registered Users &amp; Account Manifest
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
                Authoritative view of genuine registered user accounts stored in the server database. All mock and demo profiles (e.g., Alex Rivera, demo seeds) are strictly excluded. Passwords, password hashes, salts, and session tokens are cryptographically redacted on the server and never sent to this inspector.
              </p>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
                  <span className="text-[11px] font-bold text-slate-300 uppercase block">Total Registrations</span>
                  <span className="text-2xl font-black text-white font-heading">
                    {totalRegistrations !== null ? totalRegistrations : registeredUsers.length}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase block">Active Sessions Now</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-2xl font-black text-emerald-300 font-heading">
                      {activeSessionsCount}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-purple-500/20 backdrop-blur-xs border border-purple-400/30">
                  <span className="text-[11px] font-bold text-purple-200 uppercase block">First-50 Grants</span>
                  <span className="text-2xl font-black text-purple-300 font-heading">
                    {launchOfferSummary ? `${launchOfferSummary.grantedCount} / ${launchOfferSummary.maxGrants}` : '0 / 50'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase block">Durable Database</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Database className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span className="text-xs font-mono font-black text-white truncate">
                      {storageDiagnostic?.storageType === 'durable-cloud-firestore' ? 'Cloud Firestore' : 'Local File'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Advisories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Google Play Closed Testing Distinction */}
            <div className="p-4 sm:p-5 rounded-3xl bg-sky-50 border border-sky-300 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-[#0C4A6E] font-bold font-heading text-xs sm:text-sm">
                <Info className="w-4 h-4 text-[#0369A1] shrink-0" />
                <span>Google Play Testing Distinction</span>
              </div>
              <p className="text-[11px] text-[#111827] font-medium leading-relaxed">
                In-app registered users shown here represent real accounts created through the Speed Meet Love application. <strong>App registration is separate from Google Play Closed Testing enrollment</strong>. Creating an account in this app does not automatically enroll a tester into Google Play internal or closed tracks.
              </p>
            </div>

            {/* Storage Architecture & Persistence Guarantee Advisory */}
            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 border border-emerald-300 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-[#064E3B] font-bold font-heading text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Durable Database Persistence: Active</span>
              </div>
              <p className="text-[11px] text-[#111827] font-medium leading-relaxed">
                User accounts, sign-ins, and bans are connected to <strong>Cloud Firestore</strong> (collection <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold text-[#064E3B]">users</code>) with local mirror backups. <strong>Registrations survive container redeployments, image builds, and multi-instance scaling</strong>. Passwords, hashes, and secrets are strictly redacted.
              </p>
            </div>
          </div>

          {/* Tester Privileges Management (Owner Exclusive) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-white border-2 border-amber-300 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-amber-600 to-[#BE185D] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[#111827] font-heading">
                    Tester Accounts &amp; Free Premium Plus Access
                  </h2>
                </div>
                <p className="text-xs text-[#111827] font-medium max-w-2xl leading-relaxed">
                  Grant or remove full <strong>Premium Plus</strong> access for individual testers by entering their email address. Authorized testers unlock all features—including <strong>messaging after mutual matches</strong>, <strong>live speed-dating events</strong>, and VIP Plus privileges—without entering a payment card or creating a Stripe subscription. Access is strictly enforced and verified on the server.
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-[#78350F] border border-amber-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#92400E]" /> Owner Only
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#065F46] border border-emerald-300 text-[11px] font-bold">
                  {grantedTesters.length} Granted
                </span>
              </div>
            </div>

            {/* Quick Grant Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (testerEmailInput.trim()) {
                  handleToggleTesterAccess(testerEmailInput, 'grant', testerNotesInput);
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1"
            >
              <div className="sm:col-span-5 relative">
                <Mail className="w-4 h-4 text-[#111827] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={testerEmailInput}
                  onChange={(e) => setTesterEmailInput(e.target.value)}
                  placeholder="Enter tester email address (e.g. tester@gmail.com)..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-amber-300 text-xs text-[#111827] placeholder-slate-500 focus:outline-none focus:border-[#BE185D] focus:ring-2 focus:ring-rose-200/50 transition-all font-medium"
                />
              </div>

              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={testerNotesInput}
                  onChange={(e) => setTesterNotesInput(e.target.value)}
                  placeholder="Optional note (e.g., Google Play closed tester)..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-amber-300 text-xs text-[#111827] font-medium placeholder-slate-500 focus:outline-none focus:border-[#BE185D] focus:ring-2 focus:ring-rose-200/50 transition-all"
                />
              </div>

              <div className="sm:col-span-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!testerEmailInput.trim() || processingTesterEmail === testerEmailInput.toLowerCase().trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-[#BE185D] hover:from-amber-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{processingTesterEmail === testerEmailInput.toLowerCase().trim() ? 'Granting...' : 'Grant Premium Plus'}</span>
                </button>
              </div>
            </form>

            {/* Active Granted Testers List / Chips */}
            <div className="space-y-2 pt-1 border-t border-amber-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">
                  Currently Authorized Tester Accounts ({grantedTesters.length}):
                </span>
                {loadingTesters && (
                  <span className="text-[11px] text-[#111827] font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#B91C1C]" /> Syncing...
                  </span>
                )}
              </div>

              {grantedTesters.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-white/90 border border-dashed border-amber-300 text-center text-xs text-[#111827] font-medium">
                  No custom tester emails currently granted. Use the form above to grant free Premium Plus to any tester email, or click <strong>Grant Free Premium Plus</strong> on any member in the table below.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {grantedTesters.map((tester) => {
                    const isProcessingThis = processingTesterEmail === tester.email;
                    return (
                      <div
                        key={tester.email}
                        className="p-2.5 rounded-2xl bg-white border border-amber-300 shadow-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                tester.isRegistered ? 'bg-[#047857]' : 'bg-amber-600'
                              }`}
                              title={tester.isRegistered ? 'Registered Account' : 'Pending Signup'}
                            />
                            <span className="text-xs font-bold text-[#111827] truncate block">
                              {tester.email}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#111827] font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{tester.isRegistered ? (tester.firstName || 'Registered') : 'Pending Signup'}</span>
                            <span>·</span>
                            <span className="text-[#047857] font-bold">Premium Plus</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleToggleTesterAccess(tester.email, 'remove')}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-[#111827] hover:text-[#B91C1C] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          title={`Revoke free tester access for ${tester.email}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Controls: Search, Filters & Export */}
          <div className="p-4 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#111827] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usersSearch}
                  onChange={e => setUsersSearch(e.target.value)}
                  placeholder="Search real members by name, email, User ID, or city..."
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-[#111827] font-medium placeholder-slate-500 focus:outline-none focus:border-[#BE185D] focus:bg-white transition-all"
                />
              </div>

              {/* Export JSON button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportRegisteredUsers}
                  disabled={!registeredUsers.length}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-pink-50 hover:bg-pink-100 border border-pink-300 text-xs font-bold text-[#BE185D] transition-colors cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchRegisteredUsers(true)}
                  disabled={loadingUsers || isRefreshingUsers}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#111827] text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${(loadingUsers || isRefreshingUsers) ? 'animate-spin text-[#B91C1C]' : ''}`} />
                  <span>{isRefreshingUsers ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#111827] uppercase mr-1">Tier:</span>
                {(['all', 'Free', 'Premium', 'Premium Plus'] as const).map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setUsersTierFilter(tier)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      usersTierFilter === tier
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 text-[#111827] hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    {tier === 'all' ? 'All Tiers' : tier}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#111827] uppercase mr-1">Status:</span>
                <button
                  type="button"
                  onClick={() => setUsersStatusFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    usersStatusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-[#111827] hover:bg-slate-100 border border-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setUsersStatusFilter('active_session')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    usersStatusFilter === 'active_session'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-[#065F46] hover:bg-emerald-100 border border-emerald-300'
                  }`}
                >
                  Active Session
                </button>
                <button
                  type="button"
                  onClick={() => setUsersStatusFilter('banned')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    usersStatusFilter === 'banned'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-red-50 text-[#991B1B] hover:bg-red-100 border border-red-300'
                  }`}
                >
                  Banned
                </button>
              </div>
            </div>
          </div>

          {/* Loading, Error, Zero Registrations, or Users Table */}
          {loadingUsers && registeredUsers.length === 0 ? (
            <div className="p-12 text-center text-[#111827] space-y-2 bg-white rounded-3xl border border-rose-200 shadow-xs">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#B91C1C]" />
              <p className="text-xs font-bold">Loading real registered accounts from production server...</p>
            </div>
          ) : usersError && registeredUsers.length === 0 ? (
            <div className="p-8 text-center text-[#991B1B] space-y-3 bg-red-50 rounded-3xl border border-red-300">
              <AlertTriangle className="w-8 h-8 mx-auto text-[#B91C1C]" />
              <p className="text-sm font-bold">Error loading registered accounts</p>
              <p className="text-xs text-[#991B1B] font-medium max-w-md mx-auto">{usersError}</p>
              <button
                type="button"
                onClick={() => fetchRegisteredUsers(false)}
                className="px-4 py-2 rounded-xl bg-red-700 text-white font-bold text-xs hover:bg-red-800 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : totalRegistrations === 0 ? (
            <div className="p-12 text-center text-[#111827] space-y-3 bg-white rounded-3xl border border-rose-200 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-[#111827]">
                <Users className="w-7 h-7" />
              </div>
              <p className="text-lg font-bold text-[#111827] font-heading">Zero Registrations</p>
              <p className="text-xs text-[#111827] font-medium max-w-md mx-auto leading-relaxed">
                No real member accounts are currently recorded in the server database. All demo profiles (Alex Rivera, test seeds) have been filtered out.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-[#111827] space-y-2 bg-white rounded-3xl border border-rose-200">
              <Filter className="w-6 h-6 mx-auto text-[#111827]" />
              <p className="text-sm font-bold text-[#111827]">No members match your search or filter</p>
              <p className="text-xs text-[#111827] font-medium">Try adjusting your search query or reset filter pills above.</p>
              <button
                type="button"
                onClick={() => {
                  setUsersSearch('');
                  setUsersTierFilter('all');
                  setUsersStatusFilter('all');
                }}
                className="mt-2 text-xs font-bold text-[#BE185D] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#111827] font-medium px-1">
                <span className="flex items-center gap-2">
                  <span>
                    Showing <strong>{filteredUsers.length}</strong> of <strong>{totalRegistrations}</strong> real registered accounts
                  </span>
                  {isRefreshingUsers && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#BE123C]">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Updating...</span>
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px] text-[#111827] font-semibold">
                  Authoritative: Cloud Firestore / Durable Server Storage
                </span>
              </div>

              {/* Users Cards / Rows */}
              <div className="space-y-3">
                {filteredUsers.map(user => {
                  const signupDateET = formatEasternDate(user.createdAt);
                  const lastSignInET = formatEasternDate(user.lastSignIn);

                  return (
                    <div
                      key={user.userId}
                      className={`p-5 rounded-3xl bg-white border transition-all shadow-xs space-y-3 ${
                        user.isOwner
                          ? 'border-amber-300 ring-2 ring-amber-100/60 bg-amber-50/15'
                          : user.isBanned
                          ? 'border-red-300 bg-red-50/20'
                          : 'border-rose-200 hover:border-pink-300'
                      }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-[#111827] font-heading">
                                {user.fullName || user.firstName}
                              </h3>
                              {user.isOwner && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#78350F] border border-amber-300 text-[10px] font-bold uppercase tracking-wider">
                                  Platform Owner
                                </span>
                              )}
                              {user.hasActiveSession && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#065F46] border border-emerald-300 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-pulse" />
                                  Active Session
                                </span>
                              )}
                              {user.isBanned && (
                                <span className="px-2 py-0.5 rounded-full bg-red-700 text-white text-[10px] font-bold">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#111827] font-medium flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] text-[#111827] font-semibold">{user.userId}</span>
                              <span>·</span>
                              <span className="font-semibold text-[#111827]">{user.gender}</span>
                              <span>·</span>
                              <span className="font-semibold text-[#111827]">{user.age > 0 ? `${user.age} yrs` : 'Age 18+'}</span>
                              <span>·</span>
                              <span className="text-[#111827]">{user.location}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tier & Subscription Status Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              user.subscriptionTier === 'Premium Plus'
                                ? 'bg-amber-100 text-[#78350F] border border-amber-300'
                                : user.subscriptionTier === 'Premium'
                                ? 'bg-pink-100 text-[#9D174D] border border-pink-300'
                                : 'bg-slate-100 text-[#111827] border border-slate-300'
                            }`}
                          >
                            {user.subscriptionTier}
                          </span>
                          {user.isTester && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#065F46] border border-emerald-300 text-[10px] font-bold">
                              Free Tester
                            </span>
                          )}
                          {user.emailVerified ? (
                            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-300 text-[10px] font-bold">
                              Email Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#92400E] border border-amber-300 text-[10px] font-bold">
                              Email Unverified
                            </span>
                          )}
                          {typeof user.launchOfferGrantNumber === 'number' && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-50 text-[#BE185D] border border-pink-300 text-[10px] font-bold">
                              Launch Grant #{user.launchOfferGrantNumber}{user.launchOfferActive ? ' (Active)' : ' (Ended)'}
                            </span>
                          )}
                          {user.subscriptionStatus && user.subscriptionStatus !== 'none' && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#0C4A6E] border border-sky-300 text-[10px] font-mono font-bold">
                              Stripe: {user.subscriptionStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail Metrics Grid: Email, Signup Date, Last Sign-In */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* Email */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-[#111827] uppercase block">Registered Email</span>
                          <div className="flex items-center gap-1.5 text-[#111827] font-semibold break-all">
                            <Mail className="w-3.5 h-3.5 text-[#111827] shrink-0" />
                            <span>{user.email}</span>
                          </div>
                        </div>

                        {/* Signup Date */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-[#111827] uppercase block">Signup Date &amp; Time</span>
                          <div className="flex items-center gap-1.5 text-[#111827] font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-[#111827] shrink-0" />
                            <span>{signupDateET || 'Recorded'}</span>
                          </div>
                        </div>

                        {/* Last Sign-In */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-[#111827] uppercase block">Last Sign-In</span>
                          {lastSignInET ? (
                            <div className="flex items-center gap-1.5 text-[#065F46] font-semibold">
                              <Clock className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                              <span>{lastSignInET}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[#111827] font-medium">
                              <Clock className="w-3.5 h-3.5 text-[#111827] shrink-0" />
                              <span className="italic text-[#111827]">— Unavailable</span>
                              <span className="text-[10px] text-[#111827]">(Not recorded yet)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Extra info row: occupation & actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                        <div className="text-[#111827] font-medium text-[11px]">
                          {user.occupation ? (
                            <span>Occupation: <strong className="text-[#111827]">{user.occupation}</strong></span>
                          ) : (
                            <span className="text-[#111827]">Profile complete · Adult verified (18+)</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {user.isOwner ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#92400E] bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl flex items-center gap-1">
                              <Crown className="w-3 h-3 text-[#B45309]" /> Platform Owner
                            </span>
                          ) : (user.isTester || user.testerAccessGranted) ? (
                            <button
                              type="button"
                              disabled={processingTesterEmail === user.email.toLowerCase().trim()}
                              onClick={() => handleToggleTesterAccess(user.email, 'remove')}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-red-50 text-[#111827] hover:text-[#991B1B] border border-slate-300 hover:border-red-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Revoke free tester access"
                            >
                              <UserMinus className="w-3.5 h-3.5 text-[#B91C1C]" />
                              <span>{processingTesterEmail === user.email.toLowerCase().trim() ? 'Updating...' : 'Revoke Tester Access'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={processingTesterEmail === user.email.toLowerCase().trim()}
                              onClick={() => handleToggleTesterAccess(user.email, 'grant')}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-600 to-[#BE185D] hover:from-amber-700 hover:to-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                              title="Grant free Premium Plus tester access"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-white" />
                              <span>{processingTesterEmail === user.email.toLowerCase().trim() ? 'Granting...' : 'Grant Free Premium Plus'}</span>
                            </button>
                          )}

                          {user.isBanned && (
                            <button
                              type="button"
                              disabled={processingId === user.userId}
                              onClick={() => handleUnbanUser(user.userId)}
                              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs transition-colors cursor-pointer"
                            >
                              {processingId === user.userId ? 'Unbanning...' : 'Unban Member'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PRIVATE LAUNCH EVENT WAITING LIST (FOUNDER/ADMIN ONLY)       */}
      {/* ==================================================================== */}
      {activeDashboardTab === 'waitlist' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Hero Summary Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-rose-900/40 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-200 text-xs font-bold uppercase tracking-wider border border-pink-500/30">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Founder-Only Private Waiting List</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight">
                  Launch Event Waiting List &amp; Compatibility Pool
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 max-w-2xl font-medium leading-relaxed mt-1">
                  Review interested singles privately before announcing your launch event. Invitations and notifications are paused until you manually schedule and confirm an event date.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('friday')}
                className="px-4 py-2.5 rounded-2xl btn-pink-gradient font-bold text-xs shadow-md cursor-pointer shrink-0"
              >
                Schedule Launch Event
              </button>
            </div>

            {/* Pool Breakdown Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/15">
                <span className="text-[10px] font-bold text-slate-200 uppercase block">Total Waitlisted</span>
                <span className="text-2xl font-black text-white font-heading">
                  {waitlistSummary?.totalWaitlisted ?? waitlistMembers.length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-pink-500/20 border border-pink-400/30">
                <span className="text-[10px] font-bold text-pink-100 uppercase block">Women Seeking Men</span>
                <span className="text-2xl font-black text-pink-200 font-heading">
                  {waitlistSummary?.womenSeekingMen ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-sky-500/20 border border-sky-400/30">
                <span className="text-[10px] font-bold text-sky-100 uppercase block">Men Seeking Women</span>
                <span className="text-2xl font-black text-sky-200 font-heading">
                  {waitlistSummary?.menSeekingWomen ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-400/30">
                <span className="text-[10px] font-bold text-purple-100 uppercase block">LGBTQ+ / Everyone</span>
                <span className="text-2xl font-black text-purple-200 font-heading">
                  {waitlistSummary?.lgbtqOrEveryone ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/30">
                <span className="text-[10px] font-bold text-amber-100 uppercase block">Age 30+</span>
                <span className="text-2xl font-black text-amber-200 font-heading">
                  {waitlistSummary?.thirtyPlusCount ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30">
                <span className="text-[10px] font-bold text-emerald-100 uppercase block">Compatible Pairs</span>
                <span className="text-2xl font-black text-emerald-200 font-heading">
                  {waitlistSummary?.compatiblePairsCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Gender Filters */}
          <div className="p-4 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#111827] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={waitlistSearch}
                  onChange={e => setWaitlistSearch(e.target.value)}
                  placeholder="Search waitlisted singles by name, email, location, or intent..."
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-[#111827] font-medium placeholder-slate-500 focus:outline-none focus:border-[#BE185D] focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!waitlistMembers.length) return;
                    const dataStr =
                      'data:text/json;charset=utf-8,' +
                      encodeURIComponent(JSON.stringify({ summary: waitlistSummary, members: waitlistMembers }, null, 2));
                    const a = document.createElement('a');
                    a.setAttribute('href', dataStr);
                    a.setAttribute('download', `speed_meet_love_waitlist_${Date.now()}.json`);
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  disabled={!waitlistMembers.length}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-pink-50 hover:bg-pink-100 border border-pink-300 text-xs font-bold text-[#BE185D] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Waitlist JSON</span>
                </button>
                <button
                  type="button"
                  onClick={fetchWaitlistMembers}
                  disabled={loadingWaitlist}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#111827] text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingWaitlist ? 'animate-spin text-[#B91C1C]' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 text-xs">
              <span className="text-[11px] font-bold text-[#111827] uppercase mr-1">Filter Gender:</span>
              {(['all', 'Woman', 'Man', 'Non-Binary'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setWaitlistGenderFilter(g)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    waitlistGenderFilter === g
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-[#111827] hover:bg-slate-100 border border-slate-300'
                  }`}
                >
                  {g === 'all' ? 'All Genders' : g}
                </button>
              ))}
            </div>
          </div>

          {loadingWaitlist && waitlistMembers.length === 0 ? (
            <div className="p-12 text-center text-[#111827] space-y-2 bg-white rounded-3xl border border-rose-200">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#B91C1C]" />
              <p className="text-xs font-bold">Loading private waiting list from server...</p>
            </div>
          ) : waitlistError ? (
            <div className="p-8 text-center text-[#991B1B] space-y-3 bg-red-50 rounded-3xl border border-red-300">
              <AlertTriangle className="w-8 h-8 mx-auto text-[#B91C1C]" />
              <p className="text-sm font-bold">{waitlistError}</p>
            </div>
          ) : filteredWaitlist.length === 0 ? (
            <div className="p-10 text-center text-[#111827] space-y-2 bg-white rounded-3xl border border-rose-200">
              <Heart className="w-7 h-7 mx-auto text-[#BE185D]" />
              <p className="text-sm font-bold">No members on the Event Waiting List yet</p>
              <p className="text-xs font-medium">
                As signed-in singles click “Join the Event Waiting List”, they will appear privately here with compatibility matching.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWaitlist.map(member => (
                <div
                  key={member.userId}
                  className="p-5 rounded-3xl bg-white border border-rose-200 hover:border-pink-300 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[#111827] font-heading">{member.fullName}</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-pink-50 text-[#BE185D] border border-pink-200 text-[11px] font-bold">
                          {member.gender} · Seeking {member.interestedIn}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#111827] border border-slate-300 text-[11px] font-bold">
                          Age {member.age || '18+'}
                        </span>
                      </div>
                      <div className="text-xs text-[#111827] font-medium mt-1 flex flex-wrap items-center gap-2">
                        <span>{member.email}</span>
                        <span>·</span>
                        <span>{member.location}</span>
                        <span>·</span>
                        <span>Intent: <strong>{member.relationshipIntent}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          member.compatibleCount > 0
                            ? 'bg-emerald-50 text-[#065F46] border-emerald-300'
                            : 'bg-amber-50 text-[#78350F] border-amber-300'
                        }`}
                      >
                        {member.compatibleCount} Compatible Partner{member.compatibleCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-[10px] text-[#111827] font-mono font-semibold">
                        Joined: {formatEasternDate(member.joinedAt) || 'Recorded'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[#111827]">Compatible Matches in Waitlist:</span>
                      {member.compatibleWithNames.length > 0 ? (
                        member.compatibleWithNames.map((name, idx) => (
                          <span
                            key={`${member.userId}_${idx}`}
                            className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#065F46] border border-emerald-200 font-bold text-[11px]"
                          >
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#92400E] font-medium">None yet (still gathering compatible singles)</span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-[#111827]">
                      Tier: {member.subscriptionTier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Confirmation Modal (for Safety Reports) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-rose-300 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#B91C1C] font-bold font-heading text-lg">
              <AlertTriangle className="w-6 h-6" />
              <span>Confirm Owner Action</span>
            </div>

            <p className="text-xs text-[#111827] font-medium leading-relaxed">
              {actionModal.action === 'ban_user' ? (
                <>
                  You are about to permanently ban user{' '}
                  <strong>{actionModal.report.reportedUserName}</strong> (ID: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">{actionModal.report.reportedUserId}</code>).
                  This will revoke their active session tokens, evict them from speed dating queues, and block them from signing in.
                </>
              ) : (
                <>
                  You are dismissing report <strong>{actionModal.report.id}</strong>. The reported member will remain active without sanctions.
                </>
              )}
            </p>

            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Owner Review Notes (recorded on server):
              </label>
              <textarea
                rows={2}
                value={ownerNote}
                onChange={e => setOwnerNote(e.target.value)}
                placeholder={actionModal.action === 'ban_user' ? 'E.g., In-call harassment verified; account suspended.' : 'E.g., No violation found upon inspection.'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-[#111827] font-medium focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === actionModal.report.id}
                onClick={() => handleTakeAction(actionModal.report.id, actionModal.action, ownerNote)}
                className={`px-4 py-2 rounded-xl font-bold text-white transition-all cursor-pointer ${
                  actionModal.action === 'ban_user'
                    ? 'bg-red-700 hover:bg-red-800 shadow-md shadow-red-600/30'
                    : 'bg-slate-900 hover:bg-slate-950'
                }`}
              >
                {processingId === actionModal.report.id
                  ? 'Processing...'
                  : actionModal.action === 'ban_user'
                  ? 'Confirm Permanent Ban'
                  : 'Confirm Dismissal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
