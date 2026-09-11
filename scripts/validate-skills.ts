/** 发布前检查配置、skill 元数据、入口本地链接及已应用补丁，不执行同步或推送。 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { manual, submodules, vendors } from '../meta.ts'
import { applySkillPatches } from './skill-patches.ts'

/** 入口文档支持标准 frontmatter、行内 Markdown 链接与引用式链接。 */
const RE_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
const RE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RE_FENCE = /^ {0,3}(`{3,}|~{3,})/
const RE_ANGLE = /^<|>$/g
const RE_FRAGMENT = /[?#]/
const RE_LINK = /\]\((<[^>]+>|[^\s)]+)(?:\s[^)]*)?\)/g
const RE_REFERENCE = /^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm
const RE_EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

/** 只校验入口引用，不抓取外网，也不把示例代码中的路径当作资源。 */
export function validateSkillEntry(path: string): string {
  const text = readFileSync(path, 'utf8')
  const match = text.match(RE_FRONTMATTER)
  if (!match)
    throw new Error(`${path} 缺少 YAML frontmatter`)
  const meta = parse(match[1])
  if (!meta || typeof meta.name !== 'string' || !RE_NAME.test(meta.name) || meta.name.length > 64 || typeof meta.description !== 'string' || !meta.description.trim())
    throw new Error(`${path} 的 name 或 description 无效`)
  // 逐行识别代码围栏，支持嵌套示例而不使用跨文档回溯正则。
  const bodyLines: string[] = []
  let fence = ''
  for (const line of text.slice(match[0].length).split('\n')) {
    const marker = line.match(RE_FENCE)?.[1]
    if (marker) {
      if (!fence)
        fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length)
        fence = ''
    }
    else if (!fence) {
      bodyLines.push(line)
    }
  }
  const body = bodyLines.join('\n')
  const links = [...body.matchAll(RE_LINK), ...body.matchAll(RE_REFERENCE)]
  for (const link of links) {
    const raw = link[1].replace(RE_ANGLE, '')
    if (RE_EXTERNAL.test(raw))
      continue
    const target = resolve(dirname(path), decodeURIComponent(raw.split(RE_FRAGMENT)[0]))
    const skillRoot = `${resolve(dirname(path))}${sep}`
    if (!target.startsWith(skillRoot) || !existsSync(target))
      throw new Error(`${path} 引用缺失或位于 skill 外：${raw}`)
  }
  return meta.name
}

/** 各来源不得写入同一目录；安装名称允许与目录不同，但不能重复。 */
export function validateSkills(root: string): number {
  applySkillPatches(root, 'check')
  const outputs = new Map<string, string>()
  const names = new Set<string>()
  const entries = [
    ...Object.keys(submodules).map(name => [name, 'GENERATION.md']),
    ...Object.values(vendors).flatMap(config => Object.values(config.skills).map(name => [name, 'SYNC.md'])),
    ...manual.map(name => [name, '']),
  ]
  for (const [output, tracking] of entries) {
    if (outputs.has(output))
      throw new Error(`meta.ts 存在重复输出目录：${output}`)
    outputs.set(output, tracking)
    const skillDir = join(root, 'skills', output)
    const name = validateSkillEntry(join(skillDir, 'SKILL.md'))
    if (names.has(name))
      throw new Error(`存在重复 skill 安装名称：${name}`)
    names.add(name)
    if (tracking && !existsSync(join(skillDir, tracking)))
      throw new Error(`${output} 缺少 ${tracking}`)
  }
  return names.size
}

// 命令行入口只报告验证结果，失败时阻断后续发布命令。
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    console.log(`${validateSkills(root)} 个 skills 校验通过。`)
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
