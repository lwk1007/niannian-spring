# 念念 · Spring Boot 版

宠物数字生命纪念网站的服务端 + 现有前端，对标队友的 CSUFT OJ 架构（Spring Boot + MySQL + 托管部署）。
Node 版仍在 `C:\Users\卯余\Desktop\lianliansite` 运行，两者互不影响。

## 技术栈

| 层 | 选型 |
|---|---|
| JDK | 21（本机 24 亦可，编译目标锁 21） |
| 框架 | Spring Boot 4.1.2 |
| 持久层 | MyBatis-Plus 3.5.18.1（**boot4 专用 starter**） |
| 数据库 | 生产 MySQL 8 / 本地 H2（MySQL 兼容模式） |
| 迁移 | Flyway |
| 前端 | Vue 3.5 + Vite 7 + Element Plus 2.14（按需引入，产物直接进 jar） |
| 公开页 | Thymeleaf 服务端渲染（带 OG 标签，便于微信里分享） |
| 部署 | 微信云托管（Docker 多阶段构建） |

## 本地跑起来

```bash
mvn spring-boot:run
```

默认 `dev` profile，用 H2 文件库（`./data/niannian.mv.db`），不需要装 MySQL。
打开 http://127.0.0.1:8080 是落地页，`/app` 是应用，`/s/{分享码}` 是公开纪念页。

前端开发（改界面时用，带热更新，`/api` 自动代理到 8080）：

```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # 产物直接写进 src/main/resources/static
```

打包（**先 build 前端，再 package**，jar 里带的是构建后的静态资源）：

```bash
cd frontend && npm run build && cd ..
mvn -B package -DskipTests
# 产物 target/app.jar，约 34MB
java -Duser.timezone=Asia/Shanghai -jar target/app.jar
```

## 接口契约

所有 `/api/*` 统一信封（`/api/health` 除外，给云托管探活用）：

```json
{ "success": true,  "code": 200, "message": "success", "data": {...} }
{ "success": false, "code": 400, "message": "给它一个名字吧", "data": null }
```

错误响应里 `message` 就是给用户看的中文，前端直接 `throw new Error(message)` 就能弹提示，不用维护错误码字典。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 存活探测 |
| GET | `/api/me` | 匿名身份 + 宠物（含陪伴天数/互动计数/分享码）+ 各模块条数 + 选项目录 |
| POST | `/api/pet` | 领养或修改，同一接口 |
| DELETE | `/api/pet` | 一键抹掉全部数据 |
| POST | `/api/pet/interact` | 摸/喂/玩，返回人格化台词与新计数 |
| POST | `/api/pet/plant/water` | 给纪念植物浇水，一天限一次（重复 429） |
| GET | `/api/timeline` | 六种来源合成的时间轴，倒序 |
| GET | `/api/stats` | 陪伴数据聚合：互动构成/最近 30 天热力/亲密度累计曲线/本月回顾/心情分布 |
| GET / POST | `/api/moods` | 心情记录，POST 顺带返回安抚语 |
| GET / POST | `/api/letters` | 一封信，POST 有 60 秒冷却 |
| GET / POST | `/api/letters/ai` | 大模型写信；GET 返回是否已配置（`available`），未配置 POST 会 400 退回模板 |
| GET / POST | `/api/tributes` | 思念信箱，POST 同时点亮一支灯 |
| GET / POST | `/api/capsules` | 时光胶囊列表/新建 |
| POST | `/api/capsules/{id}/open` | 到期才可打开，未到期 403 |
| POST | `/api/share` | 开分享，重复调用不换码 |
| POST | `/api/share/off` | 收回分享 |
| POST | `/api/share/guest` | 设置访客互动：是否允许留言/献花、留言是否需审核 |
| GET | `/api/visitor-tributes` | 主人侧：全部访客互动（含待审核）与献花/点灯计数 |
| PUT | `/api/visitor-tributes/{id}` | 审核访客留言（通过/隐藏） |
| DELETE | `/api/visitor-tributes/{id}` | 删除一条访客互动 |
| GET | `/api/export` | 导出全部数据（JSON） |
| GET | `/api/public/{code}` | 公开纪念页数据（含访客留言/献花/点灯），无需身份 |
| POST | `/api/public/{code}/tribute` | 访客留言/献花/点灯，凭分享码即可，无需身份 |
| GET | `/s/{code}` | 公开纪念页 HTML（Thymeleaf + OG 标签 + 访客互动区） |
| GET | `/api/model/**` | 抠图模型文件同源代理（支持 Range、落盘缓存、仓库白名单） |

匿名身份：首次访问下发 `nn_uid`（32 位 hex，HttpOnly，SameSite=Lax），无需注册。

