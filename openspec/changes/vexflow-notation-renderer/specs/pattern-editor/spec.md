## ADDED Requirements

### Reference: 视觉预期示例图

- 参考图片：`openspec/changes/vexflow-notation-renderer/specs/pattern-editor/assets/DEMO.png`

### Requirement: VexFlow 架子鼓线位与符头映射（标准鼓谱）

当选择 VexFlow 渲染器时，系统 SHALL 按以下“常见架子鼓鼓谱”约定渲染鼓件线位与符头形状。

#### Drum Kit Mapping（从上到下计数）

说明：

- **五线谱严格为 5 线**，从上到下为 Line1..Line5；其间的 4 个间为 Space1..Space4。
- **上加一线（Ledger +1）不作为完整谱线绘制**：仅在需要时，在音符符头背后绘制一段短的上加一线。

| DrumType       | Staff Position                         | Notehead                 | Extra Mark           |
| -------------- | -------------------------------------- | ------------------------ | -------------------- |
| Crash1         | Ledger+1 **上方**（Ledger+1 上方的间） | **○ 内带 X**             | 无                   |
| Crash2         | Ledger+1 **线上**                      | **○ 内带 X**             | 无                   |
| HiHat (closed) | Ledger+1 与 Line1 之间的 **上+1 间**   | **X**                    | 无                   |
| HiHat (open)   | 同 HiHat (closed)                      | **X**                    | **符头上方加小 “o”** |
| Ride           | Line1 线上                             | **X**                    | 无                   |
| Tom1           | Space1                                 | 实心椭圆（普通音符符头） | 无                   |
| Tom2           | Line2 线上                             | 实心椭圆（普通音符符头） | 无                   |
| Snare          | Space2（从上数第二间）                 | 实心椭圆（普通音符符头） | 无                   |
| Tom3           | Space3（从上数第三间）                 | 实心椭圆（普通音符符头） | 无                   |
| Kick           | Space4                                 | 实心椭圆（普通音符符头） | 无                   |

#### Scenario: 上加一线（短线）绘制

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 某音符的线位落在上加一线（Ledger+1）或其上方需要辅助线
- **THEN** 系统 SHALL 仅在该音符符头背后绘制一段短的上加一线
- **AND** 系统 SHALL NOT 绘制完整贯穿的上加一线

#### Scenario: 镲片符头与实心符头尺寸协调

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 同一谱面同时存在镲片类（X / ○ 内 X）与鼓类（实心椭圆）符头
- **THEN** 系统 SHOULD 使两类符头在视觉尺寸上协调（不显著过大或过小）

### Implementation Notes: VexFlow 落地约束（避免不可实现/歧义）

本小节用于将“鼓谱语义需求”落地为 VexFlow 可实现的技术约束；当 VexFlow 能力与期望符号存在差异时，本小节定义允许的实现方式与降级策略。

#### Note: VexFlow 的核心抽象（与本需求相关）

- VexFlow 支持多声部对齐：通过多个 `Voice` + `Formatter.joinVoices(...).format(...)` 共享 tick context（用于上下声部 x 对齐）。
- VexFlow 支持符杠：可对一组音符创建 `Beam`（可自动生成，也可手动分组）。
- VexFlow 休止符的垂直位置受“rest 的 key/line”影响（实现上需要一个固定的“居中 rest 位置”选择）。
- VexFlow 会在音符超出谱线时绘制短辅助线（符合本规范对上加一线的要求：需要时才画短线，而非完整第六线）。

#### Requirement: VexFlow key/line 的确定性映射

系统 SHALL 为本规范中的 `Staff Position`（Line/Space/Ledger）建立一个**确定性的** VexFlow 映射，使每个 `DrumType` 的符头最终落在表格指定线位。

