/**
 * WakeLock 管理 - 防止播放时手机锁屏
 */

let wakeLock: WakeLockSentinel | null = null;

/**
 * 请求屏幕保持唤醒
 */
export async function requestWakeLock(): Promise<void> {
  if ("wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      // WakeLock request failed
    }
  }
}

/**
 * 释放屏幕保持唤醒
 */
export async function releaseWakeLock(): Promise<void> {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch {
      // WakeLock release failed
    }
  }
}
