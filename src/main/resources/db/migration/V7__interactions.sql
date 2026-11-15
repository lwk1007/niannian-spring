-- 互动明细：把 touch/feed/play 的每次互动带上时间戳落表，
-- 用于画「最近 30 天热力图」与「亲密度累计曲线」（累计统计字段本身没有时间维度）。
-- 与 events（时间轴）分离，避免时间轴被每一下互动刷满。

CREATE TABLE IF NOT EXISTS interactions (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    action     VARCHAR(16) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interactions_user_time ON interactions (user_id, created_at);
