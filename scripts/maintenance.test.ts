/** 使用隔离目录验证补丁幂等、冲突阻断和发布检查，不访问上游或推送仓库。 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { applySkillPatches } from './skill-patches.ts'
import { validateSkillEntry } from './validate-skills.ts'

/** 每个测试只操作自己的临时目录，结束后清理。 */
function fixture(t: { after: (fn: () => void) => void }): string {
  const root = mkdtempSync(join(tmpdir(), 'skill-maintenance-test-'))
  mkdirSync(join(root, 'patches'))
  mkdirSync(join(root, 'skills/demo'), { recursive: true })
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

/** 构造具有唯一上下文的文本修复，覆盖真实补丁的匹配行为。 */
function patch(root: string, name = 'demo', file = 'skills/demo/SKILL.md', before = 'old text', after = 'new text'): void {
  writeFileSync(join(root, 'patches', `${name}.json`), JSON.stringify({
    id: name,
    reason: '测试精确修复',
    source: 'fixture',
    replacements: [{ file, before, after, count: 1 }],
  }))
}

it('补丁首次应用、重复应用和只读检查', (t) => {
  const root = fixture(t)
  const target = join(root, 'skills/demo/SKILL.md')
  writeFileSync(target, 'old text')
  patch(root)
  assert.throws(() => applySkillPatches(root, 'check'), /尚未应用/)
  assert.equal(readFileSync(target, 'utf8'), 'old text')
  assert.equal(applySkillPatches(root), 1)
  assert.equal(applySkillPatches(root), 0)
  assert.equal(applySkillPatches(root, 'check'), 0)
  assert.equal(readFileSync(target, 'utf8'), 'new text')
})

it('后续补丁冲突时不写入前面的成功修改', (t) => {
  const root = fixture(t)
  const target = join(root, 'skills/demo/SKILL.md')
  writeFileSync(target, 'old text')
  patch(root, 'a')
  patch(root, 'b', 'skills/demo/SKILL.md', 'upstream changed', 'expected')
  assert.throws(() => applySkillPatches(root), /不匹配/)
  assert.equal(readFileSync(target, 'utf8'), 'old text')
})

it('重复原文及混合状态不能被静默替换', (t) => {
  const root = fixture(t)
  const target = join(root, 'skills/demo/SKILL.md')
  patch(root)
  for (const text of ['old text old text', 'old text new text']) {
    writeFileSync(target, text)
    assert.throws(() => applySkillPatches(root), /不匹配/)
    assert.equal(readFileSync(target, 'utf8'), text)
  }
})

it('同步恢复原文后可以重新应用补丁', (t) => {
  const root = fixture(t)
  const target = join(root, 'skills/demo/SKILL.md')
  patch(root)
  writeFileSync(target, 'old text')
  applySkillPatches(root)
  writeFileSync(target, 'old text')
  assert.equal(applySkillPatches(root), 1)
  assert.equal(readFileSync(target, 'utf8'), 'new text')
})

it('拒绝路径穿越和符号链接目标', (t) => {
  const root = fixture(t)
  patch(root, 'demo', 'skills/../outside.md')
  assert.throws(() => applySkillPatches(root), /只能修改/)
  writeFileSync(join(root, 'outside.md'), 'old text')
  symlinkSync(join(root, 'outside.md'), join(root, 'skills/demo/SKILL.md'))
  patch(root)
  assert.throws(() => applySkillPatches(root), /符号链接/)
  assert.equal(readFileSync(join(root, 'outside.md'), 'utf8'), 'old text')
})

it('入口支持 YAML 多行描述，忽略代码示例并检查本地引用', (t) => {
  const root = fixture(t)
  const path = join(root, 'skills/demo/SKILL.md')
  const text = '---\nname: demo\ndescription: |\n  Demonstrate a skill.\n---\n[guide](guide.md)\n```md\n[example](absent.md)\n```\n'
  writeFileSync(path, text)
  assert.throws(() => validateSkillEntry(path), /引用缺失/)
  writeFileSync(join(root, 'skills/demo/guide.md'), 'Guide')
  assert.equal(validateSkillEntry(path), 'demo')
  writeFileSync(path, text.replace('name: demo', 'name: [invalid'))
  assert.throws(() => validateSkillEntry(path))
})

it('入口拒绝 skill 外引用，避免独立安装后丢失资源', (t) => {
  const root = fixture(t)
  const path = join(root, 'skills/demo/SKILL.md')
  writeFileSync(join(root, 'skills/other.md'), 'Other')
  writeFileSync(path, '---\nname: demo\ndescription: Demo\n---\n[other][ref]\n[ref]: ../other.md\n')
  assert.throws(() => validateSkillEntry(path), /位于 skill 外/)
})

// 假 git 只返回测试状态，保证同步失败路径测试不会联网或变更真实 submodule。
for (const scenario of ['git failure', 'missing source', 'duplicate output', 'dirty vendor']) {
  it(`同步失败阻断：${scenario}`, (t) => {
    const root = fixture(t)
    const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'bin'))
    copyFileSync(join(sourceRoot, 'scripts/cli.ts'), join(root, 'scripts/cli.ts'))
    symlinkSync(join(sourceRoot, 'node_modules'), join(root, 'node_modules'), 'dir')
    writeFileSync(join(root, 'package.json'), '{"type":"module"}')
    writeFileSync(join(root, 'meta.ts'), `export const submodules = {}; export const manual = ${scenario === 'duplicate output' ? '["demo"]' : '[]'}; export const vendors = { demo: { source: 'fixture', skills: { demo: 'demo' } } };`)
    writeFileSync(join(root, 'bin/git'), `#!/bin/sh\n# 测试替身不访问网络。\nexit ${scenario === 'git failure' ? '1' : '0'}\n`, { mode: 0o755 })
    // 来源存在修改时只能执行状态检查，不允许调用 update。
    if (scenario === 'dirty vendor') {
      mkdirSync(join(root, 'vendor/demo'), { recursive: true })
      writeFileSync(join(root, 'vendor/demo/.git'), 'fixture')
      writeFileSync(join(root, 'bin/git'), '#!/bin/sh\n# 测试状态检查。\ncase "$*" in *status*) echo " M SKILL.md";; *) exit 99;; esac\n', { mode: 0o755 })
    }
    const target = join(root, 'skills/demo/SKILL.md')
    writeFileSync(target, 'keep existing output')
    const result = spawnSync(process.execPath, [join(root, 'scripts/cli.ts'), 'sync'], {
      cwd: root,
      env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
      encoding: 'utf8',
    })
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.equal(readFileSync(target, 'utf8'), 'keep existing output')
    const expected = scenario === 'git failure' ? /Failed to update submodules/ : scenario === 'missing source' ? /缺少 vendor skill/ : scenario === 'dirty vendor' ? /未提交修改或冲突/ : /输出目录重复/
    assert.match(result.stdout + result.stderr, expected)
  })
}

