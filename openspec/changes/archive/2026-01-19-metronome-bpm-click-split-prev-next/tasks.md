## 1. 实现任务

- [x] 1.1 为 BPM 数字热区增加左右两个点击层（next/prev）
- [x] 1.2 变速切换时，按 `rateIndex` 的累积倍率模型计算新 BPM（支持 prev）
- [x] 1.3 编写测试用例覆盖左右点击（next/prev、wrap 行为）

## 2. 验证任务

- [x] 2.1 `bun run test:run` 通过
- [x] 2.2 `bun run typecheck` 通过
- [x] 2.3 交互验证：左侧 next、右侧 prev，标签与 BPM 变化一致