- 实现 MAY 通过以下任一方式达成（实现任选其一，但结果必须一致）：
  - **方式 A**：为每个 `DrumType` 选择一组固定的 VexFlow `keys` 字符串，使其在 percussion clef 下落在指定线位
  - **方式 B**：在创建 `StaveNote` 后，覆盖/校正每个 key 的 staff line（例如通过 per-key 的 line 属性或等价机制），从而不依赖具体 pitch 名称

#### Requirement: Crash 的 “○ 内 X” 符头降级策略

由于 “○ 内 X” 可能依赖字体/字形支持，系统 SHALL 采用以下策略确保可实现性：

- 优先（SHALL）：当 VexFlow 字体提供“circled-x notehead”字形时，使用该字形渲染 Crash1/Crash2
- 否则（SHALL）：使用 “X 符头 + 圆形叠加” 的组合绘制来近似 “○ 内 X”
- 若以上两者均不可稳定实现（SHALL）：Crash1/Crash2 MAY 降级为普通 “X” 符头（仍保持线位正确）

#### Requirement: Upper Voice 同时多鼓件的混合符头（X + 实心椭圆）

当同一 subdivision 内 Upper Voice 同时存在镲片类（X）与鼓类（实心椭圆）时，系统 SHALL 保持两类符头在同一时间点对齐，并允许采用以下实现方式：

- 优先（SHALL）：若 VexFlow 支持同一 chord 内对不同 key 使用不同符头字形，则使用单一 chord 堆叠实现
- 否则（SHALL）：使用 **overlay** 实现：在同一 tick/time 位置叠加多个 `StaveNote`（例如一个只包含镲片类符头、一个只包含鼓类符头），并确保：
  - 视觉上仍呈现“同一时刻多符头堆叠”
  - 不出现重复的符干/符杠（需要隐藏/共享 stem/beam）

#### Requirement: 与网格 subdivision 的水平对齐（固定栅格）

由于本产品鼓谱与网格共享 subdivision 栅格，系统 SHALL 使用“固定栅格”的水平排版规则：

- 每个 subdivision 对应一个固定宽度区间，其中心点为该 subdivision 的 note 对齐基准
- 32 分拆分（FIRST/SECOND）在该 subdivision 区间内以 1/2 + 1/2 均分
- 实现 SHALL NOT 依赖“按时值比例自动分配间距”的默认排版来满足本对齐要求（实现需要显式控制每个 tick 的 x 坐标，或使用等价的手动排版策略）

#### Requirement: 简化休止符（rests）的可实现细节

- 系统 SHALL 仅在“整拍或更长连续空白”时生成 rest tickables（短空隙可省略）
- rest 的垂直位置 SHALL 选择一个固定“居中位置”（实现时通过 rest 的 key/line 或等价配置实现），避免贴近最上/最下线

### Requirement: CellState 到记谱语义的映射（含 32 分与倚音）

系统 SHALL 将网格的单元格状态映射为可读的鼓谱符号。该映射用于 VexFlow 渲染器；Legacy 渲染器 MAY 继续使用自绘 SVG 表达。

#### Scenario: 鬼音（Ghost）显示为缩小符头

- **GIVEN** 某单元格处于 `CELL_GHOST`
- **WHEN** 渲染鼓谱
- **THEN** 系统 SHOULD 以“缩小的符头”表示弱音（ghost note）

#### Scenario: 倚音（Grace）为前倚音、不占时值

- **GIVEN** 某单元格处于 `CELL_GRACE`
- **WHEN** 渲染鼓谱
- **THEN** 系统 SHOULD 将其表现为**前倚音**（grace note）
- **AND** 该倚音 SHALL NOT 占用额外时值（不改变网格 subdivision 的时间对齐）
- **AND** 该倚音 SHOULD 不带斜杠
- **AND** 该倚音 SHOULD 以“小符头”形式显示在主音符之前（视觉前置）

#### Scenario: 32 分音符为真实 32 分（DOUBLE/FIRST/SECOND）

