/*
 * 念念 · 桌宠引擎核心逻辑
 * 跨端复用：同一份代码在桌面端（Electron 透明窗口）与移动端（浏览器/WebView）运行。
 * 差异只在一处：拖拽时桌面端通过 IPC 移动「窗口」，移动端直接移动「DOM 元素」。
 */
(function () {
  'use strict';

  var cfg = window.PET_CONFIG || {};
  var name = cfg.name || '念念';

  var petEl = document.getElementById('pet');
  var bubbleEl = document.getElementById('bubble');
  var canvas = document.getElementById('fx');
  var ctx = canvas.getContext('2d');

  // 桌面端由 preload 注入 window.petDesktop，据此判断运行环境
  var IS_DESKTOP = !!(window.petDesktop && window.petDesktop.isDesktop);
  if (!IS_DESKTOP) document.body.classList.add('mobile');

  // 应用配置里的尺寸到 CSS 变量
  var pw = (cfg.render && cfg.render.width) || 168;
  var ph = (cfg.render && cfg.render.height) || 190;
  document.documentElement.style.setProperty('--pw', pw + 'px');
  document.documentElement.style.setProperty('--ph', ph + 'px');
  petEl.style.width = pw + 'px';
  petEl.style.height = ph + 'px';

  // ---------------- 渲染模式：image / frames 替换默认 SVG ----------------
  var mode = (cfg.render && cfg.render.mode) || 'svg';
  var frameSets = null;
  var frameIdx = 0;
  var frameTimer = null;

  function applyImageMode() {
    petEl.innerHTML = '<img class="pet-img" src="' + cfg.render.image + '" alt="' + name + '" draggable="false"/>';
  }
  function playFrames(set) {
    if (!set || !set.srcs || !set.srcs.length) return;
    var img = petEl.querySelector('img') || (function () {
      petEl.innerHTML = '<img class="pet-img" alt="' + name + '" draggable="false"/>';
      return petEl.querySelector('img');
    })();
    clearInterval(frameTimer);
    frameIdx = 0;
    img.src = set.srcs[0];
    var fps = set.fps || 8;
    frameTimer = setInterval(function () {
      frameIdx = (frameIdx + 1) % set.srcs.length;
      if (!set.loop && frameIdx === 0) { clearInterval(frameTimer); return; }
      img.src = set.srcs[frameIdx];
    }, 1000 / fps);
  }
  if (mode === 'image' && cfg.render.image) applyImageMode();
  else if (mode === 'frames' && cfg.render.frames && cfg.render.frames.length) {
    frameSets = cfg.render.frames;
    playFrames(frameSets[0]);
  }

  // ---------------- 状态与拖拽 ----------------
  var dragging = false;
  var moved = false;
  var lastX = 0, lastY = 0;       // 上次指针位置
  var startX = 0, startY = 0;     // 按下位置
  var accumX = 0, accumY = 0;     // 累计移动距离（判断点击/拖拽）
  var lastClickAt = 0;
  var clickTimer = null;
  var idleTimer = null;
  var bubbleTimer = null;
  var actTimer = null;

  var b = cfg.behavior || {};
  var idleMin = b.idleIntervalMin || 6000;
  var idleMax = b.idleIntervalMax || 12000;
  var idleActions = b.idleActions || ['blink', 'look', 'tailwag', 'stretch'];
  var dragThreshold = b.dragThreshold || 5;
  var speech = b.speech || {};

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---------------- 粒子系统（爱心/星星） ----------------
  var particles = [];
  var fxRunning = false;
  var GLYPHS = ['♥', '✦', '·'];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function burst(x, y, emoji) {
    for (var i = 0; i < 10; i++) {
      particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -(Math.random() * 2.4 + 0.6),
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        size: 14 + Math.random() * 12,
        glyph: emoji || pick(GLYPHS)
      });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(tickFx); }
  }
  function tickFx() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(function (p) { return p.life > 0; });
    particles.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = p.size + 'px sans-serif';
      ctx.fillStyle = '#f27d9b';
      ctx.fillText(p.glyph, p.x, p.y);
    });
    ctx.globalAlpha = 1;
    if (particles.length) requestAnimationFrame(tickFx);
    else fxRunning = false;
  }

  // ---------------- 对话气泡 ----------------
  function say(lines) {
    if (!lines || !lines.length) return;
    var text = Array.isArray(lines) ? pick(lines) : lines;
    bubbleEl.textContent = text;
    bubbleEl.hidden = false;
    requestAnimationFrame(function () { bubbleEl.classList.add('show'); });
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () {
      bubbleEl.classList.remove('show');
      setTimeout(function () { bubbleEl.hidden = true; }, 260);
    }, 2200);
  }

  // ---------------- 动作（加类一次性播放） ----------------
  function playAction(action) {
    var svg = petEl.querySelector('.pet-svg');
    if (!svg) return;
    clearTimeout(actTimer);
    svg.classList.remove('act-look', 'act-tailwag', 'act-stretch', 'act-pat', 'act-happy');
    var cls = 'act-' + action;
    void svg.offsetWidth; // 强制重排，保证重复触发同一动作也能重播
    svg.classList.add(cls);
    actTimer = setTimeout(function () { svg.classList.remove(cls); }, 1600);
  }

  // ---------------- 待机调度 ----------------
  function scheduleIdle() {
    clearTimeout(idleTimer);
    var delay = idleMin + Math.random() * (idleMax - idleMin);
    idleTimer = setTimeout(doIdle, delay);
  }
  function doIdle() {
    if (dragging) { scheduleIdle(); return; }
    var action = pick(idleActions);
    if (action === 'blink' || action === 'tailwag') {
      // 眨眼/摇尾已由 CSS 常驻动画承担，这里偶尔用“动作版”增强
      playAction(action);
    } else {
      playAction(action);
    }
    if (action === 'stretch' && speech.stretch) say(speech.stretch);
    scheduleIdle();
  }

  // ---------------- 指针交互（鼠标 + 触摸统一） ----------------
  function onDown(e) {
    var p = e.touches ? e.touches[0] : e;
    dragging = true;
    moved = false;
    accumX = accumY = 0;
    lastX = startX = p.clientX;
    lastY = startY = p.clientY;
    petEl.classList.add('dragging');
    petEl.setPointerCapture && petEl.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - lastX;
    var dy = p.clientY - lastY;
    lastX = p.clientX;
    lastY = p.clientY;
    accumX += Math.abs(dx);
    accumY += Math.abs(dy);

    if (IS_DESKTOP) {
      // 桌面端：让主进程移动窗口（宠物 = 窗口内容，窗口移动即宠物移动）
      window.petDesktop.moveBy(dx, dy);
    } else {
      // 移动端：直接移动 DOM 元素（在整页视口内拖动）
      var rect = petEl.getBoundingClientRect();
      var nx = rect.left + dx;
      var ny = rect.top + dy;
      nx = Math.max(0, Math.min(window.innerWidth - rect.width, nx));
      ny = Math.max(0, Math.min(window.innerHeight - rect.height, ny));
      petEl.style.left = nx + 'px';
      petEl.style.top = ny + 'px';
    }
    if (accumX + accumY > dragThreshold) moved = true;
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    petEl.classList.remove('dragging');
    var wasDrag = moved;
    dragging = false;

    if (!wasDrag) {
      // 判定单击 / 双击
      var now = Date.now();
      if (now - lastClickAt < 420) {
        clearTimeout(clickTimer);
        lastClickAt = 0;
        doDoubleClick();
      } else {
        lastClickAt = now;
        clickTimer = setTimeout(function () { lastClickAt = 0; doClick(); }, 420);
      }
    }
  }

  function doClick() {
    var action = b.clickAction || 'pat';
    playAction(action);
    say(speech.pat || ['喵~']);
    var r = petEl.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.25, '♥');
  }

  function doDoubleClick() {
    var action = b.doubleClickAction || 'happy';
    playAction(action);
    say(speech.happy || ['嘿嘿']);
    var r = petEl.getBoundingClientRect();
    burst(r.left + r.width * 0.3, r.top + r.height * 0.3, '✦');
    burst(r.left + r.width * 0.7, r.top + r.height * 0.3, '✦');
  }

  petEl.addEventListener('pointerdown', onDown);

  // ---------------- 桌面端：智能鼠标穿透 ----------------
  // 透明区域点击穿透（不影响背后的窗口），宠物本体区域才捕获鼠标。
  // 主进程默认 ignoreMouse=true 且 forward=true，mousemove 仍会送达，
  // 这里据此判断“光标是否悬停在宠物上”，动态切换穿透。
  var hoverState = false;
  if (IS_DESKTOP) {
    window.addEventListener('mousemove', function (e) {
      if (dragging) return;
      var r = petEl.getBoundingClientRect();
      var over = e.clientX >= r.left && e.clientX <= r.right &&
                 e.clientY >= r.top && e.clientY <= r.bottom;
      if (over !== hoverState) {
        hoverState = over;
        window.petDesktop.setIgnoreMouse(!over);
      }
    });
    // 初始把穿透开启，等首次 mousemove 定位后再决定
    window.petDesktop.setIgnoreMouse(true);
  }

  // ---------------- 启动 ----------------
  scheduleIdle();

  // 暴露给外部（调试/扩展）
  window.__pet = {
    say: say,
    playAction: playAction,
    burst: burst,
    isDesktop: IS_DESKTOP
  };
})();
