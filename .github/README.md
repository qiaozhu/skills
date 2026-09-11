# qiaozhu/skills 维护说明

本文件维护 fork 的同步与发布流程；根 README.md 保留上游说明。本仓库发布通用 skills，不在其中写入某个业务项目的目录、框架固定版本或运行环境限制。

## 内容归属

| 内容 | 维护位置 | 更新方式 |
| --- | --- | --- |
| 上游通用 skills | `sources/`、`vendor/` 与对应 `skills/` 产物 | Git 合并、文档生成或 vendor 复制 |
| 等待上游修复的通用问题 | `patches/*.json` | 同步后精确应用、发布前检查 |
| 自有完整 skill | `skills/<独立名称>/`，注册到 `meta.ts` 的 `manual` | 手工维护，禁止与 vendor/generated 输出重名 |
| 团队编码要求 | 根 `CODING_PRACTICES.md`，作为自有模板 | 单独审查与分发，不随 skills 安装自动导入 |
| 业务目录、依赖版本、构建与验证命令 | 业务项目的 `AGENTS.md` | 各业务项目维护 |

所有代码必须写注释，遵循既有习惯、避免单次使用的过度抽象。这些要求维护在自有规范中，不逐个改写第三方 skills。通用 skills 应根据目标项目的实际依赖版本判断 API 适用性；来源版本说明用于追溯，不代表所有使用方都必须采用该版本。

业务项目将 `.agents/skills/` 当作安装产物，不直接定制。更新前检查 Git 状态并保存已有改动，更新后审查 skills 和 `skills-lock.json` 的差异。

## 安装与业务项目更新

```bash
# 在业务项目安装全部或指定 skills。
pnpx skills add qiaozhu/skills --skill='*'
pnpx skills add qiaozhu/skills --skill frontend-design

# 在业务项目根目录更新项目级 skills。
pnpx skills update --project --yes
```

