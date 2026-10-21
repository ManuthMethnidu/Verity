import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PixelCamera,
  PixelUsers,
  PixelClock,
  PixelReports,
} from '../components/PixelIcon.jsx';
import { ArrowRight, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Brand Header Banner with Logo & School Name */}
      <div className="relative overflow-hidden rounded-2xl bg-[#181322]/90 border border-[#2e263d] p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Logo (Transparent) */}
            <div className="relative flex-shrink-0">
              <img
                src="/logo.png"
                alt="Verity Shield"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.18)] transition-transform duration-300 hover:scale-105"
              />
            </div>

            {/* School & System Name */}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-1.5 font-sans">
                <Sparkles className="w-3 h-3" />
                <span>TensorFlow.js Edge Vision Active</span>
              </div>
              {/* Title strictly using Viaoda Libre */}
              <h1 className="text-3xl sm:text-5xl font-normal text-white tracking-wider font-title">
                VERITY
              </h1>
              <h2 className="text-base sm:text-lg font-medium text-emerald-400 mt-0.5 font-sans">
                {user?.tenantName || "St. Joseph's College Colombo 10"}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed font-sans">
                Autonomous real-time facial recognition and individual identity verification for classrooms.
              </p>
            </div>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <Link
              to="/attendance"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
            >
              <PixelCamera className="w-4 h-4" />
              <span>Launch Live Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/roster"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-[#221b30] hover:bg-[#2c233e] text-slate-200 border border-[#362b4c] transition"
            >
              <PixelUsers className="w-4 h-4 text-emerald-400" />
              <span>Student Roster</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enrolled Students */}
        <div className="p-5 rounded-2xl bg-[#181322]/80 border border-[#2e263d] flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Enrolled Students
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.totalEnrolled}
            </div>
            <div className="text-xs text-slate-500 mt-1">Active Roster Database</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <PixelUsers className="w-6 h-6" />
          </div>
        </div>

        {/* Present Today */}
        <div className="p-5 rounded-2xl bg-[#181322]/80 border border-[#2e263d] flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Verified Today
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats.uniquePresent}
            </div>
            <div className="text-xs text-slate-500 mt-1">Unique Attendees</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="p-5 rounded-2xl bg-[#181322]/80 border border-[#2e263d] flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Attendance Rate
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.attendanceRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Classroom Turnout</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Performance Mode */}
        <div className="p-5 rounded-2xl bg-[#181322]/80 border border-[#2e263d] flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Model & Target FPS
            </div>
            <div className="text-lg font-bold text-white mt-1 capitalize truncate max-w-[150px]">
              {settings?.targetFps || 30} FPS • {settings?.modelQuality || 'Medium'}
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              {settings?.batterySaver ? '🔋 Battery Saver ON' : '⚡ Full Performance'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <PixelClock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Verifications Feed */}
      <div className="bg-[#181322]/80 border border-[#2e263d] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PixelReports className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Today's Verification Activity
            </h2>
          </div>
          <Link
            to="/reports"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            <span>View All Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {report?.records?.length > 0 ? (
          <div className="divide-y divide-[#262033]">
            {report.records.slice(0, 5).map((rec) => (
              <div key={rec.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#221b30] border border-[#362b4c] overflow-hidden flex items-center justify-center">
                    {rec.imageUrl ? (
                      <img
                        src={rec.imageUrl}
                        alt={rec.studentName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PixelUsers className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{rec.studentName}</div>
                    <div className="text-xs text-slate-400">
                      ID: {rec.studentCode || 'N/A'} • Device: {rec.deviceId}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {rec.confidence ? `${(rec.confidence * 100).toFixed(1)}% Match` : 'Verified'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(rec.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500 text-sm">
            No attendance records logged yet today. Launch the live scanner to begin!
          </div>
        )}
      </div>
    </div>
  );
}
