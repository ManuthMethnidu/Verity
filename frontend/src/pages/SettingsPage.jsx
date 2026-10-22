import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Battery,
  Cpu,
  Save,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  LogOut,
  Sparkles,
  User,
  Camera,
  Upload,
  Trash2,
  Volume2,
  VolumeX,
  Download,
  Database,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Building,
  KeyRound,
  HardDrive,
  FileDown,
  Layers,
  HelpCircle,
  X,
  UserCheck,
} from 'lucide-react';
import WakeSlider from '../components/WakeSlider.jsx';
import { getLocalSettings, saveSettings } from '../storage/settingsStore.js';
import { clearLocalDatabase } from '../storage/db.js';
import { api, signOut, getCurrentUser, updateCurrentUser } from '../auth/auth.js';

const PRESET_AVATARS = [
  {
    id: 'admin1',
    label: 'Academic Director',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    id: 'admin2',
    label: 'Faculty Lead',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    id: 'admin3',
    label: 'Campus Dean',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    id: 'admin4',
    label: 'System Engineer',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
  },
];

export function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const fileInputRef = useRef(null);

  // Profile states
  const [adminName, setAdminName] = useState(currentUser?.name || '');
  const [tenantName, setTenantName] = useState(currentUser?.tenantName || "St. Joseph's College");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Vision Engine states
  const [targetFps, setTargetFps] = useState(30);
  const [modelQuality, setModelQuality] = useState('medium');
  const [batterySaver, setBatterySaver] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.70);
  const [savingVision, setSavingVision] = useState(false);

  // Sound & Device preferences
  const [soundChime, setSoundChime] = useState(() => {
    return localStorage.getItem('verity_sound_chime') !== 'false';
  });
  const [cameraMirrored, setCameraMirrored] = useState(() => {
    return localStorage.getItem('verity_camera_mirrored') !== 'false';
  });
  const [deviceId, setDeviceId] = useState(() => {
    return localStorage.getItem('verity_device_id') || `Station-${Math.floor(Math.random() * 90 + 10)}`;
  });
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  // Operational states
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Reset Modal states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState('attendance'); // 'attendance' | 'full'
  const [confirmInput, setConfirmInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const prefs = await getLocalSettings();
      setTargetFps(prefs.targetFps || 30);
      setModelQuality(prefs.modelQuality || 'medium');
      setBatterySaver(Boolean(prefs.batterySaver));
      setConfidenceThreshold(prefs.confidenceThreshold || 0.70);
      setLoading(false);
    }
    load();
  }, []);

  // Listen for external profile updates
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const user = e.detail || getCurrentUser();
      setCurrentUser(user);
      if (user?.name) setAdminName(user.name);
      if (user?.tenantName) setTenantName(user.tenantName);
      if (user?.avatarUrl !== undefined) setAvatarUrl(user.avatarUrl);
    };
    window.addEventListener('verity:profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('verity:profileUpdated', handleProfileUpdate);
  }, []);

  // Play synthetic tone using browser Web Audio API
  const playTestChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch (err) {
      console.warn('Audio playback not supported:', err);
    }
  };

  const handleSoundToggle = (enabled) => {
    setSoundChime(enabled);
    localStorage.setItem('verity_sound_chime', String(enabled));
    if (enabled) {
      playTestChime();
    }
  };

  const handleMirrorToggle = (enabled) => {
    setCameraMirrored(enabled);
    localStorage.setItem('verity_camera_mirrored', String(enabled));
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopiedDeviceId(true);
    setTimeout(() => setCopiedDeviceId(false), 2000);
  };

  const handleRegenerateDeviceId = () => {
    const newId = `Station-${Math.floor(Math.random() * 90 + 10)}`;
    setDeviceId(newId);
    localStorage.setItem('verity_device_id', newId);
    setNotification({
      type: 'success',
      message: `Generated new scanner station name: ${newId}`,
    });
  };

  // Image Upload with Canvas square compression
  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({
        type: 'error',
        message: 'Please upload a valid image file (JPG, PNG, WebP).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(compressedUrl);
        setNotification({
          type: 'success',
          message: 'Avatar ready. Click "Save Profile Changes" to persist.',
        });
      };
      img.src = loadEvt.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setNotification(null);

    try {
      await api.put('/auth/profile', {
        name: adminName.trim(),
        tenantName: tenantName.trim(),
        avatarUrl: avatarUrl || '',
      });

      updateCurrentUser({
        name: adminName.trim(),
        tenantName: tenantName.trim(),
        avatarUrl: avatarUrl || '',
      });

      setNotification({
        type: 'success',
        message: 'Administrator profile and institution identity updated successfully!',
      });
    } catch (err) {
      console.error('Profile update failed:', err);
      setNotification({
        type: 'error',
        message: 'Failed to update profile: ' + (err.response?.data?.error || err.message),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Vision Engine Settings
  const handleSaveVision = async (e) => {
    e.preventDefault();
    setSavingVision(true);
    setNotification(null);

    try {
      const result = await saveSettings({
        targetFps,
        modelQuality,
        batterySaver,
        confidenceThreshold,
      });

      setNotification({
        type: 'success',
        message: result.synced === false
          ? 'Preferences saved to offline storage. Will sync to server when connection resumes.'
          : 'Scanner settings saved and synchronized with server!',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to save scanner settings.',
      });
    } finally {
      setSavingVision(false);
    }
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    setExporting(true);
    setNotification(null);
    try {
      const rosterRes = await api.get('/roster');
      const students = rosterRes.data || [];

      let attendanceLogs = [];
      try {
        const feedRes = await api.get(`/attendance/feed/${currentUser?.tenantId || ''}`);
        attendanceLogs = feedRes.data?.recentLogs || feedRes.data?.rawLogs || [];
      } catch {
        const reportRes = await api.get('/attendance/report');
        attendanceLogs = reportRes.data?.records || [];
      }

      const backup = {
        app: 'Verity Attendance Platform',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        institution: {
          tenantId: currentUser?.tenantId,
          tenantName: tenantName || currentUser?.tenantName,
          adminEmail: currentUser?.email,
          adminName: adminName || currentUser?.name,
        },
        stats: {
          totalStudents: students.length,
          totalAttendanceLogs: attendanceLogs.length,
        },
        students,
        attendance: attendanceLogs,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `verity-backup-${(tenantName || 'institution')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        message: `Backup exported successfully (${students.length} students, ${attendanceLogs.length} attendance events).`,
      });
    } catch (err) {
      console.error('Export backup error:', err);
      setNotification({
        type: 'error',
        message: 'Export failed: ' + (err.message || 'Network error'),
      });
    } finally {
      setExporting(false);
    }
  };

  // Clear Local Offline Cache
  const handleClearCache = async () => {
    try {
      await clearLocalDatabase();
      setNotification({
        type: 'success',
        message: 'Local IndexedDB cache cleared! Roster and queued attendance will re-sync cleanly.',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to clear local cache: ' + err.message,
      });
    }
  };

  // Handle Confirmed Reset
  const handleExecuteReset = async () => {
    if (confirmInput.trim() !== 'RESET') return;
    setResetLoading(true);

    try {
      if (resetMode === 'attendance') {
        const res = await api.delete('/attendance/purge');
        setNotification({
          type: 'success',
          message: res.data?.message || 'Attendance event history has been completely purged.',
        });
      } else if (resetMode === 'full') {
        const res = await api.delete('/roster/purge/all');
        await clearLocalDatabase();
        setNotification({
          type: 'success',
          message: res.data?.message || 'Full database reset complete! Student roster and attendance logs have been wiped.',
        });
      }
      setResetModalOpen(false);
      setConfirmInput('');
    } catch (err) {
      console.error('Reset database failed:', err);
      setNotification({
        type: 'error',
        message: 'Database reset failed: ' + (err.response?.data?.error || err.message),
      });
    } finally {
      setResetLoading(false);
    }
  };

  const userInitial = adminName
    ? adminName.charAt(0).toUpperCase()
    : currentUser?.email
    ? currentUser.email.charAt(0).toUpperCase()
    : 'A';

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-sans flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        <span>Loading system preferences...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System & Institution Settings</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure administrator profile, face recognition accuracy, sound feedback, and data backups.
            </p>
          </div>
        </div>

        {/* Live Status Tag */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Engine: <strong className="text-white">Active</strong></span>
        </div>
      </div>

      {/* Global Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-medium transition-all shadow-lg backdrop-blur-md ${
            notification.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: ADMINISTRATOR PROFILE & INSTITUTION IDENTITY
          ========================================================================= */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base tracking-tight">Administrator Profile & Institution Identity</h2>
            <p className="text-xs text-slate-400">
              Customize your administrative avatar, name, and institution header displayed across dashboards.
            </p>
          </div>
        </div>

        {/* Avatar Selection & Upload */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Profile Avatar Picture
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Current Avatar Preview */}
            <div className="relative group shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={adminName || 'Admin'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md ring-4 ring-emerald-500/10"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-300 font-extrabold text-2xl uppercase shadow-md">
                  {userInitial}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 w-full">
              {/* Upload Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-[0.98]"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload Photo</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition active:scale-[0.98]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {/* Preset Avatars */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-2 font-medium">Or select an administrative preset:</span>
                <div className="flex items-center gap-2.5">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        title={preset.label}
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`relative rounded-xl p-0.5 transition-all ${
                          isSelected
                            ? 'ring-2 ring-emerald-400 scale-105 shadow-sm'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Fields: Name, Institution, Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Administrator Display Name</span>
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g. Dr. Alistair Vance"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>Institution / School Name</span>
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="e.g. St. Joseph's College"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Account Info (Read-Only) */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authenticated as <strong className="text-slate-200">{currentUser?.email || 'admin@verity.edu'}</strong></span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-bold">
            Tenant ID: {currentUser?.tenantId?.slice(0, 8)}...
          </span>
        </div>

        {/* Save Profile Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition active:scale-[0.98] shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>

      {/* =========================================================================
          SECTION 2: AUDIO, SCANNER DISPLAY & HARDWARE ID
          ========================================================================= */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base tracking-tight">Audio Feedback & Kiosk Camera Preferences</h2>
            <p className="text-xs text-slate-400">
              Configure attendance confirmation chime audio, camera mirroring, and hardware device registration.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sound Chime Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                {soundChime ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </div>
              <div>
                <span className="font-bold text-sm text-white block">Attendance Audio Chime</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Plays a subtle 2-tone harmonic confirmation when a student's face is successfully matched.
                </p>
                <button
                  type="button"
                  onClick={playTestChime}
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Test Chime Sound</span>
                </button>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={soundChime}
                onChange={(e) => handleSoundToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Camera Mirroring Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-white block">Kiosk Camera Mirroring</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mirrors scanner video horizontally so front-facing tablets feel natural like a mirror.
                </p>
                <span className="text-[11px] font-mono text-slate-500 block mt-1">
                  Default: Mirrored (Front Camera)
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={cameraMirrored}
                onChange={(e) => handleMirrorToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Hardware Kiosk Identifier */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-xs font-semibold text-slate-300 block">Scanner Station Name</span>
              <span className="text-xs font-mono text-emerald-400">{deviceId}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDeviceId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              {copiedDeviceId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDeviceId ? 'Copied' : 'Copy Name'}</span>
            </button>
            <button
              type="button"
              onClick={handleRegenerateDeviceId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: FACE RECOGNITION & ACCURACY
          ========================================================================= */}
      <form onSubmit={handleSaveVision} className="space-y-6">
        {/* Match Accuracy Threshold with WakeSlider */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white text-base tracking-tight">Recognition Accuracy Threshold</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Minimum match confidence required to automatically record student attendance.
              </p>
            </div>
            <div className="text-lg font-mono font-bold text-emerald-400 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              {(confidenceThreshold * 100).toFixed(0)}%
            </div>
          </div>

          {/* WakeSlider Integration */}
          <div className="py-2">
            <WakeSlider
              min={50}
              max={95}
              step={1}
              value={Math.round(confidenceThreshold * 100)}
              onChange={(val) => setConfidenceThreshold(val / 100)}
              bars={32}
              height={52}
              restHeight={14}
              gap={4}
              fillColor="#10b981"
              trackColor="#1e293b"
              crestColor="#34d399"
              showValue={false}
              ariaLabel="Recognition Accuracy Threshold"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
            <span>50% (Flexible)</span>
            <span className="text-emerald-400 font-semibold">70% (Recommended)</span>
            <span>95% (High Accuracy)</span>
          </div>
        </div>

        {/* Battery Saver Mode */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05]">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                <Battery className="w-5 h-5" />
              </div>
              <div>
                <label
                  htmlFor="battery-saver"
                  className="font-bold text-base text-white cursor-pointer select-none tracking-tight"
                >
                  Battery Saver Override
                </label>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Forces target FPS to 30 and disables high-drain 60 FPS mode. Ideal for portable
                  tablets and low-powered mobile devices running continuous attendance capture.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                id="battery-saver"
                type="checkbox"
                checked={batterySaver}
                onChange={(e) => {
                  const val = e.target.checked;
                  setBatterySaver(val);
                  if (val && targetFps > 30) setTargetFps(30);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Target FPS */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight">Target Camera Frame Rate (FPS)</h2>
              <p className="text-xs text-slate-400">
                Negotiates frame-budget frequency for the <code>requestVideoFrameCallback</code> loop.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[15, 30, 60].map((fps) => {
              const isDisabled = batterySaver && fps === 60;
              const isSelected = targetFps === fps;

              return (
                <button
                  type="button"
                  key={fps}
                  disabled={isDisabled}
                  onClick={() => setTargetFps(fps)}
                  className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold shadow-sm'
                      : isDisabled
                      ? 'bg-slate-950/40 border-slate-800/40 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-xl font-extrabold font-mono">{fps} FPS</span>
                  <span className="text-xs font-medium text-slate-400">
                    {fps === 15 ? 'Economy (Low Latency)' : fps === 30 ? 'Balanced (Standard)' : 'Ultra-Smooth (High CPU)'}
                  </span>
                  {isDisabled && (
                    <span className="text-xs text-amber-500 font-semibold mt-1">
                      Disabled by Battery Saver
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Quality Selection */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight">Model Quality & Vision Architecture</h2>
              <p className="text-xs text-slate-400">
                Configures BlazeFace detector size and WebGL/WASM-SIMD delegates.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'low',
                title: 'Low (BlazeFace-tiny)',
                desc: 'Ultralight weight, maximum frame-rate on older smartphones or Chromebooks.',
              },
              {
                id: 'medium',
                title: 'Medium (BlazeFace-short-range)',
                desc: 'Recommended default. High stability evaluator precision with balanced energy draw.',
              },
              {
                id: 'high',
                title: 'High (BlazeFace-full)',
                desc: 'Full-range multi-scale face anchor density for large classroom angles.',
              },
            ].map((option) => (
              <label
                key={option.id}
                onClick={() => setModelQuality(option.id)}
                className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                  modelQuality === option.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="modelQuality"
                  value={option.id}
                  checked={modelQuality === option.id}
                  onChange={() => setModelQuality(option.id)}
                  className="mt-1 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-sm text-white">{option.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{option.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save Vision Preferences Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingVision}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{savingVision ? 'Saving...' : 'Save Scanner Settings'}</span>
          </button>
        </div>
      </form>

      {/* =========================================================================
          SECTION 4: DATA BACKUP, EXPORT & OFFLINE CACHE
          ========================================================================= */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05] space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base tracking-tight">Data Management & Offline Cache</h2>
            <p className="text-xs text-slate-400">
              Download comprehensive institutional data exports and maintain offline data integrity.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export JSON Backup */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mb-1">
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Export Full Backup (JSON)</span>
              </div>
              <p className="text-xs text-slate-400">
                Exports all enrolled student face profiles and logged attendance events into a backup JSON file.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-[0.98]"
            >
              {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{exporting ? 'Generating Backup...' : 'Download JSON Backup'}</span>
            </button>
          </div>

          {/* Clear Offline IndexedDB Cache */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mb-1">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span>Clear Local Device Cache</span>
              </div>
              <p className="text-xs text-slate-400">
                Wipes IndexedDB stores on this browser. Server records remain intact and will cleanly re-download on next scanner launch.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Clear Local IndexedDB Cache</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: DANGER ZONE - DATABASE RESET OPTIONS
          ========================================================================= */}
      <div className="p-6 rounded-2xl bg-red-950/10 border border-red-500/25 backdrop-blur-md shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-red-300 text-base tracking-tight">Danger Zone & Database Reset</h2>
            <p className="text-xs text-red-400/80">
              Irreversible destructive operations. Requires explicit typed safety confirmation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: Purge Attendance Only */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-red-500/20 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mb-1">
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Purge Attendance Logs Only</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clears all recorded verification logs and time-stamped events for this institution. <strong>Enrolled student profiles and saved face scans are safely kept.</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setResetMode('attendance');
                setConfirmInput('');
                setResetModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs transition active:scale-[0.98]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Attendance History</span>
            </button>
          </div>

          {/* Option B: Full Tenant Database Reset */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-red-500/20 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mb-1">
                <Database className="w-4 h-4 text-red-400" />
                <span>Full Tenant Database Reset</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Completely removes <strong>all enrolled students</strong>, their face profiles, and all attendance history. Resets institution to a clean state.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setResetMode('full');
                setConfirmInput('');
                setResetModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 font-bold text-xs transition active:scale-[0.98]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Reset Entire Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 6: ACCOUNT SESSION LOGOUT
          ========================================================================= */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight">Account & Session</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                Logged in as <span className="text-slate-200 font-semibold">{currentUser?.email || 'admin@verity.edu'}</span>
              </div>
              <div className="text-xs text-emerald-400 mt-0.5 font-medium">
                Institution: {tenantName || currentUser?.tenantName || 'Institution Tenant'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs transition active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Verity</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION MODAL: DATABASE RESET / PURGE
          ========================================================================= */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#141416] border border-red-500/40 p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {resetMode === 'attendance' ? 'Purge Attendance Records' : 'Full Database Reset'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {resetMode === 'attendance'
                    ? 'Are you sure you want to delete all historical attendance verification events for this tenant? Student records and saved face scans will NOT be affected.'
                    : 'WARNING: This will permanently delete ALL enrolled student profiles, saved face scans, and attendance history for this institution. This action CANNOT be undone.'}
                </p>
              </div>
            </div>

            {/* Safety Requirement */}
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/20 text-xs text-red-300 space-y-2">
              <p>
                To prevent accidental loss of data, please type <strong className="font-mono text-white bg-red-900/40 px-1.5 py-0.5 rounded">RESET</strong> to confirm:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type RESET"
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-red-500/40 text-white font-mono text-sm focus:outline-none focus:border-red-400"
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetModalOpen(false);
                  setConfirmInput('');
                }}
                disabled={resetLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={confirmInput.trim() !== 'RESET' || resetLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white text-xs font-bold transition shadow-lg shadow-red-900/30"
              >
                {resetLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Wipe...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{resetMode === 'attendance' ? 'Confirm Purge' : 'Permanently Reset DB'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;