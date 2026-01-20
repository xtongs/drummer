# Drummer 项目 AI 助手配置

## 必须遵循的开发规范

本项目使用 **OpenSpec** 进行规范驱动开发（SDD）和 TDD（测试驱动开发）。

### 核心文档

- 📋 **AI 助手指令**: 参见 [AGENTS.md](AGENTS.md) 和 [openspec/AGENTS.md](openspec/AGENTS.md)
- 📖 **项目上下文**: 参见 [openspec/project.md](openspec/project.md)
- 📚 **功能规范**: 参见 [openspec/specs/](openspec/specs/)
- 📝 **变更提案**: 参见 [openspec/changes/](openspec/changes/)

### 开发流程

```
提案(proposal) → 设计(design) → 任务(tasks) → 实现(implement) → 验证(verify) → 归档(archive)
```

### 必须遵守

1. **规范优先（Spec First）**：在写任何代码之前，必须先有明确的规范
2. **新功能/功能修改**：必须先在 `openspec/changes/` 创建 proposal
3. **TDD 开发**：遵循红-绿-重构流程，先写测试再写代码
4. **测试覆盖率**：核心逻辑覆盖率 >= 80%

详细说明请阅读 [AGENTS.md](AGENTS.md) 和 [openspec/AGENTS.md](openspec/AGENTS.md)
