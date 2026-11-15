/*
 * 念念 · 桌宠 — Electron 预加载脚本
 * 通过 contextBridge 暴露最小 API 给渲染进程（宠物引擎），
 * 用于拖拽移动窗口与切换鼠标穿透。移动端无此注入，引擎自动降级为 DOM 内拖动。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petDesktop', {
  isDesktop: true,
  moveBy: (dx, dy) => ipcRenderer.send('pet:moveBy', dx, dy),
  setIgnoreMouse: (ignore) => ipcRenderer.send('pet:setIgnoreMouse', ignore)
});