前提：系统当前网格以 subdivision 为时间栅格（通常为 16 分）。当用户在单元格上循环 32 分状态时，系统 SHALL 将该 subdivision 拆分为两个连续的 32 分时间点进行渲染：

- `CELL_DOUBLE_32`：渲染两个 32 分音符（第 1 个 + 第 2 个）
- `CELL_FIRST_32`：仅渲染第 1 个 32 分音符
- `CELL_SECOND_32`：仅渲染第 2 个 32 分音符

#### Scenario: 32 分音符与网格水平对齐

- **GIVEN** 某 subdivision 内存在 32 分拆分状态
- **WHEN** 渲染鼓谱
- **THEN** 两个 32 分音符的水平位置 SHALL 在该 subdivision 对应的网格单元格范围内均匀分布（1/2 + 1/2）
- **AND** 该 subdivision 的中心对齐规则（与网格中心对齐）仍适用于该 subdivision 的整体位置计算

#### Scenario: 双击跳转仍以 subdivision 为单位

- **GIVEN** 鼓谱中存在 32 分音符拆分显示
- **WHEN** 用户在鼓谱区域双击/双触某一位置以跳转播放
- **THEN** 系统 SHALL 仍以 subdivision（网格栅格）计算跳转目标
- **AND** 系统 SHALL NOT 要求用户精确跳转到 subdivision 内的 32 分半格位置

### Requirement: 符干方向（Stem Direction）

在 VexFlow 渲染器下，系统 SHALL 采用固定符干方向规则：

- **Kick**：符干向下
- **除 Kick 外其他鼓件**：符干向上

#### Scenario: 同一时刻 Kick 与其他鼓件同时发声

- **GIVEN** 同一 subdivision 同时激活 Kick 与其他鼓件
- **WHEN** 渲染鼓谱
- **THEN** Kick 的符干 SHALL 向下，其他鼓件的符干 SHALL 向上
- **AND** 二者在时间上 SHALL 对齐（同一时刻）

### Requirement: 同一时刻多鼓件排版策略（与示例图片一致）

系统 SHALL 采用“上下双声部（two voices）”的鼓谱排版方式（与常见架子鼓鼓谱一致）：

- **Lower Voice（下声部）**：仅包含 Kick，符干向下
- **Upper Voice（上声部）**：包含除 Kick 外所有鼓件与镲片，符干向上

两声部在同一小节内 SHALL 共享同一时间轴（tick context），并在同一 subdivision 的 **x 坐标对齐**。

#### Scenario: 上下声部同时发声（符合示例图片的排版）

- **GIVEN** 同一 subdivision 同时激活 Kick 与 Upper Voice 任意鼓件（例如 Snare 或 HiHat）
- **WHEN** 渲染鼓谱
- **THEN** Kick SHALL 渲染在下声部且符干向下
- **AND** 其他鼓件 SHALL 渲染在上声部且符干向上
- **AND** 两者的时间位置（x 坐标） SHALL 对齐

#### Scenario: 上声部同一时刻多鼓件使用 chord 堆叠

- **GIVEN** 同一 subdivision 同时激活多个 Upper Voice 鼓件（例如 HiHat + Snare）
- **WHEN** 渲染鼓谱
- **THEN** 系统 SHOULD 在 Upper Voice 使用 chord（同一时刻单一 stem + 多个符头堆叠）表示同时发声
- **AND** 这些符头在各自的 staff position 上垂直分离，且共享同一时间位置（x 坐标）

#### Scenario: Snare 与 Tom3 同一时刻同时发声不重叠

- **GIVEN** 同一 subdivision 同时激活 Snare（Space2）与 Tom3（Space3）
- **WHEN** 渲染鼓谱
- **THEN** 两个符头 SHALL 在各自线位上清晰分离（不重叠）
- **AND** 二者共享同一时间位置（x 坐标）

#### Scenario: 声部休止符显示（gaps）

