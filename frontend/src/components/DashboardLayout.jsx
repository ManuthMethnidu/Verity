import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  IconBrandTabler,
  IconCamera,
  IconUsers,
  IconFileAnalytics,
  IconSettings,
  IconArrowLeft,
} from '@tabler/icons-react';
import { Footer } from './Footer.jsx';
import { isAuthenticated, getCurrentUser, signOut } from '../auth/auth.js';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(getCurrentUser());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      setUser(e.detail || getCurrentUser());
    };
    window.addEventListener('verity:profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('verity:profileUpdated', handleProfileUpdate);
  }, []);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'A');
  const tenantName = user?.tenantName || "St. Joseph's College";

  const links = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <IconBrandTabler
          className={`h-5 w-5 shrink-0 transition-colors ${
            location.pathname === '/dashboard' || location.pathname === '/'
              ? 'text-emerald-400'
              : 'text-slate-400 group-hover/sidebar:text-white'
          }`}
        />
      ),
    },
    {
      label: 'Live Scanner',
      href: '/attendance',
      icon: (
        <IconCamera
          className={`h-5 w-5 shrink-0 transition-colors ${
            location.pathname === '/attendance'
              ? 'text-emerald-400'
              : 'text-slate-400 group-hover/sidebar:text-white'
          }`}
        />
      ),
    },
    {
      label: 'Student Roster',
      href: '/roster',
      icon: (
        <IconUsers
          className={`h-5 w-5 shrink-0 transition-colors ${
            location.pathname === '/roster'
              ? 'text-emerald-400'
              : 'text-slate-400 group-hover/sidebar:text-white'
          }`}
        />
      ),
    },
    {
      label: 'Attendance Reports',
      href: '/reports',
      icon: (
        <IconFileAnalytics
          className={`h-5 w-5 shrink-0 transition-colors ${
            location.pathname === '/reports'
              ? 'text-emerald-400'
              : 'text-slate-400 group-hover/sidebar:text-white'
          }`}
        />
      ),
    },
    {
      label: 'System Settings',
      href: '/settings',
      icon: (
        <IconSettings
          className={`h-5 w-5 shrink-0 transition-colors ${
            location.pathname === '/settings'
              ? 'text-emerald-400'
              : 'text-slate-400 group-hover/sidebar:text-white'
          }`}
        />
      ),
    },
    {
      label: 'Sign Out',
      href: '#',
      onClick: (e) => {
        e.preventDefault();
        signOut();
      },
      icon: (
        <IconArrowLeft className="h-5 w-5 shrink-0 text-red-400 group-hover/sidebar:text-red-300 transition-colors" />
      ),
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#111111] text-slate-100 font-sans">
      {/* Collapsible Animated Sidebar (Aceternity UI) */}
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {/* Unified Logo: Constant 36px icon box for rock-solid horizontal centering and alignment */}
            <div className="flex items-center h-9 group/sidebar overflow-hidden w-full">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Verity"
                  className="w-5 h-5 object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                />
              </div>
              <div
                className={cn(
                  "flex flex-col min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                  open
                    ? "opacity-100 max-w-[160px] translate-x-0 ml-2.5"
                    : "opacity-0 max-w-0 pointer-events-none ml-0"
                )}
              >
                <span className="font-black text-xs tracking-wider text-white leading-tight">
                  VERITY
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold truncate leading-tight">
                  {tenantName}
                </span>
              </div>
            </div>

            {/* Navigation links */}
            <div className="mt-5 flex flex-col gap-1.5">
              {links.map((link, idx) => {
                const isActive =
                  link.href === '/dashboard'
                    ? location.pathname === '/dashboard' || location.pathname === '/'
                    : location.pathname === link.href;

                return (
                  <SidebarLink
                    key={idx}
                    link={link}
                    onClick={(e) => {
                      if (link.onClick) {
                        link.onClick(e);
                      } else if (link.href && link.href !== '#') {
                        e.preventDefault();
                        navigate(link.href);
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "bg-emerald-500/15 text-white font-semibold border border-emerald-500/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* User Profile / Tenant Identity: Constant 36px avatar box for vertical alignment */}
          <div className="pt-2.5 border-t border-[#222222]">
            <SidebarLink
              link={{
                label: user?.name || user?.email || 'Institution Admin',
                href: '/settings',
                icon: user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.name || "Admin"}
                    className="w-6 h-6 rounded-full object-cover border border-emerald-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-[10px] uppercase shadow-sm shrink-0">
                    {userInitial}
                  </div>
                ),
              }}
              onClick={(e) => {
                e.preventDefault();
                navigate('/settings');
                setOpen(false);
              }}
              className="hover:bg-slate-800/60 transition-colors text-slate-300"
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Dashboard Panel */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-[#111111]">
        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
