import JSZip from "jszip";

/**
 * 配置导出数据结构
 */
export interface ConfigBackup {
  version: string;
  exportedAt: number;
  localStorage: Record<string, string>;
  bgmFiles: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    data: string; // Base64 编码的数据
    byteLength: number; // 原始字节长度
  }>;
}

const BGM_DB_NAME = "drummer-bgm-files";
const BGM_DB_VERSION = 1;
const BGM_STORE_NAME = "bgm-files";
const BACKUP_VERSION = "1.0.0";

/**
 * 验证备份数据结构
 */
function validateBackup(data: unknown): data is ConfigBackup {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const backup = data as Partial<ConfigBackup>;

  // 验证基本字段
  if (
    typeof backup.version !== "string" ||
    typeof backup.exportedAt !== "number"
  ) {
    return false;
  }

  // 验证localStorage
  if (typeof backup.localStorage !== "object" || backup.localStorage === null) {
    return false;
  }

  // 验证bgmFiles
  if (!Array.isArray(backup.bgmFiles)) {
    return false;
  }

  // 验证每个BGM文件的结构
  for (const bgm of backup.bgmFiles) {
    if (
      typeof bgm.id !== "string" ||
      typeof bgm.name !== "string" ||
      typeof bgm.size !== "number" ||
      typeof bgm.type !== "string" ||
      typeof bgm.data !== "string" ||
      typeof bgm.byteLength !== "number"
    ) {
      return false;
    }

    // 验证Base64数据不为空
    if (bgm.data.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * 打开BGM数据库
 */
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

/**
 * 收集所有localStorage数据
 */
function collectLocalStorage(): Record<string, string> {
  const data: Record<string, string> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        data[key] = value;
      }
    }
  }

  return data;
}

/**
 * 收集所有IndexedDB中的BGM文件
 */
async function collectBgmFiles(): Promise<
  Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    data: string; // 改为 Base64 字符串
    byteLength: number; // 保存原始字节长度
  }>
> {
  const db = await openBgmDB();
  const transaction = db.transaction(BGM_STORE_NAME, "readonly");
  const store = transaction.objectStore(BGM_STORE_NAME);

  const records = await new Promise<any[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();

  // 将每个blob转换为Base64字符串（确保正确序列化）
  const bgmFiles = await Promise.all(
    records.map(async (record) => {
      const arrayBuffer = await record.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 将ArrayBuffer转换为Base64字符串
      const binaryString = uint8Array.reduce(
        (acc, byte) => acc + String.fromCharCode(byte),
        "",
      );
      const base64Data = btoa(binaryString);

      console.log(
        `[Config Backup] Exporting BGM: ${record.name}, Type: ${record.type}, Size: ${record.size}, ArrayBuffer byteLength: ${arrayBuffer.byteLength}`,
      );

      return {
        id: record.id,
        name: record.name,
        size: record.size,
        type: record.type,
        data: base64Data,
        byteLength: arrayBuffer.byteLength,
      };
    }),
  );

  return bgmFiles;
}

/**
 * 导出所有配置为ZIP文件
 */
export async function exportConfig(): Promise<void> {
  try {
    console.log("[Config Backup] Starting configuration export...");

    // Collect localStorage data
    console.log("[Config Backup] Collecting localStorage data...");
    const localStorageData = collectLocalStorage();
    console.log(
      `[Config Backup] Found ${Object.keys(localStorageData).length} localStorage items`,
    );

    // Collect IndexedDB data
    console.log("[Config Backup] Collecting BGM files...");
    const bgmFiles = await collectBgmFiles();
    console.log(`[Config Backup] Found ${bgmFiles.length} BGM files`);

    // 构建备份数据
    const backup: ConfigBackup = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      localStorage: localStorageData,
      bgmFiles: bgmFiles,
    };

    // 创建ZIP文件
    console.log("[Config Backup] Creating ZIP file...");
    const zip = new JSZip();

    // 添加配置JSON（包含所有数据，BGM以Base64格式嵌入）
    zip.file("config.json", JSON.stringify(backup, null, 2));

    // 生成ZIP blob
    console.log("[Config Backup] Generating ZIP file...");
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // 下载文件
    console.log("[Config Backup] Triggering download...");
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;

    // 生成文件名
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    a.download = `drummer-config-${dateStr}-${timeStr}.zip`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("[Config Backup] Export complete!");
  } catch (error) {
    console.error("[Config Backup] Export failed:", error);
    throw error;
  }
}

