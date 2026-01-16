## ADDED Requirements

### Reference: 视觉预期示例图

- 参考图片：`openspec/changes/vexflow-notation-renderer/specs/pattern-editor/assets/DEMO.png`

### Requirement: VexFlow 架子鼓线位与符头映射（标准鼓谱）

当选择 VexFlow 渲染器时，系统 SHALL 按以下“常见架子鼓鼓谱”约定渲染鼓件线位与符头形状。

#### Drum Kit Mapping（从上到下计数）

说明：
- **五线谱严格为 5 线**，从上到下为 Line1..Line5；其间的 4 个间为 Space1..Space4。
- **上加一线（Ledger +1）不作为完整谱线绘制**：仅在需要时，在音符符头背后绘制一段短的上加一线。

| DrumType | Staff Position | Notehead | Extra Mark |
|---|---|---|---|
| Crash1 | Ledger+1 **上方**（Ledger+1 上方的间） | **○ 内带 X** | 无 |
| Crash2 | Ledger+1 **线上** | **○ 内带 X** | 无 |
| HiHat (closed) | Ledger+1 与 Line1 之间的 **上+1间** | **X** | 无 |
| HiHat (open) | 同 HiHat (closed) | **X** | **符头上方加小 “o”** |
| Ride | Line1 线上 | **X** | 无 |
| Tom1 | Space1 | 实心椭圆（普通音符符头） | 无 |
| Tom2 | Line2 线上 | 实心椭圆（普通音符符头） | 无 |
| Snare | Space2（从上数第二间） | 实心椭圆（普通音符符头） | 无 |
| Tom3 | Space3（从上数第三间） | 实心椭圆（普通音符符头） | 无 |
| Kick | Space4 | 实心椭圆（普通音符符头） | 无 |

#### Scenario: 上加一线（短线）绘制

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 某音符的线位落在上加一线（Ledger+1）或其上方需要辅助线
- **THEN** 系统 SHALL 仅在该音符符头背后绘制一段短的上加一线
- **AND** 系统 SHALL NOT 绘制完整贯穿的上加一线

#### Scenario: 镲片符头与实心符头尺寸协调

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 同一谱面同时存在镲片类（X / ○内X）与鼓类（实心椭圆）符头
- **THEN** 系统 SHOULD 使两类符头在视觉尺寸上协调（不显著过大或过小）

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
