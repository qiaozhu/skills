# 表单页模式

表单页使用 `el-form` 包裹，内部用 **EzDescriptions** 作为分组布局容器，`el-form-item` 直接放入默认插槽实现栅格对齐。文件上传使用 **EzUpload**。

## EzUpload 核心机制

| prop / 方法 | 职责 |
|-------------|------|
| `defaultFiles` | **回显**：传入已有文件列表用于展示，新增/编辑时赋值 |
| `v-model` | **收集**：每次上传/删除后自动更新，类型取决于 `bindType` |
| `getUploadFiles(type)` | **提交**：通过 ref 主动获取提交用的文件值 |
| `bindType` | 决定 `v-model` 和 `getUploadFiles` 的返回类型（默认 `'res'`） |

### bindType 返回类型对照

| bindType | v-model / getUploadFiles 返回值 | 说明 |
|----------|--------------------------------|------|
| `'res'`（默认）| `(string \| undefined)[]` | 服务端存储路径（`fileUrl`） |
| `'preview'` | `(string \| undefined)[]` | 预览链接（`fileUri`） |
| `'all'` | `EzUploadUserFile[]` | 完整文件对象 |

### defaultFiles 支持格式

```ts
// 单个路径字符串
defaultFiles="https://xxx.com/file.jpg"

// 路径字符串数组
:defaultFiles="['https://xxx.com/1.jpg', 'https://xxx.com/2.jpg']"

// 对象数组（可附带标题等额外信息）
:defaultFiles="[{ url: 'https://xxx.com/file.jpg', title: '营业执照' }]"
```

---

## 完整示例（defaultFiles + v-model + getUploadFiles 同时使用）

三者职责不同，表单场景下通常同时使用：

- `defaultFiles`：回显已有文件（赋给独立 ref，接口回调后赋值）
- `v-model`：绑定 formData 字段，触发 `change` 校验（每次上传/删除后自动更新）
- `getUploadFiles('res')`：提交时获取全部文件路径（含回显原有文件 + 新上传文件）

```vue
<template>
  <div>
    <el-form :model="formData" :rules="formRules" ref="formRef" label-width="120px">
      <EzDescriptions title="基础信息">
        <el-form-item label="名称" prop="name">
          <el-input v-model.trim="formData.name" maxlength="50" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contactPeople">
          <el-input v-model.trim="formData.contactPeople" maxlength="30" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactNumber">
          <el-input v-model.trim="formData.contactNumber" maxlength="11" placeholder="请输入联系电话" />
        </el-form-item>
      </EzDescriptions>

      <EzDescriptions title="附件信息">
        <el-form-item label="营业执照" prop="licensePath">
          <EzUpload
            ref="licenseRef"
            v-model="formData.licensePath"
            :defaultFiles="licenseFiles"
            :action="uploadAction"
            :limit="1"
            :maxSize="20"
          />
        </el-form-item>
        <el-form-item label="其他材料" prop="otherPath">
          <EzUpload
            ref="otherRef"
            v-model="formData.otherPath"
            :defaultFiles="otherFiles"
            :action="uploadAction"
            :limit="3"
            :maxSize="20"
          />
        </el-form-item>
        <template #footer>
          <el-button type="primary" @click="handleSave">保存</el-button>
          <el-button @click="router.go(-1)">返回</el-button>
        </template>
      </EzDescriptions>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { EzUpload, type EzUploadDefaultFile, type EzUploadResFile } from '@yxzn/easyel'
import { assignObject } from '@yxzn/utils'
import { createValidator, isPhone } from '@yxzn/validator'
import useAxios from '@/utils/useAxios'
import api from '@/api/servicer'
import type { IServicerForm } from './ServicerModule.d'

const router = useRouter()
const route = useRoute()
onActivated(() => init())

// ========== 表单数据 ==========
// v-model 绑定字段，类型与 bindType 一致（默认 'res'：路径字符串数组）
const formData = reactive<IServicerForm>({
  name: '',
  contactPeople: '',
  contactNumber: '',
  licensePath: [] as EzUploadResFile[],
  otherPath: [] as EzUploadResFile[]
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  contactNumber: [{ message: '手机号格式不正确', trigger: 'blur', validator: createValidator(isPhone) }],
  // v-model 在上传/删除时触发 change，可直接校验数组长度
  licensePath: [{ required: true, type: 'array', min: 1, message: '请上传营业执照', trigger: 'change' }]
}

// ========== ref ==========
const formRef = ref<FormInstance>()
const uploadAction = api.upload

// defaultFiles：独立 ref，编辑时回显用，不与 v-model 混用
const licenseFiles = ref<EzUploadDefaultFile>([])
const otherFiles = ref<EzUploadDefaultFile>([])

// 组件 ref：提交时调用 getUploadFiles
const licenseRef = ref<InstanceType<typeof EzUpload>>()
const otherRef = ref<InstanceType<typeof EzUpload>>()

// ========== 编辑回填 ==========
const fetchDetail = async () => {
  const res = await useAxios.get(api.detail, { params: { id } })
  assignObject(formData, res)
  // defaultFiles 必须与 v-model 绑定值保持不同引用，否则会造成无限循环
  // 使用 JSON.parse(JSON.stringify(...)) 深拷贝，确保与 formData 字段完全独立
  licenseFiles.value = res.licensePath ? JSON.parse(JSON.stringify([res.licensePath])) : []
  otherFiles.value = JSON.parse(JSON.stringify(res.otherPath || []))
}

// ========== 保存 ==========
const handleSave = () => {
  formRef.value!.validate(async (valid: boolean) => {
    if (!valid) return
    // getUploadFiles 获取全部文件（含回显原有 + 新上传），比 v-model 更可靠
    const data: Record<string, any> = {
      ...formData,
      licensePath: licenseRef.value!.getUploadFiles('res').join(','),
      otherPath: otherRef.value!.getUploadFiles('res')
    }
    if (routeName === 'ServicerEdit') data.id = id
    await useAxios.post(api.save, data)
    ElMessage.success('操作成功')
    router.go(-1)
  })
}

// ========== 统一初始化入口 ==========
let routeName = ''
let id = ''
const init = () => {
  routeName = route.name as string
  id = route.params.id as string
  if (routeName === 'ServicerEdit') fetchDetail()
}
init()
</script>
```

