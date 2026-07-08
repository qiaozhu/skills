# qiaozhu/skills 维护说明

本文档仅用于维护 `qiaozhu/skills` fork。上游项目说明见 [README.md](../README.md)，同步上游时不要将本文件内容合并到上游 README。

## 安装 Skills

安装仓库中的全部 skills：

```bash
pnpx skills add qiaozhu/skills --skill='*'
```

安装指定 skill：

```bash
pnpx skills add qiaozhu/skills --skill frontend-design
```

在已经安装 skills 的目标项目根目录中，同步该项目的全部 skills 到最新版本：

```bash
pnpx skills update --project --yes
```

`--project` 只更新当前项目内的 skills，不影响用户目录中的全局 skills；`--yes` 会跳过作用域确认，适合日常一键同步。

## Git 远程仓库

本仓库使用两个 remote：

- `origin`：`https://github.com/qiaozhu/skills.git`，用于保存 fork 的自定义内容。
- `upstream`：`https://github.com/antfu/skills.git`，用于获取源项目更新。

检查配置：

```bash
git remote -v
```

若缺少上游 remote：

```bash
git remote add upstream https://github.com/antfu/skills.git
```

## 同步上游

一键拉取并合并上游 `main`，随后同步和初始化 submodules：

```bash
pnpm sync:upstream
```

该命令要求当前处于 `main` 分支，并校验 `upstream` 是否指向 `antfu/skills`。工作区存在改动时，脚本会通过 `git stash --include-untracked` 自动保存全部已跟踪和未跟踪改动，同步成功后再执行 `git stash pop` 恢复。

如果上游同步失败，脚本不会把个人改动叠加进冲突现场，原有改动会继续保留在 stash 中。处理完同步问题后执行 `git stash pop` 恢复。submodule 内部的未提交内容无法由父仓库安全 stash，遇到这种情况脚本会停止并要求手动处理。

发生冲突时遵循以下原则：

- 上游生成或同步的通用 skill 文件采用上游版本。
- 保留 fork 在 `meta.ts`、`skills/yxzn-lib`、`skills/frontend-design` 和本文件中的自定义内容。
- 根目录 `README.md` 跟随上游；fork 专属说明只写在 `.github/README.md`。

解决冲突后完成合并：

```bash
git add --all
git commit
```

## 更新已有 Vendor Skills

更新 submodules 并同步 vendor skills 到 `skills/`：

```bash
pnpm start sync
```

同步完成后检查生成内容、`SYNC.md` 和 Git diff，再提交到 GitHub。不要直接修改 vendor 同步产物；需要调整时优先修改上游来源或同步配置。

## 新增已有 Skill 的项目

对于上游已经提供 skill 的项目，在 `meta.ts` 的 `vendors` 中添加配置：

```ts
export const vendors = {
  'claude-code': {
    source: 'https://github.com/anthropics/claude-code',
    skillsRoot: 'plugins/frontend-design/skills',
    skills: {
      'frontend-design': 'frontend-design',
    },
  },
}
```

字段说明：

- vendor key 同时作为 `vendor/{key}` 的 submodule 目录名。
- `source` 是上游 Git 仓库地址。
- `skillsRoot` 是相对于 vendor 仓库根目录的 skill 父目录，默认值为 `skills`。
- `skills` 的 key 是来源目录名，value 是输出到 `skills/` 的目录名。

初始化并同步：

```bash
pnpm start init -y
pnpm start sync
```

确认输出目录包含根级 `SKILL.md`，例如：

```text
skills/frontend-design/SKILL.md
```

`SKILL.md` 如果被放在更深的嵌套目录中，安装工具不会把外层目录识别为该 skill。

## 新增文档生成型项目

对于没有维护现成 skill、需要从文档生成 skill 的项目：

1. 在 `meta.ts` 的 `submodules` 中添加仓库。
2. 运行 `pnpm start init -y` 初始化到 `sources/{project}`。
3. 阅读 `sources/{project}/docs` 和 `instructions/{project}.md`。
4. 在 `skills/{project}` 中创建 `SKILL.md`、`GENERATION.md` 和必要的 references。
5. 运行校验并推送到 GitHub。

生成内容应面向 agent 的实际使用场景，保持简洁，一个 reference 只描述一个概念，并附可运行的代码示例和来源链接。

## 新增手写 Skill

手写 skill 直接创建在 `skills/{name}`，并将名称加入 `meta.ts` 的 `manual`：

```ts
export const manual = [
  'yxzn-lib',
  'antfu',
  'antfu-design',
  'my-skill',
]
```

最小目录结构：

```text
skills/my-skill/
└── SKILL.md
```

`SKILL.md` 必须包含有效 frontmatter：

```markdown
---
name: my-skill
description: 说明该 skill 的用途以及应在何时使用。
---
```

## 提交并推送

安装工具读取 GitHub `qiaozhu/skills` 的默认分支。新增或修改 skill 后，必须提交并推送到 GitHub `main` 才能被安装工具发现。

独立执行校验、暂存、提交并推送到 GitHub `main`：

```bash
pnpm git:commit-push -- "feat: update skills"
```

提交说明可以省略；脚本会使用包含当前日期的默认说明：

```bash
pnpm git:commit-push
```

提交脚本会依次执行以下操作：

1. 确认当前位于 `main`，且 `origin` 指向 `qiaozhu/skills`。
2. 拒绝提交尚未解决的 merge。
3. 使用项目本地 ESLint 执行完整 lint，并执行 `git diff --check`。
4. 使用 `git add --all` 暂存全部变更。
5. 有变更时自动提交，没有变更时跳过提交。
6. 执行 `git push origin main`。

提交脚本会暂存仓库中的全部改动，执行前应先通过 `git status --short` 确认没有无关文件。

## 一键发布

一键发布会串行执行三个彼此独立的命令：同步上游仓库、同步 `yxzn-lib`，最后提交并推送：

```bash
pnpm publish:skills
```

等价于：

```bash
pnpm sync:upstream
pnpm sync:yxzn-lib
pnpm git:commit-push
```

任一步骤失败后，后续命令不会继续执行。存在未提交的手写改动时，`sync:upstream` 会先自动 stash，同步成功后恢复改动；随后这些改动会和 `yxzn-lib` 的同步结果一起由 `git:commit-push` 提交并推送。

## 发布检查

每次新增或更新 skill 后执行：

```bash
pnpm lint
git diff --check
git status --short
```

确认以下事项后推送：

- `skills/{name}/SKILL.md` 位于 skill 根目录。
- `meta.ts` 已包含对应 generated、vendor 或 manual 配置。
- vendor skill 的 `SYNC.md` 和 generated skill 的 `GENERATION.md` 已更新。
- 没有误提交 `.pnpm-store`、构建产物或临时文件。
- submodule 指针和 `.gitmodules` 已一并提交。

确认无误后提交并推送：

```bash
pnpm git:commit-push -- "feat: update skills"
```
