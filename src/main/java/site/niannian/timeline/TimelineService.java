package site.niannian.timeline;

import org.springframework.stereotype.Service;
import site.niannian.capsule.CapsuleService;
import site.niannian.common.Time;
import site.niannian.content.ContentCatalog;
import site.niannian.content.ContentText;
import site.niannian.event.Event;
import site.niannian.event.EventService;
import site.niannian.letter.Letter;
import site.niannian.letter.LetterService;
import site.niannian.mood.Mood;
import site.niannian.mood.MoodService;
import site.niannian.pet.Pet;
import site.niannian.pet.PetService;
import site.niannian.tribute.Tribute;
import site.niannian.tribute.TributeService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 把六种来源拼成一条时间轴。前端只拿一条列表，不需要自己合并五个接口。
 * 排序在服务端做，倒序（最近的在最上面）。
 */
@Service
public class TimelineService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy/M/d");

    private final PetService petService;
    private final EventService eventService;
    private final MoodService moodService;
    private final LetterService letterService;
    private final TributeService tributeService;
    private final CapsuleService capsuleService;

    public TimelineService(PetService petService, EventService eventService, MoodService moodService,
                           LetterService letterService, TributeService tributeService,
                           CapsuleService capsuleService) {
        this.petService = petService;
        this.eventService = eventService;
        this.moodService = moodService;
        this.letterService = letterService;
        this.tributeService = tributeService;
        this.capsuleService = capsuleService;
    }

    public List<TimelineItem> build(Long userId) {
        Pet pet = petService.findByUserId(userId);
        if (pet == null) return List.of();

        List<TimelineItem> items = new ArrayList<>();

        items.add(new TimelineItem("meet-" + pet.getId(), "meet", Time.millis(pet.getCreatedAt()),
                "相遇", pet.getOwnerTitle() + " 与 " + pet.getName() + " 的故事从这里开始。"));

        for (Event e : eventService.listByUser(userId)) {
            // 'meet' 已由 pets.created_at 合成在上面，事件表里那条只是留档，不重复上轴
            if ("meet".equals(e.getKind())) continue;
            items.add(new TimelineItem("evt-" + e.getId(), e.getKind(), Time.millis(e.getOccurredAt()),
                    e.getTitle(), e.getBody()));
        }

        for (Mood m : moodService.list(userId)) {
            String label = ContentCatalog.MOODS.stream()
                    .filter(x -> x.key().equals(m.getMood()))
                    .map(ContentCatalog.Mood::label)
                    .findFirst().orElse(m.getMood());
            String text = (m.getNote() == null || m.getNote().isBlank())
                    ? ContentText.soothe(m.getMood()) : m.getNote();
            items.add(new TimelineItem("mood-" + m.getId(), "mood", Time.millis(m.getCreatedAt()),
                    "心情 · " + label, text));
        }

        for (Letter l : letterService.listDesc(userId)) {
            List<String> lines = l.getContent().lines().filter(s -> !s.isBlank()).toList();
            String text = String.join(" ", lines.stream().skip(1).limit(2).toList());
            items.add(new TimelineItem("letter-" + l.getId(), "letter", Time.millis(l.getCreatedAt()),
                    "一封信", text));
        }

        for (Tribute t : tributeService.listDesc(userId)) {
            items.add(new TimelineItem("tribute-" + t.getId(), "tribute", Time.millis(t.getCreatedAt()),
                    "思念信", t.getContent()));
        }

        for (CapsuleService.CapsuleView c : capsuleService.list(userId)) {
            items.add(new TimelineItem("capsule-" + c.id(), "capsule", c.createdAt(),
                    c.locked() ? "时光胶囊 · 未到开启的时候" : "时光胶囊",
                    c.locked() ? "将在 " + format(c.unlockAt()) + " 解锁" : c.content()));
        }

        ContentText.Milestone ms = ContentText.milestoneFor(petService.days(pet));
        if (ms != null && pet.getSinceDate() != null) {
            LocalDate hitDay = pet.getSinceDate().plusDays(ms.days() - 1L);
            items.add(new TimelineItem("ms-" + ms.days(), "milestone",
                    Time.millis(hitDay.atStartOfDay()), "第 " + ms.days() + " 天", ms.text()));
        }

        items.sort(Comparator.comparingLong(TimelineItem::at).reversed());
        return items;
    }

    private static String format(long millis) {
        return LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(millis), java.time.ZoneId.systemDefault())
                .format(DAY);
    }
}
