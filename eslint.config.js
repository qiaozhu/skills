import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '**/vendor/**',
    '**/sources/**',
    '**/skills/**',
  ],
}, {
  // 维护脚本使用 Node 内建测试，无需新增测试框架。
  files: ['scripts/maintenance.test.ts'],
  rules: { 'test/no-import-node-test': 'off' },
})
