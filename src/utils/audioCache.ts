/**
 * IndexedDB 缓存工具 - 用于缓存解码后的 AudioBuffer
 * 解决 iOS Safari 上每次都需要重新解码音频的问题
 */

const DB_NAME = "drummer-audio-cache";
const DB_VERSION = 1;
const STORE_NAME = "audio-buffers";
const CACHE_VERSION_KEY = "cache-version";
const CURRENT_CACHE_VERSION = "1.0.0";

/**
 * 打开 IndexedDB 数据库
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };
  });
}

/**
 * 将 AudioBuffer 转换为可序列化的对象
 */
function audioBufferToSerializable(buffer: AudioBuffer): {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  channelData: Float32Array[];
} {
  const channelData: Float32Array[] = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }

  return {
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate,
    channelData,
  };
}

/**
 * 从序列化对象恢复 AudioBuffer
 */
function serializableToAudioBuffer(
  ctx: AudioContext,
  data: {
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    channelData: Float32Array[];
  }
): AudioBuffer {
  const buffer = ctx.createBuffer(
    data.numberOfChannels,
    data.length,
    data.sampleRate
  );

  for (let i = 0; i < data.numberOfChannels; i++) {
    const channelData = buffer.getChannelData(i);
    channelData.set(data.channelData[i]);
  }

  return buffer;
}

/**
 * 缓存 AudioBuffer 到 IndexedDB
 */
export async function cacheAudioBuffer(
  name: string,
  buffer: AudioBuffer
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const serializable = audioBufferToSerializable(buffer);
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ name, data: serializable });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.warn(`Failed to cache audio buffer "${name}":`, error);
  }
}

/**
 * 从 IndexedDB 读取缓存的 AudioBuffer
 */
export async function getCachedAudioBuffer(
  ctx: AudioContext,
  name: string
): Promise<AudioBuffer | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (result) {
      return serializableToAudioBuffer(ctx, result.data);
    }

    return null;
  } catch (error) {
    console.warn(`Failed to get cached audio buffer "${name}":`, error);
    return null;
  }
}

/**
 * 清除所有缓存
 */
export async function clearAudioCache(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.warn("Failed to clear audio cache:", error);
  }
}

/**
 * 检查缓存是否存在
 */
export async function hasCachedAudioBuffer(name: string): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const result = await new Promise<boolean>((resolve, reject) => {
      const request = store.count(IDBKeyRange.only(name));
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return result;
  } catch (error) {
    console.warn(`Failed to check cache for "${name}":`, error);
    return false;
  }
}

/**
 * 获取当前缓存版本
 */
export async function getCacheVersion(): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(CACHE_VERSION_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return result ? result.version : null;
  } catch (error) {
    console.warn("Failed to get cache version:", error);
    return null;
  }
}

/**
 * 设置缓存版本
 */
async function setCacheVersion(version: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ name: CACHE_VERSION_KEY, version });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.warn("Failed to set cache version:", error);
  }
}

/**
 * 检查并更新缓存版本
 * 如果版本不匹配，清除所有缓存
 */
export async function checkAndUpdateCacheVersion(): Promise<void> {
  try {
    const currentVersion = await getCacheVersion();
    if (currentVersion !== CURRENT_CACHE_VERSION) {
      console.log(
        `Cache version mismatch. Expected: ${CURRENT_CACHE_VERSION}, Found: ${currentVersion}. Clearing cache...`
      );
      await clearAudioCache();
      await setCacheVersion(CURRENT_CACHE_VERSION);
    }
  } catch (error) {
    console.warn("Failed to check cache version:", error);
  }
}
