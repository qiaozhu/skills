/** 对 skills 中的文本应用可重复执行的精确补丁；所有原文检查通过后才写入文件。 */
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/** 每个替换记录适用文件、上下文及预期出现次数，避免模糊替换。 */
interface Replacement {
  file: string
  before: string
  after: string
  count: number
}

/** 补丁原因与上游来源随精确替换一起受版本控制。 */
interface SkillPatch {
  id: string
  reason: string
  source: string
  replacements: Replacement[]
}

/** mode=check 仅确认补丁已落地；mode=apply 同时接受原文和已经应用的状态。 */
export function applySkillPatches(root: string, mode: 'apply' | 'check' = 'apply'): number {
  const files = new Map<string, string>()
  const originals = new Map<string, string>()
  const ids = new Set<string>()
  const patchDir = join(root, 'patches')
  const names = readdirSync(patchDir).filter(name => name.endsWith('.json')).sort()

  // 先在内存中处理全部补丁；后续补丁冲突不会留下前半批修改。
  for (const name of names) {
    const patch = JSON.parse(readFileSync(join(patchDir, name), 'utf8')) as SkillPatch
    if (!patch.id || ids.has(patch.id) || !patch.reason || !patch.source || !Array.isArray(patch.replacements) || !patch.replacements.length)
      throw new Error(`补丁元数据无效或 ID 重复：${name}`)
    ids.add(patch.id)
    for (const change of patch.replacements) {
      if (typeof change.file !== 'string' || !change.file.startsWith('skills/') || change.file.split('/').some(part => !part || part === '..' || part === '.') || change.file.includes('\\'))
        throw new Error(`补丁只能修改 skills/ 内的文件：${name}`)
      if (typeof change.before !== 'string' || typeof change.after !== 'string' || !change.before || !change.after || change.before === change.after || !Number.isInteger(change.count) || change.count < 1)
        throw new Error(`补丁替换定义无效：${name}`)

      // 不沿符号链接写入，补丁不能越出目标仓库或修改共享来源。
      let target = resolve(root)
      for (const part of change.file.split('/')) {
        target = join(target, part)
        if (lstatSync(target).isSymbolicLink())
          throw new Error(`补丁目标不能是符号链接：${change.file}`)
      }
      if (!target.startsWith(`${resolve(root)}${sep}skills${sep}`))
        throw new Error(`补丁目标越界：${change.file}`)
      const text = files.get(target) ?? readFileSync(target, 'utf8')
      if (!originals.has(target))
        originals.set(target, text)
      const beforeCount = text.split(change.before).length - 1
      const afterCount = text.split(change.after).length - 1
      if (beforeCount === 0 && afterCount === change.count) {
        files.set(target, text)
        continue
      }
      if (beforeCount !== change.count || afterCount !== 0)
        throw new Error(`补丁 ${patch.id} 与 ${change.file} 不匹配（原文 ${beforeCount}，结果 ${afterCount}）；请审核上游变化，不要跳过补丁。`)
      if (mode === 'check')
        throw new Error(`补丁 ${patch.id} 尚未应用；请运行 pnpm patches:apply。`)
      files.set(target, text.split(change.before).join(change.after))
    }
  }

  // 仅写入实际变化的文件；重复执行不会更新内容或修改时间。
  let changed = 0
  for (const [target, text] of files) {
    if (text !== originals.get(target)) {
      writeFileSync(target, text)
      changed++
    }
  }
  return changed
}

// 被测试或校验器导入时不执行命令行入口。
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.some(arg => arg !== '--check'))
      throw new Error('仅支持 --check 参数')
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const changed = applySkillPatches(root, args.includes('--check') ? 'check' : 'apply')
    console.log(`补丁检查通过，修改 ${changed} 个文件。`)
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
