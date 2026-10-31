import React, { useState } from 'react';
import { Bell, BellRing, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useApp } from '../context/AppContext';

export const PushNotificationOptIn: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { currentUser, showNotification } = useApp();
  const {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing,
    subscribe,
    testPush,
  } = usePushNotifications(currentUser.UserID);

  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleSubscribe = async () => {
    const res = await subscribe();
    if (res.success) {
      showNotification('Push notifications enabled! You will be alerted when a match requests a second chance date.', 'pink');
    } else {
      showNotification(res.error || 'Could not enable notifications.', 'info');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testPush();
      if (res.success && (res.delivered || 0) > 0) {
        setTestResult('Test notification sent! Check your device or notification center.');
        showNotification('Test push delivered to your device!', 'success');
      } else if (res.success && res.total === 0) {
        setTestResult('No registered subscriptions found for this account. Click Enable below.');
      } else {
        setTestResult(`Delivery notice: ${res.error || 'Delivered to server dispatch.'}`);
      }
    } catch (err: any) {
      setTestResult('Failed to dispatch test notification.');
    } finally {
      setIsTesting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-rose-200 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <BellRing className="w-4 h-4 text-[#FF2E93] shrink-0 animate-pulse" />
          ) : (
            <Bell className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span className="text-slate-700 font-semibold">
            {isSubscribed
              ? 'Instant Date Alerts Active'
              : 'Get notified when matches invite you'}
          </span>
        </div>
        <div>
          {isSubscribed ? (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-2.5 py-1 rounded-xl bg-pink-50 text-[#FF2E93] hover:bg-pink-100 font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50"
            >
              {isTesting ? 'Sending…' : 'Test Alert'}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing || permission === 'denied'}
              className="px-3 py-1 rounded-xl bg-[#FF2E93] text-white hover:bg-[#E01A7D] font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubscribing ? 'Enabling…' : 'Turn On'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 border border-pink-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF2E93] text-white flex items-center justify-center shrink-0 shadow-sm">
            {isSubscribed ? <BellRing className="w-5 h-5 animate-pulse" /> : <Bell className="w-5 h-5" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-slate-900">
                {isSubscribed
                  ? 'Device Push Alerts Enabled ✓'
                  : 'Never Miss a 10-Minute Second-Chance Invitation'}
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-pink-100 text-[#FF2E93] text-[10px] font-black uppercase tracking-wider">
                Real-Time
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              {isSubscribed
                ? 'Your device will receive instant browser push alerts if a mutual match requests a 10-Minute Second-Chance Date, even when Speed Meet Love is in the background.'
                : 'Speed dating happens fast! Opt in to browser notifications so you can immediately accept or decline 10-minute dates even if you navigate away or close the tab.'}
            </p>
            {testResult && (
              <p className="text-[11px] text-pink-700 font-bold pt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{testResult}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {isSubscribed ? (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-white border border-pink-300 text-[#FF2E93] hover:bg-pink-50 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Sending Alert…' : 'Send Test Alert'}</span>
            </button>
          ) : permission === 'denied' ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold px-3 py-2 bg-rose-100 rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Blocked in browser settings</span>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#FF2E93] hover:bg-[#E01A7D] text-white text-xs font-black transition-all shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BellRing className="w-4 h-4" />
              <span>{isSubscribing ? 'Connecting…' : 'Enable Device Push'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
