import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Camera,
  Settings,
  ClipboardList,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { signOut, getCurrentUser } from '../auth/auth.js';

export function Sidebar({ mobileOpen, onClose }) {
  const user = getCurrentUser();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'Live Attendance', icon: Camera },
    { to: '/roster', label: 'Student Roster', icon: Users },
    { to: '/reports', label: 'Attendance Logs', icon: ClipboardList },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-wide">VERITY</span>
            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Attendance System
            </span>
          </div>
        </div>

        {/* Tenant Info */}
        <div className="px-6 py-4 mx-3 my-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Active Tenant
          </div>
          <div className="text-sm font-medium text-slate-200 truncate mt-0.5">
            {user?.tenantName || 'Default Tenant'}
          </div>
          <div className="text-xs text-slate-400 truncate mt-0.5">
            {user?.email || 'admin@verity.edu'}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Actions / Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-slate-300 hover:text-red-400 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
