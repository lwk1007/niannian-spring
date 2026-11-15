-- 分享页互动化：访客留言 / 献花 / 点灯。
-- visitor_tributes 记录访客在公开纪念页留下的互动，与主人自己的「思念信」分开。
-- shares 增两列：是否允许访客互动、留言是否需审核后显示。

CREATE TABLE IF NOT EXISTS visitor_tributes (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT        NOT NULL,
    kind       VARCHAR(16)   NOT NULL,
    content    VARCHAR(1000),
    name       VARCHAR(40),
    status     TINYINT       NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3)  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visitor_user_time ON visitor_tributes (user_id, created_at);

ALTER TABLE shares ADD COLUMN allow_guest TINYINT NOT NULL DEFAULT 1;
ALTER TABLE shares ADD COLUMN moderate TINYINT NOT NULL DEFAULT 0;
