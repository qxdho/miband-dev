# 04 · 快应用运行时与 fetch

## 本文讲什么

快应用是怎么被加载和运行的、JS 里 `import fetch from '@system.fetch'` 这句话背后发生了什么、为什么在 10 Pro 上它会以三种不同的方式失败。**这一篇是整个项目的起点**——所有网络层面的研究都是为了回答这里的"为什么请求发不出去"。

**结论**：`fetch` 模块**存在且被注册**，权限层**不拦截**，代码路径一直走到 DNS 解析才失败。失败有三个独立原因，必须分开处理：

1. 应用写的模块名少了 `@` 前缀 → `canIUse` 返回 `false`，被当成无效模块
2. 设备没有 DNS 解析能力 → 域名请求全部 `Couldn't resolve host name`
3. 设备没有网络出口 → 裸 IP 请求 `Couldn't connect to server`

## 快应用是什么

手环上的应用形态。一个快应用是一组 JS + 清单文件，装到 `/data/` 下，在 `/data/apps.json` 里登记，由 QuickJS 执行。和 Android 快应用同源，但运行时的 API 集是小米自己裁剪过的。

### 已安装应用（手环日志中可见）

| 包名 | 说明 |
|---|---|
| `icu.ccicc.jslab` | **JSLab**——调试用 JS 运行环境，本文所有实测都靠它 |
| `com.lst.bandtotp` | 二次验证码 |
| `moye.vela.calculator` | 计算器 |
| `com.yzf.daymatter` | 倒数日 |
| `com.haooz.chedule` | 课程表 |
| `com.arknights.spoor.gacha` | 抽卡记录 |

### 注册表 `/data/apps.json`

序列化代码在 `package.cpp`，字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `names` | array | 包名等标识 |
| `minAPILevel` | int | 最低 API 级别 |
| `minPlatformVersion` | int | 最低平台版本 |
| `standalone` | bool | 是否独立运行 |
| `needNetwork` | bool | **是否依赖网络，默认 false** |
| `installedTimestamp` | int | 安装时间 |

`needNetwork` 在 `vendor/oss_quickapp/include/quickapp.h:246` 的声明是：

```c
bool needNetwork; // APP是否依赖网络 默认false
```

在 `vendor/oss_quickapp/shell/common/permission/permission.md:140` 也有文档。

> ⚠️ **这个字段不是开关**。它在固件里只出现 1 次，位于 `package.cpp` 的 `apps.json` 序列化代码中——纯粹是元数据，读了之后没有任何分支拿它去申请网络。曾经把它当成"打开网络权限的钥匙"，是错的。

## JIDL：JS API 的绑定层

快应用的每个系统能力（`@system.fetch`、`@system.network`、`@system.prompt`…）都要在编译期登记到一张 **JIDL（JS Interface Description Language）表**里，运行时 `import` 时按名字查表，查不到就是 `undefined`。

这套机制在 10 Pro 上是**新一代实现**：

| 标记串 | 10 Pro | 9 Pro |
|---|---:|---:|
| `jidl_feature` | 21 | 0 |
| `fetch_impl` | 11 | 0 |

9 Pro 用的还是老的 AIOTJS 直接绑定，10 Pro 换成了 feature 框架 + 独立的 `fetch_impl` 模块。**这解释了为什么不能拿 9 Pro 的经验直接套 10 Pro**：`fetch` 在两台机器上是两套完全不同的代码。

### feature 裁剪

哪些 JIDL 模块会被编进固件，由编译期的 Kconfig / Makefile 决定。固件里能看到 `CONFIG_` 前缀的字符串 8 处、`Vela` 8 处，但完整的配置表没有保留。

**关键事实**：`canUse('@system.fetch')` 返回 `true`，说明 `fetch` 这一项**在裁剪时被保留了**。所以"10 Pro 不支持 fetch"这个流传的说法，至少在"模块没编进来"这个层面上是错的。

## 权限系统

### `canIUse` 与 `@` 前缀

实测（JSLab，真机）：

```js
canIUse('@system.fetch')   // → true
canIUse('fetch')           // → false（记作 bogus）
```

**`@` 前缀是必须的。** `canIUse` 是真实的表查找，不做名字归一化——写 `'fetch'` 就是查不到。

这不是小事：如果一个应用里写的是

```js
import fetch from 'fetch';        // ❌ 查不到，fetch 是 undefined
fetch.fetch({ url: '...' })       // → TypeError: Cannot read property 'fetch' of undefined
```

它会表现为"fetch 不存在"，而不是"网络失败"。**这是三个失败原因里最容易被误诊成一个的那个。**

### 权限层不拦截

早期的怀疑是"设备厂商在权限层把网络能力关掉了"。实测否定了这一点：

