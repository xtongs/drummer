import JSZip from "jszip";
import {
  getAllBgmFiles,
  saveBgmFileFromBase64,
  clearAllBgmFiles,
} from "./bgmStorage";

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
    data: string; // Base64 字符串
    byteLength: number; // 保存原始字节长度
  }>
> {
  const records = await getAllBgmFiles();

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
    // Collect localStorage data
    const localStorageData = collectLocalStorage();

    // Collect IndexedDB data
    const bgmFiles = await collectBgmFiles();

    // 构建备份数据
    const backup: ConfigBackup = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      localStorage: localStorageData,
      bgmFiles: bgmFiles,
    };

    // 创建ZIP文件
    const zip = new JSZip();

    // 添加配置JSON（包含所有数据，BGM以Base64格式嵌入）
    zip.file("config.json", JSON.stringify(backup, null, 2));

    // 生成ZIP blob
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // 下载文件
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;

    // 生成文件名
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    a.download = `backup-${dateStr}.zip`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
}

/**
 * 恢复BGM文件到IndexedDB
 * 返回旧 fileId 到新 fileId 的映射
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
): Promise<Map<string, string>> {
  // 清空现有数据
  await clearAllBgmFiles();

  // 创建旧 ID 到新 ID 的映射
  const idMap = new Map<string, string>();

  // 恢复BGM文件
  for (const bgm of bgmFiles) {
    // 确保MIME type有效，如果为空则尝试根据文件扩展名推断
    let mimeType = bgm.type;
    if (!mimeType || mimeType === "") {
      const ext = bgm.name.split(".").pop()?.toLowerCase();
      if (ext === "mp3") mimeType = "audio/mpeg";
      else if (ext === "wav") mimeType = "audio/wav";
      else if (ext === "ogg") mimeType = "audio/ogg";
      else if (ext === "m4a" || ext === "mp4") mimeType = "audio/mp4";
      else mimeType = "audio/mpeg"; // 默认
    }

    // 使用统一的 saveBgmFileFromBase64 函数保存文件
    // 会生成新的 fileId
    const { id: newFileId } = await saveBgmFileFromBase64(
      bgm.data,
      bgm.name,
      mimeType,
    );

    // 保存映射关系
    idMap.set(bgm.id, newFileId);
  }

  return idMap;
}

/**
 * 更新 localStorage 中的 BGM 配置，使用新的 fileId
 */
function updateBgmConfigIds(idMap: Map<string, string>): void {
  const BGM_CONFIG_KEY = "drummer-bgm-config";
  const raw = localStorage.getItem(BGM_CONFIG_KEY);
  if (!raw) return;

  try {
    const configMap = JSON.parse(raw) as Record<string, { fileId?: string }>;
    let updated = false;

    for (const config of Object.values(configMap)) {
      if (config.fileId && idMap.has(config.fileId)) {
        // 更新为新的 fileId
        config.fileId = idMap.get(config.fileId);
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(BGM_CONFIG_KEY, JSON.stringify(configMap));
    }
  } catch {
    // Ignore parsing errors
  }
}

/**
 * 从ZIP文件导入配置
 */
export async function importConfig(file: File): Promise<void> {
  try {
    // Read ZIP file
    const zip = await JSZip.loadAsync(file);

    // Read configuration file
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

    // 恢复localStorage数据
    restoreLocalStorage(backup.localStorage);

    // 恢复BGM文件，获取旧 ID 到新 ID 的映射
    const idMap = await restoreBgmFiles(backup.bgmFiles);

    // 更新 localStorage 中的 BGM 配置，使用新的 fileId
    updateBgmConfigIds(idMap);

    // 刷新页面
    window.location.reload();
  } catch (error) {
    console.error("[Config Backup] Import failed:", error);
    throw error;
  }
}
