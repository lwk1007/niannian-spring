-- 念念 · 初始表结构
-- 同时兼容 MySQL 8 与 H2（MODE=MySQL）：不使用 ENGINE / CHARSET 子句，索引单独建。
-- 字符集在库级别指定：CREATE DATABASE niannian CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    uid        VARCHAR(32) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_uid ON users (uid);

CREATE TABLE IF NOT EXISTS pets (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT       NOT NULL,
    name         VARCHAR(40)  NOT NULL,
    type         VARCHAR(16)  NOT NULL,
    personality  VARCHAR(24)  NOT NULL,
    owner_title  VARCHAR(24)  NOT NULL,
    since_date   DATE,
    photo        VARCHAR(512),
    storage_mode VARCHAR(16)  NOT NULL DEFAULT 'private',
    created_at   TIMESTAMP(3) NOT NULL,
    updated_at   TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pets_user ON pets (user_id);

CREATE TABLE IF NOT EXISTS events (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    kind        VARCHAR(24)  NOT NULL,
    title       VARCHAR(120),
    body        VARCHAR(2000),
    occurred_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events (user_id, occurred_at);

CREATE TABLE IF NOT EXISTS moods (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    mood       VARCHAR(16)  NOT NULL,
    note       VARCHAR(500),
    created_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_moods_user_time ON moods (user_id, created_at);

CREATE TABLE IF NOT EXISTS tributes (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT        NOT NULL,
    content    VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP(3)  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tributes_user_time ON tributes (user_id, created_at);

CREATE TABLE IF NOT EXISTS letters (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT        NOT NULL,
    content    VARCHAR(4000) NOT NULL,
    created_at TIMESTAMP(3)  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_letters_user_time ON letters (user_id, created_at);

CREATE TABLE IF NOT EXISTS capsules (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT        NOT NULL,
    content    VARCHAR(4000) NOT NULL,
    open_at    TIMESTAMP(3)  NOT NULL,
    opened     TINYINT       NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3)  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_capsules_user_open ON capsules (user_id, open_at);

CREATE TABLE IF NOT EXISTS shares (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    share_code      VARCHAR(12)  NOT NULL,
    include_private TINYINT      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_shares_code ON shares (share_code);
CREATE INDEX IF NOT EXISTS idx_shares_user ON shares (user_id);