### 由服务端算好的派生值

前端不再自己拿时间戳做减法，也不用拼多个接口：

- `pet.days` 陪伴天数、`pet.stats.{touch,feed,play}`、`pet.shareId`、`pet.shareIncludePrivate`、`pet.shareAllowGuest`、`pet.shareModerate`、`pet.plant`（纪念植物阶段/浇水次数/今日可否浇水，阶段由浇水次数派生）
- `capsule.locked` 与 `capsule.content`（未到期时 content 直接是 `null`，接口层面拿不到）
- 时间轴 `at` 一律毫秒时间戳，浏览器 `new Date(ts)` 不会因时区偏移

### 隐私边界（和 Node 版有意不同的一处）

思念信箱在 Node 版里即使没勾"公开私密内容"，也会把最近 5 封塞进公开页。
这里改成**默认完全不外泄**：公开页只显示点灯数，正文要主人勾选 `includePrivate` 才出现。
心情、一封信、时光胶囊同理。

## 前端

`frontend/` 是独立的 Vite 工程，构建产物直接输出到 `src/main/resources/static/`，
所以部署时仍然只有**一个 jar**，不需要 nginx 分开托管。

```
frontend/
├── index.html              落地页（纯 HTML，Vite 只做资源处理）
├── app.html                应用入口（<div id="app">）
├── vite.config.js          多页构建 + /api 代理 + base.css 稳定路径回写
└── src/
    ├── styles/base.css     设计变量（颜色/字体/阴影），Thymeleaf 分享页也引这份
    ├── shared/pets.js      手绘宠物 SVG（猫/狗/其他），纯函数无依赖
    ├── landing/landing.js  落地页滚动显现
    └── app/
        ├── main.js         挂载 + 按需样式
        ├── App.vue         侧栏/顶栏/底部标签栏，含加载与未领养态
        ├── router.js       history 路由（/companion …）+ 导航配置
        ├── api.js          统一信封解包，失败直接抛 message
        ├── store.js        全局身份（/api/me）与派生标签
        ├── format.js       日期、天数、图片压缩
        ├── ui.js           ElMessage / ElMessageBox（走组件子路径，避免整包引入）
        ├── components/     SceneStage.vue（场景舞台 + 桌宠）、PetFigure.vue
        ├── lib/            抠图：cutout.js / dewhite.js / petCutout.js / matting*
        └── views/          9 个页面组件（含 OnboardingView）
```

### 页面与交互

