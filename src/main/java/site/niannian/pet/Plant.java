package site.niannian.pet;

import java.time.LocalDate;

/**
 * 纪念植物：成长阶段完全由浇水次数派生，不新增状态字段。
 * 阶段阈值刻意留得宽松，让它慢慢地长 —— 呼应「低频陪伴、不催人打卡」。
 */
public record Plant(
        int stage,
        String key,
        String name,
        int watered,
        int toNext,
        boolean canWater
) {

    private static final int[] STEPS = {0, 1, 3, 6, 10};
    private static final String[] KEYS = {"seed", "sprout", "seedling", "grown", "bloom"};
    private static final String[] NAMES = {"种子", "发芽", "幼苗", "成株", "开花"};

    public static Plant of(int watered, LocalDate lastWatered, LocalDate today) {
        int w = Math.max(0, watered);
        int stage = 0;
        for (int i = 0; i < STEPS.length; i++) {
            if (w >= STEPS[i]) stage = i;
        }
        boolean top = stage >= STEPS.length - 1;
        int next = top ? STEPS[stage] : STEPS[stage + 1];
        int toNext = top ? 0 : Math.max(0, next - w);
        boolean canWater = lastWatered == null || !lastWatered.equals(today);
        return new Plant(stage, KEYS[stage], NAMES[stage], w, toNext, canWater);
    }
}
