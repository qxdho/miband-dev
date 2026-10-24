---
title: 快应用运行时
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/04-快应用运行时与-fetch.md"
contributors: [miband-dev]
---

# 快应用运行时

<StatusBadge status="sourced" verified="2026-10-25" />

结论：`fetch` 模块存在且已注册，权限层不拦截，代码路径一直走到 DNS 解析才失败。失败原因有三个，彼此独立，需要分开处理：模块名缺少 `@` 前缀导致查表失败，设备没有 DNS 解析能力，设备没有网络出口。

这三个原因的表现分别是 `fetch` 为 `undefined`、`Couldn't resolve host name`（`code 6`）、`Couldn't connect to server`（`code 7`）。

## 运行时组成

手环上的快应用是一组 JS 加清单文件，安装到 `/data/` 下，在 `/data/apps.json` 中登记，由 QuickJS 执行。这套形态与 Android 快应用同源，运行时 API 集经过小米裁剪。

### 已安装应用

手环日志中可见的包名：

| 包名 | 说明 |
| --- | --- |
| `icu.ccicc.jslab` | JSLab，调试用 JS 运行环境，实测依赖它执行 |
| `com.lst.bandtotp` | 二次验证码 |
| `moye.vela.calculator` | 计算器 |
| `com.yzf.daymatter` | 倒数日 |
| `com.haooz.chedule` | 课程表 |
| `com.arknights.spoor.gacha` | 抽卡记录 |

### 注册表 `/data/apps.json`

序列化代码在 `package.cpp`，字段如下：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `names` | array | 包名等标识 |
| `minAPILevel` | int | 最低 API 级别 |
| `minPlatformVersion` | int | 最低平台版本 |
| `standalone` | bool | 是否独立运行 |
| `needNetwork` | bool | 是否依赖网络，默认 `false` |
| `installedTimestamp` | int | 安装时间 |

`needNetwork` 在 `vendor/oss_quickapp/include/quickapp.h:246` 的声明为：

```c
bool needNetwork; // APP是否依赖网络 默认false
```

`vendor/oss_quickapp/shell/common/permission/permission.md:140` 也有该字段的说明。

该字段在固件里只出现 1 次，位于 `package.cpp` 的 `apps.json` 序列化代码中，属于元数据，读入后没有任何分支用它申请网络。把它当作打开网络权限的钥匙是早期误判，结论已推翻。

## JIDL 绑定层

每个系统能力（`@system.fetch`、`@system.network`、`@system.prompt` 等）在编译期登记到一张 JIDL（JS Interface Description Language）表中，运行时 `import` 按名字查表，查不到即得到 `undefined`。

10 Pro 使用新一代实现，9 Pro 使用老的 AIOTJS 直接绑定：

| 标记串 | 10 Pro | 9 Pro |
| --- | ---: | ---: |
| `jidl_feature` | 21 | 0 |
| `fetch_impl` | 11 | 0 |

两台设备上的 `fetch` 是两套不同的代码，9 Pro 的经验不能直接套用到 10 Pro。

### feature 裁剪

哪些 JIDL 模块被编进固件，由编译期 Kconfig 与 Makefile 决定。固件中可见 `CONFIG_` 前缀字符串 8 处、`Vela` 8 处，完整的配置表没有保留。

`canUse('@system.fetch')` 返回 `true`，说明 `fetch` 在裁剪时被保留。「10 Pro 不支持 fetch」在「模块未编入固件」这一层面上不成立。

## 权限系统

### `canIUse` 与 `@` 前缀

JSLab 真机实测：

```js
canIUse('@system.fetch')   // 返回 true
canIUse('fetch')           // 返回 false
```

`@` 前缀是必须的。`canIUse` 执行真实的表查找，不做名字归一化，写 `'fetch'` 即查不到。

应用代码写错模块名时的形态：

```js
import fetch from 'fetch';      // 查表失败，fetch 为 undefined
fetch.fetch({ url: '...' })     // TypeError: Cannot read property 'fetch' of undefined
```

故障表现为「fetch 不存在」，不是「网络失败」。这是三个失败原因中最容易被误诊成网络问题的一个。

### 权限层不拦截

早期怀疑厂商在权限层关闭了网络能力，实测否定：

- 请求进入 DNS 解析阶段，报错是 `Couldn't resolve host name`，不是 `permission denied`；
- DNS 解析位于 `requestPermissions` 下游。

权限检查是通过的。该结论仍然有效。

## `fetch` 的行为

### 调用形态

```js
import fetch from '@system.fetch'

fetch.fetch({
  url: 'https://example.com/',
  method: 'GET',            // 默认 GET
  responseType: 'text',     // text | json | arraybuffer
  data: '...',              // POST body
  header: { 'Content-Type': 'application/x-www-form-urlencoded' },
  success: (res) => { /* res.code, res.data, res.headers */ },
  fail:    (err) => { /* err */ },
  complete: () => {}
})
```

不传 `success` 与 `fail` 时返回 Promise，两种形态同时支持。

### 实测结果总表

`code` 为 Promise 拒绝时 `err.code` 的取值：

