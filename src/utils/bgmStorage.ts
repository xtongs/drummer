const BGM_DB_NAME = "drummer-bgm-files";
const BGM_DB_VERSION = 1;
const BGM_STORE_NAME = "bgm-files";
const BGM_CONFIG_KEY = "drummer-bgm-config";
const MASTER_VOLUME_KEY = "drummer-master-volume";

export interface BgmFileMeta {
  name: string;
  size: number;
  type: string;
}

export interface BgmConfig {
  fileId?: string;
  offsetMs: number;
  volumePct: number;
  meta?: BgmFileMeta;
}

const DEFAULT_BGM_VOLUME = 100;

export interface BgmFileRecord extends BgmFileMeta {
  id: string;
  blob: Blob;
  createdAt: number;
}

function createBgmId(): string {
  return `bgm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function openBgmDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BGM_DB_NAME, BGM_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BGM_STORE_NAME)) {
        db.createObjectStore(BGM_STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveBgmFile(
  file: File,
): Promise<{ id: string; meta: BgmFileMeta }> {
  const db = await openBgmDB();
  const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
  const store = transaction.objectStore(BGM_STORE_NAME);

  const id = createBgmId();
  const record: BgmFileRecord = {
    id,
    blob: file,
    name: file.name,
    size: file.size,
    type: file.type,
    createdAt: Date.now(),
  };

  try {
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error("Transaction aborted"));
      const request = store.put(record);
      request.onerror = () => reject(request.error);
    });

    // 延迟关闭数据库，确保数据完全持久化
    await new Promise((resolve) => setTimeout(resolve, 50));

    db.close();
    return {
      id,
      meta: { name: record.name, size: record.size, type: record.type },
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function getBgmFile(id: string): Promise<BgmFileRecord | null> {
  const db = await openBgmDB();
  const transaction = db.transaction(BGM_STORE_NAME, "readonly");
  const store = transaction.objectStore(BGM_STORE_NAME);

  const result = await new Promise<BgmFileRecord | null>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return result;
}

export async function deleteBgmFile(id: string): Promise<void> {
  const db = await openBgmDB();
  const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
  const store = transaction.objectStore(BGM_STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * 获取所有 BGM 文件记录
 */
export async function getAllBgmFiles(): Promise<BgmFileRecord[]> {
  const db = await openBgmDB();
  const transaction = db.transaction(BGM_STORE_NAME, "readonly");
  const store = transaction.objectStore(BGM_STORE_NAME);

  const result = await new Promise<BgmFileRecord[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return result;
}

/**
 * 清空所有 BGM 文件
 */
export async function clearAllBgmFiles(): Promise<void> {
  const db = await openBgmDB();
  const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
  const store = transaction.objectStore(BGM_STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    const request = store.clear();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * 从 Base64 数据保存 BGM 文件（用于导入）
 */
export async function saveBgmFileFromBase64(
  base64Data: string,
  fileName: string,
  mimeType: string,
): Promise<{ id: string; meta: BgmFileMeta }> {
  // 从Base64字符串解码回ArrayBuffer
  const binaryString = atob(base64Data);
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([uint8Array], { type: mimeType });

  // 创建一个 File 对象
  const file = new File([blob], fileName, {
    type: mimeType,
    lastModified: Date.now(),
  });

  // 使用统一的 saveBgmFile 函数保存文件
  return saveBgmFile(file);
}

function loadBgmConfigMap(): Record<string, BgmConfig> {
  const raw = localStorage.getItem(BGM_CONFIG_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, BgmConfig>;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Ignore invalid data
  }
  return {};
}

function saveBgmConfigMap(map: Record<string, BgmConfig>): void {
  localStorage.setItem(BGM_CONFIG_KEY, JSON.stringify(map));
}

export function getBgmConfig(patternId: string): BgmConfig {
  const map = loadBgmConfigMap();
  const config = map[patternId];
  return {
    fileId: config?.fileId,
    offsetMs: config?.offsetMs ?? 0,
    volumePct: config?.volumePct ?? DEFAULT_BGM_VOLUME,
    meta: config?.meta,
  };
}

export function saveBgmConfig(patternId: string, config: BgmConfig): void {
  const map = loadBgmConfigMap();
  map[patternId] = {
    fileId: config.fileId,
    offsetMs: config.offsetMs ?? 0,
    volumePct: config.volumePct ?? DEFAULT_BGM_VOLUME,
    meta: config.meta,
  };
  saveBgmConfigMap(map);
}

export function deleteBgmConfig(patternId: string): void {
  const map = loadBgmConfigMap();
  delete map[patternId];
  saveBgmConfigMap(map);
}

const DEFAULT_MASTER_VOLUME = 0;

export function getMasterVolume(): number {
  const raw = localStorage.getItem(MASTER_VOLUME_KEY);
  if (!raw) return DEFAULT_MASTER_VOLUME;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number" && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  } catch {
    // Ignore invalid data
  }
  return DEFAULT_MASTER_VOLUME;
}

export function saveMasterVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(100, volume));
  localStorage.setItem(MASTER_VOLUME_KEY, JSON.stringify(clamped));
}
