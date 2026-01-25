# Change: 节奏型导入导出为 ZIP 文件

## Why

当前节奏型只能通过剪贴板导入导出 JSON 字符串，存在以下问题：

1. **不支持 BGM 关联**：导出节奏型时无法携带关联的背景音乐文件
2. **用户体验差**：需要在应用内手动复制粘贴 JSON 字符串
3. **无法永久保存**：用户无法将节奏型导出到文件系统进行备份或分享

## What Changes

### 新增功能

1. **长按保存按钮导出为 ZIP**
   - 按钮位置：PatternEditor 的 `save-current-button`
   - 交互：长按（500ms）触发导出
   - 文件名格式：`{patternName}.zip`
   - 包含内容：
     - 节奏型数据（JSON）
     - BGM 配置（如有）
     - BGM 音频文件（Base64 编码）

2. **长按添加按钮导入 ZIP**
   - 按钮位置：PatternTabs 的 `save-button`
   - 交互：长按（500ms）触发文件选择器
   - 文件格式：`.zip`
   - 自动恢复：
     - 节奏型数据
     - BGM 文件到 IndexedDB
     - BGM 配置到新节奏型

3. **新增工具模块**
   - 文件：`src/utils/patternBackup.ts`
   - 功能：
     - `exportPatternToZip()` - 导出节奏型为 ZIP
     - `importPatternFromZip()` - 从 ZIP 导入节奏型
     - 数据验证和错误处理

### 修改组件

- **PatternEditor**
  - 移除剪贴板复制逻辑（长按保存按钮）
  - 改为调用 `exportPatternToZip()`

- **PatternTabs**
  - 移除剪贴板读取逻辑（长按添加按钮）
  - 改为打开文件选择器
  - 新增隐藏的 `<input type="file">`

- **App.tsx**
  - 新增 `handleImportPatternWithBgm()` 处理带 BGM 的导入
  - 自动将 BGM 配置关联到新导入的节奏型

## Impact

- **影响的规范**：
  - `specs/pattern-management/spec.md` - 需要更新导入导出行为

- **影响的代码**：
  - `src/components/PatternEditor/PatternEditor.tsx` - 导出逻辑
  - `src/components/PatternManager/PatternTabs.tsx` - 导入逻辑
  - `src/App.tsx` - 导入处理
  - `src/utils/patternBackup.ts` - **新增**

- **破坏性变更**：
  - ❌ 无（保留原有剪贴板功能作为降级方案）

## Success Criteria

- [ ] 长按保存按钮能导出当前节奏型（含 BGM）为 ZIP
- [ ] 长按添加按钮能打开文件选择器
- [ ] 导入 ZIP 后自动恢复 BGM 配置和文件
- [ ] 所有测试通过（包括新增的测试用例）
- [ ] 测试覆盖率 >= 80%