- 请求进入了 **DNS 解析阶段**（报错是 `Couldn't resolve host name`，不是 `permission denied`）
- DNS 解析位于 `requestPermissions` **下游**

所以权限检查是通过的。这条结论至今仍然有效（虽然后来对"有没有网络"的判断被推翻过，见 [附录](附录-研究历程与误判.md)）。

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

同时支持 Promise 形态（不传 `success`/`fail` 时返回 Promise）。

### 实测结果总表

在 JSLab 里跑了四个探针，结果如下（`code` 为 Promise 拒绝时的 `err.code`）：

| 探针 | URL | 回调结果 | Promise 结果 | 耗时 |
|---|---|---|---|---|
| P1 | `http://203.0.113.10/` | `Couldn't connect to server` | `{code: 7}` | ~59 ms |
| P1+H | `http://203.0.113.10/` + `Host: example.com` | 同上 | `{code: 7}` | ~60 ms |
| P2 | `http://example.com/` | `Couldn't resolve host name` | `{code: 6}` | 快 |
| P3 | `https://example.com/` | `Couldn't resolve host name` | `{code: 6}` | 快 |
| P4 | `https://203.0.113.10/` | `Couldn't connect to server` | `{code: 7}` | ~163 ms |
| P5 | `ftp://...` | `invalid url` | — | 立即 |
| P6 | 空 URL | `invalid url` | — | 立即 |

### 错误码语义

| 现象 | 含义 | 发生在哪一层 |
|---|---|---|
| `invalid url` | URL 格式校验失败 | JS 绑定的参数校验 |
| `code 6` / `Couldn't resolve host name` | DNS 解析失败 | 名字解析层 |
| `code 7` / `Couldn't connect to server` | TCP 连接失败 | socket `connect()` |

这三层是**串行**的：能走到 `code 7`，说明 URL 校验和 DNS 都过去了；能走到 `code 6`，说明参数校验过了。**探针的价值就在于把失败点一层层往后推。**

### `code 7` 的细节

- 到裸 IP 的 `connect()` 在 **59 ms** 内失败，不是超时（超时通常是 30 s 或 75 s 量级）
- 快失败说明不是"包发出去了没回应"，而是**本地就没有可用路由**，`connect()` 直接返回错误
- 改 `Host` 头不改变结果（P1 vs P1+H 完全一致），说明请求根本没出网卡

## 三个失败原因的关系

```
应用代码
   │
   ├─ ① 模块名写错（少了 @）→ fetch 是 undefined，调用直接 TypeError
   │
   └─ 模块名写对
        │
        ├─ ② 域名 → DNS 解析失败（code 6）
        │
        └─ ③ 裸 IP → TCP 连接失败（code 7）
```

① 是**应用层**问题，改代码即可。
② 和 ③ 是**设备层**问题，都要靠 [05 篇](05-网络通路.md) 的通路来解决。区别在于：

- 如果只缺 DNS，②失败而③成功 → 可以用 JS shim 把域名换成 IP（但 HTTPS 会因为证书校验失败而不可用）
- 如果连出口都没有，②③全失败 → 只能补通路

**实测是②③全失败**，所以 shim 方案（把 hostname 改写成 IP）不成立。

## 常见误诊

| 现象 | 错误结论 | 正确结论 |
|---|---|---|
| `canUse('@system.fetch') === true` 但仍失败 | "模块在，一定是网络问题" | 还要看应用写的是不是 `@system.fetch` |
| `system.network.getType() === 'none'` | "设备没网" | 它只报**物理接口**，TUN 不在表里，见 [05 篇](05-网络通路.md#为什么-gettype-不能当判据) |
| 报 `Couldn't resolve host name` | "DNS 服务器挂了" | 设备上根本没有解析器 |
| 报 `Couldn't connect to server` | "服务器拒绝连接" | 本地无路由，包没出去 |

## 复现

JSLab 里粘贴以下代码（`probe` 同时走回调和 Promise 两条路，便于对照）：

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
probe('P1', 'http://203.0.113.10/')
probe('P2', 'http://example.com/')
probe('P3', 'https://example.com/')
```

完整版探针脚本见 `/work/chaos/probe/resolve-probe.js`（含 shim 安装/卸载逻辑，虽然后来证明 shim 不解决问题，但代码保留了 IPv4 直连 + `Host` 头的对照实验）。

## 未决问题

| 问题 | 状态 |
|---|---|
| `fetch` 是否有并发/超时上限 | ❓ 未测 |
| `responseType: 'arraybuffer'` 是否可用 | ❓ 固件里有实现（`arraybuffer` 2 处），未实测 |
| feature 裁剪的完整开关表 | ❓ 配置表未保留在固件里 |
| `needNetwork` 到底影响什么 | ⚠️ 推断：只影响安装时的提示，不影响运行时 |
