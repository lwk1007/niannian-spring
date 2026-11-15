// 冒烟测试：把 Node 版的完整用户流程在 Spring 版上跑一遍
const B = 'http://127.0.0.1:8080';
let cookie = '';
let pass = 0, fail = 0;

async function call(method, path, body) {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { }
  return { status: r.status, json, text };
}

function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}  ${extra === undefined ? '' : JSON.stringify(extra).slice(0, 220)}`); }
}

const run = async () => {
  console.log('— 身份 —');
  let r = await call('GET', '/api/me');
  check('GET /api/me 200 + 信封', r.status === 200 && r.json.success === true, r);
  check('未领养时 hasPet=false', r.json.data.hasPet === false, r.json.data);
  check('options 四项齐全', r.json.data.options.personas.length === 4 &&
    r.json.data.options.moods.length === 5 && r.json.data.options.titles.length === 6, r.json.data.options);
  const uid1 = r.json.data.uid;
  r = await call('GET', '/api/me');
  check('cookie 复用 uid 不变', r.json.data.uid === uid1, { a: uid1, b: r.json.data.uid });

  console.log('— 领养 —');
  r = await call('POST', '/api/pet', { name: '豆豆', type: 'cat', personality: 'loyal', ownerTitle: '妈妈', sinceDate: '2025-09-08' });
  check('POST /api/pet 200', r.status === 200 && r.json.data.ok === true, r);
  check('返回 days 已算好', typeof r.json.data.pet.days === 'number' && r.json.data.pet.days > 400, r.json.data.pet.days);
  check('stats 三档为 0', r.json.data.pet.stats.touch === 0 && r.json.data.pet.stats.feed === 0, r.json.data.pet.stats);
  check('shareId 此时为 null', r.json.data.pet.shareId === null, r.json.data.pet.shareId);

  r = await call('POST', '/api/pet', { name: '' });
  check('空名字 400 + 中文提示', r.status === 400 && r.json.message === '给它一个名字吧', r.json);

  console.log('— 互动 —');
  const actions = ['touch', 'touch', 'feed', 'play', 'touch'];
  let lastLine = '';
  for (const a of actions) {
    r = await call('POST', '/api/pet/interact', { action: a });
    lastLine = r.json.data.line;
  }
  check('互动计数 touch=3 feed=1 play=1', r.json.data.stats.touch === 3 && r.json.data.stats.feed === 1 && r.json.data.stats.play === 1, r.json.data.stats);
  check('返回人格化台词', typeof lastLine === 'string' && lastLine.length > 4, lastLine);

  console.log('— 心情 —');
  r = await call('POST', '/api/moods', { mood: 'miss', note: '今天看到一只很像你的猫，跟了两条街。' });
  check('记心情 200 + 安抚语', r.status === 200 && r.json.data.soothe.includes('想念不是退步'), r.json.data);
  r = await call('POST', '/api/moods', { mood: 'heavy', note: '' });
  check('沉重档也返回安抚语', r.json.data.soothe.includes('呼吸四次'), r.json.data.soothe);
  r = await call('GET', '/api/moods');
  check('心情列表 2 条', r.json.data.items.length === 2, r.json.data.items.length);

  console.log('— 思念信 / 点灯 —');
  r = await call('POST', '/api/tributes', { content: '今天把你常睡的毯子洗了，晒在阳台。' });
  check('写思念信 200 + lit=1', r.status === 200 && r.json.data.lit === 1, r.json.data);
  r = await call('POST', '/api/tributes', { content: '   ' });
  check('空内容 400', r.status === 400 && r.json.message.includes('写点什么'), r.json);

  console.log('— 一封信 —');
  r = await call('POST', '/api/letters', {});
  check('生成信件 200 + isDemo=1', r.status === 200 && r.json.data.item.isDemo === 1, r.json.data);
  const letterText = r.json.data.item.content;
  check('信里引用了真实互动数字', letterText.includes('摸过我 3 次') && letterText.includes('喂过我 1 次'), letterText.slice(0, 160));
  check('信里有宠物署名', letterText.includes('—— 豆豆'), letterText.slice(-40));
  r = await call('POST', '/api/letters', {});
  check('60 秒内重复写信 429', r.status === 429 && r.json.message.includes('缓一缓'), r.json);

  console.log('— 时光胶囊 —');
  r = await call('POST', '/api/capsules', { content: '写给一年后的自己', days: 365 });
  const capId = r.json.data.item.id;
  check('建胶囊 200 + locked', r.status === 200 && r.json.data.item.locked === true, r.json.data);
  r = await call('POST', `/api/capsules/${capId}/open`);
  check('未到期打开 403', r.status === 403 && r.json.message === '还没到打开的时候', r.json);
  r = await call('GET', '/api/capsules');
  check('列表里未到期内容为 null', r.json.data.items[0].content === null, r.json.data.items[0]);
  r = await call('POST', '/api/capsules/999999/open');
  check('不存在的胶囊 404', r.status === 404, r.status);

  console.log('— 时间轴 —');
  r = await call('GET', '/api/timeline');
  const items = r.json.data.items;
  const types = [...new Set(items.map((i) => i.type))];
  check('时间轴含多种来源', items.length >= 6 && types.includes('meet') && types.includes('mood') && types.includes('letter'), { n: items.length, types });
  check('按时间倒序', items.every((v, i) => i === 0 || items[i - 1].at >= v.at), items.map((i) => i.at));
  check('at 为毫秒时间戳', typeof items[0].at === 'number' && String(items[0].at).length === 13, items[0].at);

  console.log('— 分享 —');
  r = await call('POST', '/api/share', { includePrivate: false });
  const code = r.json.data.shareId;
  check('开分享 200 + 12 位码', r.status === 200 && /^[a-f0-9]{12}$/.test(code), code);
  check('path 为 /s/{码}', r.json.data.path === '/s/' + code, r.json.data.path);
  r = await call('POST', '/api/share', { includePrivate: true });
  check('再次开分享码不变', r.json.data.shareId === code, r.json.data.shareId);

  // 匿名访问（不带 cookie）
  const saved = cookie; cookie = '';
  r = await call('GET', `/api/public/${code}`);
  check('匿名可读公开页 API', r.status === 200 && r.json.data.pet.name === '豆豆', r.status);
  check('公开页含陪伴天数与点灯数', r.json.data.days > 400 && r.json.data.candles === 1, r.json.data);
  const typesPublic = [...new Set(r.json.data.timeline.map((i) => i.type))];
  check('勾选公开后能看到心情/信', typesPublic.includes('mood') && typesPublic.includes('letter'), typesPublic);
  check('思念信随公开开启而出现', r.json.data.tributes.length === 1, r.json.data.tributes);

  r = await call('GET', '/s/' + code);
  check('SSR 纪念页 200', r.status === 200, r.status);
  check('SSR 页含 og:title', r.text.includes('property="og:title"'), '');
  check('SSR 页含宠物名与时间轴', r.text.includes('豆豆') && r.text.includes('tl-item'), '');
  check('SSR 页为完整 HTML（非 SPA 空壳）', r.text.includes('<h1>豆豆</h1>'), r.text.slice(0, 120));

  r = await call('GET', '/s/000000000000');
  check('不存在的纪念页 404 文案', r.status === 404 && r.text.includes('这个纪念页不存在'), r.status);
  cookie = saved;

  console.log('— 关闭公开私密内容 —');
  r = await call('POST', '/api/share', { includePrivate: false });
  cookie = '';
  r = await call('GET', `/api/public/${code}`);
  const types2 = [...new Set(r.json.data.timeline.map((i) => i.type))];
  check('关闭后心情/信不再出现', !types2.includes('mood') && !types2.includes('letter'), types2);
  check('关闭后思念信不再外泄', r.json.data.tributes.length === 0, r.json.data.tributes);
  cookie = saved;

  console.log('— 导出 —');
  r = await call('GET', '/api/export');
  check('导出含六类数据', r.status === 200 && r.json.data.pet && r.json.data.moods.length === 2 &&
    r.json.data.letters.length === 1 && r.json.data.tributes.length === 1 && r.json.data.capsules.length === 1 && r.json.data.events.length >= 2,
    Object.keys(r.json.data));

  console.log('— 页面 —');
  for (const p of ['/', '/app', '/app.html', '/css/base.css', '/js/pets.js']) {
    const res = await fetch(B + p);
    check(`静态页 ${p} 200`, res.status === 200, res.status);
  }

  console.log('— 404 信封 —');
  r = await call('GET', '/api/nope');
  check('未知接口 404 信封', r.status === 404 && r.json.success === false && r.json.message === '接口不存在', r.json);

  console.log('— 一键抹掉 —');
  r = await call('DELETE', '/api/pet');
  check('删除 200', r.status === 200 && r.json.data.ok === true, r);
  r = await call('GET', '/api/me');
  check('删除后 hasPet=false 且计数归零', r.json.data.hasPet === false &&
    Object.values(r.json.data.counts).every((v) => v === 0), r.json.data);
  cookie = '';
  r = await call('GET', `/api/public/${code}`);
  check('删除后纪念页失效', r.status === 404, r.status);

  console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error('脚本异常', e); process.exit(2); });