- **GIVEN** 某一声部在连续的 subdivision 区间内没有任何音符
- **WHEN** 渲染鼓谱
- **THEN** 系统 SHOULD 采用“简化休止符”策略：仅在**整拍**或更长的连续空白区间显示休止符
- **AND** 对于短于一拍的细碎空拍（例如 16 分或 32 分级别的空隙），系统 MAY 省略休止符以保持谱面简洁
- **AND** 休止符的默认垂直位置 SHOULD 采用鼓谱常见的“居中”位置（避免贴近最上/最下线导致难读）

#### Scenario: “整拍（Beat）”的定义（基于 timeSignature）

- **GIVEN** Pattern 的 `timeSignature` 为 \([numerator, denominator]\)
- **WHEN** 规范中提到“整拍（beat）”
- **THEN** 系统 SHALL 将 **1 拍** 定义为分母 `denominator` 对应的音符时值（例如 denominator=4 表示四分音符为 1 拍；denominator=8 表示八分音符为 1 拍）
- **AND** 系统 SHALL 将每小节拍数定义为 `numerator`
- **AND** 系统 SHOULD 以该 beat 定义作为“整拍空白阈值”的判断依据

#### Scenario: 简化休止符示例（一拍阈值）

- **GIVEN** 上声部在某一拍（一个 beat）内完全没有音符
- **WHEN** 渲染鼓谱
- **THEN** 系统 SHOULD 在该拍范围内显示对应时值的休止符（例如四分休止符或等效组合）
- **AND** 若同一拍内仅存在部分 subdivision 为空（非整拍空白），系统 MAY 不绘制额外休止符

#### Scenario: Beat 定义示例

- **GIVEN** `timeSignature=[4,4]`
- **WHEN** 判断“整拍空白”
- **THEN** 1 拍 SHALL 等于四分音符，且每小节为 4 拍

- **GIVEN** `timeSignature=[6,8]`
- **WHEN** 判断“整拍空白”
- **THEN** 1 拍 SHALL 等于八分音符，且每小节为 6 拍

## MODIFIED Requirements

### Requirement: 鼓谱显示

系统 SHALL 显示五线谱格式的鼓谱，并允许用户选择渲染器实现。

#### Scenario: 渲染器切换

- **GIVEN** 鼓谱区域已渲染
- **WHEN** 用户在 UI 中切换鼓谱渲染方式（VexFlow / Legacy）
- **THEN** 鼓谱立即使用新的渲染方式重新绘制
- **AND** 用户选择在刷新页面后仍然保持
- **AND** 渲染器选择 SHALL 为全局设置（不随单个 Pattern 单独保存）
- **AND** 系统 SHALL 将该选择持久化到 localStorage，key 为 `drummer-notation-renderer`

#### Scenario: VexFlow 渲染异常时静默回退

- **GIVEN** 当前选择的渲染器为 VexFlow
- **WHEN** VexFlow 渲染过程发生异常导致鼓谱无法完成绘制
- **THEN** 系统 SHALL 自动回退到 Legacy 渲染器以保证鼓谱区域可用
- **AND** 该回退 SHALL 为静默回退（不强制弹出提示）

#### Scenario: 切换控件的最小 UI 约束

- **GIVEN** Pattern Editor 已渲染且包含鼓谱区域
- **WHEN** 用户需要切换鼓谱渲染方式
- **THEN** 系统 SHALL 在 `pattern-editor-actions-right` 区域提供一个可点击的切换控件
- **AND** 该控件 SHALL 位于 `pattern-editor-actions-right` 内部的最左侧
- **AND** 该控件 SHALL 为“音符 SVG 图标”的 button 按钮（不使用文字标签）
- **AND** 默认样式 SHOULD 与 `pattern-tab` 一致
- **AND** 当渲染器为 VexFlow 时，该按钮 SHALL 处于 active 状态，背景色为 primary
- **AND** 用户点击该按钮时：
  - 若当前为 Legacy，系统 SHALL 切换为 VexFlow 渲染
  - 若当前为 VexFlow，系统 SHALL 切换回 Legacy 渲染

