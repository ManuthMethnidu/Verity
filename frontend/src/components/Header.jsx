import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  LogOut,
  Camera,
  Activity,
  User,
} from 'lucide-react';
import { getCurrentUser, signOut } from '../auth/auth.js';

export function Header() {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'A';
  const tenantDisplayName = user?.tenantName || "St. Joseph's College Colombo 10";

  return (
    <header className="sticky top-0 z-40 w-full bg-[#090d16]/85 backdrop-blur-md border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Institution Info */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative flex-shrink-0">
              <img
                src="/logo.png"
                alt="Verity"
                className="w-8 h-8 object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-white tracking-wider leading-none">
                VERITY
              </span>
              <span className="text-xs font-semibold text-emerald-400 tracking-wide mt-0.5 uppercase">
                Biometric Platform
              </span>
            </div>
          </Link>

          {/* Tenant Divider & Badge */}
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800/80">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-300 max-w-[200px] truncate" title={tenantDisplayName}>
              {tenantDisplayName}
            </span>
          </div>
        </div>

        {/* Right: Engine Telemetry Status & User Controls */}
        <div className="flex items-center gap-3">
          {/* Live Edge Vision Active Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden md:inline font-mono">Edge Vision Active</span>
            <span className="md:hidden font-mono">Active</span>
          </div>

          {/* Quick Scanner Action */}
          <Link
            to="/attendance"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold transition"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Scanner</span>
          </Link>

          {/* User Profile Pill & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800/80">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200 leading-none">
                {user?.email || 'Administrator'}
              </span>
              <span className="text-xs text-slate-400 font-mono mt-0.5">
                {user?.role || 'Institution Admin'}
              </span>
            </div>

            <div
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-bold text-emerald-400"
              title={user?.email || 'Administrator'}
            >
              {userInitial}
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
