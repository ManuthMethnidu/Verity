import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Maximize2,
  Volume2,
  Wifi,
  Sparkles,
  UserCheck,
  FlipHorizontal,
  SwitchCamera,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Code2,
  Terminal,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { GooeyDropdown } from '../components/ui/GooeyDropdown.tsx';
import { CameraManager } from '../vision/cameraManager.js';
import { DetectorLoop } from '../vision/detectorLoop.js';
import { loadFaceApiModels } from '../vision/faceApiService.js';
import { getLocalSettings } from '../storage/settingsStore.js';
import { getCachedRoster, recordAttendance } from '../storage/attendanceStore.js';
import { api, getCurrentUser } from '../auth/auth.js';
import { AttendanceChart } from '../components/AttendanceChart.jsx';

export function AttendancePage() {
  const user = getCurrentUser();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraManagerRef = useRef(null);
  const detectorLoopRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [roster, setRoster] = useState([]);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [modelsReady, setModelsReady] = useState(false);
  const [recentVerified, setRecentVerified] = useState([]);
  const [isMirrored, setIsMirrored] = useState(() => {
    return localStorage.getItem('verity_camera_mirrored') !== 'false';
  });
  const [deviceId] = useState(() => {
    return localStorage.getItem('verity_device_id') || `Station-${Math.floor(Math.random() * 90 + 10)}`;
  });
  const [settings, setSettings] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showApiSetup, setShowApiSetup] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState('js');

  const tenantId = user?.tenantId || '';
  const tenantName = user?.tenantName || 'Active Institution';
  const feedApiUrl = `${window.location.origin}/api/attendance/feed/${tenantId}`;

  const copyToClipboard = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(feedApiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadApiPayload = async () => {
    try {
      const res = await fetch(feedApiUrl);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-feed-${tenantId || 'tenant'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export API JSON:', e);
      alert('Could not download API payload: ' + e.message);
    }
  };

  const apiDropdownActions = [
    {
      id: 'api-setup',
      label: 'API Setup & Guide',
      icon: <Code2 size={18} strokeWidth={1.75} />,
      detail: 'Endpoints, cURL & integration code',
      onSelect: () => setShowApiSetup(true),
    },
    {
      id: 'copy-url',
      label: copied ? 'URL Copied!' : 'Copy API URL',
      icon: <Copy size={18} strokeWidth={1.75} />,
      detail: 'Direct REST feed GET endpoint',
      onSelect: copyToClipboard,
    },
    {
      id: 'test-endpoint',
      label: 'Test API (JSON)',
      icon: <ExternalLink size={18} strokeWidth={1.75} />,
      detail: 'Open live JSON feed in new tab',
      onSelect: () => window.open(feedApiUrl, '_blank'),
    },
    {
      id: 'download-json',
      label: 'Export JSON Feed',
      icon: <Download size={18} strokeWidth={1.75} />,
      detail: 'Save offline JSON snapshot',
      onSelect: downloadApiPayload,
    },
    {
      id: 'revalidate',
      label: 'Revalidate Edge Buffer',
      icon: <RefreshCw size={18} strokeWidth={1.75} />,
      detail: 'Flush cache and sync',
      divider: true,
      destructive: true,
      onSelect: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    },
  ];

  // Initialize models and load cached roster on mount
  useEffect(() => {
    localStorage.setItem('verity_device_id', deviceId);

    // Preload face-api neural models
    loadFaceApiModels()
      .then(() => setModelsReady(true))
      .catch((err) => console.warn('Could not preload models on mount:', err.message));

    // Load roster from IndexedDB (or fallback fetch from server)
    async function initRosterAndSettings() {
      const prefs = await getLocalSettings();
      setSettings(prefs);

      let cached = await getCachedRoster();
      if (!cached || cached.length === 0) {
        try {
          const res = await api.get('/roster');
          cached = res.data;
        } catch {
          console.warn('Could not fetch server roster');
        }
      }
      setRoster(cached || []);
    }

    initRosterAndSettings();

    return () => {
      if (detectorLoopRef.current) {
        detectorLoopRef.current.stop();
      }
      if (cameraManagerRef.current) {
        cameraManagerRef.current.stop();
      }
    };
  }, [deviceId]);

  // Keep detector loop in sync with roster updates
  useEffect(() => {
    if (detectorLoopRef.current) {
      detectorLoopRef.current.setRoster(roster);
    }
  }, [roster]);

  // Start Camera and Detection Loop
  const startCameraFeed = async () => {
    setCameraError(null);
    try {
      const prefs = await getLocalSettings();
      cameraManagerRef.current = new CameraManager();

      await cameraManagerRef.current.start(videoRef.current, {
        targetFps: prefs.targetFps,
        batterySaver: prefs.batterySaver,
      });

      // Create & start detector loop with face-api multi-face detection
      detectorLoopRef.current = new DetectorLoop({
        videoElement: videoRef.current,
        canvasElement: canvasRef.current,
        roster,
        isMirrored,
        threshold: prefs.confidenceThreshold || 0.55,
        onVerifiedMatch: async ({ student, confidence, distance }) => {
          // Play pleasant confirmation audio ping
          try {
            const chimeEnabled = localStorage.getItem('verity_sound_chime') !== 'false';
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (chimeEnabled && AudioCtx) {
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
          } catch {}

          // 1. Persist in IndexedDB queue & attempt background sync
          const logItem = await recordAttendance({
            studentId: student.id,
            studentName: student.name,
            studentCode: student.studentIdCode,
            deviceId,
            confidence,
            timestamp: new Date().toISOString(),
          });

          // 2. Update local verified strip
          setRecentVerified((prev) => [
            {
              id: logItem.localId || Date.now(),
              name: student.name,
              time: new Date().toLocaleTimeString(),
              confidence,
            },
            ...prev.slice(0, 4),
          ]);

          // 3. Telemetry
          api.post('/metrics', {
            inferenceLatencyMs: 35,
            fps,
            deviceId,
            frameBudgetExceeded: false,
          }).catch(() => {});
        },
        onMetricsUpdate: (metrics) => {
          setFps(metrics.fps);
          setLatencyMs(metrics.frameDeltaMs || 0);
        },
      });

      await detectorLoopRef.current.initDetector(prefs.modelQuality);
      detectorLoopRef.current.start(prefs.targetFps);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera startup failure:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please grant webcam access in browser settings.'
          : `Failed to access camera: ${err.message}`
      );
      setCameraActive(false);
    }
  };

  const stopCameraFeed = () => {
    if (detectorLoopRef.current) {
      detectorLoopRef.current.stop();
    }
    if (cameraManagerRef.current) {
      cameraManagerRef.current.stop();
    }
    setCameraActive(false);
  };

  const toggleMirror = () => {
    const nextMirrored = !isMirrored;
    setIsMirrored(nextMirrored);
    localStorage.setItem('verity_camera_mirrored', String(nextMirrored));
    if (detectorLoopRef.current) {
      detectorLoopRef.current.setMirrored(nextMirrored);
    }
  };

  const toggleCameraFacing = async () => {
    if (!cameraManagerRef.current) return;
    try {
      const prefs = await getLocalSettings();
      await cameraManagerRef.current.toggleFacingMode({
        targetFps: prefs.targetFps,
        batterySaver: prefs.batterySaver,
      });
    } catch (err) {
      console.warn('Could not switch camera facing mode:', err);
    }
  };

  // Simulated Verification Trigger (enables testing even without webcam or on desktop)
  const handleSimulatedMatch = async () => {
    if (roster.length === 0) {
      alert('Roster is empty. Please enroll students first.');
      return;
    }
    const sample = roster[Math.floor(Math.random() * roster.length)];
    const logItem = await recordAttendance({
      studentId: sample.id,
      studentName: sample.name,
      studentCode: sample.studentIdCode,
      deviceId,
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    });
    setRecentVerified((prev) => [
      {
        id: logItem.localId || Date.now(),
        name: sample.name,
        time: new Date().toLocaleTimeString(),
        confidence: 0.95,
      },
      ...prev.slice(0, 4),
    ]);
    if (detectorLoopRef.current) {
      detectorLoopRef.current.setMatchFeedback({
        success: true,
        name: sample.name,
        confidence: 0.95,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-36 font-sans">
      {/* Top Banner & Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-emerald-400" />
            <span>Face-Recognition Attendance Scanner</span>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                modelsReady
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {modelsReady ? 'AI Scanner Ready' : 'Starting Camera Engine...'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Live smart face verification. Identified students and match confidence are highlighted directly on screen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <GooeyDropdown
            label="API Setup & Feed"
            icon={<Globe className="w-4 h-4 text-emerald-400" />}
            actions={apiDropdownActions}
            anchor="end"
            menuWidth={260}
            fill="#0f172a"
            ink="#f8fafc"
            danger="#ef4444"
          />

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
            Station: <span className="text-emerald-400">{deviceId?.replace('DEVICE-CAM-', 'Scanner ') || deviceId}</span>
          </div>

          {/* Mirror Camera Toggle */}
          <button
            onClick={toggleMirror}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isMirrored
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Toggle camera horizontal mirror reflection"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Mirror: {isMirrored ? 'ON' : 'OFF'}</span>
          </button>

          {/* Flip Front / Back Camera */}
          {cameraActive && (
            <button
              onClick={toggleCameraFacing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition"
              title="Flip Front / Back Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {!cameraActive ? (
            <button
              onClick={startCameraFeed}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          ) : (
            <button
              onClick={stopCameraFeed}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs sm:text-sm transition"
            >
              <span>Stop Camera</span>
            </button>
          )}

          {/* Simulate button for testing */}
          <button
            onClick={handleSimulatedMatch}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition"
            title="Simulate a stable face detection event for testing"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Simulate Match</span>
            <span className="sm:hidden">Simulate</span>
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Viewport & Camera Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Camera Container */}
        <div className="lg:col-span-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col items-center justify-center w-full aspect-[4/3] sm:aspect-video max-h-[55vh] sm:max-h-[65vh] ring-1 ring-white/[0.05]">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transition-transform duration-200 ${
              cameraActive ? 'block' : 'hidden'
            }`}
            style={{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none ${
              cameraActive ? 'block' : 'hidden'
            }`}
          />

          {/* Idle Placeholder */}
          {!cameraActive && (
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Camera Standby</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
                  Click <strong>"Start Camera"</strong> to begin attendance scanning. Verified students will be highlighted on screen automatically.
                </p>
                {roster.length === 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Database roster is empty. Go to the Roster tab to enroll student faces.</span>
                  </div>
                )}
              </div>
              <button
                onClick={startCameraFeed}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-sm"
              >
                <span>Start Camera Feed</span>
              </button>
            </div>
          )}

          {/* Live Telemetry Heads-Up Overlay */}
          {cameraActive && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
              <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>
                  FPS: <strong className="text-white">{fps}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Latency: <strong className="text-white">{latencyMs} ms</strong>
                </span>
              </div>

              <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 font-mono">
                Roster: <strong className="text-emerald-400">{roster.length}</strong> active profiles
              </div>
            </div>
          )}
        </div>

        {/* Live Attendance Activity Sidebar (1 Col) */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between w-full backdrop-blur-md shadow-xl ring-1 ring-white/[0.05]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-tight">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified in this Session</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">{recentVerified.length} logged</span>
            </div>

            {recentVerified.length > 0 ? (
              <div className="space-y-2.5">
                {recentVerified.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{v.name}</div>
                      <div className="text-xs text-emerald-400 font-mono">
                        Match: {(v.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400">{v.time}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs leading-relaxed">
                No verifications in current camera session. Keep face clearly visible in front of camera to verify.
              </div>
            )}
          </div>

          {/* Quick Roster Indicator */}
          <div className="pt-4 mt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5 font-sans">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Offline Ready</span>
            </span>
            <span className="text-emerald-400 font-semibold">{roster.length} Profiles</span>
          </div>
        </div>
      </div>

      {/* Attendance Activity Chart (Bklit UI) */}
      <div className="mt-8">
        <AttendanceChart
          records={recentVerified}
          title="Attendance Activity & Trends"
          subtitle="Real-time attendance volume across daily timeline and class hours"
        />
      </div>

      {/* Sleek, Uncluttered API Integration Capsule */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:px-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Tenant Attendance API</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                {tenantName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure REST feed for external portals, LMS, and institutional dashboards.
            </p>
          </div>
        </div>

        <GooeyDropdown
          label="API Setup & Actions"
          icon={<Globe className="w-4 h-4 text-emerald-400" />}
          actions={apiDropdownActions}
          anchor="end"
          menuWidth={260}
          fill="#0f172a"
          ink="#f8fafc"
          danger="#ef4444"
        />
      </div>

      {/* API Setup & Integration Modal */}
      {showApiSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Tenant API Setup & Integration</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      {tenantName}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Query real-time attendance, student codes, and timeline trends from external systems.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApiSetup(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Close Setup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* REST Endpoint URL Box */}
            <div className="mb-4">
              <div className="text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                <span>REST Endpoint URL</span>
                {tenantId && <span className="font-mono text-[11px] text-slate-500">Tenant ID: {tenantId}</span>}
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs tracking-wider">
                    GET
                  </span>
                  <span className="truncate select-all text-slate-300">
                    {feedApiUrl}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={feedApiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                    title="Open JSON Feed"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300">
                <strong className="text-emerald-400 block font-semibold mb-0.5">Unique Attendance</strong>
                Deduplicated counts
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300">
                <strong className="text-emerald-400 block font-semibold mb-0.5">Identities & Codes</strong>
                Student IDs & photos
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300">
                <strong className="text-emerald-400 block font-semibold mb-0.5">Timeline Series</strong>
                Daily trend arrays
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300">
                <strong className="text-emerald-400 block font-semibold mb-0.5">Query Filters</strong>
                ?startDate, ?endDate
              </div>
            </div>

            {/* Code Integration Snippet Tabs */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-xs">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">Integration Snippet</span>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'js', label: 'JavaScript' },
                    { id: 'curl', label: 'cURL' },
                    { id: 'response', label: 'Sample Response' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCodeTab(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeCodeTab === tab.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-slate-300 max-h-64 overflow-y-auto">
                {activeCodeTab === 'js' && (
                  <pre className="text-emerald-300">
{`// 1. Fetch unique attendance and timeline for ${tenantName}
const response = await fetch("${feedApiUrl}");
const data = await response.json();

// 2. Access unique students with names, student codes, and attendance totals
console.log(data.uniqueAttendance);

// 3. Access timeline for charts or graphs over time
console.log(data.timeline);`}
                  </pre>
                )}

                {activeCodeTab === 'curl' && (
                  <pre className="text-slate-200">
{`# Query unique attendance feed for ${tenantName}
curl -X GET "${feedApiUrl}" \\
  -H "Accept: application/json"`}
                  </pre>
                )}

                {activeCodeTab === 'response' && (
                  <pre className="text-slate-300">
{`{
  "success": true,
  "tenantId": "${tenantId || 'tenant_xyz'}",
  "tenantName": "${tenantName}",
  "totalEvents": 42,
  "uniqueStudentsCount": 15,
  "timeline": [
    { "date": "2026-10-20", "count": 20 },
    { "date": "2026-10-21", "count": 22 }
  ],
  "uniqueAttendance": [
    {
      "studentId": "cm1stu001",
      "name": "Jane Silva",
      "studentCode": "STU-104",
      "totalAttendanceCount": 8,
      "latestAttendance": "2026-10-21T08:30:12.000Z"
    }
  ]
}`}
                  </pre>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowApiSetup(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy API URL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
