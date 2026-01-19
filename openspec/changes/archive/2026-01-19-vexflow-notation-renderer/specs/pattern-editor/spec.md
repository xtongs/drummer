## ADDED Requirements

### Requirement: VexFlow 架子鼓线位映射

当选择 VexFlow 渲染器时，系统 SHALL 使用 VexFlow 原生 API 渲染标准鼓谱。

#### Drum Kit Mapping（VexFlow keys）

系统 SHALL 使用以下 VexFlow key 映射：

| DrumType       | VexFlow Key | Voice      |
| -------------- | ----------- | ---------- |
| Crash 1        | b/5         | Upper      |
| Crash 2        | a/5         | Upper      |
| Hi-Hat Open    | g/5         | Upper      |
| Hi-Hat Closed  | g/5         | Upper      |
| Ride           | f/5         | Upper      |
| Tom 1          | e/5         | Upper      |
| Tom 2          | d/5         | Upper      |
| Snare          | c/5         | Upper      |
| Tom 3          | a/4         | Upper      |
| Kick           | f/4         | Lower      |

### Implementation Notes: VexFlow 实现约束

#### Note: VexFlow 原生渲染

系统 SHALL 使用 VexFlow 原生 API 进行渲染，包括：

- `Stave`: 创建五线谱谱表
- `StaveNote`: 创建音符
- `Voice`: 组织音符
- `Formatter`: 格式化布局
- `Beam.generateBeams()`: 自动生成符杠

系统 SHALL NOT 使用自定义样式覆盖 VexFlow 默认渲染。

#### Requirement: 渲染区域背景

- 系统 SHALL 在 VexFlow 渲染时使用白色背景（`#ffffff`）
- 系统 SHALL NOT 使用主题色变量覆盖 VexFlow 默认颜色

#### Requirement: 不显示谱号

- 系统 SHALL NOT 在谱表上显示谱号（percussion clef）

#### Requirement: 五线谱垂直居中

- 系统 SHALL 使五线谱在渲染区域（高度 108px）内垂直居中
- VexFlow Stave 高度约 40px
- 计算公式：`STAFF_Y = (SVG_HEIGHT - STAVE_HEIGHT) / 2 - STAVE_INTERNAL_OFFSET`

#### Requirement: 小节宽度与网格对齐

- 每个小节的宽度 SHALL 等于 `beatsPerBar * SUBDIVISIONS_PER_BEAT * cellWidth`
- 小节宽度 SHALL 与下方 grid 区域的小节宽度一致

### Requirement: 符干方向（Stem Direction）

在 VexFlow 渲染器下，系统 SHALL 采用固定符干方向规则：

- **Lower Voice（Kick）**：符干向下（stemDirection: -1），符干在符头左边
- **Upper Voice（除 Kick 外）**：符干向上（stemDirection: 1），符干在符头右边

#### Scenario: 同一时刻 Kick 与其他鼓件同时发声

- **GIVEN** 同一 subdivision 同时激活 Kick 与其他鼓件
- **WHEN** 渲染鼓谱
- **THEN** Kick 的符干 SHALL 向下，其他鼓件的符干 SHALL 向上
- **AND** 二者在时间上 SHALL 对齐（同一时刻）

### Requirement: 同一时刻多鼓件排版策略

系统 SHALL 采用"上下双声部（two voices）"的鼓谱排版方式：

- **Lower Voice（下声部）**：仅包含 Kick，符干向下
- **Upper Voice（上声部）**：包含除 Kick 外所有鼓件，符干向上

两声部在同一小节内 SHALL 共享同一时间轴（tick context），并在同一 subdivision 的 **x 坐标对齐**。

#### Scenario: 上下声部同时发声

- **GIVEN** 同一 subdivision 同时激活 Kick 与 Upper Voice 任意鼓件
- **WHEN** 渲染鼓谱
- **THEN** Kick SHALL 渲染在下声部且符干向下
- **AND** 其他鼓件 SHALL 渲染在上声部且符干向上
- **AND** 两者的时间位置（x 坐标） SHALL 对齐

#### Scenario: 上声部同一时刻多鼓件使用 chord 堆叠

- **GIVEN** 同一 subdivision 同时激活多个 Upper Voice 鼓件
- **WHEN** 渲染鼓谱
- **THEN** 系统 SHOULD 在 Upper Voice 使用 chord（同一时刻单一 stem + 多个符头堆叠）表示同时发声

### Requirement: CellState 到记谱语义的映射（含 32 分）

系统 SHALL 将网格的单元格状态映射为可读的鼓谱符号。

#### Scenario: 32 分音符为真实 32 分（DOUBLE/FIRST/SECOND）

前提：系统当前网格以 subdivision 为时间栅格（通常为 16 分）。当用户在单元格上循环 32 分状态时，系统 SHALL 将该 subdivision 拆分为两个连续的 32 分时间点进行渲染：

- `CELL_DOUBLE_32`：渲染两个 32 分音符（第 1 个 + 第 2 个）
- `CELL_FIRST_32`：仅渲染第 1 个 32 分音符
- `CELL_SECOND_32`：仅渲染第 2 个 32 分音符

### Requirement: 符杠连接规则

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 连续的 16 分或 32 分音符需要符杠连接
- **THEN** 系统 SHALL 使用 `Beam.generateBeams()` 自动生成符杠
- **AND** 上声部符杠使用 `stemDirection: 1`
- **AND** 下声部符杠使用 `stemDirection: -1`

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
- **AND** 该控件 SHALL 为"音符 SVG 图标"的 button 按钮（不使用文字标签）
- **AND** 默认样式 SHOULD 与 `pattern-tab` 一致
- **AND** 当渲染器为 VexFlow 时，该按钮 SHALL 处于 active 状态，背景色为 primary
- **AND** 用户点击该按钮时：
  - 若当前为 Legacy，系统 SHALL 切换为 VexFlow 渲染
  - 若当前为 VexFlow，系统 SHALL 切换回 Legacy 渲染

#### Scenario: 实时同步

- **GIVEN** Pattern 网格有内容
- **WHEN** 用户编辑网格
- **THEN** 鼓谱实时更新显示
- **AND** 当选择 VexFlow 渲染器时，系统 SHALL 使用 VexFlow 原生 API 渲染标准鼓谱
- **AND** 当选择 Legacy 渲染器时，系统 MAY 使用自绘 SVG 实现

#### Scenario: 播放位置指示

- **GIVEN** Pattern 正在播放
- **WHEN** 每个 subdivision 到达
- **THEN** 鼓谱上显示当前播放位置指示器（半透明黄色高亮）

#### Scenario: 垂直布局一致（切换无跳变）

- **GIVEN** 用户在 Legacy 与 VexFlow 之间切换渲染器
- **WHEN** 渲染器切换发生
- **THEN** 鼓谱区域的整体高度 SHALL 与 Legacy 一致（108px）
- **AND** 五线谱在鼓谱区域内 SHOULD 垂直居中
- **AND** 切换时不出现高度变化或明显跳动

#### Scenario: 双击跳转播放位置

- **GIVEN** 用户正在查看鼓谱区域
- **WHEN** 用户双击/双触鼓谱区域某一位置
- **THEN** 系统 SHALL 计算对应的 subdivision 并触发跳转
- **AND** 在不同渲染器下该映射行为一致
