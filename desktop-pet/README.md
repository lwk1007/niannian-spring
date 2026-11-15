# 念念 · 桌面宠物（desktop-pet）

一只悬浮在桌面上的透明无边框宠物，支持鼠标/触摸交互与基础动画。核心宠物引擎 **跨桌面端与移动端复用**——桌面端由 Electron 透明窗口承载，移动端直接跑在浏览器/WebView 里。

## 一、调研结论（开源桌宠架构分析）

调研了 GitHub 上主流开源桌宠项目，归纳出四类技术路线：

| 项目 | 技术栈 | 动画渲染 | 交互逻辑 | 可借鉴点 |
|------|--------|----------|----------|----------|
| [duzexu/desktop-pet](https://github.com/duzexu/desktop-pet) | Electron | GIF/WebP/PNG/SVG/视频，循环/单次/关键帧 | 条件+动作+优先级+冷却的规则系统 | Petpack 素材包、控制面板、规则引擎 |
| [BITNP/bitnp-desktop-pet](https://github.com/BITNP/bitnp-desktop-pet) | Electron + Vue3 | 前端渲染 | 像素级拖拽、智能鼠标穿透 | 透明区域穿透、不吞鼠标事件 |
| [cz-2006/pet_project](https://github.com/cz-2006/pet_project) | Electron | PNG 序列帧（透明） | 单击眨眼/双击脸红/定时待机 | 最贴近本项目的交互形态 |
| [Shimeji-ee](https://github.com/w006gy/shimeji) | Java | 精灵图 + XML 行为 | 爬行/挂边/克隆/抛窗 | 经典桌宠行为范式 |
| [VPet](https://github.com/LorisYounger/VPet) | C# WPF | Live2D/Spine 插件 | 摸头/拎起/爬墙 | 骨骼动画插件化 |

**共同架构共识**：`透明无边框窗口 + 置顶 + 渲染层（PNG 序列/SVG/Live2D）+ 状态机驱动交互（点击/拖拽/定时）`。

本项目据此实现，采用 **Electron + 纯前端引擎（零框架）**，三选一的渲染模式直接对应调研中的 PNG 序列帧 / 单图 / SVG 三种主流做法。

## 二、架构设计（三层）

```
┌─────────────────────────────────────────────────────────────┐
│  桌面端 desktop/  (Electron 主进程 + 预加载)                  │
│   透明无边框悬浮窗 · 系统托盘 · 窗口拖拽 · 智能鼠标穿透 · 位置持久化 │
└──────────────────────────┬──────────────────────────────────┘
                           │ 加载同一份引擎，注入 window.petDesktop API
┌──────────────────────────▼──────────────────────────────────┐
│  核心引擎 engine/  (纯 HTML/CSS/JS，跨端复用)                 │
│   SVG/图片/序列帧渲染 · 动画状态机 · 点击/双击/拖拽 · 粒子 · 气泡 │
└──────────────────────────┬──────────────────────────────────┘
                           │ 无注入时自动降级为移动端模式
┌──────────────────────────▼──────────────────────────────────┐
│  移动端  (浏览器 / WebView)                                   │
│   同一引擎整页运行，宠物在视口内拖动，触摸事件与鼠标统一处理      │
└─────────────────────────────────────────────────────────────┘
```

**跨端的关键**：引擎通过 `window.petDesktop` 是否存在判断运行环境。拖拽时——桌面端通过 IPC 移动「窗口」，移动端直接移动「DOM 元素」。除此之外全部代码共用。

## 三、项目结构

```
desktop-pet/
├── package.json          # Electron 应用配置 + 打包脚本
├── desktop/              # 桌面端（Electron）
│   ├── main.js           # 主进程：透明窗口、托盘、拖拽、鼠标穿透、位置持久化
│   ├── preload.js        # 预加载：contextBridge 暴露最小 IPC API
│   └── serve.js          # 零依赖静态服务器（手机/浏览器预览引擎用）
└── engine/               # 核心宠物引擎（跨端复用，纯静态）
    ├── index.html        # 宠物页面（内联 SVG 猫咪）
    ├── config.js         # 配置：名字/渲染模式/待机动作/台词
    ├── pet.css           # 动画：呼吸/眨眼/摇尾/待机动作/气泡/粒子画布
    └── pet.js            # 状态机 + 拖拽 + 点击/双击 + 粒子 + 跨端模式检测
```

## 四、关键代码实现

### 1. 透明无边框悬浮窗（desktop/main.js）

```js
new BrowserWindow({
  width: 200, height: 230,
  transparent: true,     // 透明背景
  frame: false,          // 无边框
  alwaysOnTop: true,     // 悬浮置顶
  resizable: false,
  hasShadow: false,      // 关阴影，避免透明区黑边
  skipTaskbar: true,     // 不出现在任务栏
  webPreferences: { preload, contextIsolation: true, nodeIntegration: false }
});
win.setAlwaysOnTop(true, 'screen-saver');
win.setIgnoreMouseEvents(true, { forward: true }); // 默认穿透，动态切换
```

### 2. 窗口拖拽（engine/pet.js → desktop/main.js）

渲染进程监听 `pointerdown/move/up`，拖拽时逐帧把相对位移发给主进程移动窗口。`forward: true` 让穿透开启时 `mousemove` 仍能送达，从而在拖拽判定上不丢事件。

```js
// engine/pet.js
if (IS_DESKTOP) window.petDesktop.moveBy(dx, dy);   // 移动窗口
else petEl.style.left = nx + 'px';                  // 移动 DOM（移动端）

// desktop/main.js
ipcMain.on('pet:moveBy', (e, dx, dy) => {
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});
```

### 3. 智能鼠标穿透（透明区穿透、宠物本体捕获）

这是透明窗口桌宠最核心的细节：窗口比宠物略大，透明区域必须点击穿透（否则会挡住背后窗口），宠物本体区域才响应交互。

```js
// engine/pet.js：根据光标是否悬停在宠物上，动态切换穿透
window.addEventListener('mousemove', (e) => {
  const r = petEl.getBoundingClientRect();
  const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (over !== hoverState) { hoverState = over; window.petDesktop.setIgnoreMouse(!over); }
});
```

### 4. 动画状态机（engine/pet.js）

- **常驻动画**（CSS keyframes 自动循环）：呼吸（`breath`）、眨眼（`blink`）、摇尾（`wag`）。
- **待机动作**（随机调度，一次性播放后移除类）：`look` 张望 / `tailwag` 甩尾 / `stretch` 伸懒腰。
- **点击反应**：单击 → `pat` 摸头 + 爱心粒子 + 台词；双击 → `happy` 弹跳 + 星星。
- 单击/双击通过「420ms 内是否再次点击」区分，移动超过 `dragThreshold` 判定为拖拽而非点击。

### 5. 三种渲染模式（engine/config.js）

| mode | 说明 | 对应调研方案 |
|------|------|-------------|
| `svg`（默认） | 内置 SVG 猫，CSS 动画驱动，零素材开箱即用 | 矢量/CSS 方案 |
| `image` | 单张透明 PNG（如宠物抠图），叠加浮动呼吸 | 单图贴纸方案 |
| `frames` | PNG 序列帧逐帧播放，逐动作配置帧率/循环 | cz-2006 序列帧方案 |

## 五、运行说明

### 桌面端（Windows / macOS / Linux）

```bash
cd desktop-pet
npm install          # 安装 Electron（国内可加 ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/）
npm start            # 启动桌宠
```

启动后：宠物悬浮在右下角，**拖拽移动**、**单击摸头**、**双击弹跳**、**右键菜单**（置顶/回到右下角/退出），系统托盘可控制。

> 打包安装包：`npm run build`（产出 `dist/`，Windows 为 NSIS/便携版，mac 为 dmg，Linux 为 AppImage）。

### 移动端（浏览器预览）

```bash
npm run serve        # 启动静态服务器（默认 8321 端口）
```

同一局域网下，手机浏览器访问 `http://<电脑IP>:8321/engine/` 即可看到宠物，支持触摸拖拽、点击、双击。

## 六、移动端平台限制与适配方案（重点）

「悬浮在桌面/其他 App 之上」这一能力，**桌面端天然支持，移动端受系统管控，需区分对待**：

| 平台 | 能否悬浮于其他 App 之上 | 说明 |
|------|------------------------|------|
| Windows / macOS / Linux | ✅ 原生支持 | Electron 透明置顶窗口即可，本项目已实现 |
| Android | ⚠️ 有条件支持 | 需「显示在其他应用上层」权限 + 前台服务 + WebView 壳 |
| iOS | ❌ 不支持 | 系统不允许任意 App 悬浮于其他 App 之上 |

### Android 适配方案（可行）

Android 提供悬浮窗能力，需要一个**原生壳**承载本引擎的 WebView：

1. 申请 `SYSTEM_ALERT_WINDOW`（"显示在其他应用上层"）权限；
2. 用 `Service`（前台服务）+ `WindowManager` 创建一个 `TYPE_APPLICATION_OVERLAY` 悬浮窗；
3. 窗口内放一个 `WebView`，`loadUrl("file:///android_asset/engine/index.html")` 加载同一份引擎；
4. 触摸事件天然交给 WebView 内的 `pointer` 事件处理，引擎无需改动。

工程结构（示意）：

```
android-pet/
├── app/src/main/
│   ├── AndroidManifest.xml      # 声明 SYSTEM_ALERT_WINDOW 权限
│   ├── java/.../FloatingService.kt  # 前台服务 + WindowManager 悬浮窗
│   ├── java/.../MainActivity.kt     # 引导用户授权
│   └── assets/engine/               # 直接拷贝 engine/ 整个目录（复用引擎）
```

关键代码骨架：

```kotlin
// FloatingService.kt
val params = WindowManager.LayoutParams(
  WindowManager.LayoutParams.WRAP_CONTENT,
  WindowManager.LayoutParams.WRAP_CONTENT,
  WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
  WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
  PixelFormat.TRANSLUCENT
)
webView.settings.setSupportZoom(false)
webView.loadUrl("file:///android_asset/engine/index.html")
windowManager.addView(webView, params)
```

> 限制：需引导用户在系统设置里手动开启"显示在其他应用上层"；部分国产 ROM（MIUI/EMUI）权限入口更深。这是平台级限制，非代码可绕过。

### iOS 适配方案（受限，需换形态）

iOS **不允许**任意 App 悬浮于其他 App 之上，只能退而求其次：

1. **主屏幕/锁屏小组件（Widget）**：显示静态宠物形象，但动画受限（WidgetKit 不支持连续动画），交互只能"点开跳转 App"。
2. **灵动岛 / 实时活动（Live Activity）**：短暂展示（最长约 8 小时），不适合常驻桌宠。
3. **App 内运行**：宠物在自己的 App 页面内完整运行（本引擎在 iOS Safari/WKWebView 中可直接运行，触摸交互全部可用），只是"不能悬浮到系统桌面"。

**结论**：iOS 上"常驻悬浮桌宠"无法实现，这是平台设计而非工程缺陷。若需 iOS 覆盖，建议做 **App 内宠物页面 + 小组件入口**。

### 引擎在移动浏览器的直接运行

无论 Android 还是 iOS，本引擎作为普通网页在浏览器中**可完整运行**（触摸拖拽/点击/双击/动画/粒子），只是形态为"整页宠物"而非"悬浮于其他 App"。这是当前代码已交付的移动端形态。

## 七、故障排查

- **`require('electron')` 返回的不是 API / `Cannot read properties of undefined (reading 'on')`**：通常是环境变量 `ELECTRON_RUN_AS_NODE` 被设为非空，导致 electron.exe 以纯 Node 模式运行。正常终端里不会出现；若在 WorkBuddy 等沙箱内运行，先 `unset ELECTRON_RUN_AS_NODE`（或 `env -u ELECTRON_RUN_AS_NODE npm start`）再启动。
- **国内安装 Electron 慢/失败**：`export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 后重新 `npm install`。

## 八、配置文件说明（engine/config.js）

- `render.mode`：`svg` / `image` / `frames` 三选一。
- `render.image`：单图模式的透明 PNG 地址。
- `render.frames`：序列帧动作列表（`{ action, srcs, fps, loop }`）。
- `behavior.idleActions` / `idleIntervalMin/Max`：待机动作池与间隔。
- `behavior.speech`：各动作的台词。

修改后刷新页面（桌面端重启应用）即生效，桌面端与移动端共用同一份配置。