| 探针 | URL | 回调结果 | Promise 结果 | 耗时 |
| --- | --- | --- | --- | --- |
| P1 | `http://154.9.24.61/` | `Couldn't connect to server` | `{code: 7}` | 约 59 ms |
| P1+H | `http://154.9.24.61/` 加 `Host: qxdho.top` | 同上 | `{code: 7}` | 约 60 ms |
| P2 | `http://qxdho.top/` | `Couldn't resolve host name` | `{code: 6}` | 快 |
| P3 | `https://qxdho.top/` | `Couldn't resolve host name` | `{code: 6}` | 快 |
| P4 | `https://154.9.24.61/` | `Couldn't connect to server` | `{code: 7}` | 约 163 ms |
| P5 | `ftp://...` | `invalid url` | 无 | 立即 |
| P6 | 空 URL | `invalid url` | 无 | 立即 |

### 错误码语义

| 现象 | 含义 | 发生层 |
| --- | --- | --- |
| `invalid url` | URL 格式校验失败 | JS 绑定的参数校验 |
| `code 6` / `Couldn't resolve host name` | DNS 解析失败 | 名字解析层 |
| `code 7` / `Couldn't connect to server` | TCP 连接失败 | socket 的 `connect()` |

三层是串行的。能走到 `code 7` 说明 URL 校验与 DNS 都已通过，能走到 `code 6` 说明参数校验已通过。探针的作用是把失败点逐层向后推。

### `code 7` 的细节

- 到裸 IP 的 `connect()` 在 59 ms 内失败，不是超时，超时量级通常是 30 s 或 75 s；
- 快失败说明包没有发出，而是本地没有可用路由，`connect()` 直接返回错误；
- 改 `Host` 头不改变结果，P1 与 P1+H 完全一致，请求没有出网卡。

## 三个失败原因的关系

```
应用代码
   │
   ├─ ① 模块名缺少 @ → fetch 为 undefined，调用抛 TypeError
   │
   └─ 模块名正确
        │
        ├─ ② 域名 → DNS 解析失败（code 6）
        │
        └─ ③ 裸 IP → TCP 连接失败（code 7）
```

① 属于应用层，改代码即可。② 与 ③ 属于设备层，需要靠网络通路解决：

- 只缺 DNS 时，② 失败而 ③ 成功，可用 JS shim 把域名换成 IP，但 HTTPS 会因证书校验失败而不可用；
- 出口缺失时，② ③ 全失败，只能补通路。

实测为 ② ③ 全失败，因此 shim 方案不成立。通路的断点见[网络通路](/protocol/network)。

## 常见误诊

| 现象 | 错误结论 | 正确结论 |
| --- | --- | --- |
| `canUse('@system.fetch') === true` 但请求仍失败 | 模块在，一定是网络问题 | 还需确认应用写的是 `@system.fetch` |
| `system.network.getType() === 'none'` | 设备没有网络 | 它只报物理接口，TUN 不在表里 |
| 报 `Couldn't resolve host name` | DNS 服务器故障 | 设备上根本没有解析器 |
| 报 `Couldn't connect to server` | 服务器拒绝连接 | 本地无路由，包没有发出 |

## 复现

JSLab 中执行以下代码，`probe` 同时走回调与 Promise 两条路径，便于对照：

```js
import fetch from '@system.fetch'

function probe(tag, url, hostHeader) {
  const header = hostHeader ? { Host: hostHeader } : {}
  fetch.fetch({
    url, header, method: 'GET',
    success: (r) => console.log(tag, 'S', r.code, String(r.data).slice(0, 80)),
    fail:    (e) => console.log(tag, 'F', JSON.stringify(e)),
  })
  fetch.fetch({ url, header, method: 'GET' })
    .then(r => console.log(tag, 'P-ok', r.code))
    .catch(e => console.log(tag, 'P-err', JSON.stringify(e)))
}

console.log('canUse @ =', canIUse('@system.fetch'))
console.log('canUse bare =', canIUse('fetch'))
console.log('netType =', require('@system.network').getType())
probe('P1', 'http://154.9.24.61/')
probe('P2', 'http://qxdho.top/')
probe('P3', 'https://qxdho.top/')
```

完整探针脚本位于 `研究环境/probe/resolve-probe.js`，含 shim 安装与卸载逻辑，以及 IPv4 直连与 `Host` 头的对照实验。shim 后来被证明不能解决问题，代码仍保留。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| `fetch` 是否有并发与超时上限 | 待定，未测 |
| `responseType: 'arraybuffer'` 是否可用 | 待定，固件中有实现（`arraybuffer` 2 处），未实测 |
| feature 裁剪的完整开关表 | 待定，配置表未保留在固件中 |
| `needNetwork` 是否影响运行时行为 | 推断，仅影响安装提示 |
| `needNetwork` 作为网络权限开关 | 已推翻 |

## 相关页面

- 打包与安装流程：[安装与调试](/quickapp/setup)
- 运行时的其它失败案例：[快应用常见问题](/quickapp/pitfalls)
- 网络链路的断点位置：[网络通路](/protocol/network)
- 补 `/dev/tun` 的驱动路径：[内核模块系统](/native/modules)
