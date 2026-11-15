package site.niannian.capsule;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.List;

@RestController
public class CapsuleController {

    private final UserService userService;
    private final CapsuleService capsuleService;

    public CapsuleController(UserService userService, CapsuleService capsuleService) {
        this.userService = userService;
        this.capsuleService = capsuleService;
    }

    public record Items(List<CapsuleService.CapsuleView> items) {
    }

    public record CapsuleRequest(String content, Integer days) {
    }

    public record Created(boolean ok, CapsuleService.CapsuleView item) {
    }

    @GetMapping("/api/capsules")
    public ApiResponse<Items> list() {
        User user = userService.current();
        return ApiResponse.ok(new Items(capsuleService.list(user.getId())));
    }

    @PostMapping("/api/capsules")
    public ApiResponse<Created> create(@RequestBody(required = false) CapsuleRequest req) {
        User user = userService.current();
        CapsuleService.CapsuleView item = capsuleService.create(user.getId(),
                req == null ? null : req.content(),
                req == null ? null : req.days());
        return ApiResponse.ok(new Created(true, item));
    }

    @PostMapping("/api/capsules/{id}/open")
    public ApiResponse<Created> open(@PathVariable Long id) {
        User user = userService.current();
        return ApiResponse.ok(new Created(true, capsuleService.open(user.getId(), id)));
    }
}