#### Scenario: 实时同步

- **GIVEN** Pattern 网格有内容
- **WHEN** 用户编辑网格
- **THEN** 鼓谱实时更新显示
- **AND** 当选择 VexFlow 渲染器时，系统 SHOULD 使用 VexFlow 渲染标准鼓谱符号
- **AND** 当选择 Legacy 渲染器时，系统 MAY 使用自绘 SVG 实现

#### Scenario: 播放位置指示

- **GIVEN** Pattern 正在播放
- **WHEN** 每个 subdivision 到达
- **THEN** 鼓谱上显示当前播放位置指示器

#### Scenario: 鼓谱符头样式（常见鼓谱）

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 渲染鼓谱音符
- **THEN** 系统 SHOULD 使用常见鼓谱的符头样式（区别于普通五线谱默认符头）
- **AND** 具体线位与符头映射 SHALL 以本规范 “VexFlow 架子鼓线位与符头映射（标准鼓谱）” 为准

#### Scenario: 鼓谱颜色一致性

- **GIVEN** 鼓谱区域已渲染
- **WHEN** 使用 Legacy 或 VexFlow 渲染器绘制五线谱与音符
- **THEN** 五线谱线条与音符颜色 SHALL 与 Legacy 绘制一致（使用同一套主题色变量）

#### Scenario: 符杠连接规则

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 连续的 16 分或 32 分音符需要符杠连接
- **THEN** 系统 SHOULD 按常见鼓谱规则在拍内进行分组连接（以 beat 为边界；beat 定义见本规范 “整拍（Beat）的定义”）
- **AND** 休止符或拍边界会打断符杠连接
- **AND** 当 subdivision 内存在 32 分拆分时，系统 SHOULD 使用 32 分符杠（相较 16 分多一层杠）表现其时值

#### Scenario: 不处理 compound meter 的分组拍规则（本次范围）

- **GIVEN** 拍号为 6/8、9/8、12/8 等 compound meter
- **WHEN** 进行符杠分组（beaming）
- **THEN** 本次实现 MAY 仍按分母定义的 beat 进行分组（例如 6/8 视为 6 个八分拍）
- **AND** 系统 SHALL NOT 要求按“分组拍”（例如 6/8 按附点四分的 2 拍）进行特殊分组

#### Scenario: 五线谱位置与六线谱偏移

- **GIVEN** Legacy 渲染器使用“六线谱”视觉（其中最上方线等价于 VexFlow 的上加一线）
- **WHEN** 使用 VexFlow 渲染器渲染五线谱
- **THEN** 系统 SHALL 使用严格五线谱渲染（不绘制完整的第 6 线）
- **AND** 系统 SHALL 将 Legacy 的“最上方线”语义视为上加一线（Ledger +1），并仅在需要时绘制短上加一线（见本规范的映射表与相关场景）

#### Scenario: 垂直布局一致（切换无跳变）

- **GIVEN** 用户在 Legacy 与 VexFlow 之间切换渲染器
- **WHEN** 渲染器切换发生
- **THEN** 鼓谱区域的整体高度 SHALL 与 Legacy 一致
- **AND** 五线谱在鼓谱区域内 SHOULD 垂直居中
- **AND** 切换时不出现高度变化或明显跳动

#### Scenario: 音符水平位置与网格对齐

- **GIVEN** 鼓谱区域与下方网格区域共享相同的 subdivision 栅格
- **WHEN** 渲染任意 subdivision 上的音符
- **THEN** 音符的水平位置 SHALL 与对应网格单元格的中心对齐（如 Legacy 的绘制方式）

#### Scenario: 双击跳转播放位置

- **GIVEN** 用户正在查看鼓谱区域
- **WHEN** 用户双击/双触鼓谱区域某一位置
- **THEN** 系统 SHALL 计算对应的 subdivision 并触发跳转
- **AND** 在不同渲染器下该映射行为一致
