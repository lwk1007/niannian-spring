package site.niannian.stat;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import site.niannian.content.ContentCatalog;
import site.niannian.event.Event;
import site.niannian.event.EventMapper;
import site.niannian.letter.Letter;
import site.niannian.letter.LetterMapper;
import site.niannian.mood.Mood;
import site.niannian.mood.MoodMapper;
import site.niannian.pet.Intimacy;
import site.niannian.pet.Pet;
import site.niannian.pet.PetService;
import site.niannian.pet.PetView;
import site.niannian.tribute.Tribute;
import site.niannian.tribute.TributeMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 陪伴数据的聚合：把累计统计（stat_*）、互动明细（interactions）、心情/信/思念信/脚印拼成一份。
 * 只读，不做写入（写入由 PetService.interact 直接落 interactions 表）。
 */
@Service
public class StatService {

    private static final int HEATMAP_DAYS = 30;
    private static final int CURVE_MAX_DAYS = 180;

    private final PetService petService;
    private final InteractionLogMapper interactionLogMapper;
    private final MoodMapper moodMapper;
    private final LetterMapper letterMapper;
    private final TributeMapper tributeMapper;
    private final EventMapper eventMapper;

    public StatService(PetService petService,
                       InteractionLogMapper interactionLogMapper,
                       MoodMapper moodMapper,
                       LetterMapper letterMapper,
                       TributeMapper tributeMapper,
                       EventMapper eventMapper) {
        this.petService = petService;
        this.interactionLogMapper = interactionLogMapper;
        this.moodMapper = moodMapper;
        this.letterMapper = letterMapper;
        this.tributeMapper = tributeMapper;
        this.eventMapper = eventMapper;
    }

    public StatView build(Long userId) {
        Pet pet = petService.require(userId);
        PetView.Stats stats = new PetView.Stats(pet.getStatTouch(), pet.getStatFeed(), pet.getStatPlay());
        Intimacy intimacy = Intimacy.of(stats);
        int total = stats.touch() + stats.feed() + stats.play();

        LocalDate today = LocalDate.now();

        // 历史互动没有明细（明细表后补），曲线起点取「累计经验 − 已有明细经验」，
        // 这样老用户的曲线从历史基线起步，而不是从 0 重新开始。
        int baseline = Math.max(0, Intimacy.xpOf(stats) - totalLogXp(userId));

        return new StatView(
                petService.days(pet),
                total,
                stats.touch(),
                stats.feed(),
                stats.play(),
                intimacy,
                dailyHeatmap(userId, today),
                intimacyCurve(userId, pet.getSinceDate(), today, baseline),
                monthly(userId, today),
                moodDist(userId));
    }

    /** 最近 30 天每天互动次数（补零），柱状图用。 */
    private List<StatView.DailyCount> dailyHeatmap(Long userId, LocalDate today) {
        LocalDate start = today.minusDays(HEATMAP_DAYS - 1L);
        List<InteractionLog> logs = interactionLogMapper.selectList(
                new LambdaQueryWrapper<InteractionLog>()
                        .eq(InteractionLog::getUserId, userId)
                        .ge(InteractionLog::getCreatedAt, start.atStartOfDay()));
        Map<LocalDate, Integer> byDay = new TreeMap<>();
        for (InteractionLog log : logs) {
            byDay.merge(log.getCreatedAt().toLocalDate(), 1, Integer::sum);
        }
        List<StatView.DailyCount> out = new ArrayList<>(HEATMAP_DAYS);
        for (int i = 0; i < HEATMAP_DAYS; i++) {
            LocalDate d = start.plusDays(i);
            out.add(new StatView.DailyCount(d.toString(), byDay.getOrDefault(d, 0)));
        }
        return out;
    }

