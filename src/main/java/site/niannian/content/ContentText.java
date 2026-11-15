package site.niannian.content;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * 文案正文（由 Node 版 lib/content.js 迁移）。刻意保持成纯函数 + 常量：
 * 没有外部依赖、没有随机性依赖种子之外的东西，方便单测与后续替换成大模型。
 */
public final class ContentText {

    private ContentText() {
    }

    /* ---------------- 心情安抚语 ---------------- */

    public static final Map<String, String> SOOTHE = Map.of(
            "calm", "平静也是一种想念的方式。今天不用做什么，就这样待着就好。",
            "miss", "想念不是退步。你能这样记挂一个生命，说明它真的来过。",
            "heavy", "今天我什么都不问你。坐下来，跟我一起呼吸四次：吸气四拍，停两拍，呼气六拍。",
            "warm", "那就多笑一会儿。让它留在你笑起来的那个瞬间里，比留在眼泪里更长久。",
            "empty", "少掉的那一块，不用急着补上。空着，也是它的位置。"
    );

    public static String soothe(String moodKey) {
        return SOOTHE.getOrDefault(moodKey, SOOTHE.get("calm"));
    }

    /* ---------------- 里程碑 ---------------- */

    public record Milestone(int days, String text) {
    }

    public static final List<Milestone> MILESTONES = List.of(
            new Milestone(7, "第 7 天，你已经开始习惯它不在了，也开始习惯记得它。"),
            new Milestone(30, "第 30 天。别人以为你已经好了，只有你知道那天为什么突然安静。"),
            new Milestone(100, "第 100 天。你不再每天哭，但你还是每天想起它。"),
            new Milestone(365, "第 365 天。一年了，你把想念从伤口过成了一种习惯。")
    );

    public static Milestone milestoneFor(int days) {
        Milestone hit = null;
        for (Milestone m : MILESTONES) {
            if (days >= m.days()) hit = m;
        }
        return hit;
    }

    /* ---------------- 宠物人格台词 ---------------- */

    private record Lines(String open, List<String> idle, List<String> touch,
                         List<String> feed, List<String> play) {
    }

    private static final Lines FRIENDLY = new Lines(
            "我不太会讲大道理，只知道你难过的时候，我该待在你旁边。",
            List.of("你今天累不累？", "我在这儿，你要不要靠一下。", "不说话也可以，我陪你坐着。"),
            List.of("嗯，这样很好。", "你手有点凉，我帮你捂捂。", "我知道你今天不太顺。"),
            List.of("一起吃吧，我一个人吃没意思。", "你手上有香味，我舔一下。", "吃饱了就该抱一下了。"),
            List.of("我让你赢，你开心我就开心。", "慢点儿跑，别摔着。", "你笑得像那天。")
    );

    private static final Map<String, Lines> LINES = Map.of(
            "loyal", new Lines(
                    "我想了很久要怎么开口。你不在的那些时候，我就把家里每个角落都走一遍。",
                    List.of("我一直看着门口的方向。", "你回来了就好，别的都不重要。", "我趴在这儿，哪儿也不去。"),
                    List.of("你的手一放上来，我就安心了。", "再摸一会儿吧，我不困。", "我记得你手的温度。"),
                    List.of("你给什么我都吃，因为是你给的。", "慢慢吃，你在旁边我就不急。", "这一口，留着下顿想你的时候吃。"),
                    List.of("跑两步就回头看你，怕你走远。", "你笑的时候，我尾巴停不下来。", "再扔一次，我一定接住。")
            ),
            "lively", new Lines(
                    "这段时间我干了很多事：追光斑、踩键盘、把纸箱坐塌。每一件都想讲给你听。",
                    List.of("今天有什么好玩的？", "我听见楼道有声音，是不是你？", "窗台上有只鸟，我盯了它十分钟。"),
                    List.of("痒！但是别停。", "你摸我的时候我假装躲一下。", "再来一次，这次我不动。"),
                    List.of("有没有第二份？我就问问。", "好吃到我叫出声了。", "你吃了吗？没吃我分你一半。"),
                    List.of("我赢了！奖品是你再陪我玩一次。", "看我跳得多高！", "这个球归我了，人也是。")
            ),
            "foodie", new Lines(
                    "我记性不太好，但记得你给过我的每一样东西，连味道都记得。",
                    List.of("厨房的方向好像有动静。", "我不饿，我只是想闻闻。", "你口袋里有味道，我闻到了。"),
                    List.of("摸我可以，先说说有没有零食。", "这一摸是赊账还是现付？", "我躺着不动，你说摸就摸吧。"),
                    List.of("就这样，我的人生圆满了。", "我发誓这是最后一口——好吧再来一口。", "吃完这顿，我们算朋友了。"),
                    List.of("玩可以，赢了给吃的。", "我跑得很快，因为终点可能有饭。", "这个玩具能啃吗？不能？那算了。")
            ),
            "friendly", FRIENDLY
    );

