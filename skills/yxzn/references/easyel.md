# EasyEl 组件 API 参考

## EzConfigProvider

将以下 prop 作为默认值注入所有子组件：

| Prop | 类型 | 说明 |
|------|------|------|
| `uploadAction` | `string` | 上传接口地址 |
| `uploadHeader` | `object \| Function` | 上传请求头 |
| `uploadLimit` | `number` | 最大上传数量 |
| `beforeUpload` | `Function` | 上传前钩子 |
| `uploadHttpRequest` | `Function` | 自定义上传请求 |
| `requestFunction` | `Function` | 全局列表请求函数 |
| `tablePaginationKeyMap` | `object` | 分页字段名映射 |
| `tableScrollbarAlwaysOn` | `boolean` | 表格是否常显滚动条 |

```ts
// main.ts
app.use(EasyEl, {
  uploadAction: '/api/upload',
  uploadHeader: { token: '...' },
  requestFunction: useAxios,
  tablePaginationKeyMap: { list: 'rows', total: 'total', pageNum: 'pageNum', pageSize: 'pageSize' }
})
```

## EzTable

### Props

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `tableData` | `T[]` | `[]` | 表格数据 |
| `columns` | `TableColumn<T>[]` | `[]` | 列配置 |
| `showPagination` | `boolean` | `false` | 显示分页 |
| `paginationConfig` | `Partial<EzTablePagination>` | — | 分页状态（来自 `useTable`） |
| `formRules` | `object` | `{}` | 行内编辑表单校验规则 |
| 其余 | — | — | 透传给 `el-table` |

### Events

| Event | 参数 | 说明 |
|-------|------|------|
| `pagination-current-change` | `page: number` | 翻页 |
| `pagination-size-change` | `pageSize: number` | 改变每页条数 |
| `editor-change` | `EditorState` | 行内编辑值变化 |
| `editor-success` | `EditorState` | 行内编辑确认 |

### TableColumn 类型

```ts
type TableColumn<T> = {
  prop: Extract<keyof T, string> | 'handle' | 'operation'
  label?: string
  hidden?: boolean
  filter?: Function           // 格式化单元格值
  enableEdit?: boolean        // 启用行内编辑
  editorType?: 'input' | 'select' | 'datePicker' | 'upload'
  editorProps?: {
    selectOptions?: { label: string; value: string | number }[]
    vAllow?: VAllowValue
    [key: string]: any
  }
  // 其余与 el-table-column 一致（minWidth、fixed、showOverflowTooltip 等）
}
```

### 插槽

- `#<prop>` — 自定义单元格，参数 `{ scope: { row, $index } }`
- `#<prop>Header` — 自定义列头

### useTable

```ts
const tableState = useTable<TRow, TQuery>({
  query,                                      // 搜索条件
  requestConfig: { url: '...', method: 'post' },
  fetchMode: 'always',                        // 'always' | 'once' | 'none'
  localData: [],                              // none 模式下的本地数据
  pagination: { pageSize: 20 },              // 初始分页配置
  tablePaginationKeyMap: { list: 'rows' },   // 覆盖全局字段映射
  onBeforeSearch: () => true,                 // 查询前校验
  onBeforeRequest: (payload) => ({ status: true, data: payload }),
  onAfterResponse: (result, pagination) => ({ status: true, data: result })
})
```

返回：`{ data, query, pagination, search, resetQuery, pageCurrentChange, pageSizeChange }`

## EzDescriptions

### Props

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `fields` | `EzDescriptionsField[]` | `[]` | 详情字段（详情模式） |
| `title` | `string` | `''` | 标题 |
| `span` | `number` | `3` | 分栏数（0 = 容器模式不分栏） |
| `labelWidth` | `string` | `'120px'` | label 宽度 |
| `labelAlign` | `'left' \| 'right' \| 'auto'` | `'right'` | label 对齐 |
| `collapse` / `v-model:collapse` | `boolean` | `false` | 折叠状态 |
| `showArrow` | `boolean` | `false` | 显示折叠箭头 |

### Slots

- `#default` — 表单/搜索内容（`el-form-item` 直接放入）
- `#title` — 自定义标题
- `#right` — 标题右侧操作区
- `#footer` — 底部区域（保存按钮等）
- `#<prop>` — 自定义某个字段的 content（详情模式）
- `#<prop>Label` — 自定义某个字段的 label（详情模式）

### EzDescriptionsField 类型

```ts
interface EzDescriptionsField<T = any> {
  prop: Extract<keyof T, string> | ''
  label?: string
  content?: any
  suffix?: string       // content 后缀文本
  colspan?: number      // 跨列数（最大 4）
  isFile?: boolean      // 是否为文件/图片展示
  fit?: ImgObjectFit
  filter?: Function     // 格式化函数
  hidden?: boolean
  showTitle?: boolean   // 鼠标悬浮显示 title
}
```

## EzUpload

### Props（常用）

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `v-model` | `EzUploadResFile[]` | `[]` | 已上传文件列表 |
| `action` | `string` | **必填** | 上传接口地址 |
| `defaultFiles` | `string \| array` | `[]` | 回显文件（路径字符串或 `{url}` 数组） |
| `bindType` | `'res' \| 'preview' \| 'all'` | `'res'` | v-model 绑定值类型 |
| `allowType` | `string[]` | `['jpg','png','jpeg']` | 允许的后缀 |
| `maxSize` | `number` | `10` | 最大文件大小（MB） |
| `limit` | `number` | — | 最大上传数量 |
| `multiple` | `boolean` | `false` | 多选 |
| `listType` | `'picture-card' \| 'text' \| 'picture'` | `'picture-card'` | 展示方式 |
| `checkResponse` | `(res) => UploadResponse` | — | 校验上传响应 |
| `beforeUpload` | `(file, headers) => boolean` | — | 上传前钩子（类型校验后触发） |

### UploadResponse 接口约定

上传接口返回 `code === 0` 视为成功：

```ts
type UploadResponse = {
  code: number
  message?: string
  data: { fileUrl: string; fileUri?: string; prefix?: string }
}
```

## createAxios

```ts
import { createAxios } from '@yxzn/easyel'

const { useAxios, instance } = createAxios({
  tokenKey: 'Authorization',
  getToken: () => store.token,
  successCodes: [0, 200],
  clearAuth: () => localStorage.clear(),
  redirectLogin: () => router.push('/login'),
  showLoading: true,
})

// 用法
const data = await useAxios.post<ResType>('/api/list', payload)
const data = await useAxios.get<ResType>('/api/detail', { params: { id } })

// 单次请求控制
useAxios.post('/api/list', payload, { showLoading: false })
useAxios.post('/api/list', payload, { showMessage: false })
useAxios.post('/login', payload, { loginRedirect: false })
```
