import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShieldCheck, FileDoc as FileCheck, Lock, ArrowSquareOut as ExternalLink } from '@phosphor-icons/react';

export function LegalModal({ isOpen, type, onClose }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !type) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        className="bg-[#161616] border border-[#282828] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden ring-1 ring-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#282828] bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              {isPrivacy ? <Lock className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="legal-modal-title" className="text-lg font-bold text-white tracking-tight">
                  {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  Verity Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Institutional Biometric & Attendance Governance Standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#222222] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs leading-relaxed text-slate-300">
          <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
            <span className="font-semibold text-emerald-400">
              Effective: October 20, 2026 • Version 1.2
            </span>
            <span className="text-slate-500">FERPA & GDPR Compliant</span>
          </div>

          {isPrivacy ? (
            <>
              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>1. On-Device Face Recognition & Privacy</span>
                </h5>
                <p>
                  Verity operates on an offline-first, on-device architecture. Facial features are mapped securely in-memory on the client device. Raw camera frames captured during attendance scanning are processed locally in temporary runtime memory and are <strong>never uploaded, archived, or transmitted</strong> to remote cloud vision endpoints.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>2. Purpose of Attendance Verification</span>
                </h5>
                <p>
                  Student face profiles and match data are utilized exclusively for verifying student presence and generating automated classroom attendance records for registered schools and institutions. Biometric data is strictly prohibited from being commercialized, monetized, sold to advertising networks, or repurposed for unapproved surveillance.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Local Encrypted Storage & Cloud Sync</span>
                </h5>
                <p>
                  Offline attendance queues and student face profiles reside in local browser storage protected by strict sandboxing. Synchronized data transmitted to the Verity institutional API utilizes TLS 1.3 encryption with strict school-level isolation.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>4. Student Rights, Revocation & Deletion</span>
                </h5>
                <p>
                  Enrolled students, parents, and authorized guardians retain the fundamental right to inspect, modify, or permanently purge their facial reference data and attendance history at any time through their school administrator.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>1. Acceptance of Terms</span>
                </h5>
                <p>
                  By registering an institution tenant or accessing the Verity Attendance System, administrative personnel, faculty, proctors, and authorized operators agree to comply with these Terms of Service and adhere to all applicable institutional academic integrity policies and privacy regulations.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>2. Authorized Classroom Use</span>
                </h5>
                <p>
                  This software is licensed solely for lawful educational attendance verification, classroom safety, and institutional administrative record-keeping. Any malicious attempts to circumvent match accuracy thresholds, inject synthetic video feeds, tamper with local audit trails, or disrupt verification pipelines are strictly forbidden and constitute a breach of service.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Camera Station & Operator Responsibility</span>
                </h5>
                <p>
                  Operators deploying kiosk capture stations or mobile scanning devices must position hardware conspicuously and respectfully at approved classroom checkpoints, ensuring student subjects are aware of active biometric verification sessions.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>4. Algorithmic Guidance & Verification Discretion</span>
                </h5>
                <p>
                  Verity automated face matching functions as an administrative tool. Final verification authority and attendance corrections remain under the supervision and discretion of certified academic faculty and school administrators.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#282828] bg-[#0d0d0d] flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            {isPrivacy ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // switch modal
                  setTimeout(() => {
                    const evt = new CustomEvent('verity:openLegal', { detail: { type: 'terms' } });
                    window.dispatchEvent(evt);
                  }, 50);
                }}
                className="text-emerald-400 hover:underline"
              >
                View Terms of Service
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    const evt = new CustomEvent('verity:openLegal', { detail: { type: 'privacy' } });
                    window.dispatchEvent(evt);
                  }, 50);
                }}
                className="text-emerald-400 hover:underline"
              >
                View Privacy Policy
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Link
              to={isPrivacy ? '/privacy' : '/terms'}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] text-slate-200 text-xs font-semibold transition border border-[#333333]"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition active:scale-[0.98] shadow-sm"
            >
              Close & Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegalModal;
