## Title
BGM 上传后：鼓声分离 + 自动扒谱，生成整曲节奏型（Pattern）

## Context
- 目标：用户上传一首歌曲（BGM）后，系统能够自动抽取鼓的节奏信息，并生成可编辑、可回放对比的 `Pattern`，用于练习/扒谱/复刻。
- 现状：当前产品具备 Pattern 编辑与播放能力，但没有从音频自动生成节奏型的能力。
- 现实约束：
  - “任意曲风 + 任意鼓音色 + 全鼓组 + 一次性完美扒谱”难度较高，需要明确 MVP 范围与人机协作闭环。
  - 音频分离与扒谱属于算力密集型任务，更适合后端异步处理（任务队列 + 进度）。

## Why
- 降低用户从“听歌”到“可练习节奏型”的门槛（自动生成骨架节奏、节省大量手工点格子时间）。
- 提供差异化能力：上传 BGM → 自动生成鼓点 → 直接进入练习与编辑闭环。
- 为后续“多段落/整曲练习”、“BGM 同步练习”等能力提供基础数据（拍点、BPM、段落、鼓点事件流）。

## Scope (MVP)
### Input
- 支持上传音频文件（优先支持常见格式：mp3/wav/m4a）。
- 处理对象：整曲或指定片段（建议 MVP 先做片段，降低成本与失败面）。

### Output
- 生成 `Pattern`：
  - `bpm`（恒定 BPM，MVP 假设）
  - `timeSignature`（MVP 先固定 4/4 或只支持 4/4）
  - `bars` + `grid`（鼓点量化到网格）
  - `drums`（MVP 优先只输出 Kick/Snare/Hi-hat 3 类）
- 输出置信度信息（用于 UI 高亮/一键清理低置信度点位）。

### UX
- 上传 BGM 后提供：
  - 处理进度（排队/分离/扒谱/量化/完成/失败）
  - “生成节奏型”预览（可试听对比：BGM/鼓 stem/节拍器/Pattern）
  - 一键应用生成结果到编辑器，并支持快速纠错（删/补/改鼓件）

## Non-goals (MVP)
- 不承诺：
  - 变速曲（tempo map）、自由速度、复杂 swing/人类演奏细节的完美还原
  - Ghost note / grace note / 32 分双击等细粒度自动识别（可作为后续迭代）
  - 全鼓组完整分件（ride/crash/toms/open/closed hihat 等）与高精度分类
- 不做纯前端本地推理（除非明确产品约束），默认后端异步处理。

## Approach Overview
本能力建议拆为 4 个阶段，每阶段可独立评估与替换实现：

1) Preprocess（预处理）
- 解码、统一采样率/声道、响度/归一化（避免模型对输入分布敏感）。

2) Source Separation（鼓声分离）
- 方案 A：通用 4-stem 分离（drums/bass/vocals/other），优先成熟实现（Demucs 类）：
  - 风险：Demucs 原始仓库已归档；需评估 fork 的维护状态与替代实现。
- 方案 B：直接使用专用 drum separation（更强但工程复杂，依赖训练/模型供给）。

3) Drum Transcription（鼓点事件提取）
- 对 `drums` stem（或分件后的鼓 stem）进行：
  - onset detection（击打时间点）
  - event classification（鼓件类别：MVP 先 K/S/HH）
- 备注：传统库（如旧 ADT 代码）可作为基线/参考，但不应作为产品核心依赖；建议直接选用维护更活跃/可复现的方案做 PoC，并保留可替换性。

4) Musical Alignment（拍点/BPM/量化）
- 估计拍点与小节（MVP：恒定 BPM + 4/4 简化）
- 将事件时间戳量化到 Pattern 网格：
  - 量化策略：最近格点 / 置信度门限 / 允许一定窗口的吸附
  - 冲突策略：同一格点多事件、连击拆分（后续）

