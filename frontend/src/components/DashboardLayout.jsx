import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Menu, Wifi, WifiOff, RefreshCw, Sparkles } from 'lucide-react';
import { getCurrentUser, isAuthenticated } from '../auth/auth.js';
import { getPendingCount, syncAttendanceQueue } from '../storage/attendanceStore.js';

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    const checkQueue = async () => {
      const count = await getPendingCount();
      setPendingSync(count);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      clearInterval(interval);
    };
  }, [navigate]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncAttendanceQueue();
      const count = await getPendingCount();
      setPendingSync(count);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Nav */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg lg:hidden hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-wide text-sm sm:text-base">
                {user?.tenantName || 'Classroom Portal'}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Tenant
              </span>
            </div>
          </div>

          {/* Right Header Status Controls */}
          <div className="flex items-center gap-3">
            {/* Online / Offline status badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {/* Offline sync queue badge */}
            {pendingSync > 0 && (
              <button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 rounded-full transition-colors disabled:opacity-50"
                title="Pending attendance logs stored in IndexedDB"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {pendingSync} Queued
                </span>
              </button>
            )}

            {/* Admin identity */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="truncate max-w-[150px]">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
