import { syncAttendanceQueue } from '../storage/attendanceStore.js';

export async function registerSW() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.log('✅ ServiceWorker registered with scope:', registration.scope);

      // Listen for message from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_ATTENDANCE_SYNC') {
          syncAttendanceQueue();
        }
      });

      // Register background sync if supported
      if ('SyncManager' in window) {
        try {
          await registration.sync.register('sync-attendance');
        } catch (syncErr) {
          console.warn('Background sync could not be registered:', syncErr);
        }
      }
    } catch (err) {
      console.warn('ServiceWorker registration failed:', err);
    }
  }
}
