import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';
import { UserReport } from '../types';

export const ReportModal: React.FC = () => {
  const { reportModalTarget, setReportModalTarget, reportUser } = useApp();

  const [reason, setReason] = useState<UserReport['Reason']>('Inappropriate behavior');
  const [notes, setNotes] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);

  if (!reportModalTarget) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportUser(reportModalTarget.UserID, reason, notes, alsoBlock);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
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
            onClick={() => setReportModalTarget(null)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#111827] hover:text-[#B91C1C] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100 text-[#111827] font-medium leading-relaxed">
            Reporting <strong className="text-[#111827] font-bold">{reportModalTarget.FirstName} {reportModalTarget.LastName}</strong>. Your report is strictly confidential and reviewed directly by the platform owner (TeeTees Creations).
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1.5">
              Reason for report
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as UserReport['Reason'])}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D] focus:ring-1 focus:ring-[#BE185D]"
            >
              <option value="Inappropriate behavior">Inappropriate behavior</option>
              <option value="Child safety / Underage / CSAE">Child safety / Underage / CSAE concern</option>
              <option value="Fake profile">Fake profile / Catfishing</option>
              <option value="Spam or advertising">Spam or advertising</option>
              <option value="Harassment">Harassment or abusive language</option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          <div>
            <label className="block text-[#111827] font-bold mb-1.5">
              Additional details (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Describe what occurred..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium placeholder-slate-500 focus:outline-none focus:border-[#BE185D] focus:ring-1 focus:ring-[#BE185D]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1 text-[#111827] font-medium select-none">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={e => setAlsoBlock(e.target.checked)}
              className="w-4 h-4 text-[#BE185D] rounded border-slate-300 focus:ring-[#BE185D]"
            />
            <span>Also block this member immediately</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReportModalTarget(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-[#FF2E93] text-white font-bold shadow-md hover:brightness-105 transition-all"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
