import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  FileText,
  Building2,
  Cpu,
  Zap,
} from 'lucide-react';
import { api, getCurrentUser } from '../auth/auth.js';
import { getLocalSettings } from '../storage/settingsStore.js';

export function Dashboard() {
  const user = getCurrentUser();
  const [report, setReport] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [repRes, localSettings] = await Promise.all([
          api.get('/attendance/report'),
          getLocalSettings(),
        ]);
        setReport(repRes.data);
        setSettings(localSettings);
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = report?.stats || {
    totalAttendanceEvents: 0,
    uniquePresent: 0,
    totalEnrolled: 0,
    attendanceRate: 0,
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Editorial Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-md shadow-xl ring-1 ring-white/[0.05]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-emerald-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <img
                src="/logo.png"
                alt="Verity Shield"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-[0_0_12px_rgba(16,185,129,0.18)] transition-transform duration-300 hover:scale-105"
              />
            </div>

            {/* School & System Name */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                VERITY
              </h1>
              <div className="flex flex-wrap items-center gap-2.5 mt-1">
                <span className="text-base sm:text-lg font-semibold text-emerald-400">
                  {user?.tenantName || "St. Joseph's College Colombo 10"}
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  <span>Edge Vision Active</span>
                </div>
                {user?.tenantId && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono border border-slate-700/80">
                    Tenant Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
                Autonomous real-time facial recognition and individual identity verification for modern classrooms.
              </p>
            </div>
          </div>

          {/* High-Contrast Quick Launch Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <Link
              to="/attendance"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all duration-200 active:scale-[0.98] shadow-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Live Scanner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/roster"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all duration-200"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Student Roster</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enrolled Students */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center justify-between shadow-sm hover:border-slate-700/80 transition-all duration-200">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Enrolled Students
            </div>
            <div className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
              {stats.totalEnrolled}
            </div>
            <div className="text-xs text-slate-500 mt-1">Active Roster Database</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Present Today */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center justify-between shadow-sm hover:border-slate-700/80 transition-all duration-200">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Verified Today
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1 font-mono tracking-tight">
              {stats.uniquePresent}
            </div>
            <div className="text-xs text-slate-500 mt-1">Unique Attendees</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center justify-between shadow-sm hover:border-slate-700/80 transition-all duration-200">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Attendance Rate
            </div>
            <div className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
              {stats.attendanceRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Classroom Turnout</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Performance Mode */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center justify-between shadow-sm hover:border-slate-700/80 transition-all duration-200">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Target FPS & Quality
            </div>
            <div className="text-lg font-bold text-white mt-1 capitalize truncate max-w-[150px] font-mono">
              {settings?.targetFps || 30} FPS • {settings?.modelQuality || 'Medium'}
            </div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <Zap className="w-3 h-3" />
              <span>{settings?.batterySaver ? 'Battery Saver Active' : 'Optimal Performance'}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Verifications Feed */}
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Today's Verification Activity
              </h2>
              <p className="text-xs text-slate-400">Live biometric recognition log stream</p>
            </div>
          </div>
          <Link
            to="/reports"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition"
          >
            <span>View Full Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {report?.records?.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {report.records.slice(0, 5).map((rec) => (
              <div key={rec.id} className="py-3.5 flex items-center justify-between transition hover:bg-slate-800/20 px-2 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {rec.imageUrl ? (
                      <img
                        src={rec.imageUrl}
                        alt={rec.studentName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{rec.studentName}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      ID: {rec.studentCode || 'N/A'} • Device: {rec.deviceId}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {rec.confidence ? `${(rec.confidence * 100).toFixed(1)}% Match` : 'Verified'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {new Date(rec.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <p>No attendance records logged yet today.</p>
            <Link
              to="/attendance"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>Launch scanner to begin session</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