    /** 亲密度累计曲线：从领养日（最远回溯 180 天）到今天的逐天累计经验，起点带历史基线。 */
    private List<StatView.CurvePoint> intimacyCurve(Long userId, LocalDate sinceDate, LocalDate today, int baseline) {
        LocalDate start = sinceDate != null ? sinceDate : today;
        LocalDate floor = today.minusDays(CURVE_MAX_DAYS - 1L);
        if (start.isBefore(floor)) start = floor;

        List<InteractionLog> logs = interactionLogMapper.selectList(
                new LambdaQueryWrapper<InteractionLog>()
                        .eq(InteractionLog::getUserId, userId)
                        .ge(InteractionLog::getCreatedAt, start.atStartOfDay())
                        .orderByAsc(InteractionLog::getCreatedAt));
        Map<LocalDate, Integer> xpByDay = new TreeMap<>();
        for (InteractionLog log : logs) {
            xpByDay.merge(log.getCreatedAt().toLocalDate(), xpOf(log.getAction()), Integer::sum);
        }

        List<StatView.CurvePoint> out = new ArrayList<>();
        int acc = baseline;
        LocalDate d = start;
        while (!d.isAfter(today)) {
            acc += xpByDay.getOrDefault(d, 0);
            out.add(new StatView.CurvePoint(d.toString(), acc));
            d = d.plusDays(1);
        }
        return out;
    }

    /** 明细表里已记录的互动经验总和。 */
    private int totalLogXp(Long userId) {
        List<InteractionLog> logs = interactionLogMapper.selectList(
                new LambdaQueryWrapper<InteractionLog>().eq(InteractionLog::getUserId, userId));
        int xp = 0;
        for (InteractionLog log : logs) {
            xp += xpOf(log.getAction());
        }
        return xp;
    }

    /** 本月回顾：当前自然月内各类事件次数。 */
    private StatView.Monthly monthly(Long userId, LocalDate today) {
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        int interactions = count(interactionLogMapper.selectCount(
                new LambdaQueryWrapper<InteractionLog>()
                        .eq(InteractionLog::getUserId, userId)
                        .ge(InteractionLog::getCreatedAt, monthStart)));
        int moods = count(moodMapper.selectCount(
                new LambdaQueryWrapper<Mood>().eq(Mood::getUserId, userId).ge(Mood::getCreatedAt, monthStart)));
        int letters = count(letterMapper.selectCount(
                new LambdaQueryWrapper<Letter>().eq(Letter::getUserId, userId).ge(Letter::getCreatedAt, monthStart)));
        int tributes = count(tributeMapper.selectCount(
                new LambdaQueryWrapper<Tribute>().eq(Tribute::getUserId, userId).ge(Tribute::getCreatedAt, monthStart)));
        int footprints = count(eventMapper.selectCount(
                new LambdaQueryWrapper<Event>()
                        .eq(Event::getUserId, userId)
                        .eq(Event::getKind, "footprint")
                        .ge(Event::getOccurredAt, monthStart)));
        return new StatView.Monthly(interactions, moods, letters, tributes, footprints);
    }

    /** 心情分布：五种心情各出现几次，按 ContentCatalog 固定顺序输出。 */
    private List<StatView.MoodCount> moodDist(Long userId) {
        List<Mood> moods = moodMapper.selectList(
                new LambdaQueryWrapper<Mood>().eq(Mood::getUserId, userId));
        Map<String, Integer> byKey = new HashMap<>();
        for (Mood m : moods) {
            byKey.merge(m.getMood(), 1, Integer::sum);
        }
        return ContentCatalog.MOODS.stream()
                .map(m -> new StatView.MoodCount(m.key(), m.label(), m.color(), byKey.getOrDefault(m.key(), 0)))
                .toList();
    }

    private static int xpOf(String action) {
        return switch (action == null ? "" : action) {
            case "feed" -> 2;
            case "play" -> 3;
            default -> 1;
        };
    }

    private static int count(Long n) {
        return n == null ? 0 : Math.toIntExact(n);
    }
}
