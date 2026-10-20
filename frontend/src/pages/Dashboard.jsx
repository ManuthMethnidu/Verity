import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Camera,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
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
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Face Recognition Enabled</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.tenantName || "St. Joseph's College Colombo 10"}
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            TensorFlow.js deep neural vision pipeline is active for real-time edge attendance
            verification. Real individual 128-D facial biometrics are evaluated on-device and synchronized
            reliably.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-lg shadow-emerald-500/20"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Live Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/roster"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Users className="w-4 h-4" />
              <span>Manage Student Roster</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enrolled Students */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Enrolled Students
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.totalEnrolled}
            </div>
            <div className="text-xs text-slate-500 mt-1">Roster database</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Present Today */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Verified Today
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats.uniquePresent}
            </div>
            <div className="text-xs text-slate-500 mt-1">Unique attendees</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Attendance Rate
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.attendanceRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Classroom turnout</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Performance Mode */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Model & Target FPS
            </div>
            <div className="text-xl font-bold text-white mt-1 capitalize">
              {settings?.targetFps || 30} FPS • {settings?.modelQuality || 'Medium'}
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              {settings?.batterySaver ? '🔋 Battery Saver ON' : '⚡ Full Performance'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Verifications Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-wide">
            Today's Verification Activity
          </h2>
          <Link
            to="/reports"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {report?.records?.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {report.records.slice(0, 5).map((rec) => (
              <div key={rec.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
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
