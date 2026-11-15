package site.niannian.pet;

/**
 * 亲密度：完全由互动次数派生，不新增数据库字段。
 *
 * <p>经验权重 touch=1 / feed=2 / play=3 ——「一起玩」比「摸一下」更花时间，理应更值钱。
 * 派生放服务端是既定约定（和陪伴天数、胶囊是否到期一样），前端只负责显示。
 */
public record Intimacy(int level, String title, int xp, int nextXp, int progress, int toNext) {

    /** 升到第 n 级所需的累计经验，下标 0 对应 1 级。 */
    private static final int[] STEPS = {0, 12, 36, 80, 150, 260};
    private static final String[] TITLES = {"初见", "熟悉", "亲近", "依赖", "离不开", "一直都在"};

    public static int xpOf(PetView.Stats s) {
        return s.touch() + s.feed() * 2 + s.play() * 3;
    }

    public static int levelOf(int xp) {
        int level = 1;
        for (int i = 1; i < STEPS.length; i++) {
            if (xp >= STEPS[i]) level = i + 1;
        }
        return level;
    }

    public static Intimacy of(PetView.Stats s) {
        return ofXp(xpOf(s));
    }

    public static Intimacy ofXp(int xp) {
        int level = levelOf(xp);
        int prev = STEPS[level - 1];
        boolean top = level >= STEPS.length;
        int next = top ? prev : STEPS[level];
        int progress = top ? 100 : (int) Math.round((xp - prev) * 100.0 / Math.max(1, next - prev));
        return new Intimacy(
                level,
                TITLES[level - 1],
                xp,
                top ? xp : next,
                Math.max(0, Math.min(100, progress)),
                top ? 0 : Math.max(0, next - xp));
    }

    /** 升级时单独给时间轴写一条记录用的文案。 */
    public String milestoneText() {
        return switch (level) {
            case 2 -> "它开始认得你的脚步声了。";
            case 3 -> "你一坐下，它就知道要往你身边靠。";
            case 4 -> "你不在的时候，它守着门口那点动静。";
            case 5 -> "它已经不太愿意跟你分开太久。";
            default -> "你们之间，早就不是「养」和「被养」了。";
        };
    }
}
