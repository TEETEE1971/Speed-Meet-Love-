import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    signIn,
    signUp,
    sendPasswordResetEmail,
  } = useApp();

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sign Up form state
  const [signUpForm, setSignUpForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    age: '',
    gender: 'Woman' as 'Woman' | 'Man' | 'Non-Binary',
    interestedIn: 'Men' as 'Men' | 'Women' | 'Everyone',
    location: 'New York, NY',
  });
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Forgot Password state
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    if (!signInEmail.trim() || !signInPassword) {
      setSignInError('Please enter both your email address and password.');
      return;
    }

    setIsSigningIn(true);
    try {
      const res = await signIn(signInEmail.trim(), signInPassword);
      if (!res.success) {
        setSignInError(res.error || 'Invalid email or password.');
      } else {
        setSignInPassword('');
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      setSignInError(err.message || 'Network error while attempting sign-in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessMessage(null);

    const emailToReset = resetEmail.trim().toLowerCase();
    if (!emailToReset) {
      setResetError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToReset)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setIsSendingReset(true);
    try {
      const res = await sendPasswordResetEmail(emailToReset);
      if (res.success) {
        setResetSuccessMessage(res.message);
      } else {
        setResetError(res.error || 'Failed to send password-reset email. Please check your connection and try again.');
      }
    } catch (err: any) {
      setResetError(err.message || 'Network error while requesting password reset.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const openForgotPassword = () => {
    setIsForgotPasswordView(true);
    setResetEmail(signInEmail.trim());
    setResetError(null);
    setResetSuccessMessage(null);
  };

  const backToSignIn = () => {
    setIsForgotPasswordView(false);
    setResetError(null);
    setResetSuccessMessage(null);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    if (!signUpForm.firstName.trim()) {
      setSignUpError('First name is required.');
      return;
    }

    if (!signUpForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpForm.email.trim())) {
      setSignUpError('Please enter a valid email address.');
      return;
    }

    if (!signUpForm.password || signUpForm.password.length < 8) {
      setSignUpError('Password must be at least 8 characters long.');
      return;
    }

    const ageNum = parseInt(signUpForm.age, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      setSignUpError('You must be at least 18 years old to join Speed Meet Love.');
      return;
    }

    setIsSigningUp(true);
    try {
      const res = await signUp({
        firstName: signUpForm.firstName.trim(),
        lastName: signUpForm.lastName.trim(),
        email: signUpForm.email.trim(),
        password: signUpForm.password,
        age: ageNum,
        gender: signUpForm.gender,
        interestedIn: signUpForm.interestedIn,
        location: signUpForm.location.trim() || 'New York, NY',
      });

      if (!res.success) {
        setSignUpError(res.error || 'Failed to create account.');
      } else {
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      setSignUpError(err.message || 'Network error while creating account.');
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-rose-300 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 p-5 text-white relative">
          <button
            onClick={() => {
              setIsAuthModalOpen(false);
              setIsForgotPasswordView(false);
            }}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <SpeedMeetLoveLogo variant="on-red" size="sm" />
          </div>
          <h2 className="text-xl font-black font-heading tracking-tight">
            {isForgotPasswordView
              ? 'Reset Your Password'
              : authModalTab === 'signin'
              ? 'Sign In to Your Account'
              : 'Create Member Account (18+)'}
          </h2>
          <p className="text-xs text-rose-100 font-medium mt-0.5">
            {isForgotPasswordView
              ? 'Enter your account email to receive a secure password-reset link.'
              : authModalTab === 'signin'
              ? 'Real People. Real Connections. In Minutes.'
              : 'Join weekend 5-minute video speed dating rounds every Fri, Sat & Sun at 7 PM EST.'}
          </p>
        </div>

        {/* Tab Switcher - only show when not in Forgot Password view */}
        {!isForgotPasswordView && (
          <div className="flex border-b border-rose-100 bg-rose-50/50">
            <button
              type="button"
              onClick={() => {
                setAuthModalTab('signin');
                setSignInError(null);
                setSignUpError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                authModalTab === 'signin'
                  ? 'border-[#B91C1C] text-[#B91C1C] bg-white'
                  : 'border-transparent text-[#111827] hover:text-[#B91C1C]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalTab('signup');
                setSignInError(null);
                setSignUpError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                authModalTab === 'signup'
                  ? 'border-[#B91C1C] text-[#B91C1C] bg-white'
                  : 'border-transparent text-[#111827] hover:text-[#B91C1C]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* FORGOT PASSWORD VIEW */}
          {isForgotPasswordView && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              {resetError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccessMessage ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Password-Reset Email Dispatched</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800 font-medium">
                    {resetSuccessMessage}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 pt-1 border-t border-emerald-200/60">
                    Once you open the link from the email and set a new password, return here to sign in with your updated credentials.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={backToSignIn}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to sign in</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#111827] font-medium leading-relaxed">
                    Forgot your password? Enter the email address linked to your Speed Meet Love account. We will send you a secure link to reset it.
                  </p>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#111827]">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#111827] absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        autoFocus
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 text-xs font-medium text-[#111827]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full py-3 rounded-2xl btn-glossy-red-pink text-white font-bold text-xs sm:text-sm shadow-md shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSendingReset ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending reset email...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send reset email</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={backToSignIn}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111827] hover:text-[#B91C1C] transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to sign in</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* TAB 1: SIGN IN */}
          {!isForgotPasswordView && authModalTab === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-3.5">
              {signInError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-[#881337] text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#BE123C] shrink-0" />
                  <span>{signInError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#111827]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#111827] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={e => setSignInEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 text-xs font-medium text-[#111827]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#111827]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#111827] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={e => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 text-xs font-medium text-[#111827]"
                  />
                </div>
                {/* Working "Forgot password?" Link Below Password Field */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs font-bold text-[#B91C1C] hover:text-red-900 hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full py-3 rounded-2xl btn-glossy-red-pink text-white font-bold text-xs sm:text-sm shadow-md shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSigningIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-[#111827] font-medium">
                  Don&rsquo;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTab('signup');
                      setSignInError(null);
                    }}
                    className="text-[#B91C1C] font-bold underline cursor-pointer hover:text-red-900"
                  >
                    Create Account (18+)
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {authModalTab === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              {signUpError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{signUpError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">First Name</label>
                  <input
                    type="text"
                    value={signUpForm.firstName}
                    onChange={e => setSignUpForm({ ...signUpForm, firstName: e.target.value })}
                    placeholder="First name"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Last Name</label>
                  <input
                    type="text"
                    value={signUpForm.lastName}
                    onChange={e => setSignUpForm({ ...signUpForm, lastName: e.target.value })}
                    placeholder="Last name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Email Address</label>
                <input
                  type="email"
                  value={signUpForm.email}
                  onChange={e => setSignUpForm({ ...signUpForm, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Password (min 8 characters)</label>
                <input
                  type="password"
                  value={signUpForm.password}
                  onChange={e => setSignUpForm({ ...signUpForm, password: e.target.value })}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Age (18+ Required)</label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={signUpForm.age}
                    onChange={e => setSignUpForm({ ...signUpForm, age: e.target.value })}
                    placeholder="25"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Location</label>
                  <input
                    type="text"
                    value={signUpForm.location}
                    onChange={e => setSignUpForm({ ...signUpForm, location: e.target.value })}
                    placeholder="New York, NY"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">I am a</label>
                  <select
                    value={signUpForm.gender}
                    onChange={e => setSignUpForm({ ...signUpForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900 bg-white"
                  >
                    <option value="Woman">Woman</option>
                    <option value="Man">Man</option>
                    <option value="Non-Binary">Non-Binary</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Interested in</label>
                  <select
                    value={signUpForm.interestedIn}
                    onChange={e => setSignUpForm({ ...signUpForm, interestedIn: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs text-slate-900 bg-white"
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Everyone">Everyone</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-pink-50/70 border border-pink-200 text-[11px] text-pink-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pink-600 shrink-0" />
                <span>Speed Meet Love strictly requires all participants to be verified adults aged 18 and older.</span>
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full py-3 rounded-2xl btn-glossy-red-pink text-white font-extrabold text-xs sm:text-sm shadow-md shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSigningUp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 fill-white" />
                    <span>Create Account &amp; Join</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-[#111827] font-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordView(false);
                      setAuthModalTab('signin');
                      setSignUpError(null);
                      setResetError(null);
                      setResetSuccessMessage(null);
                    }}
                    className="text-[#B91C1C] font-bold underline cursor-pointer hover:text-red-900"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
