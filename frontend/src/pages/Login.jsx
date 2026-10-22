import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Building2, ArrowRight, Sparkles, ShieldCheck, CheckCircle2, Shield } from 'lucide-react';
import { signIn, registerAdmin } from '../auth/auth.js';
import GradientASCII from '../components/GradientASCII.jsx';
import { LegalModal } from '../components/LegalModal.jsx';

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function Login() {
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [legalModalType, setLegalModalType] = useState(null); // 'terms' | 'privacy' | null
  const navigate = useNavigate();

  useEffect(() => {
    const handleOpenLegal = (e) => {
      if (e.detail?.type) {
        setLegalModalType(e.detail.type);
      }
    };
    window.addEventListener('verity:openLegal', handleOpenLegal);
    return () => window.removeEventListener('verity:openLegal', handleOpenLegal);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (isRegister && confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        if (!tenantName.trim()) {
          throw new Error('Please specify an institution/school tenant name.');
        }
        await registerAdmin(email, password, tenantName.trim());
      } else {
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Authentication failure:', err);
      const serverError = err.response?.data?.detail
        ? `${err.response.data.error} (${err.response.data.detail})`
        : err.response?.data?.error;
      setError(serverError || err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setError('');
    setInfoMessage(
      'Google Workspace SSO is configured per institution domain. For quick local evaluation, use the Autofill Demo Credentials button below.'
    );
  };

  const fillDemo = () => {
    setEmail('admin@verity.edu');
    setPassword('admin123');
    setConfirmPassword('admin123');
    setIsRegister(false);
    setError('');
    setInfoMessage('');
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-2 sm:py-4 relative font-sans">
      {/* Interactive ASCII Gradient Background (React Bits) */}
      <div className="fixed inset-0 z-0">
        <GradientASCII
          colors={['#047857', '#10b981', '#6ee7b7', '#a7f3d0']}
          shape="horizon"
          characters=" =+xX0S8#@"
          cellSize={16}
          density={0.8}
          glyphOpacity={0.85}
          gradientOpacity={0.85}
          glow={0.3}
          speed={0.8}
          grain={0.06}
          mouseInteraction={true}
          clickEffect="wave"
          intro={false}
        />
        {/* Subtle gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090d16]/85 via-transparent to-[#090d16]/50 pointer-events-none" />
      </div>

      {/* Main Split Card (signup-04 layout - compact single-screen fit) */}
      <div className="w-full max-w-4xl relative z-10 my-auto">
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          
          {/* Left Column: Sign Up / Sign In Form */}
          <div className="p-5 sm:p-6 md:p-7 flex flex-col justify-between">
            <div>
              {/* Form Header */}
              <div className="mb-3.5">
                <div className="flex items-center gap-2 mb-1.5 md:hidden">
                  <img src="/logo.png" alt="Verity Logo" className="w-6 h-6 object-contain" />
                  <span className="font-normal text-lg text-white tracking-wider font-viaoda">VERITY</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  {isRegister ? 'Create an account' : 'Welcome back'}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRegister
                    ? 'Enter your institutional details below to register your tenant'
                    : 'Enter your credentials below to access your administrator portal'}
                </p>
              </div>

              {/* Social Login: Google Account Selection (Apple & Meta removed) */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-medium rounded-xl text-xs transition-all duration-150 active:scale-[0.99] shadow-sm"
                >
                  <GoogleIcon />
                  <span>{isRegister ? 'Sign up with Google' : 'Sign in with Google'}</span>
                </button>
              </div>

              {/* Field Separator */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 border-t border-slate-800" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 shrink-0">
                  Or continue with email
                </span>
                <div className="flex-1 border-t border-slate-800" />
              </div>

              {/* Alerts */}
              {error && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs leading-relaxed">
                  {infoMessage}
                </div>
              )}

              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-2.5">
                {isRegister && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Institution / School Tenant Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="e.g. St. Joseph's College"
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@verity.edu"
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                </div>

                {isRegister ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-slate-300">
                        Password
                      </label>
                      <span className="text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer">
                        Forgot password?
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full !mt-3 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] shadow-md shadow-emerald-500/20"
                >
                  <span>
                    {loading
                      ? 'Authenticating...'
                      : isRegister
                      ? 'Create Account'
                      : 'Sign In to Portal'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Mode Toggle Switcher */}
              <div className="mt-2.5 text-center">
                <span className="text-[11px] text-slate-400">
                  {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                    setInfoMessage('');
                  }}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition"
                >
                  {isRegister ? 'Sign in' : 'Sign up'}
                </button>
              </div>

              {/* Quick Demo Fill Button */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={fillDemo}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Autofill Demo Credentials (St. Joseph's College)</span>
                </button>
              </div>
            </div>

            {/* Terms of Service & Privacy Policy Note */}
            <p className="mt-2.5 text-[10px] text-center text-slate-500 leading-tight">
              By continuing, you agree to our{' '}
              <button
                type="button"
                onClick={() => setLegalModalType('terms')}
                className="underline underline-offset-2 hover:text-slate-300 transition text-slate-400 font-medium cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setLegalModalType('privacy')}
                className="underline underline-offset-2 hover:text-slate-300 transition text-slate-400 font-medium cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>

          {/* Right Column: Branded Visual Panel (Replacing Placeholder Pic) */}
          <div className="hidden md:flex flex-col justify-between p-6 lg:p-8 bg-gradient-to-br from-slate-950 via-[#0a1220] to-emerald-950/40 border-l border-slate-800/70 relative overflow-hidden">
            {/* Background ambient lighting */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Center Visual Feature Spotlight */}
            <div className="relative z-10 my-auto py-4">
              <div className="flex items-center gap-3.5 sm:gap-4 mb-3.5 sm:mb-4">
                <div className="relative inline-flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
                  <img
                    src="/logo.png"
                    alt="Verity"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-[0_0_20px_rgba(16,185,129,0.35)] relative z-10"
                  />
                </div>
                <span className="text-3xl sm:text-4xl lg:text-5xl tracking-wider text-white leading-none font-viaoda">
                  VERITY
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                Instant classroom face recognition attendance with private on-device verification.
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Private, privacy-first attendance platform built for modern schools and colleges.
              </p>

              {/* Key Highlights */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Instant face detection for multiple students simultaneously</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Private on-device face scan matching & school data isolation</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Automated attendance syncing with comprehensive logs</span>
                </div>
              </div>
            </div>

            {/* Bottom Security / Privacy Badge */}
            <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center gap-2.5 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Compliant institutional student privacy standards</span>
            </div>
          </div>

        </div>

        {/* Global Security Sub-badge */}
        <div className="mt-2.5 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Private on-device face matching & institutional tenant isolation</span>
        </div>
      </div>

      {/* Terms of Service & Privacy Policy Modal */}
      <LegalModal
        isOpen={!!legalModalType}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
}
export default Login;
