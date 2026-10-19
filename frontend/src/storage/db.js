import { openDB } from 'idb';

const DB_NAME = 'verity_attendance_db';
const DB_VERSION = 1;

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Student roster store
      if (!db.objectStoreNames.contains('roster')) {
        db.createObjectStore('roster', { keyPath: 'id' });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }

      // Attendance queue store for offline background sync
      if (!db.objectStoreNames.contains('attendanceQueue')) {
        const queueStore = db.createObjectStore('attendanceQueue', {
          keyPath: 'localId',
          autoIncrement: true,
        });
        queueStore.createIndex('synced', 'synced', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    },
  });
}
