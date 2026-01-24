# Pattern Editor 规范

## 概述

Pattern Editor 是 Drummer 的核心编辑界面，提供网格编辑器、鼓谱显示、小节控制等功能。

## 需求

### Requirement: 网格编辑

系统 SHALL 提供交互式网格编辑器，允许用户编辑鼓点。

#### Scenario: 点击切换单元格

- **GIVEN** 网格已渲染
- **WHEN** 用户点击单元格
- **THEN** 单元格状态在 OFF 与"激活状态"之间切换（OFF ↔ NORMAL）
- **AND** 若单元格处于 Ghost/Grace 等激活子状态，点击后也会切换回 OFF
- **AND** 视觉反馈立即更新

#### Scenario: 长按切换鬼音

- **GIVEN** 单元格处于激活状态（NORMAL / GHOST / GRACE）
- **WHEN** 用户长按单元格（>300ms）
- **THEN** 单元格音符类型在以下循环切换：NORMAL → GHOST → GRACE → NORMAL
- **AND** 显示对应的视觉样式

#### Scenario: 双击循环 32 分音符

- **GIVEN** 网格已渲染
- **WHEN** 用户双击单元格
- **THEN** 状态在以下循环：NORMAL → DOUBLE_32 → FIRST_32 → SECOND_32 → NORMAL
- **AND** 若单元格处于 OFF，双击会先进入 NORMAL

### Requirement: 鼓谱显示

系统 SHALL 使用 VexFlow 渲染器显示五线谱格式的鼓谱。

#### Note: 渲染器固定

- 系统 SHALL 始终使用 VexFlow 渲染器，不再提供渲染器切换选项
- 渲染器选择不再从 localStorage 读取
- Legacy 渲染器代码保留但不再使用

#### Scenario: VexFlow 渲染异常时静默回退

- **GIVEN** 当前选择的渲染器为 VexFlow
- **WHEN** VexFlow 渲染过程发生异常导致鼓谱无法完成绘制
- **THEN** 系统 SHALL 自动回退到 Legacy 渲染器以保证鼓谱区域可用
- **AND** 该回退 SHALL 为静默回退（不强制弹出提示）

#### Scenario: 实时同步

- **GIVEN** Pattern 网格有内容
- **WHEN** 用户编辑网格
- **THEN** 鼓谱实时更新显示
- **AND** 系统 SHALL 使用 VexFlow 原生 API 渲染标准鼓谱

#### Scenario: 移动端双击支持

- **GIVEN** 用户在移动设备上使用鼓谱区域
- **WHEN** 用户在 300ms 内、30px 距离内连续两次触摸鼓谱
- **THEN** 系统 SHALL 触发双击事件，计算对应的 subdivision 并跳转播放位置

#### Scenario: 鬼音符样式缩放

- **GIVEN** 鼓谱区域已渲染鬼音（ghost note）
- **WHEN** 渲染鬼音符符头
- **THEN** 系统 SHALL 对鬼音符符头应用 0.75 倍缩放
- **AND** Kick 鬼音符向左偏移 2px
- **AND** 其他鼓件鬼音符向右偏移 2px

#### Scenario: 鼓谱符头样式（常见鼓谱）

- **GIVEN** 鼓谱区域已渲染
- **WHEN** 渲染鼓谱音符
- **THEN** 系统 SHOULD 使用常见鼓谱的符号表达（例如镲片 X、Crash 的 ○内 X 等）

#### Scenario: 鼓谱颜色一致性

- **GIVEN** 鼓谱区域已渲染
- **WHEN** 使用 VexFlow 渲染器绘制五线谱与音符
- **THEN** 五线谱线条与音符颜色 SHALL 遵循统一的主题色方案

#### Scenario: 符杠连接规则

- **GIVEN** 鼓谱使用 VexFlow 渲染器
- **WHEN** 连续的 16 分或 32 分音符需要符杠连接
- **THEN** 系统 SHALL 使用 `Beam.generateBeams()` 自动生成符杠
- **AND** 上声部符杠使用 `stemDirection: 1`
- **AND** 下声部符杠使用 `stemDirection: -1`
- **AND** 系统 SHALL 按半小节分组音符并分别生成符杠
- **AND** 若半小节内包含十六分音符，按每拍（1/4 小节）分组生成符杠
- **AND** 若半小节内无十六分音符，整个半小节生成单一符杠

#### Scenario: 五线谱位置

