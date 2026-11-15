package site.niannian.timeline;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.List;

@RestController
public class TimelineController {

    private final UserService userService;
    private final TimelineService timelineService;

    public TimelineController(UserService userService, TimelineService timelineService) {
        this.userService = userService;
        this.timelineService = timelineService;
    }

    public record Items(List<TimelineItem> items) {
    }

    @GetMapping("/api/timeline")
    public ApiResponse<Items> timeline() {
        User user = userService.current();
        return ApiResponse.ok(new Items(timelineService.build(user.getId())));
    }
}
