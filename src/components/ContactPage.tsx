import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Mail,
  Globe,
  Building2,
  ShieldAlert,
  CreditCard,
  Trash2,
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { setCurrentView } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNav = (e: React.MouseEvent, view: Parameters<typeof setCurrentView>[0]) => {
    e.preventDefault();
    setCurrentView(view);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-rose-50 text-[#111827] hover:text-[#B91C1C] font-bold text-xs border border-rose-300 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#B91C1C]" />
          <span>Back to Speed Meet Love</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#111827] font-semibold">
          <span>Speed Meet Love · Contact Information</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white p-6 sm:p-10 shadow-xl border-2 border-rose-700 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase border border-white/30 text-white font-heading">
            <Mail className="w-4 h-4 text-white" />
            <span>Contact Information</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">
            Contact Speed Meet Love &amp; TeeTees Creations
          </h1>

          <p className="text-sm sm:text-base text-rose-100 max-w-2xl font-medium leading-relaxed">
            Reach the operator of Speed Meet Love for member support, billing questions, privacy and account deletion requests, safety reports, and legal inquiries.
          </p>
        </div>
      </div>

      {/* Verified Business Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Building2 className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>Operator &amp; Business Details</h2>
          </div>

          <div className="space-y-3 text-[#111827] font-medium">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#111827]">Service Name</p>
              <p className="font-bold text-[#111827] text-base">Speed Meet Love</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#111827]">Operating Entity</p>
              <p className="font-bold text-[#111827] text-base">TeeTees Creations</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#111827]">Official Website</p>
              <p className="font-bold text-[#111827] flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#B91C1C] shrink-0" />
                <span>https://speedmeetlove.com</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#111827]">Primary Support &amp; Legal Email</p>
              <p className="font-bold">
                <a
                  href="mailto:speedmeetlove@gmail.com"
                  className="text-[#B91C1C] hover:text-[#991B1B] underline font-mono text-sm"
                >
                  speedmeetlove@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#111827] font-heading">
            <Mail className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <h2>How to Reach Us by Topic</h2>
          </div>

          <div className="space-y-3 text-[#111827] font-medium text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#111827]">Safety, Abuse &amp; Law-Enforcement Inquiries</p>
                <p className="text-[#111827] font-medium mt-0.5">
                  Email{' '}
                  <a href="mailto:speedmeetlove@gmail.com?subject=Safety%20or%20Legal%20Inquiry" className="text-[#B91C1C] font-bold underline">
                    speedmeetlove@gmail.com
                  </a>{' '}
                  or use the in-app <strong>Report Member</strong> button. See{' '}
                  <a href="/law-enforcement" onClick={(e) => handleNav(e, 'law_enforcement')} className="text-[#B91C1C] font-bold underline">
                    Law-Enforcement Protocols
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-200 flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#111827]">Membership Billing &amp; Refund Inquiries</p>
                <p className="text-[#111827] font-medium mt-0.5">
                  Manage active subscriptions in the Stripe Customer Billing Portal via{' '}
                  <a href="/pricing" onClick={(e) => handleNav(e, 'pricing')} className="text-[#B91C1C] font-bold underline">
                    /pricing
                  </a>
                  , or email{' '}
                  <a href="mailto:speedmeetlove@gmail.com?subject=Billing%20Inquiry" className="text-[#B91C1C] font-bold underline">
                    speedmeetlove@gmail.com
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-200 flex items-start gap-2.5">
              <Trash2 className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#111827]">Privacy &amp; Account Deletion Requests</p>
                <p className="text-[#111827] font-medium mt-0.5">
                  Delete your account directly inside Profile Settings or email{' '}
                  <a href="mailto:speedmeetlove@gmail.com?subject=Account%20%26%20Data%20Deletion%20Request" className="text-[#B91C1C] font-bold underline">
                    speedmeetlove@gmail.com
                  </a>
                  . See{' '}
                  <a href="/delete-account" onClick={(e) => handleNav(e, 'delete_account')} className="text-[#B91C1C] font-bold underline">
                    /delete-account
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rose-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/terms" onClick={(e) => handleNav(e, 'terms')} className="text-[#B91C1C] font-bold hover:underline">
            Terms &amp; Conditions
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/acceptable-use" onClick={(e) => handleNav(e, 'acceptable_use')} className="text-[#111827] font-bold hover:underline">
            Acceptable Use Policy
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-[#111827] font-bold hover:underline">
            Privacy Policy
          </a>
          <span className="text-[#111827] font-bold">·</span>
          <a href="/refund-policy" onClick={(e) => handleNav(e, 'refund_policy')} className="text-[#111827] font-bold hover:underline">
            Refund Policy
          </a>
        </div>
        <div className="text-[#111827] font-medium">© 2026 Speed Meet Love by TeeTees Creations</div>
      </div>
    </div>
  );
};
