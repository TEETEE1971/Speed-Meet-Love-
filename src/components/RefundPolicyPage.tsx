import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Mail,
} from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-rose-50 text-slate-700 hover:text-red-600 font-bold text-xs border border-rose-200 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-red-600" />
          <span>Back to Speed Meet Love</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span>Speed Meet Love · Refund &amp; Cancellation Policy</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white p-6 sm:p-10 shadow-xl border-2 border-rose-700 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase border border-white/30 text-white font-heading">
            <RotateCcw className="w-4 h-4 text-white" />
            <span>Refund &amp; Cancellation Policy</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">
            Subscription Billing, Cancellations &amp; Refund Inquiries
          </h1>

          <p className="text-sm sm:text-base text-rose-100 max-w-2xl font-medium leading-relaxed">
            Clear billing details for Speed Meet Love memberships offered by{' '}
            <strong className="text-white">TeeTees Creations</strong> at{' '}
            <span className="font-bold text-white">https://speedmeetlove.com</span>.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {/* Verified Pricing Plans */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-100 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
            <CreditCard className="w-5 h-5 text-red-600 shrink-0" />
            <h2>1. Membership Plans &amp; Recurring Billing</h2>
          </div>
          <p>Speed Meet Love offers three membership tiers on the web:</p>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              <strong>Free ($0/month):</strong> No charge. Allows profile creation, browsing profiles, Like/Pass voting, and viewing mutual matches.
            </li>
            <li>
              <strong>Premium ($9.99 USD/month):</strong> Recurring monthly web subscription billed via Stripe. Unlocks private messaging after a mutual match with eligible paid members.
            </li>
            <li>
              <strong>Premium Plus ($14.99 USD/month):</strong> Recurring monthly web subscription billed via Stripe. Unlocks all Premium features plus live speed dating on Friday, Saturday, and Sunday at 7:00 PM EST.
            </li>
          </ul>
          <p className="text-xs text-slate-600">
            Free tester access granted directly by the platform owner does not create a paid Stripe subscription or card charge. Android app purchases, once released on Google Play, are governed by Google Play billing rather than web Stripe checkout.
          </p>
        </section>

        {/* How to Cancel */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-100 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2>2. How to Cancel Your Subscription</h2>
          </div>
          <p>
            You can cancel or manage your recurring web subscription at any time to stop future monthly renewals:
          </p>
          <ol className="space-y-1.5 list-decimal pl-5">
            <li>
              Sign in to Speed Meet Love and visit the{' '}
              <a href="/pricing" onClick={(e) => handleNav(e, 'pricing')} className="text-red-600 font-bold underline">
                Pricing &amp; Membership page (/pricing)
              </a>
              .
            </li>
            <li>
              Click <strong>Manage Subscription &amp; Invoices (Stripe Portal)</strong> to open the Stripe Customer Billing Portal.
            </li>
            <li>
              Select your active subscription and choose <strong>Cancel subscription</strong> to prevent future billing cycles.
            </li>
          </ol>
          <p className="text-xs text-slate-600">
            If you have trouble accessing the Stripe Customer Billing Portal or plan to delete your account, please cancel your subscription before deleting your account or email{' '}
            <a href="mailto:speedmeetlove@gmail.com" className="text-red-600 font-bold underline">
              speedmeetlove@gmail.com
            </a>{' '}
            for assistance.
          </p>
        </section>

        {/* Refund Inquiries */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-100 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <h2>3. Billing Disputes &amp; Refund Requests</h2>
          </div>
          <p>
            If you believe you were charged in error, experienced a duplicate charge, have an unrecognized transaction, or wish to request a billing review, please contact TeeTees Creations directly before initiating a payment dispute so we can investigate your Stripe billing record promptly.
          </p>
          <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-1.5 text-xs">
            <p className="font-bold text-slate-900">What to include when requesting a billing review:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>The email address associated with your Speed Meet Love account</li>
              <li>The date and dollar amount ($9.99 or $14.99) of the charge</li>
              <li>A brief explanation of the billing issue or request</li>
            </ul>
          </div>
          <p className="text-xs text-slate-600">
            Requests are reviewed directly by TeeTees Creations. Accounts terminated for violations of our{' '}
            <a href="/terms" onClick={(e) => handleNav(e, 'terms')} className="text-red-600 font-bold underline">
              Terms &amp; Conditions
            </a>{' '}
            or{' '}
            <a href="/acceptable-use" onClick={(e) => handleNav(e, 'acceptable_use')} className="text-red-600 font-bold underline">
              Acceptable Use Policy
            </a>{' '}
            remain subject to account ban enforcement.
          </p>
        </section>

        {/* Contact */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 font-heading">
            <Mail className="w-5 h-5 text-red-600 shrink-0" />
            <h2>4. Billing Support Contact</h2>
          </div>
          <p>
            Send all cancellation help, invoice questions, and refund inquiries to{' '}
            <a href="mailto:speedmeetlove@gmail.com" className="text-red-600 font-bold underline font-mono">
              speedmeetlove@gmail.com
            </a>{' '}
            (TeeTees Creations).
          </p>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rose-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/pricing" onClick={(e) => handleNav(e, 'pricing')} className="text-red-600 font-bold hover:underline">
            View Pricing (/pricing)
          </a>
          <span className="text-slate-300">·</span>
          <a href="/terms" onClick={(e) => handleNav(e, 'terms')} className="text-slate-600 font-bold hover:underline">
            Terms &amp; Conditions
          </a>
          <span className="text-slate-300">·</span>
          <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="text-slate-600 font-bold hover:underline">
            Privacy Policy
          </a>
          <span className="text-slate-300">·</span>
          <a href="/contact" onClick={(e) => handleNav(e, 'contact')} className="text-slate-600 font-bold hover:underline">
            Contact
          </a>
        </div>
        <div className="text-slate-500 font-medium">© 2026 Speed Meet Love by TeeTees Creations</div>
      </div>
    </div>
  );
};
