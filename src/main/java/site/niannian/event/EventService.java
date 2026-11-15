package site.niannian.event;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import site.niannian.common.BizException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class EventService {

    private final EventMapper eventMapper;

    public EventService(EventMapper eventMapper) {
        this.eventMapper = eventMapper;
    }

    public List<Event> listByUser(Long userId) {
        return eventMapper.selectList(new LambdaQueryWrapper<Event>()
                .eq(Event::getUserId, userId)
                .orderByAsc(Event::getOccurredAt));
    }

    public Event record(Long userId, String kind, String title, String body) {
        Event e = new Event();
        e.setUserId(userId);
        e.setKind(kind);
        e.setTitle(title);
        e.setBody(body);
        e.setOccurredAt(LocalDateTime.now());
        eventMapper.insert(e);
        return e;
    }

    /** 同一天只留一条"来看过它"，不让时间轴被脚印刷满。 */
    public void recordFootprintOncePerDay(Long userId, LocalDate today) {
        boolean exists = eventMapper.selectCount(new LambdaQueryWrapper<Event>()
                .eq(Event::getUserId, userId)
                .eq(Event::getKind, "footprint")
                .ge(Event::getOccurredAt, today.atStartOfDay())
                .lt(Event::getOccurredAt, today.plusDays(1).atStartOfDay())) > 0;
        if (!exists) record(userId, "footprint", "来看过它", "这一天，你在。");
    }

    /* ---------------- 里程碑（用户主动写的生平故事） ---------------- */

    public Event createMilestone(Long userId, String title, String body, String occurredAt) {
        Event e = new Event();
        e.setUserId(userId);
        e.setKind("milestone");
        apply(e, title, body, occurredAt);
        eventMapper.insert(e);
        return e;
    }

    public Event updateMilestone(Long userId, Long id, String title, String body, String occurredAt) {
        Event e = owned(userId, id);
        apply(e, title, body, occurredAt);
        eventMapper.updateById(e);
        return e;
    }

    public void deleteMilestone(Long userId, Long id) {
        owned(userId, id);
        eventMapper.deleteById(id);
    }

    /** 只允许编辑「里程碑」类事件，系统自动事件（脚印/亲密度/换照片）不可改。 */
    private Event owned(Long userId, Long id) {
        Event e = eventMapper.selectById(id);
        if (e == null || !userId.equals(e.getUserId()) || !"milestone".equals(e.getKind())) {
            throw BizException.notFound("这条记录");
        }
        return e;
    }

    private void apply(Event e, String title, String body, String occurredAt) {
        String t = trim(title, 40);
        if (t.isEmpty()) throw BizException.badRequest("给它起个标题吧");
        e.setTitle(t);
        e.setBody(trim(body, 2000));
        e.setOccurredAt(parseOccurredAt(occurredAt));
    }

    /** 接受 yyyy-MM-dd（日期）或带时间的字符串；填日期时按当天正午存，避免跨时区把日期往前挪一天。 */
    private static LocalDateTime parseOccurredAt(String s) {
        if (s == null || s.isBlank()) return LocalDateTime.now();
        String v = s.trim();
        try {
            return LocalDate.parse(v.substring(0, Math.min(10, v.length()))).atTime(LocalTime.NOON);
        } catch (RuntimeException ex) {
            return LocalDateTime.now();
        }
    }

    private static String trim(String v, int max) {
        if (v == null) return "";
        String s = v.trim();
        return s.length() > max ? s.substring(0, max) : s;
    }

    public void deleteByUser(Long userId) {
        eventMapper.delete(new LambdaQueryWrapper<Event>().eq(Event::getUserId, userId));
    }
}