`--project` 限定项目级安装；更新按来源记录执行，不能代替本地定制的合并工具。CLI 使用说明见 [skills](https://github.com/vercel-labs/skills)。

## 编码规范模板

[CODING_PRACTICES.md](../CODING_PRACTICES.md) 是 fork 自有规范，不属于 skill 安装目录。业务项目可复制规则到 AGENTS.md，或保存该文件并在 AGENTS.md 中明确要求读取。业务差异继续写在项目 AGENTS.md 中。

模板更新先下载为新文件，再人工比较，避免覆盖项目已有规则：

```bash
# 下载候选版本，不覆盖业务项目已有规范。
curl -fL -o CODING_PRACTICES.upstream.md https://raw.githubusercontent.com/qiaozhu/skills/main/CODING_PRACTICES.md
# 存在本地规范时比较；diff 返回 1 表示存在差异。
git diff --no-index -- CODING_PRACTICES.md CODING_PRACTICES.upstream.md
```

选择需要的修改合并后，在 AGENTS.md 中使用明确指令：

```markdown
阅读并遵循 [CODING_PRACTICES.md](CODING_PRACTICES.md)。
所有代码必须写注释；遵循既有习惯、避免单次使用的过度抽象。
项目明确要求优先于第三方 skills 中的通用建议。
```

不要假设所有 agent 都支持 `@文件` 自动导入，也不要把 `skills update` 当成规范模板更新命令。

## 三种同步操作

| 命令 | 行为 |
| --- | --- |
| `pnpm sync:upstream` | fetch 并 merge `antfu/skills` 的 `main`，按父仓库指针初始化 submodules |
| `pnpm start sync` | 仅更新 vendor 子模块，使用 `--remote --checkout` 后重建对应 `skills/` 输出；不推进 sources、不生成文档型 skills、不应用补丁 |
| 业务项目的 `skills update` | 更新已安装 skills，不维护本仓库的源文件或补丁 |

`origin` 为 `https://github.com/qiaozhu/skills.git`，`upstream` 为 `https://github.com/antfu/skills.git`。`sync:upstream` 要求当前在 main，并检查上游地址。它会保存工作区改动到 stash，合并成功后恢复；失败时检查 merge 状态和 stash，不要盲目重复恢复。submodule 内部未提交修改需单独处理。

vendor 同步前拒绝子模块内未提交修改或冲突。来源目录只用于读取，不使用 `--merge` 自动合并来源分支。文档生成型 `sources/` 保持父仓库记录的提交；需要更新文档时单独选择来源版本、重新生成并审查。

Git 合并遇到冲突时，先理解上游变化，再恢复 fork 自有内容。保留 `patches/`、同步校验脚本、自有规范和配置；不要无条件选 ours/theirs。`frontend-design` 当前属于 vendor 输出，不是手写例外。

## 日常维护：同步、审查、发布

```bash
# 准备全部更新，只修改本地，不推送。
pnpm sync:skills

# 审查产物、来源指针和补丁；确认无无关改动。
git diff
git status --short
pnpm test
pnpm lint

# 审查完成后提交并推送。
pnpm git:commit-push -- "chore: update skills"
```

`sync:skills` 按顺序执行：

1. `pnpm sync:upstream`
2. `pnpm start sync`
3. `pnpm sync:yxzn-lib`
4. `pnpm patches:apply`
5. `pnpm check:skills`

任一步失败均阻断后续步骤。`sync:yxzn-lib` 仍使用已有私有来源配置；未配置时按原有说明配置，不静默跳过。只维护通用 vendor 时，可单独运行 `pnpm start sync`、`pnpm patches:apply` 和 `pnpm check:skills`。

一键命令仍可用：

```bash
# 包含同步、校验、提交与远程推送，无人工审查暂停点。
pnpm publish:skills
```

它等价于 `pnpm sync:skills && pnpm git:commit-push`。需要审查时使用前面的分步流程。

`git:commit-push` 在暂存之前执行 ESLint、skills 校验、维护工具测试和 `git diff --check`。它会暂存仓库全部改动、提交并推送 main，执行前检查工作区。不要用发布命令代替本地测试。

## 精确补丁

补丁只用于可说明原因的通用问题，优先向原始上游贡献。当前补丁修复 VueUse、antfu 和 tsdown 安装入口的缺失引用。

每个 `patches/*.json` 包含：

- `id`：唯一标识。
- `source`：原始来源或上游 issue/PR 地址。
- `reason`：为什么需要修复以及预期行为。
- `replacements`：`file`、`before`、`after`、`count` 的数组。

`file` 必须是 `skills/` 内的现有普通文件。`before` 和 `after` 是精确文本，`count` 是预期出现次数；用完整句子或表格行提供唯一上下文，避免截取已在其他位置出现的短字符串。不要直接修改 vendor 目录或只改同步产物。

```bash
# 应用补丁，不联网。
pnpm patches:apply
# 只检查结果已存在，不写入。
pnpm patches:check
# 校验补丁、所有注册 skills 的元数据、入口本地链接和追溯文件。
pnpm check:skills
```

补丁按文件名字典序处理。相同替换的已应用状态会跳过，重复执行不改内容；重新同步得到原文后可再次应用。全部匹配检查在内存中完成，任何检查失败都不会写入本批次文件。磁盘写入错误仍需检查工作区。

若原文与结果都不符合预期，命令失败并显示补丁 ID 与文件。检查上游差异后更新补丁上下文，再运行测试；禁止捕获错误后继续发布。上游已包含相同修复时，可先通过检查，再审核移除补丁。补丁之间不要依赖重叠的中间文本，以保证只读检查可验证最终状态。

`check:skills` 不会抓取外链或检查所有深层 references 的语义；仍需审查版本适配、引用内容和行为约束。YAML 元数据允许来源扩展字段，不为迎合某个工具的校验器而删除上游信息。

## 新增或大幅定制 skills

- 文档生成型：在 `meta.ts` 的 `submodules` 注册，初始化 sources，依据对应 `instructions/` 生成并维护 `GENERATION.md`。更新 submodule 不等于重新生成 skill。
- vendor 型：在 `vendors` 注册来源、`skillsRoot` 与来源目录到输出名称的映射；同步脚本维护 `SYNC.md` 与来源许可证。输出根目录必须有 `SKILL.md`。
- 自有型：使用独立名称（如 `yxzn-vue-practices`），注册到 `manual`，自主维护完整入口和引用。改目录名时同步修改 frontmatter 的 `name`，避免安装名称冲突。

新增 submodule 使用 `pnpm start init`，审查选择；不要为日常更新运行 cleanup。所有来源不能共用同一输出目录，校验器也会检查安装名称重复。

## 发布检查

```bash
pnpm patches:apply
pnpm check:skills
pnpm test
pnpm lint
git diff --check
git status --short
```

核对补丁与产物一起提交，`SYNC.md`/`GENERATION.md` 和 submodule 指针可追溯，原始许可证保留。业务项目的版本或目录约束不得进入通用补丁。安装方只有在远程发布后才能通过 `skills update` 获得新内容。
