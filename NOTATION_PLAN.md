# Notation 区域：符干/连梁/旗尾 + 五线谱优化 + 休止符（详细方案）

## 目标
- 在 Notation（`DrumNotation` SVG）中绘制：
  - **符干（stem）**
  - **符尾**：同一拍内优先 **连梁（beam）**；若同拍同层只有单个音符则退化为 **独立旗尾（flag）**（16分=1旗，32分=2旗）
  - **倚音（CELL_GRACE）**：更小符头 + 更短符干 + 符干斜杠（slash），且 **不参与连梁**
  - **休止符**：按“整体节奏声部”推导；在 **每拍内合并**（能合并成 4分/8分/16分/32分就合并），避免逐格刷屏
- 五线谱视觉优化：
  - 只保留 **标准 5 条谱线**
  - 删除多余横线
  - 对超出五线谱范围的音符绘制 **短加线（ledger line）**
- 调整 Notation 区域高度与留白：保证 beams/flags、上加线、下加线都不贴边。

## 现状与关键约束
- 当前 Notation 仅画“音符头 + 括号（鬼音/倚音）”，无 stem/beam/flag/rest 概念（`src/components/PatternEditor/DrumNotation.tsx`）。
- 时间粒度：`SUBDIVISIONS_PER_BEAT = 4`（16分网格）；32分通过 `CELL_DOUBLE_32/FIRST_32/SECOND_32` 在单格内拆为左右两个符头。
- 鼓件线位：`DRUM_NOTATION[drum].line`（`src/utils/constants.ts`），并由 `getSymbolY()` 计算 y。

## 新增/调整的渲染模型
把 `DrumNotation` 从“逐格直接画”重构为：

### 1) 事件层（NoteEvent）
- 遍历 `pattern.grid` 生成 `NoteEvent[]`：
  - `duration`：16 或 32（32 来自 `CELL_*32`）
  - `x/y`：继续复用现有 `baseX` 和 32 的 `symbolXs` 规则
  - `stemDir`：分声部规则：`Kick` 向下，其它向上
  - `isGrace/isGhost` 等标签保留
  - `renderHead()`：复用现有符头（含 Crash 叠加）与括号渲染

### 2) 布局层（Beam/Flag/Grace/Rest）
在同一拍（4 个 subdivision）内生成：

#### 2.1 连梁/旗尾（对非 Grace 的音符）
- **参与集合**：排除 `isGrace`；其余（含鬼音）默认参与（若未来要“鬼音不连梁”可加开关）。
- **两层 beam**：
  - 16 层：16+32 都参与
  - 32 层：仅 32 参与
- **规则**：每层参与者数量 ≥ 2 → 画 beam；=1 → 画 flag。
- **stem 与符头连接**：
  - 圆形符头（`o/○/●`）：stem up 连接右侧、stem down 连接左侧，避免穿过符头中心；加 `smallOverlap(0.5~1px)` 消除缝隙。
  - `x` 符头：连接到中心 x 或微偏右，避免“挂空”。

#### 2.2 倚音（CELL_GRACE）
- **符头缩小**（例如 `SYMBOL_SIZE * 0.72`）
- **符干更短**（例如常规 stem 的 0.7 倍）
- **斜杠**：在符干中上部画一条短斜线（slash）
- **不参与连梁/旗尾**（默认不画旗尾，只画 slash；如后续希望倚音也有旗尾可再加）

#### 2.3 休止符（整体节奏声部 + 拍内合并）
休止符规则：**global voice + merge within beat**。推导定义：

- **定义 globalVoice 的“占用”**：某个“时间片”只要任意鼓件在该时间片有 NoteEvent（含 ghost/grace 也算占用，避免出现“有倚音但画休止”的冲突）就视为“非休止”。
- **时间片分辨率**：
  - 基础用 16分格（0..3）
  - 若某格内出现 32分（`CELL_*32`）则在该格内视为有两个 32 子片（left/right）；这样才能在“半拍里有 32”的情况下正确得到 32休止。
- **拍内合并算法（从左到右贪心）**：在一个 beat 内，把空白片段尽量合并为更长的休止符：
  - 优先合并为 1拍(4/4 的四分休止)；否则合并为 1/2拍(八分休止)；否则 1/4拍(十六分休止)；否则 1/8拍(三十二分休止)
  - 输出 `RestEvent[]`：{ xCenter, y, duration: quarter|eighth|sixteenth|thirtySecond }
