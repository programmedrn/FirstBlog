/**
 * Screen Wake Lock — keeps the display on while a timer is running.
 * Browser releases the lock automatically when the tab loses visibility
 * (e.g. app switch), so we re-acquire it on visibilitychange if still wanted.
 */

let wakeLock = null;
let wanted = false;

const acquire = async () => {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
};

export const requestWakeLock = () => {
  wanted = true;
  acquire();
};

export const releaseWakeLock = () => {
  wanted = false;
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
};

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible' && !wakeLock) {
    acquire();
  }
});