/**
 * 恢复localStorage数据
 */
function restoreLocalStorage(data: Record<string, string>): void {
  // 清空所有现有的localStorage数据
  localStorage.clear();

  // 恢复数据
  for (const [key, value] of Object.entries(data)) {
    localStorage.setItem(key, value);
  }

  console.log(
    `[Config Backup] Restored ${Object.keys(data).length} localStorage items`,
  );
}

/**
 * 恢复BGM文件到IndexedDB
 */
async function restoreBgmFiles(
  bgmFiles: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    data: string; // Base64 编码的数据
    byteLength: number; // 原始字节长度
  }>,
): Promise<void> {
  const db = await openBgmDB();
  const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
  const store = transaction.objectStore(BGM_STORE_NAME);

  // 清空现有数据
  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 恢复BGM文件
  for (const bgm of bgmFiles) {
    // 从Base64字符串解码回ArrayBuffer
    const binaryString = atob(bgm.data);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    console.log(
      `[Config Backup] Restoring BGM: ${bgm.name}, Type: ${bgm.type}, Size: ${bgm.size}, Original byteLength: ${bgm.byteLength}, Decoded size: ${uint8Array.byteLength}`,
    );

    // 确保MIME type有效，如果为空则尝试根据文件扩展名推断
    let mimeType = bgm.type;
    if (!mimeType || mimeType === "") {
      const ext = bgm.name.split(".").pop()?.toLowerCase();
      if (ext === "mp3") mimeType = "audio/mpeg";
      else if (ext === "wav") mimeType = "audio/wav";
      else if (ext === "ogg") mimeType = "audio/ogg";
      else if (ext === "m4a" || ext === "mp4") mimeType = "audio/mp4";
      else mimeType = "audio/mpeg"; // 默认
      console.log(
        `[Config Backup] No MIME type detected, inferred: ${mimeType}`,
      );
    }

    const blob = new Blob([uint8Array], { type: mimeType });

    const record = {
      id: bgm.id,
      blob: blob,
      name: bgm.name,
      size: bgm.size,
      type: mimeType,
      createdAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  db.close();
  console.log(`[Config Backup] Restored ${bgmFiles.length} BGM files`);
}

/**
 * 从ZIP文件导入配置
 */
export async function importConfig(file: File): Promise<void> {
  try {
    console.log("[Config Backup] Starting configuration import...");

    // Read ZIP file
    console.log("[Config Backup] Reading ZIP file...");
    const zip = await JSZip.loadAsync(file);

    // Read configuration file
    console.log("[Config Backup] Parsing configuration file...");
    const configFile = zip.file("config.json");
    if (!configFile) {
      throw new Error("Invalid configuration file: missing config.json");
    }

    const configText = await configFile.async("string");
    const parsedData = JSON.parse(configText);

    // 验证数据结构
    if (!validateBackup(parsedData)) {
      throw new Error("Invalid backup file: data structure validation failed");
    }

    const backup: ConfigBackup = parsedData;

    console.log(`[Config Backup] Configuration version: ${backup.version}`);
    console.log(
      `[Config Backup] Exported at: ${new Date(backup.exportedAt).toLocaleString()}`,
    );
    console.log(
      `[Config Backup] localStorage items: ${Object.keys(backup.localStorage).length}`,
    );
    console.log(`[Config Backup] BGM files: ${backup.bgmFiles.length}`);

    // 恢复localStorage数据
    console.log("[Config Backup] Restoring localStorage data...");
    restoreLocalStorage(backup.localStorage);

    // 恢复BGM文件
    console.log("[Config Backup] Restoring BGM files...");
    await restoreBgmFiles(backup.bgmFiles);

    console.log("[Config Backup] Import complete!");

    // 刷新页面
    window.location.reload();
  } catch (error) {
    console.error("[Config Backup] Import failed:", error);
    throw error;
  }
}
