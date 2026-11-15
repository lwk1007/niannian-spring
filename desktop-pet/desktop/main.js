/*
 * 念念 · 桌宠 — Electron 主进程（桌面端）
 * 职责：创建透明无边框悬浮窗、系统托盘、窗口拖拽、智能鼠标穿透、位置持久化。
 */
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const PET_W = 200; // 窗口宽（略大于宠物，给气泡/粒子留空间）
const PET_H = 230;

let win = null;
let tray = null;
let alwaysOnTop = true;
let posFile = '';

function posPath() {
  if (!posFile) posFile = path.join(app.getPath('userData'), 'pet-position.json');
  return posFile;
}

function loadPos() {
  try {
    const d = JSON.parse(fs.readFileSync(posPath(), 'utf8'));
    if (typeof d.x === 'number' && typeof d.y === 'number') return d;
  } catch (e) { /* 首次运行无存档 */ }
  return null;
}
function savePos() {
  if (!win) return;
  const [x, y] = win.getPosition();
  try { fs.writeFileSync(posPath(), JSON.stringify({ x, y })); } catch (e) {}
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();

  win = new BrowserWindow({
    width: PET_W,
    height: PET_H,
    transparent: true,      // 透明窗口
    frame: false,           // 无边框
    alwaysOnTop: true,      // 悬浮置顶
    resizable: false,
    hasShadow: false,       // 关闭系统阴影，避免透明区域出现黑边
    skipTaskbar: true,      // 不出现在任务栏
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver'); // 尽量保持在大多数窗口之上
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // 初始位置：优先读取上次存档，否则右下角
  const saved = loadPos();
  const x = saved ? saved.x : workArea.x + workArea.width - PET_W - 40;
  const y = saved ? saved.y : workArea.y + workArea.height - PET_H - 40;
  win.setPosition(x, y);

  // 加载引擎页面（桌面端与移动端共用同一份 HTML/CSS/JS）
  win.loadFile(path.join(__dirname, '..', 'engine', 'index.html'));

  // 默认开启鼠标穿透，等渲染进程根据光标位置动态切换
  win.setIgnoreMouseEvents(true, { forward: true });

  // 右键宠物 → 弹出菜单
  win.webContents.on('context-menu', () => showMenu());

  win.on('moved', savePos);
  win.on('closed', () => { win = null; });
}

function showMenu() {
  const menu = Menu.buildFromTemplate([
    { label: alwaysOnTop ? '取消置顶' : '保持置顶', click: () => {
        alwaysOnTop = !alwaysOnTop;
        if (win) win.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
      } },
    { label: '回到右下角', click: () => {
        const { workArea } = screen.getPrimaryDisplay();
        if (win) win.setPosition(workArea.x + workArea.width - PET_W - 40, workArea.y + workArea.height - PET_H - 40);
      } },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  menu.popup({ window: win });
}

function createTray() {
  // 无图标文件时用 1x1 透明 PNG 兜底，保证托盘可用
  const iconPath = path.join(__dirname, '..', 'engine', 'assets', 'tray.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('念念 · 桌宠');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: alwaysOnTop ? '取消置顶' : '保持置顶', click: () => {
        alwaysOnTop = !alwaysOnTop;
        if (win) win.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
      } },
    { label: '退出', click: () => app.quit() }
  ]));
  tray.on('click', () => { if (win) win.show(); });
}

// IPC：渲染进程请求移动窗口（拖拽时逐帧发送相对位移）
ipcMain.on('pet:moveBy', (e, dx, dy) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});

// IPC：渲染进程请求切换鼠标穿透（透明区域穿透，宠物本体捕获鼠标）
ipcMain.on('pet:setIgnoreMouse', (e, ignore) => {
  if (win) win.setIgnoreMouseEvents(!!ignore, { forward: true });
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 非 macOS：所有窗口关闭即退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
