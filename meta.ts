export interface VendorSkillMeta {
  official?: boolean
  source: string
  /**
   * 技能路径相对 vendor 根目录；默认 `skills`（即 `vendor/{name}/skills/{skill}/`）。
   * 设为 `.` 时表示技能在 submodule 仓库根目录（例如整个仓库即一个 skill）。
   */
  skillsRoot?: string
  skills: Record<string, string> // sourceSkillName -> outputSkillName
}

/**
 * Repositories to clone as submodules and generate skills from source
 */
export const submodules = {
  vue: 'https://github.com/vuejs/docs',
  nuxt: 'https://github.com/nuxt/nuxt',
  vite: 'https://github.com/vitejs/vite',
  unocss: 'https://github.com/unocss/unocss',
  pnpm: 'https://github.com/pnpm/pnpm.io',
  pinia: 'https://github.com/vuejs/pinia',
  vitest: 'https://github.com/vitest-dev/vitest',
  vitepress: 'https://github.com/vuejs/vitepress',
  nitro: 'https://github.com/nitrojs/nitro',
}

/**
 * Already generated skills, sync with their `skills/` directory
 */
export const vendors: Record<string, VendorSkillMeta> = {
  'slidev': {
    official: true,
    source: 'https://github.com/slidevjs/slidev',
    skills: {
      slidev: 'slidev',
    },
  },
  'vueuse': {
    official: true,
    source: 'https://github.com/vueuse/vueuse',
    skills: {
      'vueuse-functions': 'vueuse-functions',
    },
  },
  'tsdown': {
    official: true,
    source: 'https://github.com/rolldown/tsdown',
    skills: {
      tsdown: 'tsdown',
    },
  },
  'vuejs-ai': {
    source: 'https://github.com/vuejs-ai/skills',
    skills: {
      'vue-best-practices': 'vue-best-practices',
      'vue-router-best-practices': 'vue-router-best-practices',
      'vue-testing-best-practices': 'vue-testing-best-practices',
    },
  },
  'turborepo': {
    official: true,
    source: 'https://github.com/vercel/turborepo',
    skills: {
      turborepo: 'turborepo',
    },
  },
  'web-design-guidelines': {
    source: 'https://github.com/vercel-labs/agent-skills',
    skills: {
      'web-design-guidelines': 'web-design-guidelines',
    },
  },
  'code-review-skill': {
    source: 'https://github.com/awesome-skills/code-review-skill',
    skillsRoot: '.',
    skills: {
      '.': 'code-review-skill',
    },
  },
}

/**
 * Hand-maintained skills (not generated from upstream docs sync).
 * 开发规范见仓库根目录 CODING_PRACTICES.md（非 skill、不同步上游）。
 */
export const manual = [
  'yxzn-lib',
]
