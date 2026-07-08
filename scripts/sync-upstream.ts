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
    process.exit(result.status ?? 1)
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

/** 只允许从干净的 main 分支开始，避免覆盖尚未提交的自定义内容。 */
function assertReadyToSync(): void {
  const branch = readGit(['branch', '--show-current'])
  if (branch !== 'main')
    throw new Error(`请先切换到 main 分支，当前分支为 ${branch || '(detached HEAD)'}`)

  const status = readGit(['status', '--porcelain'])
  if (status)
    throw new Error('工作区存在未提交变更，请先提交或暂存后再同步上游')

  const upstreamUrl = readGit(['remote', 'get-url', 'upstream'])
  if (!upstreamUrl.includes('github.com/antfu/skills'))
    throw new Error(`upstream 地址异常：${upstreamUrl}`)
}

try {
  assertReadyToSync()
  run('git', ['fetch', 'upstream', '--prune'])
  run('git', ['merge', '--no-edit', 'upstream/main'])
  run('git', ['submodule', 'sync', '--recursive'])
  run('git', ['submodule', 'update', '--init', '--recursive'])
  console.log('\n上游同步完成。')
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