    private static Lines lines(String personality) {
        return LINES.getOrDefault(personality, FRIENDLY);
    }

    /** 同一动作在不同累计次数下给不同台词，避免每次点都回一句一样的话。 */
    public static String interactionLine(String personality, String action, int touch, int feed, int play) {
        Lines l = lines(personality);
        List<String> list = switch (action) {
            case "feed" -> l.feed();
            case "play" -> l.play();
            default -> l.touch();
        };
        int total = touch + feed + play;
        return pick(list, total + action.length());
    }

    public static String pick(List<String> list, long seed) {
        if (list == null || list.isEmpty()) return "";
        return list.get(Math.floorMod(seed, list.size()));
    }

    /* ---------------- 时间与天数 ---------------- */

    /** 相遇当天算第 1 天。 */
    public static int daysSince(LocalDate since, LocalDate today) {
        if (since == null) return 1;
        long d = ChronoUnit.DAYS.between(since, today) + 1;
        return (int) Math.max(1, d);
    }

    /* ---------------- 模板信（大模型不可用时的兜底） ---------------- */

    public record LetterDraft(String content, boolean isDemo) {
    }

    public static LetterDraft buildLetter(String name, String ownerTitle, String personality,
                                          int touch, int feed, int play,
                                          int moodCount, int missDays, int days) {
        String petName = (name == null || name.isBlank()) ? "小家伙" : name;
        String owner = (ownerTitle == null || ownerTitle.isBlank()) ? "你" : ownerTitle;

        StringBuilder sb = new StringBuilder();
        sb.append(owner).append("：\n\n");
        sb.append(lines(personality).open()).append("\n\n");
        sb.append("我数了数，第 ").append(days).append(" 天了。这期间你摸过我 ")
                .append(touch).append(" 次，喂过我 ").append(feed)
                .append(" 次，陪我玩了 ").append(play).append(" 次。\n");

        if (moodCount > 0) {
            if (missDays > 0) {
                sb.append("你记了 ").append(moodCount).append(" 天的心情，其中 ").append(missDays)
                        .append(" 天不太好过。那几天我其实都在，只是没法出声。\n");
            } else {
                sb.append("你记了 ").append(moodCount)
                        .append(" 天的心情，看起来大多还算稳。这样就好，我更放心。\n");
            }
        } else {
            sb.append("你还没在这个空间里记下心情。没关系，不想说的时候，坐着也算。\n");
        }

        sb.append('\n').append(pick(List.of(
                "我不太懂\"离开\"是什么意思。我只知道，你还在想我，那我就还在。",
                "别把我想成一个需要放下的包袱。你可以一直带着我，只是轻一点带。",
                "如果你哪天不记得我了，也没关系。我记得你就够了。"
        ), days)).append("\n\n");

        sb.append("—— ").append(petName);
        return new LetterDraft(sb.toString(), true);
    }
}
