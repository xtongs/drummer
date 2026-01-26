import JSZip from "jszip";
import type { Pattern } from "../types";
import type { BgmConfig } from "./bgmStorage";
import { getBgmFile, saveBgmFileFromBase64 } from "./bgmStorage";

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
    // 收集BGM文件（如果有配置）
    let bgmFile: PatternBackup["bgmFile"] | undefined;
    let finalBgmConfig: BgmConfig | undefined = bgmConfig;

    if (bgmConfig?.fileId) {
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

        bgmFile = {
          id: record.id,
          name: record.name,
          size: record.size,
          type: record.type,
          data: base64Data,
          byteLength: arrayBuffer.byteLength,
        };
      } else {
        // 文件不存在，清除无效的 fileId，但保留其他配置（offset, volume）
        finalBgmConfig = {
          offsetMs: bgmConfig.offsetMs,
          volumePct: bgmConfig.volumePct,
        };
      }
    }

    // 构建备份数据
    const backup: PatternBackup = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      pattern: pattern,
      bgmConfig: finalBgmConfig,
      bgmFile: bgmFile,
    };

    // 创建ZIP文件
    const zip = new JSZip();

    // 添加配置JSON（包含所有数据，BGM以Base64格式嵌入）
    zip.file("pattern.json", JSON.stringify(backup, null, 2));

    // 生成ZIP blob
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // 下载文件
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;

    // 生成文件名
    a.download = `${pattern.name}.zip`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    // Read ZIP file
    const zip = await JSZip.loadAsync(file);

    // Read configuration file
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

    // 准备 BGM 配置（如果有）
    let updatedBgmConfig: BgmConfig | undefined;

    // 检查 BGM 配置和文件的一致性
    if (backup.bgmConfig && !backup.bgmFile) {
      // 清除无效的 BGM 配置
      updatedBgmConfig = undefined;
    } else if (backup.bgmFile) {
      // 从Base64字符串解码回ArrayBuffer
      const binaryString = atob(backup.bgmFile.data);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // 确保MIME type有效
      let mimeType = backup.bgmFile.type;
      if (!mimeType || mimeType === "") {
        const ext = backup.bgmFile.name.split(".").pop()?.toLowerCase();
        if (ext === "mp3") mimeType = "audio/mpeg";
        else if (ext === "wav") mimeType = "audio/wav";
        else if (ext === "ogg") mimeType = "audio/ogg";
        else if (ext === "m4a" || ext === "mp4") mimeType = "audio/mp4";
        else mimeType = "audio/mpeg";
      }

      // 使用统一的 saveBgmFileFromBase64 函数保存文件
      const { id: newFileId, meta } = await saveBgmFileFromBase64(
        backup.bgmFile.data,
        backup.bgmFile.name,
        mimeType,
      );

      // 创建新的 bgmConfig 对象，使用新的 fileId 和更新的 meta 信息
      updatedBgmConfig = {
        fileId: newFileId,
        offsetMs: backup.bgmConfig?.offsetMs ?? 0,
        volumePct: backup.bgmConfig?.volumePct ?? 100,
        meta: meta,
      };
    }

    return {
      pattern: backup.pattern,
      bgmConfig: updatedBgmConfig,
    };
  } catch (error) {
    console.error("[Pattern Backup] Import failed:", error);
    throw error;
  }
}
