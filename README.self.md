# qiaozhu/skills 维护说明

本文档仅用于维护 `qiaozhu/skills` fork。上游项目说明见 [README.md](README.md)，同步上游时不要将本文件内容合并到上游 README。

## 安装 Skills

安装仓库中的全部 skills：

```bash
pnpx skills add qiaozhu/skills --skill='*'
```

安装指定 skill：

```bash
pnpx skills add qiaozhu/skills --skill frontend-design
```

安装命令读取 GitHub `qiaozhu/skills` 的默认分支。新增或修改 skill 后，必须提交并推送到 GitHub `main` 才能被安装工具发现。

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

拉取并合并上游 `main`：

```bash
git switch main
git fetch upstream
git merge upstream/main
git submodule sync --recursive
git submodule update --init --recursive
```

发生冲突时遵循以下原则：

- 上游生成或同步的通用 skill 文件采用上游版本。
- 保留 fork 在 `meta.ts`、`skills/yxzn-lib`、`skills/frontend-design` 和本文件中的自定义内容。
- `README.md` 跟随上游；fork 专属说明只写在 `README.self.md`。

校验并推送：

```bash
pnpm lint
git diff --check
git push origin main
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

最后发布：

```bash
git add meta.ts .gitmodules README.self.md skills sources vendor
git commit -m "feat: update skills"
git push origin main
```