- **GIVEN** 鼓谱区域已渲染
- **WHEN** 渲染谱线背景
- **THEN** 系统使用"六线谱"视觉（最上方线等价于上加一线）

#### Scenario: 垂直布局

- **GIVEN** 鼓谱区域已渲染
- **WHEN** 渲染完成
- **THEN** 鼓谱区域的整体高度 SHALL 为 108px
- **AND** 五线谱在鼓谱区域内 SHOULD 垂直居中

#### Scenario: 音符水平位置与网格对齐

- **GIVEN** 鼓谱区域与下方网格区域共享相同的 subdivision 栅格
- **WHEN** 渲染任意 subdivision 上的音符
- **THEN** 音符的水平位置 SHALL 与对应网格单元格的中心对齐

#### Scenario: 播放位置指示

- **GIVEN** Pattern 正在播放
- **WHEN** 每个 subdivision 到达
- **THEN** 鼓谱上显示当前播放位置指示器（半透明黄色高亮）

#### Scenario: 双击跳转播放位置

- **GIVEN** 用户正在查看鼓谱区域
- **WHEN** 用户双击/双触鼓谱区域某一位置
- **THEN** 系统 SHALL 计算对应的 subdivision 并触发跳转
- **AND** 在不同渲染器下该映射行为一致

### Requirement: 练习模式背景音乐控件

系统 SHALL 仅在练习模式下提供背景音乐上传与控制 UI。

#### Scenario: 控件可见性与布局

- **GIVEN** 系统处于练习模式
- **WHEN** Pattern Editor 渲染
- **THEN** 背景音乐控件 SHALL 显示在 scrollable 区域下方
- **AND** 控件两端对齐排列
- **AND** 练习模式切换按钮显示在 Pattern Editor 操作区，位于保存按钮左侧

#### Scenario: 控件样式

- **GIVEN** 背景音乐控件渲染
- **WHEN** 渲染上传/控制按钮
- **THEN** 按钮样式 SHALL 遵循现有按钮规范
- **AND** 使用 SVG 图标（练习模式按钮为音符，上传按钮为上传图标）
- **AND** 控件包含音量与偏移量调节，均为图标 + 数字 + +/- 按钮布局

#### Scenario: 播放位置同步

- **GIVEN** 用户暂停播放并移动鼓谱游标到新位置
- **WHEN** 用户再次开始播放
- **THEN** 背景音乐播放位置 SHALL 与当前游标位置对齐
- **AND** 应用已设置的偏移量
- **AND** 背景音乐位置基于当前 subdivision 的绝对时间

### Requirement: Loop Range 游标对齐

系统 SHALL 在调整 loop range 后对齐游标位置。

#### Scenario: 调整起始小节

- **GIVEN** 用户调整 loop range 的起始小节
- **WHEN** 当前 pattern 与起始 pattern 相同
- **THEN** 游标 SHALL 跳转到新的起始小节

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

### Requirement: VexFlow 实现约束

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

### Requirement: 小节控制

系统 SHALL 允许用户增减小节数量。

#### Scenario: 增加小节

- **GIVEN** 当前小节数 >= 1
- **WHEN** 用户点击 "+" 按钮
- **THEN** 在当前游标位置附近插入新小节（插入位置按"智能插入位置"规则）
- **AND** 新小节内容为"复制插入位置附近的小节内容"（当前实现为复制被参考的小节）
- **AND** 若循环范围为"当前 Pattern 的单 Pattern 循环"，终点 SHOULD 自动扩展到新增小节（跨 Pattern 循环不自动扩展）

#### Scenario: 减少小节

- **GIVEN** 当前小节数 > 1
- **WHEN** 用户点击 "-" 按钮
- **THEN** 删除当前游标所在小节（无游标时删除最后一个小节）
- **AND** 若循环范围超出新的小节数，系统 SHOULD 自动调整循环范围

#### Scenario: 智能插入位置

- **GIVEN** 正在播放且有播放位置
- **WHEN** 用户点击 "+" 按钮
- **THEN** 根据播放位置判断插入位置：
  - 在小节前半部分：在该小节前插入
  - 在小节后半部分：在该小节后插入

### Requirement: 清空网格

系统 SHALL 允许用户一键清空所有鼓点。

#### Scenario: 清空确认

- **GIVEN** 网格中有鼓点
- **WHEN** 用户点击清空按钮
- **THEN** 所有单元格重置为 CELL_OFF
- **AND** 不改变小节数和其他设置

### Requirement: 水平滚动

系统 SHALL 支持网格和鼓谱的水平滚动。

