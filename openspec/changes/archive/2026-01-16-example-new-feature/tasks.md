# Tasks: 添加音量渐变功能

> ⚠️ 这是一个示例任务清单，展示 OpenSpec 流程的使用方式

## 1. 规范更新

- [ ] 1.1 更新 `specs/audio-engine/spec.md` 添加渐变需求
- [ ] 1.2 更新 `specs/metronome/spec.md` 添加渐变场景

## 2. 核心实现

- [ ] 2.1 在 audioEngine 中实现 GainNode 渐变控制
- [ ] 2.2 添加 fadeIn/fadeOut 工具函数
- [ ] 2.3 更新 useMetronome hook 集成渐变逻辑

## 3. 测试

- [ ] 3.1 编写 audioEngine 渐变功能单元测试
- [ ] 3.2 编写 useMetronome 集成测试
- [ ] 3.3 手动测试确认无 pop 声

## 4. UI 集成

- [ ] 4.1 在设置面板添加渐变开关
- [ ] 4.2 添加渐变时长滑块（可选）

## 5. 验证

- [ ] 5.1 所有测试通过
- [ ] 5.2 代码评审
- [ ] 5.3 更新相关文档

## 验收标准

- 播放开始/停止时无明显 pop 声
- 渐变不影响节拍时序精度
- 用户可以开启/关闭此功能
