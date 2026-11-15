package site.niannian.stat;

import site.niannian.pet.Intimacy;

import java.util.List;

/**
 * 陪伴数据聚合视图（「陪伴数据」页的一次性数据）。
 * 前端拿这一份就能画完环形图 / 热力图 / 亲密度曲线 / 月度回顾，不用再拼几个接口。
 */
public record StatView(
        long days,
        int total,
        int touch,
        int feed,
        int play,
        Intimacy intimacy,
        List<DailyCount> daily,
        List<CurvePoint> curve,
        Monthly monthly,
        List<MoodCount> moodDist
) {

    /** 某一天互动次数（热力图柱状图）。date 为 yyyy-MM-dd。 */
    public record DailyCount(String date, int count) {
    }

    /** 亲密度累计曲线上的一个点。date 为 yyyy-MM-dd，xp 为截至当天的累计经验。 */
    public record CurvePoint(String date, int xp) {
    }

    /** 本月回顾：这个自然月里发生的各类事件次数。 */
    public record Monthly(int interactions, int moods, int letters, int tributes, int footprints) {
    }

    /** 心情分布。key 对应 ContentCatalog.MOODS。 */
    public record MoodCount(String key, String label, String color, int count) {
    }
}
