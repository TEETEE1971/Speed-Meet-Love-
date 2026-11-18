import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, X, AlertTriangle, Radio, PhoneOff } from 'lucide-react';
import { UserReport } from '../types';

export const ReportModal: React.FC = () => {
  const { reportModalTarget, reportModalContext, setReportModalTarget, reportUser } = useApp();

  const [reason, setReason] = useState<UserReport['Reason']>('Inappropriate behavior');
  const [notes, setNotes] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [endActiveCall, setEndActiveCall] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isLiveVideoContext = Boolean(
    reportModalContext?.onAfterSubmitEndCall ||
      reportModalContext?.source === 'live_video_round' ||
      reportModalContext?.source === 'second_chance_date'
  );

  useEffect(() => {
    if (reportModalTarget) {
      setReason('Inappropriate behavior');
      setNotes('');
      setAlsoBlock(true);
      setEndActiveCall(Boolean(reportModalContext?.onAfterSubmitEndCall));
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [reportModalTarget?.UserID, reportModalContext?.eventId, reportModalContext?.roundIndex, reportModalContext?.source]);

  if (!reportModalTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const res = await reportUser(reportModalTarget.UserID, reason, notes, alsoBlock, {
      context: reportModalContext,
      endActiveCall: isLiveVideoContext ? endActiveCall : false,
    });

    if (!res.success) {
      setSubmitError(res.error || 'Could not save report on the server. Please try again.');
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 my-4">
        <div className="flex items-center justify-between border-b border-pink-50 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[#BE123C]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#111827] font-heading">
              Report Member
            </h3>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setReportModalTarget(null)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#111827] hover:text-[#B91C1C] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100 text-[#111827] font-medium leading-relaxed space-y-1.5">
            <div>
              Reporting <strong className="text-[#111827] font-bold">{reportModalTarget.FirstName} {reportModalTarget.LastName}</strong>. This report is saved on the server with timestamp and session details for review by the platform owner (Kristy).
            </div>
            {(reportModalContext?.eventName || reportModalContext?.roundNumber !== undefined || isLiveVideoContext) && (
              <div className="pt-1.5 border-t border-pink-200/70 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#9D174D]">
                <Radio className="w-3.5 h-3.5 text-[#BE123C]" />
                <span>
                  {reportModalContext?.eventName || 'Live Video Session'}
                  {reportModalContext?.roundNumber ? ` · Round ${reportModalContext.roundNumber}` : ''}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-[#9F1239] border border-rose-200">
                  Flagged Urgent
                </span>
              </div>
            )}
          </div>

          {submitError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-[#881337] font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#BE123C] shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div>
            <label className="block text-[#111827] font-bold mb-1.5">
              Reason for report
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as UserReport['Reason'])}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D] focus:ring-1 focus:ring-[#BE185D]"
            >
              <option value="Inappropriate behavior">Inappropriate behavior</option>
              <option value="Sexually explicit content or solicitation">Sexually explicit content or solicitation</option>
              <option value="Harassment">Harassment or abusive language</option>
              <option value="Child safety / Underage / CSAE">Child safety / Underage / CSAE concern</option>
              <option value="Fake profile">Fake profile / Catfishing</option>
              <option value="Spam or advertising">Spam or advertising</option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1.5">
              Additional details (optional)
            </label>
            <textarea
              rows={3}
              disabled={isSubmitting}
              placeholder="Describe what occurred..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium placeholder-slate-500 focus:outline-none focus:border-[#BE185D] focus:ring-1 focus:ring-[#BE185D]"
            />
          </div>

          <div className="space-y-2 pt-1">
            {reportModalContext?.onAfterSubmitEndCall && (
              <label className="flex items-center gap-2 cursor-pointer text-[#991B1B] font-bold select-none bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <input
                  type="checkbox"
                  checked={endActiveCall}
                  disabled={isSubmitting}
                  onChange={e => setEndActiveCall(e.target.checked)}
                  className="w-4 h-4 text-[#BE123C] rounded border-rose-300 focus:ring-[#BE123C]"
                />
                <PhoneOff className="w-3.5 h-3.5 text-[#BE123C] shrink-0" />
                <span>Disconnect &amp; end active video call immediately</span>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-[#111827] font-medium select-none">
              <input
                type="checkbox"
                checked={alsoBlock}
                disabled={isSubmitting}
                onChange={e => setAlsoBlock(e.target.checked)}
                className="w-4 h-4 text-[#BE185D] rounded border-slate-300 focus:ring-[#BE185D]"
              />
              <span>Also block this member immediately</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setReportModalTarget(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-[#FF2E93] text-white font-bold shadow-md hover:brightness-105 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? 'Submitting Report...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
