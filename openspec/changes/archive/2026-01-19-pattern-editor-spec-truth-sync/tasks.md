# Tasks: 同步 Pattern Editor 规范为当前实现（truth sync，仅文档）

## 1. 规范修正

- [x] 1.1 修正“鼓谱显示”条款为当前 Legacy 自绘 SVG 实现（六线谱视觉），移除/降级未实现的 VexFlow 切换描述
- [x] 1.2 修正“网格编辑”交互：长按循环 Normal→Ghost→Grace→Normal；双击 32 分循环可从 OFF 进入 NORMAL
- [x] 1.3 修正“小节控制”：增加小节为复制当前小节内容；删除小节按游标所在小节删除（无游标则删最后）
- [x] 1.4 修正“播放位置指示”：当前为按 subdivision 高亮（非平滑移动）
- [x] 1.5 修正“单元格状态视觉样式”表格与当前 CSS 表达一致（ghost 半透明、grace 渐变、32 分条形）

## 2. 验证

- [x] 2.1 自查规范条款可从现有代码直接推导（不依赖未来实现）
- [x] 2.2 与 `changes/vexflow-notation-renderer/` 的规划边界不冲突

