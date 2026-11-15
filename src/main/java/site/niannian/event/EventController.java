package site.niannian.event;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.common.Time;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.Map;

/** 用户主动写的「里程碑 / 生平故事」的增删改。系统自动事件（脚印、亲密度等）不在此暴露。 */
@RestController
public class EventController {

    private final UserService userService;
    private final EventService eventService;

    public EventController(UserService userService, EventService eventService) {
        this.userService = userService;
        this.eventService = eventService;
    }

    public record MilestoneRequest(String title, String body, String occurredAt) {
    }

    public record MilestoneView(Long id, String title, String body, long occurredAt) {
    }

    @PostMapping("/api/events")
    public ApiResponse<MilestoneView> create(@RequestBody(required = false) MilestoneRequest req) {
        User user = userService.current();
        Event e = eventService.createMilestone(user.getId(),
                req == null ? null : req.title(),
                req == null ? null : req.body(),
                req == null ? null : req.occurredAt());
        return ApiResponse.ok(view(e));
    }

    @PutMapping("/api/events/{id}")
    public ApiResponse<MilestoneView> update(@PathVariable Long id,
                                             @RequestBody(required = false) MilestoneRequest req) {
        User user = userService.current();
        Event e = eventService.updateMilestone(user.getId(), id,
                req == null ? null : req.title(),
                req == null ? null : req.body(),
                req == null ? null : req.occurredAt());
        return ApiResponse.ok(view(e));
    }

    @DeleteMapping("/api/events/{id}")
    public ApiResponse<Map<String, Object>> remove(@PathVariable Long id) {
        User user = userService.current();
        eventService.deleteMilestone(user.getId(), id);
        return ApiResponse.ok(Map.of("ok", true));
    }

    private static MilestoneView view(Event e) {
        return new MilestoneView(e.getId(), e.getTitle(), e.getBody(), Time.millis(e.getOccurredAt()));
    }
}
