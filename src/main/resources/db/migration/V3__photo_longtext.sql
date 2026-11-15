-- 照片以内联 base64 存储（前端已压到 640px），远超原 VARCHAR(512)，
-- 导致「上传照片后保存宠物」报 22001 数据超长。改为 LONGTEXT 承载。
ALTER TABLE pets MODIFY COLUMN photo LONGTEXT;