- **休止符 y 位置**：固定在谱表中部（例如 line=0 的 y）或略偏上（更清爽且不与 Kick 下行符干干扰）。
- **休止符形状**：用 SVG path 画简化符号（不依赖字体）：
  - 四分/八分：用常见“闪电”或“钩形”简化版本
  - 十六/三十二：在八分基础上叠加 1~2 个短旗钩
  - 若不追求严格乐谱字体，优先选择“清晰易读”的符号（线条+小圆点组合也可）

> 备注：由于当前编辑器是“鼓件矩阵”，global rest 本质是给用户一个“整体空白节奏提示”。它不会替代每行的休止符。

### 3) 绘制层（顺序/分层）
SVG 内绘制顺序建议：
1. 背景：5 条谱线 + 小节线/拍线
2. 播放高亮（rect）
3. stems/beams/flags（非 grace）
4. grace stems + slash
5. rests（居中层，避免与符头重叠；必要时可放在符头后、stems 前）
6. note heads + brackets（现有逻辑复用）
7. ledger lines（也可在 1 与 6 之间；但通常在符头后更自然——实现时对比效果决定）

## 五线谱与加线（ledger line）
- 将谱线从当前 6 条改为 5 条；移除 y=0 的额外横线。
- 对 `line < -2` 或 `line > 2` 的音符：
  - 在对应的“最近线位”（-2 或 2 的 y）画一条短横（长度略大于符头直径），居中于符头 x。
  - 对像 `Crash 1 (-2.5)`、`Kick (2.5)` 这种典型“上/下加一线”确保会出现 ledger line。

## Notation 区域尺寸调整
- 将 `svgHeight` 从“仅覆盖谱线”改为：
  - `PAD_TOP + STAFF_HEIGHT + PAD_BOTTOM`
- `PAD_TOP/PAD_BOTTOM` 通过常量控制（与 `LINE_SPACING`、`STEM_LENGTH`、`BEAM_THICKNESS`、`FLAG_HEIGHT`、ledger line 预留一起校准），目标是：
  - beam/flag 不贴顶
  - `Kick` 下行符干/旗尾不贴底
- 小节线/拍线/播放高亮 rect 的高度统一覆盖整个 `svgHeight`。

## 涉及文件
- 核心实现：`src/components/PatternEditor/DrumNotation.tsx`
- 可能新增（推荐，避免主组件膨胀）：
  - `src/components/PatternEditor/notationLayout.ts`：NoteEvent/RestEvent 构建、beam/flag/rest 布局计算、ledger line 判定
- 可选样式微调：`src/components/PatternEditor/DrumNotation.css`

## 边界场景清单（实现时逐项验证）
- 单音符：16分→1旗；32分→2旗
- 混合 16/32：16层 beam 覆盖全部；32层 beam 只覆盖 32
- 双32同格：能形成 32层 beam/或单独两旗
- 倚音：缩小+短符干+slash，不参与连梁；不应触发同拍 beam
- 加线：`Crash 1`/`Kick` 等 line=±2.5 必须出现 ledger line
- 休止符：
  - beat 内完全空 → 合并成四分休止
  - 半拍空 → 八分休止
  - 若 beat 内某个 16 格为空但其余有音 → 只在空段画合并后的休止
  - 若某格存在 32（半格被占用）→ 能在另一半格画 32休止（如果该 half-slot 真的空）

## 验收标准
- 五线谱为标准 5 线，无多余横线；需要处有短加线。
- stem/beam/flag 与符头连接自然、无明显缝隙。
- 32 分的第二层 beam/双旗正确。
- 倚音缩小+slash，且不参与连梁。
- 休止符只体现“整体声部”，并且拍内合并合理，不与现有符号互相遮挡。
- Notation 上下留白充足，播放高亮/竖线覆盖高度正确。

## 实施 Todos
- `layout-refactor`: 重构 DrumNotation 为 NoteEvent/RestEvent → 布局计算 → 分层绘制，复用现有符头/括号渲染
- `staff-5-lines-ledger`: 谱线改为标准 5 线，移除多余横线，并绘制 ledger line（上/下加线）
- `stem-beam-flag`: 实现符干连接点、16/32 两层连梁，以及单音符旗尾退化（16=1旗，32=2旗）
- `grace-style`: 实现倚音：缩小符头+短符干+slash，且不参与连梁/旗尾
- `rests-global-merge`: 实现整体声部休止符：拍内合并（4/8/16/32）并支持 32 half-slot 的空白推导与绘制
- `notation-sizing`: 调整 Notation 的 viewBox/高度/上下 padding，确保 beams/flags/ledger/rest 不贴边，且竖线/播放高亮覆盖正确


