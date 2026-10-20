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
} from 'lucide-react';
import { CameraManager } from '../vision/cameraManager.js';
import { DetectorLoop } from '../vision/detectorLoop.js';
import { loadFaceApiModels } from '../vision/faceApiService.js';
import { getLocalSettings } from '../storage/settingsStore.js';
import { getCachedRoster, recordAttendance } from '../storage/attendanceStore.js';
import { api } from '../auth/auth.js';

export function AttendancePage() {
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
    return localStorage.getItem('verity_device_id') || `DEVICE-CAM-${Math.floor(Math.random() * 900 + 100)}`;
  });
  const [settings, setSettings] = useState(null);

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
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Top Banner & Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-emerald-400" />
            <span>Face-Recognition Attendance Scanner</span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                modelsReady
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {modelsReady ? 'ResNet-34 AI Ready' : 'Loading Models...'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time neural face detection & 128-D descriptor matching. Names and confidence are pinned directly to each respective face.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
            Device: <span className="text-emerald-400">{deviceId}</span>
          </div>

          {/* Mirror Camera Toggle */}
          <button
            onClick={toggleMirror}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              isMirrored
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle camera horizontal mirror reflection"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Mirror: {isMirrored ? 'ON' : 'OFF'}</span>
          </button>

          {/* Flip Front / Back Camera (if multiple cameras available) */}
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
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95"
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
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Simulate Face Match</span>
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

      {/* Main Viewport & Camera Stage - Responsive layout without side blowout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Camera Container (Responsive 4:3 on mobile / adaptive) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col items-center justify-center w-full aspect-[4/3] sm:aspect-video max-h-[55vh] sm:max-h-[65vh]">
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
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Camera Standby</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto">
                  Click <strong>"Launch Camera"</strong> to begin TensorFlow.js real-time neural face recognition.
                  Face bounding boxes and student names will be pinned directly over each person's face.
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
              >
                <span>Launch Camera</span>
              </button>
            </div>
          )}

          {/* Live Telemetry Heads-Up Overlay */}
          {cameraActive && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
              <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>
                  FPS: <strong className="text-white">{fps}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Inference: <strong className="text-white">{latencyMs} ms</strong>
                </span>
              </div>

              <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                Roster: <strong className="text-emerald-400">{roster.length}</strong> cached
              </div>
            </div>
          )}
        </div>

        {/* Live Attendance Activity Sidebar (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified in this Session</span>
              </h2>
              <span className="text-xs text-slate-500">{recentVerified.length} logged</span>
            </div>

            {recentVerified.length > 0 ? (
              <div className="space-y-2.5">
                {recentVerified.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between transition animate-fadeIn"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{v.name}</div>
                      <div className="text-[11px] text-emerald-400/80">
                        Match: {(v.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400">{v.time}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No verifications in current camera session. Present face in frame for 5 stable frames.
              </div>
            )}
          </div>

          {/* Quick Roster Indicator */}
          <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Offline Ready</span>
            </span>
            <span className="text-emerald-400 font-semibold">{roster.length} Profiles</span>
          </div>
        </div>
      </div>
    </div>
  );
}