## Tech Options
### Separation
- 自建推理服务（推荐）：可控、可迭代，但需要 GPU/队列/运维。
- 第三方托管 API：PoC 快，但成本/限额/稳定性/隐私合规受制于人。

### Transcription
- PoC 优先：可复现、可下载权重、可离线运行的方案（先跑通 K/S/HH）。
- 迭代方向：
  - 增加鼓件类别
  - 引入 per-track 校准（阈值/响度/谱特征自适应）
  - 用人机纠错数据做轻量自适应（仅在合规前提下）

## Quality Expectations
- MVP 目标：对主干节奏（kick/snare backbeat、基础 hihat）生成“可用骨架”，并通过 UI 纠错闭环达到可练习程度。
- 可观测指标（建议）
  - Onset-level：Precision/Recall/F1（按鼓件分别统计）
  - Grid-level：量化后与人工参考的匹配率/编辑距离（需要内部标注集）
  - 用户侧：一次生成后平均需要手动修改的格点数/占比

## Risks & Mitigations
- 曲风差异大、混音复杂导致误检/漏检：
  - 先做 drums stem separation；MVP 限定 4/4 恒定 BPM；只做 K/S/HH。
- 不同鼓音色差异（录音鼓/采样库/合成鼓）导致分类不稳：
  - 增加输入归一化；采用更鲁棒的模型；提供 per-track 校准（阈值/灵敏度滑杆）。
- 算力与成本不确定：
  - 强制片段模式；缓存；任务队列；按时长计费/限额策略。
- 用户信任问题（“AI 生成但不准”）：
  - 必须提供置信度可视化与一键清理；强调“先骨架后精修”的产品心智；提供对比试听。
- 版权与合规：
  - 上传与处理条款提示；存储与保留策略；默认私有处理；明确用户对音频的授权责任。

## System Impact
### Specs Impact
- `openspec/specs/background-music/`（上传、存储、播放与同步流程可能需要扩展）
- `openspec/specs/audio-engine/`（多音轨混音、A/B 对比试听、stem 回放）
- `openspec/specs/pattern-management/`（从分析结果创建/导入 Pattern）
- （可能新增）`openspec/specs/ai-transcription/`（若该能力成为长期模块）

### Code/Infra Impact (expected)
- 新增后端服务（或 serverless + 队列）：
  - 上传与存储（对象存储）
  - 异步任务队列（分离/扒谱/量化）
  - 推理运行时（GPU/CPU fallback）
  - 结果存储与可回放资源（drums stem、事件列表、Pattern）
- 前端新增：
  - 上传入口与任务状态 UI
  - 生成结果预览与应用到 PatternEditor

## Open Questions (must decide before implementation)
1) 变更级别：🟡 常规功能还是 🔴 重大功能？（建议按重大功能执行 SDD）
2) 处理位置：纯云端 / 混合 / 本地离线？
3) MVP 是否强制：4/4 + 恒定 BPM + 仅 K/S/HH？
4) 整曲还是片段：是否必须支持整曲（成本显著提升）？
5) 输出形态：仅 Pattern 网格，还是也要 MIDI / 事件时间戳导出？
6) 存储策略：是否保存 stems？保存多久？是否允许用户下载？

## Acceptance Criteria (MVP)
- 上传 BGM 后可触发分析任务，并在 UI 看到明确的状态与失败原因。
- 任务完成后可生成一个可编辑的 `Pattern`（含 bpm、bars、grid、K/S/HH）。
- 支持回放对比：BGM + Pattern（可选：drums stem）。
- 在限定输入（4/4、恒定 BPM、鼓点清晰的流行/摇滚等）上，生成结果达到“可用骨架”，用户平均修改量可接受（具体阈值由产品方定义）。

## Verification
- 前端与后端分别具备：
  - 单元测试（核心量化逻辑、事件→网格转换）
  - 端到端冒烟（上传→任务→结果→应用 Pattern）
- 质量评估脚本（离线）：对内部小数据集跑 F1/匹配率基线并记录版本。

