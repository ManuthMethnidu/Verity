import React, { useState, useEffect } from 'react';
import {
  Battery,
  Sliders,
  Cpu,
  Save,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';
import WakeSlider from '../components/WakeSlider.jsx';
import { getLocalSettings, saveSettings } from '../storage/settingsStore.js';
import { signOut, getCurrentUser } from '../auth/auth.js';

export function SettingsPage() {
  const user = getCurrentUser();
  const [targetFps, setTargetFps] = useState(30);
  const [modelQuality, setModelQuality] = useState('medium');
  const [batterySaver, setBatterySaver] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.70);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

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

  const handleBatterySaverToggle = (val) => {
    setBatterySaver(val);
    if (val && targetFps > 30) {
      setTargetFps(30);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
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
          ? 'Preferences saved to IndexedDB (offline). Will sync to server when connection resumes.'
          : 'Settings successfully saved to local IndexedDB and synchronized with server!',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to persist settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System & Device Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure camera inference frame rates, model precision delegates, and account preferences.
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            notification.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Cosine Matcher Confidence Threshold with WakeSlider */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-sm ring-1 ring-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white text-base tracking-tight">Cosine Biometric Threshold</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Minimum vector similarity score required to trigger positive student identification.
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
              ariaLabel="Biometric Match Confidence Threshold"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
            <span>50% (Permissive)</span>
            <span className="text-emerald-400 font-semibold">70% (Recommended Spec)</span>
            <span>95% (Strict Biometric)</span>
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
                onChange={(e) => handleBatterySaverToggle(e.target.checked)}
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

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Persist Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Account & Session Management */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-red-500/20 backdrop-blur-md shadow-sm mt-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight">Account & Session</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                Logged in as <span className="text-slate-200 font-semibold">{user?.email || 'admin@verity.edu'}</span>
              </div>
              <div className="text-xs text-emerald-400 mt-0.5 font-medium">
                Tenant: {user?.tenantName || "Institution Tenant"}
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
    </div>
  );
}
