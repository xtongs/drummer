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

interface BgmFileRecord extends BgmFileMeta {
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

export async function saveBgmFile(file: File): Promise<{ id: string; meta: BgmFileMeta }> {
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

  await new Promise<void>((resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
  return { id, meta: { name: record.name, size: record.size, type: record.type } };
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
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
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
