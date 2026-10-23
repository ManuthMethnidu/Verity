import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SquaresFour,
  Camera,
  Users,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  ArrowSquareOut,
  Lock,
  FileDoc,
} from '@phosphor-icons/react';
import { LegalModal } from './LegalModal.jsx';

export function Footer({ footerRef }) {
  const [modalType, setModalType] = useState(null); // 'terms' | 'privacy' | null

  return (
    <>
      <footer ref={footerRef} className="mt-20 border-t border-[#222222] bg-[#111111]/95 backdrop-blur-md text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Col 1: Brand & Logo */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Verity"
                  className="w-9 h-9 object-contain"
                />
                <div>
                  <span className="font-extrabold text-base text-white tracking-wider">VERITY</span>
                  <span className="block text-xs text-emerald-400 font-medium">
                    Multi-Tenant Biometric Platform
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Autonomous, on-device facial recognition attendance management. Powered by TensorFlow.js,
                WebGL2 shaders, and offline-first IndexedDB biometrics for secure classroom verification.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/ManuthMethnidu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-sm group"
                >
                  <svg className="w-4 h-4 fill-current text-slate-400 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>Explore Developer Projects</span>
                  <ArrowSquareOut className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <h4 className="font-medium text-white text-xs mb-3">
                Navigation
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/dashboard" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                    <SquaresFour className="w-3.5 h-3.5 text-slate-500" />
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link to="/attendance" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>Live Attendance</span>
                  </Link>
                </li>
                <li>
                  <Link to="/roster" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Student Roster</span>
                  </Link>
                </li>
                <li>
                  <Link to="/reports" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attendance Logs</span>
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>System Settings</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Legal & Privacy */}
            <div>
              <h4 className="font-medium text-white text-xs mb-3">
                Trust & Governance
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button
                    onClick={() => setModalType('privacy')}
                    className="text-slate-400 hover:text-white transition text-left flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setModalType('terms')}
                    className="text-slate-400 hover:text-white transition text-left flex items-center gap-2"
                  >
                    <FileDoc className="w-3.5 h-3.5 text-slate-500" />
                    <span>Terms of Service</span>
                  </button>
                </li>
                <li className="pt-1">
                  <span className="text-emerald-400/90 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Biometric Encryption Active</span>
                  </span>
                </li>
                <li>
                  <span className="text-slate-500 text-xs block">FERPA & GDPR Compliant Standard</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © 2026 Verity Biometrics. Multi-Tenant Architecture. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setModalType('privacy')}
                className="hover:text-slate-300 transition"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                onClick={() => setModalType('terms')}
                className="hover:text-slate-300 transition"
              >
                Terms
              </button>
              <span>•</span>
              <a
                href="https://github.com/ManuthMethnidu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition"
              >
                GitHub @ManuthMethnidu
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Dialog for Terms or Privacy Policy */}
      <LegalModal
        isOpen={!!modalType}
        type={modalType}
        onClose={() => setModalType(null)}
      />
    </>
  );
}
