/**
 * 将当前 fork 的 main 分支与 antfu/skills 的 upstream/main 同步。
 *
 * 用法：pnpm sync:upstream
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 在仓库根目录执行命令，并直接透传输出与交互。 */
function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  })

  if (result.error)
    throw result.error

  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} 执行失败`)
}

/** 读取 Git 命令输出，用于同步前的安全检查。 */
function readGit(args: string[]): string {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  })

  if (result.error)
    throw result.error

  if (result.status !== 0)
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} 执行失败`)

  return result.stdout.trim()
}

/** 校验同步分支与上游地址，防止合并或推送到错误仓库。 */
function assertReadyToSync(): void {
  const branch = readGit(['branch', '--show-current'])
  if (branch !== 'main')
    throw new Error(`请先切换到 main 分支，当前分支为 ${branch || '(detached HEAD)'}`)

  const upstreamUrl = readGit(['remote', 'get-url', 'upstream'])
  if (!upstreamUrl.includes('github.com/antfu/skills'))
    throw new Error(`upstream 地址异常：${upstreamUrl}`)
}

/** 将已跟踪和未跟踪的改动统一存入 stash，并返回是否创建了新 stash。 */
function stashWorkingTree(): boolean {
  if (!readGit(['status', '--porcelain']))
    return false

  const stashMessage = `sync-upstream-auto-stash-${new Date().toISOString()}`
  run('git', ['stash', 'push', '--include-untracked', '--message', stashMessage])

  // Submodule 内部的未提交内容无法由父仓库 stash，继续同步可能覆盖其状态。
  if (readGit(['status', '--porcelain'])) {
    run('git', ['stash', 'pop'])
    throw new Error('自动 stash 后工作区仍不干净，请先处理 submodule 内部的未提交改动')
  }

  return true
}

let hasStashedChanges = false

try {
  assertReadyToSync()
  hasStashedChanges = stashWorkingTree()
  run('git', ['fetch', 'upstream', '--prune'])
  run('git', ['merge', '--no-edit', 'upstream/main'])
  run('git', ['submodule', 'sync', '--recursive'])
  run('git', ['submodule', 'update', '--init', '--recursive'])

  if (hasStashedChanges) {
    run('git', ['stash', 'pop'])
    hasStashedChanges = false
  }

  console.log('\n上游同步完成。')
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  if (hasStashedChanges)
    console.error('同步未完成，原有改动仍保存在 git stash 中；处理问题后运行 git stash pop 恢复。')
  process.exit(1)
}
