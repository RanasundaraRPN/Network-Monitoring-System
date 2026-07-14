import { db } from '../db/index.ts';
import { devices } from '../db/schema.ts';
import { runDeviceCheck } from './monitor.ts';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

export function startMonitoringScheduler(intervalMs = 15000) {
  if (intervalId) return;

  console.log(`Starting background monitoring scheduler (Interval: ${intervalMs}ms)...`);
  
  const tick = async () => {
    if (isRunning) {
      console.warn('Previous monitoring tick is still running, skipping...');
      return;
    }
    
    isRunning = true;
    try {
      // Query all devices across all users
      const allDevices = await db.select().from(devices);
      if (allDevices.length > 0) {
        console.log(`Monitoring Scheduler: checking ${allDevices.length} devices...`);
        // Run all device checks in parallel
        await Promise.all(allDevices.map(device => 
          runDeviceCheck(device).catch(err => {
            console.error(`Error checking device ${device.id}:`, err);
          })
        ));
      }
    } catch (err) {
      console.error('Error in background monitoring scheduler tick:', err);
    } finally {
      isRunning = false;
    }
  };

  // Run a check immediately
  tick();
  
  // Schedule subsequent checks
  intervalId = setInterval(tick, intervalMs);
}

export function stopMonitoringScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Background monitoring scheduler stopped.');
  }
}
