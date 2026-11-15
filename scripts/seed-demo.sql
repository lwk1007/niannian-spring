-- 回填演示账号 30 天互动明细 + 心情，让陪伴数据页的曲线/热力图/心情分布有真实内容。
-- 这是演示数据构造，不是迁移（放在 scripts/ 下，由运维手工执行，不进入 Flyway）。

-- 1) 领养日改到 30 天前
UPDATE pets SET since_date = DATEADD('DAY', -29, CURRENT_DATE)
WHERE user_id = (SELECT id FROM users WHERE uid = '33b0bbe250b74ae9a33f8541989cc6e3');

-- 2) 互动累计与明细一致（每天 2 touch + 1 feed + 1 play，共 30 天）
UPDATE pets SET stat_touch = 60, stat_feed = 30, stat_play = 30
WHERE user_id = (SELECT id FROM users WHERE uid = '33b0bbe250b74ae9a33f8541989cc6e3');

-- 3) 清掉现有明细，重新铺 30 天
DELETE FROM interactions
WHERE user_id = (SELECT id FROM users WHERE uid = '33b0bbe250b74ae9a33f8541989cc6e3');

INSERT INTO interactions (user_id, action, created_at)
SELECT u.id, x.action, DATEADD('DAY', -d.X, CURRENT_DATE)
FROM users u
CROSS JOIN SYSTEM_RANGE(0, 29) d
CROSS JOIN (
  SELECT 'touch' AS action UNION ALL SELECT 'touch'
  UNION ALL SELECT 'feed' UNION ALL SELECT 'play'
) x
WHERE u.uid = '33b0bbe250b74ae9a33f8541989cc6e3';

-- 4) 补 10 条心情（calm/miss 偏多、heavy/empty 偏少，模拟真实分布）
INSERT INTO moods (user_id, mood, note, created_at)
SELECT u.id, v.mood, NULL, DATEADD('DAY', -v.d, CURRENT_DATE)
FROM users u
CROSS JOIN (
  SELECT 'calm' AS mood, 1 AS d UNION ALL
  SELECT 'calm', 3 UNION ALL SELECT 'calm', 6 UNION ALL
  SELECT 'miss', 2 UNION ALL SELECT 'miss', 5 UNION ALL SELECT 'miss', 9 UNION ALL
  SELECT 'warm', 4 UNION ALL SELECT 'warm', 8 UNION ALL
  SELECT 'heavy', 7 UNION ALL SELECT 'empty', 10
) v
WHERE u.uid = '33b0bbe250b74ae9a33f8541989cc6e3';
