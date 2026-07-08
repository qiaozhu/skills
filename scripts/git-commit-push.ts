/**
 * 校验、提交并推送当前 fork 的 main 分支到 GitHub。
 *
 * 用法：pnpm git:commit-push -- "feat: update skills"
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

/** 执行 Git 查询并返回去除首尾空白的结果。 */
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

/** 检查指定 Git 命令是否成功，适合判断是否存在待提交内容。 */
function gitSucceeds(args: string[]): boolean {
  const result = spawnSync('git', args, {
    cwd: root,
    stdio: 'ignore',
  })
  return result.status === 0
}

/** 推送目标固定为 GitHub fork 的 main 分支，防止误推到 upstream。 */
function assertReadyToPublish(): void {
  const branch = readGit(['branch', '--show-current'])
  if (branch !== 'main')
    throw new Error(`请先切换到 main 分支，当前分支为 ${branch || '(detached HEAD)'}`)

  const originUrl = readGit(['remote', 'get-url', 'origin'])
  if (!originUrl.includes('github.com/qiaozhu/skills'))
    throw new Error(`origin 地址异常：${originUrl}`)

  if (gitSucceeds(['rev-parse', '--verify', '--quiet', 'MERGE_HEAD']))
    throw new Error('当前存在尚未完成的 merge，请先解决冲突并完成合并')
}

/** 未指定说明时生成稳定、可辨识的默认提交信息。 */
function getCommitMessage(): string {
  const message = process.argv.slice(2).join(' ').trim()
  if (message)
    return message

  return `chore: update skills ${new Date().toISOString().slice(0, 10)}`
}

try {
  assertReadyToPublish()
  run(process.execPath, [join(root, 'node_modules/eslint/bin/eslint.js'), '.'])
  run('git', ['diff', '--check'])
  run('git', ['add', '--all'])

  if (!gitSucceeds(['diff', '--cached', '--quiet']))
    run('git', ['commit', '-m', getCommitMessage()])
  else
    console.log('没有新的代码变更，跳过提交。')

  run('git', ['push', 'origin', 'main'])
  console.log('\n提交并推送完成：https://github.com/qiaozhu/skills')
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