#### Scenario: 手动滚动

- **GIVEN** Pattern 小节数较多（超出视口）
- **WHEN** 用户水平滑动
- **THEN** 网格和鼓谱同步滚动

#### Scenario: 播放时自动滚动

- **GIVEN** Pattern 正在播放
- **WHEN** 播放位置即将超出视口
- **THEN** 自动滚动使播放位置保持可见
- **AND** 滚动平滑，不影响用户体验

### Requirement: 手机横屏布局模式

系统 SHALL 在手机横屏时进入横屏布局模式，并根据该模式调整编辑器布局。

#### Scenario: 进入横屏布局模式

- **GIVEN** 用户在手机设备上使用应用
- **WHEN** 设备处于横屏方向
- **THEN** 系统 SHALL 进入横屏布局模式

#### Scenario: 横屏布局模式布局

- **GIVEN** 系统处于横屏布局模式
- **WHEN** Pattern Editor 渲染
- **THEN** notation 区域 SHALL 在视口内展示两个小节

### Requirement: 手动练习模式

系统 SHALL 提供手动练习模式开关，并在开启后应用练习模式布局。

#### Scenario: 切换练习模式

- **GIVEN** 用户点击练习模式切换按钮
- **WHEN** 开关被触发
- **THEN** 系统 SHALL 切换练习模式状态

#### Scenario: 练习模式布局

- **GIVEN** 系统处于练习模式
- **WHEN** Pattern Editor 渲染
- **THEN** grid 区域 SHALL 隐藏

### Requirement: 性能优化（Lazy Loading）

系统 SHALL 使用 lazy loading 优化长 Pattern 的渲染性能。

#### Scenario: 视口外内容不渲染

- **GIVEN** Pattern 包含多个小节（超出视口宽度）
- **WHEN** 用户滚动到特定区域
- **THEN** 系统只渲染视口可见区域及缓冲区内的内容
- **AND** 视口外的小节/单元格不创建 DOM 节点
- **AND** 滚动时动态更新可见区域

#### Scenario: 鼓谱 Lazy Loading

- **GIVEN** 鼓谱区域已渲染
- **WHEN** 视口内显示部分小节
- **THEN** VexFlow 只渲染可见小节及缓冲区的小节
- **AND** 缓冲区大小建议为 1-2 个小节
- **AND** 滚动后自动重新计算并渲染新可见区域

### Requirement: Pattern 标签页

系统 SHALL 显示已保存的 Pattern 标签页。

#### Scenario: 切换 Pattern

- **GIVEN** 有多个已保存的 Pattern
- **WHEN** 用户点击标签
- **THEN** 加载对应的 Pattern 到编辑器
- **AND** 如有未保存更改，提示用户

#### Scenario: 草稿模式

- **GIVEN** 用户点击草稿标签（○）
- **WHEN** 切换到草稿模式
- **THEN** 显示临时编辑区
- **AND** 草稿不会自动保存

### Requirement: 导入/导出

系统 SHALL 支持 Pattern 的导入和导出。

#### Scenario: 长按导出

- **GIVEN** 当前编辑的是已保存的 Pattern
- **WHEN** 用户长按保存按钮
- **THEN** 将 Pattern JSON 复制到剪贴板
- **OR** 显示可选择复制的文本框（如剪贴板 API 不可用）

#### Scenario: 导入 Pattern

- **GIVEN** 用户有有效的 Pattern JSON
- **WHEN** 通过导入功能粘贴
- **THEN** 验证 JSON 格式
- **AND** 成功则创建新 Pattern
- **AND** 失败则显示错误提示

## 单元格状态视觉样式

| 状态           | 外观          | 描述       |
| -------------- | ------------- | ---------- |
| CELL_OFF       | 空白/透明     | 未激活     |
| CELL_NORMAL    | 实心圆点      | 正常音符   |
| CELL_GHOST     | 半透明圆点    | 鬼音（弱） |
| CELL_GRACE     | 渐变填充      | 倚音       |
| CELL_DOUBLE_32 | 双圆点        | 双 32 分   |
| CELL_FIRST_32  | 左半圆点      | 前半 32 分 |
| CELL_SECOND_32 | 右半圆点      | 后半 32 分 |

## 技术约束

### 单元格尺寸

- 动态计算，适应不同屏幕宽度
- 最小 24px，最大 48px
- 使用 `useGridCellSize` hook 计算

### 触摸交互

- 支持触摸设备
- 防止滚动时误触发编辑
- 长按延迟: 300ms
