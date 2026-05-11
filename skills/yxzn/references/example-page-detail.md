# 详情页模式

详情页由**返回按钮** + 多个 **EzDescriptions 面板**组成。每个面板通过 `:fields` prop 传入 `reactive<EzDescriptionsField<T>[]>`，接口返回后用 `assignArrayByKey` 批量写入 `content`。

## 完整示例

```vue
<template>
  <div>
    <div class="mb-10">
      <el-button type="primary" @click="router.go(-1)">返回</el-button>
    </div>

    <EzDescriptions title="基础信息" :fields="basicFields" label-width="120px">
      <!-- 自定义某个字段的 content 插槽 -->
      <template #remark="{ scope }">
        <span :title="scope.content">{{ scope.content }}</span>
      </template>
    </EzDescriptions>

    <EzDescriptions title="附件信息" :fields="attachFields" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { type EzDescriptionsField } from '@yxzn/easyel'
import { assignArrayByKey } from '@yxzn/utils'
import { formatDate, formatMoney } from '@yxzn/filter'
import useAxios from '@/utils/useAxios'
import api from '@/api/servicer'
import type { IServicerDetail } from './ServicerModule.d'

const router = useRouter()
const route = useRoute()

const id = route.params.id
const detailData = ref<Partial<IServicerDetail>>({})

// ========== fields 定义（content 初始为空，接口回调后 assignArrayByKey 赋值） ==========
const basicFields = reactive<EzDescriptionsField<IServicerDetail>[]>([
  { prop: 'name', label: '名称', content: '' },
  { prop: 'socialCreditCode', label: '统一社会信用代码', content: '' },
  { prop: 'contactPeople', label: '联系人', content: '' },
  { prop: 'contactNumber', label: '联系电话', content: '' },
  { prop: 'address', label: '联系地址', content: '', colspan: 2 },
  { prop: 'amount', label: '金额', content: '', filter: formatMoney, suffix: ' 元' },
  { prop: 'createTime', label: '创建时间', content: '', filter: formatDate },
  { prop: 'remark', label: '备注', content: '', colspan: 3 }
])

// 图片类字段 content 初始为空数组
const attachFields = reactive<EzDescriptionsField<IServicerDetail>[]>([
  { prop: 'licensePath', label: '营业执照', content: [], isFile: true },
  { prop: 'otherPath', label: '其他材料', content: [], isFile: true }
])

// ========== 获取详情 ==========
const fetchDetail = async () => {
  const res = await useAxios.get(api.detail, { params: { id } })
  detailData.value = res || {}
  // 图片字段确保为数组格式
  detailData.value.licensePath = res.licensePath || []
  detailData.value.otherPath = res.otherPath || []
  assignArrayByKey(basicFields, detailData.value)
  assignArrayByKey(attachFields, detailData.value)
}

// ========== 统一初始化入口 ==========
const init = () => fetchDetail()
init()
</script>
```

## 关键要点

### 1. detailData 类型

使用 `.d.ts` 中定义的 `I{模块名}Detail`，而非 `any`：

```ts
const detailData = ref<Partial<IServicerDetail>>({})
```

`Partial<IServicerDetail>` 用于初始空对象，请求后赋值完整数据。

### 2. fields 使用 reactive 定义

```ts
const basicFields = reactive<EzDescriptionsField<IServicerDetail>[]>([
  { prop: 'name', label: '名称', content: '' },
  { prop: 'amount', label: '金额', content: '', filter: formatMoney, suffix: ' 元' }
])
```

图片类字段 `content` 初始为空数组：

```ts
const attachFields = reactive<EzDescriptionsField<IServicerDetail>[]>([
  { prop: 'licensePath', label: '营业执照', content: [], isFile: true }
])
```

### 3. assignArrayByKey 批量赋值

```ts
import { assignArrayByKey } from '@yxzn/utils'

assignArrayByKey(basicFields, detailData.value)
```

函数以每个 field 的 `prop` 为 key，从 source 对象取值写入 `content`。

### 4. 图片字段预处理

图片字段需确保为数组后再 assignArrayByKey：

```ts
// 接口返回单个路径字符串
detailData.value.licensePath = res.licensePath ? [res.licensePath] : []
// 接口返回本身就是数组
detailData.value.licensePath = res.licensePath || []
```

### 5. 自定义 content 插槽

插槽名 = `field.prop`，`scope` 就是该 field 对象：

```html
<template #remark="{ scope }">
  <span :title="scope.content">{{ scope.content }}</span>
</template>
```

自定义 label 插槽名 = `${prop}Label`。

### 6. 跨列

```ts
{ prop: 'address', label: '联系地址', content: '', colspan: 2 }
```

### 7. 详情页嵌入表格

```html
<EzDescriptions title="明细列表">
  <EzTable :table-data="tableData" :columns="tableColumns" />
</EzDescriptions>
```

### 8. Detail 类型定义

附件字段在详情中为数组，在表单提交中通常为字符串或 `EzUploadResFile[]`，各接口独立定义：

```ts
export interface IServicerDetail {
  id: string
  name: string
  contactPeople: string
  createTime: number | ''
  licensePath: string[]   // 详情中图片为数组
}
```
