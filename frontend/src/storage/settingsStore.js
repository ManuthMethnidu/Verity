import { getDb } from './db.js';
import { api } from '../auth/auth.js';

const SETTINGS_KEY = 'user_preferences';

export const DEFAULT_SETTINGS = {
  targetFps: 30,
  modelQuality: 'medium', // 'low' | 'medium' | 'high'
  batterySaver: false,
  confidenceThreshold: 0.70,
  livenessEnabled: true,
  livenessStrictness: 'standard', // 'standard' | 'high'
};

/**
 * Loads preferences from IndexedDB with fallback to defaults.
 */
export async function getLocalSettings() {
  try {
    const db = await getDb();
    const stored = await db.get('settings', SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (err) {
    console.warn('Failed to load local settings from IndexedDB, using defaults:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves preferences to IndexedDB and syncs with backend if online.
 */
export async function saveSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };

  // Battery saver overrides: force max 30 FPS
  if (merged.batterySaver && merged.targetFps > 30) {
    merged.targetFps = 30;
  }

  // Persist locally in IndexedDB
  try {
    const db = await getDb();
    await db.put('settings', merged, SETTINGS_KEY);
  } catch (err) {
    console.warn('Could not write settings to IndexedDB:', err);
  }

  // Attempt backend persistence
  try {
    const res = await api.put('/settings', merged);
    return { success: true, settings: res.data.settings || merged };
  } catch (err) {
    console.warn('Could not sync settings to server (offline or error):', err.message);
    return { success: true, settings: merged, synced: false };
  }
}

/**
 * Syncs settings from server into IndexedDB
 */
export async function fetchServerSettings() {
  try {
    const res = await api.get('/settings');
    if (res.data) {
      const db = await getDb();
      await db.put('settings', res.data, SETTINGS_KEY);
      return res.data;
    }
  } catch (err) {
    console.warn('Could not fetch server settings, keeping local:', err.message);
  }
  return getLocalSettings();
}
