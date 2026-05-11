# @yxzn 工具包 API 参考

## @yxzn/validator

### 类型判断

```ts
import { isString, isNumber, isBoolean, isObject, isArray,
         isNull, isUndefined, isEmpty, isFunction } from '@yxzn/validator'

isEmpty('')         // true（'' / null / undefined 均为空）
isObject({})        // true（仅普通对象 {}，不含 Array）
```

### 值校验

| 函数 | 说明 |
|------|------|
| `isPhone(val)` | 手机号（1 开头 11 位） |
| `isTel(val)` | 座机号 |
| `isEmail(val)` | 邮箱 |
| `isInt(val, allowZero?, allowNegative?)` | 整数 |
| `isNumeric(val, allowZero?, decimalPlaces?, allowNegative?)` | 数字（含小数） |
| `isInRange(val, min, max)` | 数字范围 |
| `isIdCard(val)` | 18 位身份证（含校验码） |
| `isChineseName(val)` | 中文姓名 |
| `isAlphanumeric(val)` | 字母数字 |
| `isAlphanumericMixed(val)` | 必须同时含字母和数字 |
| `isBankCard(val)` | 银行卡号 |
| `isLicensePlate(val)` | 中国车牌号 |
| `isUnifiedSocialCode(val)` | 统一社会信用代码 |
| `isPayPassword(val)` | 6 位支付密码 |

### 表单校验工厂（async-validator）

`createValidator(fn, ...preset)` 将任意校验函数包装为 async-validator 格式。`preset` 为透传给 `fn` 的额外参数：

```ts
import { createValidator, isNumeric, isPhone, isInt } from '@yxzn/validator'

const formRules: FormRules = {
  // 无额外参数 — 直接传函数引用
  phone: [
    { required: true, message: '请输入手机号' },
    { message: '手机号格式不正确', trigger: 'blur', validator: createValidator(isPhone) }
  ],

  // 有额外参数 — 透传给校验函数
  // isNumeric(val, allowZero, decimalPlaces, allowNegative)
  price: [
    { required: true, message: '请输入价格' },
    { message: '请输入最多2位小数的正数', trigger: 'blur', validator: createValidator(isNumeric, true, 2) }
  ],

  // isInt(val, allowZero, allowNegative)
  count: [
    { message: '请输入正整数', trigger: 'blur', validator: createValidator(isInt, false) }
  ]
}
```

---

## @yxzn/utils

### URL / Cookie / Storage

```ts
import { getQuery, setStorage, getStorage } from '@yxzn/utils'

getQuery('token')               // 兼容 hash 路由模式
setStorage('user', { id: 1 })  // JSON 序列化存入 localStorage
getStorage<User>('user')        // 反序列化读取，返回 T | string | null
```

### 对象 / 数组操作

```ts
import { assignObject, assignArrayByKey, mergeArrayItems } from '@yxzn/utils'

// 将 source 中同名字段写入 target（就地修改）
assignObject(formData, res)

// 将对象数据按 prop 回填到数组的 content 字段（详情页常用）
assignArrayByKey(fields, detailData.value)
// 完整签名：assignArrayByKey(target, source, keyField = 'prop', contentField = 'content')

// 按 keyField 将 patches 合并/插入到 target 数组
mergeArrayItems(columns, [
  { prop: 'age', label: '年龄', insert: 'name' }, // 插入到 name 列前
  { prop: 'name', minWidth: 200 }                  // 覆盖 name 列 minWidth
])
```

### 函数工具

```ts
import { debounce, throttle, randomString, openNewTab } from '@yxzn/utils'

debounce(fn, 300)
throttle(fn, 250)
randomString(16, true)  // 时间戳 + 随机字符串
```

---

## @yxzn/filter

### 数字 / 金额

```ts
import { formatMoney, formatNumber, formatFixed } from '@yxzn/filter'

formatMoney(1234567.89)        // '1,234,567.89'
formatMoney(1000, 0)           // '1,000'
formatMoney(1.1, 2, false)     // '1.1'（不补零）
formatFixed(3.1, 2)            // '3.10'
```

### 日期 / 倒计时

```ts
import { formatDate, formatCountdown } from '@yxzn/filter'

formatDate(1700000000000)                     // '2023-11-15 06:13:20'
formatDate('2024-01-01', 'YYYY年MM月DD日')
formatCountdown(3661)                         // '01:01:01'
```

### 脱敏 / 中文大写

```ts
import { maskBankCard, maskIdCard, amountToChinese } from '@yxzn/filter'

maskBankCard('6225000012345678')  // '************5678'
maskIdCard('110101199001011234')  // '1101**********1234'
amountToChinese(1234.56)         // '壹仟贰佰叁拾肆元伍角陆分'
```

### 字典翻译 / 后缀拼接

```ts
import { dictTranslate, joinWithSuffix } from '@yxzn/filter'

const statusDict = [{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]
dictTranslate(1, statusDict)           // '启用'
joinWithSuffix('1,2,3', '个月')        // '1个月,2个月,3个月'
```

### 在 EzTable columns 中作为 filter 使用

`filter` 接收单参函数 `(value) => string`。无额外参数时可直接传函数引用；有额外参数时必须用箭头函数包裹：

```ts
const columns: TableColumn<Row>[] = [
  // 无额外参数 — 直接传函数引用
  { prop: 'createTime', label: '创建时间', filter: formatDate },

  // 有额外参数 — 必须用箭头函数包裹
  { prop: 'amount', label: '金额', filter: (val: any) => formatMoney(val, 2) },
  { prop: 'status', label: '状态', filter: (val: any) => dictTranslate(val, statusDict.value) }
]
```

---

## @yxzn/calc

精确小数运算，避免浮点误差：

```ts
import { calc } from '@yxzn/calc'

calc.add(0.1, 0.2)          // 0.3
calc.subtract(1, 0.1)       // 0.9
calc.multiply(0.1, 0.2)     // 0.02
calc.divide(0.3, 0.1)       // 3
calc.toFixed(1.005, 2)      // '1.01'
```

---

## @yxzn/directive

### v-allow — 限制输入框字符

```ts
import { vAllow } from '@yxzn/directive'
app.directive('allow', vAllow)
```

```html
<!-- 仅允许数字 -->
<el-input v-allow.number />

<!-- 允许数字和小数点 -->
<el-input v-allow.number.float />

<!-- 允许数字并额外允许 @ -->
<el-input v-allow.number :v-allow="{ includeChars: '@' }" />
```

在 EzTable 行内编辑中通过 `editorProps.vAllow` 传递：

```ts
{
  prop: 'price',
  enableEdit: true,
  editorType: 'input',
  editorProps: { vAllow: { modifiers: { number: true, float: true } } }
}
```
