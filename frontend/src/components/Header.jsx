import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  LogOut,
  Camera,
  Activity,
  User,
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { getCurrentUser, signOut } from '../auth/auth.js';
import { GooeyDropdown } from './ui/GooeyDropdown.tsx';

export function Header() {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'A';
  const tenantDisplayName = user?.tenantName || "St. Joseph's College Colombo 10";

  const userDropdownActions = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} strokeWidth={1.75} />,
      shortcut: 'D',
      detail: 'Metrics & attendance feed',
      onSelect: () => navigate('/dashboard'),
    },
    {
      id: 'scanner',
      label: 'Live Scanner',
      icon: <Camera size={18} strokeWidth={1.75} />,
      shortcut: 'S',
      detail: 'Edge face-recognition camera',
      onSelect: () => navigate('/attendance'),
    },
    {
      id: 'roster',
      label: 'Student Roster',
      icon: <Users size={18} strokeWidth={1.75} />,
      shortcut: 'R',
      detail: 'Manage 128-D face embeddings',
      onSelect: () => navigate('/roster'),
    },
    {
      id: 'reports',
      label: 'Attendance Logs',
      icon: <ClipboardList size={18} strokeWidth={1.75} />,
      shortcut: 'L',
      detail: 'Audit trail and export',
      onSelect: () => navigate('/reports'),
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: <Settings size={18} strokeWidth={1.75} />,
      shortcut: 'G',
      detail: 'Threshold & camera FPS',
      onSelect: () => navigate('/settings'),
    },
    {
      id: 'signout',
      label: 'Sign Out',
      icon: <LogOut size={18} strokeWidth={1.75} />,
      shortcut: 'Q',
      divider: true,
      destructive: true,
      onSelect: handleSignOut,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#111111]/90 backdrop-blur-md border-b border-[#222222] transition-colors">
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
              <span className="text-xs font-medium text-emerald-400 mt-0.5">
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

          {/* User Profile Pill & Gooey Dropdown */}
          <div className="flex items-center pl-2 border-l border-slate-800/80">
            <GooeyDropdown
              label={user?.email ? user.email.split('@')[0] : 'Account'}
              icon={
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">
                  {userInitial}
                </span>
              }
              actions={userDropdownActions}
              anchor="end"
              menuWidth={250}
              fill="#18181b"
              ink="#f8fafc"
              danger="#ef4444"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
