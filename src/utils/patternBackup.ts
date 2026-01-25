import JSZip from "jszip";
import type { Pattern } from "../types";
import type { BgmConfig } from "./bgmStorage";
import { getBgmFile } from "./bgmStorage";

/**
 * 单个节奏型备份数据结构
 */
export interface PatternBackup {
  version: string;
  exportedAt: number;
  pattern: Pattern;
  bgmConfig?: BgmConfig;
  bgmFile?: {
    id: string;
    name: string;
    size: number;
    type: string;
    data: string; // Base64 编码的数据
    byteLength: number; // 原始字节长度
  };
}

const BACKUP_VERSION = "1.0.0";
const BGM_DB_NAME = "drummer-bgm-files";
const BGM_DB_VERSION = 1;
const BGM_STORE_NAME = "bgm-files";

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
 * 验证备份数据结构
 */
function validateBackup(data: unknown): data is PatternBackup {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const backup = data as Partial<PatternBackup>;

  // 验证基本字段
  if (
    typeof backup.version !== "string" ||
    typeof backup.exportedAt !== "number"
  ) {
    return false;
  }

  // 验证pattern
  if (typeof backup.pattern !== "object" || backup.pattern === null) {
    return false;
  }

  const pattern = backup.pattern as Partial<Pattern>;
  if (
    typeof pattern.id !== "string" ||
    typeof pattern.name !== "string" ||
    typeof pattern.bpm !== "number" ||
    typeof pattern.bars !== "number" ||
    !Array.isArray(pattern.grid) ||
    !Array.isArray(pattern.drums)
  ) {
    return false;
  }

  // 如果有BGM配置，验证它
  if (backup.bgmConfig !== undefined) {
    const bgmConfig = backup.bgmConfig as Partial<BgmConfig>;
    if (
      typeof bgmConfig !== "object" ||
      typeof bgmConfig.offsetMs !== "number" ||
      typeof bgmConfig.volumePct !== "number"
    ) {
      return false;
    }
  }

  // 如果有BGM文件，验证它
  if (backup.bgmFile !== undefined) {
    const bgmFile = backup.bgmFile;
    if (
      !bgmFile ||
      typeof bgmFile.id !== "string" ||
      typeof bgmFile.name !== "string" ||
      typeof bgmFile.size !== "number" ||
      typeof bgmFile.type !== "string" ||
      typeof bgmFile.data !== "string" ||
      typeof bgmFile.byteLength !== "number"
    ) {
      return false;
    }

    // 验证Base64数据不为空
    if (bgmFile.data.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * 导出单个节奏型为ZIP文件
 */
export async function exportPatternToZip(
  pattern: Pattern,
  bgmConfig?: BgmConfig,
): Promise<void> {
  try {
    console.log("[Pattern Backup] Starting pattern export...");

    // 收集BGM文件（如果有配置）
    let bgmFile: PatternBackup["bgmFile"] | undefined;
    if (bgmConfig?.fileId) {
      console.log("[Pattern Backup] Collecting BGM file...");
      const record = await getBgmFile(bgmConfig.fileId);
      if (record) {
        const arrayBuffer = await record.blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // 将ArrayBuffer转换为Base64字符串
        const binaryString = uint8Array.reduce(
          (acc, byte) => acc + String.fromCharCode(byte),
          "",
        );
        const base64Data = btoa(binaryString);

        console.log(
          `[Pattern Backup] Exporting BGM: ${record.name}, Type: ${record.type}, Size: ${record.size}, ArrayBuffer byteLength: ${arrayBuffer.byteLength}`,
        );

        bgmFile = {
          id: record.id,
          name: record.name,
          size: record.size,
          type: record.type,
          data: base64Data,
          byteLength: arrayBuffer.byteLength,
        };
      }
    }

    // 构建备份数据
    const backup: PatternBackup = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      pattern: pattern,
      bgmConfig: bgmConfig,
      bgmFile: bgmFile,
    };

    // 创建ZIP文件
    console.log("[Pattern Backup] Creating ZIP file...");
    const zip = new JSZip();

    // 添加配置JSON（包含所有数据，BGM以Base64格式嵌入）
    zip.file("pattern.json", JSON.stringify(backup, null, 2));

    // 生成ZIP blob
    console.log("[Pattern Backup] Generating ZIP file...");
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // 下载文件
    console.log("[Pattern Backup] Triggering download...");
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;

    // 生成文件名
    a.download = `${pattern.name}.zip`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("[Pattern Backup] Export complete!");
  } catch (error) {
    console.error("[Pattern Backup] Export failed:", error);
    throw error;
  }
}

/**
 * 从ZIP文件导入节奏型
 */
export async function importPatternFromZip(
  file: File,
): Promise<{ pattern: Pattern; bgmConfig?: BgmConfig }> {
  try {
    console.log("[Pattern Backup] Starting pattern import...");

    // Read ZIP file
    console.log("[Pattern Backup] Reading ZIP file...");
    const zip = await JSZip.loadAsync(file);

    // Read configuration file
    console.log("[Pattern Backup] Parsing pattern file...");
    const patternFile = zip.file("pattern.json");
    if (!patternFile) {
      throw new Error("Invalid pattern file: missing pattern.json");
    }

    const fileText = await patternFile.async("string");
    const parsedData = JSON.parse(fileText);

    // 验证数据结构
    if (!validateBackup(parsedData)) {
      throw new Error("Invalid backup file: data structure validation failed");
    }

    const backup: PatternBackup = parsedData;

    console.log(`[Pattern Backup] Backup version: ${backup.version}`);
    console.log(
      `[Pattern Backup] Exported at: ${new Date(backup.exportedAt).toLocaleString()}`,
    );
    console.log(`[Pattern Backup] Pattern: ${backup.pattern.name}`);

    // 如果有BGM文件，恢复到IndexedDB
    if (backup.bgmFile) {
      console.log("[Pattern Backup] Restoring BGM file...");

      // 从Base64字符串解码回ArrayBuffer
      const binaryString = atob(backup.bgmFile.data);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      console.log(
        `[Pattern Backup] Restoring BGM: ${backup.bgmFile.name}, Type: ${backup.bgmFile.type}, Size: ${backup.bgmFile.size}, Original byteLength: ${backup.bgmFile.byteLength}, Decoded size: ${uint8Array.byteLength}`,
      );

      // 确保MIME type有效
      let mimeType = backup.bgmFile.type;
      if (!mimeType || mimeType === "") {
        const ext = backup.bgmFile.name.split(".").pop()?.toLowerCase();
        if (ext === "mp3") mimeType = "audio/mpeg";
        else if (ext === "wav") mimeType = "audio/wav";
        else if (ext === "ogg") mimeType = "audio/ogg";
        else if (ext === "m4a" || ext === "mp4") mimeType = "audio/mp4";
        else mimeType = "audio/mpeg";
        console.log(
          `[Pattern Backup] No MIME type detected, inferred: ${mimeType}`,
        );
      }

      const blob = new Blob([uint8Array], { type: mimeType });

      const db = await openBgmDB();
      const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
      const store = transaction.objectStore(BGM_STORE_NAME);

      const record = {
        id: backup.bgmFile.id,
        blob: blob,
        name: backup.bgmFile.name,
        size: backup.bgmFile.size,
        type: mimeType,
        createdAt: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
      console.log("[Pattern Backup] BGM file restored");
    }

    console.log("[Pattern Backup] Import complete!");

    return {
      pattern: backup.pattern,
      bgmConfig: backup.bgmConfig,
    };
  } catch (error) {
    console.error("[Pattern Backup] Import failed:", error);
    throw error;
  }
}
