import { getDb } from './db.js';
import { api } from '../auth/auth.js';

/**
 * Cache roster in IndexedDB for offline face matching
 */
export async function cacheRoster(students) {
  try {
    const db = await getDb();
    const tx = db.transaction('roster', 'readwrite');
    await tx.store.clear();
    for (const student of students) {
      await tx.store.put(student);
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to cache roster in IndexedDB:', err);
  }
}

/**
 * Retrieve cached roster from IndexedDB
 */
export async function getCachedRoster() {
  try {
    const db = await getDb();
    return await db.getAll('roster');
  } catch (err) {
    console.error('Failed to load cached roster:', err);
    return [];
  }
}

/**
 * Record attendance in IndexedDB queue and attempt immediate background sync
 */
export async function recordAttendance(record) {
  const item = {
    studentId: record.studentId,
    studentName: record.studentName || 'Student',
    studentCode: record.studentCode || '',
    timestamp: record.timestamp || new Date().toISOString(),
    deviceId: record.deviceId || 'WEB_CLIENT_01',
    confidence: record.confidence || null,
    livenessScore: typeof record.livenessScore === 'number' ? record.livenessScore : null,
    synced: false,
    createdAt: Date.now(),
  };

  try {
    const db = await getDb();
    item.localId = await db.add('attendanceQueue', item);
  } catch (err) {
    console.error('Failed to queue attendance in IndexedDB:', err);
  }

  // Attempt to sync immediately if online
  if (navigator.onLine) {
    syncAttendanceQueue();
  }

  return item;
}

/**
 * Synchronize pending attendance logs to the backend
 */
export async function syncAttendanceQueue() {
  if (!navigator.onLine) return { synced: 0, pending: 0 };

  try {
    const db = await getDb();
    const all = await db.getAll('attendanceQueue');
    const pending = all.filter((item) => !item.synced);

    let syncedCount = 0;

    for (const record of pending) {
      try {
        await api.post('/attendance', {
          studentId: record.studentId,
          timestamp: record.timestamp,
          deviceId: record.deviceId,
          confidence: record.confidence,
          livenessScore: record.livenessScore,
        });

        // Mark as synced locally or delete to save space
        record.synced = true;
        await db.put('attendanceQueue', record);
        syncedCount++;
      } catch (postErr) {
        console.warn('Failed to sync individual record, will retry later:', postErr);
        // If 401, stop trying until logged in
        if (postErr.response && postErr.response.status === 401) {
          break;
        }
      }
    }

    return { synced: syncedCount, pending: pending.length - syncedCount };
  } catch (err) {
    console.error('Attendance sync error:', err);
    return { synced: 0, pending: 0 };
  }
}

/**
 * Get count of pending unsynced records
 */
export async function getPendingCount() {
  try {
    const db = await getDb();
    const all = await db.getAll('attendanceQueue');
    return all.filter((item) => !item.synced).length;
  } catch {
    return 0;
  }
}

// Auto-sync whenever internet connectivity returns
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Network reconnected: Syncing offline attendance queue...');
    syncAttendanceQueue();
  });
}
