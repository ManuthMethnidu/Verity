import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Grid,
  BarXAxis,
  ChartTooltip,
} from '@/components/charts';
import {
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  RefreshCw,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../auth/auth.js';

export function AttendanceChart({
  records: propRecords,
  title = 'Biometric Attendance Trends',
  subtitle = 'Verified student attendance volume across timeline and class sessions',
  aspectRatio = '2.4 / 1',
  className = '',
}) {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'hourly'
  const [feedData, setFeedData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/feed');
      setFeedData(res.data);
    } catch (err) {
      console.warn('Could not fetch attendance feed for chart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Process timeline or hourly breakdown
  const chartData = useMemo(() => {
    if (viewMode === 'hourly') {
      // Aggregate attendance events by hour
      // Use either propRecords or feedData.recentLogs
      const events = propRecords || feedData?.recentLogs || [];
      const hourCounts = {};

      // Initialize classroom business hours (8 AM - 4 PM)
      const standardHours = [8, 9, 10, 11, 12, 13, 14, 15, 16];
      standardHours.forEach((h) => {
        const hourStr = h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        hourCounts[hourStr] = 0;
      });

      events.forEach((ev) => {
        if (!ev.timestamp) return;
        const d = new Date(ev.timestamp);
        const h = d.getHours();
        const hourStr = h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        hourCounts[hourStr] = (hourCounts[hourStr] || 0) + 1;
      });

      return Object.entries(hourCounts).map(([hour, count]) => ({
        label: hour,
        attendees: count,
      }));
    }

    // Daily View: Aggregate from feed timeline or compute from logs
    if (feedData?.timeline && feedData.timeline.length > 0) {
      return feedData.timeline.map((item) => {
        // Format YYYY-MM-DD to friendly label e.g. "Oct 21"
        let displayLabel = item.date;
        try {
          const parts = item.date.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            displayLabel = d.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
          }
        } catch {
          displayLabel = item.date;
        }
        return {
          label: displayLabel,
          attendees: item.count,
        };
      });
    }

    // Fallback: Generate the last 7 calendar days
    const fallbackDays = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      // Check if today matches any records
      const isToday = i === 0;
      const count = isToday && propRecords?.length ? propRecords.length : 0;
      fallbackDays.push({
        label,
        attendees: count,
      });
    }
    return fallbackDays;
  }, [viewMode, feedData, propRecords]);

  const totalAttendees = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + (curr.attendees || 0), 0);
  }, [chartData]);

  const peakPeriod = useMemo(() => {
    if (!chartData || chartData.length === 0) return { label: 'None', attendees: 0 };
    return chartData.reduce((max, item) => (item.attendees > max.attendees ? item : max), chartData[0]);
  }, [chartData]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 backdrop-blur-md shadow-xl ring-1 ring-white/[0.05] ${className}`}
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-1/4 -mt-12 w-64 h-64 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {title}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                Bklit Chart
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'daily'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hourly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'hourly'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today's Hours</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchFeed}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
            title="Refresh Chart Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Total Check-Ins</div>
            <div className="text-lg font-bold text-white font-mono">{totalAttendees}</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Peak Attendance</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {peakPeriod.attendees}{' '}
              <span className="text-xs font-sans text-slate-400 font-normal">
                ({peakPeriod.label})
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Active View</div>
            <div className="text-sm font-bold text-white capitalize">
              {viewMode === 'daily' ? 'Daily Timeline' : 'Today by Class Hour'}
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="relative w-full rounded-xl bg-slate-950/50 border border-slate-800/70 p-2 sm:p-4 overflow-hidden">
        <BarChart
          data={chartData}
          xDataKey="label"
          aspectRatio={aspectRatio}
          margin={{ top: 25, right: 25, bottom: 35, left: 25 }}
          className="w-full text-white"
        >
          <Grid
            horizontal={true}
            vertical={false}
            stroke="rgba(255, 255, 255, 0.08)"
            numTicksRows={4}
          />
          <Bar
            dataKey="attendees"
            fill="#10b981"
            lineCap="round"
            showValue={true}
            valueLabelColor="#34d399"
          />
          <BarXAxis />
          <ChartTooltip
            showDatePill={false}
            rows={(point) => [
              {
                label: 'Verified Attendees',
                value: point.attendees,
                color: '#10b981',
              },
            ]}
          />
        </BarChart>
      </div>
    </div>
  );
}

export default AttendanceChart;
