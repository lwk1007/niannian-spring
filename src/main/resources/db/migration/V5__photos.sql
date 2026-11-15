-- 纪念相册：多张照片，以内联 base64 存储（前端压到 640px），可带一句备注。
CREATE TABLE IF NOT EXISTS photos (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    data       LONGTEXT     NOT NULL,
    note       VARCHAR(120),
    created_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_user_time ON photos (user_id, created_at);
