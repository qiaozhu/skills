# 列表页模式

列表页由**搜索区域**（`EzDescriptions :span="0"`）+ **表格区域**（`EzDescriptions` + `EzTable`）组成，配合 `useTable` 实现请求与分页，配合 `useDate` 处理时间范围查询。

## 完整示例

```vue
<template>
  <div>
    <!-- 搜索区 -->
    <EzDescriptions :span="0" label-width="80px">
      <el-form-item label="名称">
        <el-input v-model.trim="tableState.query.name" clearable placeholder="请输入" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="联系人">
        <el-input v-model.trim="tableState.query.contactPeople" clearable placeholder="请输入" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="创建时间">
        <el-date-picker
          v-model="createTimeRes.vModel"
          type="datetimerange"
          format="YYYY-MM-DD HH:mm:ss"
          :default-time="createTimeRes.defaultTime"
          :unlink-panels="true"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="createTimeRes.handleValueChange"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </EzDescriptions>

    <!-- 表格区 -->
    <EzDescriptions title="联系人列表">
      <template #right>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
      </template>
      <EzTable
        border
        :table-data="tableState.data"
        :columns="columns"
        :show-pagination="true"
        :pagination-config="tableState.pagination"
        @pagination-current-change="tableState.pageCurrentChange"
        @pagination-size-change="tableState.pageSizeChange"
      >
        <template #handle="{ scope }">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">查看</el-button>
          <el-button link type="primary" icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
        </template>
      </EzTable>
    </EzDescriptions>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTable, useDate, type TableColumn } from '@yxzn/easyel';
import { formatDate } from '@yxzn/filter';
import api from '@/api/servicer';
import type { IServicerRow, IServicerSearch } from './ServicerModule.d';

const router = useRouter();
const route = useRoute();

// ========== 列配置 ==========
const columns = reactive<TableColumn<IServicerRow>[]>([
  { label: '名称', prop: 'name', minWidth: 160 },
  { label: '联系人', prop: 'contactPeople', minWidth: 120 },
  { label: '联系电话', prop: 'contactNumber', minWidth: 140 },
  { label: '创建时间', prop: 'createTime', minWidth: 160, filter: formatDate },
  { label: '操作', prop: 'handle', fixed: 'right', minWidth: 160 }
]);

// ========== useTable ==========
const tableState = useTable<IServicerRow, IServicerSearch>({
  query: {
    name: '',
    contactPeople: '',
    startTime: '',
    endTime: ''
  },
  requestConfig: { url: api.pageList }
});

// ========== useDate（时间范围） ==========
const createTimeRes = useDate(query, 'startTime', 'endTime');

// ========== 操作方法 ==========
const search = () => tableState.search();

const handleReset = () => {
  createTimeRes.reset();
  tableState.resetQuery(true);
};

const handleAdd = () => router.push('/servicer/add');
const handleEdit = (row: IServicerRow) => router.push(`/servicer/edit/${row.id}`);
const handleDetail = (row: IServicerRow) => router.push(`/servicer/detail/${row.id}`);

// ========== 统一初始化入口 ==========
const init = () => tableState.search();
init();
</script>
```

## 关键要点

### 1. useTable 带双泛型

```ts
const tableState = useTable<IServicerRow, IServicerSearch>({
  query: { ... },
  requestConfig: { url: api.pageList }
});
```

- `TRow` → `tableState.data` 类型为 `IServicerRow[]`
- `TQuery` → 查询条件类型

### 2. 分页事件绑定

```html
@pagination-current-change="tableState.pageCurrentChange" @pagination-size-change="tableState.pageSizeChange"
```

### 3. 重置逻辑

有时间范围时需同时重置 useDate：

```ts
const handleReset = () => {
  createTimeRes.reset(); // 清空时间选择器的 vModel
  tableState.resetQuery(true); // 重置 query 并重新查询
};
```

无时间范围则直接：

```ts
const handleReset = () => tableState.resetQuery(true);
```

### 4. useDate 用法

```ts
const createTimeRes = useDate(query, 'startTime', 'endTime');
```

模板绑定：

```html
<el-date-picker
  v-model="createTimeRes.vModel"
  type="datetimerange"
  :default-time="createTimeRes.defaultTime"
  @change="createTimeRes.handleValueChange"
/>
```

### 5. 搜索区使用 EzDescriptions :span="0"

`:span="0"` 表示容器模式（不分栏），`el-form-item` 在内部自动换行排列。

### 6. 表格区 EzDescriptions 的 #right 插槽

工具栏按钮（新增等）放在 `#right` 插槽内：

```html
<EzDescriptions title="联系人列表">
  <template #right>
    <el-button type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
  </template>
  <EzTable ... />
</EzDescriptions>
```

### 7. 操作列 prop 固定为 'handle'

```ts
{ label: '操作', prop: 'handle', fixed: 'right', minWidth: 160 }
```

对应模板中的 `<template #handle="{ scope }">` 插槽。

### 8. onBeforeRequest 拦截参数

需要在请求前处理参数时使用：

```ts
const tableState = useTable<IServicerRow, IServicerSearch>({
  query: { ... },
  requestConfig: { url: api.pageList },
  onBeforeRequest: payload => {
    // 可对请求参数payload做其他处理
    // do something
    return { status: true, data: payload };
  }
});
```
