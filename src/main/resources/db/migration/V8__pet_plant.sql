-- 纪念植物：陪伴页里一株可照料的花，成长阶段由浇水次数派生（不另存阶段）。
-- plant_last_watered 用于「一天最多浇一次」的克制限制。

ALTER TABLE pets ADD COLUMN plant_watered INT NOT NULL DEFAULT 0;
ALTER TABLE pets ADD COLUMN plant_last_watered DATE;
