import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  FileCheck,
  Lock,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export function LegalPage({ initialTab = 'terms' }) {
  const location = useLocation();
  const defaultTab = location.pathname.includes('privacy') ? 'privacy' : initialTab;
  const [activeTab, setActiveTab] = useState(defaultTab);

  const isPrivacy = activeTab === 'privacy';

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center group-hover:border-slate-600 transition">
              <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span>Back to Login</span>
          </Link>

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Verity" className="w-7 h-7 object-contain" />
            <span className="font-black text-sm tracking-wide text-white">VERITY</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Legal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex-1 w-full">
        {/* Title & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              {isPrivacy ? (
                <>
                  <Lock className="w-7 h-7 text-emerald-400" />
                  <span>Privacy Policy</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-7 h-7 text-emerald-400" />
                  <span>Terms of Service</span>
                </>
              )}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Effective Date: October 20, 2026 • Platform Version 1.2</span>
            </p>
          </div>

          {/* Tab Selector */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                !isPrivacy
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isPrivacy
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-10 backdrop-blur-md shadow-xl text-slate-300 text-sm leading-relaxed space-y-8 ring-1 ring-white/[0.05]">
          {isPrivacy ? (
            <>
              {/* Privacy Policy Content */}
              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SECTION 1</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  On-Device Biometric Extraction & Ephemeral Processing
                </h2>
                <p>
                  Verity is architected with a strict <strong>privacy-first, edge-computing</strong> philosophy. Biometric facial recognition computations—including facial detection, landmark alignment, and 128-dimensional mathematical vector embedding extraction—are executed exclusively on the client machine’s local WebGL2 graphics pipeline using TensorFlow.js.
                </p>
                <p className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono">
                  KEY GUARANTEE: Raw camera video frames analyzed during live attendance monitoring are held solely in volatile device memory (RAM) and are permanently discarded after feature matching. Raw video feeds are never streamed or persisted to remote servers.
                </p>
              </section>

              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SECTION 2</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Purpose of Biometric Verification & Educational Governance
                </h2>
                <p>
                  Facial descriptors and biometric match vectors are collected and processed solely for educational identity verification, classroom attendance management, and authorized institutional logging.
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-xs pl-2">
                  <li>Data is strictly partitioned by institutional tenant ID (multi-tenant isolation).</li>
                  <li>Biometric embeddings are never sold, rented, or distributed to advertising networks or external data brokers.</li>
                  <li>No cross-institutional profiling or surveillance tracking is performed.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SECTION 3</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Cryptographic Storage, Offline IndexedDB & API Security
                </h2>
                <p>
                  Offline attendance queues and reference feature vectors are persisted locally within client IndexedDB databases sandbox-restricted to the institution’s verified origin. Online sync payloads transmitted to the Verity institutional API utilize TLS 1.3 protocol encryption, JSON Web Token (JWT) verification, and database-level tenant isolation.
                </p>
              </section>

              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SECTION 4</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  FERPA, GDPR Compliance & Student Rights
                </h2>
                <p>
                  Verity complies with international data privacy legislation including the Family Educational Rights and Privacy Act (FERPA) and General Data Protection Regulation (GDPR). Students, parents, and legal guardians have the right to inspect, correct, or request the immediate deletion of their biometric descriptors and attendance logs by notifying their institution’s administrative proctor.
                </p>
              </section>
            </>
          ) : (
            <>
              {/* Terms of Service Content */}
              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>SECTION 1</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Acceptance of Terms
                </h2>
                <p>
                  By deploying, registering, or accessing the Verity Biometric Attendance System, school administrators, educational institutions, faculty, proctors, and authorized operators agree to be bound by these Terms of Service and adhere to all governing academic integrity standards.
                </p>
              </section>

              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>SECTION 2</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Permitted & Authorized Educational Use
                </h2>
                <p>
                  This software is licensed solely for legitimate educational attendance verification, classroom security, and administrative academic reporting. Any unauthorized tampering, injection of synthetic deepfakes, bypassing cosine threshold filters, or reverse-engineering offline IndexedDB audit records is strictly prohibited and constitutes an immediate violation of institutional agreement.
                </p>
              </section>

              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>SECTION 3</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Hardware & Camera Station Operations
                </h2>
                <p>
                  Operators deploying kiosk capture stations or mobile scanning devices must position hardware conspicuously and respectfully at approved classroom checkpoints, ensuring student subjects are aware of active biometric verification sessions.
                </p>
              </section>

              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>SECTION 4</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Supervisory Authority & Attendance Corrections
                </h2>
                <p>
                  Verity biometric cosine matching provides automated administrative assistance. Final attendance determination and manual corrections remain under the supervision and discretion of certified academic faculty and tenant administrators.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition active:scale-[0.98] shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Login</span>
          </Link>

          <span className="text-xs text-slate-500 font-mono">
            © 2026 Verity Biometrics Platform
          </span>
        </div>
      </main>
    </div>
  );
}

export default LegalPage;
