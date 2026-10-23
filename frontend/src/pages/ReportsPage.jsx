import React, { useState, useEffect } from 'react';
import {
  ClipboardText as ClipboardList,
  Calendar,
  DownloadSimple as Download,
  ArrowClockwise as RefreshCw,
  Users,
  CheckCircle as CheckCircle2,
  TrendUp as TrendingUp,
  Archive,
  Printer,
  FileCsv as FileSpreadsheet,
} from '@phosphor-icons/react';
import { api } from '../auth/auth.js';
import { AttendanceChart } from '../components/AttendanceChart.jsx';
import { GooeyDropdown } from '../components/ui/GooeyDropdown.tsx';

export function ReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (targetDate = date) => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/report?date=${targetDate}`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(date);
  }, [date]);

  const exportCSV = () => {
    if (!report || !report.records || report.records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = ['Record ID', 'Student ID Code', 'Student Name', 'Timestamp', 'Scanner Station', 'Match Accuracy'];
    const rows = report.records.map((r) => [
      r.id,
      r.studentCode || '',
      `"${r.studentName}"`,
      new Date(r.timestamp).toISOString(),
      r.deviceId?.replace('DEVICE-CAM-', 'Station ') || r.deviceId,
      r.confidence ? (r.confidence * 100).toFixed(1) + '%' : 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!report || !report.records || report.records.length === 0) {
      alert('No records available to export.');
      return;
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const reportDropdownActions = [
    {
      id: 'export-csv',
      label: 'Export CSV Spreadsheet',
      icon: <FileSpreadsheet size={18} strokeWidth={1.75} />,
      detail: 'Standard audit CSV format',
      onSelect: exportCSV,
    },
    {
      id: 'export-json',
      label: 'Export JSON Payload',
      icon: <Archive size={18} strokeWidth={1.75} />,
      detail: 'Full structured JSON record array',
      onSelect: exportJSON,
    },
    {
      id: 'refresh',
      label: 'Refresh Report Feed',
      icon: <RefreshCw size={18} strokeWidth={1.75} />,
      detail: 'Re-fetch latest verified attendance',
      onSelect: () => fetchReport(date),
    },
    {
      id: 'print',
      label: 'Print / Save PDF',
      icon: <Printer size={18} strokeWidth={1.75} />,
      detail: 'Opens browser print dialog',
      onSelect: () => window.print(),
    },
    {
      id: 'today',
      label: "Jump to Today's Date",
      icon: <Calendar size={18} strokeWidth={1.75} />,
      detail: 'Reset date filter to current day',
      divider: true,
      destructive: true,
      onSelect: () => setDate(new Date().toISOString().split('T')[0]),
    },
  ];

  const stats = report?.stats || {
    totalAttendanceEvents: 0,
    uniquePresent: 0,
    totalEnrolled: 0,
    attendanceRate: 0,
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
            <span>Attendance Logs & Reports</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verified attendance records, check-in stations, and match accuracy scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#181818] border border-[#282828] rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-full text-xs transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <GooeyDropdown
            label="Report Actions"
            actions={reportDropdownActions}
            anchor="end"
            menuWidth={260}
            fill="#181818"
            ink="#f8fafc"
            danger="#ef4444"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#181818]/90 border border-[#282828] backdrop-blur-sm flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Total Logged Events
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
              {stats.totalAttendanceEvents}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818]/90 border border-[#282828] backdrop-blur-sm flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Unique Attendees
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1 font-mono tracking-tight">
              {stats.uniquePresent} <span className="text-sm font-sans text-slate-400 font-normal">/ {stats.totalEnrolled}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818]/90 border border-[#282828] backdrop-blur-sm flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-slate-400">
              Attendance Turnout
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
              {stats.attendanceRate.toFixed(1)}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Attendance Activity Chart (Bklit UI) */}
      <AttendanceChart
        records={report?.records}
        title={`Attendance Analytics — ${date}`}
        subtitle="Distribution of check-in events and timeline attendance volume"
      />

      {/* Report Records Table */}
      <div className="bg-[#181818]/90 border border-[#282828] backdrop-blur-md rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0d0d0d] text-xs font-medium text-slate-400 border-b border-[#282828]">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Student ID Code</th>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Scanner Station</th>
                <th className="px-6 py-3.5 text-right">Match Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242424]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    Loading attendance report...
                  </td>
                </tr>
              ) : !report?.records || report.records.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    No attendance records for {date}.
                  </td>
                </tr>
              ) : (
                report.records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      {r.studentName}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-mono text-xs">
                      {r.studentCode || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                      {new Date(r.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                      {r.deviceId?.replace('DEVICE-CAM-', 'Station ') || r.deviceId}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        {r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : 'Verified'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
