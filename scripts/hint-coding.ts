/** 安装后提示单独审查编码规范模板，避免覆盖业务项目自有规则。 */
import process from 'node:process'

// 模板从 fork 默认分支获取，与 skills 的安装更新流程分开。
const CURL_URL = 'https://raw.githubusercontent.com/qiaozhu/skills/main/CODING_PRACTICES.md'

if (process.env.CI === 'true' || process.env.SKIP_CODING_PRACTICES_HINT === '1')
  process.exit(0)

console.log('\n[skills] 编码规范模板需单独审查并纳入业务项目 AGENTS.md。')
console.log('下载候选版本，不覆盖已有规范：')
console.log(`curl -fL -o CODING_PRACTICES.upstream.md ${CURL_URL}`)
console.log('比较并合并需要的规则后，在 AGENTS.md 中明确要求读取 CODING_PRACTICES.md。')
console.log('所有代码必须写注释；遵循既有习惯、避免单次使用的过度抽象。')
console.log('业务项目目录与版本约束写在项目 AGENTS.md，不修改安装后的通用 skills。')
console.log('skills update 不会自动分发仓库根目录的编码规范。\n')
