# Tasks: 节奏型导入导出为 ZIP 文件

## 1. 实现任务

### 1.1 核心工具函数
- [x] 1.1.1 创建 `src/utils/patternBackup.ts`
- [x] 1.1.2 实现 `exportPatternToZip()` 函数
  - [x] 收集节奏型数据
  - [x] 收集 BGM 配置（如有）
  - [x] 收集 BGM 文件并转为 Base64（如有）
  - [x] 使用 JSZip 打包
  - [x] 触发浏览器下载
- [x] 1.1.3 实现 `importPatternFromZip()` 函数
  - [x] 解析 ZIP 文件
  - [x] 验证数据结构
  - [x] 恢复 BGM 文件到 IndexedDB
  - [x] 返回节奏型数据和 BGM 配置
- [x] 1.1.4 添加数据验证函数 `validateBackup()`

### 1.2 UI 交互修改
- [x] 1.2.1 修改 `PatternEditor.tsx`
  - [x] 移除长按复制剪贴板逻辑
  - [x] 改为调用 `exportPatternToZip()`
  - [x] 添加错误处理和用户提示
- [x] 1.2.2 修改 `PatternTabs.tsx`
  - [x] 添加隐藏的文件输入框
  - [x] 修改长按添加按钮逻辑为打开文件选择器
  - [x] 实现文件选择和导入处理
  - [x] 添加新的 prop `onImportPatternWithBgm`

### 1.3 应用逻辑集成
- [x] 1.3.1 修改 `App.tsx`
  - [x] 添加 `handleImportPatternWithBgm()` 函数
  - [x] 自动恢复 BGM 配置到新节奏型
  - [x] 传递新 prop 到组件

## 2. 测试任务

### 2.1 单元测试
- [ ] 2.1.1 `patternBackup.test.ts`
  - [ ] 测试 `exportPatternToZip()` 成功导出
  - [ ] 测试导出包含 BGM 的节奏型
  - [ ] 测试导出不含 BGM 的节奏型
  - [ ] 测试 `importPatternFromZip()` 成功导入
  - [ ] 测试导入带 BGM 的 ZIP
  - [ ] 测试导入不带 BGM 的 ZIP
  - [ ] 测试 `validateBackup()` 验证逻辑
  - [ ] 测试无效 ZIP 文件的处理
  - [ ] 测试损坏数据的处理

### 2.2 集成测试
- [ ] 2.2.1 PatternEditor 导出交互测试
  - [ ] 测试长按保存按钮触发导出
  - [ ] 测试导出文件名格式正确
  - [ ] 测试错误处理

### 2.3 测试覆盖率
- [ ] 2.3.1 确保测试覆盖率 >= 80%
  - [ ] 运行 `bun run test:coverage`
  - [ ] 补充遗漏的测试用例

## 3. 验证任务

- [x] 3.1 通过所有现有测试
  - [x] 修复 `useTheme.test.ts` 主题循环测试
  - [x] 修复 `MetronomeBar.test.tsx` BPM 变速测试
  - [x] 确认 337 个测试全部通过

- [x] 3.2 通过类型检查
  - [x] 运行 `bun run typecheck`

- [x] 3.3 通过构建测试
  - [x] 运行 `bun run build`

- [ ] 3.4 新增测试通过
  - [ ] 运行 `bun run test`
  - [ ] 确保新增测试用例全部通过

- [ ] 3.5 手动功能验证
  - [ ] 测试导出功能（有 BGM）
  - [ ] 测试导出功能（无 BGM）
  - [ ] 测试导入功能（有 BGM）
  - [ ] 测试导入功能（无 BGM）
  - [ ] 测试文件名格式

- [ ] 3.6 与规范对齐检查
  - [ ] 更新 `specs/pattern-management/spec.md`
  - [ ] 确保规范与实现一致

## 4. 文档任务

- [ ] 4.1 更新功能规范
  - [ ] 在 `specs/pattern-management/spec.md` 中添加导入导出行为说明

- [ ] 4.2 更新 pre-commit hook
  - [x] 添加测试检查到 `.husky/pre-commit`
  - [x] 确保测试失败时阻止 commit

## 5. 归档任务

- [ ] 5.1 移动到 archive
  - [ ] 所有任务完成后移动到 `archive/`
  - [ ] 标记为已完成