it('vendor 重建后补丁恢复修复，并记录实际来源目录', (t) => {
  const root = fixture(t)
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  mkdirSync(join(root, 'scripts'))
  mkdirSync(join(root, 'bin'))
  mkdirSync(join(root, 'vendor/demo/custom/demo'), { recursive: true })
  copyFileSync(join(sourceRoot, 'scripts/cli.ts'), join(root, 'scripts/cli.ts'))
  symlinkSync(join(sourceRoot, 'node_modules'), join(root, 'node_modules'), 'dir')
  writeFileSync(join(root, 'package.json'), '{"type":"module"}')
  writeFileSync(join(root, 'meta.ts'), 'export const submodules = { pinia: \'fixture\' }; export const manual = []; export const vendors = { demo: { source: \'fixture\', skillsRoot: \'custom\', skills: { demo: \'demo\' } } };')
  // 以固定 SHA 替代 git 网络操作，实际执行目录复制与追溯文件生成。
  writeFileSync(join(root, 'bin/git'), '#!/bin/sh\n# 返回测试来源版本并记录调用。\necho "$*" >> git-calls.log\nprintf "abcdef123456\\n"\n', { mode: 0o755 })
  writeFileSync(join(root, 'vendor/demo/custom/demo/SKILL.md'), 'old text')
  patch(root)
  for (let iteration = 0; iteration < 2; iteration++) {
    const result = spawnSync(process.execPath, [join(root, 'scripts/cli.ts'), 'sync'], {
      cwd: root,
      env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    // 只刷新 vendor，来源分支发生分歧时也不尝试 merge。
    const calls = readFileSync(join(root, 'git-calls.log'), 'utf8')
    assert.match(calls, /submodule update --init --remote --checkout -- vendor\/demo/)
    assert.doesNotMatch(calls, /--merge|sources\/pinia/)
    assert.equal(readFileSync(join(root, 'skills/demo/SKILL.md'), 'utf8'), 'old text')
    assert.equal(applySkillPatches(root), 1)
    assert.equal(readFileSync(join(root, 'skills/demo/SKILL.md'), 'utf8'), 'new text')
    assert.match(readFileSync(join(root, 'skills/demo/SYNC.md'), 'utf8'), /vendor\/demo\/custom\/demo/)
  }
})

it('来源分支历史被替换时 checkout 成功且不产生合并冲突', (t) => {
  const root = fixture(t)
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const upstream = join(root, 'upstream')
  mkdirSync(upstream)
  // 只使用临时本地仓库；显式身份和协议避免依赖全局 Git 配置或网络。
  const git = (cwd: string, args: string[]): string => {
    const result = spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], {
      cwd,
      env: { ...process.env, GIT_ALLOW_PROTOCOL: 'file', GIT_CONFIG_NOSYSTEM: '1' },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    return result.stdout.trim()
  }
  git(upstream, ['init', '-b', 'main'])
  writeFileSync(join(upstream, 'SKILL.md'), 'original upstream')
  git(upstream, ['add', 'SKILL.md'])
  git(upstream, ['commit', '-m', 'original'])
  git(root, ['init', '-b', 'main'])
  git(root, ['submodule', 'add', upstream, 'vendor/demo'])
  const previous = git(join(root, 'vendor/demo'), ['rev-parse', 'HEAD'])
  // 创建无共同祖先的新来源历史，覆盖原来的远程 main。
  git(upstream, ['checkout', '--orphan', 'replacement'])
  writeFileSync(join(upstream, 'SKILL.md'), 'replacement upstream')
  git(upstream, ['add', 'SKILL.md'])
  git(upstream, ['commit', '-m', 'replacement'])
  git(upstream, ['branch', '-M', 'main'])
  const expected = git(upstream, ['rev-parse', 'HEAD'])
  assert.notEqual(previous, expected)
  mkdirSync(join(root, 'scripts'))
  copyFileSync(join(sourceRoot, 'scripts/cli.ts'), join(root, 'scripts/cli.ts'))
  symlinkSync(join(sourceRoot, 'node_modules'), join(root, 'node_modules'), 'dir')
  writeFileSync(join(root, 'package.json'), '{"type":"module"}')
  writeFileSync(join(root, 'meta.ts'), 'export const submodules = {}; export const manual = []; export const vendors = { demo: { source: "fixture", skillsRoot: ".", skills: { ".": "demo" } } };')
  const result = spawnSync(process.execPath, [join(root, 'scripts/cli.ts'), 'sync'], {
    cwd: root,
    env: { ...process.env, GIT_ALLOW_PROTOCOL: 'file' },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.equal(git(join(root, 'vendor/demo'), ['rev-parse', 'HEAD']), expected)
  assert.equal(git(join(root, 'vendor/demo'), ['status', '--porcelain']), '')
  assert.equal(readFileSync(join(root, 'skills/demo/SKILL.md'), 'utf8'), 'replacement upstream')
})