---

## 关键要点

### 1. defaultFiles 必须深拷贝赋值

`defaultFiles` 与 `v-model` 绑定值**不能是同一引用**，否则会导致 `modelValue` 被 `defaultFiles` 覆盖，造成无限循环。

```ts
const licenseFiles = ref<EzUploadDefaultFile>([])

const fetchDetail = async () => {
  const res = await useAxios.get(api.detail, { params: { id } })
  assignObject(formData, res)  // formData.licensePath 已引用 res.licensePath
  // 深拷贝，确保与 formData.licensePath 完全独立
  licenseFiles.value = JSON.parse(JSON.stringify(res.licensePath ? [res.licensePath] : []))
}
```

`defaultFiles` 是响应式监听的，赋值后组件立即更新展示。

### 2. getUploadFiles 在提交时调用

```ts
// 'res' → 服务端路径字符串数组（默认）
licenseRef.value!.getUploadFiles('res')   // string[]

// 'preview' → 预览链接数组
licenseRef.value!.getUploadFiles('preview')

// 'all' → 完整 EzUploadUserFile 对象数组
licenseRef.value!.getUploadFiles('all')
```

`getUploadFiles` 包含**回显的原有文件 + 本次上传的新文件**，是表单提交的可靠来源。

### 3. 单文件 vs 多文件的提交处理

```ts
// 单文件：取第一个路径
licensePath: licenseRef.value!.getUploadFiles('res')[0] ?? ''

// 多文件，逗号拼接
otherPath: licenseRef.value!.getUploadFiles('res').join(',')

// 多文件，保留数组
otherPath: licenseRef.value!.getUploadFiles('res')
```

### 4. EzUpload ref 类型声明

```ts
import { EzUpload } from '@yxzn/easyel'
const licenseRef = ref<InstanceType<typeof EzUpload>>()
```

### 5. 表单校验上传字段

上传字段必须绑定 `v-model`，否则 `trigger: 'change'` 无法触发：

```ts
// formData 中声明字段
licensePath: [] as EzUploadResFile[]

// formRules 中校验
licensePath: [{ required: true, type: 'array', min: 1, message: '请上传营业执照', trigger: 'change' }]
```

> `v-model` 在上传成功或删除时自动更新，触发 change 校验。提交时仍用 `getUploadFiles` 取值（含回显原有文件）。

### 6. assignObject 回填表单数据

```ts
import { assignObject } from '@yxzn/utils'
assignObject(formData, res)  // 只写入 formData 中已有的同名 key，不污染其他字段
```

### 7. onActivated 与初始化

keep-alive 场景下配合使用：

```ts
onActivated(() => init())
const init = () => {
  routeName = route.name as string
  id = route.params.id as string
  if (routeName === 'ServicerEdit') fetchDetail()
}
init()
```
