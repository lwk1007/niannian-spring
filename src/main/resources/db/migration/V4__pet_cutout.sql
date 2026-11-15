-- 场景板块需要「抠图贴纸」：把宠物主体从背景里抠出的透明 PNG（base64），
-- 与原始照片 photo 分开存。主体抠图在上传时由前端算好，随领养表单一起提交。
ALTER TABLE pets ADD COLUMN cutout LONGTEXT;