| 路由 | 页面 | 关键实现 |
|---|---|---|
| `/app/onboarding` | 领养/修改向导 | 3 步 `el-steps`，照片在浏览器端压到 640px 再上传；`?edit=1` 复用为改资料；无宠物时路由守卫强制进来 |
| `/app/companion` | 陪伴 | 5 个 CSS 场景（按本地时间自动选，手动选过当天锁定）+ 抠图贴纸 + 8 个待机动作加权状态机 + 点击/拖拽/**抛投惯性** + 视线跟随 + 食盆/小球 + 亲密度进度 + **存在强度三档（静静留影/轻微陪伴/熟悉互动）+ 一键暂停** + **纪念植物（浇水养成，一天一次，阶段由浇水次数派生）** |
| `/app/memory` | 回忆 | 按月份分组的时间轴，七种来源各自配色徽标（含亲密度升级）+ 头部「第 N 天 / 周年 / 下一里程碑」+ 往年今日 + 写下一件往事（里程碑增删改） |
| `/app/stats` | 陪伴数据 | 手绘 SVG 图表：互动构成环形图、亲密度累计曲线、最近 30 天热力柱状图、心情分布、本月回顾卡片（不引图表库） |
| `/app/album` | 相册 | 多张照片瀑布流，批量上传（浏览器端压到 640px）、逐张备注、删除 |
| `/app/letter` | 一封信 | 信纸版式，旧信折叠面板；60 秒冷却由后端 429 兜底；**可选大模型写信**（未配置时自动退回模板） |
| `/app/mood` | 心情 | 五档心情圆点，选完才出现输入框；沉重档返回呼吸引导 |
| `/app/tribute` | 思念信箱 | 蜡烛在圆晕里，写完后点亮（CSS 火焰动画） |
| `/app/capsule` | 时光胶囊 | 未到期显示剩余天数；`content` 由后端置空，前端拿不到 |
| `/app/profile` | 我的 | 分享链接、私密内容开关、访客互动开关（允许留言/需审核）、**访客留言管理（通过/隐藏/删除）**、导出 JSON、一键删除（二次确认） |

Element Plus 只按需引入实际用到的 13 个组件（`unplugin-vue-components`），
主题在 `src/app/styles/theme.css` 里覆盖成橄榄绿 + 暖纸色，保持与落地页同一套观感。

端到端脚本（真浏览器点完整流程，含手机视口溢出检测）：

```bash
cd frontend && node scripts/e2e.mjs        # 领养→互动→亲密度→视线→抛投→各页→写信→分享→手机视口
cd frontend && node scripts/verify-props.mjs  # 食盆/小球专项
```

## 照片抠图

浏览器内两级确定性通道，**不上传照片、不依赖外部模型服务**：

| 级别 | 判据 | 实现 |
|---|---|---|
| 纸白底 | 边框白像素 ≥45% | `dewhite.js` 连通性泛洪（只吃和画面边缘连通的背景，白猫站白底也吃不错） |
| 任意纯色底 | 边框众数色一致度 ≥50% | `cutout.js` 取边框主色做色键，复用同一套泛洪，`removeWhite` 的 `isBg` 谓词 |
| 复杂背景 | — | 直接降级整图并提示换图 |

`petCutout.js` 里的 `ENABLE_AI` 默认关闭。语义抠图（BiRefNet-lite / RMBG-1.4）在当前 onnxruntime-web 上跑不通，实测两条硬限制：wasm 是 `OrtRun std::bad_alloc`（1024 输入激活超 wasm32 内存，fp16/fp32/单线程都炸），WebGPU 是 `Too many storage buffers in shader: 17 > maxStorageBuffersPerShaderStage 16`。链路（候选模型列表、加载或推理失败自动换下一个）完整保留，ORT 修了改回 `true` 即可。

模型文件若启用则走**同源代理** `/api/model/**`（`model/ModelProxyController`）：hf-mirror 对带 `Range` 头的跨域请求返回 `net::ERR_FAILED`，而 transformers.js 取元数据必带 `Range: bytes=0-0`，所以只能由服务端代拉；代理支持 Range、落盘缓存到 `./data/model-cache/`、白名单限定两个仓库防开放代理。

## 大模型写信（可选）

「一封信」默认走模板（把真实互动次数与心情填进去，`isDemo=1` 明确标注）。接上大模型后，「用 AI 写一封」会基于宠物性格、互动数据、主人写下的思念信，生成一封真正贴合的告别信。**不配置也完全可用**，功能自动退回模板。

接的是 OpenAI 兼容的 `/chat/completions` 协议，Ollama / DeepSeek / 通义 / Kimi 都能用：

| 环境变量 | 说明 |
|---|---|
| `NIANNIAN_AI_BASE_URL` | 接口基址，如 `http://localhost:11434/v1`（Ollama）或 `https://api.deepseek.com/v1` |
| `NIANNIAN_AI_MODEL` | 模型名，如 `qwen2.5:7b` / `deepseek-chat` |
| `NIANNIAN_AI_API_KEY` | 密钥（本地 Ollama 可留空） |
| `NIANNIAN_AI_TIMEOUT` | 超时秒数，缺省 45 |

Prompt 边界写死在 `LetterService.systemPrompt()`：不是数字复活，不假装它还在、不写「彩虹桥等你」这类越界承诺、不催促「放下」，只替你收好没说出口的话。

## 回归测试

```bash
mvn -B package -DskipTests && java -jar target/app.jar &
node scripts/smoke.mjs
```

51 项断言，覆盖：匿名身份复用、领养与参数清洗、互动计数、心情安抚语、写信引用真实数字、
60 秒冷却 429、胶囊未到期 403 与内容为 null、时间轴倒序与类型齐全、分享码幂等、
公开页匿名可读与私密内容开关、SSR 页 OG 标签、404 信封、一键抹掉后纪念页失效。

## 微信云托管部署

1. 云托管控制台 → 新建服务 → 选择「代码仓库」拉取本仓库（需先推到 GitHub/Gitee），或本地 `docker build` 后推镜像
2. **服务端口填 `8080`**（Dockerfile 里用 `${PORT:-8080}` 自适应）
3. 开通「云托管 MySQL」，实例创建后会自动注入以下环境变量，代码已适配，无需手写：

| 变量 | 用途 |
|---|---|
| `MYSQL_ADDRESS` | `host:port`，拼进 JDBC URL |
| `MYSQL_USERNAME` / `MYSQL_PASSWORD` | 连接凭据 |
| `MYSQL_DATABASE`（可选） | 库名，缺省 `niannian` |

想手动指定也行，用 `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` 覆盖。

4. 首次启动 Flyway 自动建表（V1 建表 + V2~V8 补字段与新增 photos/visitor_tributes/interactions 表），无需手工执行 SQL
5. 健康检查路径填 `/api/health`

Dockerfile 已设 `TZ=Asia/Shanghai`、`-Duser.timezone=Asia/Shanghai`，
并针对小内存容器调了 JVM：`-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Xss512k`。

## 其余踩坑（都已修好，别改回去）

| 现象 | 原因 | 修法 |
|---|---|---|
| 启动报 `No enum constant SerializationFeature.write-dates-as-timestamps` | Spring Boot 4 用 Jackson 3，该枚举已移出 `SerializationFeature` | 不要配 `spring.jackson.serialization.*`，默认就是 ISO-8601 |
| 启动正常但查询报表不存在 | Spring Boot 4 把 Flyway 自动配置拆成独立模块，只引 `flyway-core` 不触发迁移 | 额外引入 `org.springframework.boot:spring-boot-flyway` |
| 未知接口返回 500 而不是 404 | Spring 6.1+ 对无匹配资源抛 `NoResourceFoundException` | 已在 `GlobalExceptionHandler` 里一并处理 |
| 纪念页 500，日志 `UnknownFormatConversionException: Conversion = ';'` | SVG 模板用 `String.formatted`，样式里 `width:100%;` 的 `%;` 被当成格式符 | 文本块里写 `100%%` |
| 时间轴出现两条「相遇」 | 宠物创建时写了 `meet` 事件，时间轴又用 `pets.created_at` 合成了一条 | `TimelineService` 跳过 `kind=meet` 的事件 |
| 纪念页出错时返回 JSON 信封 | `@RestControllerAdvice` 全局生效，视图异常也被 JSON 化 | `SharePageController` 内单独捕获，返回 `share-error` 模板 |
| `import { ElMessage } from 'element-plus'` 把整包打进产物 | 根入口把全部组件都算进来，`element-plus` chunk 909KB | 在 `src/app/ui.js` 里从 `element-plus/es/components/message` 子路径引入 |
| 分享页样式随构建变成带 hash 的文件而 404 | Vite 给静态资源加 hash，Thymeleaf 无法预知文件名 | `vite.config.js` 的 `stableBaseCss` 插件在构建后把 `base.css` 写回 `/css/base.css` |

## 目录

```
src/main/java/site/niannian/          （52 个文件，2613 行）
├── NiannianApplication.java
├── common/     ApiResponse / BizException / GlobalExceptionHandler / StatsMapper / Time
├── auth/       GuestIdentityFilter / Auth
├── content/    ContentCatalog（选项）+ ContentText（文案、台词、模板信）
├── user/       User / UserMapper / UserService
├── pet/        Pet / PetView / PetRequest / PetService / PetController
├── event/      Event / EventMapper / EventService
├── timeline/   TimelineItem / TimelineService / TimelineController
├── mood/       Mood / Mapper / Service / Controller
├── letter/     Letter / Mapper / Service / Controller
├── tribute/    Tribute / Mapper / Service / Controller
├── capsule/    Capsule / Mapper / Service / Controller
├── share/      Share / PublicView / ShareService / ShareController / SharePageController
├── export/     ExportController
├── me/         MeController / HealthController / MeView
└── web/        PageController（/app → app.html）

src/main/resources/
├── application.yml / -dev.yml / -prod.yml
├── db/migration/   V1__init.sql（8 张表）· V2__pet_fields.sql（互动计数、点灯、is_demo）
│                   · V5__photos.sql（相册）· V6__visitor_tributes.sql（访客互动）
│                   · V7__interactions.sql（互动明细）· V8__pet_plant.sql（纪念植物）
├── templates/      share.html · share-404.html · share-error.html
└── static/         index.html · app.html · assets/ · css/base.css（构建生成，勿手改）

frontend/           Vue 3 + Vite 工程（源码在这里改，static/ 是产物）
├── src/app/        App.vue · router.js · api.js · store.js · ui.js · views/*
└── scripts/e2e.mjs 真浏览器端到端：领养→互动→写信→分享→手机视口

scripts/smoke.mjs   51 项接口断言
```

## 进度

- [x] P1 骨架：统一信封、全局异常、匿名身份、`/api/me`、8 张表 DDL
- [x] P2 数据层：V2 迁移补足互动计数/点灯/打开时间，Node 版 JSON 为空故无需搬数据
- [x] P3 全部 17 个接口
- [x] P4 `/s/{code}` Thymeleaf 分享页 + OG 标签
- [x] P6 界面重做：Vue 3 + Element Plus + Vite，8 个页面 + 落地页，E2E 全流程通过
- [x] P7 陪伴页深化：5 场景 + 时段自切、抠图两级通道、桌宠待机状态机、抛投惯性、视线跟随、食盆/小球、亲密度（服务端派生 + 升级进时间轴）
- [ ] P5 云托管上线（需要你的微信云托管环境）
