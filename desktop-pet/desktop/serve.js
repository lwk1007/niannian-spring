/*
 * 零依赖静态服务器：用于在手机/浏览器里预览宠物引擎（移动端形态）。
 * 用法：npm run serve  然后手机与电脑同一局域网，访问 http://<电脑IP>:8321/engine/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8321;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/engine/index.html';
  let file = path.join(ROOT, url);
  // 目录路径 → 补 index.html（如 /engine/ → /engine/index.html）
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  // 防目录穿越
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let ip = '127.0.0.1';
  for (const k in ifaces) {
    for (const it of ifaces[k]) {
      if (it.family === 'IPv4' && !it.internal) { ip = it.address; break; }
    }
  }
  console.log('宠物引擎静态服务已启动：');
  console.log('  本机预览   http://127.0.0.1:' + PORT + '/engine/');
  console.log('  手机访问   http://' + ip + ':' + PORT + '/engine/  （需同一局域网）');
});
