package site.niannian.stat;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.user.User;
import site.niannian.user.UserService;

/** 陪伴数据聚合（「陪伴数据」页）。只读，一次返回全部图表所需数据。 */
@RestController
public class StatController {

    private final UserService userService;
    private final StatService statService;

    public StatController(UserService userService, StatService statService) {
        this.userService = userService;
        this.statService = statService;
    }

    @GetMapping("/api/stats")
    public ApiResponse<StatView> stats() {
        User user = userService.current();
        return ApiResponse.ok(statService.build(user.getId()));
    }
}
